<script setup lang="ts">
import { APP } from '#shared/app'

// Pousse à l'installation selon l'appareil ; masqué une fois l'appli installée
const { standalone, platform, canPrompt, install } = useInstall()
</script>

<template>
  <aside v-if="!standalone" class="card callout">
    <template v-if="platform === 'ios'">
      <h2>Ajoute {{ APP.name }} à ton écran d'accueil</h2>
      <p>
        Dans Safari : <strong>Partager</strong> → <strong>Sur l'écran d'accueil</strong>.
      </p>
      <p class="muted small">
        C'est important sur iPhone : ton carnet est enregistré sur ton téléphone, et Safari peut effacer
        les données d'un site non installé après une semaine sans visite.
      </p>
    </template>

    <template v-else-if="platform === 'android'">
      <h2>Installe {{ APP.name }}</h2>
      <p>Ton carnet à portée de main sur l'écran d'accueil, même sans réseau.</p>
      <button v-if="canPrompt" class="btn btn-primary" @click="install">
        Installer {{ APP.name }}
      </button>
      <p v-else class="muted small">
        Dans Chrome : menu ⋮ → <strong>Installer l'application</strong>.
      </p>
    </template>

    <template v-else>
      <h2>Pensée pour ton téléphone</h2>
      <p>
        Ouvre {{ APP.name }} sur ton mobile et installe-la : ton carnet te suit à la pompe et au garage.
        Les données restent sur l'appareil où tu les saisis.
      </p>
      <button v-if="canPrompt" class="btn btn-ghost" @click="install">
        Installer sur cet ordinateur
      </button>
    </template>
  </aside>
</template>
