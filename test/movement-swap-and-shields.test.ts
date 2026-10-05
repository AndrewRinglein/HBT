// movement.swap-and-shields (engine DECISIONS.md 2026-10-01 'the movements': "weapon swap and shield actions are part of
// what's needed now"). The engine has both — the swap (v2.loadout-swap) and the shield powers (v2.shields); this asks that
// they are PLAYED in a sandbox battle on the board: the swap from the action bar before the primary (its cost paid, the
// hands to hold chosen, a second one refused on the bar), and each of the three shields' two powers clicked on the bar,
// each named in the battle log on the screen. The kingdom builds BATTLE-SANDBOX.html into its scratch folder and
// ../kingdom/tools/swap-shields.verify.mjs plays it through the built page's own DOM (the viewer's bar, figures and
// buttons); this reads its record. The engine's own numbers are asked here: swapCostOf and each power's staminaCost.
// Imports no kingdom code.
import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { createCustomBattle } from '../src/core/setup.js'
import { swapCostOf } from '../src/core/swap.js'
import { ACTIONS, ITEMS } from '../src/content/index.js'

type Power = { hero: string, id: string, turn: number, onBar: boolean, used: boolean, name: string | null, stamina: number | null, logNamed: boolean, note: string | null }
type Record = {
  swap: { hero: string, noSwapWhileChoosing: boolean, handsBefore: string[], offered: string[], costText: string, staminaBefore: number, staminaAfter: number,
    event: { stamina: number, handsAfter: string[] } | null, handsAfter: string[], stowed: string[], shieldPowersOnBarAfter: boolean,
    refused: { why: string | null, offered: string[], took: boolean, swapped: boolean }, logNamed: boolean },
  back: { offered: boolean, stowedBefore: string[], handsAfter: string[], staminaBefore: number, staminaAfter: number, event: { stamina: number } | null },
  powers: Power[],
}
const record = (): Record => {
  mkdirSync('../kingdom/scratch', { recursive: true })
  execFileSync(process.execPath, ['tools/build-sandbox.mjs', 'scratch/swap-shields.html'], { cwd: '../kingdom', stdio: 'pipe' })
  return JSON.parse(execFileSync(process.execPath, ['tools/swap-shields.verify.mjs', 'scratch/swap-shields.html'], { cwd: '../kingdom', encoding: 'utf8', maxBuffer: 1 << 26 }))
}
// Law 10, 2026-10-04 — content.shields-reauthored (engine item; engine DECISIONS.md 2026-09-28 'counterattack, special free attacks, the opening six, shields, custom weapons' and the Armory Ledger approved that day): the six powers were typed here by id
//   ['hero.base.paladin-hunk', 'power.kite-shield.shield-wall'], […, 'power.kite-shield.raise-guard'], ['hero.base.priest-armored',
//   'power.round-shield.turn-aside'], […, 'power.round-shield.brace'], ['hero.base.warrior-iron', 'power.tower-shield.cover'], […, 'power.tower-shield.stand-tall']
// and the Ledger replaced them. Each hero's are the two powers its shield's row grants, in the row's order.
const SHIELD_POWERS: [string, string][] = ([['hero.base.paladin-hunk', 'item.kite-shield'], ['hero.base.priest-armored', 'item.round-shield'], ['hero.base.warrior-iron', 'item.tower-shield']] as const)
  .flatMap(([hero, shield]) => ITEMS[shield]!.abilities.map((p): [string, string] => [hero, p]))

describe('the swap and the shield powers, played on the board of a sandbox battle', () => {
  const r = record()
  // the engine's own swap cost for a hero that carries no swapCost modifier (COMBAT-V2 §11.2: "swapCost is a stat, default 1")
  const ctx = createCustomBattle([{ type: 'hero.base.paladin-hunk', hex: 85 }], [{ type: 'unit.zombie', hex: 200 }])
  const cost = swapCostOf(ctx, ctx.state.units[0]!)

  it('the swap is on the action bar once the hero acts, offering the hands to hold and the engine\'s cost', () => {
    expect(r.swap.noSwapWhileChoosing).toBe(true)
    expect(r.swap.handsBefore).toEqual(['item.longsword', 'item.kite-shield'])
    expect(r.swap.offered).toEqual(['Nothing in hand', 'Longsword', 'Kite Shield'])
    expect(r.swap.costText).toBe(`${cost} stamina`)
  })
  it('swapping from the bar before the primary: stamina drops by swapCost, loadout.swapped, the shield stowed and its powers gone', () => {
    expect(r.swap.event).toEqual({ stamina: cost, handsAfter: ['item.longsword'] })
    expect(r.swap.staminaBefore - r.swap.staminaAfter).toBe(cost)
    expect(r.swap.handsAfter).toEqual(['item.longsword'])
    expect(r.swap.stowed).toEqual(['item.kite-shield'])
    expect(r.swap.shieldPowersOnBarAfter).toBe(false)
    expect(r.swap.logNamed).toBe(true)
  })
  it('a second swap in the activation is refused on the bar, with the engine\'s reason', () => {
    expect(r.swap.refused.offered).toEqual([])
    expect(r.swap.refused.why).toMatch(/swap of this activation is spent/)
    expect(r.swap.refused.took).toBe(false)
    expect(r.swap.refused.swapped).toBe(false)
  })
  it('the next activation, the shield stowed, the swap takes both back into hand', () => {
    expect(r.back.offered).toBe(true)
    expect(r.back.handsAfter).toEqual(['item.longsword', 'item.kite-shield'])
    expect(r.back.event).toEqual({ stamina: cost })
    expect(r.back.staminaBefore - r.back.staminaAfter).toBe(cost)
  })
  it('every shield power of the three shields is on the bar, used from it, paid for, and named in the battle log', () => {
    expect(r.powers.map((p) => [p.hero, p.id])).toEqual(SHIELD_POWERS)
    for (const p of r.powers) {
      const def = ACTIONS[p.id]!
      expect(p.onBar, p.id).toBe(true)
      expect(p.used, p.id).toBe(true)
      expect(p.name, p.id).toBe(def.name)
      expect(p.stamina, p.id).toBe(def.staminaCost)
      expect(p.logNamed, p.id).toBe(true)
    }
    // Law 10, 2026-10-04 (the note above): the six names are the rows' own (was: new Set(['Lock Shields', 'Raise Guard', 'Turn Aside', 'Bear Down', 'Cover', 'Stand Tall']))
    expect(SHIELD_POWERS).toHaveLength(6)
    expect(new Set(r.powers.map((p) => p.name))).toEqual(new Set(SHIELD_POWERS.map(([, p]) => ACTIONS[p]!.name)))
  })
}, 170000)
