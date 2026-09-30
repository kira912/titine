const EARTH_RADIUS_KM = 6371
const KM_PER_DEGREE_LAT = 111.32

const rad = (deg: number) => (deg * Math.PI) / 180

export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = rad(lat2 - lat1)
  const dLon = rad(lon2 - lon1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a))
}

/** Rectangle englobant le cercle, pour préfiltrer en base avant le calcul exact de distance */
export function boundingBox(lat: number, lon: number, radiusKm: number) {
  const dLat = radiusKm / KM_PER_DEGREE_LAT
  const dLon = radiusKm / (KM_PER_DEGREE_LAT * Math.max(Math.cos(rad(lat)), 0.01))
  return { minLat: lat - dLat, maxLat: lat + dLat, minLon: lon - dLon, maxLon: lon + dLon }
}

export function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** Le département lève l'ambiguïté entre communes homonymes (saint-denis-93, saint-denis-974…) */
export function citySlug(city: string, department: string): string {
  return slugify(`${city} ${department}`)
}
