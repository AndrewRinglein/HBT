# Watching a battle — the plan

*Plan, 2026-08-09. Answers one question: how do we watch a battle?
Archive this once the viewer exists — it is a route, not a live document.*

---

## The punchline

**The replay format already exists. It's the event log.** And the VFX package you
just handed me is browser canvas JavaScript, which means the renderer question is
already answered — the effects only run in a canvas, so the viewer is a canvas.

`src/view/text.ts` opens with this, written before any of this was on the table:

> *The text renderer. Reads the EVENT LOG ONLY — never the state. This is
> deliberate: if the log cannot describe the battle, the future graphical renderer
> cannot either, and finding that out now costs days instead of a rewrite.*

Time to cash that in. The graphical viewer is not new architecture — it's a
**second renderer against an interface that already has a working implementation.**

The work splits unevenly, and not where you'd guess:

| | |
|---|---|
| Engine changes | **small** — five missing fields |
| Coordinate conversion | **near-free** — engine and MAP-01 already agree (verified) |
| Making the engine play on MAP-01 | **the largest piece** — see the MAP-01 section |
| Proving the log is sufficient | **the real work, and it's cheap** |
| Wiring VFX to events | **mostly a lookup table** |

---

## What you already have, and how well it fits

`assets/vfx/hexVFX.js` — 1701 lines, one file, 40+ exported effects, promise-based,
canvas overlay with its own render loop and z-sorting.

`battle-tokens/` — **the token authority.** 23 units at three sizes (69 files), a
`manifest.json` carrying each unit's `kind` and QC numbers, a review sheet, and a
reproducible `pipeline/`. Transparent cutouts with **no baked contact shadow and no
faction ring** — the manifest says both are runtime overlays, which means the
renderer owns them. Budget for that: a shadow ellipse under each token and a
faction ring, drawn by you, per unit, per frame.

*(The VFX package shipped its own `tokens/` folder — 23 low-res slices out of
`review_sheet.png`, named `h-warrior-brawler.png` / `e-zombie.png`. Those are older
and derived; `battle-tokens/` supersedes them. The copy has been retired to
`_to_delete/`, because a second copy of the art is the same failure as a second copy
of the glossary.)*

**The fit is unusually good.** The effect API is organised around exactly the
events the engine already emits:

| Engine event | hexVFX call | Notes |
|---|---|---|
| `attack.declared` melee | `playMeleeAttack(fx, atk, tgt, type, tier, hooks)` | walks in, slashes, recovers |
| `attack.declared` ranged physical | `playArrow(fx, from, to, hooks)` | |
| `attack.declared` ranged magic | `playMagicBolt(fx, from, to, tier, hooks)` | |
| `power.used` | `playFireball` / `playMagicBolt` | |
| `status.applied` | `playStatusApply(fx, unit, type)` | |
| `status.reduced` (the damaging tick) | `playStatusTick(fx, unit, type)` | |
| `life.dead` | `playDeath(fx, unit, cause, hooks)` | leaves a stain, lifts a skull |
| range preview (later) | `playTileHighlight(fx, layout, tiles, …)` | |

Three lucky alignments worth noticing, because they mean less work than expected:

**Tier is already in the log.** `hexVFX` scales effects by damage tier
(`≤3 / 4–6 / 7–10 / 11+`), and it needs that at *attack* time — before damage has
resolved. `attack.declared` already carries `damageOnHit`. It fits without any
engine change.

**Status names map by stripping the prefix.** hexVFX takes `'poison'`, `'burn'`;
the engine emits `status.poison`, `status.burn`. One `.replace()`.

**Damage types nearly match.** hexVFX wants `'phys' | 'mag' | 'true'`; the engine's
`DamageType` is `'physical' | 'magic' | 'true'`. A three-row lookup — but see the
gap below, because the engine doesn't currently *put* it on the event.

---

## What's missing

### Five fields

All the same shape: **the log was written for a human reading a transcript, not
for a renderer.**

