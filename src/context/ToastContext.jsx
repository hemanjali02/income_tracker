import { createContext, useContext, useState, useCallback, useRef } from 'react'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const idRef = useRef(0)
  const timers = useRef({})

  // addToast(message, type?, options?)
  // type: 'success' | 'error' | 'info'
  // options: { duration?: number, action?: { label: string, onClick: () => void } }
  const addToast = useCallback((message, type = 'success', options = {}) => {
    const id = ++idRef.current
    const duration = options.duration ?? 3000
    setToasts(prev => [...prev, { id, message, type, action: options.action ?? null }])
    timers.current[id] = setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
      delete timers.current[id]
    }, duration)
    return id
  }, [])

  const removeToast = useCallback((id) => {
    clearTimeout(timers.current[id])
    delete timers.current[id]
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
