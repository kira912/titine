<script setup lang="ts">
import type { NuxtError } from '#app'
import { APP } from '#shared/app'

const props = defineProps<{ error: NuxtError }>()
const notFound = computed(() => props.error.statusCode === 404)

useSeoMeta({
  title: () => (notFound.value ? 'Page introuvable' : 'Erreur'),
  robots: 'noindex, follow',
})
</script>

<template>
  <header class="topbar">
    <NuxtLink to="/" class="brand">
      <img src="/icon.svg" alt="" width="30" height="30">
      <span>{{ APP.name }}</span>
    </NuxtLink>
  </header>
  <main class="container stack">
    <section>
      <span class="eyebrow">{{ notFound ? 'Erreur 404 · route barrée' : 'Panne' }}</span>
      <h1>{{ notFound ? 'Cette page n\'existe pas' : 'Une erreur est survenue' }}</h1>
      <p class="muted">
        {{ notFound
          ? 'Le lien est peut-être incomplet, ou cette commune n\'a pas de station-service référencée.'
          : 'Réessaie dans un instant. Ton carnet, lui, est intact : il est enregistré sur ton appareil.' }}
      </p>
      <div class="row" style="justify-content: flex-start">
        <button class="btn btn-primary" @click="clearError({ redirect: '/' })">
          Retour à l'accueil
        </button>
        <button class="btn btn-ghost" @click="clearError({ redirect: '/prix-carburant' })">
          Prix par ville
        </button>
      </div>
    </section>
    <PopularCities />
  </main>
</template>
