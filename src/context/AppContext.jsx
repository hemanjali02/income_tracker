import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { api } from '../api'
import { defaultCategories, defaultAccounts, sampleTransactions } from '../data'
import { generateId } from '../utils/helpers'
import { useToast } from './ToastContext'
import { useAuth } from './AuthContext'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const { addToast, removeToast } = useToast()
  const { user, serverMode, ready: authReady } = useAuth()
  const [transactions, setTransactions] = useState([])
  const [categories, setCategories] = useState([])
  const [accounts, setAccounts] = useState([])
  const [budgets, setBudgets] = useState([])
  const [investments, setInvestments] = useState([])
  const [recurring, setRecurring] = useState([])
  const [goals, setGoals] = useState([])
  const [receivables, setReceivables] = useState([])
  const [netWorthSnapshots, setNetWorthSnapshots] = useState([])
  const [loading, setLoading] = useState(true)
  const undoTimers = useRef({})

  useEffect(() => {
    async function load() {
      if (!authReady) return
      setLoading(true)
      try {
        if (serverMode && !user) {
          setTransactions([]); setCategories([]); setAccounts([])
          setBudgets([]); setInvestments([])
          setRecurring([]); setGoals([]); setReceivables([]); setNetWorthSnapshots([])
          return
        }
        const [txs, cats, accs, buds, invs, recs, gls, rcvs, nws] = await Promise.all([
          api.getTransactions(), api.getCategories(), api.getAccounts(),
          api.getBudgets(), api.getInvestments(),
          api.getRecurring(), api.getGoals(), api.getReceivables(), api.getNetWorthSnapshots(),
        ])
        if (!serverMode) {
          setTransactions(txs.length ? txs : sampleTransactions)
          setCategories(cats.length ? cats : defaultCategories)
          setAccounts(accs.length ? accs : defaultAccounts)
        } else {
          setTransactions(txs); setCategories(cats); setAccounts(accs)
        }
        setBudgets(buds); setInvestments(invs)
        setRecurring(recs); setGoals(gls); setReceivables(rcvs); setNetWorthSnapshots(nws)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [authReady, serverMode, user])

  function apiErr() {
    addToast('Sync failed — data saved locally only', 'error')
  }

  // Transactions
  const addTransaction = useCallback(async (tx) => {
    setTransactions(prev => [tx, ...prev])
    try { await api.addTransaction(tx) } catch { apiErr() }
    addToast('Transaction added')
  }, [addToast])

  const updateTransaction = useCallback(async (id, updates) => {
    setTransactions(prev => prev.map(t => t.id === id ? { ...updates } : t))
    try { await api.updateTransaction(id, updates) } catch { apiErr() }
    addToast('Transaction updated')
  }, [addToast])

  const deleteTransaction = useCallback(async (id) => {
    // Optimistically remove from UI, allow undo for 5 seconds
    let deletedTx = null
    let deletedTransferPair = null

    setTransactions(prev => {
      const tx = prev.find(t => t.id === id)
      if (!tx) return prev
      if (tx.type === 'transfer' && tx.transferId) {
        deletedTransferPair = prev.filter(t => t.transferId === tx.transferId)
        return prev.filter(t => t.transferId !== tx.transferId)
      }
      deletedTx = tx
      return prev.filter(t => t.id !== id)
    })

    const toastId = addToast(
      deletedTransferPair ? 'Transfer deleted' : 'Transaction deleted',
      'info',
      {
        duration: 5000,
        action: {
          label: 'Undo',
          onClick: () => {
            clearTimeout(undoTimers.current[toastId])
            if (deletedTransferPair) {
              setTransactions(prev => [...deletedTransferPair, ...prev])
            } else if (deletedTx) {
              setTransactions(prev => [deletedTx, ...prev])
            }
          },
        },
      }
    )

    undoTimers.current[toastId] = setTimeout(async () => {
      delete undoTimers.current[toastId]
      // Commit deletion to API after undo window
      try {
        if (deletedTransferPair) {
          const ids = deletedTransferPair.map(t => t.id)
          await api.bulkDeleteTransactions(ids)
        } else if (deletedTx) {
          await api.deleteTransaction(deletedTx.id)
        }
      } catch { apiErr() }
    }, 5000)
  }, [addToast])

  const updateTransfer = useCallback(async (transferId, updates) => {
    let updatedLegs = []
    setTransactions(prev => {
      const next = prev.map(t => t.transferId === transferId ? { ...t, ...updates } : t)
      updatedLegs = next.filter(t => t.transferId === transferId)
      return next
    })
    try {
      for (const leg of updatedLegs) await api.updateTransaction(leg.id, leg)
    } catch { apiErr() }
    addToast('Transfer updated')
  }, [addToast])

  const addTransfer = useCallback(async ({ fromAccountId, toAccountId, amount, name, date, notes }) => {
    const transferId = generateId()
    const outTx = { id: generateId(), type: 'transfer', transferId, transferDirection: 'out', name, amount, accountId: fromAccountId, toAccountId, date, notes: notes || '', categoryId: '' }
    const inTx  = { id: generateId(), type: 'transfer', transferId, transferDirection: 'in',  name, amount, accountId: toAccountId, fromAccountId, date, notes: notes || '', categoryId: '' }
    setTransactions(prev => [inTx, outTx, ...prev])
    try { await api.addTransaction(outTx); await api.addTransaction(inTx) } catch { apiErr() }
    addToast('Transfer recorded')
  }, [addToast])

  const bulkDeleteTransactions = useCallback(async (ids) => {
    const inputSet = new Set(ids)
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
    try { await api.bulkDeleteTransactions(allIds) } catch { apiErr() }
    addToast(`Deleted ${ids.length} transaction${ids.length !== 1 ? 's' : ''}`, 'info')
  }, [addToast])

  // Categories
  const addCategory = useCallback(async (cat) => {
    setCategories(prev => [...prev, cat])
    try { await api.addCategory(cat) } catch { apiErr() }
    addToast('Category added')
  }, [addToast])
  const updateCategory = useCallback(async (id, updates) => {
    setCategories(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c))
    try { await api.updateCategory(id, updates) } catch { apiErr() }
    addToast('Category updated')
  }, [addToast])
  const deleteCategory = useCallback(async (id) => {
    setCategories(prev => prev.filter(c => c.id !== id))
    try { await api.deleteCategory(id) } catch { apiErr() }
    addToast('Category deleted', 'info')
  }, [addToast])

  // Accounts
  const addAccount = useCallback(async (acc) => {
    setAccounts(prev => [...prev, acc])
    try { await api.addAccount(acc) } catch { apiErr() }
    addToast('Account added')
  }, [addToast])
  const updateAccount = useCallback(async (id, updates) => {
    setAccounts(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a))
    try { await api.updateAccount(id, updates) } catch { apiErr() }
    addToast('Account updated')
  }, [addToast])
  const deleteAccount = useCallback(async (id) => {
    setAccounts(prev => prev.filter(a => a.id !== id))
    try { await api.deleteAccount(id) } catch { apiErr() }
    addToast('Account deleted', 'info')
  }, [addToast])

  // Budgets
  const saveBudget = useCallback(async (budget) => {
    setBudgets(prev => {
      const idx = prev.findIndex(b => b.categoryId === budget.categoryId && b.month === budget.month)
      if (idx !== -1) { const next = [...prev]; next[idx] = { ...next[idx], ...budget }; return next }
      return [...prev, budget]
    })
    try { await api.saveBudget(budget) } catch { apiErr() }
    addToast('Budget saved')
  }, [addToast])
  const deleteBudget = useCallback(async (id) => {
    setBudgets(prev => prev.filter(b => b.id !== id))
    try { await api.deleteBudget(id) } catch {}
  }, [])

  // Recurring transactions
  const addRecurring = useCallback(async (r) => {
    setRecurring(prev => [...prev, r])
    try { await api.addRecurring(r) } catch { apiErr() }
    addToast('Recurring item added')
  }, [addToast])
  const updateRecurring = useCallback(async (id, updates) => {
    setRecurring(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r))
    try { await api.updateRecurring(id, updates) } catch { apiErr() }
    addToast('Recurring updated')
  }, [addToast])
  const deleteRecurring = useCallback(async (id) => {
    setRecurring(prev => prev.filter(r => r.id !== id))
    try { await api.deleteRecurring(id) } catch { apiErr() }
    addToast('Recurring deleted', 'info')
  }, [addToast])

  // Goals
  const addGoal = useCallback(async (g) => {
    setGoals(prev => [...prev, g])
    try { await api.addGoal(g) } catch { apiErr() }
    addToast('Goal created')
  }, [addToast])
  const updateGoal = useCallback(async (id, updates) => {
    setGoals(prev => prev.map(g => g.id === id ? { ...g, ...updates } : g))
    try { await api.updateGoal(id, updates) } catch { apiErr() }
    addToast('Goal updated')
  }, [addToast])
  const deleteGoal = useCallback(async (id) => {
    setGoals(prev => prev.filter(g => g.id !== id))
    try { await api.deleteGoal(id) } catch { apiErr() }
    addToast('Goal deleted', 'info')
  }, [addToast])

  // Receivables
  const addReceivable = useCallback(async (r) => {
    setReceivables(prev => [r, ...prev])
    try { await api.addReceivable(r) } catch { apiErr() }
    addToast('Receivable added')
  }, [addToast])
  const updateReceivable = useCallback(async (id, updates) => {
    setReceivables(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r))
    try { await api.updateReceivable(id, updates) } catch { apiErr() }
  }, [addToast])
  const deleteReceivable = useCallback(async (id) => {
    setReceivables(prev => prev.filter(r => r.id !== id))
    try { await api.deleteReceivable(id) } catch { apiErr() }
    addToast('Receivable deleted', 'info')
  }, [addToast])

  // When marking a receivable received, create an income transaction
  const markReceivableReceived = useCallback(async (receivable, accountId, categoryId) => {
    const txId = generateId()
    const tx = {
      id: txId,
      type: 'income',
      name: `Received from ${receivable.name}`,
      amount: receivable.amount,
      categoryId,
      accountId,
      date: new Date().toISOString().slice(0, 10),
      notes: receivable.notes ? `Receivable: ${receivable.notes}` : 'Receivable collected',
    }
    setTransactions(prev => [tx, ...prev])
    const updates = {
      status: 'received',
      receivedDate: tx.date,
      receivedAccountId: accountId,
      linkedTransactionId: txId,
    }
    setReceivables(prev => prev.map(r => r.id === receivable.id ? { ...r, ...updates } : r))
    try {
      await api.addTransaction(tx)
      await api.updateReceivable(receivable.id, updates)
    } catch { apiErr() }
    addToast(`Marked received — added to account`)
  }, [addToast])

  // Net worth snapshot helper
  const addNetWorthSnapshot = useCallback(async (snap) => {
    setNetWorthSnapshots(prev => {
      // Replace if same date already exists
      const idx = prev.findIndex(s => s.date === snap.date)
      if (idx !== -1) {
        const next = [...prev]; next[idx] = { ...next[idx], ...snap }; return next
      }
      return [...prev, snap]
    })
    try { await api.addNetWorthSnapshot(snap) } catch {}
  }, [])

  // Investments
  const addInvestment = useCallback(async (inv) => {
    setInvestments(prev => [...prev, inv])
    try { await api.addInvestment(inv) } catch { apiErr() }
    addToast('Investment added')
  }, [addToast])
  const updateInvestment = useCallback(async (id, updates) => {
    setInvestments(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i))
    try { await api.updateInvestment(id, updates) } catch { apiErr() }
    addToast('Investment updated')
  }, [addToast])
  const deleteInvestment = useCallback(async (id) => {
    setInvestments(prev => prev.filter(i => i.id !== id))
    try { await api.deleteInvestment(id) } catch { apiErr() }
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
      recurring, goals, receivables, netWorthSnapshots,
      addTransaction, updateTransaction, deleteTransaction, bulkDeleteTransactions, addTransfer, updateTransfer,
      addCategory, updateCategory, deleteCategory,
      addAccount, updateAccount, deleteAccount,
      saveBudget, deleteBudget,
      addInvestment, updateInvestment, deleteInvestment,
      addRecurring, updateRecurring, deleteRecurring,
      addGoal, updateGoal, deleteGoal,
      addReceivable, updateReceivable, deleteReceivable, markReceivableReceived,
      addNetWorthSnapshot,
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
