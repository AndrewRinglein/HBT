// viewer.bar-shows-tag-requirement (engine backlog, 2026-10-04; engine DECISIONS.md 2026-10-04 'after the backlog run: ... a
// trigger on the hero with a tag requirement ...', Andrew: "it only triggers when you're using something that has the tag
// melee"; 2026-10-03 'the action bar: ... every action shows all it does' - every effect an action will have and none it will
// not). The engine reads `onlyWithTag` on a unit's trigger; the bar and the panel did not know it: a Burning Touch bearer's
// bow shot read "On hit: apply 1 Burn" though the Burn no longer fires with it. The component's half, asked of the page
// (VIEWER_PAGE, else BATTLE-VIEWER.html) over four heroes the ENGINE fielded (tools/fixtures/bar-tag-requirement-roster.json,
// held to the engine by test/viewer.bar-shows-tag-requirement.test.ts):
//   the bar   - a trigger with a tag requirement is listed only on the attacks that have the tag. Which attacks have it is
//               the engine's answer (core/action.ts carriesTag), dumped per required tag (generated/static.json
//               tagCarriers) and read as a list; the viewer keeps no copy of the rule;
//   the panel - where the trigger itself is described its line says the requirement, in the Codex's words: "only with a
//               melee attack";
//   as before - a trigger with no requirement is on every attack; a hero with no such trigger has the bar it had.
// The sandbox's half is kingdom tools/bar-shows-tag-requirement.verify.mjs.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { makeWindow } from './fakedom.mjs'
import { auditPage, shownOf, ATTACKER_HOOKS } from './bar-audit.mjs'
import * as actions from '../src/actions.js'
const { actionLines, ridersOf, triggersFor } = actions
const html = readFileSync(process.env.VIEWER_PAGE || 'BATTLE-VIEWER.html', 'utf8')
const ROSTER = JSON.parse(readFileSync('tools/fixtures/bar-tag-requirement-roster.json', 'utf8'))
const OPENING_ROSTER = JSON.parse(readFileSync('tools/fixtures/bar-audit-roster.json', 'utf8'))
const STATIC = JSON.parse(readFileSync('generated/static.json', 'utf8'))
const D = { UD: STATIC.units, ACT: STATIC.actions, BADGES: STATIC.badges, LAYERS: STATIC.layers, ITEMS: STATIC.items, KINDS: STATIC.actionKinds, TAG_CARRIERS: STATIC.tagCarriers }
const SHOTS = STATIC.items['item.shortbow'].grants, PUNCH = 'attack.punch'
const text = x => String(x ?? '').replace(/<[^>]*>/g, ' ').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/\s+/g, ' ')

let page
function boot() {
  if (page) return page
  const m = html.match(/<script>([\s\S]*)<\/script>\s*$/), w = makeWindow()
  w.document.body.innerHTML = html.slice(0, m.index).replace(/<style>[\s\S]*?<\/style>/, '').replace(/<!--[\s\S]*?-->/g, '').replace(/<(meta|title|link)[^>]*>(<\/title>)?/g, '')
  const names = ['window','document','requestAnimationFrame','setTimeout','clearTimeout','setInterval','clearInterval','addEventListener','alert','Date','performance','getComputedStyle','localStorage','self','globalThis']
  new Function(...names, m[1])(...names.map(n => ['window','self','globalThis'].includes(n) ? w : w[n]))
  const B = w.__battleView; B.harness.dispose()
  return (page = { w, B, L: B.lib })
}
/** one roster battle on the page, its hero looked at: each bar row as shown (button text | tooltips), its chips, and the panel's trigger rows */
const seen = new Map()
function look(k) {
  if (seen.has(k)) return seen.get(k)
  const { w, B, L } = boot(), b = ROSTER.battles[k], S = L.static, EV = b.events, mapId = EV.find(e => e.type === 'map.loaded').mapId
  /* the host hands the page's own static tables on, as the replay page does (src/harness.js) - tagCarriers among them */
  const data = { field: L.fields[mapId], fieldMapId: mapId, initialEvents: EV, units: S.units, statuses: S.statuses, absorbingStatuses: S.absorbingStatuses, actions: S.actions, badges: S.badges,
    layers: S.layers, actionKinds: S.actionKinds, statusRows: S.statusRows, itemClasses: S.itemClasses, items: S.items, hands: S.hands, tagCarriers: S.tagCarriers, artmap: L.art.artmap, assets: L.art.assets, glyphs: L.glyphs, meta: { seed: { mapId } } }
  const el = w.document.createElement('div'); w.document.body.appendChild(el)
  const v = B.mount(el, data, { autoplay: false }); v.push(EV); v.seek(EV.length)
  const u = b.units.find(x => x.side === 'hero'); v.inspect(u.id)
  const V = v._V, drawn = V.dom.actionbar.querySelectorAll('.acRow').filter(r => r.dataset.act)
  const out = { label: b.label, unit: u, rows: Object.fromEntries(drawn.map(r => [r.dataset.act, shownOf(r)])),
    chips: Object.fromEntries(drawn.map(r => [r.dataset.act, r.querySelectorAll('.acTrg').map(c => shownOf(c).split(' | ')[0].trim())])),
    tips: Object.fromEntries(drawn.map(r => [r.dataset.act, text(r.getAttribute('title'))])),
    triggers: text(V.dom.panel.innerHTML.slice(V.dom.panel.innerHTML.indexOf('Triggers'))), panel: text(V.dom.panel.innerHTML) }
  v.dispose(); seen.set(k, out)
  return out
}
const BEARER = 0, WITHOUT = 1, STRIKE = 2, GAUNTLETS = 3

