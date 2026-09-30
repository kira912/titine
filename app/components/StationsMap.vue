<script setup lang="ts">
import 'maplibre-gl/dist/maplibre-gl.css'
import type { Map as MapLibreMap, Marker, Popup } from 'maplibre-gl'
// Le worker de MapLibre est désigné par un chemin calculé à l'exécution, que Vite ne voit pas :
// on le fait compiler (avec ses dépendances) comme un worker à part et on donne son URL à MapLibre
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import type { NearbyStation } from '#shared/types'

const props = defineProps<{
  stations: NearbyStation[]
  position: { lat: number, lon: number }
  /** Station mise en avant (bulle ouverte) */
  selected: number | null
}>()
const emit = defineEmits<{ select: [id: number | null] }>()

const { mapStyle } = useRuntimeConfig().public
const container = ref<HTMLElement>()
const failed = ref(false)

let map: MapLibreMap | undefined
let maplibre: typeof import('maplibre-gl') | undefined
let userMarker: Marker | undefined
let popup: Popup | undefined
/** Vrai une fois le style chargé : la carte a sa taille définitive, le recadrage est fiable */
let loaded = false
// La popup se pose sur la bulle de prix (~35 px au-dessus du point, pointe et décalage compris)
const POPUP_OFFSET: [number, number] = [0, -36]
const markers = new Map<number, { marker: Marker, element: HTMLButtonElement }>()

const directions = (station: NearbyStation) => `https://www.google.com/maps/dir/?api=1&destination=${station.lat},${station.lon}`

/** Contenu de la bulle, construit en DOM : les adresses viennent du flux open data */
function popupContent(station: NearbyStation) {
  const root = document.createElement('div')
  root.className = 'station-popup'
  const price = document.createElement('strong')
  price.textContent = formatEuro(station.price, 3)
  const address = document.createElement('div')
  address.textContent = station.address || station.city
  const meta = document.createElement('div')
  meta.className = 'muted'
  meta.textContent = `${station.postalCode} ${station.city} · ${formatNumber(station.distanceKm, 1)} km${station.alwaysOpen ? ' · 24 h/24' : ''}`
  const link = document.createElement('a')
  link.href = directions(station)
  link.target = '_blank'
  link.rel = 'noopener'
  link.textContent = 'Itinéraire'
  root.append(price, address, meta, link)
  return root
}

function renderStations() {
  if (!map || !maplibre || !loaded) return
  for (const { marker } of markers.values()) marker.remove()
  markers.clear()

  const cheapest = props.stations[0]?.price
  // Les moins chères passent au premier plan : on les ajoute en dernier
  for (const station of [...props.stations].reverse()) {
    const element = document.createElement('button')
    element.type = 'button'
    element.className = `price-pin${station.price === cheapest ? ' price-pin-best' : ''}`
    element.textContent = formatEuro(station.price, 3)
    element.setAttribute('aria-label', `${station.address || station.city}, ${formatEuro(station.price, 3)}`)
    element.addEventListener('click', (event) => {
      event.stopPropagation()
      emit('select', station.id)
    })
    const marker = new maplibre.Marker({ element, anchor: 'bottom', offset: [0, -6] }).setLngLat([station.lon, station.lat]).addTo(map)
    markers.set(station.id, { marker, element })
  }

  const bounds = new maplibre.LngLatBounds([props.position.lon, props.position.lat], [props.position.lon, props.position.lat])
  for (const station of props.stations) bounds.extend([station.lon, station.lat])
  map.fitBounds(bounds, { padding: { top: 56, bottom: 24, left: 40, right: 40 }, maxZoom: 15, duration: 0 })
  renderSelection()
}

function renderUser() {
  if (!map || !maplibre) return
  const lngLat: [number, number] = [props.position.lon, props.position.lat]
  if (userMarker) return void userMarker.setLngLat(lngLat)
  const element = document.createElement('div')
  element.className = 'user-dot'
  element.setAttribute('aria-label', 'Ta position')
  userMarker = new maplibre.Marker({ element }).setLngLat(lngLat).addTo(map)
}

