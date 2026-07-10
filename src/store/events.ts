import type { GameEventEntry, SessionState } from '../types/api'
import type { PlayerSnapshot } from '../types/api'
import { getCardText } from '../i18n/cards'
import { getLang } from '../i18n/lang'
import { translations } from '../i18n/translations'
import { SPOTS } from '../types/spots'
import { loadAnimationSpeed, getAnimationConfig } from '../utils/animationSettings'
import type { AnimationConfig } from '../utils/animationSettings'

const BOARD_SIZE = 40
const JAIL_INDEX = 10

export interface GameEvent {
  id: number
  timestamp: number
  icon: string
  /** Stable sound key — maps to a specific sound in GameContext. Prefer switching on this over icon. */
  soundKey?: string
  message: string
  relatedPlayerIds: string[]
  kind?: string
  group?: string  // street/color group key, set on 'monopoly' events for the celebration
  propertyId?: string  // set on purchase/auction/hotel events so the celebration can look up the spot
  amount?: number  // set on PAID_RENT so the celebration can gate on / show the rent amount
  releaseAt?: number  // hide in event log until this timestamp
  historical?: boolean  // loaded from existing log on reconnect/refresh — no sounds
  // Chat payload — set only on CHAT events. Carried on the same event stream so chat and
  // reactions ride the existing SSE log. Chat events are excluded from the Tapahtumaloki and
  // shown in the Chat tab instead; REACTION chat events also float over the board.
  // botMsgKey/botVariant localise a bot MESSAGE at render time (see ChatPanel) so it follows the
  // viewer's current language; `content` is the Finnish fallback. Absent for human messages.
  chat?: { kind: 'MESSAGE' | 'REACTION'; name: string; content: string; playerId: string; botMsgKey?: string; botVariant?: number }
}

let _id = 0

function ev(icon: string, message: string, related: string[] = [], kind?: string, delay = 0, soundKey?: string): GameEvent {
  const now = Date.now()
  return { id: _id++, timestamp: now, icon, soundKey, message, relatedPlayerIds: related, kind, releaseAt: delay > 0 ? now + delay : undefined }
}

function moveDelay(fromIdx: number, toIdx: number, goingToJail: boolean, cfg: AnimationConfig): number {
  if (goingToJail) {
    const dist = (JAIL_INDEX - fromIdx + BOARD_SIZE) % BOARD_SIZE
    const jailDur = Math.max(cfg.jailBlockMin, Math.min(cfg.jailBlockMax,
      cfg.jailBlockMin + (dist / 39) * (cfg.jailBlockMax - cfg.jailBlockMin)))
    return cfg.diceToMoveDelayMs + jailDur
  }
  const forward = (toIdx - fromIdx + BOARD_SIZE) % BOARD_SIZE
  const backward = (fromIdx - toIdx + BOARD_SIZE) % BOARD_SIZE
  return cfg.diceToMoveDelayMs + Math.min(forward, backward) * cfg.stepMs
}

/**
 * Translate backend-persisted GameEventEntry records into display events.
 * Call with only the NEW entries (id > lastSeenEventId).
 */
