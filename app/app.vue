<script setup lang="ts">
import { APP } from '#shared/app'

const tabs = [
  { to: '/', icon: '🏠', label: 'Accueil' },
  { to: '/plein', icon: '⛽', label: 'Plein' },
  { to: '/entretien', icon: '🔧', label: 'Entretien' },
  { to: '/carburant', icon: '📍', label: 'Carburant' },
]

const route = useRoute()
const url = useAbsoluteUrl()
// Une seule URL par page : sans slash final ni paramètres
const canonical = computed(() => url(route.path === '/' ? '/' : route.path.replace(/\/+$/, '')))

useHead({
  titleTemplate: title => (title && title !== APP.name ? `${title} · ${APP.name}` : `${APP.name} — ${APP.tagline}`),
  link: [{ rel: 'canonical', href: canonical }],
  script: [{
    // Avant le premier rendu : masque l'accueil public si ce navigateur a déjà un véhicule (voir useVehicle)
    innerHTML: `try{localStorage.getItem('${GARAGE_FLAG}')&&document.documentElement.classList.add('has-garage')}catch(e){}`,
    tagPosition: 'head',
  }],
})

// Valeurs par défaut ; chaque page publique précise titre et description
useSeoMeta({
  description: APP.description,
  ogSiteName: APP.name,
  ogType: 'website',
  ogLocale: 'fr_FR',
  ogUrl: canonical,
  ogTitle: `${APP.name} — ${APP.tagline}`,
  ogDescription: APP.description,
  ogImage: url('/og-image.png'),
  ogImageWidth: 1200,
  ogImageHeight: 630,
  ogImageAlt: `${APP.name}, ${APP.tagline.toLowerCase()}`,
  twitterCard: 'summary_large_image',
})
</script>

<template>
  <NuxtPwaManifest />
  <header class="topbar">
    <NuxtLink to="/" class="brand">
      <img src="/icon.svg" alt="" width="28" height="28">
      <span>{{ APP.name }}</span>
    </NuxtLink>
  </header>
  <main class="container">
    <NuxtPage />
  </main>
  <nav class="tabbar" aria-label="Navigation principale">
    <NuxtLink v-for="tab in tabs" :key="tab.to" :to="tab.to" class="tab">
      <span aria-hidden="true">{{ tab.icon }}</span>
      {{ tab.label }}
    </NuxtLink>
  </nav>
</template>
