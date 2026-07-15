import { describe, it, expect } from 'vitest'
import { applyDrop, type Group } from './DesktopPanels'

const g = (tabs: string[], active = tabs[0]): Group => ({ tabs, active, collapsed: false, height: 200 })

describe('applyDrop — desktop panel drag/drop', () => {
  it('merges a panel into another group at a tab position', () => {
    const next = applyDrop([g(['players']), g(['actions'])], 'actions', { type: 'tab', group: 0, index: 1 })
    expect(next).toHaveLength(1)
    expect(next[0].tabs).toEqual(['players', 'actions'])
    expect(next[0].active).toBe('actions')
  })

  it('reorders a tab to the front of its own group', () => {
    const next = applyDrop([g(['players', 'actions', 'log'])], 'log', { type: 'tab', group: 0, index: 0 })
    expect(next[0].tabs).toEqual(['log', 'players', 'actions'])
  })

  it('reorders a tab to the end of its own group (same-group index shift handled)', () => {
    const next = applyDrop([g(['players', 'actions', 'log'])], 'players', { type: 'tab', group: 0, index: 3 })
    expect(next[0].tabs).toEqual(['actions', 'log', 'players'])
  })

  it('splits a tab out into a new group at a gap, leaving the rest behind', () => {
    const next = applyDrop([g(['players', 'actions'], 'players')], 'actions', { type: 'gap', index: 0 })
    expect(next).toHaveLength(2)
    expect(next[0].tabs).toEqual(['actions'])
    expect(next[1].tabs).toEqual(['players'])
  })

  it('removes the source group when its last tab is dragged away', () => {
    const next = applyDrop([g(['players']), g(['actions'])], 'players', { type: 'tab', group: 1, index: 1 })
    expect(next).toHaveLength(1)
    expect(next[0].tabs).toEqual(['actions', 'players'])
  })

  it('reorders a single-tab group below another via a trailing gap', () => {
    const next = applyDrop([g(['players']), g(['actions'])], 'players', { type: 'gap', index: 2 })
    expect(next.map(x => x.tabs)).toEqual([['actions'], ['players']])
  })

  it('fixes the active tab when the previously-active tab leaves the group', () => {
    const next = applyDrop([g(['players', 'actions', 'log'], 'actions')], 'actions', { type: 'gap', index: 0 })
    const stayed = next.find(x => x.tabs.includes('players'))!
    expect(stayed.tabs).toEqual(['players', 'log'])
    expect(stayed.active).toBe('players') // active moved away → falls back to first remaining
  })

  it('never loses or duplicates a panel across a move', () => {
    const before: Group[] = [g(['players', 'chat']), g(['actions']), g(['log'])]
    const next = applyDrop(before, 'chat', { type: 'tab', group: 2, index: 1 })
    const all = next.flatMap(x => x.tabs).sort()
    expect(all).toEqual(['actions', 'chat', 'log', 'players'])
  })
})