test('the Burning Touch with a Shortbow: the bow shots list no Burn, the Punch lists "On hit: apply 1 Burn"', () => {
  assert.ok(STATIC.tagCarriers, 'generated/static.json carries the engine\'s answers (tagCarriers)'); assert.ok(boot().L.static.tagCarriers, 'and the page was built with them')
  const b = look(BEARER)
  assert.deepEqual(b.unit.triggers.map(t => [t.source, t.hook, t.onlyWithTag]), [['item.rune-burning-touch', 'onHit', 'melee']], 'the engine: its one trigger is the rune\'s, with the melee requirement')
  assert.ok(SHOTS.length >= 2, 'the Shortbow grants its shots')
  for (const shot of SHOTS) {
    assert.ok(shot in b.rows, shot + ' is on the bar')
    assert.doesNotMatch(b.rows[shot], /Burn/, `the bow shot says no Burn, on the button or in its tooltip: ${b.rows[shot]}`)
    assert.deepEqual(b.chips[shot], [], 'and wears no chip for it')
    assert.doesNotMatch(b.tips[shot], /On hit/, 'its tooltip lists no rider at all')
  }
  assert.match(b.tips[PUNCH], /(^| )On hit: apply 1 Burn( |$)/, `the Punch's tooltip: ${b.tips[PUNCH]}`)
  assert.deepEqual(b.chips[PUNCH], ['Burn 1'], 'and its button wears the Burn chip')
  assert.match(b.rows[PUNCH], /On hit: apply 1 Burn/)
  /* the audit (tools/bar-audit.mjs) reads the same four heroes: nothing an action does is left unsaid, and it does not ask the bow for the Burn */
  const { units, gaps } = auditPage(html, ROSTER)
  assert.equal(units.length, ROSTER.battles.reduce((n, x) => n + x.units.length, 0)); assert.deepEqual(gaps, [], gaps.join('\n'))
})

test('the same hero without the rune: its bar is the bearer\'s, less the one Burn on the Punch', () => {
  const b = look(BEARER), c = look(WITHOUT)
  assert.deepEqual(c.unit.triggers, [], 'the engine: no trigger'); assert.deepEqual(c.unit.actions, b.unit.actions, 'the same actions')
  assert.deepEqual(Object.keys(c.rows), Object.keys(b.rows), 'the same buttons in the same order')
  /* every row but the Punch reads the same, word for word - the rune changed nothing the bow, the move or the power shows */
  for (const id of Object.keys(c.rows)) if (id !== PUNCH) assert.equal(b.rows[id], c.rows[id], id)
  assert.doesNotMatch(c.rows[PUNCH], /Burn|On hit/); assert.deepEqual(c.chips[PUNCH], [])
  assert.equal(b.tips[PUNCH].replace(/ ?On hit: apply 1 Burn/, ''), c.tips[PUNCH], 'the Punch differs by that one line')
  assert.doesNotMatch(c.panel, /only with a/)
})

