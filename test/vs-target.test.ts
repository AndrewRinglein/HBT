// station.vs-target (2026-09-25) — DMG.VS_TARGET: damage modifiers that read the
// TARGET, by what it IS (a tag on its row) or what it CARRIES (a status at value > 0).
// A number in the one damage function (Law 1), never a trigger. Its two instances are
// pure data: test.badge.bane-undead (+2 vs undead) and test.badge.bane-venom (+3 vs
// poisoned, with its own poison rider). The Codex's slayer maps compile to the same
// rules on the enchanted weapons and the worn bloodrunes. Station number and reach:
// SWITCHES.md 'station.vs-target'.
//
// fix.vs-target-worn-and-flat (2026-09-25), Andrew (DECISIONS.md): "There had been no
// percentage modifiers to damage under things that I have authored" — the venom rule's
// +50% was an engine example, so its assertions are rewritten as a flat +3 (Law 10: the
// rule changed, not the test's strictness). "Bloodrune Slayer bonus happens" — the worn
// rune's slayer, once a named gap here, is now a rule the station reads.
import { describe, expect, it } from 'vitest'
import { createBattle, createCustomBattle } from '../src/core/setup.js'
import { runBattle } from '../src/core/battle.js'
import { grantBadge } from '../src/core/mutate.js'
import { DMG, attackDef, damageSourceOfAttack, preview, resolveDamage, type LedgerRow } from '../src/core/pipeline.js'
import { BADGES, ITEMS, UNITS } from '../src/content/index.js'
import { SCENARIOS, scenarioOptions } from '../src/content/scenarios.js'
import { renderLog } from '../src/view/text.js'
import type { Ctx } from '../src/core/types.js'
import { hexId } from './board16.js'

const UNDEAD = 'test.badge.bane-undead', VENOM = 'test.badge.bane-venom'
const MASSIVE = 'attack.test-warrior.massive'
const vsRows = (ledger: readonly LedgerRow[]) => ledger.filter((r) => r.name === 'VS_TARGET')
const dmg = (ctx: Ctx, at: number, tg: number, attackId: string, heads = 0) =>
  resolveDamage(ctx, ctx.state.units[at]!, ctx.state.units[tg]!, damageSourceOfAttack(attackDef(ctx, attackId)), heads)
/** A warrior next to one enemy of `type`, optionally wearing a badge granted before the swing. */
function duel(type: string, badge?: string) {
  const ctx = createCustomBattle([{ type: 'test-warrior', hex: hexId(5, 5) }], [{ type, hex: hexId(5, 6) }])
  if (badge) expect(grantBadge(ctx, 0, badge, 'test')).toBe(true)
  return ctx
}

describe('the rows', () => {
  it('the two test badges are the mechanism\'s two instances — a tag rule and a status rule, pure data', () => {
    expect(BADGES[UNDEAD]!.vsTarget).toEqual([{ tag: 'undead', add: 2 }])
    expect(BADGES[VENOM]!.vsTarget).toEqual([{ status: 'status.poison', add: 3 }])
  })
  it('the Codex slayer maps compile onto the held weapons, and no row still says the station is missing', () => {
    expect(ITEMS['item.greatsword.demon-slayer']!.vsTarget).toEqual([{ tag: 'demon', add: 3 }])
    expect(ITEMS['item.iron-mace.holy-water']!.vsTarget).toEqual([{ tag: 'undead', add: 1 }, { tag: 'demon', add: 1 }, { tag: 'vampire', add: 1 }])
    for (const it of Object.values(ITEMS)) for (const g of it.gaps ?? []) expect(g).not.toMatch(/no VS_TARGET station/)
    // fix.vs-target-worn-and-flat: a worn item's slayer compiles too — the gap is gone
    expect(ITEMS['item.rune-kairin']!.vsTarget).toEqual([{ tag: 'undead', add: 3 }, { tag: 'demon', add: 3 }])
    expect(ITEMS['item.rune-vampire-hunter']!.vsTarget).toEqual([{ tag: 'vampire', add: 3 }, { tag: 'undead', add: 1 }])
    for (const it of Object.values(ITEMS)) for (const g of it.gaps ?? []) expect(g).not.toMatch(/item field: slayer|reads held items only/)
  })
  it('no rule anywhere carries a percent — a vsTarget rule is a flat add', () => {
    const rules = [...Object.values(ITEMS), ...Object.values(BADGES)].flatMap((r) => r.vsTarget ?? [])
    expect(rules.length).toBeGreaterThan(0)
    for (const r of rules) {
      expect(Object.keys(r).sort()).toEqual(['add', r.tag !== undefined ? 'tag' : 'status'].sort())
      expect(Number.isInteger(r.add)).toBe(true)
    }
  })
})

