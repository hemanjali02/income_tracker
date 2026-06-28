import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { api } from '../api'
import { useToast } from './ToastContext'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const { addToast } = useToast()
  const [user, setUser] = useState(null)
  const [serverMode, setServerMode] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    async function init() {
      const isServer = await api.isServerMode()
      setServerMode(isServer)
      if (isServer) {
        // Wipe any local data so it can't leak when server is reachable
        const keys = ['it_transactions', 'it_categories', 'it_accounts', 'it_budgets', 'it_investments']
        keys.forEach(k => localStorage.removeItem(k))
        if (api.hasToken()) {
          const me = await api.me()
          setUser(me)
        }
      }
      setReady(true)
    }
    init()
  }, [])

  const login = useCallback(async (username, password) => {
    const u = await api.login(username, password)
    setUser(u)
    addToast(`Welcome back, ${u.username}!`)
    return u
  }, [addToast])

  const register = useCallback(async (username, password) => {
    const u = await api.register(username, password)
    setUser(u)
    addToast(`Welcome, ${u.username}!`)
    return u
  }, [addToast])

  const logout = useCallback(async () => {
    await api.logout()
    setUser(null)
    addToast('Signed out', 'info')
  }, [addToast])

  const changePassword = useCallback(async (currentPassword, newPassword) => {
    await api.changePassword(currentPassword, newPassword)
    addToast('Password changed successfully')
  }, [addToast])

  const updateProfile = useCallback(async (data) => {
    const updated = await api.updateProfile(data)
    setUser(updated)
    addToast('Profile updated')
    return updated
  }, [addToast])

  const deleteAccount = useCallback(async (password) => {
    await api.deleteAccount(password)
    setUser(null)
    addToast('Account deleted', 'info')
  }, [addToast])

  const signInWithGoogle = useCallback(async (credential) => {
    const u = await api.googleSignIn(credential)
    setUser(u)
    addToast(`Welcome, ${u.displayName || u.username}!`)
    return u
  }, [addToast])

  const linkGoogle = useCallback(async (credential) => {
    const u = await api.linkGoogle(credential)
    setUser(u)
    addToast('Google account linked')
    return u
  }, [addToast])

  const unlinkGoogle = useCallback(async () => {
    const u = await api.unlinkGoogle()
    setUser(u)
    addToast('Google account unlinked', 'info')
    return u
  }, [addToast])

  // Re-pull the current user (used after a payment changes the plan).
  const refreshUser = useCallback(async (overrideUser) => {
    if (overrideUser) { setUser(overrideUser); return overrideUser }
    const me = await api.me()
    setUser(me)
    return me
  }, [])

  return (
    <AuthContext.Provider value={{
      user, serverMode, ready,
      login, register, logout, changePassword,
      updateProfile, deleteAccount, signInWithGoogle, linkGoogle, unlinkGoogle, refreshUser,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
