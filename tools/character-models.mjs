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
// viewer.weapons-in-hand (engine DECISIONS.md 2026-10-01, Andrew: "The characters are not holding weapons. The whole idea of
// having 3D weapons is so they're holding weapons.") puts each base hero's kit in its hands (HELD, viewer SWITCHES heldModels,
// heldFits, heldHands): a held item with no fitted model is listed in the look's `unheld`, never drawn as another.
//
// viewer.real-bodies (engine DECISIONS.md 2026-10-01, Andrew: "don't we have more 3D things we can use? We've done all kinds of
// different heads, all kinds of different armor. ... the idea is to rig this up") stands each hero in its own assembled body where
// the project holds one (ownBody below, viewer SWITCHES realBodies*), the Bloodhound and the Hellhound in the approved hounds, and
// the Poison Imp, the Skeleton, the Necromancer and the Demon Lieutenant in their approved bodies. A hero with no body of its own
// keeps its class's placeholder and says so (`body.own: false`, `body.lacks`); a unit type with no approved body is in UNBODIED.
//
// viewer.male-hero-outfits (engine DECISIONS.md 2026-10-01 'the approved male hero outfits come into the project') stands the Black
// Oath, Dawnblade, Court Champion and the four priests each in his own approved outfit, imported into assets/characters/hero-outfits
// (MALE_OUTFITS below), replacing the Oathblade placeholder; his own head has no fit, so it is listed (`body.lacks`).
//
// viewer.shield-guard-motion (engine DECISIONS.md 2026-10-01 'a shield power plays a raise-the-shield motion', Andrew: "When they
// play shield power, they should raise the shield animation.") gives every body that holds a shield - an item of the engine's class
// `shield` in its kit (static.json itemClasses) - the motion word `guard` (viewer SWITCHES guardWord): the raise-the-shield clip,
// the Oathblade body's shield_blockleft (GUARD below), from the body's own clip set where it has one, else borrowed as its hit is.
// Its hit reaction is unchanged. A shield holder with no such clip lists `guard` as missing, and --list names it.
//
//   node tools/character-models.mjs --json      print the pack (test/character-models.test.ts reads it)
//   node tools/character-models.mjs --list      who stands in what, and what is listed (viewer.real-bodies)
import { readFileSync, existsSync, openSync, readSync, closeSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { resolve, dirname, posix } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const PKG = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const ROOT = resolve(PKG, '..')
/* the viewer's motion words, in the ruling's order (DECISIONS.md 2026-09-29: "idle, move, attack, hit reaction
   and death"; "heroes ... whatever their weapon's powers need" — a bow's shot is `ranged`) */
export const MOTIONS = ['idle', 'move', 'flight', 'attack', 'ranged', 'hit', 'guard', 'death']
export const RULED = ['idle', 'move', 'attack', 'hit', 'death']
/* viewer.shield-guard-motion: the raise-the-shield clip, by its ActorCore name - the Oathblade body's shield_blockleft (engine
   DECISIONS.md 2026-10-01: "The one clip that exists is the Oathblade body's shield_blockleft"); the battle demo's roster calls
   it `block`, the wardrobe and the approved outfits by this name */
const GUARD = 'shield_blockleft'
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
  /* viewer.real-bodies (viewer SWITCHES realBodiesEnemies): the rest of the opening's and the caravan's cast that has an
     approved body — the third imp of the demo's pack; the two other approved humanoids; the approved hounds (wolf/hounds/
     approved-pack.json: idle, run, tearing bite, death, the record's own hashes); the Demon Lieutenant's selected appearance
     (reference-painted-enemies/selected-appearances.json, its four embedded clips) holding the demo's sword as the demo's
     commanders hold it */
  'unit.poison-imp': { looks: ['poison-imp'], own: { hit: 'getHit' } },
  'unit.skeleton': { looks: ['skeleton'], approval: HUMANOIDS, stature: 'archer', fill: { attack: 'sword', hit: 'flinch' } },
  'unit.necromancer': { looks: ['necromancer'], approval: HUMANOIDS, stature: 'archer', fill: { attack: 'punch', ranged: 'spell', hit: 'flinch' } },
  'unit.bloodhound': { looks: ['bloodhound'], hounds: 'assets/characters/wolf/hounds/approved-pack.json' },
  'unit.hellhound': { looks: ['hellhound'], hounds: 'assets/characters/wolf/hounds/approved-pack.json' },
  'unit.lieutenant-demon': { looks: ['demon-lieutenant'], appearance: { record: 'assets/characters/reference-painted-enemies/selected-appearances.json', key: 'demon' },
    clips: { idle: 'Standing idle', move: 'Walk', attack: 'Sword swing', death: 'Death' }, held: ['sword'], fill: { hit: 'flinch', ranged: 'spell' } },
}
/* viewer.real-bodies: the opening's and the caravan's unit types no approved body exists for — listed, never drawn as another's
   (assets/characters/ANIMATION-MODEL-PLAN.md, its rows for each; monster-motion-audition/README.md for the werewolf and the ghoul) */
