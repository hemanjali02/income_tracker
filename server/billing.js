import crypto from 'crypto'

// ─── Configuration ──────────────────────────────────────
// Billing is enabled only when both Razorpay keys are present.
// Until you set them, the whole app behaves as if every user is Pro,
// so nothing is locked while you finish setting up payments.
export function isBillingEnabled() {
  return !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET)
}

// Display prices (in rupees). The real subscription charge is whatever you
// set on the Razorpay plan; these are only for showing on the pricing page.
export function getPrices() {
  return {
    proMonthly: Number(process.env.BILLING_PRICE_PRO_MONTHLY || 99),
    proYearly:  Number(process.env.BILLING_PRICE_PRO_YEARLY  || 799),
    lifetime:   Number(process.env.BILLING_PRICE_LIFETIME    || 2499),
  }
}

// Lifetime amount charged, in paise. ₹2499 -> 249900.
function lifetimeAmountPaise() {
  return Number(process.env.RAZORPAY_LIFETIME_AMOUNT || 249900)
}

// ─── Razorpay client (lazy) ─────────────────────────────
let client = null
async function getClient() {
  if (!isBillingEnabled()) return null
  if (client) return client
  const { default: Razorpay } = await import('razorpay')
  client = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  })
  return client
}

// ─── Customer ───────────────────────────────────────────
export async function ensureCustomer(user) {
  const rzp = await getClient()
  if (!rzp) throw new Error('Billing not configured')
  if (user.razorpayCustomerId) return user.razorpayCustomerId
  const customer = await rzp.customers.create({
    name: user.displayName || user.username,
    email: user.email || undefined,
    fail_existing: 0,
    notes: { appUserId: user.id },
  })
  return customer.id
}

// ─── Subscriptions (Pro monthly / yearly) ───────────────
export async function createSubscription({ planId, customerId, notes }) {
  const rzp = await getClient()
  if (!rzp) throw new Error('Billing not configured')
  if (!planId) throw new Error('Plan not configured on server')
  return rzp.subscriptions.create({
    plan_id: planId,
    customer_id: customerId,
    // total_count is required by Razorpay. 120 monthly cycles = ~10 years,
    // which is effectively "until cancelled" for our purposes.
    total_count: 120,
    customer_notify: 1,
    notes: notes || {},
  })
}

export async function cancelSubscription(subscriptionId, cancelAtCycleEnd = true) {
  const rzp = await getClient()
  if (!rzp) throw new Error('Billing not configured')
  return rzp.subscriptions.cancel(subscriptionId, cancelAtCycleEnd)
}

export async function fetchSubscription(subscriptionId) {
  const rzp = await getClient()
  if (!rzp) return null
  return rzp.subscriptions.fetch(subscriptionId)
}

export function planIdFor(interval) {
  return interval === 'yearly'
    ? process.env.RAZORPAY_PLAN_PRO_YEARLY
    : process.env.RAZORPAY_PLAN_PRO_MONTHLY
}

// ─── Orders (one-time Lifetime) ─────────────────────────
export async function createLifetimeOrder({ userId }) {
  const rzp = await getClient()
  if (!rzp) throw new Error('Billing not configured')
  return rzp.orders.create({
    amount: lifetimeAmountPaise(),
    currency: 'INR',
    receipt: `lifetime_${userId}_${Date.now()}`,
    notes: { appUserId: userId, product: 'lifetime' },
  })
}

// ─── Signature verification ─────────────────────────────
function hmac(payload, secret) {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex')
}

export function verifyOrderSignature({ orderId, paymentId, signature }) {
  const expected = hmac(`${orderId}|${paymentId}`, process.env.RAZORPAY_KEY_SECRET)
  return safeEqual(expected, signature)
}

export function verifySubscriptionSignature({ paymentId, subscriptionId, signature }) {
  // Razorpay subscription verification: HMAC(payment_id + "|" + subscription_id)
  const expected = hmac(`${paymentId}|${subscriptionId}`, process.env.RAZORPAY_KEY_SECRET)
  return safeEqual(expected, signature)
}

export function verifyWebhookSignature(rawBody, signature) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET
  if (!secret) return false
  const expected = hmac(rawBody, secret)
  return safeEqual(expected, signature)
}

function safeEqual(a, b) {
  if (!a || !b) return false
  try {
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b))
  } catch {
    return false
  }
}

export { lifetimeAmountPaise }
