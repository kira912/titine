import { consumptionSegments } from './consumption'
import { fillUpSaving, savingsSummary, type SavingsSummary } from './savings'
import type { FillUp, FillUpStation, IsoDate, Service } from './types'

export interface YearRecap {
  year: number
  fillUps: number
  liters: number
  /** Dépense en carburant */
  fuelCost: number
  /** Prix moyen payé au litre */
  pricePerLiter: number | null
  /** Distance des tronçons de consommation terminés dans l'année */
  distance: number
  consumption: number | null
  costPerKm: number | null
  savings: SavingsSummary
  /** Station la plus fréquentée (au moins 2 pleins) */
  favoriteStation: { station: FillUpStation, visits: number } | null
  /** Plein payé le plus en dessous de la moyenne du coin */
  bestFillUp: { date: IsoDate, saving: number, station: FillUpStation } | null
  /** Mois où le carburant a coûté le plus cher (1 à 12) */
  priciestMonth: { month: number, cost: number } | null
  services: number
  serviceCost: number
}

const yearOf = (date: IsoDate) => Number(date.slice(0, 4))

/** Années ayant au moins un plein ou un entretien, la plus récente d'abord */
export function recapYears(fillUps: Pick<FillUp, 'date'>[], services: Pick<Service, 'date'>[]): number[] {
  return [...new Set([...fillUps, ...services].map(item => yearOf(item.date)))].sort((a, b) => b - a)
}

export function yearRecap(allFillUps: FillUp[], allServices: Service[], year: number): YearRecap {
  const fillUps = allFillUps.filter(fill => yearOf(fill.date) === year)
  const services = allServices.filter(service => yearOf(service.date) === year)
  // Les tronçons s'appuient sur le plein précédent, qui peut dater de l'année d'avant
  const segments = consumptionSegments(allFillUps).filter(segment => yearOf(segment.date) === year)

  const liters = fillUps.reduce((sum, fill) => sum + fill.liters, 0)
  const fuelCost = fillUps.reduce((sum, fill) => sum + fill.totalPrice, 0)
  const distance = segments.reduce((sum, s) => sum + s.distance, 0)
  const segmentLiters = segments.reduce((sum, s) => sum + s.liters, 0)
  const segmentCost = segments.reduce((sum, s) => sum + s.cost, 0)

  const visits = new Map<number, { station: FillUpStation, visits: number }>()
  for (const fill of fillUps) {
    if (!fill.station) continue
    const entry = visits.get(fill.station.id) ?? { station: fill.station, visits: 0 }
    entry.visits++
    visits.set(fill.station.id, entry)
  }
  const favorite = [...visits.values()].sort((a, b) => b.visits - a.visits)[0]

  let bestFillUp: YearRecap['bestFillUp'] = null
  for (const fill of fillUps) {
    const saving = fillUpSaving(fill)
    if (saving !== null && saving > 0 && fill.station && saving > (bestFillUp?.saving ?? 0)) {
      bestFillUp = { date: fill.date, saving, station: fill.station }
    }
  }

  const byMonth = new Map<number, number>()
  for (const fill of fillUps) {
    const month = Number(fill.date.slice(5, 7))
    byMonth.set(month, (byMonth.get(month) ?? 0) + fill.totalPrice)
  }
  const [priciest] = [...byMonth].sort((a, b) => b[1] - a[1])

  return {
    year,
    fillUps: fillUps.length,
    liters,
    fuelCost,
    pricePerLiter: liters > 0 ? fuelCost / liters : null,
    distance,
    consumption: distance > 0 ? (segmentLiters / distance) * 100 : null,
    costPerKm: distance > 0 ? segmentCost / distance : null,
    savings: savingsSummary(fillUps),
    favoriteStation: favorite && favorite.visits >= 2 ? favorite : null,
    bestFillUp,
    priciestMonth: priciest ? { month: priciest[0], cost: priciest[1] } : null,
    services: services.length,
    serviceCost: services.reduce((sum, service) => sum + (service.cost ?? 0), 0),
  }
}
