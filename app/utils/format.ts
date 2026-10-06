import type { ReminderLevel, ReminderStatus } from '#shared/reminders'
import type { IsoDate, Reminder } from '#shared/types'

export function formatNumber(value: number, digits = 0): string {
  return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value)
}

export const formatEuro = (value: number, digits = 2) => `${formatNumber(value, digits)} €`
export const formatKm = (value: number) => `${formatNumber(value)} km`

const dateFormat = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })

export function formatDate(date: IsoDate | Date | string): string {
  return dateFormat.format(new Date(typeof date === 'string' && date.length === 10 ? `${date}T00:00:00Z` : date))
}

/** Accepte la virgule du clavier français ; `null` si la saisie n'est pas un nombre positif */
export function parseDecimal(input: string | number): number | null {
  const value = Number(String(input).trim().replace(/\s/g, '').replace(',', '.'))
  return String(input).trim() !== '' && Number.isFinite(value) && value > 0 ? value : null
}

export function formatDelay(days: number): string {
  if (days === 0) return 'aujourd\'hui'
  const count = `${Math.abs(days)} jour${Math.abs(days) > 1 ? 's' : ''}`
  return days > 0 ? `dans ${count}` : `en retard de ${count}`
}

export function formatKmLeft(km: number): string {
  return km >= 0 ? `dans ${formatKm(km)}` : `dépassé de ${formatKm(-km)}`
}

/** Kilométrage saisi : entier positif ou nul, `null` si la saisie est invalide */
export function parseKm(input: string | number): number | null {
  const text = String(input).trim().replace(/\s/g, '').replace(',', '.')
  const value = Number(text)
  return text !== '' && Number.isFinite(value) && value >= 0 ? Math.round(value) : null
}

export const LEVEL_LABELS: Record<ReminderLevel, string> = {
  overdue: 'En retard',
  soon: 'Bientôt',
  ok: 'À jour',
}

/** Échéance lisible : « 12 mars 2027 (dans 163 jours) · dans 4 200 km » ; vide si aucune échéance n'est connue */
export function formatDue(status: ReminderStatus): string {
  const parts: string[] = []
  if (status.dueDate && status.daysLeft !== null) parts.push(`${formatDate(status.dueDate)} (${formatDelay(status.daysLeft)})`)
  if (status.kmLeft !== null) parts.push(formatKmLeft(status.kmLeft))
  return parts.join(' · ')
}

export function formatInterval(reminder: Pick<Reminder, 'intervalKm' | 'intervalMonths'>): string {
  const parts: string[] = []
  if (reminder.intervalKm) parts.push(formatKm(reminder.intervalKm))
  if (reminder.intervalMonths) parts.push(`${reminder.intervalMonths} mois`)
  return parts.length ? `Tous les ${parts.join(' ou ')}` : 'Sans périodicité'
}

/** « 12 rue de la Gare, Lyon » */
export function formatStation(station: { address: string, city: string }): string {
  return [station.address, station.city].filter(Boolean).join(', ')
}

/** Ancienneté d'un événement : « depuis 40 min », « depuis 3 h », « depuis 2 jours » */
export function formatSince(date: Date | string, now = new Date()): string {
  const minutes = Math.max(0, Math.round((now.getTime() - new Date(date).getTime()) / 60_000))
  if (minutes < 60) return `depuis ${minutes} min`
  const hours = Math.round(minutes / 60)
  if (hours < 48) return `depuis ${hours} h`
  return `depuis ${Math.round(hours / 24)} jours`
}
