<script setup lang="ts">
import { parseBackup } from '#shared/backup'
import { today } from '#shared/dates'

const message = ref('')
const error = ref('')
const pending = ref(false)
const lastBackup = ref<Date | null>(null)
onMounted(() => {
  lastBackup.value = lastBackupAt()
})

async function exportFile() {
  pending.value = true
  error.value = ''
  message.value = ''
  try {
    const backup = await exportGarage()
    const blob = new Blob([JSON.stringify(backup)], { type: 'application/json' })
    await shareFile(blob, `titine-carnet-${today()}.json`, 'Sauvegarde de mon carnet Titine')
    markBackupDone()
    lastBackup.value = new Date()
    message.value = 'Sauvegarde prête : range ce fichier hors du téléphone (Drive, iCloud, e-mail).'
  }
  catch {
    error.value = 'La sauvegarde n\'a pas pu être créée. Réessaie dans un instant.'
  }
  finally {
    pending.value = false
  }
}

async function importFile(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  error.value = ''
  message.value = ''

  const backup = parseBackup(await file.text())
  if (typeof backup === 'string') return void (error.value = backup)

  const date = backup.exportedAt ? ` du ${formatDate(backup.exportedAt)}` : ''
  const summary = `${backup.fillUps.length} plein${backup.fillUps.length > 1 ? 's' : ''}, ${backup.services.length} entretien${backup.services.length > 1 ? 's' : ''}`
  if (!confirm(`Restaurer la sauvegarde${date} (${summary}) ? Ton carnet actuel sera remplacé.`)) return

  pending.value = true
  try {
    await importGarage(backup)
    message.value = `Carnet restauré : ${summary}.`
  }
  catch {
    error.value = 'La restauration a échoué : ton carnet n\'a pas été modifié.'
  }
  finally {
    pending.value = false
  }
}
</script>

<template>
  <section id="sauvegarde" class="card">
    <h2>Sauvegarde</h2>
    <p class="muted small">
      Ton carnet n'existe que sur cet appareil. Garde-en une copie ailleurs : en cas de changement de téléphone,
      de données effacées ou de navigateur qui fait le ménage, tu pourras tout récupérer.
      <template v-if="lastBackup">
        Dernière sauvegarde le {{ formatDate(lastBackup.toISOString().slice(0, 10)) }}.
      </template>
    </p>
    <div class="row" style="justify-content: flex-start">
      <button type="button" class="btn btn-primary" :disabled="pending" @click="exportFile">
        💾 Sauvegarder mon carnet
      </button>
      <label class="btn btn-ghost" :class="{ disabled: pending }">
        Restaurer une sauvegarde
        <input type="file" accept="application/json,.json" class="visually-hidden" :disabled="pending" @change="importFile">
      </label>
    </div>
    <p v-if="message" class="badge badge-ok" role="status" style="margin: .75rem 0 0; white-space: normal">
      {{ message }}
    </p>
    <p v-if="error" class="error" role="alert" style="margin: .75rem 0 0">
      {{ error }}
    </p>
  </section>
</template>

<style scoped>
.visually-hidden { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
label.btn { position: relative; cursor: pointer; }
label.btn:focus-within { outline: 2px solid var(--accent); outline-offset: 2px; }
.disabled { opacity: .6; pointer-events: none; }
</style>
