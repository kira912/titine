<script setup lang="ts">
import { FUEL_LABELS, type Fuel } from '#shared/fuel'
import { REPORT_KINDS, REPORT_LABELS, reportNeedsFuel, type ReportCounts, type ReportKind } from '#shared/reports'

const props = defineProps<{
  stationId: number
  fuel: Fuel
  reports: ReportCounts
}>()

const counts = ref<ReportCounts>({ ...props.reports })
watch(() => props.reports, (reports) => {
  counts.value = { ...reports }
})

const open = ref(false)
const pending = ref(false)
const message = ref('')

const summaries = computed(() => REPORT_KINDS.flatMap(kind => (counts.value[kind] ? [REPORT_LABELS[kind].summary(counts.value[kind]!)] : [])))

const actionLabel = (kind: ReportKind) =>
  reportNeedsFuel(kind) ? `${REPORT_LABELS[kind].action} (${FUEL_LABELS[props.fuel]})` : REPORT_LABELS[kind].action

async function send(kind: ReportKind) {
  pending.value = true
  message.value = ''
  try {
    const { created } = await $fetch<{ created: boolean }>(`/api/stations/${props.stationId}/reports`, {
      method: 'POST',
      body: { kind, fuel: props.fuel },
    })
    if (created) counts.value = { ...counts.value, [kind]: (counts.value[kind] ?? 0) + 1 }
    message.value = created ? 'Merci, c\'est noté : les autres conducteurs le verront.' : 'Tu l\'as déjà signalé aujourd\'hui, merci.'
    open.value = false
  }
  catch (error) {
    const status = (error as { statusCode?: number }).statusCode
    message.value = status === 429
      ? 'Trop de signalements aujourd\'hui : réessaie demain.'
      : navigator.onLine ? 'Le signalement n\'est pas passé. Réessaie dans un instant.' : 'Pas de réseau : le signalement n\'est pas passé.'
  }
  finally {
    pending.value = false
  }
}
</script>

<template>
  <div class="reports small">
    <span v-for="summary in summaries" :key="summary" class="badge badge-soon">⚠️ {{ summary }}</span>
    <button v-if="!open" type="button" class="link" @click="open = true; message = ''">
      Signaler un problème
    </button>
    <div v-else class="choices" role="group" aria-label="Signaler un problème">
      <button v-for="kind in REPORT_KINDS" :key="kind" type="button" class="btn btn-small btn-ghost" :disabled="pending" @click="send(kind)">
        {{ actionLabel(kind) }}
      </button>
      <button type="button" class="link muted" @click="open = false">
        Annuler
      </button>
    </div>
    <span v-if="message" role="status" class="muted">{{ message }}</span>
  </div>
</template>

<style scoped>
.reports { display: flex; flex-wrap: wrap; align-items: center; gap: .35rem .6rem; margin-top: .25rem; }
.choices { display: grid; gap: .35rem; flex-basis: 100%; }
.choices .btn { justify-content: flex-start; }
.link { padding: 0; border: 0; background: none; color: var(--accent); font: inherit; text-decoration: underline; cursor: pointer; justify-self: start; }
</style>
