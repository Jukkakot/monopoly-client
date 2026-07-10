import { describe, it, expect } from 'vitest'
import { fitBoardHeight } from './mobileFit'

const MIN = 150
const MAX = 560

describe('fitBoardHeight', () => {
  it('shrinks the board when the actions overflow the available space', () => {
    // content 300 needs 300, only 220 available → overflow 80 → board shrinks by 80
    expect(fitBoardHeight(400, 300, 220, MIN, MAX)).toBe(320)
  })

  it('grows the board to reclaim slack when the actions are short', () => {
    // content 120, 220 available → 100px slack → board grows by 100
    expect(fitBoardHeight(300, 120, 220, MIN, MAX)).toBe(400)
  })

  it('leaves the board unchanged when actions already hug the space', () => {
    expect(fitBoardHeight(350, 200, 200, MIN, MAX)).toBe(350)
  })

  it('never grows past the hard maximum (some slack remains as watermark)', () => {
    // huge slack would want a 900px board → clamped to MAX
    expect(fitBoardHeight(500, 20, 420, MIN, MAX)).toBe(MAX)
  })

  it('never shrinks past the hard minimum (excess content then scrolls)', () => {
    // content far exceeds available → clamped to MIN
    expect(fitBoardHeight(300, 800, 200, MIN, MAX)).toBe(MIN)
  })

  it('one pass makes the action area hug its content (available becomes content)', () => {
    // Board + available are complementary within a fixed viewport: growing the board by the
    // slack reduces the available space by the same amount → new available == content.
    const current = 300, content = 120, available = 220
    const target = fitBoardHeight(current, content, available, MIN, MAX)
    const newAvailable = available - (target - current)
    expect(newAvailable).toBe(content)
  })
})
