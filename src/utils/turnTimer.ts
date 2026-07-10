export type TurnUrgency = 'hidden' | 'normal' | 'slow' | 'idle'

/**
 * Classifies how long the active player has been on their turn, so the UI can
 * stay quiet on fast turns and only surface an AFK hint when someone stalls.
 * Under 3 s is hidden (fast/bot turns), then normal → slow (amber) → idle (red).
 * Pure → unit tested.
 */
export function turnUrgency(seconds: number): TurnUrgency {
  if (seconds < 3) return 'hidden'
  if (seconds < 20) return 'normal'
  if (seconds < 45) return 'slow'
  return 'idle'
}

/** Formats an elapsed second count as `M:SS` (e.g. 75 → "1:15"). */
export function formatTurnDuration(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds))
  const m = Math.floor(s / 60)
  const rem = s % 60
  return `${m}:${rem.toString().padStart(2, '0')}`
}
