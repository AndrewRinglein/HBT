// Content for the first battle. Data, not code (Design Law 9).
// Registries are explicit arrays — never decorators, never import side-effects,
// because load order would become a hidden global that shifts tie-breaks between runs.

import type { AbilityDef, AttackDef, UnitDef } from '../core/types.js'
import { omitDisabled, stripDisabledTriggers } from './disable.js'
import { packAbilities, packAttacks, packCritChart, packItems, packTestAbilities, packTestAttacks, packUnits, packClassPowers, packEnchanted, packEncounters, packLevels, packSpecialties } from './pack.js'

// ─────────────────────────────────────────────────────────────────────────────
// PROVISIONAL CONTENT — NOT PUBLISHED, NOT DESIGN
//
// Every attack and unit in this file was invented by an engine session to have
// something to run the harness against. NONE of it comes through the content
// structure: sessions 2 (Actions) and 3 (Units) have not published these ids in
// `2-ACTIONS-SETTLED.md` or `3-UNITS-SETTLED.md`, and until they do, these numbers
// are scaffolding.
//
// WHAT THIS MEANS IN PRACTICE:
//   · No balance conclusion drawn from these numbers is a finding about the game.
//     Several were reported as findings on 2026-08-14. They were not.
//   · Changing a number here is not a design change. It is moving scaffolding.
//   · When a session publishes the real rows, these are REPLACED, not reconciled.
//
// `node tools/content-check.mjs` lists exactly which ids are in this state.
// ─────────────────────────────────────────────────────────────────────────────


const RAW_ATTACKS: Readonly<Record<string, AttackDef>> = {
  // The six PROVISIONAL attacks (zombie bite, warrior axe and massive, ranger
  // bow, mage staff and strike — 2026-08-14, no published source) left this
  // file with test.fixture-migration (2026-09-02): they are test rows in
  // content/test/attacks.json now, under the test family, swung by the test
  // cohort and the test bodies. Punch, Breath, Fangs left earlier. What
  // remains here is the dictated beast content awaiting its Codex rows.
  'attack.drake.poison-breath': {
    // PUBLISHED: Codex §5, Drake's Maw (Angela 2026-08-20, dictated): "Poison
    // Breath — precision magic damage, on hit applies 3 Poison, 2 Stamina."
    // Range 3 carried from the Breath family (not dictated). The 3-Poison
    // rider lives on trigger.green-drake.venom-breath, attack-scoped.
    id: 'attack.drake.poison-breath', name: 'Poison Breath', kind: 'ranged',
    damageType: 'magic', bonus: 0, stat: 'precision', reach: 3, staminaCost: 2,
  },
  'attack.drake.snap': {
    // PUBLISHED: Codex §5, Drake's Maw (Angela 2026-08-20, dictated): "a bite
    // or some other name — disambiguate it": Snap. Strength damage, on hit
    // applies 1 Poison (trigger.green-drake.venom-snap, attack-scoped), 1 Stamina.
    id: 'attack.drake.snap', name: 'Snap', kind: 'melee',
    damageType: 'physical', bonus: 0, stat: 'strength', reach: 1, staminaCost: 1,
  },
  // attack.test-ram.slam / .overhead and attack.test-arc.sweep moved to
  // content/test/attacks.json (test.receptacle, 2026-09-02) — the sweep is a
  // DELTA over the real Halberd Cleave now, not a re-typed row.
}

const RAW_ABILITIES: Readonly<Record<string, AbilityDef>> = {
  // power.mage.bolt (the invented Arcane Bolt, 2026-08-14) left with
  // test.fixture-migration (2026-09-02): content/test/abilities.json. Nothing
  // is hand-typed here; the registry below stays for the beasts' day.
}

