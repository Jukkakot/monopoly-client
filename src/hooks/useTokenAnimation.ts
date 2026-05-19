import { useState, useEffect, useRef } from 'react'
import { useGame } from '../store/GameContext'
import { playTokenMove } from '../utils/sounds'

const STEP_MS = 130
const BOARD_SIZE = 40

// Returns animated positions: Map<playerId, displayIndex>
export function useTokenAnimation(): Map<string, number> {
  const { state } = useGame()
  const snapshot = state.snapshot
  // Track last known board indices (settled positions)
  const settledRef = useRef<Map<string, number>>(new Map())
  // Animated display positions
  const [displayPositions, setDisplayPositions] = useState<Map<string, number>>(new Map())
  // Queue of pending animations
  const queueRef = useRef<Map<string, number[]>>(new Map())
  const animatingRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (!snapshot) return

    for (const player of snapshot.players) {
      if (player.bankrupt || player.eliminated) continue
      const pid = player.playerId
      const currentIdx = player.boardIndex
      const settledIdx = settledRef.current.get(pid)

      if (settledIdx === undefined) {
        // First time seeing this player
        settledRef.current.set(pid, currentIdx)
        setDisplayPositions(prev => new Map(prev).set(pid, currentIdx))
        continue
      }

      if (settledIdx === currentIdx) continue

      // Build step-by-step path from settled to current
      const steps: number[] = []
      let pos = settledIdx
      // Always move forward (clockwise) on the board
      while (pos !== currentIdx) {
        pos = (pos + 1) % BOARD_SIZE
        steps.push(pos)
      }

      // Update settled position immediately
      settledRef.current.set(pid, currentIdx)

      if (steps.length === 0) continue

      // Queue steps for animation
      const existing = queueRef.current.get(pid) ?? []
      queueRef.current.set(pid, [...existing, ...steps])

      // Start animating if not already
      if (!animatingRef.current.has(pid)) {
        animatePlayer(pid)
      }
    }
  }, [snapshot])

  function animatePlayer(pid: string) {
    animatingRef.current.add(pid)

    function step() {
      const queue = queueRef.current.get(pid) ?? []
      if (queue.length === 0) {
        animatingRef.current.delete(pid)
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
