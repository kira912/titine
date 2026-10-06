import { parseReport } from '#shared/reports'

export default defineEventHandler(async (event) => {
  // Un formulaire HTML d'un autre site passerait sans contrôle CORS : on n'accepte que du JSON
  // (qui impose un preflight, refusé faute d'en-têtes CORS) envoyé depuis nos propres pages
  const contentType = getHeader(event, 'content-type')?.split(';')[0]?.trim().toLowerCase()
  if (contentType !== 'application/json') throw createError({ statusCode: 415, message: 'JSON attendu' })
  const site = getHeader(event, 'sec-fetch-site')
  if (site && site !== 'same-origin') throw createError({ statusCode: 403, message: 'Origine refusée' })

  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isSafeInteger(id) || id <= 0) throw createError({ statusCode: 400, message: 'Station invalide' })
  const report = parseReport(await readBody(event).catch(() => null))
  if (!report) throw createError({ statusCode: 400, message: 'Signalement invalide' })

  const result = await addReport(id, report, reporterId(event))
  if (result === 'unknown-station') throw createError({ statusCode: 404, message: 'Station inconnue' })
  if (result === 'limited') throw createError({ statusCode: 429, message: 'Trop de signalements aujourd\'hui' })

  // Un doublon n'est pas une erreur : la personne a déjà été entendue
  setResponseStatus(event, result === 'created' ? 201 : 200)
  return { created: result === 'created' }
})
