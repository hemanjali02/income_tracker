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

function AppShell() {
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-violet-400 text-sm animate-pulse">Loading…</div>
      </div>
    )
  }

  // Server mode requires auth. Local mode skips auth entirely.
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
