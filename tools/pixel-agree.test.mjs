// viewer.pixel-compare-tests-hold-against-frame-noise (engine backlog; found 2026-10-06 by the viewer worker's gate: the page
// test of viewer.solid-pieces-drawn-by-material "failed the viewer gate's checks part twice and once run alone (6, 2 and 5
// pixels differing) before passing on a fourth run, in a gate that had not touched it"). "A test that fails one run in three
// teaches chats to rerun and wave a red gate through." What was found (viewer SWITCHES.md, the item's section): this machine's
// graphics card, handed the very same calls with the very same numbers, gives a still frame one of a few pictures — a handful
// of pixels one shade apart — and which one it gives changes from frame to frame; the software renderer never does. It
// cannot be removed in the page. So a compare of two WAYS of drawing a view holds its claim against that: each way is drawn
// N times, turn about, and A PIXEL IS THE OTHER WAY'S DOING ONLY IF NONE OF ITS N DRAWINGS SHOWS A COLOUR THAT ONE OF THE
// REFERENCE'S N SHOWS THERE (tools/pixel-agree.mjs). No drawing is repeated until it matches: N is fixed, every drawing counts.
// Held here on made pictures, without a graphics card: what the rule passes, what it fails, and what it says of the noise.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { agree, comparer } from './pixel-agree.mjs'

const W = 40, H = 30, N = 10
const rng = seed => () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 }
/** a made picture: two canvases, every pixel its own colour */
const picture = () => [0, 1].map(c => { const a = new Uint8Array(W * H * 4); for (let i = 0; i < W * H; i++) { a[i * 4] = (i * 7 + c * 31) & 255; a[i * 4 + 1] = (i * 13) & 255; a[i * 4 + 2] = (i * 3 + 90) & 255; a[i * 4 + 3] = 255 } return a })
const copy = p => p.map(a => a.slice())
const at = (x, y) => (y * W + x) * 4
/** N drawings of a way: the base picture, each drawing changed by `each(picture, k)` */
const drawings = (base, each = () => {}) => Array.from({ length: N }, (_, k) => { const p = copy(base); each(p, k); return p })
/** the card's own noise: these places of the first canvas are one shade off in a drawing, now and then, together or apart */
const NOISY = [[3, 2, 0], [17, 9, 1], [25, 20, 0], [8, 28, 1], [39, 0, 2], [0, 29, 0]]
const noise = (r, rate) => (p) => { const all = r() < rate, some = r() < rate / 3; NOISY.forEach(([x, y, ch], i) => { if (all || (some && i % 2)) p[0][at(x, y) + ch] += 1 }) }

test('the same picture every time: nothing differs, nothing is unsteady', () => {
  const base = picture(), got = agree(drawings(base), drawings(base))
  assert.deepEqual(got, { differing: 0, worst: 0, draws: N, firstPair: 0, unsteady: 0, unsteadyBy: 0, otherUnsteady: 0, otherUnsteadyBy: 0 })
})

test('the card\'s noise in both ways — a handful of pixels one shade off, now and then — is no difference between the ways, whatever the two first drawings happened to be', () => {
  const base = picture()
  let firstPairs = 0
  for (let seed = 1; seed <= 200; seed++) { const r = rng(seed)
    const A = drawings(base, noise(r, .45)), B = drawings(base, noise(r, .45)), got = agree(A, B)
    assert.equal(got.differing, 0, `seed ${seed}: pixels no drawing of the two ways agrees on`); assert.equal(got.worst, 0)
    assert.ok(got.unsteady <= NOISY.length && got.otherUnsteady <= NOISY.length); assert.ok(got.unsteadyBy <= 1 && got.otherUnsteadyBy <= 1)
    if (got.firstPair) firstPairs++ }
  assert.ok(firstPairs > 60, 'in many of them the first drawing of each way differed — what the compare of one drawing against one read as a fault: ' + firstPairs + ' of 200')
})

test('noise the reference happens never to show in its N drawings (it is rare: seen once in forty frames) and the other way shows in one of its own: still no difference', () => {
  const base = picture()
  const A = drawings(base), B = drawings(base, (p, k) => { if (k === 6) for (const [x, y, ch] of NOISY) p[0][at(x, y) + ch] += 1 })
  const got = agree(A, B)
  assert.equal(got.differing, 0); assert.equal(got.unsteady, 0, 'the reference showed no noise at all'); assert.equal(got.otherUnsteady, 6); assert.equal(got.otherUnsteadyBy, 1)
  /* (the rule "every pixel in which the other way differs must be one the reference's drawings differed in" fails this view: the set is empty) */
  /* and the other way round: the reference is the one that showed it */
  const back = agree(B, A); assert.equal(back.differing, 0); assert.equal(back.unsteady, 6); assert.equal(back.otherUnsteady, 0)
  /* the FIRST drawing of the other way is the off one: one drawing against one would have read six pixels */
  const C = drawings(base, (p, k) => { if (k === 0) for (const [x, y, ch] of NOISY) p[0][at(x, y) + ch] += 1 })
  const first = agree(A, C); assert.equal(first.firstPair, 6); assert.equal(first.differing, 0)
})

