// fix.civilians-field-kit (2026-10-03). Ruled, Andrew (DECISIONS.md 2026-10-03 'every civilian fields its kit by default
// when an encounter places it'): "Yes, all of the civilians, by default, should field their kit the first time they're
// loaded. So all of them should get it." and, the same chat, "If enemies have weapons assigned, they need them also when
// they come into play."
//
// The one rule: every unit an encounter places — a setup unit or a scheduled arrival, civilian or enemy — fields the kit
// its row carries, through the one assembler (src/core/setup.ts fieldArrival → assemble; the kit a preview reads,
// fieldedDef). Until this item only the two rows flagged placedWithKit (the Orphan Child, the School Teacher;
// fix.orphans-teacher-knife-refiled) did, and every other placed civilian fought with Punch (SWITCHES.md arrivalKit: 19
// placements across prologue-1..3, supper, opening.orphanage, opening.lumberjack). The flag is retired (SWITCHES.md
// placedKitIsTheRule). A row that carries no kit — every bestiary row today — is fielded authored whole, as before.
import { describe, expect, it } from 'vitest'
import { createBattle, fieldedDef } from '../src/core/setup.js'
import { runBattle } from '../src/core/battle.js'
import { ACTIONS, ENCOUNTERS, UNITS, ITEMS } from '../src/content/index.js'
import { SCENARIOS, scenarioDef, scenarioOptions } from '../src/content/scenarios.js'
import type { Ctx, EncounterDef, UnitDef } from '../src/core/types.js'
import { openingBattle } from './opening-helpers.js'

const LUMBERJACK = 'hero.fixed.lumberjack-and-wife', WIFE = 'hero.fixed.lumberjacks-wife'
const CHOP = 'attack.lumberjack-axe.chop', CLEAVE = 'attack.lumberjack-axe.cleave', STAB = 'attack.dagger.stab', PUNCH = 'attack.punch'
/** the encounters that place a civilian today (SWITCHES.md arrivalKit's six) */
const CIVILIAN_ENCOUNTERS = ['encounter.prologue-1', 'encounter.prologue-2', 'encounter.prologue-3', 'encounter.supper', 'encounter.opening.orphanage', 'encounter.opening.lumberjack']

const placed = (ctx: Ctx, typeId: string) => ctx.state.units.filter((u) => u.typeId === typeId)
const equipped = (ctx: Ctx, id: number) => ctx.events.filter((e) => e.type === 'unit.equipped' && e['actor'] === id).map((e) => e['itemId'])
/**
 * A unit's blows, each with the slot that paid for it: 'primary' on its own Activation, 'reaction' for an attack of
 * opportunity (the action.spent line just before the attack.declared says which).
 */
function swung(ctx: Ctx, id: number): { attack: string; slot: string }[] {
  return ctx.events.flatMap((e, i) => {
    if (e.type !== 'attack.declared' || e['actor'] !== id) return []
    const paid = ctx.events.slice(Math.max(0, i - 4), i).reverse().find((p) => p.type === 'action.spent' && p['actor'] === id && p['actionId'] === e['attackId'])
    return [{ attack: String(e['attackId']), slot: String(paid?.['slot'] ?? 'unknown') }]
  })
}
const attacksOf = (u: { actions: readonly string[] }) => u.actions.filter((a) => a.startsWith('attack.'))
/** the placements of an encounter, setup and schedule, by unit type */
const placementsOf = (enc: EncounterDef) => [...new Set([...enc.setup.map((p) => p.unit), ...enc.schedule.flatMap((r) => r.spawn.map((p) => p.unit))])]

/** An encounter fielded as its own scenario fields it (the opening battles, the showcases), or on the Surrounded showcase's party and board. */
function fielded(encounterId: string): Ctx {
  const own = Object.values(SCENARIOS).find((s) => s.encounterId === encounterId)
  const opts = own ? scenarioOptions(own) : { ...scenarioOptions(scenarioDef('showcase.surrounded')), encounter: ENCOUNTERS[encounterId]! }
  // every scheduled arrival is seen: the board clearing early does not end the battle before the schedule is spent
  return createBattle({ ...opts, cfg: { switches: { boardClearWaitsForSchedule: true } } } as Parameters<typeof createBattle>[0])
}

