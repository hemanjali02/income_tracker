import { useEffect, useState, useRef } from 'react'

/**
 * Pull-to-refresh gesture on touch devices.
 * Returns { pullDistance, refreshing } so the caller can render an indicator.
 *
 *   const { pullDistance, refreshing } = usePullToRefresh(async () => { ... })
 */
export default function usePullToRefresh(onRefresh, { threshold = 70, max = 120 } = {}) {
  const [pullDistance, setPullDistance] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const startY = useRef(0)
  const pulling = useRef(false)

  useEffect(() => {
    function onTouchStart(e) {
      // Only trigger when scrolled to the very top
      if (window.scrollY > 0) return
      startY.current = e.touches[0].clientY
      pulling.current = true
    }

    function onTouchMove(e) {
      if (!pulling.current || refreshing) return
      const dy = e.touches[0].clientY - startY.current
      if (dy <= 0) {
        setPullDistance(0)
        return
      }
      // Resistance — drag gets harder the further you pull
      const distance = Math.min(max, dy * 0.5)
      setPullDistance(distance)
    }

    async function onTouchEnd() {
      if (!pulling.current) return
      pulling.current = false
      if (pullDistance >= threshold && !refreshing) {
        setRefreshing(true)
        setPullDistance(threshold * 0.6) // keep indicator visible during refresh
        try {
          await onRefresh()
        } finally {
          setRefreshing(false)
          setPullDistance(0)
        }
      } else {
        setPullDistance(0)
      }
    }

    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchmove', onTouchMove, { passive: true })
    window.addEventListener('touchend', onTouchEnd, { passive: true })
    return () => {
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', onTouchEnd)
    }
  }, [pullDistance, refreshing, threshold, max, onRefresh])

  return { pullDistance, refreshing }
}
