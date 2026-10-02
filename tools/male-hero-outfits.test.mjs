// viewer.male-hero-outfits (engine backlog; engine DECISIONS.md 2026-10-01 'the approved male hero outfits come into the project',
// Andrew: "Number two, yes, that's quite important."). Expect: "In the sandbox the Black Oath, Dawnblade, Court Champion and the four
// priests each stand in their own approved outfit with every ruled motion; the files load from the project root in the main folder as
// well as the worker copy; character-models --list no longer lists their outfits as missing." The pack (tools/character-models.mjs)
// is read against the import record and the approval it carries (assets/characters/hero-outfits/import.json, motion/user-acceptance-
// 2026-09-24.json and its baseline manifest); then the page's own modules stand three of them up from the files: what of the body
// is shown, the outfit's paint unlit as its preview draws it, the kit in hand, the death lying down.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { THREE, modules } from './atlas-test-runtime.mjs'
import { packCharacterModels, RULED } from './character-models.mjs'
const A = await modules(), pack = await packCharacterModels()
const json = p => JSON.parse(readFileSync(p, 'utf8'))
const sha = p => createHash('sha256').update(readFileSync('../' + p)).digest('hex')
const registry = json('../assets/characters/hero-transformations/activation-registry.json')
const BASE = 'assets/characters/hero-outfits/', rec = json('../' + BASE + 'import.json')
const SEVEN = { 'paladin-dark': 'Black Oath', 'paladin-shiney': 'Dawnblade', 'paladin-smug': 'Court Champion', 'priest-pauper': 'Barefoot Mendicant',
  'priest-armored': 'Battle Chaplain', 'priest-robes': 'Cathedral Bishop', 'priest-scantily': 'Rune-Marked Ascetic' }
const typeOf = id => Object.keys(registry.typeIds).find(t => registry.typeIds[t] === id)

test('the seven stand in their own approved outfits: the bytes the approval\'s manifest names, every ruled motion, the head listed', () => {
  for (const [f, h] of Object.entries(rec.records.files)) assert.equal(sha(BASE + f), h, `${f}: the record copied unchanged`)
  const approval = json('../' + BASE + rec.approval.record), manifest = json('../' + BASE + 'motion/' + approval.baselineManifest.split('/').pop())
  assert.equal(approval.status, 'approved')
  assert.deepEqual(Object.keys(rec.outfits).sort(), Object.keys(SEVEN).sort(), 'the seven, and only they, were imported')
  for (const [id, title] of Object.entries(SEVEN)) {
    const t = typeOf(id), look = pack[t].looks[0], o = rec.outfits[id]
    assert.ok(approval.outfits.includes(id), `${id} is approved`)
    assert.equal(o.title, title)
    assert.equal(look.id, id, `${t} is his own look`); assert.equal(look.identity, id)
    assert.equal(look.body.own, true, t); assert.equal(look.body.record, BASE + 'import.json', t)
    /* the bytes: the import's, the approval's baseline manifest's (its medium model), and the file's own */
    assert.deepEqual(look.model, { path: o.model.path, sha256: o.model.sha256 }, t)
    assert.ok(look.model.path.startsWith(BASE + 'motion/models/medium/' + id + '/'), `${t}: the medium body (viewer SWITCHES maleOutfitsBody)`)
    const entry = manifest.files.find(f => f.path.replace(/\\/g, '/').endsWith('/hero-outfits/' + o.source))
    assert.equal(entry.sha256.toLowerCase(), look.model.sha256, `${t}: the approved bytes`)
    assert.equal(sha(look.model.path), look.model.sha256, `${t}: the file is the approved bytes`)
    /* every ruled motion, the preview's own clips (byte-identical to the project's Oathblade files), none borrowed, nothing missing */
    for (const m of RULED) assert.ok(look.motions[m], `${t} ${m}`)
    assert.deepEqual(look.missing, [], t)
    for (const [m, ref] of Object.entries(look.motions)) {
      assert.equal(sha(ref.path), ref.sha256, `${t} ${m}`); assert.ok(!ref.borrowed, `${t} ${m} is the outfit's own clip`)
      assert.ok(Object.values(rec.clips).some(c => c.sha256 === ref.sha256 && c.path === ref.path), `${t} ${m}: a clip of the approved preview`)
    }
    /* the head: the body's own (the Ascetic's outfit figure's own), and his own listed (viewer SWITCHES maleOutfitsHeads) */
    assert.equal(look.body.head, id === 'priest-scantily' ? 'outfit' : 'body', t)
    assert.match(look.body.lacks, /^its own head: his head .* is a design with no fit on this body/, t)
    /* shown as the preview shows it: the body hidden but its head; the outfit's main paint unlit (viewer SWITCHES maleOutfitsShown) */
    assert.ok(look.hidden.length > 0 && look.hidden.every(n => n.startsWith('Body_')), t)
    assert.equal(look.hidden.includes('Body_Head'), look.body.head === 'outfit', `${t}: Body_Head shown only where the body's head is his`)
    assert.ok(look.unlit.includes('Painted_Outfit') && look.unlit.every(n => n.startsWith('Painted_') && !/^Painted_(Glove|Cuff|Joint|Exposed)/.test(n)), t)
  }
  /* the Lion keeps the body his identity's profile names */
  assert.deepEqual(pack['hero.base.paladin-hunk'].looks[0].model, registry.characters['paladin-hunk'].bodyProfile.model)
})

