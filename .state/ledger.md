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
