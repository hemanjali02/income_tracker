import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Target, AlertTriangle } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { getCurrentMonthKey, getMonthLabel, formatCurrency, generateId } from '../utils/helpers'

const inputCls = `w-full bg-bg-elevated border border-line-subtle rounded-lg px-3 py-2 text-sm text-white
  placeholder-gray-500 focus:outline-none focus:border-violet-500 transition-colors`

export default function BudgetView() {
  const { transactions, categories, budgets, saveBudget, deleteBudget } = useApp()
  const [month, setMonth] = useState(getCurrentMonthKey())
  const [editCatId, setEditCatId] = useState(null)
  const [editAmount, setEditAmount] = useState('')

  const expenseCategories = categories.filter(c => c.type === 'expense')

  const spending = useMemo(() => {
    const map = {}
    for (const tx of transactions) {
      if (tx.type !== 'expense' || !tx.date.startsWith(month)) continue
      map[tx.categoryId] = (map[tx.categoryId] || 0) + tx.amount
    }
    return map
  }, [transactions, month])

  const monthBudgets = useMemo(() => {
    const map = {}
    for (const b of budgets) {
      if (b.month === month) map[b.categoryId] = b
    }
    return map
  }, [budgets, month])

  const totalBudget = Object.values(monthBudgets).reduce((s, b) => s + b.limit, 0)
  const totalSpent = Object.values(spending).reduce((s, v) => s + v, 0)

  function shiftMonth(dir) {
    const [y, m] = month.split('-').map(Number)
    const nm = m + dir
    const ny = nm < 1 ? y - 1 : nm > 12 ? y + 1 : y
    const nmo = nm < 1 ? 12 : nm > 12 ? 1 : nm
    setMonth(`${ny}-${String(nmo).padStart(2, '0')}`)
  }

  function handleSave(catId) {
    const amt = parseFloat(editAmount)
    if (!amt || amt <= 0) return
    const existing = monthBudgets[catId]
    saveBudget({
      id: existing?.id || generateId(),
      categoryId: catId,
      month,
      limit: amt,
    })
    setEditCatId(null)
    setEditAmount('')
  }

  function handleRemove(catId) {
    const existing = monthBudgets[catId]
    if (existing) deleteBudget(existing.id)
  }

  return (
    <div className="space-y-6 animate-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Budgets</h2>
          <p className="text-sm text-gray-500 mt-0.5">Set monthly spending limits per category</p>
        </div>
      </div>

      {/* Month picker */}
      <div className="flex items-center gap-4">
        <button onClick={() => shiftMonth(-1)} className="p-2 rounded-lg bg-bg-input border border-line-subtle text-gray-400 hover:text-white hover:border-line transition-colors">
          <ChevronLeft size={16} />
        </button>
        <span className="text-white font-semibold text-sm min-w-[140px] text-center">{getMonthLabel(month)}</span>
        <button onClick={() => shiftMonth(1)} className="p-2 rounded-lg bg-bg-input border border-line-subtle text-gray-400 hover:text-white hover:border-line transition-colors">
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Overall summary */}
      {totalBudget > 0 && (
        <div className="bg-bg-card border border-line-subtle rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-white">Overall Budget</span>
            <span className={`text-sm font-bold ${totalSpent > totalBudget ? 'text-red-400' : 'text-emerald-400'}`}>
              {formatCurrency(totalSpent)} / {formatCurrency(totalBudget)}
            </span>
          </div>
          <div className="h-3 bg-bg-elevated rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(100, (totalSpent / totalBudget) * 100)}%`,
                backgroundColor: totalSpent > totalBudget ? '#ef4444' : totalSpent > totalBudget * 0.8 ? '#f59e0b' : '#10b981',
              }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1.5">
            <span>{Math.round((totalSpent / totalBudget) * 100)}% used</span>
            <span>{formatCurrency(Math.max(0, totalBudget - totalSpent))} remaining</span>
          </div>
        </div>
      )}

      {/* Category budgets */}
      <div className="space-y-3">
        {expenseCategories.map(cat => {
          const budget = monthBudgets[cat.id]
          const spent = spending[cat.id] || 0
          const limit = budget?.limit || 0
          const pct = limit > 0 ? Math.round((spent / limit) * 100) : 0
          const over = limit > 0 && spent > limit

          return (
            <div key={cat.id} className="bg-bg-card border border-line-subtle rounded-xl p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-3">
                  <span
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-base"
                    style={{ backgroundColor: cat.color + '15', border: `1px solid ${cat.color}20` }}
                  >
                    {cat.icon}
                  </span>
                  <div>
                    <div className="text-sm font-medium text-white">{cat.name}</div>
                    <div className="text-xs text-gray-500">
                      Spent: {formatCurrency(spent)}
                      {limit > 0 && <span> / {formatCurrency(limit)}</span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {over && <AlertTriangle size={14} className="text-red-400" />}
                  {editCatId === cat.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        className="w-24 bg-bg-elevated border border-line-subtle rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-violet-500"
                        type="number"
                        min="0"
                        placeholder="₹ Limit"
                        value={editAmount}
                        onChange={e => setEditAmount(e.target.value)}
                        autoFocus
                        onKeyDown={e => { if (e.key === 'Enter') handleSave(cat.id); if (e.key === 'Escape') setEditCatId(null) }}
                      />
                      <button onClick={() => handleSave(cat.id)} className="px-2 py-1.5 bg-purple-600 text-white text-xs rounded-lg hover:bg-purple-500 transition-colors">
                        Save
                      </button>
                      <button onClick={() => setEditCatId(null)} className="text-xs text-gray-500 hover:text-gray-300">
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-1">
                      <button
                        onClick={() => { setEditCatId(cat.id); setEditAmount(limit ? String(limit) : '') }}
                        className="px-3 py-1.5 text-xs text-purple-400 hover:text-purple-300 bg-purple-500/10 rounded-lg transition-colors"
                      >
                        {limit > 0 ? 'Edit' : 'Set Budget'}
                      </button>
                      {limit > 0 && (
                        <button onClick={() => handleRemove(cat.id)}
                          className="px-2 py-1.5 text-xs text-red-400/60 hover:text-red-400 transition-colors">
                          Remove
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {limit > 0 && (
                <div className="mt-2">
                  <div className="h-2 bg-bg-elevated rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(100, pct)}%`,
                        backgroundColor: over ? '#ef4444' : pct > 80 ? '#f59e0b' : cat.color,
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-xs mt-1">
                    <span className={over ? 'text-red-400 font-medium' : 'text-gray-500'}>
                      {pct}%{over ? ' — Over budget!' : ''}
                    </span>
                    <span className="text-gray-600">
                      {over ? `₹${(spent - limit).toLocaleString('en-IN')} over` : `₹${(limit - spent).toLocaleString('en-IN')} left`}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )
        })}

        {expenseCategories.length === 0 && (
          <div className="text-center py-16 text-gray-500 text-sm">
            No expense categories yet. Add some in the Categories section.
          </div>
        )}
      </div>
    </div>
  )
}
