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
      if (isServer && api.hasToken()) {
        const me = await api.me()
        setUser(me)
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

  return (
    <AuthContext.Provider value={{ user, serverMode, ready, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
