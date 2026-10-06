import { parseServices } from '#shared/services'

const LIMIT = 30

export default defineEventHandler((event) => {
  const { query, ...area } = areaQuery(event)
  return cheapestStations({ ...area, limit: LIMIT, services: parseServices(query.services) })
})
