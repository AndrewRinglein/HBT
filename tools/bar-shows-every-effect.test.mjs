// viewer.bar-shows-every-effect (engine backlog; engine DECISIONS.md 2026-10-03 'the action bar: the moves grey slightly once
// the move is done, nothing else greys; every action shows all it does; the Soldier holds no sword'). Andrew: "some of the
// information and some of the actions are missing. For example, a dagger giving you one protection is not shown in the dagger
// attack." The component's half, asked of the page (VIEWER_PAGE, else BATTLE-VIEWER.html): THE AUDIT (tools/bar-audit.mjs) is
// run over the page for every unit the opening run can field — the engine's own list of each unit's actions and triggers
// (tools/fixtures/bar-audit-roster.json, held to the engine by test/viewer.bar-shows-every-effect.test.ts) against the bar as
// drawn — and wants (1) a button for every action on the engine's sheet and (2) everything an action does said on its button
// or in its tooltip. The Stab's own text is read. And past the roster: every action row the engine has, and every trigger an
// item brings, is said whole by the function the tooltip is drawn from. The sandbox's half is kingdom
// tools/bar-shows-every-effect.verify.mjs.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { auditPage, actionNeeds, said } from './bar-audit.mjs'
import { actionLines, ridersOf, unitTriggers, triggersFor } from '../src/actions.js'
const html = readFileSync(process.env.VIEWER_PAGE || 'BATTLE-VIEWER.html', 'utf8')
const ROSTER = JSON.parse(readFileSync('tools/fixtures/bar-audit-roster.json', 'utf8'))
const STATIC = JSON.parse(readFileSync('generated/static.json', 'utf8'))
const D = { UD: STATIC.units, ACT: STATIC.actions, BADGES: STATIC.badges, LAYERS: STATIC.layers, ITEMS: STATIC.items, KINDS: STATIC.actionKinds }
let audit
const run = () => (audit ??= auditPage(html, ROSTER))

test('the audit, sheet actions vs bar buttons: every action the engine\'s unit holds is a button on its bar', () => {
  const { units } = run()
  /* Law 10, 2026-10-04 (engine fix.opening-probe-cadence; engine DECISIONS.md 2026-10-03 'one draft after every battle; …': "One,
     yes." — a party of 1, 2, 3, 4, 5, 6): this read
       assert.ok(units.length >= 80, 'the roster\'s units'); assert.ok(units.reduce((n, u) => n + u.actions.length, 0) >= 350, 'their actions')
     — floors under the roster of the day (83 units, 360 actions), whose opening battles 2 to 5 each fielded one more drafted
     hero than the player has. The roster is the engine's (held to it by test/viewer.bar-shows-every-effect.test.ts), and it
     is four heroes smaller by the ruling: 79 units, 340 actions. What the floors stood for is held exactly instead — the
     audit read EVERY unit of the roster and every action each holds — with a floor still under each so an emptied roster
     cannot pass. */
  const rostered = ROSTER.battles.flatMap(b => b.units), actionsOf = list => list.reduce((n, u) => n + u.actions.length, 0)
  assert.equal(units.length, rostered.length, 'the audit read every unit of the roster'); assert.ok(units.length >= 75, 'the roster\'s units')
  assert.equal(actionsOf(units), actionsOf(rostered), 'and every action each holds'); assert.ok(actionsOf(units) >= 330, 'their actions')
  const heroes = new Set(units.filter(u => u.typeId.startsWith('hero.base.')).map(u => u.typeId)); assert.equal(heroes.size, 24, 'the 24 base heroes')
  const missing = units.flatMap(u => u.missingActions.map(id => `${u.battle} · ${u.name}: ${id}`))
  assert.deepEqual(missing, [], 'no action on the engine\'s sheet is missing from the bar')
  for (const u of units) assert.deepEqual([...u.drawn].sort(), [...new Set(u.actions)].sort(), `${u.name}: the bar draws the unit's actions and nothing else`)
})

test('the audit, sheet effects vs shown text: everything an action does is on its button or in its tooltip', () => {
  const { gaps } = run()
  assert.deepEqual(gaps, [], 'the audit\'s list of what is not shown is empty:\n' + gaps.slice(0, 40).join('\n'))
})

