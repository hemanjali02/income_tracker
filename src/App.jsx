import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { RefreshCw } from 'lucide-react'
import { ToastProvider } from './context/ToastContext'
import usePullToRefresh from './hooks/usePullToRefresh'
import { AuthProvider, useAuth } from './context/AuthContext'
import { AppProvider } from './context/AppContext'
import Sidebar, { MobileMenuButton } from './components/Sidebar'
import BalancesQuickAccess from './components/BalancesQuickAccess'
import Dashboard from './components/Dashboard'
import Transactions from './components/Transactions'
import CategoryManager from './components/CategoryManager'
import AccountManager from './components/AccountManager'
import BudgetView from './components/BudgetView'
import Investments from './components/Investments'
import Recurring from './components/Recurring'
import Goals from './components/Goals'
import Receivables from './components/Receivables'
import Analysis from './components/Analysis'
import Balances from './components/Balances'
import AddTransactionModal from './components/AddTransactionModal'
import Login from './components/Login'
import Toasts from './components/Toast'

function LocalModeBanner() {
  return (
    <div className="bg-amber-500/10 border-b border-amber-500/30 px-4 py-2.5 flex items-center justify-center gap-2 text-center">
      <span className="text-amber-400 text-sm">⚠️</span>
      <p className="text-amber-300 text-xs sm:text-sm font-medium">
        Demo mode — server unreachable. Showing sample data only.{' '}
        <span className="text-amber-400/70 font-normal">Your real data is safe in the cloud. Refresh to reconnect.</span>
      </p>
      <button
        onClick={() => window.location.reload()}
        className="ml-2 px-2.5 py-1 rounded-md bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-medium hover:bg-amber-500/30 transition-colors flex-shrink-0"
      >
        Retry
      </button>
    </div>
  )
}

function AppShell() {
  const { serverMode } = useAuth()
  const [view, setView] = useState('dashboard')
  const [showAdd, setShowAdd] = useState(false)
  const [addDefaultType, setAddDefaultType] = useState(null)
  const [mobileMenu, setMobileMenu] = useState(false)

  const { pullDistance, refreshing } = usePullToRefresh(async () => {
    await new Promise(r => setTimeout(r, 400))
    window.location.reload()
  })

  function openAdd(defaultType = null) {
    setAddDefaultType(defaultType)
    setShowAdd(true)
  }

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
    const labels = {
      dashboard: 'Dashboard', balances: 'Balances', analysis: 'Analysis',
      transactions: 'Transactions', recurring: 'Recurring', receivables: 'Receivables',
      investments: 'Investments', budgets: 'Budgets', goals: 'Goals',
      categories: 'Categories', accounts: 'Accounts',
    }
    document.title = `${labels[view] || view} | Income Tracker`
  }, [view])

  return (
    <div className="min-h-screen flex overflow-hidden">
      <Sidebar
        activeView={view}
        onNavigate={setView}
        mobileOpen={mobileMenu}
        onCloseMobile={() => setMobileMenu(false)}
      />

      <main className="flex-1 lg:ml-56 min-h-screen min-w-0 overflow-x-hidden">
        {/* Pull-to-refresh indicator (mobile only) */}
        {(pullDistance > 0 || refreshing) && (
          <div
            className="lg:hidden fixed top-0 left-0 right-0 flex items-center justify-center z-50 pointer-events-none"
            style={{ height: pullDistance, transition: refreshing ? 'height 0.2s' : 'none' }}
          >
            <div
              className={`bg-violet-500/20 border border-violet-500/40 rounded-full p-2 shadow-lg ${refreshing ? 'animate-spin' : ''}`}
              style={{
                opacity: Math.min(1, pullDistance / 70),
                transform: `scale(${Math.min(1, pullDistance / 70)}) rotate(${refreshing ? 0 : pullDistance * 4}deg)`,
              }}
            >
              <RefreshCw size={16} className="text-violet-300" />
            </div>
          </div>
        )}

        {!serverMode && <LocalModeBanner />}

        <div className="sticky top-0 z-20 backdrop-blur-md bg-bg-base/80 border-b border-line-subtle px-4 sm:px-8 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <MobileMenuButton onClick={() => setMobileMenu(true)} />
            <h2 className="text-sm font-semibold text-gray-300 capitalize truncate">{view}</h2>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <BalancesQuickAccess />
            <motion.button
              whileTap={{ scale: 0.96 }}
              whileHover={{ y: -1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 22 }}
              onClick={() => openAdd()}
              className="btn-primary flex items-center gap-2 px-3 sm:px-4 py-2 text-white text-sm font-semibold rounded-lg shadow-lg shadow-violet-900/30"
            >
              <span className="text-lg leading-none">+</span>
              <span className="hidden sm:inline">Add Transaction</span>
            </motion.button>
          </div>
        </div>

        <div className="px-4 sm:px-8 py-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={view}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
            >
              {view === 'dashboard' && <Dashboard />}
              {view === 'balances' && <Balances />}
              {view === 'analysis' && <Analysis />}
              {view === 'transactions' && <Transactions onAdd={() => openAdd()} />}
              {view === 'recurring' && <Recurring />}
              {view === 'receivables' && <Receivables />}
              {view === 'investments' && <Investments />}
              {view === 'budgets' && <BudgetView />}
              {view === 'goals' && <Goals />}
              {view === 'categories' && <CategoryManager />}
              {view === 'accounts' && <AccountManager onTransfer={() => openAdd('transfer')} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {showAdd && <AddTransactionModal defaultType={addDefaultType} onClose={() => { setShowAdd(false); setAddDefaultType(null) }} />}
    </div>
  )
}

function AppGate() {
  const { user, serverMode, ready } = useAuth()

  if (!ready) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3">
        <div className="text-violet-400 text-sm animate-pulse">Connecting to server…</div>
        <div className="text-gray-600 text-xs">This may take a few seconds on first load</div>
      </div>
    )
  }

  if (serverMode && !user) {
    return <Login />
  }

  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  )
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <AppGate />
        <Toasts />
      </AuthProvider>
    </ToastProvider>
  )
}
