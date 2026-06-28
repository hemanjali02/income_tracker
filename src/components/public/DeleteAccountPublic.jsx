import { useState } from 'react'
import { Trash2, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { api } from '../../api'
import { inputCls, labelCls } from '../../utils/styles'
import PublicLayout from './PublicLayout'

export default function DeleteAccountPublic() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmText, setConfirmText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setError('')
    if (confirmText.trim().toLowerCase() !== 'delete my account') {
      return setError('Please type the confirmation phrase exactly')
    }
    setLoading(true)
    try {
      await api.deleteAccountPublic(username.trim(), password)
      setDone(true)
    } catch (err) {
      setError(err.message || 'Could not delete account')
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <PublicLayout>
        <div className="max-w-md mx-auto bg-bg-card border border-emerald-500/30 rounded-2xl p-6 text-center">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={26} className="text-emerald-400" />
          </div>
          <h1 className="text-lg font-semibold text-white mb-2">Account deleted</h1>
          <p className="text-sm text-gray-400">Your account and every record we held for you has been permanently removed.</p>
        </div>
      </PublicLayout>
    )
  }

  return (
    <PublicLayout>
      <div className="max-w-md mx-auto">
        <div className="bg-bg-card border border-line-subtle rounded-2xl p-6">
          <div className="flex items-start gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center flex-shrink-0">
              <Trash2 size={18} className="text-rose-400" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-white">Delete your account</h1>
              <p className="text-sm text-gray-400 mt-1">
                This permanently removes your user record, every transaction, account, category, budget, investment, goal, and session. There is no recovery.
              </p>
            </div>
          </div>

          <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3 mb-5 flex gap-2.5">
            <AlertTriangle size={14} className="text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-300/90">
              If you are signed in, you can also delete from the sidebar inside the app. This page is for the case where you no longer have access.
            </p>
          </div>

          <form onSubmit={submit} className="space-y-3">
            <div>
              <label className={labelCls}>Username</label>
              <input autoFocus className={inputCls} value={username} onChange={e => setUsername(e.target.value)} placeholder="your_username" />
            </div>
            <div>
              <label className={labelCls}>Password</label>
              <input type="password" className={inputCls} value={password} onChange={e => setPassword(e.target.value)} placeholder="Current password" />
            </div>
            <div>
              <label className={labelCls}>
                Type <span className="text-rose-400 font-bold">delete my account</span> to confirm
              </label>
              <input className={inputCls} value={confirmText} onChange={e => setConfirmText(e.target.value)} placeholder="delete my account" />
            </div>
            {error && (
              <div className="text-rose-400 text-xs bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">{error}</div>
            )}
            <button type="submit" disabled={loading}
              className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-semibold rounded-lg text-sm transition-colors disabled:opacity-50">
              {loading ? 'Deleting...' : 'Permanently delete my account'}
            </button>
          </form>
        </div>
      </div>
    </PublicLayout>
  )
}
