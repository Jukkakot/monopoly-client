import styles from './HowToPlay.module.css'
import { useT } from '../../i18n/LanguageContext'

/**
 * A concise "how to play" panel for first-time players — the game is
 * phase-driven and drops newcomers straight in, so this explains the turn
 * flow, buying/auctions, building, jail and trading in a few lines.
 */
export default function HowToPlay({ onClose }: { onClose: () => void }) {
  const t = useT()
  return (
    <div className={styles.modal} role="dialog" aria-modal="true" aria-label={t.howToPlayTitle}>
      <div className={styles.header}>
        <span>❓ {t.howToPlayTitle}</span>
        <button className={styles.closeBtn} onClick={onClose} aria-label="Close">✕</button>
      </div>
      <div className={styles.body}>
        {t.howToPlaySections.map((s, i) => (
          <div key={i} className={styles.section}>
            <div className={styles.sectionTitle}>{s.title}</div>
            <div className={styles.sectionBody}>{s.body}</div>
          </div>
        ))}
        <div className={styles.tips}>
          <div className={styles.tipsTitle}>{t.howToPlayTipsTitle}</div>
          <ul className={styles.tipList}>
            {t.howToPlayTips.map((tip, i) => <li key={i}>{tip}</li>)}
          </ul>
        </div>
      </div>
    </div>
  )
}
