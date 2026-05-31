// Shared input/label class strings — import these instead of re-declaring per component

export const inputCls = [
  'w-full bg-bg-input border border-line-subtle rounded-lg px-3 py-2.5 text-sm text-white',
  'placeholder-gray-500 focus:outline-none focus:border-violet-500',
  'focus:ring-2 focus:ring-violet-500/20 transition-colors',
].join(' ')

export const inputSmCls = [
  'w-full bg-bg-elevated border border-line-subtle rounded-lg px-3 py-2 text-sm text-white',
  'placeholder-gray-500 focus:outline-none focus:border-violet-500',
  'focus:ring-2 focus:ring-violet-500/20 transition-colors',
].join(' ')

export const labelCls = 'block text-xs font-medium text-gray-400 mb-1.5'
