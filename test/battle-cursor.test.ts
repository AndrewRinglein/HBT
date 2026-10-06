import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import * as battle from '../src/core/battle.js'
import { runActivation } from '../src/ai/modes.js'
import { forkBattle } from '../src/core/fork.js'
import { createCustomBattle } from '../src/core/setup.js'
import { applyStatus } from '../src/core/status.js'
import { battleCursorCases } from './battle-cursor-cases.js'
import { projectShorthand } from './props-projection.js'
import { GLYPH, mapDef } from '../src/content/maps.js'
import {projectBlock} from './block-projection.js'
import { projectPacketEvents } from './packet-projection.js'
import { projectLoadout } from './loadout-projection.js'
import { projectItemUses } from './item-uses-projection.js'

const golden = JSON.parse(readFileSync(new URL('./fixtures/battle-cursor-golden.json', import.meta.url), 'utf8'))
const identityGolden = JSON.parse(readFileSync(new URL('./fixtures/battle-cursor-identities.json', import.meta.url), 'utf8'))
const eventGolden = JSON.parse(readFileSync(new URL('./fixtures/battle-cursor-action-spent.json', import.meta.url), 'utf8'))
// Intentional fix.ai-melee-contact migration: old fixtures remain immutable.
// compare-contact-transition proves every changed first choice is a cheaper
// equal-distance dumb-melee destination. Unchanged cases keep all prior checks.
const contactGolden = JSON.parse(readFileSync(new URL('./fixtures/battle-cursor-contact.json', import.meta.url), 'utf8'))
// Law 10 / V2 sections 8 and 18: exact typed-damage transition captured
// against 1723e63. Every changed first event is Burn or Poison's typed tick.
// Historical fixtures remain immutable; both drivers retain exact full hashes.
const elementalGolden = JSON.parse(readFileSync(new URL('./fixtures/battle-cursor-elemental.json', import.meta.url), 'utf8'))
// V2 section 18: seven first differences now consume Protection before typed HP damage.
const protectionGolden = JSON.parse(readFileSync(new URL('./fixtures/battle-cursor-protection.json', import.meta.url), 'utf8'))
// V2 packet facts and Protection reservation: old files stay immutable. The
// transition tool proves the actual first raw and semantic difference per case.
// Metadata-only cases retain every earlier historical assertion via projection.
const packetGolden = JSON.parse(readFileSync(new URL('./fixtures/battle-cursor-packets.json', import.meta.url), 'utf8'))
// V2 burst migration: four first differences are replaced attack/power declarations.
// All 42 prior inputs remain unchanged; full current hashes are frozen separately.
const blockGolden = JSON.parse(readFileSync(new URL('./fixtures/battle-cursor-block.json', import.meta.url), 'utf8'))
const burstGolden = JSON.parse(readFileSync(new URL('./fixtures/battle-cursor-bursts.json', import.meta.url), 'utf8'))
// v2.shields (2026-09-23), Law 10: Block went live on fielded heroes (Kite/Round/Tower,
// sword and dagger Block). Cases marked `changed` moved — the fixture counts each case's
// landed blocks — and are checked against the new frozen hashes on both drivers; every
// unchanged case keeps every prior assertion. Old fixtures stay immutable.
const shieldGolden = JSON.parse(readFileSync(new URL('./fixtures/battle-cursor-shields.json', import.meta.url), 'utf8'))
// v2.knockback-collisions (2026-09-23), Law 10: a stopped push is a collision now
// (COMBAT-V2 §9.3). The one case that moved (showcase.gash-variant, a blocked push
// that costs its mover) is checked against its new frozen hashes on both drivers;
// every unchanged case keeps every prior assertion. Old fixtures stay immutable.
const knockGolden = JSON.parse(readFileSync(new URL('./fixtures/battle-cursor-knockback.json', import.meta.url), 'utf8'))
// v2.kdb (2026-09-23), Law 10: every physical hit now makes a KDB check (COMBAT-V2 §9)
// and emits kdb.rolled; fired checks push and prone. Every case marked `changed` moved and
// is checked against its new frozen hashes on both drivers; unchanged cases keep every
// prior assertion. Old fixtures stay immutable.
const kdbGolden = JSON.parse(readFileSync(new URL('./fixtures/battle-cursor-kdb.json', import.meta.url), 'utf8'))
// v2.thorns (2026-09-24), Law 10: Thorns is a magnitude (COMBAT-V2 §9.4). The golem's
// V1 retaliation trigger became test.badge.bramble (1 true on each connecting melee hit),
// so the cases that field it moved; `changed` cases are checked against new frozen hashes
// on both drivers. Old fixtures stay immutable.
const thornsGolden = JSON.parse(readFileSync(new URL('./fixtures/battle-cursor-thorns.json', import.meta.url), 'utf8'))
// v2.loadout (2026-09-24), Law 10: item instances are fielding metadata (loadout-projection.ts).
// Every case's full current hashes are frozen here; every older assertion runs on the projection.
const loadoutGolden = JSON.parse(readFileSync(new URL('./fixtures/battle-cursor-loadout.json', import.meta.url), 'utf8'))
// v2.item-uses (2026-09-24), Law 10: uses are counted by item instance (item-uses-projection.ts).
// Every case's full current hashes are frozen here; every older assertion, the v2.loadout
// hashes included, runs on the projection, which removes only the new per-instance fields.
const itemUsesGolden = JSON.parse(readFileSync(new URL('./fixtures/battle-cursor-item-uses.json', import.meta.url), 'utf8'))
// fix.ground-goldens (2026-09-24), Law 10: the ground table was re-ruled (Andrew, DECISIONS.md
// "the ground table, re-ruled"; v2.retire-forest-hills) — forest is woodland, hills are ranged-only.
// Every case's full current hashes are frozen here; a case marked `changed` (it fights on hills
// or forest) is checked against these and keeps the automatic/suspended comparison, and skips the
// older layers its battle no longer matches. Every other case keeps every prior assertion.
// Old fixtures stay immutable.
const groundGolden = JSON.parse(readFileSync(new URL('./fixtures/battle-cursor-ground.json', import.meta.url), 'utf8'))
// v2.thin-obstruction (2026-09-24), Law 10: every woodland hex became a thin obstruction (Andrew,
// DECISIONS.md "the ground table, re-ruled") — −5 per thin hex a shot enters. Every case's full
// current hashes are frozen here (tools/capture-thin-cursor.mts); a case marked `changed` (it shoots
// through or into woodland) is checked against these, skips the ground layer and every older one its
// battle no longer matches, and keeps the automatic/suspended comparison. Old fixtures stay immutable.
const thinGolden = JSON.parse(readFileSync(new URL('./fixtures/battle-cursor-thin.json', import.meta.url), 'utf8'))
const propGolden = JSON.parse(readFileSync(new URL('./fixtures/battle-cursor-props.json', import.meta.url), 'utf8'))
// fix.vs-target-worn-and-flat (2026-09-25), Law 10: a worn item's slayer is a rule (Andrew, DECISIONS.md
// "Bloodrune Slayer bonus happens") and the loadout names the worn instances (loadout.worn). Every
// case's full current hashes are frozen here (tools/capture-worn-cursor.mts); a case marked `changed`
// (a hero wears a slayer bloodrune: its gap left unit.equipped) is checked against these and skips
// every older layer its battle no longer matches; every other case runs the older layers on the
// projection below, which removes loadout.worn and nothing else. Old fixtures stay immutable.
const wornGolden = JSON.parse(readFileSync(new URL('./fixtures/battle-cursor-worn.json', import.meta.url), 'utf8'))
const projectWorn = (state: { units: { loadout?: { worn?: unknown } }[] }) =>
  ({ ...state, units: state.units.map((u) => { if (u.loadout?.worn === undefined) return u; const { worn: _, ...rest } = u.loadout; return { ...u, loadout: rest } }) })
