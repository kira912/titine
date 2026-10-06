import { isPlausibleFillUp, matchesStationPrice } from './credibility'
import type { FillUp, IsoDate } from './types'

/**
 * Économie d'un plein par rapport au prix moyen autour de la station le jour du plein :
 * positive si le plein a coûté moins cher que la moyenne, négative s'il a coûté plus cher.
 * `null` si le plein n'est rattaché à aucune moyenne, ou si le prix saisi est invraisemblable
 * (très éloigné du prix affiché par la station) : une faute de frappe ne doit pas passer pour une économie.
 */
export function fillUpSaving(fill: Pick<FillUp, 'liters' | 'totalPrice' | 'station'>): number | null {
  const average = fill.station?.localAverage
  if (!average || !isPlausibleFillUp(fill) || !matchesStationPrice(fill)) return null
  return average * fill.liters - fill.totalPrice
}

export interface SavingsSummary {
  /** Somme des économies (les surcoûts viennent en déduction) */
  total: number
  /** Pleins comparés à la moyenne locale */
  count: number
  /** Pleins payés moins cher que la moyenne */
  belowAverage: number
}

/** Économies cumulées des pleins faits depuis `since` (inclus), ou depuis toujours */
export function savingsSummary(fillUps: FillUp[], since?: IsoDate): SavingsSummary {
  const summary: SavingsSummary = { total: 0, count: 0, belowAverage: 0 }
  for (const fill of fillUps) {
    if (since && fill.date < since) continue
    const saving = fillUpSaving(fill)
    if (saving === null) continue
    summary.total += saving
    summary.count++
    if (saving > 0) summary.belowAverage++
  }
  return summary
}
