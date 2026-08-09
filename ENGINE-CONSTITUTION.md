# Engine Constitution

*Heroes of Blight and Tragic — the combat engine.*
*These laws govern the engine, the AI, the simulator, and the eventual game client. They are not style preferences. Breaking one produces numbers that are wrong in ways nobody notices for months.*

---

## Law 0 — Speed is not a value in this project.

A battle simulates in roughly 10 milliseconds. A full sweep is minutes. **There is no performance problem here, and there almost certainly never will be.**

No optimization may be added without a measurement showing it was needed. Not a guess, not an instinct — a number, written in the commit message.

This law exists first because "for speed" is the justification for nearly every violation of the laws below. Remove the motive and most of them stop happening.

**When in doubt: slow and obviously correct.**

---

## The laws

### 1. There is exactly one damage function.

All damage runs the same pipeline: the AI's estimate, the player's preview, the tooltip, the tests, the actual resolution. **Never a second formula, never a simplified version, never an approximation.**

The preview is a dry run of the real pipeline with the result discarded. That is the only acceptable way to compute a number you show the player.

*Caught by:* `preview()` returns `{hitChance, damageOnHit, damageOnCrit}`. After every executed attack, assert the applied number equals **the preview branch that actually occurred**. A mismatch is a build failure.

*(Stated this way on purpose. "Preview equals applied" would fail on every miss and every crit — roughly a third of all attacks — and a law that cannot be satisfied gets weakened, after which every other law becomes negotiable.)*

*Why it matters:* if the AI optimizes against a slightly different game, every balance conclusion is about a game nobody plays. If the preview differs from the result, the player sees 14 and takes 11 — and Law 2 of the game design ("the number is always shown before you commit") is a lie.

### 2. There is exactly one legality function.

What a unit may do right now is answered in one place. The AI calls it to enumerate options. The UI calls it to highlight hexes and grey out buttons. The validator calls it to reject bad commands.

**Never re-implement a rule check anywhere else** — not in the renderer, not in the AI, not "just for this one case."

The same applies to every quantity the AI needs to score a move: hit chance, crit chance, effective reach, what a path costs in attacks of opportunity, what is visible. All of them come from `preview()`. `estimateHitChance()` inside the scorer is Law 1's violation wearing different clothes, and it is the single most likely line of code Claude will write unprompted.

*Why it matters:* the AI can never do something a player can't, and a player can never do something the AI didn't consider. That property is what makes AI-vs-AI results say anything about human play.

### 3. Every state change goes through a mutator, and every mutator emits an event.

No code outside the engine's mutator module writes to game state. Not `unit.hp -= 5`. Not "just this once for the animation."

*Caught by:* replaying the events since the last checkpoint must reproduce the current state exactly. A mismatch means something changed without saying so.

*Why it matters:* the log is what makes testing, replay, and the eventual renderer possible. A silent mutation is invisible everywhere until something looks wrong on screen a year later.

### 4. No randomness except through a named stream.

No `Math.random()`. No `Date.now()`. Every roll comes from a labeled stream (to-hit, crit, deathbed, waves, cards, AI ties, generation, placement) and is addressed by **what the roll is**, never by **when it happened**.

"Hero 7's second attack of her third activation" — not "the 47th roll of the battle," and **never** a key containing a turn number. Turn is an outcome, not an address: every mechanic worth testing changes *when* things happen, so a turn-keyed roll unpairs precisely the treatments that work.

*Caught by:* a lint ban on `Math.random` and `Date` in the engine, plus a test that adds a new roll and asserts every other stream is unchanged.

*Why it matters:* this is what lets you compare with-poison against without-poison. Break it and the two runs diverge for reasons unrelated to poison, silently.

### 5. The engine imports nothing.

No file system, no clock, no logging library, no renderer types, no sibling packages. Everything flows in as arguments and out as return values.

*Caught by:* a build rule. It won't compile.

### 5b. State is plain data.

Integers, strings, arrays, plain objects, ids. **No functions, no class instances, no `Map` or `Set`, no object references** — a modifier stores `{effectId, instanceId, params, grantorId, expiresAt}`, and the behaviour is looked up in the registry by id when it resolves.

*Caught by:* one CI assertion — `deserialize(serialize(state))` produces an identical checksum, run on the state at every phase boundary of every golden battle.

