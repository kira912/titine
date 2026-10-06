import { describe, expect, it } from 'vitest'
import { achievements, longestFrugalRun, longestMonthStreak, newlyUnlocked } from '../shared/achievements'
import type { FillUp } from '../shared/types'

const fill = (odometer: number, liters: number, date = '2026-01-01', localAverage?: number): FillUp => ({
  vehicleId: 1,
  date,
  odometer,
  liters,
  totalPrice: liters * 1.8,
  full: true,
  station: localAverage ? { id: 1, address: '', city: 'Lyon', localAverage } : undefined,
})

const find = (list: ReturnType<typeof achievements>, id: string) => list.find(a => a.id === id)!

describe('longestMonthStreak', () => {
  it('compte les mois consécutifs, y compris d’une année sur l’autre', () => {
    const dates = ['2025-11-03', '2025-12-20', '2025-12-28', '2026-01-15', '2026-03-01']
    expect(longestMonthStreak(dates.map(date => ({ date })))).toBe(3)
  })

  it('vaut 0 sans plein', () => {
    expect(longestMonthStreak([])).toBe(0)
  })
})

describe('longestFrugalRun', () => {
  it('compte les tronçons d’affilée sous la consommation moyenne', () => {
    // Tronçons de 500 km : 10, 5, 5, 5, 10 L/100 → moyenne 7
    const fills = [fill(0, 40), fill(500, 50), fill(1_000, 25), fill(1_500, 25), fill(2_000, 25), fill(2_500, 50)]
    expect(longestFrugalRun(fills)).toBe(3)
  })
})

describe('achievements', () => {
  it('suit la progression et débloque à l’objectif', () => {
    const list = achievements({ fillUps: [fill(0, 40)], services: [] })
    expect(find(list, 'premier-plein')).toMatchObject({ current: 1, unlocked: true })
    expect(find(list, 'carnet-tenu')).toMatchObject({ current: 1, target: 10, unlocked: false })
  })

  it('compte les pleins payés sous la moyenne du coin', () => {
    const fills = [1, 2, 3, 4, 5].map(i => fill(i * 500, 40, '2026-01-01', 1.9))
    expect(find(achievements({ fillUps: fills, services: [] }), 'chasseur-de-prix').unlocked).toBe(true)
  })

  it('plafonne la progression à l’objectif', () => {
    const fills = Array.from({ length: 12 }, (_, i) => fill(i * 500, 40))
    expect(find(achievements({ fillUps: fills, services: [] }), 'carnet-tenu').current).toBe(10)
  })
})

describe('newlyUnlocked', () => {
  it('ne renvoie que les badges débloqués entre deux états', () => {
    const before = achievements({ fillUps: [], services: [] })
    const after = achievements({ fillUps: [fill(0, 40)], services: [] })
    expect(newlyUnlocked(before, after).map(a => a.id)).toEqual(['premier-plein'])
    expect(newlyUnlocked(after, after)).toEqual([])
  })
})
