# engine — handoff 2026-10-02 09:14

*Produced by tools/handoff.mjs from .state/now.json, which tools/wrap.mjs writes. The only handwritten line is the Now line, given to wrap as its argument. The rest is what start.mjs printed and what git holds. Read by `start engine` — not by a chat, directly.*

engine — next fix.one-hero-assembly, 285 of 331 landed · 37 await review · 8 pending
Now: viewer.reads-engine, fix.danger-skips-charge — the duplication review's viewer findings and the danger marker. Landed and combined into main: viewer.reads-engine (viewer 7238ea7..4d097c2: the viewer reads the engine's action kinds, status rows, surge movement and field geometry; exemptions 7 -> 6; painted ground's status hue restored on the page) and fix.danger-skips-charge (Andrew 2026-10-02 'You can change it to 3.': the marker reads the first attack that is not a Charge; fast zombie 3, zombie 3, test zombies 4; the iron colossus also goes 11 -> 10, asked of Andrew, unanswered). Tried: the second combine failed twice on viewer page tests that pass alone (weapons-in-hand, side-facing, xcom-camera-tuning) and a kingdom cold-start 5 s timeout, all under machine load; the third run was green; a task chip was filed to make them hold under load. Next: kingdom.opening-run-six, the top of the viewer-kingdom queue.
New chat with Heroes of Blight and Tragic — kingdom: one continuous run through the first six battles (kingdom.opening-run-six)
  start kingdom
Last landing: 2026-10-02 08:43 (fix.danger-skips-charge). Previous chat ended: on a wrap, 2026-10-02 09:14
Ungated since last wrap: 4
  36a0db8 2026-10-02 01:23 Andrew Ring — DECISIONS.md: the fast zombie's danger marker reads 3, not its Charge's 4 (Andrew, 2026-10-02: "You 
  937ad60 2026-10-02 01:14 Andrew Ring — combine: engine master dd97a91 into this copy
  a0d13d4 2026-10-02 01:00 Andrew Ring — viewer.reads-engine (engine half, sources only): Duplication review 2026-09-28, engine DECISIONS.md 
  dd97a91 2026-10-02 00:45 Andrew Ring — .state/shards.json: the whole suite (--shard 1/1) passed on tree 892828ed6a (2026-10-02)
Yours: (2026-09-02) Note, no action needed: — look: GAME-BUILDER.html
Queue: fix.one-hero-assembly [engine · plumbing], then fix.opening-levels [engine · data], then rule.afflictions-at-zero [engine · rule] (+2 more)
Delegate: fix.one-hero-assembly [engine · plumbing] — not yet gated; fix.opening-levels [engine · data] — not yet gated; rule.afflictions-at-zero [engine · rule] — not yet gated; kingdom.opening-run-six [kingdom · plumbing] — not yet gated; viewer.shield-guard-motion [viewer · plumbing] — not yet gated
Blocked: kingdom.opening-loop needs encounter.opening.bridge; kingdom.reads-engine needs fix.one-hero-assembly; viewer.affliction-pop-up needs rule.afflictions-at-zero
Calls since last wrap: none
Stack for fix.one-hero-assembly:
  the item's `spec` and `expect` — `node tools/next.mjs` — before any source file
  ENGINE-CONSTITUTION.md — the law the item touches · **the Iron Gauntlet, above, before `--land`**: kill switch, hardcode scan, generalization, consequence, naming
  `node tools/decided.mjs "<the question>"` before asking anything · SWITCHES.md before deciding anything
  src/core and the mutator that owns the field · test/ — the probe before the prose

## The chat's commits since the last wrap (75985c0)

- e000d59 2026-10-02 01:43 fix.danger-skips-charge: Ruled 2026-10-02 (Andrew, engine DECISIONS.md 'the fast zombie's danger
- 36a0db8 2026-10-02 01:23 DECISIONS.md: the fast zombie's danger marker reads 3, not its Charge's 4 (Andrew, 2026-10-02: "You can change it to 3."); filed fix.danger-skips-charge
- 937ad60 2026-10-02 01:14 combine: engine master dd97a91 into this copy
- 3a40874 2026-10-02 01:13 viewer.reads-engine: Duplication review 2026-09-28, findings V1 V2 V4 V5 V6 V7 V8 V11 V12 V13
- a0d13d4 2026-10-02 01:00 viewer.reads-engine (engine half, sources only): Duplication review 2026-09-28, engine DECISIONS.md '2026-09-28 — the duplication review, ruled' (fix as proposed).
- dd97a91 2026-10-02 00:45 .state/shards.json: the whole suite (--shard 1/1) passed on tree 892828ed6a (2026-10-02)

## Next chat

New chat with Heroes of Blight and Tragic — kingdom: one continuous run through the first six battles (kingdom.opening-run-six)
```
start kingdom
```
