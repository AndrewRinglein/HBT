# Events for the viewer — what the engine emits since 2026-09-03

**For the viewer chat.** The engine's 2026-09-03 feature run (`HANDOFF-2026-09-03b.md`)
added mechanics and the events that name them. The viewer draws what happened and never
decides (VIEWER-CONSTITUTION); this document is the list of what it now has to draw,
with each event's exact fields, read out of `src/core/*.ts`. `FOLDED_TYPES` in
`viewer/src/fold.js` is the list to extend; `tools/verify.mjs` checks every packed log
against it, so unknown types are the first thing that will fail.

A sample battle with all of it: `engine/exports/supper-seed5-attacks-of-opportunity.json`
(engine `fc72b9a`; 7 attacks of opportunity, 32 ZoC stops, 16 corpses, 6 eaten, 15
deathbed rolls, 3 waves). Re-export any showcase at any seed with
`npx tsx tools/export-battle.mts --scenario <id> --seed <n>`.

Every event carries `seq`, `turn`, `phase`, `type`, `causeId`, `actor`, `target` as before.
Fields below are the extras. "Unit" means a unit id (index into the roster the log built).

---

## 1. Units that were not there at battle.begin — the one structural change

An encounter's schedule fields units mid-battle. **`unit.enter` can now appear at any seq**,
not only before `battle.begin`. Its shape is unchanged; a mid-battle one carries
`arrived: <encounter id>`. The fold must add the unit on the event, not from a roster
fixed at load. Arrivals take `uid` 300+ (heroes 100+, setup enemies 200+).

| event | fields | draw |
|---|---|---|
| `encounter.begin` | `name`, `gaps?` | the battle's title; the gaps are prose, list them in the intro |
| `encounter.objective` | `actor`, `typeId`, `kind:'protect'` | mark that unit as an objective (a civilian whose death loses) |
| `encounter.wave` | `row`, `turn`, `when:'phase'\|'enemyPhase'`, `units: string[]` (`"unit.zombie×4"`) | a banner: "a wave arrives" — precedes the `unit.enter`s it brings |
| `encounter.roll` | `oneOf: hex[]`, `chose: hex`, `unit` | a scripted either/or was rolled; optional to show |
| `unit.shunted` | `actor`, `wanted`, `hex`, `wantedCol`, `wantedRow` | the arrival's authored hex was occupied; it stands on `hex` instead |
| `encounter.won` | `reason:'survived'`, `to` | outcome `objectiveMet` |
| `encounter.lost` | `reason:'objective dead'\|'time'`, `actor?`, `limit?` | outcome `objectiveFailed` |

`battle.end.outcome` has three new values: **`objectiveMet`, `objectiveFailed`**, and
`retreat` (in the enum, unreachable). `OUTNAME` in harness.js needs words for them.

## 2. Movement — zones of control and attacks of opportunity

| event | fields | draw |
|---|---|---|
| `move.stopped` | `actor`, `hex`, `by` (the holder), `reason:'zone of control'` | the mover's path ends here, short of where `move.begin.to` said; a short "held" beat pointing at `by` |
| `aoo.provoked` | `actor` (the holder), `target` (the mover), `attackId` | a free swing INSIDE the mover's activation: the ordinary `attack.declared/hit/miss` that follow it belong to this. Label it; it is the one attack a unit makes on someone else's turn |
| `aoo.skipped` | `actor`, `target`, `reason` | nothing to draw; log line |

## 3. Bodies and the undead economy

