import { LayoutDashboard, ArrowLeftRight, Tag, Wallet, TrendingUp, Target, Menu, X, Database, HardDrive, LogOut, User, Briefcase } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'transactions', label: 'Transactions', icon: ArrowLeftRight },
  { id: 'investments', label: 'Investments', icon: Briefcase },
  { id: 'budgets', label: 'Budgets', icon: Target },
  { id: 'categories', label: 'Categories', icon: Tag },
  { id: 'accounts', label: 'Accounts', icon: Wallet },
]

export default function Sidebar({ activeView, onNavigate, mobileOpen, onCloseMobile }) {
  const { user, serverMode, logout } = useAuth()

  function handleNav(id) {
    onNavigate(id)
    onCloseMobile()
  }

  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden" onClick={onCloseMobile} />
      )}

      <aside className={`fixed top-0 left-0 h-screen w-56 bg-bg-card border-r border-line-subtle flex flex-col z-40
        transition-transform duration-200 lg:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="px-5 py-5 border-b border-line-subtle flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-900/30">
              <TrendingUp size={17} className="text-white" />
            </div>
            <div>
              <div className="text-white font-bold text-sm leading-tight">Income</div>
              <div className="gradient-text font-bold text-sm leading-tight">Tracker</div>
            </div>
          </div>
          <button onClick={onCloseMobile} className="lg:hidden p-1 text-gray-500 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 py-4 px-3 overflow-y-auto">
          {navItems.map(({ id, label, icon: Icon }) => {
            const active = activeView === id
            return (
              <button
                key={id}
                onClick={() => handleNav(id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 text-sm font-medium transition-all duration-150 ${
                  active
                    ? 'bg-violet-500/15 text-violet-200 border border-violet-500/30 shadow-sm'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-white/[0.04] border border-transparent'
                }`}
              >
                <Icon size={16} className={active ? 'text-violet-300' : ''} />
                {label}
              </button>
            )
          })}
        </nav>

        {/* User card */}
        <div className="border-t border-line-subtle px-3 py-3">
          {user ? (
            <div className="bg-bg-elevated rounded-lg p-3 border border-line-subtle">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-xs font-bold text-white">
                  {user.username.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-white truncate">{user.username}</div>
                  <div className="text-[10px] text-gray-500">Signed in</div>
                </div>
                <button onClick={logout} title="Sign out"
                  className="p-1.5 text-gray-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors">
                  <LogOut size={13} />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-[10px] text-gray-500 px-2">
              {serverMode ? <Database size={11} /> : <HardDrive size={11} className="text-amber-500" />}
              {serverMode ? 'Server mode' : 'Local storage'}
            </div>
          )}
        </div>
      </aside>
    </>
  )
}

export function MobileMenuButton({ onClick }) {
  return (
    <button onClick={onClick} className="lg:hidden p-2 -ml-2 text-gray-400 hover:text-white transition-colors">
      <Menu size={20} />
    </button>
  )
}
