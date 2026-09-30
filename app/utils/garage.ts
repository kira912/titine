import { today } from '#shared/dates'
import { defaultReminders, firstInspectionDate } from '#shared/reminders'
import type { FillUp, IsoDate, Reminder, Vehicle } from '#shared/types'

type VehicleInput = Omit<Vehicle, 'id'>
type FillUpInput = Omit<FillUp, 'id' | 'vehicleId'>
type ReminderInput = Pick<Reminder, 'label' | 'intervalKm' | 'intervalMonths'>

async function bumpOdometer(vehicle: Saved<Vehicle>, odometer: number) {
  if (odometer > vehicle.odometer) await useLocalDb().vehicles.update(vehicle.id, { odometer })
}

export function createVehicle(input: VehicleInput) {
  const db = useLocalDb()
  // Tout le carnet vit dans le navigateur : on lui demande de ne pas purger ces données
  void navigator.storage?.persist?.()
  return db.transaction('rw', db.vehicles, db.reminders, async () => {
    const vehicleId = await db.vehicles.add({ ...input })
    await db.reminders.bulkAdd(defaultReminders(input, today()).map(reminder => ({ ...reminder, vehicleId })))
  })
}

export function updateVehicle(id: number, input: VehicleInput) {
  const db = useLocalDb()
  return db.transaction('rw', db.vehicles, db.reminders, async () => {
    await db.vehicles.update(id, { ...input })
    await db.reminders
      .where('vehicleId').equals(id)
      .filter(reminder => reminder.kind === 'controle-technique')
      .modify({ firstDueDate: input.firstRegistration ? firstInspectionDate(input.firstRegistration) : null })
  })
}

export function addFillUp(vehicle: Saved<Vehicle>, input: FillUpInput) {
  const db = useLocalDb()
  return db.transaction('rw', db.vehicles, db.fillUps, async () => {
    await db.fillUps.add({ ...input, vehicleId: vehicle.id })
    await bumpOdometer(vehicle, input.odometer)
  })
}

export function deleteFillUp(id: number) {
  return useLocalDb().fillUps.delete(id)
}

export function addReminder(vehicle: Saved<Vehicle>, input: ReminderInput) {
  return useLocalDb().reminders.add({
    ...input,
    vehicleId: vehicle.id,
    kind: 'autre',
    lastDate: today(),
    lastOdometer: vehicle.odometer,
    firstDueDate: null,
  })
}

export function updateReminder(id: number, input: ReminderInput) {
  return useLocalDb().reminders.update(id, { ...input })
}

export function deleteReminder(id: number) {
  return useLocalDb().reminders.delete(id)
}

/** Note l'entretien dans l'historique et repart pour un intervalle */
export function completeReminder(
  vehicle: Saved<Vehicle>,
  reminder: Saved<Reminder>,
  done: { date: IsoDate, odometer: number, cost: number | null },
) {
  const db = useLocalDb()
  return db.transaction('rw', db.vehicles, db.reminders, db.services, async () => {
    await db.services.add({ ...done, vehicleId: vehicle.id, reminderId: reminder.id, label: reminder.label })
    await db.reminders.update(reminder.id, { lastDate: done.date, lastOdometer: done.odometer })
    await bumpOdometer(vehicle, done.odometer)
  })
}

function parseInterval(input: string): number | null | undefined {
  if (input.trim() === '') return null
  const value = parseKm(input)
  return value ? value : undefined
}

/** Valide la saisie d'un rappel ; renvoie le message à afficher si elle est incorrecte */
export function parseReminderInput(form: { label: string, intervalKm: string, intervalMonths: string }): ReminderInput | string {
  const label = form.label.trim()
  const intervalKm = parseInterval(form.intervalKm)
  const intervalMonths = parseInterval(form.intervalMonths)
  if (!label) return 'Donne un intitulé au rappel.'
  if (intervalKm === undefined || intervalMonths === undefined) return 'Les intervalles doivent être des nombres entiers positifs.'
  if (intervalKm === null && intervalMonths === null) return 'Indique un intervalle en kilomètres, en mois, ou les deux.'
  return { label, intervalKm, intervalMonths }
}
