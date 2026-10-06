import type { H3Event } from 'h3'
import { isFuel } from '#shared/fuel'

const MAX_RADIUS_KM = 50
const DEFAULT_RADIUS_KM = 10

function coordinate(value: unknown, max: number): number | null {
  if (typeof value !== 'string' || value.trim() === '') return null
  const number = Number(value)
  return Number.isFinite(number) && Math.abs(number) <= max ? number : null
}

/** Lit `?lat=…&lon=…&fuel=…&radius=…` (rayon plafonné à 50 km) ; erreur 400 si la saisie est invalide */
export function areaQuery(event: H3Event) {
  const query = getQuery(event)
  const lat = coordinate(query.lat, 90)
  const lon = coordinate(query.lon, 180)
  if (lat === null || lon === null) throw createError({ statusCode: 400, message: 'Position invalide' })
  if (!isFuel(query.fuel)) throw createError({ statusCode: 400, message: 'Carburant inconnu' })

  const radius = Number(query.radius)
  const radiusKm = Number.isFinite(radius) && radius > 0 ? Math.min(radius, MAX_RADIUS_KM) : DEFAULT_RADIUS_KM
  return { lat, lon, radiusKm, fuel: query.fuel, query }
}
