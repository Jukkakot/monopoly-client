import { useEffect } from 'react'

/**
 * Calls `handler` when Escape is pressed while `active`. Lets modals/overlays be
 * dismissed from the keyboard, a basic accessibility expectation that was missing.
 */
export function useEscapeKey(handler: () => void, active = true) {
  useEffect(() => {
    if (!active) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') handler() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [handler, active])
}
