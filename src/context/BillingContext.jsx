import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { api } from '../api'
import { useAuth } from './AuthContext'
import { useToast } from './ToastContext'
import { loadRazorpay, openCheckout } from '../utils/razorpay'
import { PRO_FEATURES, FREE_MAX_ACCOUNTS, FALLBACK_PRICES } from '../config/plans'

const BillingContext = createContext(null)

// Derive the effective plan from the user object, mirroring the server.
function planFromUser(user, billingEnabled) {
  if (!billingEnabled) return 'pro'        // billing not set up -> everything unlocked
  if (!user) return 'free'
  if (user.plan === 'lifetime') return 'lifetime'
  if (user.plan === 'pro') {
    if (user.planExpiry && new Date(user.planExpiry) < new Date()) return 'free'
    return 'pro'
  }
  return 'free'
}

export function BillingProvider({ children }) {
  const { user, refreshUser } = useAuth()
  const { addToast } = useToast()
  const [config, setConfig] = useState({ billingEnabled: false, keyId: null, currency: 'INR', prices: FALLBACK_PRICES })
  const [busy, setBusy] = useState(false)
  const [showUpgrade, setShowUpgrade] = useState(false)
  const [upgradeReason, setUpgradeReason] = useState(null)

  useEffect(() => {
    let alive = true
    api.billingConfig().then(cfg => {
      if (!alive) return
      setConfig({
        billingEnabled: !!cfg.billingEnabled,
        keyId: cfg.keyId,
        currency: cfg.currency || 'INR',
        prices: cfg.prices || FALLBACK_PRICES,
      })
    })
    return () => { alive = false }
  }, [])

  const plan = useMemo(() => planFromUser(user, config.billingEnabled), [user, config.billingEnabled])
  const isPro = plan === 'pro' || plan === 'lifetime'

  const can = useCallback((feature) => isPro || !PRO_FEATURES.has(feature), [isPro])
  const maxAccounts = isPro ? Infinity : FREE_MAX_ACCOUNTS

  // Open the upgrade modal, optionally remembering which feature triggered it.
  const promptUpgrade = useCallback((reason = null) => {
    setUpgradeReason(reason)
    setShowUpgrade(true)
  }, [])

  // Subscribe to Pro (monthly or yearly).
  const subscribePro = useCallback(async (interval) => {
    if (!config.billingEnabled) { addToast('Payments are not set up yet', 'error'); return }
    setBusy(true)
    try {
      const ready = await loadRazorpay()
      if (!ready) throw new Error('Could not load payment module')
      const { subscriptionId, keyId } = await api.billingSubscribe(interval)
      const resp = await openCheckout({
        key: keyId || config.keyId,
        subscription_id: subscriptionId,
        name: 'Income Tracker',
        description: interval === 'yearly' ? 'Pro (yearly)' : 'Pro (monthly)',
        prefill: { name: user?.displayName || user?.username, email: user?.email || '' },
        theme: { color: '#8b5cf6' },
      })
      const { user: updated } = await api.billingVerifySubscription(resp)
      await refreshUser(updated)
      addToast('Welcome to Pro! Everything is unlocked.')
      setShowUpgrade(false)
    } catch (err) {
      if (err.message !== 'Payment cancelled') addToast(err.message || 'Payment failed', 'error')
    } finally {
      setBusy(false)
    }
  }, [config, user, addToast, refreshUser])

  // Buy Lifetime (one-time).
  const buyLifetime = useCallback(async () => {
    if (!config.billingEnabled) { addToast('Payments are not set up yet', 'error'); return }
    setBusy(true)
    try {
      const ready = await loadRazorpay()
      if (!ready) throw new Error('Could not load payment module')
      const { orderId, amount, currency, keyId } = await api.billingOrder()
      const resp = await openCheckout({
        key: keyId || config.keyId,
        order_id: orderId,
        amount, currency,
        name: 'Income Tracker',
        description: 'Lifetime access',
        prefill: { name: user?.displayName || user?.username, email: user?.email || '' },
        theme: { color: '#8b5cf6' },
      })
      const { user: updated } = await api.billingVerifyOrder(resp)
      await refreshUser(updated)
      addToast('Lifetime unlocked. Thank you!')
      setShowUpgrade(false)
    } catch (err) {
      if (err.message !== 'Payment cancelled') addToast(err.message || 'Payment failed', 'error')
    } finally {
      setBusy(false)
    }
  }, [config, user, addToast, refreshUser])

  const cancelSubscription = useCallback(async () => {
    setBusy(true)
    try {
      const { user: updated } = await api.billingCancel()
      await refreshUser(updated)
      addToast('Subscription cancelled. Pro stays active until the period ends.', 'info')
    } catch (err) {
      addToast(err.message || 'Could not cancel', 'error')
    } finally {
      setBusy(false)
    }
  }, [addToast, refreshUser])

  const value = {
    ...config,
    plan, isPro, can, maxAccounts, busy,
    showUpgrade, upgradeReason,
    promptUpgrade,
    closeUpgrade: () => setShowUpgrade(false),
    subscribePro, buyLifetime, cancelSubscription,
  }

  return <BillingContext.Provider value={value}>{children}</BillingContext.Provider>
}

export function useBilling() {
  const ctx = useContext(BillingContext)
  if (!ctx) throw new Error('useBilling must be used within BillingProvider')
  return ctx
}