const RAW_UNITS: Readonly<Record<string, UnitDef>> = {
  // zombie, zombie-burning, warrior, ranger and mage — the 2026-08-14 dictated
  // fixtures — left with test.fixture-migration (2026-09-02). The zombies were
  // the test cohort's rows already (settled.json testCohort); the three heroes
  // are complete test bodies in content/test/units.json. Custom battles field
  // test-zombie / test-warrior / test-ranger / test-mage by name.
  'spirit-snake': {
    // A PLAYER BEAST — Angela 2026-08-20: "These beasts were meant to be
    // player beasts... Spirit Snake is supposed to be a hero unit." Her block,
    // dictated and recorded in the Codex SOURCE (settled.json hero ruling →
    // Codex §10 hero table): Health 4, Dodge 50, Move 8, Accuracy 110,
    // Armor 0, Resist 2, Strength 2, Precision 0, Magic 0, Spirit 0,
    // Stamina 8; venom is 3 Poison on hit; ZERO Item Slots and NO weapon
    // slots (slots live in the Codex — the engine has no loadout yet).
    // BENCHED by her fielding ruling: hero-side, not in the default party.
    typeId: 'spirit-snake', side: 'hero',
    maxHp: 4, armor: 0, resist: 2,
    accuracy: 110, dodge: 50, strength: 2, precision: 0, magic: 0, spirit: 0,
    role: 'melee',
    movement: 8, reach: 1,
    maxStamina: 8, staminaRegen: 1,
    triggers: [{
      // "make it apply 3 poison to the target on hit" — scoped to the fangs.
      id: 'trigger.spirit-snake.venom', hook: 'onHit', chance: 100,
      select: 'target',
      effect: { kind: 'status.apply', statusId: 'status.poison', value: 3 },
      source: 'unit.spirit-snake',
      onlyWithAttack: 'attack.fangs.bite',
    }],
    ai: 'melee-aggressive',
    attacks: ['attack.fangs.bite'],
    abilities: [],
    // A hero, but a BEAST: "Beasts and Civilians get neither" Sidestep nor
    // Side Roll (Angela 2026-08-21, Codex sidestep ruling).
    moves: ['power.move'],
    tags: ['beast'],
  },
  'shadow-hound-puppy': {
    // A PLAYER BEAST — ruled 2026-08-21: "Shadow Hound Puppy is supposed to be
    // a hero, not an enemy. All of those initial beasts, of which there were
    // only a couple, were meant to be heroes." The 2026-08-20 Beast-pen ruling
    // reached the snake and the drake (fix.beast-pen-hero-correction, a4822ab)
    // and missed this row, so the comment here said PLAYER beasts directly
    // above a field saying `enemy`. The field now agrees with the comment.
    //
    // STILL PENDING REDESIGN. The numbers below are the ported Codex §10 row,
    // never her design, kept so the id and its tests survive until she dictates
    // its real block (the snake and drake precedent). BENCHED.
    typeId: 'shadow-hound-puppy', side: 'hero',
    maxHp: 12, armor: 0, resist: 0,
    accuracy: 70, dodge: 0, strength: 6, precision: 2, magic: 0, spirit: 0,
    role: 'melee',
    movement: 4, reach: 1,
    // maxStamina 0 is an ENEMY property that came in with the ported block, and
    // it is now load-bearing in a way it was not: attack.fangs.bite costs 1
    // Stamina, so this hero CAN MOVE AND CAN NEVER ATTACK. Deliberately left
    // wrong rather than invented — Angela dictated Stamina 8 for the Spirit
    // Snake, and "copy, don't invent" forbids picking a number for this one.
    // Harmless while benched; it is the first thing her dictated block fixes.
    maxStamina: 0, staminaRegen: 0,
    triggers: [{
      // Codex §3 Hound: "onHit your fang attacks apply 1 Bleed." Named for the
      // Hound power "Worry the Wound". Unconditional onHit — the bite is its
      // only attack. Lands only after status.bleed (landed 849ead6).
      id: 'trigger.shadow-hound-puppy.worry', hook: 'onHit', chance: 100,
      select: 'target',
      effect: { kind: 'status.apply', statusId: 'status.bleed', value: 1 },
      source: 'unit.shadow-hound-puppy',
      onlyWithAttack: 'attack.fangs.bite',
    }],
    ai: 'melee-aggressive',
    attacks: ['attack.fangs.bite'],
    abilities: [],
    moves: ['power.move'],
    tags: ['beast'],
  },
  // 'arc-golem' moved to content/test/units.json as test-arc-golem
  // (test.receptacle, 2026-09-02): a complete test body in the receptacle,
  // through the converter and the pack like everything real.
  'green-drake': {
    // A PLAYER BEAST — Angela 2026-08-20, dictated block, recorded in the
    // Codex source (settled.json hero ruling; §5 Drake's Maw; §10 hero table):
    // Health 12, Armor 2, Resist 1, Strength 4, Precision 3, Magic 0,
    // Spirit 0, Accuracy 65; reach 2. Two attacks with DIFFERENT riders —
    // the case that forced attack-scoped triggers. Her two movement powers
    // (Flight: +0 move for 1 Stamina, atomic; regular: movement 5 for 1
    // Stamina) wait on backlog movement.flight — movement modes don't exist
    // yet; movement 5 is the regular power's value. BENCHED like the snake.
    typeId: 'green-drake', side: 'hero',
    maxHp: 12, armor: 2, resist: 1,
    accuracy: 65, dodge: 0, strength: 4, precision: 3, magic: 0, spirit: 0,
    role: 'ranged',
    movement: 5, reach: 2,
    maxStamina: 5, staminaRegen: 1,
    triggers: [{
      // "poison breath... on hit, applies 3 poison" — the breath's rider only.
      id: 'trigger.green-drake.venom-breath', hook: 'onHit', chance: 100,
      select: 'target',
      effect: { kind: 'status.apply', statusId: 'status.poison', value: 3 },
      source: 'unit.green-drake',
      onlyWithAttack: 'attack.drake.poison-breath',
    }, {
      // "That does strength damage and, on hit, applies one poison."
      id: 'trigger.green-drake.venom-snap', hook: 'onHit', chance: 100,
      select: 'target',
      effect: { kind: 'status.apply', statusId: 'status.poison', value: 1 },
      source: 'unit.green-drake',
      onlyWithAttack: 'attack.drake.snap',
    }],
    ai: 'ranged-kite',
    attacks: ['attack.drake.poison-breath', 'attack.drake.snap'],
    abilities: [],
    // Angela dictated the drake exactly TWO movement powers (2026-08-20), in
    // this order: "a flight movement power that moves +0 and costs 1 stamina"
    // (= the ladder's standard rung) and a regular move. Beasts get neither
    // Sidestep nor Side Roll (Codex 2026-08-21). Declared order is AI
    // preference order — ties go to the wings.
    moves: ['power.flight', 'power.move'],
    tags: ['beast', 'dragon'],
  },
}