export const UNBODIED = {
  'unit.zombie-hound': 'no appearance of its own selected: the wolf/hound anatomy and motions are candidates for it (ANIMATION-MODEL-PLAN.md)',
  'unit.werewolf': 'an audition only: the earlier three-clip transfer was rejected and the newer ten-attack audition is not accepted, with no idle, move, hit or death (ANIMATION-MODEL-PLAN.md)',
  'unit.bruiser-demon': 'reference art located, no model bound (ANIMATION-MODEL-PLAN.md)',
  'unit.powerful-imp': 'no appearance selected: the imp rig and library are candidates; the three imp appearances are not assumed to cover it (ANIMATION-MODEL-PLAN.md)',
  'unit.ghoul': 'its werewolf-based transfer was rejected on 2026-09-23 ("train wrecks"); no other body (monster-motion-audition/README.md)',
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
  /* viewer.real-bodies (viewer SWITCHES realBodiesFill) */
  spell: { record: FREE + 'selections.json', key: 'spell' },                 // Spell_Simple_Shoot: "suitable casting and power use"
  block: { roster: 'oathblade', clip: 'block' },                             // the battle demo's hero's struck reaction (shield block)
  fall: { roster: 'oathblade', clip: 'death' },                              // the battle demo's hero's death (the arrow-hit fall)
}
/* viewer.real-bodies: a hero's own assembled body (viewer SWITCHES realBodiesOwn, realBodiesWardrobe, realBodiesHeads), by its
   roster identity (activation-registry.json `typeIds`):
     1. the fitted body its identity's bodyProfile names (activation-registry.json: the Lion of the Host, the Archive Scholar —
        "accepted demonstration"), on which the afflictions' heads and skin are layered (src/models.js setAfflictions);
     2. else a female hero's own outfit on the accepted slender body (the EVE female wardrobe, outfits/eve: twelve outfits from the
        original cards, fitted, rigged, painted — candidates), in the version the wardrobe's latest review shows
        (outfits/eve/build_serpent_armhole_viewer.py, 2026-09-25), its bytes named by that version's own record, with her own
        fitted head where the wardrobe carries one (Scholar, Raven, Serpent) and else the body's own head — her head listed;
   shown as its owners show it (hero-transformations/battle.mjs; outfits/eve/serpent-armhole.html): one head variant, the
   under-suit hidden beneath the outfit. The wardrobe's motions are its own clip set (slender-rebuild/motions: ready, walk,
   slash-down, shield block); every body lies in the demo hero's fall, and a bow-holder shoots the demo archer's shot. */
const WARDROBE = 'assets/characters/oathblade-armor/rebuild/candidates/eve-bodies/female-production/slender-rebuild/'
const OUTFIT_VERSION = { 'rogue-snake': 'armhole-v4', 'ranger-aggressive': 'detail-paint-v2', 'ranger-ranger': 'detail-paint-v2' }
const OUTFIT_DEFAULT = 'detail-paint-v1'
const OUTFIT_RECORD = { 'armhole-v4': 'repair.json' }
const WARDROBE_CLIPS = { idle: 'idle_ready', move: 'walkforward01', attack: 'atk_slashdown', hit: 'shield_blockleft' }
/* the Lion's own embedded clips (paint-male-pilot: "three unchanged source clips") */
const PROFILE_CLIPS = { male: { idle: 'idle_ready', move: 'walkforward01', attack: 'atk_slashdown' } }
/* each body stands at the battle demo's stature for its family: the female row (scholar) and the hero row (oathblade) */
const FAMILY_FRAME = { female: 'scholar', male: 'oathblade' }
const OWN_FILL = { female: { death: 'fall' }, male: { hit: 'block', death: 'fall' } }
const UNDER_SUIT = '_UnderSuit'
/* where an approved outfit of a hero lies outside this folder: the combined review's catalog (approved-review/catalog.json) */
const REVIEW = 'assets/characters/oathblade-armor/rebuild/approved-review/catalog.json'
/* viewer.male-hero-outfits (engine DECISIONS.md 2026-10-01 'the approved male hero outfits come into the project', Andrew: "Number
   two, yes, that's quite important."): the approved male outfits (Black Oath, Dawnblade, Court Champion, the four priests), imported
   from their production folder with the records that approve them (hero-outfits/import.json, viewer SWITCHES maleOutfits*): each
   on the medium male body — the Oathblade's — shown as the approved preview shows it (hero-outfits motion/viewer.mjs): the painted
   outfit, of the body only its head (none where the outfit is a whole figure), the outfit's main paint unlit; moved by the preview's
   own medium clips, which are the Oathblade's ActorCore files byte for byte. */
