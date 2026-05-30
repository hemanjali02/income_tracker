import { X, CheckCircle, AlertCircle, Info } from 'lucide-react'
import { useToast } from '../context/ToastContext'

const icons = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
}
const colors = {
  success: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
  error: 'border-red-500/40 bg-red-500/10 text-red-300',
  info: 'border-blue-500/40 bg-blue-500/10 text-blue-300',
}

export default function Toasts() {
  const { toasts, removeToast } = useToast()
  if (!toasts.length) return null

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 max-w-sm">
      {toasts.map(t => {
        const Icon = icons[t.type] || icons.info
        return (
          <div
            key={t.id}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl border shadow-2xl backdrop-blur-sm animate-in ${colors[t.type] || colors.info}`}
          >
            <Icon size={16} className="flex-shrink-0" />
            <span className="text-sm font-medium flex-1">{t.message}</span>
            <button onClick={() => removeToast(t.id)} className="opacity-50 hover:opacity-100 transition-opacity">
              <X size={14} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
