# ITEMS-PLAN — what the combat engine needs to do to read items

**Written 2026-09-02. A plan, not a ruling.** Nothing here is built. It answers one
ruling and names the engine work it implies, in gate-sized pieces.

> **Ruled 2026-09-02, Andrew:** *"Yeah, the items should go into battle … Items
> drastically affect what players have. They define what attacks they have. They
> modify stats."* — `7-KINGDOM-SETTLED.md`, 2026-09-02.

The kingdom will equip, swap, buy, enchant and reward items. None of that matters
unless the battle fights with what the hero is wearing. Today it does not.

---

## 1. What is true today (paths, not memory)

**The pack folds each hero's content kit into the unit row at build time.**
`content/mkenginepack.mjs` :311–400: for every hero in the prologue party it reads the
Codex `heroKits` override, then for each kit item it (a) copies the attacks the item
`grants` into `authoredAttacks` and the row's `attacks`, (b) compiles the attack's
triggers it can parse (`settledAttackExtras` :219 — the *apply/gain N Status* and
*push … directly away* phrases only), (c) folds the item's `statModifiers` into the
row's numbers (`FOLD` :367 — health → maxHp, armor, resist, dodge, strength, precision,
magic, spirit, reach, accuracy, movement, staminaMax, staminaRegen), and (d) derives
`role` and `ai` from whether any granted attack is ranged. The Hunter's row *is* "Hunter
+ longbow + thick hide"; the row never says so.

**The engine has no item anywhere.** `UnitDef` (`src/core/types.ts` :196) carries stats,
`attacks`, `abilities`, `moves`, `triggers`, `tags` — no item list. `BattleOptions`
(`src/core/setup.ts` :38) names `heroes` and `enemies` by typeId and can `override`
stats per type; it cannot hand a unit a loadout. `StatMod.scope` (`src/core/stats.ts` :41)
already reserves `'item'` — *"so that adding gear later is a new value rather than a
migration"* — and nothing uses it.

**Item powers exist as abilities.** `capability.item-powers` (backlog, done-needs-review)
taught `AbilityDef.effect` three shapes for `power.holy-symbol.heal`,
`power.knight-shield.block`, `power.tower-shield.brace`. They are granted by hero rows,
not by items — because there are no items.

**The Codex has the rows.** `content/hbt-content.json` `items`: 276 rows across seven
classes — weapon 92 · armor 50 · trinket 36 · relic 33 · consumable 28 · bloodrune 23 ·
idol 14. Each carries `itemClass`, `tier`, `hands`, `slots`, `classRestriction`,
`grants` (attack ids; every weapon grants 1–2), `statModifiers`, `triggers` (89 rows have
one or two), `equipCost`, `persists`. Stat keys in use, by count: health 52 · dodge 36 ·
movement 35 · armor 28 · strength 26 · resist 22 · accuracy 21 · staminaMax 16 · reach 11
· precision 10 · luck 9 · magic 8 · crit 8 · spirit 5 · **vision 4 · itemSlots 4 ·
toughness 2 · corruption 1** · staminaRegen 1. The bold four have no `UnitDef` field.

**The kingdom already records equipment** (`kingdom/src/core/campaign.ts` `Hero.equipped`,
`applyEquip`) and builds `BattleOptions` at `kingdom/src/core/seam.ts` `battleOptionsOf`.
It passes `heroes` (typeIds) and hexes. It has nowhere to put the items.

---

## 2. The contract

One new field on `BattleOptions`, parallel to `heroHexes`:

```
heroItems?: readonly (readonly string[])[]   // per fielded hero, in `heroes` order
```

Checked the way hexes are checked (`checkHexes` :117 is the model): length must match
`heroes`, every id must be in the item registry, and the physical facts must hold —
**at most two hands of weapons, at most one armor** — or the fielding is refused, loudly,
naming the scenario, the hero and the item. Item-slot counts, class restrictions and
per-hero caps (one idol, one Bloodrune, one relic) are the *kingdom's* legality
(`GAME-ARCHITECTURE.md` §2.3: one legality function per domain); the engine checks only
what would make a unit physically impossible.

Enemies carry no items. Enemy rows are authored whole and stay so.

**Absent `heroItems` means the hero's default kit** (§4), so every existing scenario,
test and export is unchanged. That equivalence is the proof the whole plan hangs on.

---

## 3. Item rows reach the engine

`content/mkenginepack.mjs` emits a new registry into `src/content/generated/pack.ts`:

```
ItemDef = {
  id, name, itemClass,            // 'weapon' | 'armor' | 'trinket' | 'relic' | 'idol' | 'bloodrune' | 'consumable'
  hands, slots,                   // physical facts the engine checks
  statModifiers: Partial<Record<UnitStat, number>>,   // engine stat names, already mapped by FOLD
  grants: string[],               // attack ids, all present in ATTACKS
  abilities: string[],            // item powers (capability.item-powers) — Holy Symbol, Knight Shield, Tower Shield
  triggers: Trigger[],            // compiled by the same phrase grammar; source = the item id
}
```

Same discipline as units: **compile or name the gap.** A row whose clause the grammar
cannot parse is emitted *without* that clause and the clause goes in `gaps.json` beside
the pack. The four stat keys with no `UnitDef` field (vision, itemSlots, toughness,
corruption) are dropped with named gaps — `itemSlots` is a kingdom fact, `corruption` a
Campaign fact, `vision`/`toughness` engine stats that do not exist yet.

Registry entry: `src/content/index.ts` gets `export const ITEMS = omitDisabled(packItems())`
beside `UNITS` and `ATTACKS`, and `Ctx` carries `items` beside `attacks` so the
kill-switch (`CF_DISABLE_IDS`) reaches them.

Scope of the first pack: **weapons and armor** (every kit, every shelf, every reward),
then trinkets/relics/idols/bloodrunes whose payload compiles. **Consumables are not
items the engine can read yet** — they are used *during* a battle (`stamina`, `targets`,
`description: "Remove 3 Burn and 3 Poison"`), which is an ability with charges, a
capability the engine lacks. Named gap; §7.

Attacks: the pack today emits only the attacks the prologue kits grant. It widens to
**every attack any packed item grants** — the id space is closed and the engine loader
already refuses a dangling id.

---

## 4. Hero rows go bare, and carry a default kit

The fold moves out of the pack and into the engine. A hero's `UnitDef` becomes the hero
*without* items — `h.ported` and `h.derivedBase` untouched — plus one new field:

```
defaultItems?: readonly string[]     // the Codex heroKits override, verbatim
```

Punch stays on the row: it is universal to classed heroes (re-ruled 2026-08-27), not
an item's. `moves` stay on the row (class business). `role` and `ai` are **derived at
fielding** from the applied attacks, exactly the rule the pack uses now (:394) — a
hero handed a bow kites, handed an axe closes.

**The invariant that lands this:** for every hero in `UNITS`, `createBattle` with no
`heroItems` produces a `BattleState` at t=0 **byte-identical** to today's folded row —
same maxHp, same attacks in the same order, same triggers, same role/ai, same seed
consumption. The pack's folded rows are the oracle; keep them in a fixture for the
test, then delete the fold. Any difference is a finding (Law 10).

---

## 5. Applying items at fielding

One function, in core, called from `makeUnit`:

```
applyItems(def: UnitDef, items: readonly string[], ITEMS): UnitDef
```

- **attacks** = the row's attacks, then each item's `grants` in item order — explicit
  order, no dedup (two daggers grant two Stab rows: the same attack twice is still one
  attack id; the list is a set of ids, and `Set` insertion order is the rule).
- **abilities** = the row's, then each item's.
- **triggers** = the row's, then each item's, `source` = the item id.
- **stats**: folded additively into the def at fielding — the arithmetic `FOLD` does
  today, moved. maxHp / maxStamina / movement *must* fold because `hp` and `stamina`
  start at their maxima. The six ledgered stats (strength, precision, magic, spirit,
  accuracy, dodge, armor, resist) *could* instead be `StatMod`s with `scope: 'item'` and
  `source: itemId` so the ledger names the cause per stat (Law 12). **A switch:**
  `items.foldOrLedger` — default fold (identical to today, so the invariant holds),
  ledger available so a sweep can show what the reviewer prefers to read. Not a
  question for Angela.
- **events**: at `battle.begin`, one `unit.equipped` per (unit, item) — `{ unitId, itemId,
  grants, mods }` — so the log says why the Hunter shoots and why his Health is 9. The
  viewer's Muster panel (`VIEWER-PLAN.md`) gets its gear list from these.

Refusals (Law 9): an unknown item id; more than two hands; more than one armor; a
`classRestriction` the hero's tags do not carry — the last is debatable (kingdom
legality) but it is cheap, and a Ranger-locked bow on a Warrior fielded by a test is a
bug worth stopping at the door.

