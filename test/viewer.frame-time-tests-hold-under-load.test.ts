// viewer.frame-time-tests-hold-under-load (engine backlog; found 2026-10-05, twice: the page test of
// viewer.see-through-only-when-moved failed inside the gate's checks part when the machine was busy — "a still frame with the
// check due costs 47.6 ms, without 30.5 ms … expected 17.1 to be less than 7.75" — and passed on the rerun both times).
//
// The four real-Chrome frame tests (test/viewer.frame-cost-measured, .see-through-only-when-moved, .scenery-shadow-drawn-once,
// .still-frame-draws-nothing) each prove their claim by a count load cannot move wherever one exists — the see-through check's
// runs, the draw calls of a pass, the pixels that differ — and, where a time is asserted, by a ratio of medians taken in the
// same run with the frames turn about; never by a fixed number of milliseconds (viewer SWITCHES.md, this item's section, lists
// what each asserts). This file holds that it stays so, without opening a browser:
//   · no assertion in the four compares a time with a number written in the test — a time may be compared with another time
//     of the same run, or divided by one and the RATIO compared with a number;
//   · the tool they read (tools/frame-cost.mjs) takes its paired frames turn about and its two askings back to back, and gives
//     the tests the tool's own clock beside the frames' script time;
//   · the counts that are each test's pass or fail are still asserted (none was dropped for a ratio).
// The proof under load — ten passes beside a four-thread busy loop, and each test seen red with its guard undone — was run by
// hand under the gate lock and is recorded in the switches; it is not run in the gate (four browsers ten times over).
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

