# Review — duplicated mechanisms and content in code (2026-09-28)

The brief for the review chat. Ordered by Andrew, 2026-09-28 (DECISIONS.md "a whole-project
review for duplicated mechanisms"). Read-only: this review lands nothing.

## Why

> "I want to review the structure of all the changes that have been made to make sure we stayed
> in the fashion that was initially designed, with content being authored separate from the
> engine, without duplicating functions. The thing you just tried to do is the number one
> problem. We made a lot of automated revisions, and the chance that we duplicated functions is
> high because of exactly what you just tried to do, which is just create a whole new thing for
> something that already existed in the wrong way." — Andrew, 2026-09-28

The case that prompted it: backlog item `terrain.cursed` (filed 2026-09-28, abandoned before
code) was a new terrain id with its own timing for cursed ground, when `layer.weak`
(capability.ground-layers) already was cursed ground under the one ground-status shape ruled
2026-09-03. The gate would have passed it: every per-item check asks "is this wired in and
proven", none asks "did this already exist". `tools/audit-all.mjs` scans the whole tree only
for content-id and creature-tag literals in `src/core`.

## Scope

All four packages, whole tree, audited **by concept, not by commit**: `engine/src`,
`engine/tools`, `kingdom/src`, `viewer/` (its source, not generated output), and the content
tools (`content/*.mjs`, `content/gen`). Git history is used only to say which landing brought
each finding. Since 2026-09-07 (V2): ~252 engine, ~206 content, ~169 kingdom commits.

**Pin the tree.** Another chat keeps building in the engine while this runs. At start, record
`git rev-parse HEAD` for engine, content, kingdom and viewer on the findings page, and read
files at those commits (`git show <sha>:<path>`), so nothing shifts underneath the review.

## The four passes

1. **Inventory.** Every mechanism, mechanically listed: rule tables (e.g. `TRAIT`,
   `LAYER_TRAITS`), seams (`appliesOnEnter` …), effect kinds, trigger hooks, status/layer/terrain
   paths, named random streams, placement routines, legality and damage entry points, per
   package. Set it beside `content/FUNCTIONS.md` and `content/MECHANIC-CENSUS.md` (what content
   may say). Mark what the engine has that content never uses, and what content says in a way the
   engine does not have.
2. **Duplicates.** (a) Code-clone detection across the four packages. (b) Group by concept —
   how a unit gains a status from ground; damage; placement and shunting; target legality;
   random draws; fielding a unit; folding items/badges — and flag any concept with more than one
   implementation. Kingdom or viewer recomputing what the engine owns is a Law 1 / Law 2 finding
   (ENGINE-CONSTITUTION.md). A second field for a fact that already has one is Law 11.
3. **Content in code.** Every number and content row typed into a hand-written code file,
   compared with the Codex (`content/hbt-content.json`, `settled.json`) and the published pack:
   `engine/src/content/{terrain,statuses,maps,scenarios,moves,ai-modes}.ts`,
   `kingdom/src/content/`, and anything in the viewer. For each: a mechanism the engine owns, or
   a fact the Codex should author and publish? A hand copy of a Codex row outside the pack is a
   finding.
4. **Verify.** A separate agent that has not seen passes 1–3 checks every finding against the
   pinned files and discards what does not hold. A finding must cite **both** the thing that
   existed first and the duplicate (file and line at the pinned commit), and the landing that
   brought the duplicate.

Known seeds, to confirm and not to stop at: `kingdom/src/content/heroes.ts` ~55 still says
"Lumberjack and Wife" (a hand copy of a Codex row, stale); `engine/src/content/terrain.ts`
holds ground numbers by hand, copied from DECISIONS.md (rule or content?); 5-GROUND-SETTLED
`terrain.poisoned` superseded 2026-09-03 with the content row still owed a rewrite.

## Rules for this chat

- **Write nothing inside engine, content, kingdom or viewer.** The engine gate and wrap commit
  `git add -A`, so a file left in a package tree is swept into the build chat's next landing.
  Work in the chat's own workspace.
- One subagent at a time (DISPLAY-RULES.md 32); the verify pass is a different agent from the
  one that found.
- **The findings page** is the deliverable: a published page Andrew rules on line by line
  (keep / fix / not a problem), each finding with its evidence and a proposed fix. Nothing is
  fixed and no backlog item is filed until he has ruled. Ruled fixes become backlog items via
  `tools/add-item.mjs`, filed when no engine chat is mid-landing, and his rulings are written to
  DECISIONS.md verbatim.
- Also propose the prevention: the prior-art step (engine/CLAUDE.md traps, 2026-09-28) made
  mechanical — an inventory the audit diffs against its last run, flagging a new table or seam
  that looks like an existing one.