const MALE_OUTFITS = 'assets/characters/hero-outfits/import.json'
const MALE_OUTFIT_CLIPS = { idle: 'idle_ready', move: 'walkforward01', attack: 'atk_slashdown', hit: 'shield_blockleft', death: 'arrow-hit-die' }
const OUTFIT_LIT = /^Painted_(Glove|Cuff|Joint|Exposed)/
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
    all[typeId] = { looks, items: sheet.defaultItems || [], hero: registry.typeIds[typeId] ?? null }
  }
  return all
}
/* what a unit type's sheet asks of its body beyond the ruled five: a shot for a ranged attack, a flight for a flight power, a
   raised shield for a shield in its kit (viewer.shield-guard-motion: the engine's item class, static.json itemClasses) */
function asked(sheet, classes) {
  const extra = []
  if ((sheet?.attacks || []).some(a => a.attack?.kind === 'ranged')) extra.push('ranged')
  if ((sheet?.moves || []).some(m => m.move?.shape === 'flight')) extra.push('flight')
  if (holdsShield(sheet, classes)) extra.push('guard')
  return extra
}
/** viewer.shield-guard-motion: the unit type's kit holds an item the engine classes a shield */
const holdsShield = (sheet, classes) => (sheet?.defaultItems || []).some(i => classes[i] === 'shield')
/** the raise-the-shield clip, checked to be it */
const guardRef = (ref, who) => { if (!ref.path.includes('/' + GUARD + '/')) throw new Error(`${who}: ${ref.path} is not the ${GUARD} clip`); return ref }
/* the battle demo's `male` family shows its armour but the cloak, and of the body only the head and hands
   (assets/battle-demo/actors.mjs prepareVisibility) */
const FAMILY_HIDES = { male: n => n.startsWith('Armor_') ? n === 'Armor_Cloak' : n.startsWith('Body_') ? !(n === 'Body_Head' || n.includes('Hand')) : false }
/* the demo's bow (purchased-stage-equipment.js: served from the Oathblade page's root, which is this folder) */
const EQUIPMENT_ROOT = 'assets/characters/oathblade-armor/generated/rebuild/weapon-audition/equipment/'
const PROPS = { bow: [{ file: 'bow-flexible.glb', hand: 'L', calibrate: { motion: 'ranged', at: 0.45 } }] }
/* viewer.weapons-in-hand: the model each held item of a hero's kit is drawn as (viewer SWITCHES heldModels — by name: no record
   ties a game item to a weapon model), and the fit it is held with, each fit used as its owner uses it (SWITCHES heldFits):
     the battle demo's own equipment on this very body (oathblade-armor/rebuild/purchased-stage-equipment.js fitEquipment, which
       assets/battle-demo/actors.mjs fits with the strike as its reference pose): `turned` - the sword (and the mace beside it in
       15-weapons.glb, on the same haft) at the grip, a quarter turn about the hand; `square` - the shield square to the left hand
       at the strike, at its offset; `forearm` - the flexible bow along the left forearm at the shot (PROPS above)
     the medium weapon tester's socket (weapon-card-models/tester/equipment.js createEquipment) - `tester`: its palm-centred grip
       and hand flip, the weapon's own stored grip, scale and roll (tester/weapons.json), and no fitted finger pose
       (finger-grips.json is the tester's body's; production-lessons.json preserve-primary-grip)
   None of these 3D fits is accepted by a person (weapon-card-models/README.md: "no 3D result is yet accepted"). */
