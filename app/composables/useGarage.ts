import { achievements } from '#shared/achievements'
import { today } from '#shared/dates'
import { reminderStatus, type ReminderLevel } from '#shared/reminders'
import type { FillUp, Reminder, Service, Vehicle } from '#shared/types'

/**
 * Mémorise qu'un véhicule existe, pour masquer l'accueil public dès le premier rendu
 * (script en tête de page dans app.vue) au lieu de le faire clignoter avant le tableau de bord.
 */
export const GARAGE_FLAG = 'titine:garage'

/** Ce navigateur a-t-il déjà un véhicule ? (lecture synchrone, avant la base locale) */
export function hasGarageFlag(): boolean {
  try {
    return Boolean(localStorage.getItem(GARAGE_FLAG))
  }
  catch {
    return false
  }
}

/** Le MVP ne gère qu'un véhicule : le premier enregistré */
export function useVehicle() {
  const { data: vehicle, ready } = useLiveQuery<Saved<Vehicle> | null>(
    async () => (await useLocalDb().vehicles.orderBy(':id').first()) ?? null,
    null,
  )
  watch([vehicle, ready], ([current, loaded]) => {
    if (!loaded) return
    document.documentElement.classList.toggle('has-garage', Boolean(current))
    try {
      if (current) localStorage.setItem(GARAGE_FLAG, '1')
      else localStorage.removeItem(GARAGE_FLAG)
    }
    catch {}
  })
  return { vehicle, ready }
}

export function useFillUps() {
  return useLiveQuery<Saved<FillUp>[]>(() => useLocalDb().fillUps.orderBy('odometer').toArray(), []).data
}

export function useReminders() {
  return useLiveQuery<Saved<Reminder>[]>(() => useLocalDb().reminders.toArray(), []).data
}

export function useServices() {
  return useLiveQuery<Saved<Service>[]>(() => useLocalDb().services.orderBy('date').reverse().toArray(), []).data
}

const LEVEL_ORDER: Record<ReminderLevel, number> = { overdue: 0, soon: 1, ok: 2 }

/** Rappels du véhicule avec leur échéance, les plus urgents d'abord */
export function useReminderStatuses(vehicle: Ref<Saved<Vehicle> | null>) {
  const reminders = useReminders()
  return computed(() => {
    const current = vehicle.value
    if (!current) return []
    const now = today()
    return reminders.value
      .map(reminder => ({ reminder, status: reminderStatus(reminder, now, current.odometer) }))
      .sort((a, b) =>
        LEVEL_ORDER[a.status.level] - LEVEL_ORDER[b.status.level]
        || (a.status.daysLeft ?? Infinity) - (b.status.daysLeft ?? Infinity))
  })
}

/** Badges du carnet, recalculés à chaque plein ou entretien */
export function useAchievements() {
  const fillUps = useFillUps()
  const services = useServices()
  return computed(() => achievements({ fillUps: fillUps.value, services: services.value }))
}
