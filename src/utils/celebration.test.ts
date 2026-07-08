import { describe, it, expect } from 'vitest'
import { pickCelebration } from './celebration'
import { translations } from '../i18n/translations'
import type { GameEvent } from '../store/events'
import type { SessionState, PlayerSnapshot, SeatState } from '../types/api'

const t = translations.fi
const ME = 'me', OTHER = 'other'

const gev = (over: Partial<GameEvent>): GameEvent =>
  ({ id: 1, timestamp: 0, icon: '', message: '', relatedPlayerIds: [], ...over })

const player = (id: string): PlayerSnapshot =>
  ({ playerId: id, seatId: id, name: id === ME ? 'Aino' : 'Botti', cash: 1500, boardIndex: 0,
     bankrupt: false, eliminated: false, inJail: false, jailRoundsRemaining: 0, getOutOfJailCards: 0, ownedPropertyIds: [] })

const seat = (id: string): SeatState =>
  ({ seatId: id, playerId: id, tokenColorHex: '#e53935' } as unknown as SeatState)

const state = { players: [player(ME), player(OTHER)], seats: [seat(ME), seat(OTHER)] } as SessionState

describe('pickCelebration', () => {
  it('celebrates the local player buying a property, with name and price', () => {
    const c = pickCelebration([gev({ id: 5, soundKey: 'BOUGHT_PROPERTY', relatedPlayerIds: [ME], propertyId: 'B1' })], state, ME, t)
    expect(c?.title).toBe(t.celebBoughtTitle)
    expect(c?.subtitle).toBe('Katajanokka') // B1
    expect(c?.price).toBe('€60')
    expect(c?.icon).toBe('🏠')
  })

  it('does NOT celebrate another player buying a property', () => {
    const c = pickCelebration([gev({ id: 5, soundKey: 'BOUGHT_PROPERTY', relatedPlayerIds: [OTHER], propertyId: 'B1' })], state, ME, t)
    expect(c).toBeNull()
  })

  it('celebrates a completed monopoly for ANY player', () => {
    const c = pickCelebration([gev({ id: 7, kind: 'monopoly', group: 'BROWN', relatedPlayerIds: [OTHER] })], state, ME, t)
    expect(c?.title).toBe(t.monopolyCelebrationTitle)
    expect(c?.playerName).toBe('Botti')
  })

  it('celebrates the local player winning an auction', () => {
    const c = pickCelebration([gev({ id: 8, soundKey: 'AUCTION_WON', relatedPlayerIds: [ME], propertyId: 'B1' })], state, ME, t)
    expect(c?.title).toBe(t.celebAuctionWonTitle)
    expect(c?.icon).toBe('🔨')
  })

  it('celebrates the local player building a hotel', () => {
    const c = pickCelebration([gev({ id: 9, soundKey: 'BUILT_HOTEL', relatedPlayerIds: [ME], propertyId: 'B1' })], state, ME, t)
    expect(c?.title).toBe(t.celebHotelTitle)
    expect(c?.icon).toBe('🏨')
  })

  it('prioritises a monopoly over a same-batch purchase', () => {
    const c = pickCelebration([
      gev({ id: 10, soundKey: 'BOUGHT_PROPERTY', relatedPlayerIds: [ME], propertyId: 'B1' }),
      gev({ id: 11, kind: 'monopoly', group: 'BROWN', relatedPlayerIds: [ME] }),
    ], state, ME, t)
    expect(c?.title).toBe(t.monopolyCelebrationTitle)
  })

  it('prioritises an auction win over a purchase in the same batch', () => {
    const c = pickCelebration([
      gev({ id: 12, soundKey: 'BOUGHT_PROPERTY', relatedPlayerIds: [ME], propertyId: 'B1' }),
      gev({ id: 13, soundKey: 'AUCTION_WON', relatedPlayerIds: [ME], propertyId: 'B2' }),
    ], state, ME, t)
    expect(c?.title).toBe(t.celebAuctionWonTitle)
  })

  it('celebrates a big rent paid TO me (I am the creditor), with payer and amount', () => {
    // relatedPlayerIds = [payer, receiver]; receiver must be me.
    const c = pickCelebration([gev({ id: 20, soundKey: 'PAID_RENT', relatedPlayerIds: [OTHER, ME], amount: 450 })], state, ME, t)
    expect(c?.title).toBe(t.celebBigRentTitle)
    expect(c?.subtitle).toBe('Botti') // the payer
    expect(c?.price).toBe('€450')
    expect(c?.icon).toBe('💰')
  })

  it('does NOT celebrate a small rent', () => {
    const c = pickCelebration([gev({ id: 21, soundKey: 'PAID_RENT', relatedPlayerIds: [OTHER, ME], amount: 12 })], state, ME, t)
    expect(c).toBeNull()
  })

  it('does NOT celebrate rent that I PAID (I am the payer, not the receiver)', () => {
    const c = pickCelebration([gev({ id: 22, soundKey: 'PAID_RENT', relatedPlayerIds: [ME, OTHER], amount: 450 })], state, ME, t)
    expect(c).toBeNull()
  })

  it('returns null when nothing is celebration-worthy', () => {
    const c = pickCelebration([gev({ id: 1, soundKey: 'DICE_ROLLED', relatedPlayerIds: [ME] })], state, ME, t)
    expect(c).toBeNull()
  })
})
