// fix.opening-levels (engine, 2026-10-02) — the kingdom's half: the engine's opening party carried through the opening by
// the kingdom's rules (src/sim/opening-run.ts). Ruled 2026-09-28 (Andrew, engine/DECISIONS.md 'the opening's party levels
// up; the Flaming Longsword is a Warrior's or a Paladin's; the Bridge gives a reward', 'levels by XP at 20, 50, 100, 170,
// 270, 400', 'the Orphanage pays 20 XP no matter what').
// Expect: "kingdom LEVEL_THRESHOLDS reads 20, 50, 100, 170, 270, 400 and GLOSSARY.md's row matches; each opening position
// fields each hero at the level its XP from the earlier battles of the same replicate reaches; the Flaming Longsword is
// held only by a class.warrior or class.paladin hero, and by nobody when neither is drafted; from the Cavern Trail on one
// hero carries the Bridge's reward; the same replicate gives the same party, levels and rewards."
// Run by the engine's test/opening-levels.test.ts too (the count of tests here is asserted there).
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { runOpening, levelReached, MAX_ATTEMPTS } from '../src/sim/opening-run.js'
import { battleXpOf, killXpOf, MVP_XP } from '../src/core/reckoning.js'
import { resolveRewardDraw } from '../src/core/rewards.js'
import { makeNewCampaign } from '../src/core/opening.js'
import { LEVEL_THRESHOLDS } from '../src/content/levels.js'
import { encounterRewardOf } from '../src/content/encounter-rewards.js'
import { OPENING_TAKERS, openingPartyOf, UNITS } from '../src/engine.js'

const ORPHANAGE = 'encounter.opening.orphanage', LUMBERJACK = 'encounter.opening.lumberjack', BRIDGE = 'encounter.opening.bridge'
const SWORD = 'item.longsword.flaming'
const classOf = (id: string) => (UNITS[id]!.tags ?? []).find((t) => t.startsWith('class.'))!
/** A replicate whose engine party wins the Bridge within the replays (tools/opening-levels.mts lists them). */
// Replicate 4: the first that keeps the Bridge's reward (tools/opening-levels.mts over 50, 2026-10-02: 4, 5, 7, 15, 24, 36, 45).
const BRIDGE_WON = 4

describe('fix.opening-levels — the opening carried by the kingdom\'s rules', () => {
  it('the curve is the ruled one, GLOSSARY.md says the same, and every level owed is taken', () => {
    expect(LEVEL_THRESHOLDS.slice(2)).toEqual([20, 50, 100, 170, 270, 400])
    const glossary = readFileSync(new URL('../../GLOSSARY.md', import.meta.url), 'utf8')
    expect(glossary.split('\n').find((l) => l.startsWith('| Level thresholds |'))).toContain('**20 · 50 · 100 · 170 · 270 · 400**')
    expect([0, 19, 20, 49, 50, 99, 100, 169, 170, 269, 270, 399, 400, 5000].map((x) => levelReached(x))).toEqual([1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7])
  })

  it('each battle pays the XP of its own result — the Orphanage its 20, the Lumberjack the speed bonus and the kills — and the next battle fields the level it reaches', () => {
    const run = runOpening(1, 3)
    const [orph, lumb, bridge] = run.battles
    expect(orph!.encounterId).toBe(ORPHANAGE)
    expect(orph!.levels).toEqual([1])
    for (const a of orph!.attempts) expect(a.xp).toEqual(battleXpOf(ORPHANAGE, a.result).map((p) => (p.dead ? 0 : 20)))
    expect(orph!.xpOut).toEqual([20])
    expect(lumb!.xpIn).toEqual([20, 0, 0])
    expect(lumb!.levels).toEqual([2, 1, 1])
    const won = lumb!.attempts.at(-1)!
    expect(won.outcome).toBe('heroClear')
    const heroRows = won.result.units.filter((u) => u.side === 'hero' && u.role === undefined)
    const paid = heroRows.map((u) => (u.lifeState === 'dead' ? 0 : Math.max(0, 15 - won.result.enemyPhases) + killXpOf(u)))
    expect(battleXpOf(LUMBERJACK, won.result).map((p) => p.xp)).toEqual(paid)
    expect(won.xp).toEqual(paid.map((x, i) => x + (won.mvp === i ? MVP_XP : 0)))
    expect(won.mvp).not.toBeNull()
    expect(lumb!.xpOut).toEqual(lumb!.xpIn.map((x, i) => x + won.xp[i]!))
    expect(bridge!.xpIn).toEqual([...lumb!.xpOut, 0])
    expect(bridge!.levels).toEqual(bridge!.xpIn.map((x) => levelReached(x)))
    // what the battle fielded is the engine's party with those levels
    const party = openingPartyOf(3, 1, { levels: bridge!.levels, items: bridge!.items })
    expect(party.heroes).toEqual(bridge!.heroes)
    expect(party.heroProgress.map((p) => p?.level ?? 1)).toEqual(bridge!.levels)
  }, 300_000)

  it('the Flaming Longsword goes to the first Warrior or Paladin drafted, and to nobody when neither is: the reward row\'s takers are the engine\'s', () => {
    expect(encounterRewardOf(LUMBERJACK)!.offer).toEqual({ kind: 'item', itemId: SWORD, takers: OPENING_TAKERS[SWORD] })
    let withTaker = 0, without = 0
    for (let r = 0; r < 40 && (withTaker < 2 || without < 1); r++) {
      const heroes = openingPartyOf(2, r).heroes
      const takers = heroes.filter((id) => OPENING_TAKERS[SWORD]!.includes(classOf(id)))
      if (takers.length ? withTaker >= 2 : without >= 1) continue
      const lumb = runOpening(r, 2).battles[1]!
      if (!lumb.won) continue
      if (takers.length) {
        withTaker++
        expect(lumb.reward, `replicate ${r}`).toMatchObject({ itemId: SWORD, holder: heroes.indexOf(takers[0]!) })
      } else {
        without++
        expect(lumb.reward, `replicate ${r}`).toBeNull()
      }
    }
    expect([withTaker, without]).toEqual([2, 1])
  }, 300_000)

  it("the Bridge's reward is one of the three drawn cards, kept on a hero, and carried from the Cavern Trail on; a lost battle is fought again", () => {
    const run = runOpening(BRIDGE_WON, 4)
    const bridge = run.battles[2]!, cavern = run.battles[3]!
    expect(bridge.encounterId).toBe(BRIDGE)
    expect(bridge.won).toBe(true)
    expect(bridge.attempts.length).toBeLessThanOrEqual(MAX_ATTEMPTS)
    expect(bridge.attempts.slice(0, -1).every((a) => a.outcome !== 'heroClear')).toBe(true)
    expect(bridge.reward!.offered).toEqual(resolveRewardDraw(makeNewCampaign(BRIDGE_WON), BRIDGE))
    expect(bridge.reward!.offered).toHaveLength(3)
    expect(bridge.reward!.offered).toContain(bridge.reward!.itemId)
    expect(cavern.items[bridge.reward!.holder]).toContain(bridge.reward!.itemId)
    expect(cavern.items.filter((l) => l?.includes(bridge.reward!.itemId))).toHaveLength(1)
  }, 600_000)

  it('the same replicate gives the same party, battles, levels and rewards', () => {
    const a = runOpening(1, 2), b = runOpening(1, 2)
    expect(JSON.stringify(b)).toBe(JSON.stringify(a))
    expect(runOpening(2, 1).battles[0]!.heroes).not.toEqual(a.battles[0]!.heroes)
  }, 300_000)
})