test('the panel: the Burning Touch\'s line says "only with a melee attack"; the Gauntlets\' says brawl; a trigger with no requirement says none', () => {
  const b = look(BEARER)
  assert.match(b.triggers, /ON HIT Burn 1 · only with a melee attack( |$)/, b.triggers)
  const g = look(GAUNTLETS)
  assert.match(g.triggers, /Weak 1 · only with a brawl attack( |$)/, g.triggers); assert.match(g.triggers, /Burn 1 · only with a melee attack( |$)/, g.triggers)
  const s = look(STRIKE)
  assert.match(s.triggers, /ON CRIT Bleed 3(?! ·)/, s.triggers); assert.doesNotMatch(s.panel, /only with a/)
  /* the words are the Codex's (content mkcodexmd.mjs: "- only with a <tag> attack"), made of the trigger's own field */
  assert.equal(typeof actions.tagRequirementWords, 'function', 'src/actions.js exports tagRequirementWords')
  assert.equal(actions.tagRequirementWords({ onlyWithTag: 'melee' }), 'only with a melee attack'); assert.equal(actions.tagRequirementWords({ onlyWithTag: 'brawl' }), 'only with a brawl attack')
  assert.equal(actions.tagRequirementWords({ hook: 'onHit' }), '', 'no requirement, no words')
})

test('as before: the Bleeding Strike (no requirement) is on every attack; two requirements on one hero each ride the attacks that have their tag', () => {
  const s = look(STRIKE)
  assert.deepEqual(s.unit.triggers.map(t => [t.source, t.hook, t.onlyWithTag]), [['item.rune-bleeding-strike', 'onCrit', undefined]])
  for (const id of [...SHOTS, PUNCH]) { assert.match(s.tips[id], /On crit: apply 3 Bleed/, `${id}: ${s.tips[id]}`); assert.deepEqual(s.chips[id], ['Bleed 3'], id) }
  /* the Brawler in Pharaoh's Gauntlets wearing the Burning Touch: every attack he has is a brawl attack and a melee one (the engine's rows), so both ride each */
  const g = look(GAUNTLETS), attacks = g.unit.actions.filter(id => STATIC.actions[id].attack)
  assert.ok(attacks.length >= 3, 'the Gauntlets\' two strikes and the Punch: ' + attacks.join(', '))
  for (const id of attacks) {
    assert.ok(STATIC.tagCarriers.brawl.includes(id) && STATIC.tagCarriers.melee.includes(id), id + ' carries both tags by the engine')
    assert.match(g.tips[id], /On hit: apply 1 Weak/, `${id}: ${g.tips[id]}`); assert.match(g.tips[id], /On hit: apply 1 Burn/, `${id}: ${g.tips[id]}`)
  }
  /* a hero with no such trigger shows the bar it showed before: no unit the opening run can field carries a requirement, and
     for each the riders of every action are the rule as it stood - an attacker's hook, on an attack, unscoped or scoped to
     it, never a defender's - with the table never asked (a page holding none says the same) */
  let asked = 0
  for (const b of OPENING_ROSTER.battles) for (const u of b.units) {
    assert.ok(!u.triggers.some(t => t.onlyWithTag !== undefined), `${b.label} ${u.name}: no tag requirement`)
    const unit = { typeId: 'unit.none', badges: [] }, DD = { ...D, TAG_CARRIERS: undefined, UD: { 'unit.none': { triggers: u.triggers } } }
    for (const id of u.actions) { const a = { id, ...STATIC.actions[id] }
      const was = a.attack ? u.triggers.filter(t => ATTACKER_HOOKS.includes(t.hook) && !(t.onlyWithAttack && t.onlyWithAttack !== id) && t.role !== 'defender') : []
      assert.deepEqual(ridersOf(unit, a, DD), was, `${b.label} ${u.name} ${id}`); asked++ }
  }
  /* Law 10, 2026-10-06 — engine item rule.special-moves-unlock-at-level-two (engine DECISIONS.md 2026-10-06 'a hero's special moves
     unlock at level 2, ruled: all of them, every hero …'): this read
       assert.ok(asked >= 330, 'every action of the opening roster')
     — a floor under the roster of the day, 340 actions. The roster is the engine's (held to it, unit for unit and action for
     action, by test/viewer.bar-shows-every-effect.test.ts), and a level-1 hero no longer holds its class's special move: 42
     fieldings of the opening are of a level-1 hero, so it is 298 actions over the same 79 units. What the floor stood for is
     held exactly beside it; the floor is said again under the roster as it is, so an emptied roster still cannot pass. */
  assert.equal(asked, OPENING_ROSTER.battles.flatMap(b => b.units).reduce((n, u) => n + u.actions.length, 0), 'every action of the opening roster was asked')
  assert.ok(asked >= 290, 'every action of the opening roster')
})