// pack.enemy-actions (2026-09-26), Law 10: the pack carries enemy special moves (Clobber, Buff, the
// Close Bites) on the movement slot and flight as a flier's one movement power (DECISIONS.md
// 2026-09-04, "enemies use the one action type too"). Every case's full current hashes are frozen
// here (tools/capture-enemy-actions-cursor.mts); a case marked `changed` (it fields a hound or a
// flier — alpha-team, horrors, kiln, prologue-enemies, rime) is checked against these and skips every
// older layer its battle no longer matches; every other case is byte-identical to the worn capture
// and runs every older layer unchanged. No state field was added, so no projection. Old fixtures stay immutable.
const enemyActionsGolden = JSON.parse(readFileSync(new URL('./fixtures/battle-cursor-enemy-actions.json', import.meta.url), 'utf8'))
// fix.enemy-accuracy-mod (2026-09-27), Law 10: a regular enemy attack now carries its bestiary row's
// accuracyMod (it was dropped silently, against Law 9). Every case's full current hashes are frozen
// here (tools/capture-accuracy-mod-cursor.mts); the one case marked `changed` (prologue-enemies — it
// fields the Necromancer and the Lieutenant Demon, whose attacks carry +10) is checked against these
// and skips every older layer its battle no longer matches; every other case is byte-identical to
// the enemy-actions capture and runs every older layer unchanged. No state field was added.
const accuracyModGolden = JSON.parse(readFileSync(new URL('./fixtures/battle-cursor-accuracy-mod.json', import.meta.url), 'utf8'))
// capability.charge (2026-09-27), Law 10: the pack carries the Codex Charge rows (a walk and an
// attack as one action) and the Iron Colossus's noPrimaryAction. Every case's full current hashes
// are frozen here (tools/capture-charge-cursor.mts); a case marked `changed` (it fields a Fast
// Zombie — alpha-team, civilians, eve-24-a/-b, farmers-grown, item-powers, prologue-enemies,
// prologue-party: the zombie's action list carries the charge, and where it charges the battle
// differs) is checked against these and skips every older layer its battle no longer matches;
// every other case is byte-identical to the accuracy-mod capture and runs every older layer
// unchanged. No state field was added, so no projection. Old fixtures stay immutable.
const chargeGolden = JSON.parse(readFileSync(new URL('./fixtures/battle-cursor-charge.json', import.meta.url), 'utf8'))
// capability.move-ignores-zoc (2026-09-28), Law 10: the four hounds walk with the Codex's walk that
// ignores zones of control (power.move-ignoring-zoc). Every case's full current hashes are frozen
// here (tools/capture-zoc-cursor.mts); a case marked `changed` (it fields a hound — alpha-team,
// kiln, prologue-enemies: the hound's action list carries the walk, and its steps name it and
// provoke nothing) is checked against these and skips every older layer its battle no longer
// matches; every other case is byte-identical to the charge capture and runs every older layer
// unchanged. No state field was added, so no projection. Old fixtures stay immutable.
const zocGolden = JSON.parse(readFileSync(new URL('./fixtures/battle-cursor-zoc.json', import.meta.url), 'utf8'))
// fix.surge-spend (2026-09-28), Law 10: a Surge takes away 100 instead of emptying the amount
// (Andrew, DECISIONS.md "Surge: a pool that pays 100 per Surge"). Every case's full current hashes
// are frozen here (tools/capture-surge-spend-cursor.mts); a case marked `changed` (a hero makes a
// Surge check — assembled-party, farmers-grown, prologue-enemies, supper, surge-flight-ladder, the
// three progression-surge cases, legacy-surge-cap: surge.checked and surge.hit carry the amount
// before and after, and an amount at 100 or more surges without a roll) is checked against these
// and skips every older layer its battle no longer matches; every other case is byte-identical to
// the zoc capture and runs every older layer unchanged. No state field was added, so no
// projection. Old fixtures stay immutable.
const surgeSpendGolden = JSON.parse(readFileSync(new URL('./fixtures/battle-cursor-surge-spend.json', import.meta.url), 'utf8'))
// fix.raise-two-cursor (2026-09-28), Law 10: the Necromancer's Raise takes two bodies a firing
// (fix.raise-two; ruled 2026-09-28, "Let's have the necromancer raise two per turn."). Every case's
// full hashes are frozen here (tools/capture-raise-two-cursor.mts); a case marked `changed` (it fields
// a Necromancer with more than one body in reach) is checked here and skips the older layers.
const raiseTwoGolden = JSON.parse(readFileSync(new URL('./fixtures/battle-cursor-raise-two.json', import.meta.url), 'utf8'))
// fix.funnel-goldens (2026-09-29), Law 10: the duplication review's rulings (DECISIONS.md 2026-09-28) —
// plumbing.vocabulary-export's one stat map compiles Blinded's -4 Vision and '+N health for the Battle';
// fix.ground-one-funnel runs lava's Burn before its fire, paints 'b'/'p' as layers and gives a push every
// ground beat. Every case's full hashes are frozen here (tools/capture-funnel-cursor.mts); a case marked
// `changed` is checked here and skips the older layers. Old fixtures stay immutable.
const funnelGolden = JSON.parse(readFileSync(new URL('./fixtures/battle-cursor-funnel.json', import.meta.url), 'utf8'))
// fix.opening-party (2026-09-29), Law 10: the opening scenarios field the party the player has at that
// point, not four Alpha heroes (Andrew, DECISIONS.md 2026-09-28: "We need to move away from these alpha
// heroes."). Every case's full hashes are frozen here (tools/capture-party-cursor.mts); a case marked
// `changed` (test.opening-orphanage, -lumberjack, -cavern-trail only) is checked here and skips the
// older layers. Old fixtures stay immutable.
const partyGolden = JSON.parse(readFileSync(new URL('./fixtures/battle-cursor-party.json', import.meta.url), 'utf8'))
// fix.opening-first-level (2026-09-29), Law 10: the first hero fields at level 2 from the Lumberjack on
// (Andrew, DECISIONS.md 2026-09-28: "Make it so they get 20 XP no matter what, so they get a level").
// Every case's full hashes are frozen here (tools/capture-first-level-cursor.mts); a case marked
// `changed` (test.opening-lumberjack, -cavern-trail) is checked here and skips the older layers.
const firstLevelGolden = JSON.parse(readFileSync(new URL('./fixtures/battle-cursor-first-level.json', import.meta.url), 'utf8'))
// fix.opening-orphanage-lighter (2026-09-29), Law 10: the Orphanage fields one Zombie at the start and one
// on Turn 4 (Andrew, DECISIONS.md 2026-09-28: "Let's remove an early zombie and a later zombie.").
// Every case's full hashes are frozen here (tools/capture-orphanage-lighter-cursor.mts); a case marked
// `changed` (test.opening-orphanage only) is checked here and skips the older layers.
const orphanageLighterGolden = JSON.parse(readFileSync(new URL('./fixtures/battle-cursor-orphanage-lighter.json', import.meta.url), 'utf8'))
// content.peddlers-vest (2026-09-29), Law 10: the Peddler's Vest no longer takes 2 Health (Andrew,
// DECISIONS.md 2026-09-28: "The Peddler's Vest should just be -5 dodge, -5 accuracy, +1 item slot. No
// health change."). Every case's full hashes are frozen here (tools/capture-peddlers-vest-cursor.mts); a
// case marked `changed` (the ones fielding the Raven or the Robes priest: showcase.assembled-party,
// -eve-24-b, -horrors, -rime, test.opening-cavern-trail) is checked here and skips the older layers.
const peddlersVestGolden = JSON.parse(readFileSync(new URL('./fixtures/battle-cursor-peddlers-vest.json', import.meta.url), 'utf8'))
// fix.opening-draft (2026-09-29), Law 10: the opening's heroes carry the first hero's Leadership, badges,
// +2 Health and Crucible points, and every later draft is the best-scoring of three rolled heroes of classes
// not yet drafted (Andrew, DECISIONS.md 2026-09-28: "we use the Crucible randomness, three heroes, and then
// use a weighted system for what you choose"). Every case's full hashes are frozen here
// (tools/capture-opening-draft-cursor.mts); a case marked `changed` (test.opening-orphanage, -lumberjack,
// -cavern-trail) is checked here and skips the older layers.
const openingDraftGolden = JSON.parse(readFileSync(new URL('./fixtures/battle-cursor-opening-draft.json', import.meta.url), 'utf8'))
// content.afflictions-revised (2026-09-29), Law 10: the four afflictions revised (Andrew, DECISIONS.md 'the
// four afflictions'). Every case's full hashes are frozen here (tools/capture-afflictions-cursor.mts); a case
// marked `changed` (showcase.prologue-party, showcase.waystation, test.opening-cavern-trail) moved by log TEXT
// only — a zombie's badge.gained for Rotting Flesh now names the '+20 Deathbed Fighting' gap; `movedOnlyText`
// records that state, RNG and result are unchanged. It is checked here and skips the older layers.
const afflictionsGolden = JSON.parse(readFileSync(new URL('./fixtures/battle-cursor-afflictions.json', import.meta.url), 'utf8'))
// fix.badge-surge-at-fielding, rule.badge-deathbed-fighting, rule.badge-immunity (2026-09-29), Law 10: the badge
// rules built (Andrew, DECISIONS.md "Possession's Surge loads at fielding; ... built"). Every case frozen here
// (tools/capture-badge-rules-cursor.mts). Moved: showcase.prologue-party, test.opening-cavern-trail and
// test.vampire-bite by log TEXT only (Rotting Flesh's and Vampirism's gain lines no longer name the Deathbed gap);
// showcase.waystation for real — the mage takes Rotting Flesh on turn 14 and the same zombie's Poison is then
// refused (status.immune), the rule working. A `changed` case is checked here and skips the older layers.
const badgeRulesGolden = JSON.parse(readFileSync(new URL('./fixtures/battle-cursor-badge-rules.json', import.meta.url), 'utf8'))
// fix.opening-orphanage-arrivals (2026-09-29), Law 10: the Orphanage gains a Zombie on Turn 2 and one on Turn 3
// (Andrew, DECISIONS.md 2026-09-29: "Battle 1: Let's add a zombie on turn 2 and a zombie on turn 3."). Every
// case's full hashes are frozen here (tools/capture-orphanage-arrivals-cursor.mts); a case marked `changed`
// (test.opening-orphanage only) is checked here and skips the older layers.
const orphanageArrivalsGolden = JSON.parse(readFileSync(new URL('./fixtures/battle-cursor-orphanage-arrivals.json', import.meta.url), 'utf8'))
// rule.cold-resist, content.immune-one-is-resist, content.ghost (2026-09-29), Law 10: the Ghost, Cold Resist and "Immune X 1"
// as a resistance (Andrew, DECISIONS.md 'the Ghost as the bestiary has it; ...'). Every case frozen here
// (tools/capture-ghost-cold-cursor.mts), test.ghost and test.frost-resistant new. Moved: test.vampire-bite by log TEXT only
// (Cold Heart's gain line no longer names the cold-damage gap). A `changed` case is checked here and skips the older layers.
const ghostColdGolden = JSON.parse(readFileSync(new URL('./fixtures/battle-cursor-ghost-cold.json', import.meta.url), 'utf8'))
// content.ghost-possess-on-attack, rule.immunity-is-resistance (2026-09-29), Law 10: the Ghost possesses on its Attack at 15%
// and immunity is resistance (Andrew, DECISIONS.md 'the Ghost possesses on its Attack at 15%; every resistance works the one
// way, and it replaces immunity'). Every case frozen here (tools/capture-resist-one-way-cursor.mts). Moved for real, the
// rulings working: test.ghost (the Attack now possesses; Possess gone), showcase.waystation, showcase.prologue-party,
// test.opening-cavern-trail (Rotting Flesh takes Poison again, with 1 Poison Resist on its ticks) and test.vampire-bite (Cold
// Heart is +1 Cold Resist, not an immunity). A `changed` case is checked here and skips the older layers.
const resistOneWayGolden = JSON.parse(readFileSync(new URL('./fixtures/battle-cursor-resist-one-way.json', import.meta.url), 'utf8'))
// encounter.opening.bridge-ai (2026-09-30), Law 10: a kiter with no melee ally standing plays its row's positionAlone
// ladder — a shot ahead of safety, the shot read by canAttack's geometry (SWITCHES.md aiKiteAlone; the Bridge never ended
// because its Imps fled walkers they could never safely shoot). Every case frozen here (tools/capture-kite-alone-cursor.mts),
// test.opening-bridge new. Moved for real, the rule working: every case where a kiter is left without a melee ally or reads a
// line its old distance test did not — showcase.alpha-team, showcase.kiln, showcase.supper, showcase.surge-flight-ladder,
// showcase.two-zombies-and-a-child, test.block-b, test.geometry-corridor, test.geometry-diagonal, test.opening-orphanage (one
// hero, never screened) and test.structures. A `changed` case is checked here and skips the older layers.
const kiteAloneGolden = JSON.parse(readFileSync(new URL('./fixtures/battle-cursor-kite-alone.json', import.meta.url), 'utf8'))
// content.fire-imp-flight (2026-10-01), Law 10: the Fire Imp flies with the Imp's flight (ruled 2026-09-30, DECISIONS.md "the
// Fire Imp flies": "The Fire Imp does fly, yes. That was an oversight if it does not."). Every case frozen here
// (tools/capture-fire-imp-flight-cursor.mts). Moved for real, the ruling working: exactly the four cases that field a Fire
// Imp — showcase.kiln (4), showcase.prologue-enemies (1), test.opening-bridge (2 scheduled) and test.props-viewer-ranged-zoc
// (1). A `changed` case is checked here and skips the older layers.
const fireImpFlightGolden = JSON.parse(readFileSync(new URL('./fixtures/battle-cursor-fire-imp-flight.json', import.meta.url), 'utf8'))
// fix.codex-numbers (2026-10-01), Law 10: crit base 3 is counted once (DECISIONS.md 2026-09-28 "the duplication review,
// ruled", finding C1: "Crit base 3 should be counted once.") — the pack carries each unit's Codex crit total less the
// engine's 3, so every hero and every enemy with an authored crit rolls 3 points less than the double count did; bleed-out
// and Deathbed fold as stats and enemy rows carry their tier. Every case frozen here (tools/capture-codex-numbers-cursor.mts).
// Moved for real, the ruling working: the 31 cases where a crit roll goes the other way. A `changed` case is checked here
// and skips the older layers.
const codexNumbersGolden = JSON.parse(readFileSync(new URL('./fixtures/battle-cursor-codex-numbers.json', import.meta.url), 'utf8'))
// fix.one-effect-vocabulary (2026-10-01), Law 10: one effect union and one interpreter (the duplication review ruled
// 2026-09-28, "fix as proposed"). Every case frozen here (tools/capture-one-effect-cursor.mts). Moved by log text only —
// the Holy Symbol's Heal and the TEST Arcane Bolt are effects lists, so their power.used names its targets (was: `heal`,
// and the Bolt's ledger, which now rides its power.hit): showcase.alpha-team, showcase.gash-variant,
// test.props-viewer-ranged-zoc, and test.mage-kindle (its state differs only by the event counter, one power.hit more;
// RNG and result unchanged). Moved for real, a row whose compiled meaning was wrong: showcase.prologue-enemies and
// test.opening-gates — the Lieutenant Demon's "+1 Health" aura was a Max Health stat modifier nothing reads, and now
// raises Max Health and Health through the one interpreter, as a power's or a badge's always did. Captured over the
// fix.codex-numbers layer (combined 2026-10-01). A `changed` case is checked here and skips
// the older layers.
const oneEffectGolden = JSON.parse(readFileSync(new URL('./fixtures/battle-cursor-one-effect.json', import.meta.url), 'utf8'))
// fix.turn-mods-expire (2026-10-01; reported by Andrew, the Leap's +2 Strength stayed on the screen), Law 10: a mod "until
// the end of the Turn" leaves the unit as the Turn ends, with a statmod.expired line (Law 3) — it was only filtered at
// read. Every case frozen here (tools/capture-turn-mods-cursor.mts). Moved by those lines and the mods leaving the unit's
// state only — RNG and result unchanged in every one (effective stats were already filtered): showcase.assembled-party,
// showcase.gash-variant, showcase.kiln, showcase.rime, showcase.supper, test.block-a, test.damage-packets,
// test.opening-cathedral, test.opening-gates, progression-surge-0 and progression-surge-2. A `changed` case is checked
// here and skips the older layers.
const turnModsGolden = JSON.parse(readFileSync(new URL('./fixtures/battle-cursor-turn-mods.json', import.meta.url), 'utf8'))
// content.afflictions-at-zero (2026-10-01), Law 10: Rotting Flesh carries +5 bleed-out (DECISIONS.md 2026-10-01 'bleed-out is a
// stat on every player unit, 5; Rotting Flesh +5') and the four afflictions name what happens at 0 Health as gaps ('the
// afflictions at 0 Health'). Every case frozen here (tools/capture-afflictions-at-zero-cursor.mts). Moved by log TEXT only —
// a Rotting Flesh badge.gained line names its +5 as waiting for the next fielding, and the afflictions' gap lists grew; state,
// RNG and result unchanged (movedOnlyText): showcase.prologue-party, showcase.waystation, test.opening-cathedral,
// test.opening-cavern-trail, test.vampire-bite. test.afflictions-at-zero is new. Captured over the fix.turn-mods-expire
// layer (combined 2026-10-02). A `changed` case is checked here and skips the older layers.
const afflictionsAtZeroGolden = JSON.parse(readFileSync(new URL('./fixtures/battle-cursor-afflictions-at-zero.json', import.meta.url), 'utf8'))
// content.bridge-deck-pack (2026-10-01), Law 10: the engine pack's map.opening.bridge takes the walkable deck (DECISIONS.md
// 2026-09-30 'the Bridge's northern branch is walkable; the deck hexes marked X are deck') — seven deck hexes that were
// obstacles are open ground. Every case frozen here (tools/capture-bridge-deck-cursor.mts). Moved for real, the ruling
// working: exactly the one case fought on the Bridge, test.opening-bridge (state, RNG and result). A `changed` case is
// checked here and skips the older layers.
const bridgeDeckGolden = JSON.parse(readFileSync(new URL('./fixtures/battle-cursor-bridge-deck.json', import.meta.url), 'utf8'))
// fix.one-hero-assembly (2026-10-02; DECISIONS.md 2026-09-28 'the duplication review, ruled', E10-E14), Law 10: one assembler
// fields every unit, and one mutator (enterUnit) announces it. Every case frozen here (tools/capture-one-hero-assembly-cursor.mts).
// Moved by log lines and the state's event counter only — RNG and result unchanged in both: test.thorns (its enemy-side rows'
// own badges now say so, a unit.badged line each, Law 12) and legacy-surge-cap (the fixture hero carries its kit as a loadout
// and its badge.hero, with their unit.equipped and unit.badged lines, as a scenario hero does). A `changed` case is checked
// here and skips the older layers.
const oneHeroAssemblyGolden = JSON.parse(readFileSync(new URL('./fixtures/battle-cursor-one-hero-assembly.json', import.meta.url), 'utf8'))
// fix.orphans-teacher-knife (2026-10-02; DECISIONS.md 2026-10-02 'the Net is a trinket with no hands; the orphans and the
// school teacher start with a knife': "The Orphanage, Orphanage, and the school teacher should start with a knife each."),
// Law 10: the Orphan Child's kit is the Dagger, and the orphans and the school teacher field their kit wherever an encounter
// places them. Every case frozen here (tools/capture-orphans-teacher-knife-cursor.mts). Moved for real, the ruling working
// (state, RNG and result): exactly the four cases that field an Orphan Child — showcase.civilians, showcase.farmers-grown,
// showcase.two-zombies-and-a-child and test.opening-orphanage. A `changed` case is checked here and skips the older layers.
const orphansKnifeGolden = JSON.parse(readFileSync(new URL('./fixtures/battle-cursor-orphans-teacher-knife.json', import.meta.url), 'utf8'))
// fix.opening-levels (2026-10-02; DECISIONS.md 2026-09-28 'the opening's party levels up; the Flaming Longsword is a Warrior's or a
// Paladin's; the Bridge gives a reward': "it only is going to help the paladin or the warrior"), Law 10: the opening's sword goes
// only to a drafted Warrior or Paladin, and to nobody when neither is drafted (openingHolderOf). Every case frozen here
// (tools/capture-opening-levels-cursor.mts). Moved for real, the ruling working (state, RNG and result): exactly the four cases
// that field the sword on their default replicate's party — test.opening-bridge, -cavern-trail, -gates and -cathedral, whose
// sword was on a hero of another class. A `changed` case is checked here and skips the older layers.
const openingLevelsGolden = JSON.parse(readFileSync(new URL('./fixtures/battle-cursor-opening-levels.json', import.meta.url), 'utf8'))
// rule.afflictions-at-zero-refiled-2 (2026-10-02; DECISIONS.md 2026-10-01 'the afflictions at 0 Health' and 'bleed-out is a stat on
// every player unit, 5; Rotting Flesh +5'), Law 10: an affliction's 0-Health rule runs before the Deathbed (Vampirism and
// Lycanthropy transform on a Luck roll, Possession raises a Ghost, Rotting Flesh gains Fragile) and Rotting Flesh's +5 bleed-out
// counts from its gain. Every case frozen here (tools/capture-afflictions-at-zero-rule-cursor.mts). Moved for real, the ruling
// working (state, RNG and result): showcase.prologue-party and showcase.waystation, where a Zombie's Rotting Flesh hero is taken
// to 0. Moved by log TEXT only: test.afflictions-at-zero and test.vampire-bite (the badge rows' at-0 gaps became data; an
// affliction's badge.gained line names its rule). A `changed` case is checked here and skips the older layers.
const afflictionsAtZeroRuleGolden = JSON.parse(readFileSync(new URL('./fixtures/battle-cursor-afflictions-at-zero-rule.json', import.meta.url), 'utf8'))
// fix.civilians-field-kit (2026-10-03; DECISIONS.md 2026-10-03 'every civilian fields its kit by default when an encounter
// places it': "Yes, all of the civilians, by default, should field their kit the first time they're loaded. So all of them
// should get it." · "If enemies have weapons assigned, they need them also when they come into play."), Law 10: every unit an
// encounter places fields the kit its row carries, and the opt-in placedWithKit flag is retired. Every case frozen here
// (tools/capture-civilians-field-kit-cursor.mts). Moved for real, the ruling working (state, RNG and result): exactly the three
// cases that place a civilian who fought with Punch until now — showcase.supper (ten villagers: daggers, pitchforks, rocks),
// showcase.surrounded (the Lumberjack's axe, the Farmer's pitchfork) and test.opening-lumberjack (the Lumberjack's axe, his
// wife's dagger and basic armor). The cases that place only an Orphan Child or the School Teacher do not move: they fielded
// their Dagger already. A `changed` case is checked here and skips the older layers.
const civiliansKitGolden = JSON.parse(readFileSync(new URL('./fixtures/battle-cursor-civilians-field-kit.json', import.meta.url), 'utf8'))
// fix.starting-kit-powers (2026-10-04; DECISIONS.md 2026-10-03 'reported: the priest's Holy Texts has no heal in battle — three
// starting weapons lose their power on the way into the engine'), Law 10: the Holy Texts' Mercy, the Fire Staff's Flame Burst and
// the Frost Staff's Frost Nova reach the engine, so six of the 24 base heroes field a power they did not have and the AI plays it.
// Every case frozen here (tools/capture-starting-kit-powers-cursor.mts). Moved for real, the report answered (state, RNG and
// result): the nineteen cases that field one of the six — showcase.assembled-party, .eve-24-b, .horrors, .kiln, .prologue-party,
// .rime, .supper, .surrounded and .waystation, test.caravan-aftermath, test.item-uses, test.opening-bridge, -cathedral,
// -cavern-trail, -gates and -lumberjack, and progression-surge-0, -1 and -2. A `changed` case is checked here and skips the older layers.
const startingKitPowersGolden = JSON.parse(readFileSync(new URL('./fixtures/battle-cursor-starting-kit-powers.json', import.meta.url), 'utf8'))
// fix.fire-imp-burn-spares-self (2026-10-04; DECISIONS.md 2026-10-03 'the Fire Imp's burn does not hit the imp itself': "It should
// not hit him."), Law 10: the Fire Imp's end-of-Activation Burn targets every OTHER unit within 2 hexes, so the imp no longer
// burns itself at the end of each of its Activations. Every case frozen here (tools/capture-fire-imp-burn-cursor.mts). Moved for
// real, the ruling working (state, RNG and result): exactly the four cases that field a Fire Imp — showcase.kiln,
// showcase.prologue-enemies, test.opening-bridge and test.props-viewer-ranged-zoc. A `changed` case is checked here and skips the older layers.
const fireImpBurnGolden = JSON.parse(readFileSync(new URL('./fixtures/battle-cursor-fire-imp-burn.json', import.meta.url), 'utf8'))
// content.imp-blast-tuned (2026-10-04; DECISIONS.md 2026-10-03 'the Imp: Precision down by 1; its Blast burns half the time'),
// Law 10: the Imp's Precision is 3 (was 4) and Imp Blast's on-hit Burn 2 takes a 50% chance (was certain). Every case frozen here
// (tools/capture-imp-blast-tuned-cursor.mts). Moved for real, the ruling working (state, RNG and result): exactly the six cases
// that field an Imp — showcase.alpha-team, showcase.kiln, showcase.prologue-enemies, test.caravan-aftermath, test.opening-bridge
// and test.opening-gates. A `changed` case is checked here and skips the older layers.
const impBlastTunedGolden = JSON.parse(readFileSync(new URL('./fixtures/battle-cursor-imp-blast-tuned.json', import.meta.url), 'utf8'))
// combine (2026-10-04; GBH SWITCHES combine.mergeMainFirst): engine master c6552d5 (fix.civilians-field-kit, kingdom.page-test-strong-party)
// merged into the engine worker's copy (fix.starting-kit-powers, fix.fire-imp-burn-spares-self, content.imp-blast-tuned). Each side
// froze its own layer on its own tree, from the same layer below (afflictions-at-zero-rule); a case both sides moved is neither
// side's hash on the combined tree. Every case frozen here on the combined tree (tools/capture-combine-civilians-kit-cursor.mts):
// `changed` marks the cases that differ from the content.imp-blast-tuned capture — every case fix.civilians-field-kit moves. A
// `changed` case is checked here and skips the older layers; the rest run down this copy's three layers, then master's, as before.
const combineCiviliansKitGolden = JSON.parse(readFileSync(new URL('./fixtures/battle-cursor-combine-civilians-kit.json', import.meta.url), 'utf8'))
// capability.burst-paints-ground (2026-10-04; DECISIONS.md 2026-10-03 'reported: the priest's Holy Texts has no heal in battle'),
// Law 10: a burst leaves its ground — Flame Burst's seven hexes burn, Frost Nova's frost — and the two staffs name no gap. Every
// case frozen here (tools/capture-burst-paints-ground-cursor.mts). Moved for real (state, RNG and result): the four cases in which a
// staff mage casts one — showcase.kiln, showcase.rime, showcase.supper and test.opening-cathedral (the fixture counts each case's
// painted hexes). Moved in text only: the nine other cases that field a staff, whose unit.equipped line no longer carries the gap
// sentence — showcase.assembled-party, showcase.eve-24-b, showcase.horrors, showcase.surrounded, showcase.waystation,
// test.opening-gates and progression-surge-0/1/2. A `changed` case is checked here and skips the older layers.
const burstPaintsGroundGolden = JSON.parse(readFileSync(new URL('./fixtures/battle-cursor-burst-paints-ground.json', import.meta.url), 'utf8'))
// rule.free-attack-is-basic-attack (2026-10-04; DECISIONS.md 2026-09-28 'counterattack, special free attacks …' and 2026-10-04 'the
// basic attack is a weapon's first attack, and every free attack uses it without paying stamina'), Law 10: the attack of opportunity
// is the holder's basic attack, spends no Stamina (no stamina.spent line) and rolls at −20 Accuracy, and its declared line says
// `free`. Every case frozen here (tools/capture-free-attack-cursor.mts; the fixture counts each case's attacks of opportunity).
// The 32 cases in which a unit leaves a zone of control moved — for real (state, RNG or result) where the swing changed or its roll
// now falls the other side of the chance, in text only where the same swing lands the same way. A `changed` case is checked here
// and skips the older layers.
const freeAttackGolden = JSON.parse(readFileSync(new URL('./fixtures/battle-cursor-free-attack.json', import.meta.url), 'utf8'))
// capability.counterattack-and-fend (2026-10-04; DECISIONS.md 2026-09-28 'counterattack, special free attacks, the opening six,
// shields, custom weapons'), Law 10: the Longsword carries a Counterattack power, the computer uses it, and a unit with
// Counterattack up answers a melee attack. Every case frozen here (tools/capture-counterattack-cursor.mts; the fixture counts each
// case's counterattacks and fends). The 19 cases that field a Longsword moved (its `unit.equipped` line names the power; where the
// power is used the fight re-times). A `changed` case is checked here and skips the older layers.
const counterattackGolden = JSON.parse(readFileSync(new URL('./fixtures/battle-cursor-counterattack.json', import.meta.url), 'utf8'))
// fix.burst-ground-class-powers (2026-10-04; SWITCHES.md burstGroundClassPowers), Law 10: the Fire Master's Fireball and the
// Wyrmling's Scorch leave their seven hexes burning (content authors `paints` on the two class-power bursts; no engine code).
// Every case frozen here (tools/capture-burst-ground-class-powers-cursor.mts; the fixture counts the hexes a class power's burst
// painted). The four cases whose Fire Master throws Fireball moved (showcase.assembled-party, progression-surge-0..2: seven
// strokes each, and the fight re-times from there). A `changed` case is checked here and skips the older layers.
const classGroundGolden = JSON.parse(readFileSync(new URL('./fixtures/battle-cursor-burst-ground-class-powers.json', import.meta.url), 'utf8'))
// fix.trigger-ids-and-scopes (2026-10-04; SWITCHES.md triggerIdsDistinctInARow, itemTriggerOwnAttacks, testDeltaTriggersOnce), Law 10:
// no row holds two triggers under one id (the Fire Imp's Blast burn is trigger.fire-imp.burn.blast), a weapon's row-level trigger
// rides only that weapon's own attacks (the axes' on-block: one trigger per attack, so the triggers a holder lists after them roll
// on other slots), and a test delta holds its base's triggers once. Every case frozen here (tools/capture-trigger-ids-cursor.mts;
// the fixture counts each case's rolls under a renamed id and of an own-scoped item trigger). 26 cases moved. A `changed` case is
// checked here and skips the older layers.
const triggerIdsGolden = JSON.parse(readFileSync(new URL('./fixtures/battle-cursor-trigger-ids.json', import.meta.url), 'utf8'))
// fix.own-area-skips-owner (2026-10-04; DECISIONS.md 2026-10-04 'the Poison Imp, the Balrog and the four caster-centred class powers skip
// their owner too': "One and two, yes, skip the caster."), Law 10: the Poison Imp's end-of-Activation Poison and the Balrog's
// end-of-Activation Burn target every OTHER unit within 2 hexes, so neither lands on its owner at the end of its Activations.
// Every case frozen here (tools/capture-own-area-skips-owner-cursor.mts). Moved — for real, the ruling working (state, RNG and result), exactly the cases that field a Poison Imp or a Balrog: showcase.kiln, showcase.prologue-enemies, test.opening-gates. A `changed` case is checked here and skips the older layers.
const ownAreaGolden = JSON.parse(readFileSync(new URL('./fixtures/battle-cursor-own-area-skips-owner.json', import.meta.url), 'utf8'))
// fix.opening-orphanage-closer-start (2026-10-04; DECISIONS.md 2026-10-04 'the opening's tutorial: ... a closer start': "bring the hero
// forward to the end of the bridge and bring the zombie left, maybe 3 squares"), Law 10: the Orphanage's hero starts on (10,5) and
// its starting Zombie on (16,3) - the placements changed by ruling, so every battle of that encounter is another battle.
// Every case frozen here (tools/capture-orphanage-closer-start-cursor.mts). Moved — for real, the placements changed by ruling (state, RNG and result), exactly the case that fields the Orphanage: test.opening-orphanage. A `changed` case is checked here and skips the older layers.
const closerStartGolden = JSON.parse(readFileSync(new URL('./fixtures/battle-cursor-orphanage-closer-start.json', import.meta.url), 'utf8'))
// fix.opening-probe-cadence (2026-10-04; DECISIONS.md 2026-10-03 'one draft after every battle; ...': "One, yes."), Law 10: the engine's
// opening party is one hero smaller at battles 2 to 5 (2, 3, 4, 5 heroes; it was 3, 4, 5, 6), so each of those battles is another battle.
// Every case frozen here (tools/capture-opening-probe-cadence-cursor.mts). Moved — for real, the parties changed by ruling (state, RNG and result), exactly the opening battles 2 to 5: test.opening-bridge, test.opening-cavern-trail, test.opening-gates, test.opening-lumberjack. A `changed` case is checked here and skips the older layers.
const probeCadenceGolden = JSON.parse(readFileSync(new URL('./fixtures/battle-cursor-opening-probe-cadence.json', import.meta.url), 'utf8'))
// fix.affliction-pop-up-words (2026-10-04; DECISIONS.md 2026-10-03 "the affliction pop-up's 0-Health words and its drawbacks come from the
// engine"), Law 10: a hero's badge.gained line for an affliction carries the row's 0-Health text and its drawback marks - more words
// on a line the log already had, no fight moved (movedOnlyText in the fixture: state, RNG and result unchanged).
// Every case frozen here (tools/capture-affliction-pop-up-words-cursor.mts). Moved — in the log's words only (the events' hash; state, RNG and result unchanged), the cases in which a hero gains an affliction: showcase.prologue-party, showcase.waystation, test.afflictions-at-zero-rule, test.vampire-bite. A `changed` case is checked here and skips the older layers.
const afflictionWordsGolden = JSON.parse(readFileSync(new URL('./fixtures/battle-cursor-affliction-pop-up-words.json', import.meta.url), 'utf8'))
// combine (2026-10-04; GBH SWITCHES combine.mergeMainFirst): engine master ea9dafc, then eec6321 (capability.burst-paints-ground,
// rule.free-attack-is-basic-attack, capability.counterattack-and-fend, fix.burst-ground-class-powers, fix.trigger-ids-and-scopes) merged into the kingdom worker's copy (fix.own-area-skips-owner,
// fix.opening-orphanage-closer-start, fix.opening-probe-cadence, fix.affliction-pop-up-words). Each side froze its own layers on its
// own tree, from the same layer below (combine-civilians-kit); a case both sides moved is neither side's hash on the combined tree.
// Every case frozen here on the combined tree (tools/capture-combine-free-attack-cursor.mts): `changed` marks the cases that differ
// from the fix.affliction-pop-up-words capture (this copy's top layer) — every case master's five items move (re-captured at the second merge). A `changed` case is
// checked here and skips the older layers; the rest run down this copy's four layers, then master's five, then the layers below.
const combineFreeAttackGolden = JSON.parse(readFileSync(new URL('./fixtures/battle-cursor-combine-free-attack.json', import.meta.url), 'utf8'))
// content.longsword-loses-stab (2026-10-04; DECISIONS.md 2026-10-04 'after the backlog run: ... the Longsword loses Stab ...': "3 yes"),
// Law 10: item.longsword grants Slash and Counterattack and no Stab, and every row made from it follows. A unit's attack list is part of
// the state, so every case that fields a Longsword moves, and its holder's fights are other fights (no Stab to choose or to afford).
// Every case frozen here (tools/capture-longsword-loses-stab-cursor.mts). Moved - for real (state, RNG and result) - exactly the cases
// that field a Longsword: the showcases with a paladin or the Raven (alpha-team, assembled-party, eve-24-a, eve-24-b, gash-variant,
// horrors, item-powers, kiln, rime), test.back-flip, test.counterattack, test.flaming-longsword, test.swap, the three opening battles
// whose party holds one (cathedral, cavern-trail, gates) and progression-surge-0/1/2. A `changed` case is checked here and skips the older layers.
const longswordLosesStabGolden = JSON.parse(readFileSync(new URL('./fixtures/battle-cursor-longsword-loses-stab.json', import.meta.url), 'utf8'))
// fix.enchant-triggers-own-weapon (2026-10-04; DECISIONS.md 2026-10-04 'after the backlog run: ... an enchant is its own weapon's ...': "4, yes.
// If you have a fiery longsword and a dagger with a stab ability on it that stab ability does not use the fiery that's on the longsword."),
// Law 10: on a tier-3 row every trigger its attribute adds on an attacker's hook is one per attack the weapon grants, each onlyWithAttack.
// A unit's trigger list is part of the state, so a case that fields such a weapon moves. Every case frozen here
// (tools/capture-enchant-triggers-own-weapon-cursor.mts). Moved - exactly the cases that field a tier-3 weapon whose attribute brings a
// trigger: progression-surge-0/1/2. A `changed` case is checked here and skips the older layers.
const enchantTriggersOwnWeaponGolden = JSON.parse(readFileSync(new URL('./fixtures/battle-cursor-enchant-triggers-own-weapon.json', import.meta.url), 'utf8'))
// rule.walked-unit-has-moved (2026-10-04; DECISIONS.md 2026-10-04 'after the backlog run: ... moves are refused once a unit has walked ...': "2 yes"),
// Law 10: a unit that has entered a hex with its walk carries `walked` until its Activation ends or a Surge reopens it, and takes no other
// movement meanwhile. The computer never walked and then used another movement, so no fight moves - not an event, a roll or a result.
// Every case frozen here (tools/capture-walked-unit-has-moved-cursor.mts). Moved - in the STATE only (stateOnly in the fixture) - the 27
// cases whose battle ends inside an Activation whose unit had walked: that unit still holds the fact. A `changed` case is checked here and
// skips the older layers.
const walkedUnitHasMovedGolden = JSON.parse(readFileSync(new URL('./fixtures/battle-cursor-walked-unit-has-moved.json', import.meta.url), 'utf8'))
// capability.unit-trigger-with-tag (2026-10-04; DECISIONS.md 2026-10-04 'after the backlog run: ... a trigger on the hero with a tag requirement ...'),
// Law 10: a trigger may name a tag requirement (onlyWithTag) and then fires only for an attack that carries the tag; the Bloodrune Burning Touch
// (melee) and Pharaoh's Gauntlets (brawl) carry one. A unit's trigger list is part of the state, so a case that fields one of them moves.
// Every case frozen here (tools/capture-unit-trigger-with-tag-cursor.mts), the new fielding test.trigger-with-tag among them (`added`). Moved -
// exactly the cases that field one of the two rows: progression-surge-0/1/2. A `changed` case is checked here and skips the older layers.
const unitTriggerWithTagGolden = JSON.parse(readFileSync(new URL('./fixtures/battle-cursor-unit-trigger-with-tag.json', import.meta.url), 'utf8'))
// fix.kit-attack-clauses (2026-10-04; DECISIONS.md 2026-10-04 'the weapon audit: the Armory Ledger was approved 2026-09-28 and almost
// none of it is in the game': "the pack drops clauses from weapons the 24 base heroes carry"), Law 10: a weapon attack's rider that moves
// a stat reaches the engine - the Iron Mace's Crush (on hit the target loses 1 Armor), the Elfbow's Elf Shot (on hit gain 1 Precision),
// the Obsidian Fang's 20% Strength loss. A unit's trigger list is part of the state, and a Ranger whose every hit adds Precision fights
// another fight, so each case that fields one of those weapons moves - the six opening battles (their first hero holds an Elfbow) among them.
// Every case frozen here (tools/capture-kit-attack-clauses-cursor.mts). Moved: showcase.eve-24-a, showcase.eve-24-b, test.back-flip, test.caravan-aftermath, test.opening-bridge, test.opening-cathedral, test.opening-cavern-trail, test.opening-gates, test.opening-lumberjack, test.opening-orphanage, progression-surge-0, progression-surge-1, progression-surge-2. A `changed` case is checked here and skips the older layers.
const kitAttackClausesGolden = JSON.parse(readFileSync(new URL('./fixtures/battle-cursor-kit-attack-clauses.json', import.meta.url), 'utf8'))
// content.shields-reauthored (2026-10-04; DECISIONS.md 2026-09-28 'counterattack, special free attacks, the opening six, shields, custom
// weapons' and the Armory Ledger approved that day), Law 10: the shields are the Ledger's - the Tower +10 Block, +20 Ranged Block, -5 Dodge
// with Brace and Arrow Wall; the Round with Lock Shields and Set Feet; the Kite with Raise Guard and Cover Ally; the powers without the
// cooldowns the old six had. A shield holder's numbers and powers are part of the state and the computer raises a ready shield power when
// it is not about to attack, so every case that fields a shield moves - the standard battle's paladin among them.
// Every case frozen here (tools/capture-shields-reauthored-cursor.mts). Moved: showcase.alpha-team, showcase.assembled-party, showcase.eve-24-a, showcase.eve-24-b, showcase.gash-variant, showcase.horrors, showcase.item-powers, showcase.kiln, showcase.prologue-party, showcase.rime, showcase.supper, showcase.surrounded, showcase.waystation, test.caravan-aftermath, test.counterattack, test.fend, test.item-uses, test.opening-bridge, test.opening-cathedral, test.opening-cavern-trail, test.opening-gates. A `changed` case is checked here and skips the older layers.
const shieldsReauthoredGolden = JSON.parse(readFileSync(new URL('./fixtures/battle-cursor-shields-reauthored.json', import.meta.url), 'utf8'))
// content.greatsword-war-axe-reauthored (2026-10-04; DECISIONS.md 2026-09-28 'counterattack, special free attacks, the opening six, shields,
// custom weapons' and the Armory Ledger approved that day), Law 10: the Great Sword is +5 Block with the Hew at 1 Stamina and the power
// Heavy Counterattack (its Great Cleave is gone); the War Axe's Chop is -10 Accuracy and its second attack is Heavy Chop (Strength +3, -15
// Accuracy, no Crit, no Bleed). A holder's attacks, costs and numbers are part of the state and of every roll it makes, so every case that
// fields a Great Sword or a War Axe moves - the Alpha Team's among them.
// Every case frozen here (tools/capture-greatsword-war-axe-reauthored-cursor.mts). Moved: showcase.alpha-team (text only), showcase.assembled-party, showcase.eve-24-a, showcase.eve-24-b (text only), showcase.gash-variant (text only), showcase.horrors, showcase.item-powers (text only), showcase.kiln, showcase.prologue-party, showcase.rime, showcase.supper, showcase.surrounded, showcase.waystation, test.back-flip (text only), test.counterattack (text only), test.fend, test.flaming-longsword (text only), test.flaming-war-axe, test.item-uses, test.opening-cathedral (text only), test.opening-cavern-trail (text only), test.opening-gates (text only), test.swap (text only), progression-surge-0, progression-surge-1, progression-surge-2. A `changed` case is checked here and skips the older layers.
const greatswordWarAxeReauthoredGolden = JSON.parse(readFileSync(new URL('./fixtures/battle-cursor-greatsword-war-axe-reauthored.json', import.meta.url), 'utf8'))
// fix.enchant-stats-on-weapon (2026-10-04; DECISIONS.md 2026-09-28 'counterattack, special free attacks, the opening six, shields, custom
// weapons': "Strength becomes the weapon's damage (its attacks go up); Crit and Accuracy apply to that weapon's attacks"), Law 10: a
// weapon row's Strength, Precision, Crit and Accuracy ride its own attacks at every tier - a tier-3 row grants its own copy of each
// attack it raises ('<attack id>.<attribute>'), a named weapon's attack rows are raised where they are - and are no stat of the holder.
// A case that fields such a weapon moves: its holder's sheet is less by those numbers, his weapon's attacks carry them (under their
// own ids on a tier-3 row), and a Punch, the other hand's weapon and a cast no longer do.
// Every case frozen here (tools/capture-enchant-stats-on-weapon-cursor.mts). Moved: test.trigger-with-tag, progression-surge-0, progression-surge-1, progression-surge-2. A `changed` case is checked here and skips the older layers.
const enchantStatsOnWeaponGolden = JSON.parse(readFileSync(new URL('./fixtures/battle-cursor-enchant-stats-on-weapon.json', import.meta.url), 'utf8'))
// rule.counterattack-replaced-and-lost (2026-10-04; DECISIONS.md 2026-09-28, the Armory Ledger's rules: "A new counterattack replaces the
// old one. Knocked down, knocked back or moved by an enemy's power: it is lost."), Law 10: a power that grants a special free attack
// first takes away the one its receiver has up (the kind's two stats and the older grant's riders), and a unit that goes prone or is
// knocked to another hex loses the kind's two stats - one statmod.expired line each, saying why. Thorns answers an ADJACENT melee
// attacker. A case moves where a unit uses its counterattack power again while one is up (the computer does: it had Counterattack 2 and
// +20, now 1 and +10), or is knocked down or back with one up.
// Every case frozen here (tools/capture-counterattack-replaced-and-lost-cursor.mts). Moved: showcase.eve-24-a, test.opening-gates. A `changed` case is checked here and skips the older layers.
const counterattackReplacedAndLostGolden = JSON.parse(readFileSync(new URL('./fixtures/battle-cursor-counterattack-replaced-and-lost.json', import.meta.url), 'utf8'))
// capability.free-attack-accuracy (2026-10-04; DECISIONS.md 2026-09-28, the Armory Ledger's rules: "'+10 counterattack' on a weapon is +10
// Accuracy on your counterattacks." / "Bonuses 'to special attacks' and 'Dodge against special attacks' apply to all three."), Law 10:
// the Longsword and the Great Sword carry +10 Counterattack Accuracy while held (a stat of the row, named on its unit.equipped line and
// added to its holder's counterattack roll, on top of a power's own), and two stats exist - freeAttackAccuracy on every special free
// attack, freeAttackDodge against them. Every case that fields either sword moves: its equipped line says the stat, and each
// counterattack its holder makes rolls 10 higher.
// Every case frozen here (tools/capture-free-attack-accuracy-cursor.mts). Moved: showcase.alpha-team, showcase.assembled-party, showcase.eve-24-a, showcase.eve-24-b, showcase.gash-variant, showcase.horrors, showcase.item-powers, showcase.kiln, showcase.rime, test.back-flip, test.counterattack, test.flaming-longsword, test.opening-cathedral, test.opening-cavern-trail, test.opening-gates, test.swap, progression-surge-0, progression-surge-1, progression-surge-2. A `changed` case is checked here and skips the older layers.
const freeAttackAccuracyGolden = JSON.parse(readFileSync(new URL('./fixtures/battle-cursor-free-attack-accuracy.json', import.meta.url), 'utf8'))
// fix.computer-reaches-class-power-past-shield-power (2026-10-05; SWITCHES.md aiPowerLongestCooldownFirst), Law 10: the computer tries
// a unit's powers longest cooldown first, the unit's own order breaking ties - it took the first its kit listed, so a shield's power
// (no cooldown, listed before the class's) was raised every Activation and the class's never came up. A case moves where a
// computer-played unit holds powers of different cooldowns and reaches for one: it now uses the class power it never reached.
// Every case frozen here (tools/capture-computer-reaches-class-power-cursor.mts). Moved: showcase.assembled-party, showcase.eve-24-a, showcase.horrors, showcase.prologue-party, showcase.surrounded, progression-surge-0. A `changed` case is checked here and skips the older layers.
const computerReachesClassPowerGolden = JSON.parse(readFileSync(new URL('./fixtures/battle-cursor-computer-reaches-class-power.json', import.meta.url), 'utf8'))
// content.orphanage-body-and-graves-cursed (2026-10-05; DECISIONS.md 2026-10-05 'playtest post: … bodies, cursed ground …' and 2026-09-28
// 'cursed ground is the Weak ground layer, the one ground-status shape'), Law 10: the Lumberjack House's encounter paints its map's
// cursed ground - layer.weak on the three graves and the body, four hexes - at setup. The one case that fields that battle moves: four
// layer.painted lines at the start, and Weak on whoever enters or ends an Activation on one.
// Every case frozen here (tools/capture-lumberjack-graves-cursed-cursor.mts). Moved: test.opening-lumberjack. A `changed` case is checked here and skips the older layers.
const lumberjackGravesCursedGolden = JSON.parse(readFileSync(new URL('./fixtures/battle-cursor-lumberjack-graves-cursed.json', import.meta.url), 'utf8'))
// capability.effect-lasts-activations (2026-10-05; DECISIONS.md 2026-10-04 'his 28 reward weapons read back …': "We need: … time /
// number of activations for a duration"), Law 10: two fieldings join the scenarios - test.stoke (a mage with the Fire Gauntlet stokes
// it and his hits burn) and test.perfect-sight (a mage with the Staff of the Ultimate Destroyer takes Perfect Sight) - so each counted
// status is live in a real battle. They are ADDED cases; no case that existed moves.
// Every case frozen here (tools/capture-effect-lasts-activations-cursor.mts). Moved: none. A `changed` case is checked here and skips the older layers.
const effectLastsActivationsGolden = JSON.parse(readFileSync(new URL('./fixtures/battle-cursor-effect-lasts-activations.json', import.meta.url), 'utf8'))
// capability.damage-from-two-stats (2026-10-05; DECISIONS.md 2026-10-04 'his 28 reward weapons read back …': of damage from two stats
// added, "We do need that."; 'the Force Staff is Precision plus half Magic, as magic damage'), Law 10: an attack's damage is a sum of
// terms - its own stat, counted as often as its row says, plus each added stat (the party's Magic or Spirit, or a stat of the
// attacker's own) times its multiple - where the row's second term was dropped. Every case that fields an attack with a second term
// moves (the Holy Texts' Verse adds the party's Spirit; the Ancient Tome, the War Hammer's Skullsplitter and the rest), and
// test.force-blast is ADDED: the Force Staff's Force Blast live in a real battle.
// Every case frozen here (tools/capture-damage-from-two-stats-cursor.mts). Moved: showcase.eve-24-b (text only), showcase.horrors, showcase.kiln (text only), showcase.prologue-party, showcase.rime (text only), showcase.supper, showcase.surrounded, showcase.waystation, test.caravan-aftermath, test.item-uses, test.opening-bridge (text only), test.opening-cathedral, test.opening-cavern-trail (text only), test.opening-gates, test.perfect-sight (text only), progression-surge-0, progression-surge-1, progression-surge-2. A `changed` case is checked here and skips the older layers.
const damageFromTwoStatsGolden = JSON.parse(readFileSync(new URL('./fixtures/battle-cursor-damage-from-two-stats.json', import.meta.url), 'utf8'))
// content.hero-origin-badges (2026-10-05; DECISIONS.md 2026-10-05 'seven answers: … origin badges go on the heroes …': asked whether
// the Codex's origin badges should be put on the heroes' rows - "3, yes."), Law 10: each of the 24 base heroes' rows carries the
// origin badges the Codex names for it, and a badge acts from the row. Every case that fields a base hero has one more line per
// origin badge at fielding; the 13 heroes whose badges carry numbers are fielded with them (the Iron Dwarf +2 Health +1 Stamina,
// the Pyre Witch and the Raven -2 Health +20 Dodge, …), so every such battle moves.
// Every case frozen here (tools/capture-hero-origin-badges-cursor.mts). Moved: showcase.assembled-party, showcase.civilians, showcase.eve-24-a, showcase.eve-24-b, showcase.horrors, showcase.item-powers, showcase.kiln, showcase.prologue-party, showcase.rime, showcase.supper, showcase.surrounded, showcase.two-zombies-and-a-child, showcase.waystation, test.back-flip, test.caravan-aftermath, test.counterattack, test.fend, test.force-blast, test.item-uses, test.opening-bridge, test.opening-cathedral, test.opening-cavern-trail, test.opening-gates, test.opening-lumberjack, test.opening-orphanage, test.swap, progression-surge-0, progression-surge-1, progression-surge-2. A `changed` case is checked here and skips the older layers.
const heroOriginBadgesGolden = JSON.parse(readFileSync(new URL('./fixtures/battle-cursor-hero-origin-badges.json', import.meta.url), 'utf8'))
// capability.summons (2026-10-05; DECISIONS.md 2026-10-04 'his 28 reward weapons read back …': "We need: summons"), Law 10: a power
// may be aimed at an empty hex and place a unit of a named row there, on the caster's side; an attack may carry Accuracy against
// a kind of target. No case that was fought before moves (no row in them summoned by a power or carried Accuracy against a kind);
// test.call-the-wolf is ADDED: the Staff of Summoning's Call the Wolf live in a real battle.
// Every case frozen here (tools/capture-summons-cursor.mts). Moved: none. A `changed` case is checked here and skips the older layers.
const summonsGolden = JSON.parse(readFileSync(new URL('./fixtures/battle-cursor-summons.json', import.meta.url), 'utf8'))
// capability.set-bonus (2026-10-05; DECISIONS.md 2026-10-04 'his 28 reward weapons read back …': "We need: … set bonus"; GEAR-DESIGN.md
// §5: a set is a tag plus a block on the item that cares), Law 10: an item row carries its set block and the engine counts the
// members a unit carries when it is fielded; and a unit mod of Magic or Spirit is the unit's own share of the party's, so it
// reaches the party's sum (it reached nothing). Every case whose party carries a drafted gift of Magic or Spirit moves;
// test.set-bonus is ADDED: four of the set rows live in a real battle.
// Every case frozen here (tools/capture-set-bonus-cursor.mts). Moved: test.perfect-sight. A `changed` case is checked here and skips the older layers.
const setBonusGolden = JSON.parse(readFileSync(new URL('./fixtures/battle-cursor-set-bonus.json', import.meta.url), 'utf8'))
// capability.raise-lower-magic (2026-10-05; DECISIONS.md 2026-10-04 'his 28 reward weapons read back …': "we need to lower and raise
// magic"), Law 10: an effect can raise or lower a side's party stat - the heroes' Magic or Spirit, the enemy side's Power - for the
// rest of the Battle or for Turns, never below 0, and everything that reads the stat reads the changed value. No case that was
// fought before moves (nothing in them changed a party stat); test.vortex is ADDED: the Staff of the Magi's Vortex live in a real battle.
// Every case frozen here (tools/capture-raise-lower-magic-cursor.mts). Moved: test.set-bonus. A `changed` case is checked here and skips the older layers.
const raiseLowerMagicGolden = JSON.parse(readFileSync(new URL('./fixtures/battle-cursor-raise-lower-magic.json', import.meta.url), 'utf8'))
// capability.his-weapons-small-clauses (2026-10-05; DECISIONS.md 2026-10-04 'his 28 reward weapons read back …': "Everything else in
// here seems like something we need."), Law 10: an attack's on-kill may destroy the corpse of what it kills (the Staff of the
// Destroyer's Ruin and Sundering, the artifact attribute Destroying), and a power removes points of a named status by a stat's
// amount (the Benevolent Rod's Mending Light). A case that was fought before moves only if a unit in it holds one of those rows;
// test.corpse-destroyed and test.mending-light are ADDED: each clause live in a real battle.
// Every case frozen here (tools/capture-his-weapons-small-clauses-cursor.mts). Moved: test.set-bonus. A `changed` case is checked here and skips the older layers.
const hisWeaponsSmallClausesGolden = JSON.parse(readFileSync(new URL('./fixtures/battle-cursor-his-weapons-small-clauses.json', import.meta.url), 'utf8'))
// capability.planted-banners (2026-10-05; DECISIONS.md 2026-10-04 'every dead line on his items is a feature that is needed …': "All of
// those deadlines need to be added in as features that we need."), Law 10: a power plants an object on its user's hex that stays
// for the rest of the Battle and gives the planter's side, within its radius of that hex, stats, a ward against a status and lent
// triggers (his Banners of Courage, of the Assassin, of the Vigil and of Heroism). No case that was fought before moves (no unit
// in them carries a banner); test.banner-courage is ADDED: the Banner of Courage live in a real battle.
// Every case frozen here (tools/capture-planted-banners-cursor.mts). Moved: none. A `changed` case is checked here and skips the older layers.
const plantedBannersGolden = JSON.parse(readFileSync(new URL('./fixtures/battle-cursor-planted-banners.json', import.meta.url), 'utf8'))
// capability.placed-traps (2026-10-05; DECISIONS.md 2026-10-04 'every dead line on his items is a feature that is needed …': "All of
// those deadlines need to be added in as features that we need."), Law 10: a use places one or more traps on chosen empty hexes;
// a trap springs on the first unit to enter its hex - its damage, its statuses, the hexes round it and the ground it leaves as
// its row says - and is gone (his Bear Traps, Explosive Trap, Fire Trap and Magic Trap). No case that was fought before moves (no
// unit in them carries a trap); test.bear-traps is ADDED: the Bear Traps live in a real battle.
// Every case frozen here (tools/capture-placed-traps-cursor.mts). Moved: none. A `changed` case is checked here and skips the older layers.
const placedTrapsGolden = JSON.parse(readFileSync(new URL('./fixtures/battle-cursor-placed-traps.json', import.meta.url), 'utf8'))
// capability.stabilise-downed-ally (2026-10-05; DECISIONS.md 2026-10-04 'every dead line on his items is a feature that is needed …':
// "All of those deadlines need to be added in as features that we need."), Law 10: a power aimed at one downed ally stops its
// bleed-out count - it stays down and does not die of the count for the rest of the Battle (his Bandages). No case that was
// fought before moves (no unit in them carries such a power); test.bandages and test.field-dressing are ADDED: the Bandages, and a
// second row of the same effect, each live in a real battle.
// Every case frozen here (tools/capture-stabilise-downed-ally-cursor.mts). Moved: none. A `changed` case is checked here and skips the older layers.
const stabiliseDownedAllyGolden = JSON.parse(readFileSync(new URL('./fixtures/battle-cursor-stabilise-downed-ally.json', import.meta.url), 'utf8'))
// rule.prone-only-stand-up (2026-10-05; DECISIONS.md 2026-10-05 'a prone unit only stands; Stand Up is its one move; …': "yes, it
// cannot use attacks or powers until it stands." / "No, you only perform one move action."), Law 10: a unit holding a prone status
// is refused every action but its stand, makes no special free attack, and once it has stood takes no other movement in that
// action cycle. A case that was fought before moves only if a unit in it is knocked down and, until now, attacked from the floor
// or walked on with its primary action after standing.
// Every case frozen here (tools/capture-prone-only-stand-up-cursor.mts). Moved: showcase.ordered-power-preview, showcase.waystation,
// test.back-flip, test.mode-change-a, test.opening-gates, test.prone-b. A `changed` case is checked here and skips the older layers.
const proneOnlyStandUpGolden = JSON.parse(readFileSync(new URL('./fixtures/battle-cursor-prone-only-stand-up.json', import.meta.url), 'utf8'))
// content.dwarf-elf-fey-badges-act (2026-10-05; DECISIONS.md 2026-10-05 'a prone unit only stands; … Dwarf, Elf and Fey act; …': "6. They
// should act."), Law 10: the Dwarf, Elf and Fey badges carry the data's numbers (Dwarf -1 Movement +2 Health; Elf +3 Vision +2
// Luck; Fey +10 Surge), so every battle that fields the Iron Dwarf, the Dwarven Brawler, the Mountain Berserker, the Ancient Elf,
// the Forest Elf or the Forest Fey is another battle. A case that fields none of the six is event for event what it was; none is ADDED.
// (Combine, 2026-10-06: this layer landed on stabilise-downed-ally in the engine worker's copy while rule.prone-only-stand-up
// landed on the same layer in main; it is stacked on that one here and captured again on the merged tree.)
// Every case frozen here (tools/capture-dwarf-elf-fey-badges-act-cursor.mts). Moved: showcase.assembled-party, showcase.eve-24-a, showcase.horrors, showcase.kiln, showcase.prologue-party, showcase.rime, showcase.supper, showcase.surrounded, showcase.waystation, test.back-flip, test.bandages, test.banner-courage, test.bear-traps, test.caravan-aftermath, test.fend, test.field-dressing, test.item-uses, test.mending-light, test.opening-bridge, test.opening-cathedral, test.opening-cavern-trail, test.opening-gates, test.opening-lumberjack, test.opening-orphanage, test.swap, progression-surge-0, progression-surge-1, progression-surge-2. A `changed` case is checked here and skips the older layers.
const dwarfElfFeyBadgesActGolden = JSON.parse(readFileSync(new URL('./fixtures/battle-cursor-dwarf-elf-fey-badges-act.json', import.meta.url), 'utf8'))
// The group of 2026-10-06 (DECISIONS.md 'engine items too are built in groups of up to four …'): three items, one layer.
// content.sets-count-holy-texts-and-heavy-chain (Holy Texts a book, Heavy Chain a chain item for sets - by a set membership the Forge
// does not read), content.resistance-to-weak-and-vigil-party-spirit (the word; the Banner of the Vigil heals by the party's Spirit) and
// rule.computer-avoids-own-traps (ruled 2026-10-05: "Computers should avoid their own traps." - a unit the computer plays will not
// enter a hex holding its own side's trap). No battle fought before moves: no case fielded the Book of Karma or the Chains of the
// Wrathful with either row, none planted the Vigil's banner, and in the one case with traps (test.bear-traps) no hero walked onto a
// hero's trap. Three cases are ADDED, one fielding to an item: test.sets-counted (the two set rows counted in a real battle),
// test.banner-vigil (the Vigil's banner planted, an ally with no Spirit healed by the party's) and test.snarer-traps (a trap an
// enemy places, on its own side's way).
// Every case frozen here (tools/capture-computer-avoids-own-traps-cursor.mts). Moved: none. A `changed` case is checked here and skips the older layers.
const computerAvoidsOwnTrapsGolden = JSON.parse(readFileSync(new URL('./fixtures/battle-cursor-computer-avoids-own-traps.json', import.meta.url), 'utf8'))
// rule.surge-is-at-least-level (2026-10-06). Ruled 2026-10-06 (DECISIONS.md 'everyone gains Surge equal to its level at the least, and
// rolls the Surge check every Activation'): "Everyone gains surge equal to level, at the very least. Therefore, there is always at
// least a 1% chance of a surge." Every hero is fielded with Surge of at least 1 - the level's Surge is data now, on the pack's level
// rows and the hero's own row - so every hero rolls the Surge check after each Activation: one more roll an Activation, and now and
// then a Surge. Every battle a hero fights moves; a battle that fields only enemies, civilians or bodies with no hero class does not.
// Every case frozen here (tools/capture-surge-is-at-least-level-cursor.mts). Moved: showcase.alpha-team, showcase.arc-variant, showcase.assembled-party (text only), showcase.badged, showcase.civilians, showcase.eve-24-a, showcase.eve-24-b, showcase.flight-bonuses, showcase.gash-variant, showcase.horrors, showcase.item-powers, showcase.kiln, showcase.knockback-two, showcase.movement-bonuses, showcase.ordered-power-preview, showcase.prologue-enemies, showcase.prologue-party, showcase.rime, showcase.supper, showcase.surge-flight-ladder, showcase.surrounded, showcase.two-zombies-and-a-child, showcase.waystation, showcase.wounded-entry, test.afflictions-at-zero, test.afflictions-at-zero-rule, test.area-fall-curse, test.area-fall-meteor, test.authored-slots, test.back-flip (text only), test.bandages, test.banner-courage, test.banner-vigil, test.bear-traps, test.block-a, test.block-b, test.board-authored, test.board-journey, test.call-the-wolf, test.caravan-aftermath, test.charge-a, test.charge-b, test.corpse-destroyed, test.counterattack, test.cover-crates, test.cover-fence, test.damage-packets, test.direct-map-authored, test.direct-map-journey, test.encounter-rules-a, test.encounter-rules-b, test.fend, test.field-dressing, test.flaming-longsword, test.flaming-war-axe, test.force-blast, test.frost-resistant, test.geometry-corridor, test.geometry-diagonal, test.ghost, test.ground-table, test.item-uses, test.kdb, test.knockback-well, test.mage-kindle, test.mending-light, test.mode-change-a, test.mode-change-b, test.opening-bridge, test.opening-cathedral, test.opening-cavern-trail, test.opening-gates, test.opening-lumberjack, test.opening-orphanage, test.perfect-sight, test.placed-remains-a, test.placed-remains-b, test.prone-a, test.prone-b, test.prop-destroy, test.props-viewer-ranged-zoc, test.raise-one, test.set-bonus, test.sets-counted, test.sight-a, test.sight-b, test.snarer-traps, test.stealth-a, test.stealth-b, test.stoke, test.structures, test.swap, test.swell, test.thin-sign, test.thorns, test.trigger-with-tag, test.vampire-bite, test.vortex, test.vs-target-a, test.vs-target-b, test.vs-target-c, progression-surge-0 (text only), progression-surge-1 (text only), progression-surge-2 (text only). A `changed` case is checked here and skips the older layers.
const surgeIsAtLeastLevelGolden = JSON.parse(readFileSync(new URL('./fixtures/battle-cursor-surge-is-at-least-level.json', import.meta.url), 'utf8'))
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex')
// Explicit rule migration, not regenerated historical hashes. These nine old
// cases contain Surge ledger/refresh changes or terminal markers corrected
// by fix.surge-cycle. Keep every other historical assertion intact; these cases
// retain automatic/suspended parity plus the exact rules in surge-cycle.test.ts.
const surgeChanged = new Set(['showcase.assembled-party', 'showcase.badged', 'showcase.beasts', 'showcase.farmers-grown', 'progression-surge-0', 'progression-surge-1', 'legacy-surge-cap', 'showcase.supper', 'showcase.surrounded'])
// fix.ai-shared-commands: recovery can be chosen without displacement, and
// illegal lowest-health candidates cannot hide another legal target. The
// recorded 476-battle transition explains these three additional old hashes.
const aiChanged = new Set(['showcase.horrors', 'showcase.rime', 'showcase.waystation'])
// Law 10, fix.unit-identities: these fifteen remaining historical streams used
// target array indices in trigger keys. Measured before/after first differences
// are trigger.rolled. Preserve the original file, add separate frozen migration
// expectations, and continue checking BOTH drivers against all four hashes/results.
const identityChanged = new Set(['showcase.alpha-team', 'showcase.arc-variant', 'showcase.civilians', 'showcase.eve-24-a', 'showcase.eve-24-b', 'showcase.gash-variant', 'showcase.item-powers', 'showcase.kiln', 'showcase.knockback-two', 'showcase.mirror-zombies', 'showcase.ordered-power-preview', 'showcase.prologue-enemies', 'showcase.prologue-party', 'showcase.wounded-entry', 'progression-surge-2'])

