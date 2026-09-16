# Kingdom ledger

The landing record. `tools/gate.mjs` appends one section per landing, abandonment
or reverted landing, with every check's verdict verbatim; `tools/slice-gate.mjs`
keeps the criteria's state in `isc.json` beside this file. Nothing here is written
by hand below this line.

## the gate — committed by hand, 2026-09-01

The gate cannot gate itself. The first commit carries the package skeleton
(`package.json`, `tsconfig.json`, `.gitignore`, `CLAUDE.md`), the tools
(`gate.mjs`, `slice-gate.mjs`, `next.mjs`, `report.mjs`, `scan.mjs`), the event
vocabulary (`src/core/events.ts`) and this state directory with the nine-item
backlog. Everything after it lands through `node tools/gate.mjs <id> --land`.

## seam.run-engagement — LANDED `0f1db1a` **NEEDS REVIEW**
2026-09-02 03:42 · engine @ 745922d

  PASS  dependencies landed
  WARN  not already decided — 3 candidate ruling(s) — READ BEFORE ASKING: ../CODEX.md:3257 · ../CODEX.md:944
  PASS  typecheck
  PASS  full test suite
  PASS  gate 1 — every claimed criterion holds — ISC-002 holds · ISC-003 holds
  PASS  brought its own tests — test/isc-002.test.ts, test/isc-003.test.ts
  PASS  existing tests untouched
  PASS  kill switch — every claimed probe has been seen red — ISC-002: red on record (2026-09-02 03:38 @ 1446df6, probe 5d7eec2b9fc4) · ISC-003: red on record (2026-09-02 03:40 @ 1446df6, probe e8da485534d8)
  PASS  nothing regresses — every P-tier probe — 3 P-tier probe(s): 2 green, 1 red, 0 regression(s). 0 of 25 closed · 3 probed · 0 accepted
  PASS  hardcode scan — core knows mechanisms, never names
  PASS  generalizes — the second instance costs zero kingdom code — shape 'plumbing' — not a mechanism, exempt
  PASS  naming — new ids use declared kinds
  PASS  naming — no banned words invented
  WARN  engine working tree clean — verified against a DIRTY engine tree (745922d + 3 uncommitted under src/test): M src/content/generated/pack.stamp.json, M src/content/generated/pack.ts, ?? src/sim/coverage.ts
  PASS  one door to the engine

ISC-002: CLOSED at 0f1db1a · ISC-003: CLOSED at 0f1db1a
slice: 2 of 25 closed · 3 probed · 0 accepted
IRON GAUNTLET: NOT PASSED — 2 FLAG(S) WARNED

## correction — 2026-09-01, by hand

The landing above was recorded as `3f9904b`; that sha was then amended away by
the gate's own bookkeeping step and never existed in history. The landing is
`0f1db1a` (seam + bookkeeping in one commit, as the amend left it). Every
reference in this directory was corrected to `0f1db1a`, and the gate now makes
its bookkeeping a second commit so a recorded sha is always one you can check out.

## campaign.state — LANDED `fb04ddf` **NEEDS REVIEW**
2026-09-02 04:02 · engine @ 745922d

  PASS  dependencies landed
  WARN  not already decided — 3 candidate ruling(s) — READ BEFORE ASKING: ../STATE.md:20 · COMBAT-FRAMEWORK.md:147
  PASS  typecheck
  PASS  full test suite
  PASS  gate 1 — every claimed criterion holds — ISC-004 holds
  PASS  brought its own tests — test/isc-004.test.ts
  PASS  existing tests untouched
  PASS  kill switch — every claimed probe has been seen red — ISC-004: red on record (2026-09-02 04:01 @ 443d2b4, probe fb6132dc7ee3)
  PASS  nothing regresses — every P-tier probe — 4 P-tier probe(s): 3 green, 1 red, 0 regression(s). 2 of 33 closed · 4 probed · 0 accepted
  PASS  hardcode scan — core knows mechanisms, never names
  PASS  generalizes — the second instance costs zero kingdom code — shape 'plumbing' — not a mechanism, exempt
  PASS  naming — new ids use declared kinds
  WARN  naming — no banned words invented — 'round' — say Turn — will land FLAGGED
  WARN  engine working tree clean — verified against a DIRTY engine tree (745922d + 3 uncommitted under src/test): M src/content/generated/pack.stamp.json, M src/content/generated/pack.ts, ?? src/sim/coverage.ts
  PASS  one door to the engine

ISC-004: CLOSED at fb04ddf
slice: 3 of 33 closed · 4 probed · 0 accepted
IRON GAUNTLET: NOT PASSED — 3 FLAG(S) WARNED

## combat.prep — LANDED `25a215c` **NEEDS REVIEW**
2026-09-02 04:10 · engine @ 745922d

  PASS  dependencies landed
  WARN  not already decided — 2 candidate ruling(s) — READ BEFORE ASKING: ../STATE.md:20 · ../CODEX.md:980
  PASS  typecheck
  PASS  full test suite
  PASS  gate 1 — every claimed criterion holds — ISC-026 holds · ISC-027 holds · ISC-028 holds · ISC-029 holds
  PASS  brought its own tests — test/isc-026.test.ts, test/isc-027.test.ts, test/isc-028.test.ts, test/isc-029.test.ts
  PASS  existing tests untouched
  PASS  kill switch — every claimed probe has been seen red — ISC-026: red on record (2026-09-02 04:08 @ 7c7a226, probe 0af32c7c2034) · ISC-027: red on record (2026-09-02 04:08 @ 7c7a226, probe 40b5c5088882) · ISC-028: red on record (2026-09-02 04:08 @ 7c7a226, probe eddec48bc555) · ISC-029: red on record (2026-09-02 04:08 @ 7c7a226, probe 2c4eac3b9ab9)
  PASS  nothing regresses — every P-tier probe — 8 P-tier probe(s): 7 green, 1 red, 0 regression(s). 3 of 33 closed · 8 probed · 0 accepted
  PASS  hardcode scan — core knows mechanisms, never names
  PASS  generalizes — the second instance costs zero kingdom code — test.tactic.hold-the-line live · test.tactic.forced-march live
  PASS  naming — new ids use declared kinds
  PASS  naming — no banned words invented
  WARN  engine working tree clean — verified against a DIRTY engine tree (745922d + 3 uncommitted under src/test): M src/content/generated/pack.stamp.json, M src/content/generated/pack.ts, ?? src/sim/coverage.ts
  PASS  one door to the engine

ISC-026: CLOSED at 25a215c · ISC-027: CLOSED at 25a215c · ISC-028: CLOSED at 25a215c · ISC-029: CLOSED at 25a215c
slice: 7 of 33 closed · 8 probed · 0 accepted
IRON GAUNTLET: NOT PASSED — 2 FLAG(S) WARNED

## battle.screen — LANDED `9ee8ea3` **NEEDS REVIEW**
2026-09-02 04:26 · engine @ 745922d

  PASS  dependencies landed
  WARN  not already decided — 2 candidate ruling(s) — READ BEFORE ASKING: ../STATE.md:20 · ../CODEX.md:1819
  PASS  typecheck
  PASS  full test suite
  PASS  gate 1 — every claimed criterion holds — ISC-030 holds · ISC-034 holds
  PASS  brought its own tests — test/isc-034.test.ts
  PASS  existing tests untouched
  PASS  kill switch — every claimed probe has been seen red —   (no red demanded of an H criterion) · ISC-034: red on record (2026-09-02 04:18 @ e99c402, probe cddc95893147)
  PASS  nothing regresses — every P-tier probe — 9 P-tier probe(s): 8 green, 1 red, 0 regression(s). 7 of 34 closed · 9 probed · 0 accepted
  PASS  hardcode scan — core knows mechanisms, never names
  PASS  generalizes — the second instance costs zero kingdom code — shape 'plumbing' — not a mechanism, exempt
  PASS  naming — new ids use declared kinds
  PASS  naming — no banned words invented
  WARN  engine working tree clean — verified against a DIRTY engine tree (745922d + 3 uncommitted under src/test): M src/content/generated/pack.stamp.json, M src/content/generated/pack.ts, ?? src/sim/coverage.ts
  PASS  one door to the engine

ISC-034: CLOSED at 9ee8ea3
slice: 8 of 34 closed · 9 probed · 0 accepted
IRON GAUNTLET: NOT PASSED — 2 FLAG(S) WARNED

## reckoning.apply — LANDED `123a501` **NEEDS REVIEW**
2026-09-02 04:42 · engine @ 745922d

  PASS  dependencies landed
  WARN  not already decided — 4 candidate ruling(s) — READ BEFORE ASKING: ../STATE.md:20 · ../CLAUDE-DOS-AND-DONTS.md:134
  PASS  typecheck
  PASS  full test suite
  PASS  gate 1 — every claimed criterion holds — ISC-014 holds · ISC-015 holds · ISC-016 holds · ISC-017 holds · ISC-018 holds · ISC-020 holds · ISC-031 holds · ISC-032 holds · ISC-033 holds
  PASS  brought its own tests — test/isc-034.test.ts, test/isc-015.test.ts, test/isc-016.test.ts, test/isc-017.test.ts, test/isc-018.test.ts, test/isc-020.test.ts, test/isc-031.test.ts, test/isc-032.test.ts, test/isc-033.test.ts, test/walk.ts
  WARN  existing tests untouched — DELETED LINES in test/isc-034.test.ts (-4) — will land FLAGGED for review
  PASS  kill switch — every claimed probe has been seen red — ISC-014: red on record (2026-09-02 04:34 @ 4172743, probe 445e48318684) · ISC-015: red on record (2026-09-02 04:39 @ 4172743, probe 928f9fb03604) · ISC-016: red on record (2026-09-02 04:39 @ 4172743, probe 291d8c621504) · ISC-017: red on record (2026-09-02 04:40 @ 4172743, probe 07949da68a4f) · ISC-018: red on record (2026-09-02 04:40 @ 4172743, probe 961a1e24f3be) · ISC-020: red on record (2026-09-02 04:40 @ 4172743, probe 1aee6669c969) · ISC-031: red on record (2026-09-02 04:40 @ 4172743, probe 49f0a49be7f6) · ISC-032: red on record (2026-09-02 04:40 @ 4172743, probe 68d89c691986) · ISC-033: red on record (2026-09-02 04:40 @ 4172743, probe 042205630e9c)
  PASS  nothing regresses — every P-tier probe — 17 P-tier probe(s): 17 green, 0 red, 0 regression(s). 8 of 34 closed · 17 probed · 0 accepted
  PASS  hardcode scan — core knows mechanisms, never names
  PASS  generalizes — the second instance costs zero kingdom code — engagement.conquer live · engagement.defend live
  PASS  naming — new ids use declared kinds
  PASS  naming — no banned words invented
  WARN  engine working tree clean — verified against a DIRTY engine tree (745922d + 3 uncommitted under src/test): M src/content/generated/pack.stamp.json, M src/content/generated/pack.ts, ?? src/sim/coverage.ts
  PASS  one door to the engine

<details><summary>Existing tests were edited — review this diff</summary>

```diff
diff --git a/test/isc-034.test.ts b/test/isc-034.test.ts
index e60abd5..c57e404 100644
--- a/test/isc-034.test.ts
+++ b/test/isc-034.test.ts
@@ -32,5 +32,5 @@ const rows = (ctx: ReturnType<typeof atBattle>) => {
 
 describe('ISC-034 — the Reckoning is proposed and editable', () => {
-  it('a won battle proposes XP per deployed hero, one MVP, +1 Renown, a claim and Salvage', () => {
+  it('a won battle proposes XP per deployed hero, one MVP, +1 Renown, a claim and a Salvage grant', () => {
     const ctx = atBattle()
     const e = ctx.campaign.cursor.engagement!
@@ -52,5 +52,5 @@ describe('ISC-034 — the Reckoning is proposed and editable', () => {
     expect(k.renown).toBe(1); expect(k.losses).toBe(0)
     expect(k.claim).toBe(e.territoryId)
-    expect(k.salvage).toBe(SWITCHES.salvagePerConquest)
+    expect(k.grants).toEqual([{ currency: 'currency.salvage', amount: SWITCHES.salvagePerConquest }])
     assertPlainData(k, 'reckoning')
   })
@@ -66,5 +66,5 @@ describe('ISC-034 — the Reckoning is proposed and editable', () => {
     const k = resolveReckoning(ctx.campaign, e, r)
     expect(k.won).toBe(false); expect(k.renown).toBe(0); expect(k.losses).toBe(1)
-    expect(k.claim).toBeNull(); expect(k.salvage).toBe(0)
+    expect(k.claim).toBeNull(); expect(k.grants).toEqual([])
     expect(k.lose).toBeNull()                       // a lost Conquer costs nothing (the stakes row)
     expect(k.heroes[0]).toMatchObject({ dead: true, xp: 0, mvp: false })
@@ -93,5 +93,5 @@ describe('ISC-034 — the Reckoning is proposed and editable', () => {
     enemies.forEach((_, i) => { r = withUnitFate(r, 'enemy', i, { lifeState: 'dead' }) })
     const k = resolveReckoning(ctx.campaign, e, r)
-    const edited = { ...k, heroes: k.heroes.map((h, i) => (i === 2 ? { ...h, xp: 42, wound: 3 } : h)), salvage: 7 }
+    const edited = { ...k, heroes: k.heroes.map((h, i) => (i === 2 ? { ...h, xp: 42, wound: 3 } : h)), grants: [{ currency: 'currency.salvage', amount: 7 }] }
     setBattleOutcome(ctx, r, edited, 'test')
     expect(ctx.campaign.cursor.battle).toEqual({ resultSet: true, result: r, reckoning: edited })
```
</details>

ISC-014: CLOSED at 123a501 · ISC-015: CLOSED at 123a501 · ISC-016: CLOSED at 123a501 · ISC-017: CLOSED at 123a501 · ISC-018: CLOSED at 123a501 · ISC-020: CLOSED at 123a501 · ISC-031: CLOSED at 123a501 · ISC-032: CLOSED at 123a501 · ISC-033: CLOSED at 123a501
slice: 17 of 34 closed · 17 probed · 0 accepted
IRON GAUNTLET: NOT PASSED — 3 FLAG(S) WARNED (not already decided · existing tests edited: isc-034 moved from `salvage` to `grants`, re-seen red · dirty engine tree)

*Tail finished by hand, 2026-09-01: the sandbox's ~3-minute tool-call cap killed
the gate after its landing commit and before the post-land audit. The audit was
then run by hand from the committed tree (suite 35/35; 17 P probes green, 0
regressions) and the criteria closed with `slice-gate.mjs --close … --sha
123a501`. kingdom/CLAUDE.md now says to run landings detached; the tools are
being made to batch their vitest probes so a landing fits the cap.*

## week.machine — LANDED `a46150c` **NEEDS REVIEW**
2026-09-02 05:15 · engine @ 745922d

  PASS  dependencies landed
  WARN  not already decided — 2 candidate ruling(s) — READ BEFORE ASKING: ../STATE.md:20 · ../GLOSSARY.md:53
  PASS  typecheck
  PASS  full test suite — 38 passed
  PASS  gate 1 — every claimed criterion holds — ISC-005 holds · ISC-006 holds · ISC-007 holds
  PASS  brought its own tests — test/isc-004.test.ts, test/isc-005.test.ts, test/isc-006.test.ts, test/isc-007.test.ts
  WARN  existing tests untouched — DELETED LINES in test/isc-004.test.ts (-1) — will land FLAGGED for review
  PASS  kill switch — every claimed probe has been seen red — ISC-005: red on record (2026-09-02 05:12 @ 6c79bc3) and re-proven — fails without stage.mend · ISC-006: red on record (2026-09-02 05:12 @ 6c79bc3, probe b2b2090a7d3d) · ISC-007: red on record (2026-09-02 05:12 @ 6c79bc3, probe 2afcf79120ff)
  PASS  nothing regresses — every P-tier probe — 20 P-tier probe(s): 20 green, 0 red, 0 regression(s). 17 of 50 closed · 20 probed · 0 accepted
  PASS  hardcode scan — core knows mechanisms, never names
  PASS  generalizes — the second instance costs zero kingdom code — stage.buy live · stage.mend live
  PASS  naming — new ids use declared kinds
  PASS  naming — no banned words invented
  WARN  engine working tree clean — verified against a DIRTY engine tree (745922d + 3 uncommitted under src/test): M src/content/generated/pack.stamp.json, M src/content/generated/pack.ts, ?? src/sim/coverage.ts
  PASS  one door to the engine

<details><summary>Existing tests were edited — review this diff</summary>

```diff
diff --git a/test/isc-004.test.ts b/test/isc-004.test.ts
index 165683a..e0ee509 100644
--- a/test/isc-004.test.ts
+++ b/test/isc-004.test.ts
@@ -13,5 +13,5 @@ const hero = (id: string, cls: string): Hero => ({
 })
 const territory = (id: string, kingdom = false): Territory => ({
-  id, name: id, mapId: 'map.open', owned: kingdom, kingdom, claimedOnce: kingdom, buildings: [], adjacent: [],
+  id, name: id, mapId: 'map.open', owned: kingdom, kingdom, claimedOnce: kingdom, buildings: [], adjacent: [], enemies: ['unit.zombie'],
 })
 
```
</details>

ISC-005: CLOSED at a46150c · ISC-006: CLOSED at a46150c · ISC-007: CLOSED at a46150c
slice: 20 of 50 closed · 20 probed · 0 accepted
IRON GAUNTLET: NOT PASSED — 3 FLAG(S) WARNED

## map.four-territories — LANDED `cae0665` **NEEDS REVIEW**
2026-09-02 05:23 · engine @ 745922d

  PASS  dependencies landed
  WARN  not already decided — 3 candidate ruling(s) — READ BEFORE ASKING: ../STATE.md:20 · ../CLAUDE-DOS-AND-DONTS.md:134
  PASS  typecheck
  PASS  full test suite — 46 passed
  PASS  gate 1 — every claimed criterion holds — ISC-011 holds · ISC-012 holds · ISC-013 holds · ISC-035 holds
  PASS  brought its own tests — test/isc-011.test.ts, test/isc-012.test.ts, test/isc-013.test.ts, test/isc-035.test.ts
  PASS  existing tests untouched
  PASS  kill switch — every claimed probe has been seen red — ISC-011: red on record (2026-09-02 05:20 @ 4d96068, probe da8ed3dbd63a) · ISC-012: red on record (2026-09-02 05:20 @ 4d96068, probe e97b83789f17) · ISC-013: red on record (2026-09-02 05:20 @ 4d96068, probe a829e985d844) · ISC-035: red on record (2026-09-02 05:20 @ 4d96068, probe 06f3bd851ee7)
  PASS  nothing regresses — every P-tier probe — 24 P-tier probe(s): 24 green, 0 red, 0 regression(s). 20 of 50 closed · 24 probed · 0 accepted
  PASS  hardcode scan — core knows mechanisms, never names
  PASS  generalizes — the second instance costs zero kingdom code — territory.ruined-kingdom.ridge live · territory.ruined-kingdom.highlands live
  PASS  naming — new ids use declared kinds
  PASS  naming — no banned words invented
  WARN  engine working tree clean — verified against a DIRTY engine tree (745922d + 3 uncommitted under src/test): M src/content/generated/pack.stamp.json, M src/content/generated/pack.ts, ?? src/sim/coverage.ts
  PASS  one door to the engine

ISC-011: CLOSED at cae0665 · ISC-012: CLOSED at cae0665 · ISC-013: CLOSED at cae0665 · ISC-035: CLOSED at cae0665
slice: 24 of 50 closed · 24 probed · 0 accepted
IRON GAUNTLET: NOT PASSED — 2 FLAG(S) WARNED

## assignments.two-slots — LANDED `f8f6d99` **NEEDS REVIEW**
2026-09-02 05:30 · engine @ 745922d

  PASS  dependencies landed
  WARN  not already decided — 3 candidate ruling(s) — READ BEFORE ASKING: ../SKELETON-SETTLED.md:113 · ../STATE.md:20
  PASS  typecheck
  PASS  full test suite — 52 passed
  PASS  gate 1 — every claimed criterion holds — ISC-008 holds · ISC-009 holds · ISC-010 holds
  PASS  brought its own tests — test/isc-008.test.ts, test/isc-009.test.ts, test/isc-010.test.ts
  PASS  existing tests untouched
  PASS  kill switch — every claimed probe has been seen red — ISC-008: red on record (2026-09-02 05:27 @ 9412a6f, probe c7bbee8ab48a) · ISC-009: red on record (2026-09-02 05:27 @ 9412a6f, probe 517cc8b2e53c) · ISC-010: red on record (2026-09-02 05:28 @ 9412a6f, probe af871d626125)
  PASS  nothing regresses — every P-tier probe — 27 P-tier probe(s): 27 green, 0 red, 0 regression(s). 24 of 50 closed · 27 probed · 0 accepted
  PASS  hardcode scan — core knows mechanisms, never names
  PASS  generalizes — the second instance costs zero kingdom code — stage.conquer live · stage.mend live
  PASS  naming — new ids use declared kinds
  PASS  naming — no banned words invented
  WARN  engine working tree clean — verified against a DIRTY engine tree (745922d + 3 uncommitted under src/test): M src/content/generated/pack.stamp.json, M src/content/generated/pack.ts, ?? src/sim/coverage.ts
  PASS  one door to the engine

ISC-008: CLOSED at f8f6d99 · ISC-009: CLOSED at f8f6d99 · ISC-010: CLOSED at f8f6d99
slice: 27 of 50 closed · 27 probed · 0 accepted
IRON GAUNTLET: NOT PASSED — 2 FLAG(S) WARNED

## purse.mend-and-buy — LANDED `6936a71` **NEEDS REVIEW**
2026-09-02 05:41 · engine @ 745922d

  PASS  dependencies landed
  WARN  not already decided — 5 candidate ruling(s) — READ BEFORE ASKING: ../KINGDOM-DESIGN.md:115 · ../GAME-ARCHITECTURE.md:133
  PASS  typecheck
  PASS  full test suite — 62 passed
  PASS  gate 1 — every claimed criterion holds — ISC-021 holds · ISC-022 holds · ISC-036 holds · ISC-037 holds · ISC-038 holds
  PASS  brought its own tests — test/isc-004.test.ts, test/isc-017.test.ts, test/isc-034.test.ts, test/isc-021.test.ts, test/isc-022.test.ts, test/isc-036.test.ts, test/isc-037.test.ts, test/isc-038.test.ts
  WARN  existing tests untouched — DELETED LINES in test/isc-004.test.ts (-1), test/isc-017.test.ts (-3), test/isc-034.test.ts (-1) — will land FLAGGED for review
  PASS  kill switch — every claimed probe has been seen red — ISC-021: red on record (2026-09-02 05:37 @ 64a6c7f) and re-proven — fails without currency.salvage · ISC-022: red on record (2026-09-02 05:38 @ 64a6c7f, probe 584a08e9c8a6) · ISC-036: red on record (2026-09-02 05:39 @ 64a6c7f, probe e0a751cd478a) · ISC-037: red on record (2026-09-02 05:38 @ 64a6c7f, probe 41b8ad9419f1) · ISC-038: red on record (2026-09-02 05:38 @ 64a6c7f, probe 5b31367249bc)
  PASS  nothing regresses — every P-tier probe — 32 P-tier probe(s): 32 green, 0 red, 0 regression(s). 27 of 50 closed · 32 probed · 0 accepted
  PASS  hardcode scan — core knows mechanisms, never names
  PASS  generalizes — the second instance costs zero kingdom code — currency.salvage live · currency.faith live
  PASS  naming — new ids use declared kinds
  WARN  naming — no banned words invented — 'round' — say Turn — will land FLAGGED
  WARN  engine working tree clean — verified against a DIRTY engine tree (745922d + 3 uncommitted under src/test): M src/content/generated/pack.stamp.json, M src/content/generated/pack.ts, ?? src/sim/coverage.ts
  PASS  one door to the engine

<details><summary>Existing tests were edited — review this diff</summary>

