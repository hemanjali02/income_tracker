import { Sparkles } from 'lucide-react'

export default function ProBadge({ size = 'sm', className = '' }) {
  const sizes = {
    xs: 'text-[8px] px-1 py-0.5 gap-0.5',
    sm: 'text-[9px] px-1.5 py-0.5 gap-1',
  }
  return (
    <span className={`inline-flex items-center rounded font-bold uppercase tracking-wider
      bg-gradient-to-r from-violet-500/20 to-indigo-500/20 text-violet-300 border border-violet-500/30 ${sizes[size]} ${className}`}>
      <Sparkles size={size === 'xs' ? 7 : 9} />
      Pro
    </span>
  )
}