| Missing | Where | Why it matters |
|---|---|---|
| `damageType` | `damage.applied`, `attack.declared` | Picks phys/mag/true. Currently only reachable by importing `ATTACKS` and looking up `attackId`. |
| `kind` (melee/ranged) | `attack.declared` | Picks `playMeleeAttack` vs `playArrow`/`playMagicBolt`. Same problem. |
| `maxHp` | `unit.enter` | A health bar needs a denominator. Today `hp` at entry happens to equal max — but wound levels are in the design, and the day a hero deploys wounded, every bar silently lies. |
| `maxStamina` | `unit.enter` | Same, for the stamina pips. |
| `deathCause` | `life.dead` | hexVFX has eight death variants (melee / magic / holy / poison / burn / blight / bleed / shadow). `causeId` gets you most of the way; make it explicit. |

**The test for whether a field belongs on the event: can the renderer build the
frame without importing anything from `content/`?** If it has to reach for
`ATTACKS[attackId].damageType`, the renderer is coupled to game content and the log
is no longer a sufficient description of the battle. Protecting that is the whole
point of the exercise.

### Coordinates — smaller than it looks

*(Superseded in part by MAP-01, below: the engine and the map already agree. What
follows applies only to the engine ↔ hexVFX hop.)*

**The engine uses odd-r offset**, stored as a flat index — `HexId` is a number,
with `colOf()` / `rowOf()` pulling it apart, on a 12×12 grid.

**hexVFX uses axial `(q, r)`** and projects with an isometric squash:

```js
x = size * √3 * (q + r/2)
y = size * 1.5 * r * squash
```

So you need `offsetToAxial(hexId) -> {q, r}`, and it needs a test — off-by-one in
hex coordinate conversion is a classic, and it fails *visually* rather than loudly:
everything renders, in slightly the wrong place, and you'll blame the art.

The test is cheap and total: **for every hex on the board, converting to axial and
back must be the identity, and adjacency must be preserved** — two hexes adjacent in
the engine must be adjacent in axial space. Write it before drawing anything.

### ISO_SQUASH — already answered

`ISO_SQUASH` controls foreshortening: how flat the ground plane reads. hexVFX
defaults to a squashed isometric field, and every ground ring, pool and blast wave
keys off it.

**MAP-01's art is flat top-down with no perspective — `map.json` says so outright —
so squash is 1.0.** Override the default, or effects land as ellipses on a map drawn
in circles. This was going to be a switch; the art settled it.

### The VFX are ahead of the engine

Worth knowing, because it's a roadmap rather than a problem. `hexVFX` already
supports things the engine has no events for:

- **statuses:** weak, blight, frost, bleed, shadow, karma, affliction, heal, regen
  *(engine has: poison, burn)*
- **AoE:** lightning storm, ground slam, radiance, poison cloud
- **utility:** auras, line strikes, tile blasts, range highlights
- **holy** as a damage flavour distinct from magic

Several of these map onto backlog items already queued — `status.weakness`,
`status.regen`, `status.protection`. When you add them, the VFX exist. That's a
good position to be in: **the art is pulling the mechanics, not waiting on them.**

### A bare-id bug, same class as the map ids

`unit.enter` emits `causeId: "unit.warrior"` but `typeId: "warrior"`. The prefix is
being added by the *emit site*, not carried by the id — **exactly the bug that made
map ids bare** (`map.loaded` was emitting `` causeId: `map.${mapId}` ``). The
glossary specifies `unit.zombie`. Fix it in the same pass, while there are four
unit types.

It matters here specifically because the viewer needs a typeId → token mapping.
Point that mapping at `battle-tokens/manifest.json`, which already records each
unit's slot and `kind` — a generated manifest is a better source of truth than
filenames, and it regenerates when the art does. Note the manifest's own warning:
*"Ids here are provisional and NOT published to ART-SETTLED.md."* So the mapping
table is the seam where provisional art ids meet settled engine ids, and it should
be the only place the two ever touch.

---

## The steps

### 1. Write the completeness gate first

Before adding a single field, write the test that fails.

`test/replay.test.ts` folds a real battle's events into a full visual state frame by
frame and asserts:

- every unit's position, hp, maxHp, stamina, life state and status list is known at
  every seq
- **no import from `src/content/` anywhere in the fold** — the load-bearing
  assertion, and the reason to write it first
