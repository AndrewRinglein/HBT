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
