import { useState } from 'react'
import { GoogleLogin } from '@react-oauth/google'
import { TrendingUp, Lock, User as UserIcon, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const HAS_GOOGLE = !!import.meta.env.VITE_GOOGLE_CLIENT_ID

const inputCls = `w-full bg-bg-input border border-line-subtle rounded-lg pl-10 pr-10 py-2.5 text-sm text-white
  placeholder-gray-500 focus:outline-none focus:border-violet-500 focus:bg-bg-elevated transition-colors`

function PasswordStrength({ password }) {
  const checks = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ]
  const score = checks.filter(Boolean).length
  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong']
  const colors = ['', 'bg-rose-500', 'bg-amber-500', 'bg-blue-500', 'bg-emerald-500']
  const textColors = ['', 'text-rose-400', 'text-amber-400', 'text-blue-400', 'text-emerald-400']

  if (!password) return null
  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= score ? colors[score] : 'bg-line'}`} />
        ))}
      </div>
      <div className="flex justify-between items-center">
        <span className={`text-[11px] font-medium ${textColors[score]}`}>{labels[score]}</span>
        <span className="text-[11px] text-gray-600">
          {!checks[0] && '8+ chars · '}
          {!checks[1] && 'uppercase · '}
          {!checks[2] && 'number · '}
          {!checks[3] && 'symbol'}
        </span>
      </div>
    </div>
  )
}

export default function Login() {
  const { login, register, signInWithGoogle } = useAuth()
  const [mode, setMode] = useState('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function validateRegister() {
    if (username.trim().length < 2) return 'Username must be at least 2 characters'
    if (password.length < 8) return 'Password must be at least 8 characters'
    if (!/[0-9]/.test(password)) return 'Password must contain at least one number'
    if (!/[A-Za-z]/.test(password)) return 'Password must contain at least one letter'
    return null
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (mode === 'register') {
      const err = validateRegister()
      if (err) return setError(err)
    }

    setLoading(true)
    try {
      if (mode === 'login') await login(username.trim(), password)
      else await register(username.trim(), password)
    } catch (err) {
      setError(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center mb-4 shadow-xl shadow-violet-900/40">
            <TrendingUp size={26} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold gradient-text">Income Tracker</h1>
          <p className="text-sm text-gray-500 mt-1">
            {mode === 'login' ? 'Welcome back' : 'Create your account'}
          </p>
        </div>

        {/* Form */}
        <div className="glass rounded-2xl p-6 shadow-2xl">
          {/* Google sign-in */}
          {HAS_GOOGLE && (
            <>
              <div className="flex justify-center mb-4">
                <GoogleLogin
                  theme="filled_black"
                  shape="pill"
                  text={mode === 'login' ? 'signin_with' : 'signup_with'}
                  size="large"
                  onSuccess={async (resp) => {
                    setError('')
                    try { await signInWithGoogle(resp.credential) }
                    catch (err) { setError(err.message || 'Google sign in failed') }
                  }}
                  onError={() => setError('Google sign in failed')}
                />
              </div>
              <div className="flex items-center gap-3 mb-4 text-[10px] text-gray-600 uppercase tracking-wider">
                <div className="h-px bg-line-subtle flex-1" />
                <span>or with username</span>
                <div className="h-px bg-line-subtle flex-1" />
              </div>
            </>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Username</label>
              <div className="relative">
                <UserIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  className={inputCls}
                  type="text"
                  autoFocus
                  autoComplete="username"
                  placeholder="your_username"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Password</label>
              <div className="relative">
                <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  className={inputCls}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              {mode === 'register' && <PasswordStrength password={password} />}
            </div>

            {error && (
              <div className="text-red-400 text-xs bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-2.5 text-white font-semibold rounded-lg text-sm disabled:opacity-50"
            >
              {loading
                ? <span className="flex items-center justify-center gap-2"><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />{mode === 'login' ? 'Signing in…' : 'Creating…'}</span>
                : mode === 'login' ? 'Sign In' : 'Create Account'
              }
            </button>
          </form>

          <div className="mt-5 pt-5 border-t border-line-subtle text-center">
            <button
              onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); setPassword('') }}
              className="text-xs text-gray-500 hover:text-violet-400 transition-colors"
            >
              {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
              <span className="text-violet-400 font-medium">
                {mode === 'login' ? 'Sign up' : 'Sign in'}
              </span>
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-gray-600 mt-6">
          Your data is stored privately on your server
        </p>
      </div>
    </div>
  )
}
