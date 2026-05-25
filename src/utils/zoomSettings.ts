export type ZoomMode = 'off' | 'own' | 'all'

const LS_KEY = 'monopoly_zoom_mode'
const _listeners = new Set<() => void>()

export function loadZoomMode(): ZoomMode {
  try {
    const v = localStorage.getItem(LS_KEY)
    if (v === 'off' || v === 'own' || v === 'all') return v
    // migrate old keys
    const oldEnabled = localStorage.getItem('monopoly_zoom_enabled')
    if (oldEnabled === 'false') return 'off'
    const oldAll = localStorage.getItem('monopoly_zoom_all_players')
    return oldAll === 'true' ? 'all' : 'own'
  } catch { return 'own' }
}

export function saveZoomMode(mode: ZoomMode) {
  try { localStorage.setItem(LS_KEY, mode) } catch {}
  for (const fn of _listeners) fn()
}

export function onZoomSettingChange(fn: () => void): () => void {
  _listeners.add(fn)
  return () => _listeners.delete(fn)
}