```diff
diff --git a/test/isc-004.test.ts b/test/isc-004.test.ts
index e0ee509..fd0bc87 100644
--- a/test/isc-004.test.ts
+++ b/test/isc-004.test.ts
@@ -13,5 +13,5 @@ const hero = (id: string, cls: string): Hero => ({
 })
 const territory = (id: string, kingdom = false): Territory => ({
-  id, name: id, mapId: 'map.open', owned: kingdom, kingdom, claimedOnce: kingdom, buildings: [], adjacent: [], enemies: ['unit.zombie'],
+  id, name: id, mapId: 'map.open', owned: kingdom, kingdom, claimedOnce: kingdom, buildings: [], adjacent: [], enemies: ['unit.zombie'], node: null,
 })
 
diff --git a/test/isc-017.test.ts b/test/isc-017.test.ts
index 08b72d9..4550f5d 100644
--- a/test/isc-017.test.ts
+++ b/test/isc-017.test.ts
@@ -18,11 +18,14 @@ describe('ISC-017 — re-conquest: Renown yes, Salvage no', () => {
     const again = toBattle(loadFixture((c) => { const t = c.territories[c.cursor.engagement!.territoryId]!; t.claimedOnce = true; t.owned = false }))
     const e2 = again.campaign.cursor.engagement!
-    const purse = { ...again.campaign.purse }
+    const salvage = again.campaign.purse['currency.salvage']!
     const renown = again.campaign.renown
     const d2 = decide(again, panelResult(again, true))
-    expect(d2.reckoning.grants).toEqual([])
+    // Law 10, rewritten 2026-09-01 toward the rule: the three shop currencies
+    // are paid on every win (7-KINGDOM-SETTLED.md); Salvage, and only Salvage,
+    // never fires twice. The old lines asserted an empty grant list.
+    expect(d2.reckoning.grants.some((g) => g.currency === 'currency.salvage')).toBe(false)
     applyBattleResult(again, e2, d2.result, d2.reckoning)
     expect(again.campaign.renown).toBe(renown + 1)
-    expect(again.campaign.purse).toEqual(purse)
+    expect(again.campaign.purse['currency.salvage']).toBe(salvage)
     expect(again.campaign.territories[e2.territoryId]!.owned).toBe(true)
     expect(again.events.filter((ev) => ev.type === 'territory.claimed').map((ev) => ev['first'])).toEqual([false])
diff --git a/test/isc-034.test.ts b/test/isc-034.test.ts
index c57e404..f393b2d 100644
--- a/test/isc-034.test.ts
+++ b/test/isc-034.test.ts
@@ -52,5 +52,9 @@ describe('ISC-034 — the Reckoning is proposed and editable', () => {
     expect(k.renown).toBe(1); expect(k.losses).toBe(0)
     expect(k.claim).toBe(e.territoryId)
-    expect(k.grants).toEqual([{ currency: 'currency.salvage', amount: SWITCHES.salvagePerConquest }])
+    // Law 10, rewritten 2026-09-01 toward the rule: a won battle pays the three
+    // shop currencies too (7-KINGDOM-SETTLED.md Payouts); Salvage is the one
+    // that only a first Conquer pays. The old line asserted Salvage ALONE.
+    expect(k.grants.filter((g) => g.currency === 'currency.salvage')).toEqual([{ currency: 'currency.salvage', amount: SWITCHES.salvagePerConquest }])
+    expect(k.grants.map((g) => g.currency).sort()).toEqual(['currency.faith', 'currency.mana', 'currency.salvage', 'currency.supplies'])
     assertPlainData(k, 'reckoning')
   })
```
</details>

ISC-021: CLOSED at 6936a71 · ISC-022: CLOSED at 6936a71 · ISC-036: CLOSED at 6936a71 · ISC-037: CLOSED at 6936a71 · ISC-038: CLOSED at 6936a71
slice: 32 of 50 closed · 32 probed · 0 accepted
IRON GAUNTLET: NOT PASSED — 4 FLAG(S) WARNED

## rewards.and-levels — LANDED `bd95fd7` **NEEDS REVIEW**
2026-09-02 05:51 · engine @ 745922d

  PASS  dependencies landed
  WARN  not already decided — 2 candidate ruling(s) — READ BEFORE ASKING: ../STATE.md:20 · ../CODEX.md:480
  PASS  typecheck
  PASS  full test suite — 66 passed
  PASS  gate 1 — every claimed criterion holds — ISC-019 holds · ISC-039 holds
  PASS  brought its own tests — test/isc-033.test.ts, test/isc-019.test.ts, test/isc-039.test.ts
  PASS  existing tests untouched
  PASS  kill switch — every claimed probe has been seen red — ISC-019: red on record (2026-09-02 05:48 @ 1fa11e9, probe e438c06a6411) · ISC-039: red on record (2026-09-02 05:48 @ 1fa11e9, probe 4dfc8dfbcce2)
  PASS  nothing regresses — every P-tier probe — 34 P-tier probe(s): 34 green, 0 red, 0 regression(s). 32 of 50 closed · 34 probed · 0 accepted
  PASS  hardcode scan — core knows mechanisms, never names
  PASS  generalizes — the second instance costs zero kingdom code — item.halberd live · item.silkweave-armor live
  PASS  naming — new ids use declared kinds
  PASS  naming — no banned words invented
  WARN  engine working tree clean — verified against a DIRTY engine tree (745922d + 3 uncommitted under src/test): M src/content/generated/pack.stamp.json, M src/content/generated/pack.ts, ?? src/sim/coverage.ts
  PASS  one door to the engine

ISC-019: CLOSED at bd95fd7 · ISC-039: CLOSED at bd95fd7
slice: 34 of 50 closed · 34 probed · 0 accepted
IRON GAUNTLET: NOT PASSED — 2 FLAG(S) WARNED

## build.forge — LANDED `2aa2ab0` **NEEDS REVIEW**
2026-09-02 06:03 · engine @ 745922d

  PASS  dependencies landed
  WARN  not already decided — 1 candidate ruling(s) — READ BEFORE ASKING: ../STATE.md:20
  PASS  typecheck
  PASS  full test suite — 71 passed
  PASS  gate 1 — every claimed criterion holds — ISC-040 holds · ISC-041 holds
  PASS  brought its own tests — test/isc-004.test.ts, test/isc-040.test.ts, test/isc-041.test.ts
  WARN  existing tests untouched — DELETED LINES in test/isc-004.test.ts (-1) — will land FLAGGED for review
  PASS  kill switch — every claimed probe has been seen red — ISC-040: red on record (2026-09-02 05:59 @ d32fd6f) and re-proven — fails without building.forge · ISC-041: red on record (2026-09-02 05:59 @ d32fd6f, probe eab3065def52)
  PASS  nothing regresses — every P-tier probe — 36 P-tier probe(s): 36 green, 0 red, 0 regression(s). 34 of 50 closed · 36 probed · 0 accepted
  PASS  hardcode scan — core knows mechanisms, never names
  PASS  generalizes — the second instance costs zero kingdom code — building.forge live · building.chapel live
  PASS  naming — new ids use declared kinds
  PASS  naming — no banned words invented
  WARN  engine working tree clean — verified against a DIRTY engine tree (745922d + 3 uncommitted under src/test): M src/content/generated/pack.stamp.json, M src/content/generated/pack.ts, ?? src/sim/coverage.ts
  PASS  one door to the engine

<details><summary>Existing tests were edited — review this diff</summary>

```diff
diff --git a/test/isc-004.test.ts b/test/isc-004.test.ts
index fd0bc87..f217dad 100644
--- a/test/isc-004.test.ts
+++ b/test/isc-004.test.ts
@@ -10,5 +10,5 @@ import { CURRENCIES } from '../src/content/currencies.js'
 
 const hero = (id: string, cls: string): Hero => ({
-  id, name: id, classes: [cls], level: 1, xp: 0, wound: 0, lifeState: 'alive', badges: [], unitType: 'alpha-osric', corruption: 0,
+  id, name: id, classes: [cls], level: 1, xp: 0, wound: 0, lifeState: 'alive', badges: [], unitType: 'alpha-osric', corruption: 0, equipped: [],
 })
 const territory = (id: string, kingdom = false): Territory => ({
```
</details>

ISC-040: CLOSED at 2aa2ab0 · ISC-041: CLOSED at 2aa2ab0
slice: 36 of 50 closed · 36 probed · 0 accepted
IRON GAUNTLET: NOT PASSED — 3 FLAG(S) WARNED

## opening.prologue — LANDED `e78a8bd` **NEEDS REVIEW**
2026-09-02 06:17 · engine @ 745922d

  PASS  dependencies landed
  WARN  not already decided — 1 candidate ruling(s) — READ BEFORE ASKING: ../STATE.md:20
  PASS  typecheck
  PASS  full test suite — 77 passed
  PASS  gate 1 — every claimed criterion holds — ISC-042 holds · ISC-043 holds · ISC-044 holds · ISC-045 holds
  PASS  brought its own tests — test/isc-017.test.ts, test/isc-033.test.ts, test/isc-042.test.ts, test/isc-043.test.ts, test/isc-044.test.ts, test/isc-045.test.ts
  WARN  existing tests untouched — DELETED LINES in test/isc-017.test.ts (-3), test/isc-033.test.ts (-1) — will land FLAGGED for review
  PASS  kill switch — every claimed probe has been seen red — ISC-042: red on record (2026-09-02 06:11 @ 14fa112, probe e741b2c6af9a) · ISC-043: red on record (2026-09-02 06:11 @ 14fa112, probe a879e393bd20) · ISC-044: red on record (2026-09-02 06:11 @ 14fa112, probe 7bd17febfd0b) · ISC-045: red on record (2026-09-02 06:11 @ 14fa112, probe 8e776cadf0f0)
  PASS  nothing regresses — every P-tier probe — 40 P-tier probe(s): 40 green, 0 red, 0 regression(s). 36 of 50 closed · 40 probed · 0 accepted
  PASS  hardcode scan — core knows mechanisms, never names
  PASS  generalizes — the second instance costs zero kingdom code — engagement.conquer live · hero.base.ranger-aggressive live
  PASS  naming — new ids use declared kinds
  PASS  naming — no banned words invented
  WARN  engine working tree clean — verified against a DIRTY engine tree (745922d + 3 uncommitted under src/test): M src/content/generated/pack.stamp.json, M src/content/generated/pack.ts, ?? src/sim/coverage.ts
  PASS  one door to the engine

<details><summary>Existing tests were edited — review this diff</summary>

```diff
diff --git a/test/isc-017.test.ts b/test/isc-017.test.ts
index 4550f5d..ac6d176 100644
--- a/test/isc-017.test.ts
+++ b/test/isc-017.test.ts
@@ -13,8 +13,8 @@ describe('ISC-017 — re-conquest: Renown yes, Salvage no', () => {
     applyBattleResult(first, e1, d1.result, d1.reckoning)
     expect(first.campaign.purse['currency.salvage']!).toBeGreaterThan(salvageBefore)
-    expect(first.campaign.territories[e1.territoryId]!.claimedOnce).toBe(true)
+    expect(first.campaign.territories[e1.territoryId!]!.claimedOnce).toBe(true)
 
     // the Ridge was held once and lost since: claimedOnce stays true, owned is false
-    const again = toBattle(loadFixture((c) => { const t = c.territories[c.cursor.engagement!.territoryId]!; t.claimedOnce = true; t.owned = false }))
+    const again = toBattle(loadFixture((c) => { const t = c.territories[c.cursor.engagement!.territoryId!]!; t.claimedOnce = true; t.owned = false }))
     const e2 = again.campaign.cursor.engagement!
     const salvage = again.campaign.purse['currency.salvage']!
@@ -28,5 +28,5 @@ describe('ISC-017 — re-conquest: Renown yes, Salvage no', () => {
     expect(again.campaign.renown).toBe(renown + 1)
     expect(again.campaign.purse['currency.salvage']).toBe(salvage)
-    expect(again.campaign.territories[e2.territoryId]!.owned).toBe(true)
+    expect(again.campaign.territories[e2.territoryId!]!.owned).toBe(true)
     expect(again.events.filter((ev) => ev.type === 'territory.claimed').map((ev) => ev['first'])).toEqual([false])
   })
diff --git a/test/isc-033.test.ts b/test/isc-033.test.ts
index c9149e0..3c289d6 100644
--- a/test/isc-033.test.ts
+++ b/test/isc-033.test.ts
@@ -17,5 +17,5 @@ describe('ISC-033 — exit: past the battle, saved, and never applied twice', ()
     expect(ctx.campaign.cursor.step).toBe('reckoning')
     expect(ctx.campaign.cursor.battle).toBeNull()
-    expect(ctx.campaign.territories[e.territoryId]!.owned).toBe(true)
+    expect(ctx.campaign.territories[e.territoryId!]!.owned).toBe(true)
 
     const reloaded = campaignOf(saveOf(ctx.campaign))
```
</details>

ISC-042: CLOSED at e78a8bd · ISC-043: CLOSED at e78a8bd · ISC-044: CLOSED at e78a8bd · ISC-045: CLOSED at e78a8bd
slice: 40 of 50 closed · 40 probed · 0 accepted
IRON GAUNTLET: NOT PASSED — 3 FLAG(S) WARNED

## charter.renown — LANDED `44f4f68` **NEEDS REVIEW**
2026-09-02 09:27 · engine @ 745922d

  PASS  dependencies landed
  WARN  not already decided — 1 candidate ruling(s) — READ BEFORE ASKING: ../STATE.md:20
  PASS  typecheck
  PASS  full test suite — 82 passed
  PASS  gate 1 — every claimed criterion holds — ISC-023 holds · ISC-024 holds
  PASS  brought its own tests — test/isc-037.test.ts, test/isc-023.test.ts, test/isc-024.test.ts
  WARN  existing tests untouched — DELETED LINES in test/isc-037.test.ts (-2) — will land FLAGGED for review
  PASS  kill switch — every claimed probe has been seen red — ISC-023: red on record (2026-09-02 09:26 @ a21fb0b, probe cdfab8a0d334) · ISC-024: red on record (2026-09-02 09:26 @ a21fb0b, probe e776c66a3985)
  PASS  nothing regresses — every P-tier probe — 42 P-tier probe(s): 42 green, 0 red, 0 regression(s). 40 of 50 closed · 42 probed · 0 accepted
  PASS  hardcode scan — core knows mechanisms, never names
  PASS  generalizes — the second instance costs zero kingdom code — unlock.field-size.5 live · unlock.spoils.1 live
  PASS  naming — new ids use declared kinds
  PASS  naming — no banned words invented
  WARN  engine working tree clean — verified against a DIRTY engine tree (745922d + 3 uncommitted under src/test): M src/content/generated/pack.stamp.json, M src/content/generated/pack.ts, ?? src/sim/coverage.ts
  PASS  one door to the engine

<details><summary>Existing tests were edited — review this diff</summary>

```diff
diff --git a/test/isc-037.test.ts b/test/isc-037.test.ts
index 4fd4726..6669045 100644
--- a/test/isc-037.test.ts
+++ b/test/isc-037.test.ts
@@ -43,6 +43,9 @@ describe('ISC-037 — recruiting costs Faith and adds a hero', () => {
     expect(ctx.campaign.roster[pick.id]).toBeUndefined()
   })
-  it('next Week the Beacon is open again', () => {
-    const ctx = atBuy((c) => { c.purse['currency.faith'] = 100 })
+  it('next Week the Beacon is open again — while the roster has room', () => {
+    // Law 10, rewritten 2026-09-02 toward the rule: the roster's base room is
+    // eight ("Roster 10 — hold two more heroes"), and the fixture's seven plus
+    // one recruit fills it. Two heroes fewer, and the Beacon reopens.
+    const ctx = atBuy((c) => { c.purse['currency.faith'] = 100; delete c.roster['hero.fixed.orphans']; delete c.roster['hero.base.priest-scantily'] })
     performRecruit(ctx, listRecruitOffers(ctx.campaign)[0]!.id, 'test')
     for (let i = 0; i < 6; i++) performAdvance(ctx, 'test')
@@ -52,3 +55,9 @@ describe('ISC-037 — recruiting costs Faith and adds a hero', () => {
     expect(canRecruit(ctx.campaign, listRecruitOffers(ctx.campaign)[0]!.id)).toBe(false)
   })
+  it('a full roster refuses a recruit until a Roster Article holds more', () => {
+    const ctx = atBuy((c) => { c.purse['currency.faith'] = 100; c.roster['hero.base.warrior-iron'] = { ...c.roster['hero.fixed.orphans']!, id: 'hero.base.warrior-iron', name: 'Iron Dwarf' } })   // eight alive
+    const pick = listRecruitOffers(ctx.campaign)[0]!
+    expect(canRecruit(ctx.campaign, pick.id)).toBe(false)
+    expect(() => performRecruit(ctx, pick.id, 'test')).toThrow(/roster is full at 8/)
+  })
 })
```
</details>

ISC-023: CLOSED at 44f4f68 · ISC-024: CLOSED at 44f4f68
slice: 42 of 50 closed · 42 probed · 0 accepted
IRON GAUNTLET: NOT PASSED — 3 FLAG(S) WARNED

## screens.thin — LANDED `9a3ba63` **NEEDS REVIEW**
2026-09-02 09:41 · engine @ 745922d

  PASS  dependencies landed
  WARN  not already decided — 3 candidate ruling(s) — READ BEFORE ASKING: ../STATE.md:20 · ../KINGDOM-DESIGN.md:227
  PASS  typecheck
  PASS  full test suite — 89 passed
  PASS  gate 1 — every claimed criterion holds — ISC-046 holds · ISC-047 holds · ISC-048 — H, a person checks · ISC-049 — H, a person checks · ISC-050 — H, a person checks
  PASS  brought its own tests — test/isc-010.test.ts, test/isc-046.test.ts, test/isc-047.test.ts
  PASS  existing tests untouched
  PASS  kill switch — every claimed probe has been seen red — ISC-046: red on record (2026-09-02 09:34 @ 23a07b3, probe 15ec77fd86f7) · ISC-047: red on record (2026-09-02 09:34 @ 23a07b3, probe 3364a6daf27e) ·   (no red demanded of an H criterion) ·   (no red demanded of an H criterion) ·   (no red demanded of an H criterion)
  PASS  nothing regresses — every P-tier probe — 44 P-tier probe(s): 44 green, 0 red, 0 regression(s). 42 of 50 closed · 44 probed · 0 accepted
  PASS  hardcode scan — core knows mechanisms, never names
  PASS  generalizes — the second instance costs zero kingdom code — shape 'plumbing' — not a mechanism, exempt
  PASS  naming — new ids use declared kinds
  PASS  naming — no banned words invented
  WARN  engine working tree clean — verified against a DIRTY engine tree (745922d + 3 uncommitted under src/test): M src/content/generated/pack.stamp.json, M src/content/generated/pack.ts, ?? src/sim/coverage.ts
  PASS  one door to the engine

ISC-046: CLOSED at 9a3ba63 · ISC-047: CLOSED at 9a3ba63
slice: 44 of 50 closed · 44 probed · 0 accepted
IRON GAUNTLET: NOT PASSED — 2 FLAG(S) WARNED

Law 10 note (screens.thin): test/isc-010.test.ts was edited — `c.unavailable = [H]` became `[{ heroId: H, story: 'Went missing' }]` — because the state row grew the story (KINGDOM-DESIGN.md §3: "a story reason is drawn from a long list", and the screen has to show it on reload). The assertion is unchanged; only the fixture's shape moved. ISC-048/049/050 are H and stay open for Andrew; tools/smoke-slice.mjs walks the same screens headlessly and passes.

## run.cold-start — LANDED `e891836` **NEEDS REVIEW**
2026-09-02 09:46 · engine @ 745922d

  PASS  dependencies landed
  WARN  not already decided — 1 candidate ruling(s) — READ BEFORE ASKING: ../STATE.md:20
  PASS  typecheck
  PASS  full test suite — 92 passed
  PASS  gate 1 — every claimed criterion holds — ISC-001 — a cold-start run reaches the first Article: PASSES —   Week 13: no battle · renown 8 · purse faith 210 mana 152 salvage 2 supplies 165 |   Week 14: defend won · renown 9 · purse faith 232 mana 165 salvage 2 supplies 186 | seed 1: the first Article — unlock.roster.10 — at Week 15, after 10 battles (10 won), Renown 10 · ISC-025 — the terminus depends on none of them: PASSES —   Week 14: defend won · renown 9 · purse faith 232 mana 165 salvage 2 supplies 186 | seed 1: the first Article — unlock.roster.10 — at Week 15, after 10 battles (10 won), Renown 10 | seed 1: no OUT system was leaned on (1059 events, 44 words)
  PASS  brought its own tests — test/cold-start.test.ts
  PASS  existing tests untouched
  PASS  kill switch — every claimed probe has been seen red — ISC-001: red on record (2026-09-02 09:44 @ 27f7c4e, probe 9cb72d164699) · ISC-025: red on record (2026-09-02 09:44 @ 27f7c4e, probe 3249485b19cb)
  PASS  nothing regresses — every P-tier probe — 46 P-tier probe(s): 46 green, 0 red, 0 regression(s). 44 of 50 closed · 46 probed · 0 accepted
  PASS  hardcode scan — core knows mechanisms, never names
  PASS  generalizes — the second instance costs zero kingdom code — shape 'plumbing' — not a mechanism, exempt
  PASS  naming — new ids use declared kinds
  PASS  naming — no banned words invented
  WARN  engine working tree clean — verified against a DIRTY engine tree (745922d + 3 uncommitted under src/test): M src/content/generated/pack.stamp.json, M src/content/generated/pack.ts, ?? src/sim/coverage.ts
  PASS  one door to the engine

ISC-001: CLOSED at e891836 · ISC-025: CLOSED at e891836
slice: 46 of 50 closed · 46 probed · 0 accepted
IRON GAUNTLET: NOT PASSED — 2 FLAG(S) WARNED

## screens.art — LANDED `7d954ed` **NEEDS REVIEW**
2026-09-02 10:53 · engine @ 745922d

  PASS  dependencies landed
  WARN  not already decided — 2 candidate ruling(s) — READ BEFORE ASKING: ../STATE.md:20 · ../DOCS.md:82
  PASS  typecheck
  PASS  full test suite — 97 passed
  PASS  gate 1 — every claimed criterion holds
  PASS  brought its own tests — test/art.test.ts
  PASS  existing tests untouched
  PASS  kill switch — every claimed probe has been seen red — no criterion claimed — not applicable
  PASS  nothing regresses — every P-tier probe — 46 P-tier probe(s): 46 green, 0 red, 0 regression(s). 46 of 50 closed · 46 probed · 0 accepted
  PASS  hardcode scan — core knows mechanisms, never names
  PASS  generalizes — the second instance costs zero kingdom code — shape 'plumbing' — not a mechanism, exempt
  PASS  naming — new ids use declared kinds
  PASS  naming — no banned words invented
  WARN  engine working tree clean — verified against a DIRTY engine tree (745922d + 3 uncommitted under src/test): M src/content/generated/pack.stamp.json, M src/content/generated/pack.ts, ?? src/sim/coverage.ts
  PASS  one door to the engine

slice: 46 of 50 closed · 46 probed · 0 accepted
IRON GAUNTLET: NOT PASSED — 2 FLAG(S) WARNED; 1 EXEMPTION(S) TAKEN

## screens.load-game — LANDED `0e8872f` **NEEDS REVIEW**
2026-09-02 11:07 · engine @ 745922d

  PASS  dependencies landed
  WARN  not already decided — 2 candidate ruling(s) — READ BEFORE ASKING: ../STATE.md:20 · ../DOCS.md:82
  PASS  typecheck
  PASS  full test suite — 101 passed
  PASS  gate 1 — every claimed criterion holds
  PASS  brought its own tests — test/loadgame.test.ts
  PASS  existing tests untouched
  PASS  kill switch — every claimed probe has been seen red — no criterion claimed — not applicable
  PASS  nothing regresses — every P-tier probe — 46 P-tier probe(s): 46 green, 0 red, 0 regression(s). 46 of 50 closed · 46 probed · 0 accepted
  PASS  hardcode scan — core knows mechanisms, never names
  PASS  generalizes — the second instance costs zero kingdom code — shape 'plumbing' — not a mechanism, exempt
  PASS  naming — new ids use declared kinds
  PASS  naming — no banned words invented
  WARN  engine working tree clean — verified against a DIRTY engine tree (745922d + 3 uncommitted under src/test): M src/content/generated/pack.stamp.json, M src/content/generated/pack.ts, ?? src/sim/coverage.ts
  PASS  one door to the engine

slice: 46 of 50 closed · 46 probed · 0 accepted
IRON GAUNTLET: NOT PASSED — 2 FLAG(S) WARNED; 1 EXEMPTION(S) TAKEN

## tools.gear-doc — LANDED `50eb0f1` **NEEDS REVIEW**
2026-09-03 03:12 · engine @ 7a11028

  PASS  dependencies landed
  WARN  not already decided — 2 candidate ruling(s) — READ BEFORE ASKING: ../DOCS.md:80 · ../STATE.md:20
  PASS  typecheck
  PASS  full test suite — 103 passed
  PASS  gate 1 — every claimed criterion holds
  PASS  brought its own tests — test/criteria-docs.test.ts
  PASS  existing tests untouched
  PASS  kill switch — every claimed probe has been seen red — no criterion claimed — not applicable
  PASS  nothing regresses — every P-tier probe — 46 P-tier probe(s): 46 green, 0 red, 0 regression(s). 46 of 68 closed · 46 probed · 0 accepted
  PASS  hardcode scan — core knows mechanisms, never names
  PASS  generalizes — the second instance costs zero kingdom code — shape 'tooling' — not a mechanism, exempt
  PASS  naming — new ids use declared kinds
  PASS  naming — no banned words invented
  WARN  engine working tree clean — verified against a DIRTY engine tree (7a11028 + 11 uncommitted under src/test): M src/content/index.ts, M test/additions.test.ts, M test/bleed.test.ts
  PASS  one door to the engine

slice: 46 of 68 closed · 46 probed · 0 accepted
IRON GAUNTLET: NOT PASSED — 2 FLAG(S) WARNED; 1 EXEMPTION(S) TAKEN

## heroes.cut-alpha — LANDED `97b879c` **NEEDS REVIEW**
2026-09-03 03:17 · engine @ 7a11028

  PASS  dependencies landed
  WARN  not already decided — 3 candidate ruling(s) — READ BEFORE ASKING: ../STATE.md:20 · ITEMS-PLAN.md:212
  PASS  typecheck
  PASS  full test suite — 103 passed
  PASS  gate 1 — every claimed criterion holds
  PASS  brought its own tests — test/isc-009.test.ts, test/isc-010.test.ts, test/isc-018.test.ts, test/isc-020.test.ts, test/isc-036.test.ts, test/isc-037.test.ts, test/isc-038.test.ts, test/isc-039.test.ts, test/isc-044.test.ts
  PASS  existing tests untouched
  PASS  kill switch — every claimed probe has been seen red — no criterion claimed — not applicable
  PASS  nothing regresses — every P-tier probe — 46 P-tier probe(s): 46 green, 0 red, 0 regression(s). 46 of 68 closed · 46 probed · 0 accepted
  PASS  hardcode scan — core knows mechanisms, never names
  PASS  generalizes — the second instance costs zero kingdom code — shape 'data' — not a mechanism, exempt
  PASS  naming — new ids use declared kinds
  PASS  naming — no banned words invented
  WARN  engine working tree clean — verified against a DIRTY engine tree (7a11028 + 14 uncommitted under src/test): M src/content/index.ts, M src/view/text.ts, M test/additions.test.ts
  PASS  one door to the engine

