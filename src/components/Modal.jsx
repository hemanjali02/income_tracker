import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'

/**
 * Shared modal wrapper with spring slide-up animation.
 *
 * Usage:
 *   <Modal onClose={...} title="..." subtitle="..." maxWidth="md">
 *     <form>...</form>
 *   </Modal>
 *
 * - Slides up from bottom with spring physics
 * - Backdrop fades in/out
 * - Closes on backdrop click, X button, or Escape
 * - Plays exit animation before unmounting (260ms)
 */
export default function Modal({
  children,
  onClose,
  title,
  subtitle,
  icon: Icon,
  iconColor = '#a78bfa',
  maxWidth = 'md',
  hideHeader = false,
  hideCloseButton = false,
}) {
  const [visible, setVisible] = useState(true)

  function dismiss() {
    setVisible(false)
    setTimeout(onClose, 260)
  }

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') dismiss() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const widthMap = {
    xs: 'max-w-xs',
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
  }

  return (
    <AnimatePresence>
      {visible && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={dismiss}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 220, damping: 28 }}
            onClick={e => e.stopPropagation()}
            className={`relative glass rounded-t-2xl sm:rounded-2xl w-full ${widthMap[maxWidth] || widthMap.md} shadow-2xl max-h-[90vh] flex flex-col overflow-hidden`}
          >
            {!hideHeader && (title || subtitle || !hideCloseButton) && (
              <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-line sticky top-0 bg-bg-card/95 backdrop-blur-md z-10 flex-shrink-0">
                <div className="flex items-center gap-2.5 min-w-0">
                  {Icon && <Icon size={16} style={{ color: iconColor }} className="flex-shrink-0" />}
                  <div className="min-w-0">
                    {title && <h2 className="text-white font-semibold text-base truncate">{title}</h2>}
                    {subtitle && <p className="text-xs text-gray-500 mt-0.5 truncate">{subtitle}</p>}
                  </div>
                </div>
                {!hideCloseButton && (
                  <button onClick={dismiss} className="text-gray-400 hover:text-white transition-colors p-1 -mr-1">
                    <X size={18} />
                  </button>
                )}
              </div>
            )}
            <div className="overflow-y-auto flex-1">
              {typeof children === 'function' ? children(dismiss) : children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
