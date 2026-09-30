import type { IsoDate } from './types'

const DAY_MS = 86_400_000

function parts(date: IsoDate): [number, number, number] {
  const [y = 1970, m = 1, d = 1] = date.split('-').map(Number)
  return [y, m, d]
}

function toIso(y: number, monthIndex: number, d: number): IsoDate {
  return new Date(Date.UTC(y, monthIndex, d)).toISOString().slice(0, 10)
}

/** Date du jour dans le fuseau de l'appareil */
export function today(now = new Date()): IsoDate {
  return toIso(now.getFullYear(), now.getMonth(), now.getDate())
}

/** Ajoute des mois en restant dans le mois visé (31 janvier + 1 mois → 28/29 février) */
export function addMonths(date: IsoDate, months: number): IsoDate {
  const [y, m, d] = parts(date)
  const target = m - 1 + months
  const lastDay = new Date(Date.UTC(y, target + 1, 0)).getUTCDate()
  return toIso(y, target, Math.min(d, lastDay))
}

export function addYears(date: IsoDate, years: number): IsoDate {
  return addMonths(date, years * 12)
}

/** Nombre de jours de `from` à `to` (négatif si `to` est passé) */
export function daysBetween(from: IsoDate, to: IsoDate): number {
  const [fy, fm, fd] = parts(from)
  const [ty, tm, td] = parts(to)
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / DAY_MS)
}
