import { consumptionSegments, fuelStats } from './consumption'
import { countedFillUps, countedSegments, countedServices, entryMonth } from './credibility'
import { fillUpSaving, savingsSummary } from './savings'
import type { FillUp, Service } from './types'

export interface Achievement {
  id: string
  emoji: string
  title: string
  description: string
  /** Progression vers l'objectif, plafonnée à `target` */
  current: number
  target: number
  unlocked: boolean
}

interface AchievementRule {
  id: string
  emoji: string
  title: string
  description: string
  target: number
  progress: (data: CountedData) => number
}

/** Données du carnet réduites à ce qui compte pour les badges (voir `credibility.ts`) */
interface CountedData {
  fillUps: FillUp[]
  allFillUps: FillUp[]
  services: Service[]
}

export interface GarageData {
  fillUps: FillUp[]
  services: Service[]
}

/** Plus longue suite de mois consécutifs ayant au moins un plein (mois de saisie, pour ne pas antidater) */
export function longestMonthStreak(fillUps: Pick<FillUp, 'date' | 'createdAt'>[]): number {
  const months = [...new Set(fillUps.map((fill) => {
    const month = entryMonth(fill)
    return Number(month.slice(0, 4)) * 12 + Number(month.slice(5, 7))
  }))].sort((a, b) => a - b)
  let best = 0
  let run = 0
  months.forEach((month, index) => {
    run = index > 0 && month === months[index - 1]! + 1 ? run + 1 : 1
    best = Math.max(best, run)
  })
  return best
}

/** Plus longue suite de tronçons (qui comptent) consommant moins que la moyenne de tous les tronçons */
export function longestFrugalRun(fillUps: FillUp[]): number {
  const average = fuelStats(fillUps).consumption
  if (average === null) return 0
  const counted = new Set(countedSegments(fillUps).map(segment => segment.odometer))
  let best = 0
  let run = 0
  for (const segment of consumptionSegments(fillUps)) {
    run = counted.has(segment.odometer) && segment.consumption < average ? run + 1 : 0
    best = Math.max(best, run)
  }
  return best
}

const RULES: AchievementRule[] = [
  {
    id: 'premier-plein',
    emoji: '⛽',
    title: 'Premier plein',
    description: 'Enregistre ton premier plein.',
    target: 1,
    progress: ({ fillUps }) => fillUps.length,
  },
  {
    id: 'carnet-tenu',
    emoji: '📒',
    title: 'Carnet tenu',
    description: 'Enregistre 10 pleins.',
    target: 10,
    progress: ({ fillUps }) => fillUps.length,
  },
  {
    id: 'habitue',
    emoji: '🏁',
    title: 'Habitué de la pompe',
    description: 'Enregistre 50 pleins.',
    target: 50,
    progress: ({ fillUps }) => fillUps.length,
  },
  {
    id: 'chasseur-de-prix',
    emoji: '🎯',
    title: 'Chasseur de prix',
    description: 'Paie 5 pleins moins cher que la moyenne du coin.',
    target: 5,
    progress: ({ fillUps }) => fillUps.filter(fill => (fillUpSaving(fill) ?? 0) > 0).length,
  },
  {
    id: 'cagnotte',
    emoji: '💰',
    title: 'Belle cagnotte',
    description: 'Économise 50 € par rapport aux prix du coin.',
    target: 50,
    progress: ({ fillUps }) => Math.floor(Math.max(savingsSummary(fillUps).total, 0)),
  },
  {
    id: 'pilote-sobre',
    emoji: '🍃',
    title: 'Pilote sobre',
    description: 'Consomme moins que ta moyenne 3 pleins d\'affilée.',
    target: 3,
    progress: ({ allFillUps }) => longestFrugalRun(allFillUps),
  },
  {
    id: 'grand-rouleur',
    emoji: '🛣️',
    title: 'Grand rouleur',
    description: 'Suis 10 000 km de consommation.',
    target: 10_000,
    progress: ({ allFillUps }) => countedSegments(allFillUps).reduce((sum, segment) => sum + segment.distance, 0),
  },
  {
    id: 'serie',
    emoji: '📅',
    title: 'Six mois de suivi',
    description: 'Fais au moins un plein chaque mois pendant 6 mois d\'affilée.',
    target: 6,
    progress: ({ fillUps }) => longestMonthStreak(fillUps),
  },
  {
    id: 'mecano',
    emoji: '🔧',
    title: 'Mécano consciencieux',
    description: 'Note 3 entretiens réalisés.',
    target: 3,
    progress: ({ services }) => services.length,
  },
]

export function achievements({ fillUps, services }: GarageData): Achievement[] {
  const counted: CountedData = { fillUps: countedFillUps(fillUps), allFillUps: fillUps, services: countedServices(services) }
  return RULES.map(({ progress, ...rule }) => {
    const current = Math.min(progress(counted), rule.target)
    return { ...rule, current, unlocked: current >= rule.target }
  })
}

/** Badges débloqués dans `after` qui ne l'étaient pas dans `before` */
export function newlyUnlocked(before: Achievement[], after: Achievement[]): Achievement[] {
  const already = new Set(before.filter(a => a.unlocked).map(a => a.id))
  return after.filter(a => a.unlocked && !already.has(a.id))
}
