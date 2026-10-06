import { and, arrayContains, avg, between, count, desc, eq, gte, max, min, ne } from 'drizzle-orm'
import type { Fuel } from '../../shared/fuel'
import type { ServiceId } from '../../shared/services'
import { boundingBox, haversineKm } from '../../shared/geo'
import type { StationDetail } from '../../shared/types'

// Au-delà, le prix n'est plus relevé par la station (souvent fermée) : on ne l'affiche pas
const MAX_PRICE_AGE_DAYS = 30

const freshSince = () => new Date(Date.now() - MAX_PRICE_AGE_DAYS * 86_400_000)

interface AreaQuery {
  lat: number
  lon: number
  radiusKm: number
  fuel: Fuel
}

interface NearbyQuery extends AreaQuery {
  limit: number
  /** Services que la station doit tous proposer */
  services?: ServiceId[]
}

/** Prix récents de ce carburant dans le rayon, avec la distance au centre */
async function pricesInRadius({ lat, lon, radiusKm, fuel, services = [] }: Omit<NearbyQuery, 'limit'>) {
  const db = await useDb()
  const { stations, stationPrices } = schema
  const box = boundingBox(lat, lon, radiusKm)

  const rows = await db
    .select({
      id: stations.id,
      lat: stations.lat,
      lon: stations.lon,
      address: stations.address,
      city: stations.city,
      postalCode: stations.postalCode,
      alwaysOpen: stations.alwaysOpen,
      services: stations.services,
      price: stationPrices.price,
      updatedAt: stationPrices.updatedAt,
    })
    .from(stationPrices)
    .innerJoin(stations, eq(stations.id, stationPrices.stationId))
    .where(and(
      eq(stationPrices.fuel, fuel),
      gte(stationPrices.updatedAt, freshSince()),
      between(stations.lat, box.minLat, box.maxLat),
      between(stations.lon, box.minLon, box.maxLon),
      services.length ? arrayContains(stations.services, services) : undefined,
    ))

  return rows
    .map(row => ({ ...row, distanceKm: haversineKm(lat, lon, row.lat, row.lon) }))
    .filter(row => row.distanceKm <= radiusKm)
}

/** Stations vendant ce carburant dans le rayon, de la moins chère à la plus chère */
export async function cheapestStations({ limit, ...query }: NearbyQuery) {
  const rows = (await pricesInRadius(query))
    .sort((a, b) => a.price - b.price || a.distanceKm - b.distanceKm)
    .slice(0, limit)
  const reports = await reportCounts(rows.map(row => row.id), query.fuel)
  return rows.map(row => ({ ...row, reports: reports.get(row.id) ?? {} }))
}

/** Stations en rupture temporaire de ce carburant dans le rayon, de la plus proche à la plus éloignée */
export async function shortagesInRadius({ lat, lon, radiusKm, fuel }: AreaQuery) {
  const db = await useDb()
  const { stations, stationShortages } = schema
  const box = boundingBox(lat, lon, radiusKm)

  const rows = await db
    .select({ id: stations.id, lat: stations.lat, lon: stations.lon, address: stations.address, city: stations.city, since: stationShortages.since })
    .from(stationShortages)
    .innerJoin(stations, eq(stations.id, stationShortages.stationId))
    .where(and(
      eq(stationShortages.fuel, fuel),
      between(stations.lat, box.minLat, box.maxLat),
      between(stations.lon, box.minLon, box.maxLon),
    ))

  return rows
    .map(({ lat: stationLat, lon: stationLon, ...row }) => ({ ...row, distanceKm: haversineKm(lat, lon, stationLat, stationLon) }))
    .filter(row => row.distanceKm <= radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm)
}

// Rayon de la « moyenne locale » à laquelle on compare le prix d'un plein
const LOCAL_RADIUS_KM = 10
// En dessous, la moyenne ne veut pas dire grand-chose
const LOCAL_MIN_STATIONS = 3

/** Une station, son prix pour ce carburant et le prix moyen autour d'elle ; `null` si elle est inconnue */
export async function stationDetail(id: number, fuel: Fuel): Promise<StationDetail | null> {
  const db = await useDb()
  const { stations, stationPrices, stationShortages } = schema

  const [station] = await db.select().from(stations).where(eq(stations.id, id))
  if (!station) return null

  const [shortage] = await db
    .select({ since: stationShortages.since })
    .from(stationShortages)
    .where(and(eq(stationShortages.stationId, id), eq(stationShortages.fuel, fuel)))

  const [own] = await db
    .select({ price: stationPrices.price, updatedAt: stationPrices.updatedAt })
    .from(stationPrices)
    .where(and(eq(stationPrices.stationId, id), eq(stationPrices.fuel, fuel), gte(stationPrices.updatedAt, freshSince())))

  const [around, reports] = await Promise.all([
    pricesInRadius({ lat: station.lat, lon: station.lon, radiusKm: LOCAL_RADIUS_KM, fuel }),
    reportCounts([id], fuel),
  ])

  return {
    id: station.id,
    lat: station.lat,
    lon: station.lon,
    address: station.address,
    city: station.city,
    postalCode: station.postalCode,
    alwaysOpen: station.alwaysOpen,
    services: station.services,
    price: own?.price ?? null,
    updatedAt: own?.updatedAt.toISOString() ?? null,
    shortageSince: shortage?.since.toISOString() ?? null,
    reports: reports.get(id) ?? {},
    localAverage: around.length >= LOCAL_MIN_STATIONS
      ? around.reduce((sum, row) => sum + row.price, 0) / around.length
      : null,
  }
}

