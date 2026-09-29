# engine — handoff 2026-09-29 07:17

*Written by tools/wrap.mjs. The only handwritten line is the Now line, given to wrap as its argument. The rest is what start.mjs prints and what git holds. Read by `start engine` — not by a chat, directly.*

engine — next fix.opening-orphanage-lighter, 224 of 271 landed · 11 await review · 12 pending
Now: the opening's party and its first level — 2 landed this chat: fix.opening-party and fix.opening-first-level (both flagged for review: Law 10 test edits with reasons, capture-tool clones). The opening fields a party drafted per replicate from progression/OPENING-PARTY.json; the Orphanage pays 20 XP no matter what, so the first hero is level 2 (class specialty) from the Lumberjack on. Wins over 50: Orphanage 27, Lumberjack 40 (was 36), Cavern Trail 13 (was 7); Gates and Cathedral 0 at level 1 (not re-tried since). Ruled 2026-09-28 (DECISIONS.md, seven entries): the Orphanage loses one starting Zombie and one later arrival; the draft never offers an already-drafted class until all six are; levels by XP at 20/50/100/170/270/400 (GLOSSARY.md updated; kingdom levels.ts still the old curve); the first hero is taken with badge.leadership (no effect yet), a random positive badge, 25% another, +2 Health, one Crucible stat point and 30% another; later drafts are three Crucible-rolled heroes picked by a class-weighted score; no Health minimum; the Peddler's Vest is -5 Dodge -5 Accuracy +1 item slot, no Health change; the Flaming Longsword only to a Warrior or Paladin; the Bridge gives a reward. XP is the kingdom's (reckoning.ts: 3 a kill + 15 minus enemy phases + MVP 10). Tried: six items filed and abandoned before code as the rulings moved. Noticed: integration.test.ts timed out once in shard 1 and passed on rerun, same tree. Suite green as 8 shards. Next: fix.opening-orphanage-lighter, content.peddlers-vest, fix.opening-draft, fix.opening-levels — in that order and BEFORE encounter.opening.gates and encounter.opening.cathedral, which sit ahead of them in the queue and lose every time until the upgrades land.
New chat with Heroes of Blight and Tragic — engine: the Orphanage's lighter start, the Peddler's Vest, the draft's class rule and Crucible modifiers, then XP levels and rewards
  start engine
Last landing: 2026-09-29 07:04 (fix.opening-first-level). Previous chat ended: on a wrap, 2026-09-29 07:17
WRAP NOT COMMITTED: 2026-09-29 07:17 — HANDOFF.md, STATE-ROW.md and the Now line are on disk; git does not have them.
  Commit them from the engine folder before landing anything: git add -A; git commit -m "wrap: the opening's party and its first level — 2 landed this chat: fix.opening-party and fix.opening-first-level (both flagged for review: Law 10 test edits with reasons, capture-tool clones). The opening fields a party drafted per replicate from progression/OPENING-PARTY.json; the Orphanage pays 20 XP no matter what, so the first hero is level 2 (class specialty) from the Lumberjack on. Wins over 50: Orphanage 27, Lumberjack 40 (was 36), Cavern Trail 13 (was 7); Gates and Cathedral 0 at level 1 (not re-tried since). Ruled 2026-09-28 (DECISIONS.md, seven entries): the Orphanage loses one starting Zombie and one later arrival; the draft never offers an already-drafted class until all six are; levels by XP at 20/50/100/170/270/400 (GLOSSARY.md updated; kingdom levels.ts still the old curve); the first hero is taken with badge.leadership (no effect yet), a random positive badge, 25% another, +2 Health, one Crucible stat point and 30% another; later drafts are three Crucible-rolled heroes picked by a class-weighted score; no Health minimum; the Peddler's Vest is -5 Dodge -5 Accuracy +1 item slot, no Health change; the Flaming Longsword only to a Warrior or Paladin; the Bridge gives a reward. XP is the kingdom's (reckoning.ts: 3 a kill + 15 minus enemy phases + MVP 10). Tried: six items filed and abandoned before code as the rulings moved. Noticed: integration.test.ts timed out once in shard 1 and passed on rerun, same tree. Suite green as 8 shards. Next: fix.opening-orphanage-lighter, content.peddlers-vest, fix.opening-draft, fix.opening-levels — in that order and BEFORE encounter.opening.gates and encounter.opening.cathedral, which sit ahead of them in the queue and lose every time until the upgrades land."
