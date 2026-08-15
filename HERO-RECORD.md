# The hero record — what Crucible needs to emit

Written 2026-08-15 for building a new Crucible. Describes what the engine
*currently* reads, not what it ought to. Where the two differ, that is called out
rather than smoothed over.

---

## 1. One hero = one `UnitDef` row

There is exactly one shape. It lives in `src/core/types.ts` as `UnitDef`, and rows
of it live in `src/content/index.ts` under `UNITS`, keyed by `typeId`.

```ts
warrior: {
  typeId: 'warrior', side: 'hero',

  // survivability
  maxHp: 10, armor: 1, resist: 0,

  // to-hit
  accuracy: 80, dodge: 0,

  // damage-carrying stats
  strength: 5, precision: 3, magic: 0, spirit: 0,

  // movement
  role: 'melee', movement: 5, reach: 0,

  // economy
  maxStamina: 5, staminaRegen: 1,

  // behaviour
  ai: 'melee-aggressive',

  // what it can do — IDS ONLY, resolved against the ATTACKS / ABILITIES registries
  attacks: ['attack.warrior.massive', 'attack.warrior.axe', 'attack.punch'],
  abilities: [],

  // what it IS
  attributes: [],
}
```

Field notes that are not obvious from the name:

| Field | Meaning |
|---|---|
| `typeId` | The registry key. Must match the key it is stored under. |
| `side` | `'hero'` or `'enemy'`. Fixed on the type, not chosen per battle. |
| `armor` / `resist` | Flat reduction against `physical` / `magic` respectively. |
| `accuracy` / `dodge` | Percentages. Enemies currently run `dodge: 0` across the board. |
| `strength` / `precision` / `magic` | The stat an attack names in its own `stat` field. Damage = that stat + the attack's `bonus`. |
| `spirit` | *Ruled by Angela 2026-08-15: identical to Magic, including the party-wide sum (§5).* Currently `0` on every unit and read by nothing. |
| `role` | `melee` / `ranged` / `support`. Every AI can read this about every other unit. |
| `movement` | Move points per activation. |
| `reach` | The hero **Reach stat**. Adds to *ranged* weapon reach only — not melee. Distinct from an attack's own `reach`. |
| `maxStamina` / `staminaRegen` | Enemies run `0/0` — they do not use stamina at all. |
| `ai` | A string naming a behaviour: `melee-aggressive`, `ranged-kite`, `dumb-melee`. |
| `attacks` | **Ordered by preference.** The AI takes the first one it can afford. This ordering is load-bearing, not cosmetic. |
| `attributes` | What the unit *is* — `['undead']`. **See §5, this field has a problem.** |

Optional, currently unused by hero content: `triggers`, `tags`.

---

## 2. What is NOT in the record

Crucible should not emit any of these — the engine creates them at spawn:

- `hp`, `stamina` — start full, from `maxHp` / `maxStamina`
- `lifeState` (`'standing'`), `bleedOut` (`0`)
- `statuses`, `mods`, `cooldowns` — all start empty
- `hex` — position is assigned by battle setup, not by the hero
- `id`, `uid` — array index and persistent identity, assigned at spawn
- `name` — **passed in at spawn, not stored on the def.** See §3.

Terrain effects are derived every time they are read, never stored on the unit.

---

## 3. The structural question: archetype or individual?

This is the thing to settle before Crucible emits anything.

Today `UNITS` is keyed by **type**, and a battle names types with repeats:

```ts
heroes: ['warrior', 'warrior', 'ranger', 'mage']
```

Two warriors, one `warrior` row, identical stats. `name` is a spawn-time argument
precisely because the def describes a *kind of thing*, not a person.

If Crucible produces **specific named heroes with their own stat lines** — Dario
the warrior with his own numbers, distinct from Wren the warrior — then each hero
is its own `UnitDef` under its own key, and `name` should move onto the def. That
works with the engine as written and needs no core change, but it is a different
output shape, and it changes what a battle roster looks like.

Both are viable. It only breaks if Crucible emits one and the roster assumes the
other.

---

