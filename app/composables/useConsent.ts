/**
 * Consentement à la mesure d'audience Google Analytics (cookies) : `null` tant que la personne n'a pas choisi.
 * Retenu dans le navigateur ; la CNIL demande de redemander au bout de 13 mois au plus.
 */
export type Consent = 'granted' | 'denied'

const CONSENT_KEY = 'titine:consent'
const CONSENT_MAX_AGE_MS = 395 * 86_400_000

function readConsent(): Consent | null {
  try {
    const saved = JSON.parse(localStorage.getItem(CONSENT_KEY) ?? 'null') as { value: Consent, at: number } | null
    return saved && Date.now() - saved.at < CONSENT_MAX_AGE_MS ? saved.value : null
  }
  catch {
    return null
  }
}

export function useConsent() {
  const consent = useState<Consent | null>('consent', () => null)
  // Lu après le montage : le rendu serveur ne connaît pas le choix
  const known = useState('consent-known', () => false)

  function load() {
    if (known.value) return
    consent.value = readConsent()
    known.value = true
  }

  function choose(value: Consent) {
    consent.value = value
    try {
      localStorage.setItem(CONSENT_KEY, JSON.stringify({ value, at: Date.now() }))
    }
    catch {}
    if (value === 'denied') clearAnalyticsCookies()
  }

  return { consent, known, load, choose }
}

/** Retire les cookies _ga déjà posés quand la personne retire son accord */
function clearAnalyticsCookies() {
  const domain = location.hostname.split('.').slice(-2).join('.')
  for (const name of document.cookie.split(';').map(cookie => cookie.split('=')[0]!.trim())) {
    if (!name.startsWith('_ga')) continue
    for (const scope of ['', `; domain=${location.hostname}`, `; domain=.${domain}`]) {
      document.cookie = `${name}=; Max-Age=0; path=/${scope}`
    }
  }
}
