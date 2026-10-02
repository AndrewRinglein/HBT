// viewer.shield-guard-motion (engine backlog; engine DECISIONS.md 2026-10-01 'a shield power plays a raise-the-shield motion', Andrew:
// "When they play shield power, they should raise the shield animation."). Expect: "In a sandbox battle a hero holding a shield
// uses each of its shield powers from the bar and its body plays the raise-the-shield clip (the Oathblade body's shield_blockleft),
// not its hit reaction; the hit reaction is unchanged; a page test names the motion played per power, and every shield-holding body
// without the clip is listed by name." A shield power is a power a held item of the engine's class `shield` grants (static.json
// itemClasses, the engine's own ItemDef.itemClass); its motion word is `guard` (viewer SWITCHES guardWord). The pack binds it on every
// body that holds a shield and lists it where the body has no such clip (2026-09-30 'a bunch of motions'); the page's fold says
// `guard` for a shield power's power.used and the body plays it. The sandbox's own play of all six from the bar is
// ../kingdom/tools/shield-guard.verify.mjs. Runs against the page (VIEWER_PAGE, else BATTLE-VIEWER.html).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { makeWindow } from './fakedom.mjs'
import { THREE, modules } from './atlas-test-runtime.mjs'
import { packCharacterModels, MOTIONS, UNBODIED } from './character-models.mjs'
const A = await modules(), pack = await packCharacterModels()
const json = p => JSON.parse(readFileSync(p, 'utf8'))
const statics = json('generated/static.json'), units = statics.units
const sha = p => createHash('sha256').update(readFileSync('../' + p)).digest('hex')
const RAISE = /\/shield_blockleft\//                     // the raise-the-shield clip: the Oathblade body's shield_blockleft (ActorCore)
const SIX = ['power.kite-shield.shield-wall', 'power.kite-shield.raise-guard', 'power.round-shield.turn-aside', 'power.round-shield.brace',
  'power.tower-shield.cover', 'power.tower-shield.stand-tall']
const shieldItems = () => Object.keys(statics.itemClasses ?? {}).filter(i => statics.itemClasses[i] === 'shield')
const holds = t => (units[t]?.defaultItems ?? []).some(i => statics.itemClasses?.[i] === 'shield')

test('the engine\'s own item classes name the shields; the six shield powers are what the three shields grant', () => {
  assert.ok(statics.itemClasses, 'static.json carries the engine\'s item classes')
  const shields = shieldItems()
  for (const i of ['item.kite-shield', 'item.round-shield', 'item.tower-shield']) assert.ok(shields.includes(i), `${i} is a shield`)
  assert.equal(statics.itemClasses['item.longsword'], 'weapon')
  for (const p of SIX) assert.equal(statics.actionKinds[p], 'power', `${p} is a power`)
  assert.ok(MOTIONS.includes('guard'), 'guard is one of the motion words, beside the others')
})

