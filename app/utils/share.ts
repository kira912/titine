/** Partage un fichier avec la feuille de partage du téléphone, ou le télécharge à défaut */
export async function shareFile(blob: Blob, filename: string, text: string) {
  const file = new File([blob], filename, { type: blob.type })
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], text })
    }
    catch (error) {
      // Feuille de partage fermée par l'utilisateur : rien à signaler
      if ((error as Error).name !== 'AbortError') throw error
    }
    return
  }
  const url = URL.createObjectURL(blob)
  const link = Object.assign(document.createElement('a'), { href: url, download: filename })
  link.click()
  URL.revokeObjectURL(url)
}

const LAST_BACKUP_KEY = 'titine:last-backup'

/** Date de la dernière sauvegarde faite depuis cet appareil */
export function lastBackupAt(): Date | null {
  try {
    const value = localStorage.getItem(LAST_BACKUP_KEY)
    return value ? new Date(value) : null
  }
  catch {
    return null
  }
}

export function markBackupDone() {
  try {
    localStorage.setItem(LAST_BACKUP_KEY, new Date().toISOString())
  }
  catch {}
}
