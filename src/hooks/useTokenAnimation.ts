import { useState, useEffect, useRef } from 'react'
import { useGame } from '../store/GameContext'
import { playTokenMove } from '../utils/sounds'

const STEP_MS = 390
const BOARD_SIZE = 40

// Module-level animation state so any component can subscribe
const _animatingPlayers = new Set<string>()
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

// Returns animated positions: Map<playerId, displayIndex>
export function useTokenAnimation(): Map<string, number> {
  const { state } = useGame()
  const snapshot = state.snapshot
  const settledRef = useRef<Map<string, number>>(new Map())
  const [displayPositions, setDisplayPositions] = useState<Map<string, number>>(new Map())
  const queueRef = useRef<Map<string, number[]>>(new Map())
  // Per-instance tracking (not global) so multiple Board instances don't block each other
  const localAnimatingRef = useRef(new Set<string>())

  useEffect(() => {
    if (!snapshot) return

    for (const player of snapshot.players) {
      if (player.bankrupt || player.eliminated) continue
      const pid = player.playerId
      const currentIdx = player.boardIndex
      const settledIdx = settledRef.current.get(pid)

      if (settledIdx === undefined) {
        settledRef.current.set(pid, currentIdx)
        setDisplayPositions(prev => new Map(prev).set(pid, currentIdx))
        continue
      }

      if (settledIdx === currentIdx) continue

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