describe('resumable battle cursor', () => {
  it('blocked actors run their end ladder without yielding an action cycle', () => {
    const ctx = createCustomBattle([{ type: 'test-warrior', hex: 85 }], [{ type: 'test-zombie', hex: 86 }])
    const blocked = Object.values(ctx.statuses).find(s => s.blocksAction)!
    expect(blocked).toBeDefined()
    applyStatus(ctx, 0, blocked.id, 1, 'test')
    expect(battle.advanceBattle(ctx)).toEqual({ kind: 'acting', actor: 1 })
    expect(ctx.events.filter(e => e.type === 'activation.idle' && e.actor === 0)).toHaveLength(1)
    expect(ctx.events.filter(e => e.type === 'activation.end' && e.actor === 0)).toHaveLength(1)
    expect(ctx.events.some(e => e.type === 'status.reduced' && e.target === 0 && e['statusId'] === blocked.id)).toBe(true)
    expect(ctx.events.some(e => e.type === 'ai.mode' && e.actor === 0)).toBe(false)
  })

  it('keeps the phase activation snapshot and refuses finishing a cycle twice', () => {
    const ctx = createCustomBattle([{ type: 'test-warrior', hex: 85 }], [{ type: 'test-zombie', hex: 86 }])
    expect(battle.advanceBattle(ctx)).toEqual({ kind: 'acting', actor: 0 })
    // A new ally arriving during this phase cannot join its captured order.
    ctx.state.units.push({ ...structuredClone(ctx.state.units[0]!), id: 2, uid: 300, hex: 100 })
    battle.completeActionCycle(ctx)
    expect(() => battle.completeActionCycle(ctx)).toThrow(/acting/)
    expect(battle.advanceBattle(ctx)).toEqual({ kind: 'acting', actor: 1 })
    expect(ctx.events.some(e => e.type === 'activation.begin' && e.actor === 2)).toBe(false)
    battle.completeActionCycle(ctx)
    expect(battle.advanceBattle(ctx)).toEqual({ kind: 'acting', actor: 0 })
    battle.completeActionCycle(ctx)
    expect(battle.advanceBattle(ctx)).toEqual({ kind: 'acting', actor: 2 })
  })

  it('settles an already-decided starting position without opening a Turn', () => {
    // A board that never had an enemy intentionally does not count as cleared.
    const ctx = createCustomBattle([{ type: 'test-warrior', hex: 85 }], [{ type: 'test-zombie', hex: 86 }])
    ctx.state.units[1]!.hp = 0
    ctx.state.units[1]!.lifeState = 'dead'
    const next = battle.advanceBattle(ctx)
    expect(next.kind).toBe('complete')
    expect(ctx.state.turn).toBe(0)
    expect(ctx.events.filter(e => e.type === 'battle.begin')).toHaveLength(1)
    expect(ctx.events.filter(e => e.type === 'battle.end')).toHaveLength(1)
    expect(battle.advanceBattle(ctx)).toEqual(next)
    expect(ctx.events.filter(e => e.type === 'battle.begin')).toHaveLength(1)
  })

  it('yields a begun activation, waits without changing anything, and finishes without reinitializing', () => {
    const ctx = createCustomBattle([{ type: 'test-warrior', hex: 85 }], [{ type: 'test-zombie', hex: 86 }])
    expect(() => battle.completeActionCycle(ctx)).toThrow(/acting/)
    const first = battle.advanceBattle(ctx)
    expect(first).toEqual({ kind: 'acting', actor: 0 })
    const before = structuredClone({ state: ctx.state, events: ctx.events, rng: ctx.rng, cursor: ctx.battleCursor })
    expect(battle.advanceBattle(ctx)).toEqual(first)
    expect({ state: ctx.state, events: ctx.events, rng: ctx.rng, cursor: ctx.battleCursor }).toEqual(before)
    const result = battle.runBattle(ctx)
    const after = structuredClone({ state: ctx.state, events: ctx.events, rng: ctx.rng })
    expect(battle.advanceBattle(ctx)).toEqual({ kind: 'complete', result })
    expect(battle.runBattle(ctx)).toEqual(result)
    expect(() => battle.completeActionCycle(ctx)).toThrow(/acting/)
    expect({ state: ctx.state, events: ctx.events, rng: ctx.rng }).toEqual(after)
    expect(ctx.events.filter(e => e.type === 'battle.begin')).toHaveLength(1)
  })

  it('forks the plain control cursor independently of the live battle', () => {
    const ctx = createCustomBattle([{ type: 'test-warrior', hex: 85 }], [{ type: 'test-zombie', hex: 86 }])
    battle.advanceBattle(ctx)
    const dry = forkBattle(ctx)
    expect(dry.battleCursor).toEqual(ctx.battleCursor)
    expect(dry.battleCursor).not.toBe(ctx.battleCursor)
    dry.battleCursor!.order.push(999)
    expect(ctx.battleCursor!.order).not.toContain(999)
  })

  for (const fixture of battleCursorCases()) {
    const historical = surgeChanged.has(fixture.id) || aiChanged.has(fixture.id) || identityChanged.has(fixture.id) ? undefined : golden.cases.find((row: { id: string }) => row.id === fixture.id)
    it(`${historical ? 'preserves historical' : 'automatic and suspended drivers agree on'} events/state/RNG/result: ${fixture.id}`, () => {
      // Law 10: universal expenditure adds metadata to every battle. Keep both
      // old files and check their exact hashes after removing ONLY that event
      // and normalizing sequence counters; freeze full current events separately.
      const blockExpected = blockGolden.cases.find((row:{id:string})=>row.id===fixture.id)
      const contactExpected = contactGolden.cases.find((row: {id:string}) => row.id === fixture.id)
      const elementalExpected = elementalGolden.cases.find((row: {id:string}) => row.id === fixture.id)
      const protectionExpected = protectionGolden.cases.find((row: {id:string}) => row.id === fixture.id)
      const packetExpected = packetGolden.cases.find((row:{id:string})=>row.id===fixture.id)
      const burstExpected = burstGolden.cases.find((row:{id:string})=>row.id===fixture.id)
      const shieldExpected = shieldGolden.cases.find((row:{id:string})=>row.id===fixture.id)
      const knockExpected = knockGolden.cases.find((row:{id:string})=>row.id===fixture.id)
      const kdbExpected = kdbGolden.cases.find((row:{id:string})=>row.id===fixture.id)
      const thornsExpected = thornsGolden.cases.find((row:{id:string})=>row.id===fixture.id)
      const groundExpected = groundGolden.cases.find((row:{id:string})=>row.id===fixture.id)
      const thinExpected = thinGolden.cases.find((row:{id:string})=>row.id===fixture.id)
      const enemyActionsExpected = enemyActionsGolden.cases.find((row:{id:string})=>row.id===fixture.id)
      const raiseTwoExpected = raiseTwoGolden.cases.find((row:{id:string})=>row.id===fixture.id)
      const funnelExpected = funnelGolden.cases.find((row:{id:string})=>row.id===fixture.id)
      const firstLevelExpected = firstLevelGolden.cases.find((row:{id:string})=>row.id===fixture.id)
      const orphanageLighterExpected = orphanageLighterGolden.cases.find((row:{id:string})=>row.id===fixture.id)
      const peddlersVestExpected = peddlersVestGolden.cases.find((row:{id:string})=>row.id===fixture.id)
      const openingDraftExpected = openingDraftGolden.cases.find((row:{id:string})=>row.id===fixture.id)
      const afflictionsExpected = afflictionsGolden.cases.find((row:{id:string})=>row.id===fixture.id)
      const badgeRulesExpected = badgeRulesGolden.cases.find((row:{id:string})=>row.id===fixture.id)
      const orphanageArrivalsExpected = orphanageArrivalsGolden.cases.find((row:{id:string})=>row.id===fixture.id)
      const ghostColdExpected = ghostColdGolden.cases.find((row:{id:string})=>row.id===fixture.id)
      const resistOneWayExpected = resistOneWayGolden.cases.find((row:{id:string})=>row.id===fixture.id)
      const kiteAloneExpected = kiteAloneGolden.cases.find((row:{id:string})=>row.id===fixture.id)
      const bridgeDeckExpected = bridgeDeckGolden.cases.find((row:{id:string})=>row.id===fixture.id)
      const orphansKnifeExpected = orphansKnifeGolden.cases.find((row:{id:string})=>row.id===fixture.id)
      const afflictionsAtZeroRuleExpected = afflictionsAtZeroRuleGolden.cases.find((row:{id:string})=>row.id===fixture.id)
      const startingKitPowersExpected = startingKitPowersGolden.cases.find((row:{id:string})=>row.id===fixture.id)
      const fireImpBurnExpected = fireImpBurnGolden.cases.find((row:{id:string})=>row.id===fixture.id)
      const impBlastTunedExpected = impBlastTunedGolden.cases.find((row:{id:string})=>row.id===fixture.id)
      const combineCiviliansKitExpected = combineCiviliansKitGolden.cases.find((row:{id:string})=>row.id===fixture.id)
      const burstPaintsGroundExpected = burstPaintsGroundGolden.cases.find((row:{id:string})=>row.id===fixture.id)
      const freeAttackExpected = freeAttackGolden.cases.find((row:{id:string})=>row.id===fixture.id)
      const counterattackExpected = counterattackGolden.cases.find((row:{id:string})=>row.id===fixture.id)
      const classGroundExpected = classGroundGolden.cases.find((row:{id:string})=>row.id===fixture.id)
      const triggerIdsExpected = triggerIdsGolden.cases.find((row:{id:string})=>row.id===fixture.id)
      const ownAreaExpected = ownAreaGolden.cases.find((row:{id:string})=>row.id===fixture.id)
      const closerStartExpected = closerStartGolden.cases.find((row:{id:string})=>row.id===fixture.id)
      const probeCadenceExpected = probeCadenceGolden.cases.find((row:{id:string})=>row.id===fixture.id)
      const afflictionWordsExpected = afflictionWordsGolden.cases.find((row:{id:string})=>row.id===fixture.id)
      const combineFreeAttackExpected = combineFreeAttackGolden.cases.find((row:{id:string})=>row.id===fixture.id)
      const longswordLosesStabExpected = longswordLosesStabGolden.cases.find((row:{id:string})=>row.id===fixture.id)
      const enchantTriggersOwnWeaponExpected = enchantTriggersOwnWeaponGolden.cases.find((row:{id:string})=>row.id===fixture.id)
      const walkedUnitHasMovedExpected = walkedUnitHasMovedGolden.cases.find((row:{id:string})=>row.id===fixture.id)
      const unitTriggerWithTagExpected = unitTriggerWithTagGolden.cases.find((row:{id:string})=>row.id===fixture.id)
      const kitAttackClausesExpected = kitAttackClausesGolden.cases.find((row:{id:string})=>row.id===fixture.id)
      const shieldsReauthoredExpected = shieldsReauthoredGolden.cases.find((row:{id:string})=>row.id===fixture.id)
      const greatswordWarAxeReauthoredExpected = greatswordWarAxeReauthoredGolden.cases.find((row:{id:string})=>row.id===fixture.id)
      const enchantStatsOnWeaponExpected = enchantStatsOnWeaponGolden.cases.find((row:{id:string})=>row.id===fixture.id)
      const counterattackReplacedAndLostExpected = counterattackReplacedAndLostGolden.cases.find((row:{id:string})=>row.id===fixture.id)
      const freeAttackAccuracyExpected = freeAttackAccuracyGolden.cases.find((row:{id:string})=>row.id===fixture.id)
      const computerReachesClassPowerExpected = computerReachesClassPowerGolden.cases.find((row:{id:string})=>row.id===fixture.id)
      const lumberjackGravesCursedExpected = lumberjackGravesCursedGolden.cases.find((row:{id:string})=>row.id===fixture.id)
      const effectLastsActivationsExpected = effectLastsActivationsGolden.cases.find((row:{id:string})=>row.id===fixture.id)
      const damageFromTwoStatsExpected = damageFromTwoStatsGolden.cases.find((row:{id:string})=>row.id===fixture.id)
      const heroOriginBadgesExpected = heroOriginBadgesGolden.cases.find((row:{id:string})=>row.id===fixture.id)
      const summonsExpected = summonsGolden.cases.find((row:{id:string})=>row.id===fixture.id)
      const setBonusExpected = setBonusGolden.cases.find((row:{id:string})=>row.id===fixture.id)
      const raiseLowerMagicExpected = raiseLowerMagicGolden.cases.find((row:{id:string})=>row.id===fixture.id)
      const hisWeaponsSmallClausesExpected = hisWeaponsSmallClausesGolden.cases.find((row:{id:string})=>row.id===fixture.id)
      const plantedBannersExpected = plantedBannersGolden.cases.find((row:{id:string})=>row.id===fixture.id)
      const placedTrapsExpected = placedTrapsGolden.cases.find((row:{id:string})=>row.id===fixture.id)
      const stabiliseDownedAllyExpected = stabiliseDownedAllyGolden.cases.find((row:{id:string})=>row.id===fixture.id)
      const proneOnlyStandUpExpected = proneOnlyStandUpGolden.cases.find((row:{id:string})=>row.id===fixture.id)
      const dwarfElfFeyBadgesActExpected = dwarfElfFeyBadgesActGolden.cases.find((row:{id:string})=>row.id===fixture.id)
      const computerAvoidsOwnTrapsExpected = computerAvoidsOwnTrapsGolden.cases.find((row:{id:string})=>row.id===fixture.id)
      const surgeIsAtLeastLevelExpected = surgeIsAtLeastLevelGolden.cases.find((row:{id:string})=>row.id===fixture.id)
      const surgeIsAtLeastLevelMoved = surgeIsAtLeastLevelExpected?.changed === true
      // was: const computerAvoidsOwnTrapsMoved = computerAvoidsOwnTrapsExpected?.changed === true — a case rule.surge-is-at-least-level moved skips this layer too (rule.surge-is-at-least-level 2026-10-04)
      const computerAvoidsOwnTrapsMoved = computerAvoidsOwnTrapsExpected?.changed === true || surgeIsAtLeastLevelMoved
      // was: const dwarfElfFeyBadgesActMoved = dwarfElfFeyBadgesActExpected?.changed === true — a case group A: content.sets-count-holy-texts-and-heavy-chain, content.resistance-to-weak-and-vigil-party-spirit, rule.computer-avoids-own-traps moved skips this layer too (group A: content.sets-count-holy-texts-and-heavy-chain, content.resistance-to-weak-and-vigil-party-spirit, rule.computer-avoids-own-traps 2026-10-04)
      const dwarfElfFeyBadgesActMoved = dwarfElfFeyBadgesActExpected?.changed === true || computerAvoidsOwnTrapsMoved
      // was: const proneOnlyStandUpMoved = proneOnlyStandUpExpected?.changed === true — a case content.dwarf-elf-fey-badges-act moved skips this layer too (content.dwarf-elf-fey-badges-act 2026-10-04)
      const proneOnlyStandUpMoved = proneOnlyStandUpExpected?.changed === true || dwarfElfFeyBadgesActMoved
      // was: const stabiliseDownedAllyMoved = stabiliseDownedAllyExpected?.changed === true — a case rule.prone-only-stand-up moved skips this layer too (rule.prone-only-stand-up 2026-10-05; combine 2026-10-05: it sat on planted-banners in its own copy, and sits on the newest layer here)
      const stabiliseDownedAllyMoved = stabiliseDownedAllyExpected?.changed === true || proneOnlyStandUpMoved
      // was: const placedTrapsMoved = placedTrapsExpected?.changed === true — a case capability.stabilise-downed-ally moved skips this layer too (capability.stabilise-downed-ally 2026-10-04)
      const placedTrapsMoved = placedTrapsExpected?.changed === true || stabiliseDownedAllyMoved
      // was: const plantedBannersMoved = plantedBannersExpected?.changed === true — a case capability.placed-traps moved skips this layer too (capability.placed-traps 2026-10-04)
      const plantedBannersMoved = plantedBannersExpected?.changed === true || placedTrapsMoved
      // was: const hisWeaponsSmallClausesMoved = hisWeaponsSmallClausesExpected?.changed === true — a case capability.planted-banners moved skips this layer too (capability.planted-banners 2026-10-04)
      const hisWeaponsSmallClausesMoved = hisWeaponsSmallClausesExpected?.changed === true || plantedBannersMoved
      // was: const raiseLowerMagicMoved = raiseLowerMagicExpected?.changed === true — a case capability.his-weapons-small-clauses moved skips this layer too (capability.his-weapons-small-clauses 2026-10-04)
      const raiseLowerMagicMoved = raiseLowerMagicExpected?.changed === true || hisWeaponsSmallClausesMoved
      // was: const setBonusMoved = setBonusExpected?.changed === true — a case capability.raise-lower-magic moved skips this layer too (capability.raise-lower-magic 2026-10-04)
      const setBonusMoved = setBonusExpected?.changed === true || raiseLowerMagicMoved
      // was: const summonsMoved = summonsExpected?.changed === true — a case capability.set-bonus moved skips this layer too (capability.set-bonus 2026-10-04)
      const summonsMoved = summonsExpected?.changed === true || setBonusMoved
      // was: const heroOriginBadgesMoved = heroOriginBadgesExpected?.changed === true — a case capability.summons moved skips this layer too (capability.summons 2026-10-04)
      const heroOriginBadgesMoved = heroOriginBadgesExpected?.changed === true || summonsMoved
      // was: const damageFromTwoStatsMoved = damageFromTwoStatsExpected?.changed === true — a case content.hero-origin-badges moved skips this layer too (content.hero-origin-badges 2026-10-04)
      const damageFromTwoStatsMoved = damageFromTwoStatsExpected?.changed === true || heroOriginBadgesMoved
      // was: const effectLastsActivationsMoved = effectLastsActivationsExpected?.changed === true — a case capability.damage-from-two-stats moved skips this layer too (capability.damage-from-two-stats 2026-10-04)
      const effectLastsActivationsMoved = effectLastsActivationsExpected?.changed === true || damageFromTwoStatsMoved
      // was: const lumberjackGravesCursedMoved = lumberjackGravesCursedExpected?.changed === true — a case capability.effect-lasts-activations moved skips this layer too (capability.effect-lasts-activations 2026-10-04)
      const lumberjackGravesCursedMoved = lumberjackGravesCursedExpected?.changed === true || effectLastsActivationsMoved
      // was: const computerReachesClassPowerMoved = computerReachesClassPowerExpected?.changed === true — a case content.orphanage-body-and-graves-cursed moved skips this layer too (content.orphanage-body-and-graves-cursed 2026-10-04)
      const computerReachesClassPowerMoved = computerReachesClassPowerExpected?.changed === true || lumberjackGravesCursedMoved
      // was: const freeAttackAccuracyMoved = freeAttackAccuracyExpected?.changed === true — a case fix.computer-reaches-class-power-past-shield-power moved skips this layer too (fix.computer-reaches-class-power-past-shield-power 2026-10-04)
      const freeAttackAccuracyMoved = freeAttackAccuracyExpected?.changed === true || computerReachesClassPowerMoved
      // was: const counterattackReplacedAndLostMoved = counterattackReplacedAndLostExpected?.changed === true — a case capability.free-attack-accuracy moved skips this layer too (capability.free-attack-accuracy 2026-10-04)
      const counterattackReplacedAndLostMoved = counterattackReplacedAndLostExpected?.changed === true || freeAttackAccuracyMoved
      // was: const enchantStatsOnWeaponMoved = enchantStatsOnWeaponExpected?.changed === true — a case rule.counterattack-replaced-and-lost moved skips this layer too (rule.counterattack-replaced-and-lost 2026-10-04)
      const enchantStatsOnWeaponMoved = enchantStatsOnWeaponExpected?.changed === true || counterattackReplacedAndLostMoved
      // was: const greatswordWarAxeReauthoredMoved = greatswordWarAxeReauthoredExpected?.changed === true — a case fix.enchant-stats-on-weapon moved skips this layer too (fix.enchant-stats-on-weapon 2026-10-04)
      const greatswordWarAxeReauthoredMoved = greatswordWarAxeReauthoredExpected?.changed === true || enchantStatsOnWeaponMoved
      // was: const shieldsReauthoredMoved = shieldsReauthoredExpected?.changed === true — a case content.greatsword-war-axe-reauthored moved skips this layer too (content.greatsword-war-axe-reauthored 2026-10-04)
      const shieldsReauthoredMoved = shieldsReauthoredExpected?.changed === true || greatswordWarAxeReauthoredMoved
      // was: const kitAttackClausesMoved = kitAttackClausesExpected?.changed === true — a case content.shields-reauthored moved skips this layer too (content.shields-reauthored 2026-10-04)
      const kitAttackClausesMoved = kitAttackClausesExpected?.changed === true || shieldsReauthoredMoved
      // was: const unitTriggerWithTagMoved = unitTriggerWithTagExpected?.changed === true — a case fix.kit-attack-clauses moved skips this layer too (fix.kit-attack-clauses 2026-10-04)
      const unitTriggerWithTagMoved = unitTriggerWithTagExpected?.changed === true || kitAttackClausesMoved
      // was: const walkedUnitHasMovedMoved = walkedUnitHasMovedExpected?.changed === true — a case capability.unit-trigger-with-tag moved skips this layer too (capability.unit-trigger-with-tag 2026-10-04)
      const walkedUnitHasMovedMoved = walkedUnitHasMovedExpected?.changed === true || unitTriggerWithTagMoved
      // was: const enchantTriggersOwnWeaponMoved = enchantTriggersOwnWeaponExpected?.changed === true — a case rule.walked-unit-has-moved moved skips this layer too (rule.walked-unit-has-moved 2026-10-04)
      const enchantTriggersOwnWeaponMoved = enchantTriggersOwnWeaponExpected?.changed === true || walkedUnitHasMovedMoved
      // was: const longswordLosesStabMoved = longswordLosesStabExpected?.changed === true — a case fix.enchant-triggers-own-weapon moved skips this layer too (fix.enchant-triggers-own-weapon 2026-10-04)
      const longswordLosesStabMoved = longswordLosesStabExpected?.changed === true || enchantTriggersOwnWeaponMoved
      // was: const combineFreeAttackMoved = combineFreeAttackExpected?.changed === true — a case content.longsword-loses-stab moved skips this layer too (content.longsword-loses-stab 2026-10-04)
      const combineFreeAttackMoved = combineFreeAttackExpected?.changed === true || longswordLosesStabMoved
      // was: const afflictionWordsMoved = afflictionWordsExpected?.changed === true — a case the combined tree moved skips this layer too (combine 2026-10-04)
      const afflictionWordsMoved = afflictionWordsExpected?.changed === true || combineFreeAttackMoved
      // was: const probeCadenceMoved = probeCadenceExpected?.changed === true — a case fix.affliction-pop-up-words moved skips this layer too (fix.affliction-pop-up-words 2026-10-04)
      const probeCadenceMoved = probeCadenceExpected?.changed === true || afflictionWordsMoved
      // was: const closerStartMoved = closerStartExpected?.changed === true — a case fix.opening-probe-cadence moved skips this layer too (fix.opening-probe-cadence 2026-10-04)
      const closerStartMoved = closerStartExpected?.changed === true || probeCadenceMoved
      // was: const ownAreaMoved = ownAreaExpected?.changed === true — a case fix.opening-orphanage-closer-start moved skips this layer too (fix.opening-orphanage-closer-start 2026-10-04)
      const ownAreaMoved = ownAreaExpected?.changed === true || closerStartMoved
      // was: const combineCiviliansKitMoved = combineCiviliansKitExpected?.changed === true — a case fix.own-area-skips-owner moved skips this layer too (fix.own-area-skips-owner 2026-10-04)
      // (combine 2026-10-04: this copy's line here read `const combineCiviliansKitMoved = combineCiviliansKitExpected?.changed === true || ownAreaMoved` — master's three layers sit between; the line is master's, below)
      // (combine 2026-10-04, engine master eec6321: this copy's line here read `const counterattackMoved = counterattackExpected?.changed === true || ownAreaMoved` — master's two newer layers, class-ground and trigger-ids, sit between; the chain goes through them, below)
      // was: const triggerIdsMoved = triggerIdsExpected?.changed === true — a case this copy's four layers moved skips master's five too (combine 2026-10-04: master's layers sit under this copy's)
      const triggerIdsMoved = triggerIdsExpected?.changed === true || ownAreaMoved
      // was: const classGroundMoved = classGroundExpected?.changed === true — a trigger-ids-moved case skips the class-ground layer too (fix.trigger-ids-and-scopes 2026-10-04)
      const classGroundMoved = classGroundExpected?.changed === true || triggerIdsMoved
      // was: const counterattackMoved = counterattackExpected?.changed === true — a class-ground-moved case skips the counterattack layer too (fix.burst-ground-class-powers 2026-10-04)
      const counterattackMoved = counterattackExpected?.changed === true || classGroundMoved
      // was: const freeAttackMoved = freeAttackExpected?.changed === true — a counterattack-moved case skips the free-attack layer too (capability.counterattack-and-fend 2026-10-04)
      const freeAttackMoved = freeAttackExpected?.changed === true || counterattackMoved
      // was: const burstPaintsGroundMoved = burstPaintsGroundExpected?.changed === true — a free-attack-moved case skips the burst-paints-ground layer too (rule.free-attack-is-basic-attack 2026-10-04)
      const burstPaintsGroundMoved = burstPaintsGroundExpected?.changed === true || freeAttackMoved
      // was: const combineCiviliansKitMoved = combineCiviliansKitExpected?.changed === true — a burst-paints-ground-moved case skips the combine layer too (capability.burst-paints-ground 2026-10-04)
      const combineCiviliansKitMoved = combineCiviliansKitExpected?.changed === true || burstPaintsGroundMoved
      // was: const impBlastTunedMoved = impBlastTunedExpected?.changed === true — a case the combined tree moved skips the imp-blast-tuned layer too (combine 2026-10-04)
      const impBlastTunedMoved = impBlastTunedExpected?.changed === true || combineCiviliansKitMoved
      // was: const fireImpBurnMoved = fireImpBurnExpected?.changed === true — an imp-blast-tuned-moved case skips the fire-imp-burn layer too (content.imp-blast-tuned 2026-10-04)
      const fireImpBurnMoved = fireImpBurnExpected?.changed === true || impBlastTunedMoved
      // was: const startingKitPowersMoved = startingKitPowersExpected?.changed === true — a fire-imp-burn-moved case skips the starting-kit-powers layer too (fix.fire-imp-burn-spares-self 2026-10-04)
      const startingKitPowersMoved = startingKitPowersExpected?.changed === true || fireImpBurnMoved
      const civiliansKitExpected = civiliansKitGolden.cases.find((row:{id:string})=>row.id===fixture.id)
      // was: const civiliansKitMoved = civiliansKitExpected?.changed === true — a starting-kit-powers-moved case skips the civilians-field-kit layer too (combine 2026-10-04: master's layer sits under this copy's three)
      const civiliansKitMoved = civiliansKitExpected?.changed === true || startingKitPowersMoved
      // was: const afflictionsAtZeroRuleMoved = afflictionsAtZeroRuleExpected?.changed === true — a civilians-kit-moved case skips the afflictions-at-zero-rule layer too (fix.civilians-field-kit 2026-10-03)
      const afflictionsAtZeroRuleMoved = afflictionsAtZeroRuleExpected?.changed === true || civiliansKitMoved
      const openingLevelsExpected = openingLevelsGolden.cases.find((row:{id:string})=>row.id===fixture.id)
      // was: const openingLevelsMoved = openingLevelsExpected?.changed === true — an afflictions-at-zero-rule-moved case skips the opening-levels layer too (rule.afflictions-at-zero-refiled-2 2026-10-02)
      const openingLevelsMoved = openingLevelsExpected?.changed === true || afflictionsAtZeroRuleMoved
      // was: const orphansKnifeMoved = orphansKnifeExpected?.changed === true — an opening-levels-moved case skips the orphans-teacher-knife layer too (fix.opening-levels 2026-10-02)
      const orphansKnifeMoved = orphansKnifeExpected?.changed === true || openingLevelsMoved
      const oneHeroAssemblyExpected = oneHeroAssemblyGolden.cases.find((row:{id:string})=>row.id===fixture.id)
      // was: const oneHeroAssemblyMoved = oneHeroAssemblyExpected?.changed === true — an orphans-knife-moved case skips the one-hero-assembly layer too (fix.orphans-teacher-knife 2026-10-02)
      const oneHeroAssemblyMoved = oneHeroAssemblyExpected?.changed === true || orphansKnifeMoved
      // was: const bridgeDeckMoved = bridgeDeckExpected?.changed === true — a one-hero-assembly-moved case skips the bridge-deck layer too (fix.one-hero-assembly 2026-10-02)
      const bridgeDeckMoved = bridgeDeckExpected?.changed === true || oneHeroAssemblyMoved
      const afflictionsAtZeroExpected = afflictionsAtZeroGolden.cases.find((row:{id:string})=>row.id===fixture.id)
      // was: const afflictionsAtZeroMoved = afflictionsAtZeroExpected?.changed === true — a bridge-deck-moved case skips the afflictions-at-zero layer too (content.bridge-deck-pack 2026-10-01)
      const afflictionsAtZeroMoved = afflictionsAtZeroExpected?.changed === true || bridgeDeckMoved
      const codexNumbersExpected = codexNumbersGolden.cases.find((row:{id:string})=>row.id===fixture.id)
      const fireImpFlightExpected = fireImpFlightGolden.cases.find((row:{id:string})=>row.id===fixture.id)
      const oneEffectExpected = oneEffectGolden.cases.find((row:{id:string})=>row.id===fixture.id)
      const turnModsExpected = turnModsGolden.cases.find((row:{id:string})=>row.id===fixture.id)
      // was: const turnModsMoved = turnModsExpected?.changed === true — an afflictions-at-zero-moved case skips the turn-mods layer too (content.afflictions-at-zero 2026-10-01)
      const turnModsMoved = turnModsExpected?.changed === true || afflictionsAtZeroMoved
      // was: const oneEffectMoved = oneEffectExpected?.changed === true — a turn-mods-moved case skips the one-effect layer too (fix.turn-mods-expire 2026-10-01)
      const oneEffectMoved = oneEffectExpected?.changed === true || turnModsMoved
      // was: const codexNumbersMoved = codexNumbersExpected?.changed === true — a one-effect-moved case skips the codex-numbers layer too (fix.one-effect-vocabulary 2026-10-01)
      const codexNumbersMoved = codexNumbersExpected?.changed === true || oneEffectMoved
      // was: const fireImpFlightMoved = fireImpFlightExpected?.changed === true — a codex-numbers-moved case skips the fire-imp-flight layer too (fix.codex-numbers 2026-10-01)
      const fireImpFlightMoved = fireImpFlightExpected?.changed === true || codexNumbersMoved
      // was: const kiteAloneMoved = kiteAloneExpected?.changed === true — a fire-imp-flight-moved case skips the kite-alone layer too (content.fire-imp-flight 2026-10-01)
      const kiteAloneMoved = kiteAloneExpected?.changed === true || fireImpFlightMoved
      // was: const resistOneWayMoved = resistOneWayExpected?.changed === true — a kite-alone-moved case skips the resist-one-way layer too (encounter.opening.bridge-ai 2026-09-30)
      const resistOneWayMoved = resistOneWayExpected?.changed === true || kiteAloneMoved
      // was: const ghostColdMoved = ghostColdExpected?.changed === true — a resist-one-way-moved case skips the ghost-cold layer too (rule.immunity-is-resistance 2026-09-29)
      const ghostColdMoved = ghostColdExpected?.changed === true || resistOneWayMoved
      // was: const orphanageArrivalsMoved = orphanageArrivalsExpected?.changed === true — a ghost-cold-moved case skips the orphanage-arrivals layer too (content.ghost 2026-09-29)
      const orphanageArrivalsMoved = orphanageArrivalsExpected?.changed === true || ghostColdMoved
      // was: const badgeRulesMoved = badgeRulesExpected?.changed === true — an orphanage-arrivals-moved case skips the badge-rules layer too (fix.opening-orphanage-arrivals 2026-09-29)
      const badgeRulesMoved = badgeRulesExpected?.changed === true || orphanageArrivalsMoved
      // was: const afflictionsMoved = afflictionsExpected?.changed === true — a badge-rules-moved case skips the afflictions layer too (rule.badge-immunity 2026-09-29)
      const afflictionsMoved = afflictionsExpected?.changed === true || badgeRulesMoved
      // was: const openingDraftMoved = openingDraftExpected?.changed === true — an afflictions-moved case skips the opening-draft layer too (content.afflictions-revised 2026-09-29)
      const openingDraftMoved = openingDraftExpected?.changed === true || afflictionsMoved
      // was: const peddlersVestMoved = peddlersVestExpected?.changed === true — an opening-draft-moved case skips the peddlers-vest layer too (fix.opening-draft 2026-09-29)
      const peddlersVestMoved = peddlersVestExpected?.changed === true || openingDraftMoved
      // was: const orphanageLighterMoved = orphanageLighterExpected?.changed === true — a peddlers-vest-moved case skips the orphanage-lighter layer too (content.peddlers-vest 2026-09-29)
      const orphanageLighterMoved = orphanageLighterExpected?.changed === true || peddlersVestMoved
      // was: const firstLevelMoved = firstLevelExpected?.changed === true — an orphanage-lighter-moved case skips the first-level layer too (fix.opening-orphanage-lighter 2026-09-29)
      const firstLevelMoved = firstLevelExpected?.changed === true || orphanageLighterMoved
      const partyExpected = partyGolden.cases.find((row:{id:string})=>row.id===fixture.id)
      // was: const partyMoved = partyExpected?.changed === true — a first-level-moved case skips the party layer too (fix.opening-first-level 2026-09-29)
      const partyMoved = partyExpected?.changed === true || firstLevelMoved
      // was: const funnelMoved = funnelExpected?.changed === true — a party-moved case skips the funnel layer too (fix.opening-party 2026-09-29)
      const funnelMoved = funnelExpected?.changed === true || partyMoved
      // was: const raiseTwoMoved = raiseTwoExpected?.changed === true — a funnel-moved case skips the raise-two layer too (fix.funnel-goldens 2026-09-29)
      const raiseTwoMoved = raiseTwoExpected?.changed === true || funnelMoved
      const surgeSpendExpected = surgeSpendGolden.cases.find((row:{id:string})=>row.id===fixture.id)
      // fix.raise-two-cursor (2026-09-28): a raise-two-moved case skips the surge-spend layer too
      const surgeSpendMoved = surgeSpendExpected?.changed === true || raiseTwoMoved
      const zocExpected = zocGolden.cases.find((row:{id:string})=>row.id===fixture.id)
      // was: const zocMoved = zocExpected?.changed === true — a surge-spend-moved case skips the zoc layer too (fix.surge-spend 2026-09-28)
      const zocMoved = zocExpected?.changed === true || surgeSpendMoved
      const chargeExpected = chargeGolden.cases.find((row:{id:string})=>row.id===fixture.id)
      // was: const chargeMoved = chargeExpected?.changed === true — a zoc-moved case skips the charge layer too (capability.move-ignores-zoc 2026-09-28)
      const chargeMoved = chargeExpected?.changed === true || zocMoved
      const accuracyModExpected = accuracyModGolden.cases.find((row:{id:string})=>row.id===fixture.id)
      // was: const accuracyModMoved = accuracyModExpected?.changed === true — a charge-moved case skips the accuracy-mod layer too (capability.charge 2026-09-27)
      const accuracyModMoved = accuracyModExpected?.changed === true || chargeMoved
      // was: const enemyActionsMoved = enemyActionsExpected?.changed === true — an accuracy-mod-moved case skips the enemy-actions layer too (fix.enemy-accuracy-mod 2026-09-27)
      const enemyActionsMoved = enemyActionsExpected?.changed === true || accuracyModMoved
      const wornExpected = wornGolden.cases.find((row:{id:string})=>row.id===fixture.id)
      // was: const wornMoved = wornExpected?.changed === true — an enemy-actions-moved case skips the worn layer too (pack.enemy-actions 2026-09-26)
      const wornMoved = wornExpected?.changed === true || enemyActionsMoved
      // was: const thinMoved = thinExpected?.changed === true — a worn-moved case skips the thin layer too
      const thinMoved = thinExpected?.changed === true || wornMoved
      const groundMoved = groundExpected?.changed === true || thinMoved
      const thornsMoved = thornsExpected?.changed === true || groundMoved
      const kdbMoved = kdbExpected?.changed === true || thornsMoved
      const knockMoved = knockExpected?.changed === true || kdbMoved
      const shieldMoved = shieldExpected?.changed === true || knockMoved
      const migrated = shieldMoved || burstExpected?.changed === true || packetExpected?.semanticChanged === true || protectionExpected?.changed === true || elementalExpected?.changed === true || contactExpected?.changed === true
      const prior = migrated ? undefined : historical ?? identityGolden.cases.find((row: { id: string }) => row.id === fixture.id)
      const eventExpected = migrated ? undefined : eventGolden.cases.find((row: { id: string }) => row.id === fixture.id)
      let expected = groundMoved ? undefined : (thornsMoved ? thornsExpected : undefined) ?? (kdbMoved ? kdbExpected : undefined) ?? (knockMoved ? knockExpected : undefined) ?? (shieldMoved ? shieldExpected : undefined) ?? burstExpected ?? packetExpected ?? protectionExpected ?? elementalExpected ?? contactExpected ?? propGolden.cases.find((row: { id: string }) => row.id === fixture.id)
      for (const suspended of [false, true]) {
        const ctx = fixture.create()
        let result
        if (suspended) {
          while (true) {
            const next = battle.advanceBattle(ctx)
            if (next.kind === 'complete') { result = next.result; break }
            // No hidden iterator/closure: the cursor can round-trip at every yield.
            ctx.battleCursor = JSON.parse(JSON.stringify(ctx.battleCursor))
            runActivation(ctx, next.actor)
            battle.completeActionCycle(ctx)
          }
        } else result = battle.runBattle(ctx)
        if (surgeIsAtLeastLevelExpected) {
        expect(hash(ctx.events), 'full surge-is-at-least-level events').toBe(surgeIsAtLeastLevelExpected.events)
        expect(hash(ctx.state), 'full surge-is-at-least-level state').toBe(surgeIsAtLeastLevelExpected.state)
        expect(hash(ctx.rng.log), 'full surge-is-at-least-level RNG').toBe(surgeIsAtLeastLevelExpected.rng)
        expect(result).toEqual(surgeIsAtLeastLevelExpected.result)
        }
        // was: if (computerAvoidsOwnTrapsExpected) { — rule.surge-is-at-least-level (2026-10-04): a case it moved is checked above instead
        if (computerAvoidsOwnTrapsExpected && !surgeIsAtLeastLevelMoved) {
        expect(hash(ctx.events), 'full computer-avoids-own-traps events').toBe(computerAvoidsOwnTrapsExpected.events)
        expect(hash(ctx.state), 'full computer-avoids-own-traps state').toBe(computerAvoidsOwnTrapsExpected.state)
        expect(hash(ctx.rng.log), 'full computer-avoids-own-traps RNG').toBe(computerAvoidsOwnTrapsExpected.rng)
        expect(result).toEqual(computerAvoidsOwnTrapsExpected.result)
        }
        // was: if (dwarfElfFeyBadgesActExpected) { — group A: content.sets-count-holy-texts-and-heavy-chain, content.resistance-to-weak-and-vigil-party-spirit, rule.computer-avoids-own-traps (2026-10-04): a case it moved is checked above instead
        if (dwarfElfFeyBadgesActExpected && !computerAvoidsOwnTrapsMoved) {
        expect(hash(ctx.events), 'full dwarf-elf-fey-badges-act events').toBe(dwarfElfFeyBadgesActExpected.events)
        expect(hash(ctx.state), 'full dwarf-elf-fey-badges-act state').toBe(dwarfElfFeyBadgesActExpected.state)
        expect(hash(ctx.rng.log), 'full dwarf-elf-fey-badges-act RNG').toBe(dwarfElfFeyBadgesActExpected.rng)
        expect(result).toEqual(dwarfElfFeyBadgesActExpected.result)
        }
        // was: if (proneOnlyStandUpExpected) { — content.dwarf-elf-fey-badges-act (2026-10-04): a case it moved is checked above instead
        if (proneOnlyStandUpExpected && !dwarfElfFeyBadgesActMoved) {
        expect(hash(ctx.events), 'full prone-only-stand-up events').toBe(proneOnlyStandUpExpected.events)
        expect(hash(ctx.state), 'full prone-only-stand-up state').toBe(proneOnlyStandUpExpected.state)
        expect(hash(ctx.rng.log), 'full prone-only-stand-up RNG').toBe(proneOnlyStandUpExpected.rng)
        expect(result).toEqual(proneOnlyStandUpExpected.result)
        }
        // was: if (stabiliseDownedAllyExpected) { — rule.prone-only-stand-up (2026-10-05): a case it moved is checked above instead
        if (stabiliseDownedAllyExpected && !proneOnlyStandUpMoved) {
        expect(hash(ctx.events), 'full stabilise-downed-ally events').toBe(stabiliseDownedAllyExpected.events)
        expect(hash(ctx.state), 'full stabilise-downed-ally state').toBe(stabiliseDownedAllyExpected.state)
        expect(hash(ctx.rng.log), 'full stabilise-downed-ally RNG').toBe(stabiliseDownedAllyExpected.rng)
        expect(result).toEqual(stabiliseDownedAllyExpected.result)
        }
        // was: if (placedTrapsExpected) { — capability.stabilise-downed-ally (2026-10-04): a case it moved is checked above instead
        if (placedTrapsExpected && !stabiliseDownedAllyMoved) {
        expect(hash(ctx.events), 'full placed-traps events').toBe(placedTrapsExpected.events)
        expect(hash(ctx.state), 'full placed-traps state').toBe(placedTrapsExpected.state)
        expect(hash(ctx.rng.log), 'full placed-traps RNG').toBe(placedTrapsExpected.rng)
        expect(result).toEqual(placedTrapsExpected.result)
        }
        // was: if (plantedBannersExpected) { — capability.placed-traps (2026-10-04): a case it moved is checked above instead
        if (plantedBannersExpected && !placedTrapsMoved) {
        expect(hash(ctx.events), 'full planted-banners events').toBe(plantedBannersExpected.events)
        expect(hash(ctx.state), 'full planted-banners state').toBe(plantedBannersExpected.state)
        expect(hash(ctx.rng.log), 'full planted-banners RNG').toBe(plantedBannersExpected.rng)
        expect(result).toEqual(plantedBannersExpected.result)
        }
        // was: if (hisWeaponsSmallClausesExpected) { — capability.planted-banners (2026-10-04): a case it moved is checked above instead
        if (hisWeaponsSmallClausesExpected && !plantedBannersMoved) {
        expect(hash(ctx.events), 'full his-weapons-small-clauses events').toBe(hisWeaponsSmallClausesExpected.events)
        expect(hash(ctx.state), 'full his-weapons-small-clauses state').toBe(hisWeaponsSmallClausesExpected.state)
        expect(hash(ctx.rng.log), 'full his-weapons-small-clauses RNG').toBe(hisWeaponsSmallClausesExpected.rng)
        expect(result).toEqual(hisWeaponsSmallClausesExpected.result)
        }
        // was: if (raiseLowerMagicExpected) { — capability.his-weapons-small-clauses (2026-10-04): a case it moved is checked above instead
        if (raiseLowerMagicExpected && !hisWeaponsSmallClausesMoved) {
        expect(hash(ctx.events), 'full raise-lower-magic events').toBe(raiseLowerMagicExpected.events)
        expect(hash(ctx.state), 'full raise-lower-magic state').toBe(raiseLowerMagicExpected.state)
        expect(hash(ctx.rng.log), 'full raise-lower-magic RNG').toBe(raiseLowerMagicExpected.rng)
        expect(result).toEqual(raiseLowerMagicExpected.result)
        }
        // was: if (setBonusExpected) { — capability.raise-lower-magic (2026-10-04): a case it moved is checked above instead
        if (setBonusExpected && !raiseLowerMagicMoved) {
        expect(hash(ctx.events), 'full set-bonus events').toBe(setBonusExpected.events)
        expect(hash(ctx.state), 'full set-bonus state').toBe(setBonusExpected.state)
        expect(hash(ctx.rng.log), 'full set-bonus RNG').toBe(setBonusExpected.rng)
        expect(result).toEqual(setBonusExpected.result)
        }
        // was: if (summonsExpected) { — capability.set-bonus (2026-10-04): a case it moved is checked above instead
        if (summonsExpected && !setBonusMoved) {
        expect(hash(ctx.events), 'full summons events').toBe(summonsExpected.events)
        expect(hash(ctx.state), 'full summons state').toBe(summonsExpected.state)
        expect(hash(ctx.rng.log), 'full summons RNG').toBe(summonsExpected.rng)
        expect(result).toEqual(summonsExpected.result)
        }
        // was: if (heroOriginBadgesExpected) { — capability.summons (2026-10-04): a case it moved is checked above instead
        if (heroOriginBadgesExpected && !summonsMoved) {
        expect(hash(ctx.events), 'full hero-origin-badges events').toBe(heroOriginBadgesExpected.events)
        expect(hash(ctx.state), 'full hero-origin-badges state').toBe(heroOriginBadgesExpected.state)
        expect(hash(ctx.rng.log), 'full hero-origin-badges RNG').toBe(heroOriginBadgesExpected.rng)
        expect(result).toEqual(heroOriginBadgesExpected.result)
        }
        // was: if (damageFromTwoStatsExpected) { — content.hero-origin-badges (2026-10-04): a case it moved is checked above instead
        if (damageFromTwoStatsExpected && !heroOriginBadgesMoved) {
        expect(hash(ctx.events), 'full damage-from-two-stats events').toBe(damageFromTwoStatsExpected.events)
        expect(hash(ctx.state), 'full damage-from-two-stats state').toBe(damageFromTwoStatsExpected.state)
        expect(hash(ctx.rng.log), 'full damage-from-two-stats RNG').toBe(damageFromTwoStatsExpected.rng)
        expect(result).toEqual(damageFromTwoStatsExpected.result)
        }
        // was: if (effectLastsActivationsExpected) { — capability.damage-from-two-stats (2026-10-04): a case it moved is checked above instead
        if (effectLastsActivationsExpected && !damageFromTwoStatsMoved) {
        expect(hash(ctx.events), 'full effect-lasts-activations events').toBe(effectLastsActivationsExpected.events)
        expect(hash(ctx.state), 'full effect-lasts-activations state').toBe(effectLastsActivationsExpected.state)
        expect(hash(ctx.rng.log), 'full effect-lasts-activations RNG').toBe(effectLastsActivationsExpected.rng)
        expect(result).toEqual(effectLastsActivationsExpected.result)
        }
        // was: if (lumberjackGravesCursedExpected) { — capability.effect-lasts-activations (2026-10-04): a case it moved is checked above instead
        if (lumberjackGravesCursedExpected && !effectLastsActivationsMoved) {
        expect(hash(ctx.events), 'full lumberjack-graves-cursed events').toBe(lumberjackGravesCursedExpected.events)
        expect(hash(ctx.state), 'full lumberjack-graves-cursed state').toBe(lumberjackGravesCursedExpected.state)
        expect(hash(ctx.rng.log), 'full lumberjack-graves-cursed RNG').toBe(lumberjackGravesCursedExpected.rng)
        expect(result).toEqual(lumberjackGravesCursedExpected.result)
        }
        // was: if (computerReachesClassPowerExpected) { — content.orphanage-body-and-graves-cursed (2026-10-04): a case it moved is checked above instead
        if (computerReachesClassPowerExpected && !lumberjackGravesCursedMoved) {
        expect(hash(ctx.events), 'full computer-reaches-class-power events').toBe(computerReachesClassPowerExpected.events)
        expect(hash(ctx.state), 'full computer-reaches-class-power state').toBe(computerReachesClassPowerExpected.state)
        expect(hash(ctx.rng.log), 'full computer-reaches-class-power RNG').toBe(computerReachesClassPowerExpected.rng)
        expect(result).toEqual(computerReachesClassPowerExpected.result)
        }
        // was: if (freeAttackAccuracyExpected) { — fix.computer-reaches-class-power-past-shield-power (2026-10-04): a case it moved is checked above instead
        if (freeAttackAccuracyExpected && !computerReachesClassPowerMoved) {
        expect(hash(ctx.events), 'full free-attack-accuracy events').toBe(freeAttackAccuracyExpected.events)
        expect(hash(ctx.state), 'full free-attack-accuracy state').toBe(freeAttackAccuracyExpected.state)
        expect(hash(ctx.rng.log), 'full free-attack-accuracy RNG').toBe(freeAttackAccuracyExpected.rng)
        expect(result).toEqual(freeAttackAccuracyExpected.result)
        }
        // was: if (counterattackReplacedAndLostExpected) { — capability.free-attack-accuracy (2026-10-04): a case it moved is checked above instead
        if (counterattackReplacedAndLostExpected && !freeAttackAccuracyMoved) {
        expect(hash(ctx.events), 'full counterattack-replaced-and-lost events').toBe(counterattackReplacedAndLostExpected.events)
        expect(hash(ctx.state), 'full counterattack-replaced-and-lost state').toBe(counterattackReplacedAndLostExpected.state)
        expect(hash(ctx.rng.log), 'full counterattack-replaced-and-lost RNG').toBe(counterattackReplacedAndLostExpected.rng)
        expect(result).toEqual(counterattackReplacedAndLostExpected.result)
        }
        // was: if (enchantStatsOnWeaponExpected) { — rule.counterattack-replaced-and-lost (2026-10-04): a case it moved is checked above instead
        if (enchantStatsOnWeaponExpected && !counterattackReplacedAndLostMoved) {
        expect(hash(ctx.events), 'full enchant-stats-on-weapon events').toBe(enchantStatsOnWeaponExpected.events)
        expect(hash(ctx.state), 'full enchant-stats-on-weapon state').toBe(enchantStatsOnWeaponExpected.state)
        expect(hash(ctx.rng.log), 'full enchant-stats-on-weapon RNG').toBe(enchantStatsOnWeaponExpected.rng)
        expect(result).toEqual(enchantStatsOnWeaponExpected.result)
        }
        // was: if (greatswordWarAxeReauthoredExpected) { — fix.enchant-stats-on-weapon (2026-10-04): a case it moved is checked above instead
        if (greatswordWarAxeReauthoredExpected && !enchantStatsOnWeaponMoved) {
        expect(hash(ctx.events), 'full greatsword-war-axe-reauthored events').toBe(greatswordWarAxeReauthoredExpected.events)
        expect(hash(ctx.state), 'full greatsword-war-axe-reauthored state').toBe(greatswordWarAxeReauthoredExpected.state)
        expect(hash(ctx.rng.log), 'full greatsword-war-axe-reauthored RNG').toBe(greatswordWarAxeReauthoredExpected.rng)
        expect(result).toEqual(greatswordWarAxeReauthoredExpected.result)
        }
        // was: if (shieldsReauthoredExpected) { — content.greatsword-war-axe-reauthored (2026-10-04): a case it moved is checked above instead
        if (shieldsReauthoredExpected && !greatswordWarAxeReauthoredMoved) {
        expect(hash(ctx.events), 'full shields-reauthored events').toBe(shieldsReauthoredExpected.events)
        expect(hash(ctx.state), 'full shields-reauthored state').toBe(shieldsReauthoredExpected.state)
        expect(hash(ctx.rng.log), 'full shields-reauthored RNG').toBe(shieldsReauthoredExpected.rng)
        expect(result).toEqual(shieldsReauthoredExpected.result)
        }
        // was: if (kitAttackClausesExpected) { — content.shields-reauthored (2026-10-04): a case it moved is checked above instead
        if (kitAttackClausesExpected && !shieldsReauthoredMoved) {
        expect(hash(ctx.events), 'full kit-attack-clauses events').toBe(kitAttackClausesExpected.events)
        expect(hash(ctx.state), 'full kit-attack-clauses state').toBe(kitAttackClausesExpected.state)
        expect(hash(ctx.rng.log), 'full kit-attack-clauses RNG').toBe(kitAttackClausesExpected.rng)
        expect(result).toEqual(kitAttackClausesExpected.result)
        }
        // was: if (unitTriggerWithTagExpected) { — fix.kit-attack-clauses (2026-10-04): a case it moved is checked above instead
        if (unitTriggerWithTagExpected && !kitAttackClausesMoved) {
        expect(hash(ctx.events), 'full unit-trigger-with-tag events').toBe(unitTriggerWithTagExpected.events)
        expect(hash(ctx.state), 'full unit-trigger-with-tag state').toBe(unitTriggerWithTagExpected.state)
        expect(hash(ctx.rng.log), 'full unit-trigger-with-tag RNG').toBe(unitTriggerWithTagExpected.rng)
        expect(result).toEqual(unitTriggerWithTagExpected.result)
        }
        // was: if (walkedUnitHasMovedExpected) { — capability.unit-trigger-with-tag (2026-10-04): a case it moved is checked above instead
        if (walkedUnitHasMovedExpected && !unitTriggerWithTagMoved) {
        expect(hash(ctx.events), 'full walked-unit-has-moved events').toBe(walkedUnitHasMovedExpected.events)
        expect(hash(ctx.state), 'full walked-unit-has-moved state').toBe(walkedUnitHasMovedExpected.state)
        expect(hash(ctx.rng.log), 'full walked-unit-has-moved RNG').toBe(walkedUnitHasMovedExpected.rng)
        expect(result).toEqual(walkedUnitHasMovedExpected.result)
        }
        // was: if (enchantTriggersOwnWeaponExpected) { — rule.walked-unit-has-moved (2026-10-04): a case it moved is checked above instead
        if (enchantTriggersOwnWeaponExpected && !walkedUnitHasMovedMoved) {
        expect(hash(ctx.events), 'full enchant-triggers-own-weapon events').toBe(enchantTriggersOwnWeaponExpected.events)
        expect(hash(ctx.state), 'full enchant-triggers-own-weapon state').toBe(enchantTriggersOwnWeaponExpected.state)
        expect(hash(ctx.rng.log), 'full enchant-triggers-own-weapon RNG').toBe(enchantTriggersOwnWeaponExpected.rng)
        expect(result).toEqual(enchantTriggersOwnWeaponExpected.result)
        }
        // was: if (longswordLosesStabExpected) { — fix.enchant-triggers-own-weapon (2026-10-04): a case it moved is checked above instead
        if (longswordLosesStabExpected && !enchantTriggersOwnWeaponMoved) {
        expect(hash(ctx.events), 'full longsword-loses-stab events').toBe(longswordLosesStabExpected.events)
        expect(hash(ctx.state), 'full longsword-loses-stab state').toBe(longswordLosesStabExpected.state)
        expect(hash(ctx.rng.log), 'full longsword-loses-stab RNG').toBe(longswordLosesStabExpected.rng)
        expect(result).toEqual(longswordLosesStabExpected.result)
        }
        // was: if (combineFreeAttackExpected) { — content.longsword-loses-stab (2026-10-04): a case it moved is checked above instead
        if (combineFreeAttackExpected && !longswordLosesStabMoved) {
        expect(hash(ctx.events), 'full combine-free-attack events').toBe(combineFreeAttackExpected.events)
        expect(hash(ctx.state), 'full combine-free-attack state').toBe(combineFreeAttackExpected.state)
        expect(hash(ctx.rng.log), 'full combine-free-attack RNG').toBe(combineFreeAttackExpected.rng)
        expect(result).toEqual(combineFreeAttackExpected.result)
        }
        // was: if (afflictionWordsExpected) { — combine (2026-10-04): a case the combined tree moved is checked above instead
        if (afflictionWordsExpected && !combineFreeAttackMoved) {
        expect(hash(ctx.events), 'full affliction-pop-up-words events').toBe(afflictionWordsExpected.events)
        expect(hash(ctx.state), 'full affliction-pop-up-words state').toBe(afflictionWordsExpected.state)
        expect(hash(ctx.rng.log), 'full affliction-pop-up-words RNG').toBe(afflictionWordsExpected.rng)
        expect(result).toEqual(afflictionWordsExpected.result)
        }
        // was: if (probeCadenceExpected) { — fix.affliction-pop-up-words (2026-10-04): a case it moved is checked above instead
        if (probeCadenceExpected && !afflictionWordsMoved) {
        expect(hash(ctx.events), 'full opening-probe-cadence events').toBe(probeCadenceExpected.events)
        expect(hash(ctx.state), 'full opening-probe-cadence state').toBe(probeCadenceExpected.state)
        expect(hash(ctx.rng.log), 'full opening-probe-cadence RNG').toBe(probeCadenceExpected.rng)
        expect(result).toEqual(probeCadenceExpected.result)
        }
        // was: if (closerStartExpected) { — fix.opening-probe-cadence (2026-10-04): a case it moved is checked above instead
        if (closerStartExpected && !probeCadenceMoved) {
        expect(hash(ctx.events), 'full orphanage-closer-start events').toBe(closerStartExpected.events)
        expect(hash(ctx.state), 'full orphanage-closer-start state').toBe(closerStartExpected.state)
        expect(hash(ctx.rng.log), 'full orphanage-closer-start RNG').toBe(closerStartExpected.rng)
        expect(result).toEqual(closerStartExpected.result)
        }
        // was: if (ownAreaExpected) { — fix.opening-orphanage-closer-start (2026-10-04): a case it moved is checked above instead
        if (ownAreaExpected && !closerStartMoved) {
        expect(hash(ctx.events), 'full own-area-skips-owner events').toBe(ownAreaExpected.events)
        expect(hash(ctx.state), 'full own-area-skips-owner state').toBe(ownAreaExpected.state)
        expect(hash(ctx.rng.log), 'full own-area-skips-owner RNG').toBe(ownAreaExpected.rng)
        expect(result).toEqual(ownAreaExpected.result)
        }
        // (combine 2026-10-04: this copy's check here read `if (combineCiviliansKitExpected && !ownAreaMoved) {` — master's three layers are checked between; the line is master's, below)
        // (combine 2026-10-04, engine master eec6321: this copy's check here read `if (counterattackExpected && !ownAreaMoved) {` — master's two newer layers are checked between; the chain goes through them, below)
        // was: if (triggerIdsExpected) { — combine (2026-10-04): a case this copy's four layers moved is checked above instead
        if (triggerIdsExpected && !ownAreaMoved) {
        expect(hash(ctx.events), 'full trigger-ids events').toBe(triggerIdsExpected.events)
        expect(hash(ctx.state), 'full trigger-ids state').toBe(triggerIdsExpected.state)
        expect(hash(ctx.rng.log), 'full trigger-ids RNG').toBe(triggerIdsExpected.rng)
        expect(result).toEqual(triggerIdsExpected.result)
        }
        // was: if (classGroundExpected) { — fix.trigger-ids-and-scopes (2026-10-04): a trigger-ids-moved case is checked above instead
        if (classGroundExpected && !triggerIdsMoved) {
        expect(hash(ctx.events), 'full class-ground events').toBe(classGroundExpected.events)
        expect(hash(ctx.state), 'full class-ground state').toBe(classGroundExpected.state)
        expect(hash(ctx.rng.log), 'full class-ground RNG').toBe(classGroundExpected.rng)
        expect(result).toEqual(classGroundExpected.result)
        }
        // was: if (counterattackExpected) { — fix.burst-ground-class-powers (2026-10-04): a class-ground-moved case is checked above instead
        if (counterattackExpected && !classGroundMoved) {
        expect(hash(ctx.events), 'full counterattack events').toBe(counterattackExpected.events)
        expect(hash(ctx.state), 'full counterattack state').toBe(counterattackExpected.state)
        expect(hash(ctx.rng.log), 'full counterattack RNG').toBe(counterattackExpected.rng)
        expect(result).toEqual(counterattackExpected.result)
        }
        // was: if (freeAttackExpected) { — capability.counterattack-and-fend (2026-10-04): a counterattack-moved case is checked above instead
        if (freeAttackExpected && !counterattackMoved) {
        expect(hash(ctx.events), 'full free-attack events').toBe(freeAttackExpected.events)
        expect(hash(ctx.state), 'full free-attack state').toBe(freeAttackExpected.state)
        expect(hash(ctx.rng.log), 'full free-attack RNG').toBe(freeAttackExpected.rng)
        expect(result).toEqual(freeAttackExpected.result)
        }
        // was: if (burstPaintsGroundExpected) { — rule.free-attack-is-basic-attack (2026-10-04): a free-attack-moved case is checked above instead
        if (burstPaintsGroundExpected && !freeAttackMoved) {
        expect(hash(ctx.events), 'full burst-paints-ground events').toBe(burstPaintsGroundExpected.events)
        expect(hash(ctx.state), 'full burst-paints-ground state').toBe(burstPaintsGroundExpected.state)
        expect(hash(ctx.rng.log), 'full burst-paints-ground RNG').toBe(burstPaintsGroundExpected.rng)
        expect(result).toEqual(burstPaintsGroundExpected.result)
        }
        // was: if (combineCiviliansKitExpected) { — capability.burst-paints-ground (2026-10-04): a burst-paints-ground-moved case is checked above instead
        if (combineCiviliansKitExpected && !burstPaintsGroundMoved) {
        expect(hash(ctx.events), 'full combine-civilians-kit events').toBe(combineCiviliansKitExpected.events)
        expect(hash(ctx.state), 'full combine-civilians-kit state').toBe(combineCiviliansKitExpected.state)
        expect(hash(ctx.rng.log), 'full combine-civilians-kit RNG').toBe(combineCiviliansKitExpected.rng)
        expect(result).toEqual(combineCiviliansKitExpected.result)
        }
        // was: if (impBlastTunedExpected) { — combine (2026-10-04): a case the combined tree moved is checked above instead
        if (impBlastTunedExpected && !combineCiviliansKitMoved) {
        expect(hash(ctx.events), 'full imp-blast-tuned events').toBe(impBlastTunedExpected.events)
        expect(hash(ctx.state), 'full imp-blast-tuned state').toBe(impBlastTunedExpected.state)
        expect(hash(ctx.rng.log), 'full imp-blast-tuned RNG').toBe(impBlastTunedExpected.rng)
        expect(result).toEqual(impBlastTunedExpected.result)
        }
        // was: if (fireImpBurnExpected) { — content.imp-blast-tuned (2026-10-04): an imp-blast-tuned-moved case is checked above instead
        if (fireImpBurnExpected && !impBlastTunedMoved) {
        expect(hash(ctx.events), 'full fire-imp-burn events').toBe(fireImpBurnExpected.events)
        expect(hash(ctx.state), 'full fire-imp-burn state').toBe(fireImpBurnExpected.state)
        expect(hash(ctx.rng.log), 'full fire-imp-burn RNG').toBe(fireImpBurnExpected.rng)
        expect(result).toEqual(fireImpBurnExpected.result)
        }
        // was: if (startingKitPowersExpected) { — fix.fire-imp-burn-spares-self (2026-10-04): a fire-imp-burn-moved case is checked above instead
        if (startingKitPowersExpected && !fireImpBurnMoved) {
        expect(hash(ctx.events), 'full starting-kit-powers events').toBe(startingKitPowersExpected.events)
        expect(hash(ctx.state), 'full starting-kit-powers state').toBe(startingKitPowersExpected.state)
        expect(hash(ctx.rng.log), 'full starting-kit-powers RNG').toBe(startingKitPowersExpected.rng)
        expect(result).toEqual(startingKitPowersExpected.result)
        }
        // was: if (civiliansKitExpected) { — combine (2026-10-04): a starting-kit-powers-moved case is checked above instead
        if (civiliansKitExpected && !startingKitPowersMoved) {
        expect(hash(ctx.events), 'full civilians-field-kit events').toBe(civiliansKitExpected.events)
        expect(hash(ctx.state), 'full civilians-field-kit state').toBe(civiliansKitExpected.state)
        expect(hash(ctx.rng.log), 'full civilians-field-kit RNG').toBe(civiliansKitExpected.rng)
        expect(result).toEqual(civiliansKitExpected.result)
        }
        // was: if (afflictionsAtZeroRuleExpected) { — fix.civilians-field-kit (2026-10-03): a civilians-kit-moved case is checked above instead
        if (afflictionsAtZeroRuleExpected && !civiliansKitMoved) {
        expect(hash(ctx.events), 'full afflictions-at-zero-rule events').toBe(afflictionsAtZeroRuleExpected.events)
        expect(hash(ctx.state), 'full afflictions-at-zero-rule state').toBe(afflictionsAtZeroRuleExpected.state)
        expect(hash(ctx.rng.log), 'full afflictions-at-zero-rule RNG').toBe(afflictionsAtZeroRuleExpected.rng)
        expect(result).toEqual(afflictionsAtZeroRuleExpected.result)
        }
        // was: if (openingLevelsExpected) { — rule.afflictions-at-zero-refiled-2 (2026-10-02): an afflictions-at-zero-rule-moved case is checked above instead
        if (openingLevelsExpected && !afflictionsAtZeroRuleMoved) {
        expect(hash(ctx.events), 'full opening-levels events').toBe(openingLevelsExpected.events)
        expect(hash(ctx.state), 'full opening-levels state').toBe(openingLevelsExpected.state)
        expect(hash(ctx.rng.log), 'full opening-levels RNG').toBe(openingLevelsExpected.rng)
        expect(result).toEqual(openingLevelsExpected.result)
        }
        // was: if (orphansKnifeExpected) { — fix.opening-levels (2026-10-02): an opening-levels-moved case is checked above instead
        if (orphansKnifeExpected && !openingLevelsMoved) {
        expect(hash(ctx.events), 'full orphans-teacher-knife events').toBe(orphansKnifeExpected.events)
        expect(hash(ctx.state), 'full orphans-teacher-knife state').toBe(orphansKnifeExpected.state)
        expect(hash(ctx.rng.log), 'full orphans-teacher-knife RNG').toBe(orphansKnifeExpected.rng)
        expect(result).toEqual(orphansKnifeExpected.result)
        }
        // was: if (oneHeroAssemblyExpected) { — fix.orphans-teacher-knife (2026-10-02): an orphans-knife-moved case is checked above instead
        if (oneHeroAssemblyExpected && !orphansKnifeMoved) {
        expect(hash(ctx.events), 'full one-hero-assembly events').toBe(oneHeroAssemblyExpected.events)
        expect(hash(ctx.state), 'full one-hero-assembly state').toBe(oneHeroAssemblyExpected.state)
        expect(hash(ctx.rng.log), 'full one-hero-assembly RNG').toBe(oneHeroAssemblyExpected.rng)
        expect(result).toEqual(oneHeroAssemblyExpected.result)
        }
        // was: if (bridgeDeckExpected) { — fix.one-hero-assembly (2026-10-02): a one-hero-assembly-moved case is checked above instead
        if (bridgeDeckExpected && !oneHeroAssemblyMoved) {
        expect(hash(ctx.events), 'full bridge-deck events').toBe(bridgeDeckExpected.events)
        expect(hash(ctx.state), 'full bridge-deck state').toBe(bridgeDeckExpected.state)
        expect(hash(ctx.rng.log), 'full bridge-deck RNG').toBe(bridgeDeckExpected.rng)
        expect(result).toEqual(bridgeDeckExpected.result)
        }
        // was: if (afflictionsAtZeroExpected) { — content.bridge-deck-pack (2026-10-01): a bridge-deck-moved case is checked above instead
        if (afflictionsAtZeroExpected && !bridgeDeckMoved) {
        expect(hash(ctx.events), 'full afflictions-at-zero events').toBe(afflictionsAtZeroExpected.events)
        expect(hash(ctx.state), 'full afflictions-at-zero state').toBe(afflictionsAtZeroExpected.state)
        expect(hash(ctx.rng.log), 'full afflictions-at-zero RNG').toBe(afflictionsAtZeroExpected.rng)
        expect(result).toEqual(afflictionsAtZeroExpected.result)
        }
        // was: if (turnModsExpected) { — content.afflictions-at-zero (2026-10-01): an afflictions-at-zero-moved case is checked above instead
        if (turnModsExpected && !afflictionsAtZeroMoved) {
        expect(hash(ctx.events), 'full turn-mods events').toBe(turnModsExpected.events)
        expect(hash(ctx.state), 'full turn-mods state').toBe(turnModsExpected.state)
        expect(hash(ctx.rng.log), 'full turn-mods RNG').toBe(turnModsExpected.rng)
        expect(result).toEqual(turnModsExpected.result)
        }
        // was: if (oneEffectExpected) { — fix.turn-mods-expire (2026-10-01): a turn-mods-moved case is checked above instead
        if (oneEffectExpected && !turnModsMoved) {
        expect(hash(ctx.events), 'full one-effect events').toBe(oneEffectExpected.events)
        expect(hash(ctx.state), 'full one-effect state').toBe(oneEffectExpected.state)
        expect(hash(ctx.rng.log), 'full one-effect RNG').toBe(oneEffectExpected.rng)
        expect(result).toEqual(oneEffectExpected.result)
        }
        // was: if (codexNumbersExpected) { — fix.one-effect-vocabulary (2026-10-01): a one-effect-moved case is checked above instead
        if (codexNumbersExpected && !oneEffectMoved) {
        expect(hash(ctx.events), 'full codex-numbers events').toBe(codexNumbersExpected.events)
        expect(hash(ctx.state), 'full codex-numbers state').toBe(codexNumbersExpected.state)
        expect(hash(ctx.rng.log), 'full codex-numbers RNG').toBe(codexNumbersExpected.rng)
        expect(result).toEqual(codexNumbersExpected.result)
        }
        // was: if (fireImpFlightExpected) { — fix.codex-numbers (2026-10-01): a codex-numbers-moved case is checked above instead
        if (fireImpFlightExpected && !codexNumbersMoved) {
        expect(hash(ctx.events), 'full fire-imp-flight events').toBe(fireImpFlightExpected.events)
        expect(hash(ctx.state), 'full fire-imp-flight state').toBe(fireImpFlightExpected.state)
        expect(hash(ctx.rng.log), 'full fire-imp-flight RNG').toBe(fireImpFlightExpected.rng)
        expect(result).toEqual(fireImpFlightExpected.result)
        }
        // was: if (kiteAloneExpected) { — content.fire-imp-flight (2026-10-01): a fire-imp-flight-moved case is checked above instead
        if (kiteAloneExpected && !fireImpFlightMoved) {
        expect(hash(ctx.events), 'full kite-alone events').toBe(kiteAloneExpected.events)
        expect(hash(ctx.state), 'full kite-alone state').toBe(kiteAloneExpected.state)
        expect(hash(ctx.rng.log), 'full kite-alone RNG').toBe(kiteAloneExpected.rng)
        expect(result).toEqual(kiteAloneExpected.result)
        }
        // was: if (resistOneWayExpected) { — encounter.opening.bridge-ai (2026-09-30): a kite-alone-moved case is checked above instead
        if (resistOneWayExpected && !kiteAloneMoved) {
        expect(hash(ctx.events), 'full resist-one-way events').toBe(resistOneWayExpected.events)
        expect(hash(ctx.state), 'full resist-one-way state').toBe(resistOneWayExpected.state)
        expect(hash(ctx.rng.log), 'full resist-one-way RNG').toBe(resistOneWayExpected.rng)
        expect(result).toEqual(resistOneWayExpected.result)
        }
        // was: if (ghostColdExpected) { — rule.immunity-is-resistance (2026-09-29): a resist-one-way-moved case is checked above instead
        if (ghostColdExpected && !resistOneWayMoved) {
        expect(hash(ctx.events), 'full ghost-cold events').toBe(ghostColdExpected.events)
        expect(hash(ctx.state), 'full ghost-cold state').toBe(ghostColdExpected.state)
        expect(hash(ctx.rng.log), 'full ghost-cold RNG').toBe(ghostColdExpected.rng)
        expect(result).toEqual(ghostColdExpected.result)
        }
        // was: if (orphanageArrivalsExpected) { — content.ghost (2026-09-29): a ghost-cold-moved case is checked above instead
        if (orphanageArrivalsExpected && !ghostColdMoved) {
        expect(hash(ctx.events), 'full orphanage-arrivals events').toBe(orphanageArrivalsExpected.events)
        expect(hash(ctx.state), 'full orphanage-arrivals state').toBe(orphanageArrivalsExpected.state)
        expect(hash(ctx.rng.log), 'full orphanage-arrivals RNG').toBe(orphanageArrivalsExpected.rng)
        expect(result).toEqual(orphanageArrivalsExpected.result)
        }
        // was: if (badgeRulesExpected) { — fix.opening-orphanage-arrivals (2026-09-29): an orphanage-arrivals-moved case is checked above instead
        if (badgeRulesExpected && !orphanageArrivalsMoved) {
        expect(hash(ctx.events), 'full badge-rules events').toBe(badgeRulesExpected.events)
        expect(hash(ctx.state), 'full badge-rules state').toBe(badgeRulesExpected.state)
        expect(hash(ctx.rng.log), 'full badge-rules RNG').toBe(badgeRulesExpected.rng)
        expect(result).toEqual(badgeRulesExpected.result)
        }
        // was: if (afflictionsExpected) { — rule.badge-immunity (2026-09-29): a badge-rules-moved case is checked above instead
        if (afflictionsExpected && !badgeRulesMoved) {
        expect(hash(ctx.events), 'full afflictions events').toBe(afflictionsExpected.events)
        expect(hash(ctx.state), 'full afflictions state').toBe(afflictionsExpected.state)
        expect(hash(ctx.rng.log), 'full afflictions RNG').toBe(afflictionsExpected.rng)
        expect(result).toEqual(afflictionsExpected.result)
        }
        // was: if (openingDraftExpected) { — content.afflictions-revised (2026-09-29): an afflictions-moved case is checked above instead
        if (openingDraftExpected && !afflictionsMoved) {
        expect(hash(ctx.events), 'full opening-draft events').toBe(openingDraftExpected.events)
        expect(hash(ctx.state), 'full opening-draft state').toBe(openingDraftExpected.state)
        expect(hash(ctx.rng.log), 'full opening-draft RNG').toBe(openingDraftExpected.rng)
        expect(result).toEqual(openingDraftExpected.result)
        }
        // was: if (peddlersVestExpected) { — fix.opening-draft (2026-09-29): an opening-draft-moved case is checked above instead
        if (peddlersVestExpected && !openingDraftMoved) {
        expect(hash(ctx.events), 'full peddlers-vest events').toBe(peddlersVestExpected.events)
        expect(hash(ctx.state), 'full peddlers-vest state').toBe(peddlersVestExpected.state)
        expect(hash(ctx.rng.log), 'full peddlers-vest RNG').toBe(peddlersVestExpected.rng)
        expect(result).toEqual(peddlersVestExpected.result)
        }
        // was: if (orphanageLighterExpected) { — content.peddlers-vest (2026-09-29): a peddlers-vest-moved case is checked above instead
        if (orphanageLighterExpected && !peddlersVestMoved) {
        expect(hash(ctx.events), 'full orphanage-lighter events').toBe(orphanageLighterExpected.events)
        expect(hash(ctx.state), 'full orphanage-lighter state').toBe(orphanageLighterExpected.state)
        expect(hash(ctx.rng.log), 'full orphanage-lighter RNG').toBe(orphanageLighterExpected.rng)
        expect(result).toEqual(orphanageLighterExpected.result)
        }
        // was: if (firstLevelExpected) { — fix.opening-orphanage-lighter (2026-09-29): an orphanage-lighter-moved case is checked above instead
        if (firstLevelExpected && !orphanageLighterMoved) {
        expect(hash(ctx.events), 'full first-level events').toBe(firstLevelExpected.events)
        expect(hash(ctx.state), 'full first-level state').toBe(firstLevelExpected.state)
        expect(hash(ctx.rng.log), 'full first-level RNG').toBe(firstLevelExpected.rng)
        expect(result).toEqual(firstLevelExpected.result)
        }
        // was: if (partyExpected) { — fix.opening-first-level (2026-09-29): a first-level-moved case is checked above instead
        if (partyExpected && !firstLevelMoved) {
        expect(hash(ctx.events), 'full party events').toBe(partyExpected.events)
        expect(hash(ctx.state), 'full party state').toBe(partyExpected.state)
        expect(hash(ctx.rng.log), 'full party RNG').toBe(partyExpected.rng)
        expect(result).toEqual(partyExpected.result)
        }
        // was: if (funnelExpected) { — fix.opening-party (2026-09-29): a party-moved case is checked above instead
        if (funnelExpected && !partyMoved) {
        expect(hash(ctx.events), 'full funnel events').toBe(funnelExpected.events)
        expect(hash(ctx.state), 'full funnel state').toBe(funnelExpected.state)
        expect(hash(ctx.rng.log), 'full funnel RNG').toBe(funnelExpected.rng)
        expect(result).toEqual(funnelExpected.result)
        }
        // was: if (raiseTwoExpected) { — fix.funnel-goldens (2026-09-29): a funnel-moved case is checked above instead
        if (raiseTwoExpected && !funnelMoved) {
        expect(hash(ctx.events), 'full raise-two events').toBe(raiseTwoExpected.events)
        expect(hash(ctx.state), 'full raise-two state').toBe(raiseTwoExpected.state)
        expect(hash(ctx.rng.log), 'full raise-two RNG').toBe(raiseTwoExpected.rng)
        expect(result).toEqual(raiseTwoExpected.result)
        }
        // fix.raise-two-cursor (2026-09-28): a raise-two-moved case is checked above instead
        if (surgeSpendExpected && !raiseTwoMoved) {
        expect(hash(ctx.events), 'full surge-spend events').toBe(surgeSpendExpected.events)
        expect(hash(ctx.state), 'full surge-spend state').toBe(surgeSpendExpected.state)
        expect(hash(ctx.rng.log), 'full surge-spend RNG').toBe(surgeSpendExpected.rng)
        expect(result).toEqual(surgeSpendExpected.result)
        }
        // was: if (zocExpected) { — fix.surge-spend (2026-09-28): a moved case is checked above instead
        if (zocExpected && !surgeSpendMoved) {
        expect(hash(ctx.events), 'full zoc events').toBe(zocExpected.events)
        expect(hash(ctx.state), 'full zoc state').toBe(zocExpected.state)
        expect(hash(ctx.rng.log), 'full zoc RNG').toBe(zocExpected.rng)
        expect(result).toEqual(zocExpected.result)
        }
        // was: if (chargeExpected) { — capability.move-ignores-zoc (2026-09-28): a moved case is checked above instead
        if (chargeExpected && !zocMoved) {
        expect(hash(ctx.events), 'full charge events').toBe(chargeExpected.events)
        expect(hash(ctx.state), 'full charge state').toBe(chargeExpected.state)
        expect(hash(ctx.rng.log), 'full charge RNG').toBe(chargeExpected.rng)
        expect(result).toEqual(chargeExpected.result)
        }
        // was: if (accuracyModExpected) { — capability.charge (2026-09-27): a moved case is checked above instead
        if (accuracyModExpected && !chargeMoved) {
        expect(hash(ctx.events), 'full accuracy-mod events').toBe(accuracyModExpected.events)
        expect(hash(ctx.state), 'full accuracy-mod state').toBe(accuracyModExpected.state)
        expect(hash(ctx.rng.log), 'full accuracy-mod RNG').toBe(accuracyModExpected.rng)
        expect(result).toEqual(accuracyModExpected.result)
        }
        // was: if (enemyActionsExpected) { — fix.enemy-accuracy-mod (2026-09-27): a moved case is checked above instead
        if (enemyActionsExpected && !accuracyModMoved) {
        expect(hash(ctx.events), 'full enemy-actions events').toBe(enemyActionsExpected.events)
        expect(hash(ctx.state), 'full enemy-actions state').toBe(enemyActionsExpected.state)
        expect(hash(ctx.rng.log), 'full enemy-actions RNG').toBe(enemyActionsExpected.rng)
        expect(result).toEqual(enemyActionsExpected.result)
        }
        // was: if (wornExpected) { — pack.enemy-actions (2026-09-26): a moved case is checked above instead
        if (wornExpected && !enemyActionsMoved) {
        expect(hash(ctx.events), 'full worn-slayer events').toBe(wornExpected.events)
        expect(hash(ctx.state), 'full worn-slayer state').toBe(wornExpected.state)
        expect(hash(ctx.rng.log), 'full worn-slayer RNG').toBe(wornExpected.rng)
        expect(result).toEqual(wornExpected.result)
        }
        // every older assertion below runs on the projection (loadout.worn removed, nothing else)
        ctx.state = projectWorn(ctx.state) as typeof ctx.state
        // was: if (thinExpected) {
        if (thinExpected && !wornMoved) {
        expect(hash(ctx.events), 'full thin-obstruction events').toBe(thinExpected.events)
        expect(hash(ctx.state), 'full thin-obstruction state').toBe(thinExpected.state)
        expect(hash(ctx.rng.log), 'full thin-obstruction RNG').toBe(thinExpected.rng)
        expect(result).toEqual(thinExpected.result)
        }
        if (groundExpected && !thinMoved) {
        expect(hash(ctx.events), 'full ground-table events').toBe(groundExpected.events)
        expect(hash(ctx.state), 'full ground-table state').toBe(groundExpected.state)
        expect(hash(ctx.rng.log), 'full ground-table RNG').toBe(groundExpected.rng)
        expect(result).toEqual(groundExpected.result)
        }
        const itemUsesExpected = groundMoved ? undefined : itemUsesGolden.cases.find((row:{id:string})=>row.id===fixture.id)
        // a case newer than this capture keeps the automatic/suspended comparison below
        if (itemUsesExpected) {
        expect(hash(ctx.events), 'full v2.item-uses events').toBe(itemUsesExpected.events)
        expect(hash(ctx.state), 'full v2.item-uses state').toBe(itemUsesExpected.state)
        expect(hash(ctx.rng.log), 'full v2.item-uses RNG').toBe(itemUsesExpected.rng)
        expect(result).toEqual(itemUsesExpected.result)
        }
        // every older assertion below runs on the projection (the per-instance fields removed, nothing else)
        { const projected = projectItemUses(ctx, result); ctx.events = projected.events; ctx.state = projected.state; result = projected.result }
        const loadoutExpected = groundMoved ? undefined : loadoutGolden.cases.find((row:{id:string})=>row.id===fixture.id)
        // Law 10, 2026-09-24 (v2.swap): a case newer than the capture (test.swap) has no frozen
        // row; it keeps the automatic/suspended comparison below, like every new case before it.
        if (loadoutExpected) {
        expect(hash(ctx.events), 'full v2.loadout events').toBe(loadoutExpected.events)
        expect(hash(ctx.state), 'full v2.loadout state').toBe(loadoutExpected.state)
        expect(hash(ctx.rng.log), 'full v2.loadout RNG').toBe(loadoutExpected.rng)
        expect(result).toEqual(loadoutExpected.result)
        }
        // every older assertion below runs on the projection (metadata removed, nothing else)
        Object.assign(ctx, projectLoadout(ctx))
        // Historical shorthand projection is only meaningful for a historical
        // row. New direct geometry retains exact automatic/suspended comparison.
        // V2 Block metadata-only projection refuses any positive cup. All old
        // golden assertions remain exact, plus current raw hashes are retained.
        const historicalCtx=blockExpected&&!shieldMoved?{...ctx,...projectBlock(ctx)}:ctx
        if(blockExpected&&!shieldMoved){
          expect(hash(ctx.events),'full Block events').toBe(blockExpected.events)
          expect(hash(ctx.state),'full Block state').toBe(blockExpected.state)
          expect(hash(ctx.rng.log),'full Block RNG').toBe(blockExpected.rng)
          expect(result).toEqual(blockExpected.result)
        }
        const projected = eventExpected || prior ? projectShorthand({...historicalCtx,events:projectPacketEvents(historicalCtx.events)}, mapDef(historicalCtx.state.mapId).rows.join('').split('').map(g => GLYPH[g]!)) : {events:historicalCtx.events,state:historicalCtx.state}
        if (eventExpected) {
          expect(hash(projected.events), 'prior event contract, exact prop projection').toBe(eventExpected.events)
          expect(hash(projected.state), 'prior state, exact prop projection').toBe(eventExpected.state)
          expect(hash(historicalCtx.rng.log)).toBe(eventExpected.rng)
          expect(result).toEqual(eventExpected.result)
        }
        if (prior) {
          const oldEvents = projected.events.filter(e => e.type !== 'action.spent').map((e, seq) => ({ ...e, seq }))
          const oldState = { ...projected.state, seq: historicalCtx.state.seq - (historicalCtx.events.length - oldEvents.length) }
          expect(hash(oldEvents), 'historical events without new metadata').toBe(prior.events)
          expect(hash(oldState), 'historical state without new sequence count').toBe(prior.state)
          expect(hash(historicalCtx.rng.log), 'historical RNG').toBe(prior.rng)
          expect(result, 'historical result').toEqual(prior.result)
        }
        expected ??= { events: hash(historicalCtx.events), state: hash(historicalCtx.state), rng: hash(historicalCtx.rng.log), result }
        expect(hash(historicalCtx.events), 'events').toBe(expected.events)
        expect(hash(historicalCtx.state), 'state').toBe(expected.state)
        expect(hash(historicalCtx.rng.log), 'RNG draws').toBe(expected.rng)
        expect(result).toEqual(expected.result)
        expect(ctx.events.at(-1)!.type).toBe('battle.end')
      }
    })
  }
  it('retains every historical case and actual surge links as the corpus grows', () => {
    const historicalIds = golden.cases.map((row: { id: string }) => row.id)
    expect(battleCursorCases().filter(row => historicalIds.includes(row.id)).map(row => row.id)).toEqual(historicalIds)
    expect(golden.cases.filter((row: { id: string }) => row.id.startsWith('progression-surge')).reduce((n: number, row: { surgeHits: number }) => n + row.surgeHits, 0)).toBeGreaterThan(0)
    for (const corpus of [identityGolden, eventGolden, propGolden, contactGolden, elementalGolden, protectionGolden, packetGolden, burstGolden, blockGolden, shieldGolden, knockGolden, kdbGolden]) {
      const ids = corpus.cases.map((row: { id: string }) => row.id)
      expect(battleCursorCases().filter(row => ids.includes(row.id)).map(row => row.id)).toEqual(ids)
    }
  })
})
