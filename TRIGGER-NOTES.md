# Two design notes, and one vocabulary fix

*For Angela to rule on. 2026-08-15. These are the gaps found while building the
trigger mechanism — things the documents do not yet say, written up rather than
guessed at.*

---

## 0. Vocabulary fix — `turnEnd` → `onActivationEnd`

`GAME-DESIGN.md` §5 lists the hooks as:

> `startOfBattle` · `onEnter` · `onAttack` · `onMiss` · `onHit` · `onDamage` ·
> `onTakingDamage` · `onKill` · `onDeath` · `onWounded` · `onEquip` · **`turnEnd`**

`turnEnd` is the banned collision. A **Turn** is one Hero Phase plus one Enemy Phase
— the numbered one. A hook that fires when *one unit* finishes its go is an
**Activation** end. Naming it `turnEnd` means a trigger that reads as "once per turn"
actually fires once per unit per phase, which on an eight-zombie board is sixteen
times a turn rather than one.

**The engine uses `onActivationEnd`.** `GAME-DESIGN.md` §5 needs the same edit — it's
one line, and it belongs on the find-replace list in `GLOSSARY.md` alongside the
`phase`/`round` fixes.

If you *also* want a genuine once-per-Turn hook later, it needs its own name
(`onTurnEnd`) and it must be obvious which is which at the point of authoring.

---

## 1. The selector vocabulary — a real gap

Triggers need to say **who they land on**. The documents contain exactly one example:

> *A `turnEnd` that damages all enemies within 3 hexes, or that grants +1 Magic.*

That is the entire specification. There is no list of legal targets and no statement
of how range is measured — and §5 explicitly requires the engine to reject an unknown
target keyword:

> **Silent target fallback.** An unrecognized or mistyped target keyword silently
> resolves to the trigger's owner instead of erroring. On defender-side hooks this
> makes every typo self-target. **The new engine errors loudly on unknown targets.**

You cannot error on an unknown keyword without an enumerated set of known ones. So
this needs deciding before range triggers exist.

### Proposed set

| Selector | Means | Note |
|---|---|---|
| `self` | the trigger's owner | |
| `target` | whatever the hook was about | undefined on hooks with no target — see below |
| `enemiesWithin(n)` | living enemies of the owner, distance ≤ n | |
| `alliesWithin(n)` | living allies, **excluding** the owner | see Q3 |
| `unitsWithin(n)` | both sides, excluding the owner | |
| `allEnemies` / `allAllies` | whole side, no range | for auras and battle-wide effects |

### Four questions

**Q1 — Does `target` exist on every hook?** `onAttack`, `onHit`, `onMiss`, `onDamage`
and `onKill` all have a natural target. `onActivationEnd` and `startOfBattle` do not.
A trigger authored as `onActivationEnd` + `target` is a content error. Should the
engine reject it at load (my preference — it's a typo class, and load-time is where
§5 wants loud failures), or resolve it to nothing at runtime?

**Q2 — Is range measured from the owner or from the target?** *"All enemies within 3
hexes"* of the caster, or of whoever it just hit? A cleave reads from the target; an
aura reads from the owner. Both are real. Proposal: **always the owner**, and a
target-centred version gets its own selector name if you want one, rather than a flag
that changes what a word means.

**Q3 — Does `alliesWithin` include the owner?** Proposal: **no**, with `self` added
explicitly when you want both. "Heal all allies within 2" reading as "everyone but
me" is surprising once; a selector that silently includes you is surprising forever.

**Q4 — Do downed units count?** A downed hero is on the board, alive, and not
standing. Are they hit by "all enemies within 3"? Healed by "all allies within 2"?
`SWITCHES.md` already records `hazardOnDowned` = *not modelled — downed carry no
statuses*, which suggests **no** for statuses. Damage is a separate question.

---

## 2. Damage modifiers by target — not captured anywhere

You listed two things that appear in **neither** `GAME-DESIGN.md` nor
`GAME-ARCHITECTURE.md`:

- modifiers to damage based on **target type**
- modifiers to damage based on **status on the target**

### These are stations, not triggers

Worth being firm about, because getting it wrong creates two systems that both
compute damage:

> A **trigger** makes something happen. A **station** changes a number.

"+2 damage vs undead" does not fire, roll, or apply anything — it changes the damage
figure. It belongs in the damage pipeline, which already has spaced slots and a
ledger that would show it:

```
DMG.DECLARE        100
DMG.SOURCE_STAT    200
DMG.SOURCE_STATUS  250     ← the attacker's own statuses (Weakness lives here)
DMG.VS_TARGET      275     ← proposed: type and status of the TARGET
DMG.TERRAIN        300
DMG.CRIT           450
DMG.PROTECTION     550
DMG.MITIGATION     600
```

One new station at 275 covers both cases. It reads the target, adds its rows to the
same ledger, and shows up in the damage waterfall in the log and the replay — so
"why did that hit for 9" stays answerable.

**It also satisfies a constraint §5 already states.** The fourth Hell TCG
anti-pattern is *"preview and resolution disagree on Weak — the UI halves the attack,
the engine subtracts flat."* One station in one pipeline means preview and resolution
are the same code path by construction, not by discipline. Building these as triggers
would reintroduce exactly that divergence.

### What's missing before it can be built

**Target types do not exist.** Units have `role` (melee / ranged / support) and
`typeId` (`zombie`), and neither is a creature type. "vs undead" needs a `type` or
`tags[]` on the unit definition — and that is Bestiary's (session 6) call, not the
engine's. `3-UNITS-SETTLED.md` and `6-BESTIARY-SETTLED.md` are both empty.

Proposal: `tags: readonly string[]` on the unit def — `['undead']`, `['beast',
'large']` — because a unit is often several things at once and a single `type` field
forces a choice that will need undoing.

**The status condition is easy and can land first.** "+50% vs poisoned" needs nothing
new: statuses exist, the target is in hand, and `DMG.VS_TARGET` reads it. That half
is buildable as soon as you want it.

### One question

**Q5 — Additive or multiplicative?** "+2 vs undead" is additive and safe.
"+50% vs poisoned" is multiplicative, and Constitution **Law 7** is integers only,
with one rounding rule — truncating integer division. A ×1.5 on 7 damage is 10, not
10.5. Fine, but it must be stated once and tested, because the Hell TCG bug above was
exactly a rounding disagreement between two code paths.

---

## What I am building now, without waiting on any of this

The four axes, with the narrow versions of each:

- **hooks** — `onAttack` · `onHit` · `onMiss` · `onDamage` · `onKill` ·
  `onTakingDamage` · `onActivationEnd`
- **selectors** — `self` and `target` only. The range set lands with Q1–Q4 answered.
- **effects** — apply status · remove status · damage (physical/magic/true).
  Badge effects are specified in `GAME-ARCHITECTURE.md` ("Badges across the seam",
  `applyBadge` → `badge.applied`, persistence derived from the log) and get wired
  when a `badge.*` id exists to apply.
- **chance and scaling** — integer percent, plus the party-wide Magic sum §5 requires.

Nothing above blocks that, and the axes are what make the rest data rather than code.
