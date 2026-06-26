import { useState } from 'react'
import { LayoutDashboard, ArrowLeftRight, Tag, Wallet, TrendingUp, Target, Menu, X, Database, HardDrive, LogOut, Briefcase, KeyRound, Eye, EyeOff, Repeat, Flag, HandCoins, LineChart, Coins, User, Trash2, AlertTriangle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import Modal from './Modal'

const navSections = [
  {
    label: 'Overview',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'balances',  label: 'Balances',  icon: Coins },
      { id: 'analysis',  label: 'Analysis',  icon: LineChart },
    ],
  },
  {
    label: 'Money',
    items: [
      { id: 'transactions', label: 'Transactions', icon: ArrowLeftRight },
      { id: 'recurring',    label: 'Recurring',    icon: Repeat },
      { id: 'receivables',  label: 'Receivables',  icon: HandCoins },
    ],
  },
  {
    label: 'Planning',
    items: [
      { id: 'budgets',     label: 'Budgets',     icon: Target },
      { id: 'goals',       label: 'Goals',       icon: Flag },
      { id: 'investments', label: 'Investments', icon: Briefcase },
    ],
  },
  {
    label: 'Setup',
    items: [
      { id: 'accounts',   label: 'Accounts',   icon: Wallet },
      { id: 'categories', label: 'Categories', icon: Tag },
    ],
  },
]

const inputCls = `w-full bg-bg-input border border-line-subtle rounded-lg px-3 py-2 text-sm text-white
  placeholder-gray-500 focus:outline-none focus:border-violet-500 transition-colors`

