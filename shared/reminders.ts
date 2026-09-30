import { addMonths, addYears, daysBetween } from './dates'
import type { IsoDate, Reminder, Vehicle } from './types'

export const SOON_DAYS = 30
export const SOON_KM = 1000

export type ReminderLevel = 'overdue' | 'soon' | 'ok'

export interface ReminderStatus {
  dueDate: IsoDate | null
  dueOdometer: number | null
  daysLeft: number | null
  kmLeft: number | null
  level: ReminderLevel
}

/** Contrôle technique français : premier dans les 4 ans de la mise en circulation, puis tous les 2 ans */
export const FIRST_INSPECTION_YEARS = 4
export const INSPECTION_INTERVAL_MONTHS = 24

export function firstInspectionDate(firstRegistration: IsoDate): IsoDate {
  return addYears(firstRegistration, FIRST_INSPECTION_YEARS)
}

export function reminderStatus(reminder: Reminder, today: IsoDate, odometer: number): ReminderStatus {
  const dueDate = reminder.lastDate && reminder.intervalMonths
    ? addMonths(reminder.lastDate, reminder.intervalMonths)
    : reminder.lastDate ? null : reminder.firstDueDate
  const dueOdometer = reminder.lastOdometer !== null && reminder.intervalKm
    ? reminder.lastOdometer + reminder.intervalKm
    : null

  const daysLeft = dueDate ? daysBetween(today, dueDate) : null
  const kmLeft = dueOdometer !== null ? dueOdometer - odometer : null

  const overdue = (daysLeft !== null && daysLeft < 0) || (kmLeft !== null && kmLeft < 0)
  const soon = (daysLeft !== null && daysLeft <= SOON_DAYS) || (kmLeft !== null && kmLeft <= SOON_KM)

  return { dueDate, dueOdometer, daysLeft, kmLeft, level: overdue ? 'overdue' : soon ? 'soon' : 'ok' }
}

type ReminderSeed = Omit<Reminder, 'id' | 'vehicleId'>

/** Rappels créés d'office à l'ajout du véhicule ; les intervalles restent modifiables */
export function defaultReminders(vehicle: Pick<Vehicle, 'odometer' | 'firstRegistration'>, today: IsoDate): ReminderSeed[] {
  const since = { lastDate: today, lastOdometer: vehicle.odometer, firstDueDate: null }
  return [
    { kind: 'vidange', label: 'Vidange', intervalKm: 15_000, intervalMonths: 12, ...since },
    { kind: 'pneus', label: 'Pneus', intervalKm: 40_000, intervalMonths: null, ...since },
    {
      kind: 'controle-technique',
      label: 'Contrôle technique',
      intervalKm: null,
      intervalMonths: INSPECTION_INTERVAL_MONTHS,
      lastDate: null,
      lastOdometer: null,
      firstDueDate: vehicle.firstRegistration ? firstInspectionDate(vehicle.firstRegistration) : null,
    },
  ]
}
