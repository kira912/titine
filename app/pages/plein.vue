<script setup lang="ts">
import { consumptionSegments, odometerConflict } from '#shared/consumption'
import { today } from '#shared/dates'
import { achievements, newlyUnlocked, type Achievement } from '#shared/achievements'
import { LIMITS } from '#shared/credibility'
import { fillUpSaving } from '#shared/savings'
import type { FillUpStation, NearbyStation, StationDetail } from '#shared/types'

useSeoMeta({ title: 'Plein', robots: 'noindex, nofollow' })

const { vehicle, ready } = useVehicle()
const fillUps = useFillUps()
const services = useServices()
const badges = useAchievements()
/** Badges débloqués par le dernier plein enregistré */
const unlocked = ref<Achievement[]>([])

const route = useRoute()
const router = useRouter()

const blank = () => ({ liters: '', totalPrice: '', odometer: '', date: today(), full: true })
const form = reactive(blank())
const error = ref('')
const saved = ref('')

const liters = computed(() => parseDecimal(form.liters))
const totalPrice = computed(() => parseDecimal(form.totalPrice))
const pricePerLiter = computed(() => (liters.value && totalPrice.value ? totalPrice.value / liters.value : null))

/** Station du plein, choisie à proximité ou depuis la page Carburant (`?station=`) */
const station = ref<StationDetail | null>(null)
const nearby = ref<NearbyStation[] | null>(null)
const stationPending = ref(false)
const stationError = ref('')
// Tant que le prix payé n'a pas été saisi à la main, il suit les litres au prix de la station
const totalTouched = ref(false)

// Les prix du jour ne disent rien d'un plein plus ancien : pas de comparaison dans ce cas
const comparable = computed(() => form.date === today())

async function loadStation(id: number) {
  if (!vehicle.value) return
  stationPending.value = true
  stationError.value = ''
  try {
    station.value = await $fetch<StationDetail>(`/api/stations/${id}`, { query: { fuel: vehicle.value.fuel } })
    nearby.value = null
  }
  catch {
    stationError.value = navigator.onLine ? 'Station introuvable.' : 'Pas de réseau : la station ne peut pas être chargée.'
  }
  finally {
    stationPending.value = false
  }
}

async function findNearby() {
  if (!vehicle.value) return
  stationPending.value = true
  stationError.value = ''
  try {
    const position = await currentPosition().catch((failure: Error) => {
      stationError.value = failure.message
    })
    if (!position) return
    const list = await $fetch<NearbyStation[]>('/api/stations', { query: { ...position, fuel: vehicle.value.fuel, radius: 3 } })
    nearby.value = list.sort((a, b) => a.distanceKm - b.distanceKm).slice(0, 5)
    if (!nearby.value.length) stationError.value = 'Aucune station à moins de 3 km.'
  }
  catch {
    stationError.value = navigator.onLine ? 'Les stations sont momentanément indisponibles.' : 'Pas de réseau : les stations ne sont pas disponibles hors ligne.'
  }
  finally {
    stationPending.value = false
  }
}

function clearStation() {
  station.value = null
  nearby.value = null
  stationError.value = ''
  if (route.query.station) return router.replace({ query: {} })
}

// Le véhicule change à chaque plein (kilométrage) : seul son carburant compte ici
watch([() => vehicle.value?.fuel, () => route.query.station], ([fuel, id]) => {
  const stationId = Number(id)
  if (fuel && Number.isSafeInteger(stationId) && stationId > 0 && station.value?.id !== stationId) void loadStation(stationId)
}, { immediate: true })

watch([liters, () => station.value?.price], ([value, price]) => {
  if (totalTouched.value || !price) return
  form.totalPrice = value ? formatNumber(value * price, 2).replace(/\s/g, '') : ''
})

function stationRecord(): FillUpStation | null {
  if (!station.value) return null
  const { id, address, city, price, localAverage } = station.value
  return { id, address, city, price: comparable.value ? price : null, localAverage: comparable.value ? localAverage : null }
}


/** Prix payé très éloigné du prix affiché : faute de frappe probable, et pas d'économie comptée */
const priceMismatch = computed(() => {
  const displayed = station.value?.price
  return Boolean(comparable.value && displayed && pricePerLiter.value
    && Math.abs(pricePerLiter.value - displayed) > LIMITS.stationPriceTolerance)
})

