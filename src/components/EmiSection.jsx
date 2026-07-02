import { useState, useMemo } from 'react'
import { Plus, Trash2, X, CalendarClock, BadgePercent, CheckCircle2 } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { generateId, formatCurrency, formatDateFull, emiInstallment, emiProgress } from '../utils/helpers'
import { inputCls, labelCls } from '../utils/styles'
import Modal from './Modal'
import ConfirmDialog from './ConfirmDialog'

function EmiForm({ accountId, initial, onClose }) {
  const { addEmi, updateEmi } = useApp()
  const [name, setName] = useState(initial?.name || '')
  const [principal, setPrincipal] = useState(initial ? String(initial.principal) : '')
  const [months, setMonths] = useState(initial?.months || 6)
  const [noCost, setNoCost] = useState(initial ? (initial.interestRate || 0) === 0 : true)
  const [rate, setRate] = useState(initial?.interestRate || 15)
  const [startDate, setStartDate] = useState(initial?.startDate || new Date().toISOString().slice(0, 10))
  const [error, setError] = useState('')

  const p = Number(principal) || 0
  const n = Number(months) || 0
  const effRate = noCost ? 0 : Number(rate) || 0
  const installment = emiInstallment(p, effRate, n)
  const totalPayable = installment * n
  const totalInterest = totalPayable - p

  function submit(e) {
    e.preventDefault()
    if (!name.trim()) return setError('What did you buy?')
    if (p <= 0) return setError('Enter the purchase amount')
    if (n < 2 || n > 60) return setError('Tenure should be between 2 and 60 months')
    if (!noCost && (effRate <= 0 || effRate > 50)) return setError('Interest rate looks wrong')
    const data = {
      accountId,
      name: name.trim(),
      principal: p,
      months: n,
      interestRate: effRate,
      startDate,
      closed: initial?.closed || false,
    }
    if (initial) updateEmi(initial.id, data)
    else addEmi({ id: generateId(), ...data, createdAt: new Date().toISOString() })
    onClose()
  }

  const tenures = [3, 6, 9, 12, 18, 24]

  return (
    <Modal onClose={onClose} title={initial ? 'Edit EMI' : 'New EMI'} icon={CalendarClock} maxWidth="md">
      <form onSubmit={submit} className="px-6 py-5 space-y-4">
        <div>
          <label className={labelCls}>What did you buy?</label>
          <input autoFocus className={inputCls} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. iPhone, Fridge, Sofa" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Amount (₹)</label>
            <input className={inputCls} type="number" min="0" step="1" value={principal}
              onChange={e => setPrincipal(e.target.value)} placeholder="0" />
          </div>
          <div>
            <label className={labelCls}>First installment</label>
            <input className={inputCls} type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>
        </div>

        <div>
          <label className={labelCls}>Tenure</label>
          <div className="grid grid-cols-6 gap-1.5">
            {tenures.map(t => (
              <button key={t} type="button" onClick={() => setMonths(t)}
                className={`py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  Number(months) === t ? 'bg-violet-500/20 text-violet-200 border border-violet-500/40' : 'bg-bg-input text-gray-400 border border-line'
                }`}>
                {t}m
              </button>
            ))}
          </div>
          <input className={inputCls + ' mt-2'} type="number" min="2" max="60" value={months}
            onChange={e => setMonths(e.target.value)} placeholder="Custom months" />
        </div>

        {/* No-cost toggle */}
        <div className="flex items-center justify-between p-3 bg-bg-elevated rounded-lg border border-line-subtle">
          <div className="flex items-center gap-2">
            <BadgePercent size={15} className={noCost ? 'text-emerald-400' : 'text-gray-500'} />
            <div>
              <div className="text-sm font-medium text-white">No-cost EMI</div>
              <div className="text-[11px] text-gray-500">Zero interest, just the price split evenly</div>
            </div>
          </div>
          <button type="button" onClick={() => setNoCost(v => !v)}
            className={`relative w-10 h-6 rounded-full transition-colors ${noCost ? 'bg-emerald-500' : 'bg-line-bright'}`}>
            <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${noCost ? 'left-[18px]' : 'left-0.5'}`} />
          </button>
        </div>

        {!noCost && (
          <div>
            <label className={labelCls}>Interest rate (% per year)</label>
            <input className={inputCls} type="number" min="1" max="50" step="0.1" value={rate}
              onChange={e => setRate(e.target.value)} />
          </div>
        )}

        {/* Live preview */}
        {p > 0 && n >= 2 && (
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-violet-500/5 border border-violet-500/20 rounded-lg p-2.5">
              <div className="text-[10px] uppercase tracking-wider text-gray-500">Per month</div>
              <div className="text-sm font-bold text-violet-300 mt-0.5">{formatCurrency(Math.round(installment))}</div>
            </div>
            <div className="bg-bg-elevated border border-line-subtle rounded-lg p-2.5">
              <div className="text-[10px] uppercase tracking-wider text-gray-500">Total payable</div>
              <div className="text-sm font-bold text-white mt-0.5">{formatCurrency(Math.round(totalPayable))}</div>
            </div>
            <div className={`rounded-lg p-2.5 border ${totalInterest > 0 ? 'bg-rose-500/5 border-rose-500/20' : 'bg-emerald-500/5 border-emerald-500/20'}`}>
              <div className="text-[10px] uppercase tracking-wider text-gray-500">Interest</div>
              <div className={`text-sm font-bold mt-0.5 ${totalInterest > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                {totalInterest > 0 ? formatCurrency(Math.round(totalInterest)) : '₹0'}
              </div>
            </div>
          </div>
        )}

        {error && <p className="text-rose-400 text-xs">{error}</p>}
        <button type="submit" className="btn-primary w-full py-2.5 text-white font-semibold rounded-lg text-sm">
          {initial ? 'Save Changes' : 'Add EMI'}
        </button>
      </form>
    </Modal>
  )
}

