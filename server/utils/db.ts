import { resolve } from 'node:path'
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'
import { resolveDatabaseUrl } from '../../shared/database'
import * as schema from '../database/schema'

type Db = PostgresJsDatabase<typeof schema>

let ready: Promise<Db> | undefined

async function connect(): Promise<Db> {
  const config = useRuntimeConfig()
  const client = postgres(resolveDatabaseUrl(config.databaseUrl, process.env), {
    max: 5,
    // Compatible avec les poolers en mode transaction (Neon, PgBouncer), qui ne gardent pas les requêtes préparées
    prepare: false,
    // En serverless, une connexion inutilisée est rendue vite au pooler
    idle_timeout: 20,
    onnotice: () => {},
  })
  const db = drizzle(client, { schema })
  // Sur Vercel, les migrations passent au build (`pnpm vercel-build`) : le dossier n'est pas dans la fonction
  if (!process.env.VERCEL) {
    try {
      await migrate(db, { migrationsFolder: resolve(config.migrationsDir) })
    }
    catch (error) {
      await client.end()
      throw error
    }
  }
  return db
}

/** Connexion partagée ; hors Vercel, les migrations sont appliquées à la première utilisation */
export function useDb(): Promise<Db> {
  ready ??= connect().catch((error) => {
    ready = undefined
    throw error
  })
  return ready
}

export { schema }
