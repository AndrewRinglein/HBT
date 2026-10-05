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
//
// kingdom.opening-hero-card-art (2026-10-03, Andrew, engine/DECISIONS.md 'every draft card shows the hero's card art …':
// "Card art should be present when you're drafting, both the first time and the next ones."): EVERY draft card shows its
// hero's card art — the first draft's above the name, class, description and quote (still no stats and no badges), a
// later draft's above what it already shows. The art is the hero's own portrait (ui/art.ts portraitOf, made by
// tools/prep-heroes.py); a hero whose art is missing on disk shows a blank card, never another's.
//
// kingdom.opening-first-hero-class-line (2026-10-04, Andrew, engine DECISIONS.md 2026-10-04 'the opening's tutorial: the first hero's class line, …':
// "When you pick your first hero there should be a description (a line that describes the class) and then some simple way
// we can describe the changes to this hero." — its badges and bonus Health in plain words, like "Born leader" and "Tougher
// than most": "3 correct."): EVERY draft card shows, under the class word, the class's one player-facing sentence (the
// content's row — content/classes.ts classLineOf; nothing when the content gives none); and each card of the FIRST draft
// shows beneath it what THIS hero joins with — one short plain line for each thing (each badge, the Health, each rolled
// point; two things with the same words share a line), never a stat table and never a number (kingdom SWITCHES.md
// classLineNoNumbers). 2026-10-03's "no stats or badges shown, just a description" is replaced only as far as these
// plain lines go: the later drafts' stat block still does not show on the first draft.
//
// kingdom.first-hero-own-positives-negatives (2026-10-05, Andrew, engine/DECISIONS.md 'playtest post: …, the first hero's
// positives': "I weirdly got a list of like six positive things for each person. It seemed like maybe all of the positives
// for all of them were showing under each of them, as opposed to just the one that related to that hero." — and 'the playtest
// post answered: …': "It should show its positives and negatives compared to a standard hero of that type. It should say one
// line about what it is, like a ranger, and then it should do something similar to what you have there, but just about the
// positives and negatives it has, stats, and badges."). THE FAULT: the plain lines under each card of the first draft were
// what the FIRST HERO is given (Leadership, a positive badge, +2 Health, a stat point) — rolled once for the pick, the same
// whichever of the three is taken — so all three cards listed the same five or six lines and none was that hero's own. NOW,
// on the first draft: each card says in one line what the hero is ("A ranger." — its class's name, the content's row), then
// ITS OWN differences from the standard hero of its class (content/class-standard.ts): each stat above the standard a
// positive ("+1 Precision"), each below a negative ("-1 Health"), its own badges with what each does — positives first — or,
// when it differs in nothing, one line saying so. What the first hero is given is said ONCE, for the pick, in one line above
// the three cards (kingdom SWITCHES.md firstHeroGiftsOnce). This replaces 2026-10-03's "no stats or badges shown, just a
// description" and 2026-10-04's "never a number" for the first draft's cards; the class's sentence and the codex's
// description stay (SWITCHES.md firstHeroCardKeeps). The later drafts never had the fault and are not changed.
//
// kingdom.first-hero-card-only-what-is-modified (2026-10-05, Andrew, engine/DECISIONS.md 'seven answers: the first hero's card
// shows only what is modified; …': told that the card compares each hero, stat by stat, with the value most of its class's four
// base heroes have, and asked whether that is the comparison he wants — "No, it's just the things that get modified: the extra
// stats and the badges."). The "standard hero" above read "compared to a standard hero of that type" too widely and is GONE
// (content/class-standard.ts is deleted; kingdom SWITCHES.md firstHeroStandard, overturned). A first-hero card lists only what
// is MODIFIED on that hero: what its own draft gave it (the record the run keeps on the hero — core/draft-modifiers.ts
// joinsWithOf: its badges, its stat changes) that is not already said once for the pick, and the badges its own row carries
// (an origin badge — read from the row, never from a list here; no row carries one until content.hero-origin-badges). Nothing
// is worked out by looking at another hero. A hero with nothing of its own says so in one plain line.
//
// kingdom.first-hero-each-rolls-own-gifts (2026-10-05, Andrew, engine/DECISIONS.md 'gifts: the word; each first-hero choice
// rolls its own; …': "Yeah, they each roll their own gifts. … the random modifiers that are applied to a hero are called gifts.
// That includes the random badges and random stats."; 'Leadership is given to every first hero, not rolled': "Every first hero
// choice gets leadership. They don't roll it, they just get it."). GLOSSARY.md 'Settled, 2026-10-05': GIFT. Each of the three
// first-hero cards lists ITS OWN gifts — its random badges with their one-line meaning and its random stat changes — under the
// small heading "Gifts" (giftsBlock; core/draft-modifiers.ts giftsOf; the roll is each hero's own, core/opening.ts). What the
// rule gives every first hero without a roll — Leadership, and the +2 Health — is not a gift: it is said once for the pick,
// above the cards (givenByRuleOf), and that line no longer holds anything rolled. A later draft's cards say "Gifts" over the
// stat points and badges the Crucible rolled; so does the hero sheet (ui/roster.ts). The word replaces "modifiers" wherever a
// screen says it; ids, classes and field names are not renamed.
//
// kingdom.opening-draft-class-message (2026-10-04, Andrew, engine/DECISIONS.md 'the opening's tutorial: the first hero's class line, no map before battle 1, …':
// "The second time you are drafting a hero, there should be a message …" — his sentence is the content's row,
// content/prologue.ts DRAFT_MESSAGES, and is not repeated here): a draft whose content row gives it words (core/opening.ts draftMessageOf —
// the second) shows them as one gold line above the three offers, part of the page for as long as that draft is up —
// nothing to press, nothing timed. The words are the row's, never typed here (kingdom SWITCHES.md draftMessage*).
import type { CampaignState, Hero } from '../core/campaign.js'
import { listDraftOffers, draftsOwedOf, draftedCountOf, draftedHeroOf, draftMessageOf } from '../core/opening.js'
import { fieldedPreviewOf } from '../core/seam.js'
import { UNKITTED_HEROES, heroDescriptionOf, type HeroRow, type UnkittedHero } from '../content/heroes.js'
import { CRUCIBLE, FIRST_HERO, crucibleBadgeOf, crucibleStatOf, badgeLineOf, statLineOf } from '../content/crucible.js'
import { CLASSES, classLineOf } from '../content/classes.js'
import { BADGE_LINES } from '../content/generated/progress.js'
import { giftsOf, givenByRuleOf, type JoinedWith } from '../core/draft-modifiers.js'
import { statLabelOf } from '../content/stat-labels.js'
import { BADGES, RULE_BADGES, UNITS, type UnitDef } from '../engine.js'
import { portraitOf } from './art.js'

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

