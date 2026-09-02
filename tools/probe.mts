// Gate 1 for a kingdom VARIANT, mechanised: does this id appear in a real run,
// and did it do anything? The engine's tools/probe.mts, at this altitude.
//
//   node ../engine/node_modules/tsx/dist/cli.mjs tools/probe.mts test.tactic.forced-march
//
// A "run" is whatever machinery exists: today, Combat Prep on the shipped
// fixture, walked for a handful of Engagement ids so a drawn row has several
// chances to be offered. The Week machine (M5) widens this to whole Weeks.
// Three verdicts, and the log tells them apart — never appears (not wired in),
// appears but changed nothing (consulted), or acted.

import { readFileSync } from 'node:fs'
import { campaignOf } from '../src/core/campaign.js'
import { makeCtx, type KingdomEvent } from '../src/core/mutate.js'
import { beginCombatPrep, performAdvancePrep, listCouncilOptions, performCouncil, performDeploy, listDeployable } from '../src/core/prep.js'

const id = process.argv[2]
if (!id) { console.error('usage: probe <id>'); process.exit(2) }

/** Events that mean the id DID something, not merely appeared in an offer. */
const ACTED = new Set(['council.taken', 'hero.committed', 'hero.released', 'cursor.moved'])

let mentions = 0, acted = 0
const runs: KingdomEvent[][] = []
for (let seed = 1; seed <= 8; seed++) {
  const ctx = makeCtx(campaignOf(readFileSync('fixtures/slice-prep.json', 'utf8')))
  const e = ctx.campaign.cursor.engagement!
  e.id = `${e.id}.probe-${seed}`
  beginCombatPrep(ctx, 'probe')
  performAdvancePrep(ctx, 'probe')
  const offered = listCouncilOptions(ctx.campaign).find((t) => t.id === id)
  performCouncil(ctx, offered ? offered.id : null, 'probe')
  performAdvancePrep(ctx, 'probe')
  for (const h of listDeployable(ctx.campaign).slice(0, 2)) performDeploy(ctx, h, 'probe')
  performAdvancePrep(ctx, 'probe')
  performAdvancePrep(ctx, 'probe')
  runs.push(ctx.events)
  for (const ev of ctx.events) {
    if (!JSON.stringify(ev).includes(id)) continue
    mentions++
    if (ACTED.has(ev.type)) acted++
  }
}

if (mentions === 0) { console.log(`${id}: never appears in any run — not wired in`); process.exit(1) }
if (acted === 0) { console.log(`${id}: appears ${mentions}× but never acted — offered and never taken, or a row nothing reads`); process.exit(1) }
console.log(`${id}: live — ${mentions} mention(s), ${acted} acted, across ${runs.length} runs`)
