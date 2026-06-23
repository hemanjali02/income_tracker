import { useState, useRef, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Wallet, ChevronDown } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { formatCurrency, formatCompact, getAccountBalance } from '../utils/helpers'
import AnimatedNumber from './AnimatedNumber'

export default function BalancesQuickAccess() {
  const { accounts, transactions, investments } = useApp()
  const [open, setOpen] = useState(false)
  const popoverRef = useRef(null)

  const data = useMemo(() => {
    const accountBalances = accounts.map(a => ({ ...a, balance: getAccountBalance(transactions, a) }))
    const accountTotal = accountBalances.reduce((s, a) => s + a.balance, 0)
    const investmentTotal = investments.reduce((s, i) => s + (i.currentValue || 0), 0)
    return { accountBalances, accountTotal, investmentTotal, netWorth: accountTotal + investmentTotal }
  }, [accounts, transactions, investments])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function onClick(e) {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  // Close on Escape
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  if (!accounts.length) return null

  return (
    <div className="relative" ref={popoverRef}>
      <button
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
          open
            ? 'bg-violet-500/20 border-violet-500/50 text-violet-200'
            : 'bg-bg-card border-line-subtle text-gray-300 hover:border-line hover:text-white'
        }`}
        title="View account balances"
      >
        <Wallet size={13} className="text-violet-400" />
        <span className="hidden sm:inline text-gray-500">Net</span>
        <span className={`font-bold ${data.netWorth >= 0 ? 'text-white' : 'text-rose-400'}`}>
          {data.netWorth < 0 && '−'}
          <AnimatedNumber value={Math.abs(data.netWorth)} format={(v) => formatCompact(v)} />
        </span>
        <ChevronDown size={11} className={`text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
            className="absolute top-full right-0 mt-2 w-72 sm:w-80 glass rounded-2xl shadow-2xl border border-line z-50 overflow-hidden"
          >
            {/* Total */}
            <div className="px-5 py-4 border-b border-line-subtle bg-violet-500/5">
              <div className="text-[10px] uppercase tracking-wider text-violet-400 font-semibold mb-1">Total Net Worth</div>
              <div className={`text-2xl font-bold ${data.netWorth >= 0 ? 'text-white' : 'text-rose-400'}`}>
                {data.netWorth < 0 && '−'}
                <AnimatedNumber value={Math.abs(data.netWorth)} format={formatCurrency} />
              </div>
              <div className="flex gap-3 mt-2 text-[11px]">
                <span className="text-gray-500">
                  Accounts: <span className="text-gray-200 font-medium">{formatCurrency(data.accountTotal)}</span>
                </span>
                {data.investmentTotal > 0 && (
                  <span className="text-gray-500">
                    Investments: <span className="text-gray-200 font-medium">{formatCurrency(data.investmentTotal)}</span>
                  </span>
                )}
              </div>
            </div>

            {/* Per-account list */}
            <div className="max-h-72 overflow-y-auto">
              {data.accountBalances.map(acc => (
                <div key={acc.id} className="flex items-center justify-between px-5 py-2.5 hover:bg-white/[0.03] transition-colors">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: acc.color }} />
                    <span className="text-sm text-gray-300 truncate">{acc.name}</span>
                  </div>
                  <span className={`text-sm font-semibold flex-shrink-0 ${acc.balance >= 0 ? 'text-white' : 'text-rose-400'}`}>
                    {acc.balance < 0 && '−'}{formatCurrency(Math.abs(acc.balance))}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