/** « 4,20 € de moins que la moyenne » ou « 1,10 € de plus que la moyenne » */
function savingLabel(saving: number) {
  return `${formatEuro(Math.abs(saving))} de ${saving >= 0 ? 'moins' : 'plus'} que la moyenne du coin`
}

/** Consommation du tronçon qui se termine à chaque plein complet, repérée par son kilométrage */
const consumptionByOdometer = computed(() => new Map(consumptionSegments(fillUps.value).map(s => [s.odometer, s.consumption])))
const history = computed(() => [...fillUps.value].reverse().map(fill => ({ ...fill, saving: fillUpSaving(fill) })))

async function submit() {
  saved.value = ''
  unlocked.value = []
  const odometer = parseKm(form.odometer)
  if (!vehicle.value) return
  if (liters.value === null) return void (error.value = 'Indique le nombre de litres.')
  if (totalPrice.value === null) return void (error.value = 'Indique le prix payé.')
  if (!odometer) return void (error.value = 'Indique le kilométrage au compteur.')
  if (!form.date || form.date > today()) return void (error.value = 'Indique une date passée ou celle du jour.')

  const conflict = odometerConflict(fillUps.value, { date: form.date, odometer })
  if (conflict) {
    return void (error.value = `Kilométrage incohérent avec le plein du ${formatDate(conflict.date)} (${formatKm(conflict.odometer)}).`)
  }

  error.value = ''
  const before = badges.value
  const fillUp = { date: form.date, odometer, liters: liters.value, totalPrice: totalPrice.value, full: form.full, station: stationRecord() }
  await addFillUp(vehicle.value, fillUp)
  Object.assign(form, blank())
  totalTouched.value = false
  await clearStation()

  // La liste réactive n'est pas encore à jour : on relit la base pour annoncer la consommation du plein
  const allFillUps = await useLocalDb().fillUps.toArray()
  const consumption = new Map(consumptionSegments(allFillUps).map(s => [s.odometer, s.consumption])).get(odometer)
  unlocked.value = newlyUnlocked(before, achievements({ fillUps: allFillUps, services: services.value }))
  const saving = fillUpSaving(fillUp)
  saved.value = [
    consumption === undefined ? 'Plein enregistré.' : `Plein enregistré : ${formatNumber(consumption, 1)} L/100 km depuis le plein précédent.`,
    saving === null ? '' : `${saving >= 0 ? 'Bien joué : ' : ''}${savingLabel(saving)}.`,
  ].filter(Boolean).join(' ')
}

function remove(id: number) {
  if (confirm('Supprimer ce plein ?')) void deleteFillUp(id)
}
</script>

