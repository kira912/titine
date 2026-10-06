/**
 * Google Analytics 4, chargé seulement après accord (bandeau `ConsentBanner`) et si `NUXT_PUBLIC_GA_ID` est défini.
 * Les changements de page de l'appli sont comptés par la mesure améliorée de GA4 (historique du navigateur).
 * Rien du carnet n'est envoyé : uniquement les pages vues et les données techniques de GA.
 */
declare global {
  interface Window {
    dataLayer: unknown[]
    gtag: (...args: unknown[]) => void
  }
}

export default defineNuxtPlugin(() => {
  const { gaId } = useRuntimeConfig().public
  if (!gaId) return

  const { consent, load } = useConsent()
  let loaded = false

  function start() {
    if (loaded) return void window.gtag('consent', 'update', { analytics_storage: 'granted' })
    loaded = true
    window.dataLayer = window.dataLayer || []
    window.gtag = function gtag() {
      // gtag attend l'objet `arguments` lui-même
      // eslint-disable-next-line prefer-rest-params
      window.dataLayer.push(arguments)
    }
    window.gtag('consent', 'default', { analytics_storage: 'granted', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' })
    window.gtag('js', new Date())
    // Pas de signaux publicitaires ni de personnalisation
    window.gtag('config', gaId, { allow_google_signals: false, allow_ad_personalization_signals: false })
    const script = document.createElement('script')
    script.async = true
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaId)}`
    document.head.append(script)
  }

  load()
  watch(consent, (value) => {
    if (value === 'granted') start()
    else if (value === 'denied' && loaded) window.gtag('consent', 'update', { analytics_storage: 'denied' })
  }, { immediate: true })
})
