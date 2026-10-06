<script setup lang="ts">
useSeoMeta({ title: 'Mon véhicule', robots: 'noindex, nofollow' })

const { vehicle, ready } = useVehicle()
const saved = ref(false)
</script>

<template>
  <NoVehicle v-if="ready && !vehicle" />

  <div v-else-if="vehicle" class="stack">
    <section class="card registration">
      <span class="eyebrow">Certificat d'immatriculation, en plus simple</span>
      <h1>Mon véhicule</h1>
      <!-- La clé recrée le formulaire avec les valeurs enregistrées après chaque sauvegarde -->
      <VehicleForm :key="JSON.stringify(vehicle)" :vehicle="vehicle" submit-label="Enregistrer" @saved="saved = true" />
      <p v-if="saved" class="note note-ok" role="status" style="margin: .9rem 0 0">
        Modifications enregistrées.
      </p>
    </section>

    <CritAirCard :vehicle="vehicle" />

    <BackupCard />
  </div>
</template>

<style scoped>
.registration { border-top: 4px solid var(--ctp-teal); }
</style>
