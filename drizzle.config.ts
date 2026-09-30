import { defineConfig } from 'drizzle-kit'
import { LOCAL_DATABASE_URL } from './shared/database'

const env = process.env

export default defineConfig({
  dialect: 'postgresql',
  schema: './server/database/schema.ts',
  out: './server/database/migrations',
  // Migrations : connexion directe de préférence (Neon fournit DATABASE_URL_UNPOOLED), sinon la connexion habituelle
  dbCredentials: { url: env.NUXT_DATABASE_URL || env.DATABASE_URL_UNPOOLED || env.DATABASE_URL || env.POSTGRES_URL || LOCAL_DATABASE_URL },
})
