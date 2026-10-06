// viewer.pixel-compare-tests-hold-against-frame-noise (engine backlog; found 2026-10-06 by the viewer worker's gate: "the page
// test of viewer.solid-pieces-drawn-by-material, which asserts 0 differing pixels between the batched drawing and each piece
// drawn alone, failed the viewer gate's checks part twice and once run alone (6, 2 and 5 pixels differing) before passing on
// a fourth run, in a gate that had not touched it; viewer.still-frame-draws-nothing's compare did the same once (1 pixel) …
// A test that fails one run in three teaches chats to rerun and wave a red gate through.").
//
// What was found, and which way was taken (viewer SWITCHES.md, this item's section): the noise is this machine's graphics
// card's own — handed the very same calls with the very same numbers it gives a still frame one of a few pictures, a handful
// of pixels one shade apart; the software renderer never does — so it cannot be removed in the page, and each compare of two
// ways of drawing a view is held against it: each way drawn a fixed number of times, turn about, and a pixel the other way's
// doing only if none of its drawings shows a colour that one of the reference's shows there (tools/pixel-agree.mjs). This
// file holds that it stays so:
//   · the rule itself, on made pictures (tools/pixel-agree.test.mjs, run here): what it passes and what it fails;
//   · the tool (tools/frame-cost.mjs) draws no view again until it matches — the number of drawings is fixed, and each of the
//     three compares (the sun's shadow, the bodies' depth, the solid pieces' batches) is made by the rule;
//   · the three page tests still ask for exactly 0 — no number of pixels is let through anywhere;
//   · on the built page, on every battle of the frame tests' one shared run: every compare was drawn that many times each
//     way at every view, and reads 0.
// The proof under load — the pixel-compare page tests green ten times in a row beside a four-thread busy loop, and each seen
// red once with its guard undone — was run by hand under the gate lock and is recorded in the switches; it is not run in the
// gate. COUNTS ONLY are asserted here. Imports no page code.
import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { frameCostOnThePage, rowOf, FRAME_COST_BATTLES, FRAME_COST_WAIT_MS } from './frame-cost-page.js'

type Compare = { differing: number; worst: number; same: number; draws: number; firstPair: number; unsteady: number; unsteadyBy: number; otherUnsteady: number; otherUnsteadyBy: number }
type Row = { battle: string; flat?: boolean; note?: string; shadow?: Compare & { views: number; pixels: number; depth?: Compare & { pieces: number }; batched?: Compare & { views: number } }; pageErrors?: string[] }
/** a file with its comments taken out, so only what runs is read */
const code = (f: string) => readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').split('\n').map((l) => l.replace(/^\s*\/\/.*$/, '').replace(/([;{}(),]\s*)\/\/.*$/, '$1')).join('\n')
const count = (s: string, part: string) => s.split(part).length - 1
/** how often each way of a compare is drawn at a view: the tool's own number, read from it */
const DRAWS = Number(/const COMPARE_DRAWS=(\d+)\n/.exec(readFileSync('tools/frame-cost.mjs', 'utf8'))?.[1])

