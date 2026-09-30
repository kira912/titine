<script setup lang="ts">
import { today } from '#shared/dates'
import { FUELS, FUEL_LABELS, type Fuel } from '#shared/fuel'
import type { Vehicle } from '#shared/types'

const props = defineProps<{
  /** Véhicule à modifier ; absent pour une création */
  vehicle?: Saved<Vehicle> | null
  submitLabel: string
}>()
const emit = defineEmits<{ saved: [] }>()

const form = reactive({
  make: props.vehicle?.make ?? '',
  model: props.vehicle?.model ?? '',
  fuel: props.vehicle?.fuel ?? ('e10' as Fuel),
  odometer: props.vehicle ? String(props.vehicle.odometer) : '',
  firstRegistration: props.vehicle?.firstRegistration ?? '',
})
const error = ref('')
const saving = ref(false)

async function submit() {
  const odometer = parseKm(form.odometer)
  const make = form.make.trim()
  const model = form.model.trim()
  if (!make || !model) return void (error.value = 'Indique la marque et le modèle.')
  if (odometer === null) return void (error.value = 'Indique le kilométrage actuel.')
  if (form.firstRegistration && form.firstRegistration > today()) {
    return void (error.value = 'La date de mise en circulation est dans le futur.')
  }

  error.value = ''
  saving.value = true
  const input = { make, model, fuel: form.fuel, odometer, firstRegistration: form.firstRegistration || null }
  try {
    if (props.vehicle) await updateVehicle(props.vehicle.id, input)
    else await createVehicle(input)
    emit('saved')
  }
  catch {
    error.value = 'Enregistrement impossible : le stockage du navigateur est indisponible (navigation privée ?).'
  }
  finally {
    saving.value = false
  }
}
</script>

<template>
  <form class="form" @submit.prevent="submit">
    <div class="fields">
      <label class="field">
        Marque
        <input v-model="form.make" type="text" autocomplete="off" placeholder="Renault" required>
      </label>
      <label class="field">
        Modèle
        <input v-model="form.model" type="text" autocomplete="off" placeholder="Clio" required>
      </label>
    </div>
    <div class="fields">
      <label class="field">
        Carburant
        <select v-model="form.fuel">
          <option v-for="fuel in FUELS" :key="fuel" :value="fuel">{{ FUEL_LABELS[fuel] }}</option>
        </select>
      </label>
      <label class="field">
        Kilométrage actuel
        <input v-model="form.odometer" type="text" inputmode="numeric" placeholder="85 000" required>
      </label>
    </div>
    <label class="field">
      Première mise en circulation (facultatif)
      <input v-model="form.firstRegistration" type="date" :max="today()">
      <span class="muted small" style="font-weight: 400">
        Case B de la carte grise. Sert à calculer ton premier contrôle technique (4 ans, puis tous les 2 ans).
      </span>
    </label>
    <p v-if="error" class="error" role="alert">
      {{ error }}
    </p>
    <button class="btn btn-primary btn-block" :disabled="saving">
      {{ submitLabel }}
    </button>
  </form>
</template>
