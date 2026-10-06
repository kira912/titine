import { FUELS, type Fuel } from '../../shared/fuel'
import { citySlug } from '../../shared/geo'
import { serviceIds, type ServiceId } from '../../shared/services'

const DATASET = 'https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets/prix-des-carburants-en-france-flux-instantane-v2'
const FIELDS = [
  'id', 'adresse', 'ville', 'cp', 'code_departement', 'geom', 'horaires_automate_24_24', 'services_service',
  ...FUELS.flatMap(fuel => [`${fuel}_prix`, `${fuel}_maj`, `${fuel}_rupture_debut`, `${fuel}_rupture_type`]),
]

/** Flux instantané des prix des carburants (open data, mis à jour toutes les 10 minutes) */
export const FEED_URL = `${DATASET}/exports/json?select=${FIELDS.join(',')}`

export interface FeedPrice {
  fuel: Fuel
  price: number
  updatedAt: Date
}

/** Rupture temporaire : la station vend ce carburant mais n'en a plus (son prix disparaît du flux) */
export interface FeedShortage {
  fuel: Fuel
  since: Date
}

export interface FeedStation {
  id: number
  lat: number
  lon: number
  address: string
  city: string
  citySlug: string
  postalCode: string
  department: string
  alwaysOpen: boolean
  services: ServiceId[]
  prices: FeedPrice[]
  shortages: FeedShortage[]
}

const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '')

/** Le flux mélange « Sens » et « SENS » : on n'harmonise que les noms tout en capitales ou tout en minuscules */
export function formatCity(city: string): string {
  if (city !== city.toUpperCase() && city !== city.toLowerCase()) return city
  return city.toLowerCase().replace(/(^|[\s'’-])(\p{L})/gu, (_, sep: string, letter: string) => sep + letter.toUpperCase())
}

function departmentOf(record: Record<string, unknown>, postalCode: string): string {
  const code = text(record.code_departement)
  if (code) return code
  return postalCode.startsWith('97') ? postalCode.slice(0, 3) : postalCode.slice(0, 2)
}

/** Renvoie `null` pour une station inexploitable (sans position, sans ville ou sans code postal) */
export function parseFeedRecord(record: Record<string, unknown>): FeedStation | null {
  const id = Number(record.id)
  const geom = record.geom as { lat?: unknown, lon?: unknown } | null | undefined
  const lat = Number(geom?.lat)
  const lon = Number(geom?.lon)
  const rawCity = text(record.ville)
  const postalCode = text(record.cp)

  if (!Number.isInteger(id) || !geom || !Number.isFinite(lat) || !Number.isFinite(lon)) return null
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180 || !rawCity || !postalCode) return null

  const city = formatCity(rawCity)
  const department = departmentOf(record, postalCode)
  const prices: FeedPrice[] = []
  for (const fuel of FUELS) {
    const price = record[`${fuel}_prix`]
    const updatedAt = new Date(text(record[`${fuel}_maj`]))
    if (typeof price !== 'number' || !(price > 0) || Number.isNaN(updatedAt.getTime())) continue
    prices.push({ fuel, price, updatedAt })
  }
  // Les ruptures définitives disent seulement que la station ne vend pas ce carburant
  const shortages: FeedShortage[] = []
  for (const fuel of FUELS) {
    const since = new Date(text(record[`${fuel}_rupture_debut`]))
    if (record[`${fuel}_rupture_type`] !== 'temporaire' || Number.isNaN(since.getTime())) continue
    shortages.push({ fuel, since })
  }

  return {
    id,
    lat,
    lon,
    address: text(record.adresse),
    city,
    citySlug: citySlug(city, department),
    postalCode,
    department,
    alwaysOpen: record.horaires_automate_24_24 === 'Oui',
    services: serviceIds(record.services_service),
    prices,
    shortages,
  }
}

// Un flux complet compte environ 9 800 stations : en dessous, il est tronqué
const MIN_FEED_STATIONS = 5000
// Par rapport au relevé en place : au-delà d'une baisse de 10 %, c'est une panne de la source, pas des fermetures
const MIN_FEED_RATIO = 0.9

/** Le flux est-il assez complet pour remplacer le relevé en place (qui supprime les stations absentes) ? */
export function isFeedComplete(feedStations: number, currentStations: number): boolean {
  return feedStations >= MIN_FEED_STATIONS && feedStations >= currentStations * MIN_FEED_RATIO
}
