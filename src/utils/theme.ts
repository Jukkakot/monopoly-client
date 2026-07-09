export type ThemePref = 'system' | 'light' | 'dark'

const KEY = 'monopoly_theme'

export function loadThemePref(): ThemePref {
  try {
    const v = localStorage.getItem(KEY)
    if (v === 'light' || v === 'dark' || v === 'system') return v
  } catch { /* ignore */ }
  return 'system'
}

export function saveThemePref(pref: ThemePref) {
  try { localStorage.setItem(KEY, pref) } catch { /* ignore */ }
}

/** Resolves a preference to the concrete theme, following the OS for 'system'. */
export function resolveTheme(pref: ThemePref): 'light' | 'dark' {
  if (pref === 'system') {
    return typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light'
  }
  return pref
}

/** Stamps the resolved theme onto <html data-theme> so the CSS token overrides apply. */
export function applyTheme(pref: ThemePref) {
  if (typeof document === 'undefined') return
  document.documentElement.setAttribute('data-theme', resolveTheme(pref))
}

/**
 * Applies the stored preference now and keeps it in sync with OS changes while the
 * preference is 'system'. Returns a disposer. Call once at app boot.
 */
export function initTheme(): () => void {
  applyTheme(loadThemePref())
  if (typeof matchMedia === 'undefined') return () => {}
  const mq = matchMedia('(prefers-color-scheme: dark)')
  const onChange = () => { if (loadThemePref() === 'system') applyTheme('system') }
  mq.addEventListener('change', onChange)
  return () => mq.removeEventListener('change', onChange)
}