<template>
  <NoVehicle v-if="ready && !vehicle" />

  <div v-else-if="vehicle" class="stack">
    <section class="card">
      <h1>Nouveau plein</h1>
      <form class="form" @submit.prevent="submit">
        <div class="station-pick">
          <template v-if="station">
            <div>
              <strong>{{ formatStation(station) }}</strong>
              <div class="muted small">
                <template v-if="station.price">
                  {{ formatEuro(station.price, 3) }}/L
                  <template v-if="station.localAverage"> · moyenne du coin {{ formatEuro(station.localAverage, 3) }}/L</template>
                </template>
                <template v-else-if="station.shortageSince">
                  En rupture {{ formatSince(station.shortageSince) }}
                </template>
                <template v-else>
                  Pas de prix récent pour ce carburant
                </template>
              </div>
              <StationReports :station-id="station.id" :fuel="vehicle.fuel" :reports="station.reports" />
            </div>
            <button type="button" class="btn btn-small btn-ghost" @click="clearStation">
              Changer
            </button>
          </template>
          <template v-else-if="nearby">
            <span class="muted small">Dans quelle station ?</span>
            <div class="station-choices">
              <button v-for="place in nearby" :key="place.id" type="button" class="btn btn-small btn-ghost" @click="loadStation(place.id)">
                {{ formatStation(place) }} · {{ formatNumber(place.distanceKm, 1) }} km · {{ formatEuro(place.price, 3) }}
              </button>
            </div>
          </template>
          <button v-else type="button" class="btn btn-small btn-ghost" :disabled="stationPending" @click="findNearby">
            {{ stationPending ? 'Recherche…' : '📍 Choisir la station' }}
          </button>
          <p v-if="stationError" class="muted small" style="margin: 0; flex-basis: 100%">
            {{ stationError }}
          </p>
        </div>
        <div class="fields">
          <label class="field">
            Litres
            <input v-model="form.liters" type="text" inputmode="decimal" placeholder="42,5" autofocus required>
          </label>
          <label class="field">
            Prix payé (€)
            <input v-model="form.totalPrice" type="text" inputmode="decimal" placeholder="72,30" required @input="totalTouched = true">
          </label>
          <label class="field">
            Kilométrage
            <input v-model="form.odometer" type="text" inputmode="numeric" :placeholder="formatNumber(vehicle.odometer)" required>
          </label>
        </div>
        <div class="row">
          <label class="field-inline">
            <input v-model="form.full" type="checkbox">
            Plein complet
          </label>
          <label class="field-inline">
            <span class="muted small">Date</span>
            <input v-model="form.date" type="date" :max="today()" class="date" required>
          </label>
        </div>
        <p v-if="pricePerLiter" class="muted small" style="margin: 0">
          Soit {{ formatEuro(pricePerLiter, 3) }} le litre.
        </p>
        <p v-if="priceMismatch" class="badge badge-soon" style="justify-self: start; white-space: normal">
          Le prix au litre est très éloigné de celui affiché par la station ({{ formatEuro(station!.price!, 3) }}) : vérifie ta saisie.
          Sinon, ce plein ne comptera pas dans tes économies.
        </p>
        <p v-if="station && !comparable" class="muted small" style="margin: 0">
          La comparaison avec les prix du coin ne se fait que pour un plein du jour.
        </p>
        <p v-if="!form.full" class="muted small" style="margin: 0">
          Un plein partiel est compté dans la consommation au prochain plein complet.
        </p>
        <p v-if="error" class="error" role="alert">
          {{ error }}
        </p>
        <button class="btn btn-primary btn-block">
          Enregistrer le plein
        </button>
        <p v-if="saved" class="badge badge-ok" role="status" style="justify-self: start">
          {{ saved }}
        </p>
        <NuxtLink v-for="badge in unlocked" :key="badge.id" to="/bilan" class="unlocked" role="status">
          <span aria-hidden="true">{{ badge.emoji }}</span>
          <span>Nouveau badge : <strong>{{ badge.title }}</strong></span>
        </NuxtLink>
      </form>
    </section>

    <section v-if="history.length" class="card">
      <h2>Historique</h2>
      <ul class="list">
        <li v-for="fill in history" :key="fill.id" class="list-item">
          <div>
            <strong>{{ formatDate(fill.date) }}</strong> · {{ formatKm(fill.odometer) }}
            <div class="muted small">
              {{ formatNumber(fill.liters, 2) }} L · {{ formatEuro(fill.totalPrice) }} · {{ formatEuro(fill.totalPrice / fill.liters, 3) }}/L
              <template v-if="!fill.full"> · partiel</template>
            </div>
            <div v-if="fill.station" class="muted small">
              {{ formatStation(fill.station) }}
              <span v-if="fill.saving !== null" class="badge" :class="fill.saving >= 0 ? 'badge-ok' : 'badge-soon'" :title="savingLabel(fill.saving)">
                {{ fill.saving >= 0 ? '−' : '+' }}{{ formatEuro(Math.abs(fill.saving)) }}
              </span>
            </div>
          </div>
          <div class="row" style="flex-wrap: nowrap">
            <span v-if="consumptionByOdometer.has(fill.odometer)" class="price">
              {{ formatNumber(consumptionByOdometer.get(fill.odometer)!, 1) }}
              <span class="muted small" style="font-weight: 400">L/100</span>
            </span>
            <button class="btn btn-small btn-danger" :aria-label="`Supprimer le plein du ${formatDate(fill.date)}`" @click="remove(fill.id)">
              ✕
            </button>
          </div>
        </li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.unlocked { display: flex; align-items: center; gap: .6rem; padding: .6rem .9rem; border-radius: 12px; background: var(--accent-soft); color: var(--text); text-decoration: none; animation: pop .4s ease-out; }
.unlocked > span:first-child { font-size: 1.5rem; }
@keyframes pop { from { transform: scale(.9); opacity: 0; } }
@media (prefers-reduced-motion: reduce) { .unlocked { animation: none; } }
.station-pick { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: .5rem; }
.station-choices { display: grid; gap: .4rem; flex-basis: 100%; }
.station-choices .btn { justify-content: flex-start; text-align: left; height: auto; padding-block: .4rem; }
.field-inline .date { width: auto; min-height: 40px; padding: 0 .6rem; border: 1px solid var(--border); border-radius: 10px; background: var(--surface); color: var(--text); font: inherit; }
</style>
