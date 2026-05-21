import { useState, useEffect } from 'react'
import styles from './Header.module.css'
import type { SessionState } from '../../types/api'
import OverflowMenu from '../menu/OverflowMenu'
import { loadSoundConfig, saveSoundConfig } from '../menu/SoundSettings'
import { useT, useLang, useLangToggle } from '../../i18n/LanguageContext'

type ConnectionStatus = 'CONNECTING' | 'LIVE' | 'RECONNECTING' | 'FAILED'

interface Props {
  snapshot: SessionState | null
  connectionStatus: ConnectionStatus
  isSpectator?: boolean
}

export default function Header({ snapshot, connectionStatus, isSpectator }: Props) {
  const t = useT()
  const lang = useLang()
  const toggleLang = useLangToggle()
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
      <div className={styles.turnInfo} />
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
      <button className={styles.muteBtn} onClick={toggleLang} title={lang === 'fi' ? 'Vaihda englanniksi' : 'Switch to Finnish'}>
        <img
          src={lang === 'fi' ? 'https://flagcdn.com/20x15/fi.png' : 'https://flagcdn.com/20x15/gb.png'}
          width={20} height={15}
          alt={lang === 'fi' ? 'FI' : 'EN'}
          style={{ display: 'block', borderRadius: 2 }}
        />
      </button>
      {snapshot !== null && (
        <div className={`${styles.badge} ${styles[connectionStatus.toLowerCase()]}`}>
          {connectionStatus === 'LIVE' ? <span className={styles.liveDot} /> : null}
          {statusLabel[connectionStatus]}
        </div>
      )}
      <OverflowMenu />
    </header>
  )
}
