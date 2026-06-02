import { useState, useCallback } from 'react'

function readFlag(): boolean {
  if (!import.meta.env.DEV) return false
  try {
    if (localStorage.getItem('monopoly_debug') === '1') return true
  } catch { /* ignore */ }
  return new URLSearchParams(window.location.search).get('debug') === '1'
}

/** Returns [isActive, toggle]. Toggle persists via localStorage. DEV-only. */
export function useDebugMode(): [boolean, () => void] {
  const [active, setActive] = useState(readFlag)

  const toggle = useCallback(() => {
    if (!import.meta.env.DEV) return
    setActive(prev => {
      const next = !prev
      try {
        if (next) localStorage.setItem('monopoly_debug', '1')
        else localStorage.removeItem('monopoly_debug')
      } catch { /* ignore */ }
      return next
    })
  }, [])

  return [active, toggle]
}
