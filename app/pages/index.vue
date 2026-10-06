<script setup lang="ts">
import { APP } from '#shared/app'
import { consumptionSegments, fuelStats } from '#shared/consumption'
import { FUEL_LABELS } from '#shared/fuel'
import { today } from '#shared/dates'
import { savingsSummary } from '#shared/savings'

const title = 'Carnet d\'entretien et consommation de ta voiture, gratuit'
const description = 'Suis tes pleins et ta consommation réelle, reçois tes rappels d\'entretien et trouve le carburant le moins cher autour de toi. Gratuit et sans compte.'
useSeoMeta({ title, description, ogTitle: `${APP.name} — ${APP.tagline}`, ogDescription: description })

const url = useAbsoluteUrl()
useJsonLd({
  '@graph': [
    { '@type': 'WebSite', '@id': url('/#website'), 'url': url('/'), 'name': APP.name, 'inLanguage': 'fr-FR' },
    {
      '@type': 'WebApplication',
      'name': APP.name,
      'url': url('/'),
      'description': description,
      'applicationCategory': 'UtilitiesApplication',
      'operatingSystem': 'Android, iOS, Windows, macOS, Linux',
      'browserRequirements': 'Navigateur web récent',
      'inLanguage': 'fr-FR',
      'isAccessibleForFree': true,
      'offers': { '@type': 'Offer', 'price': '0', 'priceCurrency': 'EUR' },
    },
  ],
})

const { vehicle, ready } = useVehicle()
// Coquille hors ligne du service worker (rendu client, sans script en tête) : rien à hydrater,
// on lit donc le drapeau directement pour ne pas afficher l'accueil public avant le tableau de bord
const skipLanding = import.meta.client && !useNuxtApp().payload.serverRendered && hasGarageFlag()
const fillUps = useFillUps()
const { data: draft } = useDraft()
// Le carnet n'existe que sur l'appareil : passé quelques pleins, on rappelle de le sauvegarder chaque mois
const BACKUP_EVERY_DAYS = 30
const backupDue = ref(false)
onMounted(() => {
  const last = lastBackupAt()
  backupDue.value = !last || Date.now() - last.getTime() > BACKUP_EVERY_DAYS * 86_400_000
})
const statuses = useReminderStatuses(vehicle)

const segments = computed(() => consumptionSegments(fillUps.value))
const stats = computed(() => fuelStats(fillUps.value))
const due = computed(() => statuses.value.filter(({ status }) => status.level !== 'ok'))
const savings = computed(() => savingsSummary(fillUps.value))
const badges = useAchievements()
const unlockedCount = computed(() => badges.value.filter(badge => badge.unlocked).length)
/** Badge verrouillé le plus avancé : l'objectif à portée de main */
const nextBadge = computed(() => badges.value
  .filter(badge => !badge.unlocked)
  .sort((a, b) => b.current / b.target - a.current / a.target)[0])
const yearSavings = computed(() => savingsSummary(fillUps.value, `${today().slice(0, 4)}-01-01`))
</script>

