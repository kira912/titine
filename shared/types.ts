import type { Fuel } from './fuel'
import type { ReportCounts } from './reports'
import type { ServiceId } from './services'

/** Dates au format ISO court `AAAA-MM-JJ` */
export type IsoDate = string

export interface Vehicle {
  id?: number
  make: string
  model: string
  fuel: Fuel
  odometer: number
  /** Première mise en circulation, sert à calculer le premier contrôle technique */
  firstRegistration: IsoDate | null
}

export interface FillUp {
  id?: number
  vehicleId: number
  date: IsoDate
  odometer: number
  liters: number
  totalPrice: number
  /** Plein complet : seul un plein complet permet de calculer une consommation */
  full: boolean
  /** Station où le plein a été fait, si elle a été choisie (absente des pleins plus anciens) */
  station?: FillUpStation | null
  /** Moment de la saisie (ISO), distinct de la date déclarée ; absent des pleins plus anciens */
  createdAt?: string
}

/** Station d'un plein, figée au moment de la saisie */
export interface FillUpStation {
  id: number
  address: string
  city: string
  /** Prix au litre affiché par la station au moment de la saisie */
  price?: number | null
  /** Prix moyen au litre autour de la station ce jour-là ; `null` si trop peu de relevés */
  localAverage: number | null
}

export type ReminderKind = 'vidange' | 'pneus' | 'controle-technique' | 'autre'

export interface Reminder {
  id?: number
  vehicleId: number
  kind: ReminderKind
  label: string
  intervalKm: number | null
  intervalMonths: number | null
  /** Dernière réalisation (ou point de départ du suivi) */
  lastDate: IsoDate | null
  lastOdometer: number | null
  /** Échéance imposée tant que l'entretien n'a jamais été fait (premier contrôle technique) */
  firstDueDate: IsoDate | null
}

export interface Service {
  id?: number
  vehicleId: number
  reminderId: number | null
  label: string
  date: IsoDate
  odometer: number
  cost: number | null
  /** Moment de la saisie (ISO) ; absent des entretiens plus anciens */
  createdAt?: string
}

/** Station renvoyée par `/api/stations`, du moins cher au plus cher */
export interface NearbyStation {
  id: number
  lat: number
  lon: number
  address: string
  city: string
  postalCode: string
  alwaysOpen: boolean
  services: ServiceId[]
  /** Signalements des dernières 48 h */
  reports: ReportCounts
  price: number
  updatedAt: string
  distanceKm: number
}

/** Station en rupture temporaire, renvoyée par `/api/stations/shortages` */
export interface NearbyShortage {
  id: number
  address: string
  city: string
  since: string
  distanceKm: number
}

/** Station renvoyée par `/api/stations/:id`, avec le prix moyen autour d'elle */
export interface StationDetail {
  id: number
  lat: number
  lon: number
  address: string
  city: string
  postalCode: string
  alwaysOpen: boolean
  services: ServiceId[]
  /** `null` si la station n'a pas de prix récent pour ce carburant */
  price: number | null
  updatedAt: string | null
  /** Début de la rupture temporaire en cours pour ce carburant */
  shortageSince: string | null
  /** Signalements des dernières 48 h */
  reports: ReportCounts
  localAverage: number | null
}
