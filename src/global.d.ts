// Global test helper: accumulated error log readable by Playwright
// Populated by GameContext when a command is rejected or a network error occurs.
// Only active in browser environments where window is available.
declare interface Window {
  __monopolyErrorLog: string[]
}
