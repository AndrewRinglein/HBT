// viewer.real-bodies (engine backlog; engine DECISIONS.md 2026-10-01 'the camera redesigned on the caravan preview; ... what is
// queued after it', Andrew: "I said we could use placeholders, but don't we have more 3D things we can use? We've done all kinds of
// different heads, all kinds of different armor. ... the idea is to rig this up. We have the things for everything, just about.").
// Expect: "Every hero and enemy of the opening's battles and the caravan stands in its own body; a unit with no approved parts is
// listed, not faked." The pack (tools/character-models.mjs) is read against the records that own each body; then the page's own
// modules stand the new bodies up from the files themselves and look at what is shown: whose head, which outfit, the under-suit
// hidden, the afflictions' layer where the body is the registry's, and the death lying down.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { THREE, modules } from './atlas-test-runtime.mjs'
import { packCharacterModels, UNBODIED, RULED, CLASS_LOOKS } from './character-models.mjs'
const A = await modules(), pack = await packCharacterModels()
const json = p => JSON.parse(readFileSync(p, 'utf8'))
const units = json('generated/static.json').units
const registry = json('../assets/characters/hero-transformations/activation-registry.json')
const sha = p => createHash('sha256').update(readFileSync('../' + p)).digest('hex')
const heroes = Object.keys(units).filter(t => t.startsWith('hero.base.'))
const WARDROBE = 'assets/characters/oathblade-armor/rebuild/candidates/eve-bodies/female-production/slender-rebuild/outfits/eve/'

/* the opening's battles and the caravan: every unit type their encounters field (the content's own encounter rows) */
const encounters = json('../content/gen/encounters.json')
const rows = (Array.isArray(encounters) ? encounters : encounters.encounters ?? Object.values(encounters)).flat()
  .filter(e => /^encounter\.(opening\.|caravan-aftermath$)/.test(e?.id || ''))
const fielded = [...new Set(rows.flatMap(e => JSON.stringify(e).match(/"(unit|hero)\.[a-z0-9.-]+"/g) || []).map(s => s.slice(1, -1)))].filter(t => units[t])

test('every unit the opening and the caravan field is bound or listed, never both; every hero of the sheet too', () => {
  assert.ok(rows.length >= 7, 'the six opening encounters and the caravan')
  for (const t of [...fielded, ...heroes]) assert.ok(!!pack[t] !== !!UNBODIED[t], `${t}: ${pack[t] ? 'bound' : 'unbound'}${UNBODIED[t] ? ' and listed' : ''}`)
  /* the listed are exactly the opening's units with no approved body, each with its reason */
  assert.deepEqual(Object.keys(UNBODIED).sort(), fielded.filter(t => !pack[t]).sort())
  for (const why of Object.values(UNBODIED)) assert.match(why, /\.md\)$/, 'each reason names the record it is read from')
  /* the Bloodhound, the hounds' pack, the Demon Lieutenant's selected appearance: their records' bytes */
  const hounds = json('../assets/characters/wolf/hounds/approved-pack.json')
  for (const [t, id] of [['unit.bloodhound', 'bloodhound'], ['unit.hellhound', 'hellhound']]) {
    const look = pack[t].looks[0]
    assert.equal(look.model.sha256, hounds.characters[id].model.sha256, t)
    assert.deepEqual(Object.keys(look.motions).sort(), ['attack', 'death', 'idle', 'move'], `${t}: the four approved hound motions`)
    for (const m of Object.values(look.motions)) assert.equal(sha(m.path), m.sha256, m.path)
    assert.deepEqual(look.missing, ['hit'], `${t}: no approved hound hit reaction — listed`)
  }
  const demon = pack['unit.lieutenant-demon'].looks[0], chosen = json('../assets/characters/reference-painted-enemies/selected-appearances.json').characters.demon
  assert.equal(demon.model.sha256, chosen.sha256); assert.equal(demon.model.path, 'assets/characters/' + chosen.model)
  assert.deepEqual(demon.props.map(p => [p.model, p.hand]), [['sword', 'R']], 'the Demon Lieutenant holds the demo commanders\' sword')
})

