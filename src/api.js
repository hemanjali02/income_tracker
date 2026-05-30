const BASE = '/api'
const TOKEN_KEY = 'it_token'

let serverAvailable = null

function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

function authHeaders() {
  const token = getToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function checkServer() {
  if (serverAvailable !== null) return serverAvailable
  try {
    const res = await fetch(`${BASE}/health`, { signal: AbortSignal.timeout(2000) })
    serverAvailable = res.ok
  } catch {
    serverAvailable = false
  }
  return serverAvailable
}

function loadLocal(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function saveLocal(key, data) {
  localStorage.setItem(key, JSON.stringify(data))
}

async function apiCall(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
      ...(opts.headers || {}),
    },
  })
  if (res.status === 401) {
    setToken(null)
    throw new Error('UNAUTHORIZED')
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(err.error || 'Request failed')
  }
  if (res.status === 204) return null
  return res.json()
}

// Resource-style helpers
function resource(name, localKey) {
  return {
    async list() {
      if (await checkServer() && getToken()) {
        try { return await apiCall(`/${name}`) } catch { return loadLocal(localKey, []) }
      }
      return loadLocal(localKey, [])
    },
    async create(item) {
      if (await checkServer() && getToken()) {
        try { return await apiCall(`/${name}`, { method: 'POST', body: JSON.stringify(item) }) } catch { /* fall through */ }
      }
      const list = loadLocal(localKey, [])
      if (name === 'transactions') list.unshift(item)
      else list.push(item)
      saveLocal(localKey, list)
      return item
    },
    async update(id, data) {
      if (await checkServer() && getToken()) {
        try { return await apiCall(`/${name}/${id}`, { method: 'PUT', body: JSON.stringify(data) }) } catch { /* fall through */ }
      }
      const list = loadLocal(localKey, [])
      const idx = list.findIndex(x => x.id === id)
      if (idx !== -1) list[idx] = { ...list[idx], ...data }
      saveLocal(localKey, list)
      return list[idx]
    },
    async remove(id) {
      if (await checkServer() && getToken()) {
        try { await apiCall(`/${name}/${id}`, { method: 'DELETE' }); return } catch { /* fall through */ }
      }
      const list = loadLocal(localKey, [])
      saveLocal(localKey, list.filter(x => x.id !== id))
    },
  }
}

const txs = resource('transactions', 'it_transactions')
const cats = resource('categories', 'it_categories')
const accs = resource('accounts', 'it_accounts')
const buds = resource('budgets', 'it_budgets')
const invs = resource('investments', 'it_investments')

export const api = {
  async isServerMode() { return checkServer() },

  // Auth
  async register(username, password) {
    const res = await apiCall('/auth/register', { method: 'POST', body: JSON.stringify({ username, password }) })
    setToken(res.token)
    return res.user
  },

  async login(username, password) {
    const res = await apiCall('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) })
    setToken(res.token)
    return res.user
  },

  async me() {
    if (!getToken()) return null
    try {
      const res = await apiCall('/auth/me')
      return res.user
    } catch {
      return null
    }
  },

  async logout() {
    try { await apiCall('/auth/logout', { method: 'POST' }) } catch { /* ignore */ }
    setToken(null)
  },

  hasToken() { return !!getToken() },

  // Transactions
  getTransactions: () => txs.list(),
  addTransaction: (tx) => txs.create(tx),
  updateTransaction: (id, data) => txs.update(id, data),
  deleteTransaction: (id) => txs.remove(id),

  async bulkDeleteTransactions(ids) {
    if (await checkServer() && getToken()) {
      try { await apiCall('/transactions/bulk-delete', { method: 'POST', body: JSON.stringify({ ids }) }); return } catch { /* fall through */ }
    }
    const list = loadLocal('it_transactions', [])
    const set = new Set(ids)
    saveLocal('it_transactions', list.filter(t => !set.has(t.id)))
  },

  // Categories
  getCategories: () => cats.list(),
  addCategory: (c) => cats.create(c),
  updateCategory: (id, data) => cats.update(id, data),
  deleteCategory: (id) => cats.remove(id),

  // Accounts
  getAccounts: () => accs.list(),
  addAccount: (a) => accs.create(a),
  updateAccount: (id, data) => accs.update(id, data),
  deleteAccount: (id) => accs.remove(id),

  // Budgets
  getBudgets: () => buds.list(),
  async saveBudget(budget) {
    if (await checkServer() && getToken()) {
      try { return await apiCall('/budgets', { method: 'POST', body: JSON.stringify(budget) }) } catch { /* fall through */ }
    }
    const list = loadLocal('it_budgets', [])
    const idx = list.findIndex(b => b.categoryId === budget.categoryId && b.month === budget.month)
    if (idx !== -1) list[idx] = { ...list[idx], ...budget }
    else list.push(budget)
    saveLocal('it_budgets', list)
    return budget
  },
  deleteBudget: (id) => buds.remove(id),

  // Investments
  getInvestments: () => invs.list(),
  addInvestment: (i) => invs.create(i),
  updateInvestment: (id, data) => invs.update(id, data),
  deleteInvestment: (id) => invs.remove(id),
}
