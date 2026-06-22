import { useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, SlidersHorizontal, ChevronUp, ChevronDown, X, Download, Upload, Trash2, Calendar, Pencil, Copy, FileText } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { useToast } from '../context/ToastContext'
import { exportToCSV, parseCSV, generateId, formatCurrency, formatDate } from '../utils/helpers'
import TransactionRow from './TransactionRow'
import AddTransactionModal from './AddTransactionModal'
import ConfirmDialog from './ConfirmDialog'
import BankImportModal from './BankImportModal'

const PAGE_SIZE = 20

const DATE_PRESETS = (() => {
  const now = new Date()
  const y = now.getFullYear(), m = now.getMonth(), d = now.getDate()
  const fmt = (dt) => dt.toISOString().slice(0, 10)
  const weekStart = new Date(y, m, d - now.getDay())
  const monthStart = new Date(y, m, 1)
  const lastMonthStart = new Date(y, m - 1, 1)
  const lastMonthEnd = new Date(y, m, 0)
  const threeMonthsAgo = new Date(y, m - 2, 1)
  return [
    { label: 'This Week', from: fmt(weekStart), to: fmt(now) },
    { label: 'This Month', from: fmt(monthStart), to: fmt(now) },
    { label: 'Last Month', from: fmt(lastMonthStart), to: fmt(lastMonthEnd) },
    { label: 'Last 3 Mo', from: fmt(threeMonthsAgo), to: fmt(now) },
  ]
})()

function SortIndicator({ active, dir }) {
  if (!active) return <ChevronUp size={12} className="text-gray-600" />
  return dir === 'asc'
    ? <ChevronUp size={12} className="text-violet-400" />
    : <ChevronDown size={12} className="text-violet-400" />
}

