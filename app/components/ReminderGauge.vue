<script setup lang="ts">
import type { ReminderStatus } from '#shared/reminders'
import type { Reminder } from '#shared/types'

/** Jauge en 10 segments : part de l'intervalle déjà parcourue, par date ou par kilométrage (le plus avancé) */
const props = defineProps<{ reminder: Pick<Reminder, 'intervalKm' | 'intervalMonths' | 'lastDate'>, status: ReminderStatus }>()

const ratio = computed(() => {
  const { intervalKm, intervalMonths, lastDate } = props.reminder
  const { kmLeft, daysLeft } = props.status
  const ratios: number[] = []
  if (intervalKm && kmLeft !== null) ratios.push(1 - kmLeft / intervalKm)
  if (intervalMonths && lastDate && daysLeft !== null) ratios.push(1 - daysLeft / (intervalMonths * 30.44))
  return ratios.length ? Math.min(1, Math.max(0, ...ratios)) : null
})
const lit = computed(() => (ratio.value === null ? 0 : Math.max(1, Math.round(ratio.value * 10))))
</script>

<template>
  <div v-if="ratio !== null" class="gauge" :class="`gauge-${status.level}`" role="meter" :aria-valuenow="Math.round(ratio * 100)" aria-valuemin="0" aria-valuemax="100" aria-label="Intervalle écoulé">
    <span v-for="n in 10" :key="n" :class="{ on: n <= lit }" />
  </div>
</template>
