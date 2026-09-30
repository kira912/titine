import type { FillUp, IsoDate } from './types'

/** Tronçon entre deux pleins complets : la seule base fiable pour une consommation */
export interface Segment {
  date: IsoDate
  odometer: number
  distance: number
  liters: number
  cost: number
  /** L/100 km */
  consumption: number
  /** € / km */
  costPerKm: number
}

export interface FuelStats {
  consumption: number | null
  costPerKm: number | null
  distance: number
  liters: number
  cost: number
}

/**
 * Méthode « plein à plein » : les litres remis entre deux pleins complets correspondent
 * à ce qui a été consommé sur la distance. Les pleins partiels sont cumulés jusqu'au plein complet suivant.
 */
export function consumptionSegments(fillUps: FillUp[]): Segment[] {
  const sorted = [...fillUps].sort((a, b) => a.odometer - b.odometer)
  const segments: Segment[] = []
  let anchor: number | null = null
  let liters = 0
  let cost = 0

  for (const fill of sorted) {
    if (anchor === null) {
      if (fill.full) anchor = fill.odometer
      continue
    }
    liters += fill.liters
    cost += fill.totalPrice
    if (!fill.full) continue

    const distance = fill.odometer - anchor
    if (distance > 0) {
      segments.push({
        date: fill.date,
        odometer: fill.odometer,
        distance,
        liters,
        cost,
        consumption: (liters / distance) * 100,
        costPerKm: cost / distance,
      })
    }
    anchor = fill.odometer
    liters = 0
    cost = 0
  }
  return segments
}

export function fuelStats(fillUps: FillUp[]): FuelStats {
  const segments = consumptionSegments(fillUps)
  const distance = segments.reduce((sum, s) => sum + s.distance, 0)
  const liters = segments.reduce((sum, s) => sum + s.liters, 0)
  const cost = segments.reduce((sum, s) => sum + s.cost, 0)
  return {
    consumption: distance > 0 ? (liters / distance) * 100 : null,
    costPerKm: distance > 0 ? cost / distance : null,
    distance,
    liters,
    cost,
  }
}

/**
 * Le kilométrage doit progresser avec les dates : renvoie le plein existant
 * que contredit la saisie, ou `null` si elle est cohérente.
 */
export function odometerConflict(fillUps: FillUp[], candidate: Pick<FillUp, 'date' | 'odometer'>): FillUp | null {
  return fillUps.find(fill =>
    (fill.date < candidate.date && fill.odometer >= candidate.odometer)
    || (fill.date > candidate.date && fill.odometer <= candidate.odometer)
    || (fill.date === candidate.date && fill.odometer === candidate.odometer),
  ) ?? null
}
