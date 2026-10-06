import { describe, expect, it } from 'vitest'
import { networkKey } from '../server/lib/network'

describe('networkKey', () => {
  it('garde une adresse IPv4 telle quelle', () => {
    expect(networkKey('203.0.113.7')).toBe('203.0.113.7')
    expect(networkKey('::ffff:203.0.113.7')).toBe('203.0.113.7')
  })

  it('ramène toutes les adresses d’un même /64 à une seule identité', () => {
    const a = networkKey('2001:db8:85a3:12::8a2e:370:7334')
    const b = networkKey('2001:0db8:85a3:0012:ffff:ffff:ffff:1')
    expect(a).toBe('2001:0db8:85a3:0012::/64')
    expect(b).toBe(a)
  })

  it('distingue deux /64 différents', () => {
    expect(networkKey('2001:db8:0:1::1')).not.toBe(networkKey('2001:db8:0:2::1'))
  })

  it('développe les formes abrégées', () => {
    expect(networkKey('2001:db8::1')).toBe('2001:0db8:0000:0000::/64')
    expect(networkKey('::1')).toBe('0000:0000:0000:0000::/64')
  })
})