const TESTER = 'assets/characters/oathblade-armor/rebuild/candidates/weapon-card-models/tester/weapons.json'
const DEMO_HELD = {
  sword: { file: '15-weapons.glb', node: 'Weapon_sword', fit: 'turned' },
  mace: { file: '15-weapons.glb', node: 'Weapon_mace', fit: 'turned' },
  shield: { file: 'shield-equipped.glb', fit: 'square', at: [.06433, -.02698, .00630], calibrate: { motion: 'attack', at: 0 } },
  bow: { file: 'bow-flexible.glb', fit: 'forearm', calibrate: { motion: 'ranged', at: 0.45 } },
}
export const HELD = {
  'item.longsword': { demo: 'sword' }, 'item.iron-mace': { demo: 'mace' },
  'item.kite-shield': { demo: 'shield' }, 'item.tower-shield': { demo: 'shield' }, 'item.round-shield': { demo: 'shield' },
  'item.elfbow': { demo: 'bow' }, 'item.shortbow': { demo: 'bow' }, 'item.longbow': { demo: 'bow' },
  'item.greatsword': { tester: 'greatsword' }, 'item.war-axe': { tester: 'axe' }, 'item.halberd': { tester: 'halberd' },
  'item.fire-staff': { tester: 'magic-staff' }, 'item.frost-staff': { tester: 'magic-staff' },
  'item.obsidian-fang-dagger': { tester: 'dagger' }, 'item.daggers': { tester: 'dagger', pair: true },
}
/* held items no fitted model exists for: listed on the look, never faked (the crossbow's model has no fit anywhere) */
export const UNMODELLED = ['item.holy-texts', 'item.holy-symbol', 'item.throwing-knives', 'item.hand-crossbow']
/* the held set a roster row's own equipment already is: such a look keeps the row's id */
const ROSTER_HELD = { 'sword-shield': ['sword', 'shield'], bow: ['bow'] }
/** a kit's held items as props, in the kit's order: the shield and the bow in the left hand (their fits are the left hand's),
    the first other weapon in the right, a second in the left, a pair in both (viewer SWITCHES heldHands) */
function heldProps(typeId, items, motions) {
  const props = [], free = { R: true, L: true }
  const tester = JSON.parse(readFileSync(resolve(ROOT, TESTER), 'utf8'))
  const take = (item, model, hand) => {
    if (!free[hand]) throw new Error(`${typeId}: no free ${hand} hand for ${item}`)
    free[hand] = false
    const h = HELD[item]
    if (h.demo) {
      const { file, ...fit } = DEMO_HELD[h.demo], path = EQUIPMENT_ROOT + file
      if (fit.fit === 'turned' && hand !== 'R') throw new Error(`${typeId}: the demo's ${model} is fitted to the right hand only`)
      if (fit.calibrate && !motions[fit.calibrate.motion]) throw new Error(`${typeId}: its ${model} is fitted on ${fit.calibrate.motion}, which it lacks`)
      props.push({ path, sha256: digest(path), hand, item, model, ...fit })
    } else {
      const t = tester.find(w => w.id === h.tester)
      if (!t) throw new Error(`${TESTER} has no '${h.tester}'`)
      const path = 'assets/characters/oathblade-armor' + t.url
      props.push({ path, sha256: digest(path), hand, item, model, fit: 'tester', ...(t.preNormalized ? { preNormalized: true } : { grip: t.grip, scale: t.scale }), roll: t.roll || 0 })
    }
  }
  for (const item of items) if (HELD[item]) {
    const model = HELD[item].demo ?? HELD[item].tester
    if (HELD[item].pair) { take(item, model, 'R'); take(item, model, 'L') }
    else if (model === 'shield' || model === 'bow') take(item, model, 'L')
    else take(item, model, free.R ? 'R' : 'L')
  }
  return { props, unheld: items.filter(i => UNMODELLED.includes(i)) }
}

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

/** viewer.real-bodies: a hero's own assembled body (WARDROBE above), or null — its file, the record that names the bytes, how far
    its fit has come (the record's own words), whose head it shows */
