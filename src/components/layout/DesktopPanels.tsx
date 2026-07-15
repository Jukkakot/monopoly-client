import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode, type CSSProperties } from 'react'
import styles from './DesktopPanels.module.css'
import Icon, { type IconName } from '../common/Icon'

export interface PanelDef {
  id: string
  title: string
  icon: IconName
  node: ReactNode
}

/** A cell holds one or more panels as tabs; the active tab's body shows. */
export interface Cell { tabs: string[]; active: string; collapsed: boolean; width: number }
/** A row is a horizontal strip of side-by-side cells. Rows stack vertically. */
export interface Row { cells: Cell[]; height: number }

interface Props {
  panels: PanelDef[]
  badges?: Record<string, number>
  onVisibleChange?: (visible: Set<string>) => void
}

const LS_KEY = 'monopoly_desktop_layout_v3'
const LS_KEY_V2 = 'monopoly_desktop_layout_v2'
const MIN_H = 90, MAX_H = 800, DEFAULT_H = 240
const MIN_W = 120, MAX_W = 900, DEFAULT_W = 220

const cell = (tabs: string[], active = tabs[0]): Cell => ({ tabs, active, collapsed: false, width: DEFAULT_W })

/** Default arrangement — mirrors the classic sidebar: players, actions, then log+chat tabbed. */
function defaultLayout(ids: string[]): Row[] {
  const has = (id: string) => ids.includes(id)
  const rows: Row[] = []
  if (has('players')) rows.push({ cells: [cell(['players'])], height: 220 })
  if (has('actions')) rows.push({ cells: [cell(['actions'])], height: 300 })
  const bottom = ['log', 'chat'].filter(has)
  if (bottom.length) rows.push({ cells: [cell(bottom)], height: 260 })
  for (const id of ids) if (!rows.some(r => r.cells.some(c => c.tabs.includes(id)))) rows.push({ cells: [cell([id])], height: DEFAULT_H })
  return rows
}

/** Keeps only known, first-seen ids; drops empty cells/rows; appends any panel the layout is
 *  missing as its own row — so a stale saved layout can never hide or duplicate a panel. */
function repair(rows: Row[], ids: string[]): Row[] {
  const seen = new Set<string>()
  const out: Row[] = []
  for (const r of rows) {
    if (!r || !Array.isArray(r.cells)) continue
    const cells: Cell[] = []
    for (const c of r.cells) {
      if (!c || !Array.isArray(c.tabs)) continue
      const tabs = c.tabs.filter(id => ids.includes(id) && !seen.has(id))
      tabs.forEach(id => seen.add(id))
      if (!tabs.length) continue
      cells.push({
        tabs,
        active: tabs.includes(c.active) ? c.active : tabs[0],
        collapsed: !!c.collapsed,
        width: Math.max(MIN_W, Math.min(MAX_W, Number(c.width) || DEFAULT_W)),
      })
    }
    if (cells.length) out.push({ cells, height: Math.max(MIN_H, Math.min(MAX_H, Number(r.height) || DEFAULT_H)) })
  }
  for (const id of ids) if (!seen.has(id)) out.push({ cells: [cell([id])], height: DEFAULT_H })
  return out.length ? out : defaultLayout(ids)
}

function loadLayout(ids: string[]): Row[] {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) return repair(JSON.parse(raw), ids)
  } catch { /* ignore */ }
  // Migrate a v2 single-column layout (array of groups) → one row per group.
  try {
    const raw = localStorage.getItem(LS_KEY_V2)
    if (raw) {
      const groups = JSON.parse(raw) as Array<{ tabs: string[]; active: string; collapsed: boolean; height: number }>
      if (Array.isArray(groups)) {
        return repair(groups.map(g => ({ cells: [{ tabs: g.tabs, active: g.active, collapsed: g.collapsed, width: DEFAULT_W }], height: g.height })), ids)
      }
    }
  } catch { /* ignore */ }
  return defaultLayout(ids)
}

