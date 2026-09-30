import { APP } from './shared/app'

// Écrans personnels du carnet : données locales (IndexedDB), rendus côté client et jamais indexés.
// L'accueil et /carburant sont rendus côté serveur : c'est leur contenu public que lisent les moteurs.
const PRIVATE_ROUTES = ['/plein', '/entretien', '/vehicule']
const NOINDEX = { 'x-robots-tag': 'noindex, nofollow' }

export default defineNuxtConfig({
  compatibilityDate: '2026-09-01',
  devtools: { enabled: false },
  modules: ['@vite-pwa/nuxt'],
  css: ['~/assets/main.css'],

  app: {
    head: {
      htmlAttrs: { lang: 'fr' },
      title: APP.name,
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
        { name: 'theme-color', content: APP.themeColor },
        { name: 'description', content: APP.description },
      ],
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/icon.svg' },
        { rel: 'apple-touch-icon', href: '/icon-192.png' },
      ],
    },
  },

  runtimeConfig: {
    // Surchargeables via NUXT_DATABASE_URL / NUXT_MIGRATIONS_DIR
    databaseUrl: 'postgres://titine:titine@localhost:5435/titine',
    migrationsDir: './server/database/migrations',
    public: {
      // NUXT_PUBLIC_SITE_URL : origine publique, pour les URL canoniques et le sitemap
      siteUrl: 'http://localhost:3000',
      // Fond de carte vectoriel OpenFreeMap (sans clé ni quota), le plus proche de Google Maps.
      // NUXT_PUBLIC_MAP_STYLE : autre style compatible MapLibre (…/styles/bright, …/styles/positron)
      mapStyle: 'https://tiles.openfreemap.org/styles/liberty',
    },
  },

  routeRules: {
    ...Object.fromEntries(PRIVATE_ROUTES.map(route => [route, { ssr: false, headers: NOINDEX }])),
    '/200.html': { headers: NOINDEX },
    '/200': { proxy: '/200.html', headers: NOINDEX },
  },

  // Cache de rendu en production uniquement : en dev, les pages reflètent toujours le code
  $production: {
    routeRules: {
      // Pages publiques sans données serveur ; la canonique suit NUXT_PUBLIC_SITE_URL au runtime
      '/': { swr: 3600 },
      '/carburant': { swr: 3600 },
      // Pages SEO : gardées en cache le temps d'un cycle d'import
      '/prix-carburant': { swr: 1800 },
      '/prix-carburant/**': { swr: 1800 },
    },
  },

  vite: {
    // Workers en modules ES (celui de la carte importe des modules partagés)
    worker: { format: 'es' },
  },

  nitro: {
    experimental: { tasks: true },
    scheduledTasks: {
      '*/30 * * * *': ['fuel:ingest'],
    },
    // Coquille SPA (générée sans SSR par Nuxt), précachée par le service worker pour l'usage hors ligne
    prerender: { routes: ['/200.html'] },
  },

  pwa: {
    registerType: 'autoUpdate',
    // La carte dépasse volontairement la limite de précache (voir workbox) : avertir sans faire échouer le build
    showMaximumFileSizeToCacheInBytesWarning: true,
    manifest: {
      name: `${APP.name} — ${APP.tagline}`,
      short_name: APP.name,
      description: APP.description,
      lang: 'fr',
      start_url: '/',
      scope: '/',
      display: 'standalone',
      background_color: APP.backgroundColor,
      theme_color: APP.themeColor,
      icons: [
        { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
        { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },
    workbox: {
      globPatterns: ['**/*.{js,css,html,png,svg,ico,woff2}'],
      // Le module réécrit « 200.html » en « 200 » dans le précache
      navigateFallback: '/200',
      // Les pages SEO et l'API passent toujours par le réseau
      navigateFallbackDenylist: [/^\/api\//, /^\/prix-carburant/, /^\/sitemap\.xml$/, /^\/robots\.txt$/],
      // La carte (MapLibre, ~1 Mo) n'est pas précachée : elle ne sert qu'en ligne et pas à tout le monde.
      // (Pas de manifestTransforms : il remplacerait celui du module, qui mappe index.html sur « / »)
      maximumFileSizeToCacheInBytes: 500_000,
      // …mais une fois chargée, elle reste en cache (fichiers hachés, donc immuables)
      runtimeCaching: [{
        urlPattern: ({ url }) => url.pathname.startsWith('/_nuxt/'),
        handler: 'CacheFirst',
        options: { cacheName: 'nuxt-chunks', expiration: { maxEntries: 20 } },
      }],
    },
    client: { installPrompt: true },
    devOptions: { enabled: false, type: 'module' },
  },
})
