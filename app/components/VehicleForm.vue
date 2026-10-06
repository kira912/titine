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
  <!-- Intitulés repérés par leur case sur la carte grise : on recopie sans chercher -->
  <form class="form" @submit.prevent="submit">
    <div class="fields">
      <label class="field">
        <span><span class="cg-code">D.1</span>Marque</span>
        <input v-model="form.make" type="text" autocomplete="off" placeholder="Renault" required>
      </label>
      <label class="field">
        <span><span class="cg-code">D.3</span>Modèle</span>
        <input v-model="form.model" type="text" autocomplete="off" placeholder="Clio" required>
      </label>
    </div>
    <fieldset class="field fuel-field">
      <legend class="field-label">
        <span class="cg-code">P.3</span>Carburant
      </legend>
      <div class="fuel-options">
        <label v-for="fuel in FUELS" :key="fuel" class="fuel-option" :class="{ checked: form.fuel === fuel }">
          <input v-model="form.fuel" type="radio" name="fuel" :value="fuel" class="visually-hidden">
          <FuelTag :fuel="fuel" label />
        </label>
      </div>
    </fieldset>
    <div class="fields">
      <label class="field">
        <span>Kilométrage actuel</span>
        <input v-model="form.odometer" type="text" inputmode="numeric" placeholder="85 000" required>
      </label>
      <label class="field">
        <span><span class="cg-code">B</span>Mise en circulation</span>
        <input v-model="form.firstRegistration" type="date" :max="today()">
      </label>
    </div>
    <p class="field-hint" style="margin: -.5rem 0 0">
      Facultatif : la date de la case B sert à calculer ton premier contrôle technique (4 ans, puis tous les 2 ans).
    </p>
    <p v-if="error" class="error" role="alert">
      {{ error }}
    </p>
    <button class="btn btn-primary btn-block btn-large" :disabled="saving">
      {{ submitLabel }}
    </button>
  </form>
</template>

<style scoped>
.fuel-field { margin: 0; padding: 0; border: 0; min-width: 0; }
.fuel-field legend { margin-bottom: .4rem; padding: 0; }
.fuel-options { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: .4rem; }
.fuel-option { display: flex; align-items: center; min-height: 48px; padding: .3rem .6rem; border: 1px solid var(--border); border-radius: var(--radius-small); background: var(--sunken); color: var(--muted); cursor: pointer; }
.fuel-option.checked { border-color: var(--accent); background: var(--accent-soft); color: var(--accent); }
.fuel-option:focus-within { outline: 2px solid var(--accent); outline-offset: 2px; }
.fuel-option :deep(.fuel-name) { color: var(--text); }
</style>
