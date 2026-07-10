import { appendFileSync, readFileSync, writeFileSync, existsSync, rmSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

// A shared on-disk log of every backend session the tests create. Per-test
// try/finally cleanup deletes sessions eagerly, but a Playwright/Vitest timeout
// or worker crash aborts the test before `finally` runs — leaking the game on
// the shared backend. This file is the safety net: globalSetup clears it, every
// create* helper appends to it, and the global teardown deletes whatever is left.
//
// A plain append-only file (not an in-memory Set) is deliberate: tests run in
// separate worker processes, so only a shared file survives across them and is
// still readable by the single teardown process.
const TRACK_FILE = fileURLToPath(new URL('../.test-sessions', import.meta.url))

const BASE = process.env.VITE_API_BASE ?? 'https://monopoly-backend-bv41.onrender.com'

/** Record a freshly created session id so it is guaranteed to be cleaned up. */
export function recordSession(sid: string): void {
  try { appendFileSync(TRACK_FILE, sid + '\n') } catch { /* best-effort */ }
}

/** Reset the tracking file at the start of a run. */
export function clearTracked(): void {
  try { rmSync(TRACK_FILE, { force: true }) } catch { /* ignore */ }
}

/**
 * Delete every tracked session, then remove the tracking file. Safe to call on
 * already-deleted sessions (the backend simply 404s). Never throws — teardown
 * must not fail a run.
 */
export async function cleanupTracked(): Promise<void> {
  if (!existsSync(TRACK_FILE)) return
  let ids: string[] = []
  try {
    ids = [...new Set(readFileSync(TRACK_FILE, 'utf8').split('\n').map(s => s.trim()).filter(Boolean))]
  } catch { /* ignore */ }
  if (ids.length > 0) {
    console.log(`🧹 Cleaning up ${ids.length} test session(s)...`)
    await Promise.all(ids.map(sid =>
      fetch(`${BASE}/sessions/${sid}`, { method: 'DELETE' }).catch(() => { /* best-effort */ })
    ))
  }
  try { writeFileSync(TRACK_FILE, '') } catch { /* ignore */ }
  try { rmSync(TRACK_FILE, { force: true }) } catch { /* ignore */ }
}