<template>
  <!-- Tant que la base locale n'a pas répondu, c'est l'accueil public qui est rendu (et indexé) -->
  <div v-if="!vehicle && !(skipLanding && !ready)" class="stack landing">
    <section>
      <h1>Le carnet d'entretien et de consommation de ta voiture</h1>
      <p class="lead">
        {{ APP.name }} suit tes pleins, calcule ta consommation réelle, te rappelle les entretiens
        et trouve le carburant le moins cher autour de toi. Gratuit et sans compte : tes données restent sur ton téléphone.
      </p>
    </section>

    <section class="card">
      <h2>Crée ton carnet en 30 secondes</h2>
      <ClientOnly>
        <VehicleForm submit-label="Créer mon carnet" />
        <template #fallback>
          <p class="muted" style="margin: 0">
            Marque, modèle, carburant et kilométrage : c'est tout ce qu'il faut pour commencer.
          </p>
        </template>
      </ClientOnly>
    </section>

    <section class="features" aria-label="Fonctionnalités">
      <article class="card">
        <h2>⛽ Ta consommation réelle</h2>
        <p>
          Saisis un plein en 10 secondes : litres, prix, kilométrage. Titine calcule ta consommation en L/100 km
          et ton coût au kilomètre, plein après plein, avec une courbe pour repérer les dérives.
        </p>
      </article>
      <article class="card">
        <h2>🔧 Les entretiens au bon moment</h2>
        <p>
          Vidange, pneus, contrôle technique : chaque rappel se déclenche à la date ou au kilométrage prévu.
          Le contrôle technique suit la règle française : premier contrôle à 4 ans, puis tous les 2 ans.
        </p>
      </article>
      <article class="card">
        <h2>📍 Le carburant le moins cher</h2>
        <p>
          Les prix relevés dans les stations autour de toi, du moins cher au plus cher, sur une carte.
          <NuxtLink to="/carburant">Chercher autour de moi</NuxtLink>
        </p>
      </article>
      <article class="card">
        <h2>🔒 Tes données restent chez toi</h2>
        <p>
          Pas de compte, pas d'e-mail : ton carnet est enregistré sur ton téléphone et fonctionne même sans réseau.
          Installe l'appli sur ton écran d'accueil pour l'avoir toujours sous la main.
        </p>
      </article>
    </section>

    <ClientOnly>
      <InstallCallout />
    </ClientOnly>

    <PopularCities />
  </div>

  <div v-else-if="vehicle" class="stack">
    <section class="row">
      <div>
        <h1>{{ vehicle.make }} {{ vehicle.model }}</h1>
        <p class="muted" style="margin: 0">
          {{ FUEL_LABELS[vehicle.fuel] }} · {{ formatKm(vehicle.odometer) }}
        </p>
      </div>
      <NuxtLink to="/vehicule" class="btn btn-small btn-ghost">
        Modifier
      </NuxtLink>
    </section>

    <NuxtLink v-if="draft" to="/plein" class="card card-soon" style="text-decoration: none">
      <div class="row">
        <strong>⏸️ Plein à compléter</strong>
        <span class="btn btn-small btn-primary">Compléter</span>
      </div>
      <span class="muted small">
        {{ draft.station ? formatStation(draft.station) : 'Station non choisie' }} · commencé {{ formatSince(draft.createdAt) }}
      </span>
    </NuxtLink>
    <NuxtLink v-else to="/plein" class="btn btn-primary btn-block">
      ⛽ Ajouter un plein
    </NuxtLink>

    <section v-if="due.length" class="stack" aria-label="Entretiens à prévoir">
      <NuxtLink
        v-for="{ reminder, status } in due"
        :key="reminder.id"
        to="/entretien"
        class="card"
        :class="`card-${status.level}`"
        style="text-decoration: none"
      >
        <div class="row">
          <strong>{{ reminder.label }}</strong>
          <span class="badge" :class="`badge-${status.level}`">{{ LEVEL_LABELS[status.level] }}</span>
        </div>
        <span class="muted small">{{ formatDue(status) }}</span>
      </NuxtLink>
    </section>
    <NuxtLink v-else-if="statuses.length" to="/entretien" class="card" style="text-decoration: none">
      <div class="row">
        <strong>Entretien à jour</strong>
        <span class="badge badge-ok">{{ LEVEL_LABELS.ok }}</span>
      </div>
      <span v-if="formatDue(statuses[0]!.status)" class="muted small">
        Prochaine échéance : {{ statuses[0]!.reminder.label.toLowerCase() }}, {{ formatDue(statuses[0]!.status) }}
      </span>
    </NuxtLink>

    <section class="stats" aria-label="Consommation">
      <div class="card">
        <div class="muted small">
          Consommation moyenne
        </div>
        <div class="stat-value">
          {{ stats.consumption === null ? '—' : formatNumber(stats.consumption, 1) }}
        </div>
        <div class="muted small">
          L/100 km
        </div>
      </div>
      <div class="card">
        <div class="muted small">
          Coût au kilomètre
        </div>
        <div class="stat-value">
          {{ stats.costPerKm === null ? '—' : formatEuro(stats.costPerKm, 3) }}
        </div>
        <div class="muted small">
          {{ stats.costPerKm === null ? 'par km' : `soit ${formatEuro(stats.costPerKm * 100)} aux 100 km` }}
        </div>
      </div>
      <div class="card">
        <div class="muted small">
          Distance suivie
        </div>
        <div class="stat-value">
          {{ formatNumber(stats.distance) }}
        </div>
        <div class="muted small">
          km · {{ formatEuro(stats.cost) }} de carburant
        </div>
      </div>
    </section>

    <section v-if="savings.count" class="card" aria-label="Économies">
      <div class="row">
        <h2 style="margin: 0">
          💰 {{ savings.total >= 0 ? 'Économisé' : 'Surcoût' }} : {{ formatEuro(Math.abs(savings.total)) }}
        </h2>
        <span v-if="yearSavings.count && yearSavings.count < savings.count" class="muted small">
          {{ formatEuro(yearSavings.total) }} cette année
        </span>
      </div>
      <p class="muted small" style="margin: 0">
        Par rapport au prix moyen autour de la station, sur {{ savings.count }} plein{{ savings.count > 1 ? 's' : '' }} ·
        {{ savings.belowAverage }} payé{{ savings.belowAverage > 1 ? 's' : '' }} sous la moyenne.
        <NuxtLink to="/carburant">Trouver moins cher</NuxtLink>
      </p>
    </section>
    <p v-else-if="fillUps.length" class="muted small" style="margin: 0">
      💰 Choisis la station quand tu ajoutes un plein : Titine te dira combien tu as économisé par rapport aux prix du coin.
    </p>

    <NuxtLink v-if="backupDue && fillUps.length >= 3" to="/vehicule#sauvegarde" class="card card-soon" style="text-decoration: none">
      <strong>💾 Sauvegarde ton carnet</strong>
      <span class="muted small" style="display: block">
        Il n'existe que sur ce téléphone : une copie à l'abri, et rien ne se perd si tu en changes.
      </span>
    </NuxtLink>

    <NuxtLink to="/bilan" class="card" style="text-decoration: none">
      <div class="row">
        <strong>🏅 Bilan et badges</strong>
        <span class="badge badge-ok">{{ unlockedCount }} / {{ badges.length }}</span>
      </div>
      <span v-if="nextBadge" class="muted small">
        Prochain : {{ nextBadge.emoji }} {{ nextBadge.title }} ({{ formatNumber(nextBadge.current) }} / {{ formatNumber(nextBadge.target) }})
      </span>
      <span v-else class="muted small">Tous les badges sont débloqués. Chapeau !</span>
    </NuxtLink>

    <section class="card">
      <h2>Consommation par plein</h2>
      <ConsumptionChart v-if="segments.length >= 2" :segments="segments" />
      <p v-else class="muted" style="margin: 0">
        {{ segments.length === 1
          ? 'Encore un plein complet et la courbe apparaîtra ici.'
          : 'Enregistre deux pleins complets d\'affilée : la consommation se calcule d\'un plein à l\'autre.' }}
      </p>
    </section>

    <InstallCallout />
  </div>
</template>
