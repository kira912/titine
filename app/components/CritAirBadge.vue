<script setup lang="ts">
import type { CritAir } from '#shared/critair'

/** Pastille Crit'Air, aux teintes de la palette les plus proches des vignettes officielles */
const props = defineProps<{ value: CritAir }>()
const label = computed(() => (props.value === null ? 'Non classé Crit\'Air' : `Crit'Air ${props.value}`))
</script>

<template>
  <span class="critair" :class="`critair-${value ?? 'none'}`" role="img" :aria-label="label" :title="label">
    <span aria-hidden="true">{{ value ?? 'NC' }}</span>
  </span>
</template>

<style scoped>
.critair {
  display: inline-grid;
  place-items: center;
  width: 2em;
  height: 2em;
  flex-shrink: 0;
  border-radius: 50%;
  background: var(--critair);
  color: var(--ctp-crust);
  box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--ctp-crust) 25%, transparent);
  font: 700 1.05em/1 var(--font-display);
}
.critair-1 { --critair: var(--ctp-mauve); }
.critair-2 { --critair: var(--ctp-yellow); }
.critair-3 { --critair: var(--ctp-peach); }
.critair-4 { --critair: var(--ctp-red); }
.critair-5 { --critair: var(--ctp-overlay1); }
.critair-none { --critair: var(--ctp-surface1); color: var(--ctp-text); font-size: .8em; }
</style>
