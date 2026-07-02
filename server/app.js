import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import { models, User, Session, Budget } from './db.js'
import { generateToken, hashPassword, verifyPassword, getTokenFromRequest } from './auth.js'
import { OAuth2Client } from 'google-auth-library'
import {
  isBillingEnabled, getPrices, ensureCustomer, createSubscription, cancelSubscription,
  createLifetimeOrder, planIdFor, verifyOrderSignature, verifySubscriptionSignature,
  verifyWebhookSignature,
} from './billing.js'
import { limitsFor, effectivePlan } from './entitlements.js'

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID)

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()

app.use(cors())

// Razorpay webhook needs the raw request body to verify the signature,
// so it must be registered BEFORE the JSON body parser.
app.post('/api/billing/webhook', express.raw({ type: '*/*' }), async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature']
    const raw = req.body instanceof Buffer ? req.body.toString('utf8') : JSON.stringify(req.body)
    if (!verifyWebhookSignature(raw, signature)) {
      return res.status(400).json({ error: 'Invalid signature' })
    }
    const event = JSON.parse(raw)
    await handleWebhookEvent(event)
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.use(express.json({ limit: '5mb' }))

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

function clean(doc) {
  if (!doc) return null
  const obj = doc.toObject ? doc.toObject() : { ...doc }
  delete obj._id
  delete obj.__v
  return obj
}
function cleanMany(docs) {
  return docs.map(clean)
}

// ─── Auth middleware ────────────────────────────────────
async function requireAuth(req, res, next) {
  try {
    const token = getTokenFromRequest(req)
    if (!token) return res.status(401).json({ error: 'Unauthorized' })

    const session = await Session.findOne({ token }).lean()
    if (!session) return res.status(401).json({ error: 'Invalid token' })

    const user = await User.findOne({ id: session.userId }).lean()
    if (!user) return res.status(401).json({ error: 'User not found' })

    req.userId = session.userId
    req.user = user
    next()
  } catch (err) {
    res.status(500).json({ error: 'Auth error' })
  }
}

function safeUser(u) {
  if (!u) return null
  const { passwordHash, passwordSalt, _id, __v, ...rest } = u
  rest.hasPassword = !!passwordHash
  return rest
}

// ─── Auth routes ────────────────────────────────────────
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password } = req.body || {}
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' })
    if (username.length < 2) return res.status(400).json({ error: 'Username too short' })
    if (password.length < 4) return res.status(400).json({ error: 'Password too short (min 4 chars)' })

    const existing = await User.findOne({ username: { $regex: new RegExp(`^${username}$`, 'i') } })
    if (existing) return res.status(400).json({ error: 'Username already taken' })

    const { salt, hash } = hashPassword(password)
    const user = await User.create({
      id: uid(),
      username: username.trim(),
      passwordSalt: salt,
      passwordHash: hash,
    })

    const { seedUserDefaults } = await import('./db.js')
    await seedUserDefaults(user.id)

    const token = generateToken()
    await Session.create({ token, userId: user.id })

    res.status(201).json({ token, user: safeUser(user.toObject()) })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body || {}
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' })

    const user = await User.findOne({ username: { $regex: new RegExp(`^${username}$`, 'i') } })
    if (!user) return res.status(401).json({ error: 'Invalid credentials' })

    // Check account lockout
    if (user.lockUntil && user.lockUntil > new Date()) {
      const mins = Math.ceil((user.lockUntil - new Date()) / 60000)
      return res.status(429).json({ error: `Account locked. Try again in ${mins} minute${mins !== 1 ? 's' : ''}.` })
    }

    if (!verifyPassword(password, user.passwordSalt, user.passwordHash)) {
      const attempts = (user.failedAttempts || 0) + 1
      const update = { failedAttempts: attempts }
      if (attempts >= 5) {
        update.lockUntil = new Date(Date.now() + 15 * 60 * 1000) // lock 15 min
        update.failedAttempts = 0
      }
      await User.updateOne({ id: user.id }, update)
      const remaining = Math.max(0, 5 - attempts)
      return res.status(401).json({
        error: remaining > 0
          ? `Invalid credentials. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`
          : 'Too many failed attempts. Account locked for 15 minutes.'
      })
    }

    // Success — reset lockout counters
    await User.updateOne({ id: user.id }, { failedAttempts: 0, lockUntil: null })

    const token = generateToken()
    await Session.create({ token, userId: user.id })

    res.json({ token, user: safeUser(user.toObject()) })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json({ user: safeUser(req.user) })
})

