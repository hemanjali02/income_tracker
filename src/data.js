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
  { id: 'sbi', name: 'SBI', color: '#8b5cf6' },
  { id: 'slice', name: 'Slice', color: '#6366f1' },
  { id: 'slice-credit', name: 'Slice Credit', color: '#22c55e' },
  { id: 'cash', name: 'Cash', color: '#10b981' },
  { id: 'hdfc', name: 'HDFC', color: '#ef4444' },
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

export const sampleTransactions = [
  { id: 't1', type: 'income', name: 'Monthly Salary', amount: 65000, categoryId: 'salary', accountId: 'sbi', date: d(1), notes: '' },
  { id: 't2', type: 'expense', name: 'Box Cricket', amount: 498, categoryId: 'entertainment', accountId: 'sbi', date: d(8), notes: '' },
  { id: 't3', type: 'expense', name: 'Eye Drops', amount: 118, categoryId: 'personal', accountId: 'sbi', date: d(9), notes: '' },
  { id: 't4', type: 'expense', name: 'KFC', amount: 423, categoryId: 'food', accountId: 'sbi', date: d(10), notes: '' },
  { id: 't5', type: 'expense', name: 'Petrol', amount: 300, categoryId: 'transport', accountId: 'sbi', date: d(12), notes: '' },
  { id: 't6', type: 'expense', name: 'D2 Lunch', amount: 240, categoryId: 'food', accountId: 'slice', date: d(13), notes: '' },
  { id: 't7', type: 'expense', name: 'Polar Bear', amount: 648, categoryId: 'food', accountId: 'sbi', date: d(13), notes: '' },
  { id: 't8', type: 'expense', name: 'Hema Dress', amount: 1600, categoryId: 'gifts', accountId: 'sbi', date: d(16), notes: '' },
  { id: 't9', type: 'expense', name: 'Spotify', amount: 179, categoryId: 'subscription', accountId: 'sbi', date: d(18), notes: '' },
  { id: 't10', type: 'expense', name: 'Netflix', amount: 199, categoryId: 'subscription', accountId: 'sbi', date: d(19), notes: '' },
  { id: 't11', type: 'expense', name: 'Fasttag Annual Pass', amount: 3000, categoryId: 'subscription', accountId: 'sbi', date: d(19), notes: '' },
  { id: 't12', type: 'expense', name: 'Car Wash', amount: 600, categoryId: 'others', accountId: 'sbi', date: d(20), notes: '' },
  { id: 't13', type: 'expense', name: 'Fillers', amount: 375, categoryId: 'fillers', accountId: 'sbi', date: d(21), notes: '' },
]
