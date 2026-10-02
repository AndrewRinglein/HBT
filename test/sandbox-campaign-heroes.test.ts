// kingdom.sandbox-campaign-heroes (kingdom.opening-loop-three part 1 of 4; PLAYABLE-OPENING-PLAN.md item 12):
// the sandbox fields an encounter with campaign Hero rows, not only hero ids — createSandbox takes the rows
// (level, specialty, levelPick, equipped and used, wound, badges) and hands them to makeBattleState unchanged,
// so the hero who plays battle 2 is the hero battle 1 left behind. ?play=<id>[&heroes=…] is unchanged: its rows
// are still built from SANDBOX_HEROES.
import { describe, it, expect } from 'vitest'
import { createSandbox, saveSandbox, restoreSandbox, type SandboxConfig } from '../src/core/sandbox.js'
import { SANDBOX_DEFAULT, SANDBOX_HEROES } from '../src/content/sandbox.js'
import { makeBattleState, battleOptionsOf } from '../src/core/seam.js'
import type { Hero } from '../src/core/campaign.js'
import { encounterDef } from '../src/engine.js'

const ENCOUNTER = 'encounter.opening.orphanage'
const WARRIOR = 'hero.base.warrior-iron'
const fresh = (id: string): Hero => structuredClone(SANDBOX_HEROES.find((h) => h.id === id)!)
/** Battle 1 left this warrior behind: level 2 with its specialty, the war axe swapped for a longsword, a spent use, and Wounded. */
function leftBehind(): Hero {
  const h = fresh(WARRIOR)
  const axe = h.equipped.indexOf('item.war-axe')
  expect(axe).toBeGreaterThanOrEqual(0)
  h.equipped[axe] = 'item.longsword'
  return { ...h, id: 'hero.campaign-0', level: 2, xp: 0, specialty: 'specialty.champion', wound: 1, badges: ['badge.wounded'] }
}
const PLAY: SandboxConfig = { mapId: SANDBOX_DEFAULT.mapId, heroes: [WARRIOR], enemies: [], seed: 3, encounterId: ENCOUNTER }
const heroUnit = (config: SandboxConfig) => createSandbox(config).ctx.state.units.find((u) => u.side === 'hero' && u.typeId === WARRIOR)!

describe('kingdom.sandbox-campaign-heroes — the sandbox fields campaign Hero rows', () => {
  it('a level-2 hero with a swapped item and a wound fields with that level, item and wound', () => {
    const row = leftBehind()
    const campaign = createSandbox({ ...PLAY, heroes: [row.id], heroRows: [row] })
    const u = campaign.ctx.state.units.find((x) => x.side === 'hero' && x.typeId === WARRIOR)!
    const plain = heroUnit(PLAY)
    // the setup is exactly what makeBattleState makes of the row — handed over unchanged
    const spec = makeBattleState({ 'hero-0': row }, { id: ENCOUNTER, mapId: encounterDef(ENCOUNTER).mapId!, enemies: [], deployed: ['hero-0'], seed: PLAY.seed })
    const expected = battleOptionsOf(spec)
    expect(campaign.setup.heroProgress).toEqual(expected.heroProgress)
    expect(campaign.setup.heroItems).toEqual(expected.heroItems)
    expect(campaign.setup.heroBadges).toEqual([['badge.wounded']])
    expect(campaign.setup.heroProgress).toEqual([expect.objectContaining({ level: 2, specialtyId: 'specialty.champion' })])
    // the level: the level-2 row's grants and the specialty's modifiers are on the unit, and the plain hero has neither
    expect(plain.surge ?? 0).toBeLessThan(u.surge ?? 0)
    expect(u.maxHp).toBeGreaterThan(plain.maxHp)
    // the item: the longsword is carried, the war axe is not; the ?play= hero still carries the axe
    const carried = (x: typeof u) => [...(x.loadout?.hands ?? []), ...(x.loadout?.stowed ?? [])].map((i) => i.itemId)
    expect(carried(u)).toContain('item.longsword')
    expect(carried(u)).not.toContain('item.war-axe')
    expect(carried(plain)).toContain('item.war-axe')
    // the wound: Wounded is on the engine unit, not on the plain hero
    expect(u.badges).toContain('badge.wounded')
    expect(plain.badges).not.toContain('badge.wounded')
  })

  it('the rows survive a save and a restore', () => {
    const row = leftBehind(), s = createSandbox({ ...PLAY, heroes: [row.id], heroRows: [row] })
    const back = restoreSandbox(saveSandbox(s))
    expect(back.setup.heroProgress).toEqual(s.setup.heroProgress)
    expect(back.ctx.state.units.find((x) => x.side === 'hero')!.badges).toContain('badge.wounded')
  })

  it('?play= battles are unchanged: the rows built from SANDBOX_HEROES field the same battle as the ids', () => {
    for (const heroes of [[WARRIOR], [...SANDBOX_DEFAULT.heroes]]) {
      const byId = createSandbox({ ...PLAY, heroes }), byRow = createSandbox({ ...PLAY, heroes, heroRows: heroes.map(fresh) })
      expect(byRow.setup).toEqual(byId.setup)
      expect(byRow.ctx.events).toEqual(byId.ctx.events)
      expect(byId.config.heroRows).toBeUndefined()
    }
  })

  it('refuses rows that disagree with the heroes named, or none, or more than six', () => {
    const row = leftBehind()
    expect(() => createSandbox({ ...PLAY, heroes: [WARRIOR], heroRows: [row] })).toThrow(/Hero rows/)
    expect(() => createSandbox({ ...PLAY, heroes: [], heroRows: [] })).toThrow()
    const seven = Array.from({ length: 7 }, (_, i) => ({ ...fresh(WARRIOR), id: 'hero.c' + i }))
    expect(() => createSandbox({ ...PLAY, heroes: seven.map((h) => h.id), heroRows: seven })).toThrow()
  })
})
