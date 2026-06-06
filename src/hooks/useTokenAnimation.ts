import { useState, useEffect, useRef } from 'react'
import { useGame } from '../store/GameContext'
import { playTokenMove, playGoToJail } from '../utils/sounds'
import { loadAnimationSpeed, getAnimationConfig, applyAnimationSpeedToCss } from '../utils/animationSettings'

const BOARD_SIZE = 40
const JAIL_INDEX = 10

// Apply CSS variables for animation durations on module load
applyAnimationSpeedToCss(loadAnimationSpeed())

function cfg() { return getAnimationConfig(loadAnimationSpeed()) }

// Card types that move the player (non-jail; jail is handled separately)
function isMovementCard(key: string | null): boolean {
  if (!key) return false
  return /:MOVE:|:MOVE_NEAREST:|:MOVE_BACK_3:/.test(key)
}

function isBackThreeCard(key: string | null): boolean {
  return key != null && key.includes(':MOVE_BACK_3:')
}

// Module-level animation state so any component can subscribe
const _animatingPlayers = new Set<string>()
const _jailingPlayers = new Set<string>()
const _cardJumpingPlayers = new Set<string>()
const _steppingPlayers = new Map<string, number>()  // briefly set on each step landing; value = hop variant 0–2
const _landingPlayers = new Set<string>()   // briefly set on final destination landing
const _listeners = new Set<() => void>()
// Module-level settled positions and queue refs — shared between hook instances and skipAllAnimations
const _settledPositions = new Map<string, number>()
const _queues = new Map<string, number[]>()
type DisplayPositionSetter = (fn: (prev: Map<string, number>) => Map<string, number>) => void
const _displaySetters = new Set<DisplayPositionSetter>()

function notifyListeners() {
  for (const fn of _listeners) fn()
}

function setPlayerAnimating(pid: string, animating: boolean) {
  const changed = animating ? !_animatingPlayers.has(pid) : _animatingPlayers.has(pid)
  if (!changed) return
  if (animating) _animatingPlayers.add(pid)
  else _animatingPlayers.delete(pid)
  notifyListeners()
}

function setPlayerJailing(pid: string, jailing: boolean) {
  const changed = jailing ? !_jailingPlayers.has(pid) : _jailingPlayers.has(pid)
  if (!changed) return
  if (jailing) _jailingPlayers.add(pid)
  else _jailingPlayers.delete(pid)
  notifyListeners()
}

function setPlayerCardJumping(pid: string, jumping: boolean) {
  const changed = jumping ? !_cardJumpingPlayers.has(pid) : _cardJumpingPlayers.has(pid)
  if (!changed) return
  if (jumping) _cardJumpingPlayers.add(pid)
  else _cardJumpingPlayers.delete(pid)
  notifyListeners()
}

function flashPlayerStepping(pid: string) {
  _steppingPlayers.set(pid, Math.floor(Math.random() * 3))
  notifyListeners()
  setTimeout(() => {
    _steppingPlayers.delete(pid)
    notifyListeners()
  }, cfg().stepHopCssMs)
}

function flashPlayerLanding(pid: string) {
  _landingPlayers.add(pid)
  notifyListeners()
  setTimeout(() => {
    _landingPlayers.delete(pid)
    notifyListeners()
  }, cfg().landingCssMs)
}

// Non-hook: read animation state outside React render cycle (for snapshot queue)
export function isAnyPlayerAnimating(): boolean {
  return _animatingPlayers.size > 0
}

// Non-hook: instantly snap all animating players to their settled position and stop animation.
// Called by the "skip animation" button on the board.
export function skipAllAnimations(): void {
  if (_animatingPlayers.size === 0) return
  // Snap display positions to settled positions for all animating players
  if (_settledPositions.size > 0 && _displaySetters.size > 0) {
    const snapped = new Map(_settledPositions)
    for (const setter of _displaySetters) {
      setter(prev => {
        const next = new Map(prev)
        for (const [pid, idx] of snapped) next.set(pid, idx)
        return next
      })
    }
  }
  for (const pid of Array.from(_animatingPlayers)) {
    _queues.delete(pid)
    setPlayerAnimating(pid, false)
    setPlayerJailing(pid, false)
    setPlayerCardJumping(pid, false)
    _steppingPlayers.delete(pid)
    _landingPlayers.delete(pid)
  }
  notifyListeners()
}

// Non-hook: subscribe to animation-idle transitions (fires each time _animatingPlayers → empty)
export function onAnimationIdle(fn: () => void): () => void {
  const wrapper = () => { if (_animatingPlayers.size === 0) fn() }
  _listeners.add(wrapper)
  return () => _listeners.delete(wrapper)
}

