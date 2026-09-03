// content.enemy-flip (2026-09-02) — the standard battle's horde is AUTHORED.
// Angela 2026-08-20 (6-BESTIARY-SETTLED): "You could create a burning zombie
// and mix them in with the other zombies. On taking damage, the zombie deals 1
// burn to its attacker." — one per four. The Codex's own Zombie and the
// Burning Zombie authored from that ruling replace the test clones, and EVERY
// authored enemy (33) is packed, gaps named. Pipeline agreement, no frozen
// numbers except what the ruling itself fixes (one per four).
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { FIRST_BATTLE, TEST_COHORT, UNITS } from '../src/content/index.js'
import { createBattle } from '../src/core/setup.js'
import { runBattle } from '../src/core/battle.js'

const authored = (): { id: string; stats: Record<string, number>; triggers?: unknown[] }[] =>
  JSON.parse(readFileSync(join(__dirname, '..', '..', 'content', 'gen', 'enemies-authored.json'), 'utf8')).units
const gaps = (): { unit: string; what: string; needs: string }[] =>
  JSON.parse(readFileSync(join(__dirname, '..', '..', 'content', 'gen', 'enemy-pack-gaps.json'), 'utf8')).gaps

describe('the horde is authored', () => {
  it('FIRST_BATTLE cycles the authored Zombie with a Burning Zombie one per four; the test enemies are a named fixture', () => {
    expect([...FIRST_BATTLE.enemies]).toEqual(['unit.zombie', 'unit.zombie', 'unit.zombie', 'unit.zombie-burning'])
    for (const t of FIRST_BATTLE.enemies) expect(t.startsWith('unit.'), t).toBe(true)
    expect([...TEST_COHORT.enemies]).toEqual(['test-zombie', 'test-zombie', 'test-zombie', 'test-zombie-burning'])
    const ctx = createBattle({ replicate: 0, enemyCount: 8 })
    expect(ctx.state.units.filter((u) => u.typeId === 'unit.zombie-burning').length).toBe(2)
  })

  it('the Burning Zombie is the Zombie stat line plus the sear, under its published trigger id', () => {
    const z = authored().find((u) => u.id === 'unit.zombie')!
    const b = authored().find((u) => u.id === 'unit.zombie-burning')!
    expect(b.stats).toEqual(z.stats)
    const bz = UNITS['unit.zombie-burning']!, zz = UNITS['unit.zombie']!
    expect([bz.maxHp, bz.strength, bz.accuracy, bz.movement]).toEqual([zz.maxHp, zz.strength, zz.accuracy, zz.movement])
    expect(bz.attacks).toEqual(zz.attacks)
    const sear = (bz.triggers ?? []).find((t) => t.id === 'trigger.zombie-burning.sear')!
    expect(sear.hook).toBe('onTakingDamage')
    expect(sear.effect).toEqual({ kind: 'status.apply', statusId: 'status.burn', value: 1 })
  })

  it('every authored enemy is packed, and every clause the engine cannot express is a named gap', () => {
    const rows = authored()
    expect(rows.length).toBeGreaterThanOrEqual(33)
    for (const r of rows) expect(UNITS[r.id], r.id).toBeDefined()
    const g = gaps()
    // an authored unit with NO attacks must say why
    for (const r of rows) {
      const u = UNITS[r.id]!
      if (u.attacks.length === 0) expect(g.some((x) => x.unit === r.id), `${r.id} fields weaponless and must carry a gap`).toBe(true)
    }
    // the stat-less gaze is the shape the engine cannot say
    expect(g.some((x) => x.unit === 'unit.eyeblight' && /reads no stat/.test(x.what))).toBe(true)
  })
})

describe('in real battles', () => {
  it('the sear burns whoever hits a Burning Zombie in the standard battle', () => {
    let seared = 0
    for (let r = 0; r < 20 && !seared; r++) {
      const ctx = createBattle({ replicate: r, enemyCount: 8 }); runBattle(ctx)
      seared += ctx.events.filter((e) => e.type === 'status.applied' && e.causeId === 'trigger.zombie-burning.sear' && e['statusId'] === 'status.burn').length
    }
    expect(seared).toBeGreaterThan(0)
  })
  it('FINDING, asserted so it is not forgotten: four authored zombies are a walkover for the Alpha Team', () => {
    let clear = 0, downs = 0, turns = 0
    for (let r = 0; r < 50; r++) {
      const ctx = createBattle({ replicate: r }); const res = runBattle(ctx)
      if (res.outcome === 'heroClear') clear++
      turns += res.turns
      downs += ctx.events.filter((e) => e.type === 'life.downed').length
    }
    expect(clear).toBe(50)
    expect(turns / 50).toBeLessThan(5)
    expect(downs).toBeLessThan(5)
  })
})