describe('by what the target IS — a tag', () => {
  it('against an undead target: one VS_TARGET row at 400, naming the badge, worth exactly the rule', () => {
    const plain = dmg(duel('test-zombie'), 0, 1, MASSIVE)
    const worn = dmg(duel('test-zombie', UNDEAD), 0, 1, MASSIVE)
    expect(vsRows(plain.ledger)).toEqual([])
    expect(vsRows(worn.ledger)).toEqual([expect.objectContaining({ station: DMG.VS_TARGET, effectId: UNDEAD, delta: 2 })])
    expect(worn.value).toBe(plain.value + 2)
  })
  it('against a target without the tag: nothing — the same number as no badge at all', () => {
    expect(UNITS['test-osric']!.tags).not.toContain('undead')
    const plain = dmg(duel('test-osric'), 0, 1, MASSIVE)
    const worn = dmg(duel('test-osric', UNDEAD), 0, 1, MASSIVE)
    expect(vsRows(worn.ledger)).toEqual([])
    expect(worn.value).toBe(plain.value)
  })
  it('sits before CRIT, so a crit multiplies the bonus (the ruling\'s "crit-amplified")', () => {
    const r = dmg(duel('test-zombie', UNDEAD), 0, 1, MASSIVE, 1)
    const vs = r.ledger.findIndex((x) => x.name === 'VS_TARGET'), crit = r.ledger.findIndex((x) => x.name === 'CRIT')
    expect(vs).toBeGreaterThanOrEqual(0)
    expect(vs).toBeLessThan(crit)
    expect(r.ledger[crit]!.before).toBe(r.ledger[vs]!.after)
    const plainCrit = dmg(duel('test-zombie'), 0, 1, MASSIVE, 1)
    expect(r.value).toBeGreaterThan(plainCrit.value + 2)   // the +2 came out bigger than +2
  })
})

describe('by what the target CARRIES — a status', () => {
  it('against a poisoned target: the flat +3, one row naming the badge', () => {
    const ctx = duel('test-zombie', VENOM)
    ctx.state.units[1]!.statuses.push({ id: 'status.poison', value: 2 })
    const r = dmg(ctx, 0, 1, MASSIVE)
    const [row] = vsRows(r.ledger)
    expect(row).toMatchObject({ station: DMG.VS_TARGET, effectId: VENOM })
    // was +50% of the running value (Math.trunc(before * 50 / 100)); no percentages (Andrew 2026-09-25)
    expect(row!.delta).toBe(BADGES[VENOM]!.vsTarget![0]!.add)
    expect(row!.delta).toBeGreaterThan(0)
  })
  it('a status at value 0 is not carried — no row', () => {
    const ctx = duel('test-zombie', VENOM)
    ctx.state.units[1]!.statuses.push({ id: 'status.poison', value: 0 })
    expect(vsRows(dmg(ctx, 0, 1, MASSIVE).ledger)).toEqual([])
  })
})

describe('an item\'s rules reach only the attacks that item grants', () => {
  const demon = Object.entries(UNITS).find(([, u]) => u.tags?.includes('demon'))![0]
  const armed = () => createBattle({ heroes: ['test-warrior'], heroHexes: [85], heroItems: [['item.greatsword.demon-slayer']], enemies: [demon], enemyHexes: [86], mapId: 'map.open', replicate: 0, strict: true })
  it('the Demon Slayer greatsword\'s own swing gets +3 vs a demon; the same hero\'s other attack gets nothing', () => {
    const ctx = armed()
    expect(vsRows(dmg(ctx, 0, 1, 'attack.greatsword.hew').ledger)).toEqual([expect.objectContaining({ effectId: 'item.greatsword.demon-slayer', delta: 3 })])
    expect(vsRows(dmg(ctx, 0, 1, MASSIVE).ledger)).toEqual([])
  })
  it('preview and resolution read the same station (Law 1)', () => {
    const ctx = armed()
    const p = preview(ctx, 0, 1, 'attack.greatsword.hew') as unknown as { damage?: number; ledger?: LedgerRow[] }
    expect(JSON.stringify(p)).toContain('VS_TARGET')
  })
})

describe('in a real battle', () => {
  it('test.vs-target-a: every warrior hit on a zombie carries the +2 row, in the log and in the waterfall', () => {
    const ctx = createBattle(scenarioOptions(SCENARIOS['test.vs-target-a']!))
    runBattle(ctx)
    const hits = ctx.events.filter((e) => e.type === 'attack.hit' && e.actor === 0)
    expect(hits.length).toBeGreaterThan(0)
    for (const h of hits) expect(JSON.stringify(h['ledger'])).toContain(UNDEAD)
    const names = new Map(ctx.state.units.map((u) => [u.id, u.name]))
    expect(renderLog(ctx.events, names).some((l) => l.includes('+2 vs_target'))).toBe(true)
  })
  it('test.vs-target-b: the first hit poisons; a later hit on the poisoned ward shows the flat +3 vs poisoned', () => {
    const ctx = createBattle(scenarioOptions(SCENARIOS['test.vs-target-b']!))
    runBattle(ctx)
    const hits = ctx.events.filter((e) => e.type === 'attack.hit' && e.actor === 0)
    expect(JSON.stringify(hits[0]!['ledger'])).not.toContain('VS_TARGET')   // not poisoned yet
    const later = hits.slice(1).filter((h) => JSON.stringify(h['ledger']).includes(VENOM))
    expect(later.length).toBeGreaterThan(0)
    const names = new Map(ctx.state.units.map((u) => [u.id, u.name]))
    expect(renderLog(ctx.events, names).some((l) => / \+\d+ vs_target\]/.test(l))).toBe(true)
  })
})

