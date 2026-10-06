/** Pictogrammes au trait, dessinés pour Titine (24 × 24, couleur du texte) */
import type { ServiceId } from '#shared/services'

export const ICON_PATHS = {
  dashboard: '<path d="M3.5 16.5a8.5 8.5 0 0 1 17 0"/><path d="M12 16.5l4.2-4.6"/><circle cx="12" cy="16.5" r="1.3"/><path d="M6 12.3l1 .7M12 8v1.2M18 12.3l-1 .7"/>',
  pump: '<path d="M4.5 21V5.5a2 2 0 0 1 2-2h5a2 2 0 0 1 2 2V21"/><path d="M3 21h12"/><path d="M7 7h4v3.5H7z"/><path d="M13.5 9.5h1.8a1.7 1.7 0 0 1 1.7 1.7v5.3a1.5 1.5 0 0 0 3 0V8.3L17.6 6"/>',
  wrench: '<path d="M14.5 4.2a4.5 4.5 0 0 0-4.1 6.2l-6.2 6.2a1.8 1.8 0 0 0 2.6 2.6l6.2-6.2a4.5 4.5 0 0 0 6.2-4.1l-2.6 2.6-2.4-.3-.3-2.4z"/>',
  pin: '<path d="M12 21s-6.5-5.8-6.5-11a6.5 6.5 0 0 1 13 0c0 5.2-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>',
  medal: '<path d="M8 3l2.6 6.3M16 3l-2.6 6.3"/><circle cx="12" cy="14.8" r="5.2"/><path d="M12 12.3l.8 1.6 1.7.2-1.2 1.2.3 1.7-1.6-.8-1.6.8.3-1.7-1.2-1.2 1.7-.2z"/>',
  car: '<path d="M5 15.5V12l1.8-4.3A2 2 0 0 1 8.6 6.5h6.8a2 2 0 0 1 1.8 1.2L19 12v3.5"/><path d="M3.5 15.5h17v2.5a1 1 0 0 1-1 1h-1.5a1 1 0 0 1-1-1v-.5H7v.5a1 1 0 0 1-1 1H4.5a1 1 0 0 1-1-1z"/><path d="M5 12h14"/><circle cx="7.8" cy="14" r=".6"/><circle cx="16.2" cy="14" r=".6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  chevron: '<path d="M9.5 6l6 6-6 6"/>',
  arrow: '<path d="M5 12h14M13.5 6.5L19 12l-5.5 5.5"/>',
  locate: '<circle cx="12" cy="12" r="6.5"/><circle cx="12" cy="12" r="2"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3"/>',
  route: '<circle cx="6" cy="18" r="2.2"/><circle cx="18" cy="6" r="2.2"/><path d="M8.2 18H15a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h6.8"/>',
  alert: '<path d="M12 4l9 15.5H3z"/><path d="M12 10v4.2M12 17v.01"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
  trash: '<path d="M4.5 7h15M10 7V4.5h4V7M6.5 7l1 13h9l1-13"/>',
  pause: '<path d="M9 5.5v13M15 5.5v13"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  share: '<path d="M12 15V3.5M7.5 8L12 3.5 16.5 8"/><path d="M6 11H5v9.5h14V11h-1"/>',
  save: '<path d="M12 3.5V15M7.5 10.5L12 15l4.5-4.5"/><path d="M5 15.5v5h14v-5"/>',
  upload: '<path d="M12 15V3.5M7.5 8L12 3.5 16.5 8"/><path d="M5 15.5v5h14v-5"/>',
  lock: '<rect x="5" y="10.5" width="14" height="10" rx="1.5"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>',
  euro: '<path d="M17.5 6.5a6.5 6.5 0 1 0 0 11"/><path d="M4.5 10.5h9M4.5 13.5h9"/>',
  chart: '<path d="M4 4v16h16"/><path d="M7.5 15l3.5-4.5 3 2.5 4.5-6"/>',
  calendar: '<rect x="4" y="5.5" width="16" height="14.5" rx="1.5"/><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4"/>',
  phone: '<rect x="7" y="2.5" width="10" height="19" rx="2"/><path d="M11 18.5h2"/>',
  // Services des stations
  tire: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="3.2"/><path d="M12 3.5v5.3M12 15.2v5.3M3.5 12h5.3M15.2 12h5.3"/>',
  wash: '<path d="M8 4.5c0 0-3.5 4-3.5 6.5a3.5 3.5 0 0 0 7 0C11.5 8.5 8 4.5 8 4.5z"/><path d="M16.5 11s-3 3.3-3 5.5a3 3 0 0 0 6 0c0-2.2-3-5.5-3-5.5z"/>',
  toilet: '<path d="M3.5 7.5l1.5 9 1.8-6 1.8 6 1.5-9"/><path d="M19.5 9a3.2 3.2 0 0 0-2.7-1.5c-2 0-3.3 2-3.3 4.5s1.3 4.5 3.3 4.5a3.2 3.2 0 0 0 2.7-1.5"/>',
  shop: '<path d="M5 8h14l-1 12.5H6z"/><path d="M9 10.5V7a3 3 0 0 1 6 0v3.5"/>',
  cash: '<rect x="3" y="6.5" width="18" height="11" rx="1.5"/><circle cx="12" cy="12" r="2.5"/><path d="M6.5 9.5v.01M17.5 14.5v.01"/>',
  food: '<path d="M7 3.5v17M4.5 3.5V8a2.5 2.5 0 0 0 5 0V3.5"/><path d="M16.5 20.5V3.5c-2 1-3 3.5-3 7h3"/>',
  plug: '<path d="M13 3l-6.5 10h5L10.5 21 17.5 10.5h-5z"/>',
  van: '<path d="M3 17V8a2 2 0 0 1 2-2h10l3.5 4.5H21V17z"/><path d="M15 6v4.5h6"/><circle cx="7.5" cy="17.5" r="1.8"/><circle cx="16.5" cy="17.5" r="1.8"/>',
} as const

export type IconName = keyof typeof ICON_PATHS

/** Pictogramme de chaque service de station */
export const SERVICE_ICONS: Record<ServiceId, IconName> = {
  'gonflage': 'tire',
  'lavage': 'wash',
  'toilettes': 'toilet',
  'boutique': 'shop',
  'dab': 'cash',
  'restauration': 'food',
  'recharge': 'plug',
  'atelier': 'wrench',
  'camping-car': 'van',
}
