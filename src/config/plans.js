// Central definition of what each plan unlocks. Used by the client to gate UI.
// The server enforces the same rules independently (see server/entitlements.js),
// so this is purely for the experience, not the source of truth for security.

// Feature keys used throughout the app.
export const FEATURE = {
  unlimitedAccounts: 'unlimitedAccounts',
  creditCards:       'creditCards',
  analysis:          'analysis',
  recurring:         'recurring',
  goals:             'goals',
  receivables:       'receivables',
  investments:       'investments',
  splitExpenses:     'splitExpenses',
  pdfImport:         'pdfImport',
  pdfReports:        'pdfReports',
}

// Everything above is Pro. Free tier gets none of these gated features.
export const PRO_FEATURES = new Set(Object.values(FEATURE))

// Free plan limits.
export const FREE_MAX_ACCOUNTS = 3

// Which sidebar views require Pro.
export const PRO_VIEWS = new Set(['analysis', 'recurring', 'goals', 'receivables', 'investments'])

// Friendly copy for the locked-state screens, keyed by view id or feature.
export const FEATURE_COPY = {
  analysis:     { title: 'Spending Analysis', blurb: 'Cash flow forecasts, category trends, top merchants and day-of-week patterns.' },
  recurring:    { title: 'Recurring Transactions', blurb: 'Automate salary, rent, EMIs and subscriptions so they post themselves.' },
  goals:        { title: 'Financial Goals', blurb: 'Set savings targets, link an account, and track progress automatically.' },
  receivables:  { title: 'Receivables', blurb: 'Track money people owe you and turn it into income when it arrives.' },
  investments:  { title: 'Investments', blurb: 'Track stocks, mutual funds, gold and more with allocation and gains.' },
  creditCards:  { title: 'Credit Card Tracking', blurb: 'Track billing cycles, limits and spend so you never miss a due date.' },
  pdfImport:    { title: 'Bank Statement Import', blurb: 'Import a PDF statement and auto-categorise every transaction.' },
  pdfReports:   { title: 'PDF Reports', blurb: 'Generate a clean monthly report you can save or share.' },
  splitExpenses:{ title: 'Split Expenses', blurb: 'Split a bill and auto-create receivables for everyone who owes you.' },
  unlimitedAccounts: { title: 'Unlimited Accounts', blurb: 'Add as many banks, wallets and cards as you like.' },
}

// Display prices fallback (server config overrides these at runtime).
export const FALLBACK_PRICES = { proMonthly: 99, proYearly: 799, lifetime: 2499 }

// The marketing matrix shown on the pricing screen.
export const PLAN_MATRIX = [
  { label: 'Unlimited transactions', free: true, pro: true },
  { label: 'Up to 3 accounts', free: true, pro: true },
  { label: 'Budgets & categories', free: true, pro: true },
  { label: 'Calendar & dashboard', free: true, pro: true },
  { label: 'CSV export', free: true, pro: true },
  { label: 'Unlimited accounts', free: false, pro: true },
  { label: 'Credit card cycle tracking', free: false, pro: true },
  { label: 'Spending analysis & forecasts', free: false, pro: true },
  { label: 'Recurring transactions', free: false, pro: true },
  { label: 'Goals & receivables', free: false, pro: true },
  { label: 'Investment tracking', free: false, pro: true },
  { label: 'Split expenses', free: false, pro: true },
  { label: 'Bank PDF import', free: false, pro: true },
  { label: 'PDF monthly reports', free: false, pro: true },
]
