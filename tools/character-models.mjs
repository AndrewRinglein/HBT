#!/usr/bin/env node
// The 3D characters a battle's units are drawn as (viewer.character-models, PLAYABLE-OPENING-PLAN.md item 5;
// engine DECISIONS.md 2026-09-29 "the playable opening" and "the playable battle screen": "units are 3D models
// where one exists, else their token"; enemies idle, move, attack, hit reaction, death; heroes those plus what
// their weapon's powers need; "a dead unit is its 3D model lying on the ground (the death motion's end)").
//
// Three facts, three owners, related ONCE here so the page computes nothing:
//   which look a unit type wears — BINDINGS below (the backlog spec: "bind per unit type from
//                                  assets/characters/APPROVED-CHARACTERS.md and assets/battle-demo/roster.mjs")
//   which file and clip is each motion, its size and pivot — the approval record where one exists
//                                  (accepted-zombies.json: sharedActions, variants[].animations, files{sha256}),
//                                  else the battle demo's roster (assets/battle-demo/roster.mjs catalog)
//   what is shown of a body, what it holds — the battle demo's own rules for that family (actors.mjs
//                                  prepareVisibility, purchased-stage-equipment.js's bow), written out as data
// Every file is read for its animation names and its SHA-256 is recorded: the page refuses any other bytes.
// A motion the ruling asks for and the look lacks is listed as `missing`. viewer.every-model loosens "never borrowed"
// (engine DECISIONS.md 2026-09-30 'a bunch of motions, not every one': "a lacking motion is filled from the approved or
// selected motions where one fits, and is still listed where none does"): a binding's `fill` names the selected
// performance (SELECTED) for what its look lacks — only onto a rig with every bone the performance moves — and the page
// plays it `borrowed`, on the body's own bone lengths (src/models.js borrowClip). `own` names a look's own unused clip.
//
// viewer.every-model (engine DECISIONS.md 2026-09-30 'a true 3D battle': "Everything in Orphanage has a 3D model") binds
// battles 1-3's civilians to their own animated bodies (CIVILIANS): the activation registry names each civilian's roster
// identity, the roster names its body, the body's paint record names its bytes.
//
// viewer.opening-cast (PLAYABLE-OPENING-PLAN.md item 10) binds the rest of battles 2 and 3: the Skeleton Archer and the
// Soldier on the approved humanoids (accepted-humanoids.json: idle, walk, death), the Imp and the Fire Imp on the demo's
// winged imp (its flight too), and every drafted hero by class (CLASS_LOOKS). A look's `missing` also names what the unit
// type's own sheet asks of it — a ranged attack with no shot motion, a flight power with no flight motion
// (generated/static.json, the engine's sheet through the door).
//
//   node tools/character-models.mjs --json      print the pack (the engine's test/character-models.test.ts reads it)
import { readFileSync, existsSync, openSync, readSync, closeSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { resolve, dirname, posix } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const PKG = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const ROOT = resolve(PKG, '..')
/* the viewer's motion words, in the ruling's order (DECISIONS.md 2026-09-29: "idle, move, attack, hit reaction
   and death"; "heroes ... whatever their weapon's powers need" — a bow's shot is `ranged`) */
export const MOTIONS = ['idle', 'move', 'flight', 'attack', 'ranged', 'hit', 'death']
export const RULED = ['idle', 'move', 'attack', 'hit', 'death']
/* the battle demo's roster keys -> the viewer's (the demo plays `block` as the struck unit's reaction:
   assets/battle-demo/main.mjs, `a===target&&step.kind==='melee'&&blocked` -> sample('block')) */
const ROSTER_KEY = { idle: 'idle', move: 'move', flight: 'flight', melee: 'attack', ranged: 'ranged', block: 'hit', death: 'death' }
/* which look each engine unit type wears (viewer SWITCHES.md, viewer.character-models) */
const HUMANOIDS = 'assets/characters/humanoid-enemies/accepted-humanoids.json'
export const BINDINGS = {
  'unit.zombie': { looks: ['plague-zombie', 'woman-blonde'], approval: 'assets/characters/monster-motion-audition/slow-zombie/accepted-zombies.json' },
  /* viewer.opening-cast (viewer SWITCHES modelOpeningEnemies, modelSoldier, modelHumanoidStature): the approved humanoids
     have no roster row; they are fitted to the demo's medium humanoid rig (CC_Base), so they stand at its stature */
  /* viewer.every-model (viewer SWITCHES modelFillMotions): what the approved humanoids lack, from the selected performances */
  'unit.skeletal-archer': { looks: ['skeletal-archer'], approval: HUMANOIDS, stature: 'archer', fill: { attack: 'sword', hit: 'flinch', ranged: 'bow' } },
  'unit.soldier': { looks: ['strong-skeleton'], approval: HUMANOIDS, stature: 'archer', fill: { attack: 'sword', hit: 'flinch' } },
  /* viewer.every-model (viewer SWITCHES modelImpFlinch): the winged imp's own getHit, which the demo's roster leaves unused */
  'unit.imp': { looks: ['imp'], own: { hit: 'getHit' } },
  'unit.fire-imp': { looks: ['fire-imp'], own: { hit: 'getHit' } },
}
/* the drafted heroes' outfits, by class (viewer SWITCHES modelHeroOutfits; engine DECISIONS.md 2026-09-29 "the playable
   opening": "outfits may be reused across heroes"): every hero.base.* the engine's sheet lists wears its class's look */
export const CLASS_LOOKS = {
  'class.ranger': ['archer'],
  'class.warrior': ['oathblade'], 'class.paladin': ['oathblade'],
  'class.priest': ['oathblade'], 'class.mage': ['oathblade'], 'class.rogue': ['oathblade'],
}
/* viewer.every-model: battles 1-3's civilians (viewer SWITCHES modelCivilians), each in its own roster body
   (player-roster/roster.json `bodyModel`, through activation-registry.json `typeIds`). The body's four authored clips
   (civilian-study animate_civilians.py: Idle, Walk, Take Damage, Death) are its motions; its punch is the selected Hook
   punch. It stands at the demo's medium humanoid stature, scaled by its standee against the School Teacher's (viewer
   SWITCHES modelCivilianStature — the bodies are height-normalised and "physical child stature in game is not
   configured", civilian-study run.json; the standee heights are viewer/tools/prep-art.py's ARTMAP) */
export const CIVILIANS = ['hero.fixed.orphans', 'hero.fixed.school-teacher', 'hero.fixed.lumberjack-and-wife', 'hero.fixed.lumberjacks-wife']
const ROSTER = 'assets/characters/hero-transformations/player-roster/roster.json'
const REGISTRY = 'assets/characters/hero-transformations/activation-registry.json'
const CIVILIAN_CLIPS = { idle: 'Idle', move: 'Walk', hit: 'Take Damage', death: 'Death' }
const CIVILIAN_STATURE = { frame: 'archer', standee: 'hero.fixed.school-teacher' }
const CIVILIAN_FILL = { attack: 'punch' }
/* the selected performances a look's lack may be filled from (engine DECISIONS.md 2026-09-30 'a bunch of motions, not
   every one'): the record that selected each names its clip and hash; the catalog beside it names its file */
const FREE = 'assets/characters/oathblade-armor/rebuild/free-motion-study/'
const SELECTED = {
  punch: { record: FREE + 'selections.json', key: 'hook' },                  // "Hook punch can work for our punch"
  sword: { record: FREE + 'selections.json', key: 'combo' },                 // "I love these sword moves" (Sword combination)
  flinch: { record: FREE + 'battle-actions/selections.json', key: 'headhit' }, // Head-hit reaction, selected 2026-09-30
  bow: { roster: 'archer', clip: 'ranged' },                                 // the battle demo's archer's bow shot
}
/** every binding: the named unit types, each civilian of battles 1-3, then each hero.base.* of the engine's sheet by its one class tag */
export function bindings(units = JSON.parse(readFileSync(resolve(PKG, 'generated/static.json'), 'utf8')).units) {
  const all = { ...BINDINGS }
  const registry = JSON.parse(readFileSync(resolve(ROOT, REGISTRY), 'utf8'))
  for (const typeId of CIVILIANS) {
    if (!units[typeId]) throw new Error(`${typeId}: the engine's sheet has no such civilian`)
    const identity = registry.typeIds[typeId]
    if (!identity) throw new Error(`${typeId}: ${REGISTRY} names no roster identity for it`)
    all[typeId] = { looks: [identity], civilian: true, fill: CIVILIAN_FILL }
  }
  for (const [typeId, sheet] of Object.entries(units)) {
    if (!typeId.startsWith('hero.base.')) continue
    const classes = (sheet.tags || []).filter(t => t.startsWith('class.'))
    if (classes.length !== 1) throw new Error(`${typeId}: the sheet gives it ${classes.length} class tags, not one`)
    const looks = CLASS_LOOKS[classes[0]]
    if (!looks) throw new Error(`${typeId}: no outfit for ${classes[0]}`)
    all[typeId] = { looks }
  }
  return all
}
/* what a unit type's sheet asks of its body beyond the ruled five: a shot for a ranged attack, a flight for a flight power */
function asked(sheet) {
  const extra = []
  if ((sheet?.attacks || []).some(a => a.attack?.kind === 'ranged')) extra.push('ranged')
  if ((sheet?.moves || []).some(m => m.move?.shape === 'flight')) extra.push('flight')
  return extra
}
/* the battle demo's `male` family shows its armour but the cloak, and of the body only the head and hands
   (assets/battle-demo/actors.mjs prepareVisibility) */
const FAMILY_HIDES = { male: n => n.startsWith('Armor_') ? n === 'Armor_Cloak' : n.startsWith('Body_') ? !(n === 'Body_Head' || n.includes('Hand')) : false }
/* the demo's bow (purchased-stage-equipment.js: served from the Oathblade page's root, which is this folder) */
const EQUIPMENT_ROOT = 'assets/characters/oathblade-armor/generated/rebuild/weapon-audition/equipment/'
const PROPS = { bow: [{ file: 'bow-flexible.glb', hand: 'L', calibrate: { motion: 'ranged', at: 0.45 } }] }

const rel = p => p.replace(/^\//, '')
/* a roster path is absolute on Andrew's PC (C:\\...\\Heroes of Blight and Tragic\\assets\\...): the project-relative part */
const fromRoster = p => { const m = /[\\/]Heroes of Blight and Tragic[\\/](.+)$/.exec(p || ''); if (!m) throw new Error(`roster path ${p} is not in the project`); return m[1].replace(/\\/g, '/') }
function glbJSON(path) {
  const abs = resolve(ROOT, path)
  if (!existsSync(abs)) throw new Error(`character model ${path} is missing`)
  const fd = openSync(abs, 'r'), head = Buffer.alloc(20)
  try {
    readSync(fd, head, 0, 20, 0)
    if (head.readUInt32LE(0) !== 0x46546c67 || head.readUInt32LE(16) !== 0x4e4f534a) throw new Error(`character model ${path} is not a GLB`)
    const json = Buffer.alloc(head.readUInt32LE(12)); readSync(fd, json, 0, json.length, 20)
    return JSON.parse(json.toString('utf8'))
  } finally { closeSync(fd) }
}
const digest = path => createHash('sha256').update(readFileSync(resolve(ROOT, path))).digest('hex')
const clipIn = (path, name) => {
  const names = (glbJSON(path).animations || []).map(a => a.name)
  const clip = name ?? names[0]
  if (!names.includes(clip)) throw new Error(`character model ${path} has no animation '${name}' (it has ${names.join(', ') || 'none'})`)
  return clip
}

/** the nodes a clip moves, by name */
const movedBy = (path, clip) => { const g = glbJSON(path), a = (g.animations || []).find(x => x.name === clip); return [...new Set(a.channels.map(c => g.nodes[c.target.node].name))] }
/** a selected performance, borrowed onto a body: refused unless the body's rig has every bone it moves */
function selected(name, body, catalog) {
  const sel = SELECTED[name]; if (!sel) throw new Error(`no selected performance '${name}'`)
  let ref
  if (sel.roster) {
    const m = catalog.find(a => a.id === sel.roster)?.clips[sel.clip]
    if (!m?.file) throw new Error(`the battle demo's ${sel.roster} has no ${sel.clip} file`)
    ref = { path: rel(m.file), sha256: digest(rel(m.file)), clip: clipIn(rel(m.file), m.name) }
  } else {
    const chosen = JSON.parse(readFileSync(resolve(ROOT, sel.record), 'utf8')).clips[sel.key]
    if (!chosen || !/^[0-9a-f]{64}$/.test(chosen.sha256 || '')) throw new Error(`${sel.record} selects no '${sel.key}' with a hash`)
    const row = JSON.parse(readFileSync(resolve(ROOT, posix.dirname(sel.record), 'catalog.json'), 'utf8')).clips.find(c => c.id === sel.key && c.sourceClip === chosen.clip)
    if (!row) throw new Error(`${posix.dirname(sel.record)}/catalog.json has no file for '${sel.key}'`)
    const path = 'assets/characters/oathblade-armor' + row.target
    if (digest(path) !== chosen.sha256) throw new Error(`${path} is not the selected ${chosen.clip}`)
    ref = { path, sha256: chosen.sha256, clip: clipIn(path, chosen.clip) }
  }
  const bones = new Set((glbJSON(body).nodes || []).map(n => n.name)), lacks = movedBy(ref.path, ref.clip).filter(n => !bones.has(n))
  if (lacks.length) throw new Error(`${name} (${ref.clip}) moves ${lacks.length} bones ${body} lacks (${lacks.slice(0, 3).join(', ')})`)
  return { ...ref, borrowed: true }
}

export async function packCharacterModels() {
  const { catalog } = await import(pathToFileURL(resolve(ROOT, 'assets/battle-demo/roster.mjs')).href)
  const units = JSON.parse(readFileSync(resolve(PKG, 'generated/static.json'), 'utf8')).units
  const artmap = JSON.parse(readFileSync(resolve(PKG, 'generated/art/manifest.json'), 'utf8')).artmap
  const roster = JSON.parse(readFileSync(resolve(ROOT, ROSTER), 'utf8')).characters
  const pack = {}
  for (const [typeId, bind] of Object.entries(bindings(units))) {
    const approval = bind.approval ? JSON.parse(readFileSync(resolve(ROOT, bind.approval), 'utf8')) : null
    const looks = bind.looks.map(id => {
      const variant = approval ? approval.variants.find(v => v.id === id) : null
      if (approval && !variant) throw new Error(`${typeId}: ${bind.approval} approves no '${id}'`)
      const civilian = bind.civilian ? roster.find(c => c.id === id) : null
      if (bind.civilian && !civilian?.bodyModel) throw new Error(`${typeId}: ${ROSTER} gives '${id}' no body`)
      const row = civilian ? null : catalog.find(a => a.id === id)
      const frame = row ?? catalog.find(a => a.id === (civilian ? CIVILIAN_STATURE.frame : bind.stature))
      if (!frame) throw new Error(`${typeId}: the battle demo's roster has no '${id}'`)
      let height = frame.height
      if (civilian) {
        const own = artmap[typeId]?.height, by = artmap[CIVILIAN_STATURE.standee]?.height
        if (!(own > 0) || !(by > 0)) throw new Error(`${typeId}: no standee height to stand it by`)
        height = frame.height * own / by
      }
      const look = { id, name: civilian?.name ?? row?.name ?? variant.name, height, pivot: frame.pivot, motions: {}, hidden: [], props: [] }
      if (civilian) {
        /* the civilian's own animated body: its paint record names the bytes (civilian-study install_repaint.py) */
        const body = fromRoster(civilian.bodyModel), record = JSON.parse(readFileSync(resolve(ROOT, posix.dirname(body), 'paint-record.json'), 'utf8'))
        if (!/^[0-9a-f]{64}$/.test(record.outputSHA256 || '') || digest(body) !== record.outputSHA256) throw new Error(`${typeId} ${id}: ${body} is not the painted body its record names`)
        look.model = { path: body, sha256: record.outputSHA256 }
        for (const [motion, clip] of Object.entries(CIVILIAN_CLIPS)) look.motions[motion] = { path: body, sha256: record.outputSHA256, clip: clipIn(body, clip) }
      } else if (approval) {
        /* the approval record owns the files and their hashes. A motion in its own file (the Zombies) names it; one
           embedded in the character (the humanoids) is in the variant's model. The body is the variant's model, else
           the death file (its baked floor placement parents the rig — accepted-zombies.json limitations; the demo's
           active cast does the same) */
        const base = posix.dirname(bind.approval) + '/'
        const hashOf = file => { const sha256 = approval.files[file]; if (!/^[0-9a-f]{64}$/.test(sha256 || '')) throw new Error(`${typeId} ${id}: ${file} has no recorded hash`); return sha256 }
        for (const [action, clipName] of Object.entries(approval.sharedActions)) {
          const a = variant.animations.find(x => x.action === action && x.clip === clipName)
          if (!a || a.visualAcceptance !== 'approved') throw new Error(`${typeId} ${id}: ${action} is not an approved animation`)
          const file = a.file ?? variant.model
          if (!file) throw new Error(`${typeId} ${id}: ${action} names no file`)
          look.motions[action] = { path: base + file, sha256: hashOf(file), clip: clipIn(base + file, clipName) }
        }
        if (!look.motions.death) throw new Error(`${typeId} ${id}: no approved death to lie in`)
        look.model = variant.model ? { path: base + variant.model, sha256: hashOf(variant.model) } : { path: look.motions.death.path, sha256: look.motions.death.sha256 }
        if (variant.modelSHA256 && variant.modelSHA256 !== look.model.sha256) throw new Error(`${typeId} ${id}: the record's model hash and its file list disagree`)
      } else {
        look.model = { path: rel(row.model), sha256: digest(rel(row.model)) }
        for (const [key, m] of Object.entries(row.clips)) {
          const motion = ROSTER_KEY[key]; if (!motion) continue
          const path = m.file ? rel(m.file) : look.model.path
          look.motions[motion] = { path, sha256: path === look.model.path ? look.model.sha256 : digest(path), clip: clipIn(path, m.name) }
        }
        const meshes = (glbJSON(look.model.path).nodes || []).filter(n => n.mesh != null).map(n => n.name)
        const hides = FAMILY_HIDES[row.family]
        if (hides) look.hidden = meshes.filter(hides)
        for (const p of PROPS[row.equipment] || []) {
          if (!look.motions[p.calibrate.motion]) throw new Error(`${typeId} ${id}: its ${row.equipment} is fitted on ${p.calibrate.motion}, which it lacks`)
          look.props.push({ path: EQUIPMENT_ROOT + p.file, sha256: digest(EQUIPMENT_ROOT + p.file), hand: p.hand, calibrate: p.calibrate })
        }
      }
      for (const [motion, clip] of Object.entries(bind.own || {})) if (!look.motions[motion]) look.motions[motion] = { path: look.model.path, sha256: look.model.sha256, clip: clipIn(look.model.path, clip) }
      for (const [motion, name] of Object.entries(bind.fill || {})) if (!look.motions[motion]) look.motions[motion] = selected(name, look.model.path, catalog)
      if (!(look.height > 0) || typeof look.pivot !== 'string') throw new Error(`${typeId} ${id}: no height or pivot in the roster`)
      look.missing = [...RULED, ...asked(units[typeId])].filter(m => !look.motions[m])
      return look
    })
    pack[typeId] = { typeId, looks }
  }
  return pack
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url) && process.argv.includes('--json')) process.stdout.write(JSON.stringify(await packCharacterModels()))
