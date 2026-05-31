/** Returns true when debug mode is active (localStorage flag or ?debug=1 URL param). */
export function useDebugMode(): boolean {
  if (!import.meta.env.DEV) return false
  try {
    if (localStorage.getItem('monopoly_debug') === '1') return true
  } catch { /* ignore */ }
  return new URLSearchParams(window.location.search).get('debug') === '1'
}