/** A draft card's art: the hero's own card portrait, or a blank card when its art is missing on disk — never another's. */
function cardArt(heroId: string): string {
  const art = portraitOf(heroId)
  return `<div class="art">${art ? `<img src="${art}" alt="">` : '<div class="noart"></div>'}</div>`
}

/** The class's one player-facing sentence, under the class word — nothing when the content gives the class none. */
function classLine(h: HeroRow): string {
  const line = classLineOf(h.classes)
  return line ? `<p class="classline" data-class-line="${esc(h.classes.find((c) => classLineOf([c]) === line)!)}">${esc(line)}</p>` : ''
}

/** One plain line of what a first hero joins with, and the thing(s) it is said of (two things with the same words share a line). */
type JoinLine = { words: string; of: string[] }
/** The things said once for the pick, in plain words: one line for each, in the record's order; things with the same words share a line. */
function pickLines(given: readonly JoinedWith[]): JoinLine[] {
  const lines: JoinLine[] = []
  for (const j of given) {
    const words = j.badge ? badgeLineOf(j.badge) : statLineOf(j.stat!)
    const same = lines.find((l) => l.words === words)
    if (same) same.of.push(j.key); else lines.push({ words, of: [j.key] })
  }
  return lines
}

/** The hero's class as the content names it, in plain words: "A ranger." — the first of its classes that has a row. */
function whatItIs(h: HeroRow): string {
  const row = CLASSES.find((c) => h.classes.includes(c.id))
  if (!row) return `<small>${esc(classesOf(h))}</small>`
  const name = row.name.toLowerCase()
  return `<small class="whatitis" data-what="${esc(row.id)}">${/^[aeiou]/.test(name) ? 'An' : 'A'} ${esc(name)}.</small>`
}

