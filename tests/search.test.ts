import { describe, expect, it } from 'vitest'
import { searchTerms } from '../shared/search'

describe('searchTerms', () => {
  it('retire accents, casse et ponctuation', () => {
    expect(searchTerms('  Saint-Étienne, 42000 ')).toEqual(['saint', 'etienne', '42000'])
    expect(searchTerms('Rue de l\'Église')).toEqual(['rue', 'de', 'l', 'eglise'])
  })

  it('dédoublonne et limite le nombre de mots', () => {
    expect(searchTerms('paris paris')).toEqual(['paris'])
    expect(searchTerms('a b c d e f g')).toHaveLength(5)
  })

  it('ignore une saisie trop courte ou vide', () => {
    expect(searchTerms('')).toEqual([])
    expect(searchTerms('x')).toEqual([])
    expect(searchTerms(' - ')).toEqual([])
  })
})
