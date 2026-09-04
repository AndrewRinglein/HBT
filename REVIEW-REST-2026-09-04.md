# The rest of the queue — 33 items

*Generated 2026-09-04. Group A (the 24 test changes) is done — 16 ruled, 8 held by your own rulings and waiting on work, not on you.*

Same job: read the claim, say yes or no.



---

## B — the gate suspected an earlier ruling covered this (7)

A keyword search found ruling-shaped text elsewhere that overlaps. It cried wolf on 30 of 124 runs, so most are noise. **You are checking the work did not quietly contradict something you already decided.** The matched text is quoted.

**1. `ai.mode.defender`**  ·  ai

> Defender mode: stays within 2 hexes of the nearest ally with less than half HP, attacks anything adjacent, never advances alone.

*Gate matched:* 5 candidate ruling(s) — READ BEFORE ASKING: ../COMBAT-DESIGN.md:477 · ../CODEX.md:944

**2. `ai.mode.support`**  ·  ai

> Support mode: holds at range, prefers using abilities on allies over attacking, retreats when threatened.

*Gate matched:* 4 candidate ruling(s) — READ BEFORE ASKING: ../CODEX.md:372 · ../BASE-MAP-SPEC.md:25

**3. `movement.bonus-actions`**  ·  engine

> The half-step family outgrew MoveDef. Codex rows (settled.json, movementAction:true): power.leap = move exactly 2 hexes, +2 Strength until end of Turn, 2 stamina, Warriors; power.focus = move ZERO hexes, gain 1 Stamina, Mages; power.devotion = move zero hexes, lose 1 Stamina Max for the Battle plus 

*Gate matched:* 4 candidate ruling(s) — READ BEFORE ASKING: ../CODEX.md:372 · ../CODEX.md:480

**4. `pack.items`**  ·  content

> engine/ITEMS-PLAN.md §3: content/mkenginepack.mjs emits ItemDef rows (id, name, itemClass, hands, slots, statModifiers in engine stat names, grants, abilities, compiled triggers with source = the item id) into src/content/generated/pack.ts — weapons and armor first, then every other class whose payl

*Gate matched:* 5 candidate ruling(s) — READ BEFORE ASKING: ITEMS-PLAN.md:213 · ../STATE.md:18

**5. `fix.post-end-ladder`**  ·  engine

> Found by the kingdom's ISC-003 probe 2026-09-03 against engine 52c2ba8 (green at 096dd47-era 8de1620): after battle.end (the axe kills the last zombie mid-Activation) the End of Activation ladder still runs — status.poison ticks damage.applied on a hero, status.reduced/expired, regeneration heal.app

*Gate matched:* 4 candidate ruling(s) — READ BEFORE ASKING: ../STATE.md:18 · ../STATE.md:20

**6. `ai.civilian-flight`**  ·  engine