*Why it matters:* save games, mid-battle resume, undo, AI lookahead forks, worker parallelism and the replay viewer are all the same property — state can be copied and written down. One closure in state kills all six at once, silently, and the discovery comes a year later when saves won't load. Law 5 forbids the engine from *importing* things; it does not stop it from *holding* things. This is the other half.

### 6. Order is always explicit.

Never rely on insertion order, object key order, registration order, or "whichever effect was written first." Every list that gets iterated is sorted by a stated key, and every sort ends in a tiebreaker that can never itself tie.

*Caught by:* run every battle twice — the second time with unit ids permuted and every input array shuffled — and assert the outcome is identical. One test, no manifest, no nightly job. It catches every accidental order dependency in the codebase at once.

*Why it matters:* exact ties are the *common* case here, not an edge case — deterministic damage and identical fodder guarantee it. An unspecified tiebreak means results change when you rename a field.

### 7. Combat math is integers only.

No floats in damage, mitigation, or any comparison. Percentages are whole numbers (a 65% chance is `65`, not `0.65`). No `Math.pow`, `sqrt`, `sin`, `cos`.

*Why it matters:* floats make "the same battle" stop being the same battle across machines, and they make ordering questions unanswerable. Given deterministic damage, integers cost nothing.

### 8. No caching without a proven invalidation test.

Reachable hexes, effective stats, threat maps — recompute them. They're microseconds (Law 0).

If a cache genuinely earns its place, it ships with a test that mutates the underlying state and asserts the cache noticed.

*Why it matters:* free activation order invalidates caches constantly — a unit half-moves, another acts, the board changed. A stale cache is a rules bug that presents as a mystery.

### 9. Never swallow a failure.

No `try/catch` that continues. No `if (iterations > 10000) break;`. No default value substituted for a missing one. No "this shouldn't happen" comment above code that handles it happening.

If a loop runs away, an invariant breaks, or a value is missing: **stop the battle, mark the run invalid, and say so loudly in the output.**

*Why it matters:* a sweep that reports "3 battles failed" is useful. A sweep that quietly returns 1,000 numbers, three of which are fabricated, is worse than no sweep at all — and you'd act on it.

### 10. A failing test is a finding, not an obstacle.

A test may only be weakened, skipped, or deleted with a written reason in the commit. "Adjusted the assertion" is not a reason.

If a test fails after a change, the first hypothesis is that the change was wrong.

### 11. Don't invent a field when one exists.

Before adding a stat, status, flag, or concept — look for the existing one. Before adding an id, check whether the thing already has one under another name.

*Why it matters:* duplicate concepts are the way a codebase quietly forks into two games.

*The exception that proves it:* `lifeState` is its own field and is never inferred from `hp <= 0`. This law, read literally, argues the opposite — and reading it literally produces a hero who is healed to 4 HP and still bleeding out. When a law and a rules requirement collide, the rule wins and the collision gets written down here.

### 12. Everything has an id, and every log line names its cause.

Every effect, enemy, ability, card, and terrain type has a stable id. Every event in the log records what caused it — not just "3 damage" but "3 damage, from poison, applied by Kira's class power."

*Why it matters:* this is what makes "did the thing actually get added" a universal test that costs nothing per feature, and what stops every debuffer from measuring as worthless.

---

### 13. The vocabulary is fixed.

Battle · Turn · Phase · Activation · Step · Primary Action · Card Play · Attack · Hit · Settle. A Turn is the numbered full cycle; a Phase is the Hero or Enemy half.

*Caught by:* a lint rule banning the identifier `round` in the engine package.

*Why it matters:* "phase" currently means a full round in GAME-DESIGN.md and a half-turn here. A fresh session believes whichever file it opens first, and the resulting bug looks like a rules error for days.

---

## The three shortcuts to watch for specifically

These are the ones most likely to appear, because each of them looks like good engineering in the moment:

1. **A second damage calculation "so the AI can score quickly."** Violates Law 1. The AI runs the real pipeline. It is fast enough.
2. **A cache "because we recompute this every turn."** Violates Law 8. Yes, we do. It costs microseconds.
3. **A loop guard that breaks quietly "so it doesn't hang."** Violates Law 9. Guard the loop, then fail the run — never continue and return a number.

If a change touches any of these three areas, say so explicitly in the commit message so it gets a second look.