// Hook: returns true while any token is mid-animation
export function useIsAnimating(): boolean {
  const [animating, setAnimating] = useState(_animatingPlayers.size > 0)
  useEffect(() => {
    const update = () => setAnimating(_animatingPlayers.size > 0)
    _listeners.add(update)
    return () => { _listeners.delete(update) }
  }, [])
  return animating
}

// Hook: returns the set of playerIds currently mid-animation
export function useAnimatingPlayers(): Set<string> {
  const [animating, setAnimating] = useState(() => new Set<string>(_animatingPlayers))
  useEffect(() => {
    const update = () => setAnimating(new Set(_animatingPlayers))
    _listeners.add(update)
    return () => { _listeners.delete(update) }
  }, [])
  return animating
}

// Hook: returns set of playerIds currently doing jail-fly animation
export function useJailingPlayers(): Set<string> {
  const [jailing, setJailing] = useState(() => new Set<string>(_jailingPlayers))
  useEffect(() => {
    const update = () => setJailing(new Set(_jailingPlayers))
    _listeners.add(update)
    return () => { _listeners.delete(update) }
  }, [])
  return jailing
}

// Hook: returns set of playerIds currently doing card-jump animation
export function useCardJumpingPlayers(): Set<string> {
  const [jumping, setJumping] = useState(() => new Set<string>(_cardJumpingPlayers))
  useEffect(() => {
    const update = () => setJumping(new Set(_cardJumpingPlayers))
    _listeners.add(update)
    return () => { _listeners.delete(update) }
  }, [])
  return jumping
}

// Hook: returns map of playerId → hop variant (0–2) for players currently mid-step
export function useSteppingPlayers(): Map<string, number> {
  const [stepping, setStepping] = useState(() => new Map<string, number>(_steppingPlayers))
  useEffect(() => {
    const update = () => setStepping(new Map(_steppingPlayers))
    _listeners.add(update)
    return () => { _listeners.delete(update) }
  }, [])
  return stepping
}

// Hook: returns set of playerIds who just landed on their final destination
export function useLandingPlayers(): Set<string> {
  const [landing, setLanding] = useState(() => new Set<string>(_landingPlayers))
  useEffect(() => {
    const update = () => setLanding(new Set(_landingPlayers))
    _listeners.add(update)
    return () => { _listeners.delete(update) }
  }, [])
  return landing
}

