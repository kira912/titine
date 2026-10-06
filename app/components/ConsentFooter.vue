<script setup lang="ts">
// Retirer ou donner son accord à tout moment, depuis n'importe quelle page
const { gaId } = useRuntimeConfig().public
const { consent, known, load, choose } = useConsent()
onMounted(load)
</script>

<template>
  <footer v-if="gaId && known && consent !== null" class="consent-footer">
    Mesure d'audience (Google Analytics) : {{ consent === 'granted' ? 'acceptée' : 'refusée' }} ·
    <button type="button" class="link-btn" @click="choose(consent === 'granted' ? 'denied' : 'granted')">
      {{ consent === 'granted' ? 'Retirer mon accord' : 'L\'accepter' }}
    </button>
  </footer>
</template>

<style scoped>
.consent-footer { margin-top: 2rem; padding-top: 1rem; border-top: 1px dashed var(--border); color: var(--muted); font-size: .8rem; text-align: center; }
.consent-footer .link-btn { color: var(--muted); }
</style>
