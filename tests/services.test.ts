import { describe, expect, it } from 'vitest'
import { parseServices, serviceIds } from '../shared/services'

describe('serviceIds', () => {
  it('regroupe les libellés du flux et suit l’ordre de référence', () => {
    expect(serviceIds(['Toilettes publiques', 'Lavage manuel', 'Station de gonflage', 'Lavage automatique'])).toEqual(['gonflage', 'lavage', 'toilettes'])
  })

  it('ignore les services non repris et les valeurs invalides', () => {
    expect(serviceIds(['Relais colis', ' Bornes électriques '])).toEqual(['recharge'])
    expect(serviceIds(null)).toEqual([])
  })
})

describe('parseServices', () => {
  it('lit une liste séparée par des virgules en écartant l’inconnu', () => {
    expect(parseServices('lavage,inconnu,gonflage,lavage')).toEqual(['lavage', 'gonflage'])
    expect(parseServices(undefined)).toEqual([])
  })
})