test('every body that holds a shield raises it: guard is the shield_blockleft clip, the hit reaction unchanged; the rest have none, and a holder without it is listed', () => {
  const holders = Object.keys(pack).filter(holds), lacking = []
  for (const t of ['hero.base.paladin-hunk', 'hero.base.priest-armored', 'hero.base.warrior-iron', 'hero.base.paladin-shiney', 'hero.base.paladin-smug'])
    assert.ok(holders.includes(t), `${t} holds a shield`)
  for (const [t, { looks }] of Object.entries(pack)) for (const look of looks) {
    if (!holds(t)) { assert.equal(look.motions.guard, undefined, `${t}: holds no shield, raises none`); assert.ok(!look.missing.includes('guard'), t); continue }
    assert.ok(look.props.some(p => p.model === 'shield' && p.hand === 'L'), `${t}: the shield in the left hand`)
    const g = look.motions.guard
    if (!g) { assert.ok(look.missing.includes('guard'), `${t}: no raise-the-shield clip, listed`); lacking.push(`${t} ${look.name}`); continue }
    assert.match(g.path, RAISE, `${t}: guard is the raise-the-shield clip`)
    assert.equal(sha(g.path), g.sha256, `${t}: the clip's own bytes`)
    /* the hit reaction is unchanged: still the body's struck reaction, bound as before */
    assert.ok(look.motions.hit, `${t}: its hit reaction`)
    assert.ok(!look.missing.includes('guard'), t)
  }
  /* the Lion's own body has no clip of its own: the Oathblade's, borrowed onto his bones as his hit is */
  const lion = pack['hero.base.paladin-hunk'].looks[0]
  assert.equal(lion.motions.guard.borrowed, true); assert.deepEqual(lion.motions.guard, lion.motions.hit)
  /* the Battle Chaplain's approved outfit: the preview's own medium clip, the same file his hit plays */
  const chaplain = pack['hero.base.priest-armored'].looks[0], rec = json('../assets/characters/hero-outfits/import.json')
  assert.deepEqual({ path: chaplain.motions.guard.path, sha256: chaplain.motions.guard.sha256 }, { path: rec.clips.shield_blockleft.path, sha256: rec.clips.shield_blockleft.sha256 })
  assert.equal(chaplain.motions.hit.path, rec.clips.shield_blockleft.path, 'his hit is unchanged')
  /* the list names every holder without it — today none; an unbodied type holding a shield would be listed too */
  const list = execFileSync(process.execPath, ['tools/character-models.mjs', '--list'], { encoding: 'utf8' })
  for (const l of lacking) assert.match(list, new RegExp(l.split(' ')[0].replace(/\./g, '\\.') + '[\\s\\S]*?motions missing:[^\\n]*guard'), l)
  const header = list.split('\n').find(l => l.startsWith('shield holders without a raise-the-shield clip:'))
  assert.ok(header, '--list says which shield holders lack the clip')
  const listed = header.replace(/^[^:]+:\s*/, '')
  assert.equal(listed, lacking.length ? lacking.map(l => l.split(' ')[0]).join(', ') : 'none')
  for (const t of Object.keys(UNBODIED)) assert.ok(!holds(t), `${t} is unbodied and holds no shield`)
})

/* the page: mounted on a library battle where the three sandbox shield-bearers stand, with the page's own modules' bodies */
const location = { protocol: 'http:', href: 'http://127.0.0.1:4230/viewer/BATTLE-VIEWER.html' }
const fetch = async url => { const b = readFileSync('..' + new URL(url).pathname); return { ok: true, arrayBuffer: async () => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) } }
const loads = new Map()
const load = look => { if (!loads.has(look.id)) loads.set(look.id, A.loadLook(look, { location, fetch, textures: false })); return loads.get(look.id) }
async function boot(file) {
  const battle = json('battles/' + file)
  const html = readFileSync(process.env.VIEWER_PAGE || 'BATTLE-VIEWER.html', 'utf8'), m = html.match(/<script>([\s\S]*)<\/script>\s*$/), w = makeWindow()
  w.document.body.innerHTML = html.slice(0, m.index).replace(/<style>[\s\S]*?<\/style>/, '').replace(/<!--[\s\S]*?-->/g, '').replace(/<(meta|title|link)[^>]*>(<\/title>)?/g, '')
  const names = ['window','document','requestAnimationFrame','setTimeout','clearTimeout','setInterval','clearInterval','addEventListener','alert','Date','performance','getComputedStyle','localStorage','self','globalThis']
  new Function(...names, m[1])(...names.map(n => ['window','self','globalThis'].includes(n) ? w : w[n]))
  const B = w.__battleView, L = B.lib; B.harness.dispose()
  const mapId = battle.events.find(e => e.type === 'map.loaded').mapId
  const data = { field: L.fields[mapId], fieldMapId: mapId, initialEvents: battle.events, units: L.static.units, statuses: L.static.statuses, absorbingStatuses: L.static.absorbingStatuses,
    actions: L.static.actions, badges: L.static.badges, layers: L.static.layers, actionKinds: L.static.actionKinds, statusRows: L.static.statusRows, itemClasses: L.static.itemClasses,
    artmap: L.art.artmap, assets: L.art.assets, glyphs: L.glyphs, meta: { seed: battle.seed } }
  const host = w.document.createElement('div'); w.document.body.appendChild(host)
  const v = B.mount(host, data, { autoplay: false }); v.push(battle.events)
  const V = v._V, cast = A.createCast(V, new THREE.Scene(), new THREE.Matrix4().makeScale(.01, .01, .01), { load, readStyle: el => el.style })
  V.cast = cast
  return { v, V, cast, battle }
}
/** play event i on the page as the pump does (its cues too) and say which motion each standing body is in, by the body's own word */
async function playAt(P, i) {
  P.v.seek(i); P.cast.frame(0); await P.cast.settle(); P.cast.frame(0)
  const before = new Map([...Object.keys(P.V.S.U)].map(id => [+id, P.cast.body(+id)?.motion ?? null]))
  P.v.step()
  return { before, after: id => P.cast.body(id)?.motion ?? null }
}

