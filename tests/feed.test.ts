import { describe, expect, it } from 'vitest'
import { formatCity, parseFeedRecord } from '../server/lib/feed'

const record = {
  id: 75011003,
  adresse: ' 12 Boulevard Voltaire ',
  ville: 'PARIS',
  cp: '75011',
  code_departement: '75',
  geom: { lat: 48.8631, lon: 2.3708 },
  horaires_automate_24_24: 'Oui',
  gazole_prix: 1.689,
  gazole_maj: '2026-09-30T08:12:00+02:00',
  e10_prix: 1.749,
  e10_maj: '2026-09-29T19:40:00+02:00',
  sp95_prix: null,
  sp95_maj: null,
  sp98_prix: 0,
  sp98_maj: '2026-09-29T19:40:00+02:00',
  e85_prix: 0.789,
  e85_maj: 'pas une date',
}

describe('parseFeedRecord', () => {
  it('extrait la station et ses prix valides', () => {
    const station = parseFeedRecord(record)
    expect(station).toMatchObject({
      id: 75011003,
      lat: 48.8631,
      lon: 2.3708,
      address: '12 Boulevard Voltaire',
      city: 'Paris',
      citySlug: 'paris-75',
      postalCode: '75011',
      department: '75',
      alwaysOpen: true,
    })
    expect(station!.prices.map(p => p.fuel)).toEqual(['gazole', 'e10'])
    expect(station!.prices[0]!.updatedAt.toISOString()).toBe('2026-09-30T06:12:00.000Z')
  })

  it('déduit le département du code postal, outre-mer compris', () => {
    expect(parseFeedRecord({ ...record, code_departement: null })!.department).toBe('75')
    expect(parseFeedRecord({ ...record, code_departement: null, cp: '97400', ville: 'Saint-Denis' })!.citySlug).toBe('saint-denis-974')
  })

  it('écarte les stations sans position, sans ville ou sans code postal', () => {
    expect(parseFeedRecord({ ...record, geom: null })).toBeNull()
    expect(parseFeedRecord({ ...record, geom: { lat: 'x', lon: 2 } })).toBeNull()
    expect(parseFeedRecord({ ...record, ville: ' ' })).toBeNull()
    expect(parseFeedRecord({ ...record, cp: null })).toBeNull()
    expect(parseFeedRecord({ ...record, id: 'abc' })).toBeNull()
  })
})

describe('formatCity', () => {
  it('harmonise les noms tout en capitales ou tout en minuscules', () => {
    expect(formatCity('SAINT-JEAN-D\'ANGÉLY')).toBe('Saint-Jean-D\'Angély')
    expect(formatCity('le mans')).toBe('Le Mans')
  })

  it('ne touche pas à une casse déjà mixte', () => {
    expect(formatCity('Aix-en-Provence')).toBe('Aix-en-Provence')
  })
})
