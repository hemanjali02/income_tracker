// Shared framer-motion presets so every page animates with the same physics.

// Parent grid: staggers its children in.
export const gridStagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
}

// Child card: rises with a small spring.
export const cardRise = {
  hidden: { opacity: 0, y: 14, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 260, damping: 24 } },
}

// Spring used by the sidebar's sliding active indicator.
export const navSlide = { type: 'spring', stiffness: 380, damping: 32 }