- every `damage.applied` and `life.dead` can be classified for VFX from the event alone
- folding to the last seq reproduces the outcome in `battle.end`

It fails on the five gaps. Good — now they're findings, not opinions. Same move as
splitting the baseline by map: **a green check is only evidence if it could have
gone red.**

### 2. Close the five gaps + the unit id prefix

One backlog item, through the normal gate. It changes `unit.enter`,
`attack.declared`, `damage.applied` and `life.dead` payloads, so all four baseline
hashes move — declare `changesBaseline: true`. The *numbers* don't change; only the
log grows. Prove that rather than asserting it: byte-diff the log with the new
fields stripped against the old, the way the map rename was proven.

### 3. Extract the fold — `src/view/replay.ts`

`foldToTurn()` currently lives inside the text renderer and tracks six fields.
Promote it:

```
replay(events) -> Frame[]        one frame per seq
Frame = { units, terrain, mapId, turn, phase, activeUnit, effects[] }
```

Pure. No engine imports, no content imports. `effects[]` is *what happened at this
seq* — the VFX hook, empty for now.

**Then refactor the text renderer onto it.** This is the proof step and it's free:
if `replay.ts` is right, the text output is byte-identical and the four baselines
don't move. If they move, the fold is wrong. A rigorous correctness check on the new
layer for the cost of a diff.

### 4. Coordinates, tokens, and the unit contract

`offsetToAxial()` plus its round-trip and adjacency test (above). Then the unit
anchor hexVFX expects:

```js
unit = { x, y, h }   // x,y = screen position of the FEET; h = body height in px
```

The tokens are full-body figures standing on the ground, so feet-anchoring is what
they're drawn for — `_256.png` is the battle tier. The renderer owns hex→screen,
draws the contact shadow and faction ring the tokens deliberately omit, and hands
hexVFX these anchors.

Note the division of labour: **the overlay can't move your sprites.** Motion is
delegated through `onShake` / `onLunge` / `onFade` hooks — so the melee lunge and
the death dissolve are things your renderer applies to its own sprite while hexVFX
drives the timing. Don't also move the sprite yourself during an attack or you'll
fight it.

### 5. Draw the board — no combat yet

First milestone deliberately excludes fighting: **the board, the tokens, and
movement.** Terrain from `terrainOf(mapId)`, tokens at their hexes, `moved` events
walking them hex to hex.

`moved` fires **once per hex** with `{from, to, cost, movePointsLeft}` — the whole
path is in the log, not just the destination. Walk animation is possible today, with
no engine change. That's the single biggest thing that could have been missing and
isn't.

If units walk around a hex field and the terrain reads right, the hard part is done.

### 6. The clock

Events have **order**, not duration. `seq` is a sequence number, not a timestamp,
and it should stay that way — the engine has no business knowing a sword swing takes
400ms.

hexVFX does most of this for you: every effect returns a **Promise that resolves on
completion**, so playback is `await` in a loop. You only need durations for events
with no effect attached (`turn.begin` banner, `activation.idle`, `moved`). One small
table of plain data, editable without touching the engine. Playback speed is a
multiplier; step-through is "advance to the next seq."

**One real design question here, and it should be a switch:** `settle` is a
repeat-until-nothing-changes fixpoint, so after a hit lands several things resolve in
log order that are conceptually *simultaneous* — poison ticks, a unit drops,
bleed-out sets. Play them sequentially (clear, slower, honest about ordering) or
overlapping (fast, hides the order the engine used)? `SWITCHES.md`, try both. No
table will tell you which reads better.

### 7. Attacks and deaths

Bind the three beats — `attack.declared` → `attack.hit`/`attack.miss` →
`damage.applied` — to the effect calls. Three beats is exactly what an attack
animation wants: **wind-up, resolution, impact.**

`crit` is a flag on both `attack.hit` and `damage.applied`. Overkill is already
separated from damage, so a killing blow can read differently from a chip hit with
no new engine work. The `ledger` on `attack.hit` is the full damage waterfall — a
damage popup can show *why* it hit for 7, not just that it did.

### 8. VFX as a lookup table, not code

