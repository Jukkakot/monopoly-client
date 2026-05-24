import { useState, useEffect } from 'react'
import styles from './Header.module.css'
import OverflowMenu from '../menu/OverflowMenu'
import { loadSoundConfig, saveSoundConfig } from '../menu/SoundSettings'
import { useT, useLang, useLangToggle } from '../../i18n/LanguageContext'

interface Props {
  isSpectator?: boolean
}

export default function Header({ isSpectator }: Props) {
  const t = useT()
  const lang = useLang()
  const toggleLang = useLangToggle()
  const [muted, setMuted] = useState(() => loadSoundConfig().volume === 0)

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

  return (
    <header className={styles.header}>
      <div className={styles.logo} title="Monopoly Helsinki">MH</div>
      <div className={styles.turnInfo} />
      <div className={styles.controls}>
        {isSpectator && <span className={styles.spectatorBadge}>{t.spectatorBadge}</span>}
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
        <OverflowMenu />
      </div>
    </header>
  )
}
