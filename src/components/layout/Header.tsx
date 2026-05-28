import { useState, useEffect } from 'react'
import styles from './Header.module.css'
import OverflowMenu from '../menu/OverflowMenu'
import { loadSoundConfig, saveSoundConfig } from '../menu/SoundSettings'
import { useT, useLang, useLangToggle } from '../../i18n/LanguageContext'
import { useGame } from '../../store/GameContext'
import { useIsAnimating } from '../../hooks/useTokenAnimation'
import { DieFace } from '../common/DiceDisplay'

interface Props {
  isSpectator?: boolean
}

export default function Header({ isSpectator }: Props) {
  const t = useT()
  const lang = useLang()
  const toggleLang = useLangToggle()
  const [muted, setMuted] = useState(() => loadSoundConfig().volume === 0)
  const { state } = useGame()
  const tokenAnimating = useIsAnimating()

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

  const snap = state.snapshot
  const activePlayer = snap?.players.find(p => p.playerId === snap?.turn?.activePlayerId)
  const activeSeat = snap?.seats.find(s => s.playerId === snap?.turn?.activePlayerId)
  const lastDice = snap?.turn?.lastDice

  return (
    <header className={styles.header}>
      <div className={styles.logo} title="Monopoly Helsinki">MH</div>
      <div className={styles.turnInfo}>
        {tokenAnimating && activePlayer && (
          <div className={styles.movingStatus}>
            <div className={styles.movingDots}>
              <span /><span /><span />
            </div>
            <span className={styles.movingName} style={{ color: activeSeat?.tokenColorHex ?? 'rgba(255,255,255,0.9)' }}>
              {activePlayer.name}
            </span>
            {lastDice && (
              <span className={styles.movingDice}>
                <DieFace value={lastDice[0]} size={22} />
                <DieFace value={lastDice[1]} size={22} />
              </span>
            )}
          </div>
        )}
      </div>
      <div className={styles.controls}>
        {isSpectator && <span className={styles.spectatorBadge}>{t.spectatorBadge}</span>}
        <button className={styles.muteBtn} onClick={toggleMute} title={muted ? t.soundMuted : t.soundOn}>
          {muted ? '🔇' : '🔊'}
        </button>
        <button className={styles.muteBtn} onClick={toggleLang} title={lang === 'fi' ? 'Vaihda englanniksi' : 'Switch to Finnish'}>
          <img
            src={lang === 'fi' ? 'https://flagcdn.com/40x30/fi.png' : 'https://flagcdn.com/40x30/gb.png'}
            width={20} height={15}
            alt={lang === 'fi' ? 'FI' : 'EN'}
            style={{ display: 'block', borderRadius: 2 }}
          />
        </button>
        <OverflowMenu />
      </div>
    </header>
  )
}
