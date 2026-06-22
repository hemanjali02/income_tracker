import { useEffect, useRef } from 'react'
import { AlertTriangle } from 'lucide-react'
import Modal from './Modal'

export default function ConfirmDialog({ title, message, onConfirm, onCancel, danger = true }) {
  const cancelRef = useRef(null)
  useEffect(() => { cancelRef.current?.focus() }, [])

  return (
    <Modal onClose={onCancel} maxWidth="sm" hideHeader>
      {(dismiss) => (
        <div className="p-6">
          <div className="flex items-start gap-4 mb-5">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
              danger ? 'bg-rose-500/15 border border-rose-500/30' : 'bg-purple-500/15 border border-purple-500/30'
            }`}>
              <AlertTriangle size={18} className={danger ? 'text-rose-400' : 'text-purple-400'} />
            </div>
            <div>
              <h3 className="text-white font-semibold text-sm">{title}</h3>
              <p className="text-gray-400 text-sm mt-1">{message}</p>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              ref={cancelRef}
              onClick={dismiss}
              className="px-4 py-2 text-sm text-gray-400 hover:text-white bg-bg-elevated border border-line-subtle rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => { onConfirm(); dismiss() }}
              className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors ${
                danger ? 'bg-rose-600 hover:bg-rose-500' : 'bg-purple-600 hover:bg-purple-500'
              }`}
            >
              Confirm
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}
