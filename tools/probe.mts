// Gate 1 for a kingdom VARIANT, mechanised: does this id appear in a real run,
// and did it do anything? The engine's tools/probe.mts, at this altitude.
//
//   node ../engine/node_modules/tsx/dist/cli.mjs tools/probe.mts test.tactic.forced-march
//
// A "run" is whatever machinery exists: today, the shipped fixture walked
// through Combat Prep, the battle decided by the panel's constructors, and the
// Reckoning applied — once per Engagement kind row, won and lost, over a
// handful of Engagement ids so a drawn row has several chances to be offered.
// The Week machine (M5) widens this to whole Weeks. Three verdicts, and the log
// tells them apart — never appears (not wired in), appears but changed nothing
// (consulted), or acted.

import { readFileSync } from 'node:fs'
import { campaignOf } from '../src/core/campaign.js'
import { makeCtx, setBattleOutcome, type KingdomEvent } from '../src/core/mutate.js'
import { beginCombatPrep, performAdvancePrep, listCouncilOptions, performCouncil, performDeploy, listDeployable } from '../src/core/prep.js'
import { makeBlankResult, withUnitFate, validateResult } from '../src/core/result.js'
import { resolveReckoning, applyBattleResult, performExitBattle } from '../src/core/reckoning.js'
import { viewBattle } from '../src/view/battle.js'
import { ENGAGEMENT_KINDS, engagementKindOf } from '../src/content/engagements.js'

const id = process.argv[2]
if (!id) { console.error('usage: probe <id>'); process.exit(2) }

/** Events that mean the id DID something, not merely appeared in an offer or a view. */
const ACTED = new Set(['council.taken', 'hero.committed', 'hero.released', 'cursor.moved',
  'battle.decided', 'engagement.resolved', 'territory.claimed', 'territory.lost', 'resource.gained', 'xp.gained', 'hero.wounded', 'hero.died', 'renown.gained'])

let mentions = 0, acted = 0, runs = 0
for (const kind of ENGAGEMENT_KINDS) for (const won of [true, false]) for (let seed = 1; seed <= 4; seed++) {
  const ctx = makeCtx(campaignOf(readFileSync('fixtures/slice-prep.json', 'utf8')))
  const e = ctx.campaign.cursor.engagement!
  e.kind = kind.id
  e.id = `${e.id}.probe-${seed}`
  // a fixed-roster kind (a quest) was committed Weeks ago: the fixture stands in for that
  if (engagementKindOf(kind.id).rosterFixed) e.deployed = Object.keys(ctx.campaign.roster).sort().slice(0, 3)
  beginCombatPrep(ctx, 'probe')
  performAdvancePrep(ctx, 'probe')
  const offered = listCouncilOptions(ctx.campaign).find((t) => t.id === id)
  performCouncil(ctx, offered ? offered.id : null, 'probe')
  performAdvancePrep(ctx, 'probe')
  if (!engagementKindOf(kind.id).rosterFixed) for (const h of listDeployable(ctx.campaign).slice(0, 2)) performDeploy(ctx, h, 'probe')
  performAdvancePrep(ctx, 'probe')
  performAdvancePrep(ctx, 'probe')
  const v = viewBattle(ctx.campaign)
  const heroes = v.units.filter((u) => u.side === 'hero').map((u) => ({ typeId: u.typeId, name: u.name }))
  const enemies = v.units.filter((u) => u.side === 'enemy').map((u) => ({ typeId: u.typeId, name: u.name }))
  let r = makeBlankResult(e.id, won ? 'heroClear' : 'wipe', heroes, enemies)
  if (won) enemies.forEach((_, i) => { r = withUnitFate(r, 'enemy', i, { lifeState: 'dead' }) })
  else heroes.forEach((_, i) => { r = withUnitFate(r, 'hero', i, { lifeState: 'downed' }) })
  r = validateResult({ ...r, turns: 5, heroPhases: 5, enemyPhases: 4 })
  const k = resolveReckoning(ctx.campaign, e, r)
  setBattleOutcome(ctx, r, k, 'probe')
  applyBattleResult(ctx, e, r, k)
  performExitBattle(ctx, 'probe')
  runs++
  for (const ev of ctx.events as KingdomEvent[]) {
    if (!JSON.stringify(ev).includes(id)) continue
    mentions++
    if (ACTED.has(ev.type)) acted++
  }
}

if (mentions === 0) { console.log(`${id}: never appears in any run — not wired in`); process.exit(1) }
if (acted === 0) { console.log(`${id}: appears ${mentions}× but never acted — offered and never taken, or a row nothing reads`); process.exit(1) }
console.log(`${id}: live — ${mentions} mention(s), ${acted} acted, across ${runs} runs`)
