import { useEffect, useRef, useState } from 'react'
import styles from './AnimatedCash.module.css'

/** "+€200" / "−€150" for a floating delta chip. Uses a real minus sign (−) so the
 *  chip reads cleanly at small sizes. Exported for unit testing. */
export function formatCashDelta(amount: number): string {
  return `${amount > 0 ? '+' : '−'}€${Math.abs(amount)}`
}

interface Delta { id: number; amount: number }

/**
 * Cash amount that counts up/down smoothly on change and floats a +/− delta chip
 * upward that fades out — the classic mobile-game "money juice". The chip is
 * absolutely positioned (pointer-events:none) so it never affects layout flow.
 */
export default function AnimatedCash({ value }: { value: number }) {
  const [display, setDisplay] = useState(value)
  const [deltas, setDeltas] = useState<Delta[]>([])
  const prevRef = useRef(value)
  const frameRef = useRef(0)
  const idRef = useRef(0)

  useEffect(() => {
    const from = prevRef.current
    prevRef.current = value
    if (from === value) return

    // Float a delta chip for the change.
    const id = ++idRef.current
    setDeltas(d => [...d, { id, amount: value - from }])

    // Count the displayed number up/down (cubic ease-out).
    const duration = 350
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      setDisplay(Math.round(from + (value - from) * eased))
      if (t < 1) frameRef.current = requestAnimationFrame(tick)
    }
    frameRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frameRef.current)
  }, [value])

  return (
    <span className={styles.wrap}>
      {display}
      {deltas.map(d => (
        <span
          key={d.id}
          className={d.amount > 0 ? styles.deltaUp : styles.deltaDown}
          onAnimationEnd={() => setDeltas(list => list.filter(x => x.id !== d.id))}
        >
          {formatCashDelta(d.amount)}
        </span>
      ))}
    </span>
  )
}
