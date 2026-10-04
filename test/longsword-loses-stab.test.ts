// content.longsword-loses-stab (2026-10-04). Ruled 2026-10-04 (Andrew, DECISIONS.md 'after the backlog run:
// ...; the Longsword loses Stab; ...'): asked "Should the Longsword lose its Stab now that it has Counterattack,
// as your dictation said? The worker kept it." - "3 yes". With 2026-09-28 'counterattack, special free attacks,
// the opening six, shields, custom weapons': "The longsword's second power: counterattack with +10 Accuracy,
// until the end of your next turn, 2 Stamina. There is no 'free attacks with its other attack' power."
// SWITCHES.md longswordKeepsStab is overturned: item.longsword grants Slash and Counterattack, and every row
// made from it (the tier-3 series, the Forge's masterwork and enchanted rows) follows its base - none of
// their own Codex words gives a second attack (SWITCHES.md longswordSeriesFollowsBase).
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { attackIdsOf, powerIdsOf } from '../src/core/action.js'
import { createBattle, fieldedDef } from '../src/core/setup.js'
import { basicAttackOf } from '../src/core/free-attack.js'
import { ATTACKS, ITEMS, UNITS } from '../src/content/index.js'
import { scenarioDef, scenarioOptions } from '../src/content/scenarios.js'

const SWORD = 'item.longsword', SLASH = 'attack.longsword.slash', COUNTER = 'power.longsword.counterattack'
const STAB = /^attack\.longsword\.stab(\.|$)/
/** A paladin handed `item` and nothing else (a hero row is bare: its attacks are its kit's, then the Punch). */
const holder = (item: string) => {
  const ctx = createBattle({ ...scenarioOptions(scenarioDef('showcase.prologue-party')), heroes: ['hero.base.paladin-shiney'], heroHexes: [247], heroItems: [[item]] })
  return { ctx, u: ctx.state.units[0]! }
}
/** Every row made from the Longsword: the tier-3 series and the Forge's rows. */
const made = () => Object.values(ITEMS).filter((i) => (i as { base?: string }).base === SWORD)

describe('the Longsword has Slash and Counterattack', () => {
  it('its row grants the one attack and the one power', () => {
    expect(ITEMS[SWORD]!.grants).toEqual([SLASH])
    expect(ITEMS[SWORD]!.abilities).toEqual([COUNTER])
  })

  it('a hero holding it has Slash and Counterattack on its sheet and no Stab; Slash is the basic attack', () => {
    const { ctx, u } = holder(SWORD)
    expect(attackIdsOf(ctx, u)).toEqual([SLASH, 'attack.punch'])
    expect(powerIdsOf(ctx, u)).toContain(COUNTER)
    expect(basicAttackOf(ctx, u)?.id).toBe(SLASH)
    const eq = ctx.events.filter((e) => e.type === 'unit.equipped' && e.actor === u.id)
    expect(eq.map((e) => [e.causeId, e['grants']])).toEqual([[SWORD, [SLASH]]])
  })
})

describe('every row made from the Longsword follows its base', () => {
  it('the series and the Forge rows exist, the Flaming Longsword and the Masterwork among them', () => {
    const ids = made().map((i) => i.id)
    expect(ids).toContain('item.longsword.flaming')
    expect(ids).toContain('item.longsword.masterwork')
  })

  it.each(made().map((i) => [i.id, i] as const))('%s grants one attack - the Slash, or its own copy of it - and the Counterattack', (_id, i) => {
    expect(i.grants).toHaveLength(1)
    // a Forge enchant rides a COPY of the base's attack (`<attack id>.<enchant>`); every other row grants the base's own
    expect(i.grants[0] === SLASH || i.grants[0]!.startsWith(SLASH + '.')).toBe(true)
    expect(ATTACKS[i.grants[0]!]).toBeDefined()
    expect(i.abilities).toEqual(ITEMS[SWORD]!.abilities)
  })

  it('the Flaming Longsword\'s holder has what its row\'s words give: the basic attack burning, and the Counterattack', () => {
    const { ctx, u } = holder('item.longsword.flaming')
    expect(attackIdsOf(ctx, u)).toEqual([SLASH, 'attack.punch'])
    expect(powerIdsOf(ctx, u)).toContain(COUNTER)
    const added = ITEMS['item.longsword.flaming']!.triggers.filter((t) => t.source === 'item.longsword.flaming')
    expect(added.map((t) => [t.hook, t.onlyWithAttack, t.effect.kind])).toEqual([['onHit', SLASH, 'status.apply'], ['onHit', SLASH, 'damage']])
  })
})

describe('nothing grants the Stab', () => {
  it('no attack row of the pack is the Longsword\'s Stab or a copy of it', () => {
    expect(Object.keys(ATTACKS).filter((id) => STAB.test(id))).toEqual([])
  })

  it('no item grants it and no unit fields with it', () => {
    expect(Object.values(ITEMS).filter((i) => i.grants.some((g) => STAB.test(g))).map((i) => i.id)).toEqual([])
    const with_ = Object.keys(UNITS).filter((id) => fieldedDef(id).attacks.some((a) => STAB.test(a)))
    expect(with_).toEqual([])
  })

  it('the Codex row, the published content and the pack agree', () => {
    const read = (f: string) => JSON.parse(readFileSync(join(__dirname, '..', '..', 'content', f), 'utf8'))
    for (const f of ['gen/settled-items.json', 'hbt-content.json']) {
      const j = read(f) as { items: { id: string; grants: string[] }[]; attacks: { id: string }[] }
      expect(j.items.find((i) => i.id === SWORD)!.grants, f).toEqual([SLASH, COUNTER])
      expect(j.attacks.filter((a) => STAB.test(a.id)).map((a) => a.id), f).toEqual([])
    }
    expect([...ITEMS[SWORD]!.grants, ...ITEMS[SWORD]!.abilities]).toEqual([SLASH, COUNTER])
  })
})