// The kill-switch seam (see disable.ts). With CF_DISABLE_IDS unset these are the
// raw objects, byte for byte — the control baselines cannot tell the difference.
// Generated attack rows (the authored enemies') join the hand-authored ones
// through the same seam. Collisions are loud, same rule as units below.
for (const k of Object.keys(packAttacks())) {
  if (k in RAW_ATTACKS) throw new Error(`attack '${k}' exists in BOTH content/index.ts and the generated pack — one owner only`)
}
// The test receptacle's attacks join through the same seam (test.receptacle,
// 2026-09-02); one owner per id, loudly.
for (const k of Object.keys(packTestAttacks())) {
  if (k in RAW_ATTACKS || k in packAttacks()) throw new Error(`attack '${k}' exists in the test receptacle AND elsewhere — one owner only`)
}
export const ATTACKS = omitDisabled({ ...RAW_ATTACKS, ...packAttacks(), ...packTestAttacks() })
// The authored item powers join the hand-authored abilities through the same
// seam — capability.item-powers (2026-08-27). One owner per id, loudly.
for (const k of Object.keys(packAbilities())) {
  if (k in RAW_ABILITIES) throw new Error(`ability '${k}' exists in BOTH content/index.ts and the generated pack — one owner only`)
}
for (const k of Object.keys(packTestAbilities())) {
  if (k in RAW_ABILITIES || k in packAbilities()) throw new Error(`ability '${k}' exists in the test receptacle AND elsewhere — one owner only`)
}
// The class powers (hero assembly, 2026-09-03) join through the same seam.
for (const k of Object.keys(packClassPowers())) {
  if (k in RAW_ABILITIES || k in packAbilities() || k in packTestAbilities()) throw new Error(`class power '${k}' exists elsewhere too — one owner only`)
}
export const ABILITIES = omitDisabled({ ...RAW_ABILITIES, ...packAbilities(), ...packTestAbilities(), ...packClassPowers() })
// The Critical Injury Chart — ruled data (station.crit 2026-08-27). Not under
// omitDisabled: rows carry keys, not ids; the kill seam for crits is the
// critEnabled switch itself.
export const CRIT_CHART = packCritChart()
// The item registry — pack.items (2026-09-02). Every Codex item row, validated
// against the attacks and abilities it grants. On Ctx so the kill-switch seam
// (CF_DISABLE_IDS) reaches an item id like any other.
// The enchanted tier-3 rows (hero assembly, 2026-09-03; ITEMS-PLAN.md §6)
// join the Codex items — one registry, one owner per id.
for (const k of Object.keys(packEnchanted(ATTACKS, ABILITIES))) {
  if (k in packItems(ATTACKS, ABILITIES)) throw new Error(`enchanted row '${k}' collides with a Codex item — one owner only`)
}
export const ITEMS = omitDisabled({ ...packItems(ATTACKS, ABILITIES), ...packEnchanted(ATTACKS, ABILITIES) })
/** Level tables and specialties — read by fieldedDef() (hero assembly, 2026-09-03). */
export const LEVELS = omitDisabled(packLevels())
export const SPECIALTIES = omitDisabled(packSpecialties())
// The generated pack (Codex-tracked test cohort) joins the hand-authored rows.
// A collision is a LOUD failure: the pack owns test- ids, this file owns the
// rest, and neither may quietly shadow the other.
const PACK = packUnits()
for (const k of Object.keys(PACK)) {
  if (k in RAW_UNITS) throw new Error(`unit '${k}' exists in BOTH content/index.ts and the generated pack — one owner only`)
}
export const UNITS = stripDisabledTriggers(omitDisabled({ ...RAW_UNITS, ...PACK }, 'unit.'))
// progression.level-table-by-type: a unit that names its own level table names
// one that exists. Checked at load, not at fielding, so a bad pointer is loud
// before any battle — a civilian silently levelling on the class table was the
// failure mode this replaces.
for (const u of Object.values(UNITS)) {
  if (u.levelTable !== undefined && !(u.levelTable in LEVELS)) throw new Error(`unit '${u.typeId}' levels on '${u.levelTable}', which is not a level table in the pack`)
}

