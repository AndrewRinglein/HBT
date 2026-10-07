// viewer.plays-turned-units (engine backlog; found 2026-10-04 — viewer SWITCHES.md openingReplayPlayableSeed: "the viewer does not
// draw a transformation"). rule.afflictions-at-zero (engine DECISIONS.md 2026-10-01 'the afflictions at 0 Health'): a hero
// carrying Lycanthropy or Vampirism, taken to 0 Health, becomes its affliction's form — "the bestiary's stats and powers, no
// hero gear" — on the side its Luck roll says, and is itself again when it falls or the battle ends. The engine says each in
// one line: unit.transformed, unit.reverted.
// The item's expect: "A recorded battle in which a hero is turned plays through on the battle screen: at the turn the hero's
// unit is drawn and listed as its form, on the form's side, with the form's actions, and at a revert as itself; seeking past
// and back lands on the same state; a page test plays such a battle and reads the unit before, during and after."
// Asked of the page (VIEWER_PAGE, else BATTLE-VIEWER.html) on two of the engine's own battles: tools/fixtures/turned-heroes.json
// (four afflicted heroes against six Werewolves: two become Werewolves, two Vampires; made by
// test/viewer.plays-turned-units.test.ts) and the Cavern Trail's recording (battles/test.opening-cavern-trail.json, seed 0: the
// Battle Chaplain is bitten, shown the first-affliction pop-up, and turned).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { makeWindow } from './fakedom.mjs'
import { THREE, modules } from './atlas-test-runtime.mjs'
import { packCharacterModels, UNBODIED } from './character-models.mjs'
import { foldTo, FOLDED_TYPES } from '../src/fold.js'
import { buildLog } from '../src/log.js'
import { shownName } from '../src/names.js'
const A = await modules(), pack = await packCharacterModels()
const html = readFileSync(process.env.VIEWER_PAGE || 'BATTLE-VIEWER.html', 'utf8')
const load = f => JSON.parse(readFileSync(f, 'utf8'))
const fixture = load('tools/fixtures/turned-heroes.json'), cavern = load('battles/test.opening-cavern-trail.json'), statics = load('generated/static.json')
const FRAME = 16

function boot(battle, opts = {}) {
  const EV = battle.events
  const m = html.match(/<script>([\s\S]*)<\/script>\s*$/), w = makeWindow()
  w.document.body.innerHTML = html.slice(0, m.index).replace(/<style>[\s\S]*?<\/style>/, '').replace(/<!--[\s\S]*?-->/g, '').replace(/<(meta|title|link)[^>]*>(<\/title>)?/g, '')
  const names = ['window','document','requestAnimationFrame','cancelAnimationFrame','setTimeout','clearTimeout','setInterval','clearInterval','addEventListener','alert','Date','performance','getComputedStyle','localStorage','self','globalThis']
  new Function(...names, m[1])(...names.map(n => ['window','self','globalThis'].includes(n) ? w : w[n]))
  const B = w.__battleView, L = B.lib; B.harness.dispose()
  const mapId = EV.find(e => e.type === 'map.loaded').mapId
  const data = { field: L.fields[mapId], fieldMapId: mapId, initialEvents: EV, units: L.static.units, statuses: L.static.statuses, absorbingStatuses: L.static.absorbingStatuses,
    actions: L.static.actions, badges: L.static.badges, layers: L.static.layers, actionKinds: L.static.actionKinds, statusRows: L.static.statusRows, itemClasses: L.static.itemClasses,
    items: L.static.items, hands: L.static.hands, artmap: L.art.artmap, assets: L.art.assets, glyphs: L.glyphs, meta: { seed: battle.seed } }
  const host = w.document.createElement('div'); w.document.body.appendChild(host)
  const v = B.mount(host, data, { autoplay: false, ...opts })
  v.push(EV)
  return { w, v, V: v._V, EV, L, ctx: { UD: L.static.units, SN: L.static.statuses, IC: L.static.itemClasses } }
}
function standIn(look) {
  const scene = new THREE.Group(), hip = new THREE.Object3D(); hip.name = look.pivot; scene.add(hip)
  const box = new THREE.Mesh(new THREE.BoxGeometry(.5, 1.7, .3), new THREE.MeshBasicMaterial()); box.position.y = .85; hip.add(box)
  const flat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2), clips = {}
  for (const k of Object.keys(look.motions)) clips[k] = k === 'death'
    ? new THREE.AnimationClip('death', 1, [new THREE.QuaternionKeyframeTrack(look.pivot + '.quaternion', [0, 1], [0, 0, 0, 1, ...flat.toArray()])])
    : new THREE.AnimationClip(k, 1, [new THREE.VectorKeyframeTrack(look.pivot + '.position', [0, 1], [0, 0, 0, 0, 0, 0])])
  return { look, scene, clips, props: [] }
}
const settle = () => new Promise(r => setImmediate(r))
const fire = (node, type, extra = {}) => { for (const f of node.listeners[type] || []) f({ detail: 1, button: 0, stopPropagation() {}, preventDefault() {}, ...extra }) }
const board = S => { const c = structuredClone(S); for (const k of ['FIRING', 'TRIGFLASH', 'AIM', 'ATTACK', 'AOO', 'BURST']) c[k] = null; c.critPending = false; c.subjectId = null; c.subjectMode = null; c.activeId = null; return c }
const turns = EV => EV.map((e, i) => ({ e, i })).filter(x => x.e.type === 'unit.transformed')
const attacksOf = typeId => statics.units[typeId].attacks.map(a => typeof a === 'string' ? a : a.id)