---

## 6. Masterwork and enchanted — zero engine code

Ruled 2026-09-02: masterwork and enchanted items *"are different rows … they basically
follow tier 1 items, and then you're adding something on top."* Recommended id grammar
(kingdom session, same day): `item.longsword.masterwork`, `item.longsword.enchanted.hit-6`
— generated rows, never hand-edited, one per variant the table allows for the item's
class.

Their payloads are already expressible: +1 Max Stamina, +2 Health, +8 Luck, +6 Dodge,
+1 Movement, +6 Hit (accuracy), +3 Hit & +4 Crit, +1/+2 Reach are `statModifiers` the
engine folds. The one that is not a unit stat is **+1 Damage on a weapon**: that is
*this weapon's attacks hit harder*, not *the unit hits harder*. Two ways: (a) the
generated row carries **copied attack rows** with `bonus + 1` — `attack.longsword.slash`
becomes `attack.longsword.slash.enchanted-damage`, pure data, the engine sees an
ordinary attack; (b) `StatScope 'item'` finally earns its keep — a mod scoped to the
weapon's own attacks. **(a) is recommended:** no engine change, and the ledger already
names the attack. (b) is the PoE lesson `stats.ts` was written for and can come when a
second item-scoped effect exists.

So: the generator is content/kingdom tooling; the engine's only need is that the
generated attack rows are in the pack. Nothing in §3–5 has to know the word *enchanted*.

---

## 7. Named gaps, deliberately left

| Gap | Why it waits |
|---|---|
| **Consumables in battle** | An ability with charges, spent from the unit's slots, target grammar from `targets` prose. A capability, not plumbing. After §5. |
| `vision`, `toughness` stats | No `UnitDef` field; 6 rows touch them. Dropped with gaps until the stats exist. |
| Item triggers beyond the two phrases | 89 rows carry triggers; most are prose the grammar cannot read (*"gain +2 Vision for the rest of the Battle"*). Emit what compiles, gap the rest — never round. |
| Idols (one-battle) and Bloodrunes (cost to equip) | Engine-neutral: they are items with payloads. Their *cost* and *lifetime* are the kingdom's (`equipCost`, `persists`). |
| Two identical one-handers | Whether two daggers mean two Stab attacks or one is a rules question the Codex answers per row (`hands`), not the engine. |

---

## 8. The landings, in gate order

Each is one backlog item through `tools/gate.mjs`, and each touches the four places
(the thing · its registry entry · its verify scenario · `SWITCHES.md`).

| # | id | what lands | proof |
|---|---|---|---|
| 0 | `content.field-eve-24` *(filed)* | the rest of the Eve 24 in the pack, kits resolved | every row fields; no alpha-* left for a hero the kingdom lists |
| 1 | `pack.items` | `ItemDef` rows in the pack (weapons, armor, then the rest that compiles); attacks widened to every grant; `ITEMS` registry; gaps.json | every kit item resolves; every `grants` id is in `ATTACKS`; kill-switch on an item id refuses loudly |
| 2 | `seam.items-per-unit` *(filed)* | `heroItems` on `BattleOptions`; `applyItems`; hero rows bare with `defaultItems`; `unit.equipped` events; role/ai derived at fielding; the fold deleted from the pack | **the invariant** (§4): no `heroItems` ⇒ byte-identical t=0 state for every hero; a Hunter fielded with a halberd has Hack and no shot; the seed sequence is unchanged |
| 3 | `content.enchant-rows` *(content tooling, not engine)* | generated masterwork/enchanted rows and their copied attack rows | a `+1 Damage` longsword's slash does exactly one more; a masterwork armor's wearer has +1 Max Stamina |
| 4 | `capability.consumables` | charges, use-in-battle, the target grammar | later; scoped when the Waystation sells them |

Kingdom side, after #2: `battleOptionsOf` passes `hero.equipped` as `heroItems`; the Equip
screen's red/green deltas read the same `applyItems` (one function, Law 1's cousin) so
the preview and the battle cannot disagree.

---

## 9. What this does not decide

- Whether item stat deltas show in the ledger per stat or fold silently — a switch (§5).
- What the kingdom's slot legality is — `7-KINGDOM-SETTLED.md` 2026-09-02 has Andrew's
  rules; they live in `kingdom/src/core/shop.ts`, not here.
- Anything about *which* items exist. That is content; this is the pipe.
