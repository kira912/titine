<script setup lang="ts">
import { critAir } from '#shared/critair'
import type { Vehicle } from '#shared/types'

const props = defineProps<{ vehicle: Pick<Vehicle, 'fuel' | 'firstRegistration'> }>()
const value = computed(() => (props.vehicle.firstRegistration ? critAir(props.vehicle.fuel, props.vehicle.firstRegistration) : undefined))
</script>

<template>
  <section class="card">
    <span class="eyebrow">Vignette</span>
    <div v-if="value !== undefined" class="critair-row">
      <CritAirBadge :value="value" class="critair-big" />
      <div>
        <h2 style="margin: 0">
          {{ value === null ? 'Non classé Crit\'Air' : `Crit'Air ${value}` }}
        </h2>
        <p class="muted small" style="margin: .2rem 0 0">
          D'après le carburant et la date de mise en circulation. Si la norme Euro figure sur ta carte grise (case V.9), c'est elle qui fait foi.
        </p>
      </div>
    </div>
    <p v-else class="muted" style="margin: 0">
      Renseigne la date de mise en circulation (case B de la carte grise) pour connaître ta vignette Crit'Air.
    </p>
    <p class="small" style="margin: .9rem 0 0">
      <template v-if="value === null">
        Un véhicule non classé ne peut pas avoir de vignette : c'est le premier concerné par les restrictions de circulation (zones à faibles émissions, pics de pollution). Vérifie les règles locales avant de partir.
      </template>
      <template v-else>
        Les restrictions (zones à faibles émissions, circulation différenciée lors des pics de pollution) changent d'une ville à l'autre :
        vérifie les règles locales avant de partir.
      </template>
      <a href="https://www.certificat-air.gouv.fr/" target="_blank" rel="noopener">Commander la vignette officielle</a>
    </p>
  </section>
</template>

<style scoped>
.critair-row { display: flex; align-items: center; gap: 1rem; }
.critair-big { font-size: 1.6rem; }
</style>