test('character-models --list no longer lists their outfits as missing', () => {
  const list = execFileSync(process.execPath, ['tools/character-models.mjs', '--list'], { encoding: 'utf8' })
  assert.doesNotMatch(list, /outside the project/)
  for (const id of Object.keys(SEVEN)) {
    const line = list.split('\n').find(l => l.startsWith(typeOf(id) + ' '))
    assert.ok(line.includes(BASE + 'motion/models/medium/' + id + '/candidate.glb'), line)
  }
})

const location = { protocol: 'http:', href: 'http://127.0.0.1:4230/viewer/BATTLE-VIEWER.html' }
const fetch = async url => { const b = readFileSync('..' + new URL(url).pathname); return { ok: true, arrayBuffer: async () => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) } }
const shown = (o, root) => { for (let n = o; n && n !== root; n = n.parent) if (!n.visible) return false; return true }
const headOf = stage => { let h = null; stage.traverse(o => { if (!h && o.isBone && /(^|_)head$/i.test(o.name)) h = o }); return h }
const headY = body => { body.stage.updateMatrixWorld(true); return new THREE.Vector3().setFromMatrixPosition(headOf(body.stage).matrixWorld).applyMatrix4(new THREE.Matrix4().copy(body.stage.matrixWorld).invert()).y }

test('they stand up from their files: the outfit shown over the body, its paint unlit, the kit in hand, a death that lies down', async () => {
  /* battle 1's Battle Chaplain (a shield), the Ascetic (his outfit's own head), the Black Oath (a greatsword) */
  for (const id of ['priest-armored', 'priest-scantily', 'paladin-dark']) {
    const t = typeOf(id), look = pack[t].looks[0], loaded = await A.loadLook(look, { location, fetch, textures: false })
    assert.deepEqual(Object.keys(loaded.clips).sort(), Object.keys(look.motions).sort(), t)
    const body = A.createBody(loaded)
    assert.ok(Math.abs(body.standingHeight() - look.height) < 1e-6, `${t} stands ${look.height} m`)
    const meshes = new Map()
    body.stage.traverse(o => { if (o.isMesh) { const name = /^(Body_|Painted_)/.test(o.name) ? o.name : o.parent.name; (meshes.get(name) ?? meshes.set(name, []).get(name)).push(o) } })
    for (const [name, ms] of meshes) {
      if (!/^(Body_|Painted_)/.test(name)) continue
      const visible = ms.some(m => shown(m, body.stage))
      assert.equal(visible, name.startsWith('Painted_') || (name === 'Body_Head' && look.body.head === 'body'), `${t}: ${name} ${visible ? 'shown' : 'hidden'}`)
      for (const m of ms) for (const mat of [].concat(m.material))
        assert.equal(mat.isMeshBasicMaterial === true, look.unlit.includes(name), `${t}: ${name} ${look.unlit.includes(name) ? 'unlit' : 'lit'}`)
    }
    assert.ok(meshes.has('Painted_Outfit'), `${t}: the outfit is in the file`)
    let held = 0; body.stage.traverse(o => { if (o.name.startsWith('held:')) held++ })
    assert.equal(held, look.props.length, `${t} holds his kit (${look.props.map(p => p.model).join(', ') || 'empty-handed'})`)
    body.play('idle', { snap: true }); body.frame(0); const up = headY(body)
    body.play('death', { snap: true }); body.frame(0)
    assert.ok(body.lying(), `${t} holds his death's last frame`)
    const down = headY(body)
    assert.ok(down < .45 * up, `${t}'s death ends lying (head ${down.toFixed(2)} m, standing ${up.toFixed(2)} m)`)
    body.dispose()
  }
  assert.deepEqual(pack[typeOf('priest-armored')].looks[0].props.map(p => [p.model, p.hand]), [['shield', 'L']], 'the Battle Chaplain\'s round shield')
  assert.deepEqual(pack[typeOf('paladin-dark')].looks[0].props.map(p => [p.model, p.hand]), [['greatsword', 'R']], 'the Black Oath\'s greatsword')
})
