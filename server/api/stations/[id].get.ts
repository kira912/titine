import { isFuel } from '#shared/fuel'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const { fuel } = getQuery(event)
  if (!Number.isSafeInteger(id) || id <= 0) throw createError({ statusCode: 400, message: 'Station invalide' })
  if (!isFuel(fuel)) throw createError({ statusCode: 400, message: 'Carburant inconnu' })

  const station = await stationDetail(id, fuel)
  if (!station) throw createError({ statusCode: 404, message: 'Station inconnue' })
  return station
})
