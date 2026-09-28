# engine — handoff 2026-09-28 00:13

*Written by tools/wrap.mjs. The only handwritten line is the Now line, given to wrap as its argument. The rest is what start.mjs prints and what git holds. Read by `start engine` — not by a chat, directly.*

engine — next capability.move-ignores-zoc, 200 of 232 landed · 1 await review · 5 pending
Now: capability.charge — the enemy pack. Landed c4ddcb0 (content e3af85a), flagged for review: an action carrying a move profile AND an attack profile is a CHARGE (isCharge, src/core/charge.ts) — aimed at a unit, it walks at most the Codex row's hexes through the one step loop (walkSteps, split out of executeMove), then strikes through performAttack; one spend. Both Codex rows carried with their numbers (Fast Zombie 3 hexes Str+1 Acc+10; Iron Colossus 2 hexes cd 4 Str+1 Acc-10), and the Colossus's noPrimaryAction closes the primary slot (resolveActionSlot). dumb-melee charges its target when out of reach instead of walking. Nine switches (SWITCHES.md, Charge section): movement points not hexes, target must be out of reach, cheapest landing hex, the walk provokes, a short walk spends the charge and strikes nothing, never an attack of opportunity. Test test/charge.test.ts reads every number from the Codex row; hit chance and damage equal preview() from the landing hex; kill switch fails without both rows; scenarios test.charge-a / -b. Tried: four existing tests encoded 'an action has one profile' or 'Charge is a gap' — rewritten as the rules they protected (hence the flag); eight Fast-Zombie showcases moved (the zombie now carries the charge, and charges), so a new frozen layer test/fixtures/battle-cursor-charge.json (tools/capture-charge-cursor.mts). Noticed: another session committed rulings to this repo mid-gate (22c6e11, b47bce5, b9ed9c1), which restarted the gate once; viewer-direct-map ran 24 s of its 30 s limit under load; audit-all not run (does not fit one call) — eight shards green on 0a2127d0aa stood in. Git ran through the lock-moving shim ($HOME/bin/git). Next: capability.move-ignores-zoc.
New chat with Heroes of Blight and Tragic — engine: capability.move-ignores-zoc, the hounds' walk that provokes no attack of opportunity
  start engine
Last landing: 2026-09-28 00:02 (capability.charge). Previous chat ended: on a wrap, 2026-09-28 00:13
WRAP NOT COMMITTED: 2026-09-28 00:13 — HANDOFF.md, STATE-ROW.md and the Now line are on disk; git does not have them.
  Commit them from the engine folder before landing anything: git add -A; git commit -m "wrap: capability.charge — the enemy pack. Landed c4ddcb0 (content e3af85a), flagged for review: an action carrying a move profile AND an attack profile is a CHARGE (isCharge, src/core/charge.ts) — aimed at a unit, it walks at most the Codex row's hexes through the one step loop (walkSteps, split out of executeMove), then strikes through performAttack; one spend. Both Codex rows carried with their numbers (Fast Zombie 3 hexes Str+1 Acc+10; Iron Colossus 2 hexes cd 4 Str+1 Acc-10), and the Colossus's noPrimaryAction closes the primary slot (resolveActionSlot). dumb-melee charges its target when out of reach instead of walking. Nine switches (SWITCHES.md, Charge section): movement points not hexes, target must be out of reach, cheapest landing hex, the walk provokes, a short walk spends the charge and strikes nothing, never an attack of opportunity. Test test/charge.test.ts reads every number from the Codex row; hit chance and damage equal preview() from the landing hex; kill switch fails without both rows; scenarios test.charge-a / -b. Tried: four existing tests encoded 'an action has one profile' or 'Charge is a gap' — rewritten as the rules they protected (hence the flag); eight Fast-Zombie showcases moved (the zombie now carries the charge, and charges), so a new frozen layer test/fixtures/battle-cursor-charge.json (tools/capture-charge-cursor.mts). Noticed: another session committed rulings to this repo mid-gate (22c6e11, b47bce5, b9ed9c1), which restarted the gate once; viewer-direct-map ran 24 s of its 30 s limit under load; audit-all not run (does not fit one call) — eight shards green on 0a2127d0aa stood in. Git ran through the lock-moving shim ($HOME/bin/git). Next: capability.move-ignores-zoc."
Yours: (2026-09-02) Note, no action needed: — look: GAME-BUILDER.html
Queue: capability.move-ignores-zoc [engine · rule], then capability.stealth [engine · flag], then fix.raise-range [content · data] (+1 more)
Delegate: capability.move-ignores-zoc [engine · rule] — not yet gated; capability.stealth [engine · flag] — not yet gated; fix.raise-range [content · data] — not yet gated; fix.surge-spend [engine · rule] — not yet gated
Blocked: content.mage-staff needs unit.brute
Calls since last wrap: none
Stack for capability.move-ignores-zoc:
  the item's `spec` and `expect` — `node tools/next.mjs` — before any source file
  ENGINE-CONSTITUTION.md — the law the item touches · **the Iron Gauntlet, above, before `--land`**: kill switch, hardcode scan, generalization, consequence, naming
  `node tools/decided.mjs "<the question>"` before asking anything · SWITCHES.md before deciding anything
  COMBAT-SEQUENCE.md — the rung the mechanism sits on · src/core · the kill-switch seam `src/content/disable.ts` · its verify scenario in test/

## The chat's commits since the last committed wrap (2c251ec)

- c4ddcb0 2026-09-28 00:02 capability.charge: Charge (Iron Colossus, cd 4; Fast Zombie) moves N hexes and attacks as O
- b9ed9c1 2026-09-27 23:54 backlog + inbox, 2026-09-27 rulings: queue fix.raise-range and fix.surge-spend; answered Raise range, Surge mechanics, the schedule's spare weapons (settled by COMBAT-V2 11.1) and the flagged landings; the open ones (Bracer repeats, the five kinds, Surge gain per Turn) reworded in plain English
- b47bce5 2026-09-27 23:52 ruling 2026-09-27: the Necromancer's Raise has range 10 ('Give the necromancer a raise of 10 range.'); Surge is a gain-per-Turn stat and an amount, and a Surge takes away 100 instead of emptying it (Andrew, verbatim in the entries)
- 22c6e11 2026-09-27 23:51 review: all 22 flagged landings cleared - 'Okay, all of the flagged landings seemed fine.' (2026-09-27)
- 8a03c0b 2026-09-27 23:35 backlog: capability.charge names its probes and variants - the two Codex Charge rows (move.fast-zombie.charge: 3 hexes, +1 Str, Acc +10; move.iron-colossus.charge: 2 hexes, cd 4, +1 Str, Acc -10), each fired in a real battle by its own TEST fielding (test.charge-a / -b) - and declares no baseline change: the control battles field only Zombies and the Burning Zombie, which carry no charge
- 9a1ab1a 2026-09-27 23:19 review: fix.enemy-accuracy-mod cleared - 'One, that's fine.' (2026-09-27, on the new battle-cursor accuracy-mod layer and the two lines of battle-cursor.test.ts that hand off to it)
- f8fe158 2026-09-27 09:07 wrap: fix.enemy-accuracy-mod — the enemy pack. Landed f5e9cf8 (content 35bfbfa), flagged for review: the regular enemy-attack lane of content/mkenginepack.mjs now carries a bestiary row's accuracyMod

## Next chat

New chat with Heroes of Blight and Tragic — engine: capability.move-ignores-zoc, the hounds' walk that provokes no attack of opportunity
```
start engine
```