app.post('/api/auth/logout', requireAuth, async (req, res) => {
  try {
    const token = getTokenFromRequest(req)
    await Session.deleteOne({ token })
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Update profile (username and/or displayName)
app.post('/api/auth/update-profile', requireAuth, async (req, res) => {
  try {
    const { username, displayName } = req.body || {}
    const update = {}
    if (username !== undefined) {
      const clean = String(username).trim()
      if (clean.length < 2) return res.status(400).json({ error: 'Username too short' })
      if (clean !== req.user.username) {
        const existing = await User.findOne({ username: { $regex: new RegExp(`^${clean}$`, 'i') } })
        if (existing && existing.id !== req.userId) return res.status(400).json({ error: 'Username already taken' })
        update.username = clean
      }
    }
    if (displayName !== undefined) update.displayName = String(displayName).trim()
    if (Object.keys(update).length === 0) return res.json({ user: safeUser(req.user) })
    await User.updateOne({ id: req.userId }, update)
    const fresh = await User.findOne({ id: req.userId }).lean()
    res.json({ user: safeUser(fresh) })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Delete account — wipes user + all their data (auth required)
app.post('/api/auth/delete-account', requireAuth, async (req, res) => {
  try {
    const { password } = req.body || {}
    const user = await User.findOne({ id: req.userId })
    // Google users have no password; require explicit confirmation flag instead
    if (user.passwordHash) {
      if (!password) return res.status(400).json({ error: 'Password required' })
      if (!verifyPassword(password, user.passwordSalt, user.passwordHash)) {
        return res.status(401).json({ error: 'Incorrect password' })
      }
    }
    await wipeUserData(req.userId)
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Public deletion request (for users not currently signed in)
app.post('/api/auth/delete-account-public', async (req, res) => {
  try {
    const { username, password } = req.body || {}
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' })
    const user = await User.findOne({ username: { $regex: new RegExp(`^${username}$`, 'i') } })
    if (!user || !user.passwordHash) return res.status(401).json({ error: 'Invalid credentials' })
    if (!verifyPassword(password, user.passwordSalt, user.passwordHash)) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }
    await wipeUserData(user.id)
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

async function wipeUserData(userId) {
  const collections = [
    models.transactions, models.categories, models.accounts,
    models.investments, models.recurring, models.goals,
    models.receivables, models.networthsnapshots, Budget,
  ]
  await Promise.all([
    ...collections.map(M => M.deleteMany({ userId })),
    Session.deleteMany({ userId }),
    User.deleteOne({ id: userId }),
  ])
}

// Google Sign-In: verify Google ID token, create or log in user
app.post('/api/auth/google', async (req, res) => {
  try {
    const { credential } = req.body || {}
    if (!credential) return res.status(400).json({ error: 'Missing Google credential' })
    if (!process.env.GOOGLE_CLIENT_ID) return res.status(500).json({ error: 'Google sign in not configured on server' })

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    })
    const payload = ticket.getPayload()
    if (!payload?.email_verified) return res.status(401).json({ error: 'Google email not verified' })

    const googleSub = payload.sub
    const email = payload.email
    const name = payload.name || email.split('@')[0]

    let user = await User.findOne({ googleId: googleSub })
    if (!user) {
      // Try linking by username if same email-based username exists, otherwise create new
      const baseUsername = email.split('@')[0]
      let username = baseUsername
      let suffix = 0
      while (await User.findOne({ username: { $regex: new RegExp(`^${username}$`, 'i') } })) {
        suffix += 1
        username = `${baseUsername}${suffix}`
      }
      user = await User.create({
        id: uid(),
        username,
        displayName: name,
        email,
        googleId: googleSub,
      })
      const { seedUserDefaults } = await import('./db.js')
      await seedUserDefaults(user.id)
    }

    const token = generateToken()
    await Session.create({ token, userId: user.id })
    res.json({ token, user: safeUser(user.toObject ? user.toObject() : user) })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Link a Google account to the currently signed-in user, so manually-created
// users can sign in with Google later and keep all their existing data.
app.post('/api/auth/link-google', requireAuth, async (req, res) => {
  try {
    const { credential } = req.body || {}
    if (!credential) return res.status(400).json({ error: 'Missing Google credential' })
    if (!process.env.GOOGLE_CLIENT_ID) return res.status(500).json({ error: 'Google sign in not configured on server' })

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    })
    const payload = ticket.getPayload()
    if (!payload?.email_verified) return res.status(401).json({ error: 'Google email not verified' })

    const googleSub = payload.sub

    // Refuse if this Google identity already belongs to a different account.
    const taken = await User.findOne({ googleId: googleSub }).lean()
    if (taken && taken.id !== req.userId) {
      return res.status(409).json({ error: 'This Google account is already linked to another user' })
    }
    if (req.user.googleId && req.user.googleId !== googleSub) {
      return res.status(409).json({ error: 'Your account is already linked to a different Google account' })
    }

    await User.updateOne({ id: req.userId }, {
      googleId: googleSub,
      email: req.user.email || payload.email,
    })
    const fresh = await User.findOne({ id: req.userId }).lean()
    res.json({ user: safeUser(fresh) })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Unlink Google — only allowed when the user still has a password, otherwise
// removing the link would leave them with no way to sign in.
app.post('/api/auth/unlink-google', requireAuth, async (req, res) => {
  try {
    const user = await User.findOne({ id: req.userId })
    if (!user.googleId) return res.status(400).json({ error: 'No Google account is linked' })
    if (!user.passwordHash) {
      return res.status(400).json({ error: 'Set a password before unlinking, or you would be locked out' })
    }
    await User.updateOne({ id: req.userId }, { $unset: { googleId: '' } })
    const fresh = await User.findOne({ id: req.userId }).lean()
    res.json({ user: safeUser(fresh) })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/auth/change-password', requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body || {}
    if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Both fields required' })
    if (newPassword.length < 8) return res.status(400).json({ error: 'New password must be at least 8 characters' })

    const user = await User.findOne({ id: req.userId })
    if (!verifyPassword(currentPassword, user.passwordSalt, user.passwordHash)) {
      return res.status(401).json({ error: 'Current password is incorrect' })
    }

    const { salt, hash } = hashPassword(newPassword)
    await User.updateOne({ id: req.userId }, { passwordSalt: salt, passwordHash: hash })
    // Invalidate all other sessions
    const currentToken = getTokenFromRequest(req)
    await Session.deleteMany({ userId: req.userId, token: { $ne: currentToken } })

    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─── Generic CRUD factory ───────────────────────────────
function makeCrudRoutes(resource, opts = {}) {
  const Model = models[resource]

  app.get(`/api/${resource}`, requireAuth, async (req, res) => {
    try {
      const docs = await Model.find({ userId: req.userId }).lean()
      res.json(cleanMany(docs))
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  })

  app.post(`/api/${resource}`, requireAuth, async (req, res) => {
    try {
      if (opts.beforeCreate) {
        const blocked = await opts.beforeCreate(req)
        if (blocked) return res.status(blocked.status || 403).json({ error: blocked.message, upgrade: true })
      }
      const item = { ...req.body, id: req.body.id || uid(), userId: req.userId }
      const doc = await Model.create(item)
      res.status(201).json(clean(doc))
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  })

  app.put(`/api/${resource}/:id`, requireAuth, async (req, res) => {
    try {
      const doc = await Model.findOneAndUpdate(
        { id: req.params.id, userId: req.userId },
        { ...req.body, userId: req.userId },
        { new: true }
      )
      if (!doc) return res.status(404).json({ error: 'Not found' })
      res.json(clean(doc))
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  })

  app.delete(`/api/${resource}/:id`, requireAuth, async (req, res) => {
    try {
      await Model.deleteOne({ id: req.params.id, userId: req.userId })
      res.status(204).end()
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  })
}

makeCrudRoutes('transactions')
makeCrudRoutes('categories')
makeCrudRoutes('accounts', {
  // Enforce free-plan limits server-side so the client cannot bypass them.
  async beforeCreate(req) {
    const limits = limitsFor(req.user)
    if (req.body.accountType === 'credit' && !limits.creditCards) {
      return { status: 403, message: 'Credit card accounts are a Pro feature.' }
    }
    if (limits.maxAccounts !== Infinity) {
      const count = await models.accounts.countDocuments({ userId: req.userId })
      if (count >= limits.maxAccounts) {
        return { status: 403, message: `Free plan is limited to ${limits.maxAccounts} accounts. Upgrade to Pro for unlimited.` }
      }
    }
    return null
  },
})
makeCrudRoutes('investments')
makeCrudRoutes('recurring')
makeCrudRoutes('goals')
makeCrudRoutes('receivables')
makeCrudRoutes('networthsnapshots')
makeCrudRoutes('emis')

// ─── Budgets ─────────────────────────────────────────────
app.get('/api/budgets', requireAuth, async (req, res) => {
  try {
    const docs = await Budget.find({ userId: req.userId }).lean()
    res.json(cleanMany(docs))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/budgets', requireAuth, async (req, res) => {
  try {
    const doc = await Budget.findOneAndUpdate(
      { userId: req.userId, categoryId: req.body.categoryId, month: req.body.month },
      { ...req.body, id: req.body.id || uid(), userId: req.userId },
      { new: true, upsert: true }
    )
    res.json(clean(doc))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.delete('/api/budgets/:id', requireAuth, async (req, res) => {
  try {
    await Budget.deleteOne({ id: req.params.id, userId: req.userId })
    res.status(204).end()
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─── Bulk delete transactions ───────────────────────────
app.post('/api/transactions/bulk-delete', requireAuth, async (req, res) => {
  try {
    const { ids } = req.body || {}
    if (!Array.isArray(ids)) return res.status(400).json({ error: 'ids must be array' })
    const result = await models.transactions.deleteMany({ id: { $in: ids }, userId: req.userId })
    res.json({ deleted: result.deletedCount })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─── Billing ────────────────────────────────────────────

// Public config the client needs to render pricing and open checkout.
app.get('/api/billing/config', (req, res) => {
  res.json({
    billingEnabled: isBillingEnabled(),
    keyId: process.env.RAZORPAY_KEY_ID || null,
    currency: 'INR',
    prices: getPrices(),
  })
})

// Current user's plan + entitlements.
app.get('/api/billing/status', requireAuth, (req, res) => {
  const u = req.user
  res.json({
    plan: effectivePlan(u),
    rawPlan: u.plan || 'free',
    status: u.planStatus || 'none',
    expiry: u.planExpiry || null,
    interval: u.billingInterval || null,
    billingEnabled: isBillingEnabled(),
  })
})

// Start a Pro subscription. Returns the Razorpay subscription id to open in checkout.
app.post('/api/billing/subscribe', requireAuth, async (req, res) => {
  try {
    if (!isBillingEnabled()) return res.status(400).json({ error: 'Billing not configured' })
    const { interval } = req.body || {}
    const planId = planIdFor(interval === 'yearly' ? 'yearly' : 'monthly')
    if (!planId) return res.status(400).json({ error: 'This plan is not configured on the server yet' })

    const customerId = await ensureCustomer(req.user)
    if (customerId !== req.user.razorpayCustomerId) {
      await User.updateOne({ id: req.userId }, { razorpayCustomerId: customerId })
    }
    const sub = await createSubscription({
      planId, customerId, notes: { appUserId: req.userId, interval },
    })
    await User.updateOne({ id: req.userId }, {
      razorpaySubscriptionId: sub.id, billingInterval: interval === 'yearly' ? 'yearly' : 'monthly',
    })
    res.json({ subscriptionId: sub.id, keyId: process.env.RAZORPAY_KEY_ID })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Verify a subscription's first payment from Razorpay Checkout.
app.post('/api/billing/verify-subscription', requireAuth, async (req, res) => {
  try {
    const { razorpay_payment_id, razorpay_subscription_id, razorpay_signature } = req.body || {}
    const ok = verifySubscriptionSignature({
      paymentId: razorpay_payment_id,
      subscriptionId: razorpay_subscription_id,
      signature: razorpay_signature,
    })
    if (!ok) return res.status(400).json({ error: 'Payment verification failed' })
    // Mark active immediately; the webhook will keep expiry in sync going forward.
    const expiry = new Date()
    if (req.user.billingInterval === 'yearly') expiry.setFullYear(expiry.getFullYear() + 1)
    else expiry.setMonth(expiry.getMonth() + 1)
    await User.updateOne({ id: req.userId }, {
      plan: 'pro', planStatus: 'active',
      planExpiry: expiry.toISOString(),
      razorpaySubscriptionId: razorpay_subscription_id,
    })
    const fresh = await User.findOne({ id: req.userId }).lean()
    res.json({ ok: true, user: safeUser(fresh) })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Create a one-time Lifetime order.
app.post('/api/billing/order', requireAuth, async (req, res) => {
  try {
    if (!isBillingEnabled()) return res.status(400).json({ error: 'Billing not configured' })
    const order = await createLifetimeOrder({ userId: req.userId })
    res.json({ orderId: order.id, amount: order.amount, currency: order.currency, keyId: process.env.RAZORPAY_KEY_ID })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Verify a one-time Lifetime payment.
app.post('/api/billing/verify-order', requireAuth, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body || {}
    const ok = verifyOrderSignature({
      orderId: razorpay_order_id, paymentId: razorpay_payment_id, signature: razorpay_signature,
    })
    if (!ok) return res.status(400).json({ error: 'Payment verification failed' })
    await User.updateOne({ id: req.userId }, {
      plan: 'lifetime', planStatus: 'active', planExpiry: null, billingInterval: null,
    })
    const fresh = await User.findOne({ id: req.userId }).lean()
    res.json({ ok: true, user: safeUser(fresh) })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Cancel an active subscription (stays Pro until the period ends).
app.post('/api/billing/cancel', requireAuth, async (req, res) => {
  try {
    if (!req.user.razorpaySubscriptionId) return res.status(400).json({ error: 'No active subscription' })
    await cancelSubscription(req.user.razorpaySubscriptionId, true)
    await User.updateOne({ id: req.userId }, { planStatus: 'cancelled' })
    const fresh = await User.findOne({ id: req.userId }).lean()
    res.json({ ok: true, user: safeUser(fresh) })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Webhook event handling (called from the raw-body route at the top of this file).
async function handleWebhookEvent(event) {
  const type = event.event
  const subEntity = event.payload?.subscription?.entity
  const findUserBySub = async (subId) => subId ? User.findOne({ razorpaySubscriptionId: subId }) : null

  if (type === 'subscription.charged' || type === 'subscription.activated') {
    const user = await findUserBySub(subEntity?.id)
    if (user) {
      const end = subEntity?.current_end ? new Date(subEntity.current_end * 1000).toISOString() : null
      await User.updateOne({ id: user.id }, {
        plan: 'pro', planStatus: 'active', ...(end ? { planExpiry: end } : {}),
      })
    }
  } else if (type === 'subscription.cancelled' || type === 'subscription.completed') {
    const user = await findUserBySub(subEntity?.id)
    if (user) await User.updateOne({ id: user.id }, { planStatus: 'cancelled' })
  } else if (type === 'subscription.halted' || type === 'subscription.pending') {
    const user = await findUserBySub(subEntity?.id)
    if (user) await User.updateOne({ id: user.id }, { planStatus: 'past_due' })
  }
}

// ─── Health ─────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() })
})

// ─── Serve static in production (local/Render only) ────
if (process.env.NODE_ENV === 'production' && process.env.VERCEL !== '1') {
  const distPath = path.join(__dirname, '..', 'dist')
  app.use(express.static(distPath))
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'))
  })
}

export default app
