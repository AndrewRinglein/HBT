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
| `band.advanced` | `turn`, `row`, `layer` | The Kiln: one whole row lights; the `layer.painted`s for that row follow |
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
