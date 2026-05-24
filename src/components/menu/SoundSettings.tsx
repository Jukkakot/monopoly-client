import { useState, useEffect } from 'react'
import styles from './SoundSettings.module.css'
import { useT } from '../../i18n/LanguageContext'
import { type AnimationSpeed, loadAnimationSpeed, saveAnimationSpeed, applyAnimationSpeedToCss, type BotSpeed, loadBotSpeed, saveBotSpeed } from '../../utils/animationSettings'
import { loadZoomEnabled, saveZoomEnabled } from '../../utils/zoomSettings'

const LS_KEY = 'sound-settings'

export interface SoundConfig {
  volume: number
  uiSounds: boolean
  notificationSounds: boolean
  gameSounds: boolean
}

const DEFAULT: SoundConfig = { volume: 80, uiSounds: true, notificationSounds: true, gameSounds: true }

export function loadSoundConfig(): SoundConfig {
  try {
    const raw = localStorage.getItem(LS_KEY)
    return raw ? { ...DEFAULT, ...JSON.parse(raw) } : DEFAULT
  } catch { return DEFAULT }
}

export function saveSoundConfig(cfg: SoundConfig) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(cfg)) } catch { /* ignore */ }
}

interface Props {
  onClose: () => void
  onBotSpeedChange?: (speed: BotSpeed) => void
}

export default function SoundSettings({ onClose, onBotSpeedChange }: Props) {
  const t = useT()
  const [cfg, setCfg] = useState<SoundConfig>(loadSoundConfig)
  const [animSpeed, setAnimSpeed] = useState<AnimationSpeed>(loadAnimationSpeed)
  const [botSpeed, setBotSpeedState] = useState<BotSpeed>(loadBotSpeed)
  const [zoomEnabled, setZoomEnabled] = useState(loadZoomEnabled)

  useEffect(() => { saveSoundConfig(cfg) }, [cfg])

  function handleAnimSpeed(speed: AnimationSpeed) {
    setAnimSpeed(speed)
    saveAnimationSpeed(speed)
    applyAnimationSpeedToCss(speed)
  }

  function handleBotSpeed(speed: BotSpeed) {
    setBotSpeedState(speed)
    saveBotSpeed(speed)
    onBotSpeedChange?.(speed)
  }

  const soundCategories = [
    { key: 'uiSounds',           label: t.uiSoundsLabel,    desc: t.uiSoundsDesc },
    { key: 'notificationSounds', label: t.notifSoundsLabel, desc: t.notifSoundsDesc },
    { key: 'gameSounds',         label: t.gameSoundsLabel,  desc: t.gameSoundsDesc },
  ]

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <span>{t.soundSettingsTitle}</span>
        <button className={styles.close} onClick={onClose}>✕</button>
      </div>

      <div className={styles.row}>
        <label className={styles.label}>Volyymi</label>
        <div className={styles.sliderRow}>
          <input
            type="range" min="0" max="100" value={cfg.volume}
            className={styles.slider}
            onChange={e => setCfg(p => ({ ...p, volume: +e.target.value }))}
          />
          <span className={styles.volNum}>{cfg.volume}%</span>
        </div>
      </div>

      <div className={styles.divider} />

      {soundCategories.map(({ key, label, desc }) => (
        <label key={key} className={styles.toggleRow}>
          <div className={styles.toggleInfo}>
            <span className={styles.label}>{label}</span>
            <span className={styles.desc}>{desc}</span>
          </div>
          <input type="checkbox"
            checked={cfg[key as keyof SoundConfig] as boolean}
            onChange={e => setCfg(p => ({ ...p, [key]: e.target.checked }))}
            className={styles.checkbox}
          />
        </label>
      ))}

      <div className={styles.divider} />

      <div className={styles.row}>
        <label className={styles.label}>{t.animSpeedLabel}</label>
        <select
          className={styles.select}
          value={animSpeed}
          onChange={e => handleAnimSpeed(e.target.value as AnimationSpeed)}
        >
          <option value="fast">{t.animSpeedFast}</option>
          <option value="normal">{t.animSpeedNormal}</option>
          <option value="slow">{t.animSpeedSlow}</option>
        </select>
      </div>

      <div className={styles.row}>
        <label className={styles.label}>{t.botSpeedLabel}</label>
        <select
          className={styles.select}
          value={botSpeed}
          onChange={e => handleBotSpeed(e.target.value as BotSpeed)}
        >
          <option value="fast">{t.botSpeedFast}</option>
          <option value="normal">{t.botSpeedNormal}</option>
          <option value="slow">{t.botSpeedSlow}</option>
        </select>
      </div>

      <div className={styles.divider} />

      <label className={styles.toggleRow}>
        <div className={styles.toggleInfo}>
          <span className={styles.label}>{t.zoomToggleLabel}</span>
        </div>
        <input type="checkbox"
          checked={zoomEnabled}
          onChange={e => { saveZoomEnabled(e.target.checked); setZoomEnabled(e.target.checked) }}
          className={styles.checkbox}
        />
      </label>

      <button className={styles.saveBtn} onClick={onClose}>{t.saveBtn}</button>
    </div>
  )
}