function ChangePasswordModal({ onClose }) {
  const { changePassword } = useAuth()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNext, setShowNext] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (next.length < 8) return setError('New password must be at least 8 characters')
    if (!/[0-9]/.test(next)) return setError('New password must contain at least one number')
    if (next !== confirm) return setError('Passwords do not match')
    if (current === next) return setError('New password must differ from current password')
    setLoading(true)
    try {
      await changePassword(current, next)
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to change password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal onClose={onClose} title="Change Password" icon={KeyRound} maxWidth="sm">
      <form onSubmit={handleSubmit} className="px-5 py-4 space-y-3">
          {/* Current password */}
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Current Password</label>
            <div className="relative">
              <input className={inputCls + ' pr-9'} type={showCurrent ? 'text' : 'password'}
                placeholder="••••••••" value={current} onChange={e => setCurrent(e.target.value)} autoFocus />
              <button type="button" tabIndex={-1} onClick={() => setShowCurrent(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors">
                {showCurrent ? <EyeOff size={13} /> : <Eye size={13} />}
              </button>
            </div>
          </div>

          {/* New password */}
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">New Password</label>
            <div className="relative">
              <input className={inputCls + ' pr-9'} type={showNext ? 'text' : 'password'}
                placeholder="min 8 chars + number" value={next} onChange={e => setNext(e.target.value)} />
              <button type="button" tabIndex={-1} onClick={() => setShowNext(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors">
                {showNext ? <EyeOff size={13} /> : <Eye size={13} />}
              </button>
            </div>
            {/* Inline strength bar */}
            {next && (
              <div className="flex gap-1 mt-1.5">
                {[1,2,3,4].map(i => {
                  const score = [next.length>=8, /[A-Z]/.test(next), /[0-9]/.test(next), /[^A-Za-z0-9]/.test(next)].filter(Boolean).length
                  const c = ['','bg-rose-500','bg-amber-500','bg-blue-500','bg-emerald-500'][score]
                  return <div key={i} className={`h-1 flex-1 rounded-full ${i<=score ? c : 'bg-line'}`} />
                })}
              </div>
            )}
          </div>

          {/* Confirm */}
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Confirm New Password</label>
            <div className="relative">
              <input className={`${inputCls} ${confirm && confirm !== next ? 'border-rose-500/50' : confirm && confirm === next ? 'border-emerald-500/50' : ''}`}
                type="password" placeholder="••••••••" value={confirm} onChange={e => setConfirm(e.target.value)} />
            </div>
            {confirm && confirm !== next && <p className="text-[11px] text-rose-400 mt-1">Passwords don't match</p>}
            {confirm && confirm === next && <p className="text-[11px] text-emerald-400 mt-1">Passwords match ✓</p>}
          </div>

          {error && (
            <div className="text-rose-400 text-xs bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={loading}
              className="flex-1 btn-primary py-2 text-white text-sm font-semibold rounded-lg disabled:opacity-50">
              {loading ? 'Saving…' : 'Update Password'}
            </button>
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-gray-400 hover:text-white text-sm transition-colors">
              Cancel
            </button>
          </div>
        </form>
    </Modal>
  )
}

function ProfileModal({ onClose }) {
  const { user, updateProfile } = useAuth()
  const [username, setUsername] = useState(user?.username || '')
  const [displayName, setDisplayName] = useState(user?.displayName || '')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setError('')
    if (username.trim().length < 2) return setError('Username must be at least 2 characters')
    setLoading(true)
    try {
      await updateProfile({ username: username.trim(), displayName: displayName.trim() })
      onClose()
    } catch (err) {
      setError(err.message || 'Could not update profile')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal onClose={onClose} title="Edit Profile" icon={User} maxWidth="sm">
      <form onSubmit={submit} className="px-5 py-4 space-y-3">
        <div className="flex items-center gap-3 pb-3 mb-1 border-b border-line-subtle">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-base font-bold text-white">
            {(displayName || username || 'U').charAt(0).toUpperCase()}
          </div>
          <div className="text-xs text-gray-500">
            {user?.email && <div>{user.email}</div>}
            {user?.googleId && <div className="text-violet-400 mt-0.5">Signed in with Google</div>}
          </div>
        </div>
        <div>
          <label className={labelCls}>Username</label>
          <input autoFocus className={inputCls} value={username} onChange={e => setUsername(e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Display name <span className="text-gray-600">(optional)</span></label>
          <input className={inputCls} value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Your name" />
        </div>
        {error && (
          <div className="text-rose-400 text-xs bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">{error}</div>
        )}
        <div className="flex gap-2 pt-1">
          <button type="submit" disabled={loading}
            className="flex-1 btn-primary py-2 text-white text-sm font-semibold rounded-lg disabled:opacity-50">
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
          <button type="button" onClick={onClose} className="px-4 py-2 text-gray-400 hover:text-white text-sm">
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  )
}

function DeleteAccountModal({ onClose }) {
  const { user, deleteAccount } = useAuth()
  const [password, setPassword] = useState('')
  const [confirmText, setConfirmText] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const isGoogle = !!user?.googleId && !user?.passwordHash

  async function submit(e) {
    e.preventDefault()
    setError('')
    if (confirmText.trim().toLowerCase() !== 'delete my account') {
      return setError('Type the confirmation phrase exactly')
    }
    if (!isGoogle && !password) return setError('Enter your password')
    setLoading(true)
    try {
      await deleteAccount(password)
    } catch (err) {
      setError(err.message || 'Could not delete account')
      setLoading(false)
    }
  }

  return (
    <Modal onClose={onClose} title="Delete Account" icon={Trash2} iconColor="#f43f5e" maxWidth="sm">
      <form onSubmit={submit} className="px-5 py-4 space-y-3">
        <div className="bg-rose-500/5 border border-rose-500/20 rounded-lg p-3 flex gap-2.5">
          <AlertTriangle size={14} className="text-rose-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-rose-300/90 leading-relaxed">
            This permanently removes your account and every record we hold for you. There is no undo.
          </p>
        </div>
        {!isGoogle && (
          <div>
            <label className={labelCls}>Confirm with your password</label>
            <input autoFocus type="password" className={inputCls} value={password}
              onChange={e => setPassword(e.target.value)} placeholder="Current password" />
          </div>
        )}
        <div>
          <label className={labelCls}>
            Type <span className="text-rose-400 font-bold">delete my account</span> to confirm
          </label>
          <input className={inputCls} value={confirmText} onChange={e => setConfirmText(e.target.value)} placeholder="delete my account" />
        </div>
        {error && (
          <div className="text-rose-400 text-xs bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">{error}</div>
        )}
        <div className="flex gap-2 pt-1">
          <button type="submit" disabled={loading}
            className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50">
            {loading ? 'Deleting...' : 'Permanently delete'}
          </button>
          <button type="button" onClick={onClose} className="px-4 py-2 text-gray-400 hover:text-white text-sm">
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  )
}

const APP_VERSION = '2.0.0'

export default function Sidebar({ activeView, onNavigate, mobileOpen, onCloseMobile }) {
  const { user, serverMode, logout } = useAuth()
  const [showChangePwd, setShowChangePwd] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [showDelete, setShowDelete] = useState(false)

  function handleNav(id) {
    onNavigate(id)
    onCloseMobile()
  }

  return (
    <>
      {showChangePwd && <ChangePasswordModal onClose={() => setShowChangePwd(false)} />}
      {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}
      {showDelete && <DeleteAccountModal onClose={() => setShowDelete(false)} />}

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onCloseMobile}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden"
          />
        )}
      </AnimatePresence>

      <aside className={`fixed top-0 left-0 h-screen w-56 bg-bg-card border-r border-line-subtle flex flex-col z-40
        transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] lg:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
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

        <nav className="flex-1 py-3 px-3 overflow-y-auto">
          {navSections.map(section => (
            <div key={section.label} className="mb-3">
              <div className="text-[10px] font-bold uppercase tracking-wider text-gray-600 px-3 mb-1.5">
                {section.label}
              </div>
              {section.items.map(({ id, label, icon: Icon }) => {
                const active = activeView === id
                return (
                  <button
                    key={id}
                    onClick={() => handleNav(id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg mb-0.5 text-sm font-medium transition-all duration-150 ${
                      active
                        ? 'bg-violet-500/10 text-violet-200 border-l-2 border-violet-400 pl-[10px]'
                        : 'text-gray-400 hover:text-gray-200 hover:bg-white/[0.04] border-l-2 border-transparent'
                    }`}
                  >
                    <Icon size={15} className={active ? 'text-violet-300' : ''} />
                    {label}
                  </button>
                )
              })}
            </div>
          ))}
        </nav>

        {/* User card */}
        <div className="border-t border-line-subtle px-3 py-3 space-y-2">
          {user ? (
            <div className="bg-bg-elevated rounded-lg p-3 border border-line-subtle space-y-2">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowProfile(true)}
                  className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0 hover:ring-2 hover:ring-violet-400/40 transition-all"
                  title="Edit profile"
                >
                  {(user.displayName || user.username).charAt(0).toUpperCase()}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-white truncate">{user.displayName || user.username}</div>
                  <div className="text-[10px] text-gray-500 truncate">{user.email || '@' + user.username}</div>
                </div>
                <button onClick={logout} title="Sign out"
                  className="p-1.5 text-gray-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors flex-shrink-0">
                  <LogOut size={13} />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => setShowProfile(true)}
                  className="flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-[11px] text-gray-400 hover:text-violet-300 hover:bg-violet-500/10 transition-colors border border-line-subtle hover:border-violet-500/30"
                >
                  <User size={11} /> Profile
                </button>
                {!user.googleId && (
                  <button
                    onClick={() => setShowChangePwd(true)}
                    className="flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-[11px] text-gray-400 hover:text-violet-300 hover:bg-violet-500/10 transition-colors border border-line-subtle hover:border-violet-500/30"
                  >
                    <KeyRound size={11} /> Password
                  </button>
                )}
              </div>
              <button
                onClick={() => setShowDelete(true)}
                className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-[11px] text-gray-600 hover:text-rose-400 hover:bg-rose-500/5 transition-colors"
              >
                <Trash2 size={11} /> Delete account
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-[10px] text-gray-500 px-2">
              {serverMode ? <Database size={11} /> : <HardDrive size={11} className="text-amber-500" />}
              {serverMode ? 'Server mode' : 'Local storage'}
            </div>
          )}

          {/* Version + legal links */}
          <div className="px-2 pt-1 flex items-center justify-between text-[10px] text-gray-600">
            <span>v{APP_VERSION}</span>
            <div className="flex gap-2.5">
              <a href="/privacy" target="_blank" rel="noopener" className="hover:text-violet-300 transition-colors">Privacy</a>
              <a href="/terms" target="_blank" rel="noopener" className="hover:text-violet-300 transition-colors">Terms</a>
            </div>
          </div>
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
