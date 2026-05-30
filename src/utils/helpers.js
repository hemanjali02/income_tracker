export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)
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

export function getAccountBalance(transactions, accountId) {
  return transactions
    .filter(t => t.accountId === accountId)
    .reduce((sum, t) => {
      if (t.type === 'income') return sum + t.amount
      if (t.type === 'expense') return sum - t.amount
      if (t.type === 'transfer') return t.transferDirection === 'in' ? sum + t.amount : sum - t.amount
      return sum
    }, 0)
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
