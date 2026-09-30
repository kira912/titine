import { describe, expect, it } from 'vitest'
import { consumptionSegments, fuelStats, odometerConflict } from '../shared/consumption'
import type { FillUp } from '../shared/types'

const fill = (odometer: number, liters: number, totalPrice: number, full = true, date = '2026-01-01'): FillUp =>
  ({ vehicleId: 1, date, odometer, liters, totalPrice, full })

describe('consumptionSegments', () => {
  it('ne calcule rien avec un seul plein', () => {
    expect(consumptionSegments([fill(10_000, 40, 70)])).toEqual([])
  })

  it('rapporte les litres remis à la distance depuis le plein précédent', () => {
    const [segment] = consumptionSegments([fill(10_000, 40, 70), fill(10_500, 30, 54)])
    expect(segment).toMatchObject({ odometer: 10_500, distance: 500, liters: 30, cost: 54 })
    expect(segment!.consumption).toBeCloseTo(6)
    expect(segment!.costPerKm).toBeCloseTo(0.108)
  })

  it('cumule les pleins partiels jusqu’au plein complet suivant', () => {
    const segments = consumptionSegments([fill(10_000, 40, 70), fill(10_300, 10, 18, false), fill(10_800, 38, 66)])
    expect(segments).toHaveLength(1)
    expect(segments[0]).toMatchObject({ distance: 800, liters: 48, cost: 84 })
    expect(segments[0]!.consumption).toBeCloseTo(6)
  })

  it('ignore les pleins partiels antérieurs au premier plein complet', () => {
    const segments = consumptionSegments([fill(9_800, 15, 27, false), fill(10_000, 40, 70), fill(10_500, 30, 54)])
    expect(segments).toHaveLength(1)
    expect(segments[0]!.liters).toBe(30)
  })

  it('trie par kilométrage, quel que soit l’ordre de saisie', () => {
    const segments = consumptionSegments([fill(11_000, 35, 60), fill(10_000, 40, 70), fill(10_500, 30, 54)])
    expect(segments.map(s => s.odometer)).toEqual([10_500, 11_000])
  })
})

describe('fuelStats', () => {
  it('renvoie des moyennes nulles tant qu’aucun tronçon n’est connu', () => {
    expect(fuelStats([fill(10_000, 40, 70)])).toMatchObject({ consumption: null, costPerKm: null, distance: 0 })
  })

  it('pondère la moyenne par la distance', () => {
    const stats = fuelStats([fill(10_000, 40, 70), fill(10_200, 20, 36), fill(11_000, 40, 72)])
    expect(stats.distance).toBe(1000)
    expect(stats.consumption).toBeCloseTo(6)
    expect(stats.costPerKm).toBeCloseTo(0.108)
  })
})

describe('odometerConflict', () => {
  const existing = [fill(10_000, 40, 70, true, '2026-03-01'), fill(10_600, 35, 62, true, '2026-04-01')]

  it('accepte un kilométrage qui progresse avec les dates', () => {
    expect(odometerConflict(existing, { date: '2026-05-01', odometer: 11_200 })).toBeNull()
    expect(odometerConflict(existing, { date: '2026-03-15', odometer: 10_300 })).toBeNull()
    expect(odometerConflict(existing, { date: '2026-04-01', odometer: 10_900 })).toBeNull()
  })

  it('refuse un kilométrage inférieur à un plein plus ancien', () => {
    expect(odometerConflict(existing, { date: '2026-05-01', odometer: 10_500 })?.odometer).toBe(10_600)
  })

  it('refuse un kilométrage supérieur à un plein plus récent', () => {
    expect(odometerConflict(existing, { date: '2026-02-01', odometer: 10_100 })?.odometer).toBe(10_000)
  })

  it('refuse un doublon', () => {
    expect(odometerConflict(existing, { date: '2026-04-01', odometer: 10_600 })).not.toBeNull()
  })
})