slice: 46 of 68 closed · 46 probed · 0 accepted
IRON GAUNTLET: NOT PASSED — 2 FLAG(S) WARNED; 1 EXEMPTION(S) TAKEN

Law 10 notes (heroes.cut-alpha): seven probes re-pointed from the removed ids to Eve rows; three numbers moved WITH the roster, none against a rule — isc-020's hand sums (five heroes, not six; four living of five in the dead case), isc-036's id-order expectation (paladin < ranger < warrior; the rule "heroes resolve in id order" is unchanged), isc-044's cadence clipped at the pool (the rule is the cadence; the pool is five until content.field-eve-24). isc-037's "full roster" case now adds two synthetic orphans to reach eight.

## items.rows — LANDED `bd45b65` **NEEDS REVIEW**
2026-09-03 03:23 · engine @ da99720

  PASS  dependencies landed
  WARN  not already decided — 4 candidate ruling(s) — READ BEFORE ASKING: ../STATE.md:20 · ../GEAR-IMPLEMENTATION.md:278
  PASS  typecheck
  PASS  full test suite — 108 passed
  PASS  gate 1 — every claimed criterion holds — ISC-051 — the kingdom's item rows are the codex's
  PASS  brought its own tests — test/fixtures/bad-combos.json, test/isc-051.test.ts
  PASS  existing tests untouched
  PASS  kill switch — every claimed probe has been seen red — ISC-051: red on record (2026-09-03 03:23 @ 90247cd, probe daae314ec1c4)
  PASS  nothing regresses — every P-tier probe — 47 P-tier probe(s): 47 green, 0 red, 0 regression(s). 46 of 68 closed · 47 probed · 0 accepted
  PASS  hardcode scan — core knows mechanisms, never names
  PASS  generalizes — the second instance costs zero kingdom code — shape 'data' — not a mechanism, exempt
  PASS  naming — new ids use declared kinds
  PASS  naming — no banned words invented
  PASS  engine working tree clean — engine @ da99720, clean
  PASS  one door to the engine

ISC-051: CLOSED at bd45b65
slice: 47 of 68 closed · 47 probed · 0 accepted
IRON GAUNTLET: NOT PASSED — 1 FLAG(S) WARNED

## heroes.kits — LANDED `3ae1be3` **NEEDS REVIEW**
2026-09-03 03:57 · engine @ 37f7311

  PASS  dependencies landed
  WARN  not already decided — 4 candidate ruling(s) — READ BEFORE ASKING: ../GEAR-IMPLEMENTATION.md:55 · ../STATE.md:18
  PASS  typecheck
  PASS  full test suite — 113 passed
  PASS  gate 1 — every claimed criterion holds — ISC-052 holds · ISC-053 holds
  PASS  brought its own tests — test/isc-041.test.ts, test/isc-052.test.ts, test/isc-053.test.ts
  PASS  existing tests untouched
  PASS  kill switch — every claimed probe has been seen red — ISC-052: red on record (2026-09-03 03:54 @ 05848fe, probe 7c20f25f12a0) · ISC-053: red on record (2026-09-03 03:54 @ 05848fe, probe db6adbf52489)
  PASS  nothing regresses — every P-tier probe — 49 P-tier probe(s): 49 green, 0 red, 0 regression(s). 47 of 68 closed · 49 probed · 0 accepted
  PASS  hardcode scan — core knows mechanisms, never names
  PASS  generalizes — the second instance costs zero kingdom code — shape 'data' — not a mechanism, exempt
  PASS  naming — new ids use declared kinds
  PASS  naming — no banned words invented
  PASS  engine working tree clean — engine @ 37f7311, clean
  PASS  one door to the engine

ISC-052: CLOSED at 3ae1be3 · ISC-053: CLOSED at 3ae1be3
slice: 49 of 68 closed · 49 probed · 0 accepted
IRON GAUNTLET: NOT PASSED — 1 FLAG(S) WARNED

Law 10 note (heroes.kits): test/isc-041.test.ts asserted `equipped` equals ['item.longsword'] after the shop equip; heroes now enter WEARING their content kit (ruled 2026-09-02), so the assertion became "the longsword is the last thing worn and it is not the only thing" — the rule under test (buy at Buy, fit at Equip) is unchanged.

## equip.slots — LANDED `a3e9d82` **NEEDS REVIEW**
2026-09-03 04:06 · engine @ 37f7311

  PASS  dependencies landed
  WARN  not already decided — 3 candidate ruling(s) — READ BEFORE ASKING: ../STATE.md:20 · ../CODEX.md:1816
  PASS  typecheck
  PASS  full test suite — 118 passed
  PASS  gate 1 — every claimed criterion holds — ISC-054 holds · ISC-055 holds
  PASS  brought its own tests — test/isc-004.test.ts, test/isc-054.test.ts, test/isc-055.test.ts, test/walk.ts
  PASS  existing tests untouched
  PASS  kill switch — every claimed probe has been seen red — ISC-054: red on record (2026-09-03 04:05 @ 11bb483, probe 5eee980745f4) · ISC-055: red on record (2026-09-03 04:06 @ 11bb483, probe a0309ff88cbe)
  PASS  nothing regresses — every P-tier probe — 51 P-tier probe(s): 51 green, 0 red, 0 regression(s). 49 of 68 closed · 51 probed · 0 accepted
  PASS  hardcode scan — core knows mechanisms, never names
  PASS  generalizes — the second instance costs zero kingdom code
  PASS  naming — new ids use declared kinds
  PASS  naming — no banned words invented
  WARN  engine working tree clean — verified against a DIRTY engine tree (37f7311 + 4 uncommitted under src/test): M src/content/generated/pack.ts, M src/content/pack.ts, M src/content/statuses.ts
  PASS  one door to the engine

ISC-054: CLOSED at a3e9d82 · ISC-055: CLOSED at a3e9d82
slice: 51 of 68 closed · 51 probed · 0 accepted
IRON GAUNTLET: NOT PASSED — 2 FLAG(S) WARNED; 1 EXEMPTION(S) TAKEN

## equip.costs — LANDED `abe219b` **NEEDS REVIEW**
2026-09-03 04:17 · engine @ 2dd4781

  PASS  dependencies landed
  WARN  not already decided — 3 candidate ruling(s) — READ BEFORE ASKING: ../STATE.md:20 · ../STATE.md:21
  PASS  typecheck
  PASS  full test suite — 121 passed
  PASS  gate 1 — every claimed criterion holds — ISC-056 — idols and Bloodrunes cost, and refund inside the session
  PASS  brought its own tests — test/isc-056.test.ts
  PASS  existing tests untouched
  PASS  kill switch — every claimed probe has been seen red — ISC-056: red on record (2026-09-03 04:17 @ e93a811, probe 66e707756327)
  PASS  nothing regresses — every P-tier probe — 52 P-tier probe(s): 52 green, 0 red, 0 regression(s). 51 of 68 closed · 52 probed · 0 accepted
  PASS  hardcode scan — core knows mechanisms, never names
  PASS  generalizes — the second instance costs zero kingdom code
  PASS  naming — new ids use declared kinds
  PASS  naming — no banned words invented
  WARN  engine working tree clean — verified against a DIRTY engine tree (2dd4781 + 5 uncommitted under src/test): M src/content/generated/pack.stamp.json, M src/content/generated/pack.ts, M src/content/moves.ts
  PASS  one door to the engine

ISC-056: CLOSED at abe219b
slice: 52 of 68 closed · 52 probed · 0 accepted
IRON GAUNTLET: NOT PASSED — 2 FLAG(S) WARNED; 1 EXEMPTION(S) TAKEN

## forge.shelf — LANDED `d74a0bc` **NEEDS REVIEW**
2026-09-03 04:32 · engine @ 8de1620

  PASS  dependencies landed
  WARN  not already decided — 3 candidate ruling(s) — READ BEFORE ASKING: ../STATE.md:20 · ../STATE.md:21
  PASS  typecheck
  PASS  full test suite — 128 passed
  PASS  gate 1 — every claimed criterion holds — ISC-057 holds · ISC-058 holds · ISC-059 holds
  PASS  brought its own tests — test/isc-041.test.ts, test/isc-057.test.ts, test/isc-058.test.ts, test/isc-059.test.ts
  PASS  existing tests untouched
  PASS  kill switch — every claimed probe has been seen red — ISC-057: red on record (2026-09-03 04:32 @ af77cc3, probe b878b92204bf) · ISC-058: red on record (2026-09-03 04:32 @ af77cc3, probe d8798318db1e) · ISC-059: red on record (2026-09-03 04:32 @ af77cc3, probe 0768dde44253)
  PASS  nothing regresses — every P-tier probe — 55 P-tier probe(s): 55 green, 0 red, 0 regression(s). 52 of 68 closed · 55 probed · 0 accepted
  PASS  hardcode scan — core knows mechanisms, never names
  PASS  generalizes — the second instance costs zero kingdom code
  PASS  naming — new ids use declared kinds
  PASS  naming — no banned words invented
  WARN  engine working tree clean — verified against a DIRTY engine tree (8de1620 + 10 uncommitted under src/test): M src/content/generated/pack.ts, M src/content/index.ts, M src/content/pack.ts
  PASS  one door to the engine

ISC-057: CLOSED at d74a0bc · ISC-058: CLOSED at d74a0bc · ISC-059: CLOSED at d74a0bc
slice: 55 of 68 closed · 55 probed · 0 accepted
IRON GAUNTLET: NOT PASSED — 2 FLAG(S) WARNED; 1 EXEMPTION(S) TAKEN

Law 10 note (forge.shelf): test/isc-041.test.ts bought two named items at a flat switch price; the shelf is now a weekly roll sized by the Forge's band at a rolled 10–20 Supplies (ruled 2026-09-02), so the probe buys what the shelf offers this Week. The rule it holds — no shelf until repaired, tier-1 weapons and armor for Supplies, then equipped at prep — is unchanged.

Law 10 note (the enchant pass, content-side): test/criteria-docs.test.ts asserted ISC-051's probe did NOT exist yet ("the tool says so") — it does now, so the assertion was rewritten to the rule it was really holding: a gear criterion's number resolves to a verdict. It now asks ISC-068 (H-tier, no probe to run).

BLOCKED, not mine (2026-09-02): SLICE.html cannot be rebuilt right now. The engine's working tree is mid-landing — its regenerated pack now defines attack.fangs.bite, which is ALSO hand-typed in engine/src/content/index.ts, and the engine's own loader refuses ("one owner only", correctly). The kingdom's suite is green (128) because it never loads that registry; the browser bundle does, and throws at load. SLICE.html is left at the last good build (kingdom a42ecc2); rebuild when the engine session's content.field-eve-24 work settles. The kingdom does not edit engine/src.

## waystation.catalog — LANDED `bf993f0` **NEEDS REVIEW**
2026-09-03 05:22 · engine @ e6f8201

  PASS  dependencies landed
  WARN  not already decided — 4 candidate ruling(s) — READ BEFORE ASKING: ../STATE.md:20 · ../STATE.md:21
  PASS  typecheck
  PASS  full test suite — 132 passed
  PASS  gate 1 — every claimed criterion holds — ISC-060 holds · ISC-061 holds
  PASS  brought its own tests — test/art.test.ts, test/isc-060.test.ts, test/isc-061.test.ts
  PASS  existing tests untouched
  PASS  kill switch — every claimed probe has been seen red — ISC-060: red on record (2026-09-03 05:22 @ 06467ca, probe a0b486814460) · ISC-061: red on record (2026-09-03 05:22 @ 06467ca, probe fe35bdb44703)
  PASS  nothing regresses — every P-tier probe — 57 P-tier probe(s): 57 green, 0 red, 0 regression(s). 55 of 68 closed · 57 probed · 0 accepted
  PASS  hardcode scan — core knows mechanisms, never names
  PASS  generalizes — the second instance costs zero kingdom code
  PASS  naming — new ids use declared kinds
  PASS  naming — no banned words invented
  WARN  engine working tree clean — verified against a DIRTY engine tree (e6f8201 + 5 uncommitted under src/test): M src/content/generated/pack.ts, M src/core/setup.ts, M src/core/types.ts
  PASS  one door to the engine

ISC-060: CLOSED at bf993f0 · ISC-061: CLOSED at bf993f0
slice: 57 of 68 closed · 57 probed · 0 accepted
IRON GAUNTLET: NOT PASSED — 2 FLAG(S) WARNED; 1 EXEMPTION(S) TAKEN

Law 10 note (waystation.catalog): test/art.test.ts asserted the town shows ['chapel'] with the Ridge unheld; the Waystation joined the Sanctuary's buildings this landing, so the expectation became ['chapel','waystation'] and its art was prepared (generated/art-wanted.json). The rule under test — a Territory's building shows only once it is held — is unchanged and still asserted by the Forge.

## sets.resolve — LANDED `c0ec289` **NEEDS REVIEW**
2026-09-03 10:37 · engine @ 94ab255

  PASS  dependencies landed
  WARN  not already decided — 5 candidate ruling(s) — READ BEFORE ASKING: ../STATE.md:20 · ../STATE.md:18
  PASS  typecheck
  PASS  full test suite — 140 passed
  PASS  gate 1 — every claimed criterion holds — ISC-062 holds · ISC-063 holds
  PASS  brought its own tests — test/isc-062.test.ts, test/isc-063.test.ts
  PASS  existing tests untouched
  PASS  kill switch — every claimed probe has been seen red — ISC-062: red on record (2026-09-03 10:23 @ 096dd47, probe 26c75af8baf2) · ISC-063: red on record (2026-09-03 10:23 @ 096dd47, probe a06490952936)
  PASS  nothing regresses — every P-tier probe — 59 P-tier probe(s): 59 green, 0 red, 0 regression(s). 57 of 68 closed · 59 probed · 0 accepted
  PASS  hardcode scan — core knows mechanisms, never names
  PASS  generalizes — the second instance costs zero kingdom code
  PASS  naming — new ids use declared kinds
  PASS  naming — no banned words invented
  WARN  engine working tree clean — verified against a DIRTY engine tree (94ab255 + 1 uncommitted under src/test): ?? src/sim/coverage.ts
  PASS  one door to the engine

ISC-062: CLOSED at c0ec289 · ISC-063: CLOSED at c0ec289
slice: 59 of 68 closed · 59 probed · 0 accepted
IRON GAUNTLET: NOT PASSED — 2 FLAG(S) WARNED; 1 EXEMPTION(S) TAKEN

## seam.loadout — LANDED `5edcbc5` **NEEDS REVIEW**
2026-09-03 20:13 · engine @ a5f5678

  PASS  dependencies landed
  WARN  not already decided — 2 candidate ruling(s) — READ BEFORE ASKING: ITEMS-PLAN.md:214 · ../GEAR-IMPLEMENTATION.md:281
  PASS  typecheck
  PASS  full test suite — 142 passed
  PASS  gate 1 — every claimed criterion holds — ISC-064 — what is equipped is what is fielded
  PASS  brought its own tests — test/isc-064.test.ts
  PASS  existing tests untouched
  PASS  kill switch — every claimed probe has been seen red — ISC-064: red on record (2026-09-03 10:42 @ f6515c2, probe be45e57410e8)
  PASS  nothing regresses — every P-tier probe — 61 P-tier probe(s): 60 green, 1 red, 0 regression(s). 50 of 68 closed · 61 probed · 0 accepted
  PASS  hardcode scan — core knows mechanisms, never names
  PASS  generalizes — the second instance costs zero kingdom code — shape 'plumbing' — not a mechanism, exempt
  PASS  naming — new ids use declared kinds
  PASS  naming — no banned words invented
  WARN  engine working tree clean — verified against a DIRTY engine tree (a5f5678 + 1 uncommitted under src/test): ?? src/sim/coverage.ts
  PASS  one door to the engine

ISC-064: CLOSED at 5edcbc5
slice: 51 of 68 closed · 61 probed · 0 accepted
IRON GAUNTLET: NOT PASSED — 2 FLAG(S) WARNED

