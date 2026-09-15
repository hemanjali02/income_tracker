import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { PieChart, Pie, Cell, AreaChart, Area, BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts'
import {
  Plus, Plane, ChevronLeft, Pencil, Trash2, Calendar, MapPin, Wallet,
  TrendingUp, Gauge, CalendarDays, Tag, X, Sparkles,
  BarChart3, Award, Users, UserPlus, ArrowRight, TrendingDown, Check,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { useBilling } from '../context/BillingContext'
import {
  formatCurrency, formatCompact, formatDate, generateId,
  buildTripInsights, tripStatus, untaggedInTripWindow, computeSettlement,
} from '../utils/helpers'
import { gridStagger, cardRise } from '../utils/motion'
import { labelCls } from '../utils/styles'
import AnimatedNumber from './AnimatedNumber'
import AddTransactionModal from './AddTransactionModal'
import ConfirmDialog from './ConfirmDialog'
import ProBadge from './billing/ProBadge'
import Modal from './Modal'

const TRIP_COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#22d3ee', '#f43f5e', '#a78bfa']
const TRIP_EMOJIS = ['✈️', '🏖️', '🏔️', '🗺️', '🎒', '🏕️', '🚗', '🌴', '🎡', '🛺', '🚢', '🗼']

const STATUS_STYLE = {
  planned:   { label: 'Planned',   color: '#3b82f6' },
  active:    { label: 'Active',    color: '#10b981' },
  completed: { label: 'Completed', color: '#94a3b8' },
}

const inputCls = `w-full bg-bg-input border border-line-subtle rounded-lg px-3 py-2.5 text-sm text-white
  placeholder-gray-500 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-colors`

function daySpan(trip) {
  if (!trip.startDate || !trip.endDate) return null
  const d = Math.round((new Date(trip.endDate) - new Date(trip.startDate)) / 86400000) + 1
  return d > 0 ? d : null
}

function tripDateLabel(trip) {
  if (trip.startDate && trip.endDate) return `${formatDate(trip.startDate)} to ${formatDate(trip.endDate)}`
  if (trip.startDate) return `From ${formatDate(trip.startDate)}`
  return 'No dates set'
}

// ─── Create / edit modal ────────────────────────────────
function TripFormModal({ editTrip, onClose }) {
  const { addTrip, updateTrip } = useApp()
  const [name, setName] = useState(editTrip?.name || '')
  const [destination, setDestination] = useState(editTrip?.destination || '')
  const [emoji, setEmoji] = useState(editTrip?.emoji || '✈️')
  const [color, setColor] = useState(editTrip?.color || TRIP_COLORS[0])
  const [startDate, setStartDate] = useState(editTrip?.startDate || '')
  const [endDate, setEndDate] = useState(editTrip?.endDate || '')
  const [budget, setBudget] = useState(editTrip?.budget ? String(editTrip.budget) : '')
  const [error, setError] = useState('')

  function submit(e) {
    e.preventDefault()
    if (!name.trim()) return setError('Give your trip a name.')
    if (startDate && endDate && endDate < startDate) return setError('End date is before the start date.')
    const data = {
      name: name.trim(),
      destination: destination.trim(),
      emoji, color,
      startDate: startDate || '',
      endDate: endDate || '',
      budget: budget ? Number(budget) : 0,
    }
    if (editTrip) updateTrip(editTrip.id, data)
    else addTrip({ id: generateId(), createdAt: new Date().toISOString(), ...data })
    onClose()
  }

  return (
    <Modal onClose={onClose} title={editTrip ? 'Edit Trip' : 'New Trip'} icon={Plane} maxWidth="md">
      <form onSubmit={submit} className="px-5 sm:px-6 py-5 space-y-4">
        <div>
          <label className={labelCls}>Trip name</label>
          <input autoFocus className={inputCls} placeholder="e.g. Goa 2026" value={name} onChange={e => setName(e.target.value)} />
        </div>

        <div>
          <label className={labelCls}>Destination <span className="text-gray-600">(optional)</span></label>
          <input className={inputCls} placeholder="e.g. Goa, India" value={destination} onChange={e => setDestination(e.target.value)} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Start date</label>
            <input type="date" className={inputCls} value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>End date</label>
            <input type="date" className={inputCls} value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
        </div>

        <div>
          <label className={labelCls}>Budget (₹) <span className="text-gray-600">(optional)</span></label>
          <input type="number" min="0" className={inputCls} placeholder="e.g. 30000" value={budget} onChange={e => setBudget(e.target.value)} />
        </div>

        <div>
          <label className={labelCls}>Icon</label>
          <div className="flex flex-wrap gap-1.5">
            {TRIP_EMOJIS.map(em => (
              <button key={em} type="button" onClick={() => setEmoji(em)}
                className={`w-9 h-9 rounded-lg text-lg flex items-center justify-center transition-colors ${
                  emoji === em ? 'bg-violet-500/25 border border-violet-500/50' : 'bg-bg-input border border-line-subtle hover:border-line'
                }`}>
                {em}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className={labelCls}>Colour</label>
          <div className="flex flex-wrap gap-2">
            {TRIP_COLORS.map(c => (
              <button key={c} type="button" onClick={() => setColor(c)}
                className={`w-7 h-7 rounded-full transition-transform ${color === c ? 'ring-2 ring-offset-2 ring-offset-bg-card scale-110' : ''}`}
                style={{ backgroundColor: c, boxShadow: color === c ? `0 0 0 2px ${c}` : 'none' }} />
            ))}
          </div>
        </div>

        {error && <p className="text-rose-400 text-xs">{error}</p>}

        <button type="submit" className="btn-primary w-full py-2.5 text-white font-semibold rounded-lg text-sm">
          {editTrip ? 'Save Changes' : 'Create Trip'}
        </button>
      </form>
    </Modal>
  )
}

// ─── One card in the list ───────────────────────────────
function TripCard({ trip, transactions, onOpen }) {
  const insights = useMemo(() => buildTripInsights(trip, transactions), [trip, transactions])
  const status = STATUS_STYLE[insights.status]
  const span = daySpan(trip)

  return (
    <button onClick={() => onOpen(trip.id)}
      className="glow-card text-left w-full bg-bg-card border border-line-subtle rounded-xl p-5 hover:border-violet-500/40">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
            style={{ backgroundColor: trip.color + '22', border: `1px solid ${trip.color}40` }}>
            {trip.emoji || '✈️'}
          </span>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-white truncate">{trip.name}</div>
            <div className="text-xs text-gray-500 truncate flex items-center gap-1">
              {trip.destination && <><MapPin size={10} /> {trip.destination}</>}
            </div>
          </div>
        </div>
        <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded flex-shrink-0"
          style={{ color: status.color, backgroundColor: status.color + '18', border: `1px solid ${status.color}30` }}>
          {status.label}
        </span>
      </div>

      <div className="flex items-end justify-between">
        <div>
          <div className="text-xl font-bold text-white">{formatCurrency(insights.totalSpent)}</div>
          <div className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5">
            <CalendarDays size={10} /> {tripDateLabel(trip)}
          </div>
        </div>
        <div className="text-right text-[11px] text-gray-500">
          <div>{insights.count} txn{insights.count !== 1 ? 's' : ''}</div>
          {span && <div>{formatCompact(insights.perDay)}/day</div>}
        </div>
      </div>

      {trip.budget > 0 && (
        <div className="mt-3">
          <div className="h-1.5 bg-bg-elevated rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all"
              style={{ width: `${Math.min(100, insights.pct)}%`, backgroundColor: insights.totalSpent > trip.budget ? '#f43f5e' : trip.color }} />
          </div>
          <div className="flex justify-between text-[10px] text-gray-500 mt-1">
            <span>{Math.round(insights.pct)}% of {formatCompact(trip.budget)}</span>
            <span>{insights.remaining >= 0 ? `${formatCompact(insights.remaining)} left` : `${formatCompact(-insights.remaining)} over`}</span>
          </div>
        </div>
      )}
    </button>
  )
}

function KpiCard({ label, value, sub, icon: Icon, color, valueColor }) {
  return (
    <div className="glow-card bg-bg-card border border-line-subtle rounded-xl p-4">
      <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3"
        style={{ backgroundColor: color + '18', border: `1px solid ${color}20` }}>
        <Icon size={16} style={{ color }} />
      </div>
      <div className={`text-lg font-bold ${valueColor || 'text-white'}`}>{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
      {sub && <div className="text-[11px] text-gray-600 mt-0.5">{sub}</div>}
    </div>
  )
}

// ─── Report card (Pro) ──────────────────────────────────
function ReportStat({ label, value }) {
  return (
    <div className="bg-bg-card border border-line-subtle rounded-xl px-3 py-2.5">
      <div className="text-sm font-bold text-white truncate">{value}</div>
      <div className="text-[11px] text-gray-500">{label}</div>
    </div>
  )
}

function TripReportCard({ trip, insights, categories, onClose }) {
  const topCat = useMemo(() => {
    const entries = Object.entries(insights.byCat)
    if (!entries.length) return null
    const [cid, value] = entries.sort((a, b) => b[1] - a[1])[0]
    const c = categories.find(x => x.id === cid)
    return { name: c?.name || 'Uncategorised', icon: c?.icon || '📦', value }
  }, [insights.byCat, categories])

  const cheapestDay = insights.byDay.length
    ? insights.byDay.reduce((m, d) => (d.amount < m.amount ? d : m), insights.byDay[0])
    : null
  const underBudget = trip.budget > 0 && insights.totalSpent <= trip.budget
  const budgetLine = trip.budget > 0
    ? (underBudget
        ? `Under budget by ${formatCompact(trip.budget - insights.totalSpent)}`
        : `Over budget by ${formatCompact(insights.totalSpent - trip.budget)}`)
    : null

  return (
    <Modal onClose={onClose} hideHeader maxWidth="sm">
      <div>
        <div className="relative px-6 pt-7 pb-6 text-center"
          style={{ background: `linear-gradient(160deg, ${trip.color}33, transparent 72%)` }}>
          <div className="text-4xl mb-2">{trip.emoji || '✈️'}</div>
          <div className="text-lg font-bold text-white">{trip.name}</div>
          <div className="text-xs text-gray-400 mt-0.5">
            {tripDateLabel(trip)}{trip.destination ? ` · ${trip.destination}` : ''}
          </div>
          <div className="mt-4">
            <div className="text-3xl font-extrabold gradient-text">{formatCurrency(insights.totalSpent)}</div>
            <div className="text-[11px] uppercase tracking-wider text-gray-500 mt-1">Total spent</div>
          </div>
        </div>

        <div className="px-6 grid grid-cols-2 gap-3">
          <ReportStat label="Per day" value={formatCompact(insights.perDay)} />
          <ReportStat label="Duration" value={`${insights.totalDays} day${insights.totalDays !== 1 ? 's' : ''}`} />
          <ReportStat label="Transactions" value={String(insights.count)} />
          <ReportStat label="Top category" value={topCat ? `${topCat.icon} ${topCat.name}` : '—'} />
          {insights.biggestDay && <ReportStat label="Biggest day" value={`${formatCompact(insights.biggestDay.amount)} · ${formatDate(insights.biggestDay.date)}`} />}
          {cheapestDay && <ReportStat label="Lightest day" value={`${formatCompact(cheapestDay.amount)} · ${formatDate(cheapestDay.date)}`} />}
        </div>

        {budgetLine && (
          <div className="px-6 pt-3">
            <div className={`text-center text-sm font-semibold rounded-lg py-2 ${underBudget ? 'text-emerald-300 bg-emerald-500/10' : 'text-rose-300 bg-rose-500/10'}`}>
              {budgetLine}
            </div>
          </div>
        )}

        <div className="px-6 py-5">
          <p className="text-[11px] text-gray-600 text-center mb-3">Screenshot to share your trip summary</p>
          <button onClick={onClose} className="btn-primary w-full py-2.5 text-white text-sm font-semibold rounded-lg">Done</button>
        </div>
      </div>
    </Modal>
  )
}

// ─── Group settle-up (Pro) ──────────────────────────────
function TripSettleUp({ trip }) {
  const { updateTrip } = useApp()
  const members = trip.members?.length ? trip.members : [{ id: 'me', name: 'You' }]
  const expenses = trip.splitExpenses || []

  const [newMember, setNewMember] = useState('')
  const [label, setLabel] = useState('')
  const [amount, setAmount] = useState('')
  const [paidBy, setPaidBy] = useState(members[0]?.id || 'me')
  const [sharedBy, setSharedBy] = useState(members.map(m => m.id))

  const settlement = useMemo(() => computeSettlement(members, expenses), [members, expenses])
  const nameOf = (id) => members.find(m => m.id === id)?.name || '?'

  function persist(patch) { updateTrip(trip.id, patch) }

  function addMember() {
    const name = newMember.trim()
    if (!name) return
    const m = { id: generateId(), name }
    persist({ members: [...members, m] })
    setSharedBy(prev => [...prev, m.id])
    setNewMember('')
  }
  function removeMember(id) {
    if (members.length <= 1) return
    persist({
      members: members.filter(m => m.id !== id),
      splitExpenses: expenses
        .filter(e => e.paidBy !== id)
        .map(e => ({ ...e, sharedBy: (e.sharedBy || []).filter(x => x !== id) })),
    })
    setSharedBy(prev => prev.filter(x => x !== id))
    if (paidBy === id) setPaidBy(members[0]?.id)
  }
  function addExpense() {
    const amt = Number(amount)
    if (!label.trim() || !amt || amt <= 0 || !sharedBy.length) return
    const e = { id: generateId(), label: label.trim(), amount: amt, paidBy, sharedBy: [...sharedBy], date: new Date().toISOString().slice(0, 10) }
    persist({ splitExpenses: [...expenses, e] })
    setLabel(''); setAmount('')
  }
  function removeExpense(id) { persist({ splitExpenses: expenses.filter(e => e.id !== id) }) }
  function toggleShared(id) { setSharedBy(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]) }

  const chipCls = 'inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full text-xs bg-bg-elevated border border-line-subtle text-gray-200'

  return (
    <div className="bg-bg-card border border-line-subtle rounded-xl p-5 space-y-5">
      <div className="flex items-center gap-2">
        <Users size={16} className="text-violet-400" />
        <h3 className="text-sm font-semibold text-white">Group & settle up</h3>
        <ProBadge size="xs" />
      </div>

      {/* Members */}
      <div>
        <div className="text-xs text-gray-500 mb-2">Who is on this trip?</div>
        <div className="flex flex-wrap gap-2 mb-2">
          {members.map(m => (
            <span key={m.id} className={chipCls}>
              {m.name}
              {members.length > 1 && (
                <button onClick={() => removeMember(m.id)} className="text-gray-500 hover:text-rose-400 transition-colors">
                  <X size={12} />
                </button>
              )}
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input className="flex-1 bg-bg-input border border-line-subtle rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-violet-500"
            placeholder="Add a person" value={newMember}
            onChange={e => setNewMember(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addMember() } }} />
          <button onClick={addMember} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-violet-500/15 border border-violet-500/30 text-violet-300 text-xs font-medium hover:bg-violet-500/25 transition-colors">
            <UserPlus size={13} /> Add
          </button>
        </div>
      </div>

      {/* Add shared expense */}
      <div className="p-3 bg-bg-elevated/40 rounded-lg border border-line-subtle space-y-2.5">
        <div className="text-xs font-semibold text-gray-300">Add a shared expense</div>
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <input className="bg-bg-input border border-line-subtle rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-violet-500"
            placeholder="What was it? e.g. Dinner" value={label} onChange={e => setLabel(e.target.value)} />
          <input type="number" min="0" className="w-24 bg-bg-input border border-line-subtle rounded-lg px-3 py-1.5 text-xs text-white text-right focus:outline-none focus:border-violet-500"
            placeholder="₹0" value={amount} onChange={e => setAmount(e.target.value)} />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-gray-500">Paid by</span>
          <select value={paidBy} onChange={e => setPaidBy(e.target.value)}
            className="bg-bg-input border border-line-subtle rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-violet-500">
            {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>
        <div>
          <div className="text-[11px] text-gray-500 mb-1.5">Split between</div>
          <div className="flex flex-wrap gap-1.5">
            {members.map(m => {
              const on = sharedBy.includes(m.id)
              return (
                <button key={m.id} type="button" onClick={() => toggleShared(m.id)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs transition-colors ${
                    on ? 'bg-violet-500/20 text-violet-200 border border-violet-500/40' : 'bg-bg-input text-gray-500 border border-line-subtle'
                  }`}>
                  {on && <Check size={11} />} {m.name}
                </button>
              )
            })}
          </div>
        </div>
        <button onClick={addExpense}
          className="w-full py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold transition-colors">
          Add expense
        </button>
      </div>

      {/* Ledger */}
      {expenses.length > 0 && (
        <div className="space-y-1.5">
          {expenses.map(e => (
            <div key={e.id} className="flex items-center gap-2 text-xs group">
              <div className="flex-1 min-w-0">
                <span className="text-gray-200">{e.label}</span>
                <span className="text-gray-600"> · {nameOf(e.paidBy)} paid, split {(e.sharedBy || []).length} way{(e.sharedBy || []).length !== 1 ? 's' : ''}</span>
              </div>
              <span className="text-gray-200 font-medium">{formatCurrency(e.amount)}</span>
              <button onClick={() => removeExpense(e.id)} className="text-gray-600 hover:text-rose-400 transition-colors sm:opacity-0 sm:group-hover:opacity-100">
                <X size={13} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Settlement */}
      {settlement.totalShared > 0 && (
        <div className="pt-4 border-t border-line-subtle space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {settlement.balances.map(b => (
              <div key={b.id} className="bg-bg-elevated/50 rounded-lg px-3 py-2">
                <div className="text-xs text-gray-400 truncate">{b.name}</div>
                <div className={`text-sm font-bold ${b.net > 0.01 ? 'text-emerald-400' : b.net < -0.01 ? 'text-rose-400' : 'text-gray-400'}`}>
                  {b.net > 0.01 ? `gets ${formatCompact(b.net)}` : b.net < -0.01 ? `owes ${formatCompact(-b.net)}` : 'settled'}
                </div>
              </div>
            ))}
          </div>
          {settlement.transfers.length > 0 ? (
            <div className="space-y-1.5">
              <div className="text-xs font-semibold text-gray-300">Settle up</div>
              {settlement.transfers.map((t, i) => (
                <div key={i} className="flex items-center gap-2 text-sm bg-violet-500/5 border border-violet-500/15 rounded-lg px-3 py-2">
                  <span className="text-rose-300 font-medium">{t.fromName}</span>
                  <ArrowRight size={13} className="text-gray-500" />
                  <span className="text-emerald-300 font-medium">{t.toName}</span>
                  <span className="ml-auto text-white font-bold">{formatCurrency(t.amount)}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-sm text-emerald-400 py-2">Everyone is settled up 🎉</div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Trip comparison (Pro) ──────────────────────────────
function TripCompare({ trips, transactions, categories, onBack }) {
  const rows = useMemo(
    () => trips.map(t => ({ trip: t, ins: buildTripInsights(t, transactions) })),
    [trips, transactions]
  )
  const chartData = rows.map(r => ({ name: r.trip.name, perDay: Math.round(r.ins.perDay), total: Math.round(r.ins.totalSpent), color: r.trip.color }))
  const topCatOf = (ins) => {
    const e = Object.entries(ins.byCat).sort((a, b) => b[1] - a[1])[0]
    if (!e) return '—'
    const c = categories.find(x => x.id === e[0])
    return c ? `${c.icon} ${c.name}` : '—'
  }
  const withData = rows.filter(r => r.ins.totalDays > 0 && r.ins.totalSpent > 0)
  const priciest = withData.reduce((m, r) => (!m || r.ins.perDay > m.ins.perDay ? r : m), null)
  const cheapest = withData.reduce((m, r) => (!m || r.ins.perDay < m.ins.perDay ? r : m), null)

  return (
    <div className="space-y-6 animate-in">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-lg bg-bg-card border border-line-subtle text-gray-400 hover:text-white transition-colors">
          <ChevronLeft size={16} />
        </button>
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">Compare trips <ProBadge size="xs" /></h2>
          <p className="text-sm text-gray-500 mt-0.5">Cost per day is the fairest way to compare trips of different lengths</p>
        </div>
      </div>

      {/* Highlights */}
      {priciest && cheapest && priciest.trip.id !== cheapest.trip.id && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="glow-card bg-bg-card border border-line-subtle rounded-xl p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-rose-500/15 border border-rose-500/25 flex items-center justify-center flex-shrink-0">
              <TrendingUp size={16} className="text-rose-400" />
            </div>
            <div className="min-w-0">
              <div className="text-xs text-gray-500">Priciest per day</div>
              <div className="text-sm font-semibold text-white truncate">{priciest.trip.emoji} {priciest.trip.name}</div>
            </div>
            <div className="ml-auto text-sm font-bold text-rose-300">{formatCompact(priciest.ins.perDay)}</div>
          </div>
          <div className="glow-card bg-bg-card border border-line-subtle rounded-xl p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center flex-shrink-0">
              <TrendingDown size={16} className="text-emerald-400" />
            </div>
            <div className="min-w-0">
              <div className="text-xs text-gray-500">Best value per day</div>
              <div className="text-sm font-semibold text-white truncate">{cheapest.trip.emoji} {cheapest.trip.name}</div>
            </div>
            <div className="ml-auto text-sm font-bold text-emerald-300">{formatCompact(cheapest.ins.perDay)}</div>
          </div>
        </div>
      )}

      {/* Per-day bar chart */}
      <div className="bg-bg-card border border-line-subtle rounded-xl p-5">
        <h3 className="text-sm font-semibold text-white mb-4">Cost per day</h3>
        <ResponsiveContainer width="100%" height={Math.max(160, rows.length * 44)}>
          <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 12, left: 0, bottom: 0 }}>
            <XAxis type="number" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={v => formatCompact(v)} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={90} />
            <Tooltip formatter={v => [`₹${Number(v).toLocaleString('en-IN')}`, 'Per day']} cursor={{ fill: 'rgba(255,255,255,0.03)' }}
              contentStyle={{ background: '#1a1a2e', border: 'none', borderRadius: 8, fontSize: 12 }} itemStyle={{ color: '#fff' }} />
            <Bar dataKey="perDay" radius={[0, 6, 6, 0]}>
              {chartData.map((d, i) => <Cell key={i} fill={d.color || '#8b5cf6'} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Table */}
      <div className="bg-bg-card border border-line-subtle rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line bg-bg-elevated/40 text-[11px] uppercase tracking-wider text-gray-500">
                <th className="text-left font-semibold px-4 py-3">Trip</th>
                <th className="text-right font-semibold px-4 py-3">Days</th>
                <th className="text-right font-semibold px-4 py-3">Total</th>
                <th className="text-right font-semibold px-4 py-3">Per day</th>
                <th className="text-left font-semibold px-4 py-3 hidden sm:table-cell">Top category</th>
                <th className="text-right font-semibold px-4 py-3 hidden sm:table-cell">Budget</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ trip, ins }) => (
                <tr key={trip.id} className="border-b border-line-subtle last:border-0">
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-2 text-white font-medium">
                      <span>{trip.emoji || '✈️'}</span> <span className="truncate">{trip.name}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-400">{ins.totalDays}</td>
                  <td className="px-4 py-3 text-right text-white font-semibold">{formatCompact(ins.totalSpent)}</td>
                  <td className="px-4 py-3 text-right text-violet-300 font-semibold">{formatCompact(ins.perDay)}</td>
                  <td className="px-4 py-3 text-left text-gray-400 hidden sm:table-cell">{topCatOf(ins)}</td>
                  <td className="px-4 py-3 text-right hidden sm:table-cell">
                    {trip.budget > 0
                      ? <span className={ins.totalSpent <= trip.budget ? 'text-emerald-400' : 'text-rose-400'}>
                          {ins.totalSpent <= trip.budget ? 'under' : 'over'}
                        </span>
                      : <span className="text-gray-600">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ─── Trip detail with insights ──────────────────────────
function TripDetail({ trip, onBack }) {
  const { transactions, categories, accounts, deleteTrip, assignTransactionsToTrip } = useApp()
  const { can, promptUpgrade } = useBilling()
  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [adding, setAdding] = useState(false)
  const [showReport, setShowReport] = useState(false)

  const insights = useMemo(() => buildTripInsights(trip, transactions), [trip, transactions])
  const untagged = useMemo(() => untaggedInTripWindow(trip, transactions), [trip, transactions])
  const status = STATUS_STYLE[insights.status]

  const tripTxns = useMemo(
    () => transactions.filter(t => t.tripId === trip.id).sort((a, b) => b.date.localeCompare(a.date)),
    [transactions, trip.id]
  )

  const catData = useMemo(() => {
    return Object.entries(insights.byCat).map(([cid, value]) => {
      const c = categories.find(x => x.id === cid)
      return { id: cid, name: c?.name || 'Uncategorised', value, color: c?.color || '#64748b', icon: c?.icon || '📦' }
    }).sort((a, b) => b.value - a.value)
  }, [insights.byCat, categories])

  const dayData = useMemo(
    () => insights.byDay.map(d => ({ ...d, label: formatDate(d.date) })),
    [insights.byDay]
  )

  return (
    <div className="space-y-6 animate-in">
      {editing && <TripFormModal editTrip={trip} onClose={() => setEditing(false)} />}
      {adding && <AddTransactionModal defaultTripId={trip.id} onClose={() => setAdding(false)} />}
      {showReport && <TripReportCard trip={trip} insights={insights} categories={categories} onClose={() => setShowReport(false)} />}
      {confirmDelete && (
        <ConfirmDialog title="Delete Trip"
          message="This removes the trip. The transactions stay in your history, just untagged."
          onConfirm={() => { deleteTrip(trip.id); onBack() }}
          onCancel={() => setConfirmDelete(false)} />
      )}

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={onBack} className="p-2 rounded-lg bg-bg-card border border-line-subtle text-gray-400 hover:text-white transition-colors">
            <ChevronLeft size={16} />
          </button>
          <span className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
            style={{ backgroundColor: trip.color + '22', border: `1px solid ${trip.color}40` }}>
            {trip.emoji || '✈️'}
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white truncate">{trip.name}</h2>
              <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded flex-shrink-0"
                style={{ color: status.color, backgroundColor: status.color + '18', border: `1px solid ${status.color}30` }}>
                {status.label}
              </span>
            </div>
            <div className="text-xs text-gray-500 flex items-center gap-2 mt-0.5 flex-wrap">
              <span className="flex items-center gap-1"><Calendar size={11} /> {tripDateLabel(trip)}</span>
              {trip.destination && <span className="flex items-center gap-1"><MapPin size={11} /> {trip.destination}</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setAdding(true)} className="btn-primary flex items-center gap-1.5 px-3 py-2 text-white text-sm font-medium rounded-lg">
            <Plus size={14} /> Add expense
          </button>
          <button
            onClick={() => can('tripReport') ? setShowReport(true) : promptUpgrade('tripReport')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-bg-card border border-line-subtle text-gray-300 hover:text-violet-300 hover:border-violet-500/30 text-sm transition-colors"
            title="Trip report card">
            <Award size={15} /> <span className="hidden sm:inline">Report</span>
            {!can('tripReport') && <ProBadge size="xs" />}
          </button>
          <button onClick={() => setEditing(true)} className="p-2 rounded-lg bg-bg-card border border-line-subtle text-gray-400 hover:text-violet-300 transition-colors">
            <Pencil size={15} />
          </button>
          <button onClick={() => setConfirmDelete(true)} className="p-2 rounded-lg bg-bg-card border border-line-subtle text-gray-400 hover:text-rose-400 transition-colors">
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {/* Untagged suggestion */}
      {untagged.length > 0 && (
        <button onClick={() => assignTransactionsToTrip(untagged.map(t => t.id), trip.id)}
          className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-dashed border-violet-500/40 bg-violet-500/5 hover:bg-violet-500/10 transition-colors text-left">
          <span className="flex items-center gap-2 text-sm text-violet-200">
            <Sparkles size={15} className="text-violet-400" />
            {untagged.length} transaction{untagged.length !== 1 ? 's' : ''} during these dates {untagged.length !== 1 ? 'are' : 'is'} not in this trip yet.
          </span>
          <span className="flex items-center gap-1 text-xs font-semibold text-violet-300 flex-shrink-0">
            <Tag size={12} /> Add all
          </span>
        </button>
      )}

      {/* KPIs */}
      <motion.div variants={gridStagger} initial="hidden" animate="show" className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <motion.div variants={cardRise}>
          <KpiCard label="Total spent" icon={Wallet} color="#8b5cf6"
            value={<AnimatedNumber value={insights.totalSpent} format={formatCurrency} />}
            sub={insights.totalIncome > 0 ? `${formatCompact(insights.totalIncome)} income here` : null} />
        </motion.div>
        <motion.div variants={cardRise}>
          <KpiCard label="Per day" icon={CalendarDays} color="#3b82f6"
            value={<AnimatedNumber value={insights.perDay} format={formatCompact} />}
            sub={`over ${insights.elapsedDays} day${insights.elapsedDays !== 1 ? 's' : ''}`} />
        </motion.div>
        {trip.budget > 0 ? (
          <motion.div variants={cardRise}>
            <KpiCard label={insights.remaining >= 0 ? 'Budget left' : 'Over budget'} icon={Gauge}
              color={insights.remaining >= 0 ? '#10b981' : '#f43f5e'}
              valueColor={insights.remaining >= 0 ? 'text-emerald-400' : 'text-rose-400'}
              value={<AnimatedNumber value={Math.abs(insights.remaining)} format={formatCompact} />}
              sub={`of ${formatCompact(trip.budget)} budget`} />
          </motion.div>
        ) : (
          <motion.div variants={cardRise}>
            <KpiCard label="Biggest day" icon={TrendingUp} color="#f59e0b"
              value={insights.biggestDay ? formatCompact(insights.biggestDay.amount) : '—'}
              sub={insights.biggestDay ? formatDate(insights.biggestDay.date) : 'No spend yet'} />
          </motion.div>
        )}
        <motion.div variants={cardRise}>
          <KpiCard label={insights.status === 'active' && insights.projectedTotal > insights.totalSpent ? 'Projected total' : 'Transactions'}
            icon={insights.status === 'active' && insights.projectedTotal > insights.totalSpent ? Gauge : Tag}
            color="#a78bfa"
            value={insights.status === 'active' && insights.projectedTotal > insights.totalSpent
              ? formatCompact(insights.projectedTotal)
              : String(insights.count)}
            valueColor={insights.projectedOver ? 'text-rose-400' : 'text-white'}
            sub={insights.status === 'active' && insights.projectedTotal > insights.totalSpent
              ? 'at current pace'
              : `${insights.count} tagged`} />
        </motion.div>
      </motion.div>

      {/* Budget bar */}
      {trip.budget > 0 && (
        <div className="glow-card bg-bg-card border border-line-subtle rounded-xl p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-white">Budget</span>
            <span className={`text-sm font-bold ${insights.totalSpent > trip.budget ? 'text-rose-400' : 'text-emerald-400'}`}>
              {formatCurrency(insights.totalSpent)} <span className="text-gray-500 font-normal">/ {formatCurrency(trip.budget)}</span>
            </span>
          </div>
          <div className="h-3 bg-bg-elevated rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, insights.pct)}%`, backgroundColor: insights.totalSpent > trip.budget ? '#f43f5e' : insights.pct > 80 ? '#f59e0b' : '#10b981' }} />
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1.5">
            <span>{Math.round(insights.pct)}% used</span>
            {insights.projectedOver
              ? <span className="text-rose-400">Projected {formatCompact(insights.projectedTotal)} at this pace</span>
              : <span>{formatCurrency(Math.max(0, insights.remaining))} remaining</span>}
          </div>
        </div>
      )}

      {insights.count === 0 ? (
        <div className="bg-bg-card border border-line-subtle rounded-xl p-10 text-center">
          <div className="w-14 h-14 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mx-auto mb-3">
            <Plane size={24} className="text-violet-400" />
          </div>
          <h3 className="text-white font-semibold mb-1">No expenses tagged yet</h3>
          <p className="text-sm text-gray-500 mb-4 max-w-sm mx-auto">
            Add an expense here, or tag existing transactions to this trip from the Transactions page.
          </p>
          <button onClick={() => setAdding(true)} className="btn-primary px-4 py-2 text-white text-sm font-semibold rounded-lg">
            Add first expense
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* Category donut */}
          <div className="lg:col-span-2 bg-bg-card border border-line-subtle rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Where it went</h3>
            <ResponsiveContainer width="100%" height={170}>
              <PieChart>
                <Pie data={catData} cx="50%" cy="50%" innerRadius={48} outerRadius={72} paddingAngle={3} dataKey="value">
                  {catData.map(e => <Cell key={e.id} fill={e.color} stroke="transparent" />)}
                </Pie>
                <Tooltip formatter={v => [`₹${Number(v).toLocaleString('en-IN')}`, '']}
                  contentStyle={{ background: '#1a1a2e', border: 'none', borderRadius: 8, fontSize: 12 }}
                  itemStyle={{ color: '#fff' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-1.5 mt-3">
              {catData.slice(0, 6).map(c => (
                <div key={c.id} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: c.color }} />
                    <span className="text-gray-400 truncate">{c.icon} {c.name}</span>
                  </div>
                  <span className="text-gray-300 font-medium flex-shrink-0">
                    {formatCompact(c.value)} <span className="text-gray-600">· {Math.round((c.value / insights.totalSpent) * 100)}%</span>
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Spending by day */}
          <div className="lg:col-span-3 bg-bg-card border border-line-subtle rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Daily spend</h3>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={dayData} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="tripDay" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={trip.color} stopOpacity={0.5} />
                    <stop offset="100%" stopColor={trip.color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={v => formatCompact(v)} width={48} />
                <Tooltip formatter={v => [`₹${Number(v).toLocaleString('en-IN')}`, 'Spent']}
                  contentStyle={{ background: '#1a1a2e', border: 'none', borderRadius: 8, fontSize: 12 }}
                  itemStyle={{ color: '#fff' }} labelStyle={{ color: '#94a3b8' }} />
                <Area type="monotone" dataKey="amount" stroke={trip.color} strokeWidth={2} fill="url(#tripDay)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Trip transactions */}
      {tripTxns.length > 0 && (
        <div className="bg-bg-card border border-line-subtle rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-line-subtle flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Trip transactions</h3>
            <span className="text-xs text-gray-500">{tripTxns.length}</span>
          </div>
          <div className="divide-y divide-line-subtle">
            {tripTxns.map(tx => {
              const cat = categories.find(c => c.id === tx.categoryId)
              const acc = accounts.find(a => a.id === tx.accountId)
              return (
                <div key={tx.id} className="px-4 py-3 flex items-center gap-3 hover:bg-white/[0.02] transition-colors group">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white truncate">{tx.name}</div>
                    <div className="text-[11px] text-gray-500 flex items-center gap-1.5 mt-0.5">
                      {cat && <span style={{ color: cat.color }}>{cat.icon} {cat.name}</span>}
                      {acc && <span className="text-gray-600">· {acc.name}</span>}
                      <span className="text-gray-600">· {formatDate(tx.date)}</span>
                    </div>
                  </div>
                  <span className={`text-sm font-semibold ${tx.type === 'income' ? 'text-emerald-400' : 'text-gray-100'}`}>
                    {tx.type === 'income' ? '+' : ''}{formatCurrency(tx.amount)}
                  </span>
                  <button onClick={() => assignTransactionsToTrip([tx.id], null)}
                    title="Remove from trip"
                    className="p-1.5 rounded-md text-gray-600 hover:text-rose-400 hover:bg-rose-500/10 transition-colors sm:opacity-0 sm:group-hover:opacity-100">
                    <X size={14} />
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Group settle-up (Pro) */}
      {can('tripSettle') ? (
        <TripSettleUp trip={trip} />
      ) : (
        <button onClick={() => promptUpgrade('tripSettle')}
          className="w-full glow-card bg-bg-card border border-line-subtle rounded-xl p-5 text-left hover:border-violet-500/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center flex-shrink-0">
              <Users size={18} className="text-violet-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-white">Group & settle up</span>
                <ProBadge size="xs" />
              </div>
              <p className="text-xs text-gray-500 mt-0.5">Travelling with friends? Split trip costs and see exactly who owes whom.</p>
            </div>
            <span className="text-xs font-semibold text-violet-300 flex-shrink-0">Unlock</span>
          </div>
        </button>
      )}
    </div>
  )
}

// ─── Root ───────────────────────────────────────────────
export default function Trips() {
  const { trips, transactions, categories } = useApp()
  const { can, promptUpgrade } = useBilling()
  const [selectedId, setSelectedId] = useState(null)
  const [creating, setCreating] = useState(false)
  const [comparing, setComparing] = useState(false)

  const selectedTrip = trips.find(t => t.id === selectedId)

  const sortedTrips = useMemo(() => {
    const rank = { active: 0, planned: 1, completed: 2 }
    return [...trips].sort((a, b) => {
      const ra = rank[tripStatus(a)], rb = rank[tripStatus(b)]
      if (ra !== rb) return ra - rb
      return (b.startDate || '').localeCompare(a.startDate || '')
    })
  }, [trips])

  if (selectedTrip) {
    return <TripDetail trip={selectedTrip} onBack={() => setSelectedId(null)} />
  }

  if (comparing) {
    return <TripCompare trips={sortedTrips} transactions={transactions} categories={categories} onBack={() => setComparing(false)} />
  }

  return (
    <div className="space-y-6 animate-in">
      {creating && <TripFormModal onClose={() => setCreating(false)} />}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white">Trips</h2>
          <p className="text-sm text-gray-500 mt-0.5">Group your spending by trip and see where it went</p>
        </div>
        <div className="flex items-center gap-2">
          {trips.length >= 2 && (
            <button
              onClick={() => can('tripCompare') ? setComparing(true) : promptUpgrade('tripCompare')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-bg-card border border-line-subtle text-gray-300 hover:text-violet-300 hover:border-violet-500/30 text-sm font-medium transition-colors">
              <BarChart3 size={15} /> Compare
              {!can('tripCompare') && <ProBadge size="xs" />}
            </button>
          )}
          <button onClick={() => setCreating(true)} className="btn-primary flex items-center gap-2 px-4 py-2 text-white text-sm font-medium rounded-lg">
            <Plus size={15} /> New Trip
          </button>
        </div>
      </div>

      {trips.length === 0 ? (
        <div className="bg-bg-card border border-line-subtle rounded-2xl p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mx-auto mb-4">
            <Plane size={28} className="text-violet-400" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">Plan your first trip</h3>
          <p className="text-sm text-gray-500 mb-5 max-w-sm mx-auto">
            Create a trip, then tag transactions to it. You will get spending insights, a daily breakdown, and budget tracking for the whole trip.
          </p>
          <button onClick={() => setCreating(true)} className="btn-primary px-5 py-2.5 text-white text-sm font-semibold rounded-lg">
            Create a trip
          </button>
        </div>
      ) : (
        <motion.div variants={gridStagger} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedTrips.map(trip => (
            <motion.div key={trip.id} variants={cardRise}>
              <TripCard trip={trip} transactions={transactions} onOpen={setSelectedId} />
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  )
}
