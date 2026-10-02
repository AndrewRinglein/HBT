// fix.orphans-teacher-knife-refiled (2026-10-02; re-files fix.orphans-teacher-knife, SWITCHES.md orphansKnifeRefiled). Ruled, Andrew (DECISIONS.md 2026-10-02 'the Net is a trinket with no hands;
// the orphans and the school teacher start with a knife'): "The Orphanage, Orphanage, and the school teacher should start
// with a knife each." / "Dagger is fine." The knife is item.dagger. The orphans' kit becomes the Dagger (the pile of
// rocks goes), and the orphans and the school teacher field their kit wherever an encounter places them — through the
// one assembler, flagged by the Codex row (placedWithKit, gen/civilian-rulings.json). Every other placed civilian is
// fielded authored whole, with Punch (SWITCHES.md arrivalKit).
import { describe, expect, it } from 'vitest'
import { createBattle, fieldedDef } from '../src/core/setup.js'
import { runBattle } from '../src/core/battle.js'
import { ENCOUNTERS, UNITS } from '../src/content/index.js'
import { scenarioDef, scenarioOptions } from '../src/content/scenarios.js'
import type { Ctx } from '../src/core/types.js'
import { openingBattle } from './opening-helpers.js'

const ORPHAN = 'hero.fixed.orphans', TEACHER = 'hero.fixed.school-teacher', CHILD = 'hero.fixed.school-children'
const KNIFE = 'item.dagger', STAB = 'attack.dagger.stab', PUNCH = 'attack.punch'

const placed = (ctx: Ctx, typeId: string) => ctx.state.units.filter((u) => u.typeId === typeId)
const equipped = (ctx: Ctx, id: number) => ctx.events.filter((e) => e.type === 'unit.equipped' && e['actor'] === id).map((e) => e['itemId'])
const swung = (ctx: Ctx, id: number) => ctx.events.filter((e) => e.type === 'attack.declared' && e['actor'] === id).map((e) => String(e['attackId']))

describe('fix.orphans-teacher-knife-refiled', () => {
  it('the Orphan Child\'s kit is the Dagger, and the teacher\'s already was', () => {
    expect(UNITS[ORPHAN]!.defaultItems).toEqual([KNIFE])
    expect(UNITS[TEACHER]!.defaultItems).toEqual([KNIFE])
    expect(fieldedDef(ORPHAN).attacks).toContain(STAB)
    expect(fieldedDef(ORPHAN).attacks).not.toContain('attack.pile-of-rocks.throw')
  })

  it('in encounter.opening.orphanage every orphan and the school teacher field the Dagger and stab with it, not Punch', () => {
    expect(ENCOUNTERS['encounter.opening.orphanage']).toBeDefined()
    let stabs = 0
    for (const replicate of [0, 1, 2, 3, 4, 5]) {
      const ctx = openingBattle('test.opening-orphanage', replicate)
      const civilians = [...placed(ctx, ORPHAN), ...placed(ctx, TEACHER)]
      expect(placed(ctx, ORPHAN).length, `replicate ${replicate}: an orphan is placed`).toBeGreaterThan(0)
      expect(placed(ctx, TEACHER).length, `replicate ${replicate}: the teacher is placed`).toBeGreaterThan(0)
      for (const u of civilians) {
        expect(equipped(ctx, u.id), `replicate ${replicate}: ${u.typeId} fields the knife`).toEqual([KNIFE])
        expect(u.actions, `replicate ${replicate}: ${u.typeId} carries the stab`).toContain(STAB)
        const blows = swung(ctx, u.id)
        expect(blows.filter((a) => a === PUNCH), `replicate ${replicate}: ${u.typeId} never punches — it has a knife`).toEqual([])
        stabs += blows.filter((a) => a === STAB).length
      }
    }
    expect(stabs, 'the knives are used').toBeGreaterThan(0)
  })

  it('a school child placed by an encounter still fights with Punch (arrivalKit stands for every other civilian)', () => {
    const ctx = createBattle({ ...scenarioOptions(scenarioDef('showcase.surrounded')), encounter: ENCOUNTERS['encounter.prologue-3']! })
    const child = placed(ctx, CHILD)[0]!
    expect(child, 'the school children are placed').toBeDefined()
    expect(equipped(ctx, child.id), 'the child is fielded authored whole').toEqual([])
    expect(child.actions.filter((a) => a.startsWith('attack.'))).toEqual([PUNCH])
    // and the teacher placed beside them in the Schoolhouse carries her knife there too
    const teacher = placed(ctx, TEACHER)[0]!
    expect(equipped(ctx, teacher.id)).toEqual([KNIFE])
    runBattle(ctx)
    expect(swung(ctx, child.id).every((a) => a === PUNCH), 'the child only punches').toBe(true)
  })
})
