// content.imp-blast-tuned (2026-10-04) — ruled 2026-10-03 (Andrew, DECISIONS.md "the Imp: Precision down by 1; its Blast burns
// half the time"): "Change the regular imp's regular main attack to lower their precision by 1 and change it to a 50% chance
// of burn 2."
//
// A numbers change to one Codex row (content gen/enemies-authored.json unit.imp), no engine code: the Imp's Precision is 3
// (was 4), so Imp Blast — damage Precision + 0 — deals 1 less; the Blast's on-hit Burn 2 takes the trigger's own `chance: 50`
// (was certain), rolled on the trigger's named roll (COMBAT-SEQUENCE "Chance is a number; firing is a rung"). The Imp's Claw
// (Strength), the Fire Imp, the Poison Imp and the Powerful Imp are unchanged — the Powerful Imp fires the same Imp Blast row
// and keeps its own certain Burn 2 (SWITCHES.md powerfulImpKeepsItsBurn).
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { createCustomBattle } from '../src/core/setup.js'
import { performAttack, preview } from '../src/core/pipeline.js'
import { beginActivation } from '../src/core/mutate.js'
import { ATTACKS, UNITS } from '../src/content/index.js'
import { openingBattle } from './opening-helpers.js'
import { hexId } from './board16.js'

const IMP = 'unit.imp', BLAST = 'attack.imp.blast', CLAW = 'attack.imp.claw', BURN = 'trigger.imp.burn'
const HERO = 'hero.base.warrior-iron'
const rider = (unitId: string, attackId: string) => UNITS[unitId]!.triggers!.filter((t) => t.hook === 'onHit' && t.onlyWithAttack === attackId)
const codex = () => JSON.parse(readFileSync(fileURLToPath(new URL('../../content/hbt-content.json', import.meta.url)), 'utf8')) as
  { bestiary: { id: string; stats: Record<string, number>; attacks: { id?: string; sameAs?: string; triggers?: { hook: string; chance?: number; effects: { status?: string; value?: number }[] }[] }[] }[] }

describe('the row: the Imp\'s Precision is 3 and Imp Blast\'s Burn 2 is a 50% chance', () => {
  it('unit.imp: Precision 3 (was 4); Strength, Health, Dodge, Movement and Accuracy as they were', () => {
    const imp = UNITS[IMP]!
    expect(imp.precision).toBe(3)
    expect([imp.strength, imp.maxHp, imp.dodge, imp.movement, imp.accuracy]).toEqual([3, 7, 15, 7, 80])
  })

  it('Imp Blast is still one enemy within 4, Precision + 0; its on-hit rider is Burn 2 at chance 50', () => {
    expect(ATTACKS[BLAST]).toMatchObject({ range: 4, attack: { kind: 'ranged', stat: 'precision', bonus: 0 } })
    expect(rider(IMP, BLAST)).toEqual([{ id: BURN, hook: 'onHit', chance: 50, select: 'target', effect: { kind: 'status.apply', statusId: 'status.burn', value: 2 }, source: IMP, onlyWithAttack: BLAST }])
    expect(rider(IMP, CLAW), 'the Claw carries no rider').toEqual([])
  })

  it('the Codex row and the engine pack agree', () => {
    const row = codex().bestiary.find((u) => u.id === IMP)!
    expect(row.stats['precision']).toBe(UNITS[IMP]!.precision)
    const blast = row.attacks.find((a) => a.id === BLAST)!
    expect(blast.triggers!.map((t) => [t.hook, t.chance, t.effects[0]!.status, t.effects[0]!.value])).toEqual([['onHit', 50, 'burn', 2]])
    expect(rider(IMP, BLAST)[0]!.chance).toBe(blast.triggers![0]!.chance)
  })

  it('the Fire Imp, the Poison Imp and the Powerful Imp are as they were', () => {
    expect(UNITS['unit.fire-imp']!.precision).toBe(4)
    expect(rider('unit.fire-imp', 'attack.fire-imp.blast').map((t) => [t.chance, t.effect])).toEqual([[100, { kind: 'status.apply', statusId: 'status.burn', value: 3 }]])
    expect(UNITS['unit.poison-imp']!.precision).toBe(4)
    expect(rider('unit.poison-imp', 'attack.poison-imp.blast').map((t) => [t.chance, t.effect])).toEqual([[100, { kind: 'status.apply', statusId: 'status.poison', value: 3 }]])
    // the Powerful Imp fires the same Imp Blast row (its attacks are the Imp's) with its own Precision 5 and its own certain Burn 2
    expect(UNITS['unit.powerful-imp']!.precision).toBe(5)
    expect(UNITS['unit.powerful-imp']!.attacks).toContain(BLAST)
    expect(rider('unit.powerful-imp', BLAST).map((t) => [t.id, t.chance, t.effect])).toEqual([['trigger.powerful-imp.burn', 100, { kind: 'status.apply', statusId: 'status.burn', value: 2 }]])
  })
})

