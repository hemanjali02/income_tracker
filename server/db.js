import mongoose from 'mongoose'

// ─── Connection ─────────────────────────────────────────
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/income-tracker'

export async function connectDB() {
  try {
    await mongoose.connect(MONGO_URI)
    console.log('MongoDB connected:', mongoose.connection.host)
  } catch (err) {
    console.error('MongoDB connection failed:', err.message)
    process.exit(1)
  }
}

// ─── Schemas & Models ───────────────────────────────────

const userSchema = new mongoose.Schema({
  id:           { type: String, required: true, unique: true },
  username:     { type: String, required: true, unique: true },
  passwordSalt: String,
  passwordHash: String,
  createdAt:    { type: String, default: () => new Date().toISOString() },
})
export const User = mongoose.model('User', userSchema)

const sessionSchema = new mongoose.Schema({
  token:     { type: String, required: true, unique: true },
  userId:    { type: String, required: true, index: true },
  createdAt: { type: String, default: () => new Date().toISOString() },
})
export const Session = mongoose.model('Session', sessionSchema)

const transactionSchema = new mongoose.Schema({
  id:                { type: String, required: true, unique: true },
  userId:            { type: String, required: true, index: true },
  type:              String, // 'income' | 'expense' | 'transfer'
  name:              String,
  amount:            Number,
  categoryId:        String,
  accountId:         String,
  date:              String,
  notes:             String,
  // Transfer-specific fields
  transferId:        String,
  transferDirection: String, // 'in' | 'out'
  toAccountId:       String,
  fromAccountId:     String,
})
export const Transaction = mongoose.model('Transaction', transactionSchema)

const categorySchema = new mongoose.Schema({
  id:     { type: String, required: true, unique: true },
  userId: { type: String, required: true, index: true },
  name:   String,
  icon:   String,
  color:  String,
  type:   String, // 'income' | 'expense'
})
export const Category = mongoose.model('Category', categorySchema)

const accountSchema = new mongoose.Schema({
  id:     { type: String, required: true, unique: true },
  userId: { type: String, required: true, index: true },
  name:   String,
  color:  String,
})
export const Account = mongoose.model('Account', accountSchema)

const budgetSchema = new mongoose.Schema({
  id:         { type: String, required: true, unique: true },
  userId:     { type: String, required: true, index: true },
  categoryId: String,
  month:      String,
  limit:      Number,
})
budgetSchema.index({ userId: 1, categoryId: 1, month: 1 })
export const Budget = mongoose.model('Budget', budgetSchema)

const investmentSchema = new mongoose.Schema({
  id:           { type: String, required: true, unique: true },
  userId:       { type: String, required: true, index: true },
  name:         String,
  type:         String,
  invested:     Number,
  currentValue: Number,
  units:        Number,
  purchaseDate: String,
  notes:        String,
})
export const Investment = mongoose.model('Investment', investmentSchema)

// ─── Model map (for generic CRUD helper) ────────────────
export const models = {
  transactions: Transaction,
  categories:   Category,
  accounts:     Account,
  investments:  Investment,
}

// ─── Default data seeding ───────────────────────────────

export const DEFAULT_CATEGORIES = [
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

export const DEFAULT_ACCOUNTS = [
  { id: 'sbi', name: 'SBI', color: '#8b5cf6' },
  { id: 'slice', name: 'Slice', color: '#6366f1' },
  { id: 'slice-credit', name: 'Slice Credit', color: '#22c55e' },
  { id: 'cash', name: 'Cash', color: '#10b981' },
  { id: 'hdfc', name: 'HDFC', color: '#ef4444' },
]

export async function seedUserDefaults(userId) {
  const cats = DEFAULT_CATEGORIES.map(c => ({
    ...c, id: `${c.id}-${userId}`, userId,
  }))
  const accs = DEFAULT_ACCOUNTS.map(a => ({
    ...a, id: `${a.id}-${userId}`, userId,
  }))
  await Category.insertMany(cats)
  await Account.insertMany(accs)
}
