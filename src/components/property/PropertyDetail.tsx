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

  // Compute current effective rent
  let currentRent: number | string | null = null
  if (owner && !prop?.mortgaged) {
    if (isStreet && rents.length >= 6) {
      const level = (prop?.hotelCount ?? 0) > 0 ? 5 : (prop?.houseCount ?? 0)
      currentRent = level === 0 && isMonopoly ? rents[0] * 2 : rents[level]
    } else if (isRailroad && rents.length >= 1) {
      currentRent = rents[Math.min(ownerGroupCount - 1, rents.length - 1)]
    } else if (isUtility) {
      currentRent = ownerGroupCount >= 2 ? '10× nopat' : '4× nopat'
    }
  }

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

  function buildHouse() {
    if (!myPlayerId) return
    sendCmd({ type: 'BuyBuildingRound', sessionId: sid, actorPlayerId: myPlayerId, propertyId: spotId })
    onClose()
  }

  const canBuild = isMyProp && isStreet && isMonopoly && !prop?.mortgaged && (prop?.hotelCount ?? 0) === 0

  // Sellable: at max level in the group
  const myLevelHere = (prop?.hotelCount ?? 0) > 0 ? 5 : (prop?.houseCount ?? 0)
  const maxLevelInGroup = owner ? state.properties
    .filter(p => SPOTS.find(s => s.id === p.propertyId)?.streetType === spot.streetType && p.ownerPlayerId === owner.playerId)
    .reduce((max, p) => Math.max(max, p.hotelCount > 0 ? 5 : p.houseCount), 0) : 0
  const canSell = isMyProp && isStreet && myLevelHere > 0 && myLevelHere >= maxLevelInGroup

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

          {/* Current effective rent */}
          {currentRent !== null && (
            <div className={styles.currentRentBox}>
              <span className={styles.currentRentLabel}>Nykyinen vuokra</span>
              <span className={styles.currentRentVal}>
                {typeof currentRent === 'number' ? `€${currentRent}` : currentRent}
              </span>
            </div>
          )}
          {prop?.mortgaged && owner && (
            <div className={styles.mortgagedRentBox}>Ei vuokraa — pantattu</div>
          )}

          {/* Price */}
          {spot.price && (
            <div className={styles.priceRow}>
              <span className={styles.priceLabel}>Hinta</span>
              <span className={styles.priceVal}>€{spot.price}</span>
            </div>
          )}

          {/* Rent table */}
          {isStreet && rents.length === 6 && (() => {
            const houses = prop?.houseCount ?? 0
            const hotels = prop?.hotelCount ?? 0
            const activeIdx = hotels > 0 ? 5 : houses  // 0=empty,1-4=houses,5=hotel
            const r = (i: number) => `${styles.rentRow} ${activeIdx === i && owner ? styles.rentRowActive : ''}`
            return (
              <div className={styles.rentTable}>
                <div className={styles.rentTitle}>Vuokrat</div>
                <div className={r(0)}><span>Tyhjä{isMonopoly ? ' (monopoli 2×)' : ''}</span><span>€{isMonopoly ? rents[0] * 2 : rents[0]}</span></div>
                <div className={r(1)}><span>🏠 1 talo</span><span>€{rents[1]}</span></div>
                <div className={r(2)}><span>🏠🏠 2 taloa</span><span>€{rents[2]}</span></div>
                <div className={r(3)}><span>🏠🏠🏠 3 taloa</span><span>€{rents[3]}</span></div>
                <div className={r(4)}><span>🏠×4</span><span>€{rents[4]}</span></div>
                <div className={`${r(5)} ${styles.hotelRow}`}><span>🏨 Hotelli</span><span>€{rents[5]}</span></div>
              </div>
            )
          })()}

          {isRailroad && rents.length === 4 && (() => {
            const ar = (i: number) => `${styles.rentRow} ${ownerGroupCount === i + 1 && owner ? styles.rentRowActive : ''}`
            return (
              <div className={styles.rentTable}>
                <div className={styles.rentTitle}>Vuokrat (asemien mukaan)</div>
                <div className={ar(0)}><span>🚂 1 asema</span><span>€{rents[0]}</span></div>
                <div className={ar(1)}><span>🚂🚂 2 asemaa</span><span>€{rents[1]}</span></div>
                <div className={ar(2)}><span>🚂🚂🚂 3 asemaa</span><span>€{rents[2]}</span></div>
                <div className={ar(3)}><span>🚂×4</span><span>€{rents[3]}</span></div>
              </div>
            )
          })()}

          {isUtility && (() => {
            const utilCount = owner
              ? state.properties.filter(p => p.ownerPlayerId === owner.playerId && SPOTS.find(s => s.id === p.propertyId)?.streetType === 'UTILITY').length
              : 0
            const au = (i: number) => `${styles.rentRow} ${utilCount === i + 1 && owner ? styles.rentRowActive : ''}`
            return (
              <div className={styles.rentTable}>
                <div className={styles.rentTitle}>Vuokra</div>
                <div className={au(0)}><span>1 laitos omistettu</span><span>4× nopat</span></div>
                <div className={au(1)}><span>2 laitosta omistettu</span><span>10× nopat</span></div>
              </div>
            )
          })()}

          {/* Buildings */}
          {isStreet && prop && (prop.houseCount > 0 || prop.hotelCount > 0) && (
            <div className={styles.buildingsRow}>
              {prop.hotelCount > 0
                ? <span>🏨 Hotelli</span>
                : <span>{'🏠'.repeat(prop.houseCount)} {prop.houseCount} talo{prop.houseCount !== 1 ? 'a' : ''}</span>
              }
            </div>
          )}

          {/* Mortgage / unmortgage info */}
          {mortgageValue > 0 && !prop?.mortgaged && (
            <div className={styles.priceRow}>
              <span className={styles.priceLabel}>Panttausarvo</span>
              <span className={styles.priceVal}>€{mortgageValue}</span>
            </div>
          )}
          {mortgageValue > 0 && prop?.mortgaged && (
            <div className={styles.priceRow}>
              <span className={styles.priceLabel}>Lunastushinta (+10%)</span>
              <span className={styles.priceVal}>€{Math.ceil(mortgageValue * 1.1)}</span>
            </div>
          )}

          {/* ROI for unowned properties */}
          {!owner && spot.price && rents.length > 0 && isStreet && (
            <div className={styles.roiRow}>
              <span className={styles.priceLabel}>Takaisinmaksu (tyhjä)</span>
              <span className={styles.priceVal}>~{Math.ceil(spot.price / (rents[0] * 2 || 1))}× kierros</span>
            </div>
          )}

          {/* Action buttons */}
          <div className={styles.actions}>
            {canBuild && (
              <button className={`${styles.btn} ${styles.build}`} onClick={buildHouse}>
                🏠 Rakenna talo
              </button>
            )}
            {canSell && (
              <button className={`${styles.btn} ${styles.secondary}`} onClick={() => {
                sendCmd({ type: 'SellBuildingRound', sessionId: sid, actorPlayerId: myPlayerId, propertyId: spotId })
                onClose()
              }}>
                −🏠 Myy talo
              </button>
            )}
            {isMyProp && canAct && !prop?.mortgaged && (
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
