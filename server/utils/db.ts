import { resolve } from 'node:path'
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'
import * as schema from '../database/schema'

type Db = PostgresJsDatabase<typeof schema>

let ready: Promise<Db> | undefined

async function connect(): Promise<Db> {
  const config = useRuntimeConfig()
  const client = postgres(config.databaseUrl, { max: 5, onnotice: () => {} })
  const db = drizzle(client, { schema })
  try {
    await migrate(db, { migrationsFolder: resolve(config.migrationsDir) })
  }
  catch (error) {
    await client.end()
    throw error
  }
  return db
}

/** Connexion partagée ; les migrations sont appliquées à la première utilisation */
export function useDb(): Promise<Db> {
  ready ??= connect().catch((error) => {
    ready = undefined
    throw error
  })
  return ready
}

export { schema }
