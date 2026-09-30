<script setup lang="ts">
import { POPULAR_CITIES } from '#shared/cities'
</script>

<template>
  <section class="card">
    <h2>Prix des carburants dans les grandes villes</h2>
    <ul class="city-list">
      <li v-for="city in POPULAR_CITIES" :key="city.slug">
        <NuxtLink :to="`/prix-carburant/${city.slug}`">Prix carburant à {{ city.name }}</NuxtLink>
      </li>
    </ul>
    <p class="small" style="margin: .75rem 0 0">
      <NuxtLink to="/prix-carburant">Toutes les villes →</NuxtLink>
    </p>
  </section>
</template>
