<script setup lang="ts">
import { FUELS, FUEL_LABELS, type Fuel } from '#shared/fuel'
import { SERVICES, SERVICE_LABELS, type ServiceId } from '#shared/services'
import { SERVICE_ICONS } from '~/utils/icons'
import type { NearbyShortage, NearbyStation } from '#shared/types'

const title = 'Station essence la moins chère autour de moi'
const description = 'Trouve la station-service la moins chère autour de toi : gazole, SP95-E10, SP98, E85 et GPL, avec les prix relevés par les stations, la distance et l\'itinéraire.'
useSeoMeta({ title, description, ogTitle: title, ogDescription: description })
useBreadcrumbs([
  { name: 'Accueil', path: '/' },
  { name: 'Carburant le moins cher', path: '/carburant' },
])

const RADII = [5, 10, 20, 50]
// Plafond de `/api/stations` : au-delà, la liste ne montre que les moins chères
const MAX_RESULTS = 30

const { vehicle } = useVehicle()

// Conservés d'un onglet à l'autre : on ne redemande pas la position à chaque visite
const fuel = useState<Fuel | null>('nearby-fuel', () => null)
const radius = useState('nearby-radius', () => 10)
const position = useState<{ lat: number, lon: number } | null>('nearby-position', () => null)
const stations = useState<NearbyStation[] | null>('nearby-stations', () => null)
const services = useState<ServiceId[]>('nearby-services', () => [])
const shortages = useState<NearbyShortage[]>('nearby-shortages', () => [])
const showShortages = ref(false)

function toggleService(service: ServiceId) {
  services.value = services.value.includes(service)
    ? services.value.filter(item => item !== service)
    : [...services.value, service]
}

const pending = ref<'locating' | 'loading' | null>(null)
// Page rendue côté serveur : le bouton reste inactif tant que son code n'est pas branché, sinon le clic serait perdu
const mounted = ref(false)
onMounted(() => {
  mounted.value = true
})
/** Station mise en avant sur la carte */
const selected = ref<number | null>(null)
const mapFrame = ref<HTMLElement>()

function showOnMap(id: number) {
  selected.value = id
  mapFrame.value?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
}
const error = ref('')

// Par défaut, le carburant du véhicule enregistré
const selectedFuel = computed({
  get: () => fuel.value ?? vehicle.value?.fuel ?? 'e10',
  set: (value: Fuel) => {
    fuel.value = value
  },
})

async function search() {
  if (!position.value) return
  pending.value = 'loading'
  error.value = ''
  selected.value = null
  try {
    const here = position.value
    const area = { ...coarsePosition(here), fuel: selectedFuel.value, radius: radius.value }
    const [found, missing] = await Promise.all([
      $fetch<NearbyStation[]>('/api/stations', { query: { ...area, services: services.value.join(',') || undefined } }),
      // Information d'appoint : son échec ne doit pas masquer les prix
      $fetch<NearbyShortage[]>('/api/stations/shortages', { query: area }).catch(() => []),
    ])
    stations.value = withExactDistance(found, here)
    shortages.value = withExactDistance(missing, here).sort((a, b) => a.distanceKm - b.distanceKm)
  }
  catch {
    error.value = navigator.onLine
      ? 'Les prix sont momentanément indisponibles. Réessaie dans un instant.'
      : 'Pas de réseau : les prix des stations ne sont pas disponibles hors ligne.'
  }
  finally {
    pending.value = null
  }
}

async function locate() {
  pending.value = 'locating'
  error.value = ''
  try {
    position.value = await currentPosition()
  }
  catch (failure) {
    pending.value = null
    return void (error.value = (failure as Error).message)
  }
  await search()
}

watch([selectedFuel, radius, services], () => void search())

const directions = (station: NearbyStation) => `https://www.google.com/maps/dir/?api=1&destination=${station.lat},${station.lon}`
/** Écart entre la station la moins chère et la plus chère du rayon, sur un plein de 40 L */
const saving = computed(() => {
  const list = stations.value
  return list && list.length > 1 ? (list.at(-1)!.price - list[0]!.price) * 40 : 0
})
</script>

