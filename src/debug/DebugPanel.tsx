import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGame } from '../store/GameContext'
import type { SessionState } from '../types/api'
import type { DebugStateImport } from '../api/sessionApi'
import { importDebugState, fetchSnapshot, createBotsOnlySession, retriggerBot } from '../api/sessionApi'
import { getCardText } from '../i18n/cards'
import styles from './DebugPanel.module.css'

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
  // Always-current ref so the lastDice effect never has stale closures
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
      importDebugState(sessionId, { nextDice: [d1, d2] }).catch(() => {})
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
      await importDebugState(sessionId, patch)
    } catch { /* silent — fire and forget */ }
  }

  void getCardText  // imported for potential future use

  if (!open) {
    return (
      <button className={styles.fab} onClick={() => setOpen(true)} title="Debug panel">🐛</button>
    )
  }

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.headerTitle}>🐛 DEBUG</span>
        <button className={styles.closeBtn} onClick={() => setOpen(false)}>✕</button>
      </div>

      {/* Scenario selector */}
      <section className={styles.section}>
        <div className={styles.sectionTitle}>SKENAARIOT</div>
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
        >
          ▶ Lataa peliin
        </button>
        <button
          className={styles.btn}
          onClick={handleNewGameFromScenario}
          disabled={!selected || busy}
          title="Luo uusi botti-sessio ja importoi skenaario siihen"
        >
          ⊕ Uusi peli skenaarista
        </button>
      </section>

      {/* Capture */}
      <section className={styles.section}>
        <div className={styles.sectionTitle}>CAPTURE</div>
        <input
          className={styles.input}
          placeholder="nimi (esim. velka-tilanne)"
          value={captureName}
          onChange={e => setCaptureName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleCapture()}
          maxLength={60}
        />
        <button
          className={styles.btn}
          onClick={handleCapture}
          disabled={!state.snapshot}
        >
          📸 Tallenna skenaarioksi
        </button>
      </section>

      {/* Offline injection */}
      <section className={styles.section}>
        <div className={styles.sectionTitle}>SNAPSHOT-INJEKTIO (offline)</div>
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
      </section>

      {/* Force next roll / card */}
      <section className={styles.section}>
        <div className={styles.sectionTitle}>PAKOTA SEURAAVA</div>

        {/* Dice */}
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
            <input type="checkbox" checked={persistDice}
              onChange={e => setPersistDice(e.target.checked)} />
            🔁
          </label>
          {diceActive && (
            <button className={styles.diceReset} title="Peruuta pakko"
              onClick={() => { setDiceActive(false); setDiceD1(null); setDiceD2(null) }}>
              ✕
            </button>
          )}
        </div>
        {diceActive && <div className={styles.diceHint}>⚡ heitetään{persistDice ? ' (pysyvä)' : ' kerran'}</div>}

        {/* Chance card */}
        <div className={styles.cardRow}>
          <span className={styles.diceLabel}>🃏 Sattuma</span>
          <select className={`${styles.select} ${forceChance ? styles.cardActive : ''}`}
            value={forceChance}
            onChange={e => {
              setForceChance(e.target.value)
              if (e.target.value) sendOverride({ nextChanceCard: e.target.value })
            }}>
            <option value="">— ei pakotusta —</option>
            {CHANCE_CARDS.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
          </select>
        </div>

        {/* Community card */}
        <div className={styles.cardRow}>
          <span className={styles.diceLabel}>🃏 Yhteiskassa</span>
          <select className={`${styles.select} ${forceCommunity ? styles.cardActive : ''}`}
            value={forceCommunity}
            onChange={e => {
              setForceCommunity(e.target.value)
              if (e.target.value) sendOverride({ nextCommunityCard: e.target.value })
            }}>
            <option value="">— ei pakotusta —</option>
            {COMMUNITY_CARDS.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
          </select>
        </div>
      </section>

      {msg && <div className={styles.msgBar}>{msg}</div>}
    </div>
  )
}