## 4. Attacks and abilities are separate rows

A hero's `attacks` / `abilities` are **ids**, resolved against sibling registries.
Crucible has to emit those rows too, or the hero references content that does not
exist.

```ts
// ATTACKS — a weapon swing. No cooldown; gated by stamina and reach.
'attack.warrior.axe': {
  id: 'attack.warrior.axe', name: 'Axe', kind: 'melee',
  damageType: 'physical',       // physical | magic | true
  bonus: 1,                     // added to the governing stat
  stat: 'strength',             // which stat carries the damage
  reach: 1,                     // weapon reach; melee 1, bow 6
  staminaCost: 1,
  applies: { statusId: 'status.poison', value: 2 },   // optional on-hit rider
}

// ABILITIES — a power. Has a cooldown; uses `range`, not `reach`.
'power.mage.bolt': {
  id: 'power.mage.bolt', name: 'Arcane Bolt',
  stat: 'magic', bonus: 6, damageType: 'magic',
  range: 10, staminaCost: 1, cooldown: 6,   // 0 cooldown = every turn
}
```

Note the asymmetry: attacks have `reach` and `kind`; abilities have `range` and
`cooldown`. They are not the same shape and do not share a type.

**Id convention**, as actually used: `attack.<owner>.<thing>`, `power.<owner>.<thing>`,
`status.<thing>`, `terrain.<thing>`, `unit.<thing>`, `map.<thing>`. Owner is the type
id. Shared content drops the owner (`attack.punch`).

---

## 5. ⚠ `attributes` vs `tags` — read this before authoring

`UnitDef` carries **two** fields for what a unit is, and they are not connected.

- Content fills `attributes` — the zombie has `attributes: ['undead']`.
- Every *reader* uses `tags` — `target.ts` `requireTags`, and the planned
  `VS_TARGET` damage station.
- `makeUnit` copies each straight across: `tags: def.tags ?? []`. Nothing bridges them.

**So today, "target all undead" matches no zombies.** A hero authored with
`attributes: ['hero','ranger']` is invisible to any effect that filters on type.

This is open as `fix.unit-tags` in the backlog, specced as a Law 11 collapse to a
single field. It is worth resolving *before* Crucible emits a corpus, because the
choice determines which key every hero record carries — and renaming it afterwards
means rewriting all of them.

The decision is a naming one and it is Angela's: keep `attributes`, or keep `tags`.
It matters because `attributes` may already mean something specific in the design
docs, in which case reusing it for creature types would collide.

---

## 6. How content gets *recorded* — the published-source rule

Emitting a row into `src/content/` is not the same as the content existing.

`node tools/content-check.mjs` sorts every id in the engine into three buckets:

- **PUBLISHED** — the id has a table row in a numbered `*-SETTLED.md` file. This is
  the only evidence that counts.
- **context** — the id is mentioned in some other doc (`GLOSSARY`, `HANDOFF`,
  `CONTENT-AUDIT`). Not sufficient.
- **INVENTED** — no design source anywhere. Currently 10 ids, including every
  attack in the game and the baseline scenario.

Everything currently in `src/content/index.ts` is scaffolding, and the file says so
at the top: numbers invented by an engine session so the harness had something to
run. **No balance conclusion drawn from them is a finding about the game** — several
were reported as findings on 2026-08-14 and should not have been.

The practical rule for Crucible: **whatever it emits needs a row in a numbered
SETTLED file, or it lands as INVENTED.** If Crucible is going to be the thing that
produces heroes, the cleanest arrangement is that it writes the SETTLED rows *and*
the content rows from one source, so they cannot drift.

---

## 7. Minimum viable Crucible output

```
1. a UnitDef row per hero            → UNITS,     keyed by typeId
2. an AttackDef row per weapon       → ATTACKS,   ids referenced by the hero
3. an AbilityDef row per power       → ABILITIES, ids referenced by the hero
4. a published table row for each of the above, in the right numbered SETTLED file
```

Emit 1–3 without 4 and the content exists but is not real. Emit 4 without 1–3 and
`content-check` reports it as published-but-not-built.
