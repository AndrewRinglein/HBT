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
| `paintedAnisotropy` | The engine's board rows are 96 px apart; a regular hex of colStep 128 would put them 110.85 apart. | **Drawn as the board is:** the scene is 13.4% shorter north–south in board space, exactly as the Atlas scenes already are (terrain-scene.js worldToCSS). Turned 90°, the squash shows as a slight narrowing. | The board projection is the engine's (tools/field-geometry.mts, `rowStep 96`); a regular-hex board is an engine change, not a viewer one. | **superseded 2026-09-30** (engine DECISIONS.md "a true 3D battle": the scene is drawn true; the board px follow the scene — viewer.true-3d-camera, `trueScene` below) |
| `paintedPassability` | The scenes' measured `usable` flags disagree with the engine's `passable` on 103 (Orphanage), 5 (Lumberjack) and 20 (Bridge) hexes. | **The engine's is drawn;** navigation's `usable` is not read. | The engine decides where a unit may stand (the ground letters Andrew checked); the scene's clearance is its own measurement. Reconciling them is content's, not this item's. | provisional — 2026-09-29 |
| `paintedLook` | How is the scene lit? | **As the approved review page** (assets/battle-atlas/orphanage-riverside.mjs): its hemisphere and sun, exposure 1.08, background #d8d4c8, shadows off ground/river/growth, the river's roughness. **The river does not flow** — the board redraws only when the camera moves. | The Orphanage was accepted on that page ("Okay, that's a great map", production.json). | provisional — 2026-09-29 |
| `paintedFallback` | The page is opened as a file, or WebGL is missing. | **The 2D board**, with the status line saying why (the served address comes from `viewer/start.ps1`). The scene is refused, 2D kept, when the GLB's SHA-256 is not the one its hexes were measured on. | Law 1: never a scene whose hexes might have moved. | **superseded 2026-09-30** for a battle that has a 3D scene (engine DECISIONS.md "no other map loads first": no flat board in its place — viewer.true-3d-camera, `sceneUnavailable` below) |
| `cameraDrag` | Which pointer does what? | **Left drag turns (across) and tilts (up/down); right drag grabs and moves the map (middle drag too); the wheel zooms; the arrows still pan; hold Z still peeks; a Reset view button sits at the board's bottom right.** The right button opens no browser menu over the board. | "right-click to grab the map and move" takes the pan off the left button, which the 3D maps Andrew has used (the Atlas pages) give to orbiting. Replaces the left-drag pan of PLAYBACK-DESIGN §7.8 for every board. | provisional — 2026-09-29 |
| `cameraLimits` | How far may it turn, tilt and zoom? | **Turn: all the way round; tilt 10°–75° (the engine's 49.3° is the start); zoom 0.35×–2.5×.** 0.3° of turn and 0.2° of tilt per pixel dragged; each 100-pixel wheel notch ×1.16. | Look choices; nothing ruled. | provisional — 2026-09-29 |
| `cameraReset` | What is "the starting angled view"? | **The engine's tilt, no turn, 1× zoom, the camera centred where the battle opened** (the first framing). The harness's fit/1× button is left as it is. | "It goes back to the starting angled view." | provisional — 2026-09-29 |
| `battleOneAddress` | How does battle 1 open on its scene in the replay page? | **The Orphanage export (`test.opening-orphanage`) joins the library, last;** `BATTLE-VIEWER.html#map.opening.orphanage` (a map id or scenario id) opens it. | The first library slot and the unbound-battle tests stay as they were; the kingdom mounts the component itself. | provisional — 2026-09-29 |
| `schoolTeacherArt` | Battle 1 fields the School Teacher, who had no art entry. | **`art/heroes/schoolteacher` level 1** (token and card), human stature. `art/heroes/teacher` (four levels) is left alone. | The fixed civilians use their one-level art (orphan-child, farmer); a library battle may not field a unit without art. | provisional — 2026-09-29 |

## viewer.character-models — units as 3D models (2026-09-29)

Engine backlog viewer.character-models (PLAYABLE-OPENING-PLAN.md item 5); ruled 2026-09-29, engine DECISIONS.md "the playable
opening" (a unit with no model shows its token; enemies idle, move, attack, hit reaction, death; heroes those plus what their
weapon's powers need; "most" is enough; outfits may be reused) and "the playable battle screen" (the dead lie as the death
motion's end; the downed the same with a bleed-out counter). `tools/character-models.mjs` (the pack), `src/models.js`,
`src/terrain3d.js`, `src/board.js`, `src/viewer.js`, `src/fold.js` (the lunge cue carries the attack's `kind`); probes
`tools/character-models.test.mjs` and engine `test/character-models.test.ts`.

| Switch | Question | Default | Reason | Status |
|---|---|---|---|---|
| `modelBinding` | Which model does each unit type of battle 1 wear? | **`unit.zombie` → the approved five-zombie collection** (accepted-zombies.json: attack double-claw, move slow-walk, idle standing-idle, death), **`hero.base.ranger-scantily` (Forest Elf) → the battle demo's `archer`** (the Oathblade rig with the fitted bow: idle, walk, slash-down, bow shot, shield block, arrow-hit death). | The spec binds from APPROVED-CHARACTERS.md and battle-demo/roster.mjs only. The archer is the one hero rig there with a bow performance and a death; the female rigs have neither. A Forest Elf head exists (hero-transformations/player-roster ranger-scantily) but is in neither named source. "It's okay if we reuse some appearance outfits." | provisional — 2026-09-29 |
| `modelLooks` | Four Zombies, five approved looks: which wears which? | **The battle demo's reduced active cast (plague-zombie, woman-blonde), in turn by the unit's id.** | The demo's cast was reduced on request 2026-09-24 (roster.mjs); each look is four ~43 MB files, so two looks, not five. | provisional — 2026-09-29 |
| `civilianTokens` | The Orphan Child and the School Teacher? | **Their tokens.** | No civilian model is approved; the plan's item 10 says "the four civilians (tokens where no model)". | provisional — 2026-09-29 |
| `modelRecoil` | The Zombies have no approved hit reaction ("Zombie scratch" and "shuffle" were selected 2026-09-29, fitting pending). | **A recoil: the body leans 0.22 rad back and returns over 0.28 s** on the fold's `flash` (damage landed). The archer plays the demo's `block` (shield_blockleft) as its hit reaction. `missing: ['hit']` is listed in the pack; nothing is borrowed from another body. | "It's okay if we don't have everything, but we should have most." The demo plays `block` on the struck hero. | provisional — 2026-09-29 |
| `modelScale` | How tall is a model on the painted scene? | **The roster's stature in the scene's own metres** (a Zombie 1.72 m on hexes of radius 1.5 m) — the battle demo's scale, about two thirds of the 132 px standee. The Health bar and chips stay where the standee put them (item 6 moves them under the unit). | The painted scenes and the demo share RADIUS 1.5 (tools/terrain-workshop/layout-adapter.mjs); a standee-tall model would tower over the houses. | provisional — 2026-09-29 |
| `modelFacing` | Which way does a model face? | **Toward the camera's starting side (south) at first; along its path while it walks; toward its target when it strikes; otherwise as it last faced.** | Look choice; the demo turns the same way (atan2 of the travel). | provisional — 2026-09-29 |
| `modelDeath` | Where does a body lie? | **Dead: at its corpse's hex (corpse.created), in the death's last frame; a death with no corpse plays where the unit stood and the body leaves when the fall ends. Downed: the death's last frame on its own hex, with the fold's bleed-out counter and red ring. A seek lands on the last frame.** The flat corpse art gives way to the body. | "A dead unit is its 3D model lying on the ground (the death motion's end)"; the corpse is the engine's board object. | provisional — 2026-09-29 |
| `modelWalk` | The token glides the board's pace; the walk clip has its own. | **The move clip loops at its own pace × playback speed while the token's traversal runs;** the feet slide at board speed. | Timing is the viewer's (Law 3); a stride-matched walk is look work for later. | superseded 2026-10-01 by `walkStride` (viewer.walk-in-step) |
| `modelBow` | What does the Forest Elf hold? | **The demo's flexible bow in the left hand, always,** fitted as the demo fits it (grip between middle and ring fingers, turned along the forearm at 45% of the shot); no string draw or arrow; no sword or shield. Its punch plays the sword slash-down, empty-handed. | The demo's equipment module serves its files from the Oathblade page's root and cannot be bundled; the fit is ported, the string animation is not. | provisional — 2026-09-29 |
| `modelFiles` | Which bytes may be shown? | **Only a file whose SHA-256 is the approval record's (the Zombies) or the one the pack measured from the roster's file (the archer, the bow).** Motion-only files are parsed without their pictures. | Law 1: the approved model, or the token. | provisional — 2026-09-29 |
| `modelFallback` | No WebGL, the page opened as a file, or a refused file. | **The tokens,** as before; the status line names a look that was refused. Models stand only in a 3D scene (painted or Atlas). | "A unit with no 3D model shows its token." | provisional — 2026-09-29 |

## viewer.under-unit — what sits under a unit, what shows on its body, the acting mark (2026-09-29)

Engine backlog viewer.under-unit (PLAYABLE-OPENING-PLAN.md item 6); ruled 2026-09-29, engine DECISIONS.md "the playable
battle screen" ("a health bar and name underneath the units … some icons go there as well … we don't need poison or
burn icons on the units because we can display that on the unit directly with a fire and poison" · "Protection should
be represented by a bar underneath health" · "Slow does not need representation on the character. It can just change
the number that shows how much movement that character has" · "Stun should be shown on a character") and "the playable
screen: the acting mark ..." (the glowing disc with a sweep, the bobbing arrow). `src/board.js` (UU, BODY_FX, syncUnits),
`src/theme.js` (UNDER_UNIT, onBodyAs, movementOnly), `src/models.js` (heightPx), `src/styles.css`; probes
`tools/under-unit.test.mjs` and engine `test/under-unit.test.ts`.

| Switch | Question | Default | Reason | Status |
|---|---|---|---|---|
| `underUnitWhere` | Which battles draw the name, bars and icons under the unit? | **The playable screen's: every battle bound to a painted scene** (`map.opening.*`), whether the scene loaded or fell back to 2D. Every other board keeps the beside-the-token Health bar and the overhead glyphs (PLAYBACK-DESIGN §1, ruled 2026-09-01). | The rulings are for the playable screen; the replay library's look was ruled separately and is not withdrawn. | provisional — 2026-09-29 |
| `underUnitLayout` | How is the plate laid out? | **Name (the unit's own, from unit.enter, in its side's tint), then the Health bar, then the Protection bar, then the compact icons — 64 px across, centred under the feet, lifted 60 px toward the camera** like the movement numeral. The bars are the same elements as before, laid across (rotated 90°, filling from the left): the Health fill is the folded HP (constant bone fill, ruled 2026-09-01), the segments the engine's absorbing pool. A downed unit keeps its name; its bars and icons go, as before. | The battle demo's mockup ("a thin health line beneath the feet, with small status icons underneath"); one bar, not a second counter. | provisional — 2026-09-29 |
| `underUnitIcons` | Which statuses are icons under the unit? | **Every status the unit holds except those drawn on the body (Stun, Burn, Poison), Slow, and the Protection bar's pool**, in the badge glyph and hue (15 px, compact), with the Deathbed skull and the buff/debuff chevron. The lists are the engine's statuses that block action (Stun, the testing lane's Daze), tick fire (Burn), tick poison (Poison) and reduce movement (Slow, Hobble) — asserted against the engine's flags by engine test/under-unit.test.ts. | "Some icons go there too — but not Poison or Burn"; Stun on the body; Slow only on the number. | provisional — 2026-09-29 |
| `bodyEffects` | What does Stun, Burn or Poison look like on the body? | **Stun: three stars in Stun's glyph and hue circling the head. Burn: the burning ground's flames as tongues up the lower body, with embers. Poison: Poison's green haze with bubbles rising.** Drawn while the fold says the unit holds the status and is standing; over the model's head where a model stands. Rebuilt only when what is drawn changes. | "Display that on the unit directly with a fire and poison"; one hue per status (Law 6); the ground's fire recipe reused, not a second one. | provisional — 2026-09-29 |
| `slowNumber` | "Slow only changes the movement number" — which number? | **The engine's:** during the slowed unit's activation the numeral is activation.begin's movePoints (the engine reads Slow there, engine SWITCHES slowReadAtActivationStart). At rest the numeral stays the sheet's plus the log's modifiers; the viewer does not subtract Slow itself. | Law 0: the viewer computes nothing; the engine states the slowed budget when it sets it. | provisional — 2026-09-29 |
| `actingMarkWho` | The ruling says "the acting hero"; the enemy's units also act. | **Whoever is acting carries the disc, the sweep and the arrow** (the existing act-a, act-a2 and actMark), heroes and enemies alike, as the viewer already did. The arrow and the overhead glyphs ride the model's head where a model stands (its roster height in board px), not the old standee's. | The mark already existed and already followed the active unit; narrowing it to heroes would hide who is acting in the Enemy Phase. | provisional — 2026-09-29 |

## viewer.play-input — drawing the plan and taking the mouse (2026-09-30)

Engine backlog viewer.play-input (PLAYABLE-OPENING-PLAN.md item 7); rulings as in kingdom SWITCHES.md "viewer.play-input".
`src/play.js` (the facts), `src/board.js` (syncPlayInput, drawPlay, the ghost, aimArrow shared with the log's aim, the
right button and Esc), `src/viewer.js` (setPlay, onPlay), `src/actionbar.js` (a row's click, the chosen row lit),
`src/theme.js` (PLAY_HUE), `src/styles.css`; probe `tools/play-input.test.mjs`.

| Switch | Question | Default | Reason | Status |
|---|---|---|---|---|
| `playLook` | What do the reach, hatching, path, ghost, enemy reach and forecast look like? | **Reach: a faint cool fill. Zone of control: diagonal hatching in the attack of opportunity's note hue. Path: a dotted cool ground line from the hero through the engine's walk; provoke points ringed in that note hue. Enemy reach: violet fill where it can walk, red rings where it can hit. Targets: gold rings. The arrow and its numbers are the log's aim arrow (the same function), dashed until a target is clicked, **drawn red — the line, the head and the numbers beside it (`PLAY_HUE.aim`, `aimHit`, `aimDmg`); the walk's path stays cool** (viewer.battle-full-screen). The notch eats the Health bar in the damage red from the Health the hit would leave; lethal turns it blood red with a small red skull beside the bar.** | "Cool is a forecast, warm is what happened" (ruled 2026-09-01); the aim arrow was already ruled and is reused, not redrawn. | **ruled 2026-09-30** for the targeting arrow (Andrew, engine DECISIONS.md: "The arrow for targeting should be red, not blue." — it overrides cool-is-a-forecast for that arrow only); the rest provisional |
| `playGhostLook` | The ghost of a hero drawn as a 3D model? | **Its token standee at 45% opacity with a pale ring, on the planned hex**, model or not. | UI-BUILD-NOTES §5 "a phantom of the unit appears there"; a second WebGL copy of a model is look work for later. | provisional — 2026-09-30 |
| `playClickInspects` | A unit clicked while the host takes the mouse: inspect it, or leave the panel? | **Both: the panel shows it and the click is offered to the host** (to start a hero's activation or aim at a target). The fold's activation.begin still hands the panel to the acting hero. | "The right-hand panel shows whoever was clicked last" (engine DECISIONS.md 2026-09-29). | provisional — 2026-09-30 |
| `playRightButton` | The right button pans the map and steps back. | **A right press that moves less than the drag threshold (4 screen px) is a step back; more is a pan.** | Both are ruled; the camera's threshold already separates a click from a drag. | provisional — 2026-09-30 |
| `playInputLayer` | How does every hex take the pointer? | **One transparent hex button per board hex under the units, built once while the host has facts and kept across redraws; a unit's figure takes its own hex.** A seek drops the facts (the host hands them over again). | A layer rebuilt under a still pointer would re-offer the same hex on every redraw. | provisional — 2026-09-30 |

## viewer.play-chrome — End Turn, its pop-up, 2×, the battle log (2026-09-30)

Engine backlog viewer.play-chrome (PLAYABLE-OPENING-PLAN.md item 8); ruled 2026-09-29, engine DECISIONS.md "the playable
opening" ("Enemy turns play out in full animation. Have a double-speed button.") and "the playable battle screen" (End
Turn ends the Player Phase; "Are you sure you want to end your turn? You have units that have not acted." when a hero
has not acted; the phase ends by itself when all have; no End Activation click after a non-free primary; a battle log).
`src/chrome.js` (the chrome), `src/play.js` (the optional ending facts), `src/viewer.js` (mounted for a host that plays),
`src/board.js` (Esc while the pop-up is up), `src/styles.css`; probe `tools/play-chrome.test.mjs`. The host's half is
kingdom SWITCHES.md "viewer.play-chrome".

| Switch | Question | Default | Reason | Status |
|---|---|---|---|---|
| `playChromeHome` | Where do End Turn, 2× and the log live? | **In the component, mounted only when the host passes `onPlay`** (a replay page shows none of it): Log and 2× in a row at the board's lower right above Reset view, and the log over the board's lower left. **End activation and End Turn (the larger, in gold) are off the board, in their own box at the screen's lower right-hand corner — the foot of the right-hand panel, beside the action bar (viewer.battle-full-screen, 2026-09-30).** The pop-up covers the left column (board and bar) with a scrim until answered. | The battle screen is the component (THREE-PACKAGES-PLAN); the buttons belong on the screen the player is looking at, and nothing replay-only goes below the harness. The board keeps its height (UI-BUILD-NOTES §9.6: fold the log rather than shrink the board). | **ruled 2026-09-30** for the endings (Andrew, engine DECISIONS.md 'the battle is its own full screen…': "You've got End Turn and End Activation on the battle map. They shouldn't be. Put them in the lower right-hand corner."); the rest provisional |
| `playChromeAskFacts` | Who decides whether End Turn asks first? | **The host's facts: `endTurn.yetToAct` (the engine's `heroesYetToAct`, as unit ids). A non-empty list shows the pop-up with the ruled words and the heroes' names; an empty one sends End Turn at once.** `endTurn` null or absent: the button is off. Esc or "Keep playing" closes the pop-up and sends nothing; "End Turn" sends `{kind:'end-turn'}`. | The viewer draws and never decides (Law 0); who has not acted is the engine's query, built for this pop-up (engine command.end-player-phase). Naming them answers "which units?" without a second look. | provisional — 2026-09-30 |
| `playChromeEndActivation` | Is there an End activation button at all? | **Yes, while the host's facts say `endActivation: true`** (a human hero acting). A paid primary closes the activation by itself (engine rule.primary-ends-activation), so the button is never needed after one — it is for a hero who moved and will not use its primary, or used only a free one. | The ruling removes the click after a non-free primary; without the button, a hero who only walks could end its activation only by End Turn, which forgoes every other hero's too. | **ruled 2026-09-30** (Andrew, engine DECISIONS.md 'the End activation button stays') |
| `playChrome2x` | What does 2× speed? | **The whole pump — the viewer's `speed(2)`, toggled back to 1** — for hero and enemy beats alike, and it stays until pressed again. It works while the host offers nothing (an Enemy Phase playing). | "Enemy turns play out in full animation … a double-speed button": one button, the pump's existing rate (PRESENTATION-CLOCK.md), no second clock. | provisional — 2026-09-30 |
| `playChromeLog` | Which log, showing what, open or folded? | **log.js's sentences (the replay's own `buildLog`), one row per event already played, appended as the pump plays them and trimmed on a seek back; open by default, folded by the Log button; it scrolls itself, never the page.** | "A battle log — yes." The sentences already exist and are the engine's words; showing only what has been played keeps the log from telling the Enemy Phase before it animates. | provisional — 2026-09-30 |

## Affliction appearance — 2026-09-30

User ruling: a player unit afflicted with vampirism, lycanthropy, rotting flesh or possession changes to its corresponding head and matching exposed-skin palette. `src/models.js` reconciles the authoritative folded `badges` each frame and on seek; it never grants or removes gameplay badges. The shared registry/runtime lives in `assets/characters/hero-transformations` in the root repository.

Provisional overlap rule: the most recently acquired recognized affliction determines the visible head and skin. Removing it reveals the previous remaining affliction; removing all restores the original. All badges keep their engine behavior.

Coverage: 36 identities / 144 alternatives, 30 exact authored type aliases, six production-only identities without an authored type. Only Lion and Scholar have compatible fitted-body profiles. All other body fits are pending. The currently bound ranger-scantily uses a mismatched placeholder and deliberately receives no atlas substitution. This does not make the 2D token roster transform.

Tests: tools/transformations.test.mjs covers actor isolation, fielded/gained badges, replay restoration, paused additive pose and incompatible-body protection. Body/profile matching requires the exact approved GLB SHA256.

## viewer.opening-cast — battles 2 and 3's cast as models (2026-09-30)

PLAYABLE-OPENING-PLAN.md item 10; engine DECISIONS.md 2026-09-29 "the playable opening" ("units are 3D models where one
exists, else their token"; "outfits may be reused across heroes"). `tools/character-models.mjs` (the pack),
`src/models.js`, `src/board.js`, `src/viewer.js`, `battles/`; probes `tools/opening-cast.test.mjs` and engine
`test/opening-cast.test.ts`.

| Switch | Question | Default | Reason | Status |
|---|---|---|---|---|
| `modelOpeningEnemies` | Which model does each enemy of battles 2 and 3 wear? | **`unit.skeletal-archer` → the approved Skeleton Archer; `unit.imp` → the battle demo's `imp`; `unit.fire-imp` → the demo's `fire-imp`** (the winged imp: idle, walk, fly, die, claw; the claw is its cast). | APPROVED-CHARACTERS.md "Five humanoid enemies" (Idle, Walk, Death) and assets/battle-demo/roster.mjs, the two sources the character-models spec names. | provisional — 2026-09-30 |
| `modelSoldier` | "The Soldier (the undead soldier)" — which look? | **The Armored Skeleton (`strong-skeleton`, accepted-humanoids.json).** | The one approved armoured undead rank-and-file body; the Undead Commander is a commander, the plain Skeleton is `unit.skeleton`'s own. Reuse is allowed. | provisional — 2026-09-30 |
| `modelHumanoidStature` | The approved humanoids have no roster row: how tall, and on which pivot? | **The demo's medium humanoid rig at its stature: 1.728 m on `CC_Base_Hip` (the roster's `archer` row).** | The five were fitted to "the existing medium humanoid" (humanoid-enemies/run.json); their rig is the same CC_Base. | provisional — 2026-09-30 |
| `modelHeroOutfits` | The drafted heroes' outfits by class? | **Ranger → the demo's `archer` (bow); Warrior, Paladin, Priest, Mage, Rogue → the demo's `oathblade`** — every `hero.base.*` of the engine's sheet, by its one class tag. | Only the two male demo rigs carry every ruled motion including a death; the female rigs (scholar, raven, serpent — the Archive Scholar, Raven and Serpent heads) have no death to lie in, and the caster-study priest and sorceress are approved for casting only. A mage's or priest's ranged power plays the oathblade's sword stroke with the board's bolt. | provisional — 2026-09-30; superseded for every hero with a body of its own by `realBodiesOwn` (viewer.real-bodies, 2026-10-01) |
| `modelLunge` | A body with no strike or shot motion (the Skeleton Archer, the Soldier)? | **It turns to its target and leans 0.18 rad toward it and back over 0.36 s on the fold's lunge; the shot itself is the board's projectile (`fx.attack` → the arrow).** `missing` lists `attack`, `ranged` (and `hit`). | "A motion a look lacks is listed as missing, never borrowed"; the recoil (modelRecoil) is the same answer for a hit. | provisional — 2026-09-30 |
| `modelFlight` | "Imps flying"? | **A move whose engine power is flight-shaped (`move.begin` causeId → the action row's `move.shape`) plays the look's `flight` loop (`fly_RM`) while its token travels, then the body returns to idle.** The demo's takeoff and landing (runtime segments of `jump_RM` and `idle_hover_RM`, not separately accepted) are not bound. The Fire Imp is given no flight power by the engine, so it walks. | The engine says when a unit flies; the viewer draws it. imp-family.json: "Takeoff and landing are source-derived runtime segments … not separately purchased or newly approved clips." | provisional — 2026-09-30 |
| `flightPace` | A flight is one `moved` event: how long does its traversal take? | **By the engine's own distance, `move.begin` `hexes`: 200 + 85 × hexes ms, clamped 320–900 ms, as a walk of that many hexes.** | One landing hex paced a five-hex flight at the 320 ms floor — too short to be seen in the air. | the distance kept; the pace superseded 2026-10-01 by `walkPace` (viewer.walk-in-step) |
| `modelFireImp` | The Fire Imp's fire appearance (winged-imp/fire-appearance.mjs)? | **Not applied: the Fire Imp wears the Imp's body.** Its name under the unit tells them apart. | The module fetches its flame atlas from the imp pack's own `/vfx/` server and cannot load from the battle screen; accepted appearance, integration pending. | provisional — 2026-09-30 |
| `openingBattleAddresses` | How do battles 2 and 3 open on their scenes in the replay page? | **Their exports (`test.opening-lumberjack`, `test.opening-bridge`, engine a281811) join the library after battle 1;** `BATTLE-VIEWER.html#map.opening.lumberjack` and `#map.opening.bridge` open them. | As battleOneAddress. | provisional — 2026-09-30 |
| `lumberjacksWifeToken` | The Lumberjack's Wife has no token art. | **The honest ART PENDING standee.** | No hex token exists for her (art/heroes has card art only for other wives); never borrowed art (Law 1). | provisional — 2026-09-30 |


## viewer.true-3d-camera — one real camera; the board drawn through it; no flat board first (2026-09-30)

Engine backlog viewer.true-3d-camera; ruled 2026-09-30, engine DECISIONS.md "a true 3D battle: an orbit camera, every
Orphanage unit its own model, no flash of another map" ("True 3D orbit"; "That other map should not be loading").
`src/camera3d.js` (the camera), `src/board.js` (the pose, the glide, the edges, the pick), `src/terrain3d.js`,
`src/viewer.js`, `src/styles.css`; probes `tools/true-3d-camera.test.mjs` and engine `test/true-3d-camera.test.ts`.

| Switch | Question | Default | Reason | Status |
|---|---|---|---|---|
| `trueScene` | The board px are 13.4% shorter south than east (rows 96 px; a regular hex's would be 110.85). Which gives — the scene or the board? | **The scene is drawn true** (one THREE.PerspectiveCamera in scene metres) **and the board is drawn through it** (the stage's CSS matrix is the camera's projection of the board map). The DOM board stretches 1.155× south to sit on the scene; standees undo it (`--aniso` = south/east, a `scale3d` before their turn). A board with no 3D scene keeps its board px as the world (no stretch, nothing changes there). | The ruling: "terrain and characters seen correctly from any angle". The stretch Andrew saw was the scene squeezed to the board and turned. | provisional — 2026-09-30 |
| `cameraLens` | The perspective camera's lens? | **The board's own: the 2600 px perspective of 2026-09-01** — vertical field of view 2·atan(viewport height / 2 / 2600) (16.3° at 744 px); 1× zoom puts the focus 2600 px away. Near and far: distance/50 and distance×40. | Keeps the starting angled view exactly as it was on a flat board (the camera reproduces the old CSS camera there to 1e-12 px), so Reset still means what `cameraReset` says. | provisional — 2026-09-30 |
| `cameraGlide` | The 1.1 s camera glide was the stage's CSS transition. Now? | **The camera's own:** the pose (focus, turn the short way round, tilt, zoom geometrically) eases over 1.1 s, cubic-bezier(.4, 0, .2, 1); every frame is one real camera. A drag, the first frames and a host with no animation frames show the pose at once. | A CSS transition of a matrix would leave the 3D scene behind the board mid-glide. | provisional — 2026-09-30 |
| `pickVolumes` | What does the pointer's ray meet? | **Every hex's top at its display height** (the cell's pointy hex) **and every unit's body: an upright cylinder on its feet, radius max(26, 0.36 × the standee's width) px, as tall as the figure drawn** (the model's height where a model stands; a downed one 36 px tall, half its width wide). The nearest along the ray wins. The DOM hex buttons and the token stay for a keyboard and a host's own click; the browser no longer hit-tests them (`pointer-events:none`). | "Every click lands on the hex or unit under the pointer from any angle (raycast against the board, not the CSS plane)." | provisional — 2026-09-30 |
| `edgesProjected` | When is a unit off-screen (the edge bubbles)? | **When the camera draws its hex outside the window**: a token's width (24 px × zoom) in from the sides and the foot, its 200 px × zoom standee inside the top — by the camera the pose is going to, so a glide does not flicker them. | A rectangle of the board about the focus is wrong under perspective and a turn. | provisional — 2026-09-30 |
| `sceneLoading` | What shows before the battle's own 3D scene is ready? | **Nothing of the board** (the stage and the edge bubbles hidden) **and one line in the middle: "Loading the battle's 3D map…"**; the status line at the corner as before. | "A different map loads for a blink of an eye … That other map should not be loading" — the blink was the flat swatch board drawn while the scene loaded. | provisional — 2026-09-30 |
| `sceneUnavailable` | The scene cannot be drawn (no WebGL 2, a file opening, a missing or changed file). | **Said plainly in the middle of the board — "This battle's 3D map cannot be drawn here: this browser has no WebGL 2." (or "…could not be drawn: <why>") — and the board stays hidden; no flat board in its place.** The corner status reads "3D map unavailable · <why>". | "A page without WebGL 2 says so plainly rather than drawing a flat board" (the spec). | provisional — 2026-09-30 |
| `modelCivilians` | Which civilians wear bodies, and which bodies? (viewer.every-model) | **Battles 1-3's four — the Orphan Child, the School Teacher, the Lumberjack, the Lumberjack's Wife — each in its own roster body** (activation-registry.json `typeIds` → player-roster/roster.json `bodyModel` → `civilian-study/<id>/animated-v1/painted.glb`, its bytes the `paint-record.json` `outputSHA256`), its four authored clips Idle, Walk, Take Damage, Death. The six farmers' bodies (farmer-modular) are not bound: they are not in battles 1-3. | "Everything in Orphanage has a 3D model … you're just not looking in the right place" (engine DECISIONS.md 2026-09-30 'a true 3D battle'). | provisional — 2026-10-01 |
| `modelCivilianStature` | The civilian bodies are height-normalised; "physical child stature in game is not configured" (civilian-study run.json). How tall does each stand? | **At the demo's medium humanoid stature (1.728 m, the roster's `archer` row) times its standee's height over the School Teacher's** (prep-art.py ARTMAP): the Teacher 1.728 m, the Lumberjack 1.784, his Wife 1.672, the Orphan Child 1.115. | The standees already rule the cast's relative heights; one adult anchors them to the humanoids' rig. | provisional — 2026-10-01 |
| `modelFillMotions` | What fills a look's missing strike, flinch or shot? (viewer.every-model) | **The selected free-library performances, borrowed onto any CC_Base body that has every bone they move:** a punch → the Hook punch (`selections.json` `hook`, "Hook punch can work for our punch"); a sword strike → the Sword combination (`combo`); a flinch → the Head-hit reaction (`battle-actions/selections.json` `headhit`); a bow shot → the battle demo's archer's. The Skeleton Archer: sword, flinch, bow; the Soldier: sword, flinch; the civilians: the punch. Played on the body's own bone lengths (models.js `borrowClip`: rotations kept, only the hip travels, rebased). The Zombies' rig is not CC_Base: their flinch stays `missing` and they recoil (`modelRecoil`). | Engine DECISIONS.md 2026-09-30 'a bunch of motions, not every one' loosens `modelLunge`'s "never borrowed": "a lacking motion is filled from the approved or selected motions where one fits, and is still listed where none does". | provisional — 2026-10-01 |
| `modelImpFlinch` | The Imp's flinch? | **The winged imp's own `getHit`**, a clip of its character file that the demo's roster leaves unused. | Its own body's performance, so nothing borrowed. | provisional — 2026-10-01 |

## viewer.bodies-before-board — no 2D before the 3D bodies (2026-09-30)

Engine backlog viewer.bodies-before-board; ruled 2026-09-30, engine DECISIONS.md "the civilians are played; no 2D before
the 3D bodies" ("two-dimensional images of other heroes are loading before the 3D images are loading"). `src/models.js`
(pending, settle), `src/terrain3d.js`, `src/board.js`; probes `tools/bodies-before-board.test.mjs` and engine
`test/bodies-before-board.test.ts`.

| Switch | Question | Default | Reason | Status |
|---|---|---|---|---|
| `bodiesOpenBoard` | When does the board open? | **When the 3D scene is in and every body of a unit then on the board has loaded or failed** — the loading line ("Loading the battle's 3D map…") covers both. No time limit: a file that never answers keeps the line up. | "No 2D … loading before the 3D images." | provisional — 2026-09-30 |
| `bodyLoadingToken` | A unit that arrives later, whose body is still loading? | **Its token picture is not shown** (its ring, bars and name are, and it can be clicked) until its body stands. | The ruling; better a moment's gap than a 2D figure. | provisional — 2026-09-30 |
| `bodyFailedToken` | A body that cannot be loaded? | **Its token, as before, said in the corner status line** — "if a model lacks something, ask Andrew" (2026-09-30). | Nothing else can show it. | provisional — 2026-09-30 |

## viewer.tactical-camera — 2026-10-01

Andrew accepted the caravan preview's camera ("Okay, that works well. How do we add this to our game visualization?") and
then: "This is a redesign of our camera … We need to redesign the camera." The policy is
`../ATLAS-COMBAT-INTEGRATION.md` "Caravan camera and surroundings: implementation handoff — 2026-10-01"; its numbers live in
`src/camera-policy.js` (POLICY). These are the readings it left open. Supersedes `cameraLimits` and `cameraReset` above.

| Switch | Question | Default | Reason | Status |
|---|---|---|---|---|
| `cameraPolicy` | Which of the preview's numbers carry over? | **Its angles and steps exactly:** start/Angled 40° above the ground; tactical 40–75°; Lower/Raise 10°; Q/E and the turn buttons 60°; Overhead straight down (unturned) as a toggle that restores the view before it; Inspect 3–89° and up to 1.65× farther than the fit, restoring the tactical pose; a left drag from Overhead unlocking the tilt at 75° only past 5 px (an ordinary click/drag threshold stays 4 px); Whole map unturned at 55°. Tilt is stored as the viewer's angle from straight down (90 − elevation). | The handoff lists them as the accepted interaction. | provisional — 2026-10-01 |
| `cameraZoomLimits` | The preview's 14 m / 55 m are "not universal game zoom constants". What are the limits? | **Farthest: the whole original board's fit** (every hex and a standing figure's room, at the current turn, tilt and viewport, the preview's fit maths through the 2600 px lens). **Nearest: a standing figure at half the view's height** (Inspect: the whole height). | "Translate the policy through the viewer's existing board affine/lens and actual character size." Decoration never enters the fit. | provisional — 2026-10-01 |
| `cameraPanBound` | How far may the pan go? | **The preview's rule in zoom:** pinned to the board's middle at the fit, opening to the whole board (plus 60 board px north and south for a first- or last-row figure’s head and bars) by 1.5× the fit’s zoom; Inspect roams the whole of it at any zoom. Turned views clamp in the board's own axes. | Bounded, yet a unit's full figure, bars and name can be brought into view at any edge. | provisional — 2026-10-01 |
| `cameraPanNoVoid` | The preview's bound lets the view's centre reach the board's edge — half the view beyond it. On a board with nothing beyond it? | **Unturned and tactical, the view also stays on the board where the board is the larger** (the rule before 2026-10-01); turned, in Inspect, or on a scene with decorative surroundings, the preview's bound alone. | Seen 2026-10-01 in the browser on the Bridge: the start opened half on the empty background. The preview's freedom was shown over its surroundings. | provisional — 2026-10-01 |
| `cameraResetHome` | Reset (and Home) — the preview's 55° reset or the ruled "starting angled view"? | **The starting angled view, now 40° above the ground:** no turn, 1×, centred where the battle opened; Overhead and Inspect are left. | Ruled 2026-09-29: "it goes back to the starting angled view"; the accepted start is 40°. | provisional — 2026-10-01 |
| `cameraFocus` | The preview's Focus hex in game? | **Focus selected unit** — the unit clicked last, else the subject — centred, and brought to at least 1.5× nearness; the button is greyed with no unit. Ordinary selection keeps the minimal-inclusion nudge and never recentres; in Inspect selection never moves the camera. | The handoff. | provisional — 2026-10-01 |
| `cameraBar` | Where do the buttons go? | **One row along the board's bottom left** (Reset view, Whole map, Angled view, Lower angle, Raise angle, Overhead, ↶, ↷, Focus selected unit, Inspect), the camera line above it; End Turn and the play chrome keep the bottom right. | Ruled 2026-09-30: End Turn and End Activation lower right. | provisional — 2026-10-01 |
| `edgeBubbleInside` | When is a unit "off-screen" for a bubble? | **When no part of its figure — feet to head (its body's height), half a token's width either side — is in the viewport.** | Andrew 2026-10-01: "the pointed indicators … are pointing at things that are on-map. I start out looking at three heroes, and they have those bubbles pointing at them." The old test flagged a unit whose head came within a full figure's height of the top. | provisional — 2026-10-01 |


## viewer.caravan-scene — 2026-10-01

The handoff's Phase 2 (`../ATLAS-COMBAT-INTEGRATION.md` 2026-10-01): the caravan aftermath fielded through the painted path
(engine encounter.caravan-aftermath, its fight provisional — engine DECISIONS.md 2026-10-01).

| Switch | Question | Default | Reason | Status |
|---|---|---|---|---|
| `presentationProfile` | What does a scene's presentation profile hold? | **Look only — the background, the decorative surroundings' settings (ground, scenery, soil, seed, width, the road-exit keep-outs) and which effects run — in `tools/presentation-profiles.json`, validated by `tools/presentation-profile.mjs`. Its facts (fire sites, cursed hexes) are read from the scene's own `assembly.json` and `navigation.json` at pack time and refused unless they agree. Camera defaults and bounds are refused in a profile:** the camera is the policy's for every board and the fit the engine board's. | The handoff asks for a validated profile for camera defaults, bounds, surroundings and environment/VFX; the camera redesign (2026-10-01) made the first two everyone's, so a profile that could carry them could only make one map's camera differ silently. | provisional — 2026-10-01 |
| `caravanLook` | How is the caravan presented? | **As the accepted preview (`assets/battle-atlas/caravan-aftermath.mjs`): its background #302c25 and light, its surroundings (map-surroundings.mjs, seed 731, width 95, its two road exits kept clear), its eleven fires (seven ground fires with ash beds, four on the wrecks) and the Ashen Spirits fog on its 31 cursed hexes, animated every frame.** | The preview is the accepted reference; the GLB holds none of these. | provisional — 2026-10-01 |
| `caravanBloodhoundBody` | The Bloodhound has no 3D body in the character pack. | **Its token, as any unit without a body (bodyFailedToken).** The hound models under `assets/characters/wolf/` are not yet bound; that is the queued "real bodies for every unit" work (engine DECISIONS.md 2026-10-01). | Nothing bound to bind. | provisional — 2026-10-01 |
| `testParts` | The gate's one tests part reached 165–168 s of Cowork's ~178 s. | **Two parts, `--part tests 1/2` and `2/2`, each a share of `tools/page-tests.mjs`' files in order.** | One more test file and the part could never finish in Cowork. | provisional — 2026-10-01 |

## viewer.walk-in-step — 2026-10-01

Engine DECISIONS.md 2026-10-01, Andrew: "when the characters are moving on the map, they're not actually walking or moving.
They just slide across" · "The walking isn't very well timed or spaced based on the number of tiles that are being moved."
Why the clip was not seen: every traversal lasted 320–900 ms whatever its length (a five-hex walk, ~13 m, in 625 ms), and
each walk restarted its clip from 0 under a 0.25 s crossfade from idle — the heroes' 8.8 s walk-forward and the zombies'
7.2 s slow walk never got past their first steps before the token arrived.

| Switch | Question | Default | Reason | Status |
|---|---|---|---|---|
| `walkPace` | How long does a traversal take per hex? | **`DUR.moved` = 600 ms per hex walked (a flight: per hex of the engine's `move.begin` `hexes`), no floor or ceiling.** | The pump owns time (Law 3); the duration grows with the walk. A hex is ~2.6–2.9 m on the painted boards: 4.5 m/s, about 3× the humanoids' walk clip. | provisional — 2026-10-01 |
| `walkStride` | How is a walk clip timed to the board? | **The clip advances (metres covered this frame) ÷ (its ground speed) clip seconds a frame, so it moves one stride per stride length whatever the pace or the easing. Ground speed is measured from the clip on the body (models.js groundSpeed): a root-motion clip by its pivot's travel over the clip, an in-place walk by a planted foot's slide under the hips; unreadable → its own pace, as before.** | Andrew: the feet must not slide. Measured: humanoids and civilians ~1.4–1.5 m/s, the orphan child 0.83, the oathblade walk forward and the zombies' slow walk 0.56, the imps 1.12 walking and 2.39 flying — so at `walkPace` the slow clips play ~8× fast. | provisional — 2026-10-01 |
| `walkLoop` | The oathblade's walk forward starts and stops inside its clip. | **It loops whole; its start and stop pass in ~0.1 s each at the board's pace.** | Trimming a clip to its steady stride is look work on the clip, not on the board. | provisional — 2026-10-01 |

## viewer.weapons-in-hand — 2026-10-01

Engine DECISIONS.md 2026-10-01, Andrew: "The characters are not holding weapons. The whole idea of having 3D weapons is so
they're holding weapons." · "we don't have weapons. I don't see any weapons." Why none were seen: every hero but the rangers
wore the oathblade look with nothing in its hands — the pack fitted only the archer row's bow, and keyed it to the roster row,
not to the hero's kit.

| Switch | Question | Default | Reason | Status |
|---|---|---|---|---|
| `heldModels` | Which 3D model is each held item of a kit? Nothing recorded ties a game item to a weapon model. | **By name (tools/character-models.mjs `HELD`):** longsword → the demo's sword; iron mace → the demo's mace; kite, tower and round shields → the demo's shield; elfbow, shortbow, longbow → the flexible bow; greatsword, war axe, halberd, fire and frost staffs, the obsidian-fang dagger → the weapon tester's greatsword, axe, halberd, magic staff and dagger; the daggers → a dagger in each hand. **Listed, not drawn (`unheld`):** the holy texts, the holy symbol, the throwing knives and the hand crossbow. | The ruling asks for the kit's weapon; the names match one for one. The crossbow's model (`crossbow-equipped.glb`) has no fit in any owner, and the other three have no model at all, so drawing anything there would be faking. | Default — Andrew may re-map any row |
| `heldFits` | How is each model held? No 3D weapon fit is accepted by a person (weapon-card-models/README.md). | **Each with its owner's own fit:** the sword, mace, shield and bow with the battle demo's fits on this very body (`purchased-stage-equipment.js`, as `assets/battle-demo/actors.mjs` uses them: the shield squared to the hand at the strike); the tester's weapons with the tester's socket (`tester/equipment.js`: palm-centred grip, hand flip, the weapon's stored grip, scale and roll) and **no fitted finger pose** — `finger-grips.json` was fitted on the tester's body, and production-lessons.json (preserve-primary-grip) says a grip does not certify another body. The mace takes the sword's fit: both sit on the same haft at the same origin in `15-weapons.glb`. The demo's shield straps and bowstring are not drawn. | Reuse the method, never another body's numbers (PRODUCTION-START.md). The demo fits are the only ones made on the oathblade body. | Default — visual acceptance is Andrew's |
| `heldHands` | Which hand holds what? | **A shield or a bow in the left hand (their fits are the left hand's); the first other weapon in the right, a second in the left; a pair in both.** Two-handed weapons are held in the right hand only. | The demo and the tester hold the main weapon in the right hand; neither has a two-hand fit for these clips (the staff's two-hand support is one clip's, staff-grips.json). | Default |
| `heldLookId` | Heroes of one class share a body but now hold different things; the page loads a look once by its id. | **A look whose held set differs from its roster row's equipment is its own look, `<row>+<models>` (`oathblade+greatsword`, `oathblade+empty-handed`); the paladins' sword and shield and the rangers' bow keep `oathblade` and `archer`.** | One id, one held set (tools/weapons-in-hand.test.mjs). Each armed look parses the body once more. | Default |
| `heldWeight` | The tester's weapons are 49–81 MB each (4K painted maps). | **Loaded as they are.** A party of six may fetch a few hundred MB from the local server the first time. | The files are the approved bytes (hashed); a lighter export is the art pipeline's, not the viewer's. | Default — say if the load is too slow |

## viewer.xcom-camera — 2026-10-01

Engine DECISIONS.md 2026-10-01 'the XCOM-style camera' (Andrew): "one fixed angle and zoom. No tilt, no free rotation. The
arrow keys rotate 90 degrees." · wheel zoom that springs back · edge scroll, no grab-drag, no Reset · the queue · the portrait
· "Anything blocking the view of a character is highly translucent" · "End Turn far less prominent than End Activation".
Replaces viewer.painted-board's drags (`cameraDrag`) and viewer.tactical-camera's bar and tilt range (`cameraBar`,
`cameraPolicy`'s 40–75° and 60° turns); the Overhead, Inspect, Whole map and Focus views stay as hosts' calls (`v.camera`).

| Switch | Question | Default | Reason | Status |
|---|---|---|---|---|
| `xcomAngle` | Which fixed angle and zoom? | **The accepted Angled view, 40° above the ground, at the standard zoom (1×, clamped to the board's fit as before).** | The caravan preview's start, accepted 2026-10-01; the ruling names no other. | Default — Andrew may name another |
| `xcomWheel` | How far does the wheel go, and when does it spring back? | **0.75× to 1.4× of the standard zoom; back to it 600 ms after the last wheel step.** | "a limited amount … snaps back as soon as you stop pressing". | Default |
| `xcomEdge` | What is "pointing past the map edge"? | **The pointer within 18 px of the board's edge scrolls the map that way at 700 board px a second; it stops when the pointer leaves the edge or the board.** The board's pan bound still holds, and at every quarter turn the view stays on the board where the board is the larger. A turn keeps the centre it turned about (four quarters come back exactly). | A browser cannot follow a pointer past the window; the board's edge is the screen's edge in the full-screen battle. | Default |
| `xcomKeys` | Which keys turn? | **← and → (and Q, E) turn 90°; ↑ and ↓ do nothing; Home no longer resets; hold-Z peek is gone.** Right-click and Esc still step the plan back. | "The arrow keys rotate 90 degrees"; "No Reset needed"; the peek was a zoom past the limit. | Default |
| `xcomCentre` | When does the map centre? | **On every new activation (the board's acting unit — in a replay as in a game; the first one is the view a reset returns to), on the host's proposed hero (`centre(id)`), and on clicking an ability (the unit whose bar it is).** Looking at another unit still never moves it. | "the map centered on them"; "Clicking an ability re-centers on the acting unit". | Default |
| `xcomPortrait` | Which portrait, where? | **The card of whose panel it is (subject.js), 171 × 256 px in the board's lower-left corner; the play log moves right of it (left 185 px).** | "A character portrait in the lower-left corner, as tall as the ability bar" (256 px). | Default |
| `xcomEnds` | How much less prominent is End Turn? | **End activation: the large gold button (17 px type, three shares of the row); End Turn: a small quiet button (10 px) at its side.** The End Turn pop-up's own confirm keeps its gold. | "End Turn far less prominent than End Activation." | Default |
| `xcomSeeThrough` | What is "blocking the view", and how translucent? | **Any scene mesh crossing the line from the camera to a standing body's chest or head, above its waist and short of it, is drawn at 0.18 opacity (its own copy of its material), and solid again when it hides nothing; foliage counts; pieces the scene draws see-through itself (opacity under 1, or not normally blended: fire, smoke) do not; an instanced Atlas part fades whole. Looked for at most every 120 ms while anything moves.** | "highly translucent". Pieces share materials, so a copy keeps the rest of the scene solid. | Default |
| `xcomDoubleClick` | What does a double-click on a body do? | **Offers `{kind:'choose', id}` to the host (the kingdom makes that hero the next to act).** The top bar's double-click is viewer.unit-card-bar's. | "Double-click a character in the top bar or on the map to change it"; the card bar is the next item. | Default |

## viewer.unit-card-bar — 2026-10-01

Engine DECISIONS.md 2026-10-01 (Andrew): "We also need a character selector bar above the screen, the way it is in the visual
playback … And I can use that to target things as well as clicking on them." The strip was `harness.js`'s (ruled out of the
game 2026-09-01); it is the component's now (`src/rail.js`), so the standalone page draws none of its own.

| Switch | Question | Default | Reason | Status |
|---|---|---|---|---|
| `railOrder` | Which order, left to right? | **Ascending unit id — heroes, civilians and enemies as the board lists them (the queue of viewer.xcom-camera walks it).** | "the next in the character bar, left to right, civilians included"; the strip's order since 2026-09-01. | Default |
| `railClick` | What does a card do? | **A click is the click on that unit's body (board.js `clickUnit`: the panel, the targeting host, the play host's `{kind:'unit'}` — the same event); a double-click offers `{kind:'choose'}`.** | "use that to target things as well as clicking on them"; "Double-click a character in the top bar … to change it". | Default |
| `railLook` | How does it look? | **The strip as it was: each unit's token on a small card, gold under a hero, violet under an enemy, the one acting lit, those who acted greyed with ✓, the fallen dark with ✝; the card looked at outlined.** | "the way it is in the visual playback". | Default |

## viewer.characters-unfaded — 2026-10-01

Engine DECISIONS.md 2026-10-01 (Andrew): "these characters are faded, like they're ghost-like, because there are other competing
things. The characters are the stars. They should not be faded, especially not one that's selected." Why they were faded: the
board's marks — the grid, the side rings, the shadow blob, the acting glow and sweep, the selection ring, aura and painted-layer
tiles (darkness .78, poison .85), the plan's hatching and tiles — are DOM on `#stage`, drawn OVER the scene's canvas with no
depth, so every mark whose screen area a body stands up into lay across it. Nothing in the 3D scene was transparent.

| Switch | Question | Default | Reason | Status |
|---|---|---|---|---|
| `unfadedLayer` | How do the bodies get above the marks and still stand behind walls? | **A second WebGL canvas, `.terrain3d-bodies`, between `#stage` (the marks) and `#stageTop` (the floats): each frame it takes the scene's depth from its solid pieces only (no colour; what is see-through hides nothing), then draws the bodies alone with every light.** The scene's own canvas no longer draws bodies. A host whose renderer is a stand-in (a test) keeps the one canvas. | Depth is the only honest way to keep "a wall hides a body" while no mark covers one; a CSS trick on the DOM cannot know depth. | Default |
| `unfadedFloats` | The floats were on `#stage`, now under the bodies. | **They ride `#stageTop`, the stage's twin (same size, same camera matrix, same billboard variables), above the bodies.** The names, bars and rings stay on the board, under the bodies. | A damage number must never hide behind the body it is about; the marks are what faded the bodies. | Default |
| `unfadedKey` | How is "the selected one" brightest? | **A warm point light (#fff1d8, intensity 9, reach 5 m) rides the body whose panel it is (subject.js), 1.25 of its height up and 0.6 toward the camera; it lights the bodies only.** | "especially not one that's selected". | Default — the look is Andrew's |

## viewer.side-facing — 2026-10-01

Engine DECISIONS.md 2026-10-01 'the first look at the XCOM camera, the weapons and the bodies' (Andrew): "The enemies should be
facing to the left, and the heroes should be facing to the right." · "Every unit faces the direction it walks, and when a unit
moves next to another unit, the unit, if it's an enemy, should turn to face them. … You also turn to face anybody who attacks you."

| Switch | Question | Default | Reason | Status |
|---|---|---|---|---|
| `facingStart` | Which way is "right"? | **The board's east (+x), read off the board's own map into the scene: heroes and civilians face it, enemies face west, from the moment the body stands.** | Heroes deploy west and enemies east; at the unturned camera east is the screen's right. | Default |
| `facingStepUp` | When does a unit "move next to" another? | **Each time a standing unit's hex changes (each step of a walk, as the fold says it), every standing unit of the other side at the engine's distance 1 from its new hex turns toward that hex; the latest wins.** Friends turn no one. The walker keeps facing its way. | "If someone then walks up from another hex, it turns to face them." The distance is the engine's (`V.data.distance`), never the viewer's. | Default |
| `facingAttacked` | When does a unit turn to its attacker? | **On the strike itself (the fold's lunge cue), hit or miss; the striker faces its target.** Facing is kept afterwards — nothing turns back. | "You also turn to face anybody who attacks you." | Default |

## viewer.xcom-camera-tuning — 2026-10-01

Engine DECISIONS.md 2026-10-01 'the first look at the XCOM camera, the weapons and the bodies' (Andrew): "the zoom-in and zoom-out
should go a little bit further than the 0.75 and 1.4" · "The pointing-to-scroll on the map does not work very well. If you point
to the edge, you sometimes get some movement." Why it seldom moved: on a board smaller than the view (the Orphanage at the standard
zoom) the pan was pinned to the board's middle (`cameraPanNoVoid` and the fit-opened pan range), and in the battle screen the
board's edges meet the bar, the panel and the ability bar, not the screen's edge.

| Switch | Question | Default | Reason | Status |
|---|---|---|---|---|
| `xcomWheel` (revised) | How far does the wheel go? | **0.6× to 1.8× of the standard zoom** (was 0.75–1.4), inside the board's own fit and the figure's nearest; still back 600 ms after the last step. | "a little bit further". | Default |
| `xcomRoam` | How far may the view go? | **Its centre may reach any point of the board, at any zoom (the rows a little past, for heads and labels); Overhead keeps the whole-map framing.** `cameraPanNoVoid` is retired: past the board's edge the scene's ground, or its background, shows. | Pointing at an edge must move the map every time; the pin was what stopped it. | Default |
| `xcomEdge` (revised) | Which edges scroll? | **The board's (within 36 px, was 18), and the screen's (within 14 px) wherever the pointer is over the battle; leaving the battle stops it, unless it left through the screen's edge.** | The battle screen's board does not reach the screen's edge on any side. | Default |

## viewer.real-bodies — 2026-10-01

Engine DECISIONS.md 2026-10-01 'the camera redesigned on the caravan preview; ... what is queued after it' (Andrew): "I said we
could use placeholders, but don't we have more 3D things we can use? We've done all kinds of different heads, all kinds of
different armor. ... the idea is to rig this up. We have the things for everything, just about." `tools/character-models.mjs`
(`ownBody`, the new enemy rows, `UNBODIED`, `--list`), `src/models.js` (`hiddenMaterials`); probes `tools/real-bodies.test.mjs`
and `test/real-bodies.test.ts`. `node tools/character-models.mjs --list` prints who stands in what and what is listed.

| Switch | Question | Default | Reason | Status |
|---|---|---|---|---|
| `realBodiesOwn` | Which body is a hero's "own"? | **(1) The fitted body the transformation registry's `bodyProfile` names for the hero's identity** (activation-registry.json: the Lion of the Host, the Archive Scholar — "accepted demonstration"); **(2) else a female hero's own outfit from the EVE female wardrobe on the accepted slender body** (outfits/eve: nine more heroes); **(3) else the class placeholder (`oathblade`, `archer`), saying so: `body.own: false` and what it lacks.** | The registry owns "which fitted body is this identity's" (two accepted, 34 pending); the wardrobe is the only other rigged per-hero assembly in the project, each outfit from the hero's own card. Every wardrobe outfit is a candidate ("not visually finished or accepted", its record) — shown, not promoted. | Default — Andrew to judge by eye |
| `realBodiesWardrobe` | Which version of each female outfit? | **The one the wardrobe's latest review page shows** (outfits/eve/build_serpent_armhole_viewer.py → serpent-armhole.html, 2026-09-25): the Serpent's `armhole-v4`, the Hunter's and the Ancient Elf's `detail-paint-v2`, the rest `detail-paint-v1`; its `wardrobe-rigged.glb`, the bytes its record's `exports` name. | One selection authority, the newest owning page. Not taken: the Raven's later `fitted-v5…v15` / `paint-v4` repairs (raven-refinement.html), which that page does not select. | Default |
| `realBodiesHeads` | A female hero whose own head is not fitted on the wardrobe body? | **The body's own head (the `original` head variant); her head listed in `body.lacks`.** The Scholar, the Raven and the Serpent show their own fitted heads (the wardrobe's three). | Never another identity's head: hero-transformations/README.md, "Do not substitute another identity's atlas onto a placeholder to conceal that gap". | Default |
| `realBodiesMaleOutfits` | The eight approved male outfits (Black Oath, Dawnblade, Court Champion, the four priests, the Lion)? | **Not used: those heroes stay in the placeholder, listed with where the outfit is.** The Lion stands in his own registry body. | The outfits are outside the project (`C:/Users/aring/.codex/visualizations/2026/09/21/.../hero-outfits/motion`, approved-review/catalog.json); the page streams only from the project root, and a copy made in this worker copy alone would be missing in the main folder. They carry no hero head either. Importing them is asset work (PRODUCTION-START.md), not this item's. | superseded 2026-10-01 by `maleOutfitsImport` (viewer.male-hero-outfits; Andrew: "Number two, yes, that's quite important.") |
| `realBodiesFill` | Motions the new bodies lack? | **Wardrobe bodies:** the wardrobe's own clip set (slender-rebuild/motions: idle_ready, walkforward01, atk_slashdown, shield_blockleft as the hit, hashes measured). **The Lion:** his own idle, walk, slash; the demo hero's shield block as the hit. **Every hero body:** the demo hero's fall (arrow-hit-die) as the death; a bow-holder the demo archer's shot. **Necromancer:** hook punch, casting gesture (Spell_Simple_Shoot), head-hit. **Demon Lieutenant:** its own four clips, head-hit, casting gesture. **Skeleton:** as the Soldier (sword combination, head-hit). All borrowed on the body's own bone lengths, refused where a bone is missing. | viewer.every-model's rule ("filled from the approved or selected motions where one fits"); `spell` is the 2026-09-29 selection "suitable casting and power use". | Default |
| `realBodiesEnemies` | Which body for each enemy with an approved one? | **Bloodhound, Hellhound → the approved hound pack** (wolf/hounds/approved-pack.json: body, idle, run, tearing bite, death — the record's hashes; no hit: listed, the recoil plays); **Poison Imp → the winged imp** (as the Imp and the Fire Imp); **Skeleton, Necromancer → the approved humanoids**; **Demon Lieutenant → its selected reference-painted appearance** (selected-appearances.json) **holding the demo's sword in the right hand** as the demo's commanders hold it. | Each is the owning record's approved body. Not applied (runtime modules the viewer does not load): the hounds' coats and effects, the imps' fire and poison appearances, the Demon's head fire and extended sword point. | Default |
| `realBodiesListed` | The opening's units with no approved body? | **Their tokens, listed in `UNBODIED` with the record's reason:** Zombie Hound, Werewolf, Bruiser Demon, Powerful Imp, Ghoul. | "A unit with no approved parts is listed, not faked"; ANIMATION-MODEL-PLAN.md has no selected body for any of them (the Ghoul's and the first Werewolf's transfers were rejected). | Default |
| `realBodiesHeld` | Weapons on the new bodies? | **The same held fits as viewer.weapons-in-hand** (fitted on the Oathblade body), at each body's own hand bones. | No fit exists per body; the weapons stay in the palm through idle, walk and attack (tools/weapons-in-hand.test.mjs), but nobody has looked at them on these bodies. | Default — Andrew to judge by eye |

## viewer.male-hero-outfits — 2026-10-01

Engine DECISIONS.md 2026-10-01 'the approved male hero outfits come into the project' (Andrew): "Number two, yes, that's quite
important." The approved male outfits are imported into `assets/characters/hero-outfits/` (its `import.json` records what came,
from where, and every hash) and each hero is bound to his own. `tools/character-models.mjs` (`maleOutfit`, `outfitLook`),
`src/models.js` (a look's `unlit`); probes `tools/male-hero-outfits.test.mjs` and `test/male-hero-outfits.test.ts`.

| Switch | Question | Default | Reason | Status |
|---|---|---|---|---|
| `maleOutfitsImport` | Which files are "only the approved files"? | **The seven medium-body `candidate.glb` the heroes stand in (Black Oath, Dawnblade, Court Champion, Barefoot Mendicant, Battle Chaplain, Cathedral Bishop, Rune-Marked Ascetic), and the owning records unchanged (user-acceptance-2026-09-24.json, review-manifest-all-eight-2026-09-24.json, verification.json, REVIEW-2026-09-24.md).** Not imported: the Lion's outfit (he stands in his registry body, `realBodiesOwn`), the large-body models, every clip (the five played are already in the project byte for byte), the .blend working files. | The approval's baseline manifest names the models by hash; only what the battle screen plays is needed. The GLBs are git-ignored (`*.glb`): written once to the main folder, hard-linked into the worker copy, the hashes in `import.json`. | Default |
| `maleOutfitsBody` | Medium or large male body? | **Medium.** | The medium body is the Oathblade's (REVIEW-2026-09-24.md, "Medium source: project … oathblade-neutral.blend"): the hero stature (`FAMILY_FRAME` male = oathblade), the held-weapon fits and the clips are measured on it; the demo reel v2 picker shows the same eight medium models. The large body is approved too and is not used. | Default — Andrew to judge by eye |
| `maleOutfitsClips` | Which motions? | **The preview's own medium clips, by the battle screen's words: idle `idle_ready`, move `walkforward01`, attack `atk_slashdown`, hit `shield_blockleft`, death `arrow-hit-die`** — each byte-identical to the Oathblade's ActorCore file in the project, so those files are played (not borrowed: the rig is theirs). A bow-holder would shoot the demo archer's shot; none of the seven holds a bow. | One clip set for the male family, as the wardrobe's (`realBodiesFill`) and the placeholder's: the same five. Every one of the 50 preview clips is approved as presented; the battle screen binds five. | Default |
| `maleOutfitsHeads` | Whose head? | **The body's own head (`Body_Head`), as the approved preview shows it on the medium body; the Rune-Marked Ascetic's outfit is a whole dressed figure, so his is that figure's own head and `Body_Head` is hidden. Every one lists his own head in `body.lacks`.** | The seven `head-*` entries of approved-review/catalog.json are "design" — "still requires painted attachment and motion review"; never another identity's head (hero-transformations/README.md). The item's spec: "A hero whose own head is not fitted keeps the body's head and lists it". | Default |
| `maleOutfitsShown` | What of the body is shown, and how is it lit? | **As the approved preview (hero-outfits motion/viewer.mjs, armour on): every `Painted_*` mesh shown, every `Body_*` hidden but the head; the outfit's main paint unlit (its base colour, double-sided, not tone-mapped), the gloves, cuffs, joints and exposed hands lit.** | "Shown as its owners show it" (`realBodiesOwn`). Unlit main paint may read brighter than its lit neighbours in the battle scene. | Default — Andrew to judge by eye |
| `maleOutfitsHeld` | Weapons on the outfits? | **The same held fits (`realBodiesHeld`); the preview's runtime equipment (motion/equipment.mjs, its archery-aim and roll-shield corrections) is not used.** | That fitting is preview runtime, not in the GLBs (REVIEW-2026-09-24.md; production-lessons runtime-is-not-export); the battle screen's kit is the hero's own (viewer.weapons-in-hand). | Default — Andrew to judge by eye |
