import { useState } from 'react'
import styles from './OverflowMenu.module.css'
import SoundSettings from './SoundSettings'

interface Props {
  onTrade?: () => void
}

export default function OverflowMenu({ onTrade }: Props) {
  const [open, setOpen] = useState(false)
  const [showSound, setShowSound] = useState(false)

  if (showSound) {
    return <SoundSettings onClose={() => setShowSound(false)} />
  }

  return (
    <div className={styles.root}>
      <button className={styles.trigger} onClick={() => setOpen(v => !v)} title="Lisätoiminnot">
        ⋯
      </button>

      {open && (
        <>
          <div className={styles.backdrop} onClick={() => setOpen(false)} />
          <div className={styles.menu}>
            <div className={styles.menuTitle}>Lisätoiminnot</div>
            {onTrade && (
              <button className={styles.menuItem} onClick={() => { setOpen(false); onTrade() }}>
                🤝 Tee kauppa
              </button>
            )}
            <button className={styles.menuItem} onClick={() => { setOpen(false); setShowSound(true) }}>
              ⚙️ Ääniasetukset
            </button>
            <div className={styles.divider} />
            <button className={styles.menuItem} onClick={() => setOpen(false)}>
              📋 Säännöt
            </button>
            <button className={`${styles.menuItem} ${styles.danger}`}
              onClick={() => { setOpen(false); window.location.href = '/' }}>
              🚪 Poistu pelistä
            </button>
          </div>
        </>
      )}
    </div>
  )
}
