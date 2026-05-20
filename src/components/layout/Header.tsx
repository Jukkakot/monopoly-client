import { useState, useEffect } from 'react'
import styles from './Header.module.css'
import type { SessionState } from '../../types/api'
import OverflowMenu from '../menu/OverflowMenu'
import { loadSoundConfig, saveSoundConfig } from '../menu/SoundSettings'
import { useT, useLangToggle } from '../../i18n/LanguageContext'

type ConnectionStatus = 'CONNECTING' | 'LIVE' | 'RECONNECTING' | 'FAILED'

interface Props {
  snapshot: SessionState | null
  connectionStatus: ConnectionStatus
  isSpectator?: boolean
}

export default function Header({ snapshot, connectionStatus, isSpectator }: Props) {
  const t = useT()
  const toggleLang = useLangToggle()
  const turn = snapshot?.turn
  const activePlayer = turn
    ? snapshot?.players.find(p => p.playerId === turn.activePlayerId)
    : null
  const activeSeat = activePlayer
    ? snapshot?.seats.find(s => s.playerId === activePlayer.playerId)
    : null

  const [muted, setMuted] = useState(() => loadSoundConfig().volume === 0)
  const [idCopied, setIdCopied] = useState(false)

  useEffect(() => {
    const cfg = loadSoundConfig()
    setMuted(cfg.volume === 0)
  }, [])

  function toggleMute() {
    const cfg = loadSoundConfig()
    const newVol = cfg.volume > 0 ? 0 : 80
    saveSoundConfig({ ...cfg, volume: newVol })
    setMuted(newVol === 0)
  }

  function copySessionId() {
    if (!snapshot?.sessionId) return
    navigator.clipboard.writeText(snapshot.sessionId).then(() => {
      setIdCopied(true)
      setTimeout(() => setIdCopied(false), 1500)
    })
  }

  const statusLabel: Record<ConnectionStatus, string> = {
    CONNECTING: t.connecting,
    LIVE: 'LIVE',
    RECONNECTING: t.reconnecting,
    FAILED: t.connectionFailed,
  }

  return (
    <header className={styles.header}>
      <div className={styles.title}>Monopoly Helsinki</div>
      {activePlayer && turn ? (
        <div className={styles.turnInfo}>
          {activeSeat && (
            <span
              className={styles.playerDot}
              style={{ background: activeSeat.tokenColorHex }}
            />
          )}
          <span className={styles.playerName}>{activePlayer.name}</span>
          <span className={styles.phase}>{t.phases[turn.phase] ?? turn.phase}</span>
        </div>
      ) : (
        <div className={styles.turnInfo}>
          {snapshot ? t.waitingForPlayers : t.loading}
        </div>
      )}
      {isSpectator && <span className={styles.spectatorBadge}>{t.spectatorBadge}</span>}
      {snapshot && (
        <button
          className={styles.sessionIdBtn}
          onClick={copySessionId}
          title={`Kopioi pelin koodi: ${snapshot.sessionId}`}
        >
          {idCopied ? '✓' : snapshot.sessionId}
        </button>
      )}
      <button className={styles.muteBtn} onClick={toggleMute} title={muted ? t.soundMuted : t.soundOn}>
        {muted ? '🔇' : '🔊'}
      </button>
      <button className={styles.muteBtn} onClick={toggleLang}>
        {t.langLabel}
      </button>
      <div className={`${styles.badge} ${styles[connectionStatus.toLowerCase()]}`}>
        {connectionStatus === 'LIVE' ? <span className={styles.liveDot} /> : null}
        {statusLabel[connectionStatus]}
      </div>
      <OverflowMenu />
    </header>
  )
}
