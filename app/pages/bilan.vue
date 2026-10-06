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
    await shareImage(image, `titine-bilan-${year.value}.png`, `Mon bilan ${year.value} avec Titine`)
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
      <h1 style="margin: 0">
        Bilan {{ year }}
      </h1>
      <div v-if="years.length > 1" class="row" role="group" aria-label="Année">
        <button
          v-for="option in years"
          :key="option"
          type="button"
          class="btn btn-small"
          :class="option === year ? 'btn-primary' : 'btn-ghost'"
          :aria-pressed="option === year"
          @click="pickedYear = option"
        >
          {{ option }}
        </button>
      </div>
    </section>

    <template v-if="recap.fillUps || recap.services">
      <section class="stats" aria-label="Chiffres de l'année">
        <div class="card">
          <div class="muted small">
            Distance suivie
          </div>
          <div class="stat-value">
            {{ formatNumber(recap.distance) }}
          </div>
          <div class="muted small">
            km
          </div>
        </div>
        <div class="card">
          <div class="muted small">
            Consommation
          </div>
          <div class="stat-value">
            {{ recap.consumption === null ? '—' : formatNumber(recap.consumption, 1) }}
          </div>
          <div class="muted small">
            L/100 km
          </div>
        </div>
        <div class="card">
          <div class="muted small">
            Carburant
          </div>
          <div class="stat-value">
            {{ formatEuro(recap.fuelCost, 0) }}
          </div>
          <div class="muted small">
            {{ recap.fillUps }} plein{{ recap.fillUps > 1 ? 's' : '' }} · {{ formatNumber(recap.liters) }} L
          </div>
        </div>
        <div class="card">
          <div class="muted small">
            {{ recap.savings.total >= 0 ? 'Économisé' : 'Surcoût' }}
          </div>
          <div class="stat-value">
            {{ recap.savings.count ? formatEuro(Math.abs(recap.savings.total), 0) : '—' }}
          </div>
          <div class="muted small">
            face aux prix du coin
          </div>
        </div>
      </section>

      <section class="card">
        <h2>Les faits marquants</h2>
        <ul class="list">
          <li v-if="recap.pricePerLiter" class="list-item">
            <span>Prix moyen payé</span>
            <strong>{{ formatEuro(recap.pricePerLiter, 3) }}/L</strong>
          </li>
          <li v-if="recap.costPerKm" class="list-item">
            <span>Coût du carburant aux 100 km</span>
            <strong>{{ formatEuro(recap.costPerKm * 100) }}</strong>
          </li>
          <li v-if="recap.priciestMonth" class="list-item">
            <span>Mois le plus cher</span>
            <strong>{{ MONTHS[recap.priciestMonth.month - 1] }} · {{ formatEuro(recap.priciestMonth.cost) }}</strong>
          </li>
          <li v-if="recap.favoriteStation" class="list-item">
            <span>Ta station</span>
            <strong style="text-align: right">{{ formatStation(recap.favoriteStation.station) }} · {{ recap.favoriteStation.visits }} pleins</strong>
          </li>
          <li v-if="recap.bestFillUp" class="list-item">
            <span>Meilleure affaire</span>
            <strong style="text-align: right">{{ formatEuro(recap.bestFillUp.saving) }} économisés le {{ formatDate(recap.bestFillUp.date) }}</strong>
          </li>
          <li v-if="recap.services" class="list-item">
            <span>Entretiens</span>
            <strong>{{ recap.services }}<template v-if="recap.serviceCost"> · {{ formatEuro(recap.serviceCost) }}</template></strong>
          </li>
        </ul>
      </section>

      <button class="btn btn-primary btn-block" :disabled="sharing" @click="share">
        {{ sharing ? 'Préparation…' : '📤 Partager mon bilan' }}
      </button>
      <p v-if="shareError" class="error" role="alert" style="margin: 0">
        {{ shareError }}
      </p>
    </template>
    <p v-else class="muted" style="margin: 0">
      Aucun plein en {{ year }} pour l'instant. <NuxtLink to="/plein">Ajoute ton premier plein</NuxtLink> pour remplir ton bilan.
    </p>

    <section class="card">
      <div class="row">
        <h2 style="margin: 0">
          Badges
        </h2>
        <span class="muted small">{{ unlockedCount }} sur {{ badges.length }}</span>
      </div>
      <ul class="badges">
        <li v-for="badge in badges" :key="badge.id" class="badge-tile" :class="{ locked: !badge.unlocked }">
          <span class="badge-emoji" aria-hidden="true">{{ badge.emoji }}</span>
          <strong>{{ badge.title }}</strong>
          <span class="muted small">{{ badge.description }}</span>
          <progress
            v-if="!badge.unlocked"
            :value="badge.current"
            :max="badge.target"
            :aria-label="`${badge.title} : ${formatNumber(badge.current)} sur ${formatNumber(badge.target)}`"
          />
          <span v-if="!badge.unlocked" class="muted small">{{ formatNumber(badge.current) }} / {{ formatNumber(badge.target) }}</span>
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
.list-item > span { flex-shrink: 0; }
.badges { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: .75rem; margin: 1rem 0 0; padding: 0; list-style: none; }
.badge-tile { display: grid; gap: .25rem; align-content: start; padding: .9rem; border: 1px solid var(--border); border-radius: 12px; background: var(--ok-bg); }
.badge-tile.locked { background: var(--surface); }
.badge-tile.locked .badge-emoji { filter: grayscale(1); opacity: .45; }
.badge-emoji { font-size: 1.8rem; line-height: 1; }
.badge-tile progress { width: 100%; height: 6px; margin-top: .25rem; accent-color: var(--accent); }
</style>
