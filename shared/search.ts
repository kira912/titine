import { slugify } from './geo'

export const SEARCH_MIN_LENGTH = 2
/** Stations renvoyées au plus par une recherche */
export const SEARCH_LIMIT = 20
const MAX_TERMS = 5

/**
 * Mots d'une recherche de station (« St-Étienne 42000 » → ['st', 'etienne', '42000']) :
 * sans accents ni ponctuation, comme les communes dans `city_slug`. Vide si la saisie est trop courte.
 */
export function searchTerms(query: string): string[] {
  const terms = [...new Set(slugify(query.slice(0, 80)).split('-').filter(Boolean))].slice(0, MAX_TERMS)
  return terms.join('').length >= SEARCH_MIN_LENGTH ? terms : []
}
