import styles from './PropertyChip.module.css'
import { SPOTS, STREET_COLORS } from '../../types/spots'

interface PropertyChipProps {
  id: string
  rightText?: string
  selected?: boolean
  mortgaged?: boolean
  onClick?: () => void
  testId?: string
}

export function PropertyChip({ id, rightText, selected, mortgaged, onClick, testId }: PropertyChipProps) {
  const spot = SPOTS.find(s => s.id === id)
  const color = spot?.streetType ? (STREET_COLORS[spot.streetType] ?? '#888') : '#888'
  const bg = selected ? color + '55' : color + '22'

  const cls = [
    styles.chip,
    selected ? styles.selected : '',
    mortgaged ? styles.mortgaged : '',
  ].filter(Boolean).join(' ')

  const inner = (
    <>
      <div className={styles.bar} style={{ background: color }} />
      <span className={styles.name}>
        {selected && <span style={{ color: '#2e7d32', marginRight: 3 }}>✓</span>}
        {spot?.name ?? id}
        {mortgaged && <span style={{ marginLeft: 4 }}>🔒</span>}
      </span>
      {rightText && <span className={styles.right}>{rightText}</span>}
    </>
  )

  if (onClick) {
    return (
      <button className={cls} style={{ background: bg }} data-testid={testId} onClick={onClick}>
        {inner}
      </button>
    )
  }
  return (
    <div className={cls} style={{ background: bg }} data-testid={testId}>
      {inner}
    </div>
  )
}

export function PropertyChipWrap({ children }: { children: React.ReactNode }) {
  return <div className={styles.wrap}>{children}</div>
}
