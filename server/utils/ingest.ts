import { lt, sql } from 'drizzle-orm'
import { FEED_URL, parseFeedRecord, type FeedStation } from '../lib/feed'

// En dessous, le flux est considéré tronqué : on garde les données en place plutôt que de vider la base
const MIN_STATIONS = 5000

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
  if (parsed.size < MIN_STATIONS) throw new Error(`Flux incomplet : ${parsed.size} station(s) exploitables`)

  const db = await useDb()
  const { stations, stationPrices } = schema
  const seenAt = new Date()
  const stationRows = [...parsed.values()].map(({ prices: _, ...station }) => ({ ...station, seenAt }))
  const priceRows = [...parsed.values()].flatMap(station => station.prices.map(price => ({ stationId: station.id, ...price })))

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
          seenAt: sql`excluded.seen_at`,
        },
      })
    }
    await tx.delete(stations).where(lt(stations.seenAt, seenAt))
    await tx.delete(stationPrices)
    for (const rows of chunks(priceRows, 2000)) await tx.insert(stationPrices).values(rows)
  })

  return { stations: stationRows.length, prices: priceRows.length, skipped: records.length - parsed.size }
}
