// fix.trigger-ids-and-scopes (2026-10-04) — found by the engine and viewer workers' reports:
//   (1) the Fire Imp's two triggers — its end-of-Activation burn over every other unit within 2 hexes, and its
//       Blast's on-hit Burn 3 — shared one id, trigger.fire-imp.burn, so the log, the kill switch and the viewer
//       could not tell them apart. Ten rows of the bestiary, one item and three test units held two triggers
//       under one id.
//   (2) the War Axe's on-block triggers were unscoped, so they also rode a Punch made by the axe's holder.
// Both are content's (the pipeline, content/mkenginepack.mjs); no engine code changed.
//
// The rule (SWITCHES.md triggerIdsDistinctInARow): within one row no two triggers share an id. An id is
// trigger.<row>.<name> as before; where two of a row would share it, the one scoped to an attack is named for that
// attack (trigger.fire-imp.burn.blast — as a move's riders already were), then those still sharing take the hook
// they fire on, then what they do; if that cannot tell them apart the pack build fails. An id is still shared BETWEEN rows where one row is a
// copy of another (a derived or enchanted item and its base; a test unit and the unit it is a delta over) — the
// engine's identity for a trigger is its id and its source.
// The scope (SWITCHES.md itemTriggerOwnAttacks): a weapon row's trigger may say `attack: 'own'` — it fires only with
// the attacks that weapon grants (one compiled trigger per attack, each `onlyWithAttack`). The three axes say so
// for "axes cut through shields" (V2-SHIELDS-AND-WEAPONS-2026-09-20.md: "If an axe attacks something with a shield
// and block is triggered"), and six more weapons whose words are their own strikes.
import { describe, expect, it } from 'vitest'
import { createCustomBattle } from '../src/core/setup.js'
import { performAttack } from '../src/core/pipeline.js'
import { beginActivation } from '../src/core/mutate.js'
import { effective } from '../src/core/stats.js'
import { ATTACKER_HOOKS } from '../src/core/trigger.js'
import { ACTIONS, BADGES, ITEMS, UNITS } from '../src/content/index.js'
import { UNIT_PACK } from '../src/content/generated/pack.js'
import { openingBattle } from './opening-helpers.js'

type Trig = { id: string; hook: string; source?: string; onlyWithAttack?: string; role?: string; chance?: number; effect: { kind: string; statusId?: string; stat?: string; value?: unknown } }
const FIRE_IMP = 'unit.fire-imp'
const EOA_BURN = 'trigger.fire-imp.burn'
const BLAST_BURN = 'trigger.fire-imp.burn.blast'
const BLAST = 'attack.fire-imp.blast'

/** Every `triggers` list in a tree of rows, with the path to the row that holds it. */
function triggerLists(node: unknown, path: string, out: { path: string; triggers: Trig[] }[] = []): { path: string; triggers: Trig[] }[] {
  if (Array.isArray(node)) { node.forEach((x, i) => triggerLists(x, `${path}[${(x as { typeId?: string; id?: string })?.typeId ?? (x as { id?: string })?.id ?? i}]`, out)); return out }
  if (!node || typeof node !== 'object') return out
  for (const [k, v] of Object.entries(node)) {
    if (k === 'triggers' && Array.isArray(v)) out.push({ path, triggers: v as Trig[] })
    else triggerLists(v, `${path}.${k}`, out)
  }
  return out
}
const shared = (triggers: readonly Trig[]) => { const seen = new Set<string>(), twice = new Set<string>(); for (const t of triggers) (seen.has(t.id) ? twice : seen).add(t.id); return [...twice] }

