// capability.summons (engine item, 2026-10-05; engine/DECISIONS.md 2026-10-04 'his 28 reward weapons read back: … the mechanics
// his own items need are wanted': "We need: summons"). The kingdom's half of the item's expect: "Call the Wolf puts a Wolf on
// the chosen adjacent hex on the heroes' side; it moves and attacks by its AI in the Hero Phase; it is not counted for victory
// or the after-battle screen and is gone when the Battle ends."
// The played battle offers the power once for each empty hex beside the hero (the engine's own list of hexes), the order is
// the engine's hex order, the Wolf is never the player's to activate - before or after a save - and the battle's result
// keys it to no hero: it is an arrival, so the reckoning, the wounds, the rewards and the after-battle screen never see it.
import { describe, it, expect } from 'vitest'
import { createSandbox, advanceSandbox, commandSandbox, sandboxChoices, sandboxActivationChoices, sandboxResult, saveSandbox, restoreSandbox, type Sandbox } from '../src/core/sandbox.js'
import { SANDBOX_DEFAULT } from '../src/content/sandbox.js'
import { heroRowOf } from '../src/content/heroes.js'
import { createPlayInput } from '../src/ui/play-input.js'
import { controllerOf, runBattle } from '../src/engine.js'
import type { Hero } from '../src/core/campaign.js'

const HERO = 'hero.base.mage-fire', STAFF = 'item.staff-of-summoning', CALL = 'power.staff-of-summoning.call-the-wolf', WOLF = 'unit.wolf'
function start(): { box: { s: Sandbox }; P: ReturnType<typeof createPlayInput> } {
  const row = { ...structuredClone(heroRowOf(HERO)), equipped: [STAFF] } as unknown as Hero
  const box: { s: Sandbox } = { s: createSandbox({ mapId: SANDBOX_DEFAULT.mapId, heroes: [HERO], heroRows: [row], enemies: ['unit.zombie', 'unit.zombie'], seed: 1 }) }
  advanceSandbox(box.s)
  const P = createPlayInput(() => box.s, (c) => commandSandbox(box.s, c), { save: () => saveSandbox(box.s), restore: (saved) => { box.s = restoreSandbox(saved as string); return true } })
  P.next()
  return { box, P }
}
const me = (s: Sandbox) => s.ctx.state.units[s.ctx.battleCursor!.actor!]!
const calls = (s: Sandbox) => sandboxChoices(s).filter((c) => c.command.actionId === CALL)

describe('Call the Wolf in a played battle', () => {
  it('the battle offers it once for each empty hex beside the hero, as the engine\'s hex order, and for nothing else', () => {
    const { box } = start(), s = box.s, u = me(s)
    expect(u.typeId).toBe(HERO)
    const offered = calls(s)
    expect(offered.length).toBeGreaterThan(0)
    for (const c of offered) {
      expect('hex' in c.command, 'aimed at a hex').toBe(true)
      const hex = (c.command as { hex: number }).hex
      expect(s.ctx.geo.distance(u.hex, hex)).toBe(1)
      expect(s.ctx.state.units.some((o) => o.lifeState !== 'dead' && o.hex === hex)).toBe(false)
      expect([c.name, c.cost, c.preview]).toEqual(['Call the Wolf', 2, null])
    }
  })
  it('ordered on a hex: a Wolf stands there on the heroes\' side; it is the computer\'s, never offered to the player - and still so after a save', () => {
    const { box } = start(), u = me(box.s)
    const order = calls(box.s).find((c) => c.command.slot === 'primary')!
    expect(commandSandbox(box.s, order.command)).toEqual({ ok: true })
    const wolf = box.s.ctx.state.units.at(-1)!
    expect([wolf.typeId, wolf.side, wolf.summoned, wolf.summonedBy, wolf.hex]).toEqual([WOLF, 'hero', true, u.id, (order.command as { hex: number }).hex])
    expect(controllerOf(box.s.ctx, wolf.id, box.s.policy)).toBe('ai')
    expect(controllerOf(box.s.ctx, u.id, box.s.policy)).toBe('human')
    expect(calls(box.s)).toEqual([])   // spent: its cost, its cooldown, the primary action
    box.s = restoreSandbox(saveSandbox(box.s))
    const again = box.s.ctx.state.units.at(-1)!
    expect([again.typeId, again.summonedBy]).toEqual([WOLF, u.id])
    expect(controllerOf(box.s.ctx, again.id, box.s.policy)).toBe('ai')
    expect(sandboxActivationChoices(box.s).map((c) => c.uid)).not.toContain(again.uid)
  })
  it('the battle\'s result keys the Wolf to no hero: an arrival, outside the roster the reckoning reads - and it leaves when the battle ends', () => {
    const { box } = start()
    commandSandbox(box.s, calls(box.s).find((c) => c.command.slot === 'primary')!.command)
    runBattle(box.s.ctx)
    const r = sandboxResult(box.s)
    const wolves = r.units.filter((x) => x.typeId === WOLF)
    expect(wolves.length).toBe(1)
    expect(wolves[0]!.role).toBe('arrival')
    expect(r.units.filter((x) => x.side === 'hero' && x.role === undefined).map((x) => x.typeId)).toEqual([HERO])
    const standing = box.s.ctx.state.units.filter((x) => x.summonedBy !== undefined && x.lifeState === 'standing')
    expect(box.s.ctx.events.filter((e) => e.type === 'unit.dismissed').map((e) => e.actor)).toEqual(standing.map((x) => x.id))
  })
})

describe('Call the Wolf through the play screen\'s own input', () => {
  it('chosen on the bar, an empty hex beside the hero clicked and clicked again: the Wolf stands on that hex', () => {
    const { box, P } = start(), u = me(box.s)
    const hex = (calls(box.s)[0]!.command as { hex: number }).hex
    expect(P.input({ kind: 'slot', actionId: CALL, unit: u.id })).toBe(true)
    expect(P.facts().slot).toBe(CALL)
    expect(P.facts().targets, 'the hexes it may be used on are shown').toContain(hex)
    P.input({ kind: 'hex', hex })
    if (!box.s.ctx.state.units.some((x) => x.typeId === WOLF)) P.input({ kind: 'hex', hex })
    const wolf = box.s.ctx.state.units.find((x) => x.typeId === WOLF)
    expect(wolf, 'the click is the order').toBeDefined()
    expect([wolf!.hex, wolf!.side, wolf!.summonedBy]).toEqual([hex, 'hero', u.id])
  })
})