export default function Transactions({ onAdd }) {
  const { transactions, categories, accounts, deleteTransaction, addTransaction, bulkDeleteTransactions } = useApp()
  const { addToast } = useToast()
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [filterCat, setFilterCat] = useState('')
  const [filterAcc, setFilterAcc] = useState('')
  const [filterMonth, setFilterMonth] = useState('')
  const [dateRange, setDateRange] = useState(null) // { from, to, label }
  const [sortKey, setSortKey] = useState('date')
  const [sortDir, setSortDir] = useState('desc')
  const [page, setPage] = useState(1)
  const [editTx, setEditTx] = useState(null)
  const [showFilters, setShowFilters] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [confirmBulk, setConfirmBulk] = useState(false)
  const [selected, setSelected] = useState(new Set())
  const [showBankImport, setShowBankImport] = useState(false)

  const months = useMemo(() => {
    const set = new Set(transactions.map(t => t.date.slice(0, 7)))
    return [...set].sort().reverse()
  }, [transactions])

  const filtered = useMemo(() => {
    let list = [...transactions]
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(t =>
        t.name.toLowerCase().includes(q) ||
        (t.notes || '').toLowerCase().includes(q)
      )
    }
    if (filterType !== 'all') list = list.filter(t => t.type === filterType)
    if (filterCat) list = list.filter(t => t.categoryId === filterCat)
    if (filterAcc) list = list.filter(t => t.accountId === filterAcc)
    if (filterMonth) list = list.filter(t => t.date.startsWith(filterMonth))
    if (dateRange) list = list.filter(t => t.date >= dateRange.from && t.date <= dateRange.to)

    list.sort((a, b) => {
      let av = a[sortKey], bv = b[sortKey]
      if (sortKey === 'amount') { av = Number(av); bv = Number(bv) }
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return list
  }, [transactions, search, filterType, filterCat, filterAcc, filterMonth, dateRange, sortKey, sortDir])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const totalIncome = filtered.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const totalExpense = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)

  function toggleSort(key) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
    setPage(1)
  }

  const toggleSelect = useCallback((id) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const togglePageSelect = useCallback(() => {
    const ids = paginated.map(t => t.id)
    const allOnPage = ids.every(id => selected.has(id))
    setSelected(prev => {
      const next = new Set(prev)
      if (allOnPage) ids.forEach(id => next.delete(id))
      else ids.forEach(id => next.add(id))
      return next
    })
  }, [paginated, selected])

  const allOnPageSelected = paginated.length > 0 && paginated.every(t => selected.has(t.id))
  const someSelected = selected.size > 0

  function clearSelection() { setSelected(new Set()) }
  function handleBulkDelete() { setConfirmBulk(true) }

  function confirmDel() {
    if (confirmDelete) deleteTransaction(confirmDelete)
    setConfirmDelete(null)
  }
  function confirmBulkDel() {
    bulkDeleteTransactions([...selected])
    setSelected(new Set())
    setConfirmBulk(false)
  }

  function handleDuplicate(tx) {
    const dup = {
      ...tx,
      id: generateId(),
      date: new Date().toISOString().slice(0, 10),
      notes: tx.notes ? `Copy of: ${tx.notes}` : '',
    }
    addTransaction(dup)
  }

  function applyDatePreset(preset) {
    if (dateRange?.label === preset.label) {
      setDateRange(null)
    } else {
      setDateRange(preset)
      setFilterMonth('')
    }
    setPage(1)
  }

  function handleExport() {
    const csv = exportToCSV(filtered, categories, accounts)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `transactions_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    addToast(`Exported ${filtered.length} transactions`)
  }

  function handleImport() {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.csv'
    input.onchange = async (e) => {
      const file = e.target.files?.[0]
      if (!file) return
      const text = await file.text()
      const rows = parseCSV(text)
      let imported = 0
      for (const row of rows) {
        const cat = categories.find(c => c.name.toLowerCase() === row.categoryName.toLowerCase())
        const acc = accounts.find(a => a.name.toLowerCase() === row.accountName.toLowerCase())
        if (row.name && row.amount > 0) {
          addTransaction({
            id: generateId(),
            type: row.type === 'income' ? 'income' : 'expense',
            name: row.name,
            amount: row.amount,
            categoryId: cat?.id || categories[0]?.id || '',
            accountId: acc?.id || accounts[0]?.id || '',
            date: row.date || new Date().toISOString().slice(0, 10),
            notes: row.notes || '',
          })
          imported++
        }
      }
      addToast(`Imported ${imported} transactions`)
    }
    input.click()
  }

  const selectCls = `bg-bg-input border border-line rounded-lg px-3 py-2 text-sm text-gray-300
    focus:outline-none focus:border-violet-500 transition-colors`
  const hasFilters = filterType !== 'all' || filterCat || filterAcc || filterMonth || dateRange

  return (
    <div className="space-y-4 animate-in pb-20">
      {editTx && <AddTransactionModal editTx={editTx} onClose={() => setEditTx(null)} />}
      {showBankImport && <BankImportModal onClose={() => setShowBankImport(false)} />}
      {confirmDelete && (
        <ConfirmDialog title="Delete Transaction" message="This action cannot be undone."
          onConfirm={confirmDel} onCancel={() => setConfirmDelete(null)} />
      )}
      {confirmBulk && (
        <ConfirmDialog title="Delete Selected" message={`Delete ${selected.size} selected transaction${selected.size !== 1 ? 's' : ''}? This cannot be undone.`}
          onConfirm={confirmBulkDel} onCancel={() => setConfirmBulk(false)} />
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            className="w-full bg-bg-card border border-line-subtle rounded-lg pl-9 pr-3 py-2 text-sm text-white
              placeholder-gray-500 focus:outline-none focus:border-violet-500 transition-colors"
            placeholder="Search transactions..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
          />
        </div>
        <button
          onClick={() => setShowFilters(f => !f)}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors ${
            hasFilters || showFilters
              ? 'bg-violet-500/15 border-violet-500/40 text-violet-300'
              : 'bg-bg-card border-line-subtle text-gray-400 hover:text-gray-200'
          }`}
        >
          <SlidersHorizontal size={14} />
          <span className="hidden sm:inline">Filters</span>
          {hasFilters && <span className="w-1.5 h-1.5 bg-violet-400 rounded-full" />}
        </button>
        <button onClick={() => setShowBankImport(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-violet-500/30 bg-violet-500/10 text-violet-300 hover:bg-violet-500/15 text-sm transition-colors" title="Import bank PDF">
          <FileText size={14} /> <span className="hidden sm:inline">Bank PDF</span>
        </button>
        <button onClick={handleExport} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-line-subtle bg-bg-card text-gray-400 hover:text-gray-200 text-sm transition-colors" title="Export CSV">
          <Download size={14} /> <span className="hidden sm:inline">Export</span>
        </button>
        <button onClick={handleImport} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-line-subtle bg-bg-card text-gray-400 hover:text-gray-200 text-sm transition-colors" title="Import CSV">
          <Upload size={14} /> <span className="hidden sm:inline">CSV</span>
        </button>
        <button onClick={onAdd} className="btn-primary px-4 py-2 text-white text-sm font-medium rounded-lg">
          + Add
        </button>
      </div>

      {showFilters && (
        <div className="space-y-3 p-4 bg-bg-card rounded-xl border border-line-subtle animate-in">
          <div className="flex flex-wrap gap-3">
            <select className={selectCls} value={filterType} onChange={e => { setFilterType(e.target.value); setPage(1) }}>
              <option value="all">All Types</option>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
              <option value="transfer">Transfer</option>
            </select>
            <select className={selectCls} value={filterMonth} onChange={e => { setFilterMonth(e.target.value); setDateRange(null); setPage(1) }}>
              <option value="">All Months</option>
              {months.map(m => {
                const [y, mo] = m.split('-')
                const label = new Date(parseInt(y), parseInt(mo) - 1, 1).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
                return <option key={m} value={m}>{label}</option>
              })}
            </select>
            <select className={selectCls} value={filterCat} onChange={e => { setFilterCat(e.target.value); setPage(1) }}>
              <option value="">All Categories</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
            </select>
            <select className={selectCls} value={filterAcc} onChange={e => { setFilterAcc(e.target.value); setPage(1) }}>
              <option value="">All Accounts</option>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            {hasFilters && (
              <button onClick={() => { setFilterType('all'); setFilterCat(''); setFilterAcc(''); setFilterMonth(''); setDateRange(null); setPage(1) }}
                className="flex items-center gap-1 px-3 py-2 text-sm text-rose-400 hover:text-rose-300 transition-colors">
                <X size={14} /> Clear
              </button>
            )}
          </div>

          {/* Quick date presets */}
          <div className="flex items-center gap-2 flex-wrap">
            <Calendar size={13} className="text-gray-500" />
            <span className="text-xs text-gray-500 mr-1">Quick:</span>
            {DATE_PRESETS.map(p => (
              <button key={p.label} onClick={() => applyDatePreset(p)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  dateRange?.label === p.label
                    ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                    : 'text-gray-500 hover:text-gray-300 border border-line-subtle hover:border-line'
                }`}>
                {p.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Summary strip */}
      <div className="flex flex-wrap gap-3 sm:gap-4 text-sm">
        <span className="text-gray-400">{filtered.length} transactions</span>
        <span className="text-emerald-400 font-medium">+{formatCurrency(totalIncome)}</span>
        <span className="text-rose-400 font-medium">−{formatCurrency(totalExpense)}</span>
        <span className={`font-semibold ${totalIncome - totalExpense >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
          Net: {totalIncome - totalExpense >= 0 ? '+' : '−'}{formatCurrency(Math.abs(totalIncome - totalExpense))}
        </span>
      </div>

      {/* Table */}
      <div className="bg-bg-card border border-line-subtle rounded-xl overflow-hidden">
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-line">
                <th className="px-4 py-3 w-10">
                  <input type="checkbox" checked={allOnPageSelected} onChange={togglePageSelect}
                    title="Select all on page" />
                </th>
                {[
                  { key: 'name', label: 'Name' },
                  { key: 'amount', label: 'Amount', right: true },
                  { key: 'accountId', label: 'Account' },
                  { key: 'categoryId', label: 'Category' },
                  { key: 'date', label: 'Date' },
                ].map(col => (
                  <th
                    key={col.key}
                    onClick={() => toggleSort(col.key)}
                    className={`px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer
                      hover:text-gray-300 transition-colors select-none ${col.right ? 'text-right' : 'text-left'}`}
                  >
                    <span className="inline-flex items-center gap-1">
                      {col.label}
                      <SortIndicator active={sortKey === col.key} dir={sortDir} />
                    </span>
                  </th>
                ))}
                <th className="px-4 py-3 w-20" />
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr><td colSpan={7} className="py-16 text-center text-gray-500 text-sm">No transactions found</td></tr>
              ) : paginated.map(tx => {
                const pairedAccountId = tx.transferDirection === 'out' ? tx.toAccountId : tx.fromAccountId
                return (
                  <TransactionRow
                    key={tx.id} tx={tx}
                    category={categories.find(c => c.id === tx.categoryId)}
                    account={accounts.find(a => a.id === tx.accountId)}
                    pairedAccount={tx.type === 'transfer' ? accounts.find(a => a.id === pairedAccountId) : null}
                    onEdit={setEditTx} onDelete={(id) => setConfirmDelete(id)}
                    onDuplicate={handleDuplicate}
                    selected={selected.has(tx.id)}
                    onToggleSelect={toggleSelect}
                  />
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-line-subtle">
            <input type="checkbox" checked={allOnPageSelected} onChange={togglePageSelect} title="Select all on page" />
            <span className="text-xs text-gray-500">Select all</span>
          </div>
          {paginated.length === 0 ? (
            <div className="py-16 text-center text-gray-500 text-sm">No transactions found</div>
          ) : (
            <div className="divide-y divide-line-subtle">
              {paginated.map(tx => {
                const isTransfer = tx.type === 'transfer'
                const isOut = tx.transferDirection === 'out'
                const category = categories.find(c => c.id === tx.categoryId)
                const account = accounts.find(a => a.id === tx.accountId)
                const pairedAccountId = isOut ? tx.toAccountId : tx.fromAccountId
                const pairedAccount = isTransfer ? accounts.find(a => a.id === pairedAccountId) : null
                return (
                  <div key={tx.id} className={`px-3 py-3 ${selected.has(tx.id) ? 'bg-violet-500/[0.05]' : ''}`}>
                    <div className="flex items-start gap-2">
                      <input type="checkbox" checked={selected.has(tx.id)} onChange={() => toggleSelect(tx.id)} className="mt-1 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium text-gray-200 truncate">{tx.name}</span>
                          <span className={`text-sm font-semibold flex-shrink-0 ${
                            isTransfer ? (isOut ? 'text-blue-300' : 'text-blue-400') : tx.type === 'income' ? 'text-emerald-400' : 'text-gray-100'
                          }`}>
                            {isTransfer ? (isOut ? '−' : '+') : tx.type === 'income' ? '+' : ''}{formatCurrency(tx.amount)}
                          </span>
                        </div>
                        <div className="flex items-center flex-wrap gap-1.5 mt-1.5">
                          {isTransfer ? (
                            <>
                              {account && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold text-white"
                                  style={{ backgroundColor: account.color + '20', border: `1px solid ${account.color}22` }}>
                                  <span className="w-1.5 h-1.5 rounded-sm" style={{ backgroundColor: account.color }} />
                                  {account.name}
                                </span>
                              )}
                              {pairedAccount && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] text-blue-300 bg-blue-500/10 border border-blue-500/20">
                                  {isOut ? `→ ${pairedAccount.name}` : `← ${pairedAccount.name}`}
                                </span>
                              )}
                            </>
                          ) : (
                            <>
                              {category && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium"
                                  style={{ backgroundColor: category.color + '15', color: category.color, border: `1px solid ${category.color}20` }}>
                                  {category.icon} {category.name}
                                </span>
                              )}
                              {account && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold text-white"
                                  style={{ backgroundColor: account.color + '20', border: `1px solid ${account.color}22` }}>
                                  <span className="w-1.5 h-1.5 rounded-sm" style={{ backgroundColor: account.color }} />
                                  {account.name}
                                </span>
                              )}
                            </>
                          )}
                          <span className="text-[11px] text-gray-500">{formatDate(tx.date)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end gap-0.5 mt-1.5 -mb-1">
                      {!isTransfer && (
                        <button onClick={() => handleDuplicate(tx)}
                          className="p-1.5 rounded-md text-gray-500 hover:text-blue-400 hover:bg-blue-500/10 transition-colors" title="Duplicate">
                          <Copy size={13} />
                        </button>
                      )}
                      <button onClick={() => setEditTx(tx)}
                        className="p-1.5 rounded-md text-gray-500 hover:text-violet-400 hover:bg-violet-500/10 transition-colors" title="Edit">
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => setConfirmDelete(tx.id)}
                        className="p-1.5 rounded-md text-gray-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors" title="Delete">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-line-subtle">
            <span className="text-xs text-gray-500">
              {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
            </span>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="w-7 h-7 rounded text-xs text-gray-400 hover:bg-white/5 disabled:opacity-30 transition-colors">&lt;</button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                const start = Math.max(1, Math.min(page - 2, totalPages - 4))
                return start + i
              }).map(p => (
                <button key={p} onClick={() => setPage(p)}
                  className={`w-7 h-7 rounded text-xs font-medium transition-colors ${
                    p === page ? 'bg-violet-600 text-white' : 'text-gray-400 hover:bg-white/5'
                  }`}>{p}</button>
              ))}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="w-7 h-7 rounded text-xs text-gray-400 hover:bg-white/5 disabled:opacity-30 transition-colors">&gt;</button>
            </div>
          </div>
        )}
      </div>

      {/* Floating bulk action bar */}
      <AnimatePresence>
        {someSelected && (
          <motion.div
            initial={{ y: 80, opacity: 0, scale: 0.92 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 80, opacity: 0, scale: 0.92 }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 glass rounded-xl shadow-2xl px-3 sm:px-4 py-3 flex items-center gap-3 sm:gap-4 max-w-[calc(100vw-2rem)]"
          >
            <span className="text-sm text-white font-medium">{selected.size} selected</span>
            <button onClick={clearSelection} className="text-xs text-gray-400 hover:text-white transition-colors">
              Clear
            </button>
            <div className="w-px h-5 bg-line" />
            <motion.button whileTap={{ scale: 0.95 }} onClick={handleBulkDelete}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 hover:bg-rose-500/25 text-xs font-medium transition-colors">
              <Trash2 size={13} /> Delete
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
