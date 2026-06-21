import { useState, useEffect, useRef } from 'react'
import { loadHapticsEnabled, saveHapticsEnabled, isIOSDevice } from '../../utils/haptics'
import styles from './SoundSettings.module.css'
import { useT } from '../../i18n/LanguageContext'
import { type AnimationSpeed, loadAnimationSpeed, saveAnimationSpeed, applyAnimationSpeedToCss, type BotSpeed, loadBotSpeed, saveBotSpeed, loadDiceZoomEnabled, saveDiceZoomEnabled } from '../../utils/animationSettings'
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
const NOTIF_LS_KEY = 'notif-settings'

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

export interface NotifConfig {
  yourTurn: boolean      // ⭐
  rent: boolean          // 💸💰
  debt: boolean          // ⛓🔓💀
  auction: boolean       // 🔨
  trade: boolean         // 🤝🚫
  building: boolean      // 🏠
  cards: boolean         // 🃏
  celebration: boolean   // 🎊🏆
}

const NOTIF_DEFAULT: NotifConfig = {
  yourTurn: false,
  rent: true,
  debt: true,
  auction: true,
  trade: true,
  building: true,
  cards: true,
  celebration: true,
}

export function loadNotifConfig(): NotifConfig {
  try {
    const raw = localStorage.getItem(NOTIF_LS_KEY)
    return raw ? { ...NOTIF_DEFAULT, ...JSON.parse(raw) } : NOTIF_DEFAULT
  } catch { return NOTIF_DEFAULT }
}

export function saveNotifConfig(cfg: NotifConfig) {
  try { localStorage.setItem(NOTIF_LS_KEY, JSON.stringify(cfg)) } catch { /* ignore */ }
}

export function notifIconsFromConfig(cfg: NotifConfig, isTouchDevice: boolean): Set<string> {
  const icons = new Set<string>()
  if (cfg.yourTurn) icons.add('⭐')
  if (cfg.celebration) { icons.add('🎊'); icons.add('🏆') }
  if (cfg.debt) { icons.add('⛓'); icons.add('🔓'); icons.add('💀') }
  if (cfg.auction) icons.add('🔨')
  if (cfg.trade) { icons.add('🤝'); if (!isTouchDevice) icons.add('🚫') }
  if (cfg.building && !isTouchDevice) icons.add('🏠')
  if (cfg.rent) { icons.add('💰'); icons.add('💸') }
  if (cfg.cards && !isTouchDevice) icons.add('🃏')
  return icons
}

interface Props {
  onClose: () => void
  onBotSpeedChange?: (speed: BotSpeed) => void
  isSpectator?: boolean
}

export default function SoundSettings({ onClose, onBotSpeedChange, isSpectator = false }: Props) {
  const t = useT()
  const [cfg, setCfg] = useState<SoundConfig>(loadSoundConfig)
  const [notif, setNotif] = useState<NotifConfig>(loadNotifConfig)
  const [animSpeed, setAnimSpeed] = useState<AnimationSpeed>(loadAnimationSpeed)
  const [botSpeed, setBotSpeedState] = useState<BotSpeed>(loadBotSpeed)
  const [zoomMode, setZoomMode] = useState<ZoomMode>(loadZoomMode)
  const [diceZoom, setDiceZoom] = useState(loadDiceZoomEnabled)
  const [haptics, setHaptics] = useState(loadHapticsEnabled)
  const isIOS = isIOSDevice()
  const isMobileWithVibration = typeof navigator !== 'undefined'
    && 'vibrate' in navigator
    && window.matchMedia('(pointer: coarse)').matches
    && !isIOS
  const rtt = usePingRtt()

  useEffect(() => { saveSoundConfig(cfg) }, [cfg])
  useEffect(() => { saveNotifConfig(notif) }, [notif])

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
        <span className={styles.pingLabel}>{t.pingLatencyLabel}</span>
        <span className={styles.pingValue}>
          {rtt === null ? '—' : `${rtt} ms`}
        </span>
      </div>

      <div className={styles.divider} />

      <div className={styles.row}>
        <label className={styles.label}>{t.volumeLabel}</label>
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
          value={isSpectator && zoomMode === 'own' ? 'all' : zoomMode}
          onChange={e => { saveZoomMode(e.target.value as ZoomMode); setZoomMode(e.target.value as ZoomMode) }}
        >
          <option value="off">{t.zoomModeOff}</option>
          {!isSpectator && <option value="own">{t.zoomModeOwn}</option>}
          <option value="all">{t.zoomModeAll}</option>
        </select>
      </div>

      {zoomMode !== 'off' && (
        <label className={styles.toggleRow}>
          <div className={styles.toggleInfo}>
            <span className={styles.label}>{t.diceZoomLabel}</span>
            <span className={styles.desc}>{t.diceZoomDesc}</span>
          </div>
          <input type="checkbox" checked={diceZoom}
            onChange={e => { saveDiceZoomEnabled(e.target.checked); setDiceZoom(e.target.checked) }}
            className={styles.checkbox}
          />
        </label>
      )}

      {isMobileWithVibration && (
        <label className={styles.toggleRow}>
          <div className={styles.toggleInfo}>
            <span className={styles.label}>{t.hapticFeedbackLabel}</span>
            <span className={styles.desc}>{t.hapticFeedbackDesc}</span>
          </div>
          <input type="checkbox" checked={haptics}
            onChange={e => { saveHapticsEnabled(e.target.checked); setHaptics(e.target.checked) }}
            className={styles.checkbox}
          />
        </label>
      )}
      {isIOS && window.matchMedia('(pointer: coarse)').matches && (
        <div className={styles.toggleRow} style={{ opacity: 0.5 }}>
          <div className={styles.toggleInfo}>
            <span className={styles.label}>{t.hapticFeedbackLabel}</span>
            <span className={styles.desc}>{t.hapticFeedbackIosNote}</span>
          </div>
        </div>
      )}

      <div className={styles.divider} />

      <div className={styles.sectionLabel}>{t.screenNotifTitle}</div>
      {([
        { key: 'yourTurn',    label: t.notifYourTurnLabel,    desc: t.notifYourTurnDesc },
        { key: 'rent',        label: t.notifRentLabel,        desc: t.notifRentDesc },
        { key: 'debt',        label: t.notifDebtLabel,        desc: t.notifDebtDesc },
        { key: 'auction',     label: t.notifAuctionLabel,     desc: t.notifAuctionDesc },
        { key: 'trade',       label: t.notifTradeLabel,       desc: t.notifTradeDesc },
        { key: 'building',    label: t.notifBuildingLabel,    desc: t.notifBuildingDesc },
        { key: 'cards',       label: t.notifCardsLabel,       desc: t.notifCardsDesc },
        { key: 'celebration', label: t.notifCelebrationLabel, desc: t.notifCelebrationDesc },
      ] as const).map(({ key, label, desc }) => (
        <label key={key} className={styles.toggleRow}>
          <div className={styles.toggleInfo}>
            <span className={styles.label}>{label}</span>
            <span className={styles.desc}>{desc}</span>
          </div>
          <input type="checkbox"
            checked={notif[key]}
            onChange={e => setNotif(p => ({ ...p, [key]: e.target.checked }))}
            className={styles.checkbox}
          />
        </label>
      ))}

      <button className={styles.saveBtn} onClick={onClose}>{t.saveBtn}</button>
    </div>
  )
}
