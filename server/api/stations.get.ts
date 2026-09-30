import { isFuel } from '#shared/fuel'

const MAX_RADIUS_KM = 50
const DEFAULT_RADIUS_KM = 10
const LIMIT = 30

function coordinate(value: unknown, max: number): number | null {
  if (typeof value !== 'string' || value.trim() === '') return null
  const number = Number(value)
  return Number.isFinite(number) && Math.abs(number) <= max ? number : null
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const lat = coordinate(query.lat, 90)
  const lon = coordinate(query.lon, 180)
  if (lat === null || lon === null) throw createError({ statusCode: 400, statusMessage: 'Position invalide' })
  if (!isFuel(query.fuel)) throw createError({ statusCode: 400, statusMessage: 'Carburant inconnu' })

  const radius = Number(query.radius)
  const radiusKm = Number.isFinite(radius) && radius > 0 ? Math.min(radius, MAX_RADIUS_KM) : DEFAULT_RADIUS_KM

  return cheapestStations({ lat, lon, radiusKm, fuel: query.fuel, limit: LIMIT })
})