test('the fold plays both lines: they are folded types, and both battles hold them', () => {
  assert.ok(FOLDED_TYPES.includes('unit.transformed') && FOLDED_TYPES.includes('unit.reverted'), 'unit.transformed and unit.reverted are folded')
  assert.equal(turns(fixture.events).length, 4); assert.equal(fixture.events.filter(e => e.type === 'unit.reverted').length, 4)
  assert.equal(turns(cavern.events).length, 1, 'the Cavern Trail\'s recording holds a transformation'); /* Law 10, combine 2026-10-04 (the note at the Cavern Trail's own test, below): was assert.equal(cavern.seed.replicate, 0, 'on seed 0') —
     master's recorded seed; on the combined tree nobody is turned on seed 0, and the recording is on the lowest seed whose
     battle turns a hero, the seed the library records */
  assert.equal(cavern.seed.replicate, load('battles/library.json').battles.find(r => r.file === 'test.opening-cavern-trail.json').seed, 'on the seed the library records')
  /* Law 10, 2026-10-04 — content.shields-reauthored (engine item; engine DECISIONS.md 2026-09-28 'counterattack, special free attacks, the
     opening six, shields, custom weapons'): this read assert.equal(cavern.seed.replicate, 17). The shields are the Armory Ledger's now,
     the Cavern Trail is another fight, and by the same rule (the lowest seed whose battle turns a hero — viewer SWITCHES
     combineTurnedSeed, shieldsOpeningSeeds) the recording is on seed 11. */
  /* Law 10, 2026-10-06 - content.used-twice-rules-removed (engine item; engine DECISIONS.md 2026-10-06 'the one-use rules: most are cut
     or reworded onto rules the engine already has ...', of the Werewolf's Claw Frenzy: "the ordering, I don't really care about"): this
     read assert.equal(cavern.seed.replicate, 11). The Claw Frenzy's Strength now counts - a Werewolf is a point stronger after every
     swing - so the Cavern Trail is another fight from its first Werewolf's swing, and on seed 11 nobody is turned. By the same rule
     (the lowest seed whose battle turns a hero, seeds 0 to 29 read for that kind of line - viewer SWITCHES combineTurnedSeed,
     usedTwiceOpeningSeeds: 0, 4, 6 and 23 hold one) the recording is on seed 0. */
  assert.equal(cavern.seed.replicate, 0)
})

