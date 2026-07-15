import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import styles from './DesktopPanels.module.css'
import Icon, { type IconName } from '../common/Icon'

export interface PanelDef {
  id: string
  title: string
  icon: IconName
  node: ReactNode
}

/** One stacked box in the sidebar. Holds one or more panels as tabs; the active tab's body shows. */
export interface Group {
  tabs: string[]
  active: string
  collapsed: boolean
  height: number
}

interface Props {
  panels: PanelDef[]
  /** Unread counts shown as a badge on a tab that isn't currently the visible one. */
  badges?: Record<string, number>
  /** Fired with the set of panels currently on screen (active tab of each non-collapsed group). */
  onVisibleChange?: (visible: Set<string>) => void
}

const LS_KEY = 'monopoly_desktop_layout_v2'
const MIN_H = 90
const MAX_H = 800
const DEFAULT_H = 240

/** Default arrangement — mirrors the classic sidebar: players, actions, then log+chat tabbed. */
function defaultLayout(ids: string[]): Group[] {
  const has = (id: string) => ids.includes(id)
  const groups: Group[] = []
  if (has('players')) groups.push({ tabs: ['players'], active: 'players', collapsed: false, height: 220 })
  if (has('actions')) groups.push({ tabs: ['actions'], active: 'actions', collapsed: false, height: 300 })
  const bottom = ['log', 'chat'].filter(has)
  if (bottom.length) groups.push({ tabs: bottom, active: bottom[0], collapsed: false, height: 260 })
  // Anything unexpected gets its own group so no panel is ever lost.
  for (const id of ids) if (!groups.some(g => g.tabs.includes(id))) groups.push({ tabs: [id], active: id, collapsed: false, height: DEFAULT_H })
  return groups
}

/** Loads a saved layout, repairing it against the current panel set (drops unknown ids, appends
 *  any panel that's missing) so a stale localStorage entry can never hide or duplicate a panel. */
function loadLayout(ids: string[]): Group[] {
  let saved: Group[] | null = null
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) saved = JSON.parse(raw)
  } catch { /* ignore */ }
  if (!Array.isArray(saved) || saved.length === 0) return defaultLayout(ids)

  const seen = new Set<string>()
  const groups: Group[] = []
  for (const g of saved) {
    if (!g || !Array.isArray(g.tabs)) continue
    const tabs = g.tabs.filter(id => ids.includes(id) && !seen.has(id))
    tabs.forEach(id => seen.add(id))
    if (tabs.length === 0) continue
    groups.push({
      tabs,
      active: tabs.includes(g.active) ? g.active : tabs[0],
      collapsed: !!g.collapsed,
      height: Math.max(MIN_H, Math.min(MAX_H, Number(g.height) || DEFAULT_H)),
    })
  }
  // Append any panel the saved layout didn't cover (e.g. a newly added panel).
  for (const id of ids) if (!seen.has(id)) groups.push({ tabs: [id], active: id, collapsed: false, height: DEFAULT_H })
  return groups.length ? groups : defaultLayout(ids)
}

type DropTarget =
  | { type: 'tab'; group: number; index: number }  // insert into an existing group at a tab position
  | { type: 'gap'; index: number }                 // split off into a new group at a gap
  | null

/** Moves a panel to the drop target — a tab position in an existing group (covering both reorder
 *  within a group and merge into another) or a fresh group at a gap — then prunes empty groups and
 *  fixes active tabs. Pure. */
export function applyDrop(groups: Group[], panelId: string, target: Exclude<DropTarget, null>): Group[] {
  let sg = -1, sp = -1
  groups.forEach((g, gi) => { const p = g.tabs.indexOf(panelId); if (p >= 0) { sg = gi; sp = p } })
  const next: Group[] = groups.map(g => ({ ...g, tabs: [...g.tabs] }))
  if (sg >= 0) next[sg].tabs.splice(sp, 1)

  if (target.type === 'tab') {
    const g = next[target.group]
    if (g) {
      // Removing an earlier tab in the same group shifts the intended insert position left by one.
      let idx = target.index
      if (sg === target.group && sp < idx) idx -= 1
      idx = Math.max(0, Math.min(g.tabs.length, idx))
      g.tabs.splice(idx, 0, panelId)
      g.active = panelId
    }
  } else {
    next.splice(target.index, 0, { tabs: [panelId], active: panelId, collapsed: false, height: DEFAULT_H })
  }
  return next
    .filter(g => g.tabs.length > 0)
    .map(g => ({ ...g, active: g.tabs.includes(g.active) ? g.active : g.tabs[0] }))
}

