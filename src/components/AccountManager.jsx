import { useState, useMemo } from 'react'
import { Plus, Pencil, Trash2, X, Check, CreditCard, ArrowLeftRight, ChevronLeft, ArrowUpRight, ArrowDownRight, Activity, Building2, Banknote, Wallet as WalletIcon } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { generateId, formatCurrency, formatDate, formatCompact, getAccountBalance } from '../utils/helpers'
import { inputSmCls, labelCls } from '../utils/styles'
import ColorPicker from './ColorPicker'
import ConfirmDialog from './ConfirmDialog'
import AddTransactionModal from './AddTransactionModal'

export const ACCOUNT_TYPES = [
  { id: 'bank',   label: 'Bank',        icon: Building2  },
  { id: 'cash',   label: 'Cash',        icon: Banknote   },
  { id: 'wallet', label: 'Wallet',      icon: WalletIcon },
  { id: 'credit', label: 'Credit Card', icon: CreditCard },
]

export function AccountIcon({ type, color, size = 18 }) {
  const Icon = ACCOUNT_TYPES.find(t => t.id === type)?.icon || Building2
  return (
    <div className="w-10 h-10 rounded-xl flex items-center justify-center"
      style={{ backgroundColor: color + '15', border: `1px solid ${color}20` }}>
      <Icon size={size} style={{ color }} />
    </div>
  )
}

