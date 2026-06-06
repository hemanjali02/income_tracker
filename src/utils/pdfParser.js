import * as pdfjsLib from 'pdfjs-dist'
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc

// ─── Extract raw text from PDF ────────────────────────────
export async function extractPdfText(file, password = null) {
  const arrayBuffer = await file.arrayBuffer()
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer, password: password || undefined })
  try {
    const pdf = await loadingTask.promise
    const pages = []
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const tc = await page.getTextContent()
      // Reconstruct lines using y coordinates
      const items = tc.items
      const lines = {}
      for (const item of items) {
        const y = Math.round(item.transform[5])
        if (!lines[y]) lines[y] = []
        lines[y].push({ x: item.transform[4], str: item.str })
      }
      const sortedYs = Object.keys(lines).sort((a, b) => Number(b) - Number(a))
      for (const y of sortedYs) {
        const lineItems = lines[y].sort((a, b) => a.x - b.x)
        pages.push(lineItems.map(i => i.str).join(' '))
      }
    }
    return pages.join('\n')
  } catch (err) {
    if (err.name === 'PasswordException') {
      throw new Error('PASSWORD_REQUIRED')
    }
    throw err
  }
}

// ─── Transaction patterns by bank ────────────────────────
// Each parser returns array of { date, name, amount, type }

// Generic Indian bank statement pattern matcher
// Looks for: DD/MM/YYYY or DD-MM-YYYY ... description ... amount ... (Cr/Dr)
const datePatterns = [
  /(\d{2})[\/\-](\d{2})[\/\-](\d{2,4})/,
]

function parseDate(str) {
  for (const p of datePatterns) {
    const m = str.match(p)
    if (m) {
      let [, d, mo, y] = m
      if (y.length === 2) y = '20' + y
      return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`
    }
  }
  return null
}

function parseAmount(str) {
  // Strip commas, currency symbols, find a positive number
  const cleaned = str.replace(/[₹,]/g, '').trim()
  const m = cleaned.match(/(-?\d+\.?\d*)/g)
  if (!m) return null
  // Take the LAST number on the line — usually the amount
  const num = Number(m[m.length - 1])
  return isNaN(num) ? null : num
}

// Generic heuristic — works across most Indian bank PDF statements
function parseGeneric(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  const out = []

  for (const line of lines) {
    const date = parseDate(line)
    if (!date) continue

    // Skip lines that don't have at least 2 numbers (date + amount)
    const nums = line.match(/-?\d+\.\d{2}/g)
    if (!nums || nums.length === 0) continue

    // Heuristic: detect Cr/Dr or +/- markers
    const lower = line.toLowerCase()
    const hasCredit = /\b(cr|credit|deposit)\b/.test(lower)
    const hasDebit  = /\b(dr|debit|withdrawal|withdraw)\b/.test(lower)

    // Amount = largest number that's not the balance (usually 2nd-to-last is amount, last is balance)
    let amount = null
    if (nums.length >= 2) {
      // try second-to-last
      amount = Number(nums[nums.length - 2])
    } else {
      amount = Number(nums[0])
    }
    if (!amount || isNaN(amount)) continue

    // Description = everything between date and first number
    let desc = line
    // Remove date
    desc = desc.replace(/(\d{2})[\/\-](\d{2})[\/\-](\d{2,4})/, '').trim()
    // Remove all numbers from the END of the string (balances, amounts)
    desc = desc.replace(/(\d+[\.,]?\d*\s*){1,5}$/, '').trim()
    // Remove Cr/Dr indicators
    desc = desc.replace(/\b(cr|dr|credit|debit)\b/gi, '').trim()
    if (desc.length < 2) desc = 'Transaction'

    out.push({
      date,
      name: desc.slice(0, 80),
      amount: Math.abs(amount),
      type: hasCredit ? 'income' : 'expense', // default expense if ambiguous
    })
  }

  // Filter out likely-spurious matches (very small amounts that came from page numbers etc)
  return out.filter(t => t.amount >= 1)
}

export async function parseBankStatement(file, password = null) {
  const text = await extractPdfText(file, password)
  const transactions = parseGeneric(text)
  return { transactions, rawText: text.slice(0, 500) }
}

// ─── Auto-categorize from merchant patterns ──────────────
const CATEGORY_PATTERNS = {
  food: /swiggy|zomato|kfc|mcdonalds|domino|burger|pizza|restaurant|cafe|coffee|starbucks|food|dosa|biryani/i,
  transport: /uber|ola|rapido|petrol|fuel|hpcl|iocl|bpcl|indianoil|metro|railway|irctc|toll|fastag|parking/i,
  subscription: /netflix|spotify|prime|hotstar|youtube|jiocinema|sonyliv|zee5|adobe|microsoft|google|icloud/i,
  entertainment: /bookmyshow|movie|cinema|pvr|inox|game|playstation|steam/i,
  personal: /pharmacy|apollo|medplus|hospital|clinic|doctor|salon|gym|fitness/i,
  gifts: /gift|amazon|flipkart|myntra|ajio/i,
  investing: /zerodha|groww|upstox|kuvera|mutual|sip|nps|ppf/i,
  salary: /salary|payroll|wages/i,
  freelance: /freelance|upwork|fiverr|consulting/i,
}

export function suggestCategory(name, categories) {
  const lower = name.toLowerCase()
  for (const [hint, pattern] of Object.entries(CATEGORY_PATTERNS)) {
    if (pattern.test(lower)) {
      const match = categories.find(c => c.name.toLowerCase().includes(hint) || c.id.toLowerCase().includes(hint))
      if (match) return match.id
    }
  }
  return ''
}
