import { isBillingEnabled } from './billing.js'

// Plan limits enforced on the server so the client cannot bypass them.
export const PLAN_LIMITS = {
  free:     { maxAccounts: 3,        creditCards: false },
  pro:      { maxAccounts: Infinity, creditCards: true  },
  lifetime: { maxAccounts: Infinity, creditCards: true  },
}

// Resolve the user's effective plan, accounting for expiry.
// When billing is not configured at all, everyone is treated as Pro so the
// app stays fully usable until you wire up Razorpay.
export function effectivePlan(user) {
  if (!isBillingEnabled()) return 'pro'
  if (!user) return 'free'
  if (user.plan === 'lifetime') return 'lifetime'
  if (user.plan === 'pro') {
    if (user.planExpiry && new Date(user.planExpiry) < new Date()) return 'free'
    return 'pro'
  }
  return 'free'
}

export function limitsFor(user) {
  return PLAN_LIMITS[effectivePlan(user)] || PLAN_LIMITS.free
}