```
event + payload                            -> effect
damage.applied {damageType:'magic'}         playMagicBoltImpact
status.applied {statusId:'status.poison'}   playStatusApply(unit,'poison')
life.dead      {deathCause:'poison'}        playDeath(unit,'poison')
```

One table in `content/`, following the existing id convention. Adding an effect is a
row, not a code change. Missing rows render nothing and **log a warning rather than
failing silently** — Law 9.

### 9. Choosing which battle to watch

Better than you'd expect. **The engine is deterministic and its RNG is keyed
structurally, so a battle is not a recording — it's a seed.**

A saved battle is `{replicate, enemyCount, mapId}`. A few bytes. Watching it means
re-running it, and you get the identical fight every time. No log storage, no log
versioning, no multi-megabyte replay files. The sweep can hand you a list of
interesting seeds — *the closest fight, the one where the mage died first, the
fastest wipe* — and each is a link.

**The one trap, and it's real:** a seed only reproduces a battle *for a given engine
version*. Change a damage number and seed 47 is a different fight. A saved battle
must record the engine commit next to the seed, and the viewer must say so loudly
when they don't match — otherwise you'll spend an afternoon watching a battle that
never happened, wondering why it doesn't match the sweep report.

### 10. The determinism test

`replay(events(seed))` twice, assert byte-identical frames. Cheap, and it protects
the property everything above rests on.

---

## MAP-01 changes the picture

You now have a real map: `MAP-01/` — `map.png` (2475×2188 painted terrain),
`map.json` (660 hexes with terrain and pixel centres), `map.md` (the board as ASCII,
readable without opening the image), and `view.html`, which already draws the hex
overlay with hover readout, terrain colours and coordinates.

**Three things here are better than the plan above assumed.**

**1. The hex conventions already match — verified, not assumed.** The engine is
odd-r offset with axial maths (`src/core/hex.ts`); MAP-01 is pointy-top odd-r. I ran
the engine's `axialQ` + `DIRS` + `offsetOf` against MAP-01's published neighbour
table across all 660 hexes: **zero mismatches.** The coordinate conversion I called
"the one genuinely fiddly bit" is a non-issue between engine and map. It only
remains for hexVFX tile effects, and that is a direct reuse of `axialQ`.

**2. Pixel centres ship with the data.** Every hex in `map.json` carries `px`, `py`.
So the renderer does not need `hexToScreen` for this map — it reads positions from
the data and hands them to hexVFX as unit anchors. That removes an entire class of
bug, and `view.html` already implements the same `centre(c,r)` formula.

**3. The art is flat top-down, no perspective** — `map.json` says so explicitly.
That settles the `ISO_SQUASH` switch before it was ever opened: **squash = 1.0.**
hexVFX defaults to a squashed isometric plane, so every ground ring, pool and blast
wave needs it overridden, or effects will land as ellipses on a map drawn as
circles.

### What MAP-01 asks of the engine

This is where the work actually is, and it is bigger than the viewer.

| | Engine today | MAP-01 |
|---|---|---|
| Board | 12 × 12 = 144 | 22 × 30 = **660** |
| Terrain kinds | 2 — open, hills | **7** — open, forest, rocky, hills, rocky-hills, water, obstacle |
| Impassable hexes | none | `obstacle` — 4 of them |
| Line of sight | **does not exist** | `blocksLineOfSight` per terrain |
| Elevation | hills *are* a type | `elevated` is a separate boolean, true for hills, rocky-hills **and** obstacles |
| Map source | ASCII rows in `content/maps.ts` | `map.json` + `map.png` |

**Board size is the real refactor.** `WIDTH` and `HEIGHT` are module constants in
`hex.ts`, and `NBR_CACHE` is precomputed at module load for exactly `WIDTH*HEIGHT`
hexes. One board size per process. Making it per-map touches `hexId`, `inBounds`,
and the adjacency cache — and the cache is currently justified as "board geometry,
fixed at module load, so not a Law 8 cache." Once the board varies by map, that
justification needs rewriting, not just the code.

**The bridge is easier than it looks, though:** `map.json` publishes `rows` as ASCII
in exactly the shape `terrainOf()` already parses. The existing loader reads it with
new glyphs and a bigger grid. Don't invent a second map format — extend the one
that's there and let `map.json` be its source.

