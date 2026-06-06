const LS_KEY = 'haptics-enabled'

export function loadHapticsEnabled(): boolean {
  try { return localStorage.getItem(LS_KEY) !== 'false' } catch { return true }
}

export function saveHapticsEnabled(enabled: boolean) {
  try { localStorage.setItem(LS_KEY, String(enabled)) } catch { /* ignore */ }
}

function vibe(pattern: number | number[]) {
  if (!loadHapticsEnabled()) return
  if (typeof navigator === 'undefined' || !('vibrate' in navigator)) return
  navigator.vibrate(pattern)
}

// UI
export function hapticButtonClick()   { vibe(12) }

// Game events
export function hapticDiceRoll()      { vibe(40) }
export function hapticTokenStep()     { vibe(8) }
export function hapticPassGo()        { vibe([30, 40, 50]) }
export function hapticBuyProperty()   { vibe([25, 40, 50]) }
export function hapticPayRent()       { vibe(30) }
export function hapticGoToJail()      { vibe([70, 60, 80]) }
export function hapticDrawCard()      { vibe(15) }
export function hapticBuildHouse()    { vibe(20) }
export function hapticBuildHotel()    { vibe([25, 35, 50]) }
export function hapticAuctionBid()    { vibe(15) }
export function hapticAuctionWin()    { vibe([35, 45, 70]) }
export function hapticTradeAccepted() { vibe([25, 40, 50]) }
export function hapticTradeDeclined() { vibe([40, 30, 40]) }
export function hapticBankruptcy()    { vibe([60, 60, 100, 60, 40]) }
