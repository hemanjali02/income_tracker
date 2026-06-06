import { useState, useRef } from 'react'
import { X, Upload, FileText, Check, AlertCircle, ArrowUpRight, ArrowDownRight, Loader2 } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { useToast } from '../context/ToastContext'
import { generateId, formatCurrency, formatDate } from '../utils/helpers'
import { inputCls, labelCls } from '../utils/styles'
import { parseBankStatement, suggestCategory } from '../utils/pdfParser'

export default function BankImportModal({ onClose }) {
  const { categories, accounts, addTransaction } = useApp()
  const { addToast } = useToast()

  const [stage, setStage] = useState('upload') // upload | password | preview | done
  const [file, setFile] = useState(null)
  const [password, setPassword] = useState('')
  const [accountId, setAccountId] = useState(accounts[0]?.id || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [parsed, setParsed] = useState([]) // array of preview rows
  const [selected, setSelected] = useState(new Set())
  const fileInputRef = useRef(null)

  async function handleFile(f, pwd = null) {
    if (!f) return
    setLoading(true); setError('')
    try {
      const { transactions } = await parseBankStatement(f, pwd)
      if (transactions.length === 0) {
        setError('Could not detect any transactions in this PDF. Try a different statement format.')
        setLoading(false)
        return
      }
      const enriched = transactions.map(tx => ({
        ...tx,
        id: generateId(),
        categoryId: suggestCategory(tx.name, categories),
        accountId,
        include: true,
        notes: '',
      }))
      setParsed(enriched)
      setSelected(new Set(enriched.map(t => t.id)))
      setStage('preview')
    } catch (e) {
      if (e.message === 'PASSWORD_REQUIRED') {
        setStage('password')
      } else {
        setError(`Failed to parse PDF: ${e.message}`)
      }
    } finally {
      setLoading(false)
    }
  }

  function handleSelect(e) {
    const f = e.target.files?.[0]
    if (f) {
      setFile(f)
      handleFile(f)
    }
  }

  function handlePasswordSubmit(e) {
    e.preventDefault()
    handleFile(file, password)
  }

  function toggleRow(id) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (selected.size === parsed.length) setSelected(new Set())
    else setSelected(new Set(parsed.map(t => t.id)))
  }

  function updateRow(id, patch) {
    setParsed(prev => prev.map(t => t.id === id ? { ...t, ...patch } : t))
  }

  function commitImport() {
    const toImport = parsed.filter(t => selected.has(t.id))
    if (!toImport.length) return
    if (!accountId) {
      setError('Please pick an account first')
      return
    }
    for (const tx of toImport) {
      addTransaction({
        id: tx.id,
        type: tx.type,
        name: tx.name,
        amount: tx.amount,
        categoryId: tx.categoryId || categories.find(c => c.type === tx.type)?.id || '',
        accountId: tx.accountId || accountId,
        date: tx.date,
        notes: tx.notes || 'Imported from bank statement',
      })
    }
    addToast(`Imported ${toImport.length} transaction${toImport.length !== 1 ? 's' : ''}`, 'success')
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="relative glass rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl animate-in" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-line flex-shrink-0">
          <div>
            <h2 className="text-white font-semibold text-base flex items-center gap-2">
              <FileText size={16} className="text-violet-400" /> Import Bank Statement
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {stage === 'upload' ? 'Upload a PDF statement to extract transactions'
                : stage === 'password' ? 'PDF is password-protected'
                : stage === 'preview' ? `${parsed.length} transactions detected · ${selected.size} selected`
                : 'Done'}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={18} />
          </button>
        </div>

        {/* Upload stage */}
        {stage === 'upload' && (
          <div className="p-6 space-y-4">
            <div>
              <label className={labelCls}>Account to import into</label>
              <select className={inputCls} value={accountId} onChange={e => setAccountId(e.target.value)}>
                <option value="">Select account...</option>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={loading || !accountId}
              className="w-full p-8 border-2 border-dashed border-line rounded-xl text-center hover:border-violet-500/40 hover:bg-violet-500/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 size={36} className="text-violet-400 mx-auto mb-3 animate-spin" />
                  <p className="text-sm font-medium text-white">Parsing PDF...</p>
                  <p className="text-xs text-gray-500 mt-1">This may take a few seconds</p>
                </>
              ) : (
                <>
                  <Upload size={36} className="text-violet-400 mx-auto mb-3" />
                  <p className="text-sm font-medium text-white">Click to upload PDF statement</p>
                  <p className="text-xs text-gray-500 mt-1">SBI · HDFC · ICICI · Axis · Kotak and other Indian banks</p>
                </>
              )}
            </button>
            <input ref={fileInputRef} type="file" accept=".pdf" onChange={handleSelect} className="hidden" />

            {error && (
              <div className="flex items-start gap-2 px-3 py-2 bg-rose-500/10 border border-rose-500/30 rounded-lg">
                <AlertCircle size={14} className="text-rose-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-rose-300">{error}</p>
              </div>
            )}

            <div className="text-[11px] text-gray-500 bg-bg-elevated rounded-lg px-3 py-2 border border-line-subtle">
              💡 The PDF is processed entirely in your browser — nothing is uploaded to any server.
            </div>
          </div>
        )}

        {/* Password stage */}
        {stage === 'password' && (
          <form onSubmit={handlePasswordSubmit} className="p-6 space-y-4">
            <div>
              <label className={labelCls}>PDF Password</label>
              <input autoFocus className={inputCls} type="password" value={password}
                onChange={e => setPassword(e.target.value)} placeholder="Enter password" />
              <p className="text-[11px] text-gray-500 mt-2">
                Most banks use your DOB (DDMMYYYY) or PAN for statement passwords.
              </p>
            </div>
            {error && <p className="text-rose-400 text-xs">{error}</p>}
            <div className="flex gap-2">
              <button type="submit" disabled={loading} className="flex-1 btn-primary py-2.5 text-white text-sm font-semibold rounded-lg disabled:opacity-50">
                {loading ? 'Unlocking…' : 'Unlock & Parse'}
              </button>
              <button type="button" onClick={() => setStage('upload')} className="px-4 text-gray-400 hover:text-white text-sm">
                Back
              </button>
            </div>
          </form>
        )}

        {/* Preview stage */}
        {stage === 'preview' && (
          <>
            <div className="px-6 py-3 border-b border-line-subtle flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <input type="checkbox"
                  checked={selected.size === parsed.length}
                  onChange={toggleAll}
                />
                <span className="text-xs text-gray-400">
                  {selected.size === parsed.length ? 'Deselect all' : `Select all (${parsed.length})`}
                </span>
              </div>
              <span className="text-xs text-gray-500">
                {selected.size} of {parsed.length} will be imported
              </span>
            </div>

            <div className="overflow-y-auto flex-1">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-bg-card border-b border-line-subtle z-10">
                  <tr>
                    <th className="px-3 py-2 text-left w-8"></th>
                    <th className="px-3 py-2 text-left text-gray-500 font-semibold uppercase tracking-wider w-20">Date</th>
                    <th className="px-3 py-2 text-left text-gray-500 font-semibold uppercase tracking-wider">Name</th>
                    <th className="px-3 py-2 text-left text-gray-500 font-semibold uppercase tracking-wider w-28">Category</th>
                    <th className="px-3 py-2 text-right text-gray-500 font-semibold uppercase tracking-wider w-24">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {parsed.map(tx => {
                    const checked = selected.has(tx.id)
                    const filteredCats = categories.filter(c => c.type === tx.type)
                    return (
                      <tr key={tx.id} className={`border-b border-line-subtle hover:bg-white/[0.02] ${!checked ? 'opacity-40' : ''}`}>
                        <td className="px-3 py-2">
                          <input type="checkbox" checked={checked} onChange={() => toggleRow(tx.id)} />
                        </td>
                        <td className="px-3 py-2 text-gray-400">{formatDate(tx.date)}</td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <button onClick={() => updateRow(tx.id, { type: tx.type === 'income' ? 'expense' : 'income', categoryId: '' })}
                              className={`p-0.5 rounded ${tx.type === 'income' ? 'text-emerald-400 hover:bg-emerald-500/10' : 'text-rose-400 hover:bg-rose-500/10'}`}
                              title="Toggle income/expense">
                              {tx.type === 'income' ? <ArrowDownRight size={12} /> : <ArrowUpRight size={12} />}
                            </button>
                            <input
                              className="bg-transparent text-gray-200 text-xs w-full focus:outline-none focus:bg-bg-input rounded px-1"
                              value={tx.name}
                              onChange={e => updateRow(tx.id, { name: e.target.value })}
                            />
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <select
                            className="bg-bg-input border border-line-subtle rounded px-1.5 py-1 text-xs text-gray-300 focus:outline-none focus:border-violet-500 w-full"
                            value={tx.categoryId}
                            onChange={e => updateRow(tx.id, { categoryId: e.target.value })}
                          >
                            <option value="">—</option>
                            {filteredCats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                        </td>
                        <td className={`px-3 py-2 text-right font-semibold ${tx.type === 'income' ? 'text-emerald-400' : 'text-gray-200'}`}>
                          {tx.type === 'income' ? '+' : '−'}{formatCurrency(tx.amount)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="px-6 py-4 border-t border-line flex items-center justify-between flex-shrink-0 bg-bg-card/50">
              <span className="text-xs text-gray-500">
                💡 Click the arrow icon to flip income/expense if auto-detect was wrong
              </span>
              <div className="flex gap-2">
                <button onClick={() => setStage('upload')} className="px-4 py-2 text-gray-400 hover:text-white text-sm">
                  Back
                </button>
                <button onClick={commitImport} disabled={selected.size === 0}
                  className="btn-primary px-5 py-2 text-white text-sm font-semibold rounded-lg disabled:opacity-50">
                  Import {selected.size} transaction{selected.size !== 1 ? 's' : ''}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