test('the Stab: a unit holding a dagger sees "gain 1 Protection" on it — on the button and whole in the tooltip', () => {
  const { units } = run()
  const holders = units.filter(u => u.actions.includes('attack.dagger.stab'))
  assert.ok(holders.length >= 2, 'the Orphanage\'s civilians hold daggers')
  for (const u of holders) {
    const shown = u.rows['attack.dagger.stab']
    assert.match(shown, /On attack: gain 1 Protection/, `${u.name}: ${shown}`)
    assert.match(shown.split(' | ')[0], /Stab .*Protection 1/, 'the chip on the button itself: ' + shown.split(' | ')[0])
  }
  /* the Flaming Longsword's Slash says its fire: the Burn and the fire damage the item brings */
  const flaming = units.find(u => u.triggers.some(t => t.source === 'item.longsword.flaming'))
  assert.match(flaming.rows['attack.longsword.slash'], /On hit: apply 1 Burn/); assert.match(flaming.rows['attack.longsword.slash'], /On hit: 2 fire damage/)
  assert.doesNotMatch(flaming.rows['attack.longsword.stab'], /Burn|fire/, 'a trigger scoped to the Slash is not said on the Stab')
  /* a power's own effects are on its button (they were on no screen): the Bishop's Heal */
  const bishop = units.find(u => u.actions.includes('power.holy-symbol.heal'))
  assert.match(bishop.rows['power.holy-symbol.heal'].split(' | ')[0], /Heal .*party Spirit/); assert.match(bishop.rows['power.holy-symbol.heal'], /Target: one ally · Range 6/)
})

test('past the roster: every action row the engine has, and every trigger an item or a badge brings, is said whole', () => {
  const lacking = []
  for (const [id, row] of Object.entries(STATIC.actions)) {
    const a = { id, ...row, kind: STATIC.actionKinds[id] === 'move' ? 'move' : STATIC.actionKinds[id] === 'burst' ? 'burst' : 'x' }
    const shown = actionLines(a, {}, D, STATIC.statuses).join(' | ') + ' | ' + a.staminaCost
    for (const n of actionNeeds({ id, ...row }, [], STATIC)) { const lacks = n.needs.filter(x => !said(shown, x)); if (lacks.length) lacking.push(`${id}: ${n.what} — ${lacks.map(x => x.word ?? x.num ?? x.anyOf.join('|')).join(', ')} — "${shown}"`) }
  }
  assert.deepEqual(lacking.slice(0, 25), [], `${lacking.length} action rows not said whole`)
  assert.ok(Object.keys(STATIC.actions).length > 700, 'every row')
  /* every item's triggers reach the unit that holds it, and an attacker's trigger is said on the attack it rides */
  let brought = 0, riding = 0
  for (const [itemId, item] of Object.entries(STATIC.items)) {
    if (!item.triggers.length) continue
    const u = { typeId: 'unit.none', kit: { held: [{ itemId, grants: item.grants, abilities: item.abilities }] }, badges: [] }
    assert.deepEqual(unitTriggers(u, D), item.triggers, itemId); brought++
    for (const g of item.grants) { const a = { id: g, ...STATIC.actions[g] }, shown = actionLines(a, u, D, STATIC.statuses).join(' | ')
      for (const n of actionNeeds(a, item.triggers, STATIC).filter(n => n.what.startsWith('trigger '))) { riding++
        const lacks = n.needs.filter(x => !said(shown, x)); assert.deepEqual(lacks, [], `${itemId} ${g}: ${n.what} — "${shown}"`) } }
  }
  assert.ok(brought > 150 && riding > 100, `${brought} items bring triggers, ${riding} ride an attack`)
  for (const [badgeId, b] of Object.entries(STATIC.badges)) if ((b.triggers || []).length) assert.deepEqual(unitTriggers({ typeId: 'unit.none', badges: [badgeId] }, D), b.triggers, badgeId)
  /* the engine fires attacker hooks from its attack pipeline only: a power carries no rider, and a defender's onBlock rides nothing */
  const owner = { typeId: 't' }, DD = { ...D, UD: { t: { triggers: [{ id: 'x', hook: 'onHit', chance: 100, select: 'target', effect: { kind: 'status.apply', statusId: 'status.burn', value: 1 } },
    { id: 'y', hook: 'onBlock', role: 'defender', chance: 100, select: 'self', effect: { kind: 'status.apply', statusId: 'status.protection', value: 1 } }] } } }
  assert.deepEqual(ridersOf(owner, { id: 'power.p', effects: [] }, DD), [], 'a power fires no attacker hook')
  assert.deepEqual(ridersOf(owner, { id: 'attack.a', attack: { kind: 'melee' } }, DD).map(t => t.id), ['x'], 'an attack carries the unscoped onHit, not the defender\'s onBlock')
  assert.deepEqual(triggersFor(owner, { id: 'attack.a', kind: 'melee', attack: { kind: 'melee' } }, DD, STATIC.statuses, () => ({ hue: '#fff' })).map(t => t.title), ['On hit: apply 1 Burn'])
})
