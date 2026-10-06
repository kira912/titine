import { describe, expect, it } from 'vitest'
import { estimateOdometer } from '../shared/estimate'

describe('estimateOdometer', () => {
  const fills = [
    { date: '2026-01-01', odometer: 10_000 },
    { date: '2026-01-31', odometer: 11_500 }, // 50 km/jour
  ]

  it('prolonge le rythme de roulage depuis le dernier plein', () => {
    expect(estimateOdometer(fills, 11_500, '2026-02-10')).toBe(12_000)
  })

  it('arrondit à la centaine', () => {
    expect(estimateOdometer(fills, 11_500, '2026-02-01')).toBe(11_600)
  })

  it('ne descend jamais sous le kilométrage connu du véhicule', () => {
    expect(estimateOdometer(fills, 13_000, '2026-02-01')).toBe(13_000)
  })

  it('renonce sans historique suffisant', () => {
    expect(estimateOdometer([], 10_000, '2026-02-01')).toBeNull()
    expect(estimateOdometer([fills[0]!], 10_000, '2026-02-01')).toBeNull()
    expect(estimateOdometer([{ date: '2026-01-25', odometer: 10_000 }, { date: '2026-01-31', odometer: 10_400 }], 10_400, '2026-02-01')).toBeNull()
  })

  it('ignore les pleins de plus d’un an', () => {
    expect(estimateOdometer([{ date: '2024-01-01', odometer: 1_000 }, ...fills], 11_500, '2026-02-10')).toBe(12_000)
  })
})
