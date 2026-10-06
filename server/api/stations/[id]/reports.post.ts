import { parseReport } from '#shared/reports'

export default defineEventHandler(async (event) => {
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
