import { useState } from 'react'
import styles from './OverflowMenu.module.css'
import SoundSettings from './SoundSettings'
import { useGame } from '../../store/GameContext'
import { SPOTS, STREET_COLORS } from '../../types/spots'

export default function OverflowMenu() {
  const { state, sendCmd } = useGame()
  const { snapshot, myPlayerId } = state

  const [open, setOpen] = useState(false)
  const [showSound, setShowSound] = useState(false)
  const [showBuild, setShowBuild] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)

  function copyInviteLink() {
    if (!snapshot) return
    const url = `${window.location.origin}${window.location.pathname}#/game/${snapshot.sessionId}`
    navigator.clipboard.writeText(url).then(() => {
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2000)
    })
    setOpen(false)
  }

  const sid = snapshot?.sessionId ?? ''
  const turn = snapshot?.turn
  const isMyTurn = !!myPlayerId && turn?.activePlayerId === myPlayerId
  const phase = turn?.phase

  const canAct = isMyTurn && (phase === 'WAITING_FOR_ROLL' || phase === 'WAITING_FOR_END_TURN')

  // Trade partners
  const others = canAct
    ? (snapshot?.players ?? []).filter(p => p.playerId !== myPlayerId && !p.bankrupt && !p.eliminated)
    : []

  // Buildable properties
  const myProps = canAct
    ? (snapshot?.properties ?? []).filter(p => p.ownerPlayerId === myPlayerId)
    : []

  const groupCounts = new Map<string, number>()
  const totalCounts = new Map<string, number>()
  const NON_BUILDABLE = new Set(['RAILROAD', 'UTILITY', 'CORNER', 'COMMUNITY', 'CHANCE', 'TAX'])
  for (const prop of snapshot?.properties ?? []) {
    const spot = SPOTS.find(s => s.id === prop.propertyId)
    if (!spot || NON_BUILDABLE.has(spot.streetType)) continue
    totalCounts.set(spot.streetType, (totalCounts.get(spot.streetType) ?? 0) + 1)
    if (prop.ownerPlayerId === myPlayerId)
      groupCounts.set(spot.streetType, (groupCounts.get(spot.streetType) ?? 0) + 1)
  }
  const completedGroups = new Set<string>()
  for (const [type, count] of groupCounts)
    if (count === totalCounts.get(type)) completedGroups.add(type)

  const buildable = myProps.filter(p => {
    const spot = SPOTS.find(s => s.id === p.propertyId)
    return spot && !p.mortgaged && completedGroups.has(spot.streetType) && p.hotelCount === 0
  })
  const mortgageable = myProps.filter(p => p.houseCount === 0 && p.hotelCount === 0 && !p.mortgaged)
  const redeemable = myProps.filter(p => p.mortgaged)

  const hasBuildActions = buildable.length > 0 || mortgageable.length > 0 || redeemable.length > 0

  function cmd(type: string, extra: object = {}) {
    sendCmd({ type, sessionId: sid, actorPlayerId: myPlayerId, ...extra })
  }

  return (
    <div className={styles.root}>
      <button className={styles.trigger} onClick={() => setOpen(v => !v)} title="Lisätoiminnot">
        ⋯
      </button>

      {showSound && (
        <div className={styles.soundOverlay} onClick={() => setShowSound(false)}>
          <div onClick={e => e.stopPropagation()}>
            <SoundSettings onClose={() => setShowSound(false)} />
          </div>
        </div>
      )}

      {showBuild && (
        <div className={styles.soundOverlay} onClick={() => setShowBuild(false)}>
          <div className={styles.buildModal} onClick={e => e.stopPropagation()}>
            <div className={styles.buildModalHeader}>
              <span>Rakenna / Panttaa</span>
              <button className={styles.closeBtn} onClick={() => setShowBuild(false)}>✕</button>
            </div>

            {buildable.length > 0 && (
              <div className={styles.buildSection}>
                <div className={styles.buildSectionTitle}>🏠 Rakenna taloja</div>
                {buildable.map(prop => {
                  const spot = SPOTS.find(s => s.id === prop.propertyId)
                  const color = STREET_COLORS[spot?.streetType ?? '']
                  return (
                    <div key={prop.propertyId} className={styles.buildRow}>
                      <span className={styles.buildDot} style={{ background: color }} />
                      <span className={styles.buildName}>{spot?.name ?? prop.propertyId}</span>
                      <div className={styles.buildHouses}>
                        {Array.from({ length: prop.houseCount }).map((_, i) => <div key={i} className={styles.houseBox} />)}
                        {Array.from({ length: 4 - prop.houseCount }).map((_, i) => <div key={i} className={styles.houseEmpty} />)}
                      </div>
                      <button className={styles.buildBtn}
                        onClick={() => cmd('BuyBuildingRound', { propertyId: prop.propertyId })}>
                        +
                      </button>
                    </div>
                  )
                })}
              </div>
            )}

            {mortgageable.length > 0 && (
              <div className={styles.buildSection}>
                <div className={styles.buildSectionTitle}>🏦 Panttaa</div>
                {mortgageable.map(prop => {
                  const spot = SPOTS.find(s => s.id === prop.propertyId)
                  return (
                    <div key={prop.propertyId} className={styles.buildRow}>
                      <span className={styles.buildName}>{spot?.name ?? prop.propertyId}</span>
                      <button className={styles.buildBtn}
                        onClick={() => cmd('ToggleMortgage', { propertyId: prop.propertyId })}>
                        Panttaa
                      </button>
                    </div>
                  )
                })}
              </div>
            )}

            {redeemable.length > 0 && (
              <div className={styles.buildSection}>
                <div className={styles.buildSectionTitle}>💳 Lunasta pantit</div>
                {redeemable.map(prop => {
                  const spot = SPOTS.find(s => s.id === prop.propertyId)
                  return (
                    <div key={prop.propertyId} className={styles.buildRow}>
                      <span className={styles.buildName}>{spot?.name ?? prop.propertyId}</span>
                      <button className={styles.buildBtn}
                        onClick={() => cmd('ToggleMortgage', { propertyId: prop.propertyId })}>
                        Lunasta
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {showHelp && (
        <div className={styles.soundOverlay} onClick={() => setShowHelp(false)}>
          <div className={styles.helpModal} onClick={e => e.stopPropagation()}>
            <div className={styles.buildModalHeader}>
              <span>⌨ Pikanäppäimet</span>
              <button className={styles.closeBtn} onClick={() => setShowHelp(false)}>✕</button>
            </div>
            <div className={styles.helpTable}>
              <div className={styles.helpRow}><kbd>Välilyönti</kbd><span>Heitä nopat / Lopeta vuoro</span></div>
              <div className={styles.helpRow}><kbd>Esc</kbd><span>Sulje modaali / kiinteistö</span></div>
              <div className={styles.helpRow}><kbd>M</kbd><span>Mykistä / Ota äänet käyttöön</span></div>
            </div>
          </div>
        </div>
      )}

      {open && (
        <>
          <div className={styles.backdrop} onClick={() => setOpen(false)} />
          <div className={styles.menu}>
            <div className={styles.menuTitle}>Lisätoiminnot</div>

            {canAct && others.length > 0 && (
              <>
                <div className={styles.menuLabel}>🤝 Tee kauppa</div>
                {others.map(p => {
                  const seat = snapshot?.seats.find(s => s.playerId === p.playerId)
                  return (
                    <button key={p.playerId} className={`${styles.menuItem} ${styles.tradeBtn}`}
                      onClick={() => { setOpen(false); cmd('OpenTrade', { targetPlayerId: p.playerId }) }}>
                      <span className={styles.tradeColor} style={{ background: seat?.tokenColorHex ?? '#888' }} />
                      {p.name}
                    </button>
                  )
                })}
                <div className={styles.divider} />
              </>
            )}

            {canAct && hasBuildActions && (
              <button className={styles.menuItem} onClick={() => { setOpen(false); setShowBuild(true) }}>
                🏠 Rakenna / Panttaa
              </button>
            )}

            {snapshot && (
              <button className={styles.menuItem} onClick={copyInviteLink}>
                {linkCopied ? '✓ Linkki kopioitu!' : '🔗 Kopioi kutsulink'}
              </button>
            )}
            <button className={styles.menuItem} onClick={() => { setOpen(false); setShowSound(true) }}>
              ⚙️ Ääniasetukset
            </button>
            <button className={styles.menuItem} onClick={() => { setOpen(false); setShowHelp(true) }}>
              ⌨ Pikanäppäimet
            </button>
            <div className={styles.divider} />
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
