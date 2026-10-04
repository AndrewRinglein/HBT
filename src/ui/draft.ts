// The draft screen — the opening's draft. Moved here from slice.ts (kingdom.opening-loop-three) so SLICE.html and the
// sandbox's Retaking Abbotown sitting show the one screen. Renders from read-models; each offer carries data-act="draft"
// data-id, and data-classes for its classes; the host binds them.
//
// kingdom.opening-draft-modifiers (2026-10-03) — two screens in one, as ruled:
//   · THE FIRST HERO (Andrew, 2026-10-03, engine/DECISIONS.md 'the opening run, audited': "the first hero is chosen from
//     3, but no stats or badges shown, just a description."): who each of the three is — the name, the class, the codex's
//     own words about it — and nothing else: no number, no badge, no kit. What the chosen one gets (Leadership, a
//     positive badge, +2 Health, a stat point) is on it from the pick on, and is not shown before it.
//   · EVERY LATER DRAFT (Andrew, 2026-09-28, 'the first hero: Leadership …; the draft offers three with the Crucible's
//     modifiers': "You get your choice of one of three heroes. Those heroes had randomized modifiers applied to them, and
//     typically you would pick the best one."): each of the three AS IT WOULD JOIN — its stats as the battle would field
//     them (the engine's own preview, seam.ts fieldedPreviewOf) with a ± where its modifiers moved them off its row, the
//     stat points it rolled, and its badges with what each does. The player sees them to pick the best (kingdom
//     SWITCHES.md openingLaterDraftShown). Each offer also carries them as data: data-stats, data-rolls, data-badges.
// Until 2026-10-03 every draft was the first kind with a kit line ("a stat-less draft of one hero from three",
// GAME-ARCHITECTURE.md §2.5) and the heroes joined as bare rows.
import type { CampaignState, Hero } from '../core/campaign.js'
import { listDraftOffers, draftsOwedOf, draftedCountOf, draftedHeroOf } from '../core/opening.js'
import { fieldedPreviewOf } from '../core/seam.js'
import { UNKITTED_HEROES, heroDescriptionOf, type HeroRow, type UnkittedHero } from '../content/heroes.js'
import { CRUCIBLE, crucibleBadgeOf, crucibleStatOf } from '../content/crucible.js'
import { statLabelOf } from '../content/stat-labels.js'
import { BADGES, type UnitDef } from '../engine.js'

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!))
const sign = (n: number) => `${n > 0 ? '+' : ''}${n}`
const classesOf = (h: HeroRow) => h.classes.map((x) => x.replace('class.', '')).join(', ')

/**
 * The stats a later draft shows, by the engine's names: every stat a Crucible point or badge can move and the battle
 * fields (the stat pool's words in the engine's names, in the pool's order, then any other stat a rollable badge's
 * engine row moves), then Item Slots — the campaign's own.
 */
const SLOTS = 'itemSlots'
const DRAFT_STATS: readonly string[] = [...new Set([...CRUCIBLE.statPool.map(crucibleStatOf), ...[...CRUCIBLE.favourable, ...CRUCIBLE.flawed].flatMap((b) => Object.keys(BADGES[b.id]?.statModifiers ?? {}))])].filter((k) => k !== SLOTS)
const PCT = new Set(['accuracy', 'dodge', 'crit'])

/** One offer of the first draft: who the hero is — name, class and the codex's description. No number, no badge, no kit. */
function firstOffer(h: HeroRow): string {
  const d = heroDescriptionOf(h.id)
  return `<div class="opt" data-act="draft" data-id="${esc(h.id)}" data-classes="${esc(h.classes.join(','))}"><b>${esc(h.name)}</b><small>${esc(classesOf(h))}</small>${d ? `<p class="who">${esc(d.description)}</p>${d.quote ? `<p class="quote">“${esc(d.quote)}”</p>` : ''}` : ''}</div>`
}

/** What a badge does, in words: the stats the battle fields for it (the engine's row), and the item slots the campaign gives or takes. */
function badgeWordsOf(id: string): string {
  const parts = Object.entries(BADGES[id]?.statModifiers ?? {}).filter(([, n]) => n !== 0).map(([k, n]) => `${sign(n as number)} ${statLabelOf(k)}`)
  const slots = crucibleBadgeOf(id)?.stats[SLOTS] ?? 0
  if (slots) parts.push(`${sign(slots)} ${statLabelOf(SLOTS)}`)
  return parts.join(', ') || 'nothing in battle yet'
}

