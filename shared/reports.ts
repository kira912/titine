import { isFuel, type Fuel } from './fuel'

/** Signalements possibles sur une station : choix fermés, pas de texte libre à modérer */
export const REPORT_KINDS = ['prix-incorrect', 'rupture', 'station-fermee'] as const

export type ReportKind = typeof REPORT_KINDS[number]

export const REPORT_LABELS: Record<ReportKind, { action: string, summary: (count: number) => string }> = {
  'prix-incorrect': {
    action: 'Le prix affiché est faux',
    summary: count => `Prix signalé faux par ${count} personne${count > 1 ? 's' : ''}`,
  },
  'rupture': {
    action: 'Plus de ce carburant',
    summary: count => `Rupture signalée par ${count} personne${count > 1 ? 's' : ''}`,
  },
  'station-fermee': {
    action: 'La station est fermée',
    summary: count => `Fermeture signalée par ${count} personne${count > 1 ? 's' : ''}`,
  },
}

/** Le prix et la rupture portent sur un carburant ; la fermeture, sur toute la station */
export const reportNeedsFuel = (kind: ReportKind) => kind !== 'station-fermee'

export interface ReportInput {
  kind: ReportKind
  fuel: Fuel | null
}

/** Signalements récents d'une station, par type (prix et rupture : pour le carburant demandé) */
export type ReportCounts = Partial<Record<ReportKind, number>>

/** Valide le corps d'un signalement ; `null` s'il est incorrect */
export function parseReport(body: unknown): ReportInput | null {
  if (!body || typeof body !== 'object') return null
  const { kind, fuel } = body as Record<string, unknown>
  if (typeof kind !== 'string' || !(REPORT_KINDS as readonly string[]).includes(kind)) return null
  const reportKind = kind as ReportKind
  if (!reportNeedsFuel(reportKind)) return { kind: reportKind, fuel: null }
  return isFuel(fuel) ? { kind: reportKind, fuel } : null
}
