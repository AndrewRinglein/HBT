# The documents

Every document answers **one question**. If you can't name the question, it
shouldn't be a document. If two documents answer the same question, they will
disagree within a month.

---

## The live set

Eight. Keep it eight.

| Document | The one question it answers |
|---|---|
| **GAME-DESIGN.md** | What *is* this game? |
| **GAME-ARCHITECTURE.md** | What systems exist, and how do they connect? |
| **GLOSSARY.md** | What is everything called? |
| **PROJECTIONS.md** | How does combat work? *(entry point)* |
| **COMBAT-SEQUENCE.md** | In what order does combat resolve? |
| **ENGINE-CONSTITUTION.md** | What must the code always do? |
| **SWITCHES.md** | What have we deliberately not decided? |
| **CLAUDE.md** | How do I work in this repo? |

**GLOSSARY.md is the one that makes the other seven agree.** It sits outside the
altitude stack because naming cuts across every level — the same word has to mean
the same thing in a design doc, an architecture diagram, a variable, and a
conversation. Everything else may link to it; it links to nothing.

Everything else is either **content** (data files), **state** (backlog, ledger),
or **archive** (research snapshots — see below).

---

## Three altitudes

```
GAME-DESIGN.md          what the game IS          player-facing truth
    ↓
GAME-ARCHITECTURE.md    what systems EXIST        the map — one paragraph each
    ↓
PROJECTIONS.md          how ONE system works      the territory
COMBAT-SEQUENCE.md
```

Detail flows **down**, never up. A fact belongs at the lowest altitude that needs
it, and higher documents link rather than restate.

---

## The rule that stops dilution

**The architecture document gets exactly one section per system: what it consumes,
what it produces, and a link.**

Not how it works. Not its rules. Not its numbers.

> ### Combat — *The Projections*
> Resolves one battle to an outcome.
> **Consumes:** a hero roster · a map id · an encounter definition · a seed
> **Produces:** an outcome · casualties and wound levels · XP · loot · an event log
> **Owns:** hexes, turns, damage, statuses, AI, terrain
> **Read:** `PROJECTIONS.md`

Five lines. That description stays true while combat changes every day, because
**an interface is stable even when an implementation is not.** The moment the
architecture doc contains a damage number, it has started rotting.

If you find yourself wanting to add combat detail to the architecture doc, that's
the signal it belongs in `COMBAT-SEQUENCE.md` instead.

---

## One owner per fact

| Fact | Lives in | Everywhere else |
|---|---|---|
| The damage formula | COMBAT-SEQUENCE.md | link |
| The design laws | GAME-DESIGN.md | cite by number: *"Law 3"* |
| Zombie stat blocks | content files | link |
| Why we rejected ECS | ENGINE-CONSTITUTION.md | link |
| What anything is called | GLOSSARY.md | use the word, don't redefine it |
| What's still open | SWITCHES.md | link |

The failure this prevents is specific: a number restated in two documents is a
number that will be different in two documents, and you won't find out until
something is built against the wrong one.

**Design laws are the highest-risk case.** They're quotable, they feel like they
belong everywhere, and once copied they drift. Cite the number, never the text.

---

## Archive, don't delete

Research snapshots are worth keeping and dangerous to leave live — they get read as
current when they're a record of what was considered.

Move to `archive/`, date the filename, and put one line at the top:

> *Snapshot, 2026-08-09. Superseded where it disagrees with the live set. Kept for
> the reasoning, not the recommendations.*

Currently belongs there: `HARNESS-DESIGN.md` (recommends randomised maps, which you
overruled), `COMPARISON.md` (research, findings already actioned), `FIRST-BATTLE.md`
(the roster changed — a mage replaced a ranger).

---

## When you add the eighth document

You probably shouldn't. Before creating one, check:

1. **Can you name its one question in a sentence?** No → it's two documents, or none.
2. **Does an existing document already answer it?** Yes → add a section there.
3. **Will it restate a fact that lives elsewhere?** Yes → link instead.
4. **Is it a snapshot or a living document?** Snapshot → `archive/`, dated.

The systems most likely to earn their own document later are **The Kingdom**, **The
Crucible**, and **The Hand** — each once it has real depth and its own vocabulary.
Until then they're a section in the architecture doc and a row in the glossary.

---

## The order to do this in

1. **GLOSSARY.md first.** Everything else is written in its words, so writing it
   last means rewriting everything.
2. **GAME-ARCHITECTURE.md second**, using the five-line interface pattern above.
   Resist detail — the systems that need it will pull their own document out later.
3. **Archive the three snapshots.** Ten minutes, and it halves what a new reader
   has to triage.
4. **Find-replace "phase" → "turn"** in the wave-schedule sections of
   `GAME-DESIGN.md`. It's the one live collision, and it will cause a real bug.
