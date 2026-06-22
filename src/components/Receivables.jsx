import { useState, useMemo } from 'react'
import { Plus, Pencil, Trash2, X, Check, HandCoins, Clock, CheckCircle2, XCircle, Calendar, User, Users } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { generateId, formatCurrency, formatDate, formatDateFull } from '../utils/helpers'
import { inputCls, inputSmCls, labelCls } from '../utils/styles'
import ConfirmDialog from './ConfirmDialog'
import Modal from './Modal'

function ReceivableForm({ initial, onSave, onCancel }) {
  const [name, setName] = useState(initial?.name || '')
  const [amount, setAmount] = useState(initial ? String(initial.amount) : '')
  const [dueDate, setDueDate] = useState(initial?.dueDate || '')
  const [notes, setNotes] = useState(initial?.notes || '')
  const [error, setError] = useState('')

  function submit(e) {
    e.preventDefault()
    if (!name.trim()) return setError('Who owes? Enter a name.')
    const amt = Number(amount)
    if (!amt || amt <= 0) return setError('Enter a valid amount.')
    onSave({
      name: name.trim(),
      amount: amt,
      dueDate: dueDate || '',
      notes: notes.trim(),
    })
  }

  return (
    <Modal onClose={onCancel} title={initial ? 'Edit Receivable' : 'Add Receivable'} maxWidth="md">
      <form onSubmit={submit} className="px-6 py-5 space-y-4">
        <div>
          <label className={labelCls}>Who owes you?</label>
          <input autoFocus className={inputCls} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Rahul, Office, Refund" />
        </div>
        <div>
          <label className={labelCls}>Amount (₹)</label>
          <input className={inputCls} type="number" min="0" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" />
        </div>
        <div>
          <label className={labelCls}>Due Date <span className="text-gray-600">(optional)</span></label>
          <input className={inputCls} type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Notes <span className="text-gray-600">(optional)</span></label>
          <input className={inputCls} placeholder="What for?" value={notes} onChange={e => setNotes(e.target.value)} />
        </div>
        {error && <p className="text-rose-400 text-xs">{error}</p>}
        <button type="submit" className="btn-primary w-full py-2.5 text-white font-semibold rounded-lg text-sm">
          {initial ? 'Save Changes' : 'Add Receivable'}
        </button>
      </form>
    </Modal>
  )
}

