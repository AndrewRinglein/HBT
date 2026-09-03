// Walking the fixture — the probes' shared steps to the battle and through it. Not a probe itself.

import { readFileSync } from 'node:fs'
import { campaignOf, type CampaignState } from '../src/core/campaign.js'
import { makeCtx, setBattleOutcome, type Ctx } from '../src/core/mutate.js'
import { beginCombatPrep, performAdvancePrep, performDeploy, listDeployable } from '../src/core/prep.js'
import { makeBlankResult, withUnitFate, validateResult } from '../src/core/result.js'
import { resolveReckoning, type Reckoning } from '../src/core/reckoning.js'
import type { EngagementResult } from '../src/core/seam.js'
import { viewBattle } from '../src/view/battle.js'

/** The shipped fixture, optionally edited as plain data before it becomes a Campaign. */
export function loadFixture(edit?: (c: CampaignState) => void): Ctx {
  const c = campaignOf(readFileSync('fixtures/slice-prep.json', 'utf8'))
  edit?.(c)
  return makeCtx(c)
}

/** Walk prep to the battle step with `n` heroes deployed. */
export function toBattle(ctx: Ctx, n = 4): Ctx {
  beginCombatPrep(ctx, 'test'); performAdvancePrep(ctx, 'test'); performAdvancePrep(ctx, 'test')
  for (const h of listDeployable(ctx.campaign).slice(0, n)) performDeploy(ctx, h, 'test')
  performAdvancePrep(ctx, 'test'); performAdvancePrep(ctx, 'test')
  return ctx
}

/** A panel-built result for the battle on the cursor: won (every enemy dead) or lost (every hero downed). */
export function panelResult(ctx: Ctx, won: boolean, extra?: (r: EngagementResult) => EngagementResult): EngagementResult {
  const e = ctx.campaign.cursor.engagement!
  const v = viewBattle(ctx.campaign)
  const heroes = v.units.filter((u) => u.side === 'hero').map((u) => ({ typeId: u.typeId, name: u.name }))
  const enemies = v.units.filter((u) => u.side === 'enemy').map((u) => ({ typeId: u.typeId, name: u.name }))
  let r = makeBlankResult(e.id, won ? 'heroClear' : 'wipe', heroes, enemies)
  if (won) enemies.forEach((_, i) => { r = withUnitFate(r, 'enemy', i, { lifeState: 'dead' }) })
  else heroes.forEach((_, i) => { r = withUnitFate(r, 'hero', i, { lifeState: 'downed' }) })
  r = { ...r, turns: 6, heroPhases: 6, enemyPhases: 5 }
  if (extra) r = extra(r)
  return validateResult(r, { heroes: heroes.length, enemies: enemies.length, id: e.id })
}

/** Set a result and its proposal on the cursor; return both. */
export function decide(ctx: Ctx, r: EngagementResult, edit?: (k: Reckoning) => Reckoning): { result: EngagementResult; reckoning: Reckoning } {
  const e = ctx.campaign.cursor.engagement!
  let k = resolveReckoning(ctx.campaign, e, r)
  if (edit) k = edit(k)
  setBattleOutcome(ctx, r, k, 'test')
  return { result: r, reckoning: k }
}

/** Walk prep to the Equip step with `n` heroes deployed (reveal → council → deploy → equip). */
export function toEquip(ctx: Ctx, who: number | readonly string[] = 4): Ctx {
  beginCombatPrep(ctx, 'test'); performAdvancePrep(ctx, 'test'); performAdvancePrep(ctx, 'test')
  const picks = typeof who === 'number' ? listDeployable(ctx.campaign).slice(0, who) : who
  for (const h of picks) performDeploy(ctx, h, 'test')
  performAdvancePrep(ctx, 'test')
  return ctx
}