describe('no row holds two triggers under one id', () => {
  it('over the whole generated pack: every row that carries triggers — units, test units, items, enchanted and derived items, badges', () => {
    const lists = triggerLists(UNIT_PACK, 'pack')
    expect(lists.length).toBeGreaterThan(200)
    expect(lists.reduce((n, l) => n + l.triggers.length, 0)).toBeGreaterThan(450)
    const bad = lists.map((l) => ({ row: l.path, ids: shared(l.triggers) })).filter((x) => x.ids.length)
    expect(bad).toEqual([])
  })

  it('and over the registries a battle is fielded from', () => {
    for (const [name, reg] of Object.entries({ UNITS, ITEMS, BADGES })) {
      for (const row of Object.values(reg as Record<string, { id?: string; typeId?: string; triggers?: readonly Trig[] }>)) {
        expect(shared(row.triggers ?? []), `${name} ${row.typeId ?? row.id}`).toEqual([])
      }
    }
  })

  it('the rows that held two under one id, by name — each trigger now its own', () => {
    const ids = (unit: string) => (UNITS[unit]!.triggers as readonly Trig[]).map((t) => t.id).sort()
    expect(ids(FIRE_IMP)).toEqual([EOA_BURN, BLAST_BURN])
    expect(ids('unit.poison-imp')).toEqual(['trigger.poison-imp.poison', 'trigger.poison-imp.poison.blast'])
    expect(ids('unit.imp-master')).toEqual(expect.arrayContaining(['trigger.imp-master.burn.fire-bow', 'trigger.imp-master.burn.fire-sword']))
    expect(ids('unit.hellhound')).toEqual(expect.arrayContaining(['trigger.hellhound.burn', 'trigger.hellhound.burn.bite']))
    expect(ids('unit.terror-imp')).toEqual(expect.arrayContaining(['trigger.terror-imp.weak', 'trigger.terror-imp.weak.fear']))
    expect(ids('unit.skeleton-spider')).toEqual(expect.arrayContaining(['trigger.skeleton-spider.armor-armor', 'trigger.skeleton-spider.armor-armor.bone-slash']))
    // the same name on three hooks, none of them an attack's: each takes its hook
    expect(ids('unit.demon-hound').filter((id) => /regeneration/.test(id))).toEqual([
      'trigger.demon-hound.regeneration.on-activation-end', 'trigger.demon-hound.regeneration.on-taking-damage', 'trigger.demon-hound.regeneration.start-of-battle'])
    expect(ids('unit.doombringer').filter((id) => /protection/.test(id))).toEqual(['trigger.doombringer.protection.on-activation-end', 'trigger.doombringer.protection.on-taking-damage'])
    expect((ITEMS['item.troll-gut-vest']!.triggers as readonly Trig[]).map((t) => t.id).sort()).toEqual(['trigger.troll-gut-vest.regeneration.on-taking-damage', 'trigger.troll-gut-vest.regeneration.start-of-battle'])
    // one named trigger doing two things on one hit: each takes what it does (its Vision loss already carried the stat: …dragged-under-vision)
    const dragged = (UNITS['unit.shadow-sorcerer']!.triggers as readonly Trig[]).filter((t) => t.id.startsWith('trigger.shadow-sorcerer.dragged-under.'))
    expect(dragged.map((t) => [t.id, t.effect.kind]).sort()).toEqual([
      ['trigger.shadow-sorcerer.dragged-under.paint-darkness', 'layer.paint'], ['trigger.shadow-sorcerer.dragged-under.root', 'status.apply']])
  })

  it('a test unit that is a delta over another holds its base\'s triggers once, not twice', () => {
    const base = (UNITS['test-oathblade']!.triggers as readonly Trig[]).map((t) => t.id)
    expect(base.length).toBeGreaterThan(0)
    for (const id of ['test-slot-striker', 'test-packet-flame', 'test-packet-shadow']) {
      expect((UNITS[id]!.triggers as readonly Trig[]).map((t) => t.id), id).toEqual(base)
    }
  })
})

describe('the Fire Imp: its end-of-Activation burn and its Blast\'s burn are two triggers the log tells apart', () => {
  it('the row: trigger.fire-imp.burn is the area burn at the end of its Activation; trigger.fire-imp.burn.blast is the Blast\'s Burn 3 on a hit', () => {
    const [eoa, blast] = [EOA_BURN, BLAST_BURN].map((id) => (UNITS[FIRE_IMP]!.triggers as readonly Trig[]).find((t) => t.id === id)!)
    expect(eoa).toMatchObject({ hook: 'onActivationEnd', chance: 100, effect: { kind: 'status.apply', statusId: 'status.burn', value: 1 }, source: FIRE_IMP })
    expect(eoa!.onlyWithAttack).toBeUndefined()
    expect(blast).toMatchObject({ hook: 'onHit', chance: 100, onlyWithAttack: BLAST, effect: { kind: 'status.apply', statusId: 'status.burn', value: 3 }, source: FIRE_IMP })
  })

  it('in the Bridge\'s battles the log names each by its own id, on its own hook, every time', () => {
    const hooks: Record<string, Set<string>> = { [EOA_BURN]: new Set(), [BLAST_BURN]: new Set() }
    let fired = 0
    for (let r = 0; r < 6; r++) {
      const ctx = openingBattle('test.opening-bridge', r)
      expect(ctx.state.units.some((u) => u.typeId === FIRE_IMP), 'a Fire Imp fights at the Bridge').toBe(true)
      for (const e of ctx.events) {
        if (e.type === 'trigger.rolled' && (e.causeId === EOA_BURN || e.causeId === BLAST_BURN)) hooks[e.causeId]!.add(String(e['hook']))
        if (e.type === 'trigger.fired' && e.causeId === BLAST_BURN) fired++
      }
    }
    expect([...hooks[EOA_BURN]!]).toEqual(['onActivationEnd'])
    expect([...hooks[BLAST_BURN]!]).toEqual(['onHit'])
    expect(fired, 'a Blast burned somebody').toBeGreaterThan(0)
  })
})