function MarkReceivedModal({ receivable, onConfirm, onCancel }) {
  const { accounts, categories } = useApp()
  const incomeCategories = categories.filter(c => c.type === 'income')
  const [accountId, setAccountId] = useState(accounts[0]?.id || '')
  const [categoryId, setCategoryId] = useState(
    incomeCategories.find(c => c.name.toLowerCase().includes('other'))?.id || incomeCategories[0]?.id || ''
  )
  const [error, setError] = useState('')

  function submit(e) {
    e.preventDefault()
    if (!accountId) return setError('Pick an account')
    if (!categoryId) return setError('Pick a category')
    onConfirm({ accountId, categoryId })
  }

  return (
    <Modal onClose={onCancel} title="Mark Received" subtitle={`${formatCurrency(receivable.amount)} from ${receivable.name}`} maxWidth="sm">
      <form onSubmit={submit} className="px-6 py-5 space-y-4">
        <div>
          <label className={labelCls}>Received into account</label>
          <select className={inputCls} value={accountId} onChange={e => setAccountId(e.target.value)}>
            {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Category</label>
          <select className={inputCls} value={categoryId} onChange={e => setCategoryId(e.target.value)}>
            {incomeCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <p className="text-[11px] text-gray-500 bg-bg-elevated rounded-lg px-3 py-2 border border-line-subtle">
          ✓ A new income transaction will be created in this account
        </p>
        {error && <p className="text-rose-400 text-xs">{error}</p>}
        <div className="flex gap-2">
          <button type="submit" className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-lg transition-colors">
            Confirm Receipt
          </button>
          <button type="button" onClick={onCancel} className="px-4 text-gray-400 hover:text-white text-sm">
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  )
}

function StatCard({ label, value, count, icon: Icon, color }) {
  return (
    <div className="bg-bg-card border border-line-subtle rounded-xl p-4 sm:p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: color + '18', border: `1px solid ${color}20` }}>
          <Icon size={18} style={{ color }} />
        </div>
        {count !== undefined && (
          <span className="text-xs text-gray-500 font-medium">{count} item{count !== 1 ? 's' : ''}</span>
        )}
      </div>
      <div className="text-lg sm:text-xl font-bold text-white mb-1">{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  )
}

export default function Receivables() {
  const { receivables, addReceivable, updateReceivable, deleteReceivable, markReceivableReceived } = useApp()
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState(null)
  const [markingReceived, setMarkingReceived] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [filter, setFilter] = useState('pending') // pending | received | all

  const today = new Date().toISOString().slice(0, 10)

  const sorted = useMemo(() => {
    return [...receivables].sort((a, b) => {
      // Pending overdue first, then pending by due date, then received by receivedDate desc
      if (a.status !== b.status) {
        if (a.status === 'pending') return -1
        if (b.status === 'pending') return 1
      }
      const dateA = a.dueDate || a.createdAt || ''
      const dateB = b.dueDate || b.createdAt || ''
      return dateA.localeCompare(dateB)
    })
  }, [receivables])

  const filtered = filter === 'all' ? sorted : sorted.filter(r => r.status === filter)

  const pending = receivables.filter(r => r.status === 'pending')
  const overdue = pending.filter(r => r.dueDate && r.dueDate < today)
  const totalPending  = pending.reduce((s, r) => s + r.amount, 0)
  const totalOverdue  = overdue.reduce((s, r) => s + r.amount, 0)
  const totalReceived = receivables.filter(r => r.status === 'received').reduce((s, r) => s + r.amount, 0)

  function handleAdd(data) {
    addReceivable({ id: generateId(), ...data, status: 'pending', createdAt: new Date().toISOString() })
    setAdding(false)
  }

  function handleEdit(data) {
    updateReceivable(editing.id, data)
    setEditing(null)
  }

  function handleConfirmReceived({ accountId, categoryId }) {
    markReceivableReceived(markingReceived, accountId, categoryId)
    setMarkingReceived(null)
  }

  function handleWriteOff(r) {
    updateReceivable(r.id, { status: 'written-off' })
  }

  function handleReopen(r) {
    updateReceivable(r.id, { status: 'pending', receivedDate: '', receivedAccountId: '', linkedTransactionId: '' })
  }

  return (
    <div className="space-y-6 animate-in">
      {adding && <ReceivableForm onSave={handleAdd} onCancel={() => setAdding(false)} />}
      {editing && <ReceivableForm initial={editing} onSave={handleEdit} onCancel={() => setEditing(null)} />}
      {markingReceived && <MarkReceivedModal receivable={markingReceived} onConfirm={handleConfirmReceived} onCancel={() => setMarkingReceived(null)} />}
      {confirmDelete && (
        <ConfirmDialog title="Delete Receivable" message="This cannot be undone."
          onConfirm={() => { deleteReceivable(confirmDelete); setConfirmDelete(null) }}
          onCancel={() => setConfirmDelete(null)} />
      )}

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white">Receivables</h2>
          <p className="text-sm text-gray-500 mt-0.5">Money people owe you</p>
        </div>
        <button onClick={() => setAdding(true)}
          className="btn-primary flex items-center gap-2 px-4 py-2 text-white text-sm font-medium rounded-lg">
          <Plus size={15} /> Add Receivable
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <StatCard label="Pending"  value={formatCurrency(totalPending)} count={pending.length} icon={Clock} color="#f59e0b" />
        <StatCard label="Overdue"  value={formatCurrency(totalOverdue)} count={overdue.length} icon={Clock} color="#f43f5e" />
        <StatCard label="Received (all time)" value={formatCurrency(totalReceived)} count={receivables.filter(r => r.status === 'received').length} icon={CheckCircle2} color="#10b981" />
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 bg-bg-card border border-line-subtle rounded-lg p-1 w-fit">
        {[
          { id: 'pending',  label: 'Pending',  count: pending.length },
          { id: 'received', label: 'Received', count: receivables.filter(r => r.status === 'received').length },
          { id: 'all',      label: 'All',      count: receivables.length },
        ].map(t => (
          <button key={t.id} onClick={() => setFilter(t.id)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              filter === t.id ? 'bg-violet-500/20 text-violet-300' : 'text-gray-400 hover:text-gray-200'
            }`}>
            {t.label} <span className="text-gray-600 ml-1">{t.count}</span>
          </button>
        ))}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="bg-bg-card border border-line-subtle rounded-2xl p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mx-auto mb-4">
            <HandCoins size={28} className="text-violet-400" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">
            {filter === 'pending' ? 'No pending receivables' : filter === 'received' ? 'Nothing collected yet' : 'No receivables yet'}
          </h3>
          <p className="text-sm text-gray-500 mb-5 max-w-sm mx-auto">
            Track money lent to friends, refunds owed, or pending invoices — and convert them to income when paid.
          </p>
          {filter !== 'received' && (
            <button onClick={() => setAdding(true)} className="btn-primary px-5 py-2.5 text-white text-sm font-semibold rounded-lg">
              Add your first receivable
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(r => {
            const isOverdue = r.status === 'pending' && r.dueDate && r.dueDate < today
            const isReceived = r.status === 'received'
            const isWrittenOff = r.status === 'written-off'

            return (
              <div key={r.id}
                className={`bg-bg-card border rounded-xl p-4 group transition-colors ${
                  isOverdue ? 'border-rose-500/30' : 'border-line-subtle hover:border-line'
                }`}>
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    isReceived ? 'bg-emerald-500/15' : isWrittenOff ? 'bg-gray-500/15' : isOverdue ? 'bg-rose-500/15' : 'bg-amber-500/15'
                  }`}>
                    {isReceived ? <CheckCircle2 size={18} className="text-emerald-400" />
                     : isWrittenOff ? <XCircle size={18} className="text-gray-500" />
                     : <User size={18} className={isOverdue ? 'text-rose-400' : 'text-amber-400'} />}
                  </div>

                  {/* Main info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <span className={`text-sm font-semibold ${isWrittenOff ? 'text-gray-500 line-through' : 'text-white'}`}>
                        {r.name}
                      </span>
                      {r.sourceTransactionId && (
                        <span className="text-[10px] font-medium text-violet-300 bg-violet-500/10 border border-violet-500/20 px-1.5 py-0.5 rounded inline-flex items-center gap-1">
                          <Users size={9} /> Split
                        </span>
                      )}
                      {isOverdue && (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-rose-300 bg-rose-500/15 border border-rose-500/30 px-1.5 py-0.5 rounded">
                          Overdue
                        </span>
                      )}
                      {isReceived && (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.5 rounded">
                          Received
                        </span>
                      )}
                      {isWrittenOff && (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 bg-gray-500/15 border border-gray-500/30 px-1.5 py-0.5 rounded">
                          Written Off
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-gray-500">
                      {r.dueDate && (
                        <span className={`inline-flex items-center gap-1 ${isOverdue ? 'text-rose-400' : ''}`}>
                          <Calendar size={11} /> Due {formatDateFull(r.dueDate)}
                        </span>
                      )}
                      {isReceived && r.receivedDate && (
                        <span className="inline-flex items-center gap-1 text-emerald-400">
                          <CheckCircle2 size={11} /> Received {formatDate(r.receivedDate)}
                        </span>
                      )}
                      {r.notes && <span className="truncate max-w-[260px]">{r.notes}</span>}
                    </div>
                  </div>

                  {/* Amount */}
                  <div className={`text-base font-bold flex-shrink-0 ${
                    isReceived ? 'text-emerald-400' : isWrittenOff ? 'text-gray-500 line-through' : 'text-white'
                  }`}>
                    {formatCurrency(r.amount)}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-1 mt-3 pt-3 border-t border-line-subtle">
                  {r.status === 'pending' && (
                    <>
                      <button onClick={() => setMarkingReceived(r)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-300 hover:text-emerald-200 bg-emerald-500/10 hover:bg-emerald-500/15 border border-emerald-500/20 rounded-lg transition-colors">
                        <Check size={12} /> Mark Received
                      </button>
                      <button onClick={() => handleWriteOff(r)}
                        className="px-2.5 py-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors">
                        Write off
                      </button>
                    </>
                  )}
                  {(r.status === 'received' || r.status === 'written-off') && (
                    <button onClick={() => handleReopen(r)}
                      className="px-2.5 py-1.5 text-xs text-gray-500 hover:text-violet-300 transition-colors">
                      Reopen
                    </button>
                  )}
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
