import { daysBetween } from './dates'
import type { FillUp, IsoDate } from './types'

// Rythme calculé sur la dernière année, et seulement s'il couvre assez de jours pour être stable
const WINDOW_DAYS = 365
const MIN_SPAN_DAYS = 14

/**
 * Kilométrage probable à `date`, d'après le rythme de roulage entre les pleins de la dernière année.
 * Arrondi à la centaine : c'est une aide à la saisie, l'utilisateur corrige les derniers chiffres.
 * `null` sans historique suffisant.
 */
export function estimateOdometer(fillUps: Pick<FillUp, 'date' | 'odometer'>[], knownOdometer: number, date: IsoDate): number | null {
  const recent = fillUps
    .filter(fill => fill.date <= date && daysBetween(fill.date, date) <= WINDOW_DAYS)
    .sort((a, b) => a.odometer - b.odometer)
  const first = recent[0]
  const last = recent.at(-1)
  if (!first || !last) return null

  const span = daysBetween(first.date, last.date)
  if (span < MIN_SPAN_DAYS) return null

  const kmPerDay = (last.odometer - first.odometer) / span
  const estimate = last.odometer + kmPerDay * daysBetween(last.date, date)
  return Math.round(Math.max(estimate, knownOdometer) / 100) * 100
}
