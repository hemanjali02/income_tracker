import { useState } from 'react'
import { Plus, Pencil, Trash2, X, Check } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { generateId } from '../utils/helpers'
import ConfirmDialog from './ConfirmDialog'

const PRESET_COLORS = [
  '#f97316', '#3b82f6', '#8b5cf6', '#10b981', '#f59e0b',
  '#ec4899', '#fb923c', '#a855f7', '#6b7280', '#ef4444',
  '#06b6d4', '#84cc16',
]

const inputCls = `w-full bg-bg-elevated border border-line-subtle rounded-lg px-3 py-2 text-sm text-white
  placeholder-gray-500 focus:outline-none focus:border-violet-500 transition-colors`

function CategoryForm({ initial, onSave, onCancel }) {
  const [name, setName] = useState(initial?.name || '')
  const [icon, setIcon] = useState(initial?.icon || '📦')
  const [color, setColor] = useState(initial?.color || '#8b5cf6')
  const [type, setType] = useState(initial?.type || 'expense')
  const [error, setError] = useState('')

  function submit(e) {
    e.preventDefault()
    if (!name.trim()) return setError('Name is required')
    onSave({ name: name.trim(), icon, color, type })
  }

  return (
    <form onSubmit={submit} className="p-4 bg-bg-elevated rounded-xl border border-line-subtle space-y-3 animate-in">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-400 mb-1">Name</label>
          <input autoFocus className={inputCls} value={name} onChange={e => setName(e.target.value)} placeholder="Category name" />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Icon (emoji)</label>
          <input className={inputCls} value={icon} onChange={e => setIcon(e.target.value)} placeholder="🎯" />
        </div>
      </div>
      <div>
        <label className="block text-xs text-gray-400 mb-1">Type</label>
        <div className="flex gap-2">
          {['expense', 'income'].map(t => (
            <button key={t} type="button" onClick={() => setType(t)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
                type === t ? 'bg-violet-600/30 text-violet-300 border border-violet-500/40' : 'bg-bg-base text-gray-500 border border-line-subtle'
              }`}>
              {t}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="block text-xs text-gray-400 mb-1.5">Color</label>
        <div className="flex flex-wrap gap-2">
          {PRESET_COLORS.map(c => (
            <button key={c} type="button" onClick={() => setColor(c)}
              className="w-6 h-6 rounded-full transition-transform hover:scale-110 flex items-center justify-center"
              style={{ backgroundColor: c }}>
              {color === c && <Check size={10} className="text-white" />}
            </button>
          ))}
        </div>
      </div>
      {error && <p className="text-red-400 text-xs">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium rounded-lg transition-colors">
          <Check size={12} /> Save
        </button>
        <button type="button" onClick={onCancel} className="flex items-center gap-1.5 px-3 py-2 text-gray-400 hover:text-white text-xs transition-colors">
          <X size={12} /> Cancel
        </button>
      </div>
    </form>
  )
}

export default function CategoryManager() {
  const { categories, addCategory, updateCategory, deleteCategory } = useApp()
  const [adding, setAdding] = useState(false)
  const [editId, setEditId] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)

  const expenses = categories.filter(c => c.type === 'expense')
  const incomes = categories.filter(c => c.type === 'income')

  function handleAdd(data) {
    addCategory({ id: generateId(), ...data })
    setAdding(false)
  }

  function handleEdit(id, data) {
    updateCategory(id, data)
    setEditId(null)
  }

  function confirmDel() {
    if (confirmDelete) deleteCategory(confirmDelete)
    setConfirmDelete(null)
  }

  function renderGroup(label, list) {
    return (
      <div>
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">{label}</h3>
        <div className="space-y-2">
          {list.map(cat => (
            <div key={cat.id}>
              {editId === cat.id ? (
                <CategoryForm initial={cat} onSave={data => handleEdit(cat.id, data)} onCancel={() => setEditId(null)} />
              ) : (
                <div className="flex items-center justify-between px-4 py-3 bg-bg-card rounded-xl border border-line-subtle group">
                  <div className="flex items-center gap-3">
                    <span
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-lg"
                      style={{ backgroundColor: cat.color + '15', border: `1px solid ${cat.color}20` }}
                    >
                      {cat.icon}
                    </span>
                    <div>
                      <div className="text-sm font-medium text-white">{cat.name}</div>
                      <div className="text-xs text-gray-500 capitalize">{cat.type}</div>
                    </div>
                  </div>
                  <div className="flex gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <button onClick={() => setEditId(cat.id)}
                      className="p-1.5 text-gray-500 hover:text-purple-400 hover:bg-purple-500/10 rounded-lg transition-colors">
                      <Pencil size={13} />
                    </button>
                    <button onClick={() => setConfirmDelete(cat.id)}
                      className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {list.length === 0 && (
            <p className="text-gray-600 text-sm py-4 text-center">No {label.toLowerCase()} yet</p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in">
      {confirmDelete && (
        <ConfirmDialog title="Delete Category" message="This will not delete associated transactions, but they will show no category." onConfirm={confirmDel} onCancel={() => setConfirmDelete(null)} />
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white">Categories</h2>
          <p className="text-sm text-gray-500 mt-0.5">Manage your income and expense categories</p>
        </div>
        <button onClick={() => { setAdding(true); setEditId(null) }}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium rounded-lg transition-colors">
          <Plus size={15} /> Add Category
        </button>
      </div>

      {adding && <CategoryForm onSave={handleAdd} onCancel={() => setAdding(false)} />}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {renderGroup('Expense Categories', expenses)}
        {renderGroup('Income Categories', incomes)}
      </div>
    </div>
  )
}