/** What one of the hero's own badges does, in the content's plain words — else the stats the battle fields for it. */
const ownBadgeWords = (id: string): string => BADGE_LINES[id] ?? badgeWordsOf(id)

/** The badges a hero's own row carries — an origin badge — never the engine's rule badges, which every hero carries (a hero is a hero). */
function rowBadgesOf(h: HeroRow): string[] {
  const rule = new Set<string>(Object.values(RULE_BADGES))
  const unit = (UNITS[h.unitType] as unknown as { badges?: readonly string[] } | undefined)?.badges ?? []
  return [...new Set([...unit, ...h.badges])].filter((b) => !rule.has(b)).sort()
}

const flawedBadge = (b: string) => CRUCIBLE.flawed.some((x) => x.id === b)
type OwnLine = { pos: boolean; html: string }
/** A badge as a line: its name and its one-line meaning; a flaw stands with the negatives. */
const badgeLine = (b: string): OwnLine => ({ pos: !flawedBadge(b), html: `<li class="${flawedBadge(b) ? 'neg' : 'pos'}" data-own="badge:${esc(b)}"><b>${esc(BADGES[b]?.name ?? b)}</b> ${esc(ownBadgeWords(b))}</li>` })
/** A stat change as a line: its amount and the stat's word ("+2 Health"); a loss stands with the negatives. */
const statLine = (j: JoinedWith): OwnLine => ({ pos: j.amount! > 0, html: `<li class="${j.amount! > 0 ? 'pos' : 'neg'}" data-own="${esc(j.key)}" data-amount="${j.amount}">${sign(j.amount!)} ${esc(statLabelOf(crucibleStatOf(j.stat!)))}</li>` })
const positivesFirst = (lines: readonly OwnLine[]) => [...lines.filter((l) => l.pos), ...lines.filter((l) => !l.pos)].map((l) => l.html).join('')

/**
 * A hero's GIFTS under their small heading: each random badge by name with its one-line meaning, each random stat change as
 * its amount and the stat's word; positives first. Each line names the gift it is said of (data-own: the draft's own key —
 * badge:<id>, point:<stat>). Nothing for a hero with no gift. Used by the first-hero cards and the hero sheet.
 */
export function giftsBlock(gifts: readonly JoinedWith[]): string {
  if (!gifts.length) return ''
  return `<div class="gifts" data-gifts="${gifts.length}"><h4 class="gifts-h">Gifts</h4><ul class="own">${positivesFirst(gifts.map((j) => (j.badge ? badgeLine(j.badge) : statLine(j))))}</ul></div><!--gifts-->`
}

/**
 * What is MODIFIED on this hero, and nothing else: the badges its own row carries (an origin badge — not a gift: the row
 * always carries it), then its gifts under their heading. A hero with neither says so in one plain line.
 */
function ownList(h: HeroRow, gifts: readonly JoinedWith[]): string {
  const origin = rowBadgesOf(h).filter((b) => !gifts.some((j) => j.badge === b))
  if (!gifts.length && !origin.length) return '<p class="own same" data-own="none">No extra stats and no badges of its own.</p>'
  return `${origin.length ? `<ul class="own origin">${positivesFirst(origin.map(badgeLine))}</ul>` : ''}${giftsBlock(gifts)}`
}

/**
 * One offer of the first draft: its card art, name, one line of what it is, the class's sentence, what is modified on THIS
 * hero (its row's own badges, and `gifts`: what the dice decided for it — the pick's line above the cards says what the rule
 * gives every first hero), and the codex's description. No kit.
 */
function firstOffer(h: HeroRow, mine: readonly JoinedWith[]): string {
  const d = heroDescriptionOf(h.id)
  return `<div class="opt" data-act="draft" data-id="${esc(h.id)}" data-classes="${esc(h.classes.join(','))}">${cardArt(h.id)}<b>${esc(h.name)}</b>${whatItIs(h)}${classLine(h)}${ownList(h, mine)}${d ? `<p class="who">${esc(d.description)}</p>${d.quote ? `<p class="quote">“${esc(d.quote)}”</p>` : ''}` : ''}</div>`
}

