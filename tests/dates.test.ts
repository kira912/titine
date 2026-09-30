import { describe, expect, it } from 'vitest'
import { addMonths, addYears, daysBetween, today } from '../shared/dates'

describe('addMonths', () => {
  it('reste dans le mois visé quand le jour n’existe pas', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28')
    expect(addMonths('2024-01-31', 1)).toBe('2024-02-29')
  })

  it('passe les années', () => {
    expect(addMonths('2026-11-15', 3)).toBe('2027-02-15')
    expect(addYears('2024-02-29', 4)).toBe('2028-02-29')
    expect(addYears('2024-02-29', 1)).toBe('2025-02-28')
  })
})

describe('daysBetween', () => {
  it('compte les jours, en négatif pour une date passée', () => {
    expect(daysBetween('2026-09-30', '2026-10-30')).toBe(30)
    expect(daysBetween('2026-09-30', '2026-09-29')).toBe(-1)
    // Changement d'heure : toujours un nombre entier de jours
    expect(daysBetween('2026-03-28', '2026-03-30')).toBe(2)
  })
})

describe('today', () => {
  it('prend la date locale de l’appareil, pas la date UTC', () => {
    expect(today(new Date(2026, 8, 30, 23, 59))).toBe('2026-09-30')
    expect(today(new Date(2026, 9, 1, 0, 1))).toBe('2026-10-01')
  })
})
