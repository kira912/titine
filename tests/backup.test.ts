import { describe, expect, it } from 'vitest'
import { BACKUP_VERSION, parseBackup, type Backup } from '../shared/backup'

const backup: Backup = {
  app: 'titine',
  version: BACKUP_VERSION,
  exportedAt: '2026-10-06T12:00:00.000Z',
  vehicles: [{ id: 1, make: 'Peugeot', model: '208', fuel: 'gazole', odometer: 50_000, firstRegistration: null }],
  fillUps: [{ id: 1, vehicleId: 1, date: '2026-10-01', odometer: 49_500, liters: 40, totalPrice: 72, full: true, station: { id: 9, address: '1 rue', city: 'Lyon', price: 1.8, localAverage: 1.9 } }],
  reminders: [{ id: 1, vehicleId: 1, kind: 'vidange', label: 'Vidange', intervalKm: 15_000, intervalMonths: 12, lastDate: '2026-01-01', lastOdometer: 40_000, firstDueDate: null }],
  services: [{ id: 1, vehicleId: 1, reminderId: 1, label: 'Vidange', date: '2026-01-01', odometer: 40_000, cost: 90 }],
  drafts: [],
}
const text = (data: unknown) => JSON.stringify(data)

describe('parseBackup', () => {
  it('relit une sauvegarde valide à l’identique', () => {
    expect(parseBackup(text(backup))).toEqual(backup)
  })

  it('accepte une sauvegarde sans brouillons', () => {
    const { drafts: _, ...withoutDrafts } = backup
    expect(parseBackup(text(withoutDrafts))).toMatchObject({ drafts: [] })
  })

  it('refuse ce qui n’est pas une sauvegarde Titine', () => {
    expect(parseBackup('pas du json')).toMatch(/pas une sauvegarde/)
    expect(parseBackup(text({ ...backup, app: 'autre' }))).toMatch(/pas une sauvegarde/)
    expect(parseBackup(text([backup]))).toMatch(/pas une sauvegarde/)
  })

  it('refuse une autre version du format', () => {
    expect(parseBackup(text({ ...backup, version: 99 }))).toMatch(/autre version/)
  })

  it('refuse un enregistrement invalide sans rien garder', () => {
    expect(parseBackup(text({ ...backup, fillUps: [{ ...backup.fillUps[0], liters: -4 }] }))).toMatch(/abîmée/)
    expect(parseBackup(text({ ...backup, vehicles: [{ ...backup.vehicles[0], fuel: 'kérosène' }] }))).toMatch(/abîmée/)
    expect(parseBackup(text({ ...backup, reminders: [{ ...backup.reminders[0], kind: 'inconnu' }] }))).toMatch(/abîmée/)
  })

  it('refuse un enregistrement rattaché à un véhicule absent', () => {
    expect(parseBackup(text({ ...backup, fillUps: [{ ...backup.fillUps[0], vehicleId: 2 }] }))).toMatch(/abîmée/)
  })

  it('refuse une sauvegarde sans véhicule', () => {
    expect(parseBackup(text({ ...backup, vehicles: [], fillUps: [], reminders: [], services: [] }))).toMatch(/aucun véhicule/)
  })
})
