import { consumptionSegments, type Segment } from './consumption'
import type { FillUp, IsoDate, Service } from './types'

/**
 * Règles de vraisemblance des badges. Le carnet vit dans le navigateur : rien n'empêche d'en modifier
 * la base à la main, mais ces règles rendent fastidieux le fait de les gagner par de fausses saisies.
 */
export const LIMITS = {
  /** Litres d'un plein, du bidon au réservoir de grand SUV */
  minLiters: 2,
  maxLiters: 150,
  /** Prix au litre payé (€) */
  minPricePerLiter: 0.5,
  maxPricePerLiter: 4,
  /** Écart toléré entre le prix payé et le prix affiché par la station (€/L) : carte de fidélité, arrondis */
  stationPriceTolerance: 0.15,
  /** Tronçon entre deux pleins complets : autonomie maximale d'un réservoir et consommation plausible */
  maxSegmentKm: 1500,
  minConsumption: 2,
  maxConsumption: 30,
  /** Pleins comptés par date de plein, et par jour de saisie */
  perFillDate: 1,
  perEntryDay: 2,
  /** Entretiens comptés par jour de saisie, et délai minimal entre deux réalisations d'un même rappel */
  servicesPerEntryDay: 1,
  sameReminderDays: 30,
} as const

const DAY_MS = 86_400_000

/** Jour de saisie, dans le fuseau de l'appareil ; `null` pour une saisie antérieure à ce suivi */
function entryDay(createdAt: string | undefined): string | null {
  if (!createdAt) return null
  const date = new Date(createdAt)
  if (Number.isNaN(date.getTime())) return null
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

/** Mois réellement vécu d'un plein : celui de sa saisie, ou à défaut sa date (anciens pleins) */
export function entryMonth(fill: Pick<FillUp, 'date' | 'createdAt'>): string {
  return (entryDay(fill.createdAt) ?? fill.date).slice(0, 7)
}

export function isPlausibleFillUp(fill: Pick<FillUp, 'liters' | 'totalPrice'>): boolean {
  if (!(fill.liters >= LIMITS.minLiters && fill.liters <= LIMITS.maxLiters)) return false
  const pricePerLiter = fill.totalPrice / fill.liters
  return pricePerLiter >= LIMITS.minPricePerLiter && pricePerLiter <= LIMITS.maxPricePerLiter
}

/** Le prix payé au litre correspond-il au prix affiché par la station ? (`true` faute de prix connu) */
export function matchesStationPrice(fill: Pick<FillUp, 'liters' | 'totalPrice' | 'station'>): boolean {
  const price = fill.station?.price
  if (!price) return true
  return Math.abs(fill.totalPrice / fill.liters - price) <= LIMITS.stationPriceTolerance + 1e-9
}

/** Garde au plus `max` éléments par clé, dans l'ordre reçu ; les éléments sans clé passent tous */
function capPerKey<T>(items: T[], key: (item: T) => string | null, max: number): T[] {
  const seen = new Map<string, number>()
  return items.filter((item) => {
    const k = key(item)
    if (k === null) return true
    const n = seen.get(k) ?? 0
    if (n >= max) return false
    seen.set(k, n + 1)
    return true
  })
}

/** Pleins qui comptent pour les badges : vraisemblables, un par date, deux saisis par jour au plus */
export function countedFillUps(fillUps: FillUp[]): FillUp[] {
  const sorted = [...fillUps].sort((a, b) => a.odometer - b.odometer)
  const plausible = sorted.filter(isPlausibleFillUp)
  const oncePerDate = capPerKey(plausible, fill => fill.date, LIMITS.perFillDate)
  return capPerKey(oncePerDate, fill => entryDay(fill.createdAt), LIMITS.perEntryDay)
}

/** Tronçons qui comptent : vraisemblables, et terminés par un plein qui compte */
export function countedSegments(fillUps: FillUp[]): Segment[] {
  const ends = new Set(countedFillUps(fillUps).map(fill => fill.odometer))
  return consumptionSegments(fillUps).filter(segment =>
    ends.has(segment.odometer)
    && segment.distance <= LIMITS.maxSegmentKm
    && segment.consumption >= LIMITS.minConsumption
    && segment.consumption <= LIMITS.maxConsumption)
}

const daysBetween = (a: IsoDate, b: IsoDate) => Math.abs(Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / DAY_MS

/** Entretiens qui comptent : un saisi par jour, et pas deux fois le même rappel en moins de 30 jours */
export function countedServices(services: Service[]): Service[] {
  const sorted = [...services].sort((a, b) => a.date.localeCompare(b.date))
  const lastByReminder = new Map<number, IsoDate>()
  const spaced = sorted.filter((service) => {
    if (service.reminderId === null) return true
    const last = lastByReminder.get(service.reminderId)
    if (last && daysBetween(last, service.date) < LIMITS.sameReminderDays) return false
    lastByReminder.set(service.reminderId, service.date)
    return true
  })
  return capPerKey(spaced, service => entryDay(service.createdAt), LIMITS.servicesPerEntryDay)
}
