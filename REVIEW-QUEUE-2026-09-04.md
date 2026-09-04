# The review queue — 57 landings waiting on Angela

*Generated 2026-09-04 from `engine/.state/backlog.json` and `gauntlet-log.jsonl`. Not hand-edited — regenerate rather than tick boxes here.*

**`STATE.md` says 51. It is 57** — six more landed since that row was written.

Every one of these has already passed the gate's hard checks: it typechecks, the whole suite is green, the id appears in a real battle, the control battles are unchanged, and the kill-switch test fails without it. **They are built and they work.** A *flag* is the gate saying "a human should look at this specific thing before I call it sealed."

## How to clear them

```
node tools/review.mjs <id> --ok "your words, 8+ chars"   one item
node tools/review.mjs --all --ok "your words"            the whole queue
```

Run from `engine/`. Your words are recorded verbatim in the backlog and the ledger with your name and the date. It does **not** grant a seal — the gauntlet verdict stays exactly as the gate wrote it. It records that you looked.

---

## A. The landing changed existing test files — 24

**This is the group that actually needs your eyes.** The gate noticed the work deleted or altered lines in test files that already existed. Usually legitimate — a test had to move when the shape changed. Occasionally it is the failure the gate exists to catch: *"an agent editing its own scoreboard is reward hacking with extra steps."* The diff for each is inlined in `.state/ledger.md`.

**`fix.beast-pen-hero-correction`**  ·  content · data

