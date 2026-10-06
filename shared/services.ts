/** Services utiles en route, parmi ceux que les stations déclarent dans le flux open data */
export const SERVICES = ['gonflage', 'lavage', 'toilettes', 'boutique', 'dab', 'restauration', 'recharge', 'atelier', 'camping-car'] as const

export type ServiceId = typeof SERVICES[number]

export const SERVICE_LABELS: Record<ServiceId, { label: string }> = {
  'gonflage': { label: 'Gonflage' },
  'lavage': { label: 'Lavage' },
  'toilettes': { label: 'Toilettes' },
  'boutique': { label: 'Boutique' },
  'dab': { label: 'Distributeur de billets' },
  'restauration': { label: 'Restauration' },
  'recharge': { label: 'Recharge électrique' },
  'atelier': { label: 'Réparation' },
  'camping-car': { label: 'Aire de camping-cars' },
}

// Libellés exacts du flux ; les autres services (fioul, relais colis…) ne sont pas repris
const FEED_SERVICES: Record<string, ServiceId> = {
  'Station de gonflage': 'gonflage',
  'Lavage automatique': 'lavage',
  'Lavage manuel': 'lavage',
  'Toilettes publiques': 'toilettes',
  'Boutique alimentaire': 'boutique',
  'DAB (Distributeur automatique de billets)': 'dab',
  'Restauration à emporter': 'restauration',
  'Restauration sur place': 'restauration',
  'Bornes électriques': 'recharge',
  'Services réparation / entretien': 'atelier',
  'Aire de camping-cars': 'camping-car',
}

export function isService(value: unknown): value is ServiceId {
  return typeof value === 'string' && (SERVICES as readonly string[]).includes(value)
}

/** Services reconnus d'une station, dans l'ordre de `SERVICES` */
export function serviceIds(feedValues: unknown): ServiceId[] {
  if (!Array.isArray(feedValues)) return []
  const found = new Set(feedValues.map(value => FEED_SERVICES[String(value).trim()]))
  return SERVICES.filter(service => found.has(service))
}

/** Lit `?services=gonflage,lavage` en ignorant les valeurs inconnues */
export function parseServices(query: unknown): ServiceId[] {
  return typeof query === 'string' ? [...new Set(query.split(',').filter(isService))] : []
}
