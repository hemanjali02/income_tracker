import { useState } from 'react'
import { Check, X, Sparkles, Crown, Infinity as InfinityIcon } from 'lucide-react'
import { useBilling } from '../../context/BillingContext'
import { PLAN_MATRIX, FEATURE_COPY } from '../../config/plans'
import { formatCurrency } from '../../utils/helpers'
import Modal from '../Modal'

export default function UpgradeModal() {
  const { showUpgrade, closeUpgrade, prices, currency, billingEnabled, busy, subscribePro, buyLifetime, upgradeReason, plan } = useBilling()
  const [interval, setInterval] = useState('yearly')

  if (!showUpgrade) return null

  const copy = upgradeReason ? FEATURE_COPY[upgradeReason] : null
  const monthly = prices?.proMonthly ?? 99
  const yearly = prices?.proYearly ?? 799
  const lifetime = prices?.lifetime ?? 2499
  const yearlyMonthlyEquivalent = Math.round(yearly / 12)
  const savePct = Math.round((1 - yearly / (monthly * 12)) * 100)

  const proPrice = interval === 'yearly' ? yearly : monthly
  const alreadyLifetime = plan === 'lifetime'

  return (
    <Modal onClose={closeUpgrade} maxWidth="2xl" hideHeader>
      {(dismiss) => (
        <div>
          {/* Header */}
          <div className="relative px-6 pt-6 pb-5 bg-gradient-to-br from-violet-500/10 via-violet-500/5 to-transparent border-b border-line-subtle">
            <button onClick={dismiss} className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors">
              <X size={18} />
            </button>
            <div className="flex items-center gap-2 mb-1.5">
              <Sparkles size={16} className="text-violet-400" />
              <span className="text-xs uppercase tracking-wider text-violet-300 font-semibold">Income Tracker Pro</span>
            </div>
            {copy ? (
              <>
                <h2 className="text-xl font-bold text-white">{copy.title} is a Pro feature</h2>
                <p className="text-sm text-gray-400 mt-1">{copy.blurb}</p>
              </>
            ) : (
              <>
                <h2 className="text-xl font-bold text-white">Unlock everything</h2>
                <p className="text-sm text-gray-400 mt-1">One simple upgrade. No ads, no selling your data, ever.</p>
              </>
            )}
          </div>

          <div className="px-6 py-5 space-y-5">
            {/* Interval toggle */}
            <div className="flex items-center justify-center">
              <div className="inline-flex items-center bg-bg-elevated border border-line-subtle rounded-lg p-0.5">
                {['monthly', 'yearly'].map(i => (
                  <button key={i} onClick={() => setInterval(i)}
                    className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-colors capitalize ${
                      interval === i ? 'bg-violet-500/20 text-violet-200' : 'text-gray-400 hover:text-gray-200'
                    }`}>
                    {i}{i === 'yearly' && savePct > 0 && <span className="ml-1 text-emerald-400">save {savePct}%</span>}
                  </button>
                ))}
              </div>
            </div>

            {/* Plan cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Pro */}
              <div className="rounded-2xl border border-violet-500/40 bg-violet-500/5 p-5 relative overflow-hidden">
                <div className="flex items-center gap-2 mb-2">
                  <Crown size={16} className="text-violet-400" />
                  <span className="font-bold text-white">Pro</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-white">{formatCurrency(proPrice)}</span>
                  <span className="text-sm text-gray-500">/{interval === 'yearly' ? 'year' : 'month'}</span>
                </div>
                {interval === 'yearly' && (
                  <div className="text-[11px] text-gray-500 mt-0.5">about {formatCurrency(yearlyMonthlyEquivalent)} per month</div>
                )}
                <button
                  onClick={() => subscribePro(interval)}
                  disabled={busy || !billingEnabled}
                  className="btn-primary w-full mt-4 py-2.5 text-white text-sm font-semibold rounded-lg disabled:opacity-50"
                >
                  {busy ? 'Please wait...' : `Go Pro ${interval === 'yearly' ? 'yearly' : 'monthly'}`}
                </button>
                <div className="text-[11px] text-gray-500 text-center mt-2">Cancel anytime</div>
              </div>

              {/* Lifetime */}
              <div className="rounded-2xl border border-line-subtle bg-bg-elevated p-5 relative overflow-hidden">
                <div className="absolute top-3 right-3 text-[9px] font-bold uppercase tracking-wider text-amber-300 bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 rounded">
                  Best value
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <InfinityIcon size={16} className="text-amber-400" />
                  <span className="font-bold text-white">Lifetime</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-white">{formatCurrency(lifetime)}</span>
                  <span className="text-sm text-gray-500">once</span>
                </div>
                <div className="text-[11px] text-gray-500 mt-0.5">Pay once, yours forever</div>
                <button
                  onClick={buyLifetime}
                  disabled={busy || !billingEnabled || alreadyLifetime}
                  className="w-full mt-4 py-2.5 text-white text-sm font-semibold rounded-lg bg-amber-600 hover:bg-amber-500 transition-colors disabled:opacity-50"
                >
                  {alreadyLifetime ? 'You own this' : busy ? 'Please wait...' : 'Buy Lifetime'}
                </button>
                <div className="text-[11px] text-gray-500 text-center mt-2">No recurring charges</div>
              </div>
            </div>

            {!billingEnabled && (
              <div className="text-[11px] text-amber-300/90 bg-amber-500/5 border border-amber-500/20 rounded-lg px-3 py-2 text-center">
                Payments are not configured on this deployment yet. All Pro features are currently unlocked for everyone.
              </div>
            )}

            {/* Feature comparison */}
            <div className="rounded-xl border border-line-subtle overflow-hidden">
              <div className="grid grid-cols-[1fr_auto_auto] text-[11px] font-semibold uppercase tracking-wider text-gray-500 bg-bg-elevated/50 px-4 py-2">
                <span>What you get</span>
                <span className="px-3 text-center">Free</span>
                <span className="px-3 text-center text-violet-300">Pro</span>
              </div>
              <div className="divide-y divide-line-subtle">
                {PLAN_MATRIX.map(row => (
                  <div key={row.label} className="grid grid-cols-[1fr_auto_auto] items-center px-4 py-2 text-sm">
                    <span className="text-gray-300">{row.label}</span>
                    <span className="px-3 flex justify-center">
                      {row.free ? <Check size={14} className="text-emerald-400" /> : <X size={13} className="text-gray-700" />}
                    </span>
                    <span className="px-3 flex justify-center">
                      {row.pro ? <Check size={14} className="text-violet-400" /> : <X size={13} className="text-gray-700" />}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </Modal>
  )
}