test('a pixel the other way draws differently EVERY time fails — by a single shade, on one pixel of two million, noise or no noise beside it', () => {
  const base = picture()
  for (let seed = 1; seed <= 50; seed++) { const r = rng(seed * 977)
    const A = drawings(base, noise(r, .45)), B = drawings(base, (p, k) => { noise(r, .45)(p); p[1][at(11, 4) + 1] += 1 })
    const got = agree(A, B); assert.equal(got.differing, 1, 'seed ' + seed); assert.equal(got.worst, 1) }
  /* on a pixel that is itself one of the noisy ones: the reference shows two colours there, the other way a third */
  const [x, y, ch] = NOISY[0]
  const A = drawings(base, (p, k) => { if (k % 2) p[0][at(x, y) + ch] += 1 }), B = drawings(base, p => { p[0][at(x, y) + ch] += 3 })
  const got = agree(A, B); assert.equal(got.differing, 1); assert.equal(got.worst, 2, 'two shades from the nearer of the reference\'s two colours')
})

test('a piece drawn in another place fails by every pixel it moved, and says how far off the nearest drawing was', () => {
  const base = picture()
  const moved = p => { for (let y = 5; y < 15; y++) for (let x = 10; x < 22; x++) { const i = at(x, y); p[0][i] = 200; p[0][i + 1] = 10; p[0][i + 2] = 10 } }
  const got = agree(drawings(base), drawings(base, moved))
  assert.ok(got.differing >= 10 * 12 - 2 && got.differing <= 10 * 12, 'the moved block: ' + got.differing); assert.ok(got.worst > 40)
  assert.equal(got.firstPair, got.differing); assert.equal(got.otherUnsteady, 0, 'it is drawn wrong the same way every time')
})

test('a fault that shows in SOME drawings of the other way only is not a difference by the rule — and is not hidden: the other way\'s own drawings are then unsteady by far more than a shade, which the page tests hold', () => {
  const base = picture()
  const B = drawings(base, (p, k) => { if (k % 3 === 0) for (let x = 0; x < 8; x++) p[0][at(x, 12)] ^= 128 })
  const got = agree(drawings(base), B)
  assert.equal(got.differing, 0); assert.equal(got.otherUnsteady, 8); assert.ok(got.otherUnsteadyBy >= 100, 'by ' + got.otherUnsteadyBy)
  assert.equal(got.unsteadyBy, 0)
})

test('both canvases are counted, and the drawings must be as many each way', () => {
  const base = picture()
  const got = agree(drawings(base), drawings(base, p => { p[0][at(1, 1)] += 5; p[1][at(2, 2) + 2] += 9 }))
  assert.equal(got.differing, 2); assert.equal(got.worst, 9)
  assert.throws(() => agree(drawings(base), drawings(base).slice(1)), /as many/)
  assert.throws(() => agree([], []), /no drawing/)
})

test('the compare is fed one drawing at a time and keeps none of them: a drawing may be drawn over once it is handed in; the ways come turn about, the reference first', () => {
  const base = picture(), r = rng(31)
  const A = drawings(base, noise(r, .5)), B = drawings(base, (p, k) => { noise(r, .5)(p); p[1][at(7, 7)] += 4; if (k === 3) p[0][at(30, 3) + 2] ^= 64 })
  const whole = agree(A, B)
  /* the same drawings through ONE pair of buffers, written over for every drawing */
  const c = comparer(), scratch = base.map(a => new Uint8Array(a.length))
  for (let i = 0; i < N; i++) { A[i].forEach((a, k) => scratch[k].set(a)); c.a(scratch); B[i].forEach((a, k) => scratch[k].set(a)); c.b(scratch) }
  for (const s of scratch) s.fill(0)
  assert.deepEqual(c.done(), whole); assert.equal(whole.differing, 1); assert.equal(whole.worst, 4); assert.equal(whole.otherUnsteadyBy, 64)
  /* out of turn is refused */
  const d = comparer(); d.a(base); assert.throws(() => d.a(base), /turn about/); d.b(base); assert.throws(() => d.b(base), /turn about/)
  assert.throws(() => comparer().b(base), /turn about/); assert.throws(() => comparer().done(), /no drawing/)
  const e = comparer(); e.a(base); assert.throws(() => e.done(), /as many/)
})

test('the function stands by itself — the tool hands its text to the page — and repeats no drawing', () => {
  const text = comparer.toString()
  assert.doesNotMatch(text, /\b(import|require|window|document)\b/)
  const made = (0, eval)('(' + text + ')'), base = picture(), c = made()
  const A = drawings(base), B = drawings(base, p => { p[0][at(4, 4)] += 2 })
  for (let i = 0; i < N; i++) { c.a(A[i]); c.b(B[i]) }
  assert.deepEqual(c.done(), agree(A, B))
  const src = readFileSync('tools/pixel-agree.mjs', 'utf8')
  assert.doesNotMatch(src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, ''), /\bwhile\b|retry|again/i, 'nothing in it is done again')
})
