import styles from './PropertyChip.module.css'
import { SPOTS, STREET_COLORS } from '../../types/spots'
import Icon from './Icon'

interface PropertyChipProps {
  id: string
  rightText?: string
  selected?: boolean
  mortgaged?: boolean
  houses?: number
  hotel?: boolean
  onClick?: () => void
  testId?: string
}

export function PropertyChip({ id, rightText, selected, mortgaged, houses = 0, hotel = false, onClick, testId }: PropertyChipProps) {
  const spot = SPOTS.find(s => s.id === id)
  const color = spot?.streetType ? (STREET_COLORS[spot.streetType] ?? '#888') : '#888'
  const bg = selected ? color + '55' : color + '22'

  const cls = [
    styles.chip,
    selected ? styles.selected : '',
    mortgaged ? styles.mortgaged : '',
  ].filter(Boolean).join(' ')

  const buildings = hotel ? (
    // A hotel is the max upgrade — one solid red building (Monopoly convention).
    <span className={styles.buildings}><Icon name="hotel" size={11} style={{ color: '#d32f2f' }} /></span>
  ) : houses > 0 ? (
    <span className={styles.buildings}>
      <Icon name="house" size={11} strokeWidth={2.4} style={{ color: '#2e7d32' }} />
      {houses > 1 && <span className={styles.buildCount}>{houses}</span>}
    </span>
  ) : null

  const inner = (
    <>
      <div className={styles.bar} style={{ background: color }} />
      <span className={styles.name}>
        {selected && <span style={{ color: '#2e7d32', marginRight: 3 }}>✓</span>}
        {spot?.name ?? id}
        {mortgaged && <Icon name="lock" size={11} strokeWidth={2.2} className={styles.lock} />}
      </span>
      {buildings}
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