/** The standard battle: the Alpha Team on row 15, four zombies on row 0. */
export const FIRST_BATTLE = {
  id: 'baseline.6v4',
  scenarioId: 1,
  // THE STANDARD TEST SIX — Angela 2026-08-20: "Our standard test will run
  // against six heroes, one of each class." Since 2026-09-02 ("Yes, proceed
  // with step one" — DECISIONS.md) those six are the ALPHA TEAM, S31, read
  // from the pack's alphaTeam section with their authored kits: Oathblade
  // (warrior), Sky Pirate (rogue), Dusk Hawk (ranger), Air Mage (mage), Lucius
  // (priest), Osric (paladin). The test-* clones they replace stay in the pack
  // for fixtures and probes only; every control baseline and sweep now runs on
  // real content.
  heroes: ['alpha-oathblade', 'alpha-sky-pirate', 'alpha-dusk-hawk',
    'alpha-air-mage', 'alpha-lucius', 'alpha-osric'] as const,
  // The horde is AUTHORED since content.enemy-flip (2026-09-02): the Codex's
  // own Zombie (enemies-authored.json) and the Burning Zombie authored from
  // 6-BESTIARY-SETTLED — "mixed into the horde at one per four" (Angela
  // 2026-08-20), the pattern kept. The test-* enemy clones stay in the pack
  // as an explicitly-fielded fixture (TEST_COHORT.enemies).
  enemies: ['unit.zombie', 'unit.zombie', 'unit.zombie', 'unit.zombie-burning'] as const,
  defaultEnemyCount: 4,
  // Where the sides deploy is the MAP's (content/maps.ts `deploy`, board.deploy-edges
  // 2026-09-04): heroes west and enemies east by default (ruled 2026-09-03), the
  // pre-ruling maps south/north. This record no longer names a row or an edge —
  // heroRow 15 / enemyRow 0 lived here from 2026-08-25 to 2026-09-04.
}

/**
 * The TEST COHORT — the six Codex clones with test-lane weapons and riders
 * that were the standard party from 2026-08-20 until the Alpha Team took the
 * standard battle (content.alpha-flip, 2026-09-02). Still in the pack, still
 * probeable: a test that exercises a test-lane source (test.mage.dampen,
 * test.status.ward…) fields these explicitly through BattleOptions.heroes.
 * Nothing in the engine reads this list; it exists so no test types the six
 * ids by hand.
 */
export const TEST_COHORT = {
  heroes: ['test-oathblade', 'test-sky-pirate', 'test-dusk-hawk',
    'test-air-mage', 'test-lucius', 'test-osric'] as const,
  // the test enemies joined 2026-09-02 (content.enemy-flip) when the standard
  // horde became authored rows — the test-lane riders (grasp, sap, lurch)
  // ride these, fielded explicitly by the tests that prove them
  enemies: ['test-zombie', 'test-zombie', 'test-zombie', 'test-zombie-burning'] as const,
}
/** The encounters — encounter.runner (2026-09-03). Under the kill-switch seam like any content. */
export const ENCOUNTERS = omitDisabled(packEncounters(UNITS))
