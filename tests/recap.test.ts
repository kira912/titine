import { describe, expect, it } from 'vitest'
import { recapYears, yearRecap } from '../shared/recap'
import type { FillUp, Service } from '../shared/types'

const lyon = { id: 1, address: '1 rue de la Gare', city: 'Lyon', localAverage: 1.9 }
const fill = (date: string, odometer: number, liters: number, totalPrice: number, station?: FillUp['station']): FillUp =>
  ({ vehicleId: 1, date, odometer, liters, totalPrice, full: true, station })
const service = (date: string, cost: number | null): Service =>
  ({ vehicleId: 1, reminderId: null, label: 'Vidange', date, odometer: 0, cost })

const fills = [
  fill('2025-12-15', 10_000, 40, 72),
  fill('2026-01-10', 10_500, 30, 54, lyon),
  fill('2026-02-10', 11_000, 30, 60, lyon),
  fill('2026-02-25', 11_500, 30, 57),
]

describe('recapYears', () => {
  it('liste les années des pleins et entretiens, la plus récente d’abord', () => {
    expect(recapYears(fills, [service('2024-06-01', 90)])).toEqual([2026, 2025, 2024])
  })
})

describe('yearRecap', () => {
  const recap = yearRecap(fills, [service('2026-03-01', 120), service('2025-03-01', 80)], 2026)

  it('totalise les pleins de l’année', () => {
    expect(recap).toMatchObject({ year: 2026, fillUps: 3, liters: 90, fuelCost: 171, services: 1, serviceCost: 120 })
    expect(recap.pricePerLiter).toBeCloseTo(1.9)
  })

  it('compte le tronçon qui part d’un plein de l’année précédente', () => {
    expect(recap.distance).toBe(1_500)
    expect(recap.consumption).toBeCloseTo(6)
  })

  it('retient la station préférée, le meilleur plein et le mois le plus cher', () => {
    expect(recap.favoriteStation).toMatchObject({ visits: 2, station: { id: 1 } })
    expect(recap.bestFillUp).toMatchObject({ date: '2026-01-10' })
    expect(recap.bestFillUp!.saving).toBeCloseTo(3)
    expect(recap.priciestMonth).toEqual({ month: 2, cost: 117 })
  })
})
