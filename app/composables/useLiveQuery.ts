import { liveQuery } from 'dexie'

/** Requête Dexie réactive : la valeur se met à jour à chaque écriture dans les tables lues */
export function useLiveQuery<T>(query: () => Promise<T>, initial: T) {
  const data = shallowRef(initial) as Ref<T>
  const ready = ref(false)

  if (import.meta.client) {
    const subscription = liveQuery(query).subscribe({
      next: (value) => {
        data.value = value
        ready.value = true
      },
      error: error => console.error('[titine]', error),
    })
    onScopeDispose(() => subscription.unsubscribe())
  }

  return { data, ready }
}
