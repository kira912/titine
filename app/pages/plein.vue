<script setup lang="ts">
import { consumptionSegments, odometerConflict } from '#shared/consumption'
import { today } from '#shared/dates'
import { achievements, newlyUnlocked, type Achievement } from '#shared/achievements'
import { LIMITS } from '#shared/credibility'
import { estimateOdometer } from '#shared/estimate'
import { fillUpSaving } from '#shared/savings'
import type { FillUpDraft, FillUpStation, IsoDate, NearbyStation, StationDetail } from '#shared/types'

useSeoMeta({ title: 'Plein', robots: 'noindex, nofollow' })

// Station retenue d'office si l'on est à moins de 200 m : on est à la pompe
const AUTO_PICK_KM = 0.2

const { vehicle, ready } = useVehicle()
const fillUps = useFillUps()
const services = useServices()
const badges = useAchievements()
const { data: draft, ready: draftReady } = useDraft()
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

/** Station du plein : détectée sur place, choisie à proximité ou depuis la page Carburant (`?station=`) */
const station = ref<StationDetail | null>(null)
/** Jour où le prix de la station a été relevé : celui du plein, s'il a été commencé à la pompe */
const stationDay = ref<IsoDate | null>(null)
const nearby = ref<NearbyStation[] | null>(null)
const stationPending = ref(false)
const stationError = ref('')

/** Champs tapés à la main : avec le prix de la station, l'autre se calcule */
const edited = reactive({ liters: false, totalPrice: false })
/** Début du plein repris d'un brouillon */
const resumedAt = ref<string | null>(null)

// Les prix relevés ne disent rien d'un plein fait un autre jour : pas de comparaison dans ce cas
const comparable = computed(() => Boolean(station.value) && form.date === stationDay.value)

async function loadStation(id: number) {
  if (!vehicle.value) return
  stationPending.value = true
  stationError.value = ''
  try {
    station.value = await $fetch<StationDetail>(`/api/stations/${id}`, { query: { fuel: vehicle.value.fuel } })
    stationDay.value = today()
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
    const list = await $fetch<NearbyStation[]>('/api/stations', { query: { ...coarsePosition(position), fuel: vehicle.value.fuel, radius: 3 } })
    nearby.value = withExactDistance(list, position).sort((a, b) => a.distanceKm - b.distanceKm).slice(0, 5)
    if (!nearby.value.length) stationError.value = 'Aucune station à moins de 3 km.'
  }
  catch {
    stationError.value = navigator.onLine ? 'Les stations sont momentanément indisponibles.' : 'Pas de réseau : les stations ne sont pas disponibles hors ligne.'
  }
  finally {
    stationPending.value = false
  }
}

/** Sur place, la station se choisit toute seule ; sans autorisation de localisation, on ne la demande pas d'office */
async function detectStation() {
  const fuel = vehicle.value?.fuel
  if (!fuel) return
  const permission = await navigator.permissions?.query({ name: 'geolocation' }).catch(() => null)
  if (permission?.state !== 'granted') return
  try {
    const position = await currentPosition()
    const list = await $fetch<NearbyStation[]>('/api/stations', { query: { ...coarsePosition(position), fuel, radius: 1 } })
    const closest = withExactDistance(list, position).sort((a, b) => a.distanceKm - b.distanceKm)[0]
    if (closest && closest.distanceKm <= AUTO_PICK_KM && !station.value) await loadStation(closest.id)
  }
  catch {
    // Détection silencieuse : le bouton « Choisir la station » reste disponible
  }
}

function clearStation() {
  station.value = null
  stationDay.value = null
  nearby.value = null
  stationError.value = ''
  if (route.query.station) return router.replace({ query: {} })
}

function restoreDraft(saved: FillUpDraft) {
  Object.assign(form, { liters: saved.liters, totalPrice: saved.totalPrice, odometer: saved.odometer, date: saved.date, full: saved.full })
  Object.assign(edited, saved.edited)
  station.value = saved.station
  stationDay.value = saved.stationDay
  resumedAt.value = saved.createdAt
}

function resetForm() {
  Object.assign(form, blank())
  Object.assign(edited, { liters: false, totalPrice: false })
  resumedAt.value = null
}

// Au premier affichage : station demandée, sinon plein mis de côté, sinon détection sur place
const started = ref(false)
watch([() => vehicle.value?.id, draftReady], ([id, loaded]) => {
  if (!id || !loaded || started.value) return
  started.value = true
  if (route.query.station) return
  if (draft.value) restoreDraft(draft.value)
  else void detectStation()
}, { immediate: true })