Yours: (2026-09-02) Note, no action needed: — look: GAME-BUILDER.html
Queue: fix.opening-orphanage-lighter [engine · data], then encounter.opening.gates [engine · data], then encounter.opening.cathedral [engine · data] (+7 more)
Delegate: fix.opening-orphanage-lighter [engine · data] — not yet gated; encounter.opening.gates [engine · data] — not yet gated; encounter.opening.cathedral [engine · data] — not yet gated; fix.one-effect-vocabulary [engine · plumbing] — not yet gated; fix.codex-numbers [content · numbers] — not yet gated; fix.one-hero-assembly [engine · plumbing] — not yet gated; viewer.reads-engine [viewer · plumbing] — not yet gated; content.peddlers-vest [content · numbers] — not yet gated; fix.opening-draft [engine · data] — not yet gated; fix.opening-levels [engine · data] — not yet gated
Blocked: kingdom.opening-loop needs encounter.opening.bridge, encounter.opening.gates, encounter.opening.cathedral; kingdom.reads-engine needs fix.one-hero-assembly, fix.codex-numbers
Calls since last wrap:
  openingDraftPick · 2026-09-29 · Which of the three offers does the test draft, and who is offered?
  openingPool · 2026-09-29 · Which heroes can be drafted?
  openingCarriedHolder · 2026-09-29 · Who holds the Flaming Longsword from the Bridge on?
  openingBetweenBattles · 2026-09-29 · Do wounds or item rewards carry between opening battles in the probe?
  openingScenarioReplicate · 2026-09-29 · How does a sweep over replicates of an opening scenario get each replicate's party?
  openingSpecialty · 2026-09-29 · Which specialty does a hero take at level 2 in the opening? (fix.opening-first-level)
  openingLaterXp · 2026-09-29 · What XP do the battles after the Orphanage pay in the probe? (fix.opening-first-level)
Stack for fix.opening-orphanage-lighter:
  the item's `spec` and `expect` — `node tools/next.mjs` — before any source file
  ENGINE-CONSTITUTION.md — the law the item touches · **the Iron Gauntlet, above, before `--land`**: kill switch, hardcode scan, generalization, consequence, naming
  `node tools/decided.mjs "<the question>"` before asking anything · SWITCHES.md before deciding anything
  **the design folder — grep it for the id first** (below) · src/content · its registry array

## The chat's commits since the last committed wrap (565a397)

- a19b720 2026-09-29 07:04 gauntlet log: the fix.opening-first-level landing line
- 31815fa 2026-09-29 07:04 fix.opening-first-level: Ruled 2026-09-28 (Andrew, DECISIONS.md 'the Orphanage pays 20 XP no matt
- 75b2c7d 2026-09-29 06:58 ruling 2026-09-28 (Andrew): the Orphanage pays 20 XP no matter what - the first hero reaches level 2 after battle 1. backlog: fix.opening-first-level (first)
- cf3e3fd 2026-09-29 06:26 ruling 2026-09-28 (Andrew): the draft never repeats a class until all six are drafted; levels by XP at 20, 50, 100, 170, 270, 400. Abandoned before code: fix.opening-draft-modifiers, fix.opening-levels-rewards; backlog: fix.opening-draft, fix.opening-levels
- 9393075 2026-09-29 06:21 wrap: the opening's party, and Andrew's rulings on it — fix.opening-party landed earlier this chat (flagged for review). Ruled 2026-09-28 (DECISIONS.md, four entries): the Orphanage loses one starting

## Next chat

New chat with Heroes of Blight and Tragic — engine: the Orphanage's lighter start, the Peddler's Vest, the draft's class rule and Crucible modifiers, then XP levels and rewards
```
start engine
```
