<script setup lang="ts">
import type { Segment } from '#shared/consumption'

/** Consommation plein après plein (au moins deux tronçons) */
const props = defineProps<{ segments: Segment[] }>()

const HEIGHT = 180
const PAD = { top: 16, right: 16, bottom: 26, left: 36 }

const container = ref<HTMLElement>()
const width = ref(600)
let observer: ResizeObserver | undefined
onMounted(() => {
  observer = new ResizeObserver(([entry]) => {
    if (entry) width.value = Math.max(260, Math.round(entry.contentRect.width))
  })
  if (container.value) observer.observe(container.value)
})
onBeforeUnmount(() => observer?.disconnect())

const domain = computed(() => {
  const values = props.segments.map(s => s.consumption)
  const min = Math.min(...values)
  const max = Math.max(...values)
  // Graduations « rondes » (pas de 1, 2 ou 5 × 10^n) encadrant les valeurs, pour ~3 lignes de grille
  const raw = Math.max(max - min, 1) / 2
  const mag = 10 ** Math.floor(Math.log10(raw))
  const step = ([1, 2, 5, 10].find(m => m * mag >= raw) ?? 10) * mag
  const lo = Math.max(0, Math.floor(min / step) * step)
  let hi = Math.ceil(max / step) * step
  if (hi === lo) hi += step
  return { lo, hi, step }
})

const plotW = computed(() => width.value - PAD.left - PAD.right)
const plotH = HEIGHT - PAD.top - PAD.bottom
const x = (index: number) => PAD.left + (index / Math.max(props.segments.length - 1, 1)) * plotW.value
const y = (value: number) => PAD.top + (1 - (value - domain.value.lo) / (domain.value.hi - domain.value.lo)) * plotH

const points = computed(() => props.segments.map((segment, i) => ({ ...segment, x: x(i), y: y(segment.consumption) })))
const path = computed(() => points.value.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' '))
/** Aire sous la courbe, refermée sur la ligne de base */
const area = computed(() => `${path.value} L${last.value.x.toFixed(1)},${HEIGHT - PAD.bottom} L${first.value.x.toFixed(1)},${HEIGHT - PAD.bottom} Z`)

const ticks = computed(() => {
  const { lo, hi, step } = domain.value
  const out: number[] = []
  for (let v = lo; v <= hi + 1e-6; v += step) out.push(v)
  return out
})
const tickLabel = (value: number) => formatNumber(value, domain.value.step < 1 ? 1 : 0)
const litres = (value: number) => `${formatNumber(value, 1)} L/100 km`

// Survol : le réticule se cale sur le plein le plus proche du pointeur
const active = ref<number | null>(null)
function onPointer(event: PointerEvent) {
  const rect = (event.currentTarget as SVGElement).getBoundingClientRect()
  const ratio = (event.clientX - rect.left - PAD.left) / plotW.value
  active.value = Math.min(points.value.length - 1, Math.max(0, Math.round(ratio * (points.value.length - 1))))
}
function onKey(event: KeyboardEvent) {
  const n = points.value.length
  if (event.key === 'ArrowRight') active.value = Math.min(n - 1, (active.value ?? -1) + 1)
  else if (event.key === 'ArrowLeft') active.value = Math.max(0, (active.value ?? n) - 1)
  else return
  event.preventDefault()
}
const activePoint = computed(() => (active.value === null ? null : points.value[active.value] ?? null))
const first = computed(() => points.value[0]!)
const last = computed(() => points.value.at(-1)!)
</script>

<template>
  <figure ref="container" class="chart-figure">
    <svg
      class="chart"
      :height="HEIGHT"
      :viewBox="`0 0 ${width} ${HEIGHT}`"
      role="img"
      :aria-label="`Consommation par plein, de ${litres(first.consumption)} à ${litres(last.consumption)}`"
      tabindex="0"
      @pointermove="onPointer"
      @pointerdown="onPointer"
      @pointerleave="active = null"
      @focus="active = points.length - 1"
      @blur="active = null"
      @keydown="onKey"
    >
      <template v-for="tick in ticks" :key="tick">
        <line class="chart-grid" :x1="PAD.left" :x2="width - PAD.right" :y1="y(tick)" :y2="y(tick)" />
        <text class="chart-label" :x="PAD.left - 8" :y="y(tick)" text-anchor="end" dominant-baseline="middle">{{ tickLabel(tick) }}</text>
      </template>
      <text class="chart-label" :x="PAD.left" :y="HEIGHT - 6">{{ formatDate(first.date) }}</text>
      <text class="chart-label" :x="width - PAD.right" :y="HEIGHT - 6" text-anchor="end">{{ formatDate(last.date) }}</text>

      <path class="chart-area" :d="area" />
      <path class="chart-line" :d="path" />
      <circle v-for="(point, i) in points" :key="i" class="chart-dot" :cx="point.x" :cy="point.y" r="4" />

      <g v-if="activePoint">
        <line class="chart-cursor" :x1="activePoint.x" :x2="activePoint.x" :y1="PAD.top" :y2="HEIGHT - PAD.bottom" />
        <circle class="chart-dot" :cx="activePoint.x" :cy="activePoint.y" r="6" />
      </g>
    </svg>

    <div
      v-if="activePoint"
      class="chart-tooltip"
      :style="{ left: `${Math.min(Math.max(activePoint.x, 90), width - 90)}px` }"
    >
      <strong>{{ litres(activePoint.consumption) }}</strong>
      <span>{{ formatDate(activePoint.date) }} · {{ formatKm(activePoint.distance) }}</span>
    </div>
  </figure>
</template>

<style scoped>
.chart-figure { position: relative; margin: 0; width: 100%; min-width: 0; }
svg { display: block; overflow: visible; touch-action: pan-y; }
svg:focus-visible { outline: 2px solid var(--accent); outline-offset: 4px; border-radius: 4px; }
.chart-label { font-size: 11px; font-variant-numeric: tabular-nums; }
.chart-dot { stroke-width: 2; }
.chart-cursor { stroke: var(--muted); stroke-width: 1; stroke-dasharray: 3 3; }
.chart-tooltip {
  position: absolute;
  top: 0;
  transform: translate(-50%, -100%);
  display: grid;
  gap: 2px;
  padding: .4rem .6rem;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  box-shadow: 0 4px 12px rgb(0 0 0 / .35);
  font-size: .8rem;
  white-space: nowrap;
  pointer-events: none;
}
.chart-tooltip strong { color: var(--accent); font: 700 1.1rem var(--font-display); }
.chart-tooltip span { color: var(--muted); }
</style>
