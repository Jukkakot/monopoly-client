const LS_KEY = 'monopoly_zoom_enabled'
const _listeners = new Set<() => void>()

export function loadZoomEnabled(): boolean {
  try { return localStorage.getItem(LS_KEY) !== 'false' } catch { return true }
}

export function saveZoomEnabled(v: boolean) {
  try { localStorage.setItem(LS_KEY, v ? 'true' : 'false') } catch {}
  for (const fn of _listeners) fn()
}

export function onZoomSettingChange(fn: () => void): () => void {
  _listeners.add(fn)
  return () => _listeners.delete(fn)
}
