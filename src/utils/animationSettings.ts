export type AnimationSpeed = 'fast' | 'normal' | 'slow'
export type BotSpeed = 'fast' | 'normal' | 'slow'

export interface AnimationConfig {
  stepMs: number
  stepJitter: number
  stepHopCssMs: number
  landingCssMs: number
  jailArriveCssMs: number
  cardArriveCssMs: number
  jailBlockMin: number
  jailBlockMax: number
  cardBlockMin: number
  cardBlockMax: number
  diceToMoveDelayMs: number
}

const CONFIGS: Record<AnimationSpeed, AnimationConfig> = {
  fast: {
    stepMs: 40,
    stepJitter: 0,
    stepHopCssMs: 20,
    landingCssMs: 100,
    jailArriveCssMs: 50,
    cardArriveCssMs: 30,
    jailBlockMin: 80,
    jailBlockMax: 120,
    cardBlockMin: 60,
    cardBlockMax: 120,
    diceToMoveDelayMs: 1050,  // 550 anim + 400 settled + 100 preview
  },
  normal: {
    stepMs: 390,
    stepJitter: 60,
    stepHopCssMs: 280,
    landingCssMs: 480,
    jailArriveCssMs: 700,
    cardArriveCssMs: 500,
    jailBlockMin: 600,
    jailBlockMax: 2000,
    cardBlockMin: 500,
    cardBlockMax: 1400,
    diceToMoveDelayMs: 1400,  // 550 anim + 400 settled + 450 preview
  },
  slow: {
    stepMs: 750,
    stepJitter: 80,
    stepHopCssMs: 550,
    landingCssMs: 900,
    jailArriveCssMs: 1400,
    cardArriveCssMs: 900,
    jailBlockMin: 1200,
    jailBlockMax: 4000,
    cardBlockMin: 900,
    cardBlockMax: 2500,
    diceToMoveDelayMs: 2100,  // 550 anim + 400 settled + 1150 preview
  },
}

const LS_KEY = 'animation-speed'

export function loadAnimationSpeed(): AnimationSpeed {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw === 'fast' || raw === 'normal' || raw === 'slow') return raw
  } catch { /* ignore */ }
  return 'normal'
}

export function saveAnimationSpeed(speed: AnimationSpeed) {
  try { localStorage.setItem(LS_KEY, speed) } catch { /* ignore */ }
}

export function getAnimationConfig(speed: AnimationSpeed): AnimationConfig {
  return CONFIGS[speed]
}

const DICE_ZOOM_LS_KEY = 'dice-zoom'

export function loadDiceZoomEnabled(): boolean {
  try { return localStorage.getItem(DICE_ZOOM_LS_KEY) !== 'false' } catch { return true }
}

export function saveDiceZoomEnabled(enabled: boolean) {
  try { localStorage.setItem(DICE_ZOOM_LS_KEY, String(enabled)) } catch { /* ignore */ }
}

const BOT_SPEED_LS_KEY = 'bot-speed'

export function loadBotSpeed(): BotSpeed {
  try {
    const raw = localStorage.getItem(BOT_SPEED_LS_KEY)
    if (raw === 'fast' || raw === 'normal' || raw === 'slow') return raw
  } catch { /* ignore */ }
  return 'normal'
}

export function saveBotSpeed(speed: BotSpeed) {
  try { localStorage.setItem(BOT_SPEED_LS_KEY, speed) } catch { /* ignore */ }
}

export function applyAnimationSpeedToCss(speed: AnimationSpeed) {
  const cfg = CONFIGS[speed]
  const root = document.documentElement
  root.style.setProperty('--anim-hop-ms', `${cfg.stepHopCssMs}ms`)
  root.style.setProperty('--anim-land-ms', `${cfg.landingCssMs}ms`)
  root.style.setProperty('--anim-jail-ms', `${cfg.jailArriveCssMs}ms`)
  root.style.setProperty('--anim-card-ms', `${cfg.cardArriveCssMs}ms`)
}
