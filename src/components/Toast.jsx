import { motion, AnimatePresence } from 'framer-motion'
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react'
import { useToast } from '../context/ToastContext'

const icons = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
}

const colors = {
  success: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
  error:   'border-rose-500/40 bg-rose-500/10 text-rose-300',
  info:    'border-blue-500/40 bg-blue-500/10 text-blue-300',
}

export default function Toasts() {
  const { toasts, removeToast } = useToast()

  return (
    <div className="fixed bottom-6 right-4 sm:right-6 z-[100] flex flex-col gap-2 max-w-sm w-[calc(100vw-2rem)] sm:w-auto pointer-events-none">
      <AnimatePresence initial={false}>
        {toasts.map(t => {
          const Icon = icons[t.type] || icons.info
          return (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, x: 40, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 320, damping: 26 }}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border shadow-2xl backdrop-blur-sm pointer-events-auto ${colors[t.type] || colors.info}`}
            >
              <Icon size={16} className="flex-shrink-0" />
              <span className="text-sm font-medium flex-1">{t.message}</span>
              {t.action && (
                <button
                  onClick={() => { t.action.onClick(); removeToast(t.id) }}
                  className="text-xs font-semibold underline underline-offset-2 opacity-80 hover:opacity-100 transition-opacity flex-shrink-0"
                >
                  {t.action.label}
                </button>
              )}
              <button onClick={() => removeToast(t.id)} className="opacity-40 hover:opacity-100 transition-opacity flex-shrink-0">
                <X size={14} />
              </button>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