const TESTS = ['test/viewer.frame-cost-measured.test.ts', 'test/viewer.see-through-only-when-moved.test.ts', 'test/viewer.scenery-shadow-drawn-once.test.ts', 'test/viewer.still-frame-draws-nothing.test.ts']
/** the file with its comments taken out (a line's // tail and /* … *​/ blocks), so only what runs is read */
const code = (f: string) => readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').split('\n').map((l) => l.replace(/^\s*\/\/.*$/, '').replace(/([;{}(),]\s*)\/\/.*$/, '$1')).join('\n')
/** every `expect(subject[, message]).matcher(argument)` of a file: the subject's own text, the matcher, its argument */
function expectations(src: string) {
  const out: { subject: string; matcher: string; arg: string }[] = []
  for (let i = src.indexOf('expect('); i >= 0; i = src.indexOf('expect(', i + 1)) {
    let depth = 0, k = i + 6, inStr: string | null = null
    const end = (from: number) => { depth = 0; for (k = from; k < src.length; k++) { const c = src[k]!
      if (inStr) { if (c === '\\') k++; else if (c === inStr) inStr = null; continue }
      if (c === '\'' || c === '"' || c === '`') { inStr = c; continue }
      if (c === '(') depth++; else if (c === ')') { depth--; if (depth === 0) return k } } return -1 }
    const close = end(i + 6); if (close < 0) continue
    const inside = src.slice(i + 7, close), m = /^\s*\.\s*(?:not\s*\.\s*)?([A-Za-z]+)\s*\(/.exec(src.slice(close + 1)); if (!m) continue
    const argOpen = close + 1 + m[0].length - 1, argClose = end(argOpen); if (argClose < 0) continue
    /* the subject is the first argument of expect(): up to the first comma that is not inside brackets or a string */
    let d = 0, s: string | null = null, cut = inside.length
    for (let j = 0; j < inside.length; j++) { const c = inside[j]!
      if (s) { if (c === '\\') j++; else if (c === s) s = null; continue }
      if (c === '\'' || c === '"' || c === '`') { s = c; continue }
      if ('([{'.includes(c)) d++; else if (')]}'.includes(c)) d--; else if (c === ',' && d === 0) { cut = j; break } }
    out.push({ subject: inside.slice(0, cut).trim(), matcher: m[1]!, arg: src.slice(argOpen + 1, argClose).trim() })
  }
  return out
}
/** does this expression read a time the tool measured? (its ms columns, the paired medians, the tool's own clock) */
const readsATime = (x: string) => /\.ms\b|\bms\.|Ms\b|\bwithCheck\b(?!\.(checks|draws|triangles|frames))|\bwithoutCheck\b(?!\.(checks|draws|triangles|frames))/.test(x)
const COMPARES = new Set(['toBeLessThan', 'toBeLessThanOrEqual', 'toBeGreaterThan', 'toBeGreaterThanOrEqual', 'toBe', 'toEqual', 'toBeCloseTo'])
const aNumber = (x: string) => /^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(x.replace(/_/g, '')) || /^Math\.(max|min)\([^a-zA-Z]*\)$/.test(x)

describe('the frame tests hold under load: no time is compared with a number of milliseconds', () => {
  it('in none of the four tests is a time the tool measured compared with a number written in the test — only with another time of the same run, or as a ratio', () => {
    let read = 0, ratios = 0
    for (const f of TESTS) for (const e of expectations(code(f))) {
      if (COMPARES.has(e.matcher) && /\.ratio\b|^part$/.test(e.subject)) { ratios++; continue }   // a ratio the tool or the test already made
      if (!COMPARES.has(e.matcher) || !readsATime(e.subject)) continue
      read++
      const isRatio = /\//.test(e.subject)           // a time divided by a time: the ratio is what is compared
      if (isRatio) { ratios++; continue }
      expect(aNumber(e.arg), `${f}: expect(${e.subject}).${e.matcher}(${e.arg}) compares a time with a fixed number`).toBe(false)
      expect(/\b\d+(\.\d+)?\b/.test(e.arg.replace(/\[[^\]]*\]|\.[A-Za-z_]\w*/g, '').replace(/[A-Za-z_]\w*/g, '')), `${f}: expect(${e.subject}).${e.matcher}(${e.arg}) has a number of milliseconds in its bound`).toBe(false)
    }
    expect(read, 'the tests do read times').toBeGreaterThan(3); expect(ratios, 'and hold some as ratios').toBeGreaterThanOrEqual(5)
  })
  it('the reader above does catch the lines that failed in the gate: each of the old assertions is refused by it', () => {
    const old = [
      'expect(Math.abs(a - b), `x`).toBeLessThanOrEqual(Math.max(4, .5 * Math.max(a, b)))',
      'expect(a - b, `x`).toBeLessThan(Math.max(4, r.seeThrough!.plainMs.median / 2))',
      'expect(r.seeThrough!.ms.median, `one check, ms`).toBeLessThan(4)',
      'expect(m.ms.max, `one frame\'s script, in ms`).toBeLessThan(60000)',
      'expect(m.ms.median, at).toBeGreaterThan(0)',
    ]
    const refused = (line: string) => { const src = 'const a = r.still.withCheck.ms.median, b = r.still.withoutCheck.ms.median\n' + line
      return expectations(src).some((e) => { const subject = e.subject.replace(/\ba\b/g, 'r.still.withCheck.ms.median').replace(/\bb\b/g, 'r.still.withoutCheck.ms.median')
        if (!COMPARES.has(e.matcher) || !readsATime(subject) || /\//.test(subject)) return false
        return aNumber(e.arg) || /\b\d+(\.\d+)?\b/.test(e.arg.replace(/\[[^\]]*\]|\.[A-Za-z_]\w*/g, '').replace(/[A-Za-z_]\w*/g, '')) }) }
    for (const line of old) expect(refused(line), line).toBe(true)
    /* and the lines as they are now are let through */
    for (const line of ['expect(p!.ratio, `x`).toBeLessThan(1.25)', 'expect((p!.withCheck - p!.withoutCheck) / t.plainMs.median, `x`).toBeLessThan(.5)', 'expect(m.ms.min, at).toBeLessThanOrEqual(m.ms.median)', 'expect(r.still.withCheck.checks, `x`).toBe(0)']) expect(refused(line), line).toBe(false)
  })
  it('the tool gives the tests frames taken turn about, the two askings back to back, and its own clock beside the script time', () => {
    const tool = readFileSync('tools/frame-cost.mjs', 'utf8')
    // turn about: one frame with the check due, the next without, in one loop
    expect(tool).toMatch(/const A=await page\.evaluate\(tick,WITH_CHECK_MS\),B=await page\.evaluate\(tick,WITHOUT_CHECK_MS\)/)
    expect(tool).toMatch(/row\.stillPaired=await stillPaired\(page\)/)
    // back to back: the structure's asking and every triangle's, timed in the same call
    expect(tool).toMatch(/const a=S\.realNow\(\),fast=s\.hiding\(\),b=S\.realNow\(\),plain=s\.hiding\('plain'\),c=S\.realNow\(\)/)
    expect(tool).toMatch(/pairs:views\.length,ratio:round\(median\(ms\)\/median\(plain\),4\)/)
    expect(tool).toMatch(/out\.wallMs=Date\.now\(\)-wall0\+1/); expect(tool).toMatch(/total:round\(ms\.reduce/)
    // the printed table keeps its milliseconds: it is a report
    expect(tool).toMatch(/script ms, still: with the check \/ without/)
  })
  it('the counts that are each test\'s pass or fail are still asserted: the check\'s runs, the shadow pass\'s draw calls, a still frame\'s draw calls, the pixels that differ', () => {
    const [cost, see, shadow, still] = TESTS.map(code) as [string, string, string, string]
    expect(see).toMatch(/expect\(r\.still\.withCheck\.checks,[^)]*\)\.toBe\(0\)/); expect(see).toMatch(/expect\(p!\.checks,[^)]*\)\.toBe\(0\)/)
    expect(see).toMatch(/expect\(r\.scrolling\.withCheck\.checks!,[^)]*\)\.toBeGreaterThan\(30\)/); expect(see).toMatch(/expect\(r\.seeThrough!\.same,[^)]*\)\.toBe\(r\.seeThrough!\.views\)/)
    expect(shadow).toMatch(/expect\(m\.draws\.shadow,[^)]*\)\.toBeLessThan\(120\)/); expect(shadow).toMatch(/expect\(r\.held\.draws\.shadow,[^)]*\)\.toBe\(0\)/); /* (viewer.pixel-compare-tests-hold-against-frame-noise, 2026-10-06: this asked for `expect(r.shadow!.worst, …).toBeLessThanOrEqual(2)`; the shadow's compare is now held at 0 exactly) */
    expect(shadow).toMatch(/expect\(r\.shadow!\.worst,[^)]*\)\.toBe\(0\)/); expect(shadow).toMatch(/expect\(r\.shadow!\.differing,[^)]*\)\.toBe\(0\)/)
    expect(still).toMatch(/expect\(orphanage\.held\.draws\)\.toEqual\(\{ all: 0, shadow: 0, scene: 0, bodies: 0 \}\)/); expect(still).toMatch(/expect\(orphanage\.live\.afterCamera,[^)]*\)\.toBe\(0\)/)
    expect(cost).toMatch(/expect\(p\.all,[^)]*\)\.toBe\(p\.shadow \+ p\.scene \+ p\.bodies \+ \(p\.other \?\? 0\)\)/)
  })
})
