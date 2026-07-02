import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Landmark, TrendingUp, CreditCard, HandCoins, AlertCircle, Wallet, Building2, Banknote, Wallet as WalletIcon } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { formatCurrency, getAccountBalance, getCurrentCreditCycle, getCreditCycleSpend, emiProgress } from '../utils/helpers'
import AnimatedNumber from './AnimatedNumber'

const ACCOUNT_ICON_MAP = {
  bank: Building2,
  cash: Banknote,
  wallet: WalletIcon,
  credit: CreditCard,
}

function StatCard({ label, value, sub, icon: Icon, color, valueColor }) {
  return (
    <div className="bg-bg-card border border-line-subtle rounded-xl p-4 sm:p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: color + '18', border: `1px solid ${color}20` }}>
          <Icon size={18} style={{ color }} />
        </div>
      </div>
      <div className={`text-lg sm:text-xl font-bold mb-1 ${valueColor || 'text-white'}`}>{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
      {sub && <div className="text-xs text-gray-600 mt-0.5">{sub}</div>}
    </div>
  )
}

export default function Balances() {
  const { accounts, transactions, investments, receivables, emis } = useApp()

  const data = useMemo(() => {
    // Per-account balance, separating credit-card (debt) from assets
    const creditAccounts = accounts.filter(a => a.accountType === 'credit')
    const assetAccounts  = accounts.filter(a => a.accountType !== 'credit')

    const assetTotal = assetAccounts.reduce((s, a) => s + getAccountBalance(transactions, a), 0)
    // Signed sum of credit balances: negative means you owe. Using the signed
    // value keeps net worth identical to the header pill and Dashboard card,
    // which simply sum every account balance.
    const creditNet = creditAccounts.reduce((s, a) => s + getAccountBalance(transactions, a), 0)
    const creditOutstanding = creditAccounts.reduce((s, a) => {
      const bal = getAccountBalance(transactions, a)
      return s + (bal < 0 ? Math.abs(bal) : 0)
    }, 0)

    const investmentTotal = investments.reduce((s, i) => s + (i.currentValue || 0), 0)
    const receivablesPending = receivables
      .filter(r => r.status === 'pending')
      .reduce((s, r) => s + r.amount, 0)

    // Cash position (liquid only — accounts that aren't credit)
    const cashPosition = assetTotal

    // Net worth = signed sum of every account (assets + credit), matching all other pages
    const netWorthExclInv = assetTotal + creditNet
    // Net worth including investments
    const netWorthInclInv = netWorthExclInv + investmentTotal
    // Accessible total including pending receivables (best case)
    const optimisticTotal = netWorthInclInv + receivablesPending

    return {
      assetAccounts, creditAccounts,
      assetTotal, creditOutstanding,
      investmentTotal, receivablesPending,
      cashPosition, netWorthExclInv, netWorthInclInv, optimisticTotal,
    }
  }, [accounts, transactions, investments, receivables])

  // Credit card cycle insights
  const cardInsights = useMemo(() =>
    data.creditAccounts.map(acc => {
      const cycle = getCurrentCreditCycle(acc.cycleDay)
      const spent = getCreditCycleSpend(transactions, acc)
      const limit = acc.creditLimit || 0
      const available = Math.max(0, limit - spent)
      const pct = limit > 0 ? Math.min(100, (spent / limit) * 100) : 0
      const activeEmis = emis
        .filter(e => e.accountId === acc.id)
        .map(e => emiProgress(e))
        .filter(e => !e.done)
      const emiMonthly = activeEmis.reduce((s, e) => s + e.installment, 0)
      const balance = getAccountBalance(transactions, acc)
      const outstanding = balance < 0 ? Math.abs(balance) : 0
      return { acc, cycle, spent, limit, available, pct, outstanding, emiMonthly, emiCount: activeEmis.length }
    }),
    [data.creditAccounts, transactions, emis]
  )

  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white">Balances</h2>
        <p className="text-sm text-gray-500 mt-0.5">Where your money sits — assets, dues, and what's actually yours</p>
      </div>

      {/* Hero cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <div className="glow-card bg-gradient-to-br from-violet-500/10 via-violet-500/5 to-transparent border border-violet-500/30 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-1">
            <Landmark size={14} className="text-violet-400" />
            <span className="text-xs uppercase tracking-wider text-violet-300 font-semibold">Net Worth (incl. investments)</span>
          </div>
          <div className={`text-3xl font-bold mt-2 ${data.netWorthInclInv >= 0 ? 'text-white' : 'text-rose-400'}`}>
            {data.netWorthInclInv < 0 && '−'}
            <AnimatedNumber value={Math.abs(data.netWorthInclInv)} format={formatCurrency} />
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Assets {formatCurrency(data.assetTotal + data.investmentTotal)} − Debts {formatCurrency(data.creditOutstanding)}
          </div>
        </div>

        <div className="bg-bg-card border border-line-subtle rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-1">
            <Wallet size={14} className="text-gray-400" />
            <span className="text-xs uppercase tracking-wider text-gray-500 font-semibold">Net Worth (excl. investments)</span>
          </div>
          <div className={`text-3xl font-bold mt-2 ${data.netWorthExclInv >= 0 ? 'text-white' : 'text-rose-400'}`}>
            {data.netWorthExclInv < 0 && '−'}
            <AnimatedNumber value={Math.abs(data.netWorthExclInv)} format={formatCurrency} />
          </div>
          <div className="text-xs text-gray-500 mt-1">Cash & accounts only — no investment movements</div>
        </div>
      </div>

      {/* Breakdown stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Liquid Cash"
          value={<AnimatedNumber value={data.cashPosition} format={formatCurrency} />}
          icon={Wallet}
          color="#10b981"
          sub={`${data.assetAccounts.length} account${data.assetAccounts.length !== 1 ? 's' : ''}`}
        />
        <StatCard
          label="Investments"
          value={<AnimatedNumber value={data.investmentTotal} format={formatCurrency} />}
          icon={TrendingUp}
          color="#3b82f6"
          sub="Current portfolio value"
        />
        <StatCard
          label="Credit Outstanding"
          value={<AnimatedNumber value={data.creditOutstanding} format={formatCurrency} />}
          valueColor={data.creditOutstanding > 0 ? 'text-rose-400' : 'text-white'}
          icon={CreditCard}
          color="#f43f5e"
          sub={`${data.creditAccounts.length} card${data.creditAccounts.length !== 1 ? 's' : ''}`}
        />
        <StatCard
          label="Receivables Pending"
          value={<AnimatedNumber value={data.receivablesPending} format={formatCurrency} />}
          valueColor={data.receivablesPending > 0 ? 'text-amber-400' : 'text-white'}
          icon={HandCoins}
          color="#f59e0b"
          sub="Money others owe you"
        />
      </div>

      {/* If you collect everything */}
      {data.receivablesPending > 0 && (
        <div className="bg-bg-card border border-line-subtle rounded-xl p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
            <AlertCircle size={16} className="text-amber-400" />
          </div>
          <div className="flex-1">
            <div className="text-sm text-gray-300">
              If all receivables are collected, your net worth becomes
              <span className="font-bold text-emerald-400 ml-1">
                {formatCurrency(data.optimisticTotal)}
              </span>
            </div>
            <div className="text-[11px] text-gray-500 mt-0.5">
              {formatCurrency(data.receivablesPending)} pending across {receivables.filter(r => r.status === 'pending').length} item{receivables.filter(r => r.status === 'pending').length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
      )}

      {/* Asset accounts (cash, banks, wallets) */}
      {data.assetAccounts.length > 0 && (
        <div className="bg-bg-card border border-line-subtle rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Wallet size={14} className="text-emerald-400" /> Asset Accounts
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {data.assetAccounts.map(acc => {
              const bal = getAccountBalance(transactions, acc)
              const Icon = ACCOUNT_ICON_MAP[acc.accountType] || Building2
              return (
                <motion.div key={acc.id}
                  whileHover={{ y: -2 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 22 }}
                  className="bg-bg-elevated border border-line-subtle rounded-xl p-4 relative overflow-hidden">
                  <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: acc.color }} />
                  <div className="flex items-center gap-2 mb-3 pl-1">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: acc.color + '20' }}>
                      <Icon size={14} style={{ color: acc.color }} />
                    </div>
                    <span className="text-sm font-medium text-gray-300 truncate">{acc.name}</span>
                  </div>
                  <div className={`text-xl font-bold pl-1 ${bal >= 0 ? 'text-white' : 'text-rose-400'}`}>
                    {bal < 0 && '−'}
                    <AnimatedNumber value={Math.abs(bal)} format={formatCurrency} />
                  </div>
                  <div className="text-[10px] text-gray-500 mt-1 pl-1 capitalize">{acc.accountType}</div>
                </motion.div>
              )
            })}
          </div>
        </div>
      )}

      {/* Credit cards with cycle insights */}
      {cardInsights.length > 0 && (
        <div className="bg-bg-card border border-line-subtle rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <CreditCard size={14} className="text-rose-400" /> Credit Cards
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {cardInsights.map(({ acc, cycle, spent, limit, available, pct, outstanding, emiMonthly, emiCount }) => {
              const overLimit = limit > 0 && spent > limit
              const nearLimit = pct > 80
              return (
                <motion.div key={acc.id}
                  whileHover={{ y: -2 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 22 }}
                  className="bg-bg-elevated border border-line-subtle rounded-xl p-5 relative overflow-hidden">
                  <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: acc.color }} />

                  <div className="flex items-start justify-between mb-3 pl-1">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: acc.color + '20' }}>
                        <CreditCard size={14} style={{ color: acc.color }} />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-white">{acc.name}</div>
                        {cycle && <div className="text-[10px] text-gray-500 mt-0.5">{cycle.label}</div>}
                      </div>
                    </div>
                    {limit > 0 && (
                      <div className="text-right">
                        <div className="text-[10px] text-gray-500 uppercase tracking-wider">Limit</div>
                        <div className="text-xs text-gray-300 font-semibold">{formatCurrency(limit)}</div>
                      </div>
                    )}
                  </div>

                  {limit > 0 ? (
                    <>
                      <div className="flex items-baseline gap-2 mb-2 pl-1">
                        <span className={`text-2xl font-bold ${overLimit ? 'text-rose-400' : nearLimit ? 'text-amber-400' : 'text-white'}`}>
                          <AnimatedNumber value={spent} format={formatCurrency} />
                        </span>
                        <span className="text-xs text-gray-500">spent this cycle</span>
                      </div>
                      <div className="h-2 bg-bg-base rounded-full overflow-hidden mb-2">
                        <div className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, backgroundColor: overLimit ? '#f43f5e' : nearLimit ? '#f59e0b' : acc.color }} />
                      </div>
                      <div className="flex justify-between text-[11px] mb-3">
                        <span className={overLimit ? 'text-rose-400 font-semibold' : 'text-gray-500'}>
                          {Math.round(pct)}% used
                        </span>
                        <span className="text-gray-500">
                          {overLimit
                            ? <span className="text-rose-400">Over by {formatCurrency(spent - limit)}</span>
                            : <>Available: <span className="text-emerald-400 font-semibold">{formatCurrency(available)}</span></>}
                        </span>
                      </div>
                      {cycle && (
                        <div className="text-[11px] text-gray-500 text-center pt-2 border-t border-line-subtle">
                          {cycle.daysLeft > 0
                            ? <>📅 {cycle.daysLeft} day{cycle.daysLeft !== 1 ? 's' : ''} until next statement</>
                            : 'Statement generates today'}
                          {acc.dueDay && <span className="ml-2">· Pay by {acc.dueDay}{acc.dueDay === 1 ? 'st' : acc.dueDay === 2 ? 'nd' : acc.dueDay === 3 ? 'rd' : 'th'}</span>}
                        </div>
                      )}
                      {outstanding > 0 && outstanding !== spent && (
                        <div className="text-[11px] text-rose-400 mt-2 text-center">
                          Last statement outstanding: {formatCurrency(outstanding)}
                        </div>
                      )}
                      {emiMonthly > 0 && (
                        <div className="text-[11px] text-cyan-300 mt-2 text-center">
                          {emiCount} active EMI{emiCount !== 1 ? 's' : ''} · {formatCurrency(Math.round(emiMonthly))}/mo committed
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-xs text-gray-500 italic">
                      Add a credit limit and cycle day in account settings to see cycle insights
                    </div>
                  )}
                </motion.div>
              )
            })}
          </div>
        </div>
      )}

      {accounts.length === 0 && (
        <div className="bg-bg-card border border-line-subtle rounded-2xl p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mx-auto mb-4">
            <Wallet size={28} className="text-violet-400" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">No accounts yet</h3>
          <p className="text-sm text-gray-500 max-w-sm mx-auto">
            Add bank accounts, cash, wallets, and credit cards to see your full financial picture here.
          </p>
        </div>
      )}
    </div>
  )
}
