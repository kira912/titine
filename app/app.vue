<script setup lang="ts">
import { APP } from '#shared/app'
import type { IconName } from '~/utils/icons'

const tabs: { to: string, icon: IconName, label: string, main?: boolean }[] = [
  { to: '/', icon: 'dashboard', label: 'Bord' },
  { to: '/carburant', icon: 'pin', label: 'Prix' },
  // Le plein, geste principal, au centre de la planche de bord
  { to: '/plein', icon: 'pump', label: 'Plein', main: true },
  { to: '/entretien', icon: 'wrench', label: 'Entretien' },
  { to: '/bilan', icon: 'medal', label: 'Bilan' },
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
      <img src="/icon.svg" alt="" width="30" height="30">
      <span>{{ APP.name }}</span>
    </NuxtLink>
    <span class="topbar-tagline">{{ APP.tagline }}</span>
  </header>
  <main class="container">
    <NuxtPage />
  </main>
  <nav class="tabbar" aria-label="Navigation principale">
    <div class="tabbar-inner">
      <NuxtLink v-for="tab in tabs" :key="tab.to" :to="tab.to" class="tab" :class="{ 'tab-main': tab.main }">
        <span v-if="tab.main" class="tab-bubble"><AppIcon :name="tab.icon" /></span>
        <AppIcon v-else :name="tab.icon" />
        {{ tab.label }}
      </NuxtLink>
    </div>
  </nav>
</template>

<style scoped>
.topbar-tagline { color: var(--dash-muted); font: 500 .7rem/1 var(--font-mono); letter-spacing: .08em; text-transform: uppercase; }
</style>
