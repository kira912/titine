export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug') ?? ''
  const city = /^[a-z0-9-]{1,80}$/.test(slug) ? await cityStations(slug) : null
  if (!city) throw createError({ statusCode: 404, message: 'Commune inconnue' })

  const [nearby, national] = await Promise.all([nearbyCities(city.center, slug), nationalAverages()])
  return { ...city, nearby, national }
})