/** What a badge does, in words: the stats the battle fields for it (the engine's row), and the item slots the campaign gives or takes. */
function badgeWordsOf(id: string): string {
  const parts = Object.entries(BADGES[id]?.statModifiers ?? {}).filter(([, n]) => n !== 0).map(([k, n]) => `${sign(n as number)} ${statLabelOf(k)}`)
  const slots = crucibleBadgeOf(id)?.stats[SLOTS] ?? 0
  if (slots) parts.push(`${sign(slots)} ${statLabelOf(SLOTS)}`)
  return parts.join(', ') || 'nothing in battle yet'
}

/** One offer of a later draft: the hero as it would join — its card art, its fielded stats against its row, its rolled points, its badges. */
function rolledOffer(row: HeroRow, h: Hero): string {
  const d = h.drafted!
  let now: UnitDef, bare: UnitDef
  try { now = fieldedPreviewOf(h).now; bare = fieldedPreviewOf(row).now }
  catch (e) { return `<div class="opt" data-act="draft" data-id="${esc(h.id)}" data-classes="${esc(h.classes.join(','))}">${cardArt(h.id)}<b>${esc(h.name)}</b><small>${esc(classesOf(h))}</small><p class="who"><b>the engine cannot field this hero</b> — ${esc((e as Error).message)}</p></div>` }
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
    ${cardArt(h.id)}<b>${esc(h.name)}</b><small>${esc(classesOf(h))}</small>${classLine(row)}
    <div class="stats"><div class="stCols"><div>${rows.slice(0, half).join('')}</div><div>${rows.slice(half).join('')}</div></div></div>
    <div class="gifts" data-gifts="${d.rolls.length + d.badges.length}"><h4 class="gifts-h">Gifts</h4>
    <div class="rolls"><span class="k">Rolled</span> ${rolled || '<span class="none">no stat points</span>'}</div>
    <div class="badges">${badges || '<span class="none">no badge</span>'}</div>
    </div><!--gifts-->
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
  const said = draftMessageOf(c)
  const notice = said ? `\n    <p class="draftNotice" data-draft-notice="${said.draft}" role="note">${esc(said.text)}</p>` : ''
  // kingdom.first-hero-own-positives-negatives: what the first hero is given is the PICK's — the lines every one of the three
  // would join with are said once, above the cards; a line only one of them would get stays under that one
  // the first draft: each offered hero as it would join — its own roll. What the rule gives every first hero is said once.
  const per = first ? offers.map((h) => draftedHeroOf(c, h.id).drafted!) : []
  const shared = pickLines(per.length ? givenByRuleOf(per[0]!, FIRST_HERO) : [])
  const gifts = shared.length ? `\n    <p class="firstGifts" data-first-gifts="${shared.length}">Whoever you choose leads the party and also gets: ${shared.map((l) => `<span data-joins="${esc(l.of.join(' '))}">${esc(l.words)}</span>`).join(' · ')}.</p>` : ''
  return `<h2>The draft — ${first ? 'your first hero' : `hero ${draftedCountOf(c) + 1} of six`}</h2>
    <p class="meta">${first
      ? 'Three come to the fire. Each card says what the hero is and its gifts — the badges and the stat changes it alone rolled. Choose the one who will lead.'
      : 'Three come to the fire, each as the Crucible made them: their numbers and their gifts — the stat points and the badges each one rolled. Take the one you want.'}${owed}</p>${notice}${gifts}
    <div class="card"><div class="pick${first ? '' : ' draft-rolled'}">${offers.map((h, i) => (first ? firstOffer(h, giftsOf(per[i]!, FIRST_HERO)) : rolledOffer(h, draftedHeroOf(c, h.id)))).join('')}</div></div>${leftOut.length ? `<p class="meta">Not at the fire — no kit in the content: ${leftOut.map((h) => `<span data-unkitted="${esc(h.id)}">${esc(h.name)}</span>`).join(', ')}.</p>` : ''}`
}
