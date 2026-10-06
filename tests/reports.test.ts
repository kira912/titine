import { describe, expect, it } from 'vitest'
import { parseReport } from '../shared/reports'

describe('parseReport', () => {
  it('exige un carburant pour un prix faux ou une rupture', () => {
    expect(parseReport({ kind: 'prix-incorrect', fuel: 'gazole' })).toEqual({ kind: 'prix-incorrect', fuel: 'gazole' })
    expect(parseReport({ kind: 'rupture' })).toBeNull()
    expect(parseReport({ kind: 'rupture', fuel: 'kérosène' })).toBeNull()
  })

  it('ignore le carburant d’une fermeture', () => {
    expect(parseReport({ kind: 'station-fermee', fuel: 'gazole' })).toEqual({ kind: 'station-fermee', fuel: null })
  })

  it('refuse les types inconnus et les corps invalides', () => {
    expect(parseReport({ kind: 'avis', fuel: 'gazole' })).toBeNull()
    expect(parseReport(null)).toBeNull()
    expect(parseReport('station-fermee')).toBeNull()
  })
})
