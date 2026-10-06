import { describe, expect, it } from 'vitest'
import { formatCity, isFeedComplete, parseFeedRecord } from '../server/lib/feed'

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
  services_service: ['Station de gonflage', 'Lavage manuel', 'Lavage automatique', 'Relais colis', 'Toilettes publiques'],
  sp95_rupture_type: 'temporaire',
  sp95_rupture_debut: '2026-09-30T06:00:00+00:00',
  gplc_rupture_type: 'definitive',
  gplc_rupture_debut: '2017-09-01T05:18:24+00:00',
  e85_rupture_type: 'temporaire',
  e85_rupture_debut: null,
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

  it('ne garde que les services reconnus, sans doublon', () => {
    expect(parseFeedRecord(record)!.services).toEqual(['gonflage', 'lavage', 'toilettes'])
    expect(parseFeedRecord({ ...record, services_service: null })!.services).toEqual([])
  })

  it('ne garde que les ruptures temporaires datées', () => {
    expect(parseFeedRecord(record)!.shortages).toEqual([{ fuel: 'sp95', since: new Date('2026-09-30T06:00:00Z') }])
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

describe('isFeedComplete', () => {
  it('accepte un flux complet, premier import compris', () => {
    expect(isFeedComplete(9_800, 0)).toBe(true)
    expect(isFeedComplete(9_800, 9_840)).toBe(true)
  })

  it('refuse un flux tronqué, même au-dessus du plancher absolu', () => {
    expect(isFeedComplete(6_000, 9_840)).toBe(false)
    expect(isFeedComplete(4_000, 0)).toBe(false)
  })
})
