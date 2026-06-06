import { useMemo } from 'react'
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts'
import { TrendingUp, TrendingDown, AlertTriangle, Calendar, Store, Activity } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { formatCurrency, formatCompact, getMonthlyTotals, getCurrentMonthKey } from '../utils/helpers'

function ChartTooltip({ active, payload, label, currency = true }) {
  if (!active || !payload?.length) return null
  return (
    <div className="glass rounded-lg px-3 py-2.5 shadow-xl">
      <p className="text-xs text-gray-400 mb-1.5">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-xs font-semibold" style={{ color: p.color }}>
          {p.name}: {currency ? formatCurrency(p.value) : p.value}
        </p>
      ))}
    </div>
  )
}

// Group transaction names into merchants
function extractMerchant(name) {
  if (!name) return '—'
  // Take first word, drop common suffixes
  const clean = name.trim().toLowerCase()
    .replace(/[0-9*#@/-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  const firstTwoWords = clean.split(' ').slice(0, 2).join(' ')
  return firstTwoWords.charAt(0).toUpperCase() + firstTwoWords.slice(1)
}

export default function Analysis() {
  const { transactions, categories, accounts } = useApp()

  const expenseTxs = useMemo(() => transactions.filter(t => t.type === 'expense'), [transactions])
  const incomeTxs  = useMemo(() => transactions.filter(t => t.type === 'income'), [transactions])

  // Monthly trend last 12 months
  const monthlyTrend = useMemo(() => {
    const all = getMonthlyTotals(transactions)
    return all.slice(-12).map(m => ({ ...m, net: m.income - m.expense }))
  }, [transactions])

  // Last 3 month average for forecast
  const cashFlowForecast = useMemo(() => {
    const recent = monthlyTrend.slice(-3)
    if (!recent.length) return null
    const avgIncome  = recent.reduce((s, m) => s + m.income, 0) / recent.length
    const avgExpense = recent.reduce((s, m) => s + m.expense, 0) / recent.length
    const avgNet = avgIncome - avgExpense

    // Project next 6 months
    const projection = []
    const now = new Date()
    let cumulative = 0
    for (let i = 1; i <= 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
      const label = d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' })
      cumulative += avgNet
      projection.push({
        label, income: Math.round(avgIncome), expense: Math.round(avgExpense),
        net: Math.round(avgNet), cumulative: Math.round(cumulative)
      })
    }
    return { avgIncome, avgExpense, avgNet, projection, monthsAnalyzed: recent.length }
  }, [monthlyTrend])

  // Day of week pattern
  const dayOfWeekData = useMemo(() => {
    const totals = [0, 0, 0, 0, 0, 0, 0]
    const counts = [0, 0, 0, 0, 0, 0, 0]
    for (const tx of expenseTxs) {
      const day = new Date(tx.date).getDay()
      totals[day] += tx.amount
      counts[day] += 1
    }
    return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, i) => ({
      day, total: totals[i], avg: counts[i] ? Math.round(totals[i] / counts[i]) : 0, count: counts[i]
    }))
  }, [expenseTxs])

  // Top merchants
  const topMerchants = useMemo(() => {
    const map = {}
    for (const tx of expenseTxs) {
      const m = extractMerchant(tx.name)
      if (!map[m]) map[m] = { name: m, total: 0, count: 0, last: tx.date }
      map[m].total += tx.amount
      map[m].count += 1
      if (tx.date > map[m].last) map[m].last = tx.date
    }
    return Object.values(map).sort((a, b) => b.total - a.total).slice(0, 10)
  }, [expenseTxs])

  // Category trend — last 6 months by category
  const categoryTrend = useMemo(() => {
    const last6 = monthlyTrend.slice(-6).map(m => m.key)
    const map = {}
    for (const tx of expenseTxs) {
      const monthKey = tx.date.slice(0, 7)
      if (!last6.includes(monthKey)) continue
      if (!map[tx.categoryId]) map[tx.categoryId] = {}
      map[tx.categoryId][monthKey] = (map[tx.categoryId][monthKey] || 0) + tx.amount
    }
    const rows = Object.entries(map).map(([catId, monthMap]) => {
      const cat = categories.find(c => c.id === catId)
      const recent = last6.map(k => monthMap[k] || 0)
      const recentAvg = recent.slice(-3).reduce((s, v) => s + v, 0) / 3
      const olderAvg = recent.slice(0, 3).reduce((s, v) => s + v, 0) / 3
      const trend = olderAvg > 0 ? ((recentAvg - olderAvg) / olderAvg) * 100 : 0
      return {
        id: catId, name: cat?.name || 'Unknown', color: cat?.color || '#64748b',
        total: recent.reduce((s, v) => s + v, 0),
        recentAvg, olderAvg, trend
      }
    }).sort((a, b) => b.total - a.total).slice(0, 8)
    return rows
  }, [expenseTxs, categories, monthlyTrend])

  // Quick insights
  const insights = useMemo(() => {
    const items = []
    // Income vs Expense streak
    const last3 = monthlyTrend.slice(-3)
    const positiveCount = last3.filter(m => m.income > m.expense).length
    if (last3.length === 3) {
      if (positiveCount === 3) items.push({ type: 'good', text: '3 months in a row of positive cash flow 🎉' })
      else if (positiveCount === 0) items.push({ type: 'bad', text: 'Spending exceeded income for 3 months in a row' })
    }

    // Biggest expense category jump
    const biggestJump = categoryTrend.find(c => c.trend > 50)
    if (biggestJump) {
      items.push({ type: 'warn', text: `${biggestJump.name} spending up ${Math.round(biggestJump.trend)}% vs earlier months` })
    }

    // Biggest cut
    const biggestCut = [...categoryTrend].sort((a, b) => a.trend - b.trend)[0]
    if (biggestCut && biggestCut.trend < -30) {
      items.push({ type: 'good', text: `${biggestCut.name} spending down ${Math.round(Math.abs(biggestCut.trend))}% — nice cut` })
    }

    // Day of week peak
    const peakDay = [...dayOfWeekData].sort((a, b) => b.total - a.total)[0]
    if (peakDay && peakDay.total > 0) {
      items.push({ type: 'info', text: `${peakDay.day} is your highest-spend day on average` })
    }

    return items
  }, [monthlyTrend, categoryTrend, dayOfWeekData])

  if (transactions.length < 5) {
    return (
      <div className="space-y-6 animate-in">
        <div>
          <h2 className="text-xl font-bold text-white">Analysis</h2>
          <p className="text-sm text-gray-500 mt-0.5">Spending patterns and cash flow forecasts</p>
        </div>
        <div className="bg-bg-card border border-line-subtle rounded-2xl p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mx-auto mb-4">
            <Activity size={28} className="text-violet-400" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">Not enough data yet</h3>
          <p className="text-sm text-gray-500 max-w-sm mx-auto">
            Analysis kicks in after a few transactions. Add some expenses across a couple of months and come back.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in">
      <div>
        <h2 className="text-xl font-bold text-white">Analysis</h2>
        <p className="text-sm text-gray-500 mt-0.5">Patterns the numbers reveal · {transactions.length} transactions analyzed</p>
      </div>

      {/* Insights row */}
      {insights.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {insights.map((ins, i) => (
            <div key={i} className={`p-3 rounded-xl border flex items-start gap-3 ${
              ins.type === 'good' ? 'bg-emerald-500/5 border-emerald-500/20'
              : ins.type === 'bad' ? 'bg-rose-500/5 border-rose-500/20'
              : ins.type === 'warn' ? 'bg-amber-500/5 border-amber-500/20'
              : 'bg-bg-elevated border-line-subtle'
            }`}>
              <div className="text-base flex-shrink-0">
                {ins.type === 'good' ? '✅' : ins.type === 'bad' ? '⚠️' : ins.type === 'warn' ? '📈' : '💡'}
              </div>
              <p className="text-sm text-gray-200 flex-1">{ins.text}</p>
            </div>
          ))}
        </div>
      )}

      {/* Cash flow forecast */}
      {cashFlowForecast && (
        <div className="bg-bg-card border border-line-subtle rounded-xl p-5">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-semibold text-white">Cash Flow Forecast</h3>
            <span className="text-xs text-gray-500">based on last {cashFlowForecast.monthsAnalyzed} months</span>
          </div>
          <p className="text-xs text-gray-500 mb-4">
            If patterns continue, you'll save{' '}
            <span className={`font-bold ${cashFlowForecast.avgNet >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {cashFlowForecast.avgNet >= 0 ? '+' : '−'}{formatCurrency(Math.abs(Math.round(cashFlowForecast.avgNet)))}
            </span> per month
          </p>

          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={cashFlowForecast.projection}>
              <defs>
                <linearGradient id="cfGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1c1c2e" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false}
                tickFormatter={v => formatCompact(v)} width={50} />
              <Tooltip content={<ChartTooltip />} />
              <ReferenceLine y={0} stroke="#374151" strokeDasharray="3 3" />
              <Area type="monotone" dataKey="cumulative" name="Projected savings" stroke="#a78bfa" strokeWidth={2.5} fill="url(#cfGrad)" />
            </AreaChart>
          </ResponsiveContainer>

          <div className="grid grid-cols-3 gap-3 mt-3 text-center">
            <div className="bg-bg-elevated rounded-lg p-3 border border-line-subtle">
              <div className="text-[11px] text-gray-500 mb-0.5">Avg Income</div>
              <div className="text-sm font-bold text-emerald-400">{formatCurrency(Math.round(cashFlowForecast.avgIncome))}</div>
            </div>
            <div className="bg-bg-elevated rounded-lg p-3 border border-line-subtle">
              <div className="text-[11px] text-gray-500 mb-0.5">Avg Expense</div>
              <div className="text-sm font-bold text-rose-400">{formatCurrency(Math.round(cashFlowForecast.avgExpense))}</div>
            </div>
            <div className="bg-bg-elevated rounded-lg p-3 border border-line-subtle">
              <div className="text-[11px] text-gray-500 mb-0.5">In 6 months</div>
              <div className={`text-sm font-bold ${cashFlowForecast.projection[5]?.cumulative >= 0 ? 'text-violet-400' : 'text-rose-400'}`}>
                {cashFlowForecast.projection[5]?.cumulative >= 0 ? '+' : '−'}{formatCurrency(Math.abs(cashFlowForecast.projection[5]?.cumulative || 0))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Income vs Expenses trend */}
      <div className="bg-bg-card border border-line-subtle rounded-xl p-5">
        <h3 className="text-sm font-semibold text-white mb-4">12-Month Trend</h3>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={monthlyTrend}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1c1c2e" vertical={false} />
            <XAxis dataKey="month" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false}
              tickFormatter={v => formatCompact(v)} width={50} />
            <Tooltip content={<ChartTooltip />} />
            <ReferenceLine y={0} stroke="#374151" strokeDasharray="3 3" />
            <Line type="monotone" dataKey="income" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} name="Income" />
            <Line type="monotone" dataKey="expense" stroke="#f97316" strokeWidth={2} dot={{ r: 3 }} name="Expense" />
            <Line type="monotone" dataKey="net" stroke="#a78bfa" strokeWidth={2} strokeDasharray="4 4" dot={false} name="Net" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Day of week pattern */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-2 bg-bg-card border border-line-subtle rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Calendar size={14} className="text-violet-400" /> Spending by day of week
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={dayOfWeekData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1c1c2e" vertical={false} />
              <XAxis dataKey="day" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false}
                tickFormatter={v => formatCompact(v)} width={45} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="total" name="Spent" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Category trends */}
        <div className="lg:col-span-3 bg-bg-card border border-line-subtle rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Category Trends <span className="text-gray-500 font-normal">(last 6 months)</span></h3>
          {categoryTrend.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-6">Not enough data</p>
          ) : (
            <div className="space-y-2.5">
              {categoryTrend.map(c => (
                <div key={c.id} className="flex items-center gap-3">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: c.color }} />
                  <span className="text-sm text-gray-300 flex-1 truncate">{c.name}</span>
                  <span className="text-sm font-semibold text-gray-200">{formatCurrency(c.total)}</span>
                  {Math.abs(c.trend) > 5 && (
                    <span className={`text-xs font-medium inline-flex items-center gap-0.5 min-w-[55px] justify-end ${
                      c.trend > 0 ? 'text-rose-400' : 'text-emerald-400'
                    }`}>
                      {c.trend > 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                      {Math.abs(Math.round(c.trend))}%
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Top merchants */}
      <div className="bg-bg-card border border-line-subtle rounded-xl p-5">
        <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <Store size={14} className="text-violet-400" /> Top Merchants
        </h3>
        {topMerchants.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-6">Not enough data</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
            {topMerchants.map((m, i) => (
              <div key={m.name} className="flex items-center justify-between py-1.5 border-b border-line-subtle last:border-0">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xs text-gray-600 w-5 text-right">#{i + 1}</span>
                  <span className="text-sm text-gray-200 truncate capitalize">{m.name}</span>
                  <span className="text-[10px] text-gray-600">×{m.count}</span>
                </div>
                <span className="text-sm font-semibold text-rose-400 flex-shrink-0">{formatCurrency(m.total)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
