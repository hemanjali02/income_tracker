export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)
}

// Short form for chart axes and compact displays — Indian scale
export function formatCompact(amount) {
  const abs = Math.abs(amount)
  const sign = amount < 0 ? '−' : ''
  if (abs >= 1_00_00_000) return `${sign}₹${(abs / 1_00_00_000).toFixed(1).replace(/\.0$/, '')}Cr`
  if (abs >= 1_00_000)    return `${sign}₹${(abs / 1_00_000).toFixed(1).replace(/\.0$/, '')}L`
  if (abs >= 1_000)       return `${sign}₹${(abs / 1_000).toFixed(0)}K`
  return `${sign}₹${abs}`
}

export function formatDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

export function formatDateFull(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function getMonthKey(dateStr) {
  return dateStr.slice(0, 7)
}

export function getMonthLabel(monthKey) {
  const [y, m] = monthKey.split('-')
  const date = new Date(parseInt(y), parseInt(m) - 1, 1)
  return date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
}

export function getMonthLabelShort(monthKey) {
  const [y, m] = monthKey.split('-')
  const date = new Date(parseInt(y), parseInt(m) - 1, 1)
  return date.toLocaleDateString('en-IN', { month: 'short' })
}

export function getCurrentMonthKey() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export function groupByMonth(transactions) {
  const groups = {}
  for (const tx of transactions) {
    const key = getMonthKey(tx.date)
    if (!groups[key]) groups[key] = []
    groups[key].push(tx)
  }
  return groups
}

export function getMonthlyTotals(transactions) {
  const groups = groupByMonth(transactions)
  return Object.entries(groups)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, txs]) => ({
      month: getMonthLabelShort(key),
      key,
      income: txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0),
      expense: txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
    }))
}

export function getCategoryTotals(transactions, categories) {
  const map = {}
  for (const tx of transactions) {
    if (tx.type !== 'expense') continue
    if (!map[tx.categoryId]) map[tx.categoryId] = 0
    map[tx.categoryId] += tx.amount
  }
  return Object.entries(map)
    .map(([id, value]) => {
      const cat = categories.find(c => c.id === id)
      return { id, name: cat?.name || id, value, color: cat?.color || '#6b7280', icon: cat?.icon || '📦' }
    })
    .sort((a, b) => b.value - a.value)
}

export function getDailyTotals(transactions, monthKey) {
  const filtered = transactions.filter(t => getMonthKey(t.date) === monthKey && t.type !== 'transfer')
  const map = {}
  for (const tx of filtered) {
    const day = tx.date.slice(8, 10)
    if (!map[day]) map[day] = { income: 0, expense: 0 }
    map[day][tx.type] += tx.amount
  }
  return Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, vals]) => ({ day: parseInt(day), ...vals }))
}

// Credit card billing cycle helpers
// Given today's date and a statement-generation day, returns { start, end, daysLeft, label }
// for the cycle the user is *currently inside*.
export function getCurrentCreditCycle(cycleDay, today = new Date()) {
  if (!cycleDay) return null
  const day = today.getDate()
  const y = today.getFullYear()
  const m = today.getMonth()
  let start, end
  if (day >= cycleDay) {
    // current cycle started this month on cycleDay, ends day before next month's cycleDay
    start = new Date(y, m, cycleDay)
    end   = new Date(y, m + 1, cycleDay - 1)
  } else {
    // current cycle started last month, ends day before this month's cycleDay
    start = new Date(y, m - 1, cycleDay)
    end   = new Date(y, m, cycleDay - 1)
  }
  const daysLeft = Math.ceil((end - today) / (1000 * 60 * 60 * 24))
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
    daysLeft,
    label: `${start.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} – ${end.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`,
  }
}

// Spend in current cycle for a credit-card account (expenses only, transfers excluded)
export function getCreditCycleSpend(transactions, account) {
  if (!account?.cycleDay) return 0
  const cycle = getCurrentCreditCycle(account.cycleDay)
  if (!cycle) return 0
  return transactions
    .filter(t => t.accountId === account.id && t.type === 'expense'
      && t.date >= cycle.start && t.date <= cycle.end)
    .reduce((s, t) => s + t.amount, 0)
}

// Pass the account object to include opening balance, or just the ID for tx-only sum
export function getAccountBalance(transactions, accountOrId, openingBalance = 0) {
  const id = typeof accountOrId === 'object' && accountOrId !== null ? accountOrId.id : accountOrId
  const opening = typeof accountOrId === 'object' && accountOrId !== null
    ? (accountOrId.openingBalance || 0)
    : openingBalance
  return opening + transactions
    .filter(t => t.accountId === id)
    .reduce((sum, t) => {
      if (t.type === 'income') return sum + t.amount
      if (t.type === 'expense') return sum - t.amount
      if (t.type === 'transfer') return t.transferDirection === 'in' ? sum + t.amount : sum - t.amount
      return sum
    }, 0)
}

// Compute the next due date for a recurring item
export function getNextDueDate(recurring, fromDate = new Date()) {
  if (!recurring.active) return null
  const start = new Date(recurring.startDate)
  const last = recurring.lastGeneratedDate ? new Date(recurring.lastGeneratedDate) : null
  const from = last && last > start ? last : start

  const next = new Date(from)
  if (recurring.frequency === 'weekly') {
    // Next 7 days from last gen or start
    next.setDate(next.getDate() + (last ? 7 : 0))
  } else if (recurring.frequency === 'monthly') {
    if (last) next.setMonth(next.getMonth() + 1)
    if (recurring.dayOfMonth) next.setDate(Math.min(recurring.dayOfMonth, daysInMonth(next.getFullYear(), next.getMonth())))
  } else if (recurring.frequency === 'yearly') {
    if (last) next.setFullYear(next.getFullYear() + 1)
    if (recurring.monthOfYear) next.setMonth(recurring.monthOfYear - 1)
    if (recurring.dayOfMonth) next.setDate(Math.min(recurring.dayOfMonth, daysInMonth(next.getFullYear(), next.getMonth())))
  }
  return next.toISOString().slice(0, 10)
}

function daysInMonth(year, monthIdx) {
  return new Date(year, monthIdx + 1, 0).getDate()
}

export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

export function exportToCSV(transactions, categories, accounts) {
  const headers = ['Date', 'Type', 'Name', 'Amount', 'Category', 'Account', 'Notes']
  const rows = transactions.map(tx => {
    const cat = categories.find(c => c.id === tx.categoryId)
    const acc = accounts.find(a => a.id === tx.accountId)
    return [
      tx.date,
      tx.type,
      `"${tx.name.replace(/"/g, '""')}"`,
      tx.amount,
      cat?.name || tx.categoryId,
      acc?.name || tx.accountId,
      `"${(tx.notes || '').replace(/"/g, '""')}"`,
    ].join(',')
  })
  return [headers.join(','), ...rows].join('\n')
}

export function parseCSV(text) {
  const lines = text.trim().split('\n')
  if (lines.length < 2) return []
  const rows = []
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].match(/(".*?"|[^,]+)/g) || []
    const clean = parts.map(p => p.replace(/^"|"$/g, '').replace(/""/g, '"').trim())
    if (clean.length >= 4) {
      rows.push({
        date: clean[0],
        type: clean[1] || 'expense',
        name: clean[2],
        amount: parseFloat(clean[3]) || 0,
        categoryName: clean[4] || '',
        accountName: clean[5] || '',
        notes: clean[6] || '',
      })
    }
  }
  return rows
}
