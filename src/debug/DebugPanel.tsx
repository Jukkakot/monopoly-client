import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGame } from '../store/GameContext'
import type { SessionState } from '../types/api'
import type { DebugStateImport } from '../api/sessionApi'
import { importDebugState, fetchSnapshot, createBotsOnlySession } from '../api/sessionApi'
import styles from './DebugPanel.module.css'

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
  const [captureName, setCaptureName] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

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
    if (!state.snapshot || !captureName.trim()) return
    try {
      const res = await fetch('/__debug/save-scenario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: captureName.trim(), state: state.snapshot }),
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
          disabled={!captureName.trim() || !state.snapshot}
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

      {msg && <div className={styles.msgBar}>{msg}</div>}
    </div>
  )
}
