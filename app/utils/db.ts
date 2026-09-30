import Dexie, { type Table } from 'dexie'
import type { FillUp, Reminder, Service, Vehicle } from '#shared/types'

/** Enregistrement relu depuis la base : sa clé est toujours présente */
export type Saved<T> = T & { id: number }

class TitineDb extends Dexie {
  vehicles!: Table<Saved<Vehicle>, number, Vehicle>
  fillUps!: Table<Saved<FillUp>, number, FillUp>
  reminders!: Table<Saved<Reminder>, number, Reminder>
  services!: Table<Saved<Service>, number, Service>

  constructor() {
    super('titine')
    // vehicleId est déjà indexé : le multi-véhicules ne demandera pas de migration
    this.version(1).stores({
      vehicles: '++id',
      fillUps: '++id, vehicleId, odometer',
      reminders: '++id, vehicleId',
      services: '++id, vehicleId, date',
    })
  }
}

let db: TitineDb | undefined

/** Base locale (IndexedDB) : à n'appeler que côté client */
export function useLocalDb() {
  return (db ??= new TitineDb())
}