// Le véhicule change à chaque plein (kilométrage) : seul son carburant compte ici
watch([() => vehicle.value?.fuel, () => route.query.station], ([fuel, id]) => {
  const stationId = Number(id)
  if (fuel && Number.isSafeInteger(stationId) && stationId > 0 && station.value?.id !== stationId) void loadStation(stationId)
}, { immediate: true })

const decimalText = (value: number) => formatNumber(value, 2).replace(/\s/g, '')

/** Litres ou montant : au prix de la station, celui qui a été tapé donne l'autre */
function deriveAmounts() {
  const price = station.value?.price
  if (!price) return
  if (edited.liters && !edited.totalPrice) form.totalPrice = liters.value ? decimalText(liters.value * price) : ''
  else if (edited.totalPrice && !edited.liters) form.liters = totalPrice.value ? decimalText(totalPrice.value / price) : ''
}

// Tout se fait ici, sur la valeur de l'événement : un watcher sur le champ passerait avant ce gestionnaire
// (microtâches exécutées entre les écouteurs), et la première frappe ou un collage ne seraient pas pris en compte
function onAmountInput(field: 'liters' | 'totalPrice', event: Event) {
  const value = (event.target as HTMLInputElement).value
  form[field] = value
  edited[field] = value.trim() !== ''
  deriveAmounts()
}

// Station choisie après la saisie : on complète avec son prix
watch(() => station.value?.price, deriveAmounts)

const odometerEstimate = computed(() => (vehicle.value ? estimateOdometer(fillUps.value, vehicle.value.odometer, form.date) : null))
const odometerInput = ref<HTMLInputElement>()

/** Reprend l'estimation et sélectionne les trois derniers chiffres, ceux qu'il reste à corriger */
async function useEstimate() {
  if (!odometerEstimate.value) return
  form.odometer = String(odometerEstimate.value)
  await nextTick()
  const input = odometerInput.value
  if (!input) return
  input.focus()
  input.setSelectionRange(Math.max(form.odometer.length - 3, 0), form.odometer.length)
}

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

const canSaveForLater = computed(() => Boolean(station.value || form.liters || form.totalPrice || form.odometer))

/** Met le plein de côté tel quel, pour le compléter avec le ticket ou le compteur sous les yeux */
async function saveForLater() {
  if (!vehicle.value) return
  await saveDraft(vehicle.value, {
    date: form.date,
    station: toRaw(station.value),
    stationDay: stationDay.value,
    liters: form.liters,
    totalPrice: form.totalPrice,
    odometer: form.odometer,
    full: form.full,
    edited: { ...edited },
  }, resumedAt.value ?? undefined)
  await navigateTo('/')
}

async function abandonDraft() {
  if (!vehicle.value || !confirm('Abandonner ce plein ?')) return
  await deleteDraft(vehicle.value)
  resetForm()
  await clearStation()
}

/** Enregistrement en cours : un double tap ne doit pas créer deux pleins */
const saving = ref(false)

async function submit() {
  if (saving.value) return
  saving.value = true
  try {
    await savePlein()
  }
  finally {
    saving.value = false
  }
}