test('before, during and after: at the turn the unit is its form — type, side, Health, the form\'s attacks, no hero gear — keeping its hex and its statuses; at the revert it is itself, whole', () => {
  const { v, V, EV, ctx } = boot(fixture)
  for (const { e, i } of turns(EV)) {
    const id = e.actor, row = statics.units[e.into], back = EV.findIndex((x, k) => k > i && x.type === 'unit.reverted' && x.actor === id), R = EV[back]
    v.seek(i); const before = structuredClone(V.S.U[id])
    assert.equal(before.typeId, e.from); assert.equal(before.side, 'hero'); assert.ok(before.kit.items.length > 0, 'a hero with its gear'); assert.equal(before.hp, 0, 'taken to 0 Health')
    v.step(); const during = structuredClone(V.S.U[id])
    assert.equal(during.typeId, e.into, 'its form\'s type'); assert.equal(during.side, e.side, 'on the side the line says'); assert.equal(during.hp, e.hp); assert.equal(during.maxHp, e.maxHp)
    assert.equal(during.life, 'standing'); assert.equal(during.hex, before.hex, 'where it stood'); assert.deepEqual(during.st, before.st, 'its statuses kept')
    assert.equal(during.maxStam, row.maxStamina ?? 0, 'the form\'s Stamina, from the engine\'s sheet'); assert.equal(during.stam, during.maxStam)
    assert.deepEqual(during.kit, { items: [], grants: [], abilities: [], badges: [], held: [] }, 'no hero gear'); assert.deepEqual(during.hands, []); assert.deepEqual(during.mods, [], 'none of the hero\'s modifiers')
    assert.ok(during.name.startsWith(row.name) && during.name.includes(before.name), `named as its form, and whose it is: ${during.name}`)
    assert.deepEqual({ badgeId: during.turned.badgeId, from: during.turned.from, into: during.turned.into }, { badgeId: e.badgeId, from: e.from, into: e.into })
    assert.equal(during.moveUsed, true); assert.equal(during.primaryUsed, true)
    /* the board is the pure fold of the log there */
    assert.deepEqual(board(V.S), board(foldTo(EV, i + 1, ctx)))
    /* during: it acts as its form — its Activations and its attacks fold like any unit's */
    const acts = EV.slice(i + 1, back).filter(x => x.actor === id && x.type === 'attack.declared')
    for (const a of acts) assert.ok(attacksOf(e.into).includes(a.attackId))
    /* after: itself again — its type, side, name, gear and modifiers as before the turn, the Health the line says, where it now stands */
    v.seek(back); const last = structuredClone(V.S.U[id]); v.step(); const after = structuredClone(V.S.U[id])
    assert.equal(after.typeId, e.from); assert.equal(after.side, R.side); assert.equal(after.name, before.name); assert.equal(after.hp, R.hp); assert.equal(after.maxHp, R.maxHp)
    assert.deepEqual(after.kit, before.kit, 'its gear is back'); assert.deepEqual(after.hands, before.hands); assert.deepEqual(after.mods, before.mods); assert.deepEqual(after.badges, before.badges)
    assert.equal(after.hex, last.hex, 'on the hex it stands on now'); assert.deepEqual(after.st, last.st); assert.equal(after.turned, undefined)
    assert.deepEqual(board(V.S), board(foldTo(EV, back + 1, ctx)))
  }
  v.dispose()
})

test('it is drawn and listed as its form: its token, its card above the battle on the form\'s side, its panel, and the form\'s actions on the bar when it acts', () => {
  const { v, V, EV, L } = boot(fixture), art = L.art
  const { e, i } = turns(EV)[0], id = e.actor, heroTok = art.assets[art.artmap[e.from].token], formTok = art.assets[(art.artmap[e.into] || art.artmap._pending).token]
  assert.notEqual(heroTok, formTok)
  const chip = () => V.dom.rail.querySelectorAll('.railchip').find(c => +c.dataset.i === id), tokenOf = () => V.layers.UEL.get(id).img.style.backgroundImage
  v.seek(i)
  assert.ok(chip().className.includes('hero')); assert.ok((chip().querySelector('img').getAttribute('src') === heroTok), 'the hero\'s card'); assert.ok(tokenOf().includes(heroTok), 'the hero\'s token')
  const order0 = V.dom.rail.querySelectorAll('.railchip').map(c => +c.dataset.i)
  v.step()
  assert.ok(chip().className.includes('enemy') && !chip().className.includes('hero'), 'its card is on the enemy side'); assert.ok((chip().querySelector('img').getAttribute('src') === formTok), 'with the form\'s picture')
  const order1 = V.dom.rail.querySelectorAll('.railchip').map(c => +c.dataset.i), heroesNow = Object.values(V.S.U).filter(u => u.side === 'hero' && u.life !== 'dead').length
  assert.ok(order1.indexOf(id) >= heroesNow, 'after the heroes, among the enemies'); assert.equal(V.dom.rail.querySelectorAll('.railsep').length, 1); assert.equal(order1.length, order0.length, 'nobody lost a card')
  assert.ok(tokenOf().includes(formTok) && !tokenOf().includes(heroTok), 'the token on the board is the form\'s')
  /* the panel, when it is looked at */
  v.inspect(id); const name = V.dom.panel.querySelector('.pName').textContent
  assert.ok(name.includes(statics.units[e.into].name), `the panel names the form: ${name}`); assert.ok(V.dom.panel.textContent.includes(e.into), 'and its type')
  /* the bar, when it acts: the form's attacks and none of the hero's */
  const act = EV.findIndex((x, k) => k > i && x.type === 'activation.begin' && x.actor === id); assert.ok(act > 0, 'the turned unit acts')
  assert.equal(EV[act].phase, 'enemy')
  v.seek(act + 1); const bar = V.dom.actionbar.textContent
  for (const a of attacksOf(e.into)) assert.ok(bar.includes(statics.actions[a].name), `the bar shows ${statics.actions[a].name}`)
  for (const a of attacksOf(e.from)) if (!attacksOf(e.into).includes(a)) assert.ok(!bar.includes(statics.actions[a].name), `and not the hero's ${statics.actions[a].name}`)
  /* at the revert: its own card and token again, on the heroes' side */
  const back = EV.findIndex((x, k) => k > i && x.type === 'unit.reverted' && x.actor === id)
  v.seek(back + 1)
  assert.ok(chip().className.includes('hero')); assert.ok((chip().querySelector('img').getAttribute('src') === heroTok)); assert.ok(tokenOf().includes(heroTok))
  /* and seeking back before the turn: the hero's again */
  v.seek(i - 5); assert.ok(chip().className.includes('hero')); assert.ok(tokenOf().includes(heroTok)); assert.equal(V.S.U[id].typeId, e.from)
  v.dispose()
})

