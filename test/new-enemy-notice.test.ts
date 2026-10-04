// viewer.new-enemy-notice (engine DECISIONS.md 2026-10-04 'the opening's tutorial: … new enemies are named …'). Andrew: "If a new
// enemy is introduced there is going to be a notification: \"New enemy\" and their name." — the first time a kind is met
// ("To first time"). The kingdom's half: the RUN remembers which enemy kinds have been met — in the Campaign's own `revealed`
// list (GAME-ARCHITECTURE.md §2.5: "what the tutorial has shown"), one reveal per kind, written through the mutator and saved
// with the run — and says which kinds a battle should announce: every enemy kind not yet met, less the ones that battle's
// own lesson introduces (battle 1's Zombie). A kind met is never announced again, in a later battle or a replayed one.
import { describe, it, expect } from 'vitest'
import { makeNewCampaign } from '../src/core/opening.js'
import { makeCtx } from '../src/core/mutate.js'
import { saveOf, campaignOf } from '../src/core/campaign.js'
import { canReveal, performReveal } from '../src/core/reveal.js'
import { ENEMY_KINDS, LESSON_INTRODUCES, enemyRevealOf, enemiesToAnnounce } from '../src/content/reveals.js'
import { runSaveOf, runOf } from '../src/ui/opening-run.js'
import { UNITS, ENCOUNTERS } from '../src/engine.js'

const ORPHANAGE = 'encounter.opening.orphanage', LUMBERJACK = 'encounter.opening.lumberjack', BRIDGE = 'encounter.opening.bridge'

describe('the run remembers which enemy kinds have been met', () => {
  it('a reveal is granted once, through the mutator, with its event; a second grant is refused', () => {
    const ctx = makeCtx(makeNewCampaign(1)), id = enemyRevealOf('unit.skeletal-archer')
    expect(id).toBe('reveal.enemy.skeletal-archer')
    expect(ctx.campaign.revealed).toEqual([]); expect(canReveal(ctx.campaign, id)).toBe(true)
    performReveal(ctx, id, 'test')
    expect(ctx.campaign.revealed).toEqual([id]); expect(canReveal(ctx.campaign, id)).toBe(false)
    expect(ctx.events.at(-1)).toMatchObject({ type: 'reveal.granted', causeId: 'test', revealId: id })
    expect(() => performReveal(ctx, id, 'test')).toThrow(/already/)
    expect(ctx.campaign.revealed).toEqual([id])
  })
  it('the met kinds are in the run\'s save: the Campaign\'s save keeps them, and so does the opening run\'s', () => {
    const ctx = makeCtx(makeNewCampaign(1))
    for (const k of ['unit.zombie', 'unit.skeletal-archer']) performReveal(ctx, enemyRevealOf(k), 'test')
    const back = campaignOf(saveOf(ctx.campaign))
    expect(back.revealed).toEqual(['reveal.enemy.zombie', 'reveal.enemy.skeletal-archer'])
    expect(runOf(runSaveOf(ctx.campaign, null)).campaign.revealed).toEqual(back.revealed)
  })
})

describe('which kinds a battle announces', () => {
  it('the kinds are the engine\'s enemy units, every one of them, and nothing else', () => {
    const enemies = Object.values(UNITS as Record<string, { typeId: string; side: string }>).filter((u) => u.side === 'enemy').map((u) => u.typeId).sort()
    expect([...ENEMY_KINDS]).toEqual(enemies)
    for (const k of ['unit.zombie', 'unit.skeletal-archer', 'unit.imp', 'unit.fire-imp', 'unit.bloodhound']) expect(ENEMY_KINDS).toContain(k)
  })
  it('battle 1\'s own lesson introduces the Zombie: it is not announced there; every other unmet kind is', () => {
    expect(LESSON_INTRODUCES[ORPHANAGE]).toEqual(['unit.zombie'])
    for (const id of Object.keys(LESSON_INTRODUCES)) expect(Object.keys(ENCOUNTERS)).toContain(id)
    const first = enemiesToAnnounce([], ORPHANAGE)
    expect(first).not.toContain('unit.zombie'); expect(first).toContain('unit.skeletal-archer')
    expect(enemiesToAnnounce([], LUMBERJACK)).toContain('unit.zombie')            // met nowhere yet: new in any other battle
    expect(enemiesToAnnounce([], undefined)).toEqual([...ENEMY_KINDS])
  })
  it('a kind met is not announced again — in the next battle, or the same battle replayed', () => {
    const ctx = makeCtx(makeNewCampaign(1))
    performReveal(ctx, enemyRevealOf('unit.zombie'), 'test')
    const second = enemiesToAnnounce(ctx.campaign.revealed, LUMBERJACK)
    expect(second).not.toContain('unit.zombie'); expect(second).toContain('unit.skeletal-archer'); expect(second).toContain('unit.soldier')
    performReveal(ctx, enemyRevealOf('unit.skeletal-archer'), 'test')
    const replayed = enemiesToAnnounce(ctx.campaign.revealed, LUMBERJACK)
    expect(replayed).not.toContain('unit.skeletal-archer'); expect(replayed).toContain('unit.soldier')
    expect(enemiesToAnnounce(ctx.campaign.revealed, BRIDGE)).toEqual(expect.arrayContaining(['unit.imp', 'unit.fire-imp']))
  })
})
