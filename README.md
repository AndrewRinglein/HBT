# The Combat Framework — working engine

The first battle, running. Built against `FIRST-BATTLE.md`, `COMBAT-SEQUENCE.md`
and `ENGINE-CONSTITUTION.md`.

## Run it

```
npm install
npm run battle 0 --boards    # one battle, full text log, ASCII boards
npm run sweep 100            # 100 battles, the scoreboard
npm test                     # 60 tests
npm run typecheck
```

## What's here

```
src/core/hex.ts        axial hex geometry, 12x12
src/core/rng.ts        named streams, keyed structurally
src/core/types.ts      plain-data state; Ctx holds everything unserialisable
src/core/mutate.ts     the mutator facade — the only writer of state
src/core/pipeline.ts   accuracy + damage stations, per-hit ledger, attack sequence
src/core/movement.ts   reachability, per-step movement
src/core/settle.ts     the fixpoint, with the victory check inside it
src/core/battle.ts     the turn loop and End of Phase ladder
src/core/setup.ts      battle creation and deployment
src/ai/modes.ts        dumb-melee, melee-aggressive, ranged-kite
src/view/text.ts       ASCII board + combat log, rendered FROM EVENTS ONLY
src/sim/score.ts       the scoreboard, derived FROM EVENTS ONLY
src/cli/               battle, sweep
```

## Verified

- Every damage number in the FIRST-BATTLE table, both in unit tests and observed in real battles
- Independent audit: 60 battles re-derived from the stat blocks without importing the pipeline
- Determinism: same replicate produces a byte-identical log
- Inserting a new RNG draw leaves every other stream bit-identical
- Damage conservation; hp, stamina and reach bounds; no shared hexes
- The log alone reproduces final hp, position and life state for every unit
- 5000 battles, zero errors, zero RNG key collisions

## Findings from the first run

1. **4v4 cannot discriminate.** 5000/5000 hero wins. Useful as a correctness fixture, useless as a balance experiment.
2. **8 zombies is the tipping point** — 47% hero win rate. 4→100%, 6→97%, 8→47%, 10→4%, 12→0%.
3. **Massive Strike buys nothing against a 10 hp zombie.** 8 damage and 6 damage both need two hits. Predicted before the first run; confirmed by it.
4. **A kiting ranger is untouchable on open ground.** Movement 5 versus 4 means zero ranger damage across 5000 battles.
5. **The fatigue arc never happens.** Battles end around turn 4; a ranger runs dry around turn 5.

---

## Additions (pass 2)

Four passes, each through its own gate before the next began.

**1. Unit roles** — every unit declares `melee | ranged | support`, readable by every AI.
**2. Hills** — authored maps as editable ASCII (`content/maps.ts`). 2 movement to enter, +10 Accuracy and +2 ranged Reach while occupied. Ranged AI takes high ground only when it buys a shot and does not walk into a melee unit's threat range.
**3. The Mage** — Magic stat, staff that fires as ranged magic (Precision, reach 6) or swings as melee physical (Strength, reach 1). Replaces one Ranger.
**4. Arcane Bolt** — Magic +6 at range 10, 6-turn cooldown, spends the primary action. The engine's first non-attack primary, and its first cooldown.

### The map panel

| map | hills | win% @8 | high ground taken |
|---|---|---|---|
| Open Field | 0 | 22% | 0.00 |
| The Ridge | 14 | 40% | 0.33 |
| Two Knolls | 28 | 35% | 3.70 |
| Highlands | 58 | 55% | 6.38 |

Broken ground favours the heroes — ranged units gain accuracy and reach on it while the melee horde pays double to cross.

## Human battle commands (V2 migration)

`src/core/commands.ts` accepts commands against an already begun action cycle from
`advanceBattle(ctx)`. The host supplies a trusted `{ humanUnitUids: number[] }`
policy separately from input. `controllerOf(ctx, actor, policy)` returns `human`
or `ai`; any positive status declaring `aiControlled` overrides human ownership.
An actor is the current unit array index; the policy uses stable unit UIDs.

```ts
const policy = { humanUnitUids: [ctx.state.units[0]!.uid] }
const next = advanceBattle(ctx)
if (next.kind === 'acting' && controllerOf(ctx, next.actor, policy) === 'human') {
  const result = executeBattleCommand(ctx, policy, {
    kind: 'action', actor: next.actor, expectedSeq: ctx.state.seq,
    actionId: chosenActionId, target: chosenTargetId,
  })
  // result is { ok: true } or { ok: false, reason: string }.
}
```

Movement uses `destination` (a hex ID) instead of `target`; the engine computes
and validates the whole path. A legal move may still be interrupted by combat.
End the cycle with `{ kind: 'end-cycle', actor, expectedSeq: ctx.state.seq }`,
then call `advanceBattle` for the next human/AI cycle, including Surge. A winning
action or an actor falling during its action closes its cycle automatically.
The host runs AI cycles with the existing `runActivation` and
`completeActionCycle` calls. `runBattle` remains the fully automatic driver.

Commands require the event sequence displayed by the UI, so a duplicate/stale
click is rejected. Invalid requests change neither state, events, cursor nor
random draws. `validateBattleCommand` checks the same legality without executing;
display numbers through the existing attack/power previews, never by showing
future random draws. `validateAction` and `executeAction` are internal adapters
without session ownership or cursor checks, intended for trusted engine callers.

This migration step supports profile slots: movement before a primary, either
skippable, and authored free actions retain their slot behavior. Commands reject
`actionSlots: 'any'` until interchangeable-slot execution lands. Positive path
`budgetMod` currently exceeds what the legacy walker can spend; commands allow
only destinations within its executable raw budget. Neither limitation changes
automatic AI decisions; the corresponding corrections are separate work items.
The adapter also reads existing `blocksMovement` and `forcesTarget` status
properties for displacement and hostile target commands. Root leaves zero-step
riders legal; Taunt leaves friendly powers legal. Direct legacy AI helpers do
not yet share this complete adapter, so migrating their call sites remains the
next step rather than a claim of complete AI/human legality parity today.
After `restoreBattle`, supply the trusted control policy again and construct
fresh commands from the restored event sequence.