> Angela 2026-08-20: the Beast pen are PLAYER beasts and the ported blocks were never her design; content changes land in the CODEX, the source of truth, not hard-coded. Her rulings went into content/settled.json (a new hero-rulings overlay a

**`movement.powers`**  ·  engine · rule

> Angela 2026-08-21: "Movement is supposed to be a type of activation. There are different abilities in movement, like the sidestep, the regular move, or the flight. Movement is a choice, and that movement choice can have a modifier. It can c

**`content.test-cohort`**  ·  content · data

> THE STANDARD TEST SIX (Angela 2026-08-20): heroes tracked in the Codex, not dictated — six clones, one per class, copied so they can be tweaked without touching the originals: Oathblade I (warrior), Sky Pirate I (rogue), Dusk Hawk I (ranger

**`test.fixture-migration`**  ·  engine · plumbing

> CHORE (born with content.test-cohort): ~25 test files still build custom battles from the old dictated defs (warrior/ranger/mage/zombie/zombie-burning), which survive in index.ts as unfielded fixtures. Migrate the custom battles to the coho

**`fix.shadow-hound-hero-side`**  ·  content · data

> RULED 2026-08-21: 'Shadow Hound Puppy is supposed to be a hero, not an enemy. All of those initial beasts, of which there were only a couple, were meant to be heroes.' The 2026-08-20 Beast-pen ruling reached the snake and the drake (fix.bea

**`fix.cohort-drift`**  ·  engine · plumbing

> Reconcile the engine with the S16a/S17 content restructure that left 6 tests red. THE DATA LEADS (standing rule, encounters.json format.placement). Three distinct drifts: (1) the half-step split — power.sidestep is now Paladin-only, side-ro

**`content.alpha-team`**  ·  engine · data

> The six S31 Alpha Team heroes (alpha-oathblade, alpha-sky-pirate, alpha-dusk-hawk, alpha-air-mage, alpha-lucius, alpha-osric) enter the engine from the pack's alphaTeam section: stat bodies resolved through copyOf from the Codex, kits compi

**`capability.area-attack`**  ·  engine · rule

> An attack may declare an AREA: 'arc' (the target hex plus the two hexes adjacent to both attacker and target — attack.halberd.cleave, authored 'an adjacent hex and the two hexes adjacent to both you and it') or 'blast1' (a hex plus its six 

**`capability.knockback`**  ·  engine · rule

> Forced movement, Knockback only (CODEX bans pulls/pushes/swaps beyond it): attack.halberd.hack's authored onDamage rider 'push the target 1 hex directly away from you'. Directly-away = the hex continuing the attacker->target line. Undefined

**`capability.item-powers`**  ·  engine · rule

> AbilityDef generalizes beyond bolt-shaped blasts to speak the three authored item powers: power.holy-symbol.heal ('Heal the target for 1 + 2 x Spirit', one ally within 6), power.knight-shield.block ('Gain Protection equal to 4 + your Armor,

**`station.crit`**  ·  engine · rule

> Critical hits per COMBAT-DESIGN and the full 2026-08-27 dictation (DECISIONS.md): chance = 3 base + unit Crit ('Base Crit varies by enemy') + weapon crit field + surplus final accuracy over 100 at 1 per 4, minus target Luck; two resolution 

**`content.field-eve-24`**  ·  content · data

> Field the rest of the Eve-of-Ruin 24 in the engine pack (content/mkenginepack.mjs currently fields the prologue three — Hunter, Iron Dwarf, Battle Chaplain — plus the three civilians). All 24 carry FULL kits in hbt-content.json heroKits (20

**`seam.items-per-unit`**  ·  engine · plumbing

> Ruled 2026-09-02 (Andrew): 'the items should go into battle … They define what attacks they have. They modify stats.' Today content/mkenginepack.mjs folds a hero's CONTENT kit into its unit row at pack time, so the battle never sees what th

**`content.alpha-flip`**  ·  engine · data

> The standard battle (FIRST_BATTLE, baseline.6v4) fields the six Alpha Team heroes — alpha-oathblade, alpha-sky-pirate, alpha-dusk-hawk, alpha-air-mage, alpha-lucius, alpha-osric — in place of the six test-* clones. Real authored kits (Halbe

**`capability.charges`**  ·  engine · rule

> GEAR-IMPLEMENTATION.md §1 · GEAR-DESIGN.md §4. One-use-per-battle items (the Waystation's potions, oils, flasks, traps, the Net, Bandages, Rations): an AbilityDef gains `uses` (per battle); a spent use removes the power from the unit's list

**`fix.bleed-magnitude`**  ·  status · counter

> Bleed becomes what the Codex ruled it is (S41, adb627b, verbatim: 'Bleed is True Damage.' and 'Bleed is being converted to magnitude damage. Also healing should cure bleed. Regen should be healing.'; S43: 'karma and bonuses to healing befor

**`fix.dazed-split`**  ·  status · counter

> Andrew 2026-09-02: Dazed 'does two different things: there is a critical effect, and then there is a status effect.' Two ids. status.dazed keeps the Codex meaning (S51: 'Takes the unit out of its owner's control and hands it to the AI.') — 

**`test.receptacle`**  ·  test · data

> Step three of the 2026-09-02 review plan: the test receptacle. content/test/{units,attacks,statuses}.json holds test content — a row is a DELTA over a real row (`from` + `set`, resolved against the pack's own real rows) or a complete test b

**`content.enemy-flip`**  ·  content · data

> The standard battle's horde becomes AUTHORED rows: the Codex's own Zombie (enemies-authored.json) and a Burning Zombie authored from 6-BESTIARY-SETTLED — Angela 2026-08-20: 'You could create a burning zombie and mix them in with the other z

**`capability.corpses`**  ·  engine · rule

> Corpses as board objects — ENEMY-REVIEW P4 (ruled 2026-08-23), blocks 3 encounters and the undead identity. Created when any enemy dies and when a hero actually dies (the counter ran out); a SUMMON leaves none; Shadow's obliteration leaves 

**`capability.vision`**  ·  engine · rule

> Vision, darkness and light — COMBAT-DESIGN §4 re-ruled 2026-09-03 (Andrew): effective Vision = 6 (the battlefield) + the unit's Vision stat (0) + mods, floored at 1; no line of sight. Angela 2026-09-03: base 6, fog would be 3 (fog not built

**`capability.target-stamina-loss`**  ·  engine · trigger

> ENEMY-REVIEW P8 (ruled 2026-08-23): the existing stamina loss, aimed at a target — a stamina.drain trigger effect through drainStamina (floors at 0). Shriek, Necro Bolt, Mesmerize, the Doombringer. Blocks 2 encounters (ENCOUNTERS-ENGINE-HAN

**`fix.rulings-2026-09-03-evening`**  ·  engine · rule

> Angela's answers to the run's retroactive questions (DECISIONS.md, 2026-09-03 evening), applied: victory can be achieved early (boardClearWaitsForSchedule defaults off; a board that never had an enemy is not cleared); every ground status is

**`board.deploy-edges`**  ·  engine · plumbing

> Ruled 2026-09-03: "Heroes start on the left, and enemies start on the right. That is the default configuration. I will update that in content." A map names the edge each side deploys on (maps.ts deploy: {hero, enemy}; absent = west/east, th

---

## B. The gate suspected this was already ruled on — 7

`decided.mjs` found ruling-shaped text elsewhere that overlaps this item. It is a keyword search, not a verdict, and it warned on 30 of 124 runs — so most are noise. What you are checking is that the work did not quietly contradict a ruling you already made.

**`ai.mode.defender`**  ·  ai · data

> Defender mode: stays within 2 hexes of the nearest ally with less than half HP, attacks anything adjacent, never advances alone.

**`ai.mode.support`**  ·  ai · data

> Support mode: holds at range, prefers using abilities on allies over attacking, retreats when threatened.

**`movement.bonus-actions`**  ·  engine · rule

> The half-step family outgrew MoveDef. Codex rows (settled.json, movementAction:true): power.leap = move exactly 2 hexes, +2 Strength until end of Turn, 2 stamina, Warriors; power.focus = move ZERO hexes, gain 1 Stamina, Mages; power.devotio

**`pack.items`**  ·  content · data

> engine/ITEMS-PLAN.md §3: content/mkenginepack.mjs emits ItemDef rows (id, name, itemClass, hands, slots, statModifiers in engine stat names, grants, abilities, compiled triggers with source = the item id) into src/content/generated/pack.ts 

**`fix.post-end-ladder`**  ·  engine · rule

> Found by the kingdom's ISC-003 probe 2026-09-03 against engine 52c2ba8 (green at 096dd47-era 8de1620): after battle.end (the axe kills the last zombie mid-Activation) the End of Activation ladder still runs — status.poison ticks damage.appl

**`ai.civilian-flight`**  ·  engine · rule

> Ruled 2026-09-03 (Angela, after watching Supper seed 5 in the viewer): "in this battle specifically, the civilians should have a flight mindset for the first three turns." An AI mode flee (the reachable hex farthest from the nearest enemy; 

**`progression.level-table-by-type`**  ·  engine · plumbing

> Ruled 2026-09-03 (Angela): "We need some unique way to define the level-ups by the name of the civilian... Maiden and farmer are different in how they should level up." Content ships levels.civilianTypes (civilian.farmer, a full 10-row tabl

---

## C. Content ids without a published source — 2

The item introduced content ids that are not in the Codex. Invented content is failure mode #4 — *seven terrain rows were invented while the table sat one directory up; three were wrong and went into a balance sweep.*

**`movement.zone-of-control`**  ·  movement · rule

> A standing unit exerts ZoC on its six adjacent hexes. A unit that ENTERS a hex inside an enemy ZoC stops there — it may enter, then its movement ends. Downed and dead units exert nothing. THE AI IS DELIBERATELY BLIND TO THIS (Angela, 2026-0

**`movement.flight`**  ·  engine · rule

> Flight rides on movement.powers — the flight LADDER is Codex-published now (Angela 2026-08-20, settled.json powers): power.flight-labored (2 Stam, Movement -1), power.flight (1 Stam, full Movement), power.flight-swift (0 Stam, Movement +1, 

---

## D. Other flags — 1

**`content.hero-pack`**  ·  engine · plumbing

> Real heroes for the prologue: battle 1 fields ONE hero, battle 2 fields THREE, drawn from the 24-hero roster. Heroes come through the Codex pipeline like the test cohort (copyOf resolution), with their class kit WEAPON as the attack source 

---

## E. No flag recorded in the run log — 23

These are almost certainly the hand-finished landings: the sandbox kills a tool call at ~178 seconds, the gate died mid-audit, and the bookkeeping was completed by hand. The work landed; the log never captured why it was flagged. **Lowest risk, least information.**

**`movement.attack-of-opportunity`**  ·  movement · rule

> Leaving a hex inside an enemy's ZoC provokes one free attack from that enemy, resolved through performAttack with its cheapest melee attack, then settle. Once per enemy per activation. Costs the attacker nothing. AI remains blind — it will 

**`ability.effects`**  ·  engine · rule

> Abilities get the trigger effect vocabulary (status.apply / status.remove / status.reduce / damage / heal) plus the target.model targeting, instead of always being damage. Unblocks Heal Ally and Poison Knives.

**`fix.unit-tags`**  ·  engine · plumbing

> UnitDef carries BOTH `attributes` and `tags` for what a unit is. Content fills `attributes` (zombie: ['undead']); every reader — target.ts requireTags, the planned VS_TARGET station — uses `tags`, and no UnitDef sets it. So "target undead" 

**`fix.downed-targetable`**  ·  engine · rule

> canAttack refuses any attack whose target is not standing, so a downed hero cannot be attacked at all. GAME-DESIGN 9: enemies roll at +20 against the downed, and a hit only accelerates the bleed-out counter — it never kills.

**`station.accuracy-field`**  ·  engine · rule

> AttackDef gains an optional `accuracy` modifier applied at ACC.SITUATIONAL (700), which is reserved and empty. This is the station every later accuracy modifier needs: the attack-of-opportunity -20, flight -30, a per-attack plus or minus.

**`content.enemy-pack`**  ·  engine · plumbing

> A converter from content/gen/enemies-authored.json into the engine pack — the 14 units the five prologue battles field, of the 28 authored. Bastion-style discipline: a trigger clause whose capability the engine lacks (capability.inflict-aff

**`content.civilians`**  ·  engine · data

> hero.fixed.orphans, hero.fixed.lumberjack-and-wife, hero.fixed.farmer as engine units. RULED 2026-08-26: civilians ACT — they are ordinary heroes with their Codex behaviour, stats and actions, not do-nothing statues (the earlier do-nothing 

**`encounter.runner`**  ·  engine · rule

> Scenarios grow into encounters — the P11 prologue shape from content/gen/encounters.json: hex placement at:{col,row} / near+range / oneOf (scenario.export landed the validation seam already), phase-keyed spawn SCHEDULE (clock ruling 2026-08

**`capability.power-pool`**  ·  engine · rule

> The enemy power pool — 15 of 28 authored enemies need it, the largest single capability. Integer; fractions resolve nearest, 0.5 up; gained external/arrival/clock; consumers read it. Design-ruled in ENEMY-REVIEW.md 2026-08-23. Needed for th

**`fix.status-tick-timing`**  ·  engine · rule

> RULED 2026-08-26 (DECISIONS.md, verbatim): statuses resolve at the end of each unit's ACTIVATION, not at End of Phase — damage, healing, decay, expiry. Seen in a replay: zombies crossed embers, and every burn tick queued up to fire one at a

**`fix.range-penalty-grace`**  ·  engine · numbers

> RULED 2026-08-26 (DECISIONS.md verbatim): no ranged penalty up to 3 tiles; from the 4th tile, -5 per tile (-5/-10/-15 at 4/5/6). Was -5 per hex past the first. Legality (no ranged at adjacent) and the shooter-adjacency -20 are separate rule

**`fix.crit-branch-even`**  ·  engine · rule

> Ruled 2026-08-27: 'It should be a 50% chance of just a damage boost and a 50% chance of one of the effects' — both branch-share switches default 50 (the 2026-08-22 per-side 75/25 is HELD OFF, machinery kept sweepable). And 'we want all of t

**`station.crit-count`**  ·  engine · rule

> Ruled 2026-08-27: 'there is also an ability to have more than one critical happen at once... Do two criticals or Do three criticals — account for that.' AttackDef gains critCount (default 1). A critting attack resolves critCount CRITICALS: 

**`fix.status-damage-types`**  ·  engine · rule

> Ruled 2026-08-27: 'Status damage from poison and burn is magic damage. It should be blue. It gets reduced by resist. Bleed damage is true damage. Thorns damage that is dealt is true damage.' The tick's damage TYPE becomes a status-row field

**`ai.attack-choice`**  ·  ai · rule

> bestAttack() takes the FIRST affordable attack in the unit's declared order, so an authored kit's later entries are dead unless the first is unaffordable. Surfaced by content.alpha-flip (2026-09-02) — in 200 standard battles the Alpha Sky P

**`fix.enemy-ai-role`**  ·  engine · rule

> FOUND running Supper (2026-09-03): the converter gave any unit with ANY ranged attack the ranged-kite AI, and the kite used the FIRST listed attack as its bow — so the Ghoul (Rake, Shriek, Devour, Eat Corpse) kited from the whole fight and,

**`capability.enemy-action-cooldown`**  ·  engine · rule

> ENEMY-REVIEW P10 (ruled 2026-08-23): cooldown and warmup on enemy ACTIONS — the fields hero powers already carry, reused on AttackDef. canAttack refuses an attack before its ready Turn; performAttack sets it; warmup seeds the map at fieldin

**`capability.frost-root-taunt`**  ·  engine · counter

> Three Codex status rows that were named gaps, each ONE flag read where it belongs (ruled 2026-09-03: build them all). Frost — "Adds its value to every physical hit the unit receives, per hit", added BEFORE Armor (ruled 2026-09-03) at DMG.FR

**`capability.karma-shadow-confusion`**  ·  engine · counter

> The last three Codex status rows that were named gaps (ruled 2026-09-03: build them all). Karma: heals received grow by its value, damage dealt by half rounded down, -1 on a kill and no clock. Shadow: grows +1 each tick, first in the tick, 

**`capability.deathbed`**  ·  engine · rule

> The Deathbed roll — COMBAT-DESIGN §13, ruled in scope 2026-09-03 (Angela: include the deathbed roll, no stabilisation; bleed-out past = dead, otherwise wounded). At 0 a hero rolls Deathbed Fighting (20 + 5 × Toughness, derived, never stored

**`capability.surge`**  ·  engine · rule

> The Surge check — COMBAT-SEQUENCE, ruled 2026-08-21; in scope by ruling 2026-09-03 (build them all). Heroes only: each Activation Surge Chance += Surge and a roll on the surge cup (unit, activation, link); a hit grants 1 + Stamina Regen, ze

**`capability.auras`**  ·  engine · rule

> Standing auras — COMBAT-DESIGN §5, Design Law 27 (auras lend, they never give); blocks 5 of 8 authored encounters (ENCOUNTERS-ENGINE-HANDOFF §4.2). An AuraDef on a unit row: radius, side, requireTags, stat mods — resolved on READ through th

**`board.variable-size`**  ·  engine · plumbing

> Ruled 2026-09-03 (DECISIONS.md "board formats"): four formats — 8×8 duel, 16×8 dungeon segment, 16×16 standard, 24×24 horde; the board is the map's, not a constant; hex ids row × width + col PER BOARD ("We can do a per-width formula"). hex.
