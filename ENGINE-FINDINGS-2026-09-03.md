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
| 3 | *(Half answered at `5603c40`: `unit.grown` now states the progression's stat deltas, level and specialty; folded like the kit. The stat block itself is still bare-sheet-plus-deltas.)* **The fielded stat block is not in the log.** `unit.enter` carries hp/maxHp/stamina/maxStamina; armor, resist, dodge, accuracy, movement, reach, the four attack stats and `crit`/`luck`/`toughness`/`surge`/`vision` after `applyProgress` + `applyItems` are not. The panel prints the bare sheet plus the modifiers the log stated; a hero fielded with `heroProgress` (levels, specialties) would print wrong base stats and nothing in the log would say so. | `setup.ts:266-268` (`applyProgress`, `applyItems` before `makeUnit`) | The panel prints sheet + folded deltas. Owed: `unit.enter` carries the fielded def's stat block (or a `unit.fielded` event). This retires half of the viewer's remaining computation. |
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

## 2026-09-04 — engine `5603c40`, the board is the map's

- The door now exports `geometryOf`, `FORMATS`, `boardOf`, `deployOf` and the `Board`/`Edge`/`Geometry`
  types instead of the constants and free functions; `static.json .hexDist` is per board, keyed `"WxH"`
  (the four formats plus every map's board); the viewer sizes its layout from the field's `width`/`height`
  and folds `map.loaded` (`S.board`: width, height, deploy). Two positional battles on `test.map.dungeon-16x8`
  (heroes west) and `test.map.duel-8` joined the library so a non-square board and a west deploy are verified.
- **`unit.grown`** (setup.ts:343) was not in §10 and appeared in the Assembled Party export — folded as
  fielded modifiers (finding 3, half answered).
- The `visual-replay` skill and `tools/replay/` are still in the engine tree.

## 2026-09-04 — engine `4932fde`, §11 (one action type) and §12 (ZoC, badges, the deathbed reversal)

All eight items of the handoff are folded and drawn. What the handoff and §11/§12 did **not** list,
found by verify's "a new engine event is a failure until it is placed on purpose" check:

| # | Finding | Read from | What the viewer did |
|---|---|---|---|
| 13 | **`power.exhausted`** `{ actor, abilityId }` — capability.charges: an action spent its last use. Not in §11 or §12; it appears in the Arc Golem export. | `src/core/action.ts:129` | Folded: the action LEAVES the bar ("they should vanish", Andrew 2026-09-02), with a verify check that it is on the bar before and gone after. |
| 14 | **`charge.spent`** `{ actor, abilityId, left }` — one use gone. Same silence. | `src/core/action.ts:126` | Folded; the bar's right-hand cell prints `N×` uses left instead of the cooldown when an action has charges. |
| 15 | **`maxstamina.gained`** `{ target, amount, maxStamina }` — a badge raised Max Stamina (Lycanthropy). **Spelt all-lowercase**, where its opposite is `staminaMax.lost`. Two spellings of one stat across two events. | `src/core/mutate.ts:118` | Folded as spelt, with a float. One spelling would be kinder — the same shape of problem as finding 8 (`layer` as a name in one event and a number in another). |
| 16 | **`badge.gained` uses `actor` for the unit; `deathbed.*` uses `target`.** Both name the unit the thing happened to. | the exports | Folded per event. Noting it: a reader that assumes one field for "the unit this is about" gets it wrong half the time. |

**Behaviour worth a person's eye, not a bug:** with ZoC no longer stopping movement, the 24×24 horde
battle went from `wipe` in 10 turns to **`capped` at 25** — the tide can now walk past the line and
neither side finishes. Every other battle also moved (cooldowns a Turn longer, afflictions, west/east).

> **Corrected 2026-09-04 by the engine investigation (`engine/FINDINGS-2026-09-03.md` 36).** Bisected per
> commit: the ZoC reversal (`4f73064`) leaves the horde a wipe (seed 3: wipe @12; 20 seeds: 18 wipe · 2
> heroClear). The flip to `capped` is `a4deae8` badge.afflictions — the zombie's Rotting Flesh (+8 max HP,
> +1 armor) lands on Lucius as a buff, fills his bar by 8 on the claw that afflicts him, and the kite loop
> (walk into the ruled-unseen swing, stopped at zero hexes, heal with the rest) holds him alive and
> unfinishing. Nothing walks past the line.

**The `visual-replay` skill and `tools/replay/` are still in the engine tree.**

## 2026-09-04 evening — engine `7be5c55` REGRESSION, found by re-exporting

| # | Finding | Read from | What the viewer did |
|---|---|---|---|
| 17 | **`band.advanced` lost its `row` and `layer.painted` lost its `hex` — both are `null`.** Measured on `showcase.kiln`: at `4932fde` the band emitted `row: 0,1,2,…,7` and every paint carried a hex; at `7be5c55` (the commit whose message names *"the band's column shape"*) the six `band.advanced` lines carry `row: null` and **96 `layer.painted` events carry `hex: null`**. The viewer cannot draw a hex that is not on the board, and Law 1 forbids defaulting it, so the page fails to build. | re-exporting the library at `7be5c55`; `git show` of the `4932fde` export for the comparison | **Nothing** — the library is held at `4932fde`, which is coherent, and the page ships from it. `layerTile` now throws a NAMED error (which hex, which board) instead of a bare `TypeError` deep in a draw call, so the next occurrence is diagnosed in one step. **The Kiln's band is unwatchable at engine HEAD until this is fixed.** |

*How it was caught:* the viewer re-exports the whole library whenever the engine
moves, and the build runs 21 battles end to end. A `hex: null` is not something a
sweep or a unit test would notice — the engine's own tests pass — but it makes
the encounter undrawable. This is the third time re-export-and-play has found an
engine defect the engine's own gate did not (see also #12, #15).

## 2026-09-24 — engine `dd78ff1`, v2.loadout-swap (V2 R6)

| # | Finding | Read from | What the viewer did |
|---|---|---|---|
| 18 | **`loadout.swapped` names the hands before and after but not the stowed after.** | `src/core/swap.ts` performSwap | Stows (handsBefore + stowed) − handsAfter by instanceId (viewer SWITCHES `swapStowedAfter`). A `stowed` field would remove it. |
| 19 | **A swap clamps current HP / Stamina when a maximum leaves, and moves maxHp / maxStamina by the items' modifiers, with no event** (engine SWITCHES swapHealthClamp). | `src/core/swap.ts` fold + clamp | Nothing computed (viewer SWITCHES `swapMaxClamp`); the bars keep the last logged figures. No current held item carries those modifiers. |
