import { useState, useMemo } from 'react'
import { Plus, Pencil, Trash2, X, Repeat, Pause, Play, Calendar, Check, AlertCircle } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { generateId, formatCurrency, formatDate, getNextDueDate } from '../utils/helpers'
import { inputCls, labelCls } from '../utils/styles'
import ConfirmDialog from './ConfirmDialog'

function RecurringForm({ initial, onSave, onCancel }) {
  const { categories, accounts } = useApp()
  const [type, setType]             = useState(initial?.type || 'expense')
  const [name, setName]             = useState(initial?.name || '')
  const [amount, setAmount]         = useState(initial ? String(initial.amount) : '')
  const [categoryId, setCategoryId] = useState(initial?.categoryId || '')
  const [accountId, setAccountId]   = useState(initial?.accountId || '')
  const [frequency, setFrequency]   = useState(initial?.frequency || 'monthly')
  const [dayOfMonth, setDayOfMonth] = useState(initial?.dayOfMonth || 1)
  const [monthOfYear, setMonthOfYear] = useState(initial?.monthOfYear || 1)
  const [startDate, setStartDate]   = useState(initial?.startDate || new Date().toISOString().slice(0, 10))
  const [notes, setNotes]           = useState(initial?.notes || '')
  const [error, setError]           = useState('')

  const filteredCats = categories.filter(c => c.type === type)

  function submit(e) {
    e.preventDefault()
    if (!name.trim()) return setError('Enter a name')
    const amt = Number(amount)
    if (!amt || amt <= 0) return setError('Enter a valid amount')
    if (!categoryId) return setError('Pick a category')
    if (!accountId) return setError('Pick an account')
    onSave({
      type, name: name.trim(), amount: amt,
      categoryId, accountId,
      frequency,
      dayOfMonth: frequency === 'weekly' ? null : Number(dayOfMonth),
      monthOfYear: frequency === 'yearly' ? Number(monthOfYear) : null,
      startDate,
      notes: notes.trim(),
      active: initial?.active ?? true,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onCancel}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <form onSubmit={submit} className="relative glass rounded-2xl w-full max-w-md shadow-2xl animate-in" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-line">
          <h2 className="text-white font-semibold text-base">{initial ? 'Edit Recurring Item' : 'New Recurring Item'}</h2>
          <button type="button" onClick={onCancel} className="text-gray-400 hover:text-white"><X size={18} /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className={labelCls}>Type</label>
            <div className="flex gap-2">
              {['expense', 'income'].map(t => (
                <button key={t} type="button" onClick={() => { setType(t); setCategoryId('') }}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all capitalize ${
                    type === t ? (t === 'expense' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40')
                      : 'bg-bg-input text-gray-400 border border-line hover:border-line-bright'
                  }`}>
                  {t === 'expense' ? '↑ Expense' : '↓ Income'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={labelCls}>Name</label>
            <input autoFocus className={inputCls} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Spotify, Rent, Salary" />
          </div>

          <div>
            <label className={labelCls}>Amount (₹)</label>
            <input className={inputCls} type="number" min="0" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Category</label>
              <select className={inputCls} value={categoryId} onChange={e => setCategoryId(e.target.value)}>
                <option value="">Select...</option>
                {filteredCats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Account</label>
              <select className={inputCls} value={accountId} onChange={e => setAccountId(e.target.value)}>
                <option value="">Select...</option>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className={labelCls}>Repeats</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'weekly',  label: 'Weekly' },
                { id: 'monthly', label: 'Monthly' },
                { id: 'yearly',  label: 'Yearly' },
              ].map(f => (
                <button key={f.id} type="button" onClick={() => setFrequency(f.id)}
                  className={`py-2 rounded-lg text-xs font-medium transition-all ${
                    frequency === f.id ? 'bg-violet-500/20 text-violet-300 border border-violet-500/40' : 'bg-bg-input text-gray-400 border border-line'
                  }`}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {frequency === 'monthly' && (
            <div>
              <label className={labelCls}>Day of month</label>
              <input className={inputCls} type="number" min="1" max="31" value={dayOfMonth} onChange={e => setDayOfMonth(e.target.value)} />
              <p className="text-[11px] text-gray-500 mt-1">If month has fewer days, last day is used (e.g. day 31 → 28th in Feb)</p>
            </div>
          )}

          {frequency === 'yearly' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Month</label>
                <select className={inputCls} value={monthOfYear} onChange={e => setMonthOfYear(e.target.value)}>
                  {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((m, i) => (
                    <option key={m} value={i + 1}>{m}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Day</label>
                <input className={inputCls} type="number" min="1" max="31" value={dayOfMonth} onChange={e => setDayOfMonth(e.target.value)} />
              </div>
            </div>
          )}

          <div>
            <label className={labelCls}>Starts on</label>
            <input className={inputCls} type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>

          <div>
            <label className={labelCls}>Notes <span className="text-gray-600">(optional)</span></label>
            <input className={inputCls} value={notes} onChange={e => setNotes(e.target.value)} />
          </div>

          {error && <p className="text-rose-400 text-xs">{error}</p>}
          <button type="submit" className="btn-primary w-full py-2.5 text-white font-semibold rounded-lg text-sm">
            {initial ? 'Save Changes' : 'Create Recurring'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default function Recurring() {
  const { recurring, accounts, categories, transactions, addRecurring, updateRecurring, deleteRecurring, addTransaction } = useApp()
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)

  const today = new Date().toISOString().slice(0, 10)

  const enriched = useMemo(() =>
    [...recurring].map(r => {
      const nextDue = getNextDueDate(r)
      const isDue = nextDue && nextDue <= today && r.active
      const monthlyAmount =
        r.frequency === 'weekly' ? r.amount * 4.33
        : r.frequency === 'monthly' ? r.amount
        : r.frequency === 'yearly' ? r.amount / 12
        : 0
      return { ...r, nextDue, isDue, monthlyAmount }
    }).sort((a, b) => {
      if (a.isDue !== b.isDue) return a.isDue ? -1 : 1
      if (!a.active !== !b.active) return a.active ? -1 : 1
      return (a.nextDue || '').localeCompare(b.nextDue || '')
    }),
    [recurring]
  )

  const activeItems = enriched.filter(r => r.active)
  const monthlyIncome = activeItems.filter(r => r.type === 'income').reduce((s, r) => s + r.monthlyAmount, 0)
  const monthlyExpense = activeItems.filter(r => r.type === 'expense').reduce((s, r) => s + r.monthlyAmount, 0)
  const monthlyNet = monthlyIncome - monthlyExpense

  function handleAdd(data) {
    addRecurring({ id: generateId(), ...data })
    setAdding(false)
  }

  function handleEdit(data) {
    updateRecurring(editing.id, data)
    setEditing(null)
  }

  function handleGenerateNow(r) {
    const dueDate = r.nextDue || today
    addTransaction({
      id: generateId(),
      type: r.type,
      name: r.name,
      amount: r.amount,
      categoryId: r.categoryId,
      accountId: r.accountId,
      date: dueDate,
      notes: r.notes ? `Recurring: ${r.notes}` : 'Auto-generated from recurring',
    })
    updateRecurring(r.id, { lastGeneratedDate: dueDate })
  }

  function togglePause(r) {
    updateRecurring(r.id, { active: !r.active })
  }

  return (
    <div className="space-y-6 animate-in">
      {adding && <RecurringForm onSave={handleAdd} onCancel={() => setAdding(false)} />}
      {editing && <RecurringForm initial={editing} onSave={handleEdit} onCancel={() => setEditing(null)} />}
      {confirmDelete && (
        <ConfirmDialog title="Delete Recurring Item"
          message="The recurring template will be removed. Past auto-generated transactions stay."
          onConfirm={() => { deleteRecurring(confirmDelete); setConfirmDelete(null) }}
          onCancel={() => setConfirmDelete(null)} />
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white">Recurring</h2>
          <p className="text-sm text-gray-500 mt-0.5">Subscriptions, salary, rent — auto-tracked monthly</p>
        </div>
        <button onClick={() => setAdding(true)}
          className="btn-primary flex items-center gap-2 px-4 py-2 text-white text-sm font-medium rounded-lg">
          <Plus size={15} /> New Recurring
        </button>
      </div>

      {/* Monthly totals */}
      {activeItems.length > 0 && (
        <div className="grid grid-cols-3 gap-3 sm:gap-4">
          <div className="bg-bg-card border border-line-subtle rounded-xl p-4">
            <div className="text-xs text-gray-500 mb-1">Monthly Income</div>
            <div className="text-lg font-bold text-emerald-400">+{formatCurrency(Math.round(monthlyIncome))}</div>
          </div>
          <div className="bg-bg-card border border-line-subtle rounded-xl p-4">
            <div className="text-xs text-gray-500 mb-1">Monthly Outflow</div>
            <div className="text-lg font-bold text-rose-400">−{formatCurrency(Math.round(monthlyExpense))}</div>
          </div>
          <div className="bg-bg-card border border-line-subtle rounded-xl p-4">
            <div className="text-xs text-gray-500 mb-1">Net</div>
            <div className={`text-lg font-bold ${monthlyNet >= 0 ? 'text-violet-300' : 'text-rose-400'}`}>
              {monthlyNet >= 0 ? '+' : '−'}{formatCurrency(Math.abs(Math.round(monthlyNet)))}
            </div>
          </div>
        </div>
      )}

      {/* List */}
      {enriched.length === 0 ? (
        <div className="bg-bg-card border border-line-subtle rounded-2xl p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mx-auto mb-4">
            <Repeat size={28} className="text-violet-400" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">No recurring items yet</h3>
          <p className="text-sm text-gray-500 mb-5 max-w-sm mx-auto">
            Add your salary, rent, EMIs, and subscriptions once. The app generates the transaction every time it's due.
          </p>
          <button onClick={() => setAdding(true)} className="btn-primary px-5 py-2.5 text-white text-sm font-semibold rounded-lg">
            Add your first recurring item
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {enriched.map(r => {
            const acc = accounts.find(a => a.id === r.accountId)
            const cat = categories.find(c => c.id === r.categoryId)
            return (
              <div key={r.id}
                className={`bg-bg-card border rounded-xl p-4 transition-colors ${
                  r.isDue ? 'border-amber-500/40' : !r.active ? 'border-line-subtle opacity-60' : 'border-line-subtle hover:border-line'
                } group`}>
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    r.type === 'income' ? 'bg-emerald-500/10' : 'bg-rose-500/10'
                  }`}>
                    <Repeat size={16} className={r.type === 'income' ? 'text-emerald-400' : 'text-rose-400'} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <span className="text-sm font-semibold text-white">{r.name}</span>
                      {r.isDue && (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300 bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 rounded inline-flex items-center gap-1">
                          <AlertCircle size={9} /> Due
                        </span>
                      )}
                      {!r.active && (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 bg-gray-500/15 border border-gray-500/30 px-1.5 py-0.5 rounded">
                          Paused
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1 text-xs text-gray-500">
                      <span className="capitalize">{r.frequency}</span>
                      {r.frequency === 'monthly' && <span>· day {r.dayOfMonth}</span>}
                      {cat && (
                        <span className="inline-flex items-center gap-1">·
                          <span style={{ color: cat.color }}>{cat.name}</span>
                        </span>
                      )}
                      {acc && <span className="inline-flex items-center gap-1">· <span style={{ color: acc.color }}>{acc.name}</span></span>}
                      {r.nextDue && (
                        <span className={`inline-flex items-center gap-1 ${r.isDue ? 'text-amber-400 font-medium' : ''}`}>
                          · <Calendar size={10} /> {r.isDue ? 'Due now' : `Next ${formatDate(r.nextDue)}`}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className={`text-base font-bold flex-shrink-0 ${
                    r.type === 'income' ? 'text-emerald-400' : 'text-rose-400'
                  }`}>
                    {r.type === 'income' ? '+' : '−'}{formatCurrency(r.amount)}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-1 mt-3 pt-3 border-t border-line-subtle">
                  {r.isDue && (
                    <button onClick={() => handleGenerateNow(r)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-300 hover:text-emerald-200 bg-emerald-500/10 hover:bg-emerald-500/15 border border-emerald-500/20 rounded-lg transition-colors">
                      <Check size={12} /> Generate Now
                    </button>
                  )}
                  <button onClick={() => togglePause(r)}
                    className="p-1.5 rounded-md text-gray-500 hover:text-amber-400 hover:bg-amber-500/10 transition-colors"
                    title={r.active ? 'Pause' : 'Resume'}>
                    {r.active ? <Pause size={13} /> : <Play size={13} />}
                  </button>
                  <button onClick={() => setEditing(r)}
                    className="p-1.5 rounded-md text-gray-500 hover:text-violet-400 hover:bg-violet-500/10 transition-colors">
                    <Pencil size={13} />
                  </button>
                  <button onClick={() => setConfirmDelete(r.id)}
                    className="p-1.5 rounded-md text-gray-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
