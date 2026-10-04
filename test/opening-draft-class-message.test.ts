// kingdom.opening-draft-class-message — ruled 2026-10-04 (Andrew, engine/DECISIONS.md 'the opening's tutorial: the first
// hero's class line, no map before battle 1, the Orphanage's lessons, …'): "The second time you are drafting a hero, there
// should be a message that says, "Until you get additional upgrades you may only deploy one hero of each class."" Asked
// whether that is a real rule to build for the full game or only the message for now: "I mean, it is basically a rule,
// but right now we're just telling them about it."
//
// Expect: "At http://127.0.0.1:4230/play, after the Orphanage, the draft for the second hero shows 'Until you get additional
// upgrades you may only deploy one hero of each class.' in gold above the offers; the first draft and the third do not
// show it. A page test asserts the sentence on the second draft, its absence on the first and third, and that it is read
// from the content row."
//
// The sentence is a row of the opening's content (content/prologue.ts DRAFT_MESSAGES: which draft, the words); the
// mechanism (core/opening.ts draftMessageOf) reads the row for the draft on the cursor and holds no words; the page
// (ui/draft.ts) prints what it is given, in the kingdom's gold, above the three offers. No rule is built. The page half
// is tools/opening-loop-three.verify.mjs and tools/opening-run-six.verify.mjs over tools/opening-page.mjs (draft).
import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import * as OPENING from '../src/core/opening.js'
import * as PROLOGUE from '../src/content/prologue.js'
import { makeNewCampaign, performAdvanceOpening, performDraft, performOpeningStraightIn, performFieldOpeningBattle, performResolvePrologue, listDraftOffers, draftedCountOf } from '../src/core/opening.js'
import { makeCtx, setCursor, type Ctx } from '../src/core/mutate.js'
import { canDeploy } from '../src/core/prep.js'
import type { CampaignState } from '../src/core/campaign.js'
import { ABBOTOWN_MAP } from '../src/content/conquest.js'
import { draftScreen } from '../src/ui/draft.js'
import { runOf, runSaveOf } from '../src/ui/opening-run.js'
import { encounterDef } from '../src/engine.js'

const SENTENCE = 'Until you get additional upgrades you may only deploy one hero of each class.'
type Row = { draft: number; text: string }
const ROWS = (PROLOGUE as unknown as { DRAFT_MESSAGES?: readonly Row[] }).DRAFT_MESSAGES
const messageOf = (OPENING as unknown as { draftMessageOf?: (c: CampaignState) => Row | null }).draftMessageOf
const SECTIONS = ABBOTOWN_MAP.sections.map((s) => s.encounterId)
const battleOf = (id: string) => ({ id, mapId: encounterDef(id).mapId!, kind: ABBOTOWN_MAP.engagementKind })
const noticeOn = (html: string) => [...html.matchAll(/<p class="draftNotice" data-draft-notice="(\d+)" role="note">([^<]*)<\/p>/g)].map((m) => ({ draft: Number(m[1]), text: m[2]! }))

/** a run at its nth draft (1 to 6): every earlier draft taken (the first offer) and every earlier battle won */
function atDraft(n: number, seed = 11): Ctx {
  const ctx = makeCtx(makeNewCampaign(seed)), c = ctx.campaign
  for (let k = 1; k < n; k++) {
    performAdvanceOpening(ctx, 'test'); performDraft(ctx, listDraftOffers(c)[0]!.id, 'test')
    if (k === 1) performOpeningStraightIn(ctx, battleOf(SECTIONS[0]!), 'test'); else performFieldOpeningBattle(ctx, battleOf(SECTIONS[k - 1]!), 'test')
    setCursor(ctx, { step: 'open', engagement: null, prepStep: null, battle: null, equipSession: null }, 'test')
    performResolvePrologue(ctx, true, 'test', true)
  }
  performAdvanceOpening(ctx, 'test')
  expect([c.cursor.step, draftedCountOf(c) + 1]).toEqual(['draft', n])
  return ctx
}