test('each hero stands in its own body where the project holds one; the rest keep their class\'s placeholder and say what they lack', () => {
  const own = heroes.filter(t => pack[t].looks[0].body?.own), placeholders = heroes.filter(t => pack[t].looks[0].body?.own === false)
  assert.equal(own.length + placeholders.length, heroes.length, 'every hero is one or the other')
  const ids = new Set()
  for (const t of own) {
    const look = pack[t].looks[0], identity = registry.typeIds[t], profile = registry.characters[identity].bodyProfile
    assert.equal(look.id, identity, `${t} is its own look`); assert.ok(!ids.has(look.id)); ids.add(look.id)
    assert.equal(look.identity, identity)
    assert.equal(sha(look.model.path), look.model.sha256, look.model.path)
    if (profile) assert.deepEqual(look.model, profile.model, `${t}: the fitted body its identity's profile names`)
    /* Law 10 (viewer.male-hero-outfits, 2026-10-01): a third own body — a male hero's approved outfit, imported (Andrew: "Number two,
       yes, that's quite important."); its bytes against the approval's manifest are tools/male-hero-outfits.test.mjs's */
    else if (look.body.record === 'assets/characters/hero-outfits/import.json') assert.ok(look.model.path.startsWith('assets/characters/hero-outfits/'), t)
    else {
      /* her own outfit, in the version the record beside it names */
      assert.ok(look.model.path.startsWith(WARDROBE + identity + '/'), `${t}: her own outfit (${look.model.path})`)
      const dir = look.model.path.slice(0, look.model.path.lastIndexOf('/') + 1), rec = ['record.json', 'repair.json'].map(f => '../' + dir + f).find(existsSync)
      assert.equal(json(rec).exports.find(x => x.file === 'wardrobe-rigged.glb').outputSHA256, look.model.sha256, `${t}: the hash its record names`)
    }
    for (const m of RULED) assert.ok(look.motions[m], `${t} ${m}`)
    assert.deepEqual(look.missing, [], t)
    if (look.props.some(p => p.model === 'bow')) assert.ok(look.motions.ranged, `${t} shoots its bow`)
    assert.ok(look.body.fit && look.body.record, `${t}: how far its fit has come, and whose record says so`)
    assert.equal(!!look.body.lacks, look.body.head !== 'own', `${t}: a hero not showing her own head lists it`)
  }
  for (const t of placeholders) {
    const look = pack[t].looks[0], cls = units[t].tags.find(x => x.startsWith('class.'))
    assert.equal(look.id.split('+')[0], CLASS_LOOKS[cls][0], t); assert.match(look.body.lacks, /^its own fitted body/, t)
  }
  /* the two accepted demonstrations, the three wardrobe heads, and the caravan's own four */
  const ownOf = t => pack[t].looks[0].body?.own === true, headOf = t => pack[t].looks[0].body?.head
  assert.deepEqual(['paladin-hunk', 'mage-thinking'].map(i => ownOf('hero.base.' + i)), [true, true])
  assert.deepEqual(['mage-thinking', 'rogue-raven', 'rogue-snake'].map(i => headOf('hero.base.' + i)), ['own', 'own', 'own'])
  /* Law 10 (viewer.male-hero-outfits, 2026-10-01): the Battle Chaplain was false — he now stands in his own approved outfit */
  assert.deepEqual(['ranger-scantily', 'rogue-rose', 'priest-armored', 'warrior-fearsome'].map(i => ownOf('hero.base.' + i)), [true, true, true, false])
})

const location = { protocol: 'http:', href: 'http://127.0.0.1:4230/viewer/BATTLE-VIEWER.html' }
const fetch = async url => { const b = readFileSync('..' + new URL(url).pathname); return { ok: true, arrayBuffer: async () => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) } }
const headOf = stage => { let h = null; stage.traverse(o => { if (!h && o.isBone && /(^|_)head$/i.test(o.name)) h = o }); return h }
const headY = body => { body.stage.updateMatrixWorld(true); const h = headOf(body.stage); return h ? new THREE.Vector3().setFromMatrixPosition(h.matrixWorld).applyMatrix4(new THREE.Matrix4().copy(body.stage.matrixWorld).invert()).y : body.height() }
const shown = (o, root) => { for (let n = o; n && n !== root; n = n.parent) if (!n.visible) return false; return true }

test('the new bodies stand up from their files: the right head, the outfit over a hidden under-suit, and a death that lies down', async () => {
  for (const t of ['hero.base.paladin-hunk', 'hero.base.mage-thinking', 'hero.base.rogue-snake', 'hero.base.mage-fire', 'unit.bloodhound', 'unit.hellhound', 'unit.lieutenant-demon', 'unit.necromancer', 'unit.skeleton', 'unit.poison-imp']) {
    const look = pack[t].looks[0], loaded = await A.loadLook(look, { location, fetch, textures: false })
    assert.deepEqual(Object.keys(loaded.clips).sort(), Object.keys(look.motions).sort(), t)
    const body = A.createBody(loaded, { loadHead: async () => { throw new Error('no head is loaded here') } })
    assert.ok(Math.abs(body.standingHeight() - look.height) < 1e-6, `${t} stands ${look.height} m`)
    if (look.identity) {
      /* one head shown: her own where the wardrobe fits it, else the body's own; every other variant hidden */
      const heads = new Map()
      body.stage.traverse(o => { if (/^(Eve_Head_[a-z-]+|Body_Head)$/.test(o.name) && !heads.has(o.name)) { let seen = false; o.traverse(m => { if (m.isMesh && shown(m, body.stage)) seen = true }); heads.set(o.name, seen) } })
      const want = look.body.head === 'own' ? 'Eve_Head_' + look.identity : 'Body_Head'
      /* a body with head variants (the wardrobe's) shows one; the Lion's head is part of his own assembly */
      if (look.hidden.length) assert.deepEqual([...heads].filter(([, v]) => v).map(([k]) => k), [want], `${t}: shows ${want} alone`)
      /* the under-suit: hidden wherever the file has one */
      let under = 0; body.stage.traverse(o => { if (o.isMesh) for (const m of [].concat(o.material)) if (m.name.includes('_UnderSuit')) { under++; assert.equal(m.visible, false, `${t}: ${m.name} hidden`) } })
      assert.equal(under > 0, look.hiddenMaterials.length > 0, t)
      /* the afflictions' head and skin are layered only on the body the registry names for the identity */
      body.setAfflictions({ typeId: t, badges: [] })
      assert.equal(body.appearance.bodyFit, registry.characters[look.identity].bodyProfile ? 'compatible' : 'pending', t)
    }
    body.play('idle', { snap: true }); body.frame(0); const up = headY(body)
    body.play('death', { snap: true }); body.frame(0)
    assert.ok(body.lying(), `${t} holds its death's last frame`)
    const down = headY(body)
    assert.ok(down < .45 * up, `${t}'s death ends lying (head ${down.toFixed(2)} m, standing ${up.toFixed(2)} m)`)
    body.dispose()
  }
})
