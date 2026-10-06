import type { Fuel } from './fuel'
import type { IsoDate } from './types'

/** Vignette Crit'Air : 1 à 5, `null` pour un véhicule non classé (trop ancien) */
export type CritAir = 1 | 2 | 3 | 4 | 5 | null

/**
 * Classe Crit'Air d'une voiture particulière d'après sa première mise en circulation (arrêté du 21 juin 2016).
 * C'est la règle appliquée quand la norme Euro n'est pas connue ; si elle figure sur la carte grise (case V.9), elle fait foi.
 * Le GPL est classé Crit'Air 1 quel que soit l'âge du véhicule.
 */
export function critAir(fuel: Fuel, firstRegistration: IsoDate): CritAir {
  if (fuel === 'gplc') return 1
  const date = firstRegistration
  if (fuel === 'gazole') {
    if (date >= '2011-01-01') return 2
    if (date >= '2006-01-01') return 3
    if (date >= '2001-01-01') return 4
    if (date >= '1997-01-01') return 5
    return null
  }
  if (date >= '2011-01-01') return 1
  if (date >= '2006-01-01') return 2
  if (date >= '1997-01-01') return 3
  return null
}
