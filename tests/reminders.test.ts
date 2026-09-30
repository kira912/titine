import { describe, expect, it } from 'vitest'
import { defaultReminders, firstInspectionDate, reminderStatus } from '../shared/reminders'
import type { Reminder } from '../shared/types'

const reminder = (overrides: Partial<Reminder>): Reminder => ({
  vehicleId: 1,
  kind: 'vidange',
  label: 'Vidange',
  intervalKm: 15_000,
  intervalMonths: 12,
  lastDate: '2026-01-10',
  lastOdometer: 80_000,
  firstDueDate: null,
  ...overrides,
})

describe('reminderStatus', () => {
  it('calcule l’échéance par date et par kilométrage', () => {
    const status = reminderStatus(reminder({}), '2026-06-10', 85_000)
    expect(status).toMatchObject({ dueDate: '2027-01-10', dueOdometer: 95_000, kmLeft: 10_000, level: 'ok' })
    expect(status.daysLeft).toBe(214)
  })

  it('passe en « bientôt » dès que la date ou le kilométrage approche', () => {
    expect(reminderStatus(reminder({}), '2026-12-20', 85_000).level).toBe('soon')
    expect(reminderStatus(reminder({}), '2026-06-10', 94_200).level).toBe('soon')
  })

  it('passe en retard dès qu’une des deux échéances est dépassée', () => {
    expect(reminderStatus(reminder({}), '2027-01-11', 85_000).level).toBe('overdue')
    expect(reminderStatus(reminder({}), '2026-06-10', 95_001).level).toBe('overdue')
  })

  it('n’est pas en retard le jour même de l’échéance', () => {
    expect(reminderStatus(reminder({}), '2027-01-10', 95_000)).toMatchObject({ daysLeft: 0, kmLeft: 0, level: 'soon' })
  })

  it('ignore l’échéance absente (rappel au kilométrage seul)', () => {
    const status = reminderStatus(reminder({ intervalMonths: null }), '2030-01-01', 85_000)
    expect(status).toMatchObject({ dueDate: null, daysLeft: null, level: 'ok' })
  })

  it('reste neutre quand rien n’est connu', () => {
    const status = reminderStatus(reminder({ lastDate: null, lastOdometer: null, intervalKm: null }), '2026-06-10', 85_000)
    expect(status).toMatchObject({ dueDate: null, dueOdometer: null, level: 'ok' })
  })
})

describe('contrôle technique', () => {
  it('place le premier contrôle 4 ans après la mise en circulation', () => {
    expect(firstInspectionDate('2023-05-17')).toBe('2027-05-17')
  })

  it('utilise l’échéance imposée tant qu’aucun contrôle n’a été fait, puis repart pour 2 ans', () => {
    const [, , inspection] = defaultReminders({ odometer: 30_000, firstRegistration: '2023-05-17' }, '2026-09-30')
    const pending = { ...inspection!, vehicleId: 1 }
    expect(reminderStatus(pending, '2026-09-30', 30_000)).toMatchObject({ dueDate: '2027-05-17', dueOdometer: null, level: 'ok' })

    const done = { ...pending, lastDate: '2027-05-03', lastOdometer: 38_000 }
    expect(reminderStatus(done, '2027-05-03', 38_000).dueDate).toBe('2029-05-03')
  })

  it('signale un premier contrôle dépassé sur un véhicule ancien', () => {
    const [, , inspection] = defaultReminders({ odometer: 120_000, firstRegistration: '2015-03-02' }, '2026-09-30')
    expect(reminderStatus({ ...inspection!, vehicleId: 1 }, '2026-09-30', 120_000).level).toBe('overdue')
  })

  it('n’invente pas d’échéance sans date de mise en circulation', () => {
    const [, , inspection] = defaultReminders({ odometer: 30_000, firstRegistration: null }, '2026-09-30')
    expect(reminderStatus({ ...inspection!, vehicleId: 1 }, '2026-09-30', 30_000)).toMatchObject({ dueDate: null, level: 'ok' })
  })
})

describe('defaultReminders', () => {
  it('démarre vidange et pneus au kilométrage et à la date de création', () => {
    const [oil, tyres] = defaultReminders({ odometer: 30_000, firstRegistration: null }, '2026-09-30')
    expect(oil).toMatchObject({ kind: 'vidange', lastDate: '2026-09-30', lastOdometer: 30_000 })
    expect(tyres).toMatchObject({ kind: 'pneus', intervalMonths: null, lastOdometer: 30_000 })
  })
})
