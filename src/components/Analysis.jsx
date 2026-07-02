import { useMemo, useState } from 'react'
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine,
} from 'recharts'
import {
  TrendingUp, TrendingDown, Calendar, Store, Activity, Heart, PiggyBank,
  Repeat, Zap, ArrowDownRight, ArrowUpRight, Flame,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { useApp } from '../context/AppContext'
import { formatCurrency, formatCompact, getMonthlyTotals, getAccountBalance } from '../utils/helpers'
import { gridStagger, cardRise } from '../utils/motion'
import AnimatedNumber from './AnimatedNumber'

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

function extractMerchant(name) {
  if (!name) return '—'
  const clean = name.trim().toLowerCase().replace(/[0-9*#@/-]/g, ' ').replace(/\s+/g, ' ').trim()
  const firstTwoWords = clean.split(' ').slice(0, 2).join(' ')
  return firstTwoWords.charAt(0).toUpperCase() + firstTwoWords.slice(1)
}

const RANGES = [
  { id: '3m', label: '3M', months: 3 },
  { id: '6m', label: '6M', months: 6 },
  { id: '1y', label: '1Y', months: 12 },
  { id: 'all', label: 'All', months: 999 },
]

function StatCard({ label, value, sub, icon: Icon, color }) {
  return (
    <div className="glow-card bg-bg-card border border-line-subtle rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: color + '18', border: `1px solid ${color}25` }}>
          <Icon size={14} style={{ color }} />
        </div>
        <span className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold">{label}</span>
      </div>
      <div className="text-lg font-bold text-white">{value}</div>
      {sub && <div className="text-[11px] text-gray-500 mt-0.5">{sub}</div>}
    </div>
  )
}

export default function Analysis() {
  const { transactions, categories, accounts } = useApp()
  const [range, setRange] = useState('6m')

  const rangeStart = useMemo(() => {
    const cfg = RANGES.find(r => r.id === range)
    if (!cfg || cfg.months >= 999) return '0000-00-00'
    const d = new Date()
    d.setMonth(d.getMonth() - cfg.months + 1)
    d.setDate(1)
    return d.toISOString().slice(0, 10)
  }, [range])

  const scoped = useMemo(
    () => transactions.filter(t => t.type !== 'transfer' && t.date >= rangeStart),
    [transactions, rangeStart]
  )
  const expenseTxs = useMemo(() => scoped.filter(t => t.type === 'expense'), [scoped])
  const incomeTxs  = useMemo(() => scoped.filter(t => t.type === 'income'), [scoped])

  // Monthly totals within range
  const monthlyTrend = useMemo(() => {
    const all = getMonthlyTotals(scoped)
    return all.map(m => ({ ...m, net: m.income - m.expense }))
  }, [scoped])

  // ── Headline metrics ──
  const totals = useMemo(() => {
    const income = incomeTxs.reduce((s, t) => s + t.amount, 0)
    const expense = expenseTxs.reduce((s, t) => s + t.amount, 0)
    const months = Math.max(1, monthlyTrend.length)
    const savingsRate = income > 0 ? Math.round(((income - expense) / income) * 100) : 0
    const avgMonthlySpend = Math.round(expense / months)
    const largest = expenseTxs.reduce((max, t) => t.amount > (max?.amount || 0) ? t : max, null)
    return { income, expense, net: income - expense, savingsRate, avgMonthlySpend, largest, months }
  }, [incomeTxs, expenseTxs, monthlyTrend])

  // ── Financial health score (0-100) ──
  const health = useMemo(() => {
    if (monthlyTrend.length < 2) return null
    // 1. Savings rate → up to 40
    const srScore = Math.max(0, Math.min(40, (totals.savingsRate / 30) * 40))
    // 2. Positive-month ratio → up to 30
    const positive = monthlyTrend.filter(m => m.income > m.expense).length
    const posScore = (positive / monthlyTrend.length) * 30
    // 3. Expense stability (lower volatility better) → up to 30
    const exp = monthlyTrend.map(m => m.expense)
    const mean = exp.reduce((s, v) => s + v, 0) / exp.length
    const variance = exp.reduce((s, v) => s + (v - mean) ** 2, 0) / exp.length
    const cv = mean > 0 ? Math.sqrt(variance) / mean : 0
    const stabScore = Math.max(0, Math.min(30, (1 - cv) * 30))
    const total = Math.round(srScore + posScore + stabScore)
    const label = total >= 80 ? 'Excellent' : total >= 60 ? 'Good' : total >= 40 ? 'Fair' : 'Needs work'
    const color = total >= 80 ? '#10b981' : total >= 60 ? '#8b5cf6' : total >= 40 ? '#f59e0b' : '#f43f5e'
    return {
      total, label, color,
      factors: [
        { name: 'Savings rate', score: Math.round(srScore), max: 40, hint: `${totals.savingsRate}% saved` },
        { name: 'Positive months', score: Math.round(posScore), max: 30, hint: `${positive} of ${monthlyTrend.length}` },
        { name: 'Spending consistency', score: Math.round(stabScore), max: 30, hint: cv < 0.3 ? 'very steady' : cv < 0.6 ? 'moderate' : 'erratic' },
      ],
    }
  }, [monthlyTrend, totals])

  // ── Cash flow forecast (always uses last 3 real months) ──
  const cashFlowForecast = useMemo(() => {
    const allMonths = getMonthlyTotals(transactions.filter(t => t.type !== 'transfer'))
    const recent = allMonths.slice(-3).map(m => ({ ...m, net: m.income - m.expense }))
    if (recent.length < 2) return null
    const avgIncome  = recent.reduce((s, m) => s + m.income, 0) / recent.length
    const avgExpense = recent.reduce((s, m) => s + m.expense, 0) / recent.length
    const avgNet = avgIncome - avgExpense
    const projection = []
    const now = new Date()
    let cumulative = 0
    for (let i = 1; i <= 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
      cumulative += avgNet
      projection.push({
        label: d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
        cumulative: Math.round(cumulative),
      })
    }
    return { avgIncome, avgExpense, avgNet, projection, monthsAnalyzed: recent.length }
  }, [transactions])

  // ── Savings rate per month ──
  const savingsSeries = useMemo(() =>
    monthlyTrend.map(m => ({
      month: m.month,
      rate: m.income > 0 ? Math.round((m.net / m.income) * 100) : 0,
    })),
    [monthlyTrend]
  )

  // ── Income sources ──
  const incomeSources = useMemo(() => {
    const map = {}
    for (const tx of incomeTxs) {
      if (!map[tx.categoryId]) map[tx.categoryId] = 0
      map[tx.categoryId] += tx.amount
    }
    return Object.entries(map).map(([id, value]) => {
      const cat = categories.find(c => c.id === id)
      return { id, name: cat?.name || 'Other', value, color: cat?.color || '#64748b' }
    }).sort((a, b) => b.value - a.value)
  }, [incomeTxs, categories])

  // ── Weekday vs weekend ──
  const weekSplit = useMemo(() => {
    let weekday = 0, weekend = 0, wdCount = 0, weCount = 0
    for (const tx of expenseTxs) {
      const day = new Date(tx.date).getDay()
      if (day === 0 || day === 6) { weekend += tx.amount; weCount++ }
      else { weekday += tx.amount; wdCount++ }
    }
    const total = weekday + weekend
    return {
      weekday, weekend,
      weekdayPct: total > 0 ? Math.round((weekday / total) * 100) : 0,
      weekendPct: total > 0 ? Math.round((weekend / total) * 100) : 0,
      weekdayAvg: wdCount ? Math.round(weekday / wdCount) : 0,
      weekendAvg: weCount ? Math.round(weekend / weCount) : 0,
    }
  }, [expenseTxs])

  // ── Day of week ──
  const dayOfWeekData = useMemo(() => {
    const totals = [0, 0, 0, 0, 0, 0, 0]
    for (const tx of expenseTxs) totals[new Date(tx.date).getDay()] += tx.amount
    return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, i) => ({ day, total: totals[i] }))
  }, [expenseTxs])

  // ── Top merchants ──
  const topMerchants = useMemo(() => {
    const map = {}
    for (const tx of expenseTxs) {
      const m = extractMerchant(tx.name)
      if (!map[m]) map[m] = { name: m, total: 0, count: 0 }
      map[m].total += tx.amount
      map[m].count += 1
    }
    return Object.values(map).sort((a, b) => b.total - a.total).slice(0, 10)
  }, [expenseTxs])

  // ── Detected recurring / subscriptions ──
  // A merchant that appears in 3+ distinct months with a stable amount is likely recurring.
  const detectedRecurring = useMemo(() => {
    const map = {}
    for (const tx of expenseTxs) {
      const m = extractMerchant(tx.name)
      if (!map[m]) map[m] = { name: m, months: {}, amounts: [] }
      map[m].months[tx.date.slice(0, 7)] = (map[m].months[tx.date.slice(0, 7)] || 0) + tx.amount
      map[m].amounts.push(tx.amount)
    }
    const out = []
    for (const m of Object.values(map)) {
      const monthKeys = Object.keys(m.months)
      if (monthKeys.length < 3) continue
      const vals = Object.values(m.months)
      const mean = vals.reduce((s, v) => s + v, 0) / vals.length
      const maxDev = Math.max(...vals.map(v => Math.abs(v - mean) / mean))
      if (maxDev <= 0.2) {  // within 20% each month = steady
        out.push({ name: m.name, monthly: Math.round(mean), annual: Math.round(mean * 12), months: monthKeys.length })
      }
    }
    return out.sort((a, b) => b.monthly - a.monthly).slice(0, 8)
  }, [expenseTxs])

  const recurringTotal = detectedRecurring.reduce((s, r) => s + r.monthly, 0)

  // ── Money runway: how long liquid cash lasts at the current burn rate ──
  const runway = useMemo(() => {
    const liquid = accounts
      .filter(a => a.accountType !== 'credit')
      .reduce((s, a) => s + getAccountBalance(transactions, a), 0)
    if (expenseTxs.length === 0) return { liquid, days: null }
    const dates = expenseTxs.map(t => t.date).sort()
    const first = new Date(dates[0])
    const spanDays = Math.max(1, Math.round((Date.now() - first.getTime()) / 86400000))
    const dailyBurn = totals.expense / spanDays
    const days = dailyBurn > 0 ? Math.floor(Math.max(0, liquid) / dailyBurn) : null
    return { liquid, dailyBurn, days }
  }, [accounts, transactions, expenseTxs, totals.expense])

  // ── No-spend days in range + current streak ──
  const noSpend = useMemo(() => {
    if (expenseTxs.length === 0) return null
    const spendDays = new Set(expenseTxs.map(t => t.date))
    const first = [...spendDays].sort()[0]
    const start = new Date(rangeStart > first ? rangeStart : first)
    const today = new Date()
    let zero = 0, total = 0
    for (let d = new Date(start); d <= today; d.setDate(d.getDate() + 1)) {
      total++
      if (!spendDays.has(d.toISOString().slice(0, 10))) zero++
    }
    // Current streak: consecutive days ending today without an expense
    let streak = 0
    for (let d = new Date(today); ; d.setDate(d.getDate() - 1)) {
      if (spendDays.has(d.toISOString().slice(0, 10))) break
      streak++
      if (streak > 365) break
    }
    return { zero, total, streak }
  }, [expenseTxs, rangeStart])

  // ── Spending personality (a bit of fun, grounded in the data) ──
  const personality = useMemo(() => {
    if (expenseTxs.length < 8) return null
    const recurringShare = totals.expense > 0 ? (recurringTotal * totals.months) / totals.expense : 0
    const largestShare = totals.largest && totals.expense > 0 ? totals.largest.amount / totals.expense : 0
    const exp = monthlyTrend.map(m => m.expense)
    const mean = exp.reduce((s, v) => s + v, 0) / Math.max(1, exp.length)
    const cv = mean > 0 ? Math.sqrt(exp.reduce((s, v) => s + (v - mean) ** 2, 0) / exp.length) / mean : 0

    if (totals.savingsRate >= 40) return { emoji: '🥷', name: 'Silent Saver', blurb: 'Money comes in, very little leaves. Impressive discipline.' }
    if (largestShare >= 0.3) return { emoji: '🎯', name: 'Big-Ticket Buyer', blurb: 'A few large purchases define your spending, not daily leaks.' }
    if (recurringShare >= 0.35) return { emoji: '📦', name: 'Subscription Collector', blurb: 'A big slice of your spending renews itself every month.' }
    if (weekSplit.weekendPct >= 45) return { emoji: '🎉', name: 'Weekend Warrior', blurb: 'Weekdays are quiet. Weekends are when the wallet opens.' }
    if (cv < 0.25 && exp.length >= 3) return { emoji: '🧘', name: 'Steady Eddie', blurb: 'Your spending barely moves month to month. Very predictable.' }
    return { emoji: '⚖️', name: 'Balanced Spender', blurb: 'No single habit dominates. A healthy mix overall.' }
  }, [expenseTxs.length, totals, recurringTotal, monthlyTrend, weekSplit])

  // ── Top movers: biggest rupee change per category vs the previous period ──
  const topMovers = useMemo(() => {
    if (rangeStart === '0000-00-00') return null
    const startDate = new Date(rangeStart)
    const spanMs = Date.now() - startDate.getTime()
    const prevStart = new Date(startDate.getTime() - spanMs).toISOString().slice(0, 10)
    const sums = { cur: {}, prev: {} }
    for (const t of transactions) {
      if (t.type !== 'expense') continue
      if (t.date >= rangeStart) sums.cur[t.categoryId] = (sums.cur[t.categoryId] || 0) + t.amount
      else if (t.date >= prevStart) sums.prev[t.categoryId] = (sums.prev[t.categoryId] || 0) + t.amount
    }
    // If the previous window has no data at all, a comparison is meaningless —
    // everything would show as a from-zero "increase".
    const prevTotal = Object.values(sums.prev).reduce((s, v) => s + v, 0)
    if (prevTotal === 0) return null
    const ids = new Set([...Object.keys(sums.cur), ...Object.keys(sums.prev)])
    const rows = [...ids].map(id => {
      const cat = categories.find(c => c.id === id)
      return {
        id, name: cat?.name || 'Unknown', color: cat?.color || '#64748b',
        delta: (sums.cur[id] || 0) - (sums.prev[id] || 0),
        cur: sums.cur[id] || 0, prev: sums.prev[id] || 0,
      }
    }).filter(r => Math.abs(r.delta) >= 100)
    if (!rows.length) return null
    const up = [...rows].sort((a, b) => b.delta - a.delta)[0]
    const down = [...rows].sort((a, b) => a.delta - b.delta)[0]
    return {
      up: up && up.delta > 0 ? up : null,
      down: down && down.delta < 0 ? down : null,
    }
  }, [transactions, categories, rangeStart])

  // ── Category trends ──
  const categoryTrend = useMemo(() => {
    const keys = monthlyTrend.map(m => m.key)
    const half = Math.ceil(keys.length / 2)
    const olderKeys = new Set(keys.slice(0, half))
    const recentKeys = new Set(keys.slice(half))
    const map = {}
    for (const tx of expenseTxs) {
      const mk = tx.date.slice(0, 7)
      if (!map[tx.categoryId]) map[tx.categoryId] = { older: 0, recent: 0, total: 0 }
      if (olderKeys.has(mk)) map[tx.categoryId].older += tx.amount
      else if (recentKeys.has(mk)) map[tx.categoryId].recent += tx.amount
      map[tx.categoryId].total += tx.amount
    }
    return Object.entries(map).map(([catId, v]) => {
      const cat = categories.find(c => c.id === catId)
      // A trend needs at least 3 months in range (so both halves hold real data)
      // and a non-zero baseline. With 1-2 months the recent half is empty and
      // every category would falsely read as a 100% cut.
      const canTrend = keys.length >= 3 && v.older > 0
      const trend = canTrend ? ((v.recent - v.older) / v.older) * 100 : null
      return { id: catId, name: cat?.name || 'Unknown', color: cat?.color || '#64748b', total: v.total, trend, recent: v.recent }
    }).sort((a, b) => b.total - a.total).slice(0, 8)
  }, [expenseTxs, categories, monthlyTrend])

  // ── Insights ──
  const insights = useMemo(() => {
    const items = []
    const last3 = monthlyTrend.slice(-3)
    if (last3.length === 3) {
      const pos = last3.filter(m => m.income > m.expense).length
      if (pos === 3) items.push({ type: 'good', text: 'Three straight months of positive cash flow. Great momentum.' })
      else if (pos === 0) items.push({ type: 'bad', text: 'Spending has beaten income for three months running.' })
    }
    const withTrend = categoryTrend.filter(c => c.trend !== null)
    const jump = withTrend.find(c => c.trend > 50)
    if (jump) items.push({ type: 'warn', text: `${jump.name} is up ${Math.round(jump.trend)}% versus earlier in this range.` })
    // Only call it a "cut" when there is still some recent spending — a category
    // that simply stopped appearing is usually missing data, not a 100% cut.
    const cut = [...withTrend].filter(c => c.recent > 0).sort((a, b) => a.trend - b.trend)[0]
    if (cut && cut.trend < -30) items.push({ type: 'good', text: `${cut.name} is down ${Math.round(Math.abs(cut.trend))}%. Nice cut.` })
    if (recurringTotal > 0) items.push({ type: 'info', text: `About ${formatCurrency(recurringTotal)} a month looks like recurring subscriptions.` })
    if (weekSplit.weekendAvg > weekSplit.weekdayAvg * 1.4 && weekSplit.weekendAvg > 0) {
      items.push({ type: 'info', text: 'Your weekend transactions run noticeably larger than weekdays.' })
    }
    return items
  }, [monthlyTrend, categoryTrend, recurringTotal, weekSplit])

  if (transactions.filter(t => t.type !== 'transfer').length < 5) {
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
            Analysis kicks in after a few transactions. Add some across a couple of months and come back.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in">
      {/* Header + range */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white">Analysis</h2>
          <p className="text-sm text-gray-500 mt-0.5">{scoped.length} transactions in view</p>
        </div>
        <div className="inline-flex items-center bg-bg-card border border-line-subtle rounded-lg p-0.5">
          {RANGES.map(r => (
            <button key={r.id} onClick={() => setRange(r.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                range === r.id ? 'bg-violet-500/20 text-violet-200' : 'text-gray-400 hover:text-gray-200'
              }`}>
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Key metrics */}
      <motion.div variants={gridStagger} initial="hidden" animate="show"
        className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          <StatCard key="sr" label="Savings rate" icon={PiggyBank} color="#8b5cf6"
            value={<><AnimatedNumber value={totals.savingsRate} format={v => Math.round(v)} />%</>}
            sub={`${formatCurrency(totals.net)} kept`} />,
          <StatCard key="ams" label="Avg monthly spend" icon={Flame} color="#f97316"
            value={<AnimatedNumber value={totals.avgMonthlySpend} format={formatCurrency} />}
            sub={`over ${totals.months} month${totals.months !== 1 ? 's' : ''}`} />,
          <StatCard key="le" label="Largest expense" icon={ArrowDownRight} color="#f43f5e"
            value={totals.largest ? formatCurrency(totals.largest.amount) : '—'}
            sub={totals.largest ? totals.largest.name.slice(0, 22) : 'none'} />,
          <StatCard key="rec" label="Recurring / mo" icon={Repeat} color="#06b6d4"
            value={<AnimatedNumber value={recurringTotal} format={formatCurrency} />}
            sub={`${detectedRecurring.length} detected`} />,
        ].map((card, i) => <motion.div key={i} variants={cardRise}>{card}</motion.div>)}
      </motion.div>

      {/* Habits row: runway, no-spend, personality */}
      <motion.div variants={gridStagger} initial="hidden" animate="show"
        className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <motion.div variants={cardRise} className="glow-card bg-bg-card border border-line-subtle rounded-xl p-4">
          <div className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold mb-2 flex items-center gap-1.5">
            <Zap size={12} className="text-emerald-400" /> Money runway
          </div>
          {runway?.days != null ? (
            <>
              <div className="text-2xl font-bold text-white">
                <AnimatedNumber value={runway.days} format={v => Math.round(v)} />
                <span className="text-sm text-gray-500 font-normal ml-1">days</span>
              </div>
              <div className="text-[11px] text-gray-500 mt-1">
                {formatCurrency(Math.max(0, Math.round(runway.liquid)))} liquid ÷ {formatCurrency(Math.round(runway.dailyBurn))}/day burn
                {runway.days >= 30 && <span className="text-emerald-400"> · ~{Math.round(runway.days / 30)} months</span>}
              </div>
            </>
          ) : (
            <div className="text-sm text-gray-500">Add expenses to see how long your cash lasts</div>
          )}
        </motion.div>

        <motion.div variants={cardRise} className="glow-card bg-bg-card border border-line-subtle rounded-xl p-4">
          <div className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold mb-2 flex items-center gap-1.5">
            <Calendar size={12} className="text-violet-400" /> No-spend days
          </div>
          {noSpend ? (
            <>
              <div className="text-2xl font-bold text-white">
                {noSpend.zero}
                <span className="text-sm text-gray-500 font-normal ml-1">of {noSpend.total}</span>
              </div>
              <div className="text-[11px] text-gray-500 mt-1">
                {noSpend.streak > 0
                  ? <span className="soft-pulse text-violet-300 font-medium">{noSpend.streak}-day streak going 🔥</span>
                  : 'Spent something today'}
              </div>
            </>
          ) : (
            <div className="text-sm text-gray-500">No expense history yet</div>
          )}
        </motion.div>

        <motion.div variants={cardRise} className="glow-card bg-gradient-to-br from-violet-500/10 to-transparent border border-violet-500/25 rounded-xl p-4">
          <div className="text-[11px] uppercase tracking-wider text-violet-300 font-semibold mb-2">Spending personality</div>
          {personality ? (
            <>
              <div className="text-lg font-bold text-white flex items-center gap-2">
                <span className="text-2xl">{personality.emoji}</span> {personality.name}
              </div>
              <div className="text-[11px] text-gray-400 mt-1 leading-relaxed">{personality.blurb}</div>
            </>
          ) : (
            <div className="text-sm text-gray-500">Needs a few more transactions to read you</div>
          )}
        </motion.div>
      </motion.div>

      {/* Top movers vs previous period */}
      {topMovers && (topMovers.up || topMovers.down) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {topMovers.up && (
            <div className="bg-bg-card border border-rose-500/20 rounded-xl p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-rose-500/10 border border-rose-500/25 flex items-center justify-center flex-shrink-0">
                <TrendingUp size={16} className="text-rose-400" />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold">Biggest increase</div>
                <div className="text-sm text-white font-semibold truncate">
                  <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: topMovers.up.color }} />
                  {topMovers.up.name}
                  <span className="text-rose-400 ml-2">+{formatCurrency(Math.round(topMovers.up.delta))}</span>
                </div>
                <div className="text-[11px] text-gray-500">vs the previous {RANGES.find(r => r.id === range)?.label} period</div>
              </div>
            </div>
          )}
          {topMovers.down && (
            <div className="bg-bg-card border border-emerald-500/20 rounded-xl p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center flex-shrink-0">
                <TrendingDown size={16} className="text-emerald-400" />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold">Biggest cut</div>
                <div className="text-sm text-white font-semibold truncate">
                  <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: topMovers.down.color }} />
                  {topMovers.down.name}
                  <span className="text-emerald-400 ml-2">−{formatCurrency(Math.round(Math.abs(topMovers.down.delta)))}</span>
                </div>
                <div className="text-[11px] text-gray-500">vs the previous {RANGES.find(r => r.id === range)?.label} period</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Insights */}
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

      {/* Health score + savings trend */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {health && (
          <div className="bg-bg-card border border-line-subtle rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <Heart size={14} style={{ color: health.color }} /> Financial Health
            </h3>
            <div className="flex items-center gap-4 mb-4">
              {/* Gauge ring */}
              <div className="relative w-24 h-24 flex-shrink-0">
                <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="42" fill="none" stroke="#1c1c2e" strokeWidth="8" />
                  <circle cx="50" cy="50" r="42" fill="none" stroke={health.color} strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${(health.total / 100) * 264} 264`} />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold text-white">{health.total}</span>
                  <span className="text-[9px] uppercase tracking-wider text-gray-500">of 100</span>
                </div>
              </div>
              <div>
                <div className="text-lg font-bold" style={{ color: health.color }}>{health.label}</div>
                <div className="text-[11px] text-gray-500 mt-0.5">Based on savings, consistency and positive months</div>
              </div>
            </div>
            <div className="space-y-2.5">
              {health.factors.map(f => (
                <div key={f.name}>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-gray-400">{f.name}</span>
                    <span className="text-gray-500">{f.hint}</span>
                  </div>
                  <div className="h-1.5 bg-bg-elevated rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${(f.score / f.max) * 100}%`, backgroundColor: health.color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Savings rate trend */}
        <div className="lg:col-span-2 bg-bg-card border border-line-subtle rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Savings Rate by Month</h3>
          {savingsSeries.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-10">No data</p>
          ) : (
            <ResponsiveContainer width="100%" height={210}>
              <BarChart data={savingsSeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1c1c2e" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false}
                  tickFormatter={v => `${v}%`} width={38} />
                <Tooltip content={<ChartTooltip currency={false} />} formatter={v => `${v}%`} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                <ReferenceLine y={0} stroke="#374151" />
                <Bar dataKey="rate" name="Savings %" radius={[4, 4, 0, 0]}>
                  {savingsSeries.map((s, i) => (
                    <Cell key={i} fill={s.rate >= 20 ? '#10b981' : s.rate >= 0 ? '#8b5cf6' : '#f43f5e'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Cash flow forecast */}
      {cashFlowForecast && (
        <div className="bg-bg-card border border-line-subtle rounded-xl p-5">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Zap size={14} className="text-violet-400" /> Cash Flow Forecast
            </h3>
            <span className="text-xs text-gray-500">based on last {cashFlowForecast.monthsAnalyzed} months</span>
          </div>
          <p className="text-xs text-gray-500 mb-4">
            If patterns hold, you'll save{' '}
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
        </div>
      )}

      {/* Income vs Expenses trend */}
      <div className="bg-bg-card border border-line-subtle rounded-xl p-5">
        <h3 className="text-sm font-semibold text-white mb-4">Income vs Expenses</h3>
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

      {/* Income sources + weekday/weekend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-bg-card border border-line-subtle rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <ArrowUpRight size={14} className="text-emerald-400" /> Income Sources
          </h3>
          {incomeSources.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-10">No income recorded in this range</p>
          ) : (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="50%" height={160}>
                <PieChart>
                  <Pie data={incomeSources} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3} dataKey="value">
                    {incomeSources.map(e => <Cell key={e.id} fill={e.color} stroke="transparent" />)}
                  </Pie>
                  <Tooltip formatter={v => formatCurrency(v)}
                    contentStyle={{ background: '#1a1a2e', border: 'none', borderRadius: 8, fontSize: 12 }}
                    itemStyle={{ color: '#fff' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-1.5">
                {incomeSources.slice(0, 5).map(s => {
                  const pct = totals.income > 0 ? Math.round((s.value / totals.income) * 100) : 0
                  return (
                    <div key={s.id} className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-2 min-w-0">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                        <span className="text-gray-400 truncate">{s.name}</span>
                      </span>
                      <span className="text-gray-300 font-medium flex-shrink-0">{pct}%</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        <div className="bg-bg-card border border-line-subtle rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Calendar size={14} className="text-violet-400" /> Weekday vs Weekend
          </h3>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-bg-elevated rounded-lg p-3 border border-line-subtle">
              <div className="text-[11px] text-gray-500 mb-1">Weekdays</div>
              <div className="text-lg font-bold text-white">{formatCurrency(weekSplit.weekday)}</div>
              <div className="text-[11px] text-gray-500 mt-0.5">{formatCurrency(weekSplit.weekdayAvg)} avg / txn</div>
            </div>
            <div className="bg-bg-elevated rounded-lg p-3 border border-line-subtle">
              <div className="text-[11px] text-gray-500 mb-1">Weekends</div>
              <div className="text-lg font-bold text-white">{formatCurrency(weekSplit.weekend)}</div>
              <div className="text-[11px] text-gray-500 mt-0.5">{formatCurrency(weekSplit.weekendAvg)} avg / txn</div>
            </div>
          </div>
          <div className="flex h-3 rounded-full overflow-hidden">
            <div className="bg-violet-500" style={{ width: `${weekSplit.weekdayPct}%` }} title="Weekdays" />
            <div className="bg-amber-500" style={{ width: `${weekSplit.weekendPct}%` }} title="Weekends" />
          </div>
          <div className="flex justify-between text-[11px] text-gray-500 mt-1.5">
            <span>{weekSplit.weekdayPct}% weekdays</span>
            <span>{weekSplit.weekendPct}% weekends</span>
          </div>
        </div>
      </div>

      {/* Day of week + Category trends */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-2 bg-bg-card border border-line-subtle rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Spending by day</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={dayOfWeekData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1c1c2e" vertical={false} />
              <XAxis dataKey="day" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false}
                tickFormatter={v => formatCompact(v)} width={45} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
              <Bar dataKey="total" name="Spent" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="lg:col-span-3 bg-bg-card border border-line-subtle rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Category Trends</h3>
          {categoryTrend.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-6">Not enough data</p>
          ) : (
            <div className="space-y-2.5">
              {categoryTrend.map(c => (
                <div key={c.id} className="flex items-center gap-3">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: c.color }} />
                  <span className="text-sm text-gray-300 flex-1 truncate">{c.name}</span>
                  <span className="text-sm font-semibold text-gray-200">{formatCurrency(c.total)}</span>
                  {c.trend !== null && Math.abs(c.trend) > 5 && (
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

      {/* Detected subscriptions */}
      {detectedRecurring.length > 0 && (
        <div className="bg-bg-card border border-line-subtle rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Repeat size={14} className="text-cyan-400" /> Looks Recurring
            </h3>
            <span className="text-xs text-gray-500">{formatCurrency(recurringTotal)}/mo · {formatCurrency(recurringTotal * 12)}/yr</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
            {detectedRecurring.map(r => (
              <div key={r.name} className="flex items-center justify-between py-1.5 border-b border-line-subtle last:border-0">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm text-gray-200 truncate capitalize">{r.name}</span>
                  <span className="text-[10px] text-gray-600">{r.months} mo</span>
                </div>
                <span className="text-sm font-semibold text-cyan-300 flex-shrink-0">{formatCurrency(r.monthly)}/mo</span>
              </div>
            ))}
          </div>
        </div>
      )}

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
