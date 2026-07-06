import { useEffect, useState } from 'react'
import styles from './MonopolyCelebration.module.css'
import { STREET_COLORS } from '../../types/spots'
import { useT } from '../../i18n/LanguageContext'

export interface MonopolyCelebrationData {
  id: number
  group: string
  playerName: string
  tokenColorHex: string
}

/**
 * A brief, non-blocking celebration flourish that fires when a player completes
 * a colour-group monopoly. Auto-dismisses after ~2.4s. Respects reduced-motion
 * via CSS (animations collapse to a simple fade there).
 */
export default function MonopolyCelebration({ data, onDone }: {
  data: MonopolyCelebrationData
  onDone: () => void
}) {
  const t = useT()
  const [leaving, setLeaving] = useState(false)
  const groupColor = STREET_COLORS[data.group] ?? '#2e7d32'
  const groupName = t.streetTypeNames[data.group] ?? data.group

  useEffect(() => {
    const fade = setTimeout(() => setLeaving(true), 2000)
    const done = setTimeout(onDone, 2500)
    return () => { clearTimeout(fade); clearTimeout(done) }
  }, [data.id, onDone])

  return (
    <div className={`${styles.overlay} ${leaving ? styles.leaving : ''}`} aria-hidden="true">
      {/* Colour rays radiating from the badge */}
      <div className={styles.rays} style={{ ['--ray' as string]: groupColor }} />
      <div className={styles.card} style={{ ['--group' as string]: groupColor }}>
        <div className={styles.trophy}>🏆</div>
        <div className={styles.title}>{t.monopolyCelebrationTitle}</div>
        <div className={styles.swatch} style={{ background: groupColor }} />
        <div className={styles.sub}>{t.monopolyCelebrationSub(groupName)}</div>
        <div className={styles.player} style={{ color: data.tokenColorHex }}>{data.playerName}</div>
      </div>
    </div>
  )
}