> Ruled 2026-09-03 (Angela, after watching Supper seed 5 in the viewer): "in this battle specifically, the civilians should have a flight mindset for the first three turns." An AI mode flee (the reachable hex farthest from the nearest enemy; never attacks; the free sidestep when the walk is unaffordab

*Gate matched:* 4 candidate ruling(s) — READ BEFORE ASKING: ../STATE.md:20 · ../STATE.md:21

**7. `progression.level-table-by-type`**  ·  engine

> Ruled 2026-09-03 (Angela): "We need some unique way to define the level-ups by the name of the civilian... Maiden and farmer are different in how they should level up." Content ships levels.civilianTypes (civilian.farmer, a full 10-row table) and a levelTable pointer on the farmer rows. Engine: pack

*Gate matched:* 3 candidate ruling(s) — READ BEFORE ASKING: ../CODEX.md:121 · ../STATE.md:20

---

## C — introduced content not in the Codex (2)

Failure mode #4: *seven terrain rows were invented while the real table sat one directory up; three were wrong and went into a balance sweep.*

**1. `movement.zone-of-control`**  ·  movement

> A standing unit exerts ZoC on its six adjacent hexes. A unit that ENTERS a hex inside an enemy ZoC stops there — it may enter, then its movement ends. Downed and dead units exert nothing. THE AI IS DELIBERATELY BLIND TO THIS (Angela, 2026-08-13): it keeps its current scoring, picks a destination as 

*Gate matched:* 23 ids without a published source — 7 NEW from THIS item, seal withheld until published

**2. `movement.flight`**  ·  engine

> Flight rides on movement.powers — the flight LADDER is Codex-published now (Angela 2026-08-20, settled.json powers): power.flight-labored (2 Stam, Movement -1), power.flight (1 Stam, full Movement), power.flight-swift (0 Stam, Movement +1, granted by item.aegis-of-the-fleet). One atomic jump: over u

*Gate matched:* 16 ids without a published source — 3 NEW from THIS item, seal withheld until published

---

## D — other flags (1)

**1. `content.hero-pack`**  ·  engine

> Real heroes for the prologue: battle 1 fields ONE hero, battle 2 fields THREE, drawn from the 24-hero roster. Heroes come through the Codex pipeline like the test cohort (copyOf resolution), with their class kit WEAPON as the attack source — the first crack in stats-first-weapons-next, scoped to exa

---

## E — no reason recorded (22)

Almost certainly the hand-finished landings: the sandbox kills a command at ~178s, the gate died mid-audit, someone finished the bookkeeping by hand. The work landed and passed every hard check; the log never captured why it was flagged. **Nothing specific to inspect — you are saying yes or no to the item itself.**

**1. `movement.attack-of-opportunity`**  ·  movement

> Leaving a hex inside an enemy's ZoC provokes one free attack from that enemy, resolved through performAttack with its cheapest melee attack, then settle. Once per enemy per activation. Costs the attacker nothing. AI remains blind — it will walk into these.

**2. `ability.effects`**  ·  engine

> Abilities get the trigger effect vocabulary (status.apply / status.remove / status.reduce / damage / heal) plus the target.model targeting, instead of always being damage. Unblocks Heal Ally and Poison Knives.

**3. `fix.unit-tags`**  ·  engine

> UnitDef carries BOTH `attributes` and `tags` for what a unit is. Content fills `attributes` (zombie: ['undead']); every reader — target.ts requireTags, the planned VS_TARGET station — uses `tags`, and no UnitDef sets it. So "target undead" finds no zombies. Collapse to one field (Law 11).

**4. `fix.downed-targetable`**  ·  engine

> canAttack refuses any attack whose target is not standing, so a downed hero cannot be attacked at all. GAME-DESIGN 9: enemies roll at +20 against the downed, and a hit only accelerates the bleed-out counter — it never kills.

**5. `station.accuracy-field`**  ·  engine

> AttackDef gains an optional `accuracy` modifier applied at ACC.SITUATIONAL (700), which is reserved and empty. This is the station every later accuracy modifier needs: the attack-of-opportunity -20, flight -30, a per-attack plus or minus.

**6. `content.enemy-pack`**  ·  engine

> A converter from content/gen/enemies-authored.json into the engine pack — the 14 units the five prologue battles field, of the 28 authored. Bastion-style discipline: a trigger clause whose capability the engine lacks (capability.inflict-affliction on the zombie, capability.power/corpses/target-stami

**7. `content.civilians`**  ·  engine

> hero.fixed.orphans, hero.fixed.lumberjack-and-wife, hero.fixed.farmer as engine units. RULED 2026-08-26: civilians ACT — they are ordinary heroes with their Codex behaviour, stats and actions, not do-nothing statues (the earlier do-nothing reading was wrong and is dead). Rows come from the Codex civ

**8. `encounter.runner`**  ·  engine

> Scenarios grow into encounters — the P11 prologue shape from content/gen/encounters.json: hex placement at:{col,row} / near+range / oneOf (scenario.export landed the validation seam already), phase-keyed spawn SCHEDULE (clock ruling 2026-08-23: schedules count PHASES, the word turn never appears in 

**9. `capability.power-pool`**  ·  engine

> The enemy power pool — 15 of 28 authored enemies need it, the largest single capability. Integer; fractions resolve nearest, 0.5 up; gained external/arrival/clock; consumers read it. Design-ruled in ENEMY-REVIEW.md 2026-08-23. Needed for the necromancer to act fully in battle 2, but battle 2 lands f

**10. `fix.status-tick-timing`**  ·  engine

> RULED 2026-08-26 (DECISIONS.md, verbatim): statuses resolve at the end of each unit's ACTIVATION, not at End of Phase — damage, healing, decay, expiry. Seen in a replay: zombies crossed embers, and every burn tick queued up to fire one at a time at phase end instead of at each zombie's own activatio

**11. `fix.range-penalty-grace`**  ·  engine

> RULED 2026-08-26 (DECISIONS.md verbatim): no ranged penalty up to 3 tiles; from the 4th tile, -5 per tile (-5/-10/-15 at 4/5/6). Was -5 per hex past the first. Legality (no ranged at adjacent) and the shooter-adjacency -20 are separate rules and unchanged.

**12. `fix.crit-branch-even`**  ·  engine

> Ruled 2026-08-27: 'It should be a 50% chance of just a damage boost and a 50% chance of one of the effects' — both branch-share switches default 50 (the 2026-08-22 per-side 75/25 is HELD OFF, machinery kept sweepable). And 'we want all of the things being rolled and all of the effects to have an eve

**13. `fix.status-damage-types`**  ·  engine

> Ruled 2026-08-27: 'Status damage from poison and burn is magic damage. It should be blue. It gets reduced by resist. Bleed damage is true damage. Thorns damage that is dealt is true damage.' The tick's damage TYPE becomes a status-row field (tickDamageType) replacing the tickMitigatedByResist flag —

**14. `ai.attack-choice`**  ·  ai

> bestAttack() takes the FIRST affordable attack in the unit's declared order, so an authored kit's later entries are dead unless the first is unaffordable. Surfaced by content.alpha-flip (2026-09-02) — in 200 standard battles the Alpha Sky Pirate never threw the Javelin (its melee-aggressive mode clo

**15. `fix.enemy-ai-role`**  ·  engine

> FOUND running Supper (2026-09-03): the converter gave any unit with ANY ranged attack the ranged-kite AI, and the kite used the FIRST listed attack as its bow — so the Ghoul (Rake, Shriek, Devour, Eat Corpse) kited from the whole fight and, wanting distance 1 and safety at once, stood six hexes off 

**16. `capability.enemy-action-cooldown`**  ·  engine

> ENEMY-REVIEW P10 (ruled 2026-08-23): cooldown and warmup on enemy ACTIONS — the fields hero powers already carry, reused on AttackDef. canAttack refuses an attack before its ready Turn; performAttack sets it; warmup seeds the map at fielding. Blocks four authored encounters (ENCOUNTERS-ENGINE-HANDOF

**17. `capability.frost-root-taunt`**  ·  engine

> Three Codex status rows that were named gaps, each ONE flag read where it belongs (ruled 2026-09-03: build them all). Frost — "Adds its value to every physical hit the unit receives, per hit", added BEFORE Armor (ruled 2026-09-03) at DMG.FROST 540, and rule.burn-frost-cancel on application. Root — "

**18. `capability.karma-shadow-confusion`**  ·  engine

> The last three Codex status rows that were named gaps (ruled 2026-09-03: build them all). Karma: heals received grow by its value, damage dealt by half rounded down, -1 on a kill and no clock. Shadow: grows +1 each tick, first in the tick, and at or above Max Health the unit is OBLITERATED — dead wi

**19. `capability.deathbed`**  ·  engine

> The Deathbed roll — COMBAT-DESIGN §13, ruled in scope 2026-09-03 (Angela: include the deathbed roll, no stabilisation; bleed-out past = dead, otherwise wounded). At 0 a hero rolls Deathbed Fighting (20 + 5 × Toughness, derived, never stored) on the deathbed cup keyed by unit and ordinal. STAND: a fr

**20. `capability.surge`**  ·  engine

> The Surge check — COMBAT-SEQUENCE, ruled 2026-08-21; in scope by ruling 2026-09-03 (build them all). Heroes only: each Activation Surge Chance += Surge and a roll on the surge cup (unit, activation, link); a hit grants 1 + Stamina Regen, zeroes the chance and runs another movement-and-action inside 

**21. `capability.auras`**  ·  engine

> Standing auras — COMBAT-DESIGN §5, Design Law 27 (auras lend, they never give); blocks 5 of 8 authored encounters (ENCOUNTERS-ENGINE-HANDOFF §4.2). An AuraDef on a unit row: radius, side, requireTags, stat mods — resolved on READ through the stat pipeline like terrain (modsFor), never stored, so lea

**22. `board.variable-size`**  ·  engine

> Ruled 2026-09-03 (DECISIONS.md "board formats"): four formats — 8×8 duel, 16×8 dungeon segment, 16×16 standard, 24×24 horde; the board is the map's, not a constant; hex ids row × width + col PER BOARD ("We can do a per-width formula"). hex.ts loses WIDTH/HEIGHT/HEX_COUNT and exports geometryOf(board
