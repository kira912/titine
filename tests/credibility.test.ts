import { describe, expect, it } from 'vitest'
import { countedFillUps, countedSegments, countedServices, isPlausibleFillUp, matchesStationPrice } from '../shared/credibility'
import type { FillUp, Service } from '../shared/types'

const fill = (over: Partial<FillUp> = {}): FillUp =>
  ({ vehicleId: 1, date: '2026-01-01', odometer: 10_000, liters: 40, totalPrice: 72, full: true, ...over })

describe('isPlausibleFillUp', () => {
  it('écarte les volumes et prix au litre invraisemblables', () => {
    expect(isPlausibleFillUp(fill())).toBe(true)
    expect(isPlausibleFillUp(fill({ liters: 1, totalPrice: 1.8 }))).toBe(false)
    expect(isPlausibleFillUp(fill({ liters: 400, totalPrice: 720 }))).toBe(false)
    expect(isPlausibleFillUp(fill({ totalPrice: 4 }))).toBe(false)
    expect(isPlausibleFillUp(fill({ totalPrice: 400 }))).toBe(false)
  })
})

describe('matchesStationPrice', () => {
  const station = { id: 1, address: '', city: 'Lyon', price: 1.8, localAverage: 1.9 }

  it('tolère un écart de quelques centimes avec le prix affiché', () => {
    expect(matchesStationPrice(fill({ station, totalPrice: 40 * 1.7 }))).toBe(true)
    expect(matchesStationPrice(fill({ station, totalPrice: 40 * 1.6 }))).toBe(false)
  })

  it('accepte faute de prix affiché connu', () => {
    expect(matchesStationPrice(fill({ station: { ...station, price: null } }))).toBe(true)
  })
})

describe('countedFillUps', () => {
  it('ne compte qu’un plein par date', () => {
    const fills = [fill({ odometer: 1 }), fill({ odometer: 2 }), fill({ odometer: 3, date: '2026-01-02' })]
    expect(countedFillUps(fills)).toHaveLength(2)
  })

  it('ne compte que deux pleins saisis le même jour, même antidatés', () => {
    const createdAt = '2026-03-10T12:00:00'
    const fills = ['2026-01-01', '2026-01-08', '2026-01-15', '2026-01-22'].map((date, i) => fill({ date, odometer: i * 500, createdAt }))
    expect(countedFillUps(fills)).toHaveLength(2)
  })

  it('compte tous les anciens pleins, saisis avant ce suivi', () => {
    const fills = ['2026-01-01', '2026-01-08', '2026-01-15'].map((date, i) => fill({ date, odometer: i * 500 }))
    expect(countedFillUps(fills)).toHaveLength(3)
  })
})

describe('countedSegments', () => {
  it('écarte les sauts de compteur et les consommations invraisemblables', () => {
    const fills = [
      fill({ date: '2026-01-01', odometer: 0 }),
      fill({ date: '2026-01-02', odometer: 600, liters: 36, totalPrice: 65 }), // 6 L/100 : compté
      fill({ date: '2026-01-03', odometer: 10_600, liters: 40 }), // 10 000 km : écarté
      fill({ date: '2026-01-04', odometer: 10_700, liters: 40 }), // 40 L/100 : écarté
    ]
    expect(countedSegments(fills).map(s => s.odometer)).toEqual([600])
  })
})

describe('countedServices', () => {
  const service = (over: Partial<Service>): Service =>
    ({ vehicleId: 1, reminderId: 1, label: 'Vidange', date: '2026-01-01', odometer: 0, cost: null, ...over })

  it('ne compte pas deux fois le même rappel en moins de 30 jours', () => {
    const services = [service({ date: '2026-01-01' }), service({ date: '2026-01-10' }), service({ date: '2026-02-15' })]
    expect(countedServices(services).map(s => s.date)).toEqual(['2026-01-01', '2026-02-15'])
  })

  it('ne compte qu’un entretien saisi par jour', () => {
    const createdAt = '2026-03-10T12:00:00'
    const services = [1, 2, 3].map(reminderId => service({ reminderId, createdAt }))
    expect(countedServices(services)).toHaveLength(1)
  })
})
