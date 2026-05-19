import styles from './PropertyDetail.module.css'
import { SPOTS, STREET_COLORS } from '../../types/spots'
import { RENT_TABLE, GROUP_SIZE } from '../../types/rents'
import type { SessionState } from '../../types/api'
import { useGame } from '../../store/GameContext'

interface Props {
  spotId: string
  state: SessionState
  onClose: () => void
}

export default function PropertyDetail({ spotId, state, onClose }: Props) {
  const { sendCmd, state: gs } = useGame()
  const myPlayerId = gs.myPlayerId ?? ''

  const spot = SPOTS.find(s => s.id === spotId)
  if (!spot || !spot.isProperty) return null

  const prop = state.properties.find(p => p.propertyId === spotId)
  const owner = prop?.ownerPlayerId
    ? state.players.find(p => p.playerId === prop.ownerPlayerId)
    : null
  const ownerSeat = owner
    ? state.seats.find(s => s.playerId === owner.playerId)
    : null

  const isMyProp = prop?.ownerPlayerId === myPlayerId
  const isOthersProp = owner && !isMyProp
  const canAct = !prop?.mortgaged

  // Count how many of this group the owner has
  const isRailroad = spot.streetType === 'RAILROAD'
  const isUtility = spot.streetType === 'UTILITY'
  const isStreet = !isRailroad && !isUtility

  const groupTotal = GROUP_SIZE[spot.streetType] ?? 0
  const ownerGroupCount = owner
    ? state.properties.filter(p =>
        p.ownerPlayerId === owner.playerId &&
        SPOTS.find(s => s.id === p.propertyId)?.streetType === spot.streetType
      ).length
    : 0

  const isMonopoly = isStreet && ownerGroupCount === groupTotal
  const rents = RENT_TABLE[spot.id] ?? []
  const mortgageValue = spot.price ? Math.floor(spot.price / 2) : 0
  const color = STREET_COLORS[spot.streetType]

  const sid = state.sessionId

  function openTrade() {
    if (!owner || !myPlayerId) return
    sendCmd({ type: 'OpenTrade', sessionId: sid, actorPlayerId: myPlayerId, targetPlayerId: owner.playerId })
    onClose()
  }

  function toggleMortgage() {
    if (!myPlayerId) return
    sendCmd({ type: 'ToggleMortgage', sessionId: sid, actorPlayerId: myPlayerId, propertyId: spotId })
    onClose()
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.card} onClick={e => e.stopPropagation()}>
        {/* Color header */}
        <div className={styles.header} style={{ background: color ?? '#888' }}>
          <div className={styles.headerName}>{spot.name}</div>
          {spot.streetType !== 'CORNER' && spot.streetType !== 'COMMUNITY' && spot.streetType !== 'CHANCE' && spot.streetType !== 'TAX' && (
            <div className={styles.headerType}>{spot.streetType.replace('_', ' ')}</div>
          )}
        </div>

        <div className={styles.body}>
          {/* Owner */}
          {owner ? (
            <div className={styles.ownerRow}>
              <span className={styles.ownerDot} style={{ background: ownerSeat?.tokenColorHex ?? '#888' }} />
              <span>{owner.name}</span>
              {prop?.mortgaged && <span className={styles.mortgagedBadge}>PANTATTU</span>}
            </div>
          ) : (
            <div className={styles.unowned}>Ei omistajaa</div>
          )}

          {/* Group info */}
          {isStreet && groupTotal > 0 && (
            <div className={styles.groupRow}>
              {Array.from({ length: groupTotal }).map((_, i) => (
                <div
                  key={i}
                  className={`${styles.groupDot} ${i < ownerGroupCount ? styles.groupDotFilled : ''}`}
                  style={i < ownerGroupCount ? { background: color ?? '#888' } : {}}
                />
              ))}
              <span className={styles.groupLabel}>
                {ownerGroupCount}/{groupTotal}
                {isMonopoly && <span className={styles.monopolyBadge}>MONOPOLI</span>}
              </span>
            </div>
          )}

          {/* Railroads owned info */}
          {isRailroad && owner && (
            <div className={styles.groupLabel}>
              Omistajallla {ownerGroupCount}/4 asemaa
            </div>
          )}

          {/* Price */}
          {spot.price && (
            <div className={styles.priceRow}>
              <span className={styles.priceLabel}>Hinta</span>
              <span className={styles.priceVal}>€{spot.price}</span>
            </div>
          )}

          {/* Rent table */}
          {isStreet && rents.length === 6 && (
            <div className={styles.rentTable}>
              <div className={styles.rentTitle}>Vuokrat</div>
              <div className={styles.rentRow}><span>Tyhjä{isMonopoly ? ' (monopoli 2×)' : ''}</span><span>€{isMonopoly && !owner ? rents[0] * 2 : rents[0]}</span></div>
              <div className={styles.rentRow}><span>🏠 1 talo</span><span>€{rents[1]}</span></div>
              <div className={styles.rentRow}><span>🏠🏠 2 taloa</span><span>€{rents[2]}</span></div>
              <div className={styles.rentRow}><span>🏠🏠🏠 3 taloa</span><span>€{rents[3]}</span></div>
              <div className={styles.rentRow}><span>🏠×4</span><span>€{rents[4]}</span></div>
              <div className={`${styles.rentRow} ${styles.hotelRow}`}><span>🏨 Hotelli</span><span>€{rents[5]}</span></div>
            </div>
          )}

          {isRailroad && rents.length === 4 && (
            <div className={styles.rentTable}>
              <div className={styles.rentTitle}>Vuokrat (asemien mukaan)</div>
              <div className={styles.rentRow}><span>🚂 1 asema</span><span>€{rents[0]}</span></div>
              <div className={styles.rentRow}><span>🚂🚂 2 asemaa</span><span>€{rents[1]}</span></div>
              <div className={styles.rentRow}><span>🚂🚂🚂 3 asemaa</span><span>€{rents[2]}</span></div>
              <div className={styles.rentRow}><span>🚂×4</span><span>€{rents[3]}</span></div>
            </div>
          )}

          {isUtility && (
            <div className={styles.rentTable}>
              <div className={styles.rentTitle}>Vuokra</div>
              <div className={styles.rentRow}><span>1 laitos omistettu</span><span>4× nopat</span></div>
              <div className={styles.rentRow}><span>2 laitosta omistettu</span><span>10× nopat</span></div>
            </div>
          )}

          {/* Buildings */}
          {isStreet && prop && (prop.houseCount > 0 || prop.hotelCount > 0) && (
            <div className={styles.buildingsRow}>
              {prop.hotelCount > 0
                ? <span>🏨 Hotelli</span>
                : <span>{'🏠'.repeat(prop.houseCount)} {prop.houseCount} talo{prop.houseCount !== 1 ? 'a' : ''}</span>
              }
            </div>
          )}

          {/* Mortgage value */}
          {mortgageValue > 0 && (
            <div className={styles.priceRow}>
              <span className={styles.priceLabel}>Panttausarvo</span>
              <span className={styles.priceVal}>€{mortgageValue}</span>
            </div>
          )}

          {/* Action buttons */}
          <div className={styles.actions}>
            {isMyProp && canAct && (
              <button className={`${styles.btn} ${styles.secondary}`} onClick={toggleMortgage}>
                🏦 Panttaa
              </button>
            )}
            {isMyProp && prop?.mortgaged && (
              <button className={`${styles.btn} ${styles.secondary}`} onClick={toggleMortgage}>
                💳 Lunasta pantit
              </button>
            )}
            {isOthersProp && (
              <button className={`${styles.btn} ${styles.primary}`} onClick={openTrade}>
                🤝 Tee kauppa
              </button>
            )}
            <button className={`${styles.btn} ${styles.ghost}`} onClick={onClose}>
              Sulje
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
