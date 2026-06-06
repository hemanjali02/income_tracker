import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import { models, User, Session, Budget } from './db.js'
import { generateToken, hashPassword, verifyPassword, getTokenFromRequest } from './auth.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()

app.use(cors())
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
function makeCrudRoutes(resource) {
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
makeCrudRoutes('accounts')
makeCrudRoutes('investments')
makeCrudRoutes('recurring')
makeCrudRoutes('goals')
makeCrudRoutes('receivables')
makeCrudRoutes('networthsnapshots')

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
