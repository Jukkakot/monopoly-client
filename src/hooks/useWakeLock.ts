import { useEffect } from 'react'

// Minimal typing for the Screen Wake Lock API (not in every TS lib version).
interface WakeLockSentinelLike {
  released: boolean
  release: () => Promise<void>
  addEventListener: (type: 'release', listener: () => void) => void
}
interface WakeLockNavigator {
  wakeLock?: { request: (type: 'screen') => Promise<WakeLockSentinelLike> }
}

/**
 * Keeps the screen awake while `active` is true (e.g. an in-progress game), so the
 * phone doesn't sleep while you wait for opponents' turns. The OS releases the lock
 * whenever the tab is hidden, so we re-acquire on visibilitychange. No-op on browsers
 * without the API.
 */
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active) return
    const nav = navigator as unknown as WakeLockNavigator
    if (!nav.wakeLock) return

    let sentinel: WakeLockSentinelLike | null = null
    let cancelled = false

    const acquire = async () => {
      if (document.visibilityState !== 'visible') return
      try {
        sentinel = await nav.wakeLock!.request('screen')
        // If the effect was torn down while awaiting, release immediately.
        if (cancelled) { sentinel.release().catch(() => {}); sentinel = null }
      } catch {
        // Rejected (e.g. low battery, permissions) — nothing to do.
      }
    }

    const onVisibility = () => { if (document.visibilityState === 'visible') acquire() }

    acquire()
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisibility)
      sentinel?.release().catch(() => {})
      sentinel = null
    }
  }, [active])
}