test('its body: the hero\'s own model gives way to the form\'s — a form with no model stands as its token, and is listed — and the hero\'s model stands again at the revert', async () => {
  const { v, V, EV } = boot(fixture)
  const cast = A.createCast(V, new THREE.Scene(), V.data.atlas ? A.paintedToCSS(V.data.atlas).invert() : new THREE.Matrix4(), { load: async look => standIn(look), readStyle: el => el.style })
  V.cast = cast
  const stand = async () => { cast.frame(0); await settle(); await settle(); cast.frame(0) }
  const forms = new Set(), unmodelled = []
  for (const { e, i } of turns(EV)) {
    const id = e.actor
    v.seek(i); await stand()
    const own = cast.body(id); assert.ok(own, 'the hero stands as its model'); assert.equal(own.look.id, A.lookFor(A.modelBinding(e.from, pack), id).id)
    v.step(); await stand()
    const binding = A.modelBinding(e.into, pack)
    if (binding) { assert.equal(cast.body(id)?.look.id, A.lookFor(binding, id).id, 'the form\'s own model') }
    else { assert.equal(cast.body(id), null, 'no model of the hero\'s is left standing in for the form'); assert.equal(cast.shows(id), false)
      assert.equal(V.layers.UEL.get(id).img.style.opacity, '1', 'its token is shown'); if (!forms.has(e.into)) unmodelled.push(e.into) }
    forms.add(e.into)
    const back = EV.findIndex((x, k) => k > i && x.type === 'unit.reverted' && x.actor === id)
    v.seek(back + 1); await stand()
    assert.equal(cast.body(id)?.look.id, own.look.id, 'the hero\'s own model again')
  }
  /* every form an affliction can turn a hero into: a model, or listed */
  const all = Object.entries(statics.badges).map(([id, b]) => [id, b.atZero?.transformsInto ?? (JSON.stringify(b).match(/"transformsInto":"([^"]+)"/) || [])[1]]).filter(([, t]) => t)
  assert.deepEqual(all.map(([, t]) => t).sort(), ['unit.vampire', 'unit.werewolf'], 'the forms the engine\'s badges name')
  const listed = all.filter(([, t]) => !pack[t]).map(([b, t]) => `${statics.units[t].name} (${t}, of ${b}): ${UNBODIED[t] ? 'no approved body — ' + UNBODIED[t].split(':')[0] : 'no body and no token art — the ART PENDING standee'}`)
  assert.equal(listed.length, 2); assert.deepEqual(unmodelled.sort(), ['unit.vampire', 'unit.werewolf'])
  console.log(`# forms with no model (a turned hero stands as the form's token): ${listed.join('; ')}`)
  v.dispose()
})

test('seek, step and replay land on the same state: the whole battle played by the pump ends on the pure fold; seeking past a turn and back is the fold of the log there', () => {
  const { w, v, V, EV, ctx } = boot(fixture, { enemiesTogether: true }); V.fx.FX = { add: () => new Promise(() => {}), clear() {} }
  const begin = EV.findIndex(e => e.type === 'battle.begin') + 1
  v.seek(begin); v.speed(4); v.play()
  const order = []; let c = v.cursor
  /* Law 10, 2026-10-05 — engine rule.prone-only-stand-up (Andrew, engine DECISIONS.md 'a prone unit only stands; Stand Up is its
     one move; …': "yes, it cannot use attacks or powers until it stands."). The fixture is the engine's own battle, and that
     battle moved: a knocked-down unit no longer attacks from the floor, the fight runs on differently, and on Turn 5 a hero who
     did not carry it is bitten and gains Lycanthropy (badge.gained) — so the first-affliction pop-up now stands in this battle
     too and holds the pump, as it does in the Cavern Trail's recording below. The loop closes it, as that test's does, and
     holds that it stood once for each such line. (Combine, 2026-10-06: engine content.dwarf-elf-fey-badges-act moved this battle
     as well - its Iron Dwarf and Forest Elf fight with their badges' numbers - and had closed the pop-up the same way; one loop.) What the test asks is unchanged: the battle plays to its end with no fault
     and the board is the engine's. The loop was:
       for (let n = 0; n < 2000000 && v.cursor < EV.length; n++) { w._flush(FRAME); while (c < v.cursor) order.push(c++) } */
  let popped = 0
  for (let n = 0; n < 2000000 && v.cursor < EV.length; n++) { w._flush(FRAME); while (c < v.cursor) order.push(c++)
    const P = V.dom.root.querySelector('#afflPop'); if (P) { popped++; assert.equal(V.hold, true, 'the pump is held on the pop-up'); fire(P.querySelector('#afflClose'), 'click') } }
  assert.equal(popped, EV.filter(e => e.type === 'badge.gained').length, 'the first-affliction pop-up stood once for each affliction gained in the battle')
  assert.equal(v.cursor, EV.length, 'the battle played to its end'); assert.equal(V.invalid, null, 'no fault')
  assert.deepEqual(board(V.S), board(foldTo(EV, EV.length, ctx)), 'the board is the engine\'s own state')
  for (const u of Object.values(V.S.U)) if (u.id < 4) { assert.ok(u.typeId.startsWith('hero.'), 'each hero is itself again at the end'); assert.equal(u.side, 'hero') }
  for (const { i } of turns(EV)) for (const k of [i + 30, i - 1, i + 1, i, i + 2]) { v.pause(); v.seek(k); assert.deepEqual(board(V.S), board(foldTo(EV, k, ctx)), `sought to ${k}`) }
  /* stepping across a turn by hand, line by line */
  const { i } = turns(EV)[1]; v.seek(i - 2); for (let k = i - 2; k < i + 3; k++) { v.step(); assert.equal(v.cursor, k + 1); assert.deepEqual(board(V.S), board(foldTo(EV, k + 1, ctx))) }
  v.dispose()
})

/* Law 10, combine 2026-10-04 (viewer master 4d90ddf — viewer.plays-turned-units — with this copy's engine fix.opening-probe-cadence;
   engine DECISIONS.md 2026-10-03 'one draft after every battle; …': "One, yes." — a party of 1, 2, 3, 4, 5, 6): this test was
   named "… the Chaplain turns, fights as a Werewolf and is himself again at the end" and read
     assert.equal(e.from, 'hero.base.priest-armored'); … assert.ok(i - gained < 12, 'bitten and turned by the same blow')
     … assert.equal(V.S.U[id].typeId, 'hero.base.priest-armored')
   — master's recording, five heroes at the Cavern Trail on seed 0, where the Battle Chaplain is bitten at 0 Health and turns
   at once. By the ruling four heroes fight there, and on seed 0 nobody is turned. The recording is the Cavern Trail on the
   lowest seed whose battle turns a hero (17 then, 11 since the shields were re-authored 2026-10-04: seeds read from 0 upward for that KIND of line — viewer SWITCHES
   combineTurnedSeed); in it the Barbarian is bitten, fights on, and turns when a later blow takes him to 0 Health. What
   the test holds is unchanged and said of whichever hero the recording turns: the bite's pop-up stands and is closed
   before the turn is shown, the hero turns into the form his affliction names, on the enemy's side, and is himself again
   at the battle's end. */
test('the Cavern Trail\'s recording plays through: the bite\'s first-affliction pop-up stands and is closed, the hero turns, fights as a Werewolf and is himself again at the end', () => {
  const { w, v, V, EV, ctx } = boot(cavern); V.fx.FX = { add: () => new Promise(() => {}), clear() {} }
  const { e, i } = turns(EV)[0], id = e.actor, gained = EV.findLastIndex((x, k) => k < i && x.type === 'badge.gained' && x.actor === id)
  assert.match(e.from, /^hero\.base\./, 'a hero of the party is turned'); assert.equal(e.into, 'unit.werewolf'); assert.equal(EV[gained].badgeId, 'badge.lycanthropy'); assert.ok(gained >= 0 && gained < i, 'bitten before he turns')
  assert.equal(e.badgeId, EV[gained].badgeId, 'and it is that affliction which turns him')
  v.seek(gained - 3); v.play()
  let popped = false
  for (let n = 0; n < 40000 && v.cursor <= i; n++) { w._flush(FRAME)
    const P = V.dom.root.querySelector('#afflPop')
    if (P) { popped = true; assert.equal(V.hold, true, 'the pump is held on the pop-up'); assert.ok(v.cursor <= i, 'before the turn is shown'); assert.ok(P.querySelector('#afflTitle').textContent.includes('Lycanthropy'))
      fire(P.querySelector('#afflClose'), 'click') } }
  assert.ok(popped, 'the first-affliction pop-up was shown'); assert.ok(v.cursor > i, 'and the battle went on past the turn'); assert.equal(V.S.U[id].typeId, 'unit.werewolf'); assert.equal(V.S.U[id].side, 'enemy')
  v.speed(4)
  for (let n = 0; n < 2000000 && v.cursor < EV.length; n++) { w._flush(FRAME); const P = V.dom.root.querySelector('#afflPop'); if (P) fire(P.querySelector('#afflClose'), 'click') }
  assert.equal(v.cursor, EV.length); assert.equal(V.invalid, null)
  assert.equal(V.S.U[id].typeId, e.from); assert.equal(V.S.U[id].side, 'hero'); assert.equal(V.S.U[id].hp, EV.findLast(x => x.type === 'unit.reverted').hp)
  assert.deepEqual(board(V.S), board(foldTo(EV, EV.length, ctx)))
  v.dispose()
})

test('the log says each in a sentence, and the turn floats its word over the unit', () => {
  const { v, V, EV } = boot(fixture), { e, i } = turns(EV)[0], back = EV.findIndex((x, k) => k > i && x.type === 'unit.reverted' && x.actor === e.actor)
  const lines = buildLog(EV, statics.statuses, 99), lineOf = k => lines.find(l => l.i === k)?.t ?? null
  /* Law 10, 2026-10-05 - viewer.unit-names-no-letters-or-numbers (engine DECISIONS.md 2026-10-05 'no unit is shown with a number or a
     letter', Andrew: "it shouldn't be Soldier A or Lumberjack 1"): `heroName` was the unit.enter line's own name, mark and all, and the turn's and the revert's sentences were asked for it. The claim is unchanged - the unit is named - and the
     name is the engine's less its mark, through the function the page itself reads (src/names.js shownName). */
  const formName = statics.units[e.into].name, heroName = shownName(EV.find(x => x.type === 'unit.enter' && x.actor === e.actor).name)
  const t = lineOf(i), r = lineOf(back)
  assert.ok(t && t.includes(heroName) && t.includes(formName), `the turn's sentence names the hero and the form: ${t}`)
  /* Law 10, 2026-10-05 - engine content.dwarf-elf-fey-badges-act: the first hero turned in the fixture's battle was turned by
     Lycanthropy, and this line asked for that word. The battle is another now and its first turn may be either affliction's;
     the claim is unchanged - the sentence names the affliction - and the affliction is the line's own (its badgeId), by the
     name the engine's badge row gives it.
     was: assert.ok(t.includes('Lycanthropy'), 'and the affliction'); assert.ok(/enem/i.test(t), 'and the side it now fights for') */
  assert.ok(t.includes(statics.badges[e.badgeId].name), 'and the affliction'); assert.ok(/enem/i.test(t), 'and the side it now fights for')
  assert.ok(r && r.includes(heroName) && /again/i.test(r), `the revert's sentence: ${r}`)
  /* the turned unit's own lines are the enemy's from the turn on (the log colours a line by its unit's side at that line) */
  const act = EV.findIndex((x, k) => k > i && x.type === 'activation.begin' && x.actor === e.actor); assert.equal(lines.find(l => l.i === act).cls, 'enemy')
  v.seek(i); v.step()
  const floats = V.layers.floatL.textContent; assert.ok(floats.toUpperCase().includes(formName.toUpperCase()), `a float names the form over the unit: ${floats}`)
  v.dispose()
})