<template>
  <div class="stack">
    <section>
      <span class="eyebrow">Prix relevés toutes les 30 minutes</span>
      <h1>Carburant le moins cher autour de moi</h1>
      <p class="muted" style="margin: 0">
        Les prix relevés par les stations-service autour de toi, du moins cher au plus cher, sur une carte.
        Choisis ton carburant et ton rayon, puis lance la recherche.
      </p>
    </section>

    <section class="card form">
      <fieldset class="group">
        <legend class="field-label">
          Carburant
        </legend>
        <div class="fuels">
          <button
            v-for="option in FUELS"
            :key="option"
            type="button"
            class="fuel-option"
            :aria-pressed="option === selectedFuel"
            @click="selectedFuel = option"
          >
            <FuelTag :fuel="option" label />
          </button>
        </div>
      </fieldset>
      <fieldset class="group">
        <legend class="field-label">
          Rayon
        </legend>
        <div class="segmented">
          <button v-for="km in RADII" :key="km" type="button" :aria-pressed="km === radius" @click="radius = km">
            {{ km }} km
          </button>
        </div>
      </fieldset>
      <fieldset class="group">
        <legend class="field-label">
          Services
        </legend>
        <div class="services">
          <button
            v-for="service in SERVICES"
            :key="service"
            type="button"
            class="chip"
            :aria-pressed="services.includes(service)"
            @click="toggleService(service)"
          >
            <AppIcon :name="SERVICE_ICONS[service]" /> {{ SERVICE_LABELS[service].label }}
          </button>
        </div>
      </fieldset>
      <button class="btn btn-primary btn-block btn-large" :disabled="!mounted || pending !== null" @click="locate">
        <AppIcon name="locate" />
        {{ pending === 'locating' ? 'Localisation…' : pending === 'loading' ? 'Recherche…' : position ? 'Actualiser ma position' : 'Chercher autour de moi' }}
      </button>
      <p v-if="error" class="error" role="alert" style="margin: 0">
        {{ error }}
      </p>
    </section>

    <div v-if="position && stations?.length" ref="mapFrame" style="scroll-margin-top: 1rem">
      <StationsMap :stations="stations" :position="position" :selected="selected" @select="selected = $event" />
    </div>

    <section v-if="stations && shortages.length" class="card card-soon">
      <button type="button" class="shortage-toggle" :aria-expanded="showShortages" @click="showShortages = !showShortages">
        <AppIcon name="alert" />
        {{ shortages.length }} station{{ shortages.length > 1 ? 's' : '' }} en rupture de {{ FUEL_LABELS[selectedFuel] }} dans ce rayon
        <AppIcon name="chevron" class="toggle-chevron" />
      </button>
      <ul v-if="showShortages" class="list">
        <li v-for="shortage in shortages" :key="shortage.id" class="list-item">
          <div>
            <strong>{{ formatStation(shortage) }}</strong>
            <div class="muted small">
              {{ formatNumber(shortage.distanceKm, 1) }} km · en rupture {{ formatSince(shortage.since) }}
            </div>
          </div>
        </li>
      </ul>
    </section>

    <section v-if="stations" class="card" aria-live="polite">
      <template v-if="stations.length">
        <div class="section-head">
          <h2>
            {{ stations.length >= MAX_RESULTS ? `Les ${MAX_RESULTS} stations les moins chères` : `${stations.length} station${stations.length > 1 ? 's' : ''}` }}
            dans un rayon de {{ radius }} km
          </h2>
          <FuelTag :fuel="selectedFuel" />
        </div>
        <p v-if="saving >= 1" class="note note-accent small">
          Jusqu'à <strong>{{ formatEuro(saving) }}</strong> d'écart sur un plein de 40 L entre la première et la dernière station de cette liste.
        </p>
        <ol class="list">
          <li v-for="(station, index) in stations" :key="station.id" class="list-item" :class="{ 'list-item-active': station.id === selected }">
            <span class="rank" aria-hidden="true">{{ index + 1 }}</span>
            <div class="station-body">
              <button type="button" class="station-name" :aria-pressed="station.id === selected" @click="showOnMap(station.id)">
                {{ station.address || station.city }}
              </button>
              <span v-if="index === 0" class="badge badge-ok best-badge">Le moins cher</span>
              <div class="muted small">
                {{ station.postalCode }} {{ station.city }} · {{ formatNumber(station.distanceKm, 1) }} km
                <template v-if="station.alwaysOpen"> · 24 h/24</template>
              </div>
              <div v-if="station.services.length" class="station-services">
                <span v-for="service in station.services" :key="service" :title="SERVICE_LABELS[service].label" role="img" :aria-label="SERVICE_LABELS[service].label"><AppIcon :name="SERVICE_ICONS[service]" /></span>
              </div>
              <div class="muted small station-links">
                Relevé le {{ formatDate(station.updatedAt) }} ·
                <a :href="directions(station)" target="_blank" rel="noopener">Itinéraire</a>
                <template v-if="vehicle?.fuel === selectedFuel">
                  · <NuxtLink :to="{ path: '/plein', query: { station: station.id } }">J'ai fait le plein ici</NuxtLink>
                </template>
              </div>
              <StationReports :station-id="station.id" :fuel="selectedFuel" :reports="station.reports" />
            </div>
            <PumpPrice :value="station.price" :tone="index === 0 ? 'best' : 'dark'" />
          </li>
        </ol>
      </template>
      <p v-else class="muted" style="margin: 0">
        Aucune station ne vend du {{ FUEL_LABELS[selectedFuel] }}
        <template v-if="services.length">avec ces services</template> dans un rayon de {{ radius }} km.
        Essaie un rayon plus large{{ services.length ? ' ou moins de services' : '' }}.
      </p>
    </section>

    <section class="card">
      <h2>D'où viennent les prix ?</h2>
      <p>
        Les stations-service françaises sont tenues de déclarer leurs prix à chaque changement. Titine récupère ces relevés
        publics toutes les 30 minutes : gazole, SP95-E10, SP95, SP98, E85 et GPL. Un prix qui n'a pas été mis à jour
        depuis plus de 30 jours n'est pas affiché, car la station est souvent fermée.
      </p>
      <p class="muted small" style="margin: 0">
        Source : prix des carburants en France, données publiques du ministère de l'Économie.
      </p>
    </section>

    <PopularCities />
  </div>
