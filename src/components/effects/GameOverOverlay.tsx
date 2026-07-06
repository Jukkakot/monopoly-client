import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import styles from './GameOverOverlay.module.css'
import type { SessionState } from '../../types/api'
import { loadTokenShapes } from '../../utils/tokenShapes'
import { TokenSvg } from '../board/TokenSvg'
import { useT } from '../../i18n/LanguageContext'
import { calcNetWorth } from '../../utils/netWorth'
import Icon from '../common/Icon'

interface Props {
  state: SessionState
}

const MEDALS = ['🥇', '🥈', '🥉']

export default function GameOverOverlay({ state }: Props) {
  const navigate = useNavigate()
  const t = useT()
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  const tokenShapes = loadTokenShapes(state.sessionId)

  const sorted = [...state.players].sort((a, b) => {
    if (a.bankrupt && !b.bankrupt) return 1
    if (!a.bankrupt && b.bankrupt) return -1
    return calcNetWorth(b, state) - calcNetWorth(a, state)
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
            <span className={styles.winnerName} data-testid="game-over-winner">{t.wonLabel(winner.name)}</span>
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
                  {hotels > 0 && (
                    <span className={styles.rankStat}>
                      <Icon name="hotel" size={12} style={{ color: '#d32f2f' }} />{hotels}
                    </span>
                  )}
                  {houses > 0 && (
                    <span className={styles.rankStat}>
                      <Icon name="house" size={12} strokeWidth={2.4} style={{ color: '#2e7d32' }} />{houses}
                    </span>
                  )}
                </div>
                <span className={styles.rankCash}>
                  {p.bankrupt ? (
                    <span className={styles.bankrupt}>{t.bankruptLabel}</span>
                  ) : (
                    <span title={t.cashTooltip(p.cash)}>€{calcNetWorth(p, state)}</span>
                  )}
                </span>
              </div>
            )
          })}
        </div>

        <div className={styles.buttons}>
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
