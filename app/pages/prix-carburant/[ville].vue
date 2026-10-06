<script setup lang="ts">
import { APP } from '#shared/app'
import { FUELS, FUEL_LABELS, FUEL_SUBJECTS, type Fuel } from '#shared/fuel'
import { SERVICE_LABELS } from '#shared/services'

const route = useRoute()
const slug = String(route.params.ville)

const { data: city, error } = await useFetch(`/api/cities/${slug}`)
if (error.value || !city.value) {
  throw createError({ statusCode: error.value?.statusCode ?? 404, statusMessage: 'Commune inconnue', fatal: true })
}

const stations = computed(() => [...(city.value?.stations ?? [])].sort((a, b) => a.address.localeCompare(b.address, 'fr')))

/** Par carburant vendu dans la commune : prix le plus bas, station qui le pratique, moyenne locale et nationale */
const fuels = computed(() => FUELS.flatMap((fuel) => {
  const offers = stations.value.flatMap(station => (station.prices[fuel] ? [{ price: station.prices[fuel]!.price, address: station.address }] : []))
  if (!offers.length) return []
  const best = offers.reduce((a, b) => (b.price < a.price ? b : a))
  const average = offers.reduce((sum, offer) => sum + offer.price, 0) / offers.length
  return [{ fuel, best: best.price, bestAddress: best.address, average, national: city.value?.national[fuel] ?? null, stations: offers.length }]
}))
/** Stations en rupture temporaire, carburant par carburant */
const shortages = computed(() => stations.value.flatMap(station => FUELS.flatMap(fuel =>
  station.shortages[fuel] ? [{ station, fuel, since: station.shortages[fuel]! }] : [])))
/** Colonnes du tableau : carburants vendus, ou en rupture, dans la commune */
const columns = computed(() => FUELS.filter(fuel => fuels.value.some(entry => entry.fuel === fuel) || shortages.value.some(entry => entry.fuel === fuel)))
const bestPrice = computed(() => Object.fromEntries(fuels.value.map(entry => [entry.fuel, entry.best])) as Partial<Record<Fuel, number>>)

const updatedAt = computed(() => {
  const dates = stations.value.flatMap(station => Object.values(station.prices).map(price => price.updatedAt))
  return dates.length ? dates.reduce((latest, date) => (date > latest ? date : latest)) : null
})

/** « 3 centimes de moins que la moyenne nationale (1,742 €) » */
function versusNational(average: number, national: number | null) {
  if (national === null) return ''
  const cents = Math.round((average - national) * 100)
  if (cents === 0) return `, au niveau de la moyenne nationale (${formatEuro(national, 3)})`
  const count = `${Math.abs(cents)} centime${Math.abs(cents) > 1 ? 's' : ''}`
  return `, soit ${count} de ${cents < 0 ? 'moins' : 'plus'} que la moyenne nationale (${formatEuro(national, 3)})`
}

const name = computed(() => city.value?.name ?? '')
const department = computed(() => city.value?.department ?? '')
const heading = computed(() => `Prix des carburants à ${name.value} (${department.value})`)
const title = computed(() => `Prix carburant à ${name.value} (${department.value}) : stations les moins chères`)
const description = computed(() => {
  if (!fuels.value.length) return `Stations-service de ${name.value} (${department.value}) : aucun prix récent n'a été relevé.`
  const prices = fuels.value.slice(0, 3).map(entry => `${FUEL_LABELS[entry.fuel]} dès ${formatEuro(entry.best, 3)}`).join(', ')
  return `Prix à la pompe dans ${stations.value.length > 1 ? `les ${stations.value.length} stations-service` : 'la station-service'} de ${name.value} : ${prices}. Comparez et trouvez le moins cher.`
})

useSeoMeta({
  title,
  description,
  ogTitle: heading,
  ogDescription: description,
  // Une commune sans aucun prix récent n'a rien d'utile à proposer dans les résultats de recherche
  robots: () => (stations.value.length ? 'index, follow' : 'noindex, follow'),
})

const url = useAbsoluteUrl()
useBreadcrumbs(() => [
  { name: 'Accueil', path: '/' },
  { name: 'Prix des carburants', path: '/prix-carburant' },
  { name: name.value, path: `/prix-carburant/${slug}` },
])
useJsonLd(() => ({
  '@type': 'ItemList',
  'name': heading.value,
  'numberOfItems': stations.value.length,
  'itemListElement': stations.value.map((station, index) => ({
    '@type': 'ListItem',
    'position': index + 1,
    'item': {
      '@type': 'GasStation',
      'name': `Station-service, ${station.address}`,
      'url': `${url(`/prix-carburant/${slug}`)}#station-${station.id}`,
      'address': {
        '@type': 'PostalAddress',
        'streetAddress': station.address,
        'postalCode': station.postalCode,
        'addressLocality': name.value,
        'addressCountry': 'FR',
      },
      'geo': { '@type': 'GeoCoordinates', 'latitude': station.lat, 'longitude': station.lon },
      ...(station.alwaysOpen ? { openingHours: 'Mo-Su 00:00-24:00' } : {}),
    },
  })),
}))
</script>