// Returns animated positions: Map<playerId, displayIndex>
export function useTokenAnimation(): Map<string, number> {
  const { state } = useGame()
  const snapshot = state.snapshot
  const settledRef = useRef<Map<string, number>>(_settledPositions)
  const [displayPositions, setDisplayPositions] = useState<Map<string, number>>(new Map())
  const queueRef = useRef<Map<string, number[]>>(_queues)
  const localAnimatingRef = useRef(new Set<string>())

  // Register/unregister display-position setter so skipAllAnimations can snap tokens
  useEffect(() => {
    _displaySetters.add(setDisplayPositions)
    return () => { _displaySetters.delete(setDisplayPositions) }
  }, [])
  const prevInJailRef = useRef<Map<string, boolean>>(new Map())
  const prevCardKeyRef = useRef<string | null>(null)
  // Set when a MOVE_BACK_3 card is first seen; cleared once the backward steps are queued.
  // Needed because the card key appears in the WAITING_FOR_CARD_ACK snapshot (player not yet
  // moved), then is unchanged in the follow-up snapshot (player moved) — so cardKeyChanged is
  // false by the time we need to animate, and without this flag it falls through to forward walk.
  const pendingBackThreeRef = useRef(false)

  useEffect(() => {
    if (!snapshot) return

    const cardKeyChanged = snapshot.lastCardKey !== null &&
                           snapshot.lastCardKey !== prevCardKeyRef.current
    const isCardMove = cardKeyChanged && isMovementCard(snapshot.lastCardKey)
    const isCardBackThree = isCardMove && isBackThreeCard(snapshot.lastCardKey)
    if (isCardBackThree) pendingBackThreeRef.current = true

    for (const player of snapshot.players) {
      if (player.bankrupt || player.eliminated) continue
      const pid = player.playerId
      const currentIdx = player.boardIndex
      const settledIdx = settledRef.current.get(pid)

      if (settledIdx === undefined) {
        settledRef.current.set(pid, currentIdx)
        prevInJailRef.current.set(pid, player.inJail)
        setDisplayPositions(prev => new Map(prev).set(pid, currentIdx))
        continue
      }

      const wasInJail = prevInJailRef.current.get(pid) ?? player.inJail
      prevInJailRef.current.set(pid, player.inJail)

      if (settledIdx === currentIdx) continue

      // Jail fly: skip step-by-step, jump directly with scaled duration
      if (!wasInJail && player.inJail && currentIdx === JAIL_INDEX) {
        const dist = (JAIL_INDEX - settledIdx + BOARD_SIZE) % BOARD_SIZE
        const { jailBlockMin, jailBlockMax } = cfg()
        const blockDuration = Math.max(jailBlockMin, Math.min(jailBlockMax, jailBlockMin + (dist / 39) * (jailBlockMax - jailBlockMin)))

        settledRef.current.set(pid, JAIL_INDEX)
        queueRef.current.delete(pid)
        setDisplayPositions(prev => new Map(prev).set(pid, JAIL_INDEX))

        if (!localAnimatingRef.current.has(pid)) {
          localAnimatingRef.current.add(pid)
          setPlayerAnimating(pid, true)
          setPlayerJailing(pid, true)
          playGoToJail()
          setTimeout(() => setPlayerJailing(pid, false), cfg().jailArriveCssMs)
          setTimeout(() => {
            localAnimatingRef.current.delete(pid)
            setPlayerAnimating(pid, false)
          }, blockDuration)
        }
        continue
      }

      // Back-3 card: step backward one at a time.
      // pendingBackThreeRef is set on the WAITING_FOR_CARD_ACK snapshot where cardKeyChanged=true
      // but currentIdx === settledIdx (no movement yet). Here, when the player actually moves,
      // cardKeyChanged is false (same key) so we rely on the persisted flag.
      if (pendingBackThreeRef.current) {
        pendingBackThreeRef.current = false
        const backDist = (settledIdx - currentIdx + BOARD_SIZE) % BOARD_SIZE
        if (backDist > 0 && backDist <= 3) {
          // Genuine back-3 move: animate backward step by step
          const steps: number[] = []
          let pos = settledIdx
          while (pos !== currentIdx) {
            pos = (pos - 1 + BOARD_SIZE) % BOARD_SIZE
            steps.push(pos)
          }
          settledRef.current.set(pid, currentIdx)
          if (steps.length > 0) {
            const existing = queueRef.current.get(pid) ?? []
            queueRef.current.set(pid, [...existing, ...steps])
            if (!localAnimatingRef.current.has(pid)) {
              animatePlayer(pid)
            }
          }
          continue
        }
        // Flag was stale (e.g. doubles roll after back-3 card): fall through to forward walk
      }

      // Card move: jump directly (no step-by-step walk)
      if (isCardMove) {
        const dist = Math.min(
          (currentIdx - settledIdx + BOARD_SIZE) % BOARD_SIZE,
          (settledIdx - currentIdx + BOARD_SIZE) % BOARD_SIZE
        )
        const { cardBlockMin, cardBlockMax } = cfg()
        const blockDuration = Math.max(cardBlockMin, Math.min(cardBlockMax, cardBlockMin + (dist / 39) * (cardBlockMax - cardBlockMin)))

        settledRef.current.set(pid, currentIdx)
        queueRef.current.delete(pid)
        setDisplayPositions(prev => new Map(prev).set(pid, currentIdx))

        if (!localAnimatingRef.current.has(pid)) {
          localAnimatingRef.current.add(pid)
          setPlayerAnimating(pid, true)
          setPlayerCardJumping(pid, true)
          setTimeout(() => setPlayerCardJumping(pid, false), cfg().cardArriveCssMs)
          setTimeout(() => {
            localAnimatingRef.current.delete(pid)
            setPlayerAnimating(pid, false)
          }, blockDuration)
        }
        continue
      }

      const steps: number[] = []
      let pos = settledIdx
      while (pos !== currentIdx) {
        pos = (pos + 1) % BOARD_SIZE
        steps.push(pos)
      }

      settledRef.current.set(pid, currentIdx)
      if (steps.length === 0) continue

      const existing = queueRef.current.get(pid) ?? []
      queueRef.current.set(pid, [...existing, ...steps])

      if (!localAnimatingRef.current.has(pid)) {
        animatePlayer(pid, existing.length === 0 ? cfg().diceToMoveDelayMs : 0)
      }
    }

    prevCardKeyRef.current = snapshot.lastCardKey
  }, [snapshot])

  function animatePlayer(pid: string, initialDelayMs = 0) {
    localAnimatingRef.current.add(pid)
    setPlayerAnimating(pid, true)

    function step() {
      const queue = queueRef.current.get(pid) ?? []
      if (queue.length === 0) {
        localAnimatingRef.current.delete(pid)
        setPlayerAnimating(pid, false)
        flashPlayerLanding(pid)
        return
      }
      const next = queue[0]
      queueRef.current.set(pid, queue.slice(1))
      setDisplayPositions(prev => new Map(prev).set(pid, next))
      flashPlayerStepping(pid)
      playTokenMove()
      const jitter = (Math.random() * 2 - 1) * cfg().stepJitter
      setTimeout(step, cfg().stepMs + jitter)
    }

    const jitter = (Math.random() * 2 - 1) * cfg().stepJitter
    setTimeout(step, initialDelayMs + cfg().stepMs + jitter)
  }

  return displayPositions
}
