import { describe, test, expect } from 'vitest'
import { runCmds, rollAs } from '../helpers/run'
import { unownedPurchaseScenario } from '../scenarios/movement/unowned-purchase'
import { basicRentScenario } from '../scenarios/movement/basic-rent'
import { monopolyDoubleRentScenario } from '../scenarios/movement/monopoly-double-rent'
import { rent1HouseScenario } from '../scenarios/movement/rent-1-house'
import { rent2HousesScenario } from '../scenarios/movement/rent-2-houses'
import { rentHotelScenario } from '../scenarios/movement/rent-hotel'
import { rentMortgagedScenario } from '../scenarios/movement/rent-mortgaged'
import { goToJailSpotScenario } from '../scenarios/movement/go-to-jail-spot'
import { passGoScenario } from '../scenarios/movement/pass-go'
import { landOnGoScenario } from '../scenarios/movement/land-on-go'
import { incomeTaxScenario } from '../scenarios/movement/income-tax'
import { luxuryTaxScenario } from '../scenarios/movement/luxury-tax'

describe('Movement & landing effects', () => {
  test('1.1 unowned property → WAITING_FOR_DECISION', async () => {
    const snap = await runCmds(unownedPurchaseScenario, [rollAs(unownedPurchaseScenario)])
    expect(snap.state?.turn?.phase).toBe('WAITING_FOR_DECISION')
    expect(snap.state?.pendingDecision?.payload.propertyId).toBe('B2')
  })

  test('1.2 basic rent: no monopoly → base rent (B2 = €4)', async () => {
    const snap = await runCmds(basicRentScenario, [rollAs(basicRentScenario)])
    expect(snap.state?.players[0].cash).toBe(basicRentScenario.players[0].cash - 4)
    expect(snap.state?.players[1].cash).toBe(basicRentScenario.players[1].cash + 4)
  })

  test('1.3 monopoly double rent: full BROWN set → 2× (B2 = €8)', async () => {
    const snap = await runCmds(monopolyDoubleRentScenario, [rollAs(monopolyDoubleRentScenario)])
    expect(snap.state?.players[0].cash).toBe(monopolyDoubleRentScenario.players[0].cash - 8)
    expect(snap.state?.players[1].cash).toBe(monopolyDoubleRentScenario.players[1].cash + 8)
  })

  test('1.4 rent with 1 house (B2 = €20)', async () => {
    const snap = await runCmds(rent1HouseScenario, [rollAs(rent1HouseScenario)])
    expect(snap.state?.players[0].cash).toBe(rent1HouseScenario.players[0].cash - 20)
    expect(snap.state?.players[1].cash).toBe(rent1HouseScenario.players[1].cash + 20)
  })

  test('1.5 rent with 2 houses (B2 = €60)', async () => {
    const snap = await runCmds(rent2HousesScenario, [rollAs(rent2HousesScenario)])
    expect(snap.state?.players[0].cash).toBe(rent2HousesScenario.players[0].cash - 60)
    expect(snap.state?.players[1].cash).toBe(rent2HousesScenario.players[1].cash + 60)
  })

  test('1.6 rent with hotel (B2 = €450)', async () => {
    const snap = await runCmds(rentHotelScenario, [rollAs(rentHotelScenario)])
    expect(snap.state?.players[0].cash).toBe(rentHotelScenario.players[0].cash - 450)
    expect(snap.state?.players[1].cash).toBe(rentHotelScenario.players[1].cash + 450)
  })

  test('1.7 mortgaged property → no rent charged', async () => {
    const snap = await runCmds(rentMortgagedScenario, [rollAs(rentMortgagedScenario)])
    expect(snap.state?.players[0].cash).toBe(rentMortgagedScenario.players[0].cash)
    expect(snap.state?.players[1].cash).toBe(rentMortgagedScenario.players[1].cash)
  })

  test('1.8 GO TO JAIL corner → inJail=true, boardIndex=10, no GO bonus', async () => {
    const snap = await runCmds(goToJailSpotScenario, [rollAs(goToJailSpotScenario)])
    expect(snap.state?.players[0].inJail).toBe(true)
    expect(snap.state?.players[0].boardIndex).toBe(10)
    expect(snap.state?.players[0].cash).toBe(goToJailSpotScenario.players[0].cash)
  })

  test('1.9 pass GO (through position 0) → +€200', async () => {
    const snap = await runCmds(passGoScenario, [rollAs(passGoScenario)])
    expect(snap.state?.players[0].cash).toBe(passGoScenario.players[0].cash + 200)
    expect(snap.state?.players[0].boardIndex).toBe(10)
  })

  test('1.10 land exactly on GO → +€200', async () => {
    const snap = await runCmds(landOnGoScenario, [rollAs(landOnGoScenario)])
    expect(snap.state?.players[0].cash).toBe(landOnGoScenario.players[0].cash + 200)
    expect(snap.state?.players[0].boardIndex).toBe(0)
  })

  test('1.11 income tax (Tulovero) → -€200', async () => {
    const snap = await runCmds(incomeTaxScenario, [rollAs(incomeTaxScenario)])
    expect(snap.state?.players[0].cash).toBe(incomeTaxScenario.players[0].cash - 200)
  })

  test('1.12 luxury tax (Ylellisyysvero) → -€100', async () => {
    const snap = await runCmds(luxuryTaxScenario, [rollAs(luxuryTaxScenario)])
    expect(snap.state?.players[0].cash).toBe(luxuryTaxScenario.players[0].cash - 100)
  })
})
