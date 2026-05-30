import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { INVESTMENT_TYPES } from '../data'
import { generateId } from '../utils/helpers'

const inputCls = `w-full bg-bg-input border border-line-subtle rounded-lg px-3 py-2.5 text-sm text-white
  placeholder-gray-500 focus:outline-none focus:border-violet-500 focus:bg-bg-elevated transition-colors`
const labelCls = 'block text-xs font-medium text-gray-400 mb-1.5'

export default function AddInvestmentModal({ onClose, editInv }) {
  const { addInvestment, updateInvestment } = useApp()
  const [name, setName] = useState(editInv?.name || '')
  const [type, setType] = useState(editInv?.type || 'stocks')
  const [invested, setInvested] = useState(editInv ? String(editInv.invested) : '')
  const [currentValue, setCurrentValue] = useState(editInv ? String(editInv.currentValue) : '')
  const [units, setUnits] = useState(editInv?.units ? String(editInv.units) : '')
  const [purchaseDate, setPurchaseDate] = useState(editInv?.purchaseDate || new Date().toISOString().slice(0, 10))
  const [notes, setNotes] = useState(editInv?.notes || '')
  const [error, setError] = useState('')

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!name.trim()) return setError('Name is required')
    const inv = Number(invested), cur = Number(currentValue)
    if (!inv || inv <= 0) return setError('Enter valid invested amount')
    if (cur < 0 || isNaN(cur)) return setError('Enter valid current value')

    const investment = {
      id: editInv?.id || generateId(),
      name: name.trim(),
      type,
      invested: inv,
      currentValue: cur || inv,
      units: units ? Number(units) : null,
      purchaseDate,
      notes: notes.trim(),
    }

    if (editInv) updateInvestment(editInv.id, investment)
    else addInvestment(investment)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="relative glass rounded-2xl w-full max-w-md shadow-2xl animate-in" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-line">
          <h2 className="text-white font-semibold text-base">
            {editInv ? 'Edit Investment' : 'Add Investment'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className={labelCls}>Type</label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {INVESTMENT_TYPES.map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setType(t.id)}
                  className={`flex flex-col items-center gap-1 py-2 px-1 rounded-lg text-xs font-medium transition-all ${
                    type === t.id
                      ? 'bg-violet-500/20 text-violet-300 border border-violet-500/40'
                      : 'bg-bg-input text-gray-400 border border-line-subtle hover:border-line'
                  }`}
                >
                  <span className="text-base">{t.icon}</span>
                  <span className="text-[10px] truncate w-full text-center">{t.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={labelCls}>Name</label>
            <input autoFocus className={inputCls} placeholder="e.g. Reliance, HDFC Mutual Fund"
              value={name} onChange={e => setName(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Amount Invested (₹)</label>
              <input className={inputCls} type="number" min="0" step="0.01" placeholder="0"
                value={invested} onChange={e => setInvested(e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Current Value (₹)</label>
              <input className={inputCls} type="number" min="0" step="0.01" placeholder="0"
                value={currentValue} onChange={e => setCurrentValue(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Units <span className="text-gray-600">(optional)</span></label>
              <input className={inputCls} type="number" min="0" step="0.0001" placeholder="0"
                value={units} onChange={e => setUnits(e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Purchase Date</label>
              <input className={inputCls} type="date" value={purchaseDate}
                onChange={e => setPurchaseDate(e.target.value)} />
            </div>
          </div>

          <div>
            <label className={labelCls}>Notes <span className="text-gray-600">(optional)</span></label>
            <input className={inputCls} placeholder="Any details..." value={notes} onChange={e => setNotes(e.target.value)} />
          </div>

          {error && <p className="text-red-400 text-xs">{error}</p>}

          <button type="submit" className="btn-primary w-full py-2.5 text-white font-semibold rounded-lg text-sm">
            {editInv ? 'Save Changes' : 'Add Investment'}
          </button>
        </form>
      </div>
    </div>
  )
}
