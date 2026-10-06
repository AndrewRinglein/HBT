// content.resistance-to-weak-and-vigil-party-spirit (engine item, 2026-10-06). Ruled 2026-10-05 (engine/DECISIONS.md 'a prone
// unit only stands; … Resistance to Weak; the Vigil heals by the party's Spirit'; GLOSSARY.md 'Settled, 2026-10-05'):
// "Immunity to week 2 should now be resistance to week 2. And yes, when we get to that part, it should remove two points of
// weak". The item's words for the page: "the floating words ('WEAK WARDED -2' becomes the GLOSSARY's word), the log line, the
// tooltip". The engine's line keeps its id (status.warded) and its fields; what a player reads over the unit, in the log and
// on the bar is Resistance to Weak. And the Vigil's bar says the party's Spirit.
//
// The component's own modules on the library's own battle (battles/test.banner-courage.json: a Necromancer's Weak lands on a
// warrior standing in his Banner of Courage); it needs no page.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const battle = JSON.parse(readFileSync('battles/test.banner-courage.json', 'utf8'))
const STATIC = JSON.parse(readFileSync('generated/static.json', 'utf8'))
const warded = battle.events.filter(e => e.type === 'status.warded')

test('the library battle holds Weak that did not land inside the Banner of Courage', () => {
  assert.ok(warded.length >= 1)
  for (const e of warded) { assert.equal(e.statusId, 'status.weak'); assert.equal(e.causeId, 'power.banner-courage.plant'); assert.ok(e.amount >= 1 && e.amount <= 2 && e.amount <= e.of) }
})

test('over the unit: RESISTANCE TO WEAK and the points that came off, the engine\'s own number - never WARDED', async () => {
  const { createState, fold } = await import('../src/fold.js')
  const S = createState(), ctx = { UD: STATIC.units, SN: STATIC.statuses }
  let seen = 0
  for (const e of battle.events) {
    const cues = fold(S, e, ctx)
    if (e.type !== 'status.warded') continue
    const f = cues.find(c => c.k === 'float'); assert.ok(f, 'the points that came off float over the unit')
    assert.equal(f.text, 'RESISTANCE TO WEAK −' + e.amount); assert.equal(f.n, e.amount); assert.equal(f.of, 'amount')
    assert.doesNotMatch(f.text, /WARDED|IMMUN/i)
    seen++
  }
  assert.equal(seen, warded.length)
})

test('in the log: Resistance to Weak, how many of how many did not land, on whom and by what - never Immunity', async () => {
  const { buildLog } = await import('../src/log.js')
  const out = buildLog(battle.events, STATIC.statuses, null, { ACT: STATIC.actions })
  const html = typeof out === 'string' ? out : JSON.stringify(out)
  const e = warded[0]
  assert.match(html, new RegExp('Resistance to Weak: ' + e.amount + ' of ' + e.of + ' Weak does not land on '))
  assert.doesNotMatch(html, /Immunity to Weak|warded/i)
})

test('on the bar: the Banner of Courage says Resistance to Weak 2 and what that is; the Banner of the Vigil heals by the party\'s Spirit', async () => {
  const { plantWords } = await import('../src/actions.js')
  // the engine's own rows (the dump's when it carries them; the Vigil's amount is the engine's row as content.resistance-to-weak… compiles it)
  const courage = { kind: 'plant', radius: 2, mods: { resist: 1 }, wards: { 'status.weak': 2 }, lends: [{ id: 'trigger.banner-courage.plant.surge', hook: 'onActivationEnd', chance: 100, select: 'self', effect: { kind: 'surge.gain', value: 10 }, source: 'power.banner-courage.plant' }] }
  assert.deepEqual(STATIC.actions['power.banner-courage.plant'].effects[0], courage)
  const said = plantWords(courage, { ACT: STATIC.actions }, STATIC.statuses)
  assert.match(said, /Resistance to Weak 2 \(2 points come off each Weak gained\)/)
  assert.doesNotMatch(said, /Immunity|does not land/i)
  const vigil = { kind: 'plant', radius: 1, lends: [{ id: 'trigger.banner-vigil.plant.heal', hook: 'onActivationEnd', chance: 100, select: 'self', effect: { kind: 'heal', amount: { scale: 'partySpirit', base: 0, mult: 1 } }, source: 'power.banner-vigil.plant' }] }
  assert.match(plantWords(vigil, { ACT: STATIC.actions }, STATIC.statuses), /allies within 1 hex of that hex: at the end of its activation: heal party Spirit$/)
})