Note (seam.loadout, 2026-09-03): the first --land attempt at 10:45 ran before the engine's fix.post-end-ladder existed and against the un-switched seam, and its "nothing regresses" pass REOPENED nine criteria (001, 003, 022, 025, 035, 043, 044, 045, 052) — seven on the engine's applyItems refusing a spare weapon (now SWITCHES.spareWeapons, engine backlog seam.spare-weapons), 003 on the engine ticking poison after battle.end (engine fix.post-end-ladder, landed by the engine session at 98a74b6), 052 on the fixture. All nine are green on the landed tree; eight were re-closed by `slice-gate.mjs --close … --sha 5edcbc5`. **ISC-044 stays OPEN:** its probe was edited after its red (7bd17febfd0b → 8719b22da823) by an earlier landing and the instrument refuses to close it until it is seen red again — someone with the tree must stash src, `--isc 044 --red`, and close it. Also fixed this landing: tools/gate.mjs strips backticks and `$` from the commit subject (an unbalanced backtick in a spec's first 72 characters killed the commit between `git add -A` and the ledger).

## rewards.tiered — LANDED `26c25b5` **NEEDS REVIEW**
2026-09-03 20:17 · engine @ fc72b9a

  PASS  dependencies landed
  WARN  not already decided — 3 candidate ruling(s) — READ BEFORE ASKING: ../STATE.md:21 · ../GEAR-DESIGN.md:61
  PASS  typecheck
  PASS  full test suite — 146 passed
  PASS  gate 1 — every claimed criterion holds — ISC-065 — the reward draw is tiered at the ruled odds
  PASS  brought its own tests — test/isc-065.test.ts
  PASS  existing tests untouched
  PASS  kill switch — every claimed probe has been seen red — ISC-065: red on record (2026-09-03 17:41 @ f6515c2, probe a829c53950c9)
  PASS  nothing regresses — every P-tier probe — 61 P-tier probe(s): 61 green, 0 red, 0 regression(s). 59 of 68 closed · 61 probed · 0 accepted
  PASS  hardcode scan — core knows mechanisms, never names
  PASS  generalizes — the second instance costs zero kingdom code
  PASS  naming — new ids use declared kinds
  PASS  naming — no banned words invented
  WARN  engine working tree clean — verified against a DIRTY engine tree (fc72b9a + 1 uncommitted under src/test): ?? src/sim/coverage.ts
  PASS  one door to the engine

ISC-065: CLOSED at 26c25b5
slice: 60 of 68 closed · 61 probed · 0 accepted
IRON GAUNTLET: NOT PASSED — 2 FLAG(S) WARNED; 1 EXEMPTION(S) TAKEN

## screens.equip — LANDED `77e66a4` **NEEDS REVIEW**
2026-09-03 20:19 · engine @ fc72b9a

  PASS  dependencies landed
  WARN  not already decided — 2 candidate ruling(s) — READ BEFORE ASKING: ../STATE.md:20 · ../CODEX.md:1829
  PASS  typecheck
  PASS  full test suite — 149 passed
  PASS  gate 1 — every claimed criterion holds — ISC-066 is H-tier: H — open SLICE.html at Deploy → Equip; swap a weapon, equip an idol and remove it, leave; the set line appears; anything missing is a no.
  PASS  brought its own tests — test/equip-screen.test.ts
  PASS  existing tests untouched
  PASS  kill switch — every claimed probe has been seen red —   (no red demanded of an H criterion)
  PASS  nothing regresses — every P-tier probe — 61 P-tier probe(s): 61 green, 0 red, 0 regression(s). 60 of 68 closed · 61 probed · 0 accepted
  PASS  hardcode scan — core knows mechanisms, never names
  PASS  generalizes — the second instance costs zero kingdom code — shape 'plumbing' — not a mechanism, exempt
  PASS  naming — new ids use declared kinds
  PASS  naming — no banned words invented
  WARN  engine working tree clean — verified against a DIRTY engine tree (fc72b9a + 1 uncommitted under src/test): ?? src/sim/coverage.ts
  PASS  one door to the engine

slice: 60 of 68 closed · 61 probed · 0 accepted
IRON GAUNTLET: NOT PASSED — 2 FLAG(S) WARNED

## screens.after-battle — LANDED `f1745d1` **NEEDS REVIEW**
2026-09-03 20:31 · engine @ b5ee6ce

  PASS  dependencies landed
  WARN  not already decided — 2 candidate ruling(s) — READ BEFORE ASKING: ../STATE.md:20 · ../STATE.md:21
  PASS  typecheck
  PASS  full test suite — 154 passed
  PASS  gate 1 — every claimed criterion holds — ISC-067 — H, a person checks · ISC-068 — H, a person checks
  PASS  brought its own tests — test/after-battle.test.ts
  PASS  existing tests untouched
  PASS  kill switch — every claimed probe has been seen red —   (no red demanded of an H criterion) ·   (no red demanded of an H criterion)
  PASS  nothing regresses — every P-tier probe — 61 P-tier probe(s): 61 green, 0 red, 0 regression(s). 60 of 68 closed · 61 probed · 0 accepted
  PASS  hardcode scan — core knows mechanisms, never names
  PASS  generalizes — the second instance costs zero kingdom code — shape 'plumbing' — not a mechanism, exempt
  PASS  naming — new ids use declared kinds
  PASS  naming — no banned words invented
  WARN  engine working tree clean — verified against a DIRTY engine tree (b5ee6ce + 1 uncommitted under src/test): ?? src/sim/coverage.ts
  PASS  one door to the engine

slice: 60 of 68 closed · 61 probed · 0 accepted
IRON GAUNTLET: NOT PASSED — 2 FLAG(S) WARNED

## screens.equip-stats — LANDED `cf2e188` **NEEDS REVIEW**
2026-09-03 21:18 · engine @ 4516bbb

  PASS  dependencies landed
  WARN  not already decided — 3 candidate ruling(s) — READ BEFORE ASKING: ../STATE.md:20 · ../STATE.md:21
  PASS  typecheck
  PASS  full test suite — 154 passed
  PASS  gate 1 — every claimed criterion holds
  PASS  brought its own tests — test/equip-screen.test.ts
  WARN  existing tests untouched — DELETED LINES in test/equip-screen.test.ts (-1) — will land FLAGGED for review
  PASS  kill switch — every claimed probe has been seen red — no criterion claimed — not applicable
  PASS  nothing regresses — every P-tier probe — 61 P-tier probe(s): 61 green, 0 red, 0 regression(s). 60 of 68 closed · 61 probed · 0 accepted
  PASS  hardcode scan — core knows mechanisms, never names
  PASS  generalizes — the second instance costs zero kingdom code — shape 'plumbing' — not a mechanism, exempt
  PASS  naming — new ids use declared kinds
  PASS  naming — no banned words invented
  WARN  engine working tree clean — verified against a DIRTY engine tree (4516bbb + 1 uncommitted under src/test): ?? src/sim/coverage.ts
  PASS  one door to the engine

<details><summary>Existing tests were edited — review this diff</summary>

```diff
diff --git a/test/equip-screen.test.ts b/test/equip-screen.test.ts
index 8c13ae4..1d31b48 100644
--- a/test/equip-screen.test.ts
+++ b/test/equip-screen.test.ts
@@ -17,4 +17,9 @@ describe('the Equip screen', () => {
     const html = equipScreen(ctx.campaign, [HUNTER, CHAPLAIN], { where: 'prep', picked: null })
     expect(html.match(/class="herocard"/g)?.length).toBe(2)
+    // stats above the art, the viewer's ten rows; the art carries the name
+    for (const label of ['Move', 'Armor', 'Resist', 'Dodge', 'Max HP', 'Accuracy', 'Crit', 'Strength', 'Precision', 'Stam Regen']) expect(html).toContain(`<span class="stN">${label}</span>`)
+    expect(html.indexOf('class="stats"')).toBeLessThan(html.indexOf('class="art"'))
+    expect(html).toContain('<div class="plate"><b>Hunter</b>')
+    expect(html).toMatch(/Accuracy<\/span><span class="stV[^"]*">(<em>[^<]*<\/em>)?\d+%/)
     expect(html).toContain('both hands')                     // the Hunter's longbow fills both
     expect(html).toContain('right hand'); expect(html).toContain('left hand')   // the Chaplain's shield and texts
@@ -50,5 +55,6 @@ describe('the Equip screen', () => {
     const html = equipScreen(ctx.campaign, [HUNTER, CHAPLAIN], { where: 'prep', picked: null })
     expect(html).toContain('chain set bonus from Chains of the Wrathful: +2 precision (2 other chain items)')
-    expect(html).toMatch(/class="delta won">\+\d+ precision/)
+    // the card's stat block is the viewer's: the Precision row carries the set's +2 in front of the engine's fielded number
+    expect(html).toMatch(/<span class="stN">Precision<\/span><span class="stV up"><em>\+\d+<\/em>\d+<\/span>/)
     expect(html).toContain('<i>spare</i>')                    // the priest chain rides in the item slot as a spare
     // the Bloodrune's cost is paid on the way on and listed as refundable
```
</details>

slice: 60 of 68 closed · 61 probed · 0 accepted
IRON GAUNTLET: NOT PASSED — 3 FLAG(S) WARNED; 1 EXEMPTION(S) TAKEN

Law 10 note (screens.equip-stats): test/equip-screen.test.ts asserted the set's +2 Precision as a `delta won` chip on the hero card; the card now carries the viewer's stat block instead (Andrew's note, 2026-09-03), so the same +2 is asserted on the Precision row of that block. The rule under test — a triggered set shows its number on the card — is unchanged.

## save.migrate — LANDED `5b7d1e0` **NEEDS REVIEW**
2026-09-03 21:20 · engine @ 685baac

  PASS  dependencies landed
  WARN  not already decided — 3 candidate ruling(s) — READ BEFORE ASKING: ../STATE.md:20 · ../STATE.md:21
  PASS  typecheck
  PASS  full test suite — 156 passed
  PASS  gate 1 — every claimed criterion holds
  PASS  brought its own tests — test/save-migrate.test.ts
  PASS  existing tests untouched
  PASS  kill switch — every claimed probe has been seen red — no criterion claimed — not applicable
  PASS  nothing regresses — every P-tier probe — 61 P-tier probe(s): 61 green, 0 red, 0 regression(s). 60 of 68 closed · 61 probed · 0 accepted
  PASS  hardcode scan — core knows mechanisms, never names
  PASS  generalizes — the second instance costs zero kingdom code — shape 'plumbing' — not a mechanism, exempt
  PASS  naming — new ids use declared kinds
  PASS  naming — no banned words invented
  WARN  engine working tree clean — verified against a DIRTY engine tree (685baac + 1 uncommitted under src/test): ?? src/sim/coverage.ts
  PASS  one door to the engine

slice: 60 of 68 closed · 61 probed · 0 accepted
IRON GAUNTLET: NOT PASSED — 2 FLAG(S) WARNED; 1 EXEMPTION(S) TAKEN

Law 10 note (screens.after-battle-copy): test/after-battle.test.ts asserted the first after-battle sketch (a results table, three "rcard" tiles, a level-up panel with data-act choices). Ruled 2026-09-03/04, those screens are Hell-TCG's copied, so the screen assertions were rewritten to the copies' DOM (the ceremony's title/party/spotlight/quote/stats, rewards.html's hero cards and face-down cards with the tier aura, levelup.html's chamber with the specialty overlay and no power overlay). The rules underneath are asserted unchanged: three offered, one kept, two burned; the codex row's every modifier applied and itemSlots folded; the specialty offered once; the fielding carries level, specialty and pick. Also in this landing: test/board-from-map.test.ts, written by the engine session in this tree after its board.variable-size landing removed WIDTH/HEIGHT from the engine — it passes on the widened door and lands with it.

## screens.after-battle-copy — LANDED `6f5c899` **NEEDS REVIEW**
2026-09-04 08:14 · engine @ 5603c40

  PASS  dependencies landed
  WARN  not already decided — 3 candidate ruling(s) — READ BEFORE ASKING: ../STATE.md:20 · ../STATE.md:21
  PASS  typecheck
  PASS  full test suite — 159 passed
  PASS  gate 1 — every claimed criterion holds
  PASS  brought its own tests — test/after-battle.test.ts, test/board-from-map.test.ts
  WARN  existing tests untouched — DELETED LINES in test/after-battle.test.ts (-30) — will land FLAGGED for review
  PASS  kill switch — every claimed probe has been seen red — no criterion claimed — not applicable
  PASS  nothing regresses — every P-tier probe — 61 P-tier probe(s): 61 green, 0 red, 0 regression(s). 40 of 68 closed · 61 probed · 1 accepted
  PASS  hardcode scan — core knows mechanisms, never names
  PASS  generalizes — the second instance costs zero kingdom code — shape 'plumbing' — not a mechanism, exempt
  PASS  naming — new ids use declared kinds
  WARN  naming — no banned words invented — 'round' — say Turn | a banned function prefix (GLOSSARY.md) — xOf/listX/canX/performX/applyX/resolveX/makeX/beginX — will land FLAGGED
  WARN  engine working tree clean — verified against a DIRTY engine tree (5603c40 + 2 uncommitted under src/test): M src/content/generated/pack.ts, ?? src/sim/coverage.ts
  PASS  one door to the engine

<details><summary>Existing tests were edited — review this diff</summary>

```diff
diff --git a/test/after-battle.test.ts b/test/after-battle.test.ts
index 5f89fc7..01c90a9 100644
--- a/test/after-battle.test.ts
+++ b/test/after-battle.test.ts
@@ -1,8 +1,11 @@
 // After the battle (G12; ISC-067 and ISC-068 are H — a person opens SLICE.html beside
-// hell-tcg/rewards.html and levelup.html). What text can hold: the results screen
-// restates the battle; the spoils are three face-down cards, revealed, one kept;
-// level-up shows and applies the codex row's modifiers, offers the specialty once
-// at the first level-up, takes the level-5 pick, chooses no power; and the fielding
-// carries the progress to the engine. GEAR-DESIGN.md §7 · hbt-content.json levels.rules.
+// hell-tcg/rewards.html and levelup.html). Rewritten 2026-09-04 for the Hell-TCG copies
+// (ruled 2026-09-03/04): the RECAP is the victory ceremony over HoBaT's outcome; the
+// REWARDS are rewards.html's cards, face down with the tier aura, over HoBaT's draw;
+// the LEVEL-UP is levelup.html's chamber with the specialty at the first level-up and
+// no power draft. What text can hold: the DOM the ceremonies run on, the outcome
+// classification, the quote pick, and the rules underneath — three cards, one kept,
+// two burned; the codex row's modifiers applied; the specialty once; the fielding
+// carrying the progress. GEAR-DESIGN.md §7 · hbt-content.json levels.rules.
 import { describe, it, expect } from 'vitest'
 import { loadFixture, toBattle, panelResult, decide } from './walk.js'
@@ -12,5 +15,7 @@ import { levelRowOf, specialtiesOf } from '../src/content/progress.js'
 import { makeBattleState, battleOptionsOf } from '../src/core/seam.js'
 import { createBattle, LEVELS } from '../src/engine.js'
-import { resultsScreen, rewardsScreen, levelUpScreen } from '../src/ui/after.js'
+import { recapScreen, rewardsScreen, levelUpScreen, outcomeOf, quoteOf } from '../src/ui/after.js'
+import { VICTORY_QUOTES, DEFEAT_QUOTES } from '../src/content/generated/quotes.js'
+import { itemOf } from '../src/content/items.js'
 import { makeCtx } from '../src/core/mutate.js'
 import { toEquip } from './walk.js'
@@ -28,26 +33,45 @@ function won() {
 
 describe('after the battle', () => {
-  it('the results screen restates the battle: outcome, turns, kills, wounds, MVP, XP per hero', () => {
+  it('the recap is the victory ceremony: the outcome title, the party row with wound states, the MVP spotlight, a quote, kills · turns · XP, the report', () => {
     const { ctx, e, result, reckoning } = won()
-    const html = resultsScreen(ctx.campaign, ctx.events, { engagementId: e.id, result, reckoning }, 0)
-    expect(html).toContain('Victory'); expect(html).toContain('in 6 turns')
-    expect(html).toContain('2 kills · dealt 9')
-    expect(html.match(/class="hcard( dead)?"/g)?.length).toBe(e.deployed.length)
-    if (reckoning.heroes.some((h) => h.mvp)) expect(html).toContain('title="MVP"')
-    expect(html).toMatch(/class="won">\+\d+</)                       // XP gained on the bar
-    expect(html).toContain('On to the spoils')
+    const html = recapScreen(ctx.campaign, ctx.events, { engagementId: e.id, result, reckoning })
+    expect(html).toContain('class="hx recap')
+    expect(html).toMatch(/class="result-title victory-(decisive|standard|costly|pyrrhic|devastating)"/)
+    expect(html.match(/class="party-member"/g)?.length).toBe(e.deployed.length)
+    expect(html).toContain('spotlight-frame victory')
+    expect(html).toMatch(/class="quote-text">"[^"]+"</)
+    expect(html).toContain('<span class="stat-label">Slain:</span> <span class="stat-value">2</span>')
+    expect(html).toContain('<span class="stat-value">6</span>')     // turns
+    expect(html).toMatch(/class="xp-value">\d+</)
+    expect(html).toContain('data-act="exit"')
+    // Hell-TCG's classification on HoBaT's wounds
+    expect(outcomeOf(true, [{ wound: 0, dead: false }], 6)).toBe('decisive')
+    expect(outcomeOf(true, [{ wound: 0, dead: false }], 20)).toBe('standard')
+    expect(outcomeOf(true, [{ wound: 1, dead: false }], 6)).toBe('costly')
+    expect(outcomeOf(true, [{ wound: 2, dead: false }], 6)).toBe('pyrrhic')
+    expect(outcomeOf(true, [{ wound: 0, dead: true }, { wound: 0, dead: false }], 6)).toBe('devastating')
+    expect(outcomeOf(false, [{ wound: 0, dead: false }], 6)).toBe('overwhelmed')
+    expect(outcomeOf(false, [{ wound: 0, dead: true }, { wound: 0, dead: false }], 6)).toBe('casualties')
+    expect(outcomeOf(false, [{ wound: 0, dead: true }], 6)).toBe('total_wipe')
+    // the quote: Hell-TCG's class pool (no personality on HoBaT heroes yet), stable for the same battle
+    const qv = quoteOf(VICTORY_QUOTES, { classes: ['class.warrior'] }, 'decisive', 'k')
+    expect(VICTORY_QUOTES.class['class.warrior']).toContain(qv)
+    expect(quoteOf(VICTORY_QUOTES, { classes: ['class.warrior'] }, 'decisive', 'k')).toBe(qv)
+    expect(quoteOf(DEFEAT_QUOTES, { classes: ['class.civilian'] }, 'overwhelmed', 'k')).toBe(DEFEAT_QUOTES.fallback)
   })
-  it('the spoils: three face-down cards, then revealed, then one kept and two burned', () => {
-    const { ctx } = won()
+  it('the rewards are rewards.html: hero cards with XP bars and floating-XP data, three face-down cards with the tier aura, a confirm; one kept and two burned', () => {
+    const { ctx, e, result, reckoning } = won()
     performExitBattle(ctx, 'test')
-    const down = rewardsScreen(ctx.campaign, ctx.events, false)
-    expect(down.match(/rcard down/g)?.length).toBe(3)
-    expect(down).not.toContain('data-act="take-reward"')
-    expect(down).toContain('data-act="reveal"')
-    const up = rewardsScreen(ctx.campaign, ctx.events, true)
-    expect(up.match(/rcard up/g)?.length).toBe(3)
-    expect(up.match(/data-act="take-reward"/g)?.length).toBe(3)
-    expect(up).toContain('class="xp"')                                // the XP bars beside the cards
-    const id = up.match(/data-act="take-reward" data-id="([^"]+)"/)![1]!
+    const html = rewardsScreen(ctx.campaign, ctx.events, { engagementId: e.id, result, reckoning })
+    expect(html).toContain('class="hx rewards')
+    expect(html.match(/class="hero-card /g)?.length).toBe(e.deployed.length)
+    expect(html).toMatch(/hero-xp-bar-fill" data-start-percent="\d+" data-end-percent="\d+"/)
+    expect(html).toMatch(/data-gained="\d+" data-kills="2"/)
+    expect(html.match(/class="reward-card face-down"/g)?.length).toBe(3)
+    for (const m of html.matchAll(/data-id="(item\.[^"]+)" data-tier="(\d)"/g)) expect(String(itemOf(m[1]!).tier)).toBe(m[2])
+    expect(html).toContain('reward-card-art">no art yet')                 // the frame stays blank until HoBaT item art exists
+    expect(html).toContain('id="rw-confirm"')
+    expect(html).not.toContain('Buy All')                                  // keep-3 was never ruled; keep-2 was rejected
+    const id = html.match(/data-id="(item\.[^"]+)" data-tier/)![1]!
     performTakeReward(ctx, id, 'test')
     expect(ctx.campaign.stash).toContain(id)
@@ -64,9 +88,13 @@ describe('after the battle', () => {
     expect(v.specialtyOffers.map((s) => s.id)).toEqual(specialtiesOf('class.warrior').map((s) => s.id))
     expect(v.specialtyOffers.length).toBe(9)
-    const html = levelUpScreen(ctx.campaign, { specialtyId: null, pick: null })
-    expect(html).toContain('L1 <span class="arrow">→</span> L2')
-    expect(html).toContain('+2 health'); expect(html).toContain('+1 itemSlots')
-    expect(html).toContain('Choose a specialty — once, now')
+    const html = levelUpScreen(ctx.campaign, DWARF, 'rewards')
+    expect(html).toContain('class="hx levelup')
+    expect(html).toContain('id="lu-badge">LEVEL 1<')                                  // flips to LEVEL 2 at the flash
+    expect(html).toContain('data-to="2"')
+    expect(html).toContain('+2 Health'); expect(html).toContain('+1 Item Slot')
+    expect(html).toContain('Choose Your Specialty')
+    expect(html.match(/data-act="choose-specialty"/g)?.length).toBe(9)
     expect(html).toContain('No power is chosen here')
+    expect(html).not.toContain('power-overlay')
     expect(whyNotLevelUp(ctx.campaign, DWARF, { specialtyId: 'specialty.assassin' })).toMatch(/not a class\.warrior specialty/)
     const slots = ctx.campaign.roster[DWARF]!.itemSlots
@@ -80,5 +108,5 @@ describe('after the battle', () => {
     expect(viewLevelUp(ctx.campaign, DWARF).needsSpecialty).toBe(false)
     expect(whyNotLevelUp(ctx.campaign, DWARF, { specialtyId: 'specialty.berserker' })).toMatch(/chosen once/)
-    expect(levelUpScreen(ctx.campaign, { specialtyId: null, pick: null })).not.toContain('Choose a specialty')
+    expect(levelUpScreen(ctx.campaign, DWARF, 'roster')).not.toContain('Choose Your Specialty')
   })
   it('the level-5 pick is one of the row\'s options by index, required when the row has one', () => {
```
</details>

slice: 40 of 68 closed · 61 probed · 1 accepted
IRON GAUNTLET: NOT PASSED — 4 FLAG(S) WARNED; 1 EXEMPTION(S) TAKEN

Note (2026-09-04): the engine's board.variable-size landing removed WIDTH/HEIGHT from the engine while screens.after-battle-copy was being gated; the first --land attempt's "nothing regresses" pass reopened twenty criteria on the broken door, all green again once src/engine.ts was widened to geometryOf; twenty re-closed by `slice-gate.mjs --close … --sha 6f5c899`. ISC-044 still waits on its re-red (see the seam.loadout note). The engine session is also writing into this tree (test/board-from-map.test.ts, 01:09) — two sessions in one working tree; its file landed with this item because it passes and the gate commits `git add -A`.

## screens.roster-cards — LANDED `d3179fc` **NEEDS REVIEW**
2026-09-04 09:57 · engine @ 2180c55

  PASS  dependencies landed
  WARN  not already decided — 3 candidate ruling(s) — READ BEFORE ASKING: ../STATE.md:20 · ../STATE.md:21
  PASS  typecheck
  PASS  full test suite — 162 passed
  PASS  gate 1 — every claimed criterion holds
  PASS  brought its own tests — test/roster-screen.test.ts
  PASS  existing tests untouched
  PASS  kill switch — every claimed probe has been seen red — no criterion claimed — not applicable
  PASS  nothing regresses — every P-tier probe — 61 P-tier probe(s): 61 green, 0 red, 0 regression(s). 58 of 68 closed · 61 probed · 1 accepted
  PASS  hardcode scan — core knows mechanisms, never names
  PASS  generalizes — the second instance costs zero kingdom code — shape 'plumbing' — not a mechanism, exempt
  PASS  naming — new ids use declared kinds
  PASS  naming — no banned words invented
  WARN  engine working tree clean — verified against a DIRTY engine tree (2180c55 + 2 uncommitted under src/test): M src/content/generated/pack.ts, ?? src/sim/coverage.ts
  PASS  one door to the engine

slice: 58 of 68 closed · 61 probed · 1 accepted
IRON GAUNTLET: NOT PASSED — 2 FLAG(S) WARNED; 1 EXEMPTION(S) TAKEN

## screens.equip-standalone — LANDED `86b2631` **NEEDS REVIEW**
2026-09-04 20:00 · engine @ 93f28b1

  PASS  dependencies landed
  WARN  not already decided — 5 candidate ruling(s) — READ BEFORE ASKING: ../STATE.md:20 · ../STATE.md:21
  PASS  typecheck
  PASS  full test suite — 166 passed
  PASS  gate 1 — every claimed criterion holds
  PASS  brought its own tests — test/equip-page.test.ts
  PASS  existing tests untouched
  PASS  kill switch — every claimed probe has been seen red — no criterion claimed — not applicable
  PASS  nothing regresses — every P-tier probe — 61 P-tier probe(s): 61 green, 0 red, 0 regression(s). 58 of 68 closed · 61 probed · 1 accepted
  PASS  hardcode scan — core knows mechanisms, never names
  PASS  generalizes — the second instance costs zero kingdom code — shape 'plumbing' — not a mechanism, exempt
  PASS  naming — new ids use declared kinds
  PASS  naming — no banned words invented
  WARN  engine working tree clean — verified against a DIRTY engine tree (93f28b1 + 2 uncommitted under src/test): M src/content/generated/pack.ts, ?? src/sim/coverage.ts
  PASS  one door to the engine

slice: 58 of 68 closed · 61 probed · 1 accepted
IRON GAUNTLET: NOT PASSED — 2 FLAG(S) WARNED; 1 EXEMPTION(S) TAKEN

Law 10 note (2026-09-04, no landing — a repair): the engine's `refactor.one-action-type` (17b2753, ruled by Angela that day) collapsed a Unit's `attacks`, `abilities` and `moves` into ONE `actions` list, which turned test/isc-064.test.ts red on `hunter.attacks` being undefined. The assertion was re-pointed at `actions`, not weakened: what it holds is unchanged — the fielded hero carries the granted attack ids of the item that was actually handed over, and not the other item's. Found by running the suite while writing HANDOFF-2026-09-04.md; the third time in two days that an engine landing moved the door mid-session (see §5 of that handoff).

Re-red (2026-09-04, no landing — bookkeeping owed by HANDOFF-2026-09-04 §2 "Mine to tidy"):
ISC-017, ISC-033 and ISC-044 all PASSED but read OPEN, because each carried a `regressed`
entry dated after its `closed` (the 2026-09-04 `colOf is not a function` door break for 017
and 033, the 2026-09-03 two-hands refusal for 044) and `--close` refused to re-close them:
each probe had been edited after its original red, so `red.hash` no longer matched the
probe file. Seen red again at HEAD 6b8ccb5, each against the tree WITHOUT the feature that
closed it, then restored and re-closed:

  · ISC-017 · ISC-033 — `src/core/reckoning.ts` overwritten from `123a501^` (the parent of
    reckoning.apply, where the file exists but exports neither `applyBattleResult` nor
    `performExitBattle`). Both went red on an ASSERTION, not an import: 017 at the Salvage
    line, 033 at `cursor.step === 'reckoning'`.
  · ISC-044 — `src/sim/autoplay.ts` overwritten from `e78a8bd^` (the parent of
    opening.prologue, before `playOpening`); `src/core/opening.ts` and
    `src/content/prologue.ts` emptied, both being absent at that sha. Red at
    `playOpening(makeCtx(makeNewCampaign(21)))`.

No assertion was touched and no probe file was opened — the three probe hashes are
unchanged (2314213accfa · bed421352563 · 8719b22da823), which is what let `--close` take
them. `git stash` still does not work on this mount (unlink is refused; a shim on PATH
moves `.git/*.lock` aside per HANDOFF-2026-09-03 §7), so every revert and restore was
`git show <sha>:<file> > <file>`; `git diff HEAD -- src test` is empty afterwards.
Typecheck clean, 68 files / 166 tests pass. Count 58 → **61 of 68 closed · 61 probed ·
1 accepted**. What remains open is H-tier only: 030, 048, 049 for Angela's eye, with
066, 067, 068 landed and awaiting `--accept`, and 050 accepted.

## v2.week-spine — LANDED `648d957` **NEEDS REVIEW**
2026-09-11 07:52 · engine @ f1b1ca2

  PASS  dependencies landed
  WARN  not already decided — 2 candidate ruling(s) — READ BEFORE ASKING: ..\STATE.md:21 · ..\KINGDOM-DESIGN.md:115
  PASS  typecheck
  PASS  full test suite — 182 passed
  PASS  gate 1 — every claimed criterion holds — ISC-005 holds · ISC-006 holds · ISC-007 holds · ISC-008 holds · ISC-009 holds · ISC-010 holds · ISC-036 holds · ISC-046 holds · ISC-047 holds
  PASS  brought its own tests — test/isc-004.test.ts, test/isc-005.test.ts, test/isc-006.test.ts, test/isc-007.test.ts, test/isc-008.test.ts, test/isc-009.test.ts, test/isc-010.test.ts, test/isc-012.test.ts, test/isc-035.test.ts, test/isc-036.test.ts, test/isc-037.test.ts, test/isc-038.test.ts, test/isc-040.test.ts, test/isc-041.test.ts, test/isc-046.test.ts, test/isc-047.test.ts, test/isc-052.test.ts, test/isc-056.test.ts, test/isc-057.test.ts, test/isc-058.test.ts, test/isc-059.test.ts, test/isc-060.test.ts, test/loadgame.test.ts, test/save-migrate.test.ts, test/source-mentions.test.ts, test/v2-week.test.ts
  WARN  existing tests untouched — DELETED LINES in test/isc-004.test.ts (-1), test/isc-005.test.ts (-20), test/isc-006.test.ts (-1), test/isc-007.test.ts (-3), test/isc-008.test.ts (-9), test/isc-009.test.ts (-3), test/isc-010.test.ts (-2), test/isc-012.test.ts (-1), test/isc-035.test.ts (-1), test/isc-036.test.ts (-15), test/isc-037.test.ts (-4), test/isc-038.test.ts (-2), test/isc-040.test.ts (-3), test/isc-041.test.ts (-4), test/isc-046.test.ts (-48), test/isc-047.test.ts (-7), test/isc-052.test.ts (-1), test/isc-056.test.ts (-1), test/isc-057.test.ts (-3), test/isc-058.test.ts (-1), test/isc-059.test.ts (-1), test/isc-060.test.ts (-2), test/loadgame.test.ts (-1), test/save-migrate.test.ts (-11) — will land FLAGGED for review
  PASS  kill switch — every claimed probe has been seen red — ISC-005: red on record (2026-09-11 07:48 @ e208302) and re-proven — fails without stage.field · ISC-006: red on record (2026-09-11 07:48 @ e208302, probe c32d9791f5b7) · ISC-007: red on record (2026-09-11 07:48 @ e208302, probe 8e4ef5a21a9a) · ISC-008: red on record (2026-09-11 07:48 @ e208302, probe 5b951d1f4862) · ISC-009: red on record (2026-09-11 07:48 @ e208302, probe 36cc0c2b86b0) · ISC-010: red on record (2026-09-11 07:48 @ e208302, probe 6e78e92d7841) · ISC-036: red on record (2026-09-11 07:48 @ e208302, probe 02b048959922) · ISC-046: red on record (2026-09-11 07:48 @ e208302, probe 95288f9049a0) · ISC-047: red on record (2026-09-11 07:48 @ e208302, probe ff1728f75f32)
  PASS  nothing regresses — every P-tier probe — 61 P-tier probe(s): 61 green, 0 red, 0 regression(s). 61 of 68 closed · 61 probed · 1 accepted
  PASS  hardcode scan — core knows mechanisms, never names
  PASS  generalizes — the second instance costs zero kingdom code — stage.field live · stage.city live
  PASS  naming — new ids use declared kinds
  PASS  naming — no banned words invented
  WARN  engine working tree clean — verified against a DIRTY engine tree (f1b1ca2 + 5 uncommitted under src/test): M src/core/encounter.ts, M src/core/setup.ts, M src/core/snapshot.ts
  PASS  one door to the engine

<details><summary>Existing tests were edited — review this diff</summary>

```diff
diff --git a/test/isc-004.test.ts b/test/isc-004.test.ts
index 6679ab6..1461c93 100644
--- a/test/isc-004.test.ts
+++ b/test/isc-004.test.ts
@@ -19,5 +19,5 @@ function fresh() {
   return makeCampaign(7, {
     realm: 'realm.ruined-kingdom',
-    stage: 'stage.buy',
+    stage: 'stage.city',
     currencies: CURRENCIES.map((c) => c.id),
     cups: ['cup.threat', 'cup.battle'],
diff --git a/test/isc-005.test.ts b/test/isc-005.test.ts
index edf91c6..8d2baef 100644
--- a/test/isc-005.test.ts
+++ b/test/isc-005.test.ts
@@ -1,30 +1,26 @@
-// ISC-005 — a Week advances through all six Stages in the ruled order —
-// stage.buy → stage.quest → stage.defend → stage.conquer → stage.build →
-// stage.mend — and the order is read from the Stage rows, not the code.
-// KINGDOM-DESIGN.md §3 · GLOSSARY.md
+// ISC-005, superseded by KINGDOM-V2-2026-09-07: two halves, ordered Field activities.
 import { describe, it, expect } from 'vitest'
 import { loadFixture } from './walk.js'
-import { beginWeek, performAdvance, stageOf } from '../src/core/week.js'
+import { beginWeek, performAdvance } from '../src/core/week.js'
 import { setCursor } from '../src/core/mutate.js'
+import { STAGES } from '../src/content/stages.js'
 
-// The RULED order, written here from the design document — not read from the
-// registry, so a registry missing a row (KINGDOM_DISABLE_IDS=stage.mend) fails this.
-const RULED = ['stage.buy', 'stage.quest', 'stage.defend', 'stage.conquer', 'stage.build', 'stage.mend']
-
-describe('ISC-005 — six Stages, the ruled order', () => {
-  it('a Week visits the six ids in order and then the next Week begins at the first', () => {
+describe('ISC-005 — Field then unordered City', () => {
+  it('visits Conquest, Defense, due quests, City and the next Week exactly once', () => {
+    expect(STAGES.map((s) => s.id)).toEqual(['stage.field', 'stage.city'])
     const ctx = loadFixture()
-    setCursor(ctx, { step: 'open', prepStep: null, engagement: null, battle: null }, 'test')
     beginWeek(ctx, 'test')
     const week = ctx.campaign.week
-    const visited: string[] = [stageOf(ctx.campaign).id]
-    for (let i = 0; i < 5; i++) { performAdvance(ctx, 'test'); visited.push(stageOf(ctx.campaign).id) }
-    expect(visited).toEqual(RULED)
-    expect(ctx.campaign.week).toBe(week)
-    performAdvance(ctx, 'test')
+    const visited: string[] = []
+    for (let i = 0; i < 4; i++) {
+      visited.push(`${ctx.campaign.cursor.stage}/${ctx.campaign.cursor.fieldStep}`)
+      setCursor(ctx, { attack: null }, 'no attack in this flow probe')
+      performAdvance(ctx, 'test')
+    }
+    expect(visited).toEqual(['stage.field/conquest', 'stage.field/defense', 'stage.field/quests', 'stage.city/null'])
     expect(ctx.campaign.week).toBe(week + 1)
-    expect(stageOf(ctx.campaign).id).toBe(RULED[0])
-    const begun = ctx.events.filter((e) => e.type === 'stage.begun').map((e) => e['stageId'])
-    expect(begun).toEqual([...RULED, RULED[0]])
+    expect(ctx.campaign.cursor).toMatchObject({ stage: 'stage.field', fieldStep: 'conquest' })
+    expect(ctx.events.filter((e) => e.type === 'stage.begun').map((e) => e['stageId'])).toEqual(['stage.field', 'stage.city', 'stage.field'])
+    expect(ctx.events.filter((e) => e.type === 'stage.ended').map((e) => e['stageId'])).toEqual(['stage.field', 'stage.city'])
   })
 })
diff --git a/test/isc-006.test.ts b/test/isc-006.test.ts
index 843559b..5ace830 100644
--- a/test/isc-006.test.ts
+++ b/test/isc-006.test.ts
@@ -21,5 +21,5 @@ describe('ISC-006 — a Stage that resolves to nothing still begins and ends', (
     expect(begun).toEqual(STAGES.map((s) => s.id))
     expect(ended).toEqual(STAGES.map((s) => s.id))
-    expect(STAGES.length).toBe(6)
+    expect(STAGES.length).toBe(2)
     // and nothing else happened — no engagement, no writer
     expect(inWeek.some((e) => e.type === 'engagement.offered' || e.type === 'engagement.resolved')).toBe(false)
diff --git a/test/isc-007.test.ts b/test/isc-007.test.ts
index b89630b..9ac532c 100644
--- a/test/isc-007.test.ts
+++ b/test/isc-007.test.ts
@@ -17,9 +17,9 @@ describe('ISC-007 — the cursor round-trips at every position, and the reload c
     beginWeek(base, 'test')
     const positions: string[] = []
-    for (let stage = 0; stage < 6; stage++) {
+    for (let stage = 0; stage < 4; stage++) {
       // fork: the original continues; the copy is a reload of the save at this position
       const copy = makeCtx(campaignOf(saveOf(base.campaign)))
       expect(copy.campaign).toEqual(base.campaign)
-      positions.push(`${base.campaign.cursor.stage}/${base.campaign.cursor.step}`)
+      positions.push(`${base.campaign.cursor.stage}/${base.campaign.cursor.fieldStep}/${base.campaign.cursor.step}`)
       const fromA = base.events.length, fromB = copy.events.length
       playStage(base, DEFAULTS, 'test')
@@ -28,5 +28,6 @@ describe('ISC-007 — the cursor round-trips at every position, and the reload c
       expect(shapeOf(copy.events, fromB), positions.at(-1)).toEqual(shapeOf(base.events, fromA))
     }
-    expect(positions.length).toBe(6)
+    expect(positions).toEqual(['stage.field/conquest/open', 'stage.field/defense/open', 'stage.field/quests/open', 'stage.city/null/open'])
+    expect(base.campaign.week).toBe(4)
     expect(base.events.some((e) => e.type === 'engagement.resolved')).toBe(true)   // the Week had a battle in it
   })
diff --git a/test/isc-008.test.ts b/test/isc-008.test.ts
index cf34eb4..597a48c 100644
--- a/test/isc-008.test.ts
+++ b/test/isc-008.test.ts
@@ -1,2 +1,3 @@
+// V2 supersedes the old dual-slot truth; release and multiweek countdown checks retained.
 // ISC-008 — a hero holds at most one field Assignment and one city Assignment
 // in a Week; a second in either slot is refused by canCommit.
@@ -9,31 +10,36 @@ import { setCursor } from '../src/core/mutate.js'
 const H = 'hero.base.paladin-shiney'
 
-describe('ISC-008 — two slots, one Assignment each', () => {
-  it('field and city each take one; a second in the same slot is refused; releasing reopens it', () => {
+describe('ISC-008 — one Assignment across both halves', () => {
+  it('Field and City compete for one commitment; releasing an unperformed reservation reopens it', () => {
     const ctx = loadFixture()
     setCursor(ctx, { step: 'open', prepStep: null, engagement: null, battle: null }, 'test')
     const field = { kind: 'engagement' as const, target: 'engagement.conquer.ridge.week-3', weeks: 1 }
-    const city = { kind: 'labour' as const, target: 'farm', weeks: 1 }
+    const city = { kind: 'labour' as const, target: 'pray', weeks: 1 }
     expect(canCommit(ctx.campaign, H, field)).toBe(true)
     performCommit(ctx, H, field, 'test')
     expect(commitmentOf(ctx.campaign, H, 'field')).toBe('committed')
-    expect(commitmentOf(ctx.campaign, H, 'city')).toBe('free')                  // fight AND one city action
+    expect(commitmentOf(ctx.campaign, H, 'city')).toBe('committed')             // V2: one weekly commitment
     expect(canCommit(ctx.campaign, H, { ...field, target: 'engagement.conquer.thicket.week-3' })).toBe(false)
     expect(() => performCommit(ctx, H, field, 'test')).toThrow(/refused/)
+    expect(canCommit(ctx.campaign, H, city)).toBe(false)
+    expect(() => performCommit(ctx, H, city, 'test')).toThrow(/refused/)
+    performRelease(ctx, H, 'field', 'test')
     performCommit(ctx, H, city, 'test')
     expect(commitmentOf(ctx.campaign, H, 'city')).toBe('committed')
     expect(canCommit(ctx.campaign, H, { ...city, target: 'pray' })).toBe(false)
-    expect(ctx.campaign.assignments[H]).toEqual({ field, city })
+    expect(ctx.campaign.assignments[H]).toEqual(city)
     performRelease(ctx, H, 'city', 'test')
     expect(commitmentOf(ctx.campaign, H, 'city')).toBe('free')
     expect(ctx.events.filter((e) => e.type === 'hero.committed').length).toBe(2)
-    expect(ctx.events.filter((e) => e.type === 'hero.released').length).toBe(1)
+    expect(ctx.events.filter((e) => e.type === 'hero.released').length).toBe(2)
   })
   it('the Week boundary releases what has run out and counts down what has not', () => {
     const ctx = loadFixture()
-    performCommit(ctx, H, { kind: 'engagement', target: 'x', weeks: 1 }, 'test')
-    performCommit(ctx, H, { kind: 'labour', target: 'farm', weeks: 3 }, 'test')
+    const other = 'hero.base.warrior-iron'
+    performCommit(ctx, other, { kind: 'engagement', target: 'x', weeks: 1 }, 'test')
+    performCommit(ctx, H, { kind: 'labour', target: 'pray', weeks: 3 }, 'test')
     tickAssignments(ctx, 'test')
-    expect(ctx.campaign.assignments[H]).toEqual({ city: { kind: 'labour', target: 'farm', weeks: 2 } })
+    expect(ctx.campaign.assignments[H]).toEqual({ kind: 'labour', target: 'pray', weeks: 2 })
+    expect(ctx.campaign.assignments[other]).toBeUndefined()
     tickAssignments(ctx, 'test'); tickAssignments(ctx, 'test')
     expect(ctx.campaign.assignments[H]).toBeUndefined()
diff --git a/test/isc-009.test.ts b/test/isc-009.test.ts
index 7eef5a5..d115794 100644
--- a/test/isc-009.test.ts
+++ b/test/isc-009.test.ts
@@ -1,2 +1,3 @@
+// V2: quest resolution owns release; ISC047 covers the actual return and payout.
 // ISC-009 — a hero on a quest holds both slots and appears in no listAvailable
 // for any Stage.
@@ -10,5 +11,5 @@ const H = 'hero.base.ranger-aggressive'
 
 describe('ISC-009 — a quest takes both slots', () => {
-  it('on a quest: both slots answer onQuest, no Stage lists the hero, nothing else may be committed, and the quest ends when its Weeks do', () => {
+  it('on a quest: both slots answer onQuest, no Stage lists the hero, nothing else may be committed, and assignment ticks never release it before due Field resolution', () => {
     const ctx = loadFixture()
     performCommit(ctx, H, { kind: 'quest', target: 'quest.escort', weeks: 2 }, 'test')
@@ -22,6 +23,6 @@ describe('ISC-009 — a quest takes both slots', () => {
     expect(commitmentOf(ctx.campaign, H, 'field')).toBe('onQuest')
     tickAssignments(ctx, 'test')
-    expect(commitmentOf(ctx.campaign, H, 'field')).toBe('free')
-    expect(commitmentOf(ctx.campaign, H, 'city')).toBe('free')
+    expect(commitmentOf(ctx.campaign, H, 'field')).toBe('onQuest')
+    expect(commitmentOf(ctx.campaign, H, 'city')).toBe('onQuest')
   })
 })
diff --git a/test/isc-010.test.ts b/test/isc-010.test.ts
index 14436f1..438165b 100644
--- a/test/isc-010.test.ts
+++ b/test/isc-010.test.ts
@@ -15,6 +15,6 @@ describe('ISC-010 — unavailable is a third value, answered in one place', () =
     expect(commitmentOf(ctx.campaign, H, 'field')).toBe('unavailable')
     expect(commitmentOf(ctx.campaign, H, 'city')).toBe('unavailable')
-    expect(listAvailable(ctx.campaign, 'stage.conquer')).not.toContain(H)
-    expect(listAvailable(ctx.campaign, 'stage.mend')).not.toContain(H)
+    expect(listAvailable(ctx.campaign, 'stage.field')).not.toContain(H)
+    expect(listAvailable(ctx.campaign, 'stage.city')).not.toContain(H)
     expect(canCommit(ctx.campaign, H, { kind: 'labour', target: 'farm', weeks: 1 })).toBe(false)
     beginCombatPrep(ctx, 'test'); performAdvancePrep(ctx, 'test'); performAdvancePrep(ctx, 'test')
@@ -28,4 +28,24 @@ describe('ISC-010 — unavailable is a third value, answered in one place', () =
     expect(commitmentOf(ctx.campaign, H, 'field')).toBe('dead')
   })
+  it('Exhausted permits recovery only; fighting, quest, absence and capture remain independent restrictions', () => {
+    const c = loadFixture().campaign
+    const rest = { kind: 'rest' as const, target: 'rest', weeks: 1 }
+    c.roster[H]!.badges = ['badge.exhausted']
+    expect(commitmentOf(c, H, 'field')).toBe('exhausted')
+    expect(canCommit(c, H, rest)).toBe(true)
+    expect(canCommit(c, H, { kind: 'labour', target: 'pray', weeks: 1 })).toBe(false)
+    c.foughtThisWeek = [H]
+    expect(canCommit(c, H, rest)).toBe(false)
+    c.foughtThisWeek = []
+    c.assignments[H] = { kind: 'quest', target: 'quest.escort', weeks: 1 }
+    expect(canCommit(c, H, rest)).toBe(false)
+    delete c.assignments[H]
+    c.unavailable = [{ heroId: H, story: 'Went missing', returnWeek: c.week + 1 }]
+    expect(canCommit(c, H, rest)).toBe(false)
+    c.unavailable = []; c.captured = [H]
+    expect(canCommit(c, H, rest)).toBe(false)
+    c.captured = []; c.roster[H]!.wound = 3
+    expect(canCommit(c, H, { kind: 'heal', target: 'heal', weeks: 1 })).toBe(true)
+  })
   it('no other file in src/core has an opinion about availability (a static scan)', () => {
     const out = execSync('node tools/scan.mjs one-availability', { encoding: 'utf8' })
diff --git a/test/isc-012.test.ts b/test/isc-012.test.ts
index f354848..1afec84 100644
--- a/test/isc-012.test.ts
+++ b/test/isc-012.test.ts
@@ -31,5 +31,5 @@ describe('ISC-012 — a won Conquer claims the Territory and its building', () =
     expect(claim['buildings']).toContain('building.forge')
     expect(claim['first']).toBe(true)
-    expect(STAGES.find((s) => s.id === ctx.campaign.cursor.stage)?.targets).toBe('conquerable')   // back at the Stage, open
+    expect(stageOf(ctx.campaign).targets).toBe('conquerable')   // back at the Stage, open
     expect(ctx.campaign.cursor.step).toBe('open')
   })
diff --git a/test/isc-035.test.ts b/test/isc-035.test.ts
index a68f249..5510d1c 100644
--- a/test/isc-035.test.ts
+++ b/test/isc-035.test.ts
@@ -1,3 +1,3 @@
-// ISC-035 — stage.defend rolls once per Week on cup.threat, at 6% per owned
+// ISC-035 — stage.field rolls once per Week on cup.threat, at 6% per owned
 // Territory, and produces at most one engagement.defend; over 200 Weeks with
 // four Territories owned the rate lands within 24% ± 6.
diff --git a/test/isc-036.test.ts b/test/isc-036.test.ts
index 29025ef..59a5d79 100644
--- a/test/isc-036.test.ts
+++ b/test/isc-036.test.ts
@@ -1,4 +1,5 @@
+// V2 supersedes Farm/Delve/Gather and independent City slot; prayer tuning and wound tier changes are following stages.
 // ISC-036 — a hero assigned to Farm yields 5 + 2×Fields Supplies, to Pray 4 +
-// 1×Abbeys Faith, to Delve 4 + 1×Wellsprings Mana, each at stage.mend and each
+// 1×Abbeys Faith, to Delve 4 + 1×Wellsprings Mana, each at stage.city and each
 // consuming the city slot; Heal and Rest yield nothing.
 // 7-KINGDOM-SETTLED.md — The Mend labours · Law 17 amended
@@ -15,43 +16,45 @@ function atMend(edit?: Parameters<typeof loadFixture>[0]) {
   const ctx = loadFixture(edit)
   setCursor(ctx, { step: 'open', prepStep: null, engagement: null, battle: null }, 'test')
-  beginStage(ctx, 'stage.mend', 'test')
+  beginStage(ctx, 'stage.city', 'test')
   return ctx
 }
 
-describe('ISC-036 — the four labours yield what the settled table says', () => {
-  it('one Field held: Farm 7, Pray 4, Delve 4; two Fields: Farm 9; the city slot is taken; Heal and Rest pay nothing', () => {
+describe('ISC-036 — V2 chapel work replaces the four labours', () => {
+  it('Prayer pays Faith at City close; removed labours cannot provide Supplies or Mana; recovery pays nothing', () => {
     const ctx = atMend()
     expect(nodeCountOf(ctx.campaign, 'field')).toBe(1)
-    expect(yieldOf(ctx.campaign, 'farm')).toEqual({ currency: 'currency.supplies', amount: 5 + 2 * 1 })
+    expect(canAssignLabour(ctx.campaign, H[0], 'farm')).toBe(false)
+    expect(() => yieldOf(ctx.campaign, 'farm')).toThrow(/unknown labour/)
     expect(yieldOf(ctx.campaign, 'pray')).toEqual({ currency: 'currency.faith', amount: 4 + 1 * 0 })
-    expect(yieldOf(ctx.campaign, 'delve')).toEqual({ currency: 'currency.mana', amount: 4 + 1 * 0 })
+    expect(canAssignLabour(ctx.campaign, H[2], 'delve')).toBe(false)
+    expect(canAssignLabour(ctx.campaign, H[2], 'gather')).toBe(false)
     expect(yieldOf(ctx.campaign, 'rest')).toBeNull()
     expect(yieldOf(ctx.campaign, 'heal')).toBeNull()
     const purse = { ...ctx.campaign.purse }
-    performAssignLabour(ctx, H[0], 'farm', 'test')
+    performAssignLabour(ctx, H[0], 'pray', 'test')
     performAssignLabour(ctx, H[1], 'pray', 'test')
-    performAssignLabour(ctx, H[2], 'delve', 'test')
+    performAssignLabour(ctx, H[2], 'rest', 'test')
     performAssignLabour(ctx, H[3], 'rest', 'test')
     expect(commitmentOf(ctx.campaign, H[0], 'city')).toBe('committed')
-    expect(commitmentOf(ctx.campaign, H[0], 'field')).toBe('free')             // fight AND one city action
+    expect(commitmentOf(ctx.campaign, H[0], 'field')).toBe('committed')        // V2: City work excludes fighting
     expect(canAssignLabour(ctx.campaign, H[0], 'pray')).toBe(false)             // one city slot
     expect(canAssignLabour(ctx.campaign, H[4], 'heal')).toBe(false)             // whole — nothing to heal
     expect(ctx.campaign.purse).toEqual(purse)                                   // nothing paid until the Stage ends
     performAdvance(ctx, 'test')                                                 // Mend closes → the Week ends
-    expect(ctx.campaign.purse['currency.supplies']).toBe(purse['currency.supplies']! + 7)
-    expect(ctx.campaign.purse['currency.faith']).toBe(purse['currency.faith']! + 4)
-    expect(ctx.campaign.purse['currency.mana']).toBe(purse['currency.mana']! + 4)
+    expect(ctx.campaign.purse['currency.supplies']).toBe(purse['currency.supplies'])
+    expect(ctx.campaign.purse['currency.faith']).toBe(purse['currency.faith']! + 8)
+    expect(ctx.campaign.purse['currency.mana']).toBe(purse['currency.mana'])
     expect(ctx.campaign.purse['currency.salvage']).toBe(purse['currency.salvage'])
     const gains = ctx.events.filter((e) => e.type === 'resource.gained')
     // heroes resolve in id order (Law 6), not assignment order
     // (the ids changed 2026-09-02 with the alpha four gone; the rule — id order — did not: paladin < ranger < warrior)
-    expect(gains.map((e) => e.causeId)).toEqual([`stage.mend.week-3:pray:${H[1]}`, `stage.mend.week-3:delve:${H[2]}`, `stage.mend.week-3:farm:${H[0]}`])
+    expect(gains.map((e) => e.causeId)).toEqual([`stage.city.week-3:pray:${H[1]}`, `stage.city.week-3:pray:${H[0]}`])
     expect(commitmentOf(ctx.campaign, H[0], 'city')).toBe('free')             // released at the Week boundary
   })
   it('a second Field and an Abbey held raise the yields by the node', () => {
     const ctx = atMend((c) => { for (const t of Object.values(c.territories)) { t.owned = true } ; c.territories['territory.ruined-kingdom.thicket']!.node = 'field' })
-    expect(yieldOf(ctx.campaign, 'farm')!.amount).toBe(5 + 2 * 2)
+    expect(() => yieldOf(ctx.campaign, 'farm')).toThrow(/unknown labour/)
     expect(yieldOf(ctx.campaign, 'pray')!.amount).toBe(4 + 1 * 1)
-    expect(yieldOf(ctx.campaign, 'delve')!.amount).toBe(4 + 1 * 0)
+    expect(() => yieldOf(ctx.campaign, 'delve')).toThrow(/unknown labour/)
   })
   it('Heal at Mend lowers a wound one level and pays nothing', () => {
diff --git a/test/isc-037.test.ts b/test/isc-037.test.ts
index 36e178d..37cda19 100644
--- a/test/isc-037.test.ts
+++ b/test/isc-037.test.ts
@@ -1,3 +1,3 @@
-// ISC-037 — at stage.buy, performRecruit spends Faith from the purse and adds
+// ISC-037 — at stage.city, performRecruit spends Faith from the purse and adds
 // one hero row to the roster; canRecruit is false when Faith is short.
 // 7-KINGDOM-SETTLED.md — Currencies (Faith buys recruits) · KINGDOM-DESIGN.md §10 (the Beacon), §3 (one a Week)
@@ -12,5 +12,5 @@ function atBuy(edit?: Parameters<typeof loadFixture>[0]) {
   const ctx = loadFixture(edit)
   setCursor(ctx, { step: 'open', prepStep: null, engagement: null, battle: null }, 'test')
-  beginWeek(ctx, 'test')
+  beginStage(ctx, 'stage.city', 'test')
   return ctx
 }
@@ -49,8 +49,8 @@ describe('ISC-037 — recruiting costs Faith and adds a hero', () => {
     const ctx = atBuy((c) => { c.purse['currency.faith'] = 100; delete c.roster['hero.fixed.orphans']; delete c.roster['hero.base.priest-scantily'] })
     performRecruit(ctx, listRecruitOffers(ctx.campaign)[0]!.id, 'test')
-    for (let i = 0; i < 6; i++) performAdvance(ctx, 'test')
+    for (let i = 0; i < 4; i++) performAdvance(ctx, 'test')
     expect(ctx.campaign.week).toBe(4)
     expect(canRecruit(ctx.campaign, listRecruitOffers(ctx.campaign)[0]!.id)).toBe(true)
-    beginStage(ctx, 'stage.build', 'test')
+    beginStage(ctx, 'stage.field', 'test')
     expect(canRecruit(ctx.campaign, listRecruitOffers(ctx.campaign)[0]!.id)).toBe(false)
   })
diff --git a/test/isc-038.test.ts b/test/isc-038.test.ts
index 286a01d..d36d250 100644
--- a/test/isc-038.test.ts
+++ b/test/isc-038.test.ts
@@ -5,5 +5,5 @@ import { describe, it, expect } from 'vitest'
 import { loadFixture } from './walk.js'
 import { setCursor } from '../src/core/mutate.js'
-import { beginWeek } from '../src/core/week.js'
+import { beginStage } from '../src/core/week.js'
 import { canHeal, performHeal, costOfHeal } from '../src/core/market.js'
 import { commitmentOf } from '../src/core/assignments.js'
@@ -16,5 +16,5 @@ describe('ISC-038 — Field Surgery', () => {
     const ctx = loadFixture((c) => { c.roster[H]!.wound = 3; c.purse['currency.faith'] = SWITCHES.healFaith * 2 + 1 })
     setCursor(ctx, { step: 'open', prepStep: null, engagement: null, battle: null }, 'test')
-    beginWeek(ctx, 'test')
+    beginStage(ctx, 'stage.city', 'test')
     expect(commitmentOf(ctx.campaign, H, 'field')).toBe('wounded')
     expect(costOfHeal()).toEqual({ 'currency.faith': SWITCHES.healFaith })
diff --git a/test/isc-040.test.ts b/test/isc-040.test.ts
index 9ceacc6..5083bac 100644
--- a/test/isc-040.test.ts
+++ b/test/isc-040.test.ts
@@ -1,3 +1,3 @@
-// ISC-040 — at stage.build, performBuild spends the node's Salvage price and
+// ISC-040 — at stage.city, performBuild spends the node's Salvage price and
 // marks the node built; a node whose parents are unbuilt, or whose price the
 // purse cannot meet, is refused; the tree's nodes and prices are rows.
@@ -15,5 +15,5 @@ function atBuild(salvage: number, own = true) {
   const ctx = loadFixture((c) => { c.purse['currency.salvage'] = salvage; if (own) { c.territories[RIDGE]!.owned = true; c.territories[RIDGE]!.claimedOnce = true } })
   setCursor(ctx, { step: 'open', prepStep: null, engagement: null, battle: null }, 'test')
-  beginStage(ctx, 'stage.build', 'test')
+  beginStage(ctx, 'stage.city', 'test')
   return ctx
 }
@@ -52,5 +52,5 @@ describe('ISC-040 — Salvage buys a Forge node from the settled tree', () => {
     expect(whyNotBuild(unheld.campaign, RIDGE, FORGE, 'repair')).toBe('the Territory is not held')
     const ctx = atBuild(100)
-    beginStage(ctx, 'stage.buy', 'test')
+    beginStage(ctx, 'stage.field', 'test')
     expect(whyNotBuild(ctx.campaign, RIDGE, FORGE, 'repair')).toBe('not the Build Stage')
   })
diff --git a/test/isc-041.test.ts b/test/isc-041.test.ts
index ac47703..e5f976f 100644
--- a/test/isc-041.test.ts
+++ b/test/isc-041.test.ts
@@ -24,13 +24,12 @@ describe('ISC-041 — the shelf, and the equip step', () => {
     const ctx = loadFixture((c) => { c.purse['currency.salvage'] = 10; c.purse['currency.supplies'] = SWITCHES.shopSuppliesMax * 2; c.territories[RIDGE]!.owned = true; c.territories[RIDGE]!.claimedOnce = true })
     setCursor(ctx, { step: 'open', prepStep: null, engagement: null, battle: null }, 'test')
-    beginWeek(ctx, 'test')                                                   // Buy
+    beginStage(ctx, 'stage.city', 'test')                                                   // Buy
     expect(isShopOpen(ctx.campaign)).toBe(false)
     expect(listShopItems(ctx.campaign)).toEqual([])
     expect(() => performBuyItem(ctx, 'item.longsword', 'test')).toThrow(/not repaired/)
-    beginStage(ctx, 'stage.build', 'test')
+    beginStage(ctx, 'stage.city', 'test')
     performBuild(ctx, RIDGE, FORGE, 'repair', 'test')
     expect(isShopOpen(ctx.campaign)).toBe(true)
-    expect(canBuyItem(ctx.campaign, 'item.longsword')).toBe(false)             // not the Buy Stage
-    beginStage(ctx, 'stage.buy', 'test')
+    // V2: repair and buy in the same City half, without a stage transition.
     const shelf = listShopItems(ctx.campaign)
     expect(shelf.length).toBe(2)                                                // Repaired sells two
diff --git a/test/isc-046.test.ts b/test/isc-046.test.ts
index 1021397..60052ba 100644
--- a/test/isc-046.test.ts
+++ b/test/isc-046.test.ts
@@ -1,58 +1,85 @@
-// ISC-046 — between Buy and Quest, a roll on cup.unavailability keeps some
-// heroes home for the Week, each with a story, and commitmentOf says so.
-// KINGDOM-DESIGN.md §3 · SKELETON-SETTLED.md:119-122
+// ISC046: V2 participant-only, per-battle pulls replace the whole-roster weekly roll.
 import { describe, it, expect } from 'vitest'
-import { loadFixture } from './walk.js'
-import { performAdvance, tickWeek } from '../src/core/week.js'
-import { commitmentOf, listAvailable } from '../src/core/assignments.js'
-import { absencesFor, ABSENCES } from '../src/content/absences.js'
-import type { CampaignState } from '../src/core/campaign.js'
+import { loadFixture, toBattle, panelResult, decide } from './walk.js'
+import { resolveAbsences, absenceWeightOf, performRollAbsences } from '../src/core/absence.js'
+import { applyBattleResult } from '../src/core/reckoning.js'
+import { commitmentOf, canCommit } from '../src/core/assignments.js'
+import { beginWeek, performAdvance, tickWeek } from '../src/core/week.js'
+import { setCursor } from '../src/core/mutate.js'
+import { ABSENCES } from '../src/content/absences.js'
 
-const atBuy = (c: CampaignState) => { c.cursor = { ...c.cursor, stage: 'stage.buy', step: 'open', prepStep: null, engagement: null, battle: null, attack: null, fought: 0 } }
-
-describe('ISC-046 — the unavailability roll', () => {
-  it('leaving Buy for Quest keeps floor(roster/3) heroes home, each with a story, and they answer unavailable in both slots', () => {
-    const ctx = loadFixture(atBuy)
-    const roster = Object.keys(ctx.campaign.roster).length
-    expect(roster).toBeGreaterThanOrEqual(6)
-    expect(ctx.campaign.unavailable).toEqual([])
-    performAdvance(ctx, 'test')
-    expect(ctx.campaign.cursor.stage).toBe('stage.quest')
-    const kept = ctx.campaign.unavailable
-    expect(kept.length).toBe(absencesFor(roster))
-    expect(kept.length).toBeGreaterThan(0)
-    for (const a of kept) {
-      expect(ctx.campaign.roster[a.heroId]).toBeDefined()
-      expect(ABSENCES.map((r) => r.story)).toContain(a.story)
-      expect(commitmentOf(ctx.campaign, a.heroId, 'field')).toBe('unavailable')
-      expect(commitmentOf(ctx.campaign, a.heroId, 'city')).toBe('unavailable')
-      expect(listAvailable(ctx.campaign, 'stage.conquer')).not.toContain(a.heroId)
+const H = 'hero.base.warrior-iron'
+describe('ISC046 — after each ordinary battle', () => {
+  it('independent 20% participant pulls use existing badge multipliers, named streams and stories', () => {
+    const c = loadFixture().campaign
+    expect(absenceWeightOf(['badge.responsible'])).toBe(0)
+    expect(absenceWeightOf(['badge.dedicated'])).toBe(50)
+    expect(absenceWeightOf(['badge.lazy'])).toBe(200)
+    expect(absenceWeightOf(['badge.withdrawn'])).toBe(300)
+    const counts = [0, 0, 0, 0, 0]
+    for (let n = 0; n < 1000; n++) {
+      for (const [i, badges] of [[], ['badge.dedicated'], ['badge.lazy'], ['badge.withdrawn'], ['badge.responsible']].entries()) {
+        c.roster[H]!.badges = badges
+        const a = resolveAbsences(c, [H], `battle-${n}`)
+        expect(a).toEqual(resolveAbsences(c, [H], `battle-${n}`))
+        expect(a.every((x) => x.heroId === H && ABSENCES.some((r) => r.story === x.story))).toBe(true)
+        counts[i]! += a.length
+      }
     }
-    expect(new Set(kept.map((a) => a.heroId)).size).toBe(kept.length)          // no hero kept home twice
-    expect(ctx.events.filter((e) => e.type === 'absence.rolled').length).toBe(1)
+    expect(counts[0]).toBeGreaterThan(140); expect(counts[0]).toBeLessThan(260)
+    expect(counts[1]).toBeGreaterThan(60); expect(counts[1]).toBeLessThan(140)
+    expect(counts[2]).toBeGreaterThan(330); expect(counts[2]).toBeLessThan(470)
+    expect(counts[3]).toBeGreaterThan(530); expect(counts[3]).toBeLessThan(670)
+    expect(counts[4]).toBe(0)
+    expect(resolveAbsences(c, [], 'empty')).toEqual([])
+    c.roster[H]!.badges = ['badge.withdrawn']; c.roster[H]!.lifeState = 'dead'
+    expect(resolveAbsences(c, [H], 'dead')).toEqual([])
   })
-  it('the roll is keyed by the Week, not by when it is made: a reload lands on the same absences; the next Week rolls afresh', () => {
-    const a = loadFixture(atBuy); performAdvance(a, 'test')
-    const b = loadFixture(atBuy); performAdvance(b, 'test')
-    expect(b.campaign.unavailable).toEqual(a.campaign.unavailable)
-    const c = loadFixture((s) => { atBuy(s); s.week = s.week + 1 }); performAdvance(c, 'test')
-    expect(c.campaign.unavailable).not.toEqual(a.campaign.unavailable)
+  it('the result writer pulls only survivors who fought, including a party smaller than six', () => {
+    const ctx = toBattle(loadFixture(), 2)
+    const e = ctx.campaign.cursor.engagement!
+    // Deterministically select a battle identity whose participants draw an absence.
+    for (let n = 0; n < 1000; n++) { e.id = `engagement.test-${n}`; if (resolveAbsences(ctx.campaign, e.deployed, e.id).length) break }
+    const expected = resolveAbsences(ctx.campaign, e.deployed, e.id)
+    expect(expected.length).toBeGreaterThan(0)
+    const { result, reckoning } = decide(ctx, panelResult(ctx, true))
+    applyBattleResult(ctx, e, result, reckoning)
+    expect(ctx.campaign.unavailable).toEqual(expected)
+    for (const a of expected) {
+      expect(e.deployed).toContain(a.heroId)
+      expect(commitmentOf(ctx.campaign, a.heroId, 'field')).toBe('unavailable')
+      expect(canCommit(ctx.campaign, a.heroId, { kind: 'rest', target: 'rest', weeks: 1 })).toBe(false)
+    }
+    expect(ctx.events.filter((e) => e.type === 'absence.rolled')).toHaveLength(1)
+    expect(() => applyBattleResult(ctx, e, result, reckoning)).toThrow(/refused/)
+    expect(ctx.events.filter((e) => e.type === 'absence.rolled')).toHaveLength(1)
   })
-  it('the Week boundary clears the list', () => {
-    const ctx = loadFixture(atBuy); performAdvance(ctx, 'test')
-    expect(ctx.campaign.unavailable.length).toBeGreaterThan(0)
-    tickWeek(ctx, 'test')
+  it('prologue fights defer campaign absence pulls because the opening has no recovery City', () => {
+    const ctx = toBattle(loadFixture(), 2)
+    const e = ctx.campaign.cursor.engagement!
+    for (let n = 0; n < 1000; n++) { e.id = `engagement.opening-test-${n}`; if (resolveAbsences(ctx.campaign, e.deployed, e.id).length) break }
+    expect(resolveAbsences(ctx.campaign, e.deployed, e.id).length).toBeGreaterThan(0)
+    e.prologue = 1; ctx.campaign.cursor.prologue = 1
+    const { result, reckoning } = decide(ctx, panelResult(ctx, true))
+    applyBattleResult(ctx, e, result, reckoning)
     expect(ctx.campaign.unavailable).toEqual([])
-    expect(ctx.events.some((e) => e.type === 'absence.cleared')).toBe(true)
+    expect(ctx.events.filter((e) => e.type === 'absence.rolled')).toEqual([])
   })
-  it('badge.responsible is never unavailable; a roster under six loses nobody', () => {
-    const ctx = loadFixture((c) => { atBuy(c); for (const h of Object.values(c.roster)) h.badges = ['badge.responsible'] })
+  it('a pull blocks the next Field and every assignment, expires at due City, and empty pulls keep existing absences', () => {
+    const ctx = loadFixture()
+    let cause = ''
+    for (let n = 0; n < 1000; n++) { cause = `battle-${n}`; if (resolveAbsences(ctx.campaign, [H], cause).length) break }
+    performRollAbsences(ctx, [H], cause)
+    const held = structuredClone(ctx.campaign.unavailable)
+    performRollAbsences(ctx, [], 'other battle')
+    expect(ctx.campaign.unavailable).toEqual(held)
+    tickWeek(ctx, 'test'); beginWeek(ctx, 'test')
+    expect(commitmentOf(ctx.campaign, H, 'field')).toBe('unavailable')
+    performAdvance(ctx, 'test'); setCursor(ctx, { attack: null }, 'test'); performAdvance(ctx, 'test')
+    expect(commitmentOf(ctx.campaign, H, 'field')).toBe('unavailable')
     performAdvance(ctx, 'test')
-    expect(ctx.campaign.unavailable).toEqual([])
-    const small = loadFixture((c) => { atBuy(c); for (const id of Object.keys(c.roster).sort().slice(5)) { delete c.roster[id]; delete c.assignments[id] } })
-    expect(Object.keys(small.campaign.roster).length).toBe(5)
-    performAdvance(small, 'test')
-    expect(small.campaign.unavailable).toEqual([])
-    expect(absencesFor(5)).toBe(0); expect(absencesFor(6)).toBe(1); expect(absencesFor(12)).toBe(3); expect(absencesFor(18)).toBe(5)
+    expect(ctx.campaign.cursor.stage).toBe('stage.city')
+    expect(commitmentOf(ctx.campaign, H, 'city')).toBe('free')
+    expect(ctx.events.some((e) => e.type === 'absence.cleared')).toBe(true)
   })
 })
diff --git a/test/isc-047.test.ts b/test/isc-047.test.ts
index d9eaf31..da4b1af 100644
--- a/test/isc-047.test.ts
+++ b/test/isc-047.test.ts
@@ -1,8 +1,10 @@
-// ISC-047 — stage.quest offers one authored quest; sending heroes takes both
+// V2: dispatch in City, retain party through due Field battles, release and reward together.
+// ISC-047 — stage.city offers one authored quest; sending heroes takes both
 // their slots for N Weeks; tickWeek brings it back and resolves its reward.
 // GAME-ARCHITECTURE.md §2.6 QUESTS · THIN-SLICE-REVIEW.md §D
 import { describe, it, expect } from 'vitest'
 import { loadFixture } from './walk.js'
-import { tickWeek } from '../src/core/week.js'
+import { tickWeek, beginWeek, performAdvance } from '../src/core/week.js'
+import { setCursor } from '../src/core/mutate.js'
 import { commitmentOf } from '../src/core/assignments.js'
 import { listQuestOffers, canSendQuest, performSendQuest, whyNotSendQuest } from '../src/core/quests.js'
@@ -10,5 +12,5 @@ import { QUESTS, questRowOf } from '../src/content/quests.js'
 import type { CampaignState } from '../src/core/campaign.js'
 
-const atQuest = (c: CampaignState) => { c.cursor = { ...c.cursor, stage: 'stage.quest', step: 'open', prepStep: null, engagement: null, battle: null, attack: null, fought: 0 } }
+const atQuest = (c: CampaignState) => { c.cursor = { ...c.cursor, stage: 'stage.city', step: 'open', prepStep: null, engagement: null, battle: null, attack: null, fought: 0 } }
 const QUEST = 'quest.escort'
 
@@ -18,5 +20,5 @@ describe('ISC-047 — one quest goes out and comes back', () => {
     expect(QUESTS.map((q) => q.id)).toEqual([QUEST])
     expect(listQuestOffers(ctx.campaign)).toEqual([QUEST])
-    const elsewhere = loadFixture((c) => { atQuest(c); c.cursor.stage = 'stage.build' })
+    const elsewhere = loadFixture((c) => { atQuest(c); c.cursor.stage = 'stage.field' })
     expect(listQuestOffers(elsewhere.campaign)).toEqual([])
   })
@@ -28,8 +30,8 @@ describe('ISC-047 — one quest goes out and comes back', () => {
     expect(whyNotSendQuest(ctx.campaign, QUEST, [])).toMatch(/needs/)
     performSendQuest(ctx, QUEST, [h1], 'test')
-    expect(ctx.campaign.assignments[h1]).toEqual({ field: { kind: 'quest', target: QUEST, weeks: row.weeks }, city: { kind: 'quest', target: QUEST, weeks: row.weeks } })
+    expect(ctx.campaign.assignments[h1]).toEqual({ kind: 'quest', target: QUEST, weeks: row.weeks })
     expect(commitmentOf(ctx.campaign, h1, 'field')).toBe('onQuest')
     expect(commitmentOf(ctx.campaign, h1, 'city')).toBe('onQuest')
-    expect(ctx.campaign.quests[QUEST]).toEqual({ id: QUEST, heroes: [h1], weeksLeft: row.weeks })
+    expect(ctx.campaign.quests[QUEST]).toEqual({ id: QUEST, heroes: [h1], weeksLeft: row.weeks, sentWeek: ctx.campaign.week, dueWeek: ctx.campaign.week + row.weeks })
     expect(listQuestOffers(ctx.campaign)).toEqual([])                                   // in flight: not offered twice
     expect(ctx.events.filter((e) => e.type === 'quest.sent').length).toBe(1)
@@ -39,5 +41,5 @@ describe('ISC-047 — one quest goes out and comes back', () => {
     expect(() => performSendQuest(busy, QUEST, [h1], 'test')).toThrow(/refused/)
   })
-  it('tickWeek counts it down; on the last Week it comes home, pays its reward, frees the hero, and is offered again', () => {
+  it('tickWeek counts it down; after the due Field battles it comes home, pays its reward, frees the hero, and is offered again', () => {
     const ctx = loadFixture(atQuest)
     const row = questRowOf(QUEST)
@@ -51,4 +53,11 @@ describe('ISC-047 — one quest goes out and comes back', () => {
     }
     tickWeek(ctx, 'test')
+    expect(ctx.campaign.quests[QUEST]!.weeksLeft).toBe(0)
+    expect(commitmentOf(ctx.campaign, h1, 'field')).toBe('onQuest')
+    expect(ctx.campaign.purse['currency.faith']).toBe(faith)
+    beginWeek(ctx, 'test')
+    performAdvance(ctx, 'test')
+    setCursor(ctx, { attack: null }, 'test')
+    performAdvance(ctx, 'test')
     expect(ctx.campaign.quests[QUEST]).toBeUndefined()
     expect(commitmentOf(ctx.campaign, h1, 'field')).toBe('free')
diff --git a/test/isc-052.test.ts b/test/isc-052.test.ts
index d267d93..75e393a 100644
--- a/test/isc-052.test.ts
+++ b/test/isc-052.test.ts
@@ -17,5 +17,5 @@ import type { CampaignState } from '../src/core/campaign.js'
 const codex = JSON.parse(readFileSync('../content/hbt-content.json', 'utf8'))
 const codexKit = (id: string): string[] => (codex.heroes.heroes as { id: string; kit: string[] | null }[]).find((h) => h.id === id)!.kit!
-const atBuy = (c: CampaignState) => { c.cursor = { ...c.cursor, stage: 'stage.buy', step: 'open', prepStep: null, engagement: null, battle: null, attack: null, fought: 0, recruited: 0 } }
+const atBuy = (c: CampaignState) => { c.cursor = { ...c.cursor, stage: 'stage.city', step: 'open', prepStep: null, engagement: null, battle: null, attack: null, fought: 0, recruited: 0 } }
 
 describe('ISC-052 — a hero enters wearing its kit', () => {
diff --git a/test/isc-056.test.ts b/test/isc-056.test.ts
index 8727f55..d5fcf9c 100644
--- a/test/isc-056.test.ts
+++ b/test/isc-056.test.ts
@@ -13,5 +13,5 @@ import type { CampaignState } from '../src/core/campaign.js'
 const HUNTER = 'hero.base.ranger-aggressive', DWARF = 'hero.base.warrior-iron'
 const IDOL = 'item.pilgrims-warding-stone', RUNE = 'item.rune-bashing'
-const atBuy = (c: CampaignState) => { c.cursor = { ...c.cursor, stage: 'stage.buy', step: 'open', prepStep: null, engagement: null, battle: null, attack: null, fought: 0 } }
+const atBuy = (c: CampaignState) => { c.cursor = { ...c.cursor, stage: 'stage.city', step: 'open', prepStep: null, engagement: null, battle: null, attack: null, fought: 0 } }
 
 describe('ISC-056 — equip costs and the session', () => {
diff --git a/test/isc-057.test.ts b/test/isc-057.test.ts
index 0326c65..eff718a 100644
--- a/test/isc-057.test.ts
+++ b/test/isc-057.test.ts
@@ -2,5 +2,5 @@
 // Equipped 4 · Masterwork +2 masterwork · Enchanted +2 enchanted, drawn from tier-1
 // weapons and armor on cup.forge keyed by the Week; the same Week re-loaded shows
-// the same shelf; the next Week differs; buying is refused outside stage.buy.
+// the same shelf; the next Week differs; buying is refused outside stage.city.
 // GEAR-DESIGN.md §3
 import { describe, it, expect } from 'vitest'
@@ -17,5 +17,5 @@ const forgeAt = (nodes: string[]) => (c: CampaignState) => {
   const t = c.territories[RIDGE]!; t.owned = true; t.claimedOnce = true
   const b = t.buildings.find((x) => x.id === FORGE)!; b.nodes = [...nodes]; b.level = nodes.length; b.damaged = nodes.length === 0
-  c.cursor = { ...c.cursor, stage: 'stage.buy', step: 'open', prepStep: null, engagement: null, battle: null, attack: null, fought: 0 }
+  c.cursor = { ...c.cursor, stage: 'stage.city', step: 'open', prepStep: null, engagement: null, battle: null, attack: null, fought: 0 }
   c.purse['currency.supplies'] = 500; c.purse['currency.mana'] = 500
 }
@@ -58,5 +58,5 @@ describe('ISC-057 — the shelf by level, rerolled weekly', () => {
     const ctx = loadFixture(forgeAt(['repair']))
     const id = listShopItems(ctx.campaign)[0]!.id
-    beginStage(ctx, 'stage.build', 'test')
+    beginStage(ctx, 'stage.field', 'test')
     setCursor(ctx, { step: 'open' }, 'test')
     expect(canBuyItem(ctx.campaign, id)).toBe(false)
diff --git a/test/isc-058.test.ts b/test/isc-058.test.ts
index 9d443fc..2f7af9f 100644
--- a/test/isc-058.test.ts
+++ b/test/isc-058.test.ts
@@ -16,5 +16,5 @@ const forgeAt = (nodes: string[]) => (c: CampaignState) => {
   const t = c.territories[RIDGE]!; t.owned = true; t.claimedOnce = true
   const b = t.buildings.find((x) => x.id === FORGE)!; b.nodes = [...nodes]; b.level = nodes.length; b.damaged = false
-  c.cursor = { ...c.cursor, stage: 'stage.buy', step: 'open', prepStep: null, engagement: null, battle: null, attack: null, fought: 0 }
+  c.cursor = { ...c.cursor, stage: 'stage.city', step: 'open', prepStep: null, engagement: null, battle: null, attack: null, fought: 0 }
 }
 
diff --git a/test/isc-059.test.ts b/test/isc-059.test.ts
index c620190..bbff593 100644
--- a/test/isc-059.test.ts
+++ b/test/isc-059.test.ts
@@ -15,5 +15,5 @@ const forgeAt = (nodes: string[], stash: string[]) => (c: CampaignState) => {
   const t = c.territories[RIDGE]!; t.owned = true; t.claimedOnce = true
   const b = t.buildings.find((x) => x.id === FORGE)!; b.nodes = [...nodes]; b.level = nodes.length; b.damaged = false
-  c.cursor = { ...c.cursor, stage: 'stage.buy', step: 'open', prepStep: null, engagement: null, battle: null, attack: null, fought: 0 }
+  c.cursor = { ...c.cursor, stage: 'stage.city', step: 'open', prepStep: null, engagement: null, battle: null, attack: null, fought: 0 }
   c.stash = [...stash]
 }
diff --git a/test/isc-060.test.ts b/test/isc-060.test.ts
index 4311285..eebbdd3 100644
--- a/test/isc-060.test.ts
+++ b/test/isc-060.test.ts
@@ -13,5 +13,5 @@ const at = (nodes: string[]) => (c: CampaignState) => {
   const t = c.territories[SANCTUARY]!
   t.buildings = [...t.buildings.filter((b) => b.id !== WAY), { id: WAY, level: nodes.length, damaged: nodes.length === 0, nodes: [...nodes] }]
-  c.cursor = { ...c.cursor, stage: 'stage.buy', step: 'open', prepStep: null, engagement: null, battle: null, attack: null, fought: 0 }
+  c.cursor = { ...c.cursor, stage: 'stage.city', step: 'open', prepStep: null, engagement: null, battle: null, attack: null, fought: 0 }
   c.purse['currency.supplies'] = 500; c.purse['currency.mana'] = 500
 }
@@ -47,5 +47,5 @@ describe('ISC-060 — the Waystation catalog', () => {
     const poor = loadFixture((c) => { at(['repair'])(c); c.purse['currency.mana'] = 0 })
     expect(whyNotBuyCatalog(poor.campaign, 'item.cure-poison')).toMatch(/Mana/)
-    const elsewhere = loadFixture((c) => { at(['repair'])(c); c.cursor.stage = 'stage.build' })
+    const elsewhere = loadFixture((c) => { at(['repair'])(c); c.cursor.stage = 'stage.field' })
     expect(whyNotBuyCatalog(elsewhere.campaign, 'item.torch')).toMatch(/Buy Stage/)
   })
diff --git a/test/loadgame.test.ts b/test/loadgame.test.ts
index 65b104b..b8d6735 100644
--- a/test/loadgame.test.ts
+++ b/test/loadgame.test.ts
@@ -34,5 +34,5 @@ describe('the Load Game screen', () => {
     expect(summarize('{"nonsense":1}').state).toBe('broken')
     const live = summarize(fixture)
-    expect(live.state).toBe('live'); if (live.state === 'live') expect(live.progress).toMatch(/^Week 3 · Conquer/)
+    expect(live.state).toBe('live'); if (live.state === 'live') expect(live.progress).toMatch(/^Week 3 · Field/)
     const opening = summarize(saveOf(makeNewCampaign(1)))
     if (opening.state === 'live') expect(opening.progress).toMatch(/^the opening/); else throw new Error(opening.state)
diff --git a/test/save-migrate.test.ts b/test/save-migrate.test.ts
index fdd2c1d..354dea9 100644
--- a/test/save-migrate.test.ts
+++ b/test/save-migrate.test.ts
@@ -1,6 +1,3 @@
-// save.migrate — a save written before G5–G7 lacks cursor.equipSession, sold and
-// spent; the load fills them in with the one value such a save holds (nothing fitted,
-// sold or spent). Anything else missing is still refused. 2026-09-03, from Andrew's
-// slot 1: "a save this build cannot read — save's cursor is missing 'equipSession'".
+// V2 explicitly removes V1 compatibility (user ruling 2026-09-10).
 import { describe, it, expect } from 'vitest'
 import { readFileSync } from 'node:fs'
@@ -10,11 +7,11 @@ const fixture = () => JSON.parse(readFileSync('fixtures/slice-prep.json', 'utf8'
 
 describe('the save migration', () => {
-  it('an older save without equipSession, sold and spent loads as one with them empty', () => {
-    const old = fixture()
-    delete old.cursor.equipSession; delete old.cursor.sold; delete old.cursor.spent
-    const loaded = campaignOf(JSON.stringify(old))
-    expect(loaded.cursor.equipSession).toBeNull()
-    expect(loaded.cursor.sold).toEqual([]); expect(loaded.cursor.spent).toEqual([])
-    expect(JSON.parse(saveOf(loaded))).toEqual(JSON.parse(saveOf(campaignOf(readFileSync('fixtures/slice-prep.json', 'utf8')))))
+  it('V2 requires every cursor field rather than migrating an old save', () => {
+    for (const key of ['equipSession', 'sold', 'spent']) {
+      const old = fixture(); delete old.cursor[key]
+      expect(() => campaignOf(JSON.stringify(old))).toThrow(`cursor is missing '${key}'`)
+    }
+    const old = fixture(); delete old.version
+    expect(() => campaignOf(JSON.stringify(old))).toThrow(/V2/)
   })
   it('a save missing a field with no empty value is still refused', () => {
```
</details>

ISC-005: CLOSED at 648d957 · ISC-006: CLOSED at 648d957 · ISC-007: CLOSED at 648d957 · ISC-008: CLOSED at 648d957 · ISC-009: CLOSED at 648d957 · ISC-010: CLOSED at 648d957 · ISC-036: CLOSED at 648d957 · ISC-046: CLOSED at 648d957 · ISC-047: CLOSED at 648d957
slice: 61 of 68 closed · 61 probed · 1 accepted
IRON GAUNTLET: NOT PASSED — 3 FLAG(S) WARNED

## v2.opening-quests — LANDED `9d56fcc` **NEEDS REVIEW**
2026-09-11 09:52 · engine @ ebc4cf6

  PASS  dependencies landed
  WARN  not already decided — 3 candidate ruling(s) — READ BEFORE ASKING: DECISIONS.md:2101 · ..\STATE.md:21
  PASS  typecheck
  PASS  full test suite — 218 passed
  PASS  gate 1 — every claimed criterion holds — ISC-047 — one quest goes out and comes back
  PASS  brought its own tests — test/isc-047.test.ts, test/v2-week.test.ts
  WARN  existing tests untouched — DELETED LINES in test/isc-047.test.ts (-67), test/v2-week.test.ts (-2) — will land FLAGGED for review
  PASS  kill switch — every claimed probe has been seen red — ISC-047: red on record (2026-09-11 09:51 @ 0cf52b3) and re-proven — fails without quest.rescue-civilian,quest.recover-supplies
  PASS  nothing regresses — every P-tier probe — 61 P-tier probe(s): 61 green, 0 red, 0 regression(s). 61 of 68 closed · 61 probed · 1 accepted
  PASS  hardcode scan — core knows mechanisms, never names
  PASS  generalizes — the second instance costs zero kingdom code — quest.rescue-civilian live · quest.recover-supplies live
  PASS  naming — new ids use declared kinds
  PASS  naming — no banned words invented
  PASS  engine working tree clean — engine @ ebc4cf6, clean
  PASS  one door to the engine

<details><summary>Existing tests were edited — review this diff</summary>

```diff
diff --git a/test/isc-047.test.ts b/test/isc-047.test.ts
index da4b1af..5aab14b 100644
--- a/test/isc-047.test.ts
+++ b/test/isc-047.test.ts
@@ -1,73 +1,283 @@
-// V2: dispatch in City, retain party through due Field battles, release and reward together.
-// ISC-047 — stage.city offers one authored quest; sending heroes takes both
-// their slots for N Weeks; tickWeek brings it back and resolves its reward.
-// GAME-ARCHITECTURE.md §2.6 QUESTS · THIN-SLICE-REVIEW.md §D
+// V2 quests: staffing, due Field outcomes, exact party, and rewards paid once.
 import { describe, it, expect } from 'vitest'
-import { loadFixture } from './walk.js'
-import { tickWeek, beginWeek, performAdvance } from '../src/core/week.js'
-import { setCursor } from '../src/core/mutate.js'
+import { loadFixture, toBattle, panelResult, decide } from './walk.js'
+import { tickWeek, beginWeek, beginStage, performAdvance, canAdvance } from '../src/core/week.js'
+import { makeCtx, setCursor, type Ctx } from '../src/core/mutate.js'
 import { commitmentOf } from '../src/core/assignments.js'
-import { listQuestOffers, canSendQuest, performSendQuest, whyNotSendQuest } from '../src/core/quests.js'
+import * as Q from '../src/core/quests.js'
 import { QUESTS, questRowOf } from '../src/content/quests.js'
-import type { CampaignState } from '../src/core/campaign.js'
-
-const atQuest = (c: CampaignState) => { c.cursor = { ...c.cursor, stage: 'stage.city', step: 'open', prepStep: null, engagement: null, battle: null, attack: null, fought: 0 } }
-const QUEST = 'quest.escort'
-
-describe('ISC-047 — one quest goes out and comes back', () => {
-  it('the Quest Stage offers the one authored quest and nothing else; another Stage offers none', () => {
-    const ctx = loadFixture(atQuest)
-    expect(QUESTS.map((q) => q.id)).toEqual([QUEST])
-    expect(listQuestOffers(ctx.campaign)).toEqual([QUEST])
-    const elsewhere = loadFixture((c) => { atQuest(c); c.cursor.stage = 'stage.field' })
-    expect(listQuestOffers(elsewhere.campaign)).toEqual([])
-  })
-  it('sending a hero takes both slots for the row\'s Weeks, is refused for a busy or absent hero, and the quest is in flight', () => {
-    const ctx = loadFixture(atQuest)
-    const row = questRowOf(QUEST)
-    const [h1, h2] = Object.keys(ctx.campaign.roster).sort() as [string, string]
-    expect(canSendQuest(ctx.campaign, QUEST, [h1])).toBe(true)
-    expect(whyNotSendQuest(ctx.campaign, QUEST, [])).toMatch(/needs/)
-    performSendQuest(ctx, QUEST, [h1], 'test')
-    expect(ctx.campaign.assignments[h1]).toEqual({ kind: 'quest', target: QUEST, weeks: row.weeks })
-    expect(commitmentOf(ctx.campaign, h1, 'field')).toBe('onQuest')
-    expect(commitmentOf(ctx.campaign, h1, 'city')).toBe('onQuest')
-    expect(ctx.campaign.quests[QUEST]).toEqual({ id: QUEST, heroes: [h1], weeksLeft: row.weeks, sentWeek: ctx.campaign.week, dueWeek: ctx.campaign.week + row.weeks })
-    expect(listQuestOffers(ctx.campaign)).toEqual([])                                   // in flight: not offered twice
-    expect(ctx.events.filter((e) => e.type === 'quest.sent').length).toBe(1)
-    expect(whyNotSendQuest(ctx.campaign, QUEST, [h2])).toMatch(/in flight/)
-    const busy = loadFixture((c) => { atQuest(c); c.unavailable = [{ heroId: h1, story: 'Went missing' }] })
-    expect(canSendQuest(busy.campaign, QUEST, [h1])).toBe(false)
-    expect(() => performSendQuest(busy, QUEST, [h1], 'test')).toThrow(/refused/)
-  })
-  it('tickWeek counts it down; after the due Field battles it comes home, pays its reward, frees the hero, and is offered again', () => {
-    const ctx = loadFixture(atQuest)
-    const row = questRowOf(QUEST)
-    const [h1] = Object.keys(ctx.campaign.roster).sort() as [string]
-    const faith = ctx.campaign.purse['currency.faith']!
-    performSendQuest(ctx, QUEST, [h1], 'test')
-    for (let w = row.weeks; w > 1; w--) {
-      tickWeek(ctx, 'test')
-      expect(ctx.campaign.quests[QUEST]!.weeksLeft).toBe(w - 1)
-      expect(commitmentOf(ctx.campaign, h1, 'field')).toBe('onQuest')
-    }
-    tickWeek(ctx, 'test')
-    expect(ctx.campaign.quests[QUEST]!.weeksLeft).toBe(0)
-    expect(commitmentOf(ctx.campaign, h1, 'field')).toBe('onQuest')
-    expect(ctx.campaign.purse['currency.faith']).toBe(faith)
-    beginWeek(ctx, 'test')
-    performAdvance(ctx, 'test')
-    setCursor(ctx, { attack: null }, 'test')
+import { HERO_POOL, CIVILIANS } from '../src/content/heroes.js'
+import { campaignOf, saveOf } from '../src/core/campaign.js'
+import { CUP_IDS } from '../src/content/cups.js'
+import { applyBattleResult, performExitBattle } from '../src/core/reckoning.js'
+import { listDeployable, canDeploy, canUndeploy, performAdvancePrep } from '../src/core/prep.js'
+import { performLeaveLevelUp } from '../src/core/rewards.js'
+import { playEngagement, DEFAULTS, playWeeks } from '../src/sim/autoplay.js'
+import { viewBattle } from '../src/view/battle.js'
+import { portraitIdOf } from '../src/ui/art.js'
+import { recapScreen, rewardsScreen } from '../src/ui/after.js'
+import { questCards, questReportScreen } from '../src/ui/quests.js'
+import { withUnitFate } from '../src/core/result.js'
+import { xpForLevel } from '../src/content/levels.js'
+const R = 'quest.rescue-civilian', S = 'quest.recover-supplies', E = 'quest.escort'
+const H = HERO_POOL[0]!.id, H2 = HERO_POOL[1]!.id, C = CIVILIANS[0]!.id, party = [H, H2, C]
+function city() {
+  const ctx = loadFixture(c => {
+    for (const h of [...HERO_POOL, ...CIVILIANS]) c.roster[h.id] = structuredClone(h)
+    for (const h of Object.values(c.roster)) h.badges = ['badge.responsible']
+    c.assignments = {}; c.unavailable = []; c.foughtThisWeek = []
+  })
+  beginStage(ctx, 'stage.city', 'test'); return ctx
+}
+const copy = (ctx: Ctx) => makeCtx(campaignOf(saveOf(ctx.campaign)))
+function due(ctx: Ctx) {
+  tickWeek(ctx, 'test'); beginWeek(ctx, 'test'); performAdvance(ctx, 'test')
+  setCursor(ctx, { attack: null }, 'test'); performAdvance(ctx, 'test')
+}
+function supplies(escorts = 0, combat = false) {
+  const ctx = city(); Q.performSendQuest(ctx, S, [H, ...[C, H2].slice(0, escorts)], 'test', H)
+  for (let seed = 0; seed < 10000; seed++) {
+    ctx.campaign.cups[CUP_IDS.quest] = seed
+    if ((Q.resolveQuestOutcome(ctx.campaign, ctx.campaign.quests[S]!).kind === 'battle') === combat) return ctx
+  }
+  throw new Error('no seeded quest outcome')
+}
+function report(ctx: Ctx) {
+  Q.performAcknowledgeQuest(ctx, 'test')
+  if (ctx.campaign.cursor.step === 'levelUp') performLeaveLevelUp(ctx, 'test')
+}
+function battle(ctx: Ctx, won = true) {
+  while (ctx.campaign.cursor.step === 'prep') performAdvancePrep(ctx, 'test')
+  const e = ctx.campaign.cursor.engagement!, { result, reckoning } = decide(ctx, panelResult(ctx, won))
+  return { e, result, reckoning }
+}
+function unchanged(ctx: Ctx, f: () => void, reason: RegExp) {
+  const before = saveOf(ctx.campaign), n = ctx.events.length
+  expect(f).toThrow(reason); expect(saveOf(ctx.campaign)).toBe(before); expect(ctx.events).toHaveLength(n)
+}
+describe('ISC047 — V2 opening quests', () => {
+  it('offers both opening quests first and retains Escort, only in City', () => {
+    const ctx = city()
+    expect(QUESTS.map(q => q.id)).toEqual([R, S, E]); expect(Q.listQuestOffers(ctx.campaign)).toEqual([R, S, E])
+    beginWeek(ctx, 'test'); expect(Q.listQuestOffers(ctx.campaign)).toEqual([])
+  })
+  it('Rescue requires exactly three distinct people; civilians qualify', () => {
+    const c = city().campaign
+    for (const ids of [[], [H], [H, C], [...party, HERO_POOL[2]!.id], [H, H, C]]) expect(Q.canSendQuest(c, R, ids)).toBe(false)
+    expect(Q.canSendQuest(c, R, party)).toBe(true)
+    expect(Q.canSendQuest(c, R, CIVILIANS.map(h => h.id))).toBe(true)
+  })
+  it.each(['absent', 'busy', 'exhausted', 'fought', 'dead'] as const)('refuses a %s participant without writes', state => {
+    const ctx = city(), c = ctx.campaign
+    if (state === 'absent') c.unavailable = [{ heroId: H, story: 'Away' }]
+    if (state === 'busy') c.assignments[H] = { kind: 'rest', target: 'rest', weeks: 1 }
+    if (state === 'exhausted') c.roster[H]!.badges.push('badge.exhausted')
+    if (state === 'fought') c.foughtThisWeek = [H]
+    if (state === 'dead') c.roster[H]!.lifeState = 'dead'
+    expect(Q.canSendQuest(c, R, party)).toBe(false)
+    unchanged(ctx, () => Q.performSendQuest(ctx, R, party, 'test'), /refused/)
+  })
+  it('Supplies requires an explicit hero lead and no more than two distinct escorts', () => {
+    const c = city().campaign
+    expect(Q.canSendQuest(c, S, [H])).toBe(false)
+    expect(Q.canSendQuest(c, S, [C], C)).toBe(false); expect(Q.canSendQuest(c, S, [C], H)).toBe(false)
+    expect(Q.canSendQuest(c, S, [H, H], H)).toBe(false)
+    expect(Q.canSendQuest(c, S, [...party, HERO_POOL[2]!.id], H)).toBe(false)
+    for (const ids of [[H], [H, C], party]) expect(Q.canSendQuest(c, S, ids, H)).toBe(true)
+  })
+  it('holds the sorted party through due battles and pays the designated lead, not the first hero', () => {
+    const ctx = city(); Q.performSendQuest(ctx, S, [C, H, H2], 'test', H2)
+    const q = ctx.campaign.quests[S]!, purse = { ...ctx.campaign.purse }
+    expect(q.leadHeroId).toBe(H2); expect(q.heroes).toEqual([...party].sort())
+    tickWeek(ctx, 'test'); beginWeek(ctx, 'test')
+    for (const id of party) expect(commitmentOf(ctx.campaign, id, 'field')).toBe('onQuest')
     performAdvance(ctx, 'test')
-    expect(ctx.campaign.quests[QUEST]).toBeUndefined()
-    expect(commitmentOf(ctx.campaign, h1, 'field')).toBe('free')
-    expect(commitmentOf(ctx.campaign, h1, 'city')).toBe('free')
-    expect(ctx.campaign.purse['currency.faith']).toBe(faith + row.reward['currency.faith']!)
-    const resolved = ctx.events.filter((e) => e.type === 'quest.resolved')
-    expect(resolved.length).toBe(1)
-    expect(resolved[0]!['won']).toBe(true)
-    expect(ctx.campaign.purse['currency.salvage']).toBe(loadFixture().campaign.purse['currency.salvage'])   // quests never pay Salvage
-    atQuest(ctx.campaign)
-    expect(listQuestOffers(ctx.campaign)).toEqual([QUEST])
+    for (const id of party) expect(commitmentOf(ctx.campaign, id, 'field')).toBe('onQuest')
+    expect(ctx.campaign.purse).toEqual(purse)
+    setCursor(ctx, { attack: null }, 'test'); performAdvance(ctx, 'test')
+    expect(ctx.campaign.cursor.step).toBe('questReport'); expect(canAdvance(ctx.campaign)).toBe(false)
+    const xp = party.map(id => ctx.campaign.roster[id]!.xp); report(ctx)
+    party.forEach((id, i) => expect(ctx.campaign.roster[id]!.xp - xp[i]!).toBe(id === H2 ? 5 : 0))
+    expect(ctx.campaign.purse['currency.supplies']).toBe(purse['currency.supplies']! + 10)
+    expect(ctx.campaign.quests[S]).toBeUndefined()
+  })
+  it('uses the exact 5-percent boundary and two escorts make all rolls safe', () => {
+    for (const escorts of [0, 1]) {
+      expect(Q.questCombatAt(questRowOf(S), escorts, 4)).toBe(true)
+      expect(Q.questCombatAt(questRowOf(S), escorts, 5)).toBe(false)
+      expect(Q.questCombatAt(questRowOf(S), escorts, 99)).toBe(false)
+    }
+    for (let roll = 0; roll < 100; roll++) expect(Q.questCombatAt(questRowOf(S), 2, roll)).toBe(false)
+    expect(Q.questCombatAt(questRowOf(R), 0, 0)).toBe(false)
+  })
+  it('reaches both risky branches with real named seeds; reload and party order cannot reroll', () => {
+    for (const escorts of [0, 1]) for (const combat of [true, false]) {
+      const ctx = supplies(escorts, combat), q = ctx.campaign.quests[S]!, a = Q.resolveQuestOutcome(ctx.campaign, q)
+      expect(a.kind).toBe(combat ? 'battle' : 'report')
+      expect(Q.resolveQuestOutcome(copy(ctx).campaign, { ...q, heroes: [...q.heroes].reverse() })).toEqual(a)
+      due(ctx); expect(ctx.campaign.quests[S]!.outcome).toEqual(a)
+    }
+  })
+  it('rescues unique independently equipped instances even when every template is owned and the recruit cap is exceeded', () => {
+    const ctx = city(), original = new Set(Object.keys(ctx.campaign.roster))
+    Q.performSendQuest(ctx, R, party, 'test'); due(ctx)
+    const xp = party.map(id => ctx.campaign.roster[id]!.xp), restored = copy(ctx)
+    report(ctx); report(restored); expect(restored.campaign).toEqual(ctx.campaign)
+    party.forEach((id, i) => expect(ctx.campaign.roster[id]!.xp - xp[i]!).toBe(3))
+    const rescued = Object.values(ctx.campaign.roster).find(h => !original.has(h.id))!
+    expect(rescued).toBeDefined(); expect(CIVILIANS.map(h => h.id)).toContain(rescued.templateId)
+    expect(portraitIdOf(rescued)).toBe(rescued.templateId); expect(rescued.id).not.toBe(rescued.templateId)
+    expect(rescued.equipped).not.toBe(ctx.campaign.roster[rescued.templateId!]!.equipped)
+    beginStage(ctx, 'stage.city', 'test'); Q.performSendQuest(ctx, R, party, 'test'); due(ctx); report(ctx)
+    const additions = Object.values(ctx.campaign.roster).filter(h => !original.has(h.id))
+    expect(additions).toHaveLength(2); expect(new Set(additions.map(h => h.id)).size).toBe(2)
+    beginWeek(ctx, 'test'); const e = loadFixture().campaign.cursor.engagement!
+    e.deployed = additions.map(h => h.id); setCursor(ctx, { engagement: e }, 'test')
+    expect(viewBattle(ctx.campaign).units.filter(u => u.side === 'hero')).toHaveLength(2)
+  })
+  it('saved report acknowledgment pays once and cannot be skipped by advancing', () => {
+    const ctx = supplies(2), purse = { ...ctx.campaign.purse }; due(ctx)
+    const restored = copy(ctx)
+    unchanged(restored, () => performAdvance(restored, 'test'), /finish|refused/)
+    expect(restored.campaign.purse).toEqual(purse); report(restored)
+    unchanged(restored, () => Q.performAcknowledgeQuest(restored, 'test'), /refused/)
+    const after = copy(restored); performAdvance(after, 'test')
+    expect(after.campaign.cursor.stage).toBe('stage.city'); expect(after.campaign.purse).toEqual(restored.campaign.purse)
+    expect(after.events.filter(e => e.type === 'quest.resolved')).toEqual([])
+  })
+  it('two due reports process serially across reload without skipping or repeating either', () => {
+    const ctx = city()
+    Q.performSendQuest(ctx, R, CIVILIANS.map(h => h.id), 'test')
+    Q.performSendQuest(ctx, S, HERO_POOL.slice(0, 3).map(h => h.id), 'test', H)
+    due(ctx); expect(ctx.campaign.cursor.questReport).toBe(ctx.campaign.quests[R]!.runId)
+    report(ctx); const restored = copy(ctx); performAdvance(restored, 'test')
+    expect(restored.campaign.cursor.step).toBe('questReport')
+    expect(restored.campaign.cursor.questReport).toBe(restored.campaign.quests[S]!.runId)
+    report(restored); performAdvance(restored, 'test')
+    expect(restored.campaign.cursor.stage).toBe('stage.city'); expect(restored.campaign.quests).toEqual({})
+  })
+  it('risky battle fixes its dispatched party, retains assignment and works through autoplay', () => {
+    const ctx = supplies(1, true), q = structuredClone(ctx.campaign.quests[S]!); due(ctx)
+    expect(ctx.campaign.cursor.engagement!.deployed).toEqual(q.heroes)
+    expect(ctx.campaign.cursor.engagement!.questRunId).toBe(q.runId); expect(listDeployable(ctx.campaign)).toEqual([])
+    setCursor(ctx, { prepStep: 'deploy' }, 'test')
+    expect(canDeploy(ctx.campaign, H2)).toBe(false); expect(canUndeploy(ctx.campaign, H)).toBe(false)
+    for (const id of q.heroes) expect(ctx.campaign.assignments[id]?.kind).toBe('quest')
+    playEngagement(ctx, DEFAULTS, 'test')
+    expect(ctx.campaign.quests[S]).toBeUndefined(); expect(ctx.campaign.cursor.rewardOffer).toBeNull()
+  })
+  it.each([true, false])('battle won=%s preserves combat XP, pays quest reward only on victory, and never pays twice', won => {
+    const ctx = supplies(1, true), start = structuredClone(ctx.campaign); due(ctx)
+    const { e, result, reckoning } = battle(ctx, won); expect(reckoning.grants).toEqual([])
+    const restored = copy(ctx); applyBattleResult(ctx, e, result, reckoning)
+    const b = restored.campaign.cursor.battle!
+    applyBattleResult(restored, restored.campaign.cursor.engagement!, b.result!, b.reckoning!)
+    expect(restored.campaign).toEqual(ctx.campaign)
+    expect(ctx.campaign.purse['currency.supplies']).toBe(start.purse['currency.supplies']! + (won ? 10 : 0))
+    for (const cur of ['currency.faith', 'currency.mana', 'currency.salvage']) expect(ctx.campaign.purse[cur]).toBe(start.purse[cur])
+    for (const h of reckoning.heroes) expect(ctx.campaign.roster[h.heroId]!.xp - start.roster[h.heroId]!.xp).toBe(h.xp + (won && h.heroId === H ? 5 : 0))
+    expect(ctx.campaign.cursor.rewardOffer).toBeNull(); expect(ctx.campaign.quests[S]).toBeUndefined()
+    expect(ctx.campaign.foughtThisWeek).toEqual([...e.deployed].sort())
+    const after = copy(ctx)
+    unchanged(after, () => applyBattleResult(after, e, result, reckoning), /once|refused/)
+    performExitBattle(after, 'test'); if (after.campaign.cursor.step === 'levelUp') performLeaveLevelUp(after, 'test')
+    performAdvance(after, 'test'); expect(after.campaign.cursor.stage).toBe('stage.city')
+  })
+  it('rejects duplicate Reckoning heroes before writes in ordinary combat too', () => {
+    const ctx = toBattle(loadFixture(), 2), e = ctx.campaign.cursor.engagement!
+    const { result, reckoning } = decide(ctx, panelResult(ctx, true)); reckoning.heroes.push({ ...reckoning.heroes[0]! })
+    unchanged(ctx, () => applyBattleResult(ctx, e, result, reckoning), /duplicate|twice|exactly/)
+  })
+  it.each(['missing', 'party', 'completed'] as const)('rejects %s quest linkage before battle writes', bad => {
+    const ctx = supplies(1, true); due(ctx); const { e, result, reckoning } = battle(ctx)
+    if (bad === 'missing') delete e.questRunId
+    if (bad === 'party') e.deployed.reverse()
+    if (bad === 'completed') delete ctx.campaign.quests[S]
+    unchanged(ctx, () => applyBattleResult(ctx, e, result, reckoning), /quest|party/i)
+  })
+  it('retains Escort duration, exclusivity, Faith and repeat offer with visible acknowledgment', () => {
+    const ctx = city(), faith = ctx.campaign.purse['currency.faith']!
+    Q.performSendQuest(ctx, E, [H], 'test'); expect(Q.listQuestOffers(ctx.campaign)).not.toContain(E)
+    expect(() => Q.performSendQuest(ctx, E, [H2], 'test')).toThrow(/flight/)
+    tickWeek(ctx, 'test'); expect(ctx.campaign.quests[E]!.weeksLeft).toBe(1)
+    due(ctx); expect(ctx.campaign.purse['currency.faith']).toBe(faith); report(ctx)
+    expect(ctx.campaign.purse['currency.faith']).toBe(faith + questRowOf(E).reward['currency.faith']!)
+    expect(commitmentOf(ctx.campaign, H, 'city')).toBe('free')
+    performAdvance(ctx, 'test'); expect(Q.listQuestOffers(ctx.campaign)).toContain(E)
+  })
+  it('whole Weeks continue through reports and battles using the same rules', () => {
+    const ctx = supplies(1, true)
+    playWeeks(ctx, 2, { target: () => null, labours: () => [], quest: () => null }, 'test')
+    expect(ctx.campaign.quests).toEqual({}); expect(ctx.events.filter(e => e.type === 'quest.resolved')).toHaveLength(1)
+  })
+  it.each(['run', 'lead', 'party', 'outcome', 'pointer', 'stage'] as const)('refuses a corrupted %s in a saved quest report', bad => {
+    const ctx = supplies(2); due(ctx); const c = ctx.campaign, q = c.quests[S]!
+    if (bad === 'run') q.runId = 'forged'
+    if (bad === 'lead') q.leadHeroId = C
+    if (bad === 'party') q.heroes.push(q.heroes[0]!)
+    if (bad === 'outcome') q.outcome = null
+    if (bad === 'pointer') c.cursor.questReport = 'unknown'
+    if (bad === 'stage') { c.cursor.stage = 'stage.city'; c.cursor.fieldStep = null }
+    expect(() => campaignOf(saveOf(c))).toThrow(/quest/i)
+  })
+  it('retreat completes without success rewards and dead leads receive no fixed XP on victory', () => {
+    for (const retreat of [true, false]) {
+      const ctx = supplies(1, true), before = structuredClone(ctx.campaign); due(ctx)
+      while (ctx.campaign.cursor.step === 'prep') performAdvancePrep(ctx, 'test')
+      let r = panelResult(ctx, true)
+      if (retreat) r = { ...r, outcome: 'capped' }
+      else r = withUnitFate(r, 'hero', ctx.campaign.cursor.engagement!.deployed.indexOf(H), { lifeState: 'dead' })
+      const { result, reckoning } = decide(ctx, r)
+      applyBattleResult(ctx, ctx.campaign.cursor.engagement!, result, reckoning)
+      expect(ctx.campaign.purse['currency.supplies']).toBe(before.purse['currency.supplies']! + (retreat ? 0 : 10))
+      if (!retreat) expect(ctx.campaign.roster[H]!.xp).toBe(before.roster[H]!.xp)
+      expect(ctx.campaign.quests[S]).toBeUndefined()
+    }
+  })
+  it('saved battle recap preserves combat XP and displays the separate fixed quest reward', () => {
+    const ctx = supplies(1, true); due(ctx); const { e, result, reckoning } = battle(ctx)
+    applyBattleResult(ctx, e, result, reckoning)
+    const rendered = recapScreen(ctx.campaign, ctx.events, null)
+    expect(recapScreen(copy(ctx).campaign, [], null)).toBe(rendered)
+    expect(rendered).toContain('Quest reward'); expect(rendered).toContain('5 quest XP'); expect(rendered).toContain('10 supplies')
+  })
+  it('the UI requires lead selection and renders the saved report result', () => {
+    const ctx = city(), free = Object.keys(ctx.campaign.roster)
+    expect(questCards(ctx.campaign, [S], free, [H], null)).toContain('needs a designated hero lead')
+    expect(questCards(ctx.campaign, [S], free, [H], H)).toContain('data-act="quest-lead"')
+    Q.performSendQuest(ctx, R, party, 'test'); due(ctx)
+    const rendered = questReportScreen(ctx.campaign)
+    expect(rendered).toContain('Complete quest'); expect(rendered).toContain('joins the roster')
+    expect(questReportScreen(copy(ctx).campaign)).toBe(rendered)
+  })
+  it('cannot relabel a pending quest battle as ordinary combat to bypass reward ownership', () => {
+    const ctx = supplies(1, true); due(ctx); const { e, result, reckoning } = battle(ctx)
+    const forged = { ...e, kind: 'engagement.conquer' }; delete forged.questRunId
+    unchanged(ctx, () => applyBattleResult(ctx, forged, result, reckoning), /quest|Engagement|engagement/)
+  })
+  it('report XP exposes the earned level without presenting a defeat or an empty battle party', () => {
+    const ctx = supplies(2); ctx.campaign.roster[H]!.xp = xpForLevel(2)! - 1; due(ctx)
+    Q.performAcknowledgeQuest(ctx, 'test'); expect(ctx.campaign.cursor.step).toBe('levelUp')
+    const html = rewardsScreen(copy(ctx).campaign, [], null)
+    expect(html).toContain(ctx.campaign.roster[H]!.name); expect(html).toContain('LEVEL UP')
+    expect(html).not.toContain('Defeat'); expect(html).not.toContain('nobody was deployed')
+  })
+  it('a report followed by a battle survives both pauses and returns to City only after both outcomes', () => {
+    const ctx = supplies(0, true); Q.performSendQuest(ctx, R, CIVILIANS.map(h => h.id), 'test'); due(ctx)
+    report(ctx); const resumed = copy(ctx); performAdvance(resumed, 'test')
+    expect(resumed.campaign.cursor.step).toBe('prep')
+    const fighting = copy(resumed); playEngagement(fighting, DEFAULTS, 'test')
+    expect(fighting.campaign.quests).toEqual({}); const after = copy(fighting); performAdvance(after, 'test')
+    expect(after.campaign.cursor.stage).toBe('stage.city')
+  })
+  it.each(['classes', 'badges', 'equipped', 'unitType'] as const)('rejects malformed saved rescue %s before any fixed XP or recruitment', field => {
+    const ctx = city(); Q.performSendQuest(ctx, R, party, 'test'); due(ctx)
+    const out = ctx.campaign.quests[R]!.outcome!
+    if (out.kind !== 'report' || !out.rescued) throw new Error('expected rescue report')
+    const payload = out.rescued as unknown as Record<string, unknown>
+    payload[field] = field === 'unitType' ? 'unit.does-not-exist' : null
+    const saved = saveOf(ctx.campaign)
+    unchanged(ctx, () => Q.performAcknowledgeQuest(ctx, 'test'), /./)
+    expect(() => campaignOf(saved)).toThrow(/quest|rescue/i)
   })
 })
diff --git a/test/v2-week.test.ts b/test/v2-week.test.ts
index db9f248..6a95e50 100644
--- a/test/v2-week.test.ts
+++ b/test/v2-week.test.ts
@@ -12,5 +12,5 @@ import { beginStage, beginWeek, performAdvance, tickWeek, canAdvance, listStageO
 import { canCommit, commitmentOf, performCommit, performRelease } from '../src/core/assignments.js'
 import { canAssignLabour, performAssignLabour } from '../src/core/mend.js'
-import { listQuestOffers, performSendQuest } from '../src/core/quests.js'
+import { listQuestOffers, performSendQuest, performAcknowledgeQuest } from '../src/core/quests.js'
 import { makeCtx, setCursor } from '../src/core/mutate.js'
 import { saveOf, campaignOf } from '../src/core/campaign.js'
@@ -66,5 +66,6 @@ describe('V2 Week spine', () => {
     setCursor(ctx, { attack: null }, 'test')
     performAdvance(ctx, 'test')
-    expect(ctx.campaign.cursor).toMatchObject({ fieldStep: 'quests' })
+    expect(ctx.campaign.cursor).toMatchObject({ fieldStep: 'quests', step: 'questReport' })
+    performAcknowledgeQuest(ctx, 'test')
     expect(ctx.campaign.quests['quest.escort']).toBeUndefined()
     expect(ctx.campaign.purse['currency.faith']).toBeGreaterThan(faith)
@@ -118,4 +119,7 @@ describe('V2 continuation and activity boundaries', () => {
     performAdvance(ctx, 'test'); performAdvance(copy, 'test')
     expect(copy.campaign).toEqual(ctx.campaign)
+    expect(copy.campaign.cursor.step).toBe('questReport')
+    performAcknowledgeQuest(ctx, 'test'); performAcknowledgeQuest(copy, 'test')
+    expect(copy.campaign).toEqual(ctx.campaign)
     const paid = { ...copy.campaign.purse }
     const after = makeCtx(campaignOf(saveOf(copy.campaign)))
```
</details>

ISC-047: CLOSED at 9d56fcc
slice: 61 of 68 closed · 61 probed · 1 accepted
IRON GAUNTLET: NOT PASSED — 2 FLAG(S) WARNED

## v2.atlas-battle-view — LANDED `9ba86ee` **NEEDS REVIEW**
2026-09-16 05:37 · engine @ 4ff6e55

  PASS  dependencies landed
  WARN  not already decided — 1 candidate ruling(s) — READ BEFORE ASKING: ..\THREE-PACKAGES-PLAN.md:211
  PASS  typecheck
  PASS  full test suite — 223 passed
  PASS  gate 1 — every claimed criterion holds — ISC-003 — a battle runs from campaign facts through the unmodified engine
  PASS  brought its own tests — test/isc-003.test.ts
  PASS  existing tests untouched
  PASS  kill switch — every claimed probe has been seen red — ISC-003: red on record (2026-09-16 05:29 @ b96e971, probe 871df7fa93a5)
  PASS  nothing regresses — every P-tier probe — 61 P-tier probe(s): 61 green, 0 red, 0 regression(s). 61 of 68 closed · 61 probed · 1 accepted
  PASS  hardcode scan — core knows mechanisms, never names
  PASS  generalizes — the second instance costs zero kingdom code — shape 'adapter' — not a mechanism, exempt
  PASS  naming — new ids use declared kinds
  PASS  naming — no banned words invented
  PASS  engine working tree clean — engine @ 4ff6e55, clean
  PASS  one door to the engine

ISC-003: CLOSED at 9ba86ee
slice: 61 of 68 closed · 61 probed · 1 accepted
IRON GAUNTLET: NOT PASSED — 1 FLAG(S) WARNED

## v2.human-battle-sandbox — LANDED `40da64e` **NEEDS REVIEW**
2026-09-16 08:08 · engine @ 4ff6e55

  PASS  dependencies landed
  PASS  not already decided — no existing ruling matches
  PASS  typecheck
  PASS  full test suite — 231 passed
  PASS  gate 1 — every claimed criterion holds — ISC-069 — a standalone human battle shares engine resolution and replay
  PASS  brought its own tests — test/criteria-docs.test.ts, test/isc-003.test.ts, test/isc-069.test.ts, test/sandbox-ui.test.ts
  WARN  existing tests untouched — DELETED LINES in test/criteria-docs.test.ts (-2), test/isc-003.test.ts (-1) — will land FLAGGED for review
  PASS  kill switch — every claimed probe has been seen red — ISC-069: red on record (2026-09-16 08:06 @ 72e09df, probe 737d2adaadce)
  PASS  nothing regresses — every P-tier probe — 62 P-tier probe(s): 62 green, 0 red, 0 regression(s). 61 of 69 closed · 62 probed · 1 accepted
  PASS  hardcode scan — core knows mechanisms, never names
  PASS  generalizes — the second instance costs zero kingdom code — shape 'adapter' — not a mechanism, exempt
  PASS  naming — new ids use declared kinds
  PASS  naming — no banned words invented
  PASS  engine working tree clean — engine @ 4ff6e55, clean
  PASS  one door to the engine

<details><summary>Existing tests were edited — review this diff</summary>

```diff
diff --git a/test/criteria-docs.test.ts b/test/criteria-docs.test.ts
index 5ad1b6c..1b6d89b 100644
--- a/test/criteria-docs.test.ts
+++ b/test/criteria-docs.test.ts
@@ -11,8 +11,9 @@ describe('the criteria instrument over two documents', () => {
   it('counts the slice and the gear plan together, and each file carries its own header line', () => {
     const total = run('--count').trim()
-    expect(total).toMatch(/^\d+ of 68 closed · \d+ probed · \d+ accepted$/)
+    expect(total).toMatch(/^\d+ of 69 closed · \d+ probed · \d+ accepted$/)
     const slice = readFileSync('../THIN-SLICE-IMPLEMENTATION.md', 'utf8')
     const gear = readFileSync('../GEAR-IMPLEMENTATION.md', 'utf8')
-    expect(slice).toMatch(/\*\*`\d+ of 50 closed · \d+ probed · \d+ accepted`\*\*/)
+    expect(slice).toMatch(/\*\*`\d+ of 51 closed · \d+ probed · \d+ accepted`\*\*/)
+    expect(slice).toContain('### ISC-069 — a standalone human battle shares engine resolution and replay')
     expect(gear).toMatch(/\*\*`\d+ of 18 closed · \d+ probed · \d+ accepted`\*\*/)
     for (let n = 51; n <= 68; n++) expect(gear).toContain(`### ISC-0${n} —`)
diff --git a/test/isc-003.test.ts b/test/isc-003.test.ts
index 4ced129..e58bbbf 100644
--- a/test/isc-003.test.ts
+++ b/test/isc-003.test.ts
@@ -34,5 +34,8 @@ describe('ISC-003 — the engine is reached through one door and never changed',
     const door = readFileSync('src/engine.ts', 'utf8')
     expect(door).not.toMatch(/core\/mutate/)
-    expect(door).not.toMatch(/core\/pipeline/)
+    // Authorized human sandbox (2026-09-16) needs the engine's preview numbers.
+    // Permit that named read-only export only; raw attack execution stays closed.
+    expect(door.match(/^export.*core\/pipeline.*$/gm)).toEqual(["export { preview } from '../../engine/src/core/pipeline.js'"])
+    expect(door).not.toMatch(/export\s*\{[^}]*performAttack/)
   })
 
```
</details>

ISC-069: CLOSED at 40da64e
slice: 62 of 69 closed · 62 probed · 1 accepted
IRON GAUNTLET: NOT PASSED — 1 FLAG(S) WARNED


## 2026-09-16 — committed audit of v2.human-battle-sandbox

Source `40da64e`, bookkeeping `1bb2ddf`, engine `4ff6e55` clean, viewer `e1abdd7` clean.
Independent full suite from committed Kingdom tree: 73 files / 231 passed / 0 failed.
`npm run typecheck` passed. `node tools/slice-gate.mjs --report scratch/sandbox-committed-audit.json`
passed all 62 P probes, no regression; 62 of 69 criteria closed, 1 human criterion accepted.
The built-page UI test is in that suite and drives real bundled listeners, fault locks,
snapshots, replay import and AI completion. No GPU or human visual acceptance claimed.
The landing's historical-test review flag remains; this audit does not grant its seal.

## v2.activation-choice — LANDED `0dec52d` **NEEDS REVIEW**
2026-09-16 08:39 · engine @ 1723e63

  PASS  dependencies landed
  WARN  not already decided — 2 candidate ruling(s) — READ BEFORE ASKING: ..\DOCS.md:100 · ..\DOCS.md:107
  PASS  typecheck
  PASS  full test suite — 233 passed
  PASS  gate 1 — every claimed criterion holds — ISC-069 — a standalone human battle shares engine resolution and replay
  PASS  brought its own tests — test/isc-069.test.ts
  WARN  existing tests untouched — DELETED LINES in test/isc-069.test.ts (-6) — will land FLAGGED for review
  PASS  kill switch — every claimed probe has been seen red — ISC-069: red on record (2026-09-16 08:35 @ d276cb3, probe 64ffa18b2a6e)
  PASS  nothing regresses — every P-tier probe — 62 P-tier probe(s): 62 green, 0 red, 0 regression(s). 62 of 69 closed · 62 probed · 1 accepted
  PASS  hardcode scan — core knows mechanisms, never names
  PASS  generalizes — the second instance costs zero kingdom code — shape 'adapter' — not a mechanism, exempt
  PASS  naming — new ids use declared kinds
  PASS  naming — no banned words invented
  PASS  engine working tree clean — engine @ 1723e63, clean
  PASS  one door to the engine

<details><summary>Existing tests were edited — review this diff</summary>

```diff
diff --git a/test/isc-069.test.ts b/test/isc-069.test.ts
index 60fd2c6..35a3a0b 100644
--- a/test/isc-069.test.ts
+++ b/test/isc-069.test.ts
@@ -4,5 +4,32 @@ import {SANDBOX_DEFAULT} from '../src/content/sandbox.js'
 import {createBattle,runBattle,controllerOf,validateBattleCommand,preview,isAttack} from '../src/engine.js'
 
+function acting(s:ReturnType<typeof createSandbox>){
+ const next=advanceSandbox(s)
+ if(next.kind==='selecting'){expect(commandSandbox(s,{kind:'select-activation',unitUid:next.unitUids[0],expectedSeq:s.ctx.state.seq}).ok).toBe(true);const active=advanceSandbox(s);if(active.kind==='selecting')throw Error('selection did not begin');return active}
+ return next
+}
+
 describe('ISC-069 — a human battle uses the simulation engine',()=>{
+ it('offers the default three heroes before activation and can choose an unblocked hero in a different order',()=>{
+  const s=createSandbox(SANDBOX_DEFAULT),next=advanceSandbox(s)
+  expect(next.kind).toBe('selecting');if(next.kind!=='selecting')throw Error('expected selection')
+  expect(next.unitUids).toHaveLength(3);expect(s.ctx.events.some(e=>e.type==='activation.begin')).toBe(false)
+  const before=saveSandbox(s),uid=next.unitUids[2]!,chosen=s.ctx.state.units.find(u=>u.uid===uid)!
+  expect(commandSandbox(s,{kind:'select-activation',unitUid:uid,expectedSeq:s.ctx.state.seq-1}).ok).toBe(false);expect(saveSandbox(s)).toBe(before)
+  expect(commandSandbox(s,{kind:'select-activation',unitUid:uid,expectedSeq:s.ctx.state.seq}).ok).toBe(true)
+  expect(s.ctx.battleCursor!.actor).toBe(chosen.id);expect(sandboxChoices(s).length).toBeGreaterThan(0)
+  expect(s.ctx.events.filter(e=>e.type==='activation.begin').map(e=>e.actor)).toEqual([chosen.id])
+  expect(commandSandbox(s,{kind:'end-cycle',actor:chosen.id,expectedSeq:s.ctx.state.seq}).ok).toBe(true)
+  const remaining=advanceSandbox(s);expect(remaining.kind).toBe('selecting');if(remaining.kind!=='selecting')throw Error('expected remaining')
+  expect(remaining.unitUids).not.toContain(uid);expect(commandSandbox(s,{kind:'select-activation',unitUid:remaining.unitUids[0],expectedSeq:s.ctx.state.seq}).ok).toBe(true)
+  expect(s.ctx.events.filter(e=>e.type==='activation.begin').map(e=>e.actor)).toEqual([chosen.id,0])
+ })
+ it('preserves pending hero selection across save/resume with exact events and RNG',()=>{
+  const a=createSandbox(SANDBOX_DEFAULT);expect(advanceSandbox(a).kind).toBe('selecting');const b=restoreSandbox(saveSandbox(a))
+  expect(advanceSandbox(b)).toEqual(advanceSandbox(a));expect(a.ctx.events).toEqual(b.ctx.events)
+  const command={kind:'select-activation',unitUid:a.policy.humanUnitUids[1],expectedSeq:a.ctx.state.seq}
+  expect(commandSandbox(a,command)).toEqual({ok:true});expect(commandSandbox(b,command)).toEqual({ok:true})
+  expect(a.ctx.events).toEqual(b.ctx.events);expect(a.ctx.state).toEqual(b.ctx.state);expect(a.ctx.rng.log).toEqual(b.ctx.rng.log)
+ })
  it('starts deterministically on each authored area with exact kits, disjoint slots and stable owners',()=>{
   for(const mapId of ['showcase.atlas-priory','showcase.atlas-angled-halls','showcase.atlas-buried-pilgrimage']){
@@ -15,5 +42,5 @@ describe('ISC-069 — a human battle uses the simulation engine',()=>{
  })
  it('enumerates only engine-legal choices with authoritative previews and rejects duplicate sequence commands',()=>{
-  const s=createSandbox({...SANDBOX_DEFAULT,heroes:[SANDBOX_DEFAULT.heroes[0]!]});advanceSandbox(s);const before=s.ctx.events.length
+  const s=createSandbox({...SANDBOX_DEFAULT,heroes:[SANDBOX_DEFAULT.heroes[0]!]});acting(s);const before=s.ctx.events.length
   const choices=sandboxChoices(s);expect(choices.length).toBeGreaterThan(0);expect(s.ctx.events.length).toBe(before)
   for(const choice of choices){expect(validateBattleCommand(s.ctx,s.policy,choice.command).ok).toBe(true)
@@ -24,18 +51,18 @@ describe('ISC-069 — a human battle uses the simulation engine',()=>{
  })
  it('end activation advances AI, ownership never follows changed allegiance, and wrong actors are refused',()=>{
-  const s=createSandbox(SANDBOX_DEFAULT);const step=advanceSandbox(s);expect(step.kind).toBe('acting')
+  const s=createSandbox(SANDBOX_DEFAULT);const step=acting(s);expect(step.kind).toBe('acting')
   if(step.kind!=='acting')throw Error('expected hero')
   const actor=s.ctx.state.units[step.actor]!;actor.side='enemy';expect(controllerOf(s.ctx,actor.id,s.policy)).toBe('human');actor.side='hero'
   const enemy=s.ctx.state.units.find(u=>!s.policy.humanUnitUids.includes(u.uid))!;enemy.side='hero';expect(controllerOf(s.ctx,enemy.id,s.policy)).toBe('ai');enemy.side='enemy'
   expect(commandSandbox(s,{kind:'end-cycle',actor:enemy.id,expectedSeq:s.ctx.state.seq}).ok).toBe(false)
-  for(let n=0;n<15&&!s.ctx.events.some(e=>e.type==='ai.mode');n++){const next=advanceSandbox(s);if(next.kind==='complete')break;expect(commandSandbox(s,{kind:'end-cycle',actor:next.actor,expectedSeq:s.ctx.state.seq}).ok).toBe(true)}
+  for(let n=0;n<15&&!s.ctx.events.some(e=>e.type==='ai.mode');n++){const next=acting(s);if(next.kind==='complete')break;expect(commandSandbox(s,{kind:'end-cycle',actor:next.actor,expectedSeq:s.ctx.state.seq}).ok).toBe(true)}
   expect(s.ctx.events.some(e=>e.type==='ai.mode')).toBe(true)
  })
  it('an actual legal attack exposes the exact engine preview without consuming a roll',()=>{
-  const s=createSandbox({...SANDBOX_DEFAULT,heroes:[SANDBOX_DEFAULT.heroes[0]!],enemies:['unit.zombie']});advanceSandbox(s)
+  const s=createSandbox({...SANDBOX_DEFAULT,heroes:[SANDBOX_DEFAULT.heroes[0]!],enemies:['unit.zombie']});acting(s)
   let attack
   for(let n=0;n<15&&!s.ctx.state.outcome;n++){
+   const step=acting(s);if(step.kind==='complete')break
    attack=sandboxChoices(s).find(c=>isAttack(s.ctx.actions[c.command.actionId]!));if(attack)break
-   const step=advanceSandbox(s);if(step.kind==='complete')break
    commandSandbox(s,{kind:'end-cycle',actor:step.actor,expectedSeq:s.ctx.state.seq})
   }
@@ -49,5 +76,5 @@ describe('ISC-069 — a human battle uses the simulation engine',()=>{
  })
  it('engine snapshot resumes identical commands, events, RNG and frozen presentation; malformed save is rejected',()=>{
-  const a=createSandbox({...SANDBOX_DEFAULT,heroes:[SANDBOX_DEFAULT.heroes[0]!]});advanceSandbox(a);const saved=saveSandbox(a),b=restoreSandbox(saved)
+  const a=createSandbox({...SANDBOX_DEFAULT,heroes:[SANDBOX_DEFAULT.heroes[0]!]});acting(a);const saved=saveSandbox(a),b=restoreSandbox(saved)
   expect(exportSandbox(a)).toEqual(exportSandbox(b))
   const choice=sandboxChoices(a)[0]!;expect(commandSandbox(a,choice.command)).toEqual(commandSandbox(b,choice.command))
```
</details>

ISC-069: CLOSED at 0dec52d
slice: 62 of 69 closed · 62 probed · 1 accepted
IRON GAUNTLET: NOT PASSED — 2 FLAG(S) WARNED


## 2026-09-16 — committed audit of v2.activation-choice

Source 0dec52d, bookkeeping 1db65a5, clean engine 1723e63. Independent npm test
JSON report: 73 files / 233 passed / zero failures. Typecheck passed;
slice-gate --report passed all 62 P probes with zero regressions. Built UI
drives default three-hero alternate order, unblocked selection, pending save,
playback/fault locks, actual human replay import and engine-resolved outcome.
Two landing warning categories remain; this audit grants no seal or human/GPU
acceptance. Engine and viewer rules are not duplicated in the host.

## v2.elemental-display — LANDED `a4ef27d` **NEEDS REVIEW**
2026-09-16 09:28 · engine @ 6bb36dc

  PASS  dependencies landed
  WARN  not already decided — 2 candidate ruling(s) — READ BEFORE ASKING: ..\DOCS.md:109 · ..\THREE-PACKAGES-PLAN.md:211
  PASS  typecheck
  PASS  full test suite — 234 passed
  PASS  gate 1 — every claimed criterion holds — ISC-069 — a standalone human battle shares engine resolution and replay
  PASS  brought its own tests — test/isc-069.test.ts
  PASS  existing tests untouched
  PASS  kill switch — every claimed probe has been seen red — ISC-069: red on record (2026-09-16 09:28 @ 8fdb217, probe 1414970fc7f4)
  PASS  nothing regresses — every P-tier probe — 62 P-tier probe(s): 62 green, 0 red, 0 regression(s). 61 of 69 closed · 62 probed · 1 accepted
  PASS  hardcode scan — core knows mechanisms, never names
  PASS  generalizes — the second instance costs zero kingdom code — shape 'adapter' — not a mechanism, exempt
  PASS  naming — new ids use declared kinds
  PASS  naming — no banned words invented
  PASS  engine working tree clean — engine @ 6bb36dc, clean
  PASS  one door to the engine

ISC-069: CLOSED at a4ef27d
slice: 61 of 69 closed · 62 probed · 1 accepted
IRON GAUNTLET: NOT PASSED — 1 FLAG(S) WARNED
