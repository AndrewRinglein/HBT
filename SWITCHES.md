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
