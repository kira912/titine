import { fuelStats } from './consumption'
import { isPlausibleFillUp } from './credibility'
import type { FillUp } from './types'

/** Les distances des stations sont à vol d'oiseau : la route est en moyenne 30 % plus longue */
export const ROAD_FACTOR = 1.3
/** Sans carnet : un plein et une consommation typiques d'une citadine */
export const DEFAULT_PROFILE = { liters: 40, consumption: 6.5, estimated: true } as const
const RECENT_FILL_UPS = 5

export interface DriverProfile {
  /** Litres d'un plein habituel */
  liters: number
  /** L/100 km */
  consumption: number
  /** Vrai si l'une des deux valeurs est une estimation par défaut */
  estimated: boolean
}

/** Plein habituel et consommation réelle tirés du carnet, une valeur par défaut pour ce qui manque */
export function driverProfile(fillUps: FillUp[]): DriverProfile {
  const recent = fillUps.filter(fill => fill.full && isPlausibleFillUp(fill)).slice(-RECENT_FILL_UPS)
  const liters = recent.length ? recent.reduce((sum, fill) => sum + fill.liters, 0) / recent.length : null
  const { consumption } = fuelStats(fillUps)
  return {
    liters: liters ?? DEFAULT_PROFILE.liters,
    consumption: consumption ?? DEFAULT_PROFILE.consumption,
    estimated: liters === null || consumption === null,
  }
}

export interface TripCost {
  /** Prix du plein à la pompe */
  fill: number
  /** Carburant brûlé pour l'aller-retour jusqu'à la station */
  trip: number
  total: number
}

/** Coût réel d'un plein dans une station : le plein, plus l'aller-retour depuis sa position */
export function tripCost(station: { price: number, distanceKm: number }, profile: Pick<DriverProfile, 'liters' | 'consumption'>): TripCost {
  const fill = profile.liters * station.price
  const trip = 2 * station.distanceKm * ROAD_FACTOR * (profile.consumption / 100) * station.price
  return { fill, trip, total: fill + trip }
}

/**
 * Station la plus rentable, trajet compris, comparée à la moins chère au litre (la première de la liste) :
 * `null` si c'est la même, ou si l'écart est inférieur à 10 centimes.
 */
export function betterDeal<T extends { price: number, distanceKm: number }>(stations: T[], profile: Pick<DriverProfile, 'liters' | 'consumption'>) {
  const cheapest = stations[0]
  if (!cheapest) return null
  const costs = stations.map(station => ({ station, cost: tripCost(station, profile) }))
  const best = costs.reduce((a, b) => (b.cost.total < a.cost.total ? b : a))
  const gain = costs[0]!.cost.total - best.cost.total
  return best.station === cheapest || gain < 0.1 ? null : { station: best.station, cost: best.cost, cheapest: costs[0]!, gain }
}
