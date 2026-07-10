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
  const sheetRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // Focus management: move focus into the sheet on open, trap Tab within it, and restore
  // focus to the previously-focused element on close (a11y — no focus escaping behind a
  // modal, no lost focus after dismissal).
  useEffect(() => {
    const prevFocused = document.activeElement as HTMLElement | null
    const sheet = sheetRef.current
    const focusables = () => sheet
      ? Array.from(sheet.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'))
        .filter(el => !el.hasAttribute('disabled') && el.offsetParent !== null)
      : []
    sheet?.focus()

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      const els = focusables()
      if (els.length === 0) { e.preventDefault(); sheet?.focus(); return }
      const first = els[0], last = els[els.length - 1]
      const active = document.activeElement
      if (e.shiftKey && (active === first || active === sheet)) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      // Only restore if focus is still inside the (now-closing) sheet.
      if (!sheet || sheet.contains(document.activeElement)) prevFocused?.focus?.()
    }
  }, [])

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
        ref={sheetRef}
        tabIndex={-1}
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
