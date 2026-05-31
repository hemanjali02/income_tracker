import { Check } from 'lucide-react'

const PRESET_COLORS = [
  '#7c3aed', '#6366f1', '#3b82f6', '#059669', '#dc2626',
  '#f59e0b', '#ec4899', '#06b6d4', '#84cc16', '#6b7280',
]

export default function ColorPicker({ value, onChange, colors = PRESET_COLORS }) {
  return (
    <div className="flex flex-wrap gap-2">
      {colors.map(c => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          className="w-6 h-6 rounded-full transition-transform hover:scale-110 flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: c }}
          title={c}
        >
          {value === c && <Check size={10} className="text-white" strokeWidth={3} />}
        </button>
      ))}
    </div>
  )
}
