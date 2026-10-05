// fix.opening-draft-one-rule (engine queue, 2026-10-04): the kingdom's copy of the opening draft's rolling procedure
// (src/core/draft-modifiers.ts) goes, and the run calls the engine's through src/engine.ts. A run must show the same
// first-hero bonuses and the same later-draft offers for the same run seed. This freezes, BEFORE the change, what each
// offered hero would join as — at the first draft and at the draft after it — for the seeds the kingdom's draft tests
// play (11 is the page test's). Refuses to overwrite (flag wx).
//
// 2026-10-05, kingdom.first-hero-each-rolls-own-gifts (engine DECISIONS.md 'gifts: the word; each first-hero choice rolls its
// own; …' — Andrew: "Yeah, they each roll their own gifts."): the file frozen "before fix.opening-draft-one-rule" held the three
// first heroes on ONE shared roll, which the ruling ends, so what a run shows changed by rule. That file stays as it was
// frozen (test/fixtures/opening-draft-one-rule.json — the test still holds to it everything the ruling did not change). The
// same capture, run on the tree this item lands on, froze what a run shows from now on in
// test/fixtures/opening-draft-each-rolls-own.json (--as names what the capture is of).
// node ../engine/node_modules/tsx/dist/cli.mjs tools/capture-opening-draft-one-rule.mts --out test/fixtures/opening-draft-one-rule.json
import { writeFileSync } from 'node:fs'
import { makeNewCampaign, performAdvanceOpening, performDraft, listDraftOffers, draftedHeroOf } from '../src/core/opening.js'
import { makeCtx } from '../src/core/mutate.js'

const outAt = process.argv.indexOf('--out'), asAt = process.argv.indexOf('--as')
const sourceCommit = asAt >= 0 && process.argv[asAt + 1] ? process.argv[asAt + 1]! : 'before fix.opening-draft-one-rule'
if (outAt < 0 || !process.argv[outAt + 1]) throw new Error('supply --out path; never refresh a frozen expectation implicitly')
const SEEDS = [1, 2, 3, 5, 11, 15, 21, 42]
const handOf = (ctx: ReturnType<typeof makeCtx>) => listDraftOffers(ctx.campaign).map((row) => {
  const h = draftedHeroOf(ctx.campaign, row.id)
  return { id: row.id, badges: h.badges, itemSlots: h.itemSlots, drafted: h.drafted }
})
const runs = SEEDS.map((seed) => {
  const ctx = makeCtx(makeNewCampaign(seed))
  performAdvanceOpening(ctx, 'capture')
  const first = handOf(ctx)
  performDraft(ctx, first[0]!.id, 'capture')
  ctx.campaign.cursor.prologue = 2
  performAdvanceOpening(ctx, 'capture')
  const second = handOf(ctx)
  return { seed, first, second }
})
writeFileSync(process.argv[outAt + 1]!, JSON.stringify({ sourceCommit, note: 'draftedHeroOf for every offered hero at the first draft and (the first offer taken) at the draft after it, per run seed.', runs }, null, 1) + '\n', { flag: 'wx' })
console.log(`Captured ${runs.length} runs: ${runs.map((r) => `${r.seed}: ${r.first.length}+${r.second.length} offers`).join(' · ')}`)
