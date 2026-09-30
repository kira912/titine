<script setup lang="ts">
import { APP } from '#shared/app'

const { data: cities } = await useFetch('/api/cities', { default: () => [] })

const title = 'Prix des carburants par ville en France'
const description = 'Les prix du gazole, du SP95-E10, du SP98, de l\'E85 et du GPL dans les stations-service de chaque ville de France, mis à jour toutes les 30 minutes.'

useSeoMeta({ title, description, ogTitle: title, ogDescription: description })
useBreadcrumbs([
  { name: 'Accueil', path: '/' },
  { name: 'Prix des carburants', path: '/prix-carburant' },
])
</script>

<template>
  <div class="stack">
    <nav aria-label="Fil d'Ariane" class="small">
      <NuxtLink to="/">Accueil</NuxtLink> › <span aria-current="page">Prix des carburants</span>
    </nav>

    <section>
      <h1>Prix des carburants par ville</h1>
      <p class="muted">
        Compare les prix à la pompe station par station. Les relevés viennent des données publiques
        transmises par les stations-service et sont actualisés toutes les 30 minutes.
      </p>
      <NuxtLink to="/carburant" class="btn btn-primary">
        📍 Le moins cher autour de moi
      </NuxtLink>
    </section>

    <section class="card">
      <h2>Les villes les mieux pourvues en stations</h2>
      <ul v-if="cities.length" class="city-list">
        <li v-for="city in cities" :key="city.slug">
          <NuxtLink :to="`/prix-carburant/${city.slug}`">{{ city.name }} ({{ city.department }})</NuxtLink>
          <span class="muted small"> · {{ city.stations }} station{{ city.stations > 1 ? 's' : '' }}</span>
        </li>
      </ul>
      <p v-else class="muted" style="margin: 0">
        Les prix ne sont pas encore disponibles. Reviens dans quelques minutes.
      </p>
      <p class="muted small" style="margin: .75rem 0 0">
        Chaque page de ville renvoie vers les communes voisines : toutes les communes équipées d'une station sont accessibles de proche en proche.
      </p>
    </section>

    <section class="card callout">
      <h2>{{ APP.name }}, {{ APP.tagline.toLowerCase() }}</h2>
      <p>{{ APP.description }}</p>
      <NuxtLink to="/" class="btn btn-ghost">
        Créer mon carnet gratuitement
      </NuxtLink>
    </section>
  </div>
</template>