**Line of sight is genuinely new.** Nothing in the engine has a concept of blocked
sight; ranged attacks currently check distance and stamina only. That is not a
viewer task, it is a mechanic, and it should go on the backlog as its own item with
its own gate — before the viewer, because a viewer that draws shots through a
barricade is showing you a bug, not a battle.

### What MAP-01 deliberately left blank — and why that's now cheap

`map.md` is explicit: *"`moveCost`, `coverBonus` and `modifiers` in map.json are
null on purpose — they are design decisions, not generated data."* Water
passability is undecided too.

That is exactly `SWITCHES.md`. Do not fill those in by choosing; expose them and let
a sweep answer. Concretely:

- **`coverBonus`** is a dodge modifier. **Elevation** is an accuracy modifier.
  **Forest** is dodge + armor. The stat pipeline that landed tonight was built for
  precisely this — each is a row of data, not a pipeline change.
- **`moveCost`** already exists as `moveCostOf(terrain)`; it needs five more cases.
- **Water passability** is a switch with a real gameplay consequence, and the
  simulator can answer it: run the same encounter with water passable at cost 3, and
  impassable, and read the difference in outcome spread.

Terrain counts are worth noting for balance: **315 open, 103 forest, 101 hills, 85
water, 45 rocky, 7 rocky-hills, 4 obstacle.** Nearly half the board is open ground.
The earlier finding that terrain swings win rate more than either stat buff tested
(22% → 55%, open to highlands) says this map's exact terrain mix is a bigger balance
lever than anything currently on the backlog.

### Where this lands in the step order

Steps 1–4 are unchanged — the completeness gate, the five event fields, the fold
extraction, and now a much smaller coordinate task. **What MAP-01 adds is a
prerequisite branch before step 5:**

| | |
|---|---|
| 4a | variable board size — `WIDTH`/`HEIGHT` per map, adjacency cache reworked |
| 4b | five new terrain kinds + `passable` + `elevated`, loaded from `map.json`'s `rows` |
| 4c | line of sight as its own backlog item with its own gate |
| 4d | the null rules values into `SWITCHES.md`, then swept |

Each is a normal backlog item through the normal gate. None of them is viewer work,
which is the useful thing to notice: **the map is a bigger ask of the engine than the
viewer is.** `view.html` already draws the board; the engine can't yet play on it.

---

## What this actually proves

You said the point is partly to verify it can all be done. Here's the specific claim
under test:

**That the engine, the simulator and the game are one program.** The command-and-event
design says a graphical client is the same engine with events going to a screen
instead of a log. Nothing has tested that, because there has only ever been one
renderer — written by the same person who wrote the events, which is no test at all.

A second renderer, built with a hard rule that it may not import game content, is the
first real test. If it works, there is no port ahead of you. If it doesn't, you find
out now — four maps and twelve backlog items in — instead of at two hundred effects.

That's why step 1 is the gate and not the graphics.

---

## Rough shape

| Steps | What | Feel |
|---|---|---|
| 1–2 | completeness gate, five fields, unit id prefix | an evening |
| 3 | `replay.ts`, text renderer refactored onto it | an evening, and it verifies itself |
| 4 | coordinate conversion + its test | **smaller than expected** — conventions already match |
| 4a–4d | variable board size, 5 terrain kinds, line of sight, rules switches | **the real work now** — engine, not viewer |
| 5 | board, tokens, movement — **first time you watch a battle** | the real milestone |
| 6–8 | clock, attacks, VFX table | incremental, one row at a time |
| 9–10 | seed picker, determinism test | small |

Steps 1–4 need care and can all be done without touching a pixel. If you only do
those, you've learned the important thing and lost nothing.

But MAP-01 reorders the priority: **4a–4d are a bigger, more valuable body of work
than the viewer itself.** A 660-hex board with seven terrain types, impassable
obstacles and line of sight is a different game from a 144-hex board with hills —
and every one of those is a mechanic the simulator can measure the moment it lands.
The viewer shows you one battle. The map changes all of them.