function ownBody(identity, registry, roster) {
  const character = registry.characters[identity]
  if (!character) return null
  const profile = character.bodyProfile
  if (profile) {
    if (digest(profile.model.path) !== profile.model.sha256) throw new Error(`${identity}: ${profile.model.path} is not the body ${REGISTRY} names`)
    return { family: profile.gender, model: { path: profile.model.path, sha256: profile.model.sha256 }, record: REGISTRY, fit: character.bodyFit }
  }
  const gender = roster.find(c => c.id === identity)?.gender
  const dir = WARDROBE + 'outfits/eve/' + identity + '/'
  if (gender === 'male') return maleOutfit(identity)
  if (gender !== 'female' || !existsSync(resolve(ROOT, dir))) return null
  const version = OUTFIT_VERSION[identity] ?? OUTFIT_DEFAULT, record = dir + version + '/' + (OUTFIT_RECORD[version] ?? 'record.json')
  const r = JSON.parse(readFileSync(resolve(ROOT, record), 'utf8')), out = (r.exports || []).find(x => x.file === 'wardrobe-rigged.glb')
  if (!/^[0-9a-f]{64}$/.test(out?.outputSHA256 || '')) throw new Error(`${identity}: ${record} names no wardrobe-rigged.glb with a hash`)
  const path = dir + version + '/wardrobe-rigged.glb'
  if (digest(path) !== out.outputSHA256) throw new Error(`${identity}: ${path} is not the outfit ${record} names`)
  return { family: 'female', model: { path, sha256: out.outputSHA256 }, record, fit: r.status }
}
/** viewer.male-hero-outfits: a male hero's own approved outfit (MALE_OUTFITS above), or null — its bytes checked against the
    approval's own baseline manifest, the approval checked to name him */
function maleOutfit(identity) {
  const rec = JSON.parse(readFileSync(resolve(ROOT, MALE_OUTFITS), 'utf8')), o = rec.outfits?.[identity]
  if (!o) return null
  const base = posix.dirname(MALE_OUTFITS) + '/', read = f => {
    const path = base + f
    if (digest(path) !== rec.records?.files?.[f]) throw new Error(`${identity}: ${path} is not the record ${MALE_OUTFITS} copied`)
    return JSON.parse(readFileSync(resolve(ROOT, path), 'utf8'))
  }
  const approval = read(rec.approval.record)
  if (approval.status !== 'approved' || !approval.outfits.includes(identity)) throw new Error(`${identity}: ${rec.approval.record} does not approve it`)
  const manifest = read(posix.dirname(rec.approval.record) + '/' + posix.basename(approval.baselineManifest))
  const entry = manifest.files.find(f => f.path.replace(/\\/g, '/').endsWith('/hero-outfits/' + o.source))
  if (!entry || entry.sha256.toLowerCase() !== o.model.sha256) throw new Error(`${identity}: ${o.source} is not in the approval's baseline manifest with that hash`)
  if (digest(o.model.path) !== o.model.sha256) throw new Error(`${identity}: ${o.model.path} is not the outfit ${MALE_OUTFITS} names`)
  return { family: 'male', outfit: { head: o.head, rec }, model: { path: o.model.path, sha256: o.model.sha256 }, record: MALE_OUTFITS,
    fit: `approved ${approval.recordedAt.slice(0, 10)} as presented in its movement preview (${approval.scope.split(',')[0]}); in the battle screen a candidate` }
}
/** viewer.real-bodies: what a hero standing in its class's placeholder has elsewhere, and so lacks here */
function placeholderLacks(identity, review) {
  const armor = review.entries.find(e => e.id === 'armor-' + identity)
  if (armor?.status === 'approved' && !/[\\/]Heroes of Blight and Tragic[\\/]/.test(armor.recordPath || ''))
    return `its own fitted body: its approved outfit (${armor.title}) is outside the project (${posix.dirname(armor.recordPath.replace(/\\/g, '/'))}); its head has no fit on that body`
  return 'its own fitted body: no outfit of its own is fitted to a rigged body in the project'
}
/** the demo's held equipment by its own name, in a hand (a commander's sword) */
function demoProp(typeId, model, hand) {
  const { file, ...fit } = DEMO_HELD[model]
  if (!file) throw new Error(`${typeId}: the demo holds no '${model}'`)
  return { path: EQUIPMENT_ROOT + file, sha256: digest(EQUIPMENT_ROOT + file), hand, model, ...fit }
}

