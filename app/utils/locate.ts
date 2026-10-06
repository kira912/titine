import { haversineKm } from '#shared/geo'

export interface GeoPoint {
  lat: number
  lon: number
}

/** Position de l'appareil ; rejette avec un message à afficher tel quel */
export function currentPosition(): Promise<GeoPoint> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) return reject(new Error('La géolocalisation n\'est pas disponible sur cet appareil.'))
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve({ lat: coords.latitude, lon: coords.longitude }),
      failure => reject(new Error(failure.code === failure.PERMISSION_DENIED
        ? 'Position refusée : autorise la localisation pour ce site dans les réglages du navigateur.'
        : 'Position introuvable. Réessaie à l\'extérieur ou avec le GPS activé.')),
      { enableHighAccuracy: false, timeout: 15_000, maximumAge: 300_000 },
    )
  })
}

// 3 décimales ≈ 110 m : assez pour trouver les stations, trop peu pour situer quelqu'un
const SENT_DECIMALS = 3
const round = (value: number) => Math.round(value * 10 ** SENT_DECIMALS) / 10 ** SENT_DECIMALS

/**
 * Position à envoyer au serveur : arrondie, car elle finit dans l'URL donc dans les journaux
 * d'accès. La position exacte reste sur l'appareil, pour recalculer les distances.
 */
export function coarsePosition(position: GeoPoint): GeoPoint {
  return { lat: round(position.lat), lon: round(position.lon) }
}

/** Distances recalculées depuis la position exacte (le serveur n'a reçu que la position arrondie) */
export function withExactDistance<T extends { lat: number, lon: number, distanceKm: number }>(items: T[], position: GeoPoint): T[] {
  return items.map(item => ({ ...item, distanceKm: haversineKm(position.lat, position.lon, item.lat, item.lon) }))
}
