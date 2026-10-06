<script setup lang="ts">
useSeoMeta({ title: 'Mon véhicule', robots: 'noindex, nofollow' })

const { vehicle, ready } = useVehicle()
const saved = ref(false)
</script>

<template>
  <NoVehicle v-if="ready && !vehicle" />

  <div v-else-if="vehicle" class="stack">
    <section class="card">
      <h1>Mon véhicule</h1>
    <!-- La clé recrée le formulaire avec les valeurs enregistrées après chaque sauvegarde -->
    <VehicleForm :key="JSON.stringify(vehicle)" :vehicle="vehicle" submit-label="Enregistrer" @saved="saved = true" />
    <p v-if="saved" class="badge badge-ok" role="status" style="margin-top: .9rem">
      Modifications enregistrées.
    </p>
    </section>

    <BackupCard />
  </div>
</template>
