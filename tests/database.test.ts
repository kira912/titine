import { describe, expect, it } from 'vitest'
import { LOCAL_DATABASE_URL, resolveDatabaseUrl } from '../shared/database'

describe('resolveDatabaseUrl', () => {
  it('privilégie la valeur configurée (NUXT_DATABASE_URL)', () => {
    expect(resolveDatabaseUrl('postgres://a', { DATABASE_URL: 'postgres://b' })).toBe('postgres://a')
  })

  it('reprend les variables posées par Neon sur Vercel', () => {
    expect(resolveDatabaseUrl('', { DATABASE_URL: 'postgres://neon', VERCEL: '1' })).toBe('postgres://neon')
    expect(resolveDatabaseUrl('', { POSTGRES_URL: 'postgres://pg', VERCEL: '1' })).toBe('postgres://pg')
  })

  it('se replie sur le Postgres local hors Vercel', () => {
    expect(resolveDatabaseUrl('', {})).toBe(LOCAL_DATABASE_URL)
  })

  it('refuse de démarrer sur Vercel sans base configurée', () => {
    expect(() => resolveDatabaseUrl('', { VERCEL: '1' })).toThrow(/DATABASE_URL/)
  })
})