describe('viewer.pixel-compare-tests-hold-against-frame-noise', () => {
  it('the rule, on made pictures: the card\'s noise is no difference between two ways; a pixel drawn differently every time is — by one shade, on one pixel', () => {
    const out = execFileSync(process.execPath, ['--test', '--test-reporter=tap', 'tools/pixel-agree.test.mjs'], { cwd: '../viewer', encoding: 'utf8', maxBuffer: 1 << 24 })
    expect(out).toMatch(/# pass 8/); expect(out).toMatch(/# fail 0/)
  }, 120000)

  it('the tool draws no view again until it matches: a fixed number of drawings each way, turn about, and every compare made by the rule', () => {
    const tool = code('tools/frame-cost.mjs')
    expect(DRAWS, 'the drawings of each way at a view: a number written once in the tool').toBeGreaterThanOrEqual(10)
    expect(count(tool, 'COMPARE_DRAWS'), 'written once, handed to each view\'s compare, and nowhere changed').toBe(3)
    expect(count(tool, 'page.evaluate(shadowBothWays,COMPARE_DRAWS)')).toBe(2)
    /* the turn about: reference, two frames, read; the other way, two frames, read — DRAWS times, with no way out of the loop */
    expect(tool).toContain('const turnAbout=(reference,other)=>{const A=[],B=[];for(let i=0;i<DRAWS;i++){reference();draw();draw();A.push(read());other();draw();draw();B.push(read())}return S.agree(A,B)}')
    expect(tool).toContain('import {agree} from \'./pixel-agree.mjs\''); expect(tool).toContain('window.__frameCost.agree=(0,eval)(\'(\'+src+\')\')},agree.toString())')
    /* the three compares, each by the rule, the way as first written the reference */
    expect(tool).toContain('shadow=turnAbout(()=>{k.whole=true},()=>{k.whole=false})')
    expect(tool).toContain('turnAbout(()=>{V.bodiesDepth.whole=true},()=>{V.bodiesDepth.whole=false})')
    expect(tool).toContain('turnAbout(()=>{V.solidBatches.whole=true},()=>{V.solidBatches.whole=false})')
    expect(count(tool, 'turnAbout('), 'the three compares and no other').toBe(3)
    /* nothing of the old way is left: no drawing again while the two ways differ, no fewest-of-several, no leaving a loop on a match */
    for (const old of ['go<=3', 'drawnAgain', 'if(!d.n)break', '.most', 'retake']) expect(tool, 'the tool still holds "' + old + '"').not.toContain(old)
    const from = tool.indexOf('const turnAbout='), compares = tool.slice(from, tool.indexOf('}finally{', from))
    expect(compares.length, 'the three compares, read whole').toBeGreaterThan(400)
    expect(compares).not.toMatch(/\bbreak\b|\bwhile\s*\(|\bcontinue\b|\breturn\b(?! S\.agree\(A,B\)\})/)
  })

  it('the three page tests ask for exactly 0 pixels — at every view — and let no number of pixels through', () => {
    const solid = code('test/viewer.solid-pieces-drawn-by-material.test.ts'), still = code('test/viewer.still-frame-draws-nothing.test.ts'), shadow = code('test/viewer.scenery-shadow-drawn-once.test.ts')
    expect(solid).toMatch(/expect\(p\.differing,[^)]*\)\.toBe\(0\)/); expect(solid).toMatch(/expect\(p\.worst,[^)]*\)\.toBe\(0\)/); expect(solid).toMatch(/expect\(p\.same,[^)]*\)\.toBe\(p\.views\)/)
    expect(still).toMatch(/expect\(\[r\.shadow!\.depth!\.differing, r\.shadow!\.depth!\.worst\],[^)]*\)\.toEqual\(\[0, 0\]\)/)
    expect(shadow).toMatch(/expect\(r\.shadow!\.differing,[^)]*\)\.toBe\(0\)/); expect(shadow).toMatch(/expect\(r\.shadow!\.worst,[^)]*\)\.toBe\(0\)/); expect(shadow).toMatch(/expect\(r\.shadow!\.same,[^)]*\)\.toBe\(r\.shadow!\.views\)/)
    /* and none of them compares a count of differing pixels with anything but 0 */
    for (const [name, src] of [['solid', solid], ['still', still], ['shadow', shadow]] as const)
      for (const m of src.matchAll(/expect\(([^;\n]*?(?:differing|worst)[^;\n]*?)\)\s*\.\s*(toBeLessThan|toBeLessThanOrEqual|toBeCloseTo|toBeGreaterThan)\b/g)) expect.fail(name + ': a compare\'s pixels held to a bound, not to 0: ' + m[0])
    /* each run of the tool's drawings is pinned in the tests that read it */
    for (const src of [solid, still, shadow]) expect(src).toMatch(/draws[^)]*\)\.toBeGreaterThanOrEqual\(10\)/)
  })

  it('the built page: on every battle every compare was drawn that many times each way at every view, and reads 0 — the card\'s own noise beside it, as measured in the same drawings', () => {
    const got = frameCostOnThePage<Row>()
    let compares = 0
    for (const battle of FRAME_COST_BATTLES) {
      const r = rowOf(got, battle), at = battle.replace(/^encounter\.(opening\.)?/, '')
      expect(r.flat, r.note).toBeFalsy(); expect(r.pageErrors ?? [], at).toEqual([])
      expect(r.shadow, at + ': the round of views was drawn').toBeTruthy()
      const s = r.shadow!
      expect(s.views, at).toBeGreaterThanOrEqual(8)
      for (const [name, c] of [['the sun\'s shadow, kept against whole', s], ['the bodies\' depth, a few pieces against every solid piece', s.depth], ['the solid pieces, batched against each by itself', s.batched]] as const) {
        expect(c, `${at}: ${name}`).toBeTruthy(); compares++
        expect(c!.draws, `${at}: ${name}: drawings of each way at a view`).toBe(DRAWS)
        expect(c!.differing, `${at}: ${name}: pixels no drawing of the two ways agrees on`).toBe(0)
        expect(c!.worst, `${at}: ${name}`).toBe(0); expect(c!.same, `${at}: ${name}: views with nothing differing`).toBe(s.views)
        /* the noise is measured, not assumed: whole numbers, a few pixels of the picture and never a part of it */
        for (const k of ['firstPair', 'unsteady', 'unsteadyBy', 'otherUnsteady', 'otherUnsteadyBy'] as const) { expect(Number.isInteger(c![k]), `${at}: ${name}: ${k}`).toBe(true); expect(c![k], `${at}: ${name}: ${k}`).toBeGreaterThanOrEqual(0) }
        expect((c!.unsteady + c!.otherUnsteady) * 1000, `${at}: ${name}: pixels the card does not colour the same every time, against the picture's`).toBeLessThan(s.pixels)
        expect(c!.unsteady === 0, `${at}: ${name}: unsteady pixels and their size go together`).toBe(c!.unsteadyBy === 0)
      }
    }
    expect(compares).toBe(FRAME_COST_BATTLES.length * 3)
  }, FRAME_COST_WAIT_MS)
})
