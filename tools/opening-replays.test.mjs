// viewer.opening-replays (engine backlog; engine DECISIONS.md 2026-10-03 'the opening battles are watchable as
// computer-played replays'). Andrew: "I want to be able to watch some of the replays of these initial battles." /
// "Just the computer played recordings." The replay page's dropdown lists the opening's six battles together, in the
// opening's order, each under the name its encounter carries; each plays from its first event to its last, every event
// type folded or deliberately ignored, and ends as its log says.
// Runs against the page (VIEWER_PAGE, else BATTLE-VIEWER.html).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { makeWindow } from './fakedom.mjs'
import { FOLDED_TYPES } from '../src/fold.js'

/* the opening's order and its names: the six positions, each with its encounter (progression/build-schedule.mjs) */
const OPENING = JSON.parse(readFileSync('../progression/OPENING-PARTY.json', 'utf8')).positions
const library = JSON.parse(readFileSync('battles/library.json', 'utf8')).battles
const exportOf = file => JSON.parse(readFileSync('battles/' + file, 'utf8'))
/* the types the gate's verify ignores on purpose — its own list, read where it is written rather than copied here */
const ignoredSrc = readFileSync('tools/verify.mjs', 'utf8').match(/const IGNORED = new Set\(\[([\s\S]*?)\]\)/)
assert.ok(ignoredSrc, 'tools/verify.mjs still writes its ignore list as const IGNORED = new Set([...])')
const IGNORED = new Set([...ignoredSrc[1].matchAll(/'([^']+)'/g)].map(m => m[1]))

function boot() {
  const html = readFileSync(process.env.VIEWER_PAGE || 'BATTLE-VIEWER.html', 'utf8'), m = html.match(/<script>([\s\S]*)<\/script>\s*$/), w = makeWindow()
  w.document.body.innerHTML = html.slice(0, m.index).replace(/<style>[\s\S]*?<\/style>/, '').replace(/<!--[\s\S]*?-->/g, '').replace(/<(meta|title|link)[^>]*>(<\/title>)?/g, '')
  const names = ['window','document','requestAnimationFrame','setTimeout','clearTimeout','setInterval','clearInterval','addEventListener','alert','Date','performance','getComputedStyle','localStorage','self','globalThis']
  new Function(...names, m[1])(...names.map(n => ['window','self','globalThis'].includes(n) ? w : w[n]))
  return w
}
const w = boot(), H = w.__battleView.harness
/* the library's rows whose export is an opening encounter, with where each sits in the dropdown */
const rows = library.map((row, i) => ({ ...row, i, battle: exportOf(row.file) })).filter(r => /^encounter\.opening\./.test(r.battle.seed.encounter?.id ?? ''))

test('the dropdown lists the opening\'s six battles together, in the opening\'s order, each under its encounter\'s name', () => {
  assert.equal(OPENING.length, 6, 'the opening is six battles')
  const options = library.map((_, i) => w.document.getElementById('battleOption' + i))
  assert.ok(options.every(Boolean), 'one dropdown option per library row')
  assert.deepEqual(rows.map(r => r.battle.seed.encounter.id), OPENING.map(p => p.encounterId), 'one recording of each, in the opening\'s order')
  assert.deepEqual(rows.map(r => options[r.i].textContent), OPENING.map(p => p.name), 'each under its name')
  assert.deepEqual(rows.map(r => r.i), rows.map((_, k) => rows[0].i + k), 'the six sit together')
})

for (const p of OPENING) test(`${p.name} plays from start to finish: no unknown event, and it ends as its log says`, () => {
  const row = rows.find(r => r.battle.seed.encounter.id === p.encounterId)
  assert.ok(row, `the library has a recording of ${p.encounterId}`)
  const unknown = [...new Set(row.battle.events.map(e => e.type))].filter(t => !FOLDED_TYPES.includes(t) && !IGNORED.has(t))
  assert.deepEqual(unknown, [], 'every event type is folded or on verify\'s ignore list')
  H.load(row.i)
  const v = H.viewer; v.pause()
  const wrap = v._V.dom.stage.parentNode
  Object.defineProperty(wrap, 'clientWidth', { value: 1408, configurable: true }); Object.defineProperty(wrap, 'clientHeight', { value: 744, configurable: true })
  assert.equal(v.events.length, row.battle.events.length, 'the page plays the whole export')
  assert.equal(v.events.find(e => e.type === 'encounter.begin').name, p.name)
  let cur = v.cursor
  while (v.cursor < v.events.length) { w._tick(200); v.step(); assert.notEqual(v.cursor, cur, `step advanced past event ${cur}`); cur = v.cursor }
  assert.equal(v.events.at(-1).type, 'battle.end', 'the log runs to the battle\'s end')
  assert.equal(v.state.outcome, row.battle.outcome, 'the board ends on the outcome the engine recorded')
})

test('after the six', () => { H.dispose() })