// fix.vs-target-worn-and-flat (2026-09-25): a WORN item's slayer — "Bloodrune Slayer bonus
// happens", and it reaches every attack and power the hero makes, the way a badge's does
// (Andrew, DECISIONS.md). The engine reads loadout.worn; two instances are two sources
// (SWITCHES.md vsTargetWornTwice).
describe('a worn item (a bloodrune) reaches every damage the hero deals', () => {
  const KAIRIN = 'item.rune-kairin', HUNTER = 'item.rune-vampire-hunter'
  const wearing = (items: string[], enemy = 'test-zombie') =>
    createBattle({ heroes: ['test-warrior'], heroHexes: [85], heroItems: [items], enemies: [enemy], enemyHexes: [86], mapId: 'map.open', replicate: 0, strict: true })
  it('the rune is carried as worn, not held — and its rules reach an attack the rune does not grant', () => {
    const ctx = wearing([KAIRIN])
    expect(ctx.state.units[0]!.loadout).toEqual({ hands: [], stowed: [], worn: [{ instanceId: expect.any(String), itemId: KAIRIN }] })
    expect(ITEMS[KAIRIN]!.grants).not.toContain(MASSIVE)
    const plain = dmg(duel('test-zombie'), 0, 1, MASSIVE)
    const r = dmg(ctx, 0, 1, MASSIVE)
    expect(vsRows(r.ledger)).toEqual([expect.objectContaining({ station: DMG.VS_TARGET, effectId: KAIRIN, delta: 3 })])
    expect(r.value).toBe(plain.value + 3)
  })
  it('a hero carrying only weapons and shields keeps the old loadout shape — no worn list', () => {
    const ctx = createBattle({ heroes: ['test-warrior'], heroHexes: [85], heroItems: [['item.greatsword.demon-slayer']], enemies: ['test-zombie'], enemyHexes: [86], mapId: 'map.open', replicate: 0, strict: true })
    expect(Object.keys(ctx.state.units[0]!.loadout!).sort()).toEqual(['hands', 'stowed'])
  })
  it('against a target without the tag: nothing', () => {
    // any enemy row that is neither undead nor demon (Kai'rin's two tags)
    const foe = Object.entries(UNITS).find(([k, u]) => k.startsWith('test-') && u.side === 'enemy' && !(u.tags ?? []).some((t) => t === 'undead' || t === 'demon'))![0]
    const ctx = wearing([KAIRIN], foe)
    expect(vsRows(dmg(ctx, 0, 1, MASSIVE).ledger)).toEqual([])
  })
  it('two runes, and the same rune twice: one row per worn instance, in handed order', () => {
    const ctx = wearing([HUNTER, KAIRIN, KAIRIN])
    expect(vsRows(dmg(ctx, 0, 1, MASSIVE).ledger).map((r) => [r.effectId, r.delta])).toEqual([[HUNTER, 1], [KAIRIN, 3], [KAIRIN, 3]])
  })
  it('preview reads the worn rune too (Law 1)', () => {
    const p = preview(wearing([KAIRIN]), 0, 1, MASSIVE) as unknown as Record<string, unknown>
    expect(JSON.stringify(p)).toContain(KAIRIN)
  })
  it('test.vs-target-c, a real battle: every hit on a zombie carries the wearer\'s rune, +3 for Kai\'rin and +1 for the Vampire Hunter rune', () => {
    const ctx = createBattle(scenarioOptions(SCENARIOS['test.vs-target-c']!))
    runBattle(ctx)
    for (const [actor, rune, add] of [[0, KAIRIN, 3], [1, HUNTER, 1]] as const) {
      const hits = ctx.events.filter((e) => e.type === 'attack.hit' && e.actor === actor)
      expect(hits.length).toBeGreaterThan(0)
      for (const h of hits) expect(h['ledger']).toContainEqual({ station: 'VS_TARGET', effectId: rune, delta: add })
    }
    const names = new Map(ctx.state.units.map((u) => [u.id, u.name]))
    expect(renderLog(ctx.events, names).some((l) => l.includes('+3 vs_target'))).toBe(true)
  })
})
