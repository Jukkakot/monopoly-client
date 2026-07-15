import { describe, it, expect } from 'vitest'
import { applyDrop, type Row, type Cell } from './DesktopPanels'

const cell = (tabs: string[], active = tabs[0]): Cell => ({ tabs, active, collapsed: false, width: 200 })
const row = (...cells: Cell[]): Row => ({ cells, height: 200 })

describe('applyDrop — 2-D desktop panel drag/drop', () => {
  it('reorders a tab within its own cell', () => {
    const next = applyDrop([row(cell(['players', 'actions', 'log']))], 'log', { row: 0, cell: 0, zone: 'tab', index: 0 })
    expect(next[0].cells[0].tabs).toEqual(['log', 'players', 'actions'])
  })

  it('reorders a tab to the end of its cell (same-cell index shift handled)', () => {
    const next = applyDrop([row(cell(['players', 'actions', 'log']))], 'players', { row: 0, cell: 0, zone: 'tab', index: 3 })
    expect(next[0].cells[0].tabs).toEqual(['actions', 'log', 'players'])
  })

  it('merges a tab into another cell as a new active tab', () => {
    const next = applyDrop([row(cell(['players']), cell(['actions']))], 'actions', { row: 0, cell: 0, zone: 'tab', index: 1 })
    // actions joined the players cell; its now-empty cell is pruned → one cell left
    expect(next[0].cells).toHaveLength(1)
    expect(next[0].cells[0].tabs).toEqual(['players', 'actions'])
    expect(next[0].cells[0].active).toBe('actions')
  })

  it('splits a panel out into a new cell on the LEFT (side-by-side)', () => {
    const next = applyDrop([row(cell(['players'])), row(cell(['log', 'chat'], 'log'))], 'chat', { row: 0, cell: 0, zone: 'left' })
    expect(next[0].cells.map(c => c.tabs)).toEqual([['chat'], ['players']])
    // chat left the bottom row's cell, which still has log
    expect(next[1].cells[0].tabs).toEqual(['log'])
  })

  it('splits a panel out into a new cell on the RIGHT', () => {
    const next = applyDrop([row(cell(['players'])), row(cell(['log', 'chat'], 'log'))], 'chat', { row: 0, cell: 0, zone: 'right' })
    expect(next[0].cells.map(c => c.tabs)).toEqual([['players'], ['chat']])
  })

  it('opens a new row below when dropped on the bottom edge', () => {
    const next = applyDrop([row(cell(['players'])), row(cell(['actions']))], 'players', { row: 1, cell: 0, zone: 'bottom' })
    // players leaves row 0 (which is pruned) and forms a new row after the actions row
    expect(next.map(r => r.cells.map(c => c.tabs))).toEqual([[['actions']], [['players']]])
  })

  it('opens a new row above when dropped on the top edge', () => {
    const next = applyDrop([row(cell(['players'])), row(cell(['actions']))], 'actions', { row: 0, cell: 0, zone: 'top' })
    expect(next.map(r => r.cells.map(c => c.tabs))).toEqual([[['actions']], [['players']]])
  })

  it('never loses or duplicates a panel across any move', () => {
    const before = [row(cell(['players', 'chat'])), row(cell(['actions']), cell(['log']))]
    const next = applyDrop(before, 'chat', { row: 1, cell: 1, zone: 'right' })
    const all = next.flatMap(r => r.cells.flatMap(c => c.tabs)).sort()
    expect(all).toEqual(['actions', 'chat', 'log', 'players'])
  })

  it('fixes the active tab when the active tab is dragged out of a cell', () => {
    const next = applyDrop([row(cell(['players', 'actions', 'log'], 'actions'))], 'actions', { row: 0, cell: 0, zone: 'top' })
    const stayed = next.find(r => r.cells[0].tabs.includes('players'))!
    expect(stayed.cells[0].active).toBe('players')
  })
})
