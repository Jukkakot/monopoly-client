import { useState, useEffect, useRef } from 'react'
import styles from './SoundSettings.module.css'
import { useT } from '../../i18n/LanguageContext'
import { type AnimationSpeed, loadAnimationSpeed, saveAnimationSpeed, applyAnimationSpeedToCss, type BotSpeed, loadBotSpeed, saveBotSpeed } from '../../utils/animationSettings'
import { type ZoomMode, loadZoomMode, saveZoomMode } from '../../utils/zoomSettings'

const PING_URL = (import.meta.env.VITE_API_BASE ?? 'http://localhost:8080') + '/ping'
const PING_INTERVAL_MS = 5_000
const PING_HISTORY = 5

function usePingRtt(): number | null {
  const [rtt, setRtt] = useState<number | null>(null)
  const samples = useRef<number[]>([])

  useEffect(() => {
    let cancelled = false
    async function ping() {
      if (cancelled) return
      try {
        const t0 = performance.now()
        await fetch(PING_URL, { method: 'GET', cache: 'no-store' })
        const elapsed = performance.now() - t0
        samples.current.push(elapsed)
        if (samples.current.length > PING_HISTORY) samples.current.shift()
        const avg = samples.current.reduce((a, b) => a + b, 0) / samples.current.length
        if (!cancelled) setRtt(Math.round(avg / 2))
      } catch {
        if (!cancelled) setRtt(null)
      }
    }
    ping()
    const id = setInterval(ping, PING_INTERVAL_MS)
    return () => { cancelled = true; clearInterval(id) }
  }, [])

  return rtt
}

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
  const [zoomMode, setZoomMode] = useState<ZoomMode>(loadZoomMode)
  const rtt = usePingRtt()

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

      <div className={styles.pingRow}>
        <span className={styles.pingLabel}>Verkkolatenssi (RTT/2)</span>
        <span className={styles.pingValue}>
          {rtt === null ? '—' : `${rtt} ms`}
        </span>
      </div>

      <div className={styles.divider} />

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

      <div className={styles.row}>
        <label className={styles.label}>{t.zoomModeLabel}</label>
        <select
          className={styles.select}
          value={zoomMode}
          onChange={e => { saveZoomMode(e.target.value as ZoomMode); setZoomMode(e.target.value as ZoomMode) }}
        >
          <option value="off">{t.zoomModeOff}</option>
          <option value="own">{t.zoomModeOwn}</option>
          <option value="all">{t.zoomModeAll}</option>
        </select>
      </div>

      <button className={styles.saveBtn} onClick={onClose}>{t.saveBtn}</button>
    </div>
  )
}
