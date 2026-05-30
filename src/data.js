export const defaultCategories = [
  { id: 'food', name: 'Food', icon: '🍎', color: '#f97316', type: 'expense' },
  { id: 'transport', name: 'Transport', icon: '🚌', color: '#3b82f6', type: 'expense' },
  { id: 'entertainment', name: 'Entertainment', icon: '🎮', color: '#a78bfa', type: 'expense' },
  { id: 'investing', name: 'Investing', icon: '📈', color: '#10b981', type: 'expense' },
  { id: 'subscription', name: 'Subscription', icon: '🔄', color: '#f59e0b', type: 'expense' },
  { id: 'personal', name: 'Personal Spends', icon: '🏠', color: '#ec4899', type: 'expense' },
  { id: 'fillers', name: 'Fillers', icon: '🧡', color: '#fb923c', type: 'expense' },
  { id: 'gifts', name: 'Gifts', icon: '🎁', color: '#d946ef', type: 'expense' },
  { id: 'others', name: 'Others', icon: '📦', color: '#64748b', type: 'expense' },
  { id: 'salary', name: 'Salary', icon: '💰', color: '#10b981', type: 'income' },
  { id: 'freelance', name: 'Freelance', icon: '💻', color: '#3b82f6', type: 'income' },
  { id: 'investment-returns', name: 'Investment Returns', icon: '📊', color: '#f59e0b', type: 'income' },
  { id: 'bonus', name: 'Bonus', icon: '🎉', color: '#ec4899', type: 'income' },
  { id: 'other-income', name: 'Other Income', icon: '💵', color: '#64748b', type: 'income' },
]

export const defaultAccounts = [
  { id: 'bank', name: 'Bank Account', color: '#8b5cf6' },
  { id: 'cash', name: 'Cash', color: '#10b981' },
  { id: 'wallet', name: 'Wallet', color: '#3b82f6' },
]

export const INVESTMENT_TYPES = [
  { id: 'stocks', name: 'Stocks', icon: '📈', color: '#10b981' },
  { id: 'mutual_funds', name: 'Mutual Funds', icon: '🏦', color: '#3b82f6' },
  { id: 'crypto', name: 'Crypto', icon: '₿', color: '#f59e0b' },
  { id: 'gold', name: 'Gold', icon: '🥇', color: '#eab308' },
  { id: 'fixed_deposit', name: 'Fixed Deposit', icon: '🏛️', color: '#06b6d4' },
  { id: 'real_estate', name: 'Real Estate', icon: '🏠', color: '#8b5cf6' },
  { id: 'bonds', name: 'Bonds', icon: '📜', color: '#6366f1' },
  { id: 'other', name: 'Other', icon: '💼', color: '#64748b' },
]

const now = new Date()
const y = now.getFullYear()
const m = String(now.getMonth() + 1).padStart(2, '0')
const d = (day) => `${y}-${m}-${String(day).padStart(2, '0')}`

// Generic demo data — no real personal information
export const sampleTransactions = [
  { id: 'demo-t1', type: 'income', name: 'Sample Salary', amount: 50000, categoryId: 'salary', accountId: 'bank', date: d(1), notes: 'Demo data' },
  { id: 'demo-t2', type: 'expense', name: 'Sample Groceries', amount: 1200, categoryId: 'food', accountId: 'bank', date: d(5), notes: 'Demo data' },
  { id: 'demo-t3', type: 'expense', name: 'Sample Transport', amount: 500, categoryId: 'transport', accountId: 'cash', date: d(8), notes: 'Demo data' },
  { id: 'demo-t4', type: 'expense', name: 'Sample Subscription', amount: 199, categoryId: 'subscription', accountId: 'bank', date: d(10), notes: 'Demo data' },
  { id: 'demo-t5', type: 'expense', name: 'Sample Dining', amount: 800, categoryId: 'food', accountId: 'wallet', date: d(14), notes: 'Demo data' },
]
