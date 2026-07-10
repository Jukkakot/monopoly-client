export type ConnectionQuality = 'good' | 'slow' | 'unstable'

/** A command round-trip time (ms) stamped with when it completed. */
export interface LatencySample { t: number; ms: number }

/** Reconnect episodes within this trailing window mean the link is flapping. */
export const RECONNECT_WINDOW_MS = 60_000
/** ≥ this many reconnects inside the window → "unstable". */
export const UNSTABLE_RECONNECTS = 2
/** Command round-trips slower than this count as a "slow" sample. */
export const WEAK_LATENCY_MS = 2500
/** Only latency samples from this trailing window are considered (so slow clears when it recovers). */
export const LATENCY_WINDOW_MS = 30_000
/** How many of the recent samples must be slow before we call the link slow. */
export const SLOW_SAMPLE = 4
export const SLOW_MIN_HITS = 2

/** Count reconnect episodes within the trailing window. */
export function recentReconnects(timestamps: number[], now: number, windowMs = RECONNECT_WINDOW_MS): number {
  return timestamps.reduce((n, t) => (now - t <= windowMs ? n + 1 : n), 0)
}

/**
 * Classifies the backend link from recent reconnect episodes and command round-trip
 * latencies. "unstable" (the link keeps dropping) outranks "slow" (round-trips drag).
 * A single slow round-trip (e.g. a cold Render spin-up) is ignored — it takes a couple of
 * recent slow samples in the window to trip. Pure → unit tested.
 */
export function assessConnection(reconnectTimestamps: number[], latencies: LatencySample[], now: number): ConnectionQuality {
  if (recentReconnects(reconnectTimestamps, now) >= UNSTABLE_RECONNECTS) return 'unstable'
  const recent = latencies.filter(s => now - s.t <= LATENCY_WINDOW_MS).slice(-SLOW_SAMPLE)
  const slowHits = recent.reduce((n, s) => (s.ms > WEAK_LATENCY_MS ? n + 1 : n), 0)
  if (slowHits >= SLOW_MIN_HITS) return 'slow'
  return 'good'
}
