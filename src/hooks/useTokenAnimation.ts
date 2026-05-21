import { useState, useEffect, useRef } from 'react'
import { useGame } from '../store/GameContext'
import { playTokenMove, playGoToJail } from '../utils/sounds'

const STEP_MS = 390
const BOARD_SIZE = 40
const JAIL_INDEX = 10
const JAIL_ARRIVE_CSS_MS = 700  // must match CSS animation duration
const CARD_ARRIVE_CSS_MS = 500  // must match .cardArrive animation duration

// Card types that move the player (non-jail; jail is handled separately)
function isMovementCard(key: string | null): boolean {
  if (!key) return false
  return /:MOVE:|:MOVE_NEAREST:|:MOVE_BACK_3:/.test(key)
}

// Module-level animation state so any component can subscribe
const _animatingPlayers = new Set<string>()
const _jailingPlayers = new Set<string>()
const _cardJumpingPlayers = new Set<string>()
const _listeners = new Set<() => void>()

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

// Returns animated positions: Map<playerId, displayIndex>
export function useTokenAnimation(): Map<string, number> {
  const { state } = useGame()
  const snapshot = state.snapshot
  const settledRef = useRef<Map<string, number>>(new Map())
  const [displayPositions, setDisplayPositions] = useState<Map<string, number>>(new Map())
  const queueRef = useRef<Map<string, number[]>>(new Map())
  const localAnimatingRef = useRef(new Set<string>())
  const prevInJailRef = useRef<Map<string, boolean>>(new Map())
  const prevCardKeyRef = useRef<string | null>(null)

  useEffect(() => {
    if (!snapshot) return

    const cardKeyChanged = snapshot.lastCardKey !== null &&
                           snapshot.lastCardKey !== prevCardKeyRef.current
    const isCardMove = cardKeyChanged && isMovementCard(snapshot.lastCardKey)

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
        const blockDuration = Math.max(600, Math.min(2000, 600 + (dist / 39) * 1400))

        settledRef.current.set(pid, JAIL_INDEX)
        queueRef.current.delete(pid)
        setDisplayPositions(prev => new Map(prev).set(pid, JAIL_INDEX))

        if (!localAnimatingRef.current.has(pid)) {
          localAnimatingRef.current.add(pid)
          setPlayerAnimating(pid, true)
          setPlayerJailing(pid, true)
          playGoToJail()
          setTimeout(() => setPlayerJailing(pid, false), JAIL_ARRIVE_CSS_MS)
          setTimeout(() => {
            localAnimatingRef.current.delete(pid)
            setPlayerAnimating(pid, false)
          }, blockDuration)
        }
        continue
      }

      // Card move: jump directly (no step-by-step walk)
      if (isCardMove) {
        const dist = Math.min(
          (currentIdx - settledIdx + BOARD_SIZE) % BOARD_SIZE,
          (settledIdx - currentIdx + BOARD_SIZE) % BOARD_SIZE
        )
        const blockDuration = Math.max(500, Math.min(1400, 500 + (dist / 39) * 900))

        settledRef.current.set(pid, currentIdx)
        queueRef.current.delete(pid)
        setDisplayPositions(prev => new Map(prev).set(pid, currentIdx))

        if (!localAnimatingRef.current.has(pid)) {
          localAnimatingRef.current.add(pid)
          setPlayerAnimating(pid, true)
          setPlayerCardJumping(pid, true)
          setTimeout(() => setPlayerCardJumping(pid, false), CARD_ARRIVE_CSS_MS)
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
        animatePlayer(pid)
      }
    }

    prevCardKeyRef.current = snapshot.lastCardKey
  }, [snapshot])

  function animatePlayer(pid: string) {
    localAnimatingRef.current.add(pid)
    setPlayerAnimating(pid, true)

    function step() {
      const queue = queueRef.current.get(pid) ?? []
      if (queue.length === 0) {
        localAnimatingRef.current.delete(pid)
        setPlayerAnimating(pid, false)
        return
      }
      const next = queue[0]
      queueRef.current.set(pid, queue.slice(1))
      setDisplayPositions(prev => new Map(prev).set(pid, next))
      playTokenMove()
      setTimeout(step, STEP_MS)
    }

    setTimeout(step, STEP_MS)
  }

  return displayPositions
}
