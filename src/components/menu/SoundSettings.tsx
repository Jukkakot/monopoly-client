import { useState, useEffect } from 'react'
import styles from './SoundSettings.module.css'

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
}

export default function SoundSettings({ onClose }: Props) {
  const [cfg, setCfg] = useState<SoundConfig>(loadSoundConfig)

  useEffect(() => { saveSoundConfig(cfg) }, [cfg])

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <span>⚙️ Ääniasetukset</span>
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

      {[
        { key: 'uiSounds',            label: 'UI-äänet',          desc: 'Napit, siirtymät' },
        { key: 'notificationSounds',  label: 'Ilmoitusäänet',     desc: 'Vuoro, vuokra' },
        { key: 'gameSounds',          label: 'Pelitapahtumat',     desc: 'Noppa, osto' },
      ].map(({ key, label, desc }) => (
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

      <button className={styles.saveBtn} onClick={onClose}>Tallenna</button>
    </div>
  )
}
