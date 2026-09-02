import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, AlertTriangle, Copy, ChevronDown, Gauge } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { getCurrentMonthKey, getMonthLabel, formatCurrency, generateId } from '../utils/helpers'
import { gridStagger, cardRise } from '../utils/motion'
import AnimatedNumber from './AnimatedNumber'

function CatInitial({ name, color }) {
  return (
    <span className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0"
      style={{ backgroundColor: color + '25', border: `1px solid ${color}40`, color }}>
      {name.trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase()).join('')}
    </span>
  )
}

export default function BudgetView() {
  const { transactions, categories, budgets, saveBudget, deleteBudget } = useApp()
  const [month, setMonth] = useState(getCurrentMonthKey())
  const [editCatId, setEditCatId] = useState(null)
  const [editAmount, setEditAmount] = useState('')
  const [showUnbudgeted, setShowUnbudgeted] = useState(false)

  const expenseCategories = categories.filter(c => c.type === 'expense')
  const currentMonthKey = getCurrentMonthKey()
  const isCurrentMonth = month === currentMonthKey
  const isPast = month < currentMonthKey

  // ── Month progress (how far through the month we are) ──
  const [my, mm] = month.split('-').map(Number)
  const daysInMonth = new Date(my, mm, 0).getDate()
  const dayOfMonth = isCurrentMonth ? new Date().getDate() : isPast ? daysInMonth : 0
  const monthProgress = daysInMonth ? dayOfMonth / daysInMonth : 0
  const daysLeft = Math.max(0, daysInMonth - dayOfMonth)

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
    for (const b of budgets) if (b.month === month) map[b.categoryId] = b
    return map
  }, [budgets, month])

  const prevMonthKey = useMemo(() => {
    const nm = mm - 1
    const ny = nm < 1 ? my - 1 : my
    const nmo = nm < 1 ? 12 : nm
    return `${ny}-${String(nmo).padStart(2, '0')}`
  }, [my, mm])

  const prevBudgets = useMemo(() => budgets.filter(b => b.month === prevMonthKey), [budgets, prevMonthKey])
  const canCopyPrev = Object.keys(monthBudgets).length === 0 && prevBudgets.length > 0

  const totalBudget = Object.values(monthBudgets).reduce((s, b) => s + b.limit, 0)
  // Only count spend within budgeted categories, so the bar matches the sum of the rows below.
  const totalSpent = Object.keys(monthBudgets).reduce((s, cid) => s + (spending[cid] || 0), 0)
  const overallPct = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0
  const overallOverPace = isCurrentMonth && totalBudget > 0 && (totalSpent / totalBudget) > monthProgress + 0.08 && totalSpent <= totalBudget

  // ── Status for a single category ──
  function statusFor(spent, limit) {
    if (limit <= 0) return { key: 'none' }
    const frac = spent / limit
    if (spent > limit) return { key: 'over', label: 'Over budget', color: '#f43f5e' }
    if (isCurrentMonth && frac > monthProgress + 0.08) return { key: 'fast', label: 'Over pace', color: '#f59e0b' }
    if (isPast) return { key: 'ok', label: 'Within budget', color: '#10b981' }
    return { key: 'ok', label: 'On track', color: '#10b981' }
  }

  const rank = { over: 0, fast: 1, ok: 2, none: 3 }
  const budgetedCats = useMemo(() => {
    return expenseCategories
      .filter(c => monthBudgets[c.id])
      .map(c => {
        const spent = spending[c.id] || 0
        const limit = monthBudgets[c.id].limit
        return { cat: c, spent, limit, status: statusFor(spent, limit) }
      })
      .sort((a, b) => (rank[a.status.key] - rank[b.status.key]) || (b.spent / b.limit - a.spent / a.limit))
  }, [expenseCategories, monthBudgets, spending, monthProgress, isCurrentMonth, isPast])

  const unbudgetedCats = expenseCategories.filter(c => !monthBudgets[c.id])
  const unbudgetedSpent = unbudgetedCats.reduce((s, c) => s + (spending[c.id] || 0), 0)

  function shiftMonth(dir) {
    const nm = mm + dir
    const ny = nm < 1 ? my - 1 : nm > 12 ? my + 1 : my
    const nmo = nm < 1 ? 12 : nm > 12 ? 1 : nm
    setMonth(`${ny}-${String(nmo).padStart(2, '0')}`)
  }

  function handleSave(catId) {
    const amt = parseFloat(editAmount)
    if (!amt || amt <= 0) return
    const existing = monthBudgets[catId]
    saveBudget({ id: existing?.id || generateId(), categoryId: catId, month, limit: amt })
    setEditCatId(null); setEditAmount('')
  }

  function handleRemove(catId) {
    const existing = monthBudgets[catId]
    if (existing) deleteBudget(existing.id)
  }

  function copyFromLastMonth() {
    for (const b of prevBudgets) {
      saveBudget({ id: generateId(), categoryId: b.categoryId, month, limit: b.limit })
    }
  }

  // ── One budgeted category row ──
  function BudgetRow({ cat, spent, limit, status }) {
    const pct = limit > 0 ? (spent / limit) * 100 : 0
    const over = spent > limit
    const perDayLeft = daysLeft > 0 && !over ? Math.round((limit - spent) / daysLeft) : null
    return (
      <div className="glow-card bg-bg-card border border-line-subtle rounded-xl p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-3">
            <CatInitial name={cat.name} color={cat.color} />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-white">{cat.name}</span>
                {status.key !== 'none' && (
                  <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                    style={{ color: status.color, backgroundColor: status.color + '18', border: `1px solid ${status.color}30` }}>
                    {status.label}
                  </span>
                )}
              </div>
              <div className="text-xs text-gray-500">
                {formatCurrency(spent)} <span className="text-gray-600">/ {formatCurrency(limit)}</span>
                {perDayLeft != null && perDayLeft > 0 && (
                  <span className="text-gray-500"> · {formatCurrency(perDayLeft)}/day left</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {over && <AlertTriangle size={14} className="text-rose-400" />}
            {editCatId === cat.id ? (
              <div className="flex items-center gap-2">
                <input
                  className="w-24 bg-bg-elevated border border-line-subtle rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-colors"
                  type="number" min="0" placeholder="₹ Limit" value={editAmount}
                  onChange={e => setEditAmount(e.target.value)} autoFocus
                  onKeyDown={e => { if (e.key === 'Enter') handleSave(cat.id); if (e.key === 'Escape') setEditCatId(null) }}
                />
                <button onClick={() => handleSave(cat.id)} className="px-2 py-1.5 bg-purple-600 text-white text-xs rounded-lg hover:bg-purple-500 transition-colors">Save</button>
                <button onClick={() => setEditCatId(null)} className="text-xs text-gray-500 hover:text-gray-300">Cancel</button>
              </div>
            ) : (
              <div className="flex gap-1">
                <button onClick={() => { setEditCatId(cat.id); setEditAmount(limit ? String(limit) : '') }}
                  className="px-3 py-1.5 text-xs text-purple-400 hover:text-purple-300 bg-purple-500/10 rounded-lg transition-colors">Edit</button>
                <button onClick={() => handleRemove(cat.id)}
                  className="px-2 py-1.5 text-xs text-rose-400/60 hover:text-rose-400 transition-colors">Remove</button>
              </div>
            )}
          </div>
        </div>

        <div className="mt-2">
          {/* pace marker sits under the bar */}
          <div className="relative h-2 bg-bg-elevated rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, pct)}%`, backgroundColor: over ? '#f43f5e' : pct > 80 ? '#f59e0b' : cat.color }} />
            {isCurrentMonth && (
              <div className="absolute top-0 bottom-0 w-px bg-white/40"
                style={{ left: `${Math.min(100, monthProgress * 100)}%` }} title="Today" />
            )}
          </div>
          <div className="flex justify-between text-xs mt-1">
            <span className={over ? 'text-rose-400 font-medium' : 'text-gray-500'}>{Math.round(pct)}% used</span>
            <span className="text-gray-600">
              {over ? `${formatCurrency(spent - limit)} over` : `${formatCurrency(limit - spent)} left`}
            </span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white">Budgets</h2>
          <p className="text-sm text-gray-500 mt-0.5">Set monthly spending limits per category</p>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={() => shiftMonth(-1)} className="p-2 rounded-lg bg-bg-card border border-line-subtle text-gray-400 hover:text-white hover:border-line transition-colors">
            <ChevronLeft size={16} />
          </button>
          <span className="text-white font-semibold text-sm min-w-[130px] text-center">{getMonthLabel(month)}</span>
          {!isCurrentMonth && (
            <button onClick={() => setMonth(currentMonthKey)}
              className="px-2.5 py-1.5 rounded-lg bg-violet-500/15 text-violet-300 text-xs font-medium border border-violet-500/30 hover:bg-violet-500/25 transition-colors">Today</button>
          )}
          <button onClick={() => shiftMonth(1)} className="p-2 rounded-lg bg-bg-card border border-line-subtle text-gray-400 hover:text-white hover:border-line transition-colors">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Copy from last month */}
      {canCopyPrev && (
        <button onClick={copyFromLastMonth}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-violet-500/30 text-violet-300 text-sm font-medium hover:bg-violet-500/5 transition-colors">
          <Copy size={14} /> Copy {prevBudgets.length} budget{prevBudgets.length !== 1 ? 's' : ''} from {getMonthLabel(prevMonthKey)}
        </button>
      )}

      {/* Overall summary */}
      {totalBudget > 0 && (
        <div className="glow-card bg-bg-card border border-line-subtle rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-white">Overall Budget</span>
              {overallOverPace && (
                <span className="text-[9px] font-bold uppercase tracking-wider text-amber-300 bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 rounded inline-flex items-center gap-1">
                  <Gauge size={9} /> Over pace
                </span>
              )}
            </div>
            <span className={`text-sm font-bold ${totalSpent > totalBudget ? 'text-rose-400' : 'text-emerald-400'}`}>
              <AnimatedNumber value={totalSpent} format={formatCurrency} /> <span className="text-gray-500 font-normal">/ {formatCurrency(totalBudget)}</span>
            </span>
          </div>
          <div className="relative h-3 bg-bg-elevated rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, overallPct)}%`, backgroundColor: totalSpent > totalBudget ? '#f43f5e' : overallPct > 80 ? '#f59e0b' : '#10b981' }} />
            {isCurrentMonth && (
              <div className="absolute top-0 bottom-0 w-px bg-white/50" style={{ left: `${Math.min(100, monthProgress * 100)}%` }} title="Today" />
            )}
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1.5">
            <span>{Math.round(overallPct)}% used{isCurrentMonth ? ` · day ${dayOfMonth} of ${daysInMonth}` : ''}</span>
            <span>{formatCurrency(Math.max(0, totalBudget - totalSpent))} remaining</span>
          </div>
        </div>
      )}

      {/* Budgeted categories */}
      {budgetedCats.length > 0 && (
        <motion.div variants={gridStagger} initial="hidden" animate="show" className="space-y-3">
          {budgetedCats.map(({ cat, spent, limit, status }) => (
            <motion.div key={cat.id} variants={cardRise}>
              <BudgetRow cat={cat} spent={spent} limit={limit} status={status} />
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Unbudgeted categories (collapsible) */}
      {unbudgetedCats.length > 0 && (
        <div className="bg-bg-card border border-line-subtle rounded-xl overflow-hidden">
          <button onClick={() => setShowUnbudgeted(v => !v)}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.02] transition-colors">
            <span className="text-sm text-gray-400">
              {unbudgetedCats.length} categor{unbudgetedCats.length !== 1 ? 'ies' : 'y'} without a budget
              {unbudgetedSpent > 0 && <span className="text-gray-600"> · {formatCurrency(unbudgetedSpent)} spent</span>}
            </span>
            <ChevronDown size={15} className={`text-gray-500 transition-transform ${showUnbudgeted ? 'rotate-180' : ''}`} />
          </button>
          {showUnbudgeted && (
            <div className="divide-y divide-line-subtle border-t border-line-subtle">
              {unbudgetedCats.map(cat => {
                const spent = spending[cat.id] || 0
                return (
                  <div key={cat.id} className="flex items-center justify-between px-4 py-2.5">
                    <div className="flex items-center gap-3">
                      <CatInitial name={cat.name} color={cat.color} />
                      <div>
                        <div className="text-sm text-gray-200">{cat.name}</div>
                        {spent > 0 && <div className="text-[11px] text-gray-500">{formatCurrency(spent)} spent this month</div>}
                      </div>
                    </div>
                    {editCatId === cat.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          className="w-24 bg-bg-elevated border border-line-subtle rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-colors"
                          type="number" min="0" placeholder="₹ Limit" value={editAmount} autoFocus
                          onChange={e => setEditAmount(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') handleSave(cat.id); if (e.key === 'Escape') setEditCatId(null) }}
                        />
                        <button onClick={() => handleSave(cat.id)} className="px-2 py-1.5 bg-purple-600 text-white text-xs rounded-lg hover:bg-purple-500 transition-colors">Save</button>
                        <button onClick={() => setEditCatId(null)} className="text-xs text-gray-500 hover:text-gray-300">Cancel</button>
                      </div>
                    ) : (
                      <button onClick={() => { setEditCatId(cat.id); setEditAmount('') }}
                        className="px-3 py-1.5 text-xs text-purple-400 hover:text-purple-300 bg-purple-500/10 rounded-lg transition-colors">Set Budget</button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {expenseCategories.length === 0 && (
        <div className="text-center py-16 text-gray-500 text-sm">
          No expense categories yet. Add some in the Categories section.
        </div>
      )}
    </div>
  )
}
