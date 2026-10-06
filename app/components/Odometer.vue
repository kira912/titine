<script setup lang="ts">
/** Compteur kilométrique à rouleaux ; les chiffres défilent jusqu'à la valeur à l'affichage */
const props = withDefaults(defineProps<{ value: number, digits?: number }>(), { digits: 6 })

const text = computed(() => String(Math.max(0, Math.round(props.value))).padStart(props.digits, '0'))
const rolled = ref(false)
onMounted(() => requestAnimationFrame(() => (rolled.value = true)))
</script>

<template>
  <span class="odometer" role="img" :aria-label="formatKm(value)">
    <span v-for="(digit, index) in text" :key="index" class="drum" aria-hidden="true">
      <span class="strip" :style="{ transform: `translateY(${rolled ? -Number(digit) * 10 : 0}%)`, transitionDelay: `${index * 70}ms` }">
        <span v-for="n in 10" :key="n">{{ n - 1 }}</span>
      </span>
    </span>
    <span class="unit" aria-hidden="true">km</span>
  </span>
</template>

<style scoped>
.odometer { display: inline-flex; align-items: center; gap: 3px; font: 500 1.9rem/1 var(--font-mono); }
.drum {
  position: relative;
  width: .82em;
  height: 1.3em;
  overflow: hidden;
  border-radius: 3px;
  background: linear-gradient(var(--ctp-crust) 0%, var(--ctp-mantle) 25%, var(--ctp-surface0) 50%, var(--ctp-mantle) 75%, var(--ctp-crust) 100%);
  color: var(--ctp-text);
  box-shadow: inset 0 0 0 1px var(--ctp-surface0);
}
.strip { display: grid; transition: transform 1.1s cubic-bezier(.2, .7, .2, 1); }
.strip span { display: grid; place-items: center; height: 1.3em; }
/* Dernier rouleau inversé, comme sur les vieux compteurs */
.drum:nth-last-child(2) { color: var(--ctp-crust); background: linear-gradient(color-mix(in srgb, var(--ctp-text) 70%, var(--ctp-crust)), var(--ctp-text) 50%, color-mix(in srgb, var(--ctp-text) 70%, var(--ctp-crust))); }
.unit { margin-left: .35rem; color: var(--dash-muted); font: 500 .8rem var(--font-mono); letter-spacing: .08em; text-transform: uppercase; }
</style>
