export default defineEventHandler(async (event) => {
  const base = useRuntimeConfig().public.siteUrl.replace(/\/$/, '')
  // Seules les communes ayant des prix récents sont indexables (les autres pages sont en noindex)
  const cities = await citiesWithFreshPrices()
  const latest = cities.reduce<Date | null>((acc, city) => (city.updatedAt && (!acc || city.updatedAt > acc) ? city.updatedAt : acc), null)

  const entries = [
    { path: '/', lastmod: null },
    { path: '/carburant', lastmod: null },
    { path: '/prix-carburant', lastmod: latest },
    ...cities.map(city => ({ path: `/prix-carburant/${city.slug}`, lastmod: city.updatedAt })),
  ]
  const urls = entries
    .map(({ path, lastmod }) => `<url><loc>${base}${path}</loc>${lastmod ? `<lastmod>${lastmod.toISOString()}</lastmod>` : ''}</url>`)
    .join('')

  setHeader(event, 'content-type', 'application/xml; charset=utf-8')
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`
})
