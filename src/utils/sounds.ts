import { loadSoundConfig } from '../components/menu/SoundSettings'

let ctx: AudioContext | null = null

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext()
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

function vol(): number {
  const cfg = loadSoundConfig()
  return cfg.volume / 100
}

function canPlayUi(): boolean    { return loadSoundConfig().uiSounds }
function canPlayNotif(): boolean { return loadSoundConfig().notificationSounds }
function canPlayGame(): boolean  { return loadSoundConfig().gameSounds }

// ── Primitive sound builders ─────────────────────────────────────────────────

function beep(freq: number, duration: number, type: OscillatorType = 'sine', gain = 0.3) {
  const c = getCtx()
  const osc = c.createOscillator()
  const g = c.createGain()
  osc.type = type
  osc.frequency.value = freq
  g.gain.setValueAtTime(gain * vol(), c.currentTime)
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration)
  osc.connect(g)
  g.connect(c.destination)
  osc.start()
  osc.stop(c.currentTime + duration)
}

function chord(freqs: number[], duration: number, type: OscillatorType = 'sine', gain = 0.2) {
  freqs.forEach(f => beep(f, duration, type, gain / freqs.length))
}

function noise(duration: number, gain = 0.15) {
  const c = getCtx()
  const buf = c.createBuffer(1, c.sampleRate * duration, c.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  const src = c.createBufferSource()
  src.buffer = buf
  const g = c.createGain()
  g.gain.setValueAtTime(gain * vol(), c.currentTime)
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration)
  src.connect(g)
  g.connect(c.destination)
  src.start()
  src.stop(c.currentTime + duration)
}

// ── Sound effects ─────────────────────────────────────────────────────────────

export function playDiceRoll() {
  if (!canPlayGame()) return
  // Rattling dice sound: noise burst
  noise(0.12, 0.25)
  setTimeout(() => noise(0.08, 0.2), 80)
  setTimeout(() => noise(0.06, 0.15), 140)
}

export function playTokenMove() {
  if (!canPlayGame()) return
  // Light tap per step
  beep(800 + Math.random() * 200, 0.04, 'triangle', 0.12)
}

export function playPassGo() {
  if (!canPlayNotif()) return
  // Happy ascending chord
  chord([523, 659, 784], 0.3, 'sine', 0.4)
  setTimeout(() => chord([659, 784, 1047], 0.4, 'sine', 0.35), 200)
}

export function playBuyProperty() {
  if (!canPlayGame()) return
  chord([392, 494, 587], 0.25, 'sine', 0.35)
  setTimeout(() => beep(784, 0.3, 'sine', 0.3), 220)
}

export function playPayRent() {
  if (!canPlayNotif()) return
  // Minor descending
  beep(440, 0.15, 'sine', 0.25)
  setTimeout(() => beep(370, 0.15, 'sine', 0.22), 140)
  setTimeout(() => beep(330, 0.2, 'sine', 0.2), 280)
}

export function playAuctionBid() {
  if (!canPlayGame()) return
  beep(660, 0.08, 'square', 0.15)
}

export function playAuctionWin() {
  if (!canPlayNotif()) return
  chord([523, 659, 784, 1047], 0.5, 'sine', 0.4)
}

export function playBuildHouse() {
  if (!canPlayGame()) return
  beep(440, 0.08, 'triangle', 0.2)
  setTimeout(() => beep(554, 0.1, 'triangle', 0.2), 80)
}

export function playBuildHotel() {
  if (!canPlayGame()) return
  chord([523, 659, 784], 0.2, 'triangle', 0.35)
  setTimeout(() => beep(1047, 0.3, 'sine', 0.3), 180)
}

export function playGoToJail() {
  if (!canPlayNotif()) return
  beep(220, 0.15, 'sawtooth', 0.25)
  setTimeout(() => beep(196, 0.15, 'sawtooth', 0.22), 150)
  setTimeout(() => beep(165, 0.3, 'sawtooth', 0.2), 300)
}

export function playReleaseJail() {
  if (!canPlayNotif()) return
  beep(523, 0.1, 'sine', 0.2)
  setTimeout(() => beep(659, 0.15, 'sine', 0.25), 100)
}

export function playDrawCard() {
  if (!canPlayGame()) return
  beep(880, 0.06, 'sine', 0.2)
  setTimeout(() => beep(1108, 0.08, 'sine', 0.2), 60)
}

export function playBankruptcy() {
  if (!canPlayNotif()) return
  // Sad descending
  beep(330, 0.2, 'sawtooth', 0.3)
  setTimeout(() => beep(277, 0.2, 'sawtooth', 0.25), 200)
  setTimeout(() => beep(220, 0.4, 'sawtooth', 0.2), 400)
  setTimeout(() => beep(165, 0.5, 'sine', 0.15), 700)
}

export function playGameOver() {
  if (!canPlayNotif()) return
  // Fanfare
  const notes = [523, 659, 784, 1047, 784, 1047, 1319]
  notes.forEach((f, i) => setTimeout(() => beep(f, 0.2, 'sine', 0.3), i * 130))
}

export function playTradeAccepted() {
  if (!canPlayNotif()) return
  chord([523, 659, 784], 0.3, 'sine', 0.3)
}

export function playTradeDeclined() {
  if (!canPlayNotif()) return
  beep(330, 0.2, 'sine', 0.2)
  setTimeout(() => beep(277, 0.25, 'sine', 0.18), 180)
}

export function playMortgage() {
  if (!canPlayGame()) return
  beep(440, 0.1, 'triangle', 0.18)
  setTimeout(() => beep(370, 0.15, 'triangle', 0.15), 100)
}

export function playButtonClick() {
  if (!canPlayUi()) return
  beep(660, 0.04, 'square', 0.1)
}
