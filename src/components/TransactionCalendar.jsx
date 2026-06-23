import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, ArrowUpRight, ArrowDownRight, ArrowLeftRight } from 'lucide-react'
import { formatCurrency, formatCompact, formatDateFull } from '../utils/helpers'
import Modal from './Modal'

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function getMonthGrid(year, monthIdx) {
  const firstDay = new Date(year, monthIdx, 1)
  const startWeekday = firstDay.getDay() // 0=Sun
  const daysInMonth = new Date(year, monthIdx + 1, 0).getDate()

  const cells = []
  // Leading empty cells
  for (let i = 0; i < startWeekday; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  // Trailing empty cells to fill last week
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

export default function TransactionCalendar({ transactions, categories, accounts, onEdit }) {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [monthIdx, setMonthIdx] = useState(today.getMonth())
  const [selectedDate, setSelectedDate] = useState(null)

  // Aggregate per day: spend + income + count
  const perDay = useMemo(() => {
    const map = {}
    const prefix = `${year}-${String(monthIdx + 1).padStart(2, '0')}-`
    for (const tx of transactions) {
      if (!tx.date.startsWith(prefix)) continue
      const day = parseInt(tx.date.slice(8, 10), 10)
      if (!map[day]) map[day] = { expense: 0, income: 0, count: 0, txs: [] }
      if (tx.type === 'expense') map[day].expense += tx.amount
      else if (tx.type === 'income') map[day].income += tx.amount
      map[day].count += 1
      map[day].txs.push(tx)
    }
    return map
  }, [transactions, year, monthIdx])

  // Compute max expense for heat-map scaling
  const maxExpense = useMemo(() => {
    let max = 0
    for (const day of Object.values(perDay)) if (day.expense > max) max = day.expense
    return max || 1
  }, [perDay])

  const cells = useMemo(() => getMonthGrid(year, monthIdx), [year, monthIdx])
  const monthLabel = new Date(year, monthIdx, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })

  // Totals for month
  const totalExpense = Object.values(perDay).reduce((s, d) => s + d.expense, 0)
  const totalIncome = Object.values(perDay).reduce((s, d) => s + d.income, 0)
  const totalCount = Object.values(perDay).reduce((s, d) => s + d.count, 0)

  function shift(dir) {
    const nm = monthIdx + dir
    if (nm < 0) { setMonthIdx(11); setYear(y => y - 1) }
    else if (nm > 11) { setMonthIdx(0); setYear(y => y + 1) }
    else setMonthIdx(nm)
  }

  function goToToday() {
    setYear(today.getFullYear())
    setMonthIdx(today.getMonth())
  }

  const isCurrentMonth = year === today.getFullYear() && monthIdx === today.getMonth()
  const selectedKey = selectedDate
    ? `${year}-${String(monthIdx + 1).padStart(2, '0')}-${String(selectedDate).padStart(2, '0')}`
    : null
  const selectedTxs = selectedDate ? (perDay[selectedDate]?.txs || []) : []

  return (
    <div className="bg-bg-card border border-line-subtle rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-line-subtle">
        <div>
          <h3 className="text-base font-bold text-white">{monthLabel}</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {totalCount} transactions · −{formatCurrency(totalExpense)} · +{formatCurrency(totalIncome)}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={() => shift(-1)}
            className="p-2 rounded-lg bg-bg-elevated border border-line-subtle text-gray-400 hover:text-white hover:border-line transition-colors">
            <ChevronLeft size={15} />
          </button>
          {!isCurrentMonth && (
            <button onClick={goToToday}
              className="px-3 py-1.5 rounded-lg bg-violet-500/15 text-violet-300 text-xs font-medium border border-violet-500/30 hover:bg-violet-500/25 transition-colors">
              Today
            </button>
          )}
          <button onClick={() => shift(1)}
            className="p-2 rounded-lg bg-bg-elevated border border-line-subtle text-gray-400 hover:text-white hover:border-line transition-colors">
            <ChevronRight size={15} />
          </button>
        </div>
      </div>

      {/* Day labels */}
      <div className="grid grid-cols-7 px-2 sm:px-3 pt-3 pb-1">
        {DAY_LABELS.map(d => (
          <div key={d} className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold text-center">{d}</div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 gap-1 sm:gap-1.5 p-2 sm:p-3 pt-1">
        {cells.map((day, i) => {
          if (day === null) return <div key={`empty-${i}`} />

          const data = perDay[day]
          const isToday = isCurrentMonth && day === today.getDate()
          const intensity = data?.expense ? data.expense / maxExpense : 0
          // Higher intensity = stronger rose tint
          const bgIntensity = Math.round(intensity * 60)
          const hasIncome = data?.income > 0
          const hasExpense = data?.expense > 0

          return (
            <motion.button
              key={day}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => data && setSelectedDate(day)}
              disabled={!data}
              className={`aspect-square sm:aspect-[1/0.9] flex flex-col items-stretch justify-between p-1.5 sm:p-2 rounded-lg border text-left relative transition-all ${
                isToday
                  ? 'border-violet-500/50 bg-violet-500/10'
                  : data
                    ? 'border-line-subtle hover:border-line cursor-pointer'
                    : 'border-line-subtle/50 cursor-default opacity-60'
              }`}
              style={data && !isToday ? { backgroundColor: `rgba(244, 63, 94, ${0.04 + intensity * 0.18})` } : undefined}
            >
              <div className="flex items-center justify-between gap-1">
                <span className={`text-[11px] sm:text-xs font-semibold ${
                  isToday ? 'text-violet-300' : data ? 'text-gray-300' : 'text-gray-600'
                }`}>{day}</span>
                {data && (
                  <div className="flex gap-0.5">
                    {hasIncome && <span className="w-1 h-1 rounded-full bg-emerald-400" />}
                    {hasExpense && <span className="w-1 h-1 rounded-full bg-rose-400" />}
                  </div>
                )}
              </div>

              {data?.expense > 0 && (
                <div className="text-[9px] sm:text-[10px] font-bold text-rose-300 leading-tight truncate">
                  −{formatCompact(data.expense).replace('₹', '')}
                </div>
              )}
            </motion.button>
          )
        })}
      </div>

      {/* Legend */}
      <div className="px-5 py-2.5 border-t border-line-subtle bg-bg-elevated/30 flex items-center justify-between flex-wrap gap-2 text-[11px] text-gray-500">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> income
          </span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" /> expense
          </span>
        </div>
        <span>Darker = more spent</span>
      </div>

      {/* Day detail modal */}
      <AnimatePresence>
        {selectedDate && selectedKey && (
          <Modal
            onClose={() => setSelectedDate(null)}
            title={formatDateFull(selectedKey)}
            subtitle={`${selectedTxs.length} transaction${selectedTxs.length !== 1 ? 's' : ''}`}
            maxWidth="md"
          >
            {selectedTxs.length === 0 ? (
              <div className="py-10 text-center text-gray-500 text-sm">Nothing recorded this day</div>
            ) : (
              <div className="divide-y divide-line-subtle">
                {selectedTxs.map(tx => {
                  const isTransfer = tx.type === 'transfer'
                  const isOut = tx.transferDirection === 'out'
                  const category = categories.find(c => c.id === tx.categoryId)
                  const account = accounts.find(a => a.id === tx.accountId)
                  return (
                    <button
                      key={tx.id}
                      onClick={() => { onEdit?.(tx); setSelectedDate(null) }}
                      className="w-full px-5 py-3 flex items-center gap-3 hover:bg-white/[0.03] transition-colors text-left"
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        isTransfer ? 'bg-blue-500/10' : tx.type === 'income' ? 'bg-emerald-500/10' : 'bg-rose-500/10'
                      }`}>
                        {isTransfer ? <ArrowLeftRight size={13} className="text-blue-400" />
                         : tx.type === 'income' ? <ArrowUpRight size={13} className="text-emerald-400" />
                         : <ArrowDownRight size={13} className="text-rose-400" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-200 truncate">{tx.name}</div>
                        <div className="text-[11px] text-gray-500 mt-0.5">
                          {category?.name || (isTransfer ? 'Transfer' : '')}{account && ` · ${account.name}`}
                        </div>
                      </div>
                      <div className={`text-sm font-bold flex-shrink-0 ${
                        isTransfer ? (isOut ? 'text-blue-300' : 'text-blue-400')
                          : tx.type === 'income' ? 'text-emerald-400' : 'text-rose-400'
                      }`}>
                        {isTransfer ? (isOut ? '−' : '+') : tx.type === 'income' ? '+' : '−'}
                        {formatCurrency(tx.amount)}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </Modal>
        )}
      </AnimatePresence>
    </div>
  )
}
