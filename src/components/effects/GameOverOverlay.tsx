import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import styles from './GameOverOverlay.module.css'
import type { SessionState } from '../../types/api'
import { useTokenShapes } from '../../utils/tokenShapes'
import { TokenSvg } from '../board/TokenSvg'
import { useT } from '../../i18n/LanguageContext'
import { calcNetWorth } from '../../utils/netWorth'
import { resolveDeclaredWinner } from '../../utils/gameOver'
import { richestMoment } from '../../utils/recapStats'
import { useGame } from '../../store/GameContext'
import Icon from '../common/Icon'

interface Props {
  state: SessionState
}

const MEDALS = ['🥇', '🥈', '🥉']

/** Compact multi-line chart of every player's net-worth trajectory over the game. */
function NetWorthChart({ history, colorFor }: { history: Map<string, number[]>; colorFor: (playerId: string) => string }) {
  const series = [...history.entries()].filter(([, v]) => v.length >= 2)
  if (series.length === 0) return null

  const W = 280
  const H = 88
  const PAD = 4
  const globalMax = Math.max(1, ...series.flatMap(([, v]) => v))

  return (
    <svg className={styles.chart} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img">
      {series.map(([playerId, values]) => {
        const pts = values.map((v, i) => {
          const x = (i / (values.length - 1)) * W
          const y = PAD + (1 - v / globalMax) * (H - PAD * 2)
          return `${x.toFixed(1)},${y.toFixed(1)}`
        }).join(' ')
        return (
          <polyline
            key={playerId}
            points={pts}
            fill="none"
            stroke={colorFor(playerId)}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
            opacity={0.9}
          />
        )
      })}
    </svg>
  )
}

export default function GameOverOverlay({ state }: Props) {
  const navigate = useNavigate()
  const t = useT()
  const { state: gs } = useGame()
  const [dismissed, setDismissed] = useState(false)
  const tokenShapes = useTokenShapes(state)

  if (dismissed) return null

  const colorFor = (playerId: string) => state.seats.find(s => s.playerId === playerId)?.tokenColorHex ?? '#888'
  const peak = richestMoment(gs.netWorthHistory)
  const peakPlayer = peak ? state.players.find(p => p.playerId === peak.playerId) : undefined

  const sorted = [...state.players].sort((a, b) => {
    if (a.bankrupt && !b.bankrupt) return 1
    if (!a.bankrupt && b.bankrupt) return -1
    return calcNetWorth(b, state) - calcNetWorth(a, state)
  })

  // Trust the backend's declared winner (never re-derive it). winnerPlayerId is null when
  // the host aborted the game — an aborted game has no winner, so we must NOT crown the
  // net-worth leader (the backend is the authoritative rule enforcer). In every real win
  // the backend sets winnerPlayerId to the sole survivor, who is also sorted[0].
  const winner = resolveDeclaredWinner(state)
  const winnerSeat = winner ? state.seats.find(s => s.playerId === winner.playerId) : undefined

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.trophy}>{winner ? '🏆' : '🏁'}</div>
        <div className={styles.title}>{t.gameOverScreenTitle}</div>
        {winner ? (
          <div className={styles.winnerRow}>
            {winnerSeat && (
              <TokenSvg
                color={winnerSeat.tokenColorHex}
                shape={tokenShapes.get(winner.playerId) ?? 'circle'}
                size={40}
              />
            )}
            <span className={styles.winnerName} data-testid="game-over-winner">{t.wonLabel(winner.name)}</span>
          </div>
        ) : (
          <div className={styles.winnerRow}>
            <span className={styles.winnerName}>{t.gameEndedNoWinner}</span>
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
                    shape={tokenShapes.get(p.playerId) ?? 'circle'}
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

        {gs.netWorthHistory.size > 0 && (
          <div className={styles.recap}>
            <div className={styles.recapTitle}>{t.netWorthChartTitle}</div>
            <NetWorthChart history={gs.netWorthHistory} colorFor={colorFor} />
            {peak && peakPlayer && (
              <div className={styles.recapStat}>
                <span className={styles.recapStatLabel}>{t.richestMomentLabel}</span>
                <span className={styles.recapStatValue}>
                  <span className={styles.recapDot} style={{ background: colorFor(peak.playerId) }} />
                  {peakPlayer.name} · €{peak.value}
                </span>
              </div>
            )}
          </div>
        )}

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