describe('kingdom.opening-draft-class-message — the second draft says one hero of each class may deploy', () => {
  it('the sentence is a row of the opening\'s content, his words exactly, for the second draft — and neither core nor the page holds a copy', () => {
    expect(ROWS, 'content/prologue.ts DRAFT_MESSAGES').toEqual([{ draft: 2, text: SENTENCE }])
    expect(typeof messageOf, 'core/opening.ts draftMessageOf').toBe('function')
    const files = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? files(join(dir, e.name)) : [join(dir, e.name)])
    for (const f of [...files('src/core'), ...files('src/ui'), ...files('src/view')]) {
      const code = readFileSync(f, 'utf8')
      expect(code.includes('only deploy one hero of each class'), `${f} types the sentence`).toBe(false)
      expect(/additional upgrades/i.test(code), `${f} types the sentence`).toBe(false)
    }
    const core = readFileSync('src/core/opening.ts', 'utf8')
    const body = core.slice(core.indexOf('export function draftMessageOf'))
    expect(body.slice(0, body.indexOf('\n}\n'))).toContain('DRAFT_MESSAGES')
  })

  it('the second draft shows it — one gold line above the three offers; the first, the third and every later draft do not', () => {
    for (const seed of [3, 11, 21]) {
      for (let n = 1; n <= 6; n++) {
        const ctx = atDraft(n, seed), c = ctx.campaign, html = draftScreen(c), notices = noticeOn(html)
        expect(messageOf!(c), `seed ${seed}: draft ${n}`).toEqual(n === 2 ? { draft: 2, text: SENTENCE } : null)
        if (n !== 2) { expect(notices, `seed ${seed}: draft ${n} shows no message`).toEqual([]); expect(html).not.toContain('draftNotice'); expect(html).not.toContain('additional upgrades'); continue }
        expect(notices, `seed ${seed}: the second draft shows the sentence, once`).toEqual([{ draft: 2, text: SENTENCE }])
        expect(html.indexOf('class="draftNotice"'), 'above the offers').toBeLessThan(html.indexOf('data-act="draft"'))
        expect(html.indexOf('class="draftNotice"'), 'above the card that holds them').toBeLessThan(html.indexOf('<div class="card">'))
        expect(html.indexOf('<h2>'), 'under the screen\'s heading').toBeLessThan(html.indexOf('class="draftNotice"'))
        expect((html.match(/data-act="draft"/g) ?? []).length, 'the three offers are still there').toBe(3)
      }
    }
  })

  it('it is gold — the kingdom\'s own gold — and a line of the page, not a pop-up: nothing to press, nothing timed', () => {
    const css = readFileSync('src/ui/slice.css', 'utf8'), rule = css.match(/\.draftNotice\{([^}]*)\}/)
    expect(rule, 'slice.css styles .draftNotice').not.toBeNull()
    expect(rule![1]).toMatch(/color:var\(--gold\)/)
    expect(css).toMatch(/--gold:#c9a227/)
    const html = draftScreen(atDraft(2).campaign), at = html.indexOf('class="draftNotice"')
    expect(html.slice(at - 3, at)).toBe('<p ')
    expect(html.slice(html.lastIndexOf('<p class="draftNotice"'), html.indexOf('</p>', at))).not.toMatch(/data-act|button|onclick/)
  })

  it('it stands again when that draft is reopened from a save, and is gone once the second hero is taken', () => {
    const ctx = atDraft(2), c = ctx.campaign
    const kept = runOf(runSaveOf(c, null)).campaign
    expect(messageOf!(kept)).toEqual({ draft: 2, text: SENTENCE })
    expect(noticeOn(draftScreen(kept))).toEqual([{ draft: 2, text: SENTENCE }])
    expect(draftScreen(kept)).toBe(draftScreen(c))
    performDraft(ctx, listDraftOffers(c)[0]!.id, 'test')
    expect(messageOf!(c), 'off the draft: no message').toBeNull()
  })

  it('the page prints the row: other words on the row are the words on the screen', () => {
    const row = ROWS![0] as { text: string }, was = row.text
    try {
      row.text = 'Other words, set by this test.'
      expect(noticeOn(draftScreen(atDraft(2).campaign))).toEqual([{ draft: 2, text: 'Other words, set by this test.' }])
    } finally { row.text = was }
    expect(noticeOn(draftScreen(atDraft(2).campaign))).toEqual([{ draft: 2, text: SENTENCE }])
  })

  it('no rule is built: Deploy still checks who is free and the count only', () => {
    const prep = readFileSync('src/core/prep.ts', 'utf8'), body = prep.slice(prep.indexOf('export function canDeploy'), prep.indexOf('export function canUndeploy'))
    expect(body, 'canDeploy reads no class').not.toMatch(/class/i)
    expect(typeof canDeploy).toBe('function')
  })

  it('the pages: the second draft of a sitting shows the sentence in gold above its offers, the first and third do not; closed on that draft and reopened, it stands again', () => {
    const three = execFileSync(process.execPath, ['tools/opening-loop-three.verify.mjs', 'BATTLE-SANDBOX.html'], { cwd: '../kingdom', encoding: 'utf8', maxBuffer: 1 << 24 })
    expect(three).toContain(`the second draft said "${SENTENCE}" in gold above its offers — the content's row — and the first and third drafts did not`)
    const six = execFileSync(process.execPath, ['tools/opening-run-six.verify.mjs', 'BATTLE-SANDBOX.html'], { cwd: '../kingdom', encoding: 'utf8', maxBuffer: 1 << 24 })
    expect(six).toContain(`the second draft said "${SENTENCE}" in gold above its offers, and said it again when the page was closed on that draft and opened again; no other draft of the six did`)
  }, 900000)
})
