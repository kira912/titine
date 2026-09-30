/** Postgres de docker-compose.yml, pour le développement local */
export const LOCAL_DATABASE_URL = 'postgres://titine:titine@localhost:5435/titine'

/**
 * URL de connexion : NUXT_DATABASE_URL (via runtimeConfig) puis les variables posées par
 * l'intégration Neon de Vercel. Hors Vercel, repli sur le Postgres local.
 */
export function resolveDatabaseUrl(configured: string | undefined, env: Record<string, string | undefined>): string {
  const url = configured || env.DATABASE_URL || env.POSTGRES_URL
  if (url) return url
  if (env.VERCEL) throw new Error('Base de données non configurée : définis DATABASE_URL (intégration Neon) ou NUXT_DATABASE_URL')
  return LOCAL_DATABASE_URL
}
