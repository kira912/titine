<script setup lang="ts">
import { today } from '#shared/dates'
import type { ReminderStatus } from '#shared/reminders'
import type { Reminder, Vehicle } from '#shared/types'

const props = defineProps<{
  vehicle: Saved<Vehicle>
  reminder: Saved<Reminder>
  status: ReminderStatus
}>()

const panel = ref<'done' | 'edit' | null>(null)
const error = ref('')

const done = reactive({ date: '', odometer: '', cost: '' })
const edit = reactive({ label: '', intervalKm: '', intervalMonths: '' })

function open(next: 'done' | 'edit') {
  error.value = ''
  if (panel.value === next) return void (panel.value = null)
  if (next === 'done') Object.assign(done, { date: today(), odometer: String(props.vehicle.odometer), cost: '' })
  else {
    Object.assign(edit, {
      label: props.reminder.label,
      intervalKm: props.reminder.intervalKm ? String(props.reminder.intervalKm) : '',
      intervalMonths: props.reminder.intervalMonths ? String(props.reminder.intervalMonths) : '',
    })
  }
  panel.value = next
}

/** Enregistrement en cours : un double tap ne doit pas noter deux fois l'entretien */
const saving = ref(false)

async function submitDone() {
  if (saving.value) return
  const odometer = parseKm(done.odometer)
  const cost = done.cost.trim() === '' ? null : parseDecimal(done.cost)
  if (!done.date || done.date > today()) return void (error.value = 'Indique une date passée ou celle du jour.')
  if (odometer === null) return void (error.value = 'Indique le kilométrage au moment de l\'entretien.')
  if (done.cost.trim() !== '' && cost === null) return void (error.value = 'Le coût n\'est pas un montant valide.')
  saving.value = true
  try {
    await completeReminder(props.vehicle, props.reminder, { date: done.date, odometer, cost })
    panel.value = null
  }
  finally {
    saving.value = false
  }
}

async function submitEdit() {
  const input = parseReminderInput(edit)
  if (typeof input === 'string') return void (error.value = input)
  await updateReminder(props.reminder.id, input)
  panel.value = null
}

function remove() {
  if (confirm(`Supprimer le rappel « ${props.reminder.label} » ?`)) void deleteReminder(props.reminder.id)
}

const due = computed(() => formatDue(props.status))
</script>

<template>
  <li class="card stack" :class="`card-${status.level}`">
    <div>
      <div class="row">
        <h2>{{ reminder.label }}</h2>
        <span class="badge" :class="`badge-${status.level}`">{{ LEVEL_LABELS[status.level] }}</span>
      </div>
      <p v-if="due" style="margin: 0">
        {{ due }}
      </p>
      <p v-else-if="reminder.kind === 'controle-technique'" class="muted" style="margin: 0">
        Renseigne la date de mise en circulation dans
        <NuxtLink to="/vehicule">ton véhicule</NuxtLink>, ou note ton dernier contrôle.
      </p>
      <p class="muted small" style="margin: 0">
        {{ formatInterval(reminder) }}
        <template v-if="reminder.lastDate"> · dernier point le {{ formatDate(reminder.lastDate) }}</template>
      </p>
    </div>

    <div class="row" style="justify-content: flex-start">
      <button class="btn btn-small btn-primary" :aria-expanded="panel === 'done'" @click="open('done')">
        C'est fait
      </button>
      <button class="btn btn-small btn-ghost" :aria-expanded="panel === 'edit'" @click="open('edit')">
        Modifier
      </button>
      <button class="btn btn-small btn-danger" @click="remove">
        Supprimer
      </button>
    </div>

    <form v-if="panel === 'done'" class="form" @submit.prevent="submitDone">
      <div class="fields">
        <label class="field">
          Date
          <input v-model="done.date" type="date" :max="today()" required>
        </label>
        <label class="field">
          Kilométrage
          <input v-model="done.odometer" type="text" inputmode="numeric" required>
        </label>
        <label class="field">
          Coût en € (facultatif)
          <input v-model="done.cost" type="text" inputmode="decimal">
        </label>
      </div>
      <p v-if="error" class="error" role="alert">
        {{ error }}
      </p>
      <button class="btn btn-primary" :disabled="saving">
        Enregistrer l'entretien
      </button>
    </form>

    <form v-else-if="panel === 'edit'" class="form" @submit.prevent="submitEdit">
      <ReminderFields v-model="edit" />
      <p v-if="error" class="error" role="alert">
        {{ error }}
      </p>
      <button class="btn btn-primary">
        Enregistrer
      </button>
    </form>
  </li>
</template>