async function savePlein() {
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
  resetForm()
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
    <section>
      <span class="eyebrow">{{ vehicle.make }} {{ vehicle.model }}</span>
      <h1>Nouveau plein</h1>
    </section>

    <div v-if="resumedAt" class="row note note-accent">
      <span class="with-icon small"><AppIcon name="pause" /> Plein commencé {{ formatSince(resumedAt) }} : il ne reste qu'à le compléter.</span>
      <button type="button" class="btn btn-small btn-ghost" @click="abandonDraft">
        Abandonner
      </button>
    </div>

    <form class="form" @submit.prevent="submit">
      <section class="station" :class="{ 'station-set': station }">
        <template v-if="station">
          <div class="station-main">
            <span class="station-icon"><AppIcon name="pump" /></span>
            <div style="min-width: 0">
              <strong>{{ formatStation(station) }}</strong>
              <div class="muted small">
                <template v-if="station.price">
                  <template v-if="station.localAverage">Moyenne du coin {{ formatEuro(station.localAverage, 3) }}/L</template>
                  <template v-else>Prix affiché par la station</template>
                </template>
                <template v-else-if="station.shortageSince">
                  En rupture {{ formatSince(station.shortageSince) }}
                </template>
                <template v-else>
                  Pas de prix récent pour ce carburant
                </template>
              </div>
            </div>
            <PumpPrice v-if="station.price" :value="station.price" tone="dark" />
          </div>
          <div class="row">
            <StationReports :station-id="station.id" :fuel="vehicle.fuel" :reports="station.reports" />
            <button type="button" class="btn btn-small btn-ghost" @click="clearStation">
              Changer
            </button>
          </div>
        </template>
        <template v-else-if="nearby">
          <span class="eyebrow">Dans quelle station ?</span>
          <div class="station-choices">
            <button v-for="place in nearby" :key="place.id" type="button" class="station-choice" @click="loadStation(place.id)">
              <span>
                <strong>{{ formatStation(place) }}</strong>
                <span class="muted small" style="display: block">{{ formatNumber(place.distanceKm, 1) }} km</span>
              </span>
              <PumpPrice :value="place.price" />
            </button>
          </div>
        </template>
        <button v-else type="button" class="btn btn-ghost btn-block" :disabled="stationPending" @click="findNearby">
          <AppIcon name="locate" /> {{ stationPending ? 'Recherche…' : 'Choisir la station' }}
        </button>
        <p v-if="stationError" class="muted small" style="margin: 0">
          {{ stationError }}
        </p>
      </section>

      <div class="fields amounts">
        <label class="field">
          <span>Litres</span>
          <span class="unit-input">
            <input v-model="form.liters" type="text" inputmode="decimal" placeholder="42,5" autofocus required @input="onAmountInput('liters', $event)">
            <span aria-hidden="true">L</span>
          </span>
        </label>
        <label class="field">
          <span>Prix payé</span>
          <span class="unit-input">
            <input v-model="form.totalPrice" type="text" inputmode="decimal" placeholder="72,30" required @input="onAmountInput('totalPrice', $event)">
            <span aria-hidden="true">€</span>
          </span>
        </label>
      </div>
      <p v-if="station?.price && !(edited.liters && edited.totalPrice)" class="muted small" style="margin: -.4rem 0 0">
        Remplis les litres <em>ou</em> le montant : l'autre se calcule au prix de la station.
      </p>

      <div class="field">
        <label for="odometer">Kilométrage au compteur</label>
        <span class="odometer-input">
          <input
            id="odometer"
            ref="odometerInput"
            v-model="form.odometer"
            type="text"
            inputmode="numeric"
            :placeholder="formatNumber(odometerEstimate ?? vehicle.odometer)"
            required
          >
          <span aria-hidden="true">km</span>
        </span>
        <button v-if="odometerEstimate && !form.odometer" type="button" class="link-btn small estimate" @click="useEstimate">
          ≈ {{ formatKm(odometerEstimate) }} ? Corriger la fin
        </button>
      </div>

      <div class="row">
        <label class="switch">
          <input v-model="form.full" type="checkbox">
          Plein complet
        </label>
        <label class="field-inline">
          <span class="field-label">Date</span>
          <input v-model="form.date" type="date" :max="today()" class="input date" required>
        </label>
      </div>

      <p v-if="pricePerLiter" class="per-liter">
        <span class="eyebrow" style="margin: 0">Soit le litre</span>
        <PumpPrice :value="pricePerLiter" />
      </p>
      <p v-if="priceMismatch" class="note note-warn" style="margin: 0">
        Le prix au litre est très éloigné de celui affiché par la station ({{ formatEuro(station!.price!, 3) }}) : vérifie ta saisie.
        Sinon, ce plein ne comptera pas dans tes économies.
      </p>
      <p v-if="station && !comparable" class="muted small" style="margin: 0">
        La comparaison avec les prix du coin ne se fait que pour un plein du jour.
      </p>
      <p v-if="!form.full" class="muted small" style="margin: 0">
        Un plein partiel est compté dans la consommation au prochain plein complet.
      </p>
      <p v-if="error" class="error" role="alert" style="margin: 0">
        {{ error }}
      </p>
      <button class="btn btn-primary btn-block btn-large" :disabled="saving">
        <AppIcon name="check" /> Enregistrer le plein
      </button>
      <button v-if="canSaveForLater" type="button" class="btn btn-ghost btn-block" @click="saveForLater">
        <AppIcon name="pause" /> Compléter plus tard
      </button>
      <p v-if="saved" class="note note-ok with-icon" role="status" style="margin: 0">
        <AppIcon name="check" /> <span>{{ saved }}</span>
      </p>
      <NuxtLink v-for="badge in unlocked" :key="badge.id" to="/bilan" class="unlocked" role="status">
        <span aria-hidden="true">{{ badge.emoji }}</span>
        <span>Nouveau badge : <strong>{{ badge.title }}</strong></span>
      </NuxtLink>
    </form>

    <section v-if="history.length" class="history">
      <h2>Historique</h2>
      <div class="ticket">
        <div class="ticket-head">
          {{ history.length }} plein{{ history.length > 1 ? 's' : '' }} · {{ vehicle.make }} {{ vehicle.model }}
        </div>
        <ul class="list">
          <li v-for="fill in history" :key="fill.id" class="ticket-entry">
            <div class="ticket-line">
              <span class="ticket-strong">{{ formatDate(fill.date) }}</span>
              <span>{{ formatKm(fill.odometer) }}</span>
            </div>
            <div class="ticket-line">
              <span>{{ formatNumber(fill.liters, 2) }} L × {{ formatNumber(fill.totalPrice / fill.liters, 3) }}<template v-if="!fill.full"> · partiel</template></span>
              <span class="ticket-strong">{{ formatEuro(fill.totalPrice) }}</span>
            </div>
            <div class="ticket-line">
              <span class="muted">
                <template v-if="fill.station">{{ formatStation(fill.station) }}</template>
                <span v-if="fill.saving !== null" class="badge badge-plain" :class="fill.saving >= 0 ? 'badge-ok' : 'badge-soon'" :title="savingLabel(fill.saving)">
                  {{ fill.saving >= 0 ? '−' : '+' }}{{ formatEuro(Math.abs(fill.saving)) }}
                </span>
              </span>
              <span class="row" style="flex-wrap: nowrap; gap: .4rem">
                <span v-if="consumptionByOdometer.has(fill.odometer)" class="ticket-consumption">
                  {{ formatNumber(consumptionByOdometer.get(fill.odometer)!, 1) }} L/100
                </span>
                <button class="btn btn-icon btn-small btn-danger" :aria-label="`Supprimer le plein du ${formatDate(fill.date)}`" @click="remove(fill.id)">
                  <AppIcon name="trash" />
                </button>
              </span>
            </div>
          </li>
        </ul>
      </div>
    </section>
  </div>
</template>

<style scoped>
.with-icon { display: inline-flex; align-items: center; gap: .5rem; }
.unlocked { display: flex; align-items: center; gap: .6rem; padding: .6rem .9rem; border-radius: var(--radius-small); background: var(--accent-soft); color: var(--text); text-decoration: none; animation: pop .4s ease-out; }
.unlocked > span:first-child { font-size: 1.5rem; }
@keyframes pop { from { transform: scale(.9); opacity: 0; } }

.station { display: grid; gap: .6rem; padding: 1rem; border: 1px dashed var(--border); border-radius: var(--radius); }
.station-set { border-style: solid; background: var(--surface); }
.station-main { display: flex; align-items: center; gap: .75rem; }
.station-main > div { flex: 1; }
.station-icon { display: grid; place-items: center; width: 40px; height: 40px; flex-shrink: 0; border-radius: var(--radius-small); background: var(--accent); color: var(--accent-contrast); }
.station-choices { display: grid; gap: .4rem; }
.station-choice { display: flex; align-items: center; justify-content: space-between; gap: .75rem; padding: .6rem .75rem; border: 1px solid var(--border); border-radius: var(--radius-small); background: var(--surface); color: var(--text); font: inherit; text-align: left; cursor: pointer; }
.station-choice:hover { border-color: var(--accent); }

.unit-input, .odometer-input { position: relative; display: block; }
.unit-input > span, .odometer-input > span { position: absolute; right: .9rem; top: 50%; transform: translateY(-50%); color: var(--muted); font: 600 1.1rem var(--font-display); pointer-events: none; }
.amounts input { min-height: 60px; padding-right: 2.2rem; font: 700 1.8rem var(--font-display); font-variant-numeric: tabular-nums; }
/* Le kilométrage se tape dans un compteur */
.odometer-input input {
  min-height: 58px;
  padding-right: 3rem;
  border: 1px solid var(--dash-line);
  border-radius: var(--radius-small);
  background: var(--dash);
  color: var(--dash-glow);
  font: 500 1.6rem var(--font-mono);
  letter-spacing: .18em;
}
.odometer-input input:focus { background: var(--dash); box-shadow: 0 0 0 2px var(--accent); }
.odometer-input > span { font: 500 .8rem var(--font-mono); letter-spacing: .08em; text-transform: uppercase; }
.estimate { justify-self: start; margin-top: .2rem; }
.date { width: auto; min-height: 40px; }
.per-liter { display: flex; align-items: baseline; justify-content: space-between; margin: 0; padding: .6rem 0; border-block: 1px dashed var(--border); }

.history h2 { margin-bottom: .75rem; }
.ticket-consumption { padding: .1rem .4rem; border-radius: 3px; background: var(--dash); color: var(--dash-glow); white-space: nowrap; }
.ticket .badge { margin-left: .3rem; }
</style>