describe('fix.civilians-field-kit', () => {
  // "never Punch" is held on the unit's own Activation — the attack it CHOOSES. An attack of opportunity is not chosen
  // here: by its own ruling (DECISIONS.md 2026-08-20 'The attack of opportunity, final form'; movement.ts aooChoice) it is
  // the holder's cheapest legal melee attack, and Chop costs 1 Stamina where Punch costs none — so the Lumberjack's
  // reaction is still a Punch, and his wife's (the Dagger's stab is free) is a stab. Reported; SWITCHES.md placedKitAoo.
  it('in encounter.opening.lumberjack the Lumberjack attacks with his axe (Chop or Cleave) and his wife with her dagger — never Punch', () => {
    expect(UNITS[LUMBERJACK]!.defaultItems).toEqual(['item.lumberjack-axe'])
    expect(UNITS[WIFE]!.defaultItems).toEqual(['item.dagger', 'item.basic-armor'])
    let axe = 0, stabs = 0, aooPunches = 0
    for (const replicate of [0, 1, 2, 3, 4, 5, 6, 7]) {
      const ctx = openingBattle('test.opening-lumberjack', replicate)
      const jack = placed(ctx, LUMBERJACK), wife = placed(ctx, WIFE)
      expect(jack.length, `replicate ${replicate}: the Lumberjack is placed`).toBe(1)
      expect(wife.length, `replicate ${replicate}: his wife is placed`).toBe(1)
      expect(equipped(ctx, jack[0]!.id), `replicate ${replicate}: the Lumberjack fields his axe`).toEqual(['item.lumberjack-axe'])
      expect(equipped(ctx, wife[0]!.id), `replicate ${replicate}: his wife fields her dagger and her armor`).toEqual(['item.dagger', 'item.basic-armor'])
      expect(jack[0]!.actions, `replicate ${replicate}: the Lumberjack carries Chop and Cleave`).toEqual(expect.arrayContaining([CHOP, CLEAVE]))
      expect(wife[0]!.actions, `replicate ${replicate}: his wife carries the stab`).toContain(STAB)
      // the armor is worn: the log says what it put on her (the battle then moves Health, so the line is read, not the unit)
      const armor = ctx.events.find((e) => e.type === 'unit.equipped' && e['actor'] === wife[0]!.id && e['itemId'] === 'item.basic-armor')
      expect(armor?.['mods'], `replicate ${replicate}: the Basic Armor is on her`).toEqual(ITEMS['item.basic-armor']!.statModifiers)
      expect(fieldedDef(WIFE).maxHp, 'her Health as fielded is her row\'s plus the armor\'s').toBe(UNITS[WIFE]!.maxHp + (ITEMS['item.basic-armor']!.statModifiers['maxHp'] ?? 0))
      const jackBlows = swung(ctx, jack[0]!.id), wifeBlows = swung(ctx, wife[0]!.id)
      for (const b of [...jackBlows, ...wifeBlows]) expect(['primary', 'reaction'], `replicate ${replicate}: ${b.attack} is paid by a slot the log names`).toContain(b.slot)
      const chosen = jackBlows.filter((b) => b.slot === 'primary').map((b) => b.attack)
      expect(chosen.filter((a) => a !== CHOP && a !== CLEAVE), `replicate ${replicate}: on his Activation the Lumberjack swings only his axe`).toEqual([])
      expect(wifeBlows.map((b) => b.attack).filter((a) => a !== STAB), `replicate ${replicate}: his wife strikes only with her dagger`).toEqual([])
      expect([...chosen, ...wifeBlows.map((b) => b.attack)], `replicate ${replicate}: never Punch`).not.toContain(PUNCH)
      // his attack of opportunity is the cheapest legal melee — Punch, while the axe's blows cost Stamina
      const reactions = jackBlows.filter((b) => b.slot === 'reaction').map((b) => b.attack)
      expect(reactions.filter((a) => a !== PUNCH && a !== CHOP && a !== CLEAVE), `replicate ${replicate}: his reactions are his own attacks`).toEqual([])
      axe += chosen.length; stabs += wifeBlows.length; aooPunches += reactions.filter((a) => a === PUNCH).length
    }
    expect(axe, 'the axe is used').toBeGreaterThan(0)
    expect(stabs, 'the dagger is used').toBeGreaterThan(0)
    // the reason a reaction is a Punch: the attack of opportunity takes the cheapest, and the axe is not free
    expect(ACTIONS[PUNCH]!.staminaCost).toBe(0)
    expect(ACTIONS[CHOP]!.staminaCost).toBeGreaterThan(0)
    expect(ACTIONS[STAB]!.staminaCost).toBe(0)
    expect(aooPunches, "the Lumberjack's attacks of opportunity over these battles are Punches").toBeGreaterThan(0)
  })

  it('every civilian placed by prologue-1..3, the Supper, the Orphanage and the Lumberjack House fields its Codex kit, as a preview of the row reads it', () => {
    let civilians = 0
    const types = new Set<string>()
    for (const id of CIVILIAN_ENCOUNTERS) {
      const enc = ENCOUNTERS[id]
      expect(enc, id).toBeDefined()
      // read as fielded, before a blow lands (every civilian is a setup unit; the battle then moves Health)
      const ctx = fielded(id)
      for (const typeId of placementsOf(enc!)) {
        const row = UNITS[typeId]!
        if (row.side !== 'hero') continue
        expect(enc!.setup.some((p) => p.unit === typeId), `${id}: ${typeId} is a setup unit`).toBe(true)
        const kit = row.defaultItems ?? []
        expect(kit.length, `${id}: ${typeId} carries a kit (every civilian has a weapon, ruled 2026-09-05)`).toBeGreaterThan(0)
        const units = placed(ctx, typeId)
        expect(units.length, `${id}: ${typeId} is placed`).toBeGreaterThan(0)
        for (const u of units) {
          civilians++; types.add(typeId)
          expect(equipped(ctx, u.id), `${id}: ${typeId} fields its Codex kit`).toEqual(kit)
          // what it fights with is what fielding the row with its kit gives — the one assembler
          expect(attacksOf(u), `${id}: ${typeId}'s attacks are its kit's, then Punch`).toEqual(fieldedDef(typeId).attacks)
          expect(attacksOf(u).length, `${id}: ${typeId} has more than Punch`).toBeGreaterThan(1)
          expect(u.maxHp, `${id}: ${typeId}'s Health is the fielded row's`).toBe(fieldedDef(typeId).maxHp)
        }
      }
    }
    // SWITCHES.md arrivalKit counted 19 placements; they are 19 units of 15 rows
    expect(civilians).toBe(19)
    expect([...types].sort()).toEqual(['hero.fixed.blacksmith', 'hero.fixed.cook', 'hero.fixed.farmer', 'hero.fixed.farming-family', 'hero.fixed.fisherman', 'hero.fixed.fishermans-wife', 'hero.fixed.group-of-farmers',
      'hero.fixed.librarian', LUMBERJACK, WIFE, 'hero.fixed.old-wise-man', 'hero.fixed.orphans', 'hero.fixed.scary-kid', 'hero.fixed.school-children', 'hero.fixed.school-teacher'].sort())
  })

  it('what each kit is: the school children throw rocks, the farmer jabs with the pitchfork, the Supper\'s villagers stab with the dagger', () => {
    const supper = fielded('encounter.supper'), school = fielded('encounter.prologue-3'), surrounded = fielded('encounter.prologue-2')
    expect(attacksOf(placed(school, 'hero.fixed.school-children')[0]!)).toEqual(['attack.pile-of-rocks.throw', PUNCH])
    expect(attacksOf(placed(surrounded, 'hero.fixed.farmer')[0]!)).toEqual(['attack.pitchfork.jab', PUNCH])
    expect(attacksOf(placed(surrounded, LUMBERJACK)[0]!)).toEqual([CHOP, CLEAVE, PUNCH])
    for (const villager of ['hero.fixed.librarian', 'hero.fixed.cook', 'hero.fixed.fishermans-wife', 'hero.fixed.fisherman', 'hero.fixed.old-wise-man', 'hero.fixed.blacksmith'])
      expect(attacksOf(placed(supper, villager)[0]!), villager).toEqual([STAB, PUNCH])
  })

  it('a fixture enemy row that carries a kit fields it when an encounter places it — as a setup unit and as a scheduled arrival', () => {
    // a bestiary row given a weapon: the Zombie's own row, plus a kit. No bestiary row carries one today.
    const zombie = UNITS['unit.zombie']!
    const RAIDER: UnitDef = { ...zombie, typeId: 'unit.fixture-armed-zombie', name: 'Armed Zombie (fixture)', defaultItems: ['item.dagger'] }
    const base = ENCOUNTERS['encounter.prologue-1']!
    const enc: EncounterDef = { ...base, id: 'encounter.fixture-armed',
      setup: [{ unit: RAIDER.typeId, at: { col: 8, row: 3 } }, { unit: 'unit.zombie', at: { col: 8, row: 5 } }],
      schedule: [{ phase: 2, spawn: [{ unit: RAIDER.typeId, at: { col: 9, row: 4 } }] }] }
    const registry = UNITS as Record<string, UnitDef>
    registry[RAIDER.typeId] = RAIDER
    try {
      const ctx = createBattle({ ...scenarioOptions(scenarioDef('showcase.two-zombies-and-a-child')), encounter: enc, cfg: { switches: { boardClearWaitsForSchedule: true } } } as Parameters<typeof createBattle>[0])
      runBattle(ctx)
      const raiders = placed(ctx, RAIDER.typeId)
      expect(raiders.length, 'one placed at setup, one arrived on Turn 2').toBe(2)
      const entered = raiders.map((u) => ctx.events.find((e) => e.type === 'unit.enter' && e['actor'] === u.id)!.turn)
      expect(entered.some((t) => t === 0) && entered.some((t) => t > 0), `a setup unit and a scheduled arrival (entered on Turns ${entered.join(', ')})`).toBe(true)
      for (const u of raiders) {
        expect(u.side, 'an enemy').toBe('enemy')
        expect(equipped(ctx, u.id), 'the armed enemy fields its kit').toEqual(['item.dagger'])
        expect(attacksOf(u), 'its kit\'s attack, then its own').toEqual([STAB, ...zombie.attacks])
      }
      // … and the plain Zombie beside it, whose row carries none, is fielded as authored
      const plain = placed(ctx, 'unit.zombie')[0]!
      expect(equipped(ctx, plain.id)).toEqual([])
      expect(attacksOf(plain)).toEqual(zombie.attacks)
    } finally { delete registry[RAIDER.typeId] }
  })

  it('every enemy in the bestiary today is unchanged: no enemy row carries a kit, and a placed one is fielded as its row', () => {
    const armed = Object.values(UNITS).filter((u) => u.side === 'enemy' && (u.defaultItems?.length ?? 0) > 0).map((u) => u.typeId)
    expect(armed, 'no enemy row carries a kit today').toEqual([])
    for (const id of CIVILIAN_ENCOUNTERS) {
      const ctx = fielded(id)
      runBattle(ctx)
      for (const u of ctx.state.units.filter((x) => UNITS[x.typeId]?.side === 'enemy')) {
        expect(equipped(ctx, u.id), `${id}: ${u.typeId} carries nothing`).toEqual([])
        expect(attacksOf(u), `${id}: ${u.typeId} fights with its row's attacks`).toEqual(UNITS[u.typeId]!.attacks.filter((a) => a.startsWith('attack.')))
      }
    }
  })

  it('the opt-in flag is retired: no row says placedWithKit, and nothing in the core reads it', () => {
    for (const u of Object.values(UNITS)) expect('placedWithKit' in u, `${u.typeId} carries no placedWithKit`).toBe(false)
  })
})
