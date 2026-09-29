# engine — handoff 2026-09-29 06:20

*Written by tools/wrap.mjs. The only handwritten line is the Now line, given to wrap as its argument. The rest is what start.mjs prints and what git holds. Read by `start engine` — not by a chat, directly.*

engine — next fix.opening-orphanage-lighter, 223 of 268 landed · 10 await review · 12 pending
Now: the opening's party, and Andrew's rulings on it — fix.opening-party landed earlier this chat (flagged for review). Ruled 2026-09-28 (DECISIONS.md, four entries): the Orphanage loses one starting Zombie and one later arrival; heroes level up — none from the Orphanage alone, one by the Bridge; the Flaming Longsword is battle 2's reward and only a Warrior's or a Paladin's; the Bridge gives another reward; the first hero is taken, not drafted, with badge.leadership (no effect yet), a random positive badge, 25% another, +2 Health, one Crucible stat point and 30% another; later drafts offer three Crucible-rolled heroes, picked by a class-weighted score (a melee hero worth more while the party has none; Armor and Resist always high); no Health minimum; the Peddler's Vest is -5 Dodge, -5 Accuracy, +1 item slot, no Health change. Orphanage at level 1 by class (100 replicates): warrior 17/18, paladin 13/16, mage 10/16, ranger 6/12, priest 3/13, rogue 1/25. Tried: filed and abandoned before code, as the rulings moved: fix.opening-upgrades, fix.opening-first-battle, content.hero-health-floor, fix.opening-first-hero. Suite green as 8 shards, 2300 tests. Next: fix.opening-orphanage-lighter, content.peddlers-vest, fix.opening-draft-modifiers, fix.opening-levels-rewards — in that order and BEFORE encounter.opening.gates and encounter.opening.cathedral, which sit ahead of them in the queue and lose every time until the upgrades land.
New chat with Heroes of Blight and Tragic — engine: the Orphanage's lighter start, the Peddler's Vest, the draft's Crucible modifiers, then levels and rewards
  start engine
Last landing: 2026-09-29 05:21 (fix.opening-party). Previous chat ended: on a wrap, 2026-09-29 06:20
WRAP NOT COMMITTED: 2026-09-29 06:20 — HANDOFF.md, STATE-ROW.md and the Now line are on disk; git does not have them.
  Commit them from the engine folder before landing anything: git add -A; git commit -m "wrap: the opening's party, and Andrew's rulings on it — fix.opening-party landed earlier this chat (flagged for review). Ruled 2026-09-28 (DECISIONS.md, four entries): the Orphanage loses one starting Zombie and one later arrival; heroes level up — none from the Orphanage alone, one by the Bridge; the Flaming Longsword is battle 2's reward and only a Warrior's or a Paladin's; the Bridge gives another reward; the first hero is taken, not drafted, with badge.leadership (no effect yet), a random positive badge, 25% another, +2 Health, one Crucible stat point and 30% another; later drafts offer three Crucible-rolled heroes, picked by a class-weighted score (a melee hero worth more while the party has none; Armor and Resist always high); no Health minimum; the Peddler's Vest is -5 Dodge, -5 Accuracy, +1 item slot, no Health change. Orphanage at level 1 by class (100 replicates): warrior 17/18, paladin 13/16, mage 10/16, ranger 6/12, priest 3/13, rogue 1/25. Tried: filed and abandoned before code, as the rulings moved: fix.opening-upgrades, fix.opening-first-battle, content.hero-health-floor, fix.opening-first-hero. Suite green as 8 shards, 2300 tests. Next: fix.opening-orphanage-lighter, content.peddlers-vest, fix.opening-draft-modifiers, fix.opening-levels-rewards — in that order and BEFORE encounter.opening.gates and encounter.opening.cathedral, which sit ahead of them in the queue and lose every time until the upgrades land."
