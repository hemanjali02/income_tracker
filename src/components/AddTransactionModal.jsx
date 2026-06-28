import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ArrowLeftRight, Users } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { useBilling } from '../context/BillingContext'
import { generateId } from '../utils/helpers'
import { labelCls } from '../utils/styles'
import ProBadge from './billing/ProBadge'

const inputCls = `w-full bg-bg-input border border-line-subtle rounded-lg px-3 py-2.5 text-sm text-white
  placeholder-gray-500 focus:outline-none focus:border-violet-500 focus:bg-bg-elevated
  focus:ring-2 focus:ring-violet-500/20 transition-colors`

// Adds rose border when a specific field has an error
function fieldCls(errorField, thisField) {
  return inputCls + (errorField === thisField ? ' !border-rose-500/60' : '')
}

export default function AddTransactionModal({ onClose, editTx, defaultType }) {
  const { categories, accounts, transactions, addTransaction, updateTransaction, addTransfer, updateTransfer, addReceivable } = useApp()
  const { can, promptUpgrade } = useBilling()

  // Local visibility for exit animation
  const [visible, setVisible] = useState(true)
  function dismiss() {
    setVisible(false)
    setTimeout(onClose, 260)
  }

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

  // Split expense state — "I paid the full bill, others owe me back"
  const [showSplit, setShowSplit] = useState(false)
  const [splitMode, setSplitMode] = useState('equal') // 'equal' | 'custom'
  const [splitPeople, setSplitPeople] = useState([{ name: '', amount: '' }])
  const [splitIncludeMe, setSplitIncludeMe] = useState(true)
  const [splitDueDate, setSplitDueDate] = useState('')

  function fail(msg, field = '') { setError(msg); setErrorField(field) }

  function addSplitPerson() {
    setSplitPeople(prev => [...prev, { name: '', amount: '' }])
  }
  function removeSplitPerson(idx) {
    setSplitPeople(prev => prev.length <= 1 ? prev : prev.filter((_, i) => i !== idx))
  }
  function updateSplitPerson(idx, patch) {
    setSplitPeople(prev => prev.map((p, i) => i === idx ? { ...p, ...patch } : p))
  }

  // Compute equal share per person
  const splitParts = splitIncludeMe ? splitPeople.length + 1 : splitPeople.length
  const equalShare = (Number(amount) || 0) > 0 && splitParts > 0
    ? Math.round((Number(amount) / splitParts) * 100) / 100
    : 0

  // Total claimed from others (sum of amounts owed to me)
  const totalOwed = splitMode === 'equal'
    ? splitPeople.length * equalShare
    : splitPeople.reduce((s, p) => s + (Number(p.amount) || 0), 0)
  const myShare = (Number(amount) || 0) - totalOwed
  const overSplit = totalOwed > (Number(amount) || 0) + 0.5

  // Transfer-specific — resolve from/to regardless of which leg was clicked for edit
  const [fromAccountId, setFromAccountId] = useState(() => {
    if (!editTx || editTx.type !== 'transfer') return ''
    return editTx.transferDirection === 'out' ? editTx.accountId : (editTx.fromAccountId || '')
  })
  const [toAccountId, setToAccountId] = useState(() => {
    if (!editTx || editTx.type !== 'transfer') return ''
    return editTx.transferDirection === 'in' ? editTx.accountId : (editTx.toAccountId || '')
  })

  // Sort categories: most recently used first (per type), then alphabetical
  const filteredCats = (() => {
    const cats = categories.filter(c => c.type === type)
    const lastUsedMap = {}
    for (const tx of transactions) {
      if (tx.type !== type || !tx.categoryId) continue
      if (!lastUsedMap[tx.categoryId] || tx.date > lastUsedMap[tx.categoryId]) {
        lastUsedMap[tx.categoryId] = tx.date
      }
    }
    return [...cats].sort((a, b) => {
      const la = lastUsedMap[a.id] || ''
      const lb = lastUsedMap[b.id] || ''
      if (la !== lb) return lb.localeCompare(la)
      return a.name.localeCompare(b.name)
    })
  })()

  // Sort accounts: most recently used first
  const sortedAccounts = (() => {
    const lastUsedMap = {}
    for (const tx of transactions) {
      if (!tx.accountId) continue
      if (!lastUsedMap[tx.accountId] || tx.date > lastUsedMap[tx.accountId]) {
        lastUsedMap[tx.accountId] = tx.date
      }
    }
    return [...accounts].sort((a, b) => {
      const la = lastUsedMap[a.id] || ''
      const lb = lastUsedMap[b.id] || ''
      if (la !== lb) return lb.localeCompare(la)
      return a.name.localeCompare(b.name)
    })
  })()

  useEffect(() => { if (!editTx && type !== 'transfer') setCategoryId('') }, [type, editTx])

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') dismiss() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
      dismiss()
      return
    }

    if (!name.trim()) return fail('Please enter a name.', 'name')
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) return fail('Please enter a valid amount.', 'amount')
    if (!categoryId) return fail('Please select a category.', 'category')
    if (!accountId) return fail('Please select an account.', 'account')
    if (!date) return fail('Please select a date.', 'date')

    // Validate split if active
    if (showSplit && !editTx) {
      const validPeople = splitPeople.filter(p => p.name.trim())
      if (validPeople.length === 0) return fail('Add at least one person to split with', '')
      if (splitMode === 'custom') {
        if (validPeople.some(p => !p.amount || Number(p.amount) <= 0)) {
          return fail('Enter an amount for each person', '')
        }
      }
      if (overSplit) return fail('Amounts owed exceed what you paid', 'amount')
    }

    let finalNotes = notes.trim()
    let splitNote = ''
    if (showSplit && !editTx) {
      const valid = splitPeople.filter(p => p.name.trim())
      splitNote = `Split with ${valid.map(p => p.name.trim()).join(', ')}`
      finalNotes = finalNotes ? `${splitNote} · ${finalNotes}` : splitNote
    }

    const txId = editTx?.id || generateId()
    const tx = {
      id: txId,
      type, name: name.trim(), amount: Number(amount),
      categoryId, accountId, date, notes: finalNotes,
    }

    if (editTx) updateTransaction(editTx.id, tx)
    else addTransaction(tx)

    // Create receivables for each person who owes
    if (showSplit && !editTx) {
      const valid = splitPeople.filter(p => p.name.trim())
      for (const person of valid) {
        const owedAmount = splitMode === 'equal' ? equalShare : Number(person.amount)
        if (owedAmount > 0) {
          addReceivable({
            id: generateId(),
            name: person.name.trim(),
            amount: owedAmount,
            dueDate: splitDueDate || '',
            notes: `Split from "${name.trim()}" (${date})`,
            status: 'pending',
            sourceTransactionId: txId,
            createdAt: new Date().toISOString(),
          })
        }
      }
    }

    dismiss()
  }

  const typeButtons = [
    { value: 'expense', label: '↑ Expense', active: 'bg-rose-500/20 text-rose-300 border border-rose-500/40' },
    { value: 'income', label: '↓ Income', active: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' },
    { value: 'transfer', label: 'Transfer', active: 'bg-blue-500/20 text-blue-300 border border-blue-500/40' },
  ]

  return (
    <AnimatePresence>
      {visible && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={dismiss}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 220, damping: 28 }}
            onClick={e => e.stopPropagation()}
            className="relative glass rounded-t-2xl sm:rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-line sticky top-0 bg-bg-card/95 backdrop-blur-md z-10">
              <h2 className="text-white font-semibold text-base">
                {editTx ? (isEditingTransfer ? 'Edit Transfer' : 'Edit Transaction') : 'Add Transaction'}
              </h2>
              <button onClick={dismiss} className="text-gray-400 hover:text-white transition-colors">
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
                    {sortedAccounts.map(a => (
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
                    {sortedAccounts.map(a => (
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
                <div className="flex items-center justify-between mb-1.5">
                  <label className={labelCls.replace(' mb-1.5', '')}>Amount (₹)</label>
                  {type === 'expense' && !editTx && (
                    <button type="button"
                      onClick={() => can('splitExpenses') ? setShowSplit(s => !s) : promptUpgrade('splitExpenses')}
                      className={`flex items-center gap-1 text-[11px] font-medium transition-colors ${
                        showSplit ? 'text-violet-300' : 'text-gray-500 hover:text-violet-400'
                      }`}>
                      <Users size={11} /> {showSplit ? 'Cancel split' : 'Split with others'}
                      {!can('splitExpenses') && <ProBadge size="xs" />}
                    </button>
                  )}
                </div>
                <input className={fieldCls(errorField, 'amount')} type="number" min="0" step="0.01" placeholder="0"
                  value={amount} onChange={e => setAmount(e.target.value)} />
                {showSplit && (
                  <p className="text-[11px] text-violet-300 mt-1.5">
                    💡 Enter the <strong>full amount you paid</strong>. The split below creates receivables for what others owe you.
                  </p>
                )}
              </div>

              {showSplit && (
                <div className="p-3 bg-violet-500/5 rounded-lg border border-violet-500/20 space-y-3 animate-in">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-semibold text-violet-300">
                      <Users size={12} /> Who owes you back?
                    </div>
                    <label className="flex items-center gap-1.5 text-[11px] text-gray-400 cursor-pointer">
                      <input type="checkbox" checked={splitIncludeMe} onChange={e => setSplitIncludeMe(e.target.checked)} className="!w-3.5 !h-3.5" />
                      Include my share in split
                    </label>
                  </div>

                  {/* Mode toggle */}
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'equal', label: 'Equal split' },
                      { id: 'custom', label: 'Custom amounts' },
                    ].map(m => (
                      <button key={m.id} type="button" onClick={() => setSplitMode(m.id)}
                        className={`py-1.5 rounded-md text-xs font-medium transition-colors ${
                          splitMode === m.id ? 'bg-violet-500/20 text-violet-300 border border-violet-500/40' : 'bg-bg-input text-gray-400 border border-line-subtle'
                        }`}>
                        {m.label}
                      </button>
                    ))}
                  </div>

                  {/* People list */}
                  <div className="space-y-1.5">
                    {splitPeople.map((p, i) => (
                      <div key={i} className="flex items-center gap-1.5">
                        <input
                          className="flex-1 bg-bg-input border border-line-subtle rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-violet-500"
                          placeholder="Name"
                          value={p.name}
                          onChange={e => updateSplitPerson(i, { name: e.target.value })}
                        />
                        {splitMode === 'equal' ? (
                          <div className="w-24 px-2.5 py-1.5 text-xs text-violet-300 bg-violet-500/5 border border-violet-500/20 rounded-lg text-right font-medium">
                            ₹{equalShare.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                          </div>
                        ) : (
                          <input
                            type="number" min="0" step="0.01"
                            className="w-24 bg-bg-input border border-line-subtle rounded-lg px-2.5 py-1.5 text-xs text-white text-right focus:outline-none focus:border-violet-500"
                            placeholder="₹0"
                            value={p.amount}
                            onChange={e => updateSplitPerson(i, { amount: e.target.value })}
                          />
                        )}
                        <button type="button" onClick={() => removeSplitPerson(i)}
                          className="p-1.5 text-gray-500 hover:text-rose-400 transition-colors"
                          disabled={splitPeople.length === 1}>
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>

                  <button type="button" onClick={addSplitPerson}
                    className="w-full py-1.5 text-xs font-medium text-violet-300 border border-dashed border-violet-500/30 rounded-lg hover:bg-violet-500/10 transition-colors">
                    + Add person
                  </button>

                  {/* Due date */}
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-gray-500 mb-1">Due date (optional)</label>
                    <input type="date" value={splitDueDate} onChange={e => setSplitDueDate(e.target.value)}
                      className="w-full bg-bg-input border border-line-subtle rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-violet-500" />
                  </div>

                  {/* Summary */}
                  <div className="pt-2 mt-2 border-t border-violet-500/20 grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <div className="text-gray-500">You'll be owed</div>
                      <div className={`text-sm font-bold ${overSplit ? 'text-rose-400' : 'text-violet-300'}`}>
                        ₹{totalOwed.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-gray-500">Your net share</div>
                      <div className={`text-sm font-bold ${myShare < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                        ₹{Math.max(0, myShare).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>
                  {overSplit && (
                    <p className="text-[11px] text-rose-400">⚠️ Total owed exceeds what you paid</p>
                  )}
                </div>
              )}

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
                    {sortedAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
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
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
