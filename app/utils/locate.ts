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
