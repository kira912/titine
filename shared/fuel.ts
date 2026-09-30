export const FUELS = ['gazole', 'e10', 'sp95', 'sp98', 'e85', 'gplc'] as const

export type Fuel = typeof FUELS[number]

export const FUEL_LABELS: Record<Fuel, string> = {
  gazole: 'Gazole',
  e10: 'SP95-E10',
  sp95: 'SP95',
  sp98: 'SP98',
  e85: 'E85',
  gplc: 'GPL',
}

export function isFuel(value: unknown): value is Fuel {
  return typeof value === 'string' && (FUELS as readonly string[]).includes(value)
}

/** Nom en début de phrase, avec son article (« L'E85 coûte… ») */
export const FUEL_SUBJECTS: Record<Fuel, string> = {
  gazole: 'Le gazole',
  e10: 'Le SP95-E10',
  sp95: 'Le SP95',
  sp98: 'Le SP98',
  e85: 'L\'E85',
  gplc: 'Le GPL',
}
