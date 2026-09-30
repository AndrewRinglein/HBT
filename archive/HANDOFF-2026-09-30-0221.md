# engine — handoff 2026-09-30 02:21

*Written by tools/wrap.mjs. The only handwritten line is the Now line, given to wrap as its argument. The rest is what start.mjs prints and what git holds. Read by `start engine` — not by a chat, directly.*

engine — next encounter.opening.gates, 237 of 281 landed · 19 await review · 9 pending
Now: afflictions revised, badge rules, cold, Ghost — engine. Landed content.afflictions-revised, fix.badge-surge-at-fielding, rule.badge-deathbed-fighting, rule.badge-immunity (then removed), rule.cold-resist, content.immune-one-is-resist, content.ghost, content.ghost-possess-on-attack, rule.immunity-is-resistance; suite green 2342. Tried: a separate immunity mechanism — wrong, COMBAT-V2 §8.2 already rules one resist, both forms. Next: Vampirism's heal 2 on a melee hit, deploy costs and half XP (kingdom), Karma and Weak have no resist (named gaps).
New chat with Heroes of Blight and Tragic — engine: take the top of the queue (encounter.opening.gates)
  start engine
Last landing: 2026-09-30 01:58 (rule.immunity-is-resistance). Previous chat ended: on a wrap, 2026-09-30 02:21
WRAP NOT COMMITTED: 2026-09-30 02:21 — HANDOFF.md, STATE-ROW.md and the Now line are on disk; git does not have them.
  Commit them from the engine folder before landing anything: git add -A; git commit -m "wrap: afflictions revised, badge rules, cold, Ghost — engine. Landed content.afflictions-revised, fix.badge-surge-at-fielding, rule.badge-deathbed-fighting, rule.badge-immunity (then removed), rule.cold-resist, content.immune-one-is-resist, content.ghost, content.ghost-possess-on-attack, rule.immunity-is-resistance; suite green 2342. Tried: a separate immunity mechanism — wrong, COMBAT-V2 §8.2 already rules one resist, both forms. Next: Vampirism's heal 2 on a melee hit, deploy costs and half XP (kingdom), Karma and Weak have no resist (named gaps)."
Yours: (2026-09-02) Note, no action needed: — look: GAME-BUILDER.html
Queue: encounter.opening.gates [engine · data], then encounter.opening.cathedral [engine · data], then fix.one-effect-vocabulary [engine · plumbing] (+4 more)
Delegate: encounter.opening.gates [engine · data] — not yet gated; encounter.opening.cathedral [engine · data] — not yet gated; fix.one-effect-vocabulary [engine · plumbing] — not yet gated; fix.codex-numbers [content · numbers] — not yet gated; fix.one-hero-assembly [engine · plumbing] — not yet gated; viewer.reads-engine [viewer · plumbing] — not yet gated; fix.opening-levels [engine · data] — not yet gated
Blocked: kingdom.opening-loop needs encounter.opening.bridge, encounter.opening.gates, encounter.opening.cathedral; kingdom.reads-engine needs fix.one-hero-assembly, fix.codex-numbers
Calls since last wrap: none
Stack for encounter.opening.gates:
  the item's `spec` and `expect` — `node tools/next.mjs` — before any source file
  ENGINE-CONSTITUTION.md — the law the item touches · **the Iron Gauntlet, above, before `--land`**: kill switch, hardcode scan, generalization, consequence, naming
  `node tools/decided.mjs "<the question>"` before asking anything · SWITCHES.md before deciding anything
  **the design folder — grep it for the id first** (below) · src/content · its registry array

## The chat's commits since the last committed wrap (8c7f833)

