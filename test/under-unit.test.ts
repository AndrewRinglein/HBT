// viewer.under-unit (PLAYABLE-OPENING-PLAN.md item 6; DECISIONS.md 2026-09-29 "the playable battle screen": "we don't
// need poison or burn icons on the units because we can display that on the unit directly with a fire and poison" ·
// "Slow does not need representation on the character. It can just change the number that shows how much movement
// that character has" · "Stun should be shown on a character"). The viewer draws Stun, Burn and Poison on the body
// and gives Slow no icon, by the status lists in ../viewer/src/theme.js (UNDER_UNIT). This asks the ENGINE's status
// rows whether each list is exactly the statuses that behave so — block action, tick fire, tick poison, reduce
// movement — so a new or renamed status shows up here, not only in the viewer. Runs the viewer's table in a child
// process; imports no viewer code.
import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { STATUSES } from '../src/content/statuses.js'

type Table = { body: Record<'stun' | 'burn' | 'poison', string[]>, movementOnly: string[] }
const table = (): Table => JSON.parse(execFileSync(process.execPath, ['--input-type=module', '-e',
  "const m = await import('../viewer/src/theme.js'); process.stdout.write(JSON.stringify(m.UNDER_UNIT))"], { encoding: 'utf8' }))
const rows = Object.entries(STATUSES) as [string, Record<string, unknown>][]
const where = (f: (row: Record<string, unknown>) => boolean) => rows.filter(([, r]) => f(r)).map(([id]) => id).sort()

describe('what the viewer draws on the body is what the engine says the status does', () => {
  const t = table()
  it('Stun on the body: every status that blocks action, and no other', () => {
    expect([...t.body.stun].sort()).toEqual(where(r => r.blocksAction === true))
    expect(t.body.stun).toContain('status.stun')
  })
  it('Burn and Poison on the body: the statuses that tick fire and poison', () => {
    expect([...t.body.burn].sort()).toEqual(where(r => r.tickDamageType === 'fire'))
    expect([...t.body.poison].sort()).toEqual(where(r => r.tickDamageType === 'poison'))
    expect([t.body.burn, t.body.poison]).toEqual([['status.burn'], ['status.poison']])
  })
  it('Slow only changes the movement number: the statuses that reduce movement', () => {
    expect([...t.movementOnly].sort()).toEqual(where(r => r.reducesMovement === true))
    expect(t.movementOnly).toContain('status.slow')
  })
})
