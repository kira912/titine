import { isIPv6 } from 'node:net'

/** Développe une adresse IPv6 abrégée (« 2001:db8::1 ») en ses 8 groupes */
function expandIPv6(ip: string): string[] {
  const [head = '', tail] = ip.split('::')
  const left = head ? head.split(':') : []
  const right = tail ? tail.split(':') : []
  const missing = tail === undefined ? 0 : 8 - left.length - right.length
  return [...left, ...Array<string>(missing).fill('0'), ...right].map(group => group.padStart(4, '0').toLowerCase())
}

/**
 * Identité réseau d'un appelant pour limiter les abus : l'adresse IPv4, ou le préfixe /64 d'une
 * adresse IPv6. Un abonné IPv6 dispose de tout un /64 : compter chaque adresse lui donnerait des
 * milliards d'identités.
 */
export function networkKey(ip: string): string {
  const address = ip.trim()
  // IPv4 encapsulée (« ::ffff:192.0.2.1 ») : c'est une adresse IPv4
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(address)
  if (mapped) return mapped[1]!
  if (!isIPv6(address)) return address
  return `${expandIPv6(address).slice(0, 4).join(':')}::/64`
}
