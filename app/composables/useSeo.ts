/** URL absolue sur l'origine publique du site (NUXT_PUBLIC_SITE_URL) */
export function useAbsoluteUrl() {
  const base = useRuntimeConfig().public.siteUrl.replace(/\/$/, '')
  return (path: string) => `${base}${path}`
}

/** Données structurées schema.org, sérialisées sans risque d'injection dans la page */
export function useJsonLd(data: MaybeRefOrGetter<Record<string, unknown>>) {
  useHead({
    script: [{
      type: 'application/ld+json',
      innerHTML: computed(() => JSON.stringify({ '@context': 'https://schema.org', ...toValue(data) }).replace(/</g, '\\u003c')),
    }],
  })
}

/** Fil d'Ariane schema.org ; le dernier élément est la page courante */
export function useBreadcrumbs(items: MaybeRefOrGetter<{ name: string, path: string }[]>) {
  const url = useAbsoluteUrl()
  useJsonLd(() => ({
    '@type': 'BreadcrumbList',
    'itemListElement': toValue(items).map((item, index) => ({
      '@type': 'ListItem',
      'position': index + 1,
      'name': item.name,
      'item': url(item.path),
    })),
  }))
}
