import { useState, useMemo } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { Plus, Pencil, Trash2, TrendingUp, TrendingDown, Wallet, Target } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { INVESTMENT_TYPES } from '../data'
import { formatCurrency, formatDateFull } from '../utils/helpers'
import AddInvestmentModal from './AddInvestmentModal'
import ConfirmDialog from './ConfirmDialog'

function SummaryCard({ label, value, sub, icon: Icon, color }) {
  return (
    <div className="bg-bg-card border border-line-subtle rounded-xl p-4 sm:p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: color + '18', border: `1px solid ${color}20` }}>
          <Icon size={18} style={{ color }} />
        </div>
      </div>
      <div className="text-lg sm:text-xl font-bold text-white mb-1">{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
      {sub && <div className="text-xs text-gray-600 mt-0.5">{sub}</div>}
    </div>
  )
}

export default function Investments() {
  const { investments, deleteInvestment } = useApp()
  const [adding, setAdding] = useState(false)
  const [editInv, setEditInv] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)

  const totalInvested = investments.reduce((s, i) => s + i.invested, 0)
  const totalCurrent = investments.reduce((s, i) => s + i.currentValue, 0)
  const totalGain = totalCurrent - totalInvested
  const gainPct = totalInvested > 0 ? ((totalGain / totalInvested) * 100) : 0

  const allocationData = useMemo(() => {
    const map = {}
    for (const inv of investments) {
      if (!map[inv.type]) map[inv.type] = 0
      map[inv.type] += inv.currentValue
    }
    return Object.entries(map).map(([typeId, value]) => {
      const t = INVESTMENT_TYPES.find(x => x.id === typeId)
      return { id: typeId, name: t?.name || typeId, value, color: t?.color || '#64748b', icon: t?.icon || '💼' }
    }).sort((a, b) => b.value - a.value)
  }, [investments])

  function confirmDel() {
    if (confirmDelete) deleteInvestment(confirmDelete)
    setConfirmDelete(null)
  }

  return (
    <div className="space-y-6 animate-in">
      {(adding || editInv) && (
        <AddInvestmentModal editInv={editInv} onClose={() => { setAdding(false); setEditInv(null) }} />
      )}
      {confirmDelete && (
        <ConfirmDialog title="Delete Investment" message="This action cannot be undone."
          onConfirm={confirmDel} onCancel={() => setConfirmDelete(null)} />
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white">Investment Portfolio</h2>
          <p className="text-sm text-gray-500 mt-0.5">Track your investments and portfolio growth</p>
        </div>
        <button onClick={() => setAdding(true)}
          className="btn-primary flex items-center gap-2 px-4 py-2 text-white text-sm font-medium rounded-lg">
          <Plus size={15} /> Add Investment
        </button>
      </div>

      {investments.length === 0 ? (
        <div className="bg-bg-card border border-line-subtle rounded-2xl p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mx-auto mb-4">
            <Target size={28} className="text-violet-400" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">Start tracking your investments</h3>
          <p className="text-sm text-gray-500 mb-5 max-w-sm mx-auto">
            Add stocks, mutual funds, crypto, gold and more to see your portfolio at a glance.
          </p>
          <button onClick={() => setAdding(true)} className="btn-primary px-5 py-2.5 text-white text-sm font-semibold rounded-lg">
            Add your first investment
          </button>
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <SummaryCard label="Total Invested" value={formatCurrency(totalInvested)} icon={Wallet} color="#8b5cf6" />
            <SummaryCard label="Current Value" value={formatCurrency(totalCurrent)} icon={Target} color="#3b82f6" />
            <SummaryCard label={totalGain >= 0 ? 'Total Gain' : 'Total Loss'}
              value={formatCurrency(Math.abs(totalGain))}
              icon={totalGain >= 0 ? TrendingUp : TrendingDown}
              color={totalGain >= 0 ? '#10b981' : '#f43f5e'}
              sub={`${gainPct >= 0 ? '+' : ''}${gainPct.toFixed(2)}%`}
            />
            <SummaryCard label="Holdings" value={String(investments.length)} icon={Wallet} color="#f59e0b"
              sub={`${allocationData.length} type${allocationData.length !== 1 ? 's' : ''}`} />
          </div>

          {/* Allocation chart + List */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            {/* Allocation */}
            <div className="lg:col-span-2 bg-bg-card border border-line-subtle rounded-xl p-5">
              <h3 className="text-sm font-semibold text-white mb-4">Portfolio Allocation</h3>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={allocationData} cx="50%" cy="50%" innerRadius={50} outerRadius={75}
                    paddingAngle={3} dataKey="value">
                    {allocationData.map(e => <Cell key={e.id} fill={e.color} stroke="transparent" />)}
                  </Pie>
                  <Tooltip formatter={v => [`₹${Number(v).toLocaleString('en-IN')}`, '']}
                    contentStyle={{ background: '#1a1a2e', border: 'none', borderRadius: 8, fontSize: 12 }}
                    itemStyle={{ color: '#fff' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-3">
                {allocationData.map(c => (
                  <div key={c.id} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c.color }} />
                      <span className="text-gray-400">{c.icon} {c.name}</span>
                    </div>
                    <span className="text-gray-300 font-medium">
                      {totalCurrent > 0 ? Math.round((c.value / totalCurrent) * 100) : 0}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Holdings list */}
            <div className="lg:col-span-3 bg-bg-card border border-line-subtle rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-line-subtle">
                <h3 className="text-sm font-semibold text-white">Holdings</h3>
              </div>
              <div className="divide-y divide-line-subtle">
                {investments.map(inv => {
                  const type = INVESTMENT_TYPES.find(t => t.id === inv.type) || INVESTMENT_TYPES[7]
                  const gain = inv.currentValue - inv.invested
                  const pct = inv.invested > 0 ? (gain / inv.invested) * 100 : 0
                  return (
                    <div key={inv.id} className="px-4 py-3 sm:px-5 sm:py-4 hover:bg-white/[0.02] transition-colors group flex items-center gap-3 sm:gap-4">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                        style={{ backgroundColor: type.color + '18', border: `1px solid ${type.color}20` }}>
                        {type.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-white truncate">{inv.name}</div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {type.name}
                          {inv.units ? ` · ${inv.units} units` : ''}
                          {inv.purchaseDate ? ` · ${formatDateFull(inv.purchaseDate)}` : ''}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-white">{formatCurrency(inv.currentValue)}</div>
                        <div className={`text-xs font-medium ${gain >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {gain >= 0 ? '+' : ''}{formatCurrency(gain)} ({pct >= 0 ? '+' : ''}{pct.toFixed(1)}%)
                        </div>
                      </div>
                      <div className="flex gap-0.5 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setEditInv(inv)}
                          className="p-1.5 text-gray-500 hover:text-violet-400 hover:bg-violet-500/10 rounded-lg transition-colors">
                          <Pencil size={13} />
                        </button>
                        <button onClick={() => setConfirmDelete(inv.id)}
                          className="p-1.5 text-gray-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