export default function DesktopPanels({ panels, badges = {}, onVisibleChange }: Props) {
  const ids = useMemo(() => panels.map(p => p.id), [panels])
  const [groups, setGroups] = useState<Group[]>(() => loadLayout(ids))
  const [dragId, setDragId] = useState<string | null>(null)
  const [dropTarget, setDropTarget] = useState<DropTarget>(null)
  // Mirror the drop target in a ref so the drop handler commits exactly where the last dragover
  // pointed — the drop event bubbles up through several zones, so we can't rely on which fired it.
  const dropRef = useRef<DropTarget>(null)
  const setDrop = (t: DropTarget) => { dropRef.current = t; setDropTarget(t) }
  const panelById = useMemo(() => new Map(panels.map(p => [p.id, p])), [panels])

  // Persist on every layout change.
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(groups)) } catch { /* ignore */ }
  }, [groups])

  // Report which panels are on screen (active tab of a non-collapsed group).
  useEffect(() => {
    if (!onVisibleChange) return
    const visible = new Set<string>()
    for (const g of groups) if (!g.collapsed) visible.add(g.active)
    onVisibleChange(visible)
  }, [groups, onVisibleChange])

  // The last expanded group flexes to fill the sidebar's remaining height, so there is never
  // a dead gap at the bottom — every group above it keeps its own resizable height.
  const fillIndex = useMemo(() => {
    let idx = -1
    groups.forEach((g, i) => { if (!g.collapsed) idx = i })
    return idx
  }, [groups])

  const setActive = (gi: number, id: string) =>
    setGroups(gs => gs.map((g, i) => i === gi ? { ...g, active: id, collapsed: false } : g))

  const toggleCollapse = (gi: number) =>
    setGroups(gs => gs.map((g, i) => i === gi ? { ...g, collapsed: !g.collapsed } : g))

  const endDrag = () => { setDragId(null); setDrop(null) }
  // Commit to wherever the cursor last hovered (dropRef), not to whichever zone caught the event.
  const commitDrop = () => {
    const target = dropRef.current
    setGroups(gs => (dragId && target ? applyDrop(gs, dragId, target) : gs))
    endDrag()
  }

  // ── Group resize (mouse drag on the handle below a group) ────────────────────
  const resizeRef = useRef<{ gi: number; startY: number; startH: number } | null>(null)
  useEffect(() => {
    function onMove(e: MouseEvent) {
      const r = resizeRef.current
      if (!r) return
      const h = Math.max(MIN_H, Math.min(MAX_H, r.startH + (e.clientY - r.startY)))
      setGroups(gs => gs.map((g, i) => i === r.gi ? { ...g, height: h } : g))
    }
    function onUp() {
      if (!resizeRef.current) return
      resizeRef.current = null
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [])

  const startResize = (gi: number, e: React.MouseEvent) => {
    resizeRef.current = { gi, startY: e.clientY, startH: groups[gi].height }
    document.body.style.cursor = 'row-resize'
    document.body.style.userSelect = 'none'
  }
  const resetHeight = (gi: number) =>
    setGroups(gs => gs.map((g, i) => i === gi ? { ...g, height: DEFAULT_H } : g))

  const gapZone = (index: number) => (
    <div
      className={`${styles.gap} ${dragId ? styles.gapActive : ''} ${dropTarget?.type === 'gap' && dropTarget.index === index ? styles.gapOver : ''}`}
      onDragOver={e => { if (dragId) { e.preventDefault(); setDrop({ type: 'gap', index }) } }}
      onDrop={e => { e.preventDefault(); commitDrop() }}
    />
  )

  const insertBar = (gi: number, idx: number) =>
    dropTarget?.type === 'tab' && dropTarget.group === gi && dropTarget.index === idx
      ? <span className={styles.insertBar} aria-hidden="true" /> : null

  return (
    <div className={styles.root}>
      {gapZone(0)}
      {groups.map((g, gi) => {
        const isFill = gi === fillIndex
        const style: React.CSSProperties = g.collapsed
          ? { flex: '0 0 auto' }
          : isFill
            ? { flex: '1 1 0', minHeight: MIN_H }
            : { height: g.height, flexShrink: 0, minHeight: 0 }
        return (
          <Fragment key={gi}>
          <div className={styles.group} style={style}>
            <div
              className={styles.tabStrip}
              // Dropping over the empty part of the strip appends to the end of this group.
              onDragOver={e => { if (dragId) { e.preventDefault(); setDrop({ type: 'tab', group: gi, index: g.tabs.length }) } }}
              onDrop={e => { e.preventDefault(); commitDrop() }}
            >
              {g.tabs.map((id, ti) => {
                const p = panelById.get(id)
                if (!p) return null
                const isActive = id === g.active && !g.collapsed
                const badge = badges[id] ?? 0
                return (
                  <Fragment key={id}>
                    {insertBar(gi, ti)}
                    <button
                      type="button"
                      draggable
                      className={`${styles.tab} ${isActive ? styles.tabActive : ''} ${dragId === id ? styles.tabDragging : ''}`}
                      onClick={() => setActive(gi, id)}
                      onDragStart={e => { setDragId(id); e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', id) } catch { /* ignore */ } }}
                      onDragEnd={endDrag}
                      // Insert before or after this tab depending on which half the cursor is over.
                      onDragOver={e => {
                        if (!dragId) return
                        e.preventDefault(); e.stopPropagation()
                        const r = e.currentTarget.getBoundingClientRect()
                        const before = e.clientX < r.left + r.width / 2
                        setDrop({ type: 'tab', group: gi, index: before ? ti : ti + 1 })
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
              {insertBar(gi, g.tabs.length)}
              <button
                type="button"
                className={styles.collapseBtn}
                onClick={() => toggleCollapse(gi)}
                title={g.collapsed ? '' : ''}
                aria-label={g.collapsed ? 'Expand' : 'Collapse'}
              >{g.collapsed ? '▸' : '▾'}</button>
            </div>

            {!g.collapsed && (
              <div className={styles.body}>
                {g.tabs.map(id => (
                  // Keep every tab mounted (hidden when inactive) so panel state/scroll survives switching.
                  <div key={id} className={styles.tabPane} style={{ display: id === g.active ? 'flex' : 'none' }}>
                    {panelById.get(id)?.node}
                  </div>
                ))}
              </div>
            )}

            {/* Resize handle — only on fixed-height groups (the fill group is sized by the others).
                Double-click resets the height. */}
            {!g.collapsed && !isFill && (
              <div
                className={styles.resizeHandle}
                onMouseDown={e => startResize(gi, e)}
                onDoubleClick={() => resetHeight(gi)}
                title=""
              />
            )}
          </div>
          {gapZone(gi + 1)}
          </Fragment>
        )
      })}
    </div>
  )
}
