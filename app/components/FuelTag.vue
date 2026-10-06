<script setup lang="ts">
import { FUEL_LABELS, type Fuel } from '#shared/fuel'

/**
 * Étiquette européenne des carburants (norme EN 16942), celle des pistolets et des trappes :
 * rond pour l'essence, carré pour le gazole, losange pour les gaz.
 */
const props = withDefaults(defineProps<{
  fuel: Fuel
  /** Affiche aussi le nom commercial (SP95-E10…) à côté du pictogramme */
  label?: boolean
}>(), { label: false })

const TAGS: Record<Fuel, { code: string, shape: 'circle' | 'square' | 'diamond' }> = {
  gazole: { code: 'B7', shape: 'square' },
  e10: { code: 'E10', shape: 'circle' },
  sp95: { code: 'E5', shape: 'circle' },
  sp98: { code: 'E5', shape: 'circle' },
  e85: { code: 'E85', shape: 'circle' },
  gplc: { code: 'LPG', shape: 'diamond' },
}
const tag = computed(() => TAGS[props.fuel])
</script>

<template>
  <span class="fuel-tag" :title="FUEL_LABELS[fuel]">
    <svg viewBox="0 0 40 40" class="fuel-shape" :aria-label="label ? undefined : FUEL_LABELS[fuel]" :aria-hidden="label ? 'true' : undefined" role="img">
      <circle v-if="tag.shape === 'circle'" cx="20" cy="20" r="17.5" />
      <rect v-else-if="tag.shape === 'square'" x="3" y="3" width="34" height="34" rx="2" />
      <rect v-else x="7.5" y="7.5" width="25" height="25" rx="1.5" transform="rotate(45 20 20)" />
      <text x="20" y="20" text-anchor="middle" dominant-baseline="central" :font-size="tag.code.length > 2 ? 12 : 15">{{ tag.code }}</text>
    </svg>
    <span v-if="label" class="fuel-name">{{ FUEL_LABELS[fuel] }}</span>
  </span>
</template>

<style scoped>
.fuel-tag { display: inline-flex; align-items: center; gap: .4rem; vertical-align: middle; }
.fuel-shape { width: 1.9em; height: 1.9em; flex-shrink: 0; }
.fuel-shape circle, .fuel-shape rect { fill: var(--fuel-bg, var(--surface)); stroke: currentColor; stroke-width: 2.5; }
.fuel-shape text { fill: currentColor; font-family: var(--font-display); font-weight: 700; }
.fuel-name { font-weight: 600; white-space: nowrap; }
</style>
