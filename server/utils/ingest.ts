import { count, lt, sql } from 'drizzle-orm'
import { FEED_URL, isFeedComplete, parseFeedRecord, type FeedStation } from '../lib/feed'

// Une rupture « temporaire » plus ancienne est en fait un carburant abandonné sans le déclarer
const MAX_SHORTAGE_AGE_DAYS = 30

function chunks<T>(items: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}

export async function ingestFuelFeed() {
  const records = await $fetch<Record<string, unknown>[]>(FEED_URL, { responseType: 'json', timeout: 120_000 })
  const parsed = new Map<number, FeedStation>()
  for (const record of records) {
    const station = parseFeedRecord(record)
    if (station) parsed.set(station.id, station)
  }

  const db = await useDb()
  const { stations, stationPrices, stationShortages } = schema
  // Flux tronqué : on garde le relevé en place plutôt que de supprimer les stations absentes
  const [current] = await db.select({ total: count() }).from(stations)
  if (!isFeedComplete(parsed.size, current?.total ?? 0)) {
    throw new Error(`Flux incomplet : ${parsed.size} station(s) exploitables pour ${current?.total ?? 0} en base`)
  }
  const seenAt = new Date()
  const stationRows = [...parsed.values()].map(({ prices: _, shortages: __, ...station }) => ({ ...station, seenAt }))
  const priceRows = [...parsed.values()].flatMap(station => station.prices.map(price => ({ stationId: station.id, ...price })))
  const shortageSince = new Date(seenAt.getTime() - MAX_SHORTAGE_AGE_DAYS * 86_400_000)
  const shortageRows = [...parsed.values()].flatMap(station => station.shortages
    .filter(shortage => shortage.since >= shortageSince)
    .map(shortage => ({ stationId: station.id, ...shortage })))

  // Une seule transaction : les lecteurs voient l'ancien relevé jusqu'à la fin de l'import
  await db.transaction(async (tx) => {
    for (const rows of chunks(stationRows, 1000)) {
      await tx.insert(stations).values(rows).onConflictDoUpdate({
        target: stations.id,
        set: {
          lat: sql`excluded.lat`,
          lon: sql`excluded.lon`,
          address: sql`excluded.address`,
          city: sql`excluded.city`,
          citySlug: sql`excluded.city_slug`,
          postalCode: sql`excluded.postal_code`,
          department: sql`excluded.department`,
          alwaysOpen: sql`excluded.always_open`,
          services: sql`excluded.services`,
          seenAt: sql`excluded.seen_at`,
        },
      })
    }
    await tx.delete(stations).where(lt(stations.seenAt, seenAt))
    await tx.delete(stationPrices)
    for (const rows of chunks(priceRows, 2000)) await tx.insert(stationPrices).values(rows)
    await tx.delete(stationShortages)
    for (const rows of chunks(shortageRows, 2000)) await tx.insert(stationShortages).values(rows)
  })
  await purgeReports()

  return { stations: stationRows.length, prices: priceRows.length, shortages: shortageRows.length, skipped: records.length - parsed.size }
}
