import { useMemo, useState } from 'react'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { TrendingUp, TrendingDown, Wallet, Landmark, ArrowUpRight, ArrowDownRight, ChevronLeft, ChevronRight, Pencil, Trash2, ArrowLeftRight } from 'lucide-react'
import { useApp } from '../context/AppContext'
import {
  formatCurrency, formatDate, getCurrentMonthKey, getMonthlyTotals,
  getCategoryTotals, getDailyTotals, getMonthLabel, getAccountBalance
} from '../utils/helpers'
import TransactionRow from './TransactionRow'
import AddTransactionModal from './AddTransactionModal'
import ConfirmDialog from './ConfirmDialog'

function SummaryCard({ label, value, sub, icon: Icon, color, trend, valueColor }) {
  return (
    <div className="bg-bg-card border border-line-subtle rounded-xl p-4 sm:p-5 hover:border-line transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: color + '18', border: `1px solid ${color}20` }}>
          <Icon size={18} style={{ color }} />
        </div>
        {trend !== undefined && trend !== null && (
          <span className={`flex items-center gap-0.5 text-xs font-medium ${trend >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {trend >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div className={`text-lg sm:text-xl font-bold mb-1 ${valueColor || 'text-white'}`}>{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
      {sub && <div className="text-xs text-gray-600 mt-0.5">{sub}</div>}
    </div>
  )
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="glass rounded-lg px-3 py-2.5 shadow-xl">
      <p className="text-xs text-gray-400 mb-1.5">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-xs font-semibold" style={{ color: p.color }}>
          {p.name}: ₹{Number(p.value).toLocaleString('en-IN')}
        </p>
      ))}
    </div>
  )
}

function InsightCard({ icon, title, value, sub, highlight }) {
  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg border ${highlight ? 'bg-violet-500/5 border-violet-500/20' : 'bg-bg-elevated border-line-subtle'}`}>
      <span className="text-lg flex-shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-gray-500">{title}</div>
        <div className="text-sm font-semibold text-white truncate">{value}</div>
        {sub && <div className="text-[11px] text-gray-600 mt-0.5">{sub}</div>}
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { transactions, categories, accounts, budgets, deleteTransaction } = useApp()
  const [editTx, setEditTx] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthKey())

  const prevMonth = useMemo(() => {
    const [y, m] = selectedMonth.split('-').map(Number)
    const pm = m === 1 ? 12 : m - 1
    const py = m === 1 ? y - 1 : y
    return `${py}-${String(pm).padStart(2, '0')}`
  }, [selectedMonth])

  function shiftMonth(dir) {
    const [y, m] = selectedMonth.split('-').map(Number)
    const nm = m + dir
    const ny = nm < 1 ? y - 1 : nm > 12 ? y + 1 : y
    const nmo = nm < 1 ? 12 : nm > 12 ? 1 : nm
    setSelectedMonth(`${ny}-${String(nmo).padStart(2, '0')}`)
  }

  const curTxs = useMemo(() => transactions.filter(t => t.date.startsWith(selectedMonth)), [transactions, selectedMonth])
  const prevTxs = useMemo(() => transactions.filter(t => t.date.startsWith(prevMonth)), [transactions, prevMonth])

  const curIncome  = curTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const curExpense = curTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const prevIncome  = prevTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const prevExpense = prevTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const netBalance = curIncome - curExpense

  // Total net worth across all accounts
  const totalNetWorth = useMemo(() =>
    accounts.reduce((sum, acc) => sum + getAccountBalance(transactions, acc.id), 0),
    [accounts, transactions]
  )

  function pctChange(cur, prev) {
    if (!prev) return null
    return Math.round(((cur - prev) / prev) * 100)
  }

  const isCurrentMonth = selectedMonth === getCurrentMonthKey()
  const [selYear, selMon] = selectedMonth.split('-').map(Number)
  const totalDaysInMonth = new Date(selYear, selMon, 0).getDate()
  const daysElapsed = isCurrentMonth ? new Date().getDate() : totalDaysInMonth
  const daysLeft = isCurrentMonth ? totalDaysInMonth - daysElapsed : 0
  const avgDaily = curExpense > 0 ? curExpense / Math.max(1, daysElapsed) : 0
  const projectedMonthEnd = Math.round(curExpense + avgDaily * daysLeft)

  const monthlyData = useMemo(() => {
    const all = getMonthlyTotals(transactions)
    const idx = all.findIndex(m => m.key === selectedMonth)
    const end = idx === -1 ? all.length : idx + 1
    return all.slice(Math.max(0, end - 6), end)
  }, [transactions, selectedMonth])

  const categoryData = useMemo(() => getCategoryTotals(curTxs, categories), [curTxs, categories])
  const dailyData    = useMemo(() => getDailyTotals(transactions, selectedMonth), [transactions, selectedMonth])

  // Top 3 biggest expenses this month
  const topExpenses = useMemo(() =>
    [...curTxs.filter(t => t.type === 'expense')]
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 3),
    [curTxs]
  )

  // Budget health for current month
  const budgetHealth = useMemo(() => {
    const monthBudgets = budgets.filter(b => b.month === selectedMonth)
    if (!monthBudgets.length) return null
    const totalLimit = monthBudgets.reduce((s, b) => s + (b.limit || 0), 0)
    const totalSpent = monthBudgets.reduce((s, b) => {
      const spent = curTxs.filter(t => t.type === 'expense' && t.categoryId === b.categoryId)
        .reduce((x, t) => x + t.amount, 0)
      return s + Math.min(spent, b.limit || 0)
    }, 0)
    const pct = totalLimit > 0 ? Math.round((totalSpent / totalLimit) * 100) : 0
    return { totalLimit, totalSpent, pct, count: monthBudgets.length }
  }, [budgets, selectedMonth, curTxs])

  const selectedYear = selectedMonth.split('-')[0]
  const yearStats = useMemo(() => {
    const yearTxs = transactions.filter(t => t.date.startsWith(selectedYear) && t.type !== 'transfer')
    const inc = yearTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
    const exp = yearTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
    const monthsActive = new Set(yearTxs.map(t => t.date.slice(0, 7))).size
    return { income: inc, expense: exp, net: inc - exp, count: yearTxs.length, months: monthsActive }
  }, [transactions, selectedYear])

  const accountBreakdown = useMemo(() => {
    const map = {}
    for (const tx of curTxs) {
      if (tx.type !== 'expense') continue
      if (!map[tx.accountId]) map[tx.accountId] = 0
      map[tx.accountId] += tx.amount
    }
    return Object.entries(map)
      .map(([id, amount]) => {
        const acc = accounts.find(a => a.id === id)
        return { id, name: acc?.name || id, color: acc?.color || '#64748b', amount }
      })
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5)
  }, [curTxs, accounts])

  const nonTransferCount = curTxs.filter(t => t.type !== 'transfer').length
  const recentTxs = useMemo(() => [...curTxs].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8), [curTxs])

  function confirmDel() {
    if (confirmDelete) deleteTransaction(confirmDelete)
    setConfirmDelete(null)
  }

  return (
    <div className="space-y-6 animate-in">
      {editTx && <AddTransactionModal editTx={editTx} onClose={() => setEditTx(null)} />}
      {confirmDelete && (
        <ConfirmDialog title="Delete Transaction" message="This action cannot be undone."
          onConfirm={confirmDel} onCancel={() => setConfirmDelete(null)} />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">{getMonthLabel(selectedMonth)}</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {isCurrentMonth ? 'Your financial summary for this month' : 'Historical view'}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={() => shiftMonth(-1)}
            className="p-2 rounded-lg bg-bg-card border border-line-subtle text-gray-400 hover:text-white hover:border-line transition-colors">
            <ChevronLeft size={15} />
          </button>
          {!isCurrentMonth && (
            <button onClick={() => setSelectedMonth(getCurrentMonthKey())}
              className="px-3 py-1.5 rounded-lg bg-violet-500/15 text-violet-300 text-xs font-medium border border-violet-500/30 hover:bg-violet-500/25 transition-colors">
              Today
            </button>
          )}
          <button onClick={() => shiftMonth(1)} disabled={isCurrentMonth}
            className="p-2 rounded-lg bg-bg-card border border-line-subtle text-gray-400 hover:text-white hover:border-line transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
            <ChevronRight size={15} />
          </button>
        </div>
      </div>

      {/* Summary cards — Income / Expenses / Net / Net Worth */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <SummaryCard label="Total Income" value={formatCurrency(curIncome)} icon={TrendingUp} color="#10b981"
          trend={pctChange(curIncome, prevIncome)} sub={`vs ${getMonthLabel(prevMonth)}`} />
        <SummaryCard label="Total Expenses" value={formatCurrency(curExpense)} icon={TrendingDown} color="#f97316"
          trend={pctChange(curExpense, prevExpense)} sub={`vs ${getMonthLabel(prevMonth)}`} />
        <SummaryCard
          label="Net This Month"
          value={`${netBalance >= 0 ? '+' : '−'}${formatCurrency(Math.abs(netBalance))}`}
          valueColor={netBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'}
          icon={Wallet}
          color={netBalance >= 0 ? '#10b981' : '#f43f5e'}
          sub={`${daysElapsed} of ${totalDaysInMonth} days`}
        />
        <SummaryCard
          label="Total Net Worth"
          value={`${totalNetWorth >= 0 ? '' : '−'}${formatCurrency(Math.abs(totalNetWorth))}`}
          valueColor={totalNetWorth >= 0 ? 'text-white' : 'text-rose-400'}
          icon={Landmark}
          color="#8b5cf6"
          sub={`${accounts.length} account${accounts.length !== 1 ? 's' : ''}`}
        />
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 bg-bg-card border border-line-subtle rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Income vs Expenses</h3>
          {monthlyData.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-10">No data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthlyData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1c1c2e" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false}
                  tickFormatter={v => v >= 1000 ? `₹${(v / 1000).toFixed(0)}k` : `₹${v}`} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: '#9ca3af' }} />
                <Bar dataKey="income" name="Income" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" name="Expense" fill="#f97316" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="lg:col-span-2 bg-bg-card border border-line-subtle rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Spending by Category</h3>
          {categoryData.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-10">No expenses this month</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={categoryData.slice(0, 6)} cx="50%" cy="50%"
                    innerRadius={45} outerRadius={72} paddingAngle={3} dataKey="value">
                    {categoryData.slice(0, 6).map(entry => (
                      <Cell key={entry.id} fill={entry.color} stroke="transparent" />
                    ))}
                  </Pie>
                  <Tooltip formatter={v => [`₹${Number(v).toLocaleString('en-IN')}`, '']}
                    contentStyle={{ background: '#1a1a2e', border: 'none', borderRadius: 8, fontSize: 12 }}
                    itemStyle={{ color: '#fff' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-2">
                {categoryData.slice(0, 5).map(c => (
                  <div key={c.id} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: c.color }} />
                      <span className="text-gray-400">{c.icon} {c.name}</span>
                    </div>
                    <span className="text-gray-300 font-medium">₹{c.value.toLocaleString('en-IN')}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-bg-card border border-line-subtle rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Daily Spending</h3>
          {dailyData.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-10">No data this month</p>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={dailyData}>
                <defs>
                  <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="incGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1c1c2e" vertical={false} />
                <XAxis dataKey="day" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false}
                  tickFormatter={v => v >= 1000 ? `₹${(v / 1000).toFixed(0)}k` : `₹${v}`} width={45} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="expense" name="Expense" stroke="#f97316" strokeWidth={2} fill="url(#expGrad)" />
                <Area type="monotone" dataKey="income" name="Income" stroke="#10b981" strokeWidth={2} fill="url(#incGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Insights */}
        <div className="bg-bg-card border border-line-subtle rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Insights</h3>
          <div className="space-y-2">
            <InsightCard icon="📊" title="Transactions this month" value={`${nonTransferCount} transaction${nonTransferCount !== 1 ? 's' : ''}`} />

            {isCurrentMonth && avgDaily > 0 && (
              <InsightCard
                icon="📅"
                title={`${daysLeft} days left — projected spend`}
                value={formatCurrency(projectedMonthEnd)}
                sub={`₹${Math.round(avgDaily).toLocaleString('en-IN')}/day avg`}
                highlight={projectedMonthEnd > curIncome && curIncome > 0}
              />
            )}

            {topExpenses.length > 0 && (
              <div className="p-3 bg-bg-elevated rounded-lg border border-line-subtle">
                <div className="text-xs text-gray-500 mb-2">Top expenses</div>
                <div className="space-y-1.5">
                  {topExpenses.map((tx, i) => (
                    <div key={tx.id} className="flex items-center justify-between gap-2">
                      <span className="text-xs text-gray-400 truncate">
                        <span className="text-gray-600 mr-1.5">#{i + 1}</span>{tx.name}
                      </span>
                      <span className="text-xs font-semibold text-rose-400 flex-shrink-0">
                        {formatCurrency(tx.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {budgetHealth && (
              <div className="p-3 bg-bg-elevated rounded-lg border border-line-subtle">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs text-gray-500">Budget usage ({budgetHealth.count} budgets)</span>
                  <span className={`text-xs font-semibold ${budgetHealth.pct >= 90 ? 'text-rose-400' : budgetHealth.pct >= 70 ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {budgetHealth.pct}%
                  </span>
                </div>
                <div className="h-1.5 bg-line rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${budgetHealth.pct >= 90 ? 'bg-rose-500' : budgetHealth.pct >= 70 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                    style={{ width: `${Math.min(100, budgetHealth.pct)}%` }} />
                </div>
                <div className="text-[11px] text-gray-600 mt-1">
                  {formatCurrency(budgetHealth.totalSpent)} of {formatCurrency(budgetHealth.totalLimit)}
                </div>
              </div>
            )}

            {!budgetHealth && (
              <InsightCard icon="💸" title="Avg daily expense" value={`₹${Math.round(avgDaily).toLocaleString('en-IN')}/day`} />
            )}
          </div>
        </div>
      </div>

      {/* Account Balances */}
      {accounts.length > 0 && (
        <div className="bg-bg-card border border-line-subtle rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white">Account Balances</h3>
            <span className="text-xs text-gray-500">All-time</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {accounts.map(acc => {
              const balance = getAccountBalance(transactions, acc.id)
              return (
                <div key={acc.id} className="bg-bg-elevated border border-line-subtle rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: acc.color }} />
                    <span className="text-xs text-gray-400 truncate font-medium">{acc.name}</span>
                  </div>
                  <div className={`text-base font-bold ${balance >= 0 ? 'text-white' : 'text-rose-400'}`}>
                    {balance < 0 && '−'}{formatCurrency(Math.abs(balance))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Year summary + Account breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-bg-card border border-line-subtle rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">{selectedYear} Year Summary</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-bg-elevated rounded-lg p-3 border border-line-subtle">
              <div className="text-xs text-gray-500 mb-1">Year Income</div>
              <div className="text-sm font-bold text-emerald-400">{formatCurrency(yearStats.income)}</div>
            </div>
            <div className="bg-bg-elevated rounded-lg p-3 border border-line-subtle">
              <div className="text-xs text-gray-500 mb-1">Year Expenses</div>
              <div className="text-sm font-bold text-orange-400">{formatCurrency(yearStats.expense)}</div>
            </div>
            <div className="bg-bg-elevated rounded-lg p-3 border border-line-subtle">
              <div className="text-xs text-gray-500 mb-1">Year Saved</div>
              <div className={`text-sm font-bold ${yearStats.net >= 0 ? 'text-violet-400' : 'text-rose-400'}`}>
                {yearStats.net < 0 && '−'}{formatCurrency(Math.abs(yearStats.net))}
              </div>
            </div>
            <div className="bg-bg-elevated rounded-lg p-3 border border-line-subtle">
              <div className="text-xs text-gray-500 mb-1">Avg / Month</div>
              <div className="text-sm font-bold text-gray-300">
                {yearStats.months > 0 ? formatCurrency(Math.round(yearStats.expense / yearStats.months)) : '—'}
              </div>
            </div>
          </div>
          <div className="mt-3 text-xs text-gray-600">
            {yearStats.count} transactions across {yearStats.months} month{yearStats.months !== 1 ? 's' : ''}
            {yearStats.income > 0 && ` · ${Math.round((yearStats.net / yearStats.income) * 100)}% saved`}
          </div>
        </div>

        <div className="bg-bg-card border border-line-subtle rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Spending by Account</h3>
          {accountBreakdown.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-6">No expenses this month</p>
          ) : (
            <div className="space-y-3">
              {accountBreakdown.map(acc => {
                const pct = curExpense > 0 ? Math.round((acc.amount / curExpense) * 100) : 0
                return (
                  <div key={acc.id}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: acc.color }} />
                        <span className="text-xs text-gray-400">{acc.name}</span>
                      </div>
                      <span className="text-xs font-medium text-gray-300">{formatCurrency(acc.amount)}</span>
                    </div>
                    <div className="h-1.5 bg-bg-elevated rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, backgroundColor: acc.color }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Recent transactions */}
      <div className="bg-bg-card border border-line-subtle rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-line-subtle flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">Recent Transactions</h3>
          <span className="text-xs text-gray-500">{recentTxs.length} shown · {getMonthLabel(selectedMonth)}</span>
        </div>
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-line-subtle">
                <th className="px-4 py-2.5 text-xs font-semibold text-gray-600 uppercase tracking-wider text-left">Name</th>
                <th className="px-4 py-2.5 text-xs font-semibold text-gray-600 uppercase tracking-wider text-right">Amount</th>
                <th className="px-4 py-2.5 text-xs font-semibold text-gray-600 uppercase tracking-wider text-left">Account</th>
                <th className="px-4 py-2.5 text-xs font-semibold text-gray-600 uppercase tracking-wider text-left">Category</th>
                <th className="px-4 py-2.5 text-xs font-semibold text-gray-600 uppercase tracking-wider text-left">Date</th>
                <th className="px-4 py-2.5 w-16" />
              </tr>
            </thead>
            <tbody>
              {recentTxs.length === 0 ? (
                <tr><td colSpan={6} className="py-16 text-center text-gray-500 text-sm">No transactions in {getMonthLabel(selectedMonth)}</td></tr>
              ) : recentTxs.map(tx => {
                const pairedAccountId = tx.transferDirection === 'out' ? tx.toAccountId : tx.fromAccountId
                return (
                  <TransactionRow key={tx.id} tx={tx}
                    category={categories.find(c => c.id === tx.categoryId)}
                    account={accounts.find(a => a.id === tx.accountId)}
                    pairedAccount={tx.type === 'transfer' ? accounts.find(a => a.id === pairedAccountId) : null}
                    onEdit={setEditTx} onDelete={(id) => setConfirmDelete(id)}
                  />
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="md:hidden divide-y divide-line-subtle">
          {recentTxs.length === 0 ? (
            <div className="py-16 text-center text-gray-500 text-sm">No transactions in {getMonthLabel(selectedMonth)}</div>
          ) : recentTxs.map(tx => {
            const isTransfer = tx.type === 'transfer'
            const isOut = tx.transferDirection === 'out'
            const category = categories.find(c => c.id === tx.categoryId)
            const account = accounts.find(a => a.id === tx.accountId)
            const pairedAccountId = isOut ? tx.toAccountId : tx.fromAccountId
            const pairedAccount = isTransfer ? accounts.find(a => a.id === pairedAccountId) : null
            return (
              <div key={tx.id} className="px-4 py-3">
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
                      {account && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold text-white" style={{ backgroundColor: account.color + '20' }}>{account.name}</span>}
                      {pairedAccount && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] text-blue-300 bg-blue-500/10 border border-blue-500/20">{isOut ? `→ ${pairedAccount.name}` : `← ${pairedAccount.name}`}</span>}
                    </>
                  ) : (
                    <>
                      {category && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium" style={{ backgroundColor: category.color + '15', color: category.color }}>{category.icon} {category.name}</span>}
                      {account && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold text-white" style={{ backgroundColor: account.color + '20' }}>{account.name}</span>}
                    </>
                  )}
                  <span className="text-[11px] text-gray-500">{formatDate(tx.date)}</span>
                </div>
                <div className="flex justify-end gap-0.5 mt-1.5">
                  <button onClick={() => setEditTx(tx)} className="p-1.5 rounded-md text-gray-500 hover:text-violet-400 hover:bg-violet-500/10 transition-colors"><Pencil size={13} /></button>
                  <button onClick={() => setConfirmDelete(tx.id)} className="p-1.5 rounded-md text-gray-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"><Trash2 size={13} /></button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
