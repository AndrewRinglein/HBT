# Glossary

**The naming authority.** One name per concept, one concept per name. Everything
else — documents, code, conversation, Claude sessions — uses these words.

Most of these names already existed in `GAME-DESIGN.md`. Harvesting the names you
already use beats inventing new ones: the reason to write this down isn't to
rename things, it's so nobody has to guess.

---

## Systems

Proper nouns. Capitalised, used as names, never paraphrased.

| System | What it owns | Documented in |
|---|---|---|
| **The Combat Framework** | Combat. Hexes, turns, damage, statuses, AI, terrain. Also the simulation harness — same engine. | `COMBAT-FRAMEWORK.md` |
| **The Crucible** | Hero generation. Randomised stats, badges, origins, art, name, history. | *(needs a doc)* |
| **The Kingdom** | The strategic map. Hexes, claiming, regions, buildings, the five-phase strategic turn. | *(needs a doc)* |
| **The Hand** | The commander's cards and spells. Energy, draw, card actions. | *(needs a doc)* |
| **The Consequence Stack** | Deathbed → wound levels → injuries → Graveyard → Memorial. | `GAME-DESIGN.md` §8 |
| **The War Council** | The pre-battle tactics draft. | `GAME-DESIGN.md` §10 |
| **The Reckoning** | The post-battle tally and legacy screen. | `GAME-DESIGN.md` §10 |
| **The Chronicler** | The narrator. A voice, not a system — but a named one. | `GAME-DESIGN.md` §13 |
| **Badges** | Persistent per-hero state: abilities, flaws, scars, injuries, personality. | `GAME-DESIGN.md` §7 |

**Rule:** a system is named when it has its own vocabulary. Until then it's a
section in `GAME-ARCHITECTURE.md`, not a proper noun.

---

## Combat vocabulary

Fixed. These words mean exactly one thing each.

```
Battle  →  Turn  →  Phase  →  Activation  →  Step / Primary Action  →  Attack  →  Hit
```

| Term | Means |
|---|---|
| **Battle** | One whole fight, setup to victory condition. |
| **Turn** | One Hero Phase plus one Enemy Phase. **The numbered one.** |
| **Phase** | Hero Phase or Enemy Phase. Two per Turn. |
| **Activation** | One unit's go: movement, then its primary action. |
| **Step** | One hex of movement inside an Activation. |
| **Primary Action** | The unit's one action — attack or class power. **Not cards.** |
| **Card Play** | The commander plays a card. Its own resources, not a unit's action. |
| **Attack** | One attack action. Contains one or more Hits. |
| **Hit** | One instance of damage resolution. |
| **Settle** | The repeat-until-nothing-changes loop after damage lands. |
| **Station** | A numbered slot in the accuracy or damage pipeline. |
| **Stat** | One of the twelve named numbers on a unit. Never read raw — always through `effective()`. |
| **Base** | A stat's value on the unit before any modifier. |
| **Modifier** | One `add` or `set` against one stat, with a source. Stored on the unit, or derived from where it stands. |
| **Rung** | A named step in an End-of-Phase ladder. |
| **Cup** | A named RNG stream. |
| **Arm** | One side of a comparison in a sweep. |

### Banned words

| Never say | Say instead | Why |
|---|---|---|
| `round` | Turn | It means Turn, and having both guarantees a bug. Lint-banned in the engine. |
| "phase" meaning a whole turn | Turn | The wave schedule in `GAME-DESIGN.md` still uses the old sense — find-replace it. |
| "effect" (loosely) | status · ability · rider · station | Four different things; "effect" hides which. |
| "buff" / "debuff" | status | One word covers both, and the sign is in the numbers. |
| "proc" | trigger | |

---

## Naming things in code

### Ids

`<kind>.<owner>.<name>` — lowercase, dot-separated, always prefixed.

```
attack.warrior.axe        attack.punch          (shared: no owner)
status.poison             status.burn
power.mage.bolt
item.longbow              badge.shaky-hands     (modifier sources)
terrain.hills
ai.ranged-kite
map.ridge                 map.highlands
unit.zombie
```

The kind prefix is what makes an id greppable and what makes a log line
self-describing. An id without one is a bug waiting to be ambiguous.

Map ids were bare (`ridge`, `highlands`) until 2026-08-09. The reason is worth
remembering: `map.loaded` was emitting ``causeId: `map.${mapId}` `` — the prefix
was being bolted on at the emit site, so the id itself never needed one. If a
prefix is ever added by the code that logs a thing rather than by the thing, the
id is wrong.

### Functions

The prefix tells you whether it can change anything. This is the single most useful
convention in the codebase, because it means you can tell what a call does without
opening it.

| Prefix | Contract | Examples |
|---|---|---|
| `canX()` | Boolean. Legality. **Never mutates.** | `canAttack`, `canUsePower` |
| `xOf()` / `hasX()` | Pure reader. | `valueOf`, `reachOf`, `hasStatus` |
| `effective()` / `stat()` | **The only way to read a stat.** Pure. `effective` returns value + base + ledger; `stat` returns just the number. | `effective(ctx, u, 'accuracy')` |
| `resolveX()` | Computes a value and its ledger. **Pure** — this is why preview is safe. | `resolveDamage`, `resolveAccuracy` |
| `previewX()` | A dry run of the real thing, result discarded. **Pure.** | `preview`, `previewPower` |
| `performX()` / `useX()` | Does it. Mutates, emits events. | `performAttack`, `usePower` |
| `applyX()` / `setX()` | Mutator facade only — nothing outside `mutate.ts` may define one. | `applyDamage`, `applyStatus`, `setLifeState` |
| `tickX()` | A ladder rung. Runs for one side at one boundary. | `tickStatuses` |

**The load-bearing pair is `resolveX` and `performX`.** `resolve` computes,
`perform` commits. That split is what lets the preview run the real pipeline
without consuming a shield — the bug class Constitution Law 1 exists to prevent.

### Events

`<noun>.<verb-past>` — what happened, not what was called.

```
attack.declared    attack.hit       attack.miss
damage.applied     heal.applied
status.applied     status.reduced   status.expired
life.downed        life.dead
power.used         cooldown.set
activation.begin   activation.idle  activation.end
phase.begin        turn.begin       battle.end
ai.mode            ai.denied        ai.tookHighGround
```

Every event carries a `causeId` — the id of whatever caused it. That's what makes
*"did this actually get added"* one check for every feature instead of a bespoke
test each time.

---

## Naming something new

1. **Does it already have a name in `GAME-DESIGN.md`?** Use that one, exactly.
2. **Is it a system, or a part of one?** Systems get proper nouns. Parts don't.
3. **Does the name collide with a fixed term above?** Then it's the wrong name — collisions are how a codebase quietly forks.
4. **Add it here in the same commit that introduces it.** A glossary updated later is a glossary nobody trusts.

---

## Enforcing it

- `round` is lint-banned in the engine package.
- Every id must match `^[a-z]+\.[a-z0-9.-]+$` — one check at content load.
- The `add-and-verify` skill requires new ids to appear here before an item lands.
