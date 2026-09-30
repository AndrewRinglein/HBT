# Viewer switches — what the viewer has deliberately not decided

A switch is an ambiguity taken as a default instead of a question (DISPLAY-RULES 18, 31):
the item, the choice, the reason, the date. Tooling ambiguities go in GBH's `SWITCHES.md`,
not here. Created 2026-09-24 with the first switch (V2 R6 swap UI).

## V2 R6 swap — folding `loadout.swapped` (2026-09-24)

The rule is COMBAT-V2-DESIGN-2026-09-07.md §11.2 and §15.1 (`loadout.swapped` = unit, hands
before, hands after, stamina spent → "the rail icons and the unit's kit"). Engine
v2.loadout-swap dd78ff1; `src/fold.js`, `src/log.js`, `src/panel.js`, probe
`tools/loadout-swap.test.mjs` over the engine's own log `tools/fixtures/loadout-swap.json`.

| Switch | Question | Default | Reason | Status |
|---|---|---|---|---|
| `swapRailIcons` | Which "rail icons" change on a swap? | **The action bar's attack and power icons** (`actionsOf` over the kit the hands grant) and the panel's Kit / Stowed lines. The replay's unit rail (token chips, §15.5) is unchanged. | The unit rail shows tokens and lit/grey, never a weapon; the icons a swap changes are the unit's actions. | provisional — 2026-09-24 |
| `swapStowedAfter` | The event names hands before and after, not what is stowed after. | **Stowed = (handsBefore + stowed) − handsAfter**, by instanceId — list bookkeeping over named instances, no number. | The engine's performSwap stows exactly that; ENGINE-FINDINGS #18 asks for `stowed` on the event. | provisional — 2026-09-24 |
| `swapMaxClamp` | A leaving item with a Max Health / Max Stamina modifier: the engine clamps current HP/Stamina with no event (engine SWITCHES swapHealthClamp). | **Not computed.** The bars keep the last logged figures until the next event states them. | Law 0: the viewer computes nothing. No current held item carries maxHp/maxStamina; ENGINE-FINDINGS #19. | provisional — 2026-09-24 |
| `swapFloat` | What does the swap look like? | **One small note float** over the unit, `SWAP · −N STAMINA` (n/of = the event's `stamina`), plain `SWAP` when it was free; a 360 ms pump beat; the log line `swaps <before> → <after> · N stamina`. | The same weight as the other one-word beats (KDB, STANDS); Angela to judge the look. | provisional — 2026-09-24 |
| `swapUnexercised` | No library battle carries a swap. | **`loadout.swapped` joins verify's UNEXERCISED list**; the probe drives the engine's own log of a human swap. | A swap is a human command and the AI never swaps (engine SWITCHES swapAi, ruled 2026-09-24), so an AI export cannot carry one. | provisional — 2026-09-24 |

## V2 R6 item uses — folding per-instance uses (2026-09-24)

Engine v2.item-uses (cdb2233): a use belongs to the item instance. No new event — `charge.spent`
gains `instanceId`, `itemId`, `instanceLeft` (0 = spent), `unit.enter` gains `spent` (instance
ids carried in already spent). `src/fold.js`, `src/log.js`, `src/panel.js`, probe
`tools/item-uses.test.mjs` over the engine's own export of TEST scenario `test.item-uses`
(`tools/fixtures/item-uses.json`, engine cdb2233).

| Switch | Question | Default | Reason | Status |
|---|---|---|---|---|
| `itemUsesFold` | Where does the fold keep per-instance uses? | **`spentItems`** (unit.enter's `spent`, verbatim) and **`itemUses`** (instanceId → { itemId, left } as charge.spent states it) on the unit row, declared in the row shape. | Copying named fields, no number computed (Law 0). | provisional — 2026-09-24 |
| `itemUsesLog` | How does the log name the instance? | **The charge.spent line gains `· <item> <instanceId> spent`** (or `N left`). | One line per event, as before; the instance is the new fact. | provisional — 2026-09-24 |
| `itemUsesPanel` | Where are spent items shown? | **A `Spent` line in the panel's kit block**: instances carried in spent (by instance id — the event names no row) and those spent in the battle (row and instance). | Beside Kit and Stowed. | provisional — 2026-09-24 |
| `itemUsesBarCount` | Two potions: the bar shows `1×` until the first drink, since no event states the power's total at fielding. | **Not computed** — the bar keeps the row's `uses` until charge.spent states `left`. | Law 0; counting unit.equipped instances would be a computation. Engine finding: unit.enter (or unit.equipped) could state each power's starting uses. | **ruled** — Andrew 2026-09-24, "1x is fine for now" |

## V2 R7 prop destruction — folding and drawing (2026-09-24)

Engine v2.prop-destroy (a4ca669), v2.prop-attack (e049b15), fix.prop-destroyed-remnant (9a04748):
`prop.damaged`, `prop.destroyed` (with `remnant` when low cover is left) and `prop.struck`
(COMBAT-V2 §12, §15.1; engine EVENTS-FOR-THE-VIEWER §18). `src/fold.js`, `src/log.js`,
`src/viewer.js`, `src/board.js`; probe `tools/prop-destroy.test.mjs` over the engine's own log
`tools/fixtures/prop-strike.json`; library battle `test.prop-destroy`.

| Switch | Question | Default | Reason | Status |
|---|---|---|---|---|
| `propFold` | How does the fold change a prop? | **By id, as stated:** `prop.damaged` below the tier sets `steps`; `prop.destroyed` replaces the prop with the event's `remnant` or removes it. No rule is re-derived — a low `leaves` with no `remnant` throws. | The viewer draws, it never decides; the engine added `remnant` for exactly this (fix.prop-destroyed-remnant). | provisional — 2026-09-24 |
| `propFloats` | What does destruction look like? | **Small note floats:** `STRIKES N PROP(S)` on the struck hex, `DAMAGED s/tier` (n/of = steps) on a step below the tier, `DESTROYED` or `DESTROYED · LOW COVER` on the fall. Beats: struck 520 ms, damaged 260, destroyed 420. | The same small-float grammar as KDB and Thorns; the collapse art (§15.1 "the collapse, the new low cover") is not built. | provisional — 2026-09-24 |
| `propDamagedLook` | How is a damaged or low prop drawn in 2D? | **A damaged hex prop is sepia-dimmed and names `damaged s/tier` in its title; a low hex prop is drawn at 60% opacity; a damaged polygon gets a dashed outline.** | Placeholder markers until the authored damaged-state art (§12.1 "each state has a burning variant … a real, authored state"). | provisional — 2026-09-24 |
| `prop3dUnchanged` | Does the 3D Atlas scene hide a destroyed model? | **Not yet.** The 2D prop layer follows the events; the 3D scene still draws the authored models. The Atlas destruction study (`assets/battle-atlas/TERRAIN-DESTRUCTION.md`) says no combat integration is implied. | Wiring authored scene objects to prop ids is its own R7 item. | provisional — 2026-09-24 |
| `propStruckUnexercised` | No library battle carries a blow aimed at a prop. | **`prop.struck` joins verify's UNEXERCISED list**; the probe drives the engine's own log. | The AI never aims at a prop (engine propAttackAi). | provisional — 2026-09-24 |


## statusUnderUnit — which status display sits under a unit (2026-09-29)

| Switch | Question | Default | Reason | Status |
|---|---|---|---|---|
| `statusUnderUnit` | The battle demo shows three ways to show status under a unit — compact icons, named effect chips, labels on the focused pair only. Which? | **Compact icons**, under the Health and Protection bars; no Poison or Burn icon (those show on the body). | Andrew: "some icons go there as well"; the question itself went unanswered (engine/DECISIONS.md 2026-09-29 "the playable screen: the acting mark …"). | provisional — 2026-09-29 |

## viewer.painted-board — the painted scene as the board, the camera (2026-09-29)

Engine backlog viewer.painted-board (PLAYABLE-OPENING-PLAN.md item 4); ruled 2026-09-29, engine DECISIONS.md "the playable
battle screen" (the painted scenes are the board; "rotate around … a button to reset … right-click to grab the map and
move … navigate, zoom, and tilt … it goes back to the starting angled view"). `tools/painted-scenes.mjs` (the pack),
`src/painted.js`, `src/terrain3d.js`, `src/board.js` (camera), `src/viewer.js`, `src/harness.js`; probes
`tools/painted-board.test.mjs` and engine `test/painted-board.test.ts`.

| Switch | Question | Default | Reason | Status |
|---|---|---|---|---|
| `paintedAlignment` | How is a scene "aligned to its hex grid"? | **By hex index:** engine hex (c, r) is scene hex (col, row); one scene-metre → board-px map per scene (x by colStep/(√3·R), z by rowStep/(1.5·R)), built at page build and **refused** unless every one of the engine's hex centres lands on its scene hex centre (1e-6 px). Heights are the scene hex's standing height. Units stand at the engine hex centre, not at navigation's `stand` point. | Both grids are odd-r pointy-top at the same size; nothing is fitted. The engine's projection decides where a hex is; the viewer computes nothing at run time. | provisional — 2026-09-29 |
| `paintedAnisotropy` | The engine's board rows are 96 px apart; a regular hex of colStep 128 would put them 110.85 apart. | **Drawn as the board is:** the scene is 13.4% shorter north–south in board space, exactly as the Atlas scenes already are (terrain-scene.js worldToCSS). Turned 90°, the squash shows as a slight narrowing. | The board projection is the engine's (tools/field-geometry.mts, `rowStep 96`); a regular-hex board is an engine change, not a viewer one. | provisional — 2026-09-29 |
| `paintedPassability` | The scenes' measured `usable` flags disagree with the engine's `passable` on 103 (Orphanage), 5 (Lumberjack) and 20 (Bridge) hexes. | **The engine's is drawn;** navigation's `usable` is not read. | The engine decides where a unit may stand (the ground letters Andrew checked); the scene's clearance is its own measurement. Reconciling them is content's, not this item's. | provisional — 2026-09-29 |
| `paintedLook` | How is the scene lit? | **As the approved review page** (assets/battle-atlas/orphanage-riverside.mjs): its hemisphere and sun, exposure 1.08, background #d8d4c8, shadows off ground/river/growth, the river's roughness. **The river does not flow** — the board redraws only when the camera moves. | The Orphanage was accepted on that page ("Okay, that's a great map", production.json). | provisional — 2026-09-29 |
| `paintedFallback` | The page is opened as a file, or WebGL is missing. | **The 2D board**, with the status line saying why (the served address comes from `viewer/start.ps1`). The scene is refused, 2D kept, when the GLB's SHA-256 is not the one its hexes were measured on. | Law 1: never a scene whose hexes might have moved. | provisional — 2026-09-29 |
| `cameraDrag` | Which pointer does what? | **Left drag turns (across) and tilts (up/down); right drag grabs and moves the map (middle drag too); the wheel zooms; the arrows still pan; hold Z still peeks; a Reset view button sits at the board's bottom right.** The right button opens no browser menu over the board. | "right-click to grab the map and move" takes the pan off the left button, which the 3D maps Andrew has used (the Atlas pages) give to orbiting. Replaces the left-drag pan of PLAYBACK-DESIGN §7.8 for every board. | provisional — 2026-09-29 |
| `cameraLimits` | How far may it turn, tilt and zoom? | **Turn: all the way round; tilt 10°–75° (the engine's 49.3° is the start); zoom 0.35×–2.5×.** 0.3° of turn and 0.2° of tilt per pixel dragged; each 100-pixel wheel notch ×1.16. | Look choices; nothing ruled. | provisional — 2026-09-29 |
| `cameraReset` | What is "the starting angled view"? | **The engine's tilt, no turn, 1× zoom, the camera centred where the battle opened** (the first framing). The harness's fit/1× button is left as it is. | "It goes back to the starting angled view." | provisional — 2026-09-29 |
| `battleOneAddress` | How does battle 1 open on its scene in the replay page? | **The Orphanage export (`test.opening-orphanage`) joins the library, last;** `BATTLE-VIEWER.html#map.opening.orphanage` (a map id or scenario id) opens it. | The first library slot and the unbound-battle tests stay as they were; the kingdom mounts the component itself. | provisional — 2026-09-29 |
| `schoolTeacherArt` | Battle 1 fields the School Teacher, who had no art entry. | **`art/heroes/schoolteacher` level 1** (token and card), human stature. `art/heroes/teacher` (four levels) is left alone. | The fixed civilians use their one-level art (orphan-child, farmer); a library battle may not field a unit without art. | provisional — 2026-09-29 |