| event | fields | draw |
|---|---|---|
| `corpse.created` | `corpse` (id), `hex`, `of` (unit), `typeId`, `side` | a corpse token on the hex — a board object, stays until removed. Summons and obliterations make none |
| `corpse.removed` | `corpse`, `hex`, `how:'raised'\|'eaten'\|'consumed'\|'destroyed'`, `actor`, `typeId` | the token goes; `how` picks the beat |
| `unit.raised` | `actor` (the necromancer), `raised` (the new unit's id), `from` (typeId of the body), `hex` | follows a `corpse.removed how:'raised'` and a `unit.enter`: a rise |
| `corpse.eaten` | `actor` (the ghoul), `corpse`, `of` | the ghoul feeds; `heal.applied` + `statmod.added` + `maxHp.gained` follow |
| `unit.obliterated` | `target`, `shadow`, `maxHp` | Shadow reached Max Health: `life.dead` follows with `corpse:false` — no body, no downed step |

## 4. The consequence stack

| event | fields | draw |
|---|---|---|
| `deathbed.stood` | `target`, `roll`, `chance`, `woundLevel` (1 or 2), `ordinal` | the hero at 0 STANDS: show the roll vs chance, then the wound level (Wounded / Badly Wounded) on the unit from here on |
| `deathbed.fell` | same fields | the roll failed: `life.downed` + `bleedout.set` follow as before |
| `deathbed.exhausted` | `target`, `woundLevel`, `stands` | no roll left (heroes two stands, civilians one): straight to downed |
| `hp.reset` | `target`, `hp`, `maxHp`, `woundLevel`, `depth` | the fresh bar after a stand; `maxHp.lost` ×1 and `staminaMax.lost` ×1 and ten `statmod.added` (source `deathbed`) precede it |
| `bleedout.accelerated` | `actor`, `target`, `steps`, `bleedOut` | a hit on the downed moved the counter (never kills); `attack.hit` carries `downed:true, damage:0` |
| `life.dead` | + `reason:'bledOut'\|'hp0'\|'obliterated'`, `corpse?:false` | as before; `reason` is new |

## 5. Surge, Power, Karma, Frost

| event | fields | draw |
|---|---|---|
| `surge.checked` | `actor`, `roll`, `chance`, `surge`, `hit`, `link` | heroes only, after the primary action: the check. Optional |
| `surge.hit` | `actor`, `link` | the hero acts AGAIN inside the same activation — a second `move.begin`/attack follows with no `activation.begin` between. `stamina.gained` cause `surge` precedes it |
| `power.gained` | `amount`, `before`, `after`, `kind:'external'\|'arrival'`, `actor?` | the enemy side's Power pool rose; a side-wide number to show, not a unit's. Damage ledgers carry a `POWER` station now |
| `heal.boosted` | `target`, `statusId`, `by` | Karma raised a heal; log line |
| `status.cancelled` | `target`, `statusId`, `against`, `amount` | Burn and Frost annihilated one for one on application |
| `maxHp.gained` | `target`, `amount`, `maxHp`, `hp` | the mirror of `maxHp.lost` |

Damage ledger station names added: `POWER` (225), `FROST` (540). Accuracy ledger: `SITUATIONAL`
(the attack's own modifier), `TARGET_DOWNED` (+20). `attack.declared` may carry `hit`/`of` on a
multihit attack (each hit is its own declared/hit/miss); `attack.cancelled` (`hit`, `of`,
`reason`) ends one early.

## 6. The ground and the light

| event | fields | draw |
|---|---|---|
| `layer.painted` | `hex`, `before`, `after`, `layer` | a painted ground layer on the hex: 1 burning, 2 frost, 3 poisoned, 4 darkness, 0 none (`after`). A layer sits ON the terrain; draw it over it |
| `layer.cancelled` | same | burning painted on frost (or the reverse) left the hex bare |
| `band.advanced` | `turn`, `axis`, `line`, `row` OR `col`, `layer` | The Kiln: one whole LINE lights — a column now (`axis: 'col'`, from the east edge toward the heroes); the `layer.painted`s for that line follow. §13. |
| `night.fell` | `hexes` | the battlefield condition: every hex was painted dark (256 `layer.painted`s follow, `layer: 4`) |
| `light.cast` | `hexes` | at the start of the hero phase, each hero unpainted the darkness within its Vision (the `layer.painted after:0` lines precede it). Draw the lit bubbles; darkness is where nothing was lit |

A unit in the dark beyond the viewer's Vision cannot be targeted: many `activation.idle`
lines in Horrors are heroes that can see nobody. `activation.begin` may carry
`movementMods: [{source, delta}]` when an aura or a wound changed the unit's movement.

## 7. Auras, taunt, confusion, the AI

| event | fields | draw |
|---|---|---|
| `statmod.added` | as before; sources now include `deathbed`, a power id, a trigger id | wound levels and stances are stat mods; auras are NOT — they are derived on read and never emit. To draw an aura, read the unit sheet's `auras: [{id, radius, side, mods}]` from `generated/static.json` (re-run `npm run static` at the new commit) and draw the radius round every standing holder |
| `status.applied` | + `by?` (the applying unit) | Taunt's `by` is the unit the taunted must target |
| `ai.mode` | + `confusedFrom?` | a confused unit ran a different mode this activation |
| `ai.hunts` | `actor`, `target` | the hunter picked its quarry |

New AI mode names in `ai.mode.mode`: `defender`, `support`, `focused-fire`, `value-hunter`,
`follow`, `hunter`.

## 8. What changed on the unit sheet (`npm run static`)

`Unit.attributes` is GONE (`tags` is the one field — `viewer/src/sheet.ts` reads it).
New fields: `toughness`, `surge`, `surgeChance`, `vision`, `woundLevel`, `summoned`, `auras`,
`huntTarget?`, `statuses[].by?`. New `State` fields: `corpses`, `layers`, `power`, `encounter`.
`Outcome` has six arms.

## 9. The order to do it in

1. `unit.enter` at any seq, and the three outcome words — or every encounter export
   refuses to fold.
2. Corpses and layers as board objects (they persist; everything else is a beat).
3. The attack of opportunity label and the ZoC stop.
4. Deathbed: the roll, the wound level on the unit.
5. Waves, light, the band, surge — banners and beats.
6. Auras from the sheet.

## 10. The board is the map's — `map.loaded` (added 2026-09-04)

Ruled 2026-09-03 (engine/DECISIONS.md "board formats"): four board formats
— **8×8 duel, 16×8 dungeon segment, 16×16 standard, 24×24 horde** — and the
default deployment is **heroes WEST (column 0), enemies EAST (last column)**.
Landed as `board.variable-size` (c5085c1) and `board.deploy-edges` (c354793).

**What the engine no longer has:** `WIDTH`, `HEIGHT`, `HEX_COUNT` and the free
functions `hexId / colOf / rowOf / distance / neighboursOf …` in
`src/core/hex.ts`. The viewer's door (`viewer/src/engine.ts`) re-exports them
and will not typecheck until it stops. What replaces them:

```ts
import { geometryOf, FORMATS, type Board } from '../../engine/src/core/hex.js'
const geo = geometryOf({ width, height })   // from map.loaded, below
geo.hexId(col, row)  geo.colOf(h)  geo.rowOf(h)  geo.distance(a, b)  geo.neighboursOf(h)  geo.hexCount
geo.edgeLine('west', 0)                    // the hexes along an edge
```

Hex ids are **`row × width + col` on that board** — hex 20 is (4, 1) on a
16-wide board and (4, 2) on an 8-wide one. Never decode an id without the
board it came from.

**`map.loaded` now carries the board** — the first event of every log:

```
{ type: 'map.loaded', causeId: <mapId>, mapId, scenarioId?,
  width: 16, height: 8,
  deploy: { hero: 'west', enemy: 'east' },      // 'north' | 'south' | 'east' | 'west'
  ...terrain census as before }
```

Read `width`/`height`/`deploy` from it and nothing else: the layout, the
camera fit, the distance table (`sheet.ts` precomputes `HEX_COUNT²` — it is
now per board), the two places that assume 256 hexes (`viewer.js` paint-run
fold, `night.fell`), and which side the heroes are on. A non-square board
(16×8) and a hero edge on the left are both new. The Battle Viewer's
`fields.json[mapId]` is built per map by `tools/field-geometry.mts`, which now
emits `width` and `height` too.

**Which maps say what today:** the six shipping maps and the two 16×16 test
maps declare `south/north` explicitly (the control battles hold until content
moves them); `test.map.dungeon-16x8` says `west/east`; `test.map.duel-8` takes
the default; `test.map.horde-24` is `south/north`. Content's re-placement of
the encounters (PROVING-PLAN.md Stage A3) flips the shipping maps.

**Kingdom:** `kingdom/src/engine.ts` re-exports the same names and
`view/battle.ts` sizes the board from `WIDTH/HEIGHT` — same two-line fix,
from `map.loaded`.

## 11. One action type (added 2026-09-04, `refactor.one-action-type` 26fa562)

Ruled 2026-09-04 three times: an attack, a power and a movement are ONE kind
of thing. In the engine: `ActionDef` (src/core/types.ts) with an `attack`
profile, a `move` profile and/or an `effects` list; `AttackDef`/`MoveDef`/
`AbilityDef` are views over it; one registry `ctx.actions` (content exports
`ACTIONS`, and still `ATTACKS`/`ABILITIES`/`MOVES` as views); a unit has one
`actions` list.

**What changed in the log — one line:** `cooldown.set` now carries
`actionId` on every kind (attack, power, movement) and keeps `abilityId` for
readers that used it; `attackId` on that line is gone. Nothing else in the
event vocabulary moved. `attack.declared` still names `kind` and `damageType`.

**What changed on the sheet (`npm run static`):** if the viewer's sheet reads
a unit's `attacks`/`abilities`/`moves` off a `Unit` in state, it reads
`actions` now (a `UnitDef` row still has the three lists). Attack rows in the
registry carry their pipeline fields under `attack` (`kind`, `bonus`, `stat`,
`damageType`, `crit`, `hits`, `accuracy`, `powerScale`, `applies`), reach is
`range`, and movement rows carry `shape`/`stepRange`/`budgetMod` under `move`.

**Behaviour that moved (findings 32, 33):** a cooldown N now means "skip N
Turns" on every action — powers and enemy attacks recovered a Turn early
before; and a unit with no stamina pool pays no stamina for an attack, as it
already paid none for a move. Every replayable battle re-exported after
26fa562 will differ from its predecessor for those two reasons.

## 12. Zone of control, badges, the deathbed reversal (added 2026-09-04)

**ZoC is a threat, not a stop** (`fix.zoc-threat-not-stop` 1019510). There is
no held. `move.stopped` now carries `reason: 'hit'` and the mover's own `hex`
(no `by`): the provoked swing on the way out connected, the mover lost its
movement and stopped where it stood. Anything that drew "held" from
`move.stopped reason: 'zone of control'` has nothing to read and must go.
`aoo.provoked` / `attack.declared` / `damage.applied` tell the rest.

**Knockback beyond one** (2e649b5): `knocked` carries `asked`, `hexes`, and
`stoppedBy` when the push was cut short (`occupied`, `impassable …`, `edge of
the board`). A push of 2 draws two hexes of travel.

**Badges** (`badge.mechanism` 2e76ede). New lines:
- `unit.badged` — at fielding, one per (unit, badge), after `unit.equipped`:
  `{ actor, badgeId, grants, mods, flags, gaps? }`. Cause = the badge.
- `badge.gained` — mid-battle: `{ actor, badgeId, name, mods, flags, gaps? }`,
  followed by the `statmod.added` / `maxHp.gained` / `maxHp.lost` lines that
  put its modifiers on. Cause = what granted it (the deathbed roll, an
  affliction trigger).
- `badge.held` — a grant that was already there; nothing changed.
The sheet: a `Unit` has `badges: string[]`; `woundLevel` is gone.

**Deathbed, reversed** (`fix.deathbed-no-stands` b4cbd9b; DECISIONS 2026-09-04).
No stands, no Badly Wounded, no dripping-blood ladder. The lines:
- `deathbed.stood { target, roll, chance, ordinal, badgeId, gaps? }` — then
  `badge.gained` for the Wounded badge (`badgeId`), `stamina.gained`,
  `hp.reset { hp, maxHp }`. **Draw a skull on the unit from here on** — Angela:
  "they need a skull in their status bar, to show they're on death's door."
  `gaps` is present until content publishes `badge.wounded`; draw the skull
  either way (the STOOD line is the fact).
- `deathbed.fell { target, roll, chance, ordinal, bleedsOut, gaps? }` —
  `bleedsOut: true` → `life.downed` and the bleed-out as before;
  `false` → `life.dead reason: 'fell'` and `corpse.created`.
- `deathbed.none { target, reason: 'wounded' }` — a Wounded unit at 0: no roll,
  `life.dead reason: 'wounded'`, a corpse.
- `deathbed.exhausted` is gone.

**Afflictions** (`badge.afflictions` a4deae8): `trigger.fired` with
`effect: 'badge.grant', badgeId`, then `badge.gained`. The zombie's claw
afflicts Rotting Flesh at 10%; the werewolf Lycanthropy; the vampires
Vampirism. A badge on the sheet is worth an icon.

## 13. The band walks columns (added 2026-09-04, `encounter.band-axis`)

Heroes deploy WEST, so the Kiln's fire comes from the EAST and advances one
COLUMN a Turn. `band.advanced` now carries `axis` (`'row'` | `'col'`), `line`
(the index on that axis) and, for the reader that wants the old name, `row`
when the axis is rows or `col` when it is columns — never both. The Kiln: turn
2 → col 15, turn 3 → col 14, … Paint the whole line; the `layer.painted` lines
that follow are the hexes (spare hexes are skipped). A viewer that read `row`
unconditionally will read `undefined` on the Kiln — switch on `axis`.

The same landing carries the first pack shipped since content `c24b1ac`:
every hero row fields with `badge.hero` (a `badge.held` line per hero at
fielding — invisible by ruling, do not draw it), `deathbed.stood` names
`badgeId: 'badge.wounded'` with no `gaps` (draw the skull, §12), the ten
encounters are placed heroes-west on their own boards, Rime's frost belt is
columns 7–9, and `map.proving.open/ridge/ford/copse/ruin` (16×8) exist.
Re-export the battles after this commit.
