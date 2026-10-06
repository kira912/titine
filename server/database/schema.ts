import { sql } from 'drizzle-orm'
import { boolean, doublePrecision, index, integer, pgTable, primaryKey, text, timestamp } from 'drizzle-orm/pg-core'
import type { Fuel } from '../../shared/fuel'
import type { ServiceId } from '../../shared/services'

export const stations = pgTable('stations', {
  // Identifiant de la station dans le flux open data
  id: integer('id').primaryKey(),
  lat: doublePrecision('lat').notNull(),
  lon: doublePrecision('lon').notNull(),
  address: text('address').notNull(),
  city: text('city').notNull(),
  citySlug: text('city_slug').notNull(),
  postalCode: text('postal_code').notNull(),
  department: text('department').notNull(),
  alwaysOpen: boolean('always_open').notNull().default(false),
  services: text('services').array().$type<ServiceId[]>().notNull().default(sql`'{}'::text[]`),
  // Date du dernier import où la station figurait dans le flux
  seenAt: timestamp('seen_at', { withTimezone: true }).notNull(),
}, t => [
  index('stations_lat_lon_idx').on(t.lat, t.lon),
  index('stations_city_slug_idx').on(t.citySlug),
])

export const stationPrices = pgTable('station_prices', {
  stationId: integer('station_id').notNull().references(() => stations.id, { onDelete: 'cascade' }),
  fuel: text('fuel').$type<Fuel>().notNull(),
  price: doublePrecision('price').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
}, t => [
  primaryKey({ columns: [t.stationId, t.fuel] }),
])

/** Ruptures temporaires en cours, remplacées à chaque import comme les prix */
export const stationShortages = pgTable('station_shortages', {
  stationId: integer('station_id').notNull().references(() => stations.id, { onDelete: 'cascade' }),
  fuel: text('fuel').$type<Fuel>().notNull(),
  since: timestamp('since', { withTimezone: true }).notNull(),
}, t => [
  primaryKey({ columns: [t.stationId, t.fuel] }),
])
