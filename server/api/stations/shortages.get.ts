import type { NearbyShortage } from '#shared/types'

export default defineEventHandler(async (event): Promise<NearbyShortage[]> => {
  const { query: _, ...area } = areaQuery(event)
  const rows = await shortagesInRadius(area)
  return rows.map(row => ({ ...row, since: row.since.toISOString() }))
})
