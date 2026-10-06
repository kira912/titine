import { describe, expect, it } from 'vitest'
import { achievements, longestFrugalRun, longestMonthStreak, newlyUnlocked } from '../shared/achievements'
import type { FillUp } from '../shared/types'

// Une date par plein (tous les 500 km) : un seul plein compte par date
const fill = (odometer: number, liters: number, date = `2026-01-${String(odometer / 500 + 1).padStart(2, '0')}`, localAverage?: number): FillUp => ({
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
    const fills = [1, 2, 3, 4, 5].map(i => fill(i * 500, 40, undefined, 1.9))
    expect(find(achievements({ fillUps: fills, services: [] }), 'chasseur-de-prix').unlocked).toBe(true)
  })

  it('plafonne la progression à l’objectif', () => {
    const fills = Array.from({ length: 12 }, (_, i) => fill(i * 500, 40))
    expect(find(achievements({ fillUps: fills, services: [] }), 'carnet-tenu').current).toBe(10)
  })
})

describe('saisies abusives', () => {
  const createdAt = '2026-03-10T12:00:00'

  it('ne débloque pas « Carnet tenu » avec dix pleins saisis d’un coup', () => {
    const fills = Array.from({ length: 10 }, (_, i) => ({ ...fill(i * 500, 30), createdAt }))
    expect(find(achievements({ fillUps: fills, services: [] }), 'carnet-tenu').current).toBe(2)
  })

  it('ne débloque pas la série de six mois avec des pleins antidatés', () => {
    const fills = Array.from({ length: 6 }, (_, i) => ({ ...fill(i * 500, 30, `2025-${String(i + 7).padStart(2, '0')}-01`), createdAt }))
    expect(find(achievements({ fillUps: fills, services: [] }), 'serie').current).toBe(1)
  })

  it('ne compte pas les kilomètres d’un saut de compteur', () => {
    const fills = [fill(0, 40, '2026-01-01'), fill(10_000, 40, '2026-01-02')]
    expect(find(achievements({ fillUps: fills, services: [] }), 'grand-rouleur').current).toBe(0)
  })

  it('ne compte pas l’économie d’un prix payé très inférieur au prix affiché', () => {
    const station = { id: 1, address: '', city: 'Lyon', price: 1.8, localAverage: 1.9 }
    const fills = [{ ...fill(0, 40), totalPrice: 40, station }]
    expect(find(achievements({ fillUps: fills, services: [] }), 'cagnotte').current).toBe(0)
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
