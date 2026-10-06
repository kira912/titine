import { describe, expect, it } from 'vitest'
import { DEFAULT_PROFILE, betterDeal, driverProfile, tripCost } from '../shared/detour'
import type { FillUp } from '../shared/types'

const fill = (odometer: number, liters: number, date: string): FillUp =>
  ({ vehicleId: 1, date, odometer, liters, totalPrice: liters * 1.8, full: true })

describe('driverProfile', () => {
  it('prend le plein habituel et la consommation réelle du carnet', () => {
    const profile = driverProfile([fill(10_000, 40, '2026-01-01'), fill(10_500, 30, '2026-02-01'), fill(11_000, 30, '2026-03-01')])
    expect(profile.liters).toBeCloseTo(100 / 3)
    expect(profile.consumption).toBeCloseTo(6)
    expect(profile.estimated).toBe(false)
  })

  it('se rabat sur des valeurs typiques sans carnet', () => {
    expect(driverProfile([])).toEqual(DEFAULT_PROFILE)
  })
})

describe('tripCost', () => {
  it('ajoute au plein l\'aller-retour, route comprise', () => {
    const cost = tripCost({ price: 2, distanceKm: 10 }, { liters: 40, consumption: 5 })
    expect(cost.fill).toBe(80)
    // 2 × 10 km × 1,3 = 26 km, à 5 L/100 = 1,3 L à 2 €
    expect(cost.trip).toBeCloseTo(2.6)
    expect(cost.total).toBeCloseTo(82.6)
  })
})

describe('betterDeal', () => {
  const profile = { liters: 40, consumption: 6 }

  it('signale une station plus rentable que la moins chère au litre', () => {
    const far = { id: 1, price: 1.90, distanceKm: 18 }
    const near = { id: 2, price: 1.92, distanceKm: 1 }
    const deal = betterDeal([far, near], profile)
    expect(deal?.station).toBe(near)
    expect(deal!.gain).toBeGreaterThan(2)
  })

  it('ne dit rien quand la moins chère est aussi la plus rentable', () => {
    expect(betterDeal([{ price: 1.80, distanceKm: 2 }, { price: 1.95, distanceKm: 1 }], profile)).toBeNull()
    expect(betterDeal([], profile)).toBeNull()
  })
})
