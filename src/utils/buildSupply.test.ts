import { describe, it, expect } from 'vitest'
import { bankHasBuildingFor, BANK_HOUSE_SUPPLY, BANK_HOTEL_SUPPLY } from './buildSupply'

const houses = (n: number) => Array.from({ length: n }, () => ({ houseCount: 1, hotelCount: 0 }))
const hotels = (n: number) => Array.from({ length: n }, () => ({ houseCount: 0, hotelCount: 1 }))

describe('bankHasBuildingFor', () => {
  it('allows a house when the bank still has houses', () => {
    expect(bankHasBuildingFor(0, houses(10))).toBe(true)
    expect(bankHasBuildingFor(3, houses(BANK_HOUSE_SUPPLY - 1))).toBe(true)
  })

  it('blocks a house when all 32 houses are already on the board', () => {
    expect(bankHasBuildingFor(2, houses(BANK_HOUSE_SUPPLY))).toBe(false)
  })

  it('gates the 5th building (hotel) on hotel supply, not house supply', () => {
    // 32 houses are out, but building on a 4-house property upgrades to a HOTEL,
    // which returns houses to the bank — so house scarcity must not block it.
    expect(bankHasBuildingFor(4, houses(BANK_HOUSE_SUPPLY))).toBe(true)
  })

  it('blocks a hotel when all 12 hotels are already on the board', () => {
    expect(bankHasBuildingFor(4, hotels(BANK_HOTEL_SUPPLY))).toBe(false)
  })

  it('allows a hotel while hotels remain', () => {
    expect(bankHasBuildingFor(4, hotels(BANK_HOTEL_SUPPLY - 1))).toBe(true)
  })
})