</template>

<style scoped>
.group { display: grid; gap: .5rem; margin: 0; padding: 0; border: 0; min-width: 0; }
.group legend { margin-bottom: .5rem; padding: 0; }
.fuels { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: .4rem; }
.fuel-option { display: flex; align-items: center; min-height: 48px; padding: .3rem .6rem; border: 1px solid var(--border); border-radius: var(--radius-small); background: var(--sunken); color: var(--muted); font: inherit; cursor: pointer; }
.fuel-option[aria-pressed='true'] { border-color: var(--accent); background: var(--accent-soft); color: var(--accent); }
.fuel-option :deep(.fuel-name) { color: var(--text); }
.services { display: flex; flex-wrap: wrap; gap: .4rem; }
.shortage-toggle { display: flex; align-items: center; gap: .5rem; width: 100%; padding: 0; border: 0; background: none; color: var(--warn); font: inherit; font-weight: 600; text-align: left; cursor: pointer; }
.toggle-chevron { margin-left: auto; transition: transform .15s ease; }
.shortage-toggle[aria-expanded='true'] .toggle-chevron { transform: rotate(90deg); }
.list-item { align-items: flex-start; }
.rank { width: 1.6rem; flex-shrink: 0; padding-top: .1rem; color: var(--muted); font: 600 1.1rem/1.2 var(--font-display); }
.station-body { flex: 1; min-width: 0; display: grid; gap: .2rem; }
.best-badge { justify-self: start; }
.station-name { justify-self: start; padding: 0; border: 0; background: none; color: inherit; font: 600 1.05rem var(--font-body); text-align: left; cursor: pointer; }
.station-name:hover { color: var(--accent); }
.list-item-active { margin: 0 -.6rem; padding-inline: .6rem; border-radius: var(--radius-small); background: var(--accent-soft); }
</style>
