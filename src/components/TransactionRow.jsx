import { Pencil, Trash2, FileText, Copy, StickyNote, ArrowLeftRight } from 'lucide-react'
import { formatCurrency, formatDate } from '../utils/helpers'

export default function TransactionRow({ tx, category, account, pairedAccount, onEdit, onDelete, onDuplicate, selected, onToggleSelect }) {
  const isTransfer = tx.type === 'transfer'
  const isOut = tx.transferDirection === 'out'

  return (
    <tr className={`border-b border-line-subtle transition-colors group relative ${
      selected
        ? 'bg-violet-500/[0.08] hover:bg-violet-500/[0.10]'
        : 'hover:bg-white/[0.025]'
    }`}>
      {onToggleSelect && (
        <td className="py-3 px-4 w-12 relative">
          {selected && <span className="absolute left-0 top-0 bottom-0 w-[3px] bg-violet-400" />}
          <label className="flex items-center cursor-pointer">
            <input type="checkbox" checked={!!selected} onChange={() => onToggleSelect(tx.id)} />
          </label>
        </td>
      )}
      <td className="py-3 px-4">
        <div className="flex items-center gap-2.5">
          <div className={`w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 ${
            isTransfer ? 'bg-blue-500/10' : 'bg-bg-elevated'
          }`}>
            {isTransfer
              ? <ArrowLeftRight size={13} className="text-blue-400" />
              : <FileText size={13} className="text-gray-500" />
            }
          </div>
          <span className="text-sm text-gray-200 font-medium truncate max-w-[200px]">{tx.name}</span>
          {tx.notes && (
            <span title={tx.notes} className="text-gray-600 hover:text-gray-400 cursor-help">
              <StickyNote size={12} />
            </span>
          )}
        </div>
      </td>

      <td className="py-3 px-4 text-right">
        <span className={`text-sm font-semibold ${
          isTransfer
            ? isOut ? 'text-blue-300' : 'text-blue-400'
            : tx.type === 'income' ? 'text-emerald-400' : 'text-gray-100'
        }`}>
          {isTransfer ? (isOut ? '−' : '+') : tx.type === 'income' ? '+' : ''}
          {formatCurrency(tx.amount)}
        </span>
      </td>

      <td className="py-3 px-4">
        {account ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold text-white"
            style={{ backgroundColor: account.color + '20', border: `1px solid ${account.color}22` }}>
            <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{ backgroundColor: account.color }} />
            {account.name}
          </span>
        ) : <span className="text-gray-600 text-xs">—</span>}
      </td>

      <td className="py-3 px-4">
        {isTransfer ? (
          pairedAccount ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium text-blue-300 bg-blue-500/10 border border-blue-500/20">
              <ArrowLeftRight size={10} />
              {isOut ? `→ ${pairedAccount.name}` : `← ${pairedAccount.name}`}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs text-blue-400 bg-blue-500/10 border border-blue-500/20">
              Transfer
            </span>
          )
        ) : category ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium"
            style={{ backgroundColor: category.color + '15', color: category.color, border: `1px solid ${category.color}20` }}>
            <span>{category.icon}</span>
            {category.name}
          </span>
        ) : <span className="text-gray-600 text-xs">—</span>}
      </td>

      <td className="py-3 px-4">
        <span className="text-sm text-gray-400">{formatDate(tx.date)}</span>
      </td>

      <td className="py-3 px-2">
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          {onDuplicate && !isTransfer && (
            <button onClick={() => onDuplicate(tx)}
              className="p-1.5 rounded-md text-gray-500 hover:text-blue-400 hover:bg-blue-500/10 transition-colors" title="Duplicate">
              <Copy size={13} />
            </button>
          )}
          <button onClick={() => onEdit(tx)}
            className="p-1.5 rounded-md text-gray-500 hover:text-violet-400 hover:bg-violet-500/10 transition-colors" title="Edit">
            <Pencil size={13} />
          </button>
          <button onClick={() => onDelete(tx.id)}
            className="p-1.5 rounded-md text-gray-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors" title="Delete">
            <Trash2 size={13} />
          </button>
        </div>
      </td>
    </tr>
  )
}
