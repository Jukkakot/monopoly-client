import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import styles from './Header.module.css'
import OverflowMenu from '../menu/OverflowMenu'
import HowToPlay from '../menu/HowToPlay'
import { loadSoundConfig, saveSoundConfig } from '../menu/SoundSettings'
import { useT, useLang, useLangToggle } from '../../i18n/LanguageContext'
import { useGame } from '../../store/GameContext'
import { useIsAnimating } from '../../hooks/useTokenAnimation'
import { DieFace } from '../common/DiceDisplay'
import Icon from '../common/Icon'
import Flag from '../common/Flag'

interface Props {
  isSpectator?: boolean
}

export default function Header({ isSpectator }: Props) {
  const t = useT()
  const lang = useLang()
  const toggleLang = useLangToggle()
  const [muted, setMuted] = useState(() => loadSoundConfig().volume === 0)
  const [showHelp, setShowHelp] = useState(false)
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

  // First-run onboarding: auto-open the how-to-play panel the very first time a
  // player is in a game (once ever, remembered in localStorage). They can always
  // reopen it via the ❓ button.
  useEffect(() => {
    if (!snap) return
    try {
      if (!localStorage.getItem('monopoly_seen_howto')) {
        localStorage.setItem('monopoly_seen_howto', '1')
        setShowHelp(true)
      }
    } catch { /* ignore */ }
  }, [snap])
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
        <button className={styles.muteBtn} onClick={() => setShowHelp(true)} title={t.howToPlayBtn} aria-label={t.howToPlayBtn}>
          <Icon name="help" size={19} />
        </button>
        <button className={styles.muteBtn} onClick={toggleMute} title={muted ? t.soundMuted : t.soundOn}>
          <Icon name={muted ? 'muted' : 'sound'} size={18} />
        </button>
        <button className={styles.muteBtn} onClick={toggleLang} title={lang === 'fi' ? 'Vaihda englanniksi' : 'Switch to Finnish'}>
          <Flag country={lang === 'fi' ? 'fi' : 'gb'} size={20} />
        </button>
        <OverflowMenu />
      </div>

      {/* Portaled to body so it escapes the header's stacking context (board tokens
          have a higher z-index and would otherwise paint over it). */}
      {showHelp && createPortal(
        <div className={styles.helpOverlay} onClick={() => setShowHelp(false)}>
          <div onClick={e => e.stopPropagation()}>
            <HowToPlay onClose={() => setShowHelp(false)} />
          </div>
        </div>,
        document.body,
      )}
    </header>
  )
}
