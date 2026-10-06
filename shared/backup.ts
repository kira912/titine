import { isFuel } from './fuel'
import type { FillUp, FillUpDraft, Reminder, ReminderKind, Service, Vehicle } from './types'

/** Format du fichier de sauvegarde ; à incrémenter si sa structure change */
export const BACKUP_VERSION = 1

type WithId<T> = T & { id: number }

export interface Backup {
  app: 'titine'
  version: typeof BACKUP_VERSION
  exportedAt: string
  vehicles: WithId<Vehicle>[]
  fillUps: WithId<FillUp>[]
  reminders: WithId<Reminder>[]
  services: WithId<Service>[]
  drafts: WithId<FillUpDraft>[]
}

const REMINDER_KINDS: ReminderKind[] = ['vidange', 'pneus', 'controle-technique', 'autre']
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

type Row = Record<string, unknown>

const isRow = (value: unknown): value is Row => typeof value === 'object' && value !== null && !Array.isArray(value)
const isId = (value: unknown) => Number.isSafeInteger(value) && (value as number) > 0
const isCount = (value: unknown) => typeof value === 'number' && Number.isFinite(value) && value >= 0
const isPositive = (value: unknown) => typeof value === 'number' && Number.isFinite(value) && value > 0
const isDate = (value: unknown) => typeof value === 'string' && ISO_DATE.test(value)
const isText = (value: unknown) => typeof value === 'string'
const isOptional = (value: unknown, check: (v: unknown) => boolean) => value === undefined || value === null || check(value)

const isVehicle = (row: Row) =>
  isId(row.id) && isText(row.make) && isText(row.model) && isFuel(row.fuel) && isCount(row.odometer)
  && isOptional(row.firstRegistration, isDate)

const isStation = (row: unknown) =>
  isRow(row) && isId(row.id) && isText(row.address) && isText(row.city)
  && isOptional(row.price, isPositive) && isOptional(row.localAverage, isPositive)

const isFillUp = (row: Row) =>
  isId(row.id) && isId(row.vehicleId) && isDate(row.date) && isCount(row.odometer)
  && isPositive(row.liters) && isPositive(row.totalPrice) && typeof row.full === 'boolean'
  && isOptional(row.station, isStation) && isOptional(row.createdAt, isText)

const isReminder = (row: Row) =>
  isId(row.id) && isId(row.vehicleId) && REMINDER_KINDS.includes(row.kind as ReminderKind) && isText(row.label)
  && isOptional(row.intervalKm, isPositive) && isOptional(row.intervalMonths, isPositive)
  && isOptional(row.lastDate, isDate) && isOptional(row.lastOdometer, isCount) && isOptional(row.firstDueDate, isDate)

const isService = (row: Row) =>
  isId(row.id) && isId(row.vehicleId) && isOptional(row.reminderId, isId) && isText(row.label)
  && isDate(row.date) && isCount(row.odometer) && isOptional(row.cost, isCount) && isOptional(row.createdAt, isText)

const isDraft = (row: Row) =>
  isId(row.id) && isId(row.vehicleId) && isText(row.createdAt) && isDate(row.date)
  && isText(row.liters) && isText(row.totalPrice) && isText(row.odometer) && typeof row.full === 'boolean'

/** Liste du fichier dont chaque ligne est valide ; `null` sinon */
function rows<T>(value: unknown, isValid: (row: Row) => boolean): T[] | null {
  if (!Array.isArray(value)) return null
  return value.every(row => isRow(row) && isValid(row)) ? (value as T[]) : null
}

/**
 * Relit un fichier de sauvegarde ; renvoie le message à afficher s'il est inutilisable.
 * Le fichier vient de l'extérieur : tout est vérifié avant de toucher au carnet.
 */
export function parseBackup(text: string): Backup | string {
  let data: unknown
  try {
    data = JSON.parse(text)
  }
  catch {
    return 'Ce fichier n\'est pas une sauvegarde Titine.'
  }
  if (!isRow(data) || data.app !== 'titine') return 'Ce fichier n\'est pas une sauvegarde Titine.'
  if (data.version !== BACKUP_VERSION) return 'Cette sauvegarde vient d\'une autre version de Titine : mets l\'appli à jour.'

  const vehicles = rows<WithId<Vehicle>>(data.vehicles, isVehicle)
  const fillUps = rows<WithId<FillUp>>(data.fillUps, isFillUp)
  const reminders = rows<WithId<Reminder>>(data.reminders, isReminder)
  const services = rows<WithId<Service>>(data.services, isService)
  const drafts = rows<WithId<FillUpDraft>>(data.drafts ?? [], isDraft)
  if (!vehicles || !fillUps || !reminders || !services || !drafts) return 'Cette sauvegarde est abîmée : rien n\'a été modifié.'
  if (!vehicles.length) return 'Cette sauvegarde ne contient aucun véhicule.'

  // Chaque enregistrement doit se rattacher à un véhicule du fichier
  const vehicleIds = new Set(vehicles.map(vehicle => vehicle.id))
  const orphan = [...fillUps, ...reminders, ...services, ...drafts].some(row => !vehicleIds.has(row.vehicleId))
  if (orphan) return 'Cette sauvegarde est abîmée : rien n\'a été modifié.'

  return { app: 'titine', version: BACKUP_VERSION, exportedAt: isText(data.exportedAt) ? data.exportedAt as string : '', vehicles, fillUps, reminders, services, drafts }
}
