import { isFuel } from '#shared/fuel'
import { SEARCH_LIMIT, searchTerms } from '#shared/search'

/** `?q=…&fuel=…` : stations d'une commune, d'un code postal ou d'une adresse, pour choisir celle d'un plein */
export default defineEventHandler((event) => {
  const { q, fuel } = getQuery(event)
  if (!isFuel(fuel)) throw createError({ statusCode: 400, message: 'Carburant inconnu' })
  return searchStations(searchTerms(typeof q === 'string' ? q : ''), fuel, SEARCH_LIMIT)
})
