import { useState, useEffect } from 'react'
import { X, ArrowLeftRight } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { generateId } from '../utils/helpers'
import { labelCls } from '../utils/styles'

const inputCls = `w-full bg-bg-input border border-line-subtle rounded-lg px-3 py-2.5 text-sm text-white
  placeholder-gray-500 focus:outline-none focus:border-violet-500 focus:bg-bg-elevated
  focus:ring-2 focus:ring-violet-500/20 transition-colors`

// Adds rose border when a specific field has an error
function fieldCls(errorField, thisField) {
  return inputCls + (errorField === thisField ? ' !border-rose-500/60' : '')
}

export default function AddTransactionModal({ onClose, editTx, defaultType }) {
  const { categories, accounts, addTransaction, updateTransaction, addTransfer, updateTransfer } = useApp()

  const isEditingTransfer = editTx?.type === 'transfer'

  const [type, setType] = useState(editTx?.type || defaultType || 'expense')
  const [name, setName] = useState(editTx?.name || '')
  const [amount, setAmount] = useState(editTx ? String(editTx.amount) : '')
  const [categoryId, setCategoryId] = useState(editTx?.categoryId || '')
  const [accountId, setAccountId] = useState(editTx?.accountId || '')
  const [date, setDate] = useState(editTx?.date || new Date().toISOString().slice(0, 10))
  const [notes, setNotes] = useState(editTx?.notes || '')
  const [error, setError] = useState('')
  const [errorField, setErrorField] = useState('')

  function fail(msg, field = '') { setError(msg); setErrorField(field) }

  // Transfer-specific — resolve from/to regardless of which leg was clicked for edit
  const [fromAccountId, setFromAccountId] = useState(() => {
    if (!editTx || editTx.type !== 'transfer') return ''
    return editTx.transferDirection === 'out' ? editTx.accountId : (editTx.fromAccountId || '')
  })
  const [toAccountId, setToAccountId] = useState(() => {
    if (!editTx || editTx.type !== 'transfer') return ''
    return editTx.transferDirection === 'in' ? editTx.accountId : (editTx.toAccountId || '')
  })

  const filteredCats = categories.filter(c => c.type === type)

  useEffect(() => { if (!editTx && type !== 'transfer') setCategoryId('') }, [type, editTx])

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function handleSubmit(e) {
    e.preventDefault()
    setError(''); setErrorField('')

    if (type === 'transfer') {
      if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) return fail('Please enter a valid amount.', 'amount')
      if (!fromAccountId) return fail('Please select the source account.', 'fromAccount')
      if (!toAccountId) return fail('Please select the destination account.', 'toAccount')
      if (fromAccountId === toAccountId) return fail('Source and destination accounts must be different.', 'toAccount')
      if (!date) return fail('Please select a date.', 'date')

      const fromAcc = accounts.find(a => a.id === fromAccountId)
      const toAcc = accounts.find(a => a.id === toAccountId)
      const txName = name.trim() || `Transfer: ${fromAcc?.name} → ${toAcc?.name}`

      if (isEditingTransfer) {
        updateTransfer(editTx.transferId, { name: txName, amount: Number(amount), date, notes: notes.trim() })
      } else {
        addTransfer({
          fromAccountId,
          toAccountId,
          amount: Number(amount),
          name: txName,
          date,
          notes: notes.trim(),
        })
      }
      onClose()
      return
    }

    if (!name.trim()) return fail('Please enter a name.', 'name')
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) return fail('Please enter a valid amount.', 'amount')
    if (!categoryId) return fail('Please select a category.', 'category')
    if (!accountId) return fail('Please select an account.', 'account')
    if (!date) return fail('Please select a date.', 'date')

    const tx = {
      id: editTx?.id || generateId(),
      type, name: name.trim(), amount: Number(amount),
      categoryId, accountId, date, notes: notes.trim(),
    }

    if (editTx) updateTransaction(editTx.id, tx)
    else addTransaction(tx)
    onClose()
  }

  const typeButtons = [
    { value: 'expense', label: '↑ Expense', active: 'bg-rose-500/20 text-rose-300 border border-rose-500/40' },
    { value: 'income', label: '↓ Income', active: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' },
    { value: 'transfer', label: 'Transfer', active: 'bg-blue-500/20 text-blue-300 border border-blue-500/40' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="relative glass rounded-2xl w-full max-w-md shadow-2xl animate-in" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-line">
          <h2 className="text-white font-semibold text-base">
            {editTx ? (isEditingTransfer ? 'Edit Transfer' : 'Edit Transaction') : 'Add Transaction'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {!isEditingTransfer && (
            <div>
              <label className={labelCls}>Type</label>
              <div className="flex gap-2">
                {typeButtons.map(({ value, label, active }) => (
                  <button key={value} type="button" onClick={() => setType(value)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all capitalize ${
                      type === value ? active : 'bg-bg-input text-gray-400 border border-line hover:border-line-bright'
                    }`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {type === 'transfer' ? (
            <>
              <div>
                <label className={labelCls}>Amount (₹)</label>
                <input autoFocus className={fieldCls(errorField, 'amount')} type="number" min="0" step="0.01" placeholder="0"
                  value={amount} onChange={e => setAmount(e.target.value)} />
              </div>

              <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-end">
                <div>
                  <label className={labelCls}>From Account</label>
                  <select className={fieldCls(errorField, 'fromAccount')} value={fromAccountId} onChange={e => setFromAccountId(e.target.value)}>
                    <option value="">Select...</option>
                    {accounts.map(a => (
                      <option key={a.id} value={a.id} disabled={a.id === toAccountId}>{a.name}</option>
                    ))}
                  </select>
                </div>
                <div className="pb-2.5 flex items-center justify-center">
                  <div className="w-7 h-7 rounded-full bg-blue-500/15 border border-blue-500/30 flex items-center justify-center">
                    <ArrowLeftRight size={13} className="text-blue-400" />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>To Account</label>
                  <select className={fieldCls(errorField, 'toAccount')} value={toAccountId} onChange={e => setToAccountId(e.target.value)}>
                    <option value="">Select...</option>
                    {accounts.map(a => (
                      <option key={a.id} value={a.id} disabled={a.id === fromAccountId}>{a.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className={labelCls}>Description <span className="text-gray-600">(optional)</span></label>
                <input className={inputCls} placeholder="e.g. Move savings to HDFC"
                  value={name} onChange={e => setName(e.target.value)} />
              </div>

              <div>
                <label className={labelCls}>Date</label>
                <input className={fieldCls(errorField, 'date')} type="date" value={date} onChange={e => setDate(e.target.value)} />
              </div>

              <div>
                <label className={labelCls}>Notes <span className="text-gray-600">(optional)</span></label>
                <input className={inputCls} placeholder="Any additional details..." value={notes} onChange={e => setNotes(e.target.value)} />
              </div>
            </>
          ) : (
            <>
              <div>
                <label className={labelCls}>Name / Description</label>
                <input autoFocus className={fieldCls(errorField, 'name')} placeholder="e.g. KFC, Monthly Salary"
                  value={name} onChange={e => setName(e.target.value)} />
              </div>

              <div>
                <label className={labelCls}>Amount (₹)</label>
                <input className={fieldCls(errorField, 'amount')} type="number" min="0" step="0.01" placeholder="0"
                  value={amount} onChange={e => setAmount(e.target.value)} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Category</label>
                  <select className={fieldCls(errorField, 'category')} value={categoryId} onChange={e => setCategoryId(e.target.value)}>
                    <option value="">Select...</option>
                    {filteredCats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Account</label>
                  <select className={fieldCls(errorField, 'account')} value={accountId} onChange={e => setAccountId(e.target.value)}>
                    <option value="">Select...</option>
                    {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className={labelCls}>Date</label>
                <input className={fieldCls(errorField, 'date')} type="date" value={date} onChange={e => setDate(e.target.value)} />
              </div>

              <div>
                <label className={labelCls}>Notes <span className="text-gray-600">(optional)</span></label>
                <input className={inputCls} placeholder="Any additional details..." value={notes} onChange={e => setNotes(e.target.value)} />
              </div>
            </>
          )}

          {error && <p className="text-rose-400 text-xs">{error}</p>}

          <button type="submit" className={`w-full py-2.5 text-white font-semibold rounded-lg text-sm mt-1 transition-all ${
            type === 'transfer'
              ? 'bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-900/30'
              : 'btn-primary'
          }`}>
            {editTx
              ? isEditingTransfer ? 'Save Transfer' : 'Save Changes'
              : type === 'transfer' ? 'Record Transfer' : 'Add Transaction'
            }
          </button>
        </form>
      </div>
    </div>
  )
}
