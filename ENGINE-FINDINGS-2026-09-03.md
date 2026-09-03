# Engine findings from the viewer — 2026-09-03

*Written by the viewer chat while bringing `viewer/` current with the engine's
2026-09-03 feature run (`engine/EVENTS-FOR-THE-VIEWER-2026-09-03.md`, engine
`b5ee6ce` → `4516bbb` during the session). The viewer draws what happened and
never decides; where an event did not carry what the viewer needed, it is
written here, not inferred. Each row names the file and line it was read from.
For the engine chat; nothing here was edited in `engine/`.*

## What the document did not list

| # | Finding | Read from | What the viewer did |
|---|---|---|---|
| 1 | **`unit.equipped` is not in the document, and it changes what a unit IS.** Since seam.items-per-unit the bare row (`UNITS[typeId]`, what `sheetOf` reads) has `attacks: [attack.punch]`, `maxHp 12`, `movement 5`, `accuracy 75` for `hero.base.warrior-iron`; the fielded unit is bare + items — `maxHp 16`, `movement 4`, `accuracy 55`, plus `attack.war-axe.chop/hack`. Only the log knows. | `src/core/setup.ts:298-300`, `src/core/items.ts:applyItems` | Folded: the item's `mods` become modifiers with `source = itemId`; `grants`/`abilities` resolve against the attack/ability tables now dumped into `generated/static.json`; the action bar and the danger marker read the kit first (the engine's own order). The resting movement numeral is sheet + Σ movement modifiers, under the existing `stat-delta` exemption. |
| 2 | **The item's triggers are not in `unit.equipped`.** `applyItems` pushes `it.triggers` onto the def; the event carries `grants`, `abilities`, `mods`, `gaps` only. The panel's trigger list for an equipped hero is therefore the bare row's. | `src/core/items.ts:61-62`, `setup.ts:299` | Not drawn. Owed: `triggers` on `unit.equipped`, or the fielded def in full (see 3). |
| 3 | **The fielded stat block is not in the log.** `unit.enter` carries hp/maxHp/stamina/maxStamina; armor, resist, dodge, accuracy, movement, reach, the four attack stats and `crit`/`luck`/`toughness`/`surge`/`vision` after `applyProgress` + `applyItems` are not. The panel prints the bare sheet plus the modifiers the log stated; a hero fielded with `heroProgress` (levels, specialties) would print wrong base stats and nothing in the log would say so. | `setup.ts:266-268` (`applyProgress`, `applyItems` before `makeUnit`) | The panel prints sheet + folded deltas. Owed: `unit.enter` carries the fielded def's stat block (or a `unit.fielded` event). This retires half of the viewer's remaining computation. |
| 4 | **`stamina.drained` is not in the document** (`actor: null, target, asked, amount, stamina`). | `src/core/mutate.ts` (trigger `stamina.drain`) | Folded as the target's stamina plus a `−N STAMINA` float. |
| 5 | **`activation.begin.movePoints` is in the log but not in the document** — named only when the budget was reduced (Law 12). | `src/core/mutate.ts:302-306` | Folded as the live budget; absent means "the fielded movement", which the viewer reconstructs (finding 3). |
| 6 | **`light.cast.hexes` and `night.fell.hexes` are COUNTS, not hex lists** (`112`, `256`). The document's "Draw the lit bubbles" reads as a list. | `src/core/vision.ts:51,65` | The `layer.painted after:0` lines before `light.cast` are the lit hexes; the count is a log line. Fine as is — noting the doc. |
| 7 | **`power.gained.kind` is optional in practice** — `...extra`; the Horrors export's line has no `kind`. | `src/core/mutate.ts:343` | Folded without it. |
| 8 | **`band.advanced.layer` is a layer NAME (`"layer.burning"`); `layer.painted.layer` is a NUMBER (`1`).** Two encodings of one thing across two events. | `src/core/encounter.ts:216`, `mutate.ts:381` | The viewer maps numbers to names through `LAYER_IDS` (now exported through the door). One encoding would be kinder. |
| 9 | **A fifth layer, `layer.weak` (5), landed at `4516bbb`** after the document was written. | `src/content/maps.ts:320` | The viewer keys layers by name from `static.json .layers`, so it draws it (Weak's hue); no viewer code per layer. |
| 10 | **Nothing in the library exercises `unit.raised`, `unit.obliterated`, `unit.shunted`, `encounter.roll` (drawn), `encounter.won`, `aoo.skipped`, `heal.boosted`, `status.cancelled`, `layer.cancelled`, `ai.hunts`, `ai.mode.confusedFrom`.** They are folded from the document's field lists and the emit sites, untested against a real log. | `grep` of `src/core`, `src/ai/modes.ts:724,756` | A showcase that fields a necromancer with a corpse in reach, a Shadow kill, a hunter, a confused unit, and a Burn-on-Frost would let verify bite on them. |
| 11 | **`Outcome` still carries `retreat` (unreachable) and the harness carried `stall`, which is no longer an arm.** | `src/core/types.ts:26` | The harness names all six arms; `stall` dropped. |
| 12 | **Two probe bodies were renamed between `8cfe833` and `4516bbb`:** `arc-golem` → `test-arc-golem`, `test-zombie-burning` → `unit.zombie-burning`; the `test-*` cohort became `alpha-*` in the six map battles. | fresh exports | `prep-art.py` carries the new ids; the old entries stay until the old ids are gone from every export. |

## What the viewer had to add to read the engine

- `src/engine.ts` (the door) now also exports `LAYER_IDS`, `HEX_COUNT` and `distance`
  — read-only content and geometry, no rule. `generated/static.json` gained
  `attacks`, `abilities` (the whole tables, for grants), `layers` (number → name)
  and `hexDist` (the engine's own `distance` for every hex pair, base64), so the
  aura radius is drawn from the engine's geometry and not re-implemented.
- The exemption list did not grow: the kit's movement delta rides the existing
  `stat-delta` sum (`src/actions.js modOf/mvOf`), which is where finding 3 would
  retire it.