export function translateBackendEvents(entries: GameEventEntry[], players: PlayerSnapshot[]): GameEvent[] {
  const tr = translations[getLang()]
  const t = tr.ev
  const cfg = getAnimationConfig(loadAnimationSpeed())
  const events: GameEvent[] = []
  // Tracks last movement delay per player so subsequent events appear after animation
  const playerDelayMs = new Map<string, number>()

  for (const e of entries) {
    const pid = e.playerIds[0] ?? ''
    const pid2 = e.playerIds[1] ?? ''
    const player = players.find(p => p.playerId === pid)
    const name = player?.name ?? pid

    switch (e.type) {
      case 'DICE_ROLLED': {
        const d1 = parseInt(e.data.d1 ?? '1')
        const d2 = parseInt(e.data.d2 ?? '1')
        events.push(ev('🎲', t.rolledDice(name, d1, d2), [pid], `${d1}_${d2}`, 0, 'DICE_ROLLED'))
        break
      }
      case 'PLAYER_MOVED': {
        const from = parseInt(e.data.from ?? '0')
        const to = parseInt(e.data.to ?? '0')
        const delay = moveDelay(from, to, false, cfg)
        playerDelayMs.set(pid, delay)
        const spot = SPOTS[to]
        events.push(ev('🏃', `${name} → ${spot?.name ?? `#${to}`}`, [pid], undefined, delay, 'PLAYER_MOVED'))
        break
      }
      case 'PASSED_GO': {
        const delay = playerDelayMs.get(pid) ?? 0
        events.push(ev('💰', t.passedGo(name), [pid], undefined, delay, 'PASSED_GO'))
        break
      }
      case 'WENT_TO_JAIL': {
        const from = e.data.from != null ? parseInt(e.data.from) : null
        const delay = from != null ? moveDelay(from, JAIL_INDEX, true, cfg) : (playerDelayMs.get(pid) ?? 0)
        playerDelayMs.set(pid, delay)
        events.push(ev('⛓', t.wentToJail(name), [pid], undefined, delay, 'WENT_TO_JAIL'))
        break
      }
      case 'RELEASED_FROM_JAIL': {
        events.push(ev('🔓', t.releasedFromJail(name), [pid], undefined, 0, 'RELEASED_FROM_JAIL'))
        break
      }
      case 'DREW_CARD': {
        const cardKey = e.data.card ?? ''
        const text = getCardText(cardKey, null)
        const delay = playerDelayMs.get(pid) ?? 0
        if (text) events.push(ev('🃏', t.drewCard(name, text), [pid], undefined, delay, 'DREW_CARD'))
        break
      }
      case 'PAID_RENT': {
        const creditor = players.find(p => p.playerId === pid2)
        const amount = parseInt(e.data.amount ?? '0')
        const delay = playerDelayMs.get(pid) ?? 0
        const rev = ev('💸', t.paidRent(name, amount, creditor?.name ?? '?'), e.playerIds.slice(0, 2), undefined, delay, 'PAID_RENT')
        rev.amount = amount
        events.push(rev)
        break
      }
      case 'BOUGHT_PROPERTY': {
        const spot = SPOTS.find(s => s.id === e.data.property)
        const propName = spot?.name ?? e.data.property ?? '?'
        const delay = playerDelayMs.get(pid) ?? 0
        const bev = ev('🏠', t.bought(name, propName), [pid], undefined, delay, 'BOUGHT_PROPERTY')
        bev.propertyId = e.data.property
        events.push(bev)
        break
      }
      case 'BUILT_HOUSE': {
        const spot = SPOTS.find(s => s.id === e.data.property)
        events.push(ev('🏗', t.builtHouse(name, spot?.name ?? e.data.property ?? '?'), [pid], `house:${spot?.streetType ?? ''}`, 0, 'BUILT_HOUSE'))
        break
      }
      case 'BUILT_HOTEL': {
        const spot = SPOTS.find(s => s.id === e.data.property)
        const hev = ev('🏗', t.builtHotel(name, spot?.name ?? e.data.property ?? '?'), [pid], `hotel:${spot?.streetType ?? ''}`, 0, 'BUILT_HOTEL')
        hev.propertyId = e.data.property
        events.push(hev)
        break
      }
      case 'SOLD_HOUSE': {
        const spot = SPOTS.find(s => s.id === e.data.property)
        events.push(ev('🏚', t.soldHouse(name, spot?.name ?? e.data.property ?? '?'), [pid], `sell:${spot?.streetType ?? ''}`, 0, 'SOLD_HOUSE'))
        break
      }
      case 'SOLD_HOTEL': {
        const spot = SPOTS.find(s => s.id === e.data.property)
        events.push(ev('🏚', t.soldHotel(name, spot?.name ?? e.data.property ?? '?'), [pid], `sellhotel:${spot?.streetType ?? ''}`, 0, 'SOLD_HOTEL'))
        break
      }
      case 'MORTGAGED': {
        const spot = SPOTS.find(s => s.id === e.data.property)
        events.push(ev('🏦', t.mortgaged(name, spot?.name ?? e.data.property ?? '?'), [pid], undefined, 0, 'MORTGAGED'))
        break
      }
      case 'REDEEMED': {
        const spot = SPOTS.find(s => s.id === e.data.property)
        events.push(ev('💳', t.redeemed(name, spot?.name ?? e.data.property ?? '?'), [pid], undefined, 0, 'REDEEMED'))
        break
      }
      case 'WENT_BANKRUPT': {
        events.push(ev('💀', t.wentBankrupt(name), [pid], undefined, 0, 'WENT_BANKRUPT'))
        break
      }
      case 'PLAYER_LEFT': {
        events.push(ev('🚪', t.playerLeft(name), [pid]))
        break
      }
      case 'TRADE_ACCEPTED': {
        const p2 = players.find(p => p.playerId === pid2)
        const offeredParts = [
          e.data.offeredProps ? e.data.offeredProps.split(',').map(id => SPOTS.find(s => s.id === id)?.name ?? id).join(', ') : '',
          e.data.offeredMoney ? `€${e.data.offeredMoney}` : '',
        ].filter(Boolean).join(' + ')
        const requestedParts = [
          e.data.requestedProps ? e.data.requestedProps.split(',').map(id => SPOTS.find(s => s.id === id)?.name ?? id).join(', ') : '',
          e.data.requestedMoney ? `€${e.data.requestedMoney}` : '',
        ].filter(Boolean).join(' + ')
        const details = offeredParts || requestedParts
          ? ' · ' + [offeredParts, requestedParts].filter(Boolean).join(' ↔ ')
          : ''
        events.push(ev('🤝', t.tradeAccepted(name, p2?.name ?? '?') + details, [pid, pid2], 'accepted', 0, 'TRADE_ACCEPTED'))
        break
      }
      case 'TRADE_DECLINED': {
        const p2 = players.find(p => p.playerId === pid2)
        events.push(ev('🚫', t.tradeDeclined(p2?.name ?? '?'), [pid, pid2]))
        break
      }
      case 'TRADE_CANCELLED': {
        events.push(ev('🤝', t.tradeCancelled, [pid, pid2]))
        break
      }
      case 'CHAT': {
        const kind = e.data.kind === 'REACTION' ? 'REACTION' : 'MESSAGE'
        const content = e.data.content ?? ''
        const chatName = e.data.name ?? name
        const icon = kind === 'REACTION' ? content : '💬'
        const message = kind === 'REACTION' ? `${chatName} ${content}` : `${chatName}: ${content}`
        const cev = ev(icon, message, [pid])
        cev.chat = { kind, name: chatName, content, playerId: pid }
        // A bot message arrives as a (key, variant) pair so each client localises it to its own
        // language; carry them through for ChatPanel to resolve at render time.
        const botMsgKey = e.data.botMsgKey
        if (botMsgKey) {
          cev.chat.botMsgKey = botMsgKey
          const v = parseInt(e.data.botMsgVariant ?? '0', 10)
          cev.chat.botVariant = Number.isNaN(v) ? 0 : v
        }
        events.push(cev)
        break
      }
      case 'MONEY_FLOW': {
        const from = e.data.from ?? ''
        const to = e.data.to ?? ''
        const amount = parseInt(e.data.amount ?? '0')
        const reason = e.data.reason ?? ''
        const fromName = from ? (players.find(p => p.playerId === from)?.name ?? from) : tr.bankLabel
        const toName = to ? (players.find(p => p.playerId === to)?.name ?? to) : tr.bankLabel
        const reasonLabel = t.moneyReasons[reason] ?? reason
        events.push(ev('💵', `${fromName} → ${toName} €${amount} (${reasonLabel})`, e.playerIds.filter(Boolean)))
        break
      }
    }
  }

  return events
}

/**
 * Derive events that aren't tracked in the backend event log:
 * game over, monopoly gains, auction results, trade results, property transfers.
 */
export function deriveMiscEvents(prev: SessionState | null, next: SessionState): GameEvent[] {
  if (!prev) return []
  const events: GameEvent[] = []
  const t = translations[getLang()].ev

  // Game over. winnerPlayerId is null when the host aborted the game — no winner, so log a
  // neutral line rather than "winner: ?" (mirrors the game-over overlay).
  if (next.status === 'GAME_OVER' && prev.status !== 'GAME_OVER') {
    const winner = next.winnerPlayerId ? next.players.find(p => p.playerId === next.winnerPlayerId) : null
    const msg = winner ? t.gameOver(winner.name) : translations[getLang()].gameEndedNoWinner
    events.push(ev(winner ? '🎊' : '🏁', msg, [], undefined, 0, 'GAME_OVER'))
    return events
  }

  // Monopoly gained — any ownership change (purchase, auction, trade, bankruptcy
  // transfer) that completes a color set for the new owner. Deduped per group so a
  // multi-property transfer announces each completed set once.
  const announcedMonopolies = new Set<string>()
  for (const np of next.properties) {
    const pp = prev.properties.find(p => p.propertyId === np.propertyId)
    if (!pp) continue

    if (np.ownerPlayerId && np.ownerPlayerId !== pp.ownerPlayerId) {
      const spot = SPOTS.find(s => s.id === np.propertyId)
      const owner = next.players.find(p => p.playerId === np.ownerPlayerId)
      if (spot && owner && !announcedMonopolies.has(spot.streetType)
          && !['RAILROAD', 'UTILITY', 'CORNER', 'COMMUNITY', 'CHANCE', 'TAX'].includes(spot.streetType)) {
        const groupProps = next.properties.filter(p => {
          const s = SPOTS.find(ss => ss.id === p.propertyId)
          return s?.streetType === spot.streetType
        })
        const ownerGroupCount = groupProps.filter(p => p.ownerPlayerId === owner.playerId).length
        const hadMonopolyBefore = groupProps.every(p =>
          prev.properties.find(pr => pr.propertyId === p.propertyId)?.ownerPlayerId === owner.playerId)
        if (ownerGroupCount === groupProps.length && !hadMonopolyBefore) {
          announcedMonopolies.add(spot.streetType)
          const mev = ev('🏆', t.gotMonopoly(owner.name, spot.streetType), [owner.playerId], 'monopoly')
          mev.group = spot.streetType
          events.push(mev)
        }
      }
    }

    // Property transferred (bankruptcy) — skip if a trade was active (transfers handled by TRADE_ACCEPTED backend event)
    if (np.ownerPlayerId && pp.ownerPlayerId && np.ownerPlayerId !== pp.ownerPlayerId && !prev.tradeState) {
      const newOwner = next.players.find(p => p.playerId === np.ownerPlayerId)
      const prevOwner = next.players.find(p => p.playerId === pp.ownerPlayerId)
      const spot = SPOTS.find(s => s.id === np.propertyId)
      events.push(ev('🤝', t.transferred(spot?.name ?? np.propertyId, prevOwner?.name ?? '?', newOwner?.name ?? '?'),
        [np.ownerPlayerId, pp.ownerPlayerId]))
    }
  }

  // Auction ended
  if (prev.auctionState && !next.auctionState) {
    const winId = prev.auctionState.winningPlayerId
    const winner = winId ? next.players.find(p => p.playerId === winId) : null
    const spot = SPOTS.find(s => s.id === prev.auctionState!.propertyId)
    if (winner) {
      const aev = ev('🔨', t.auctionWon(winner.name, spot?.name ?? '?'), [winner.playerId], undefined, 0, 'AUCTION_WON')
      aev.propertyId = prev.auctionState.propertyId
      events.push(aev)
    } else {
      events.push(ev('🔨', t.auctionNoWinner, []))
    }
  }

  // Trade ended: now handled by TRADE_ACCEPTED / TRADE_DECLINED / TRADE_CANCELLED backend events

  return events
}
