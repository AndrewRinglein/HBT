// kingdom.gift-roll-leaves-out-own-badges (2026-10-05): a hero's own badges are left out of its gift roll, which changes some
// of a run's offers. This freezes, BEFORE the change, the first-hero offers of run seeds 0-199 — each of the three offered
// heroes' badges as the draft gives them — and counts the offers, there and at the second draft (the first hero taken being
// the offer's seed-mod-3rd), that hold a badge the hero's own row already has. Refuses to overwrite (flag wx).
// node ../engine/node_modules/tsx/dist/cli.mjs tools/capture-gift-roll-own-badges.mts --out test/fixtures/gift-roll-own-badges-before.json
import { writeFileSync } from 'node:fs'
import { makeNewCampaign, performAdvanceOpening, performDraft, performOpeningStraightIn, performResolvePrologue, listDraftOffers, draftedHeroOf } from '../src/core/opening.js'
import { makeCtx, setCursor } from '../src/core/mutate.js'
import { heroRowOf } from '../src/content/heroes.js'
import { ABBOTOWN_MAP } from '../src/content/conquest.js'
import { UNITS, encounterDef } from '../src/engine.js'

const outAt = process.argv.indexOf('--out')
if (outAt < 0 || !process.argv[outAt + 1]) throw new Error('supply --out path; never refresh a frozen expectation implicitly')
const ownOf = (id: string): string[] => [...((UNITS[heroRowOf(id).unitType] as { badges?: readonly string[] }).badges ?? []), ...heroRowOf(id).badges]
const first: Record<string, string[]>[] = []
let firstDoubled = 0, secondDoubled = 0
const who: Record<string, number> = {}
for (let seed = 0; seed < 200; seed++) {
  const ctx = makeCtx(makeNewCampaign(seed)); performAdvanceOpening(ctx, 'capture')
  const row: Record<string, string[]> = {}
  for (const h of listDraftOffers(ctx.campaign)) { const badges = draftedHeroOf(ctx.campaign, h.id).drafted!.badges; row[h.id] = [...badges]
    if (badges.some((b) => ownOf(h.id).includes(b))) { firstDoubled++; who['first ' + h.id] = (who['first ' + h.id] ?? 0) + 1 } }
  first.push(row)
  const id = ABBOTOWN_MAP.sections[0]!.encounterId
  performDraft(ctx, listDraftOffers(ctx.campaign)[seed % 3]!.id, 'capture')
  performOpeningStraightIn(ctx, { id, mapId: encounterDef(id).mapId!, kind: ABBOTOWN_MAP.engagementKind }, 'capture')
  setCursor(ctx, { step: 'open', engagement: null, prepStep: null, battle: null, equipSession: null }, 'capture')
  performResolvePrologue(ctx, true, 'capture', true)
  performAdvanceOpening(ctx, 'capture')
  for (const h of listDraftOffers(ctx.campaign)) if (draftedHeroOf(ctx.campaign, h.id).drafted!.badges.some((b) => ownOf(h.id).includes(b))) { secondDoubled++; who['second ' + h.id] = (who['second ' + h.id] ?? 0) + 1 }
}
writeFileSync(process.argv[outAt + 1]!, JSON.stringify({ note: 'run seeds 0-199: the three first-hero offers\' badges as the draft gave them before kingdom.gift-roll-leaves-out-own-badges; firstDoubled / secondDoubled: offers of the first and the second draft (600 each) that held a badge the hero\'s own row has.', first, firstDoubled, secondDoubled }) + '\n', { flag: 'wx' })
console.log(`froze 200 seeds; offers holding a badge of the hero's own: ${firstDoubled} of 600 at the first draft, ${secondDoubled} of 600 at the second`, JSON.stringify(who))
