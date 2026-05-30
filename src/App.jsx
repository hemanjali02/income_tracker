import { useState } from 'react'
import { ToastProvider } from './context/ToastContext'
import { AuthProvider, useAuth } from './context/AuthContext'
import { AppProvider } from './context/AppContext'
import Sidebar, { MobileMenuButton } from './components/Sidebar'
import Dashboard from './components/Dashboard'
import Transactions from './components/Transactions'
import CategoryManager from './components/CategoryManager'
import AccountManager from './components/AccountManager'
import BudgetView from './components/BudgetView'
import Investments from './components/Investments'
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

  function openAdd(defaultType = null) {
    setAddDefaultType(defaultType)
    setShowAdd(true)
  }

  return (
    <div className="min-h-screen flex overflow-hidden">
      <Sidebar
        activeView={view}
        onNavigate={setView}
        mobileOpen={mobileMenu}
        onCloseMobile={() => setMobileMenu(false)}
      />

      <main className="flex-1 lg:ml-56 min-h-screen min-w-0 overflow-x-hidden">
        {!serverMode && <LocalModeBanner />}

        <div className="sticky top-0 z-10 backdrop-blur-md bg-bg-base/80 border-b border-line-subtle px-4 sm:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MobileMenuButton onClick={() => setMobileMenu(true)} />
            <h2 className="text-sm font-semibold text-gray-300 capitalize">{view}</h2>
          </div>
          <button
            onClick={() => openAdd()}
            className="btn-primary flex items-center gap-2 px-3 sm:px-4 py-2 text-white text-sm font-semibold rounded-lg shadow-lg shadow-violet-900/30"
          >
            <span className="text-lg leading-none">+</span>
            <span className="hidden sm:inline">Add Transaction</span>
          </button>
        </div>

        <div className="px-4 sm:px-8 py-6">
          {view === 'dashboard' && <Dashboard />}
          {view === 'transactions' && <Transactions onAdd={() => openAdd()} />}
          {view === 'investments' && <Investments />}
          {view === 'budgets' && <BudgetView />}
          {view === 'categories' && <CategoryManager />}
          {view === 'accounts' && <AccountManager onTransfer={() => openAdd('transfer')} />}
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