test('the rule is the engine\'s, read from the dump: for every attack, a tag-required trigger rides it exactly when the table lists it', () => {
  const tags = Object.keys(STATIC.tagCarriers); assert.ok(tags.includes('melee') && tags.includes('brawl'), 'the tags a trigger requires today: ' + tags.join(', '))
  const SN = STATIC.statuses, hue = () => ({ hue: '#fff' })
  let rides = 0, not = 0
  for (const tag of tags) {
    const t = { id: 'trigger.t', hook: 'onHit', chance: 100, select: 'target', effect: { kind: 'status.apply', statusId: 'status.burn', value: 1 }, onlyWithTag: tag }
    const owner = { typeId: 't' }, DD = { ...D, UD: { t: { triggers: [t] } } }
    for (const [id, row] of Object.entries(STATIC.actions)) {
      const a = { id, ...row }, listed = STATIC.tagCarriers[tag].includes(id)
      assert.equal(ridersOf(owner, a, DD).length, row.attack && listed ? 1 : 0, `${tag} on ${id}`)
      if (!row.attack) continue
      const said = actionLines(a, owner, DD, SN).includes('On hit: apply 1 Burn'), chip = triggersFor(owner, { ...a, kind: row.attack.kind }, DD, SN, hue).some(c => c.title === 'On hit: apply 1 Burn')
      assert.equal(said, listed, `${tag} on ${id}: the tooltip`); assert.equal(chip, listed, `${tag} on ${id}: the chip`)
      listed ? rides++ : not++
    }
  }
  assert.ok(rides > 200 && not > 200, `${rides} attacks ride a requirement, ${not} do not`)
  /* both scopes on one trigger: both must hold (the engine reads the tag on the line after the attack scope) */
  const both = { id: 'trigger.b', hook: 'onHit', chance: 100, select: 'target', effect: { kind: 'status.apply', statusId: 'status.burn', value: 1 }, onlyWithAttack: PUNCH, onlyWithTag: 'melee' }
  const DB = { ...D, UD: { t: { triggers: [both] } } }
  assert.equal(ridersOf({ typeId: 't' }, { id: PUNCH, ...STATIC.actions[PUNCH] }, DB).length, 1)
  assert.equal(ridersOf({ typeId: 't' }, { id: 'attack.dagger.stab', ...STATIC.actions['attack.dagger.stab'] }, DB).length, 0, 'a melee attack that is not the scoped one')
  assert.equal(ridersOf({ typeId: 't' }, { id: PUNCH, ...STATIC.actions[PUNCH] }, { ...DB, UD: { t: { triggers: [{ ...both, onlyWithTag: 'ranged-only-word' }] } }, TAG_CARRIERS: { ...STATIC.tagCarriers, 'ranged-only-word': [SHOTS[0]] } }).length, 0, 'the scoped attack without the tag')
  /* a requirement the page holds no answer for is a finding, never a guess (Law 1): the viewer does not work out "has the tag" */
  const stranger = { typeId: 't' }, DS = { ...D, UD: { t: { triggers: [{ ...both, onlyWithAttack: undefined, onlyWithTag: 'moonlit' }] } } }
  assert.throws(() => ridersOf(stranger, { id: PUNCH, ...STATIC.actions[PUNCH] }, DS), /no answer.*moonlit/)
  assert.throws(() => ridersOf(stranger, { id: PUNCH, ...STATIC.actions[PUNCH] }, { ...DS, TAG_CARRIERS: undefined }), /no answer.*moonlit/)
  /* and the viewer reads no tags off an attack's row: a row whose tags say melee, not listed by the engine, carries nothing */
  const unlisted = { id: 'attack.not-in-the-table', name: 'X', range: 1, staminaCost: 0, tags: ['melee'], attack: { kind: 'melee', damageType: 'physical', stat: 'strength', bonus: 0 } }
  assert.equal(ridersOf({ typeId: 't' }, unlisted, { ...D, UD: { t: { triggers: [{ ...both, onlyWithAttack: undefined }] } } }).length, 0, 'only the engine\'s list is read')
})
