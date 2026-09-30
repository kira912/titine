export default defineEventHandler((event) => {
  const base = useRuntimeConfig().public.siteUrl.replace(/\/$/, '')
  setHeader(event, 'content-type', 'text/plain; charset=utf-8')
  // Les écrans personnels (plein, entretien, véhicule) restent explorables : ils portent un en-tête noindex
  return `User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /200.html\n\nSitemap: ${base}/sitemap.xml\n`
})
