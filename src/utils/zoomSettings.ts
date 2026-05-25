const LS_KEY_ENABLED = 'monopoly_zoom_enabled'
const LS_KEY_ALL_PLAYERS = 'monopoly_zoom_all_players'
const _listeners = new Set<() => void>()

export function loadZoomEnabled(): boolean {
  try { return localStorage.getItem(LS_KEY_ENABLED) !== 'false' } catch { return true }
}

export function saveZoomEnabled(v: boolean) {
  try { localStorage.setItem(LS_KEY_ENABLED, v ? 'true' : 'false') } catch {}
  for (const fn of _listeners) fn()
}

export function loadZoomAllPlayers(): boolean {
  try { return localStorage.getItem(LS_KEY_ALL_PLAYERS) === 'true' } catch { return false }
}

export function saveZoomAllPlayers(v: boolean) {
  try { localStorage.setItem(LS_KEY_ALL_PLAYERS, v ? 'true' : 'false') } catch {}
  for (const fn of _listeners) fn()
}

export function onZoomSettingChange(fn: () => void): () => void {
  _listeners.add(fn)
  return () => _listeners.delete(fn)
}
