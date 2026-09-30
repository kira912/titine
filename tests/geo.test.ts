import { describe, expect, it } from 'vitest'
import { boundingBox, citySlug, haversineKm, slugify } from '../shared/geo'

describe('haversineKm', () => {
  it('donne la distance à vol d’oiseau', () => {
    // Paris (Notre-Dame) → Lyon (Bellecour) : environ 392 km
    expect(haversineKm(48.853, 2.3499, 45.7578, 4.832)).toBeCloseTo(392, -1)
    expect(haversineKm(48.853, 2.3499, 48.853, 2.3499)).toBe(0)
  })
})

describe('boundingBox', () => {
  it('englobe tous les points du cercle', () => {
    const box = boundingBox(48.85, 2.35, 10)
    for (const [lat, lon] of [[box.minLat, 2.35], [box.maxLat, 2.35], [48.85, box.minLon], [48.85, box.maxLon]] as const) {
      expect(haversineKm(48.85, 2.35, lat, lon)).toBeGreaterThanOrEqual(9.95)
    }
    expect(box.maxLon - box.minLon).toBeGreaterThan(box.maxLat - box.minLat)
  })
})

describe('slugs', () => {
  it('retire accents, apostrophes et espaces', () => {
    expect(slugify('L\'Haÿ-les-Roses')).toBe('l-hay-les-roses')
    expect(slugify('  Saint-Étienne  ')).toBe('saint-etienne')
  })

  it('distingue les communes homonymes par le département', () => {
    expect(citySlug('Saint-Denis', '93')).toBe('saint-denis-93')
    expect(citySlug('Saint-Denis', '974')).toBe('saint-denis-974')
  })
})
