import { loadSoundConfig } from '../components/menu/SoundSettings'
import {
  hapticButtonClick, hapticDiceRoll, hapticTokenStep, hapticPassGo,
  hapticBuyProperty, hapticPayRent, hapticGoToJail, hapticDrawCard,
  hapticBuildHouse, hapticBuildHotel, hapticAuctionBid, hapticAuctionWin,
  hapticTradeAccepted, hapticTradeDeclined, hapticBankruptcy,
} from './haptics'

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
  hapticDiceRoll()
  if (!canPlayGame()) return
  // Shake phase: rattling noise bursts
  noise(0.09, 0.35)
  setTimeout(() => noise(0.09, 0.35), 85)
  setTimeout(() => noise(0.09, 0.35), 165)
  setTimeout(() => noise(0.07, 0.30), 240)
  // Impact: two dice hitting the table (low thump + short noise)
  setTimeout(() => { beep(140, 0.06, 'triangle', 0.5); noise(0.05, 0.25) }, 320)
  setTimeout(() => { beep(120, 0.06, 'triangle', 0.4); noise(0.04, 0.20) }, 360)
}

export function playTokenMove() {
  hapticTokenStep()
  if (!canPlayGame()) return
  // Smooth sliding sound - continuous glide
  const c = getCtx()
  const buf = c.createBuffer(1, c.sampleRate * 0.05, c.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < data.length; i++) {
    data[i] = (Math.random() * 2 - 1) * 0.4
  }
  const src = c.createBufferSource()
  src.buffer = buf
  const g = c.createGain()
  g.gain.setValueAtTime(0.08 * vol(), c.currentTime)
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.05)
  src.connect(g)
  g.connect(c.destination)
  src.start()
  src.stop(c.currentTime + 0.05)
}

export function playTokenMoveCardboard() {
  if (!canPlayGame()) return
  // Smooth sliding sound - continuous glide (alias for playTokenMove)
  playTokenMove()
}

export function playTokenMoveCardboardSoft() {
  if (!canPlayGame()) return
  // Whisper slide - very subtle, smooth
  const c = getCtx()
  const buf = c.createBuffer(1, c.sampleRate * 0.04, c.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < data.length; i++) {
    data[i] = (Math.random() * 2 - 1) * 0.2
  }
  const src = c.createBufferSource()
  src.buffer = buf
  const g = c.createGain()
  g.gain.setValueAtTime(0.05 * vol(), c.currentTime)
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.04)
  src.connect(g)
  g.connect(c.destination)
  src.start()
  src.stop(c.currentTime + 0.04)
}

export function playTokenMoveCardboardHarsh() {
  if (!canPlayGame()) return
  // Swish slide - like air whoosh
  const c = getCtx()
  const buf = c.createBuffer(1, c.sampleRate * 0.06, c.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < data.length; i++) {
    const fadeIn = i / data.length
    data[i] = (Math.random() * 2 - 1) * fadeIn * 0.5
  }
  const src = c.createBufferSource()
  src.buffer = buf
  const g = c.createGain()
  g.gain.setValueAtTime(0.08 * vol(), c.currentTime)
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.06)
  src.connect(g)
  g.connect(c.destination)
  src.start()
  src.stop(c.currentTime + 0.06)
}

export function playTokenMoveCardboardLong() {
  if (!canPlayGame()) return
  // Long glide - smooth continuous slide across board
  const c = getCtx()
  const buf = c.createBuffer(1, c.sampleRate * 0.1, c.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < data.length; i++) {
    const fadeOut = 1 - (i / data.length)
    data[i] = (Math.random() * 2 - 1) * 0.35 * fadeOut
  }
  const src = c.createBufferSource()
  src.buffer = buf
  const g = c.createGain()
  g.gain.setValueAtTime(0.1 * vol(), c.currentTime)
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.1)
  src.connect(g)
  g.connect(c.destination)
  src.start()
  src.stop(c.currentTime + 0.1)
}

export function playTokenMoveCardboardCrunchy() {
  if (!canPlayGame()) return
  // Slick slide - smooth like on plastic
  const c = getCtx()
  const buf = c.createBuffer(1, c.sampleRate * 0.05, c.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < data.length; i++) {
    data[i] = (Math.random() * 2 - 1) * 0.3
  }
  const src = c.createBufferSource()
  src.buffer = buf
  const g = c.createGain()
  g.gain.setValueAtTime(0.07 * vol(), c.currentTime)
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.05)
  src.connect(g)
  g.connect(c.destination)
  src.start()
  src.stop(c.currentTime + 0.05)
}

export function playPassGo() {
  hapticPassGo()
  if (!canPlayNotif()) return
  // Happy ascending chord
  chord([523, 659, 784], 0.3, 'sine', 0.4)
  setTimeout(() => chord([659, 784, 1047], 0.4, 'sine', 0.35), 200)
}

export function playBuyProperty() {
  hapticBuyProperty()
  if (!canPlayGame()) return
  chord([392, 494, 587], 0.25, 'sine', 0.35)
  setTimeout(() => beep(784, 0.3, 'sine', 0.3), 220)
}

export function playPayRent() {
  hapticPayRent()
  if (!canPlayNotif()) return
  // Minor descending
  beep(440, 0.15, 'sine', 0.25)
  setTimeout(() => beep(370, 0.15, 'sine', 0.22), 140)
  setTimeout(() => beep(330, 0.2, 'sine', 0.2), 280)
}

export function playAuctionBid() {
  hapticAuctionBid()
  if (!canPlayGame()) return
  beep(660, 0.08, 'square', 0.15)
}

export function playAuctionWin() {
  hapticAuctionWin()
  if (!canPlayNotif()) return
  chord([523, 659, 784, 1047], 0.5, 'sine', 0.4)
}

export function playBuildHouse() {
  hapticBuildHouse()
  if (!canPlayGame()) return
  beep(440, 0.08, 'triangle', 0.2)
  setTimeout(() => beep(554, 0.1, 'triangle', 0.2), 80)
}

export function playBuildHotel() {
  hapticBuildHotel()
  if (!canPlayGame()) return
  chord([523, 659, 784], 0.2, 'triangle', 0.35)
  setTimeout(() => beep(1047, 0.3, 'sine', 0.3), 180)
}

export function playGoToJail() {
  hapticGoToJail()
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
  hapticDrawCard()
  if (!canPlayGame()) return
  beep(880, 0.06, 'sine', 0.2)
  setTimeout(() => beep(1108, 0.08, 'sine', 0.2), 60)
}

export function playBankruptcy() {
  hapticBankruptcy()
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
  hapticTradeAccepted()
  if (!canPlayNotif()) return
  chord([523, 659, 784], 0.3, 'sine', 0.3)
}

export function playTradeDeclined() {
  hapticTradeDeclined()
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
  hapticButtonClick()
  if (!canPlayUi()) return
  beep(660, 0.04, 'square', 0.1)
}
