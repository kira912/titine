<script setup lang="ts">
import { consumptionSegments, odometerConflict } from '#shared/consumption'
import { today } from '#shared/dates'

useSeoMeta({ title: 'Plein', robots: 'noindex, nofollow' })

const { vehicle, ready } = useVehicle()
const fillUps = useFillUps()

const blank = () => ({ liters: '', totalPrice: '', odometer: '', date: today(), full: true })
const form = reactive(blank())
const error = ref('')
const saved = ref('')

const liters = computed(() => parseDecimal(form.liters))
const totalPrice = computed(() => parseDecimal(form.totalPrice))
const pricePerLiter = computed(() => (liters.value && totalPrice.value ? totalPrice.value / liters.value : null))

/** Consommation du tronçon qui se termine à chaque plein complet, repérée par son kilométrage */
const consumptionByOdometer = computed(() => new Map(consumptionSegments(fillUps.value).map(s => [s.odometer, s.consumption])))
const history = computed(() => [...fillUps.value].reverse())

async function submit() {
  saved.value = ''
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
  await addFillUp(vehicle.value, { date: form.date, odometer, liters: liters.value, totalPrice: totalPrice.value, full: form.full })
  Object.assign(form, blank())

  // La liste réactive n'est pas encore à jour : on relit la base pour annoncer la consommation du plein
  const consumption = new Map(consumptionSegments(await useLocalDb().fillUps.toArray()).map(s => [s.odometer, s.consumption])).get(odometer)
  saved.value = consumption === undefined
    ? 'Plein enregistré.'
    : `Plein enregistré : ${formatNumber(consumption, 1)} L/100 km depuis le plein précédent.`
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
        <div class="fields">
          <label class="field">
            Litres
            <input v-model="form.liters" type="text" inputmode="decimal" placeholder="42,5" autofocus required>
          </label>
          <label class="field">
            Prix payé (€)
            <input v-model="form.totalPrice" type="text" inputmode="decimal" placeholder="72,30" required>
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
.field-inline .date { width: auto; min-height: 40px; padding: 0 .6rem; border: 1px solid var(--border); border-radius: 10px; background: var(--surface); color: var(--text); font: inherit; }
</style>
