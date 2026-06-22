import { useState, useMemo } from 'react'
import { Plus, Pencil, Trash2, X, Flag, CheckCircle2, Calendar, TrendingUp, PiggyBank } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { generateId, formatCurrency, formatDateFull, getAccountBalance } from '../utils/helpers'
import { inputCls, labelCls } from '../utils/styles'
import ColorPicker from './ColorPicker'
import ConfirmDialog from './ConfirmDialog'

function GoalForm({ initial, onSave, onCancel }) {
  const { accounts, transactions } = useApp()
  const [name, setName]                   = useState(initial?.name || '')
  const [targetAmount, setTargetAmount]   = useState(initial ? String(initial.targetAmount) : '')
  const [currentAmount, setCurrentAmount] = useState(initial ? String(initial.currentAmount || 0) : '')
  const [targetDate, setTargetDate]       = useState(initial?.targetDate || '')
  const [accountId, setAccountId]         = useState(initial?.accountId || '')
  const [color, setColor]                 = useState(initial?.color || '#8b5cf6')
  const [notes, setNotes]                 = useState(initial?.notes || '')
  const [error, setError]                 = useState('')

  // When linked to an account, current amount is the account balance
  const linkedAccount = accounts.find(a => a.id === accountId)
  const linkedBalance = linkedAccount ? getAccountBalance(transactions, linkedAccount) : null

  function submit(e) {
    e.preventDefault()
    if (!name.trim()) return setError('Enter a goal name.')
    const target = Number(targetAmount)
    if (!target || target <= 0) return setError('Enter a target amount.')
    onSave({
      name: name.trim(),
      targetAmount: target,
      currentAmount: accountId ? Math.max(0, linkedBalance || 0) : (Number(currentAmount) || 0),
      targetDate: targetDate || '',
      accountId: accountId || '',
      color,
      notes: notes.trim(),
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onCancel}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <form onSubmit={submit} className="relative glass rounded-2xl w-full max-w-md shadow-2xl animate-in" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-line">
          <h2 className="text-white font-semibold text-base">{initial ? 'Edit Goal' : 'New Goal'}</h2>
          <button type="button" onClick={onCancel} className="text-gray-400 hover:text-white">
            <X size={18} />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className={labelCls}>Goal Name</label>
            <input autoFocus className={inputCls} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Goa trip, Emergency fund, New laptop" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Target Amount (₹)</label>
              <input className={inputCls} type="number" min="0" step="0.01" value={targetAmount} onChange={e => setTargetAmount(e.target.value)} placeholder="0" />
            </div>
            <div>
              <label className={labelCls}>Target Date <span className="text-gray-600">(optional)</span></label>
              <input className={inputCls} type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)} />
            </div>
          </div>

          <div>
            <label className={labelCls}>Link to Account <span className="text-gray-600">(auto-tracks balance)</span></label>
            <select className={inputCls} value={accountId} onChange={e => setAccountId(e.target.value)}>
              <option value="">No linked account — manual tracking</option>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            {accountId && linkedBalance !== null && (
              <p className="text-[11px] text-violet-400 mt-1">
                Current balance: {formatCurrency(linkedBalance)}
              </p>
            )}
          </div>

          {!accountId && (
            <div>
              <label className={labelCls}>Saved so far (₹)</label>
              <input className={inputCls} type="number" min="0" step="0.01" value={currentAmount} onChange={e => setCurrentAmount(e.target.value)} placeholder="0" />
            </div>
          )}

          <div>
            <label className={labelCls}>Color</label>
            <ColorPicker value={color} onChange={setColor} />
          </div>

          <div>
            <label className={labelCls}>Notes <span className="text-gray-600">(optional)</span></label>
            <input className={inputCls} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Why this goal matters" />
          </div>

          {error && <p className="text-rose-400 text-xs">{error}</p>}
          <button type="submit" className="btn-primary w-full py-2.5 text-white font-semibold rounded-lg text-sm">
            {initial ? 'Save Changes' : 'Create Goal'}
          </button>
        </div>
      </form>
    </div>
  )
}

