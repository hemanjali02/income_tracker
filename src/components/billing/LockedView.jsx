import { Lock, Sparkles, Check } from 'lucide-react'
import { useBilling } from '../../context/BillingContext'
import { FEATURE_COPY } from '../../config/plans'

export default function LockedView({ feature }) {
  const { promptUpgrade } = useBilling()
  const copy = FEATURE_COPY[feature] || { title: 'Pro feature', blurb: 'Upgrade to unlock this.' }

  const perks = [
    'Unlimited accounts and credit cards',
    'Analysis, recurring, goals, receivables',
    'Bank PDF import and monthly reports',
  ]

  return (
    <div className="animate-in max-w-lg mx-auto text-center py-10">
      <div className="w-16 h-16 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mx-auto mb-5">
        <Lock size={26} className="text-violet-400" />
      </div>
      <div className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-violet-300 font-semibold mb-2">
        <Sparkles size={12} /> Pro feature
      </div>
      <h2 className="text-2xl font-bold text-white mb-2">{copy.title}</h2>
      <p className="text-sm text-gray-400 max-w-sm mx-auto mb-6">{copy.blurb}</p>

      <div className="bg-bg-card border border-line-subtle rounded-2xl p-5 text-left max-w-sm mx-auto mb-6">
        <div className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-3">Pro includes</div>
        <ul className="space-y-2">
          {perks.map(p => (
            <li key={p} className="flex items-start gap-2.5 text-sm text-gray-300">
              <Check size={15} className="text-violet-400 mt-0.5 flex-shrink-0" />
              {p}
            </li>
          ))}
        </ul>
      </div>

      <button onClick={() => promptUpgrade(feature)}
        className="btn-primary px-6 py-2.5 text-white text-sm font-semibold rounded-lg">
        See plans
      </button>
    </div>
  )
}