function AccountForm({ initial, onSave, onCancel }) {
  const [name, setName] = useState(initial?.name || '')
  const [color, setColor] = useState(initial?.color || '#7c3aed')
  const [accountType, setAccountType] = useState(initial?.accountType || 'bank')
  const [error, setError] = useState('')

  function submit(e) {
    e.preventDefault()
    if (!name.trim()) return setError('Name is required')
    onSave({ name: name.trim(), color, accountType })
  }

  return (
    <form onSubmit={submit} className="p-4 bg-bg-elevated rounded-xl border border-line-subtle space-y-3 animate-in">
      <div>
        <label className={labelCls}>Account Name</label>
        <input autoFocus className={inputSmCls} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. SBI, HDFC, Cash" />
      </div>
      <div>
        <label className={labelCls}>Type</label>
        <div className="grid grid-cols-4 gap-2">
          {ACCOUNT_TYPES.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" onClick={() => setAccountType(id)}
              className={`flex flex-col items-center gap-1 py-2 rounded-lg border text-xs transition-all ${
                accountType === id ? 'bg-violet-500/15 border-violet-500/40 text-violet-300' : 'border-line-subtle text-gray-500 hover:border-line hover:text-gray-300'
              }`}>
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className={labelCls}>Color</label>
        <ColorPicker value={color} onChange={setColor} />
      </div>
      {error && <p className="text-rose-400 text-xs">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium rounded-lg transition-colors">
          <Check size={12} /> Save
        </button>
        <button type="button" onClick={onCancel} className="flex items-center gap-1.5 px-3 py-2 text-gray-400 hover:text-white text-xs transition-colors">
          <X size={12} /> Cancel
        </button>
      </div>
    </form>
  )
}

function AccountDetail({ acc, transactions, categories, accounts, onBack, onEdit, onDelete }) {
  const [editTx, setEditTx] = useState(null)

  const accTxs = useMemo(() =>
    [...transactions.filter(t => t.accountId === acc.id)]
      .sort((a, b) => b.date.localeCompare(a.date)),
    [transactions, acc.id]
  )

  const balance = getAccountBalance(transactions, acc.id)
  const income = accTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const expense = accTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const transfersIn = accTxs.filter(t => t.type === 'transfer' && t.transferDirection === 'in').reduce((s, t) => s + t.amount, 0)
  const transfersOut = accTxs.filter(t => t.type === 'transfer' && t.transferDirection === 'out').reduce((s, t) => s + t.amount, 0)

  return (
    <div className="space-y-5 animate-in">
      {editTx && <AddTransactionModal editTx={editTx} onClose={() => setEditTx(null)} />}

      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack}
          className="p-2 rounded-lg bg-bg-card border border-line-subtle text-gray-400 hover:text-white hover:border-line transition-colors">
          <ChevronLeft size={15} />
        </button>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="flex-shrink-0">
            <AccountIcon type={acc.accountType} color={acc.color} />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-white">{acc.name}</h2>
            <p className="text-xs text-gray-500">{accTxs.length} transactions</p>
          </div>
        </div>
        <div className="flex gap-1.5">
          <button onClick={onEdit}
            className="p-2 text-gray-500 hover:text-violet-400 hover:bg-violet-500/10 rounded-lg transition-colors">
            <Pencil size={14} />
          </button>
          <button onClick={onDelete}
            className="p-2 text-gray-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Balance + Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="col-span-2 sm:col-span-1 bg-bg-card border border-line-subtle rounded-xl p-4">
          <div className="text-xs text-gray-500 mb-1">Current Balance</div>
          <div className={`text-xl font-bold ${balance >= 0 ? 'text-white' : 'text-rose-400'}`}>
            {balance < 0 && '−'}{formatCurrency(Math.abs(balance))}
          </div>
        </div>
        <div className="bg-bg-card border border-line-subtle rounded-xl p-4">
          <div className="text-xs text-gray-500 mb-1">Income</div>
          <div className="text-sm font-bold text-emerald-400">{formatCurrency(income)}</div>
        </div>
        <div className="bg-bg-card border border-line-subtle rounded-xl p-4">
          <div className="text-xs text-gray-500 mb-1">Expenses</div>
          <div className="text-sm font-bold text-orange-400">{formatCurrency(expense)}</div>
        </div>
        <div className="bg-bg-card border border-line-subtle rounded-xl p-4">
          <div className="text-xs text-gray-500 mb-1">Transfers</div>
          <div className="text-sm font-bold text-blue-400">
            {transfersIn > 0 && <span className="text-blue-400">+{formatCurrency(transfersIn)}</span>}
            {transfersIn > 0 && transfersOut > 0 && <span className="text-gray-600 mx-1">/</span>}
            {transfersOut > 0 && <span className="text-blue-300">−{formatCurrency(transfersOut)}</span>}
            {transfersIn === 0 && transfersOut === 0 && <span className="text-gray-600">—</span>}
          </div>
        </div>
      </div>

      {/* Transaction list */}
      <div className="bg-bg-card border border-line-subtle rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-line-subtle">
          <h3 className="text-sm font-semibold text-white">All Transactions</h3>
        </div>
        {accTxs.length === 0 ? (
          <div className="py-16 text-center text-gray-500 text-sm">No transactions for this account</div>
        ) : (
          <div className="divide-y divide-line-subtle">
            {accTxs.map(tx => {
              const isTransfer = tx.type === 'transfer'
              const isOut = tx.transferDirection === 'out'
              const pairedAccountId = isOut ? tx.toAccountId : tx.fromAccountId
              const pairedAcc = isTransfer ? accounts.find(a => a.id === pairedAccountId) : null
              const category = categories.find(c => c.id === tx.categoryId)

              return (
                <div key={tx.id} className="px-5 py-3 flex items-center gap-3 hover:bg-white/[0.02] transition-colors group">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    isTransfer ? 'bg-blue-500/10' : tx.type === 'income' ? 'bg-emerald-500/10' : 'bg-rose-500/10'
                  }`}>
                    {isTransfer
                      ? <ArrowLeftRight size={14} className="text-blue-400" />
                      : tx.type === 'income'
                        ? <ArrowUpRight size={14} className="text-emerald-400" />
                        : <ArrowDownRight size={14} className="text-rose-400" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-200 truncate">{tx.name}</div>
                    <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-1.5">
                      <span>{formatDate(tx.date)}</span>
                      {isTransfer && pairedAcc && (
                        <span className="text-blue-400">{isOut ? `→ ${pairedAcc.name}` : `← ${pairedAcc.name}`}</span>
                      )}
                      {!isTransfer && category && (
                        <span style={{ color: category.color }}>{category.icon} {category.name}</span>
                      )}
                    </div>
                  </div>
                  <div className={`text-sm font-bold flex-shrink-0 ${
                    isTransfer
                      ? isOut ? 'text-blue-300' : 'text-blue-400'
                      : tx.type === 'income' ? 'text-emerald-400' : 'text-rose-400'
                  }`}>
                    {isTransfer ? (isOut ? '−' : '+') : tx.type === 'income' ? '+' : '−'}
                    {formatCurrency(tx.amount)}
                  </div>
                  {!isTransfer && (
                    <button onClick={() => setEditTx(tx)}
                      className="p-1.5 rounded-md text-gray-600 hover:text-violet-400 hover:bg-violet-500/10 transition-colors opacity-0 group-hover:opacity-100">
                      <Pencil size={13} />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default function AccountManager({ onTransfer }) {
  const { accounts, transactions, categories, addAccount, updateAccount, deleteAccount } = useApp()
  const [adding, setAdding] = useState(false)
  const [editId, setEditId] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [selectedAccId, setSelectedAccId] = useState(null)

  const selectedAcc = accounts.find(a => a.id === selectedAccId)

  function getStats(accountId) {
    const txs = transactions.filter(t => t.accountId === accountId)
    const income = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
    const expense = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
    const transfersIn  = txs.filter(t => t.type === 'transfer' && t.transferDirection === 'in').reduce((s, t) => s + t.amount, 0)
    const transfersOut = txs.filter(t => t.type === 'transfer' && t.transferDirection === 'out').reduce((s, t) => s + t.amount, 0)
    const nonTransferTxs = txs.filter(t => t.type !== 'transfer')
    const lastTx = txs.sort((a, b) => b.date.localeCompare(a.date))[0]
    // Activity this month
    const thisMonth = new Date().toISOString().slice(0, 7)
    const monthlyExpense = txs.filter(t => t.type === 'expense' && t.date.startsWith(thisMonth)).reduce((s, t) => s + t.amount, 0)
    return {
      count: nonTransferTxs.length, income, expense,
      transfersIn, transfersOut,
      lastDate: lastTx?.date || null,
      monthlyExpense,
    }
  }

  function handleAdd(data) {
    addAccount({ id: generateId(), ...data })
    setAdding(false)
  }

  function confirmDel() {
    if (confirmDelete) {
      deleteAccount(confirmDelete)
      if (selectedAccId === confirmDelete) setSelectedAccId(null)
    }
    setConfirmDelete(null)
  }

  // Account detail view
  if (selectedAcc && !editId) {
    return (
      <>
        {confirmDelete && (
          <ConfirmDialog title="Delete Account" message="This will not delete associated transactions."
            onConfirm={confirmDel} onCancel={() => setConfirmDelete(null)} />
        )}
        <AccountDetail
          acc={selectedAcc}
          transactions={transactions}
          categories={categories}
          accounts={accounts}
          onBack={() => setSelectedAccId(null)}
          onEdit={() => setEditId(selectedAcc.id)}
          onDelete={() => setConfirmDelete(selectedAcc.id)}
        />
      </>
    )
  }

  return (
    <div className="space-y-6 animate-in">
      {confirmDelete && (
        <ConfirmDialog title="Delete Account" message="This will not delete associated transactions."
          onConfirm={confirmDel} onCancel={() => setConfirmDelete(null)} />
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white">Accounts</h2>
          <p className="text-sm text-gray-500 mt-0.5">Manage your payment accounts and wallets</p>
        </div>
        <div className="flex items-center gap-2">
          {onTransfer && accounts.length >= 2 && (
            <button onClick={onTransfer}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors">
              <ArrowLeftRight size={15} /> Transfer
            </button>
          )}
          <button onClick={() => { setAdding(true); setEditId(null) }}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium rounded-lg transition-colors">
            <Plus size={15} /> Add Account
          </button>
        </div>
      </div>

      {adding && <AccountForm onSave={handleAdd} onCancel={() => setAdding(false)} />}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {accounts.map(acc => {
          const stats = getStats(acc.id)
          const balance = getAccountBalance(transactions, acc.id)
          return (
            <div key={acc.id}>
              {editId === acc.id ? (
                <AccountForm
                  initial={acc}
                  onSave={data => { updateAccount(acc.id, data); setEditId(null) }}
                  onCancel={() => setEditId(null)}
                />
              ) : (
                <div
                  className="bg-bg-card rounded-xl border border-line-subtle p-5 group cursor-pointer hover:border-line transition-colors"
                  onClick={() => setSelectedAccId(acc.id)}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <AccountIcon type={acc.accountType} color={acc.color} />
                      <div>
                        <div className="text-sm font-bold text-white">{acc.name}</div>
                        <div className="text-xs text-gray-500">{stats.count} transactions</div>
                      </div>
                    </div>
                    <div className="flex gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                      onClick={e => e.stopPropagation()}>
                      <button onClick={() => setEditId(acc.id)}
                        className="p-1.5 text-gray-500 hover:text-purple-400 hover:bg-purple-500/10 rounded-lg transition-colors">
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => setConfirmDelete(acc.id)}
                        className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Balance */}
                  <div className="mb-4">
                    <div className="text-xs text-gray-500 mb-1">Balance</div>
                    <div className={`text-xl font-bold ${balance >= 0 ? 'text-white' : 'text-rose-400'}`}>
                      {balance < 0 ? '−' : ''}{formatCurrency(Math.abs(balance))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Income</span>
                      <span className="text-emerald-400 font-medium">{formatCurrency(stats.income)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Expenses</span>
                      <span className="text-orange-400 font-medium">{formatCurrency(stats.expense)}</span>
                    </div>
                    {(stats.transfersIn > 0 || stats.transfersOut > 0) && (
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500 flex items-center gap-1">
                          <ArrowLeftRight size={10} className="text-blue-400" /> Transfers
                        </span>
                        <span className="text-blue-300 font-medium">
                          {stats.transfersIn > 0 && <span className="text-blue-400">+{formatCurrency(stats.transfersIn)}</span>}
                          {stats.transfersIn > 0 && stats.transfersOut > 0 && <span className="text-gray-600 mx-0.5">/</span>}
                          {stats.transfersOut > 0 && <span className="text-blue-300">−{formatCurrency(stats.transfersOut)}</span>}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-line-subtle flex items-center justify-between text-xs text-gray-500">
                    <span className="flex items-center gap-1.5">
                      <Activity size={11} style={{ color: acc.color }} />
                      {stats.count} transaction{stats.count !== 1 ? 's' : ''}
                    </span>
                    <span>
                      {stats.lastDate
                        ? <span>Last: <span className="text-gray-400">{formatDate(stats.lastDate)}</span></span>
                        : <span className="text-gray-600">No activity</span>
                      }
                    </span>
                  </div>
                </div>
              )}
            </div>
          )
        })}

        {accounts.length === 0 && (
          <div className="col-span-full text-center py-16 text-gray-500 text-sm">
            No accounts yet. Add your first account above.
          </div>
        )}
      </div>
    </div>
  )
}
