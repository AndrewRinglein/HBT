# engine — handoff 2026-10-03 20:55

*Produced by tools/handoff.mjs from .state/now.json, which tools/wrap.mjs writes. The only handwritten line is the Now line, given to wrap as its argument. The rest is what start.mjs printed and what git holds. Read by `start engine` — not by a chat, directly.*

engine — next fix.civilians-field-kit, 302 of 358 landed · 44 await review · 14 pending
Now: viewer.characters-stand-out, viewer.size-and-shadows-default — the characters stand out from the board. Landed in the viewer-and-kingdom worker copy and combined into main twice (engine bd41b57, viewer 9d9fcf0, kingdom c82b270; engine suite 2499 in main, viewer every gate part, kingdom 416, content suite). Tried: five looks to judge on the Orphanage (size, shadows, ground, rim, disc), each named through the battle page's link (&look=) and kingdom CHARACTERS-STAND-OUT.html; Andrew accepted size and shadows ("looks like the size change does it ... but we should still have them have shadows" · "yes") and they are now what every battle shows with nothing named — bodies 30% larger on screen, hexes 10% smaller, bodies casting shadows; ground, rim and disc were not accepted and stay off unless named. The rim's first drawing (an inside-out hull) turned the male heroes gold in the page — their outfits wind both ways — and was redrawn as a twin set behind the body. Flagged for review: viewer.size-and-shadows-default (five checks that measured the old body height or zoom now claim the same at the new size, each with its old line quoted). Ruled and filed this chat, not started: viewer.fallen-cards-and-first-aid, viewer.switch-hero-asks, viewer.move-cost-on-grid, viewer.hex-tooltip. Next: viewer.opening-replays — the opening battles watchable as computer-played replays.
New chat with Heroes of Blight and Tragic — viewer: viewer.opening-replays, the opening battles watchable as computer-played replays; then the four items ruled 2026-10-03 (cards and first aid, the switch-hero question, movement cost on the grid, the hex tooltip)
  start viewer
