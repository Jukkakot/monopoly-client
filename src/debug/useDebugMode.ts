import { useState, useCallback } from 'react'

function readFlag(): boolean {
  if (!import.meta.env.DEV) return false
  // Debug mode is NOT persisted — it must be enabled per-session via ?debug=1.
  // This prevents debug UI from accidentally being visible to real users.
  return new URLSearchParams(window.location.search).get('debug') === '1'
}

/** Returns [isActive, toggle]. Toggle is session-only (no localStorage). DEV-only. */
export function useDebugMode(): [boolean, () => void] {
  const [active, setActive] = useState(readFlag)

  const toggle = useCallback(() => {
    if (!import.meta.env.DEV) return
    setActive(prev => !prev)
  }, [])

  return [active, toggle]
}