/** One offer of a later draft: the hero as it would join — its fielded stats against its row, its rolled points, its badges. */
function rolledOffer(row: HeroRow, h: Hero): string {
  const d = h.drafted!
  let now: UnitDef, bare: UnitDef
  try { now = fieldedPreviewOf(h).now; bare = fieldedPreviewOf(row).now }
  catch (e) { return `<div class="opt" data-act="draft" data-id="${esc(h.id)}" data-classes="${esc(h.classes.join(','))}"><b>${esc(h.name)}</b><small>${esc(classesOf(h))}</small><p class="who"><b>the engine cannot field this hero</b> — ${esc((e as Error).message)}</p></div>` }
  const num = (u: UnitDef, k: string) => ((u as unknown as Record<string, number | undefined>)[k]) ?? 0
  const values: [key: string, value: number, was: number][] = [...DRAFT_STATS.map((k): [string, number, number] => [k, num(now, k), num(bare, k)]), [SLOTS, h.itemSlots, row.itemSlots]]
  const rows = values.map(([k, value, was]) => {
    const moved = value - was
    return `<div class="stRow"><span class="stN">${esc(statLabelOf(k))}</span> <span class="stV${moved > 0 ? ' up' : moved < 0 ? ' down' : ''}">${moved ? `<em>${sign(moved)}</em> ` : ''}${value}${PCT.has(k) ? '%' : ''}</span></div>`
  })
  const half = Math.ceil(rows.length / 2)
  // a rolled point the battle cannot take (the engine has no such unit mod) is said, not hidden; Item Slots is the campaign's and counts
  const idle = new Set(d.unfielded.filter((r) => r.stat !== SLOTS).map((r) => r.stat))
  const rolled = d.rolls.map((r) => `<span class="delta ${r.amount > 0 ? 'won' : 'lost'}">${sign(r.amount)} ${esc(statLabelOf(crucibleStatOf(r.stat)))}${idle.has(r.stat) ? ' <i>(not counted in battle yet)</i>' : ''}</span>`).join(' ')
  const badges = d.badges.map((b) => `<div class="badge ${CRUCIBLE.flawed.some((x) => x.id === b) ? 'flawed' : 'good'}" data-badge="${esc(b)}"><b>${esc(BADGES[b]?.name ?? b)}</b> <span>${esc(badgeWordsOf(b))}</span></div>`).join('')
  return `<div class="opt rolled" data-act="draft" data-id="${esc(h.id)}" data-classes="${esc(h.classes.join(','))}" data-badges="${esc(d.badges.join(','))}" data-rolls="${esc(d.rolls.map((r) => `${r.stat}:${r.amount}`).join(','))}" data-stats="${esc(values.map(([k, value]) => `${k}:${value}`).join(','))}">
    <b>${esc(h.name)}</b><small>${esc(classesOf(h))}</small>
    <div class="stats"><div class="stCols"><div>${rows.slice(0, half).join('')}</div><div>${rows.slice(half).join('')}</div></div></div>
    <div class="rolls"><span class="k">Rolled</span> ${rolled || '<span class="none">no stat points</span>'}</div>
    <div class="badges">${badges || '<span class="none">no badge</span>'}</div>
  </div>`
}

/**
 * kingdom.opening-draft-pool (2026-10-03): the pool is the 24 base heroes, so three do come to the fire at every draft and
 * the party does end at six. `leftOut` — a base hero whose row has no kit — is not drafted and is named here, each under
 * data-unkitted (none today; kingdom SWITCHES.md openingUnkittedNamed).
 */
export function draftScreen(c: CampaignState, leftOut: readonly UnkittedHero[] = UNKITTED_HEROES): string {
  const offers = listDraftOffers(c)
  const first = draftedCountOf(c) === 0
  const owed = draftsOwedOf(c) > 1 ? ` ${draftsOwedOf(c)} to draft before the next battle.` : ''
  return `<h2>The draft — ${first ? 'your first hero' : `hero ${draftedCountOf(c) + 1} of six`}</h2>
    <p class="meta">${first
      ? 'Three come to the fire. You see who they are — never their numbers. Choose the one who will lead.'
      : 'Three come to the fire, each as the Crucible made them: their numbers, the points they rolled against their kind, and their badges. Take the one you want.'}${owed}</p>
    <div class="card"><div class="pick${first ? '' : ' draft-rolled'}">${offers.map((h) => (first ? firstOffer(h) : rolledOffer(h, draftedHeroOf(c, h.id)))).join('')}</div></div>${leftOut.length ? `<p class="meta">Not at the fire — no kit in the content: ${leftOut.map((h) => `<span data-unkitted="${esc(h.id)}">${esc(h.name)}</span>`).join(', ')}.</p>` : ''}`
}