<template>
  <div v-if="city" class="stack">
    <nav aria-label="Fil d'Ariane" class="small">
      <NuxtLink to="/">Accueil</NuxtLink> ›
      <NuxtLink to="/prix-carburant">Prix des carburants</NuxtLink> ›
      <span aria-current="page">{{ name }}</span>
    </nav>

    <section>
      <h1>{{ heading }}</h1>
      <p class="muted" style="margin: 0">
        {{ stations.length }} station{{ stations.length > 1 ? 's' : '' }}-service avec des prix récents
        <template v-if="updatedAt"> · dernier relevé le {{ formatDate(updatedAt) }}</template>
      </p>
    </section>

    <template v-if="fuels.length">
      <section class="stats" aria-label="Prix les plus bas">
        <div v-for="entry in fuels" :key="entry.fuel" class="card">
          <div class="muted small">
            {{ FUEL_LABELS[entry.fuel] }} le moins cher
          </div>
          <div class="stat-value">
            {{ formatEuro(entry.best, 3) }}
          </div>
          <div class="muted small">
            {{ entry.bestAddress }}
          </div>
        </div>
      </section>

      <section class="card">
        <h2>Le carburant est-il cher à {{ name }} ?</h2>
        <ul style="margin: 0; padding-left: 1.2rem">
          <li v-for="entry in fuels" :key="entry.fuel">
            {{ FUEL_SUBJECTS[entry.fuel] }} coûte en moyenne <strong>{{ formatEuro(entry.average, 3) }}</strong> le litre
            dans {{ entry.stations > 1 ? `les ${entry.stations} stations qui en vendent` : 'la seule station qui en vend' }}{{ versusNational(entry.average, entry.national) }}.
          </li>
        </ul>
      </section>

      <section class="card">
        <h2>Tous les prix à {{ name }}</h2>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">
                  Station
                </th>
                <th v-for="fuel in columns" :key="fuel" scope="col">
                  {{ FUEL_LABELS[fuel] }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="station in stations" :id="`station-${station.id}`" :key="station.id">
                <td>
                  {{ station.address }}
                  <span v-if="station.alwaysOpen" class="muted small"> · 24 h/24</span>
                  <span v-if="station.services.length" class="station-services">
                    <span v-for="service in station.services" :key="service" :title="SERVICE_LABELS[service].label" role="img" :aria-label="SERVICE_LABELS[service].label">{{ SERVICE_LABELS[service].emoji }}</span>
                  </span>
                </td>
                <td v-for="fuel in columns" :key="fuel" :class="{ best: station.prices[fuel]?.price === bestPrice[fuel] }">
                  <template v-if="station.prices[fuel]">
                    {{ formatEuro(station.prices[fuel]!.price, 3) }}
                  </template>
                  <span v-else-if="station.shortages[fuel]" class="badge badge-soon">Rupture</span>
                  <template v-else>
                    —
                  </template>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p class="muted small" style="margin: .75rem 0 0">
          Prix au litre, en vert le plus bas de la commune ; « Rupture » : carburant momentanément indisponible. Source : données publiques du ministère de l'Économie,
          actualisées toutes les 30 minutes.
        </p>
      </section>
    </template>
    <p v-else class="card muted">
      Aucune station de {{ name }} n'a déclaré de prix depuis 30 jours. Consulte les communes voisines ci-dessous.
    </p>

    <section v-if="shortages.length" class="card card-soon">
      <h2>Ruptures de carburant à {{ name }}</h2>
      <ul style="margin: 0; padding-left: 1.2rem">
        <li v-for="entry in shortages" :key="`${entry.station.id}-${entry.fuel}`">
          <strong>{{ FUEL_LABELS[entry.fuel] }}</strong> indisponible au {{ entry.station.address }} depuis le {{ formatDate(entry.since) }}
        </li>
      </ul>
    </section>

    <section v-if="city.nearby.length" class="card">
      <h2>Prix des carburants près de {{ name }}</h2>
      <ul class="city-list">
        <li v-for="nearby in city.nearby" :key="nearby.slug">
          <NuxtLink :to="`/prix-carburant/${nearby.slug}`">{{ nearby.name }} ({{ nearby.department }})</NuxtLink>
          <span class="muted small"> · {{ formatNumber(nearby.distanceKm) }} km</span>
        </li>
      </ul>
    </section>

    <section class="card callout">
      <h2>Paie moins cher, et sache ce que ta voiture consomme</h2>
      <p>
        {{ APP.name }} trouve la station la moins chère autour de toi et calcule ta consommation réelle à chaque plein. Gratuit, sans compte.
      </p>
      <div class="row" style="justify-content: flex-start">
        <NuxtLink to="/carburant" class="btn btn-primary">
          📍 Autour de moi
        </NuxtLink>
        <NuxtLink to="/" class="btn btn-ghost">
          Créer mon carnet
        </NuxtLink>
      </div>
    </section>
  </div>
</template>
