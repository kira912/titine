<script setup lang="ts">
/**
 * Prix au litre comme sur la pompe : le millième en exposant (1,70⁹).
 * `tone` : `best` pour le moins cher, `dark` pour un afficheur de totem.
 */
const props = defineProps<{ value: number, unit?: boolean, tone?: 'best' | 'dark' }>()

const parts = computed(() => {
  const text = formatNumber(props.value, 3)
  return { main: text.slice(0, -1), last: text.slice(-1) }
})
</script>

<template>
  <span class="pump-price" :class="tone && `pump-price-${tone}`" :aria-label="`${formatEuro(value, 3)} le litre`">
    <span aria-hidden="true">{{ parts.main }}<sup>{{ parts.last }}</sup><small v-if="unit"> €/L</small></span>
  </span>
</template>

<style scoped>
.pump-price { display: inline-block; font: 700 1.35rem/1 var(--font-display); font-variant-numeric: tabular-nums; white-space: nowrap; }
.pump-price sup { font-size: .6em; vertical-align: .55em; margin-left: .03em; }
.pump-price small { font-size: .55em; font-weight: 600; color: var(--muted); }
.pump-price-dark, .pump-price-best { padding: .3rem .5rem .25rem; border-radius: 5px; background: var(--dash); color: var(--dash-glow); box-shadow: inset 0 0 0 1px var(--dash-line); text-shadow: 0 0 12px color-mix(in srgb, var(--ctp-yellow) 35%, transparent); }
.pump-price-best { background: var(--ok); color: var(--ctp-crust); box-shadow: none; text-shadow: none; }
.pump-price-dark small, .pump-price-best small { color: inherit; opacity: .75; }
</style>
