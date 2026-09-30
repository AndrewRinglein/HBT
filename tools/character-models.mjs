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
// A motion the ruling asks for and the look lacks is listed as `missing` — never borrowed from another body.
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
export const MOTIONS = ['idle', 'move', 'attack', 'ranged', 'hit', 'death']
export const RULED = ['idle', 'move', 'attack', 'hit', 'death']
/* the battle demo's roster keys -> the viewer's (the demo plays `block` as the struck unit's reaction:
   assets/battle-demo/main.mjs, `a===target&&step.kind==='melee'&&blocked` -> sample('block')) */
const ROSTER_KEY = { idle: 'idle', move: 'move', melee: 'attack', ranged: 'ranged', block: 'hit', death: 'death' }
/* which look each engine unit type wears (viewer SWITCHES.md, viewer.character-models) */
export const BINDINGS = {
  'unit.zombie': { looks: ['plague-zombie', 'woman-blonde'], approval: 'assets/characters/monster-motion-audition/slow-zombie/accepted-zombies.json' },
  'hero.base.ranger-scantily': { looks: ['archer'] },
}
/* the battle demo's `male` family shows its armour but the cloak, and of the body only the head and hands
   (assets/battle-demo/actors.mjs prepareVisibility) */
const FAMILY_HIDES = { male: n => n.startsWith('Armor_') ? n === 'Armor_Cloak' : n.startsWith('Body_') ? !(n === 'Body_Head' || n.includes('Hand')) : false }
/* the demo's bow (purchased-stage-equipment.js: served from the Oathblade page's root, which is this folder) */
const EQUIPMENT_ROOT = 'assets/characters/oathblade-armor/generated/rebuild/weapon-audition/equipment/'
const PROPS = { bow: [{ file: 'bow-flexible.glb', hand: 'L', calibrate: { motion: 'ranged', at: 0.45 } }] }

const rel = p => p.replace(/^\//, '')
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

export async function packCharacterModels() {
  const { catalog } = await import(pathToFileURL(resolve(ROOT, 'assets/battle-demo/roster.mjs')).href)
  const pack = {}
  for (const [typeId, bind] of Object.entries(BINDINGS)) {
    const approval = bind.approval ? JSON.parse(readFileSync(resolve(ROOT, bind.approval), 'utf8')) : null
    const looks = bind.looks.map(id => {
      const row = catalog.find(a => a.id === id)
      if (!row) throw new Error(`${typeId}: the battle demo's roster has no '${id}'`)
      const look = { id, name: row.name, height: row.height, pivot: row.pivot, motions: {}, hidden: [], props: [] }
      if (approval) {
        /* the approval record owns the files and their hashes; the death file is the body (its baked floor
           placement parents the rig — accepted-zombies.json limitations; the demo's active cast does the same) */
        const variant = approval.variants.find(v => v.id === id)
        if (!variant) throw new Error(`${typeId}: ${bind.approval} approves no '${id}'`)
        const base = posix.dirname(bind.approval) + '/'
        for (const [action, clipName] of Object.entries(approval.sharedActions)) {
          const a = variant.animations.find(x => x.action === action && x.clip === clipName)
          if (!a || a.visualAcceptance !== 'approved') throw new Error(`${typeId} ${id}: ${action} is not an approved animation`)
          const sha256 = approval.files[a.file]
          if (!/^[0-9a-f]{64}$/.test(sha256 || '')) throw new Error(`${typeId} ${id}: ${a.file} has no recorded hash`)
          look.motions[action] = { path: base + a.file, sha256, clip: clipIn(base + a.file, clipName) }
        }
        if (!look.motions.death) throw new Error(`${typeId} ${id}: no approved death to lie in`)
        look.model = { path: look.motions.death.path, sha256: look.motions.death.sha256 }
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
      if (!(look.height > 0) || typeof look.pivot !== 'string') throw new Error(`${typeId} ${id}: no height or pivot in the roster`)
      look.missing = RULED.filter(m => !look.motions[m])
      return look
    })
    pack[typeId] = { typeId, looks }
  }
  return pack
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url) && process.argv.includes('--json')) process.stdout.write(JSON.stringify(await packCharacterModels()))
