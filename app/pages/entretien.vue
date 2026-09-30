<script setup lang="ts">
useSeoMeta({ title: 'Entretien', robots: 'noindex, nofollow' })

const { vehicle, ready } = useVehicle()
const statuses = useReminderStatuses(vehicle)
const services = useServices()

const adding = ref(false)
const form = ref({ label: '', intervalKm: '', intervalMonths: '' })
const error = ref('')

async function submit() {
  if (!vehicle.value) return
  const input = parseReminderInput(form.value)
  if (typeof input === 'string') return void (error.value = input)
  error.value = ''
  await addReminder(vehicle.value, input)
  form.value = { label: '', intervalKm: '', intervalMonths: '' }
  adding.value = false
}
</script>

<template>
  <NoVehicle v-if="ready && !vehicle" />

  <div v-else-if="vehicle" class="stack">
    <section>
      <h1>Entretien</h1>
      <p class="muted" style="margin: 0">
        Un rappel arrive à échéance à la date ou au kilométrage prévu, selon ce qui vient en premier.
        Compteur actuel : {{ formatKm(vehicle.odometer) }}.
      </p>
    </section>

    <ul class="list" style="gap: 1rem">
      <ReminderCard
        v-for="{ reminder, status } in statuses"
        :key="reminder.id"
        :vehicle="vehicle"
        :reminder="reminder"
        :status="status"
      />
    </ul>

    <section class="card">
      <button v-if="!adding" class="btn btn-ghost btn-block" @click="adding = true">
        + Ajouter un rappel
      </button>
      <form v-else class="form" @submit.prevent="submit">
        <h2>Nouveau rappel</h2>
        <ReminderFields v-model="form" />
        <p class="muted small" style="margin: 0">
          Le suivi démarre aujourd'hui, au kilométrage actuel.
        </p>
        <p v-if="error" class="error" role="alert">
          {{ error }}
        </p>
        <div class="row" style="justify-content: flex-start">
          <button class="btn btn-primary">
            Ajouter
          </button>
          <button type="button" class="btn btn-ghost" @click="adding = false">
            Annuler
          </button>
        </div>
      </form>
    </section>

    <section v-if="services.length" class="card">
      <h2>Historique des entretiens</h2>
      <ul class="list">
        <li v-for="service in services" :key="service.id" class="list-item">
          <div>
            <strong>{{ service.label }}</strong>
            <div class="muted small">
              {{ formatDate(service.date) }} · {{ formatKm(service.odometer) }}
            </div>
          </div>
          <span v-if="service.cost !== null" class="price">{{ formatEuro(service.cost) }}</span>
        </li>
      </ul>
    </section>
  </div>
</template>
