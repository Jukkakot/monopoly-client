import { useState, useEffect, useRef } from 'react'
import { useGame } from '../store/GameContext'
import { playTokenMove, playGoToJail } from '../utils/sounds'

const STEP_MS = 390
const BOARD_SIZE = 40
const JAIL_INDEX = 10
const JAIL_ARRIVE_CSS_MS = 700  // must match CSS animation duration

// Module-level animation state so any component can subscribe
const _animatingPlayers = new Set<string>()
const _jailingPlayers = new Set<string>()
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

// Returns animated positions: Map<playerId, displayIndex>
export function useTokenAnimation(): Map<string, number> {
  const { state } = useGame()
  const snapshot = state.snapshot
  const settledRef = useRef<Map<string, number>>(new Map())
  const [displayPositions, setDisplayPositions] = useState<Map<string, number>>(new Map())
  const queueRef = useRef<Map<string, number[]>>(new Map())
  const localAnimatingRef = useRef(new Set<string>())
  const prevInJailRef = useRef<Map<string, boolean>>(new Map())

  useEffect(() => {
    if (!snapshot) return

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
