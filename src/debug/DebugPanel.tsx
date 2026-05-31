import { useState } from 'react'
import { useGame } from '../store/GameContext'
import type { SessionState } from '../types/api'
import styles from './DebugPanel.module.css'

// Resolved at dev-server startup; page refresh picks up newly captured files.
const scenarioModules = import.meta.glob('./scenarios/*.json', { eager: true }) as Record<string, { default: SessionState }>

function scenarioNames(): string[] {
  return Object.keys(scenarioModules).map(k => k.replace('./scenarios/', '').replace('.json', ''))
}

interface Props {
  sessionId: string
}

export default function DebugPanel({ sessionId }: Props) {
  const { state, freezeSSE, unfreezeSSE, injectDebugSnapshot } = useGame()
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState('')
  const [captureName, setCaptureName] = useState('')
  const [captureMsg, setCaptureMsg] = useState('')

  const scenarios = scenarioNames()

  function showMsg(msg: string) {
    setCaptureMsg(msg)
    setTimeout(() => setCaptureMsg(''), 3000)
  }

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

  function handleInject() {
    if (!selected) return
    const mod = scenarioModules[`./scenarios/${selected}.json`]
    if (!mod) return
    const scenario = mod.default as SessionState
    const injected: SessionState = {
      ...scenario,
      sessionId: state.snapshot?.sessionId ?? scenario.sessionId,
      seats: state.snapshot?.seats ?? scenario.seats,
    }
    injectDebugSnapshot(injected)
  }

  void sessionId  // available for future use (e.g. load-into-game)

  if (!open) {
    return (
      <button className={styles.fab} onClick={() => setOpen(true)} title="Debug panel">
        🐛
      </button>
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
            <select
              className={styles.select}
              value={selected}
              onChange={e => setSelected(e.target.value)}
            >
              <option value="">— valitse —</option>
              {scenarios.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          )
        }
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
        {captureMsg && <div className={styles.captureMsg}>{captureMsg}</div>}
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
        <button
          className={styles.btn}
          onClick={handleInject}
          disabled={!selected}
        >
          ▶ Injektoi valittu skenaario
        </button>
      </section>
    </div>
  )
}