type Zone = 'tab' | 'left' | 'right' | 'top' | 'bottom'
/** Where the dragged panel would land — used both for the live preview overlay and the commit. */
type Hover = { row: number; cell: number; zone: Zone; index?: number } | null

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

/** Applies a hovered drop to the layout: reorder/merge as a tab, split a cell left/right, or open
 *  a new row above/below. Prunes emptied cells and rows, and fixes active tabs. Pure. */
export function applyDrop(rows: Row[], panelId: string, h: NonNullable<Hover>): Row[] {
  const next: Row[] = rows.map(r => ({ ...r, cells: r.cells.map(c => ({ ...c, tabs: [...c.tabs] })) }))
  let sr = -1, sc = -1, sp = -1
  next.forEach((r, ri) => r.cells.forEach((c, ci) => { const p = c.tabs.indexOf(panelId); if (p >= 0) { sr = ri; sc = ci; sp = p } }))
  if (sr >= 0) next[sr].cells[sc].tabs.splice(sp, 1)

  const newCell = (): Cell => ({ tabs: [panelId], active: panelId, collapsed: false, width: DEFAULT_W })
  if (h.zone === 'tab') {
    const c = next[h.row]?.cells[h.cell]
    if (c) {
      let idx = h.index ?? c.tabs.length
      if (sr === h.row && sc === h.cell && sp < idx) idx -= 1
      idx = clamp(idx, 0, c.tabs.length)
      c.tabs.splice(idx, 0, panelId)
      c.active = panelId
    }
  } else if (h.zone === 'left' || h.zone === 'right') {
    const r = next[h.row]
    if (r) r.cells.splice(h.zone === 'left' ? h.cell : h.cell + 1, 0, newCell())
  } else { // top / bottom → new full-width row
    next.splice(h.zone === 'top' ? h.row : h.row + 1, 0, { cells: [newCell()], height: DEFAULT_H })
  }

  for (const r of next) {
    r.cells = r.cells.filter(c => c.tabs.length > 0)
      .map(c => ({ ...c, active: c.tabs.includes(c.active) ? c.active : c.tabs[0] }))
  }
  return next.filter(r => r.cells.length > 0)
}

