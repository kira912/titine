import { APP } from './shared/app'

// Écrans personnels du carnet : données locales (IndexedDB), rendus côté client et jamais indexés.
// L'accueil et /carburant sont rendus côté serveur : c'est leur contenu public que lisent les moteurs.
const PRIVATE_ROUTES = ['/plein', '/entretien', '/vehicule', '/bilan']
const NOINDEX = { 'x-robots-tag': 'noindex, nofollow' }

// Sur Vercel, le domaine de production est connu au build : il sert d'origine publique par défaut
const VERCEL_URL = process.env.VERCEL_PROJECT_PRODUCTION_URL

export default defineNuxtConfig({
  compatibilityDate: '2026-09-01',
  devtools: { enabled: false },
  // Vercel Web Analytics : sans cookie, actif seulement une fois activé dans le tableau de bord Vercel
  modules: ['@vite-pwa/nuxt', '@vercel/analytics'],
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
    // NUXT_DATABASE_URL ; à défaut DATABASE_URL / POSTGRES_URL (Neon via Vercel), puis le Postgres Docker local
    databaseUrl: '',
    // NUXT_CRON_SECRET (ou CRON_SECRET, que Vercel envoie à ses crons) : protège /api/cron/*
    cronSecret: '',
    migrationsDir: './server/database/migrations',
    public: {
      // NUXT_PUBLIC_SITE_URL : origine publique, pour les URL canoniques et le sitemap
      siteUrl: VERCEL_URL ? `https://${VERCEL_URL}` : 'http://localhost:3000',
      // Fond de carte vectoriel OpenFreeMap (sans clé ni quota), Fiord : bleu nuit, assorti à la palette Catppuccin Frappé.
      // NUXT_PUBLIC_MAP_STYLE : autre style compatible MapLibre (…/styles/liberty, …/styles/dark, …/styles/positron)
      mapStyle: 'https://tiles.openfreemap.org/styles/fiord',
      // NUXT_PUBLIC_GA_ID : identifiant de mesure Google Analytics 4 (G-XXXXXXXXXX). Vide : pas de GA ni de bandeau
      gaId: '',
    },
  },

  routeRules: {
    ...Object.fromEntries(PRIVATE_ROUTES.map(route => [route, { ssr: false, headers: NOINDEX }])),
    // Coquille SPA pour le hors ligne : pré-générée sans SSR dans 200/index.html, donc servie
    // statiquement à l'adresse « /200 » sous laquelle le service worker la précache (Node comme Vercel)
    '/200': { ssr: false, prerender: true, headers: NOINDEX },
  },

  // Cache de rendu en production uniquement : en dev, les pages reflètent toujours le code
  $production: {
    routeRules: {
      // `swr` : cache de Nitro (serveur Node) ; `isr` : même durée sur le CDN de Vercel
      // Pages publiques sans données serveur
      '/': { swr: 3600, isr: 3600 },
      '/carburant': { swr: 3600, isr: 3600 },
      // Pages SEO : gardées en cache le temps d'un cycle d'import
      '/prix-carburant': { swr: 1800, isr: 1800 },
      '/prix-carburant/**': { swr: 1800, isr: 1800 },
    },
  },

  vite: {
    // Workers en modules ES (celui de la carte importe des modules partagés)
    worker: { format: 'es' },
  },

  nitro: {
    experimental: { tasks: true },
    // Serveur Node uniquement : sur Vercel, ce sont les crons (vercel.json) qui appellent /api/cron/fuel-ingest
    scheduledTasks: {
      '*/30 * * * *': ['fuel:ingest'],
    },
    vercel: {
      // L'import du flux (téléchargement + ~40 000 lignes en base) dépasse la durée par défaut
      functions: { maxDuration: 120 },
      config: {
        // Plan Hobby : un cron par jour au plus (sinon le déploiement échoue). Le workflow GitHub
        // .github/workflows/fuel-ingest.yml assure les imports toutes les 30 minutes.
        // En plan Pro : passer à '*/30 * * * *' et supprimer le workflow.
        crons: [{ path: '/api/cron/fuel-ingest', schedule: '0 5 * * *' }],
      },
    },
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
      // Appui long sur l'icône de l'appli installée : droit au formulaire, depuis la pompe
      shortcuts: [
        { name: 'Ajouter un plein', short_name: 'Plein', url: '/plein', icons: [{ src: '/icon-192.png', sizes: '192x192', type: 'image/png' }] },
        { name: 'Carburant le moins cher', short_name: 'Carburant', url: '/carburant', icons: [{ src: '/icon-192.png', sizes: '192x192', type: 'image/png' }] },
      ],
    },
    workbox: {
      globPatterns: ['**/*.{js,css,html,png,svg,ico,woff2}'],
      // Coquille SPA (routeRules « /200 »), précachée sous cette adresse
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
