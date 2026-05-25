import styles from './DiceSpinner.module.css'

interface Props {
  message: string
  hint?: string
  elapsed?: number
  overlay?: boolean
}

export default function DiceSpinner({ message, hint, elapsed, overlay }: Props) {
  return (
    <div className={overlay ? styles.overlay : styles.inline}>
      <div className={styles.dice}>🎲</div>
      <div className={styles.title}>{message}</div>
      {hint && <div className={styles.hint}>{hint}</div>}
      {elapsed !== undefined && <div className={styles.timer}>{elapsed} s</div>}
    </div>
  )
}
