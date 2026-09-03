// capability.vision (2026-09-03) — COMBAT-DESIGN §4, re-ruled 2026-09-03:
// effective Vision = 6 (the battlefield) + the stat (0) + mods, floored at 1.
// Angela: "everyone has a vision of 6, even though the stat is 0". Darkness is
// the CONDITION (the whole board at phase 1) and the LAYER (painted in a
// radius); heroes light within Vision on the hero phase; burning reveals
// regardless of range; you cannot target what you cannot see (switch).
import { describe, expect, it } from 'vitest'
import { createBattle, createCustomBattle } from '../src/core/setup.js'
import { runBattle } from '../src/core/battle.js'
import { canAttack } from '../src/core/pipeline.js'
import { visionOf, canSee, fallNight, heroesLight, isDark } from '../src/core/vision.js'
import { addStatMod, layerAt } from '../src/core/mutate.js'
import { applyStatus } from '../src/core/status.js'
import { LAYER } from '../src/content/maps.js'
import { ENCOUNTERS, UNITS } from '../src/content/index.js'
import { distance, hexId, WIDTH } from '../src/core/hex.js'

const board = () => createCustomBattle([{ type: 'test-ranger', hex: hexId(2, 8) }], [{ type: 'unit.zombie', hex: hexId(9, 8) }, { type: 'unit.zombie', hex: hexId(6, 8) }])

describe('the number', () => {
  it('is 6 with a stat of 0; a −2 Vision mod makes 4; nothing takes it below 1', () => {
    const ctx = board(); const r = ctx.state.units[0]!
    expect(r.vision).toBe(0)
    expect(visionOf(ctx, r)).toBe(6)
    addStatMod(ctx, r.id, { stat: 'vision', op: 'add', value: -2, source: 'test', scope: 'unit' }, 'test')
    expect(visionOf(ctx, r)).toBe(4)
    addStatMod(ctx, r.id, { stat: 'vision', op: 'add', value: -20, source: 'test', scope: 'unit' }, 'test')
    expect(visionOf(ctx, r)).toBe(1)
  })
})

describe('darkness', () => {
  it('in daylight everything is seen; in the dark only within Vision; a burning unit is seen regardless', () => {
    const ctx = board(); const r = ctx.state.units[0]!, far = ctx.state.units[1]!, near = ctx.state.units[2]!
    expect(canSee(ctx, r, far)).toBe(true)
    fallNight(ctx, 'test')
    expect(isDark(ctx, far.hex)).toBe(true)
    expect(distance(r.hex, far.hex)).toBeGreaterThan(6)
    expect(canSee(ctx, r, far)).toBe(false)
    expect(canSee(ctx, r, near)).toBe(true)
    expect(canAttack(ctx, r.id, far.id, r.attacks[0]!)).toBe(false)
    applyStatus(ctx, far.id, 'status.burn', 1, 'test')
    expect(canSee(ctx, r, far)).toBe(true)
  })

  it('the hero phase lights everything inside each hero\'s Vision — the darkness there is unpainted', () => {
    const ctx = board(); const r = ctx.state.units[0]!
    fallNight(ctx, 'test')
    heroesLight(ctx, 'test')
    let dark = 0, litInside = 0
    for (let h = 0; h < WIDTH * WIDTH; h++) { if (layerAt(ctx, h) === LAYER.DARKNESS) dark++; else if (distance(r.hex, h) <= 6) litInside++ }
    expect(dark).toBeGreaterThan(0)
    for (let h = 0; h < WIDTH * WIDTH; h++) if (distance(r.hex, h) <= 6) expect(layerAt(ctx, h)).not.toBe(LAYER.DARKNESS)
    expect(litInside).toBeGreaterThan(0)
  })

  it('Horrors of the Night: the board starts dark, the heroes light, the night family repaints — the tug of war is in the log', () => {
    const enc = ENCOUNTERS['battle.horrors-of-the-night']!
    expect(enc.condition).toBe('darkness')
    const nightfall = UNITS['unit.shadow-sorcerer']!.triggers!.find((t) => t.effect.kind === 'layer.paint')!
    expect(nightfall, 'Nightfall is on the sorcerer').toBeDefined()
    expect(UNITS['unit.eyeblight']!.triggers!.some((t) => t.effect.kind === 'layer.paint' && t.hook === 'onDeath')).toBe(true)
    const ctx = createBattle({ replicate: 0, heroes: ['hero.base.warrior-iron', 'hero.base.ranger-aggressive', 'hero.base.mage-fire', 'hero.base.priest-armored'], encounter: enc })
    runBattle(ctx)
    expect(ctx.events.some((e) => e.type === 'night.fell')).toBe(true)
    expect(ctx.events.some((e) => e.type === 'light.cast')).toBe(true)
    // the repaint is Nightfall's own — the sorcerer arrives at Turn 4 and paints 7 around itself at every End of Activation
    const repaints = ctx.events.filter((e) => e.type === 'trigger.fired' && e.causeId === nightfall.id)
    expect(repaints.length).toBeGreaterThan(0)
    for (const r of repaints) expect(r['hexes']).toBeGreaterThan(0)
  })

  it('Blight the Eye: the Eyeblight\'s hit takes Vision off the hero, through a statMod trigger the ledger names', () => {
    const t = UNITS['unit.eyeblight']!.triggers!.find((x) => x.effect.kind === 'statMod' && (x.effect as { stat: string }).stat === 'vision')!
    expect(t).toBeDefined()
    expect((t.effect as { value: number }).value).toBeLessThan(0)
  })
})
