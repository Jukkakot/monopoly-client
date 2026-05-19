import { useRef, useEffect, useState } from 'react'
import styles from './PlayerList.module.css'
import type { SessionState } from '../../types/api'
import { SPOTS } from '../../types/spots'

interface Props {
  state: SessionState
}

export default function PlayerList({ state }: Props) {
  const activeId = state.turn?.activePlayerId
  const prevCash = useRef<Map<string, number>>(new Map())
  const [flashMap, setFlashMap] = useState<Map<string, 'up' | 'down'>>(new Map())

  useEffect(() => {
    const newFlash = new Map<string, 'up' | 'down'>()
    for (const player of state.players) {
      const prev = prevCash.current.get(player.playerId)
      if (prev !== undefined && prev !== player.cash) {
        newFlash.set(player.playerId, player.cash > prev ? 'up' : 'down')
      }
      prevCash.current.set(player.playerId, player.cash)
    }
    if (newFlash.size > 0) {
      setFlashMap(newFlash)
      const t = setTimeout(() => setFlashMap(new Map()), 600)
      return () => clearTimeout(t)
    }
  }, [state.players])

  return (
    <div className={styles.list}>
      {state.players.map(player => {
        const seat = state.seats.find(s => s.playerId === player.playerId)
        const spotName = SPOTS[player.boardIndex]?.name ?? `#${player.boardIndex}`
        const isActive = player.playerId === activeId
        const isBankrupt = player.bankrupt || player.eliminated
        const flash = flashMap.get(player.playerId)

        return (
          <div
            key={player.playerId}
            className={`${styles.card} ${isActive ? styles.active : ''} ${isBankrupt ? styles.bankrupt : ''}`}
          >
            <svg className={styles.token} width="28" height="28" viewBox="0 0 28 28">
              <circle cx="14" cy="14" r="13" fill={seat?.tokenColorHex ?? '#888'} stroke="#fff" strokeWidth="2" />
            </svg>
            <div className={styles.info}>
              <div className={styles.name}>
                {player.name}
                {isBankrupt && <span className={styles.badge}>konkurssi</span>}
                {player.inJail && !isBankrupt && <span className={styles.badge}>🔒</span>}
              </div>
              <div className={styles.details}>
                {spotName} · {player.ownedPropertyIds.length} kiinteistöä
              </div>
            </div>
            <div className={`${styles.cash} ${flash === 'up' ? styles.cashUp : flash === 'down' ? styles.cashDown : ''}`}>
              €{player.cash}
            </div>
          </div>
        )
      })}
    </div>
  )
}