Last landing: 2026-10-03 07:36 (viewer.size-and-shadows-default). Previous chat ended: on a wrap, 2026-10-03 20:55
Ungated since last wrap: 19
  7846636 2026-10-03 13:49 Andrew Ring — DECISIONS.md: Back Flip's rules, enemies only move together, the motion work comes first (Andrew, 20
  b1f87da 2026-10-03 13:47 Andrew Ring — .state/shards.json: the whole suite (--shard 1/1, 2499 passed) passed on tree b7463802d4 (2026-10-03
  bd41b57 2026-10-03 00:36 Andrew Ring — combine: engine master 50d9708 into this copy
  50d9708 2026-10-03 00:23 Andrew Ring — DECISIONS.md: the post's twelve questions answered (Andrew, 2026-10-03) - enemies sort into humanoid
  1eab655 2026-10-03 00:23 Andrew Ring — DECISIONS.md: switching from a hero that has not acted is free; the hex tooltip describes the ground
  a5e3971 2026-10-03 00:10 Andrew Ring — DECISIONS.md: size and shadows are the default; a bleeding-out hero's card shows first aid and turns
  5a1c42c 2026-10-02 23:59 Andrew Ring — DECISIONS.md: the characters stand out — the size change does it, shadows are kept, ground, rim and 
  d145876 2026-10-02 22:53 Andrew Ring — combine: engine master a9232e2 into this copy
  a9232e2 2026-10-02 22:37 Andrew Ring — DECISIONS.md: Andrew's 2026-10-03 post kept whole - which motions enemies and heroes need, enemies o
  34f5046 2026-10-02 22:34 Andrew Ring — DECISIONS.md: a weapon's attacks carry their motions - the motion is tied to the specific attack, no
  ccd2574 2026-10-02 22:33 Andrew Ring — DECISIONS.md: both war hammers; Short Sword and Grain Flail tier 0, Giant Sword, War Flail, Two-Hand
  a42d7f3 2026-10-02 22:33 Andrew Ring — DECISIONS.md: an enemy with weapons assigned fields them when it comes into play, the same as a civi
  05304f2 2026-10-02 22:33 Andrew Ring — fix.civilians-field-kit to the top of the engine queue (Andrew, 2026-10-03: "Yes.")
  56b1f5b 2026-10-02 22:30 Andrew Ring — DECISIONS.md: every civilian fields its kit by default when an encounter places it (Andrew, 2026-10-
  3a8d174 2026-10-02 22:29 Andrew Ring — DECISIONS.md: card art for every weapon at tiers 0 and 1, then a model from each; tier 0 plain, tier
  71a80db 2026-10-02 22:26 Andrew Ring — DECISIONS.md: the cards above the battle — the fallen leave, a downed hero's card wears a first-aid 
  7a48fc8 2026-10-02 22:20 Andrew Ring — DECISIONS.md: the look to judge is characters 30% larger, hexes 10% smaller (Andrew, 2026-10-03) — c
  6bbb451 2026-10-02 22:19 Andrew Ring — DECISIONS.md: the characters must stand out from the board, try 10% larger characters and 10% smalle
  1458581 2026-10-02 22:14 Andrew Ring — DECISIONS.md: the opening battles are watchable as computer-played replays (Andrew, 2026-10-03) — fi
Yours: (2026-09-02) Note, no action needed: — look: GAME-BUILDER.html
Queue: fix.civilians-field-kit [engine · data], then fix.affliction-pop-up-words [engine · plumbing], then movement.back-flip [engine · data] (+9 more)
Delegate: fix.civilians-field-kit [engine · data] — not yet gated; fix.affliction-pop-up-words [engine · plumbing] — not yet gated; movement.back-flip [engine · data] — not yet gated; viewer.opening-replays [viewer · data] — not yet gated; viewer.attack-owns-motion [viewer · plumbing] — not yet gated; viewer.fallen-cards-and-first-aid [viewer · plumbing] — not yet gated; viewer.switch-hero-asks [viewer · plumbing] — not yet gated; viewer.move-cost-on-grid [viewer · plumbing] — not yet gated; viewer.hex-tooltip [viewer · plumbing] — not yet gated; viewer.special-move-motions [viewer · plumbing] — not yet gated; viewer.shield-block-and-hit [viewer · plumbing] — not yet gated; viewer.airwalk-floats [viewer · plumbing] — not yet gated
Blocked: kingdom.opening-loop needs encounter.opening.bridge; viewer.enemy-type-moves-together needs viewer.special-move-motions
Calls since last wrap: none
Stack for fix.civilians-field-kit:
  the item's `spec` and `expect` — `node tools/next.mjs` — before any source file
  ENGINE-CONSTITUTION.md — the law the item touches · **the Iron Gauntlet, above, before `--land`**: kill switch, hardcode scan, generalization, consequence, naming
  `node tools/decided.mjs "<the question>"` before asking anything · SWITCHES.md before deciding anything
  **the design folder — grep it for the id first** (below) · src/content · its registry array

## The chat's commits since the last wrap (88edd0a)

- 7846636 2026-10-03 13:49 DECISIONS.md: Back Flip's rules, enemies only move together, the motion work comes first (Andrew, 2026-10-03); add-item: movement.back-flip (engine), viewer.special-move-motions, viewer.shield-block-and-hit, viewer.airwalk-floats, viewer.enemy-type-moves-together (viewer) filed; viewer.attack-owns-motion's pending spec gains the several-swings rule
- b1f87da 2026-10-03 13:47 .state/shards.json: the whole suite (--shard 1/1, 2499 passed) passed on tree b7463802d4 (2026-10-03, main after the combine of the viewer worker copy; engine bd41b57, viewer 9d9fcf0, kingdom c82b270)
- bd41b57 2026-10-03 00:36 combine: engine master 50d9708 into this copy
- ff34aee 2026-10-03 00:36 viewer.size-and-shadows-default: Ruled 2026-10-03 (Andrew, engine DECISIONS.md 'the characters stand out:
- 50d9708 2026-10-03 00:23 DECISIONS.md: the post's twelve questions answered (Andrew, 2026-10-03) - enemies sort into humanoid and monster, an attack may hold several swings picked at random, the held sets, two shield reactions, Airwalk floats always, flight for every hero body, the special moves' looks, Back Flip a new power, enemies of one type move together
- 1eab655 2026-10-03 00:23 DECISIONS.md: switching from a hero that has not acted is free; the hex tooltip describes the ground only (Andrew, 2026-10-03) — as viewer.switch-hero-asks and viewer.hex-tooltip were filed
- a5e3971 2026-10-03 00:10 DECISIONS.md: size and shadows are the default; a bleeding-out hero's card shows first aid and turns left; switching heroes asks first; movement costs on the grid; a tooltip on every hex (Andrew, 2026-10-03) — add-item: viewer.size-and-shadows-default (first), viewer.fallen-cards-and-first-aid, viewer.switch-hero-asks, viewer.move-cost-on-grid, viewer.hex-tooltip
- 5a1c42c 2026-10-02 23:59 DECISIONS.md: the characters stand out — the size change does it, shadows are kept, ground, rim and disc do little (Andrew, 2026-10-03); size and shadows together shown, no default filed yet
- d145876 2026-10-02 22:53 combine: engine master a9232e2 into this copy
- 4e1a03c 2026-10-02 22:52 viewer.characters-stand-out: Ruled 2026-10-03 (Andrew, engine DECISIONS.md 'the characters must stand
- a9232e2 2026-10-02 22:37 DECISIONS.md: Andrew's 2026-10-03 post kept whole - which motions enemies and heroes need, enemies of one type move together; questions out, nothing filed yet
- 34f5046 2026-10-02 22:34 DECISIONS.md: a weapon's attacks carry their motions - the motion is tied to the specific attack, not the body (Andrew, 2026-10-03); add-item: viewer.attack-owns-motion filed
- ccd2574 2026-10-02 22:33 DECISIONS.md: both war hammers; Short Sword and Grain Flail tier 0, Giant Sword, War Flail, Two-Handed Flail, Pike and Giant Scythe tier 1; tier 0 substandard, tier 1 standard, enchantment from tier 2 (Andrew, 2026-10-03)
- a42d7f3 2026-10-02 22:33 DECISIONS.md: an enemy with weapons assigned fields them when it comes into play, the same as a civilian (Andrew, 2026-10-03); fix.civilians-field-kit's spec carries it, still top of the engine queue
- 05304f2 2026-10-02 22:33 fix.civilians-field-kit to the top of the engine queue (Andrew, 2026-10-03: "Yes.")
- 56b1f5b 2026-10-02 22:30 DECISIONS.md: every civilian fields its kit by default when an encounter places it (Andrew, 2026-10-03); add-item: fix.civilians-field-kit filed
- 3a8d174 2026-10-02 22:29 DECISIONS.md: card art for every weapon at tiers 0 and 1, then a model from each; tier 0 plain, tier 1 normal with details; Wood Axe and Sickle tier 0, Two-Handed Axe, Giant Axe and Scythe tier 1 (Andrew, 2026-10-03)
- 71a80db 2026-10-02 22:26 DECISIONS.md: the cards above the battle — the fallen leave, a downed hero's card wears a first-aid mark (Andrew, 2026-10-03); the bleeding-out part is open, no item filed yet
- 7a48fc8 2026-10-02 22:20 DECISIONS.md: the look to judge is characters 30% larger, hexes 10% smaller (Andrew, 2026-10-03) — corrects viewer.characters-stand-out's 10%
- 6bbb451 2026-10-02 22:19 DECISIONS.md: the characters must stand out from the board, try 10% larger characters and 10% smaller hexes (Andrew, 2026-10-03) — filed viewer.characters-stand-out
- 1458581 2026-10-02 22:14 DECISIONS.md: the opening battles are watchable as computer-played replays (Andrew, 2026-10-03) — filed viewer.opening-replays

## Next chat

New chat with Heroes of Blight and Tragic — viewer: viewer.opening-replays, the opening battles watchable as computer-played replays; then the four items ruled 2026-10-03 (cards and first aid, the switch-hero question, movement cost on the grid, the hex tooltip)
```
start viewer
```
