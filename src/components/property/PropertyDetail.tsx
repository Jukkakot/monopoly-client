import styles from './PropertyDetail.module.css'
import { SPOTS, STREET_COLORS, HOUSE_PRICES } from '../../types/spots'
import type { StreetType } from '../../types/spots'
import { RENT_TABLE, GROUP_SIZE } from '../../types/rents'
import type { SessionState } from '../../types/api'
import { useGame } from '../../store/GameContext'
import { useT } from '../../i18n/LanguageContext'
import { setPendingTradeProperty } from '../actions/ActionPanel'
import { isBlockedByGroupBuildings } from '../../utils/mortgage'
import { bankHasBuildingFor } from '../../utils/buildSupply'
import Icon from '../common/Icon'

/** Row of little green house icons — mirrors the property-chip building glyphs. */
function HouseIcons({ n }: { n: number }) {
  return (
    <span className={styles.houseIcons}>
      {Array.from({ length: n }).map((_, i) => (
        <Icon key={i} name="house" size={12} strokeWidth={2.4} style={{ color: '#2e7d32' }} />
      ))}
    </span>
  )
}

interface Props {
  spotId: string
  state: SessionState
  onClose: () => void
}

export default function PropertyDetail({ spotId, state, onClose }: Props) {
  const t = useT()
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
  const isGameOver = state.status === 'GAME_OVER'
  const isMyTurn = state.turn?.activePlayerId === myPlayerId

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

  // All properties in this group that I own (for build/sell validation)
  const myGroupProps = isStreet && isMyProp
    ? state.properties.filter(p =>
        p.ownerPlayerId === myPlayerId &&
        SPOTS.find(s => s.id === p.propertyId)?.streetType === spot.streetType
      )
    : []
  const anyGroupMortgaged = myGroupProps.some(p => p.mortgaged)
  const myLevel = (prop?.hotelCount ?? 0) > 0 ? 5 : (prop?.houseCount ?? 0)
  const minLevelInGroup = myGroupProps.reduce((min, p) => Math.min(min, p.hotelCount > 0 ? 5 : p.houseCount), 5)
  const maxLevelInGroup = myGroupProps.reduce((max, p) => Math.max(max, p.hotelCount > 0 ? 5 : p.houseCount), 0)
  // Backend rule: a street cannot be mortgaged while ANY property in its color group
  // has buildings — sell all buildings in the group first. (Shared helper so the
  // ActionPanel mortgage list stays in sync.)
  const mortgageBlockedByBuildings = isBlockedByGroupBuildings(spotId, state.properties)
  const myCash = state.players.find(p => p.playerId === myPlayerId)?.cash ?? 0
  const housePrice = HOUSE_PRICES[spot.streetType as StreetType] ?? 0

  // Compute current effective rent
  let currentRent: number | string | null = null
  if (owner && !prop?.mortgaged) {
    if (isStreet && rents.length >= 6) {
      const level = (prop?.hotelCount ?? 0) > 0 ? 5 : (prop?.houseCount ?? 0)
      currentRent = level === 0 && isMonopoly ? rents[0] * 2 : rents[level]
    } else if (isRailroad && rents.length >= 1) {
      currentRent = rents[Math.min(ownerGroupCount - 1, rents.length - 1)]
    } else if (isUtility) {
      currentRent = ownerGroupCount >= 2 ? t.utilityDiceLarge : t.utilityDiceSmall
    }
  }

  const sid = state.sessionId

  function openTrade() {
    if (!owner || !myPlayerId || state.tradeState) return
    // Pre-select the viewed property on the "request" side of the trade
    const isMyPropLocal = prop?.ownerPlayerId === myPlayerId
    setPendingTradeProperty(spotId, isMyPropLocal /* offeredSide */)
    sendCmd({ type: 'OpenTrade', sessionId: sid, actorPlayerId: myPlayerId, recipientPlayerId: owner.playerId })
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

  const buildEligible = isMyProp && isStreet && isMonopoly
    && !anyGroupMortgaged
    && (prop?.hotelCount ?? 0) === 0
    && myLevel <= minLevelInGroup
    && myCash >= housePrice
    && isMyTurn && !isGameOver
  // The bank can run out of houses/hotels — the backend rejects a build then, so only
  // offer it when the bank actually has the building this step needs.
  const bankHasBuilding = bankHasBuildingFor(prop?.houseCount ?? 0, state.properties)
  const canBuild = buildEligible && bankHasBuilding
  const buildBlockedBySupply = buildEligible && !bankHasBuilding

  const canSell = isMyProp && isStreet && myLevel > 0 && myLevel >= maxLevelInGroup
    && isMyTurn && !isGameOver

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.card} onClick={e => e.stopPropagation()}>
        {/* Color header */}
        <div className={styles.header} style={{ background: color ?? '#888' }}>
          <div className={styles.headerName}>{spot.name}</div>
          {spot.streetType !== 'CORNER' && spot.streetType !== 'COMMUNITY' && spot.streetType !== 'CHANCE' && spot.streetType !== 'TAX' && (
            <div className={styles.headerType}>{t.streetTypeNames[spot.streetType] ?? spot.streetType}</div>
          )}
        </div>

        <div className={styles.body}>
          {/* Owner */}
          {owner ? (
            <div className={styles.ownerRow}>
              <span className={styles.ownerDot} style={{ background: ownerSeat?.tokenColorHex ?? '#888' }} />
              <span>{owner.name}</span>
              {prop?.mortgaged && <span className={styles.mortgagedBadge}>{t.mortgagedBadge}</span>}
            </div>
          ) : (
            <div className={styles.unowned}>{t.noOwnerMsg}</div>
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
                {isMonopoly && <span className={styles.monopolyBadge}>{t.monopolyBadge}</span>}
              </span>
            </div>
          )}

          {/* Railroads owned info */}
          {isRailroad && owner && (
            <div className={styles.groupLabel}>
              {t.stationsOwned(ownerGroupCount, groupTotal)}
            </div>
          )}

          {/* Current effective rent */}
          {currentRent !== null && (
            <div className={styles.currentRentBox}>
              <span className={styles.currentRentLabel}>{t.currentRentLabel}</span>
              <span className={styles.currentRentVal}>
                {typeof currentRent === 'number' ? `€${currentRent}` : currentRent}
              </span>
            </div>
          )}
          {prop?.mortgaged && owner && (
            <div className={styles.mortgagedRentBox}>{t.noRentMsg}</div>
          )}

          {/* Price */}
          {spot.price && (
            <div className={styles.priceRow}>
              <span className={styles.priceLabel}>{t.priceLabelPD}</span>
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
                <div className={styles.rentTitle}>{t.rentsTitle}</div>
                <div className={r(0)}><span>{t.emptyRentRow(isMonopoly)}</span><span>€{isMonopoly ? rents[0] * 2 : rents[0]}</span></div>
                <div className={r(1)}><span className={styles.rentLabel}><HouseIcons n={1} /> 1 {t.houseLabel}</span><span>€{rents[1]}</span></div>
                <div className={r(2)}><span className={styles.rentLabel}><HouseIcons n={2} /> 2 {t.houseLabel}</span><span>€{rents[2]}</span></div>
                <div className={r(3)}><span className={styles.rentLabel}><HouseIcons n={3} /> 3 {t.houseLabel}</span><span>€{rents[3]}</span></div>
                <div className={r(4)}><span className={styles.rentLabel}><HouseIcons n={4} /> 4 {t.houseLabel}</span><span>€{rents[4]}</span></div>
                <div className={`${r(5)} ${styles.hotelRow}`}><span className={styles.rentLabel}><Icon name="hotel" size={12} style={{ color: '#d32f2f' }} /> {t.hotelOwnedLabel}</span><span>€{rents[5]}</span></div>
              </div>
            )
          })()}

          {isRailroad && rents.length === 4 && (() => {
            const ar = (i: number) => `${styles.rentRow} ${ownerGroupCount === i + 1 && owner ? styles.rentRowActive : ''}`
            return (
              <div className={styles.rentTable}>
                <div className={styles.rentTitle}>{t.railroadRentsTitle}</div>
                <div className={ar(0)}><span>🚂×1</span><span>€{rents[0]}</span></div>
                <div className={ar(1)}><span>🚂×2</span><span>€{rents[1]}</span></div>
                <div className={ar(2)}><span>🚂×3</span><span>€{rents[2]}</span></div>
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
                <div className={styles.rentTitle}>{t.utilityRentTitle}</div>
                <div className={au(0)}><span>{t.utilityOwned1}</span><span>{t.utilityDiceSmall}</span></div>
                <div className={au(1)}><span>{t.utilityOwned2}</span><span>{t.utilityDiceLarge}</span></div>
              </div>
            )
          })()}

          {/* Buildings */}
          {isStreet && prop && (prop.houseCount > 0 || prop.hotelCount > 0) && (
            <div className={styles.buildingsRow}>
              {prop.hotelCount > 0
                ? <span className={styles.rentLabel}><Icon name="hotel" size={14} style={{ color: '#d32f2f' }} /> {t.hotelOwnedLabel}</span>
                : <span className={styles.rentLabel}><HouseIcons n={prop.houseCount} /> {t.houseCountLabel(prop.houseCount)}</span>
              }
            </div>
          )}

          {/* Mortgage / unmortgage info */}
          {mortgageValue > 0 && !prop?.mortgaged && (
            <div className={styles.priceRow}>
              <span className={styles.priceLabel}>{t.mortgageValueLabel}</span>
              <span className={styles.priceVal}>€{mortgageValue}</span>
            </div>
          )}
          {mortgageValue > 0 && prop?.mortgaged && (
            <div className={styles.priceRow}>
              <span className={styles.priceLabel}>{t.redemptionLabel}</span>
              <span className={styles.priceVal}>€{Math.ceil(mortgageValue * 1.1)}</span>
            </div>
          )}

          {/* ROI for unowned properties */}
          {!owner && spot.price && rents.length > 0 && isStreet && (
            <div className={styles.roiRow}>
              <span className={styles.priceLabel}>{t.roiLabel}</span>
              <span className={styles.priceVal}>{t.roiVal(Math.ceil(spot.price / (rents[0] * 2 || 1)))}</span>
            </div>
          )}

          {/* Action buttons */}
          <div className={styles.actions}>
            {canBuild && (
              <button className={`${styles.btn} ${styles.build}`} onClick={buildHouse}>
                {t.buildHouseBtn}
              </button>
            )}
            {buildBlockedBySupply && (
              <div className={styles.mortgageBlockedNote}>{t.bankSupplyExhausted}</div>
            )}
            {canSell && (
              <button className={`${styles.btn} ${styles.secondary}`} onClick={() => {
                sendCmd({ type: 'SellBuildingRound', sessionId: sid, actorPlayerId: myPlayerId, propertyId: spotId })
                onClose()
              }}>
                {t.sellHouseBtn}
              </button>
            )}
            {isMyProp && !prop?.mortgaged && !isGameOver && !mortgageBlockedByBuildings && (
              <button className={`${styles.btn} ${styles.secondary}`} onClick={toggleMortgage}>
                {t.mortgageBtn}
              </button>
            )}
            {isMyProp && !prop?.mortgaged && !isGameOver && mortgageBlockedByBuildings && (
              <div className={styles.mortgageBlockedNote}>{t.buildingsPresent}</div>
            )}
            {isMyProp && prop?.mortgaged && !isGameOver && (
              <button className={`${styles.btn} ${styles.secondary}`} onClick={toggleMortgage}>
                {t.redeemBtn}
              </button>
            )}
            {isOthersProp && !state.tradeState && !isGameOver && (
              <button className={`${styles.btn} ${styles.primary}`} onClick={openTrade}>
                {t.tradeBtnPD}
              </button>
            )}
            <button className={`${styles.btn} ${styles.ghost}`} onClick={onClose}>
              {t.closeBtnPD}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