- 8a7a0f9 2026-09-30 02:10 rule.immunity-is-resistance follow-up: the full suite (four shards) after content.ghost-possess-on-attack and rule.immunity-is-resistance. Law 10: battle-cursor.test.ts gains the resist-one-way layer (tools/capture-resist-one-way-cursor.mts, test/fixtures/battle-cursor-resist-one-way.json) over ghost-cold - test.ghost, showcase.waystation, showcase.prologue-party, test.opening-cavern-trail and test.vampire-bite moved for real, the rulings working (the Ghost's Attack possesses; Rotting Flesh takes Poison with 1 Poison Resist; Cold Heart is +1 Cold Resist). Suite green on this tree: 2342 passed.
- 166665c 2026-09-30 01:58 gauntlet log: the rule.immunity-is-resistance landing line
- 724ac43 2026-09-30 01:58 rule.immunity-is-resistance: Ruled 2026-09-29 (Andrew, DECISIONS.md 'the Ghost possesses on its Attac
- c38757a 2026-09-30 01:54 gauntlet log: the content.ghost-possess-on-attack landing line
- c990b77 2026-09-30 01:54 content.ghost-possess-on-attack: Ruled 2026-09-29 (Andrew, DECISIONS.md 'the Ghost possesses on its Attac
- d63a53b 2026-09-30 00:37 content.ghost follow-up: the full suite (four shards) after rule.cold-resist, content.immune-one-is-resist and content.ghost, on top of fix.opening-orphanage-arrivals (another chat, 23:03). Law 10, two tests: pack-enemy-actions.test.ts counts seven movePower fliers (the Ghost flies); battle-cursor.test.ts gains the ghost-cold layer (tools/capture-ghost-cold-cursor.mts, test/fixtures/battle-cursor-ghost-cold.json) over the orphanage-arrivals layer - test.vampire-bite moved by log text only (Cold Heart's gain line no longer names the cold-damage gap); test.ghost and test.frost-resistant frozen new. Suite green on this tree: 2343 passed.
- dfc29b4 2026-09-30 00:26 gauntlet log: the content.ghost landing line
- f56740a 2026-09-30 00:26 content.ghost: Ruled 2026-09-29 (Andrew, DECISIONS.md 'the Ghost as the bestiary has it
- 731cb34 2026-09-30 00:21 gauntlet log: the content.immune-one-is-resist landing line
- ecbb4b4 2026-09-30 00:21 content.immune-one-is-resist: Ruled 2026-09-29 (Andrew, DECISIONS.md 'the Ghost as the bestiary has it
- ce01b49 2026-09-30 00:16 gauntlet log: the rule.cold-resist landing line
- 25126f4 2026-09-30 00:16 rule.cold-resist: Ruled 2026-09-29 (Andrew, DECISIONS.md 'the Ghost as the bestiary has it
- d43da94 2026-09-29 23:03 gauntlet log: the fix.opening-orphanage-arrivals landing line
- bf2921d 2026-09-29 23:03 fix.opening-orphanage-arrivals: Ruled 2026-09-29 (Andrew, DECISIONS.md 'the Orphanage gains a Zombie on
- d25d53e 2026-09-29 22:44 rule.badge-immunity follow-up: the full suite (four shards) after fix.badge-surge-at-fielding, rule.badge-deathbed-fighting and rule.badge-immunity. Law 10, two tests: afflictions.test.ts reads Vampirism's, Possession's and Rotting Flesh's Deathbed points and Cold Heart's immunities as built (they were named gaps); battle-cursor.test.ts gains the badge-rules layer (tools/capture-badge-rules-cursor.mts, test/fixtures/battle-cursor-badge-rules.json) - prologue-party, opening-cavern-trail and vampire-bite moved by log text only; waystation for real (its mage takes Rotting Flesh on turn 14 and the zombie's Poison is then refused - the rule working). Suite green on this tree: 2331 passed.
- 5012b52 2026-09-29 22:24 gauntlet log: the rule.badge-immunity landing line
- 7f3813c 2026-09-29 22:24 rule.badge-immunity: Ruled 2026-09-29 (Andrew, DECISIONS.md 'Possession's Surge loads at fiel
- 919e449 2026-09-29 22:18 gauntlet log: the rule.badge-deathbed-fighting landing line
- bf95949 2026-09-29 22:17 rule.badge-deathbed-fighting: Ruled 2026-09-29 (Andrew, DECISIONS.md 'Possession's Surge loads at fiel
- 198eb08 2026-09-29 22:11 gauntlet log: the fix.badge-surge-at-fielding landing line
- fbc313d 2026-09-29 22:11 fix.badge-surge-at-fielding: Ruled 2026-09-29 (Andrew, DECISIONS.md 'Possession's Surge loads at fiel
- b17eb22 2026-09-29 21:59 content.afflictions-revised follow-up: the full suite (four shards) after the landing. Law 10, two tests: badges.test.ts expects Vampirism's grant as power.flight-vampiric (was the undefined blood drain, gone by the ruling); battle-cursor.test.ts gains the afflictions layer (tools/capture-afflictions-cursor.mts, test/fixtures/battle-cursor-afflictions.json) - showcase.prologue-party, showcase.waystation and test.opening-cavern-trail moved by log text only (Rotting Flesh's badge.gained names the '+20 Deathbed Fighting' gap); state, RNG and result unchanged, recorded per case as movedOnlyText. Suite green on this tree: 2321 passed.
- 01abe94 2026-09-29 21:36 gauntlet log: the content.afflictions-revised landing line
- b74e72b 2026-09-29 21:36 content.afflictions-revised: Ruled 2026-09-29 (Andrew, DECISIONS.md 'the four afflictions: Vampirism
- d2a5c1b 2026-09-29 18:51 gauntlet log: the fix.opening-draft landing line
- 84333b3 2026-09-29 18:51 fix.opening-draft: Ruled 2026-09-28 (Andrew, DECISIONS.md 'the first hero: Leadership ...',
- 03a49ba 2026-09-29 18:36 ruling 2026-09-29 (Andrew): the Orphanage gains a Zombie on Turn 2 and one on Turn 3 - 'Battle 1: Let's add a zombie on turn 2 and a zombie on turn 3.' backlog: fix.opening-orphanage-arrivals
- 3985117 2026-09-29 18:16 gauntlet log: the content.peddlers-vest landing line
- 244f29c 2026-09-29 18:16 content.peddlers-vest: Ruled 2026-09-28 (Andrew, DECISIONS.md 'no Health minimum; the Peddler's
- 5d8c72e 2026-09-29 18:13 backlog: content.peddlers-vest names its probe (item.peddlers-vest) and is neutral on the control battles - no control map fields the Raven or the Robes priest (tools/baseline.mts byte-identical with the vest changed); changesBaseline true -> false before any landing, the reason in its note
- df0981f 2026-09-29 17:49 gauntlet log: the fix.opening-orphanage-lighter landing line
- fc5deea 2026-09-29 17:49 fix.opening-orphanage-lighter: Ruled 2026-09-28 (Andrew, DECISIONS.md 'the Orphanage loses a Zombie at
- feb2106 2026-09-29 07:17 wrap: the opening's party and its first level — 2 landed this chat: fix.opening-party and fix.opening-first-level (both flagged for review: Law 10 test edits with reasons, capture-tool clones). The op

## Next chat

New chat with Heroes of Blight and Tragic — engine: take the top of the queue (encounter.opening.gates)
```
start engine
```
