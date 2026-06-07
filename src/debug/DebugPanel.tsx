import { useState, useEffect, useRef, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { useGame } from '../store/GameContext'
import type { SessionState } from '../types/api'
import type { DebugStateImport } from '../api/sessionApi'
import { importDebugState, fetchSnapshot, createBotsOnlySession, retriggerBot } from '../api/sessionApi'
import { getCardText } from '../i18n/cards'
import { SPOTS, STREET_COLORS, indexToGridPos, type StreetType } from '../types/spots'
import styles from './DebugPanel.module.css'

// Non-property spot background colors
const CORNER_BG = '#1a1a1a'
const NEUTRAL_BG = '#232323'

// Card keys as stored in the deck (no bundle prefix). Label = short Finnish description.
const CHANCE_CARDS: { key: string; label: string }[] = [
  { key: 'GO_JAIL:0',            label: '⛓ Mene vankilaan' },
  { key: 'OUT_OF_JAIL:0',        label: '🃏 Vapautuskortti' },
  { key: 'MOVE:0',               label: '→ Katajanokka (A)' },
  { key: 'MOVE:1',               label: '→ GO (+€200)' },
  { key: 'MOVE:2',               label: '→ Tapiola' },
  { key: 'MOVE:3',               label: '→ Vallila' },
  { key: 'MOVE:4',               label: '→ Rautatieasema' },
  { key: 'MOVE_NEAREST:0',       label: '🚂 Lähin asema ×2' },
  { key: 'MOVE_NEAREST:1',       label: '⚡ Lähin laitos ×10' },
  { key: 'MOVE_BACK_3:0',        label: '← 3 askelta taaksepäin' },
  { key: 'MONEY:0',              label: '💰 +150 laina' },
  { key: 'MONEY:1',              label: '💰 +50 osinko' },
  { key: 'MONEY:2',              label: '💸 -15 sakko' },
  { key: 'REPAIR_PROPERTIES:0',  label: '🏠 Korjaukset -25/talo' },
  { key: 'ALL_PLAYERS_MONEY:0',  label: '💸 Maksa kaikille -50' },
]

const COMMUNITY_CARDS: { key: string; label: string }[] = [
  { key: 'GO_JAIL:0',            label: '⛓ Mene vankilaan' },
  { key: 'OUT_OF_JAIL:0',        label: '🃏 Vapautuskortti' },
  { key: 'MOVE:0',               label: '→ GO (+€200)' },
  { key: 'ALL_PLAYERS_MONEY:0',  label: '🎂 Kerää kaikilta +10' },
  { key: 'REPAIR_PROPERTIES:0',  label: '🏠 Korjaukset -40/talo' },
  { key: 'MONEY:0',              label: '💰 +200 pankkivirhe' },
  { key: 'MONEY:1',              label: '💸 -50 lääkäri' },
  { key: 'MONEY:2',              label: '💰 +50 osakkeet' },
  { key: 'MONEY:3',              label: '💰 +100 loma' },
  { key: 'MONEY:4',              label: '💰 +20 veronpalautus' },
  { key: 'MONEY:5',              label: '💰 +100 henkivakuutus' },
  { key: 'MONEY:6',              label: '💸 -100 sairaala' },
  { key: 'MONEY:7',              label: '💸 -50 koulu' },
  { key: 'MONEY:8',              label: '💰 +25 konsultointi' },
  { key: 'MONEY:9',              label: '💰 +10 kauneuskilpailu' },
  { key: 'MONEY:10',             label: '💰 +100 perintö' },
]

// Resolved at dev-server startup; page refresh picks up newly captured files.
const scenarioModules = import.meta.glob('./scenarios/*.json', { eager: true }) as Record<string, { default: SessionState }>

function scenarioNames(): string[] {
  return Object.keys(scenarioModules).map(k => k.replace('./scenarios/', '').replace('.json', ''))
}

/** Remap a scenario's playerIds to match a target session (by seat index order). */
function buildDebugImport(scenario: SessionState, target: SessionState): DebugStateImport {
  // Build index-based player map: scenario[i].playerId → i
  const scenPlayerIdx = new Map(scenario.players.map((p, i) => [p.playerId, i]))

  const players = scenario.players.flatMap((sp, i) => {
    const tp = target.players[i]
    if (!tp) return []
    return [{
      playerId: tp.playerId,
      cash: sp.cash,
      boardIndex: sp.boardIndex,
      inJail: sp.inJail,
      bankrupt: sp.bankrupt,
      getOutOfJailCards: sp.getOutOfJailCards,
      ownedPropertyIds: sp.ownedPropertyIds,
    }]
  })

  const properties = scenario.properties.map(p => {
    const ownerIdx = p.ownerPlayerId != null ? scenPlayerIdx.get(p.ownerPlayerId) : undefined
    const targetOwnerId =
      ownerIdx !== undefined ? (target.players[ownerIdx]?.playerId ?? '') : ''
    return {
      propertyId: p.propertyId,
      ownerPlayerId: p.ownerPlayerId != null ? targetOwnerId : '',
      mortgaged: p.mortgaged,
      houseCount: p.houseCount,
      hotelCount: p.hotelCount,
    }
  })

  const activeIdx = scenario.turn
    ? (scenPlayerIdx.get(scenario.turn.activePlayerId) ?? 0)
    : 0
  const targetActiveId =
    target.players[activeIdx]?.playerId ?? target.players[0]?.playerId ?? ''

  return {
    players,
    properties,
    turn: scenario.turn ? {
      activePlayerId: targetActiveId,
      phase: scenario.turn.phase,
      consecutiveDoubles: scenario.turn.consecutiveDoubles,
      lastDice: scenario.turn.lastDice ?? null,
    } : undefined,
    clearDebt: !scenario.activeDebt,
    clearDecision: !scenario.pendingDecision,
    clearAuction: !scenario.auctionState,
    clearTrade: !scenario.tradeState,
  }
}

interface Props {
  sessionId: string
}

const SECTIONS = ['scenarios', 'capture', 'force', 'sse', 'players', 'properties'] as const
type SectionKey = typeof SECTIONS[number]
const SECTION_LABELS: Record<SectionKey, string> = {
  scenarios:  'SKENAARIOT',
  capture:    'CAPTURE',
  force:      'PAKOTA SEURAAVA',
  sse:        'SSE-INJEKTIO (offline)',
  players:    'PELAAJAT',
  properties: 'KIINTEISTÖT (lauta)',
}

const CASH_STEPS = [50, 100, 500] as const

export default function DebugPanel({ sessionId }: Props) {
  const { state, freezeSSE, unfreezeSSE, injectDebugSnapshot } = useGame()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState('')
  const [captureName, setCaptureName] = useState(() => {
    const now = new Date()
    return `scenario-${now.getMonth()+1}${now.getDate()}-${now.getHours()}${String(now.getMinutes()).padStart(2,'0')}`
  })
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const [diceD1, setDiceD1] = useState<number | null>(null)
  const [diceD2, setDiceD2] = useState<number | null>(null)
  const [diceActive, setDiceActive] = useState(false)
  const [persistDice, setPersistDice] = useState(false)
  const [forceChance, setForceChance] = useState('')
  const [forceCommunity, setForceCommunity] = useState('')
  const prevLastDice = useRef<string>('')
  const prevLastCard = useRef<string>('')
  // Collapsed state per section, persisted in localStorage
  const [collapsed, setCollapsed] = useState<Partial<Record<SectionKey, boolean>>>(() => {
    try { return JSON.parse(localStorage.getItem('debug_panel_collapsed') ?? '{}') } catch { return {} }
  })
  function toggleSection(key: SectionKey) {
    setCollapsed(c => {
      const next = { ...c, [key]: !c[key] }
      try { localStorage.setItem('debug_panel_collapsed', JSON.stringify(next)) } catch { /* ignore */ }
      return next
    })
  }
  // Property editor
  const [editingPropId, setEditingPropId] = useState<string | null>(null)
  const [editingCellRect, setEditingCellRect] = useState<DOMRect | null>(null)

  // Always-current ref so the lastDice effect never has stale closures

  // Drag state — persisted in localStorage
  const [pos, setPos] = useState<{ x: number; y: number }>(() => {
    try {
      const saved = localStorage.getItem('debug_panel_pos')
      if (saved) return JSON.parse(saved)
    } catch { /* ignore */ }
    return { x: Math.max(8, window.innerWidth - 276), y: Math.max(8, window.innerHeight - 560) }
  })
  const [size, setSize] = useState<{ w: number; h: number }>(() => {
    try {
      const saved = localStorage.getItem('debug_panel_size')
      if (saved) return JSON.parse(saved)
    } catch { /* ignore */ }
    return { w: 260, h: 520 }
  })
  const dragRef = useRef<{ mx: number; my: number; px: number; py: number } | null>(null)
  const resizeRef = useRef<{ mx: number; my: number; sw: number; sh: number } | null>(null)

  useEffect(() => { try { localStorage.setItem('debug_panel_pos', JSON.stringify(pos)) } catch { /* ignore */ } }, [pos])
  useEffect(() => { try { localStorage.setItem('debug_panel_size', JSON.stringify(size)) } catch { /* ignore */ } }, [size])

  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (dragRef.current) {
        setPos({
          x: Math.max(0, dragRef.current.px + e.clientX - dragRef.current.mx),
          y: Math.max(0, dragRef.current.py + e.clientY - dragRef.current.my),
        })
      }
      if (resizeRef.current) {
        setSize({
          w: Math.max(220, resizeRef.current.sw + e.clientX - resizeRef.current.mx),
          h: Math.max(180, resizeRef.current.sh + e.clientY - resizeRef.current.my),
        })
      }
    }
    function onUp() { dragRef.current = null; resizeRef.current = null }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [])
  const diceCtx = useRef({ d1: null as number | null, d2: null as number | null, persist: false })
  diceCtx.current = { d1: diceD1, d2: diceD2, persist: persistDice }

  const scenarios = scenarioNames()

  function showMsg(m: string) {
    setMsg(m)
    setTimeout(() => setMsg(''), 4000)
  }

  function getScenario(): SessionState | null {
    if (!selected) return null
    return (scenarioModules[`./scenarios/${selected}.json`]?.default as SessionState) ?? null
  }

  // ── Capture ──────────────────────────────────────────────────────────────────

  async function handleCapture() {
    const name = captureName.trim() || `scenario-${Date.now()}`
    if (!state.snapshot) return
    setCaptureName(name)
    try {
      const res = await fetch('/__debug/save-scenario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, state: state.snapshot }),
      })
      const data: { ok: boolean; file?: string; error?: string } = await res.json()
      showMsg(data.ok ? `✓ ${data.file}` : `✗ ${data.error}`)
    } catch (e) {
      showMsg(`✗ ${String(e)}`)
    }
  }

  // ── Vaihe 3: Lataa peliin ─────────────────────────────────────────────────

  async function handleLoadIntoGame() {
    const scenario = getScenario()
    if (!scenario || !state.snapshot) return
    setBusy(true)
    try {
      const patch = buildDebugImport(scenario, state.snapshot)
      const result = await importDebugState(sessionId, patch)
      if (result.applied) await retriggerBot(sessionId).catch(() => {/* ignore if no bot */})
      showMsg(result.applied ? '✓ Tila ladattu' : '✗ Backend ei hyväksynyt')
    } catch (e) {
      showMsg(`✗ ${String(e)}`)
    } finally {
      setBusy(false)
    }
  }

  // ── Vaihe 5: Uusi peli skenaarista ───────────────────────────────────────

  async function handleNewGameFromScenario() {
    const scenario = getScenario()
    if (!scenario) return
    setBusy(true)
    try {
      const botCount = Math.max(2, Math.min(6, scenario.players.length))
      const { sessionId: newSid } = await createBotsOnlySession(botCount)

      // Poll until the backend has the initial snapshot ready
      let newSnap: SessionState | null = null
      for (let attempt = 0; attempt < 10; attempt++) {
        newSnap = await fetchSnapshot(newSid)
        if (newSnap) break
        await new Promise(r => setTimeout(r, 300))
      }
      if (!newSnap) { showMsg('✗ Snapshot ei saatavilla'); setBusy(false); return }

      const patch = buildDebugImport(scenario, newSnap)
      await importDebugState(newSid, patch)
      await retriggerBot(newSid).catch(() => {/* ignore */})

      navigate(`/game/${newSid}?debug=1`)
    } catch (e) {
      showMsg(`✗ ${String(e)}`)
      setBusy(false)
    }
  }

  // ── Offline inject ────────────────────────────────────────────────────────

  function handleInject() {
    const scenario = getScenario()
    if (!scenario) return
    const injected: SessionState = {
      ...scenario,
      sessionId: state.snapshot?.sessionId ?? scenario.sessionId,
      seats: state.snapshot?.seats ?? scenario.seats,
    }
    injectDebugSnapshot(injected)
  }

  // Detect when forced dice was consumed (lastDice changed after we set an override)
  useEffect(() => {
    const key = JSON.stringify(state.snapshot?.turn?.lastDice)
    if (key === prevLastDice.current) return
    prevLastDice.current = key
    if (!diceActive) return
    const { d1, d2, persist } = diceCtx.current
    if (persist && d1 !== null && d2 !== null) {
      importDebugState(sessionId, { nextDice: [d1, d2] })
        .then(() => retriggerBot(sessionId).catch(() => {}))
        .catch(() => {})
    } else {
      setDiceActive(false)
      setDiceD1(null)
      setDiceD2(null)
    }
  }, [state.snapshot?.turn?.lastDice]) // eslint-disable-line react-hooks/exhaustive-deps

  // Detect when a forced card was consumed (lastCardKey changed)
  useEffect(() => {
    const key = state.snapshot?.lastCardKey ?? ''
    if (key === prevLastCard.current) return
    prevLastCard.current = key
    if (key.startsWith('chance:')) setForceChance('')
    if (key.startsWith('community:')) setForceCommunity('')
  }, [state.snapshot?.lastCardKey])

  async function sendOverride(patch: DebugStateImport) {
    try {
      const result = await importDebugState(sessionId, patch)
      if (!result.applied) { showMsg('✗ Ei hyväksytty'); return }
      // Retrigger bot so it re-reads the fresh state (including any dice override)
      // before its scheduled action fires.
      if (patch.nextDice) {
        await retriggerBot(sessionId).catch(() => {})
        showMsg(`⚡ noppa ${patch.nextDice[0]}+${patch.nextDice[1]}=${patch.nextDice[0]+patch.nextDice[1]} asetettu`)
      } else if (patch.nextChanceCard) {
        showMsg(`🃏 sattuma: ${patch.nextChanceCard}`)
      } else if (patch.nextCommunityCard) {
        showMsg(`🃏 yhteiskassa: ${patch.nextCommunityCard}`)
      }
    } catch (e) {
      showMsg(`✗ ${String(e)}`)
    }
  }

  void getCardText  // imported for potential future use

  // ── Player helpers ────────────────────────────────────────────────────────

  async function adjustCash(playerId: string, currentCash: number, delta: number) {
    const newCash = Math.max(0, currentCash + delta)
    try {
      await importDebugState(sessionId, { players: [{ playerId, cash: newCash }] })
      showMsg(`${delta > 0 ? '+' : ''}${delta} → €${newCash}`)
    } catch (e) { showMsg(`✗ ${String(e)}`) }
  }

  async function setPosition(playerId: string, boardIndex: number) {
    try {
      await importDebugState(sessionId, { players: [{ playerId, boardIndex }] })
      const name = SPOTS[boardIndex]?.name ?? `#${boardIndex}`
      showMsg(`→ ${name}`)
    } catch (e) { showMsg(`✗ ${String(e)}`) }
  }

  // ── Property helpers ──────────────────────────────────────────────────────

  function getPropState(propId: string) {
    return state.snapshot?.properties.find(p => p.propertyId === propId)
  }

  function getOwnerName(ownerId: string | null | undefined): string {
    if (!ownerId) return '—'
    const p = state.snapshot?.players.find(p => p.playerId === ownerId)
    return p ? p.name.slice(0, 8) : '?'
  }

  async function patchProperty(propId: string, patch: {
    ownerPlayerId?: string; mortgaged?: boolean; houseCount?: number; hotelCount?: number
  }) {
    try {
      await importDebugState(sessionId, { properties: [{ propertyId: propId, ...patch }] })
    } catch (e) { showMsg(`✗ ${String(e)}`) }
  }

  function calcPopupStyle(rect: DOMRect): CSSProperties {
    const vw = window.innerWidth
    const vh = window.innerHeight
    const popupW = 210
    const popupH = 180
    const gap = 6
    let left = rect.right + gap
    if (left + popupW > vw - 8) left = rect.left - popupW - gap
    if (left < 8) left = 8
    let top = rect.top
    if (top + popupH > vh - 8) top = vh - popupH - 8
    if (top < 8) top = 8
    return { position: 'fixed', left, top, width: popupW, zIndex: 10001 }
  }

  if (!open) {
    return (
      <button className={styles.fab} onClick={() => setOpen(true)} title="Debug panel">🐛</button>
    )
  }

  return (
    <div
      className={styles.panel}
      style={{ left: pos.x, top: pos.y, width: size.w, height: size.h }}
    >
      <div
        className={styles.header}
        onMouseDown={e => { dragRef.current = { mx: e.clientX, my: e.clientY, px: pos.x, py: pos.y }; e.preventDefault() }}
      >
        <span className={styles.headerTitle}>🐛 DEBUG</span>
        <button className={styles.closeBtn} onClick={() => setOpen(false)}>✕</button>
      </div>

      <div className={styles.scrollBody}>

      {/* ── Scenarios ────────────────────────────────────────────────────── */}
      <section className={styles.section}>
        <div className={styles.sectionTitle} onClick={() => toggleSection('scenarios')}>
          <span className={styles.collapseArrow}>{collapsed.scenarios ? '▸' : '▾'}</span>
          {SECTION_LABELS.scenarios}
        </div>
        {!collapsed.scenarios && (
          <>
            {scenarios.length === 0
              ? <div className={styles.hint}>Ei skenaarioita — käytä Capture ↓</div>
              : (
                <select className={styles.select} value={selected} onChange={e => setSelected(e.target.value)}>
                  <option value="">— valitse —</option>
                  {scenarios.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              )
            }
            <button
              className={styles.btn}
              onClick={handleLoadIntoGame}
              disabled={!selected || busy || !state.snapshot}
              title="Lataa valittu skenaario käynnissä olevaan sessioon"
            >▶ Lataa peliin</button>
            <button
              className={styles.btn}
              onClick={handleNewGameFromScenario}
              disabled={!selected || busy}
              title="Luo uusi botti-sessio ja importoi skenaario siihen"
            >⊕ Uusi peli skenaarista</button>
          </>
        )}
      </section>

      {/* ── Force next ───────────────────────────────────────────────────── */}
      <section className={styles.section}>
        <div className={styles.sectionTitle} onClick={() => toggleSection('force')}>
          <span className={styles.collapseArrow}>{collapsed.force ? '▸' : '▾'}</span>
          {SECTION_LABELS.force}
          {diceActive && <span className={styles.activeBadge}>⚡</span>}
          {(forceChance || forceCommunity) && <span className={styles.activeBadge}>🃏</span>}
        </div>
        {!collapsed.force && (
          <>
            <div className={styles.diceRow}>
              <span className={styles.diceLabel}>🎲</span>
              {([diceD1, diceD2] as const).map((val, i) => (
                <select key={i} className={`${styles.diceSelect} ${diceActive ? styles.diceActive : ''}`}
                  value={val ?? ''}
                  onChange={e => {
                    const v = e.target.value === '' ? null : +e.target.value
                    const d1 = i === 0 ? v : diceD1
                    const d2 = i === 1 ? v : diceD2
                    if (i === 0) setDiceD1(v); else setDiceD2(v)
                    if (d1 !== null && d2 !== null) {
                      setDiceActive(true)
                      sendOverride({ nextDice: [d1, d2] })
                    }
                  }}>
                  <option value="">—</option>
                  {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              ))}
              {diceD1 !== null && diceD2 !== null && (
                <span className={`${styles.diceSum} ${diceActive ? styles.diceSumActive : ''}`}>
                  ={diceD1 + diceD2}
                </span>
              )}
              <label className={styles.persistLabel}>
                <input type="checkbox" checked={persistDice} onChange={e => setPersistDice(e.target.checked)} />
                🔁
              </label>
              {diceActive && (
                <button className={styles.diceReset} title="Peruuta pakko"
                  onClick={() => { setDiceActive(false); setDiceD1(null); setDiceD2(null) }}>✕</button>
              )}
            </div>
            {diceActive && <div className={styles.diceHint}>⚡ heitetään{persistDice ? ' (pysyvä)' : ' kerran'}</div>}

            <div className={styles.cardRow}>
              <span className={styles.diceLabel}>🃏 Sattuma</span>
              <select className={`${styles.select} ${forceChance ? styles.cardActive : ''}`}
                value={forceChance}
                onChange={e => { setForceChance(e.target.value); if (e.target.value) sendOverride({ nextChanceCard: e.target.value }) }}>
                <option value="">— ei pakotusta —</option>
                {CHANCE_CARDS.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
              </select>
            </div>
            <div className={styles.cardRow}>
              <span className={styles.diceLabel}>🃏 Yhteiskassa</span>
              <select className={`${styles.select} ${forceCommunity ? styles.cardActive : ''}`}
                value={forceCommunity}
                onChange={e => { setForceCommunity(e.target.value); if (e.target.value) sendOverride({ nextCommunityCard: e.target.value }) }}>
                <option value="">— ei pakotusta —</option>
                {COMMUNITY_CARDS.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
              </select>
            </div>
          </>
        )}
      </section>

      {/* ── Capture ──────────────────────────────────────────────────────── */}
      <section className={styles.section}>
        <div className={styles.sectionTitle} onClick={() => toggleSection('capture')}>
          <span className={styles.collapseArrow}>{collapsed.capture ? '▸' : '▾'}</span>
          {SECTION_LABELS.capture}
        </div>
        {!collapsed.capture && (
          <>
            <input
              className={styles.input}
              placeholder="nimi (esim. velka-tilanne)"
              value={captureName}
              onChange={e => setCaptureName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCapture()}
              maxLength={60}
            />
            <button className={styles.btn} onClick={handleCapture} disabled={!state.snapshot}>
              📸 Tallenna skenaarioksi
            </button>
          </>
        )}
      </section>

      {/* ── SSE / offline injection ───────────────────────────────────────── */}
      <section className={styles.section}>
        <div className={styles.sectionTitle} onClick={() => toggleSection('sse')}>
          <span className={styles.collapseArrow}>{collapsed.sse ? '▸' : '▾'}</span>
          {SECTION_LABELS.sse}
          {state.sseFrozen && <span className={styles.activeBadge}>⏸</span>}
        </div>
        {!collapsed.sse && (
          <>
            <div className={styles.freezeRow}>
              <button
                className={`${styles.btn} ${state.sseFrozen ? styles.btnDanger : ''}`}
                onClick={() => state.sseFrozen ? unfreezeSSE() : freezeSSE()}
              >
                {state.sseFrozen ? '▶ Sulata SSE' : '⏸ Jäädytä SSE'}
              </button>
              <span className={`${styles.statusDot} ${state.sseFrozen ? styles.dotFrozen : styles.dotLive}`} />
              <span className={styles.statusLabel}>{state.sseFrozen ? 'jäädytetty' : 'live'}</span>
            </div>
            <button className={styles.btn} onClick={handleInject} disabled={!selected}>
              ▶ Injektoi valittu skenaario
            </button>
          </>
        )}
      </section>

      {/* ── Players ──────────────────────────────────────────────────────── */}
      <section className={styles.section}>
        <div className={styles.sectionTitle} onClick={() => toggleSection('players')}>
          <span className={styles.collapseArrow}>{collapsed.players ? '▸' : '▾'}</span>
          {SECTION_LABELS.players}
        </div>
        {!collapsed.players && state.snapshot && (
          <div className={styles.playerList}>
            {state.snapshot.players.filter(p => !p.bankrupt && !p.eliminated).map(player => (
              <div key={player.playerId} className={styles.playerDebugRow}>
                <div className={styles.playerDebugName}>{player.name}</div>
                <div className={styles.playerDebugCash}>€{player.cash}</div>
                <div className={styles.cashBtnGroup}>
                  {CASH_STEPS.map(step => (
                    <button key={`-${step}`} className={`${styles.cashBtn} ${styles.cashMinus}`}
                      onClick={() => adjustCash(player.playerId, player.cash, -step)}>
                      -{step}
                    </button>
                  ))}
                  {CASH_STEPS.map(step => (
                    <button key={`+${step}`} className={`${styles.cashBtn} ${styles.cashPlus}`}
                      onClick={() => adjustCash(player.playerId, player.cash, step)}>
                      +{step}
                    </button>
                  ))}
                </div>
                <div className={styles.posRow}>
                  <span className={styles.posLabel}>📍</span>
                  <select
                    className={styles.posSelect}
                    value={player.boardIndex}
                    onChange={e => setPosition(player.playerId, +e.target.value)}
                  >
                    {SPOTS.map((s, i) => (
                      <option key={i} value={i}>{i}: {s.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Mini board + property editor ────────────────────────────────── */}
      <section className={styles.section}>
        <div className={styles.sectionTitle} onClick={() => toggleSection('properties')}>
          <span className={styles.collapseArrow}>{collapsed.properties ? '▸' : '▾'}</span>
          {SECTION_LABELS.properties}
          {editingPropId && <span className={styles.activeBadge}>✏</span>}
        </div>
        {!collapsed.properties && state.snapshot && (() => {
          const snap = state.snapshot!
          const editSpot = editingPropId ? SPOTS.find(s => s.id === editingPropId) : null
          const editPs = editingPropId ? getPropState(editingPropId) : null
          const isStreet = editSpot && editSpot.streetType !== 'RAILROAD' && editSpot.streetType !== 'UTILITY'

          return (
            <>
              {/* Mini board grid */}
              <div className={styles.miniBoard}>
                {SPOTS.map((spot, idx) => {
                  const { row, col } = indexToGridPos(idx)
                  const ps = spot.isProperty ? getPropState(spot.id) : null
                  const ownerColor = ps?.ownerPlayerId
                    ? snap.seats.find(s => s.playerId === ps.ownerPlayerId)?.tokenColorHex
                    : null
                  const bg = spot.isProperty
                    ? (STREET_COLORS[spot.streetType as StreetType] ?? '#888')
                    : (spot.streetType === 'CORNER' ? CORNER_BG : NEUTRAL_BG)
                  const isEditing = editingPropId === spot.id
                  return (
                    <div
                      key={spot.id}
                      className={`${styles.miniCell} ${spot.isProperty ? styles.miniCellProp : ''} ${isEditing ? styles.miniCellActive : ''}`}
                      style={{
                        gridRow: row,
                        gridColumn: col,
                        background: bg,
                        opacity: spot.isProperty ? 1 : 0.45,
                        outline: isEditing ? '2px solid #fff' : undefined,
                        outlineOffset: '-2px',
                      }}
                      title={`${spot.name}${ownerColor ? ` — ${getOwnerName(ps?.ownerPlayerId)}` : ''}`}
                      onClick={e => {
                        if (!spot.isProperty) return
                        if (isEditing) {
                          setEditingPropId(null)
                          setEditingCellRect(null)
                        } else {
                          setEditingPropId(spot.id)
                          setEditingCellRect((e.currentTarget as HTMLElement).getBoundingClientRect())
                        }
                      }}
                    >
                      {ownerColor && (
                        <div className={styles.miniOwnerRing} style={{ borderColor: ownerColor }} />
                      )}
                      {ps?.mortgaged && <div className={styles.miniMTag}>M</div>}
                      {!!ps?.hotelCount && <div className={styles.miniBuilding}>H</div>}
                      {!ps?.hotelCount && !!ps?.houseCount && (
                        <div className={styles.miniBuilding}>{ps.houseCount}</div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Property editor — rendered as a fixed portal so panel overflow won't clip it */}
              {editSpot && editingCellRect && createPortal(
                <>
                <div className={styles.propEditorBackdrop} onClick={() => { setEditingPropId(null); setEditingCellRect(null) }} />
                <div className={styles.propEditorPopup} style={calcPopupStyle(editingCellRect)}>
                  <div className={styles.propEditorTitle}>
                    <span
                      className={styles.propEditorDot}
                      style={{ background: STREET_COLORS[editSpot.streetType as StreetType] ?? '#888' }}
                    />
                    <strong>{editSpot.name}</strong>
                    <button className={styles.propEditorClose} onClick={() => { setEditingPropId(null); setEditingCellRect(null) }}>✕</button>
                  </div>
                  <select
                    className={styles.propSelect}
                    value={editPs?.ownerPlayerId ?? ''}
                    onChange={e => patchProperty(editSpot.id, { ownerPlayerId: e.target.value })}
                  >
                    <option value="">— ei omistajaa —</option>
                    {snap.players.map(p => (
                      <option key={p.playerId} value={p.playerId}>{p.name}</option>
                    ))}
                  </select>
                  {isStreet && (
                    <div className={styles.houseRow}>
                      {[0,1,2,3,4].map(n => (
                        <button
                          key={n}
                          className={`${styles.houseBtn} ${editPs?.houseCount === n && !editPs?.hotelCount ? styles.houseBtnActive : ''}`}
                          onClick={() => patchProperty(editSpot.id, { houseCount: n, hotelCount: 0 })}
                        >
                          {n === 0 ? '∅' : `${n}🏠`}
                        </button>
                      ))}
                      <button
                        className={`${styles.houseBtn} ${editPs?.hotelCount ? styles.houseBtnActive : ''}`}
                        onClick={() => patchProperty(editSpot.id, { houseCount: 0, hotelCount: editPs?.hotelCount ? 0 : 1 })}
                      >
                        🏨
                      </button>
                    </div>
                  )}
                  <label className={styles.propMortgageLabel}>
                    <input
                      type="checkbox"
                      checked={editPs?.mortgaged ?? false}
                      onChange={e => patchProperty(editSpot.id, { mortgaged: e.target.checked })}
                    />
                    pantattu
                  </label>
                </div>
                </>,
                document.body
              )}
            </>
          )
        })()}
      </section>

      </div>{/* end scrollBody */}
      {msg && <div className={styles.msgBar}>{msg}</div>}
      <div
        className={styles.resizeHandle}
        onMouseDown={e => { resizeRef.current = { mx: e.clientX, my: e.clientY, sw: size.w, sh: size.h }; e.preventDefault(); e.stopPropagation() }}
      />
    </div>
  )
}