export async function packCharacterModels() {
  const { catalog } = await import(pathToFileURL(resolve(ROOT, 'assets/battle-demo/roster.mjs')).href)
  const statics = JSON.parse(readFileSync(resolve(PKG, 'generated/static.json'), 'utf8')), units = statics.units
  /* viewer.shield-guard-motion: the engine's item classes (npm run static) - which kits hold a shield */
  const classes = statics.itemClasses
  if (!classes) throw new Error('generated/static.json carries no itemClasses: re-dump it (npm run static)')
  const artmap = JSON.parse(readFileSync(resolve(PKG, 'generated/art/manifest.json'), 'utf8')).artmap
  const roster = JSON.parse(readFileSync(resolve(ROOT, ROSTER), 'utf8')).characters
  const registry = JSON.parse(readFileSync(resolve(ROOT, REGISTRY), 'utf8'))
  const review = JSON.parse(readFileSync(resolve(ROOT, REVIEW), 'utf8'))
  /* viewer.real-bodies: a hero in its own body — shown as its owners show it, moved by its family's clips, lying in the demo
     hero's fall, holding its kit */
  const ownLook = (typeId, bind, own) => {
    const frame = catalog.find(a => a.id === FAMILY_FRAME[own.family])
    if (!frame) throw new Error(`${typeId}: the battle demo's roster has no '${FAMILY_FRAME[own.family]}' to stand a ${own.family} body by`)
    const g = glbJSON(own.model.path), heads = (g.nodes || []).filter(n => n.extras?.headVariant).map(n => ({ name: n.name, variant: n.extras.headVariant }))
    if (own.outfit) return outfitLook(typeId, bind, own, frame, g)
    const head = !heads.length || heads.some(h => h.variant === bind.hero) ? bind.hero : 'original'
    const look = {
      id: bind.hero, identity: bind.hero, name: roster.find(c => c.id === bind.hero)?.name ?? registry.characters[bind.hero].name,
      height: frame.height, pivot: frame.pivot, model: own.model, motions: {},
      hidden: heads.filter(h => h.variant !== head).map(h => h.name),
      hiddenMaterials: (g.materials || []).map(m => m.name).filter(n => n.includes(UNDER_SUIT)),
      props: [],
      body: { own: true, record: own.record, fit: own.fit, head: head === bind.hero ? 'own' : 'body' },
    }
    if (head !== bind.hero) look.body.lacks = `its own head: the wardrobe fits only ${[...new Set(heads.map(h => h.variant))].filter(v => v !== 'original').join(', ')} on this body; it shows the body's own head`
    if (own.family === 'female') for (const [motion, clip] of Object.entries(WARDROBE_CLIPS)) {
      const path = WARDROBE + 'motions/' + clip + '/female-motion.glb'
      look.motions[motion] = { path, sha256: digest(path), clip: clipIn(path) }
    } else for (const [motion, clip] of Object.entries(PROFILE_CLIPS[own.family] || {})) look.motions[motion] = { path: own.model.path, sha256: own.model.sha256, clip: clipIn(own.model.path, clip) }
    const bow = bind.items.some(i => HELD[i]?.demo === 'bow')
    for (const [motion, name] of Object.entries({ ...OWN_FILL[own.family], ...(bow ? { ranged: 'bow' } : {}) })) if (!look.motions[motion]) look.motions[motion] = selected(name, own.model.path, catalog)
    /* viewer.shield-guard-motion: a shield holder raises it - the wardrobe's own shield_blockleft; a male body the Oathblade's, borrowed */
    if (holdsShield(units[typeId], classes)) {
      if (own.family === 'female') { const path = WARDROBE + 'motions/' + GUARD + '/female-motion.glb'; look.motions.guard = { path, sha256: digest(path), clip: clipIn(path) } }
      else if (own.family === 'male') look.motions.guard = guardRef(selected('block', own.model.path, catalog), typeId)
    }
    const { props, unheld } = heldProps(typeId, bind.items, look.motions)
    look.props = props; look.unheld = unheld
    look.missing = [...RULED, ...asked(units[typeId], classes)].filter(m => !look.motions[m])
    return look
  }
  /* viewer.male-hero-outfits: a male hero in his own approved outfit, as its preview shows it (MALE_OUTFITS above) */
  const outfitLook = (typeId, bind, own, frame, g) => {
    const { head, rec } = own.outfit, meshes = (g.nodes || []).filter(n => n.mesh != null).map(n => n.name)
    if (!meshes.some(n => n.startsWith('Painted_'))) throw new Error(`${typeId}: ${own.model.path} has no painted outfit`)
    if (head === 'body' && !meshes.includes('Body_Head')) throw new Error(`${typeId}: ${own.model.path} has no Body_Head to show`)
    const look = {
      id: bind.hero, identity: bind.hero, name: roster.find(c => c.id === bind.hero)?.name ?? registry.characters[bind.hero].name,
      height: frame.height, pivot: frame.pivot, model: own.model, motions: {},
      hidden: meshes.filter(n => n.startsWith('Body_') && !(head === 'body' && n === 'Body_Head')),
      unlit: meshes.filter(n => n.startsWith('Painted_') && !OUTFIT_LIT.test(n)),
      props: [],
      body: { own: true, record: own.record, fit: own.fit, head,
        lacks: `its own head: his head (approved-review/catalog.json head-${bind.hero}) is a design with no fit on this body; it shows ${head === 'body' ? "the body's own head" : "the outfit figure's own head"}` },
    }
    const bones = new Set((g.nodes || []).map(n => n.name))
    for (const [motion, clip] of Object.entries(MALE_OUTFIT_CLIPS)) {
      const c = rec.clips?.[clip]
      if (!c || !/^[0-9a-f]{64}$/.test(c.sha256 || '') || digest(c.path) !== c.sha256) throw new Error(`${typeId}: ${c?.path ?? clip} is not the clip ${MALE_OUTFITS} names`)
      const name = clipIn(c.path), lacks = movedBy(c.path, name).filter(n => !bones.has(n))
      if (lacks.length) throw new Error(`${typeId}: ${clip} moves ${lacks.length} bones ${own.model.path} lacks (${lacks.slice(0, 3).join(', ')})`)
      look.motions[motion] = { path: c.path, sha256: c.sha256, clip: name }
    }
    if (bind.items.some(i => HELD[i]?.demo === 'bow')) look.motions.ranged = selected('bow', own.model.path, catalog)
    /* viewer.shield-guard-motion: a shield holder raises it - the approved preview's own medium shield_blockleft */
    if (holdsShield(units[typeId], classes)) {
      const c = rec.clips?.[GUARD]
      if (!c || !/^[0-9a-f]{64}$/.test(c.sha256 || '') || digest(c.path) !== c.sha256) throw new Error(`${typeId}: ${c?.path ?? GUARD} is not the clip ${MALE_OUTFITS} names`)
      look.motions.guard = guardRef({ path: c.path, sha256: c.sha256, clip: clipIn(c.path) }, typeId)
    }
    const { props, unheld } = heldProps(typeId, bind.items, look.motions)
    look.props = props; look.unheld = unheld
    look.missing = [...RULED, ...asked(units[typeId], classes)].filter(m => !look.motions[m])
    return look
  }
  const pack = {}
  for (const [typeId, bind] of Object.entries(bindings(units))) {
    const own = bind.hero ? ownBody(bind.hero, registry, roster) : null
    if (own) { pack[typeId] = { typeId, looks: [ownLook(typeId, bind, own)] }; continue }
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
      } else if (bind.hounds) {
        /* viewer.real-bodies: the approved hounds — the record names each body's bytes and the four shared motions' (files relative
           to the wolf folder); the demo's damage flinch is not among them, so the hit is listed */
        const rec = JSON.parse(readFileSync(resolve(ROOT, bind.hounds), 'utf8')), base = posix.dirname(posix.dirname(bind.hounds)) + '/', ch = rec.characters?.[id]
        if (!ch) throw new Error(`${typeId}: ${bind.hounds} approves no '${id}'`)
        const ref = m => { const path = base + m.file; if (!/^[0-9a-f]{64}$/.test(m.sha256 || '') || digest(path) !== m.sha256) throw new Error(`${typeId} ${id}: ${path} is not the file ${bind.hounds} names`); return { path, sha256: m.sha256 } }
        look.model = ref(ch.model)
        for (const [role, motion] of Object.entries({ idle: 'idle', run: 'move', attack: 'attack', death: 'death' })) {
          const m = rec.sharedMotions?.[role]; if (!m) throw new Error(`${typeId}: ${bind.hounds} shares no ${role}`)
          const r = ref(m); look.motions[motion] = { ...r, clip: clipIn(r.path) }
        }
      } else if (bind.appearance) {
        /* viewer.real-bodies: a selected appearance — the selection names the bytes; its clips are embedded */
        const rec = JSON.parse(readFileSync(resolve(ROOT, bind.appearance.record), 'utf8')), ch = rec.characters?.[bind.appearance.key]
        const path = rec.modelPathBase + '/' + ch?.model
        if (!ch || !/^[0-9a-f]{64}$/.test(ch.sha256 || '') || digest(path) !== ch.sha256) throw new Error(`${typeId} ${id}: ${path} is not the appearance ${bind.appearance.record} selects`)
        look.model = { path, sha256: ch.sha256 }; look.name = ch.name
        for (const [motion, clip] of Object.entries(bind.clips)) look.motions[motion] = { path, sha256: ch.sha256, clip: clipIn(path, clip) }
        look.props = (bind.held || []).map(m => demoProp(typeId, m, 'R'))
      } else {
        look.model = { path: rel(row.model), sha256: digest(rel(row.model)) }
        for (const [key, m] of Object.entries(row.clips)) {
          const motion = ROSTER_KEY[key]; if (!motion) continue
          const path = m.file ? rel(m.file) : look.model.path
          look.motions[motion] = { path, sha256: path === look.model.path ? look.model.sha256 : digest(path), clip: clipIn(path, m.name) }
        }
        /* viewer.shield-guard-motion: a shield holder raises it - the row's own `block` where that is the shield_blockleft clip */
        if (holdsShield(units[typeId], classes) && row.clips.block?.file && rel(row.clips.block.file).includes('/' + GUARD + '/'))
          look.motions.guard = guardRef({ ...look.motions.hit }, typeId)
        const meshes = (glbJSON(look.model.path).nodes || []).filter(n => n.mesh != null).map(n => n.name)
        const hides = FAMILY_HIDES[row.family]
        if (hides) look.hidden = meshes.filter(hides)
        if (bind.items) {
          /* viewer.weapons-in-hand: a hero holds its own kit, not its roster row's equipment; a look holding another set than
             the row's is its own look (the page loads a look once, by its id) */
          const { props, unheld } = heldProps(typeId, bind.items, look.motions)
          look.props = props; look.unheld = unheld
          const set = props.map(p => p.model), own = ROSTER_HELD[row.equipment] || []
          if (set.join('+') !== own.join('+')) look.id = `${row.id}+${set.join('+') || 'empty-handed'}`
          /* viewer.real-bodies: a hero with no body of its own stands in its class's placeholder, and says so */
          if (bind.hero !== undefined) look.body = { own: false, lacks: placeholderLacks(bind.hero, review) }
        } else for (const p of PROPS[row.equipment] || []) {
          if (!look.motions[p.calibrate.motion]) throw new Error(`${typeId} ${id}: its ${row.equipment} is fitted on ${p.calibrate.motion}, which it lacks`)
          look.props.push({ path: EQUIPMENT_ROOT + p.file, sha256: digest(EQUIPMENT_ROOT + p.file), hand: p.hand, calibrate: p.calibrate })
        }
      }
      for (const [motion, clip] of Object.entries(bind.own || {})) if (!look.motions[motion]) look.motions[motion] = { path: look.model.path, sha256: look.model.sha256, clip: clipIn(look.model.path, clip) }
      for (const [motion, name] of Object.entries(bind.fill || {})) if (!look.motions[motion]) look.motions[motion] = selected(name, look.model.path, catalog)
      if (!(look.height > 0) || typeof look.pivot !== 'string') throw new Error(`${typeId} ${id}: no height or pivot in the roster`)
      look.missing = [...RULED, ...asked(units[typeId], classes)].filter(m => !look.motions[m])
      return look
    })
    pack[typeId] = { typeId, looks }
  }
  return pack
}

const main = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (main && process.argv.includes('--json')) process.stdout.write(JSON.stringify(await packCharacterModels()))
if (main && process.argv.includes('--list')) {
  /* viewer.real-bodies: who stands in what — own body, placeholder (and what it lacks), listed */
  const pack = await packCharacterModels()
  for (const [typeId, { looks }] of Object.entries(pack)) for (const l of looks)
    console.log(`${typeId.padEnd(32)} ${l.body?.own === false ? 'PLACEHOLDER ' + l.id : l.model.path}${l.body?.lacks ? '\n' + ' '.repeat(33) + 'lacks ' + l.body.lacks : ''}${l.missing.length ? '\n' + ' '.repeat(33) + 'motions missing: ' + l.missing.join(', ') : ''}`)
  for (const [typeId, why] of Object.entries(UNBODIED)) console.log(`${typeId.padEnd(32)} LISTED - ${why}`)
  /* viewer.shield-guard-motion: every body holding a shield with no raise-the-shield clip, by name (listed, not faked) */
  const lacking = Object.entries(pack).filter(([, { looks }]) => looks.some(l => l.missing.includes('guard'))).map(([t]) => t)
  console.log(`shield holders without a raise-the-shield clip: ${lacking.join(', ') || 'none'}`)
}