Yours: (2026-09-02) Note, no action needed: — look: GAME-BUILDER.html
Queue: fix.opening-orphanage-lighter [engine · data], then encounter.opening.gates [engine · data], then encounter.opening.cathedral [engine · data] (+7 more)
Delegate: fix.opening-orphanage-lighter [engine · data] — not yet gated; encounter.opening.gates [engine · data] — not yet gated; encounter.opening.cathedral [engine · data] — not yet gated; fix.one-effect-vocabulary [engine · plumbing] — not yet gated; fix.codex-numbers [content · numbers] — not yet gated; fix.one-hero-assembly [engine · plumbing] — not yet gated; viewer.reads-engine [viewer · plumbing] — not yet gated; content.peddlers-vest [content · numbers] — not yet gated; fix.opening-draft-modifiers [engine · data] — not yet gated; fix.opening-levels-rewards [engine · data] — not yet gated
Blocked: kingdom.opening-loop needs encounter.opening.bridge, encounter.opening.gates, encounter.opening.cathedral; kingdom.reads-engine needs fix.one-hero-assembly, fix.codex-numbers
Calls since last wrap:
  openingDraftPick · 2026-09-29 · Which of the three offers does the test draft, and who is offered?
  openingPool · 2026-09-29 · Which heroes can be drafted?
  openingCarriedHolder · 2026-09-29 · Who holds the Flaming Longsword from the Bridge on?
  openingBetweenBattles · 2026-09-29 · Do wounds or item rewards carry between opening battles in the probe?
  openingScenarioReplicate · 2026-09-29 · How does a sweep over replicates of an opening scenario get each replicate's party?
Stack for fix.opening-orphanage-lighter:
  the item's `spec` and `expect` — `node tools/next.mjs` — before any source file
  ENGINE-CONSTITUTION.md — the law the item touches · **the Iron Gauntlet, above, before `--land`**: kill switch, hardcode scan, generalization, consequence, naming
  `node tools/decided.mjs "<the question>"` before asking anything · SWITCHES.md before deciding anything
  **the design folder — grep it for the id first** (below) · src/content · its registry array

## The chat's commits since the last committed wrap (b78c7f5)

- b277337 2026-09-29 06:10 ruling 2026-09-28 (Andrew): no Health minimum; the Peddler's Vest -5 Dodge -5 Accuracy +1 item slot, no Health change; the first hero gets Leadership and a random positive badge; the draft pick is weighted; the first level-up comes after battle 2. Abandoned before code: content.hero-health-floor, fix.opening-first-hero, fix.opening-upgrades; backlog: content.peddlers-vest, fix.opening-draft-modifiers, fix.opening-levels-rewards
- fd1659b 2026-09-29 06:04 ruling 2026-09-28 (Andrew): the first hero - Leadership, a 25% second badge, +2 Health, a Crucible stat point and a 30% second; the draft offers three with the Crucible's modifiers, best taken; the Peddler's Vest gives +2 Health. fix.opening-first-battle abandoned before code; backlog: fix.opening-orphanage-lighter, content.hero-health-floor, fix.opening-first-hero
- 2edb1ff 2026-09-29 05:59 ruling 2026-09-28 (Andrew): the Orphanage loses a Zombie at the start and a later one; every hero has at least 7 Health; the first hero gets positive modifiers. backlog: fix.opening-first-battle (first)
- e7e5322 2026-09-29 05:45 ruling 2026-09-28 (Andrew): the opening's party levels up; the Flaming Longsword is a Warrior's or a Paladin's; the Bridge gives a reward - 'They need to be leveling up.' backlog: fix.opening-upgrades (first)
- 7e28f9b 2026-09-29 05:40 wrap: the opening's party — 1 landed this chat: fix.opening-party (flagged for review: Law 10 WIN-replicate edits with reasons at the lines, and two capture-tool clones). The six opening scenarios fie

## Next chat

New chat with Heroes of Blight and Tragic — engine: the Orphanage's lighter start, the Peddler's Vest, the draft's Crucible modifiers, then levels and rewards
```
start engine
```