export default function EmiSection({ account }) {
  const { emis, updateEmi, deleteEmi } = useApp()
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)

  const accountEmis = useMemo(() =>
    emis.filter(e => e.accountId === account.id)
      .map(e => ({ ...e, ...emiProgress(e) }))
      .sort((a, b) => (a.done === b.done ? b.outstanding - a.outstanding : a.done ? 1 : -1)),
    [emis, account.id]
  )

  const active = accountEmis.filter(e => !e.done)
  const monthlyOutgo = active.reduce((s, e) => s + e.installment, 0)
  const totalOutstanding = active.reduce((s, e) => s + e.outstanding, 0)

  return (
    <div className="bg-bg-card border border-line-subtle rounded-xl overflow-hidden">
      {adding && <EmiForm accountId={account.id} onClose={() => setAdding(false)} />}
      {editing && <EmiForm accountId={account.id} initial={editing} onClose={() => setEditing(null)} />}
      {confirmDelete && (
        <ConfirmDialog title="Remove EMI" message="This only removes the tracker, not any transactions."
          onConfirm={() => { deleteEmi(confirmDelete); setConfirmDelete(null) }}
          onCancel={() => setConfirmDelete(null)} />
      )}

      <div className="px-5 py-3.5 border-b border-line-subtle flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <CalendarClock size={14} className="text-cyan-400" /> EMIs
          </h3>
          {active.length > 0 && (
            <p className="text-[11px] text-gray-500 mt-0.5">
              {formatCurrency(Math.round(monthlyOutgo))}/mo · {formatCurrency(Math.round(totalOutstanding))} left
            </p>
          )}
        </div>
        <button onClick={() => setAdding(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/15 border border-cyan-500/25 rounded-lg transition-colors">
          <Plus size={12} /> Add EMI
        </button>
      </div>

      {accountEmis.length === 0 ? (
        <div className="px-5 py-8 text-center text-sm text-gray-500">
          Bought something on EMI? Track it here so the installments never surprise you.
        </div>
      ) : (
        <div className="divide-y divide-line-subtle">
          {accountEmis.map(e => (
            <div key={e.id} className={`px-5 py-3.5 group ${e.done ? 'opacity-60' : ''}`}>
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white truncate">{e.name}</span>
                    {(e.interestRate || 0) === 0 ? (
                      <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.5 rounded">No-cost</span>
                    ) : (
                      <span className="text-[9px] font-bold uppercase tracking-wider text-amber-300 bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 rounded">{e.interestRate}% p.a.</span>
                    )}
                    {e.done && <CheckCircle2 size={13} className="text-emerald-400" />}
                  </div>
                  <div className="text-[11px] text-gray-500 mt-0.5">
                    {formatCurrency(e.principal)} · started {formatDateFull(e.startDate)}
                    {e.totalInterest > 0.5 && <span className="text-rose-400"> · {formatCurrency(Math.round(e.totalInterest))} interest</span>}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-sm font-bold text-cyan-300">{formatCurrency(Math.round(e.installment))}<span className="text-[10px] text-gray-500 font-normal">/mo</span></div>
                  <div className="flex gap-1 justify-end mt-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    {!e.done && (
                      <button onClick={() => updateEmi(e.id, { closed: true })}
                        className="text-[10px] text-gray-500 hover:text-emerald-400 transition-colors" title="Mark pre-closed">
                        Close early
                      </button>
                    )}
                    <button onClick={() => setEditing(e)} className="text-[10px] text-gray-500 hover:text-violet-300 transition-colors">Edit</button>
                    <button onClick={() => setConfirmDelete(e.id)} className="p-0.5 text-gray-600 hover:text-rose-400 transition-colors"><Trash2 size={11} /></button>
                  </div>
                </div>
              </div>
              <div className="h-1.5 bg-bg-elevated rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-500 ${e.done ? '' : 'bar-gradient'}`}
                  style={{ width: `${e.pct}%`, ...(e.done ? { backgroundColor: '#10b981' } : {}) }} />
              </div>
              <div className="flex justify-between text-[11px] text-gray-500 mt-1">
                <span>{e.paidMonths} of {e.months} paid</span>
                <span>{e.done ? 'Completed' : `${formatCurrency(Math.round(e.outstanding))} to go`}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
