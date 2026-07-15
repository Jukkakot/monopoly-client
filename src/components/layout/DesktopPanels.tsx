import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
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

type DropTarget = { type: 'group'; index: number } | { type: 'gap'; index: number } | null

/** Removes a panel from wherever it lives, drops it into the target (an existing group as a new
 *  tab, or a fresh group at a gap), then prunes empty groups and fixes active tabs. Pure. */
export function applyDrop(groups: Group[], panelId: string, target: Exclude<DropTarget, null>): Group[] {
  const next: Group[] = groups.map(g => ({ ...g, tabs: g.tabs.filter(id => id !== panelId) }))
  if (target.type === 'group') {
    const g = next[target.index]
    if (g) { g.tabs.push(panelId); g.active = panelId }
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

  const setActive = (gi: number, id: string) =>
    setGroups(gs => gs.map((g, i) => i === gi ? { ...g, active: id, collapsed: false } : g))

  const toggleCollapse = (gi: number) =>
    setGroups(gs => gs.map((g, i) => i === gi ? { ...g, collapsed: !g.collapsed } : g))

  const onDrop = useCallback((target: Exclude<DropTarget, null>) => {
    setGroups(gs => (dragId ? applyDrop(gs, dragId, target) : gs))
    setDragId(null)
    setDropTarget(null)
  }, [dragId])

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

  const gapZone = (index: number) => (
    <div
      className={`${styles.gap} ${dragId ? styles.gapActive : ''} ${dropTarget?.type === 'gap' && dropTarget.index === index ? styles.gapOver : ''}`}
      onDragOver={e => { if (dragId) { e.preventDefault(); setDropTarget({ type: 'gap', index }) } }}
      onDrop={e => { e.preventDefault(); onDrop({ type: 'gap', index }) }}
    />
  )

  return (
    <div className={styles.root}>
      {gapZone(0)}
      {groups.map((g, gi) => {
        const mergeOver = dropTarget?.type === 'group' && dropTarget.index === gi
        return (
          <Fragment key={gi}>
          <div className={styles.group} style={g.collapsed ? undefined : { height: g.height }}>
            <div
              className={`${styles.tabStrip} ${mergeOver ? styles.tabStripOver : ''}`}
              onDragOver={e => { if (dragId) { e.preventDefault(); setDropTarget({ type: 'group', index: gi }) } }}
              onDrop={e => { e.preventDefault(); onDrop({ type: 'group', index: gi }) }}
            >
              {g.tabs.map(id => {
                const p = panelById.get(id)
                if (!p) return null
                const isActive = id === g.active && !g.collapsed
                const badge = badges[id] ?? 0
                return (
                  <button
                    key={id}
                    type="button"
                    draggable
                    className={`${styles.tab} ${isActive ? styles.tabActive : ''} ${dragId === id ? styles.tabDragging : ''}`}
                    onClick={() => setActive(gi, id)}
                    onDragStart={e => { setDragId(id); e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', id) } catch { /* ignore */ } }}
                    onDragEnd={() => { setDragId(null); setDropTarget(null) }}
                    title={p.title}
                  >
                    <Icon name={p.icon} size={13} />
                    <span className={styles.tabLabel}>{p.title}</span>
                    {badge > 0 && !isActive && <span className={styles.tabBadge}>{badge > 9 ? '9+' : badge}</span>}
                  </button>
                )
              })}
              <button
                type="button"
                className={styles.collapseBtn}
                onClick={() => toggleCollapse(gi)}
                aria-label={g.collapsed ? '▸' : '▾'}
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

            {!g.collapsed && <div className={styles.resizeHandle} onMouseDown={e => startResize(gi, e)} />}
          </div>
          {gapZone(gi + 1)}
          </Fragment>
        )
      })}
      <div className={styles.spacer} aria-hidden="true" />
    </div>
  )
}