describe('in a small fight: the Blast\'s damage is the Imp\'s Precision, 3; the Claw\'s is its Strength, 3', () => {
  const rig = (replicate = 1, hexes = [hexId(7, 5), hexId(5, 5)]) => {
    const ctx = createCustomBattle([{ type: HERO, hex: hexes[0]! }], [{ type: IMP, hex: hexes[1]! }], { replicate })
    return { ctx, hero: ctx.state.units.find((u) => u.side === 'hero')!, imp: ctx.state.units.find((u) => u.typeId === IMP)! }
  }

  it('the preview\'s source row is 3 for the Blast (was 4) and 3 for the Claw', () => {
    const { ctx, hero, imp } = rig()
    const stat = (attackId: string) => preview(ctx, imp.id, hero.id, attackId).packetsOnHit[0]!.ledger.find((r) => r.name === 'SOURCE_STAT')!
    expect(stat(BLAST).delta).toBe(3)
    expect(preview(ctx, imp.id, hero.id, BLAST).packetsOnHit[0]!.raw).toBe(UNITS[IMP]!.precision)
    const near = rig(1, [hexId(6, 5), hexId(5, 5)])
    expect(preview(near.ctx, near.imp.id, near.hero.id, CLAW).packetsOnHit[0]!.raw).toBe(UNITS[IMP]!.strength)
  })

  it('over three hundred seeded Blasts the Burn lands on about half of the hits — never none, never all — and each firing is Burn 2', () => {
    let hits = 0, fired = 0
    for (let r = 0; r < 300; r++) {
      const { ctx, hero, imp } = rig(r)
      beginActivation(ctx, imp.id, 'test')
      performAttack(ctx, imp.id, hero.id, BLAST)
      const rolled = ctx.events.filter((e) => e.type === 'trigger.rolled' && e.causeId === BURN)
      const hit = ctx.events.some((e) => e.type === 'attack.hit' || (e.type === 'damage.applied' && e.causeId === BLAST))
      const applied = ctx.events.filter((e) => e.type === 'status.applied' && e.causeId === BURN)
      if (!rolled.length) { expect(applied, `seed ${r}: no roll, no Burn`).toEqual([]); continue }
      // one roll per hit, at the row's chance; a failed roll still logs
      expect(rolled.map((e) => [e['hook'], e['chance']]), `seed ${r}`).toEqual([['onHit', 50]])
      expect(hit, `seed ${r}: the rider rolls only on a hit`).toBe(true)
      hits++
      if (rolled[0]!['fired']) {
        fired++
        expect(applied.map((e) => [e.target, e['statusId'], e['amount']]), `seed ${r}`).toEqual([[hero.id, 'status.burn', 2]])
      } else expect(applied, `seed ${r}: the roll failed, nothing applied`).toEqual([])
    }
    expect(hits, 'most of three hundred Blasts hit').toBeGreaterThan(150)
    expect(fired).toBeGreaterThan(0)
    expect(fired).toBeLessThan(hits)
    // 50% of the hits, within ten points either way
    expect(fired * 100).toBeGreaterThanOrEqual(hits * 40)
    expect(fired * 100).toBeLessThanOrEqual(hits * 60)
  })
})

describe('in encounter.opening.bridge: the Imps\' Blasts burn about half the time; the Fire Imps\' burn every time', () => {
  it('over twenty seeds', () => {
    let impRolls = 0, impFired = 0, fireRolls = 0, fireFired = 0, blastDamage = 0
    for (let r = 0; r < 20; r++) {   // about 250 Imp Blast hits
      const ctx = openingBattle('test.opening-bridge', r)
      const imps = new Set(ctx.state.units.filter((u) => u.typeId === IMP).map((u) => u.id))
      for (const e of ctx.events) {
        if (e.type === 'trigger.rolled' && e.causeId === BURN) { expect(e['chance']).toBe(50); impRolls++; if (e['fired']) impFired++ }
        if (e.type === 'trigger.rolled' && e.causeId === 'trigger.fire-imp.burn' && e['hook'] === 'onHit') { expect(e['chance']).toBe(100); fireRolls++; if (e['fired']) fireFired++ }
        if (e.type === 'attack.declared' && e.causeId === BLAST && imps.has(e.actor!)) blastDamage++
      }
      // an Imp's Blast never reads more than Precision 3 at its source
      for (const u of ctx.state.units) if (u.typeId === IMP) expect(u.precision).toBe(3)
    }
    expect(blastDamage, 'Imps blasted').toBeGreaterThan(0)
    expect(impRolls, 'Imp Blasts hit').toBeGreaterThan(40)
    expect(impFired).toBeGreaterThan(0)
    expect(impFired).toBeLessThan(impRolls)
    expect(impFired * 100).toBeGreaterThanOrEqual(impRolls * 35)
    expect(impFired * 100).toBeLessThanOrEqual(impRolls * 65)
    expect(fireRolls, 'Fire Imp Blasts hit').toBeGreaterThan(0)
    expect(fireFired, 'the Fire Imp\'s Blast still applies Burn 3 on every hit').toBe(fireRolls)
  }, 120000)   // twenty battles of the Bridge run past vitest's 5 s on a busy machine
})
