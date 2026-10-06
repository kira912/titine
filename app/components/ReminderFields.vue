<script setup lang="ts">
/** Champs communs à la création et à la modification d'un rappel */
const form = defineModel<{ label: string, intervalKm: string, intervalMonths: string }>({ required: true })
</script>

<template>
  <label class="field">
    <span>Intitulé</span>
    <input v-model="form.label" type="text" autocomplete="off" placeholder="Courroie de distribution" required>
  </label>
  <div class="fields">
    <label class="field">
      <span>Tous les … km</span>
      <input v-model="form.intervalKm" type="text" inputmode="numeric" placeholder="15 000">
    </label>
    <label class="field">
      <span>Tous les … mois</span>
      <input v-model="form.intervalMonths" type="text" inputmode="numeric" placeholder="12">
    </label>
  </div>
</template>
