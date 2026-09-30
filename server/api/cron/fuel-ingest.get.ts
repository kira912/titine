import { timingSafeEqual } from 'node:crypto'

/**
 * Import du flux des prix, déclenché par les crons Vercel (vercel.json) ou GitHub Actions.
 * Vercel envoie `Authorization: Bearer $CRON_SECRET` quand la variable CRON_SECRET est définie.
 */
export default defineEventHandler(async (event) => {
  const secret = useRuntimeConfig(event).cronSecret || process.env.CRON_SECRET
  if (!secret) throw createError({ statusCode: 503, message: 'CRON_SECRET non configuré' })

  const expected = Buffer.from(`Bearer ${secret}`)
  const received = Buffer.from(getHeader(event, 'authorization') ?? '')
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) {
    throw createError({ statusCode: 401, message: 'Non autorisé' })
  }

  const { result } = await runTask('fuel:ingest')
  setHeader(event, 'cache-control', 'no-store')
  return result
})