describe('the War Axe: its on-block triggers ride the axe\'s own attacks and not a Punch', () => {
  const CHOP = 'attack.war-axe.chop', HACK = 'attack.war-axe.hack', PUNCH = 'attack.punch'
  /** The Iron Vanguard — a War Axe in hand — beside a zombie that is certain to block, with Block and Ranged Block to lose. */
  function rig() {
    const ctx = createCustomBattle([{ type: 'hero.base.warrior-iron', hex: 85 }], [{ type: 'test-zombie', hex: 86 }], { strict: true })
    const at = ctx.state.units[0]!, tg = ctx.state.units[1]!
    tg.triggers = []; tg.hp = tg.maxHp = 100
    tg.mods.push({ stat: 'block', op: 'add', value: 100, source: 'test.certain', scope: 'unit' }, { stat: 'rangedBlock', op: 'add', value: 30, source: 'test', scope: 'unit' })
    at.stamina = at.maxStamina
    return { ctx, at, tg }
  }
  const stripped = (ctx: ReturnType<typeof rig>['ctx']) => ctx.events.filter((e) => e.type === 'statmod.added' && /^trigger\.war-axe\./.test(String(e.causeId))).map((e) => e.causeId)
  const rolled = (ctx: ReturnType<typeof rig>['ctx']) => ctx.events.filter((e) => e.type === 'trigger.rolled' && e['hook'] === 'onBlock' && /war-axe/.test(String(e.causeId))).map((e) => e.causeId)

  it('the row: each of the axe\'s two attacks carries its own pair, scoped to it; the holder\'s kit has a Punch that carries none', () => {
    const onBlock = (ITEMS['item.war-axe']!.triggers as readonly Trig[]).filter((t) => t.hook === 'onBlock')
    expect(onBlock.map((t) => [t.id, t.onlyWithAttack, t.role, t.effect.stat, t.effect.value]).sort()).toEqual([
      ['trigger.war-axe.on-block.block.chop', CHOP, 'attacker', 'block', -20],
      ['trigger.war-axe.on-block.block.hack', HACK, 'attacker', 'block', -20],
      ['trigger.war-axe.on-block.ranged-block.chop', CHOP, 'attacker', 'rangedBlock', -20],
      ['trigger.war-axe.on-block.ranged-block.hack', HACK, 'attacker', 'rangedBlock', -20],
    ])
    const { at } = rig()
    expect(at.actions).toEqual(expect.arrayContaining([CHOP, HACK, PUNCH]))
    expect(ACTIONS[PUNCH]).toBeDefined()
  })

  it('a blocked Punch strips nothing: no axe trigger is rolled, and the blocker\'s Block and Ranged Block stand', () => {
    const { ctx, tg } = rig()
    beginActivation(ctx, 0, 'test')
    expect(performAttack(ctx, 0, 1, PUNCH).blocked).toBe(true)
    expect(rolled(ctx)).toEqual([])
    expect(stripped(ctx)).toEqual([])
    expect(effective(ctx, tg, 'block').value).toBe(100)
    expect(effective(ctx, tg, 'rangedBlock').value).toBe(30)
  })

  it.each([[CHOP, 'chop'], [HACK, 'hack']] as const)('a blocked %s strips 20 Block and 20 Ranged Block, by that attack\'s own two triggers', (attack, word) => {
    const { ctx, tg } = rig()
    beginActivation(ctx, 0, 'test')
    expect(performAttack(ctx, 0, 1, attack).blocked).toBe(true)
    expect(stripped(ctx).sort()).toEqual([`trigger.war-axe.on-block.block.${word}`, `trigger.war-axe.on-block.ranged-block.${word}`])
    expect(rolled(ctx).sort()).toEqual([`trigger.war-axe.on-block.block.${word}`, `trigger.war-axe.on-block.ranged-block.${word}`])
    expect(effective(ctx, tg, 'block').value).toBe(100 - 20)
    expect(effective(ctx, tg, 'rangedBlock').value).toBe(30 - 20)
  })
})

