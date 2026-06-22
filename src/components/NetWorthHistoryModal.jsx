import { useMemo, useEffect } from 'react'
import { X, TrendingUp, TrendingDown } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { formatCurrency, formatCompact, getAccountBalance } from '../utils/helpers'
import { useApp } from '../context/AppContext'

export default function NetWorthHistoryModal({ onClose }) {
  const { transactions, accounts, investments, netWorthSnapshots, addNetWorthSnapshot } = useApp()

  // Compute current net worth (live)
  const currentNetWorth = useMemo(() => {
    const accountSum = accounts.reduce((s, a) => s + getAccountBalance(transactions, a), 0)
    const investmentSum = investments.reduce((s, i) => s + (i.currentValue || 0), 0)
    return { accountSum, investmentSum, total: accountSum + investmentSum }
  }, [transactions, accounts, investments])

  // Auto-snapshot once per month
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10)
    const thisMonth = today.slice(0, 7)
    const hasThisMonth = netWorthSnapshots.some(s => s.date.startsWith(thisMonth))
    if (!hasThisMonth && (currentNetWorth.total !== 0)) {
      addNetWorthSnapshot({
        id: `snap-${today}`,
        date: today,
        netWorth: currentNetWorth.total,
        accountTotal: currentNetWorth.accountSum,
        investmentTotal: currentNetWorth.investmentSum,
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Build chart series — snapshots + current point
  const chartData = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    const points = [...netWorthSnapshots]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(s => ({
        date: s.date,
        label: new Date(s.date).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
        netWorth: s.netWorth,
      }))
    // Add today's live point if not already
    if (!points.some(p => p.date === today)) {
      points.push({
        date: today,
        label: 'Now',
        netWorth: currentNetWorth.total,
      })
    }
    return points
  }, [netWorthSnapshots, currentNetWorth])

  const firstSnap = chartData[0]
  const lastSnap = chartData[chartData.length - 1]
  const change = lastSnap && firstSnap ? lastSnap.netWorth - firstSnap.netWorth : 0
  const changePct = firstSnap?.netWorth ? (change / Math.abs(firstSnap.netWorth)) * 100 : 0

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="relative glass rounded-2xl w-full max-w-2xl shadow-2xl animate-in" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-line">
          <div>
            <h2 className="text-white font-semibold text-base">Net Worth History</h2>
            <p className="text-xs text-gray-500 mt-0.5">Monthly snapshots · {chartData.length} data point{chartData.length !== 1 ? 's' : ''}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Current value summary */}
        <div className="px-6 py-5 border-b border-line-subtle">
          <div className="flex items-baseline gap-3">
            <span className={`text-3xl font-bold ${currentNetWorth.total >= 0 ? 'text-white' : 'text-rose-400'}`}>
              {currentNetWorth.total < 0 && '−'}{formatCurrency(Math.abs(currentNetWorth.total))}
            </span>
            {chartData.length > 1 && (
              <span className={`flex items-center gap-1 text-sm font-medium ${change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {change >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                {change >= 0 ? '+' : '−'}{formatCurrency(Math.abs(change))}
                <span className="text-gray-500">({changePct >= 0 ? '+' : ''}{changePct.toFixed(1)}%)</span>
              </span>
            )}
          </div>
          <div className="flex gap-4 mt-3 text-xs">
            <div>
              <span className="text-gray-500">Accounts: </span>
              <span className="text-gray-200 font-medium">{formatCurrency(currentNetWorth.accountSum)}</span>
            </div>
            <div>
              <span className="text-gray-500">Investments: </span>
              <span className="text-gray-200 font-medium">{formatCurrency(currentNetWorth.investmentSum)}</span>
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="px-3 py-5">
          {chartData.length < 2 ? (
            <div className="py-10 text-center">
              <p className="text-sm text-gray-400">First snapshot saved today.</p>
              <p className="text-xs text-gray-600 mt-1">Come back next month to see the trend.</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="nwGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1c1c2e" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false}
                  tickFormatter={v => formatCompact(v)} width={50} />
                <Tooltip
                  contentStyle={{ background: '#1a1a2e', border: '1px solid #252540', borderRadius: 8, fontSize: 12 }}
                  itemStyle={{ color: '#a78bfa' }}
                  labelStyle={{ color: '#9ca3af' }}
                  formatter={(v) => [formatCurrency(v), 'Net Worth']}
                />
                <Area type="monotone" dataKey="netWorth" stroke="#a78bfa" strokeWidth={2.5} fill="url(#nwGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {chartData.length >= 2 && (
          <div className="px-6 py-3 border-t border-line-subtle bg-bg-elevated/40 text-[11px] text-gray-500">
            Snapshots are taken automatically the first time you open the dashboard each month.
          </div>
        )}
      </div>
    </div>
  )
}
