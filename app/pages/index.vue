<script setup lang="ts">
import { APP } from '#shared/app'
import { consumptionSegments, fuelStats } from '#shared/consumption'
import { FUEL_LABELS } from '#shared/fuel'
import { today } from '#shared/dates'
import { savingsSummary } from '#shared/savings'
import type { IconName } from '~/utils/icons'

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

const features: { icon: IconName, title: string, text: string, link?: { to: string, label: string } }[] = [
  {
    icon: 'pump',
    title: 'Ta consommation réelle',
    text: 'Saisis un plein en 10 secondes : litres, prix, kilométrage. Titine calcule ta consommation en L/100 km et ton coût au kilomètre, plein après plein, avec une courbe pour repérer les dérives.',
  },
  {
    icon: 'wrench',
    title: 'Les entretiens au bon moment',
    text: 'Vidange, pneus, contrôle technique : chaque rappel se déclenche à la date ou au kilométrage prévu. Le contrôle technique suit la règle française : premier contrôle à 4 ans, puis tous les 2 ans.',
  },
  {
    icon: 'pin',
    title: 'Le carburant le moins cher',
    text: 'Les prix relevés dans les stations autour de toi, du moins cher au plus cher, sur une carte.',
    link: { to: '/carburant', label: 'Chercher autour de moi' },
  },
  {
    icon: 'lock',
    title: 'Tes données restent chez toi',
    text: 'Pas de compte, pas d\'e-mail : ton carnet est enregistré sur ton téléphone et fonctionne même sans réseau. Installe l\'appli sur ton écran d\'accueil pour l\'avoir toujours sous la main.',
  },
]
</script>

