# engine — handoff 2026-09-28 01:56

*Written by tools/wrap.mjs. The only handwritten line is the Now line, given to wrap as its argument. The rest is what start.mjs prints and what git holds. Read by `start engine` — not by a chat, directly.*

engine — next capability.stealth, 201 of 232 landed · 2 await review · 4 pending
Now: capability.move-ignores-zoc — the enemy pack. Landed 954661b (probe 7d016f8, content 5afbde1), flagged for review: not provoking is a property of a movement power; the new Codex walk power.move-ignoring-zoc ('Move, Ignoring Zones of Control', copied from Move: 1 Stamina, no cooldown, terrain costs) is what the four hounds walk with, so a hound leaving a hero's zone draws no attack of opportunity and logs zoc.ignored once per enemy, while a Zombie on the same path still provokes. Seven switches (SWITCHES.md, ignoresZoc*): the name is Angela's to change; only a normal walk may carry it; a charge's walk reads it too; the AI is unchanged. Test test/move-ignores-zoc.test.ts; variants unit.bloodhound and unit.hellhound; kill switch fails without the power. Tried: three existing tests rewritten from numbers to the rules they protected (hence the flag); the hound showcases play differently, so a new frozen layer test/fixtures/battle-cursor-zoc.json (tools/capture-zoc-cursor.mts); control battles unchanged. Noticed: root CODEX.md not regenerated (it held someone else's uncommitted edits); the git lock shim at $HOME/bin/git was missing and was recreated. Eight shards green on 93c86a77e5. Next: capability.stealth.
New chat with Heroes of Blight and Tragic — engine: capability.stealth, the stealth flag
  start engine
Last landing: 2026-09-28 01:43 (capability.move-ignores-zoc). Previous chat ended: on a wrap, 2026-09-28 01:56
WRAP NOT COMMITTED: 2026-09-28 01:56 — HANDOFF.md, STATE-ROW.md and the Now line are on disk; git does not have them.
  Commit them from the engine folder before landing anything: git add -A; git commit -m "wrap: capability.move-ignores-zoc — the enemy pack. Landed 954661b (probe 7d016f8, content 5afbde1), flagged for review: not provoking is a property of a movement power; the new Codex walk power.move-ignoring-zoc ('Move, Ignoring Zones of Control', copied from Move: 1 Stamina, no cooldown, terrain costs) is what the four hounds walk with, so a hound leaving a hero's zone draws no attack of opportunity and logs zoc.ignored once per enemy, while a Zombie on the same path still provokes. Seven switches (SWITCHES.md, ignoresZoc*): the name is Angela's to change; only a normal walk may carry it; a charge's walk reads it too; the AI is unchanged. Test test/move-ignores-zoc.test.ts; variants unit.bloodhound and unit.hellhound; kill switch fails without the power. Tried: three existing tests rewritten from numbers to the rules they protected (hence the flag); the hound showcases play differently, so a new frozen layer test/fixtures/battle-cursor-zoc.json (tools/capture-zoc-cursor.mts); control battles unchanged. Noticed: root CODEX.md not regenerated (it held someone else's uncommitted edits); the git lock shim at $HOME/bin/git was missing and was recreated. Eight shards green on 93c86a77e5. Next: capability.stealth."
Yours: (2026-09-02) Note, no action needed: — look: GAME-BUILDER.html
Queue: capability.stealth [engine · flag], then fix.raise-range [content · data], then fix.surge-spend [engine · rule]
Delegate: capability.stealth [engine · flag] — not yet gated; fix.raise-range [content · data] — not yet gated; fix.surge-spend [engine · rule] — not yet gated
Blocked: content.mage-staff needs unit.brute
Calls since last wrap:
  ignoresZocOnThePower · 2026-09-28 · Is "ignores ZoC" a property of the unit or of its movement power?
  ignoresZocRowName · 2026-09-28 · The Codex had no power row for the hounds' walk. What is it called?
  ignoresZocWalkCopiesMove · 2026-09-28 · Its stamina, cooldown and costs?
  ignoresZocPathOnly · 2026-09-28 · Can a sidestep or a flight carry ignoresZoc?
  ignoresZocLogs · 2026-09-28 · What does the log say when a walk ignores a zone?
  ignoresZocCharge · 2026-09-28 · Does a charge's walk read the property?
Stack for capability.stealth:
  the item's `spec` and `expect` — `node tools/next.mjs` — before any source file
  ENGINE-CONSTITUTION.md — the law the item touches · **the Iron Gauntlet, above, before `--land`**: kill switch, hardcode scan, generalization, consequence, naming
  `node tools/decided.mjs "<the question>"` before asking anything · SWITCHES.md before deciding anything

## The chat's commits since the last committed wrap (3b4fc7e)

- 954661b 2026-09-28 01:43 capability.move-ignores-zoc: The hounds 'ignore ZOC' — 'the move-WITHOUT-provoking machinery, as a pr
- 7d016f8 2026-09-28 01:41 backlog: capability.move-ignores-zoc names its probe and variants - the Codex walk that ignores zones of control (power.move-ignoring-zoc, content 5afbde1), walked in real battles by the hounds that showcase.prologue-enemies, showcase.alpha-team and the Kiln field; the variants are two of the four moveIgnoresZOC rows with different data (unit.bloodhound Mv 9, unit.hellhound Mv 7) - and declares no baseline change: the control battles field only Zombies and the Burning Zombie, which walk with Move
- 6b48e28 2026-09-28 00:13 wrap: capability.charge — the enemy pack. Landed c4ddcb0 (content e3af85a), flagged for review: an action carrying a move profile AND an attack profile is a CHARGE (isCharge, src/core/charge.ts) — aim

## Next chat

New chat with Heroes of Blight and Tragic — engine: capability.stealth, the stealth flag
```
start engine
```
