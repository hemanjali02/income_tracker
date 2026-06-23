import { useEffect, useState } from 'react'
import { motion, useSpring, useTransform } from 'framer-motion'

/**
 * Smoothly animates a numeric value with spring physics.
 *
 *   <AnimatedNumber value={amount} format={formatCurrency} />
 *
 * - Tweens between previous and new value (no jarring jumps)
 * - Uses spring physics, ~0.8s animation
 * - Always renders synchronously, so it's safe inside layout-sensitive parents
 */
export default function AnimatedNumber({ value, format = (v) => Math.round(v).toLocaleString('en-IN'), springConfig }) {
  const spring = useSpring(value, springConfig || { mass: 0.6, stiffness: 90, damping: 22 })
  const display = useTransform(spring, (current) => format(current))
  // Mirror in state so SSR / first paint match
  const [text, setText] = useState(format(value))

  useEffect(() => {
    spring.set(value)
    const unsub = display.on('change', (v) => setText(v))
    return unsub
  }, [value, spring, display])

  return <motion.span>{text}</motion.span>
}
