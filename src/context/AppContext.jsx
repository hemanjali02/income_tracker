import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { api } from '../api'
import { defaultCategories, defaultAccounts, sampleTransactions } from '../data'
import { generateId } from '../utils/helpers'
import { useToast } from './ToastContext'
import { useAuth } from './AuthContext'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const { addToast } = useToast()
  const { user, serverMode, ready: authReady } = useAuth()
  const [transactions, setTransactions] = useState([])
  const [categories, setCategories] = useState([])
  const [accounts, setAccounts] = useState([])
  const [budgets, setBudgets] = useState([])
  const [investments, setInvestments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      if (!authReady) return
      setLoading(true)
      try {
        if (serverMode && !user) {
          // Server mode but not logged in - leave empty, login screen will show
          setTransactions([])
          setCategories([])
          setAccounts([])
          setBudgets([])
          setInvestments([])
          return
        }

        const [txs, cats, accs, buds, invs] = await Promise.all([
          api.getTransactions(),
          api.getCategories(),
          api.getAccounts(),
          api.getBudgets(),
          api.getInvestments(),
        ])

        // In local mode, seed defaults if empty
        if (!serverMode) {
          setTransactions(txs.length ? txs : sampleTransactions)
          setCategories(cats.length ? cats : defaultCategories)
          setAccounts(accs.length ? accs : defaultAccounts)
        } else {
          setTransactions(txs)
          setCategories(cats)
          setAccounts(accs)
        }
        setBudgets(buds)
        setInvestments(invs)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [authReady, serverMode, user])

  // Transactions
  const addTransaction = useCallback(async (tx) => {
    setTransactions(prev => [tx, ...prev])
    try { await api.addTransaction(tx) } catch {}
    addToast('Transaction added')
  }, [addToast])

  const updateTransaction = useCallback(async (id, updates) => {
    setTransactions(prev => prev.map(t => t.id === id ? { ...updates } : t))
    try { await api.updateTransaction(id, updates) } catch {}
    addToast('Transaction updated')
  }, [addToast])

  const deleteTransaction = useCallback(async (id) => {
    let idsToDelete = [id]
    setTransactions(prev => {
      const tx = prev.find(t => t.id === id)
      if (tx?.type === 'transfer' && tx.transferId) {
        idsToDelete = prev.filter(t => t.transferId === tx.transferId).map(t => t.id)
        return prev.filter(t => t.transferId !== tx.transferId)
      }
      return prev.filter(t => t.id !== id)
    })
    try {
      if (idsToDelete.length > 1) await api.bulkDeleteTransactions(idsToDelete)
      else await api.deleteTransaction(id)
    } catch {}
    addToast('Transaction deleted', 'info')
  }, [addToast])

  const updateTransfer = useCallback(async (transferId, updates) => {
    let updatedLegs = []
    setTransactions(prev => {
      const next = prev.map(t =>
        t.transferId === transferId ? { ...t, ...updates } : t
      )
      updatedLegs = next.filter(t => t.transferId === transferId)
      return next
    })
    try {
      for (const leg of updatedLegs) {
        await api.updateTransaction(leg.id, leg)
      }
    } catch {}
    addToast('Transfer updated')
  }, [addToast])

  const addTransfer = useCallback(async ({ fromAccountId, toAccountId, amount, name, date, notes }) => {
    const transferId = generateId()
    const outTx = {
      id: generateId(),
      type: 'transfer',
      transferId,
      transferDirection: 'out',
      name,
      amount,
      accountId: fromAccountId,
      toAccountId,
      date,
      notes: notes || '',
      categoryId: '',
    }
    const inTx = {
      id: generateId(),
      type: 'transfer',
      transferId,
      transferDirection: 'in',
      name,
      amount,
      accountId: toAccountId,
      fromAccountId,
      date,
      notes: notes || '',
      categoryId: '',
    }
    setTransactions(prev => [inTx, outTx, ...prev])
    try { await api.addTransaction(outTx); await api.addTransaction(inTx) } catch {}
    addToast('Transfer recorded')
  }, [addToast])

  const bulkDeleteTransactions = useCallback(async (ids) => {
    const inputSet = new Set(ids)
    // Expand any transfer legs: deleting one leg must delete the paired leg too
    let allIds = ids
    setTransactions(prev => {
      const transferIds = new Set(
        prev.filter(t => inputSet.has(t.id) && t.type === 'transfer' && t.transferId).map(t => t.transferId)
      )
      allIds = prev
        .filter(t => inputSet.has(t.id) || (t.type === 'transfer' && transferIds.has(t.transferId)))
        .map(t => t.id)
      const fullSet = new Set(allIds)
      return prev.filter(t => !fullSet.has(t.id))
    })
    try { await api.bulkDeleteTransactions(allIds) } catch {}
    addToast(`Deleted ${ids.length} transaction${ids.length !== 1 ? 's' : ''}`, 'info')
  }, [addToast])

  // Categories
  const addCategory = useCallback(async (cat) => {
    setCategories(prev => [...prev, cat])
    try { await api.addCategory(cat) } catch {}
    addToast('Category added')
  }, [addToast])
  const updateCategory = useCallback(async (id, updates) => {
    setCategories(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c))
    try { await api.updateCategory(id, updates) } catch {}
    addToast('Category updated')
  }, [addToast])
  const deleteCategory = useCallback(async (id) => {
    setCategories(prev => prev.filter(c => c.id !== id))
    try { await api.deleteCategory(id) } catch {}
    addToast('Category deleted', 'info')
  }, [addToast])

  // Accounts
  const addAccount = useCallback(async (acc) => {
    setAccounts(prev => [...prev, acc])
    try { await api.addAccount(acc) } catch {}
    addToast('Account added')
  }, [addToast])
  const updateAccount = useCallback(async (id, updates) => {
    setAccounts(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a))
    try { await api.updateAccount(id, updates) } catch {}
    addToast('Account updated')
  }, [addToast])
  const deleteAccount = useCallback(async (id) => {
    setAccounts(prev => prev.filter(a => a.id !== id))
    try { await api.deleteAccount(id) } catch {}
    addToast('Account deleted', 'info')
  }, [addToast])

  // Budgets
  const saveBudget = useCallback(async (budget) => {
    setBudgets(prev => {
      const idx = prev.findIndex(b => b.categoryId === budget.categoryId && b.month === budget.month)
      if (idx !== -1) {
        const next = [...prev]; next[idx] = { ...next[idx], ...budget }; return next
      }
      return [...prev, budget]
    })
    try { await api.saveBudget(budget) } catch {}
    addToast('Budget saved')
  }, [addToast])
  const deleteBudget = useCallback(async (id) => {
    setBudgets(prev => prev.filter(b => b.id !== id))
    try { await api.deleteBudget(id) } catch {}
  }, [])

  // Investments
  const addInvestment = useCallback(async (inv) => {
    setInvestments(prev => [...prev, inv])
    try { await api.addInvestment(inv) } catch {}
    addToast('Investment added')
  }, [addToast])
  const updateInvestment = useCallback(async (id, updates) => {
    setInvestments(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i))
    try { await api.updateInvestment(id, updates) } catch {}
    addToast('Investment updated')
  }, [addToast])
  const deleteInvestment = useCallback(async (id) => {
    setInvestments(prev => prev.filter(i => i.id !== id))
    try { await api.deleteInvestment(id) } catch {}
    addToast('Investment deleted', 'info')
  }, [addToast])

  if (loading || !authReady) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-violet-400 text-sm animate-pulse">Loading…</div>
      </div>
    )
  }

  return (
    <AppContext.Provider value={{
      transactions, categories, accounts, budgets, investments,
      addTransaction, updateTransaction, deleteTransaction, bulkDeleteTransactions, addTransfer, updateTransfer,
      addCategory, updateCategory, deleteCategory,
      addAccount, updateAccount, deleteAccount,
      saveBudget, deleteBudget,
      addInvestment, updateInvestment, deleteInvestment,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
