<script setup lang="ts">
import { today } from '#shared/dates'
import { recapYears, yearRecap } from '#shared/recap'

useSeoMeta({ title: 'Bilan et badges', robots: 'noindex, nofollow' })

const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']

const { vehicle, ready } = useVehicle()
const fillUps = useFillUps()
const services = useServices()
const badges = useAchievements()

const years = computed(() => {
  const list = recapYears(fillUps.value, services.value)
  return list.length ? list : [Number(today().slice(0, 4))]
})
const pickedYear = ref<number | null>(null)
const year = computed(() => pickedYear.value ?? years.value[0]!)
const recap = computed(() => yearRecap(fillUps.value, services.value, year.value))
const unlockedCount = computed(() => badges.value.filter(badge => badge.unlocked).length)


const sharing = ref(false)
const shareError = ref('')

async function share() {
  if (!vehicle.value) return
  sharing.value = true
  shareError.value = ''
  try {
    const image = await drawRecapImage(recap.value, vehicle.value, { unlocked: unlockedCount.value, total: badges.value.length })
    await shareFile(image, `titine-bilan-${year.value}.png`, `Mon bilan ${year.value} avec Titine`)
  }
  catch {
    shareError.value = 'Le partage n\'a pas fonctionné. Réessaie dans un instant.'
  }
  finally {
    sharing.value = false
  }
}
</script>

<template>
  <NoVehicle v-if="ready && !vehicle" />

  <div v-else-if="vehicle" class="stack">
    <section class="row">
      <div>
        <span class="eyebrow">{{ vehicle.make }} {{ vehicle.model }}</span>
        <h1 style="margin: 0">
          Bilan {{ year }}
        </h1>
      </div>
      <div v-if="years.length > 1" class="segmented" role="group" aria-label="Année">
        <button
          v-for="option in years"
          :key="option"
          type="button"
          :aria-pressed="option === year"
          @click="pickedYear = option"
        >
          {{ option }}
        </button>
      </div>
    </section>

    <template v-if="recap.fillUps || recap.services">
      <section class="dashboard" aria-label="Chiffres de l'année">
        <div class="readouts year-readouts">
          <div class="readout">
            <span class="readout-value">{{ formatNumber(recap.distance) }}<small>km</small></span>
            <span class="readout-label">Distance suivie</span>
          </div>
          <div class="readout">
            <span class="readout-value">{{ recap.consumption === null ? '—' : formatNumber(recap.consumption, 1) }}</span>
            <span class="readout-label">L/100 km</span>
          </div>
          <div class="readout">
            <span class="readout-value">{{ formatEuro(recap.fuelCost, 0) }}</span>
            <span class="readout-label">Carburant · {{ recap.fillUps }} plein{{ recap.fillUps > 1 ? 's' : '' }} · {{ formatNumber(recap.liters) }} L</span>
          </div>
          <div class="readout">
            <span class="readout-value">{{ recap.savings.count ? formatEuro(Math.abs(recap.savings.total), 0) : '—' }}</span>
            <span class="readout-label">{{ recap.savings.total >= 0 ? 'Économisé' : 'Surcoût' }} face aux prix du coin</span>
          </div>
        </div>
      </section>

      <section>
        <h2>Les faits marquants</h2>
        <div class="ticket">
          <div class="ticket-head">
            Titine · bilan {{ year }}
          </div>
          <ul class="list">
            <li v-if="recap.pricePerLiter" class="ticket-entry ticket-line">
              <span>Prix moyen payé</span>
              <strong class="ticket-strong">{{ formatEuro(recap.pricePerLiter, 3) }}/L</strong>
            </li>
            <li v-if="recap.costPerKm" class="ticket-entry ticket-line">
              <span>Carburant aux 100 km</span>
              <strong class="ticket-strong">{{ formatEuro(recap.costPerKm * 100) }}</strong>
            </li>
            <li v-if="recap.priciestMonth" class="ticket-entry ticket-line">
              <span>Mois le plus cher</span>
              <strong class="ticket-strong">{{ MONTHS[recap.priciestMonth.month - 1] }} · {{ formatEuro(recap.priciestMonth.cost) }}</strong>
            </li>
            <li v-if="recap.favoriteStation" class="ticket-entry ticket-line">
              <span>Ta station</span>
              <strong class="ticket-strong" style="text-align: right">{{ formatStation(recap.favoriteStation.station) }} · {{ recap.favoriteStation.visits }} pleins</strong>
            </li>
            <li v-if="recap.bestFillUp" class="ticket-entry ticket-line">
              <span>Meilleure affaire</span>
              <strong class="ticket-strong" style="text-align: right">{{ formatEuro(recap.bestFillUp.saving) }} économisés le {{ formatDate(recap.bestFillUp.date) }}</strong>
            </li>
            <li v-if="recap.services" class="ticket-entry ticket-line">
              <span>Entretiens</span>
              <strong class="ticket-strong">{{ recap.services }}<template v-if="recap.serviceCost"> · {{ formatEuro(recap.serviceCost) }}</template></strong>
            </li>
          </ul>
        </div>
      </section>

      <button class="btn btn-primary btn-block btn-large" :disabled="sharing" @click="share">
        <AppIcon name="share" /> {{ sharing ? 'Préparation…' : 'Partager mon bilan' }}
      </button>
      <p v-if="shareError" class="error" role="alert" style="margin: 0">
        {{ shareError }}
      </p>
    </template>
    <p v-else class="card muted" style="margin: 0">
      Aucun plein en {{ year }} pour l'instant. <NuxtLink to="/plein">Ajoute ton premier plein</NuxtLink> pour remplir ton bilan.
    </p>

    <section class="card">
      <div class="section-head">
        <h2>Badges</h2>
        <span class="badge badge-ok badge-plain">{{ unlockedCount }} sur {{ badges.length }}</span>
      </div>
      <ul class="badges">
        <li v-for="badge in badges" :key="badge.id" class="badge-tile" :class="{ locked: !badge.unlocked }">
          <span class="medal" aria-hidden="true">{{ badge.emoji }}</span>
          <strong>{{ badge.title }}</strong>
          <span class="muted small">{{ badge.description }}</span>
          <progress
            v-if="!badge.unlocked"
            :value="badge.current"
            :max="badge.target"
            :aria-label="`${badge.title} : ${formatNumber(badge.current)} sur ${formatNumber(badge.target)}`"
          />
          <span v-if="!badge.unlocked" class="eyebrow" style="margin: 0">{{ formatNumber(badge.current) }} / {{ formatNumber(badge.target) }}</span>
        </li>
      </ul>
      <p class="muted small" style="margin: .75rem 0 0">
        Pour que les badges gardent leur valeur, seuls les pleins vraisemblables comptent : un par jour,
        deux saisis par jour au plus, et la série se compte au mois de saisie.
      </p>
    </section>
  </div>
