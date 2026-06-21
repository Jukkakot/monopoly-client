declare const __APP_VERSION__: string

// Global test helpers populated by the app at runtime.
declare interface Window {
  /** Accumulated command rejection and network error log — readable by Playwright/E2E. */
  __monopolyErrorLog: string[]
  /** Returns a JSON string of SSE inter-event timings for debugging bot game pacing. */
  exportSSETimings: () => string
}
