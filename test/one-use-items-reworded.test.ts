// content.one-use-items-reworded (2026-10-06). Ruled 2026-10-06 (Andrew, DECISIONS.md 'the one-use rules: most are cut or
// reworded onto rules the engine already has; a handful are built'), item by item - they win over 2026-10-04 'every dead line
// on his items is a feature that is needed' for the items named here only: the Divine Bulwark - "Just add one stun. At combat
// start"; the Drakescale Coat - "Give it 2 fire resistance."; the Wayfinder's Compass - "just give a bonus to vision."; the
// Rune of the Perfect Hunter - "Just get rid of that."; The Last Arrow - "on kill gain 70 surge and take -3 precision"; Storm
// Bastion - "we don't need that."; the Blink Ring - "I don't think we need teleportation"; the Brass Spyglass - "we don't need
// that."
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { createBattle, fieldedPreview } from '../src/core/setup.js'
import { runBattle } from '../src/core/battle.js'
import { valueOf as statusValue } from '../src/core/status.js'
import { ATTACKS, ITEMS } from '../src/content/index.js'
import { SCENARIOS, scenarioOptions } from '../src/content/scenarios.js'

const BULWARK = 'item.divine-bulwark', COAT = 'item.drakescale-coat', STUN = 'status.stun'

describe('the rows', () => {
  it('the Divine Bulwark: Armor 2 from the start, and 1 Stun on its wearer at the start of the Battle', () => {
    const row = ITEMS[BULWARK]!
    expect(row.statModifiers).toMatchObject({ armor: 2, resist: 1 })
    expect(row.triggers).toEqual([{ id: 'trigger.divine-bulwark.stun', hook: 'startOfBattle', chance: 100, select: 'self', effect: { kind: 'status.apply', statusId: STUN, value: 1 }, source: BULWARK }])
    expect(row.gaps ?? []).toEqual([])
  })
  it('the Drakescale Coat gives 2 Fire Resist, and no line of it speaks of Burn', () => {
    expect(ITEMS[COAT]!.statModifiers).toMatchObject({ fireResist: 2 })
    expect((ITEMS[COAT]!.gaps ?? []).filter((g) => /Burn|halved/.test(g))).toEqual([])
    const bare = fieldedPreview('hero.base.priest-armored', { items: ['item.holy-texts'] }), worn = fieldedPreview('hero.base.priest-armored', { items: ['item.holy-texts', COAT] })
    expect((worn.fireResist ?? 0) - (bare.fireResist ?? 0)).toBe(2)
  })
  it('the Wayfinder\'s Compass says nothing of a floor on Vision; Storm Bastion has no aura', () => {
    expect((ITEMS['item.wayfinders-compass']!.gaps ?? []).filter((g) => /blinded|below Vision/.test(g))).toEqual([])
    expect(ITEMS['item.storm-bastion']!.gaps ?? []).toEqual([])
    expect(ITEMS['item.storm-bastion']!.triggers).toEqual([])
  })
  it('the Rune of the Perfect Hunter is not an item, and no row of the registry is made from it', () => {
    expect(ITEMS['item.rune-perfect-hunter']).toBeUndefined()
    expect(Object.keys(ITEMS).filter((id) => id.includes('perfect-hunter'))).toEqual([])
    // its neighbours of the same tier are as they were
    for (const id of ['item.rune-berserker-blood', 'item.rune-deathdealer', 'item.rune-kairin', 'item.rune-avatar-of-war', 'item.rune-hells-chosen']) expect(ITEMS[id], id).toBeDefined()
  })
  it('The Last Arrow makes no free shot; its on-kill line waits, named, for the Surge effect; the Death Bow locks no healing', () => {
    expect(ATTACKS['attack.death-bow.the-last-arrow']).toBeDefined()
    const bow = ITEMS['item.death-bow']!
    expect((bow.gaps ?? []).filter((g) => /healed|Death Shot/.test(g))).toEqual([])
    expect(bow.triggers.filter((t) => t.onlyWithAttack === 'attack.death-bow.the-last-arrow')).toEqual([])
    // content's own list of what the pack could not say names the line for the capability that will build it
    const named = (JSON.parse(readFileSync('../content/gen/enemy-pack-gaps.json', 'utf8')) as { gaps: { unit: string; what: string; needs: string }[] }).gaps.filter((g) => g.unit === 'item.death-bow' && g.what.includes('the-last-arrow'))
    expect(named.map((g) => g.needs)).toEqual(["no effect moves a unit's Surge amount — engine capability.trigger-moves-surge"])
    expect(named[0]!.what).toContain('gain 70 Surge, and take -3 Precision')
  })
  it('the Blink Ring and the Brass Spyglass are still rows a hero can carry, each with a plain active that is not built', () => {
    for (const [id, words] of [['item.blink-ring', 'Move up to 4 hexes'], ['item.brass-spyglass-of-thessan', 'Every ally within 3 hexes gains +10 Accuracy']] as const) {
      expect((ITEMS[id]!.gaps ?? []).filter((g) => g.includes(words)).length, id).toBe(1)
      expect((ITEMS[id]!.gaps ?? []).filter((g) => /teleport|not movement|every attack you/i.test(g)), id).toEqual([])
    }
  })
})

describe('in a real battle', () => {
  it('test.divine-bulwark: the paladin in the Bulwark starts the Battle Stunned by 1 and does not act on her first Activation; the priest beside her wears the Coat', () => {
    const base = scenarioOptions(SCENARIOS['test.divine-bulwark']!)
    const ctx = createBattle(base)
    const [paladin, priest] = ctx.state.units.filter((u) => u.side === 'hero')
    expect(ctx.events.some((e) => e.type === 'unit.equipped' && e.causeId === COAT && e.actor === priest!.id)).toBe(true)
    expect(statusValue(paladin!, STUN), 'before the Battle begins').toBe(0)
    runBattle(ctx)
    // as the Battle begins: the Stun is on her, under the item's trigger, before anyone acts - and on nobody else
    const stunned = ctx.events.filter((e) => e.type === 'status.applied' && e['statusId'] === STUN)
    expect(stunned.map((e) => [e.causeId, e.target, e['amount']])).toEqual([['trigger.divine-bulwark.stun', paladin!.id, 1]])
    expect(stunned[0]!.seq).toBeLessThan(ctx.events.find((e) => e.type === 'activation.begin')!.seq)
    // her first Activation: no step and no swing of hers before her second begins
    const second = ctx.events.find((e) => e.type === 'activation.begin' && e.actor === paladin!.id && e['ordinal'] === 2)
    const before = ctx.events.filter((e) => e.actor === paladin!.id && (second === undefined || e.seq < second.seq))
    expect(before.filter((e) => e.type === 'moved' || e.type === 'attack.declared')).toEqual([])
    expect(ctx.events.some((e) => e.actor === paladin!.id && e.type === 'attack.declared')).toBe(true)   // and then she fights
  })
})