</template>

<style scoped>
.year-readouts { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1rem .75rem; margin: 0; padding: 0; border: 0; }
.year-readouts .readout:nth-child(odd) { padding-left: 0; border-left: 0; }
.year-readouts .readout-label { white-space: normal; }
.ticket-entry.ticket-line { display: flex; align-items: baseline; }
.ticket-line > span { flex-shrink: 0; }
.badges { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: .75rem; margin: 0; padding: 0; list-style: none; }
.badge-tile { display: grid; justify-items: center; gap: .3rem; align-content: start; padding: 1rem .75rem; border: 1px solid var(--border); border-radius: var(--radius); background: var(--sunken); text-align: center; }
/* Médaille émaillée : jaune une fois gagnée */
.medal { display: grid; place-items: center; width: 56px; height: 56px; margin-bottom: .25rem; border-radius: 50%; background: radial-gradient(circle at 35% 30%, color-mix(in srgb, var(--accent) 60%, var(--ctp-rosewater)), var(--accent) 60%, var(--accent-strong)); box-shadow: 0 0 0 3px var(--surface), 0 0 0 4px var(--accent-strong); font-size: 1.6rem; line-height: 1; }
.locked .medal { background: var(--ctp-surface0); box-shadow: 0 0 0 3px var(--surface), 0 0 0 4px var(--border); filter: grayscale(1); opacity: .6; }
.badge-tile progress { width: 100%; height: 6px; margin-top: .25rem; accent-color: var(--accent); }
</style>
