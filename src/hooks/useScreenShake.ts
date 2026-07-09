import { useCallback, useRef } from 'react'

/**
 * Returns a `shake()` trigger that briefly jolts the whole viewport by toggling the
 * global `screen-shake` class on <body> (keyframes live in index.css). Re-triggering
 * restarts the animation cleanly. No-op under prefers-reduced-motion via CSS.
 */
export function useScreenShake(): () => void {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  return useCallback(() => {
    if (typeof document === 'undefined') return
    const body = document.body
    body.classList.remove('screen-shake')
    // Force reflow so removing + re-adding restarts the animation.
    void body.offsetWidth
    body.classList.add('screen-shake')
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => body.classList.remove('screen-shake'), 550)
  }, [])
}