test('on the page each shield power\'s power.used raises the shield — guard, not the hit reaction; another power does not; a blow still plays the hit', async () => {
  const P = await boot('showcase.horrors.json'), played = []
  const nameOf = id => P.V.S.U[id]?.name
  for (const [i, e] of P.battle.events.entries()) {
    if (e.type !== 'power.used' || !SIX.includes(e.causeId)) continue
    const r = await playAt(P, i), B = P.cast.body(e.actor)
    assert.ok(B, `${nameOf(e.actor)} stands as a body`)
    played.push({ power: e.causeId, hero: P.V.S.U[e.actor].typeId, motion: r.after(e.actor), clip: B.look.motions[r.after(e.actor)]?.path ?? null })
  }
  /* the battle's four shield powers, by the three heroes the sandbox fields — each named with the motion its body played */
  assert.deepEqual(played.map(p => [p.hero, p.power, p.motion]), [
    ['hero.base.warrior-iron', 'power.tower-shield.cover', 'guard'],
    ['hero.base.priest-armored', 'power.round-shield.turn-aside', 'guard'],
    ['hero.base.paladin-hunk', 'power.kite-shield.shield-wall', 'guard'],
    ['hero.base.priest-armored', 'power.round-shield.brace', 'guard'],
  ])
  for (const p of played) assert.match(p.clip, RAISE, `${p.power}: the raise-the-shield clip`)
  /* the guard runs once and the body goes back to its rest */
  const B = P.cast.body(P.battle.events.findLast(e => e.type === 'power.used' && SIX.includes(e.causeId)).actor)
  for (let n = 0; n < 600 && B.motion === 'guard'; n++) P.cast.frame(1 / 30)
  assert.equal(B.motion, 'idle', 'the raised shield comes down to the idle')
  /* a blow landing on a shield-bearer still plays its hit reaction (unchanged) */
  const flash = P.battle.events.findIndex(e => e.type === 'damage.applied' && ['hero.base.warrior-iron', 'hero.base.priest-armored', 'hero.base.paladin-hunk'].includes(P.V.S.U[e.target]?.typeId) && e.amount > 0)
  assert.ok(flash > 0, 'a shield-bearer is struck in the battle')
  const struck = P.battle.events[flash].target, h = await playAt(P, flash)
  assert.equal(h.after(struck), 'hit', 'the struck shield-bearer plays its hit reaction')
  P.cast.dispose(); P.v.dispose()
})

test('a power no shield grants — the Iron Dwarf\'s Bloodlust — raises no shield', async () => {
  const P = await boot('showcase.assembled-party.json')
  const i = P.battle.events.findIndex(e => e.type === 'power.used' && e.causeId === 'power.bloodrage.bloodlust')
  assert.ok(i > 0); const e = P.battle.events[i]
  const r = await playAt(P, i)
  assert.equal(P.V.S.U[e.actor].typeId, 'hero.base.warrior-iron'); assert.ok(holds('hero.base.warrior-iron'), 'a shield-bearer')
  assert.ok(P.cast.body(e.actor), 'it stands as a body')
  assert.notEqual(r.after(e.actor), 'guard', 'no shield raised for a power its shield did not grant')
  assert.equal(r.after(e.actor), r.before.get(e.actor), 'its body keeps the motion it was in')
  P.cast.dispose(); P.v.dispose()
})