export interface CityStation {
  id: number
  lat: number
  lon: number
  address: string
  postalCode: string
  alwaysOpen: boolean
  services: ServiceId[]
  prices: Partial<Record<Fuel, { price: number, updatedAt: Date }>>
  /** Ruptures temporaires en cours, avec leur début */
  shortages: Partial<Record<Fuel, Date>>
}

/** Stations d'une commune avec leurs prix récents ; `null` si la commune est inconnue */
export async function cityStations(slug: string) {
  const db = await useDb()
  const { stations, stationPrices, stationShortages } = schema

  const [rows, shortages] = await Promise.all([
    db
      .select({ station: stations, fuel: stationPrices.fuel, price: stationPrices.price, updatedAt: stationPrices.updatedAt })
      .from(stations)
      .leftJoin(stationPrices, and(eq(stationPrices.stationId, stations.id), gte(stationPrices.updatedAt, freshSince())))
      .where(eq(stations.citySlug, slug)),
    db
      .select({ stationId: stationShortages.stationId, fuel: stationShortages.fuel, since: stationShortages.since })
      .from(stationShortages)
      .innerJoin(stations, eq(stations.id, stationShortages.stationId))
      .where(eq(stations.citySlug, slug)),
  ])

  const first = rows[0]
  if (!first) return null

  const byId = new Map<number, CityStation>()
  for (const { station, fuel, price, updatedAt } of rows) {
    const entry = byId.get(station.id) ?? {
      id: station.id,
      lat: station.lat,
      lon: station.lon,
      address: station.address,
      postalCode: station.postalCode,
      alwaysOpen: station.alwaysOpen,
      services: station.services,
      prices: {},
      shortages: {},
    }
    if (fuel && price !== null && updatedAt) entry.prices[fuel] = { price, updatedAt }
    byId.set(station.id, entry)
  }
  for (const { stationId, fuel, since } of shortages) {
    const entry = byId.get(stationId)
    if (entry) entry.shortages[fuel] = since
  }

  const all = [...byId.values()]
  return {
    slug,
    name: first.station.city,
    department: first.station.department,
    // Barycentre des stations : sert à trouver les communes voisines
    center: {
      lat: all.reduce((sum, station) => sum + station.lat, 0) / all.length,
      lon: all.reduce((sum, station) => sum + station.lon, 0) / all.length,
    },
    // Une station en rupture de tout reste affichée : c'est justement l'information utile
    stations: all.filter(station => Object.keys(station.prices).length > 0 || Object.keys(station.shortages).length > 0),
  }
}

/** Communes ayant au moins une station, les mieux pourvues d'abord */
export async function listCities(limit?: number) {
  const db = await useDb()
  const { stations } = schema
  const stationCount = count()

  const query = db
    .select({ slug: stations.citySlug, name: min(stations.city), department: min(stations.department), stations: stationCount })
    .from(stations)
    .groupBy(stations.citySlug)
    .orderBy(desc(stationCount), stations.citySlug)

  const rows = await (limit ? query.limit(limit) : query)
  return rows.map(row => ({ ...row, name: row.name ?? row.slug, department: row.department ?? '' }))
}

/** Prix moyen national par carburant (relevés récents), recalculé au plus toutes les 10 minutes */
export const nationalAverages = defineCachedFunction(async (): Promise<Partial<Record<Fuel, number>>> => {
  const db = await useDb()
  const { stationPrices } = schema
  const rows = await db
    .select({ fuel: stationPrices.fuel, average: avg(stationPrices.price) })
    .from(stationPrices)
    .where(gte(stationPrices.updatedAt, freshSince()))
    .groupBy(stationPrices.fuel)
  return Object.fromEntries(rows.map(row => [row.fuel, Number(row.average)]))
}, { name: 'national-averages', maxAge: 600 })

const NEARBY_RADIUS_KM = 25

/** Communes ayant des stations autour d'un point, de la plus proche à la plus éloignée */
export async function nearbyCities(center: { lat: number, lon: number }, excludeSlug: string, limit = 8) {
  const db = await useDb()
  const { stations } = schema
  const box = boundingBox(center.lat, center.lon, NEARBY_RADIUS_KM)

  const rows = await db
    .select({
      slug: stations.citySlug,
      name: min(stations.city),
      department: min(stations.department),
      lat: avg(stations.lat),
      lon: avg(stations.lon),
    })
    .from(stations)
    .where(and(
      ne(stations.citySlug, excludeSlug),
      between(stations.lat, box.minLat, box.maxLat),
      between(stations.lon, box.minLon, box.maxLon),
    ))
    .groupBy(stations.citySlug)

  return rows
    .map(row => ({
      slug: row.slug,
      name: row.name ?? row.slug,
      department: row.department ?? '',
      distanceKm: haversineKm(center.lat, center.lon, Number(row.lat), Number(row.lon)),
    }))
    .filter(city => city.distanceKm <= NEARBY_RADIUS_KM)
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, limit)
}

/** Communes ayant au moins un prix récent, avec la date du dernier relevé (pour le sitemap) */
export async function citiesWithFreshPrices() {
  const db = await useDb()
  const { stations, stationPrices } = schema
  return db
    .select({ slug: stations.citySlug, updatedAt: max(stationPrices.updatedAt) })
    .from(stations)
    .innerJoin(stationPrices, eq(stationPrices.stationId, stations.id))
    .where(gte(stationPrices.updatedAt, freshSince()))
    .groupBy(stations.citySlug)
    .orderBy(stations.citySlug)
}