describe('every item whose attack-hook trigger is its own strikes is scoped; what is left unscoped is named', () => {
  const attackerHook = (t: Trig) => (ATTACKER_HOOKS as readonly string[]).includes(t.hook) && (t.hook !== 'onBlock' || t.role === 'attacker')
  const rows = Object.values(ITEMS) as unknown as { id: string; itemClass: string; grants: string[]; enchant?: string; base?: string; triggers: readonly Trig[] }[]
  /** The weapon rows that say `attack: 'own'`, with the hook and effect each one's row-level trigger has. */
  const OWN: [string, string, string][] = [
    ['item.war-axe', 'onBlock', 'statMod'], ['item.bloody-axe', 'onBlock', 'statMod'], ['item.lumberjack-axe', 'onBlock', 'statMod'],
    ['item.bloody-axe', 'onDamage', 'status.bleed'], ['item.poison-throwing-knives', 'onDamage', 'status.poison'],
    ['item.twin-talon-bow', 'onDamage', 'status.bleed'], ['item.boarding-hook', 'onDamage', 'status.bleed'],
    ['item.stormforged-halberd', 'onDamage', 'status.burn'], ['item.book-of-exorcisms', 'onAttack', 'status.burn'],
    ['item.scepter-of-salvation', 'onHit', 'status.regeneration'],
  ]

  it.each(OWN)('%s — its %s trigger (%s) rides each attack the weapon grants, and only those', (id, hook, what) => {
    const item = ITEMS[id]!
    const attacks = item.grants.filter((g) => g.startsWith('attack.'))
    expect(attacks.length).toBeGreaterThan(0)
    const mine = (item.triggers as readonly Trig[]).filter((t) => t.hook === hook && t.source === id && (t.effect.statusId ?? t.effect.kind) === what)
    expect(mine.length).toBeGreaterThanOrEqual(attacks.length)
    expect(mine.every((t) => t.onlyWithAttack !== undefined && attacks.includes(t.onlyWithAttack))).toBe(true)
    expect([...new Set(mine.map((t) => t.onlyWithAttack))].sort()).toEqual([...attacks].sort())
  })

  it('the weapons left unscoped are these, by name — and no other base row', () => {
    const unscoped = rows.filter((r) => !r.enchant && !r.base).filter((r) => r.triggers.some((t) => attackerHook(t) && !t.onlyWithAttack)).map((r) => r.id).sort()
    // Pharaoh's Gauntlets: "Both hands are the weapon" — every blow its holder lands is the gauntlets'.
    // The two Bloodrunes are worn, not held: "Flames lick from every strike", "Wounds from this bearer".
    expect(unscoped).toEqual(['item.pharaohs-gauntlets', 'item.rune-bleeding-strike', 'item.rune-burning-touch'])
  })

  it('on an enchanted or derived row the only unscoped attack-hook triggers are the enchantment\'s own (its row has a scope word of its own, `attack: \'basic\'`)', () => {
    const copies = rows.filter((r) => r.enchant || r.base)
    expect(copies.length).toBeGreaterThan(100)
    const leftByEnchant = new Map<string, number>()
    for (const r of copies) for (const t of r.triggers) {
      if (!attackerHook(t) || t.onlyWithAttack) continue
      // never the base weapon's own trigger carried over unscoped — only one the enchantment added (its source is the combination)
      expect(t.source, `${r.id} ${t.id}`).toBe(r.id)
      expect(r.enchant, `${r.id} ${t.id}`).toBeDefined()
      leftByEnchant.set(r.enchant!, (leftByEnchant.get(r.enchant!) ?? 0) + 1)
    }
    expect([...leftByEnchant.keys()].sort()).toEqual([
      'enchant.addling', 'enchant.bewildering', 'enchant.bloodletting', 'enchant.eternal-ice', 'enchant.fire', 'enchant.frost',
      'enchant.goading', 'enchant.hobbling', 'enchant.maddening', 'enchant.rooting', 'enchant.taunting', 'enchant.venomous',
    ])
  })

  it('the pattern they follow is the dagger\'s: Stab\'s "gain 1 Protection" rides Stab', () => {
    expect(ITEMS['item.dagger']!.triggers).toEqual([expect.objectContaining({ id: 'trigger.dagger.stab.protection', hook: 'onAttack', onlyWithAttack: 'attack.dagger.stab' })])
  })
})
