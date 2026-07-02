const BASE = '/api'
const TOKEN_KEY = 'it_token'

// null = unchecked, true = up, false = down (retried after RETRY_MS)
let serverAvailable = null
let lastFailTime = 0
const RETRY_MS = 15000 // retry server check after 15s if it failed

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
  // Return cached true immediately
  if (serverAvailable === true) return true
  // If recently failed, don't retry yet
  if (serverAvailable === false && Date.now() - lastFailTime < RETRY_MS) return false
  try {
    // 10s timeout — covers Vercel cold starts (typically 3–8s)
    const res = await fetch(`${BASE}/health`, { signal: AbortSignal.timeout(10000) })
    serverAvailable = res.ok
    if (!res.ok) lastFailTime = Date.now()
  } catch {
    serverAvailable = false
    lastFailTime = Date.now()
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
const recs = resource('recurring', 'it_recurring')
const gls  = resource('goals', 'it_goals')
const rcvs = resource('receivables', 'it_receivables')
const nws  = resource('networthsnapshots', 'it_networthsnapshots')
const emis = resource('emis', 'it_emis')

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

  async changePassword(currentPassword, newPassword) {
    return apiCall('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    })
  },

  async updateProfile(data) {
    const res = await apiCall('/auth/update-profile', { method: 'POST', body: JSON.stringify(data) })
    return res.user
  },

  async deleteAccount(password) {
    await apiCall('/auth/delete-account', { method: 'POST', body: JSON.stringify({ password }) })
    setToken(null)
  },

  async deleteAccountPublic(username, password) {
    await apiCall('/auth/delete-account-public', { method: 'POST', body: JSON.stringify({ username, password }) })
  },

  async googleSignIn(credential) {
    const res = await apiCall('/auth/google', { method: 'POST', body: JSON.stringify({ credential }) })
    setToken(res.token)
    return res.user
  },

  async linkGoogle(credential) {
    const res = await apiCall('/auth/link-google', { method: 'POST', body: JSON.stringify({ credential }) })
    return res.user
  },

  async unlinkGoogle() {
    const res = await apiCall('/auth/unlink-google', { method: 'POST' })
    return res.user
  },

  // Billing
  async billingConfig() {
    try { return await apiCall('/billing/config') }
    catch { return { billingEnabled: false, keyId: null, currency: 'INR', prices: null } }
  },
  async billingSubscribe(interval) {
    return apiCall('/billing/subscribe', { method: 'POST', body: JSON.stringify({ interval }) })
  },
  async billingVerifySubscription(payload) {
    return apiCall('/billing/verify-subscription', { method: 'POST', body: JSON.stringify(payload) })
  },
  async billingOrder() {
    return apiCall('/billing/order', { method: 'POST', body: JSON.stringify({ product: 'lifetime' }) })
  },
  async billingVerifyOrder(payload) {
    return apiCall('/billing/verify-order', { method: 'POST', body: JSON.stringify(payload) })
  },
  async billingCancel() {
    return apiCall('/billing/cancel', { method: 'POST' })
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

  // Recurring
  getRecurring: () => recs.list(),
  addRecurring: (r) => recs.create(r),
  updateRecurring: (id, data) => recs.update(id, data),
  deleteRecurring: (id) => recs.remove(id),

  // Goals
  getGoals: () => gls.list(),
  addGoal: (g) => gls.create(g),
  updateGoal: (id, data) => gls.update(id, data),
  deleteGoal: (id) => gls.remove(id),

  // Receivables
  getReceivables: () => rcvs.list(),
  addReceivable: (r) => rcvs.create(r),
  updateReceivable: (id, data) => rcvs.update(id, data),
  deleteReceivable: (id) => rcvs.remove(id),

  // Net Worth Snapshots
  getNetWorthSnapshots: () => nws.list(),
  addNetWorthSnapshot: (s) => nws.create(s),

  // EMIs
  getEmis: () => emis.list(),
  addEmi: (e) => emis.create(e),
  updateEmi: (id, data) => emis.update(id, data),
  deleteEmi: (id) => emis.remove(id),
}