<template>
  <!-- Tant que la base locale n'a pas répondu, c'est l'accueil public qui est rendu (et indexé) -->
  <div v-if="!vehicle && !(skipLanding && !ready)" class="stack landing">
    <section class="hero">
      <span class="eyebrow">Carnet de bord · gratuit · sans compte</span>
      <h1>Le carnet d'entretien et de consommation de ta voiture</h1>
      <p class="lead">
        {{ APP.name }} suit tes pleins, calcule ta consommation réelle, te rappelle les entretiens
        et trouve le carburant le moins cher autour de toi. Gratuit et sans compte : tes données restent sur ton téléphone.
      </p>
    </section>

    <figure class="dashboard demo" aria-label="Aperçu du tableau de bord">
      <div class="row">
        <div>
          <span class="eyebrow">Ta voiture</span>
          <strong class="dash-title">Renault Clio</strong>
        </div>
        <FuelTag fuel="e10" class="dash-fuel" />
      </div>
      <div class="dash-odometer">
        <Odometer :value="85420" />
      </div>
      <div class="readouts">
        <div class="readout">
          <span class="readout-value">5,8</span>
          <span class="readout-label">L/100 km</span>
        </div>
        <div class="readout">
          <span class="readout-value">0,10<small>€</small></span>
          <span class="readout-label">par km</span>
        </div>
        <div class="readout">
          <span class="readout-value">−42<small>€</small></span>
          <span class="readout-label">économisés</span>
        </div>
      </div>
    </figure>

    <section class="card">
      <span class="eyebrow">Page 1 · le véhicule</span>
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
      <article v-for="(feature, index) in features" :key="feature.title" class="feature">
        <span class="feature-num" aria-hidden="true">{{ String(index + 1).padStart(2, '0') }}</span>
        <AppIcon :name="feature.icon" class="feature-icon" />
        <h2>{{ feature.title }}</h2>
        <p>
          {{ feature.text }}
          <NuxtLink v-if="feature.link" :to="feature.link.to">{{ feature.link.label }}</NuxtLink>
        </p>
      </article>
    </section>

    <ClientOnly>
      <InstallCallout />
    </ClientOnly>

    <PopularCities />
  </div>

  <div v-else-if="vehicle" class="stack">
    <section class="dashboard" aria-label="Tableau de bord">
      <div class="row">
        <div>
          <span class="eyebrow">Ta voiture</span>
          <h1 class="dash-title">
            {{ vehicle.make }} {{ vehicle.model }}
          </h1>
        </div>
        <div class="row" style="flex-wrap: nowrap">
          <FuelTag :fuel="vehicle.fuel" class="dash-fuel" />
          <NuxtLink to="/vehicule" class="btn btn-icon btn-small dash-edit" aria-label="Modifier le véhicule">
            <AppIcon name="edit" />
          </NuxtLink>
        </div>
      </div>
      <div class="dash-odometer">
        <Odometer :value="vehicle.odometer" :digits="Math.max(6, String(vehicle.odometer).length)" />
      </div>
      <div class="readouts" aria-label="Consommation">
        <div class="readout">
          <span class="readout-value">{{ stats.consumption === null ? '—' : formatNumber(stats.consumption, 1) }}</span>
          <span class="readout-label">L/100 km en moyenne</span>
        </div>
        <div class="readout">
          <span class="readout-value">{{ stats.costPerKm === null ? '—' : formatNumber(stats.costPerKm, 3) }}<small v-if="stats.costPerKm !== null">€</small></span>
          <span class="readout-label">{{ stats.costPerKm === null ? 'par km' : `par km · ${formatEuro(stats.costPerKm * 100, 0)} aux 100` }}</span>
        </div>
        <div class="readout">
          <span class="readout-value">{{ formatNumber(stats.distance) }}</span>
          <span class="readout-label">km suivis · {{ formatEuro(stats.cost, 0) }}</span>
        </div>
      </div>
    </section>

    <NuxtLink v-if="draft" to="/plein" class="card card-link card-soon">
      <div class="row">
        <strong class="with-icon"><AppIcon name="pause" /> Plein à compléter</strong>
        <span class="btn btn-small btn-primary">Compléter</span>
      </div>
      <span class="muted small">
        {{ draft.station ? formatStation(draft.station) : 'Station non choisie' }} · commencé {{ formatSince(draft.createdAt) }}
      </span>
    </NuxtLink>
    <NuxtLink v-else to="/plein" class="btn btn-primary btn-block btn-large">
      <AppIcon name="pump" /> Ajouter un plein
    </NuxtLink>

    <section v-if="due.length" class="stack" aria-label="Entretiens à prévoir">
      <NuxtLink
        v-for="{ reminder, status } in due"
        :key="reminder.id"
        to="/entretien"
        class="card card-link reminder-link"
        :class="`card-${status.level}`"
      >
        <div class="row">
          <strong class="with-icon"><AppIcon name="wrench" /> {{ reminder.label }}</strong>
          <span class="badge" :class="`badge-${status.level}`">{{ LEVEL_LABELS[status.level] }}</span>
        </div>
        <ReminderGauge :reminder="reminder" :status="status" />
        <span class="muted small">{{ formatDue(status) }}</span>
      </NuxtLink>
    </section>
    <NuxtLink v-else-if="statuses.length" to="/entretien" class="card card-link reminder-link">
      <div class="row">
        <strong class="with-icon"><AppIcon name="wrench" /> Entretien à jour</strong>
        <span class="badge badge-ok">{{ LEVEL_LABELS.ok }}</span>
      </div>
      <span v-if="formatDue(statuses[0]!.status)" class="muted small">
        Prochaine échéance : {{ statuses[0]!.reminder.label.toLowerCase() }}, {{ formatDue(statuses[0]!.status) }}
      </span>
    </NuxtLink>

    <section v-if="savings.count" class="card savings" aria-label="Économies">
      <span class="eyebrow">{{ savings.total >= 0 ? 'Économisé à la pompe' : 'Surcoût à la pompe' }}</span>
      <div class="row">
        <span class="savings-value" :class="savings.total >= 0 ? 'is-ok' : 'is-warn'">{{ formatEuro(Math.abs(savings.total)) }}</span>
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
    <p v-else-if="fillUps.length" class="note note-accent with-icon" style="margin: 0">
      <AppIcon name="euro" />
      <span>Choisis la station quand tu ajoutes un plein : Titine te dira combien tu as économisé par rapport aux prix du coin.</span>
    </p>

    <NuxtLink v-if="backupDue && fillUps.length >= 3" to="/vehicule#sauvegarde" class="card card-link card-soon">
      <strong class="with-icon"><AppIcon name="save" /> Sauvegarde ton carnet</strong>
      <span class="muted small" style="display: block">
        Il n'existe que sur ce téléphone : une copie à l'abri, et rien ne se perd si tu en changes.
      </span>
    </NuxtLink>

    <section class="card">
      <div class="section-head">
        <h2>Consommation par plein</h2>
        <span class="eyebrow" style="margin: 0">L/100 km</span>
      </div>
      <ConsumptionChart v-if="segments.length >= 2" :segments="segments" />
      <p v-else class="muted" style="margin: 0">
        {{ segments.length === 1
          ? 'Encore un plein complet et la courbe apparaîtra ici.'
          : 'Enregistre deux pleins complets d\'affilée : la consommation se calcule d\'un plein à l\'autre.' }}
      </p>
    </section>

    <NuxtLink to="/bilan" class="card card-link">
      <div class="row">
        <strong class="with-icon"><AppIcon name="medal" /> Bilan et badges</strong>
        <span class="badge badge-ok badge-plain">{{ unlockedCount }} / {{ badges.length }}</span>
      </div>
      <span v-if="nextBadge" class="muted small">
        Prochain : {{ nextBadge.emoji }} {{ nextBadge.title }} ({{ formatNumber(nextBadge.current) }} / {{ formatNumber(nextBadge.target) }})
      </span>
      <span v-else class="muted small">Tous les badges sont débloqués. Chapeau !</span>
    </NuxtLink>

    <InstallCallout />
  </div>
</template>

<style scoped>
.hero h1 { font-size: clamp(2.2rem, 7vw, 3.2rem); max-width: 16ch; }
.dash-title { margin: 0; color: var(--dash-text); font: 700 1.6rem/1.05 var(--font-display); }
.dash-fuel { color: var(--dash-text); --fuel-bg: var(--dash); font-size: 1.05rem; }
.dash-edit { color: var(--dash-muted); border-color: var(--dash-line); }
.dash-odometer { margin-top: 1rem; }
.demo { margin: 0; }
.with-icon { display: inline-flex; align-items: center; gap: .5rem; }
.reminder-link { display: grid; gap: .5rem; }
.savings-value { font: 700 2.2rem/1 var(--font-display); font-variant-numeric: tabular-nums; }
.is-ok { color: var(--ok); }
.is-warn { color: var(--warn); }
.features { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 0 1.5rem; }
.feature { position: relative; padding: 1.1rem 0 1.1rem 3.2rem; border-top: 1px dashed var(--border); }
.feature-num { position: absolute; left: 0; top: 1.1rem; color: var(--accent); font: 700 1.6rem/1 var(--font-display); }
.feature-icon { position: absolute; left: 0; top: 2.9rem; width: 22px; height: 22px; color: var(--muted); }
.feature h2 { font-size: 1.2rem; }
.feature p { margin: 0; color: var(--muted); font-size: .95rem; }
</style>
