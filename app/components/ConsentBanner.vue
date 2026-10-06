<script setup lang="ts">
import { APP } from '#shared/app'

// Bandeau de consentement à la mesure d'audience : refuser est aussi simple qu'accepter
const { gaId } = useRuntimeConfig().public
const { consent, known, load, choose } = useConsent()
onMounted(load)
</script>

<template>
  <aside v-if="gaId && known && consent === null" class="consent" role="dialog" aria-label="Mesure d'audience">
    <p>
      <strong>Mesure d'audience.</strong> Avec ton accord, {{ APP.name }} utilise Google Analytics (cookies) pour compter les visites
      et savoir quelles pages servent. Ton carnet, lui, ne quitte jamais ton appareil.
    </p>
    <div class="consent-actions">
      <button type="button" class="btn btn-ghost btn-small" @click="choose('denied')">
        Refuser
      </button>
      <button type="button" class="btn btn-primary btn-small" @click="choose('granted')">
        Accepter
      </button>
    </div>
  </aside>
</template>

<style scoped>
.consent {
  position: fixed;
  inset: auto 12px calc(76px + env(safe-area-inset-bottom)) 12px;
  z-index: 20;
  display: grid;
  gap: .75rem;
  max-width: 560px;
  margin: 0 auto;
  padding: 1rem;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
  box-shadow: 0 12px 30px -10px rgb(0 0 0 / .6);
  font-size: .9rem;
}
.consent p { margin: 0; }
.consent-actions { display: grid; grid-template-columns: 1fr 1fr; gap: .5rem; }
</style>
