export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)
}

// Short form for chart axes and compact displays — Indian scale.
// Values under 1,000 show the exact rounded rupee amount (with grouping) so a
// balance like 847.9999 never leaks floating-point decimals; larger values use
// K / L / Cr. Safe to call with the fractional values AnimatedNumber tweens.
export function formatCompact(amount) {
  const abs = Math.abs(amount)
  const sign = amount < 0 ? '−' : ''
  if (abs >= 1_00_00_000) return `${sign}₹${(abs / 1_00_00_000).toFixed(1).replace(/\.0$/, '')}Cr`
  if (abs >= 1_00_000)    return `${sign}₹${(abs / 1_00_000).toFixed(1).replace(/\.0$/, '')}L`
  if (abs >= 1_000)       return `${sign}₹${(abs / 1_000).toFixed(1).replace(/\.0$/, '')}K`
  return `${sign}₹${Math.round(abs).toLocaleString('en-IN')}`
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
  // Transfers are internal movements; exclude their legs so month buckets and
  // sums stay identical no matter which page computes them.
  const groups = groupByMonth(transactions.filter(t => t.type !== 'transfer'))
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

// ─── EMI math ────────────────────────────────────────────
// Standard reducing-balance EMI. rate is annual %, 0 means no-cost EMI.
export function emiInstallment(principal, annualRatePct, months) {
  if (!principal || !months) return 0
  const r = (annualRatePct || 0) / 12 / 100
  if (r === 0) return principal / months
  const f = Math.pow(1 + r, months)
  return (principal * r * f) / (f - 1)
}

// Derived numbers for an EMI record as of `today`.
export function emiProgress(emi, today = new Date()) {
  const installment = emiInstallment(emi.principal, emi.interestRate, emi.months)
  const totalPayable = installment * emi.months
  const totalInterest = totalPayable - emi.principal

  const start = new Date(emi.startDate)
  // Installments are considered paid on the same day-of-month as startDate.
  let paid = (today.getFullYear() - start.getFullYear()) * 12 + (today.getMonth() - start.getMonth())
  if (today.getDate() >= start.getDate()) paid += 1
  paid = Math.max(0, Math.min(emi.months, paid))
  if (emi.closed) paid = emi.months

  const remaining = emi.months - paid
  return {
    installment,
    totalPayable,
    totalInterest,
    paidMonths: paid,
    remainingMonths: remaining,
    paidAmount: installment * paid,
    outstanding: installment * remaining,
    pct: (paid / emi.months) * 100,
    done: remaining <= 0,
  }
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

// ─── Upcoming timeline ───────────────────────────────────
// Merges every future-dated commitment (recurring items, EMI installments,
// credit-card statement/due dates, pending receivables) into one chronological
// list, and projects the liquid-cash balance forward across them.
export function buildUpcomingTimeline({ recurring = [], emis = [], accounts = [], receivables = [], transactions = [], days = 60 }) {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const end = new Date(today); end.setDate(end.getDate() + days)
  const iso = (d) => d.toISOString().slice(0, 10)
  const todayIso = iso(today), endIso = iso(end)
  const monthsToScan = Math.floor(days / 28) + 2
  const events = []

  const occurrencesOnDay = (dayNum, count) => {
    const out = []
    let y = today.getFullYear(), m = today.getMonth()
    for (let i = 0; i < count; i++) {
      const d = new Date(y, m, Math.min(dayNum, daysInMonth(y, m)))
      if (d >= today && d <= end) out.push({ iso: iso(d), y, m })
      m++; if (m > 11) { m = 0; y++ }
    }
    return out
  }

  // Recurring items
  for (const r of recurring) {
    if (!r.active) continue
    const amt = r.type === 'income' ? r.amount : -r.amount
    const kind = r.type === 'income' ? 'income' : 'expense'
    if (r.frequency === 'weekly') {
      let d = new Date(r.lastGeneratedDate || r.startDate)
      while (d < today) d.setDate(d.getDate() + 7)
      while (d <= end) { events.push({ date: iso(d), kind, name: r.name, amount: amt, source: 'recurring' }); d = new Date(d); d.setDate(d.getDate() + 7) }
    } else if (r.frequency === 'yearly') {
      const mo = (r.monthOfYear || (new Date(r.startDate).getMonth() + 1)) - 1
      const dom = r.dayOfMonth || new Date(r.startDate).getDate()
      for (const y of [today.getFullYear(), today.getFullYear() + 1]) {
        const d = new Date(y, mo, Math.min(dom, daysInMonth(y, mo)))
        if (d >= today && d <= end) events.push({ date: iso(d), kind, name: r.name, amount: amt, source: 'recurring' })
      }
    } else { // monthly (default)
      const dom = r.dayOfMonth || new Date(r.startDate).getDate()
      for (const o of occurrencesOnDay(dom, monthsToScan)) {
        events.push({ date: o.iso, kind, name: r.name, amount: amt, source: 'recurring' })
      }
    }
  }

  // EMI installments
  for (const e of emis) {
    if (e.closed) continue
    const inst = Math.round(emiInstallment(e.principal, e.interestRate, e.months))
    const start = new Date(e.startDate)
    for (const o of occurrencesOnDay(start.getDate(), monthsToScan)) {
      const num = (o.y - start.getFullYear()) * 12 + (o.m - start.getMonth()) + 1
      if (num >= 1 && num <= e.months) {
        events.push({ date: o.iso, kind: 'emi', name: `${e.name} EMI`, amount: -inst, source: 'emi', meta: `${num}/${e.months}` })
      }
    }
  }

  // Credit-card statement + payment-due markers (no balance impact)
  for (const acc of accounts) {
    if (acc.accountType !== 'credit' || !acc.cycleDay) continue
    const bal = getAccountBalance(transactions, acc)
    const outstanding = bal < 0 ? Math.abs(bal) : 0
    const stmt = occurrencesOnDay(acc.cycleDay, 3)[0]
    if (stmt) events.push({ date: stmt.iso, kind: 'statement', name: `${acc.name} statement`, amount: null, source: 'card' })
    if (acc.dueDay) {
      const due = occurrencesOnDay(acc.dueDay, 3)[0]
      if (due) events.push({ date: due.iso, kind: 'due', name: `${acc.name} payment due`, amount: null, source: 'card', meta: outstanding ? formatCurrency(outstanding) : null })
    }
  }

  // Pending receivables with a due date in the window (expected inflow)
  for (const rc of receivables) {
    if (rc.status !== 'pending' || !rc.dueDate) continue
    if (rc.dueDate >= todayIso && rc.dueDate <= endIso) {
      events.push({ date: rc.dueDate, kind: 'receivable', name: `${rc.name} pays you`, amount: rc.amount, source: 'receivable' })
    }
  }

  events.sort((a, b) => a.date.localeCompare(b.date) || (Math.abs(b.amount || 0) - Math.abs(a.amount || 0)))

  // Project liquid-cash balance across the events
  const liquidStart = accounts
    .filter(a => a.accountType !== 'credit')
    .reduce((s, a) => s + getAccountBalance(transactions, a), 0)
  let bal = liquidStart, lowest = bal, lowestDate = todayIso
  const series = [{ date: todayIso, balance: Math.round(bal) }]
  for (const ev of events) {
    if (ev.amount) {
      bal += ev.amount
      if (bal < lowest) { lowest = bal; lowestDate = ev.date }
    }
    series.push({ date: ev.date, balance: Math.round(bal) })
  }

  const totalIn = events.filter(e => e.amount > 0).reduce((s, e) => s + e.amount, 0)
  const totalOut = events.filter(e => e.amount < 0).reduce((s, e) => s + Math.abs(e.amount), 0)

  return {
    events, series, liquidStart,
    endBalance: Math.round(bal),
    lowest: Math.round(lowest), lowestDate,
    totalIn, totalOut, days, count: events.length,
  }
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