function renderSelection() {
  if (!map || !maplibre || !loaded) return
  popup?.remove()
  popup = undefined
  for (const [id, { element }] of markers) element.classList.toggle('price-pin-active', id === props.selected)

  const station = props.stations.find(s => s.id === props.selected)
  if (!station) return
  popup = new maplibre.Popup({ anchor: 'bottom', offset: POPUP_OFFSET, closeButton: false, maxWidth: '240px' })
    .setLngLat([station.lon, station.lat])
    .setDOMContent(popupContent(station))
    .addTo(map)
  // Comme Google Maps : la station passe sous le centre, ce qui laisse la place à la popup au-dessus
  map.easeTo({ center: [station.lon, station.lat], offset: [0, 70], duration: 400 })
}

onMounted(async () => {
  try {
    // Chargée à la demande : la bibliothèque pèse près de 1 Mo
    maplibre = await import('maplibre-gl')
    maplibre.setWorkerUrl(workerUrl)
    map = new maplibre.Map({
      container: container.value!,
      style: mapStyle,
      center: [props.position.lon, props.position.lat],
      zoom: 12,
      attributionControl: false,
      pitchWithRotate: false,
      dragRotate: false,
    })
    map.touchZoomRotate.disableRotation()
    map.addControl(new maplibre.AttributionControl({ compact: true }))
    map.addControl(new maplibre.NavigationControl({ showCompass: false }), 'top-right')
    map.on('click', () => emit('select', null))
    map.on('error', ({ error }) => console.error('[titine] carte', error))
    renderUser()
    map.once('load', () => {
      loaded = true
      // L'attribution OpenStreetMap démarre dépliée : repliée derrière son bouton ⓘ, elle ne mange pas la carte sur mobile
      container.value?.querySelector('.maplibregl-ctrl-attrib')?.classList.remove('maplibregl-compact-show')
      map!.resize()
      renderStations()
    })
  }
  catch (error) {
    console.error('[titine] carte', error)
    failed.value = true
  }
})

onBeforeUnmount(() => map?.remove())

watch(() => props.stations, renderStations)
watch(() => props.position, () => {
  renderUser()
  renderStations()
})
watch(() => props.selected, renderSelection)
</script>

<template>
  <div class="map-frame">
    <div ref="container" class="map" />
    <p v-if="failed" class="map-error muted small">
      La carte n'a pas pu se charger. La liste ci-dessous reste disponible.
    </p>
  </div>
</template>

<style scoped>
.map-frame { position: relative; overflow: hidden; border: 1px solid var(--border); border-radius: var(--radius); background: #e8eaed; }
.map { height: min(52vh, 420px); min-height: 280px; }
.map-error { position: absolute; inset: 0; display: grid; place-items: center; margin: 0; padding: 1rem; text-align: center; }

/* Bulles de prix et point de position inspirés de Google Maps (éléments créés hors du template) */
/* Pas de `position` ici : MapLibre place ses marqueurs en absolute (la pointe s'appuie dessus) */
.map :deep(.price-pin) {
  padding: 4px 9px;
  border: 0;
  border-radius: 999px;
  background: #fff;
  color: #202124;
  box-shadow: 0 1px 4px rgb(0 0 0 / .3);
  font: 600 13px/1.2 system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  cursor: pointer;
}
.map :deep(.price-pin)::after {
  content: '';
  position: absolute;
  left: 50%;
  bottom: -5px;
  width: 10px;
  height: 10px;
  background: inherit;
  transform: translateX(-50%) rotate(45deg);
  box-shadow: 2px 2px 2px rgb(0 0 0 / .12);
}
.map :deep(.price-pin-best) { background: #188038; color: #fff; }
.map :deep(.price-pin-active) { background: #1a73e8; color: #fff; z-index: 1; }
.map :deep(.price-pin:focus-visible) { outline: 2px solid #1a73e8; outline-offset: 2px; }

.map :deep(.user-dot) {
  width: 18px;
  height: 18px;
  border: 3px solid #fff;
  border-radius: 50%;
  background: #1a73e8;
  box-shadow: 0 0 0 8px rgb(26 115 232 / .2), 0 1px 4px rgb(0 0 0 / .3);
}

.map :deep(.maplibregl-popup) { z-index: 2; }
.map :deep(.maplibregl-popup-content) { padding: .6rem .75rem; border-radius: 10px; color: #202124; font: 14px/1.4 system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; }
.map :deep(.station-popup) { display: grid; gap: 2px; }
.map :deep(.station-popup strong) { font-size: 1.05rem; }
.map :deep(.station-popup .muted) { color: #5f6368; font-size: .8rem; }
.map :deep(.station-popup a) { color: #1a73e8; font-weight: 600; text-decoration: none; margin-top: 2px; }
</style>
