import { describe, expect, it } from 'vitest'
import { fillUpSaving, savingsSummary } from '../shared/savings'
import type { FillUp } from '../shared/types'

const fill = (liters: number, totalPrice: number, localAverage: number | null | undefined, date = '2026-01-01'): FillUp => ({
  vehicleId: 1,
  date,
  odometer: 10_000,
  liters,
  totalPrice,
  full: true,
  station: localAverage === undefined ? undefined : { id: 1, address: '1 rue de la Gare', city: 'Lyon', localAverage },
})

describe('fillUpSaving', () => {
  it('compare le prix payé au prix moyen autour de la station', () => {
    expect(fillUpSaving(fill(40, 70, 1.8))).toBeCloseTo(2)
  })

  it('est négative quand le plein a coûté plus cher que la moyenne', () => {
    expect(fillUpSaving(fill(40, 74, 1.8))).toBeCloseTo(-2)
  })

  it('ignore les pleins sans station ou sans moyenne', () => {
    expect(fillUpSaving(fill(40, 70, undefined))).toBeNull()
    expect(fillUpSaving(fill(40, 70, null))).toBeNull()
  })
})

describe('savingsSummary', () => {
  const fills = [
    fill(40, 70, 1.8, '2025-12-20'),
    fill(40, 70, 1.8, '2026-02-01'),
    fill(40, 73, 1.8, '2026-03-01'),
    fill(40, 70, undefined, '2026-04-01'),
  ]

  it('cumule économies et surcoûts des pleins comparés', () => {
    const summary = savingsSummary(fills)
    expect(summary.total).toBeCloseTo(3)
    expect(summary).toMatchObject({ count: 3, belowAverage: 2 })
  })

  it('se limite aux pleins faits depuis une date', () => {
    const summary = savingsSummary(fills, '2026-01-01')
    expect(summary.total).toBeCloseTo(1)
    expect(summary).toMatchObject({ count: 2, belowAverage: 1 })
  })
})