export default function DesktopPanels({ panels, badges = {}, onVisibleChange }: Props) {
  const ids = useMemo(() => panels.map(p => p.id), [panels])
  const [rows, setRows] = useState<Row[]>(() => loadLayout(ids))
  const [dragId, setDragId] = useState<string | null>(null)
  const [hover, setHoverState] = useState<Hover>(null)
  const hoverRef = useRef<Hover>(null)
  const setHover = (h: Hover) => { hoverRef.current = h; setHoverState(h) }
  const panelById = useMemo(() => new Map(panels.map(p => [p.id, p])), [panels])

  useEffect(() => { try { localStorage.setItem(LS_KEY, JSON.stringify(rows)) } catch { /* ignore */ } }, [rows])

  useEffect(() => {
    if (!onVisibleChange) return
    const visible = new Set<string>()
    for (const r of rows) for (const c of r.cells) if (!c.collapsed) visible.add(c.active)
    onVisibleChange(visible)
  }, [rows, onVisibleChange])

  // The last row with an expanded cell flexes to fill remaining height (no dead gap at the bottom).
  const fillRow = useMemo(() => {
    let idx = -1
    rows.forEach((r, i) => { if (r.cells.some(c => !c.collapsed)) idx = i })
    return idx
  }, [rows])

  const setActive = (ri: number, ci: number, id: string) =>
    setRows(rs => rs.map((r, i) => i !== ri ? r : { ...r, cells: r.cells.map((c, j) => j === ci ? { ...c, active: id, collapsed: false } : c) }))
  const toggleCollapse = (ri: number, ci: number) =>
    setRows(rs => rs.map((r, i) => i !== ri ? r : { ...r, cells: r.cells.map((c, j) => j === ci ? { ...c, collapsed: !c.collapsed } : c) }))

  const endDrag = () => { setDragId(null); setHover(null) }
  const commitDrop = () => {
    const h = hoverRef.current
    setRows(rs => (dragId && h ? applyDrop(rs, dragId, h) : rs))
    endDrag()
  }

  // ── Resize (rows vertically, cells horizontally) ─────────────────────────────
  const resizeRef = useRef<{ axis: 'row' | 'col'; ri: number; ci: number; start: number; startSize: number } | null>(null)
  useEffect(() => {
    function onMove(e: MouseEvent) {
      const r = resizeRef.current
      if (!r) return
      if (r.axis === 'row') {
        const h = clamp(r.startSize + (e.clientY - r.start), MIN_H, MAX_H)
        setRows(rs => rs.map((row, i) => i === r.ri ? { ...row, height: h } : row))
      } else {
        const w = clamp(r.startSize + (e.clientX - r.start), MIN_W, MAX_W)
        setRows(rs => rs.map((row, i) => i !== r.ri ? row : { ...row, cells: row.cells.map((c, j) => j === r.ci ? { ...c, width: w } : c) }))
      }
    }
    function onUp() {
      if (!resizeRef.current) return
      resizeRef.current = null
      document.body.style.cursor = ''; document.body.style.userSelect = ''
    }
    window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [])
  const startRowResize = (ri: number, e: React.MouseEvent) => {
    resizeRef.current = { axis: 'row', ri, ci: 0, start: e.clientY, startSize: rows[ri].height }
    document.body.style.cursor = 'row-resize'; document.body.style.userSelect = 'none'
  }
  const startColResize = (ri: number, ci: number, e: React.MouseEvent) => {
    resizeRef.current = { axis: 'col', ri, ci, start: e.clientX, startSize: rows[ri].cells[ci].width }
    document.body.style.cursor = 'col-resize'; document.body.style.userSelect = 'none'
  }
  const resetRowHeight = (ri: number) => setRows(rs => rs.map((r, i) => i === ri ? { ...r, height: DEFAULT_H } : r))
  const resetColWidth = (ri: number, ci: number) =>
    setRows(rs => rs.map((r, i) => i !== ri ? r : { ...r, cells: r.cells.map((c, j) => j === ci ? { ...c, width: DEFAULT_W } : c) }))

  const overlayStyle = (zone: Zone): CSSProperties => {
    switch (zone) {
      case 'left': return { left: 0, top: 0, bottom: 0, width: '50%' }
      case 'right': return { right: 0, top: 0, bottom: 0, width: '50%' }
      case 'top': return { left: 0, right: 0, top: 0, height: '50%' }
      case 'bottom': return { left: 0, right: 0, bottom: 0, height: '50%' }
      default: return { inset: 0 }
    }
  }

  return (
    <div className={styles.root}>
      {rows.map((row, ri) => {
        const thin = row.cells.every(c => c.collapsed)
        const isFill = ri === fillRow && !thin
        const rowStyle: CSSProperties = thin ? { flex: '0 0 auto' } : isFill ? { flex: '1 1 0', minHeight: MIN_H } : { height: row.height, flexShrink: 0 }
        return (
          <Fragment key={ri}>
          <div className={styles.row} style={rowStyle}>
            {row.cells.map((c, ci) => {
              const cellFill = ci === row.cells.length - 1
              const cellStyle: CSSProperties = cellFill ? { flex: '1 1 0', minWidth: MIN_W } : { width: c.width, flexShrink: 0 }
              const showOverlay = hover && hover.row === ri && hover.cell === ci
              return (
                <Fragment key={ci}>
                <div className={styles.cell} style={cellStyle}>
                  <div
                    className={styles.tabStrip}
                    onDragOver={e => { if (dragId) { e.preventDefault(); setHover({ row: ri, cell: ci, zone: 'tab', index: c.tabs.length }) } }}
                    onDrop={e => { e.preventDefault(); commitDrop() }}
                  >
                    {c.tabs.map((id, ti) => {
                      const p = panelById.get(id)
                      if (!p) return null
                      const isActive = id === c.active && !c.collapsed
                      const badge = badges[id] ?? 0
                      const barHere = hover?.row === ri && hover.cell === ci && hover.zone === 'tab' && hover.index === ti
                      return (
                        <Fragment key={id}>
                          {barHere && <span className={styles.insertBar} aria-hidden="true" />}
                          <button
                            type="button" draggable
                            className={`${styles.tab} ${isActive ? styles.tabActive : ''} ${dragId === id ? styles.tabDragging : ''}`}
                            onClick={() => setActive(ri, ci, id)}
                            onDragStart={e => { setDragId(id); e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', id) } catch { /* ignore */ } }}
                            onDragEnd={endDrag}
                            onDragOver={e => {
                              if (!dragId) return
                              e.preventDefault(); e.stopPropagation()
                              const r = e.currentTarget.getBoundingClientRect()
                              setHover({ row: ri, cell: ci, zone: 'tab', index: e.clientX < r.left + r.width / 2 ? ti : ti + 1 })
                            }}
                            onDrop={e => { e.preventDefault(); e.stopPropagation(); commitDrop() }}
                            title={p.title}
                          >
                            <Icon name={p.icon} size={13} />
                            <span className={styles.tabLabel}>{p.title}</span>
                            {badge > 0 && !isActive && <span className={styles.tabBadge}>{badge > 9 ? '9+' : badge}</span>}
                          </button>
                        </Fragment>
                      )
                    })}
                    {hover?.row === ri && hover.cell === ci && hover.zone === 'tab' && hover.index === c.tabs.length && <span className={styles.insertBar} aria-hidden="true" />}
                    <button type="button" className={styles.collapseBtn} onClick={() => toggleCollapse(ri, ci)} aria-label={c.collapsed ? 'Expand' : 'Collapse'}>{c.collapsed ? '▸' : '▾'}</button>
                  </div>

                  {!c.collapsed && (
                    // Body doubles as the drop surface: the cursor's zone (edges vs centre) decides
                    // whether the panel splits left/right, opens a new row, or joins as a tab.
                    <div
                      className={styles.body}
                      onDragOver={e => {
                        if (!dragId) return
                        e.preventDefault()
                        const r = e.currentTarget.getBoundingClientRect()
                        const fx = (e.clientX - r.left) / r.width, fy = (e.clientY - r.top) / r.height
                        const zone: Zone = fx < 0.22 ? 'left' : fx > 0.78 ? 'right' : fy < 0.25 ? 'top' : fy > 0.75 ? 'bottom' : 'tab'
                        setHover(zone === 'tab' ? { row: ri, cell: ci, zone: 'tab', index: c.tabs.length } : { row: ri, cell: ci, zone })
                      }}
                      onDrop={e => { e.preventDefault(); commitDrop() }}
                    >
                      {c.tabs.map(id => (
                        <div key={id} className={styles.tabPane} style={{ display: id === c.active ? 'flex' : 'none' }}>
                          {panelById.get(id)?.node}
                        </div>
                      ))}
                      {showOverlay && <div className={styles.dropOverlay} style={overlayStyle(hover.zone)} aria-hidden="true" />}
                    </div>
                  )}
                </div>
                {!cellFill && <div className={styles.colResize} onMouseDown={e => startColResize(ri, ci, e)} onDoubleClick={() => resetColWidth(ri, ci)} />}
                </Fragment>
              )
            })}
          </div>
          {ri !== fillRow && !thin && <div className={styles.rowResize} onMouseDown={e => startRowResize(ri, e)} onDoubleClick={() => resetRowHeight(ri)} />}
          </Fragment>
        )
      })}
    </div>
  )
}
