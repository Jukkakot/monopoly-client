import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import styles from './GameOverOverlay.module.css'
import type { SessionState } from '../../types/api'
import { loadTokenShapes } from '../../utils/tokenShapes'
import { TokenSvg } from '../board/TokenSvg'
import { useT } from '../../i18n/LanguageContext'

interface Props {
  state: SessionState
}

const MEDALS = ['🥇', '🥈', '🥉']

export default function GameOverOverlay({ state }: Props) {
  const navigate = useNavigate()
  const t = useT()
  const [dismissed, setDismissed] = useState(false)
  const [copied, setCopied] = useState(false)

  const shareResults = useCallback(() => {
    const sorted = [...state.players].sort((a, b) => {
      if (a.bankrupt && !b.bankrupt) return 1
      if (!a.bankrupt && b.bankrupt) return -1
      return b.cash - a.cash
    })
    const text = [
      '🏆 Monopoly Helsinki — Tulokset',
      '',
      ...sorted.map((p, i) => {
        const medal = ['🥇', '🥈', '🥉'][i] ?? `${i + 1}.`
        return `${medal} ${p.name}: ${p.bankrupt ? t.bankruptLabel : '€' + p.cash}`
      }),
    ].join('\n')
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [state.players, t.bankruptLabel])

  if (dismissed) return null

  const tokenShapes = loadTokenShapes(state.sessionId)

  const sorted = [...state.players].sort((a, b) => {
    if (a.bankrupt && !b.bankrupt) return 1
    if (!a.bankrupt && b.bankrupt) return -1
    return b.cash - a.cash
  })

  const winner = sorted[0]
  const winnerSeat = state.seats.find(s => s.playerId === winner?.playerId)

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.trophy}>🏆</div>
        <div className={styles.title}>{t.gameOverScreenTitle}</div>
        {winner && (
          <div className={styles.winnerRow}>
            {winnerSeat && (
              <TokenSvg
                color={winnerSeat.tokenColorHex}
                shape={tokenShapes[winnerSeat.seatIndex] ?? 'circle'}
                size={40}
              />
            )}
            <span className={styles.winnerName}>{t.wonLabel(winner.name)}</span>
          </div>
        )}

        <div className={styles.rankings}>
          {sorted.map((p, i) => {
            const seat = state.seats.find(s => s.playerId === p.playerId)
            const propCount = p.ownedPropertyIds.length
            const hotels = state.properties.filter(pr => pr.ownerPlayerId === p.playerId && pr.hotelCount > 0).length
            const houses = state.properties.filter(pr => pr.ownerPlayerId === p.playerId && pr.houseCount > 0).reduce((s, pr) => s + pr.houseCount, 0)
            return (
              <div key={p.playerId} className={`${styles.rankRow} ${i === 0 ? styles.first : ''}`}>
                <span className={styles.medal}>{MEDALS[i] ?? `${i + 1}.`}</span>
                {seat && (
                  <TokenSvg
                    color={seat.tokenColorHex}
                    shape={tokenShapes[seat.seatIndex] ?? 'circle'}
                    size={24}
                  />
                )}
                <span className={styles.rankName}>{p.name}</span>
                <div className={styles.rankStats}>
                  {!p.bankrupt && propCount > 0 && (
                    <span className={styles.rankStat}>{t.propAbbr(propCount)}</span>
                  )}
                  {hotels > 0 && <span className={styles.rankStat}>🏨{hotels}</span>}
                  {houses > 0 && <span className={styles.rankStat}>🏠{houses}</span>}
                </div>
                <span className={styles.rankCash}>
                  {p.bankrupt ? <span className={styles.bankrupt}>{t.bankruptLabel}</span> : `€${p.cash}`}
                </span>
              </div>
            )
          })}
        </div>

        <div className={styles.buttons}>
          <button className={styles.btnShare} onClick={shareResults}>
            {copied ? t.copiedBtn : t.shareResultsBtn}
          </button>
          <button className={styles.btnSecondary} onClick={() => setDismissed(true)}>
            {t.continueWatchingBtn}
          </button>
          <button className={styles.btnPrimary} onClick={() => navigate('/')}>
            {t.backToHomeBtn}
          </button>
        </div>
      </div>
    </div>
  )
}
