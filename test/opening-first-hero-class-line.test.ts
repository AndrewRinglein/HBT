// kingdom.opening-first-hero-class-line — ruled 2026-10-04 (Andrew, engine/DECISIONS.md 'the opening's tutorial: the first
// hero's class line, no map before battle 1, the Orphanage's lessons, …'): "When you pick your first hero there should be
// a description (a line that describes the class) and then some simple way we can describe the changes to this hero."
// Asked whether "the changes to this hero" means its badges and bonus Health said in plain words, like "Born leader" and
// "Tougher than most": "3 correct."
//
// Expect: "At http://127.0.0.1:4230/play a new run's first draft shows, on each of the three offers, a one-sentence class
// line under the class word and beneath it the plain lines of what that hero joins with - no stat table. A page test
// asserts each offer carries the class line of its own class, that the line is the content's row (changing the row
// changes the page; no class sentence is typed in kingdom/src), and one plain line per badge the hero joins with."
//
// The words are content's: content/gen/classes.json `playerLine` per class (and per stat: what a hero given more of it
// is), content/gen/badges.json `playerLine` per badge the first hero can be given — published in content/hbt-content.json
// and read by the kingdom through its generated table (tools/mk-progress.mjs -> src/content/generated/progress.ts).
// The page half is tools/opening-loop-three.verify.mjs over tools/opening-page.mjs (draft), on the built page.
import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { readFileSync, readdirSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import OPENING from '../../progression/OPENING-PARTY.json'
import * as GENERATED from '../src/content/generated/progress.js'
import * as CLASS_ROWS from '../src/content/classes.js'
import * as CRUCIBLE_ROWS from '../src/content/crucible.js'
import { makeNewCampaign, performAdvanceOpening, performDraft, performOpeningStraightIn, performResolvePrologue, listDraftOffers, draftedHeroOf } from '../src/core/opening.js'
import { makeCtx, setCursor, type Ctx } from '../src/core/mutate.js'
import { ABBOTOWN_MAP } from '../src/content/conquest.js'
import { draftScreen } from '../src/ui/draft.js'
import { BADGES, encounterDef } from '../src/engine.js'

const CODEX = JSON.parse(readFileSync('../content/hbt-content.json', 'utf8')) as {
  classes: { id: string; name: string; playerLine?: string }[]
  stats: { id: string; name: string; playerLine?: string }[]
  badges: { id: string; name: string; playerLine?: string }[]
}
const HERO_CLASSES = ['class.mage', 'class.paladin', 'class.priest', 'class.ranger', 'class.rogue', 'class.warrior']
const FIRST = OPENING.firstHero, FAVOURABLE = OPENING.crucible.badges.favourable.map((b) => b.id), FLAWED = OPENING.crucible.badges.flawed.map((b) => b.id)
const POOL_STATS = [...new Set(OPENING.crucible.statPool)]
const G = GENERATED as unknown as {
  CLASS_NAMES: readonly { id: string; name: string; line?: string }[]
  BADGE_LINES?: Readonly<Record<string, string>>; STAT_LINES?: Readonly<Record<string, string>>
}
const C = CLASS_ROWS as unknown as { CLASSES: readonly { id: string; line?: string }[]; classLineOf?: (classes: readonly string[]) => string }
const W = CRUCIBLE_ROWS as unknown as { badgeLineOf?: (id: string) => string; statLineOf?: (stat: string) => string }
const SEEDS = [1, 2, 3, 5, 11, 15, 21, 42]
const lineOfClass = (id: string) => CODEX.classes.find((c) => c.id === id)?.playerLine
const text = (html: string) => html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()

/** each offer of the draft on the screen: its block of markup, by hero id */
function offersOn(html: string): { id: string; classes: string[]; html: string }[] {
  const starts = [...html.matchAll(/<div class="opt[^"]*" data-act="draft" data-id="([^"]+)" data-classes="([^"]*)"/g)]
  return starts.map((m, i) => ({ id: m[1]!, classes: m[2]!.split(','), html: html.slice(m.index!, i + 1 < starts.length ? starts[i + 1]!.index! : html.length) }))
}
/** the plain lines an offer shows: what each says, and which thing(s) it is said of */
const joinsOn = (html: string) => [...html.matchAll(/<li data-joins="([^"]+)">([^<]*)<\/li>/g)].map((m) => ({ of: m[1]!.split(' '), words: m[2]! }))
const classLineOn = (html: string) => html.match(/<p class="classline" data-class-line="([^"]+)">([^<]*)<\/p>/)
function atFirstDraft(seed: number): Ctx {
  const ctx = makeCtx(makeNewCampaign(seed)); performAdvanceOpening(ctx, 'test'); return ctx
}
function atSecondDraft(seed: number): Ctx {
  const ctx = atFirstDraft(seed), id = ABBOTOWN_MAP.sections[0]!.encounterId
  performDraft(ctx, listDraftOffers(ctx.campaign)[0]!.id, 'test')
  performOpeningStraightIn(ctx, { id, mapId: encounterDef(id).mapId!, kind: ABBOTOWN_MAP.engagementKind }, 'test')
  setCursor(ctx, { step: 'open', engagement: null, prepStep: null, battle: null, equipSession: null }, 'test')
  performResolvePrologue(ctx, true, 'test', true)
  performAdvanceOpening(ctx, 'test')
  expect(ctx.campaign.cursor.step).toBe('draft')
  return ctx
}

describe('kingdom.opening-first-hero-class-line — the first draft says what the class does, and what this hero joins with, in plain words', () => {
  it('the content holds one player-facing sentence for each of the six hero classes, beside the designer\'s intent', () => {
    for (const id of HERO_CLASSES) {
      const line = lineOfClass(id)
      expect(typeof line, `${id}: content/gen/classes.json playerLine, published`).toBe('string')
      expect(line!.trim()).toBe(line)
      expect(line!, `${id}: one sentence`).toMatch(/^[A-Z][^.!?]*\.$/)
      expect(line!, `${id}: no number`).not.toMatch(/\d/)
      expect(line!.length, `${id}: short enough to read on a card`).toBeLessThanOrEqual(140)
      expect(line, `${id}: not the designer's intent`).not.toBe((CODEX.classes.find((c) => c.id === id) as unknown as { intent: string }).intent)
    }
    expect(new Set(HERO_CLASSES.map(lineOfClass)).size, 'six different sentences').toBe(6)
  })

  it('the kingdom reads them through its generated table — the line is the content\'s row, and no class sentence is typed in kingdom/src', () => {
    for (const id of HERO_CLASSES) {
      expect(G.CLASS_NAMES.find((c) => c.id === id)?.line, `${id}: generated/progress.ts`).toBe(lineOfClass(id))
      expect(C.CLASSES.find((c) => c.id === id)?.line, `${id}: the class row`).toBe(lineOfClass(id))
      expect(typeof C.classLineOf).toBe('function')
      expect(C.classLineOf!([id])).toBe(lineOfClass(id))
    }
    // no class sentence anywhere under src/ but the generated table
    const files = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? files(join(dir, e.name)) : [join(dir, e.name)])
    for (const f of files('src').filter((f) => !f.replace(/\\/g, '/').endsWith('src/content/generated/progress.ts') && /\.(ts|css)$/.test(f))) {
      const code = readFileSync(f, 'utf8')
      for (const id of HERO_CLASSES) expect(code.includes(lineOfClass(id) ?? '\u0000'), `${f} types ${id}'s sentence`).toBe(false)
    }
    // changing the content's row changes the table: the tool run on a codex with another sentence writes that sentence
    const dir = mkdtempSync(join(tmpdir(), 'class-line-'))
    try {
      const changed = structuredClone(CODEX), probe = 'A sentence only this test wrote.'
      changed.classes.find((c) => c.id === 'class.warrior')!.playerLine = probe
      writeFileSync(join(dir, 'codex.json'), JSON.stringify({ ...JSON.parse(readFileSync('../content/hbt-content.json', 'utf8')), classes: changed.classes }))
      execFileSync(process.execPath, ['tools/mk-progress.mjs', '--codex', join(dir, 'codex.json'), '--out', join(dir, 'progress.ts')], { encoding: 'utf8' })
      const out = readFileSync(join(dir, 'progress.ts'), 'utf8')
      expect(out).toContain(JSON.stringify(probe))
      expect(out).not.toContain(JSON.stringify(lineOfClass('class.warrior')))
      expect(out).toContain(JSON.stringify(lineOfClass('class.mage')))
    } finally { rmSync(dir, { recursive: true, force: true }) }
    // … and the table in the tree is the tool's own output for the content in the tree (never hand-edited)
    const again = mkdtempSync(join(tmpdir(), 'class-line-'))
    try {
      execFileSync(process.execPath, ['tools/mk-progress.mjs', '--out', join(again, 'progress.ts')], { encoding: 'utf8' })
      expect(readFileSync(join(again, 'progress.ts'), 'utf8').replace(/\r\n/g, '\n')).toBe(readFileSync('src/content/generated/progress.ts', 'utf8').replace(/\r\n/g, '\n'))
    } finally { rmSync(again, { recursive: true, force: true }) }
  })

  it('the content holds plain words for everything a first hero can be given: Leadership, every positive badge, and a point of every stat of the pool', () => {
    expect(typeof W.badgeLineOf).toBe('function'); expect(typeof W.statLineOf).toBe('function')
    const names = [...FIRST.badges, ...FAVOURABLE, ...FLAWED].map((id) => BADGES[id]!.name)
    for (const id of [...FIRST.badges, ...FAVOURABLE]) {
      const line = CODEX.badges.find((b) => b.id === id)?.playerLine
      expect(typeof line, `${id}: content/gen/badges.json playerLine, published`).toBe('string')
      expect(G.BADGE_LINES?.[id], `${id}: generated/progress.ts`).toBe(line)
      expect(W.badgeLineOf!(id)).toBe(line)
      expect(line!, `${id}: no number`).not.toMatch(/\d/)
      expect(line!, `${id}: no kit word`).not.toMatch(/carries/i)
      for (const name of names) expect(line!.includes(name), `${id}: said in plain words, not by a badge's name (${name})`).toBe(false)
    }
    expect(CODEX.badges.find((b) => b.id === 'badge.leadership')!.playerLine, 'his own words').toBe('Born leader')
    for (const stat of POOL_STATS) {
      const line = CODEX.stats.find((s) => s.id === stat)?.playerLine
      expect(typeof line, `${stat}: content/gen/classes.json stats playerLine, published`).toBe('string')
      expect(G.STAT_LINES?.[stat], `${stat}: generated/progress.ts`).toBe(line)
      expect(W.statLineOf!(stat)).toBe(line)
      expect(line!, `${stat}: no number`).not.toMatch(/\d/)
      for (const name of names) expect(line!.includes(name), `${stat}: no badge's name (${name})`).toBe(false)
    }
    expect(CODEX.stats.find((s) => s.id === 'health')!.playerLine, 'his own words').toBe('Tougher than most')
    // a badge with no words is refused loudly, never shown blank (Law 9)
    expect(() => W.badgeLineOf!('badge.no-such-badge')).toThrow(/no plain words/)
    expect(() => W.statLineOf!('no-such-stat')).toThrow(/no plain words/)
  })

  it('each offer of the first draft: the class line of its own class under the class word, then one plain line for each thing it joins with — no stat table, no number, no badge named', () => {
    const badgeNames = [...FIRST.badges, ...FAVOURABLE, ...FLAWED].map((id) => BADGES[id]!.name)
    for (const seed of SEEDS) {
      const ctx = atFirstDraft(seed), c = ctx.campaign, html = draftScreen(c), offers = offersOn(html)
      expect(offers.map((o) => o.id)).toEqual(listDraftOffers(c).map((h) => h.id))
      for (const o of offers) {
        const who = `seed ${seed}: ${o.id}`, row = listDraftOffers(c).find((h) => h.id === o.id)!
        // (1) the class line, under the class word and before the description
        const cl = classLineOn(o.html)
        expect(cl, `${who}: a class line`).not.toBeNull()
        expect([cl![1], cl![2]], `${who}: the line of its own class, the content's row`).toEqual([o.classes[0], lineOfClass(o.classes[0]!)!.replace(/&/g, '&amp;')])
        expect(o.html.indexOf('<small>'), `${who}: under the class word`).toBeLessThan(cl!.index!)
        expect(cl!.index!, `${who}: above the description`).toBeLessThan(o.html.indexOf('<p class="who">'))
        // (2) what THIS hero joins with, in plain words
        const d = draftedHeroOf(c, o.id).drafted!, joins = joinsOn(o.html)
        expect(o.html, `${who}: a list of what it joins with`).toMatch(/<ul class="joins">/)
        for (const b of d.badges) {
          const mine = joins.filter((j) => j.of.includes('badge:' + b))
          expect(mine.length, `${who}: one plain line for ${b}`).toBe(1)
          expect(mine[0]!.words, `${who}: ${b} in the content's plain words`).toBe(CODEX.badges.find((x) => x.id === b)!.playerLine)
        }
        expect(joins.filter((j) => j.of.some((k) => k.startsWith('badge:'))).length, `${who}: one line per badge, no more`).toBe(d.badges.length)
        expect(d.badges[0]).toBe(FIRST.badges[0])
        expect(joins[0]!.words, `${who}: Leadership first — "Born leader"`).toBe('Born leader')
        const health = joins.filter((j) => j.of.includes('health'))
        expect(health.map((j) => j.words), `${who}: the +${FIRST.health} Health, as words`).toEqual(['Tougher than most'])
        for (const r of d.rolls) {
          const mine = joins.filter((j) => j.of.includes('point:' + r.stat))
          expect(mine.map((j) => j.words), `${who}: its rolled point of ${r.stat}, as words`).toEqual([CODEX.stats.find((s) => s.id === r.stat)!.playerLine])
        }
        // every thing is said once, and two things with the same words share one line
        expect(joins.flatMap((j) => j.of).sort(), `${who}: every thing it joins with, each once`).toEqual([...d.badges.map((b) => 'badge:' + b), 'health', ...d.rolls.map((r) => 'point:' + r.stat)].sort())
        expect(new Set(joins.map((j) => j.words)).size, `${who}: no line twice`).toBe(joins.length)
        // never as a stat table — and still no number, no badge by name, no kit (2026-10-03, as far as it stands)
        expect(o.html).not.toMatch(/class="stats"|class="stRow"|data-stats=|data-badges=|data-rolls=|class="badge /)
        const said = text(o.html)
        expect(said, `${who}: no number at all`).not.toMatch(/\d/)
        expect(said, `${who}: no kit`).not.toMatch(/carries/i)
        for (const name of badgeNames) expect(said.replace(row.name, '').includes(name), `${who}: no badge by name (${name})`).toBe(false)
      }
    }
  })

  it('the page prints the row: another sentence on the class row is the sentence on the card', () => {
    const ctx = atFirstDraft(11), c = ctx.campaign, offer = listDraftOffers(c)[0]!
    const row = C.CLASSES.find((r) => r.id === offer.classes[0]) as { line: string }, was = row.line
    try {
      row.line = 'Another sentence, set by this test.'
      const o = offersOn(draftScreen(c)).find((x) => x.id === offer.id)!
      expect(classLineOn(o.html)![2]).toBe('Another sentence, set by this test.')
    } finally { row.line = was }
    expect(classLineOn(offersOn(draftScreen(c)).find((x) => x.id === offer.id)!.html)![2]).toBe(was.replace(/&/g, '&amp;'))
  })

  it('a later draft shows the same class line under the class word — and keeps its stats, points and badges', () => {
    for (const seed of [3, 11, 21]) {
      const ctx = atSecondDraft(seed), c = ctx.campaign, offers = offersOn(draftScreen(c))
      expect(offers.length).toBe(3)
      for (const o of offers) {
        const cl = classLineOn(o.html)
        expect(cl, `seed ${seed}: ${o.id}: a class line`).not.toBeNull()
        expect([cl![1], cl![2]]).toEqual([o.classes[0], lineOfClass(o.classes[0]!)!.replace(/&/g, '&amp;')])
        expect(o.html.indexOf('<small>')).toBeLessThan(cl!.index!)
        expect(cl!.index!, 'above the stat block').toBeLessThan(o.html.indexOf('<div class="stats">'))
        expect(o.html).toMatch(/data-stats="/)
        expect(o.html, 'the plain lines are the first draft\'s alone').not.toMatch(/<ul class="joins">/)
      }
    }
  })

  it('the page: every draft card of a three-battle sitting carries its class line, and the first draft\'s cards say what the hero joins with in plain words', () => {
    const out = execFileSync(process.execPath, ['tools/opening-loop-three.verify.mjs', 'BATTLE-SANDBOX.html'], { cwd: '../kingdom', encoding: 'utf8', maxBuffer: 1 << 24 })
    expect(out).toMatch(/every draft card showed the class line of its own class \(9 cards\); the first draft's three cards said what the hero joins with in plain words \(one line per badge, the Health as "Tougher than most", no stat table\)/)
  }, 600000)
})