function ContributeModal({ goal, onConfirm, onCancel }) {
  const [amount, setAmount] = useState('')
  const [error, setError] = useState('')
  function submit(e) {
    e.preventDefault()
    const amt = Number(amount)
    if (!amt || amt <= 0) return setError('Enter an amount')
    onConfirm(amt)
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onCancel}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <form onSubmit={submit} className="relative glass rounded-2xl w-full max-w-xs shadow-2xl animate-in" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-line">
          <h2 className="text-white font-semibold text-sm">Add to "{goal.name}"</h2>
        </div>
        <div className="px-5 py-4 space-y-3">
          <input autoFocus className={inputCls} type="number" min="0" step="0.01" placeholder="Amount" value={amount} onChange={e => setAmount(e.target.value)} />
          {error && <p className="text-rose-400 text-xs">{error}</p>}
          <div className="flex gap-2">
            <button type="submit" className="flex-1 py-2 btn-primary text-white text-sm font-semibold rounded-lg">Add</button>
            <button type="button" onClick={onCancel} className="px-3 py-2 text-gray-400 hover:text-white text-sm">Cancel</button>
          </div>
        </div>
      </form>
    </div>
  )
}

export default function Goals() {
  const { goals, transactions, accounts, addGoal, updateGoal, deleteGoal } = useApp()
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState(null)
  const [contributing, setContributing] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)

  const today = new Date()

  // Compute progress: if linked to account, use account balance live
  const goalsWithProgress = useMemo(() =>
    goals.map(g => {
      const current = g.accountId
        ? Math.max(0, getAccountBalance(transactions, accounts.find(a => a.id === g.accountId) || g.accountId))
        : (g.currentAmount || 0)
      const pct = g.targetAmount > 0 ? Math.min(100, (current / g.targetAmount) * 100) : 0
      let daysLeft = null
      let monthsLeft = null
      if (g.targetDate) {
        const target = new Date(g.targetDate)
        daysLeft = Math.ceil((target - today) / (1000 * 60 * 60 * 24))
        monthsLeft = Math.max(0, Math.ceil(daysLeft / 30))
      }
      const remaining = Math.max(0, g.targetAmount - current)
      const monthlyNeed = monthsLeft > 0 ? remaining / monthsLeft : remaining
      return { ...g, currentLive: current, pct, daysLeft, monthsLeft, remaining, monthlyNeed }
    }).sort((a, b) => {
      // completed at bottom
      const aDone = a.pct >= 100, bDone = b.pct >= 100
      if (aDone !== bDone) return aDone ? 1 : -1
      // overdue/closer dates higher
      if (a.daysLeft != null && b.daysLeft != null) return a.daysLeft - b.daysLeft
      return 0
    }),
    [goals, transactions]
  )

  const totalTarget = goalsWithProgress.reduce((s, g) => s + g.targetAmount, 0)
  const totalCurrent = goalsWithProgress.reduce((s, g) => s + g.currentLive, 0)
  const completed = goalsWithProgress.filter(g => g.pct >= 100).length

  function handleAdd(data) {
    addGoal({ id: generateId(), ...data, status: 'active', createdAt: new Date().toISOString() })
    setAdding(false)
  }

  function handleEdit(data) {
    updateGoal(editing.id, data)
    setEditing(null)
  }

  function handleContribute(amount) {
    updateGoal(contributing.id, { currentAmount: (contributing.currentAmount || 0) + amount })
    setContributing(null)
  }

  return (
    <div className="space-y-6 animate-in">
      {adding && <GoalForm onSave={handleAdd} onCancel={() => setAdding(false)} />}
      {editing && <GoalForm initial={editing} onSave={handleEdit} onCancel={() => setEditing(null)} />}
      {contributing && <ContributeModal goal={contributing} onConfirm={handleContribute} onCancel={() => setContributing(null)} />}
      {confirmDelete && (
        <ConfirmDialog title="Delete Goal" message="This cannot be undone."
          onConfirm={() => { deleteGoal(confirmDelete); setConfirmDelete(null) }}
          onCancel={() => setConfirmDelete(null)} />
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white">Financial Goals</h2>
          <p className="text-sm text-gray-500 mt-0.5">Save with purpose · {completed} of {goals.length} reached</p>
        </div>
        <button onClick={() => setAdding(true)}
          className="btn-primary flex items-center gap-2 px-4 py-2 text-white text-sm font-medium rounded-lg">
          <Plus size={15} /> New Goal
        </button>
      </div>

      {/* Overall progress */}
      {goals.length > 0 && (
        <div className="bg-bg-card border border-line-subtle rounded-xl p-5">
          <div className="flex justify-between items-baseline mb-3">
            <span className="text-sm font-semibold text-white">Total saved across goals</span>
            <span className="text-sm font-bold text-violet-300">
              {formatCurrency(totalCurrent)} <span className="text-gray-500 font-normal">of {formatCurrency(totalTarget)}</span>
            </span>
          </div>
          <div className="h-2 bg-bg-elevated rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, totalTarget > 0 ? (totalCurrent / totalTarget) * 100 : 0)}%` }} />
          </div>
        </div>
      )}

      {/* Goals list */}
      {goals.length === 0 ? (
        <div className="bg-bg-card border border-line-subtle rounded-2xl p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mx-auto mb-4">
            <Flag size={28} className="text-violet-400" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">Set your first goal</h3>
          <p className="text-sm text-gray-500 mb-5 max-w-sm mx-auto">
            Saving without a goal is hoping. Set a target, link an account, and watch progress every time you save.
          </p>
          <button onClick={() => setAdding(true)} className="btn-primary px-5 py-2.5 text-white text-sm font-semibold rounded-lg">
            Create your first goal
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {goalsWithProgress.map(g => {
            const linkedAccount = accounts.find(a => a.id === g.accountId)
            const isComplete = g.pct >= 100
            const isLate = g.daysLeft != null && g.daysLeft < 0 && !isComplete

            return (
              <div key={g.id}
                className={`bg-bg-card border rounded-xl p-5 group transition-colors relative overflow-hidden ${
                  isComplete ? 'border-emerald-500/30' : isLate ? 'border-rose-500/30' : 'border-line-subtle hover:border-line'
                }`}>
                {/* Color accent */}
                <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: g.color }} />

                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: g.color + '20', border: `1px solid ${g.color}40` }}>
                      {isComplete
                        ? <CheckCircle2 size={18} style={{ color: g.color }} />
                        : <Flag size={18} style={{ color: g.color }} />
                      }
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-white truncate">{g.name}</div>
                      <div className="text-xs text-gray-500 mt-0.5 truncate">
                        {linkedAccount ? `Tracking · ${linkedAccount.name}` : 'Manual tracking'}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <button onClick={() => setEditing(g)}
                      className="p-1.5 rounded-md text-gray-500 hover:text-violet-400 hover:bg-violet-500/10 transition-colors">
                      <Pencil size={13} />
                    </button>
                    <button onClick={() => setConfirmDelete(g.id)}
                      className="p-1.5 rounded-md text-gray-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Amount + progress */}
                <div className="flex justify-between items-baseline mb-2">
                  <span className="text-xl font-bold" style={{ color: isComplete ? '#10b981' : 'white' }}>
                    {formatCurrency(g.currentLive)}
                  </span>
                  <span className="text-sm text-gray-500">
                    of {formatCurrency(g.targetAmount)}
                  </span>
                </div>
                <div className="h-2 bg-bg-elevated rounded-full overflow-hidden mb-2">
                  <div className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${g.pct}%`, backgroundColor: g.color }} />
                </div>
                <div className="flex justify-between text-xs">
                  <span className={`font-medium ${isComplete ? 'text-emerald-400' : 'text-gray-400'}`}>
                    {Math.round(g.pct)}%{isComplete && ' · Goal reached!'}
                  </span>
                  {g.targetDate && !isComplete && (
                    <span className={`flex items-center gap-1 ${isLate ? 'text-rose-400' : 'text-gray-500'}`}>
                      <Calendar size={11} />
                      {isLate ? `${Math.abs(g.daysLeft)}d overdue` : g.daysLeft === 0 ? 'Due today' : `${g.daysLeft}d left`}
                    </span>
                  )}
                </div>

                {/* Suggested monthly save */}
                {!isComplete && g.monthsLeft > 0 && g.monthlyNeed > 0 && (
                  <div className="mt-3 pt-3 border-t border-line-subtle flex items-center gap-2 text-xs">
                    <PiggyBank size={12} className="text-violet-400" />
                    <span className="text-gray-400">
                      Save <span className="text-violet-300 font-semibold">{formatCurrency(Math.round(g.monthlyNeed))}/mo</span> to hit goal
                    </span>
                  </div>
                )}

                {/* Action buttons */}
                {!linkedAccount && !isComplete && (
                  <div className="mt-3 pt-3 border-t border-line-subtle flex gap-2">
                    <button onClick={() => setContributing(g)}
                      className="flex-1 py-1.5 text-xs font-medium text-violet-300 hover:text-violet-200 bg-violet-500/10 hover:bg-violet-500/15 border border-violet-500/20 rounded-lg transition-colors">
                      <TrendingUp size={11} className="inline mr-1" /> Add Progress
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
