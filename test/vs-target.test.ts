// station.vs-target (2026-09-25) — DMG.VS_TARGET: damage modifiers that read the
// TARGET, by what it IS (a tag on its row) or what it CARRIES (a status at value > 0).
// A number in the one damage function (Law 1), never a trigger. Its two instances are
// pure data: test.badge.bane-undead (+2 vs undead) and test.badge.bane-venom (+50% vs
// poisoned, with its own poison rider). The Codex's slayer maps compile to the same
// rules on the enchanted weapons. Station number and reach: SWITCHES.md 'station.vs-target'.
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
    expect(BADGES[VENOM]!.vsTarget).toEqual([{ status: 'status.poison', percent: 50 }])
  })
  it('the Codex slayer maps compile onto the held weapons, and no row still says the station is missing', () => {
    expect(ITEMS['item.greatsword.demon-slayer']!.vsTarget).toEqual([{ tag: 'demon', add: 3 }])
    expect(ITEMS['item.iron-mace.holy-water']!.vsTarget).toEqual([{ tag: 'undead', add: 1 }, { tag: 'demon', add: 1 }, { tag: 'vampire', add: 1 }])
    for (const it of Object.values(ITEMS)) for (const g of it.gaps ?? []) expect(g).not.toMatch(/no VS_TARGET station/)
    // a worn item's slayer is a NAMED gap, never dead data (the engine keeps no worn list).
    // fix.vs-target-worn-gap-text (2026-09-25): the gap keeps its pre-station wording, byte for
    // byte — it rides unit.equipped and the battle-cursor goldens hash it. Rule unchanged: a
    // worn slayer compiles to no rule and is named as a gap.
    const rune = ITEMS['item.rune-kairin']!
    expect(rune.vsTarget).toBeUndefined()
    expect(rune.gaps?.some((g) => /^slayer: /.test(g) && /item field: slayer$/.test(g))).toBe(true)
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
  it('against a poisoned target: +50% of the running value, truncated (Law 7), one row naming the badge', () => {
    const ctx = duel('test-zombie', VENOM)
    ctx.state.units[1]!.statuses.push({ id: 'status.poison', value: 2 })
    const r = dmg(ctx, 0, 1, MASSIVE)
    const [row] = vsRows(r.ledger)
    expect(row).toMatchObject({ station: DMG.VS_TARGET, effectId: VENOM })
    expect(row!.delta).toBe(Math.trunc((row!.before * 50) / 100))
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
  it('test.vs-target-b: the first hit poisons; a later hit on the poisoned ward shows +50% vs poisoned', () => {
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
