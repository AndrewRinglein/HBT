// The cold-start run, played. See tools/slice-run.mjs for the contract.
//
// Every choice is src/sim/autoplay.ts's dullest default — the first offer,
// the first three deployable, a win — EXCEPT the War Council, which is skipped
// every time: tactics are §8's, and a run that leaned on a placeholder tactic
// would be proving the wrong thing. What the run proves is the MACHINE: that
// the Week turns, battles are fought and written, Renown climbs, and the
// Charter opens — with no hand on the wheel.

import { makeCtx, type KingdomEvent } from '../src/core/mutate.js'
import { KINGDOM_EVENTS } from '../src/core/events.js'
import { makeNewCampaign } from '../src/core/opening.js'
import { playOpening, playStage, DEFAULTS, type Decisions } from '../src/sim/autoplay.js'
import { FIRST_ARTICLE_AT } from '../src/content/charter.js'
import { REALM } from '../src/content/territories.js'
import { saveOf, campaignOf } from '../src/core/campaign.js'
import { crucibleBadgeOf } from '../src/content/crucible.js'

const args = process.argv.slice(2)
const val = (k: string, d: string) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1]! : d }
const seed = Number(val('--seed', '1'))
const until = val('--until', 'article-1')
const maxWeeks = Number(val('--weeks', '60'))
const asserts = args.flatMap((a, i) => (a === '--assert' ? [args[i + 1]!] : []))
if (until !== 'article-1') { console.error(`slice-run: unknown --until '${until}' — only article-1 exists`); process.exit(2) }

const fail = (msg: string): never => { console.error(`slice-run: FAIL — ${msg}`); process.exit(1) }

const d: Partial<Decisions> = { tactic: () => null }
const ctx = makeCtx(makeNewCampaign(seed))
playOpening(ctx, d, 'slice-run')
if (ctx.campaign.ended) fail(`the opening ended the Campaign in week ${ctx.campaign.ended.week}: ${ctx.campaign.ended.reason}`)
const openingBattles = ctx.events.filter((e) => e.type === 'engagement.resolved').length
console.log(`seed ${seed}: opening done — ${openingBattles} battles, ${Object.keys(ctx.campaign.roster).length} on the roster, Week ${ctx.campaign.week}`)

// the terminus: the first Article — Renown reaches the threshold and an Article is bought
const articleBought = () => ctx.events.some((e) => e.type === 'unlock.purchased' && e['tier'] === 'article')
let stages = 0
const wins = () => ctx.events.filter((e) => e.type === 'engagement.resolved' && e['won'] === true).length
while (!articleBought()) {
  if (ctx.campaign.ended) fail(`the Campaign ended in week ${ctx.campaign.ended.week}: ${ctx.campaign.ended.reason}`)
  if (ctx.campaign.week > maxWeeks) fail(`Week ${maxWeeks} passed and Renown is ${ctx.campaign.renown} (needs ${FIRST_ARTICLE_AT}) — ${wins()} wins, the machine is not paying out`)
  const before = ctx.campaign.week
  playStage(ctx, { ...DEFAULTS, ...d }, 'slice-run')
  if (++stages > maxWeeks * 12) fail('the Week is not advancing')
  if (ctx.campaign.week !== before) {
    const w = ctx.campaign.week - 1
    const weekEvents = ctx.events.filter((e) => e['week'] === w || String(e['engagementId'] ?? '').endsWith(`week-${w}`))
    const fought = weekEvents.filter((e) => e.type === 'engagement.resolved')
    console.log(`  Week ${String(w).padStart(2)}: ${fought.length ? fought.map((e) => `${String(e['kind']).replace('engagement.', '')} ${e['won'] ? 'won' : 'lost'}`).join(', ') : 'no battle'} · renown ${ctx.campaign.renown} · purse ${Object.entries(ctx.campaign.purse).map(([k, v]) => `${k.replace('currency.', '')} ${v}`).join(' ')}`)
  }
}
const battles = ctx.events.filter((e) => e.type === 'engagement.resolved').length
const article = ctx.events.find((e) => e.type === 'unlock.purchased' && e['tier'] === 'article')!
console.log(`seed ${seed}: the first Article — ${article['unlockId']} — at Week ${ctx.campaign.week}, after ${battles} battles (${wins()} won), Renown ${ctx.campaign.renown}`)

// the save survives a round trip at the terminus
campaignOf(saveOf(ctx.campaign))

if (asserts.includes('no-out-systems')) {
  // THIN-SLICE-IMPLEMENTATION.md §8, each as something the run's log or state
  // would show if the system had been leaned on
  const events = ctx.events as KingdomEvent[]
  const json = JSON.stringify(events)
  const problems: string[] = []
  const known = new Set<string>(KINGDOM_EVENTS)
  const strange = [...new Set(events.map((e) => e.type).filter((t) => !known.has(t)))]
  if (strange.length) problems.push(`events outside the strategic vocabulary: ${strange.join(', ')}`)
  if (/"card\./.test(json)) problems.push('the Hand: a card.* id appears in the log')
  if (events.some((e) => e.type === 'council.taken' && e['tacticId'] !== null)) problems.push('tactics: a tactic was taken')
  if (/doom/i.test(json)) problems.push('Doom appears in the log')
  if (Object.values(ctx.campaign.roster).some((h) => h.corruption !== 0)) problems.push('corruption moved')
  // Law 10, 2026-10-03 (kingdom.opening-draft-modifiers; engine DECISIONS.md 2026-09-28 'the first hero: Leadership …; the
  // draft offers three with the Crucible's modifiers'): was
  //   if (/badge\.(exhausted|fatigue|mark|scar|injur)/.test(json)) problems.push('fatigue, Marks or injuries appear in the log')
  // The draft now says the badges each hero joins with (hero.drafted), and two of the Crucible's rollable badges begin as
  // those words do — the Marksman and Scarred Hide, positive draft badges, neither a Mark nor an injury. The check is the
  // same check over every badge id in the log, less the badges the draft itself rolls (src/content/crucible.ts): an
  // exhausted, fatigue, Mark, scar or injury badge from any other system still fails the run, and is now named.
  const leaned = [...new Set(json.match(/badge\.(exhausted|fatigue|mark|scar|injur)[a-z0-9.-]*/g) ?? [])].filter((id) => !crucibleBadgeOf(id))
  if (leaned.length) problems.push(`fatigue, Marks or injuries appear in the log: ${leaned.join(', ')}`)
  if (ctx.campaign.captured.length || /hero\.captured|rescue\.begun/.test(json)) problems.push('captured/rescue was used')
  if (ctx.campaign.realm !== REALM) problems.push(`realm is ${ctx.campaign.realm}, not ${REALM} — Shadows or Skyship crept in`)
  if (events.some((e) => e.type === 'legacy.unlocked')) problems.push('the Legacy tree did something')
  if (events.some((e) => e.type === 'hero.died' && !e['heroId'])) problems.push('Succession: a leader death without a hero')
  if (problems.length) fail(`OUT systems were leaned on — ${problems.join('; ')}`)
  console.log(`seed ${seed}: no OUT system was leaned on (${events.length} events, ${known.size} words)`)
}
