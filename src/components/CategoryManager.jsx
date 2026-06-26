import { useState, useMemo } from 'react'
import { Plus, Pencil, Trash2, X, Check, ChevronLeft, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { generateId, formatCurrency, formatDate } from '../utils/helpers'
import { inputSmCls, labelCls } from '../utils/styles'
import ColorPicker from './ColorPicker'
import ConfirmDialog from './ConfirmDialog'
import AddTransactionModal from './AddTransactionModal'

function CategoryInitial({ name, color }) {
  const letters = name.trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() || '').join('')
  return (
    <span
      className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0"
      style={{ backgroundColor: color + '25', border: `1px solid ${color}40`, color }}
    >
      {letters || '?'}
    </span>
  )
}

function CategoryForm({ initial, onSave, onCancel }) {
  const [name, setName] = useState(initial?.name || '')
  const [color, setColor] = useState(initial?.color || '#8b5cf6')
  const [type, setType] = useState(initial?.type || 'expense')
  const [error, setError] = useState('')

  function submit(e) {
    e.preventDefault()
    if (!name.trim()) return setError('Name is required')
    onSave({ name: name.trim(), color, type })
  }

  return (
    <form onSubmit={submit} className="p-4 bg-bg-elevated rounded-xl border border-line-subtle space-y-3 animate-in">
      <div className="flex items-center gap-3">
        <CategoryInitial name={name || '?'} color={color} />
        <div className="flex-1">
          <label className={labelCls}>Name</label>
          <input autoFocus className={inputSmCls} value={name} onChange={e => setName(e.target.value)} placeholder="Category name" />
        </div>
      </div>
      <div>
        <label className={labelCls}>Type</label>
        <div className="flex gap-2">
          {['expense', 'income'].map(t => (
            <button key={t} type="button" onClick={() => setType(t)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
                type === t ? 'bg-violet-600/30 text-violet-300 border border-violet-500/40' : 'bg-bg-base text-gray-500 border border-line-subtle'
              }`}>
              {t}
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

function CategoryDetail({ cat, transactions, accounts, onBack, onEdit, onDelete }) {
  const [editTx, setEditTx] = useState(null)

  const catTxs = useMemo(() =>
    [...transactions.filter(t => t.categoryId === cat.id)]
      .sort((a, b) => b.date.localeCompare(a.date)),
    [transactions, cat.id]
  )

  const total = catTxs.reduce((s, t) => s + t.amount, 0)
  const thisMonth = new Date().toISOString().slice(0, 7)
  const monthTotal = catTxs.filter(t => t.date.startsWith(thisMonth)).reduce((s, t) => s + t.amount, 0)
  const monthCount = catTxs.filter(t => t.date.startsWith(thisMonth)).length

  return (
    <div className="space-y-5 animate-in">
      {editTx && <AddTransactionModal editTx={editTx} onClose={() => setEditTx(null)} />}

      <div className="flex items-center gap-3">
        <button onClick={onBack}
          className="p-2 rounded-lg bg-bg-card border border-line-subtle text-gray-400 hover:text-white hover:border-line transition-colors">
          <ChevronLeft size={15} />
        </button>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <CategoryInitial name={cat.name} color={cat.color} />
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-white">{cat.name}</h2>
            <p className="text-xs text-gray-500 capitalize">{cat.type} · {catTxs.length} transactions</p>
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

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-bg-card border border-line-subtle rounded-xl p-4">
          <div className="text-xs text-gray-500 mb-1">Total ({cat.type})</div>
          <div className={`text-xl font-bold ${cat.type === 'income' ? 'text-emerald-400' : 'text-rose-400'}`}>
            {formatCurrency(total)}
          </div>
        </div>
        <div className="bg-bg-card border border-line-subtle rounded-xl p-4">
          <div className="text-xs text-gray-500 mb-1">This Month</div>
          <div className="text-xl font-bold text-white">{formatCurrency(monthTotal)}</div>
          <div className="text-[11px] text-gray-500 mt-0.5">{monthCount} transactions</div>
        </div>
        <div className="col-span-2 sm:col-span-1 bg-bg-card border border-line-subtle rounded-xl p-4">
          <div className="text-xs text-gray-500 mb-1">Average</div>
          <div className="text-xl font-bold text-gray-300">
            {catTxs.length > 0 ? formatCurrency(Math.round(total / catTxs.length)) : '—'}
          </div>
          <div className="text-[11px] text-gray-500 mt-0.5">per transaction</div>
        </div>
      </div>

      {/* Transaction list */}
      <div className="bg-bg-card border border-line-subtle rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-line-subtle">
          <h3 className="text-sm font-semibold text-white">All Transactions</h3>
        </div>
        {catTxs.length === 0 ? (
          <div className="py-16 text-center text-gray-500 text-sm">No transactions in this category</div>
        ) : (
          <div className="divide-y divide-line-subtle">
            {catTxs.map(tx => {
              const account = accounts.find(a => a.id === tx.accountId)
              return (
                <button key={tx.id} onClick={() => setEditTx(tx)}
                  className="w-full px-5 py-3 flex items-center gap-3 hover:bg-white/[0.02] transition-colors group text-left">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    tx.type === 'income' ? 'bg-emerald-500/10' : 'bg-rose-500/10'
                  }`}>
                    {tx.type === 'income'
                      ? <ArrowUpRight size={14} className="text-emerald-400" />
                      : <ArrowDownRight size={14} className="text-rose-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-200 truncate">{tx.name}</div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {formatDate(tx.date)}{account && ` · ${account.name}`}
                    </div>
                  </div>
                  <div className={`text-sm font-bold flex-shrink-0 ${
                    tx.type === 'income' ? 'text-emerald-400' : 'text-rose-400'
                  }`}>
                    {tx.type === 'income' ? '+' : '−'}{formatCurrency(tx.amount)}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default function CategoryManager() {
  const { categories, transactions, accounts, addCategory, updateCategory, deleteCategory } = useApp()
  const [adding, setAdding] = useState(false)
  const [editId, setEditId] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [selectedCatId, setSelectedCatId] = useState(null)

  const selectedCat = categories.find(c => c.id === selectedCatId)

  const expenses = categories.filter(c => c.type === 'expense')
  const incomes  = categories.filter(c => c.type === 'income')

  const usageMap = useMemo(() =>
    transactions.reduce((m, t) => {
      if (t.categoryId) m[t.categoryId] = (m[t.categoryId] || 0) + 1
      return m
    }, {}),
    [transactions]
  )

  function handleAdd(data) {
    addCategory({ id: generateId(), icon: '', ...data })
    setAdding(false)
  }

  function handleEdit(id, data) {
    updateCategory(id, data)
    setEditId(null)
  }

  const catToDelete = categories.find(c => c.id === confirmDelete)
  const deleteUsageCount = confirmDelete ? (usageMap[confirmDelete] || 0) : 0

  function confirmDel() {
    if (confirmDelete) {
      deleteCategory(confirmDelete)
      if (selectedCatId === confirmDelete) setSelectedCatId(null)
    }
    setConfirmDelete(null)
  }

  // Detail view
  if (selectedCat && !editId) {
    return (
      <>
        {confirmDelete && (
          <ConfirmDialog title="Delete Category"
            message={
              deleteUsageCount > 0
                ? `"${catToDelete?.name}" is used in ${deleteUsageCount} transaction${deleteUsageCount !== 1 ? 's' : ''}. They'll have no category after deletion.`
                : `Delete "${catToDelete?.name}"? This cannot be undone.`
            }
            onConfirm={confirmDel}
            onCancel={() => setConfirmDelete(null)} />
        )}
        <CategoryDetail
          cat={selectedCat}
          transactions={transactions}
          accounts={accounts}
          onBack={() => setSelectedCatId(null)}
          onEdit={() => setEditId(selectedCat.id)}
          onDelete={() => setConfirmDelete(selectedCat.id)}
        />
      </>
    )
  }

  function renderGroup(label, list) {
    return (
      <div>
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">{label}</h3>
        <div className="space-y-2">
          {list.map(cat => {
            const usage = usageMap[cat.id] || 0
            return (
              <div key={cat.id}>
                {editId === cat.id ? (
                  <CategoryForm initial={cat} onSave={data => handleEdit(cat.id, data)} onCancel={() => setEditId(null)} />
                ) : (
                  <div
                    onClick={() => setSelectedCatId(cat.id)}
                    className="flex items-center justify-between px-4 py-3 bg-bg-card rounded-xl border border-line-subtle group cursor-pointer hover:border-line transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <CategoryInitial name={cat.name} color={cat.color} />
                      <div>
                        <div className="text-sm font-medium text-white">{cat.name}</div>
                        <div className="text-xs text-gray-500">
                          {cat.type === 'expense' ? 'Expense' : 'Income'}
                          <span className="text-gray-600 ml-1.5">·</span>
                          <span className="text-gray-600 ml-1.5">{usage} transaction{usage !== 1 ? 's' : ''}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                      onClick={e => e.stopPropagation()}>
                      <button onClick={() => setEditId(cat.id)}
                        className="p-1.5 text-gray-500 hover:text-purple-400 hover:bg-purple-500/10 rounded-lg transition-colors">
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => setConfirmDelete(cat.id)}
                        className="p-1.5 text-gray-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
          {list.length === 0 && (
            <p className="text-gray-600 text-sm py-4 text-center">No {label.toLowerCase()} yet</p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in">
      {confirmDelete && (
        <ConfirmDialog
          title="Delete Category"
          message={
            deleteUsageCount > 0
              ? `"${catToDelete?.name}" is used in ${deleteUsageCount} transaction${deleteUsageCount !== 1 ? 's' : ''}. They'll have no category after deletion.`
              : `Delete "${catToDelete?.name}"? This cannot be undone.`
          }
          onConfirm={confirmDel}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white">Categories</h2>
          <p className="text-sm text-gray-500 mt-0.5">Click a category to see its transactions</p>
        </div>
        <button onClick={() => { setAdding(true); setEditId(null) }}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium rounded-lg transition-colors">
          <Plus size={15} /> Add Category
        </button>
      </div>

      {adding && <CategoryForm onSave={handleAdd} onCancel={() => setAdding(false)} />}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {renderGroup('Expense Categories', expenses)}
        {renderGroup('Income Categories', incomes)}
      </div>
    </div>
  )
}
