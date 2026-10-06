import { createHash, randomBytes } from 'node:crypto'
import type { H3Event } from 'h3'
import { and, count, eq, gte, inArray, isNull, lt, or } from 'drizzle-orm'
import type { Fuel } from '../../shared/fuel'
import type { ReportCounts, ReportInput } from '../../shared/reports'
import { networkKey } from '../lib/network'

// Au-delà, un signalement ne dit plus rien de l'état de la station
const VISIBLE_HOURS = 48
const KEEP_DAYS = 7
// Une même personne : un signalement identique par jour, 20 au total
const DAILY_LIMIT = 20

// Sans secret configuré, un sel propre au processus : les empreintes ne survivent pas à un redémarrage
const fallbackSalt = randomBytes(32).toString('hex')

/** Empreinte de l'appelant, différente chaque jour : l'adresse IP n'est jamais enregistrée */
export function reporterId(event: H3Event): string {
  const salt = useRuntimeConfig(event).cronSecret || process.env.CRON_SECRET || fallbackSalt
  // `X-Forwarded-For` est fourni par le client : on ne s'y fie que sur Vercel, qui le réécrit
  const ip = getRequestIP(event, { xForwardedFor: Boolean(process.env.VERCEL) }) ?? 'inconnue'
  const day = new Date().toISOString().slice(0, 10)
  return createHash('sha256').update(`${salt}:${day}:${networkKey(ip)}`).digest('hex').slice(0, 32)
}

const hoursAgo = (hours: number) => new Date(Date.now() - hours * 3_600_000)

export type AddReportResult = 'created' | 'duplicate' | 'limited' | 'unknown-station'

export async function addReport(stationId: number, report: ReportInput, reporter: string): Promise<AddReportResult> {
  const db = await useDb()
  const { stations, stationReports } = schema
  const since = hoursAgo(24)

  const [station] = await db.select({ id: stations.id }).from(stations).where(eq(stations.id, stationId))
  if (!station) return 'unknown-station'

  const recent = await db
    .select({ stationId: stationReports.stationId, kind: stationReports.kind, fuel: stationReports.fuel })
    .from(stationReports)
    .where(and(eq(stationReports.reporter, reporter), gte(stationReports.createdAt, since)))
  if (recent.some(row => row.stationId === stationId && row.kind === report.kind && row.fuel === report.fuel)) return 'duplicate'
  if (recent.length >= DAILY_LIMIT) return 'limited'

  await db.insert(stationReports).values({ stationId, ...report, reporter })
  return 'created'
}

/** Signalements des dernières 48 h par station ; prix et ruptures ne comptent que pour ce carburant */
export async function reportCounts(stationIds: number[], fuel: Fuel): Promise<Map<number, ReportCounts>> {
  const counts = new Map<number, ReportCounts>()
  if (!stationIds.length) return counts

  const db = await useDb()
  const { stationReports } = schema
  const total = count()
  const rows = await db
    .select({ stationId: stationReports.stationId, kind: stationReports.kind, total })
    .from(stationReports)
    .where(and(
      inArray(stationReports.stationId, stationIds),
      gte(stationReports.createdAt, hoursAgo(VISIBLE_HOURS)),
      or(isNull(stationReports.fuel), eq(stationReports.fuel, fuel)),
    ))
    .groupBy(stationReports.stationId, stationReports.kind)

  for (const row of rows) counts.set(row.stationId, { ...counts.get(row.stationId), [row.kind]: row.total })
  return counts
}

/** Supprime les signalements de plus de 7 jours */
export async function purgeReports() {
  const db = await useDb()
  const { stationReports } = schema
  await db.delete(stationReports).where(lt(stationReports.createdAt, hoursAgo(KEEP_DAYS * 24)))
}
