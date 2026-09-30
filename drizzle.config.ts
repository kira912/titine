import { defineConfig } from 'drizzle-kit'
import { LOCAL_DATABASE_URL } from './shared/database'

const env = process.env

export default defineConfig({
  dialect: 'postgresql',
  schema: './server/database/schema.ts',
  out: './server/database/migrations',
  // Migrations : connexion directe de préférence (noms posés par l'intégration Neon selon sa version), sinon la connexion habituelle
  dbCredentials: {
    url: env.NUXT_DATABASE_URL || env.DATABASE_URL_UNPOOLED || env.POSTGRES_URL_NON_POOLING || env.DATABASE_URL || env.POSTGRES_URL || LOCAL_DATABASE_URL,
  },
})
