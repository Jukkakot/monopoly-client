import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import styles from './BottomSheet.module.css'

interface Props {
  onClose: () => void
  children: ReactNode
  /** Accessible label for the dialog. */
  ariaLabel?: string
}

/**
 * Mobile-native modal container: slides up from the bottom edge as a bottom sheet
 * (full width, rounded top, grab handle, swipe-down-to-close) on phones, and renders
 * as a centered card on wider screens. Portaled to <body> and tagged `data-modal` so
 * the board's drag/swipe gestures suspend while it is open.
 *
 * Children provide their own content and padding — the sheet owns the surface (white
 * background, rounding, shadow, scroll).
 */
export default function BottomSheet({ onClose, children, ariaLabel }: Props) {
  const [dragY, setDragY] = useState(0)
  const startYRef = useRef<number | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function onGripTouchStart(e: React.TouchEvent) {
    startYRef.current = e.touches[0].clientY
  }
  function onGripTouchMove(e: React.TouchEvent) {
    if (startYRef.current === null) return
    // Only track downward drag; ignore upward.
    setDragY(Math.max(0, e.touches[0].clientY - startYRef.current))
  }
  function onGripTouchEnd() {
    if (startYRef.current === null) return
    const close = dragY > 90
    startYRef.current = null
    if (close) onClose()
    else setDragY(0)
  }

  return createPortal(
    <div className={styles.backdrop} data-modal onClick={onClose}>
      <div
        className={styles.sheet}
        style={dragY ? { transform: `translateY(${dragY}px)`, transition: 'none' } : undefined}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
      >
        <div
          className={styles.grip}
          onTouchStart={onGripTouchStart}
          onTouchMove={onGripTouchMove}
          onTouchEnd={onGripTouchEnd}
        >
          <span className={styles.gripBar} />
        </div>
        <div className={styles.body}>{children}</div>
      </div>
    </div>,
    document.body,
  )
}
