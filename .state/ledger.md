# Run ledger

Appended by `tools/gate.mjs`. Every attempt is recorded — landed or reverted.


## status.poison — REVERTED
2026-08-09 08:07

  PASS  dependencies landed
  PASS  typecheck
  FAIL  full test suite — 86 passed, 3 FAILED
  PASS  gate 1 — the id appears in a real battle — 3454 log lines, 3454 fired, 3454 changed state
  PASS  brought its own tests — test/status.test.ts
  PASS  existing tests untouched
  PASS  baseline unchanged on the open map — blessed (first run)

## status.poison — LANDED `ae42a01` **NEEDS REVIEW**
2026-08-09 08:12

  PASS  dependencies landed
  PASS  typecheck
  PASS  full test suite — 91 passed
  PASS  gate 1 — the id appears in a real battle — 3454 log lines, 3454 fired, 3454 changed state
  PASS  brought its own tests — test/audit.test.ts, test/integration.test.ts, test/status.test.ts
  WARN  existing tests untouched — DELETED LINES in test/integration.test.ts (-5) — will land FLAGGED for review
  PASS  control battle unchanged

<details><summary>Existing tests were edited — review this diff</summary>

```diff
diff --git a/test/audit.test.ts b/test/audit.test.ts
index 33a28f2..12f08c5 100644
--- a/test/audit.test.ts
+++ b/test/audit.test.ts
@@ -98,4 +98,11 @@ describe('independent audit of logged battles', () => {
 
           case 'damage.applied': {
+            // Status ticks are damage with no attack and no attacker.
+            if (e.causeId.startsWith('status.')) {
+              expect(e.actor, 'status damage has no attacker').toBeNull()
+              expect(e['amount'] as number).toBeGreaterThanOrEqual(0)
+              pending = null; pendingPower = null
+              break
+            }
             if (pendingPower) {
               const at = UNITS[type.get(pendingPower.actor)!]!
diff --git a/test/integration.test.ts b/test/integration.test.ts
index a2d8b8f..2c053fe 100644
--- a/test/integration.test.ts
+++ b/test/integration.test.ts
@@ -64,6 +64,9 @@ describe('gate 1 — everything appears in the log', () => {
   })
 
-  it('FINDING: a kiting ranger is untouchable on open ground (move 5 vs 4)', () => {
-    let rangerDamage = 0
+  it('kiting works: a ranger takes far less damage than a warrior', () => {
+    // A RULE, not a snapshot. The exact figure is a finding and belongs in the
+    // sweep report — asserting it here makes the suite fail every time the game
+    // legitimately changes.
+    const dmg: Record<string, number> = {}
     for (let r = 0; r < 100; r++) {
       const ctx = createBattle({ replicate: r }); runBattle(ctx)
@@ -71,9 +74,12 @@ describe('gate 1 — everything appears in the log', () => {
       for (const e of ctx.events) {
         if (e.type === 'unit.enter') type.set(e.actor!, e['typeId'] as string)
-        if (e.type === 'damage.applied' && type.get(e.target!) === 'ranger') rangerDamage += e['amount'] as number
+        if (e.type === 'damage.applied') {
+          const t = type.get(e.target!) ?? '?'
+          dmg[t] = (dmg[t] ?? 0) + (e['amount'] as number)
+        }
       }
     }
-    // Documented, not asserted as desirable: 5 movement outruns 4, forever.
-    expect(rangerDamage).toBe(0)
+    expect(dmg['warrior']).toBeGreaterThan(0)
+    expect(dmg['ranger'] ?? 0).toBeLessThan(dmg['warrior']! / 10)
   })
 
```
</details>

## status.burn — LANDED `f7e2041`
2026-08-09 08:14

  PASS  dependencies landed
  PASS  typecheck
  PASS  full test suite — 95 passed
  PASS  gate 1 — the id appears in a real battle — 1704 log lines, 1704 fired, 1704 changed state
  PASS  brought its own tests — test/status.test.ts
  PASS  existing tests untouched
  PASS  control battle unchanged — re-blessed — this item DECLARED it changes the control battle (3ca8bcab -> 2fb265a1)

---
## 2026-08-09 — map ids namespaced (`ridge` → `map.ridge`)

Baseline re-blessed **2fb265a1 → 08392339**. Label-only, proven not asserted:
the 25-battle control log is byte-identical once `"mapId":"map.open"` is
substituted back to `"mapId":"open"` (`diff` = 0 lines).

Also fixed at the same time: `map.loaded` was emitting `causeId: \`map.${mapId}\``,
which is *why* the ids were bare — the prefix was being bolted on at the emit
site. Namespacing the id and removing the template stopped it reading
`map.map.open`.

**Finding worth keeping:** the stat pipeline landed with the baseline hash
unchanged, and I read that as proof it was behaviour-neutral. It was weaker
proof than that. The control map is `map.open` — **zero terrain, therefore zero
terrain modifiers, therefore no ledger rows for the baseline to notice.** The
control map is blind to the entire terrain path by construction. Behaviour
neutrality there was established by the 118 tests, not by the hash.
Split the baseline: a second hash on `map.ridge` would have covered it.

## terrain.kinds — LANDED `92bb6e5`
2026-08-14 22:12

  PASS  dependencies landed
  PASS  typecheck
  PASS  full test suite — 127 passed
  PASS  gate 1 — the id appears in a real battle — NEUTRAL — 4 ids present, none changed state
  PASS  brought its own tests — test/terrain.test.ts
  PASS  existing tests untouched
  PASS  control battles unchanged — re-blessed — this item DECLARED it changes the control battles: map.open fed687ad->9385811f, map.ridge 9f243cac->ad151d26, map.flanks eaa096cb->8867b503, map.highlands 4c71eb68->9a6ad9b4, map.field 41ca42db->d0701a01

## terrain.movecost — LANDED `013a373` **NEEDS REVIEW**
2026-08-14 22:15

  PASS  dependencies landed
  PASS  typecheck
  PASS  full test suite — 134 passed
  PASS  gate 1 — the id appears in a real battle — terrain.forest: 1582 log lines, 1582 fired, 1507 changed state · terrain.rocky: 2003 log lines, 2003 fired, 1928 changed state · terrain.water: 590 log lines, 590 fired, 515 changed state
  PASS  brought its own tests — test/terrain.test.ts
  WARN  existing tests untouched — DELETED LINES in test/terrain.test.ts (-5) — will land FLAGGED for review
  PASS  control battles unchanged — re-blessed — this item DECLARED it changes the control battles: map.open 9385811f->dddddc9d, map.ridge ad151d26->a84293a8, map.flanks 8867b503->86ef863b, map.highlands 9a6ad9b4->3b50dcc2, map.field d0701a01->c18e9e63

<details><summary>Existing tests were edited — review this diff</summary>

```diff
diff --git a/test/terrain.test.ts b/test/terrain.test.ts
index 45cab08..f080a9a 100644
--- a/test/terrain.test.ts
+++ b/test/terrain.test.ts
@@ -1,7 +1,8 @@
 import { describe, it, expect } from 'vitest'
-import { MAPS, terrainOf, GLYPH, terrainIdOf, moveCostOf } from '../src/content/maps.js'
-import { createCustomBattle } from '../src/core/setup.js'
+import { MAPS, terrainOf, GLYPH, terrainIdOf, moveCostOf, MOVE_COST, IMPASSABLE } from '../src/content/maps.js'
+import { createBattle, createCustomBattle } from '../src/core/setup.js'
+import { runBattle } from '../src/core/battle.js'
 import { effective, terrainMods } from '../src/core/stats.js'
-import { stepCost } from '../src/core/movement.js'
+import { stepCost, reachable } from '../src/core/movement.js'
 import { hexId } from '../src/core/hex.js'
 import { TERRAIN } from '../src/core/types.js'
@@ -55,6 +56,14 @@ describe('terrain.kinds — the new kinds carry no rules yet', () => {
   const STATS: StatName[] = ['accuracy', 'dodge', 'armor', 'resist', 'reach', 'movement']
 
-  it('every new kind costs the same to enter as open ground', () => {
-    for (const t of NEW_KINDS) expect(moveCostOf(t)).toBe(moveCostOf(TERRAIN.OPEN))
+  // RETIRED by terrain.movecost, deliberately. While terrain.kinds was the only
+  // item landed, every new kind cost the same as open ground — that was the whole
+  // claim. terrain.movecost is the item that changes it, so the assertion is now
+  // historical rather than wrong. What survives is the part movecost does NOT
+  // touch: the new kinds still grant no STAT modifiers. (Law 10: written reason.)
+  it('the new kinds still grant no stat modifiers — movecost changed cost, not stats', () => {
+    for (const t of NEW_KINDS) {
+      const { ctx, u } = warriorOn(t)
+      expect(terrainMods(ctx, u).filter(m => m.stat !== 'movement')).toEqual([])
+    }
   })
 
@@ -87,2 +96,79 @@ describe('terrain.kinds — the new kinds carry no rules yet', () => {
   })
 })
+
+// ─── terrain.movecost ────────────────────────────────────────────────────────
+describe('terrain.movecost — rough ground costs more', () => {
+  it('every terrain kind has an explicit cost, none fall through to a default', () => {
+    for (const t of ALL_KINDS) expect(MOVE_COST[t]).toBeDefined()
+  })
+
+  it('rough ground costs 2, open costs 1, water costs more than both', () => {
+    expect(moveCostOf(TERRAIN.OPEN)).toBe(1)
+    for (const t of [TERRAIN.HILLS, TERRAIN.FOREST, TERRAIN.ROCKY, TERRAIN.ROCKY_HILLS])
+      expect(moveCostOf(t)).toBe(2)
+    expect(moveCostOf(TERRAIN.WATER)).toBeGreaterThan(2)
+  })
+
+  it('the same unit reaches strictly fewer hexes on map.field than on open ground', () => {
+    const open = createCustomBattle([{ type: 'warrior', hex: hexId(5, 5) }],
+      [{ type: 'zombie', hex: hexId(0, 0) }], { mapId: 'map.open' })
+    const field = createCustomBattle([{ type: 'warrior', hex: hexId(5, 5) }],
+      [{ type: 'zombie', hex: hexId(0, 0) }], { mapId: 'map.field' })
+    for (const c of [open, field]) c.state.units[0]!.movePointsLeft = c.state.units[0]!.movement
+    expect(reachable(field, field.state.units[0]!).size)
+      .toBeLessThan(reachable(open, open.state.units[0]!).size)
+  })
+
+  // I first asserted "a slower unit loses proportionally more to rough ground".
+  // That is an intuition, and the engine says it is FALSE: at move 4 the loss is
+  // 48%, at move 6 it is 53%. A bigger budget reaches further into the outer ring,
+  // and on this map the rough ground is out there — so the fast unit loses more of
+  // what it would otherwise have gained. Asserting it would have been a finding
+  // wearing a rule's clothes, the same mistake as expect(rangerDamage).toBe(0).
+  //
+  // The RULE that is actually true, and is what cost means: reaching any given hex
+  // never becomes cheaper on rough ground.
+  it('rough ground never makes a hex cheaper to reach than open ground does', () => {
+    const mk = (mapId: string) => {
+      const c = createCustomBattle([{ type: 'warrior', hex: hexId(5, 5) }],
+        [{ type: 'zombie', hex: hexId(0, 0) }], { mapId })
+      c.state.units[0]!.movePointsLeft = 12
+      return reachable(c, c.state.units[0]!)
+    }
+    const open = mk('map.open'), field = mk('map.field')
+    let compared = 0
+    for (const [hex, node] of field) {
+      const o = open.get(hex)
+      if (!o) continue
+      expect(node.cost).toBeGreaterThanOrEqual(o.cost)
+      compared++
+    }
+    expect(compared).toBeGreaterThan(40)
+  })
+
+  it('nothing is impassable yet — IMPASSABLE exists but no terrain uses it', () => {
+    expect(IMPASSABLE).toBeGreaterThan(50)
+    for (const t of ALL_KINDS) expect(moveCostOf(t)).toBeLessThan(IMPASSABLE)
+  })
+})
+
+describe('terrain.movecost — the log says what was paid for', () => {
+  it('every moved event names the terrain entered, not just a number', () => {
+    const ctx = createBattle({ replicate: 4, enemyCount: 8, mapId: 'map.field' })
+    runBattle(ctx)
+    const moves = ctx.events.filter(e => e.type === 'moved')
+    expect(moves.length).toBeGreaterThan(20)
+    for (const m of moves) {
+      expect(m['terrain'], 'a move with no terrain is a cost nobody can check').toMatch(/^terrain\./)
+      expect(m['cost']).toBe(moveCostOf(ctx.state.terrain[m['to'] as number]!))
+    }
+  })
+
+  it('rough hexes really are being entered — the map is not decorative', () => {
+    const ctx = createBattle({ replicate: 4, enemyCount: 8, mapId: 'map.field' })
+    runBattle(ctx)
+    const kinds = new Set(ctx.events.filter(e => e.type === 'moved').map(e => e['terrain']))
+    expect(kinds.size).toBeGreaterThan(1)
+    expect([...kinds].some(k => k !== 'terrain.open')).toBe(true)
+  })
+})
```
</details>

## terrain.passable — LANDED `b6da318` **NEEDS REVIEW**
2026-08-14 22:17

  PASS  dependencies landed
  PASS  typecheck
  PASS  full test suite — 140 passed
  PASS  gate 1 — the id appears in a real battle — NEUTRAL — 1 ids present, none changed state
  PASS  brought its own tests — test/terrain.test.ts
  WARN  existing tests untouched — DELETED LINES in test/terrain.test.ts (-4) — will land FLAGGED for review
  PASS  control battles unchanged — re-blessed — this item DECLARED it changes the control battles: map.thicket ?->eac4b33a, map.thicket NEW

<details><summary>Existing tests were edited — review this diff</summary>

```diff
diff --git a/test/terrain.test.ts b/test/terrain.test.ts
index f080a9a..850a0e0 100644
--- a/test/terrain.test.ts
+++ b/test/terrain.test.ts
@@ -1,8 +1,8 @@
 import { describe, it, expect } from 'vitest'
-import { MAPS, terrainOf, GLYPH, terrainIdOf, moveCostOf, MOVE_COST, IMPASSABLE } from '../src/content/maps.js'
+import { MAPS, terrainOf, GLYPH, terrainIdOf, moveCostOf, MOVE_COST, IMPASSABLE, isPassable } from '../src/content/maps.js'
 import { createBattle, createCustomBattle } from '../src/core/setup.js'
 import { runBattle } from '../src/core/battle.js'
 import { effective, terrainMods } from '../src/core/stats.js'
-import { stepCost, reachable } from '../src/core/movement.js'
+import { stepCost, reachable, pathTo } from '../src/core/movement.js'
 import { hexId } from '../src/core/hex.js'
 import { TERRAIN } from '../src/core/types.js'
@@ -147,7 +147,14 @@ describe('terrain.movecost — rough ground costs more', () => {
   })
 
-  it('nothing is impassable yet — IMPASSABLE exists but no terrain uses it', () => {
+  // RETIRED by terrain.passable. While movecost was the newest item, IMPASSABLE
+  // existed but nothing used it — that was the claim. terrain.passable is the item
+  // that makes obstacles use it. What survives is the part that stays true: every
+  // terrain a unit can actually walk on costs a payable amount. (Law 10.)
+  it('every passable terrain costs a payable amount', () => {
     expect(IMPASSABLE).toBeGreaterThan(50)
-    for (const t of ALL_KINDS) expect(moveCostOf(t)).toBeLessThan(IMPASSABLE)
+    for (const t of ALL_KINDS) {
+      if (isPassable(t)) expect(moveCostOf(t)).toBeLessThan(IMPASSABLE)
+      else expect(moveCostOf(t)).toBe(IMPASSABLE)
+    }
   })
 })
@@ -173,2 +180,62 @@ describe('terrain.movecost — the log says what was paid for', () => {
   })
 })
+
+// ─── terrain.passable ────────────────────────────────────────────────────────
+describe('terrain.passable — a wall is a wall', () => {
+  it('obstacles are impassable; everything else is not', () => {
+    expect(isPassable(TERRAIN.OBSTACLE)).toBe(false)
+    for (const t of ALL_KINDS) if (t !== TERRAIN.OBSTACLE) expect(isPassable(t)).toBe(true)
+    expect(moveCostOf(TERRAIN.OBSTACLE)).toBe(IMPASSABLE)
+  })
+
+  it('map.thicket actually contains obstacles — otherwise this item proves nothing', () => {
+    const t = terrainOf('map.thicket')
+    expect(t.filter(x => x === TERRAIN.OBSTACLE).length).toBeGreaterThan(0)
+  })
+
+  it('reachable() never offers an obstacle, and pathTo never routes through one', () => {
+    const ctx = createCustomBattle([{ type: 'warrior', hex: hexId(3, 12) }],
+      [{ type: 'zombie', hex: hexId(0, 0) }], { mapId: 'map.thicket' })
+    const u = ctx.state.units[0]!
+    u.movePointsLeft = 12
+    const reach = reachable(ctx, u)
+    for (const [hex] of reach) expect(ctx.state.terrain[hex]).not.toBe(TERRAIN.OBSTACLE)
+    for (const [hex] of reach) {
+      for (const step of pathTo(reach, u.hex, hex)) expect(ctx.state.terrain[step]).not.toBe(TERRAIN.OBSTACLE)
+    }
+  })
+
+  it('no unit enters an obstacle across 60 real battles', () => {
+    let entered = 0, moves = 0
+    for (let r = 0; r < 60; r++) {
+      const ctx = createBattle({ replicate: r, enemyCount: 8, mapId: 'map.thicket' })
+      runBattle(ctx)
+      for (const e of ctx.events) {
+        if (e.type !== 'moved') continue
+        moves++
+        if (ctx.state.terrain[e['to'] as number] === TERRAIN.OBSTACLE) entered++
+      }
+    }
+    expect(moves).toBeGreaterThan(500)
+    expect(entered).toBe(0)
+  })
+
+  it('battles on the obstacle map still end — a wall must not strand the AI', () => {
+    let capped = 0
+    for (let r = 0; r < 60; r++) {
+      const ctx = createBattle({ replicate: r, enemyCount: 8, mapId: 'map.thicket' })
+      runBattle(ctx)
+      if (ctx.state.outcome === 'capped') capped++
+    }
+    expect(capped).toBe(0)
+  })
+
+  it('deployment refuses to place a unit inside a wall, loudly', () => {
+    const walled = { id: 'map.walled', name: 'x', note: '',
+      rows: ['xxxxxxxxxxxx', ...Array(11).fill('............')] }
+    ;(MAPS as unknown as object[]).push(walled)
+    expect(() => createBattle({ replicate: 0, mapId: 'map.walled' }))
+      .toThrow(/no passable hex on the enemy deployment row/)
+    ;(MAPS as unknown as object[]).pop()
+  })
+})
```
</details>

## terrain.modifiers — LANDED `be0cbb2` **NEEDS REVIEW**
2026-08-14 22:19

  PASS  dependencies landed
  PASS  typecheck
  PASS  full test suite — 146 passed
  PASS  gate 1 — the id appears in a real battle — terrain.forest: 1844 log lines, 1844 fired, 1694 changed state · terrain.water: 1304 log lines, 1304 fired, 1154 changed state · terrain.rocky: 2127 log lines, 2127 fired, 1977 changed state
  PASS  brought its own tests — test/terrain.test.ts
  WARN  existing tests untouched — DELETED LINES in test/terrain.test.ts (-19) — will land FLAGGED for review
  PASS  control battles unchanged — re-blessed — this item DECLARED it changes the control battles: map.field c18e9e63->fefa0575, map.thicket eac4b33a->446e6134

<details><summary>Existing tests were edited — review this diff</summary>

```diff
diff --git a/test/terrain.test.ts b/test/terrain.test.ts
index 850a0e0..5c1601e 100644
--- a/test/terrain.test.ts
+++ b/test/terrain.test.ts
@@ -6,4 +6,6 @@ import { effective, terrainMods } from '../src/core/stats.js'
 import { stepCost, reachable, pathTo } from '../src/core/movement.js'
 import { hexId } from '../src/core/hex.js'
+import { resolveAccuracy } from '../src/core/pipeline.js'
+import { ATTACKS } from '../src/content/index.js'
 import { TERRAIN } from '../src/core/types.js'
 import type { StatName } from '../src/core/stats.js'
@@ -56,27 +58,25 @@ describe('terrain.kinds — the new kinds carry no rules yet', () => {
   const STATS: StatName[] = ['accuracy', 'dodge', 'armor', 'resist', 'reach', 'movement']
 
-  // RETIRED by terrain.movecost, deliberately. While terrain.kinds was the only
-  // item landed, every new kind cost the same as open ground — that was the whole
-  // claim. terrain.movecost is the item that changes it, so the assertion is now
-  // historical rather than wrong. What survives is the part movecost does NOT
-  // touch: the new kinds still grant no STAT modifiers. (Law 10: written reason.)
-  it('the new kinds still grant no stat modifiers — movecost changed cost, not stats', () => {
-    for (const t of NEW_KINDS) {
-      const { ctx, u } = warriorOn(t)
-      expect(terrainMods(ctx, u).filter(m => m.stat !== 'movement')).toEqual([])
-    }
+  // RETIRED, twice, and the pattern is worth naming.
+  //
+  // terrain.kinds was PLUMBING: its claim was "these five kinds exist and change
+  // nothing". terrain.movecost retired the cost half of that claim; terrain.modifiers
+  // retired the stat half. Each successor item is the one thing allowed to break the
+  // predecessor's neutrality assertion, and it says so in writing (Law 10).
+  //
+  // What survives is the claim no later item is allowed to break: an OBSTACLE grants
+  // nothing, because nothing can ever stand on one.
+  it('an obstacle grants no modifiers — nothing can stand on it to receive them', () => {
+    const { ctx, u } = warriorOn(TERRAIN.OBSTACLE)
+    expect(terrainMods(ctx, u)).toEqual([])
   })
 
-  it('every new kind grants exactly the modifiers open ground grants — none', () => {
+  // RETIRED by terrain.modifiers — see the note above. The surviving claim is that
+  // OPEN GROUND is the neutral element: it grants nothing, and every other terrain
+  // is measured as a difference from it. That stays true no matter what lands next.
+  it('open ground is the neutral element every other terrain is measured against', () => {
     const { ctx: openCtx, u: openU } = warriorOn(TERRAIN.OPEN)
     expect(terrainMods(openCtx, openU)).toEqual([])
-    for (const t of NEW_KINDS) {
-      const { ctx, u } = warriorOn(t)
-      expect(terrainMods(ctx, u), `terrain ${terrainIdOf(t)} should grant nothing yet`).toEqual([])
-      for (const s of STATS) {
-        expect(effective(ctx, u, s).value, `${terrainIdOf(t)} changed ${s}`)
-          .toBe(effective(openCtx, openU, s).value)
-      }
-    }
+    for (const s of STATS) expect(effective(openCtx, openU, s).value).toBe(effective(openCtx, openU, s).base)
   })
 
@@ -240,2 +240,63 @@ describe('terrain.passable — a wall is a wall', () => {
   })
 })
+
+// ─── terrain.modifiers ───────────────────────────────────────────────────────
+describe('terrain.modifiers — the ground is just another modifier', () => {
+  it('forest gives cover, water hurts, high ground helps — through the stat pipeline', () => {
+    const base = warriorOn(TERRAIN.OPEN)
+    const b = (s: StatName) => effective(base.ctx, base.u, s).value
+    const on = (t: number, s: StatName) => { const { ctx, u } = warriorOn(t); return effective(ctx, u, s).value }
+
+    expect(on(TERRAIN.FOREST, 'dodge') - b('dodge')).toBe(10)
+    expect(on(TERRAIN.FOREST, 'armor') - b('armor')).toBe(1)
+    expect(on(TERRAIN.ROCKY, 'dodge') - b('dodge')).toBe(5)
+    expect(on(TERRAIN.WATER, 'accuracy') - b('accuracy')).toBe(-10)
+    expect(on(TERRAIN.ROCKY_HILLS, 'accuracy') - b('accuracy')).toBe(10)
+    expect(on(TERRAIN.ROCKY_HILLS, 'reach') - b('reach')).toBe(2)
+  })
+
+  it('every terrain modifier names itself in the ledger', () => {
+    for (const t of [TERRAIN.FOREST, TERRAIN.ROCKY, TERRAIN.WATER, TERRAIN.ROCKY_HILLS]) {
+      const { ctx, u } = warriorOn(t)
+      const rows = terrainMods(ctx, u)
+      expect(rows.length).toBeGreaterThan(0)
+      for (const m of rows) expect(m.source).toBe(terrainIdOf(t))
+    }
+  })
+
+  it('a modifier is still DERIVED — stepping off the ground drops it', () => {
+    const { ctx, u } = warriorOn(TERRAIN.FOREST)
+    expect(effective(ctx, u, 'dodge').value).toBeGreaterThan(0)
+    ctx.state.terrain[u.hex] = TERRAIN.OPEN
+    expect(effective(ctx, u, 'dodge').value).toBe(0)
+    expect(terrainMods(ctx, u)).toEqual([])
+  })
+
+  it('cover actually lands in a real fight — a forest target is harder to hit', () => {
+    const ctx = createCustomBattle([{ type: 'ranger', hex: hexId(5, 5) }],
+      [{ type: 'zombie', hex: hexId(5, 8) }], { mapId: 'map.open' })
+    const [r, z] = [ctx.state.units[0]!, ctx.state.units[1]!]
+    const open = resolveAccuracy(ctx, r, z, ATTACKS['attack.ranger.bow']!).value
+    ctx.state.terrain[z.hex] = TERRAIN.FOREST
+    const wooded = resolveAccuracy(ctx, r, z, ATTACKS['attack.ranger.bow']!).value
+    expect(open - wooded).toBe(10)
+  })
+
+  it('no new pipeline station was added — terrain rides the stat pipeline', () => {
+    const ctx = createCustomBattle([{ type: 'ranger', hex: hexId(5, 5) }],
+      [{ type: 'zombie', hex: hexId(5, 8) }], { mapId: 'map.open' })
+    ctx.state.terrain[ctx.state.units[0]!.hex] = TERRAIN.WATER
+    const led = resolveAccuracy(ctx, ctx.state.units[0]!, ctx.state.units[1]!, ATTACKS['attack.ranger.bow']!).ledger
+    expect(led.some(r => r.name === 'TERRAIN')).toBe(false)
+    expect(led.some(r => r.effectId === 'terrain.water')).toBe(true)
+  })
+
+  it('only maps that CONTAIN the new terrain are affected', () => {
+    // map.open and map.ridge hold nothing but open ground and hills, whose values
+    // did not change — so a terrain-modifier item must leave them alone entirely.
+    for (const mapId of ['map.open', 'map.ridge']) {
+      const kinds = new Set(terrainOf(mapId))
+      for (const k of kinds) expect([TERRAIN.OPEN, TERRAIN.HILLS]).toContain(k)
+    }
+  })
+})
```
</details>


---

# ⚠ FINDINGS STRUCK — 2026-08-14

Everything below this line that reads as a balance finding is **void**. It was
computed from content this session invented, not from published design.

| Struck | Why |
|---|---|
| "terrain swings hero win rate 18% → 41% → 30%" | move costs were mine, not §1.1's |
| "water at cost 3 is a hero win button (95%)" | water is cost 2 in `GROUND-REQUIREMENTS.md` §1.1 |
| "symmetric cover favours the outnumbering side" | derived from a +10 dodge on rocky that §1.1 never specified |
| "move cost is the strongest ranged-vs-melee lever" | the ratio measured was between two invented numbers |
| "Massive Strike is dead content" | Massive Strike itself is invented — `attack.warrior.massive` has no published source |
| "the Mage staff is a worse Ranger bow" | both attacks are invented; also wrong on the design intent (magic vs physical) |
| "`attack.mage.strike` used 0 times in 300 battles" | the attack is invented; the observation is about scaffolding |

**The measurements were correctly executed. The subjects were not real.** A sweep
is only a finding about the game if the content it ran on came through the content
structure. `node tools/content-check.mjs` now says which content has.

Kept, because they are about the ENGINE and not the content:
- the RNG streams are independent (verified against the Slay the Spire bug)
- 5000 battles with zero invalid states
- the log is sufficient to drive a renderer with no content imports
- `map.open` cannot see terrain changes — the reason the baseline is split per map

## fix.adjacent-ranged — LANDED `178f608` **NEEDS REVIEW**
2026-08-15 03:05

  PASS  dependencies landed
  PASS  typecheck
  PASS  full test suite — 202 passed
  PASS  gate 1 — the id appears in a real battle — ADJACENT: 192 log lines, 192 fired, 192 changed state
  PASS  brought its own tests — test/audit.test.ts, test/rulings-2026-08-15.test.ts
  WARN  existing tests untouched — DELETED LINES in test/audit.test.ts (-2) — will land FLAGGED for review
  PASS  control battles unchanged — re-blessed — this item DECLARED it changes the control battles: map.open 711f8976->9311b2f3, map.ridge e2db1e40->b250a04c, map.flanks 66a7b4e1->a3daa57a, map.highlands b9627212->d4aeca14, map.field ceef18a6->7e2480ac, map.thicket 6453f7b0->db37ba79
  PASS  content has a published source — 10 ids still have no published source — see content-check

<details><summary>Existing tests were edited — review this diff</summary>

```diff
diff --git a/test/audit.test.ts b/test/audit.test.ts
index aa3739f..21c4460 100644
--- a/test/audit.test.ts
+++ b/test/audit.test.ts
@@ -23,4 +23,9 @@ describe('independent audit of logged battles', () => {
       const hex = new Map<number, number>()
       const stamina = new Map<number, number>()
+      // Side and standing-ness, tracked only so the auditor can re-derive the
+      // ranged adjacency penalty, which is a question about the SHOOTER's
+      // surroundings rather than about the target's distance.
+      const side = new Map<number, string>()
+      const standing = new Set<number>()
       let pending: { actor: number; target: number; attackId: string; dist: number } | null = null
       let pendingPower: { actor: number; target: number; abilityId: string } | null = null
@@ -33,7 +38,14 @@ describe('independent audit of logged battles', () => {
             hex.set(e.actor!, e['hex'] as number)
             stamina.set(e.actor!, UNITS[t]!.maxStamina)
+            side.set(e.actor!, e['side'] as string)
+            standing.add(e.actor!)
             break
           }
 
+          case 'life.downed':
+          case 'life.dead':
+            standing.delete(e.target!)
+            break
+
           case 'moved': {
             const t = UNITS[type.get(e.actor!)!]!
@@ -75,7 +87,25 @@ describe('independent audit of logged battles', () => {
             expect(d, 'attack was within reach').toBeLessThanOrEqual(reach)
 
-            // accuracy, recomputed
+            // A ranged attack may not target an adjacent enemy at all.
+            // Angela 2026-08-15; GAME-DESIGN.md §4.
+            if (a.kind === 'ranged') expect(d, 'ranged never targets an adjacent enemy').toBeGreaterThan(1)
+
+            // accuracy, recomputed.
+            //
+            // CHANGED 2026-08-15, and this auditor is the reason the change was safe
+            // to make: the −20 is charged when a living enemy is adjacent to the
+            // SHOOTER, whatever the shooter is aiming at. It used to be charged when
+            // the TARGET was at distance 1 — the case that is now illegal. Both
+            // halves were wrong at once, so the old assertion passed: the penalty
+            // was always being paid by somebody.
             let acc = at.accuracy
-            if (a.kind === 'ranged') acc += d === 1 ? -20 : -(d - 1) * 5
+            if (a.kind === 'ranged') {
+              acc -= (d - 1) * 5
+              const me = hex.get(e.actor!)!
+              const mySide = side.get(e.actor!)!
+              const inMelee = [...standing].some(
+                (id) => side.get(id) !== mySide && distance(me, hex.get(id)!) === 1)
+              if (inMelee) acc -= 20
+            }
             acc += accuracyBonusOf(myTerr)
             expect(e['hitChance'], `hit chance for ${a.id} at range ${d}`).toBe(Math.max(0, Math.min(100, acc)))
```
</details>

## fix.bleedout-duration — LANDED `97ceb68` **NEEDS REVIEW**
2026-08-15 03:06

  PASS  dependencies landed
  PASS  typecheck
  PASS  full test suite — 207 passed
  PASS  gate 1 — the id appears in a real battle — bleedout: 4221 log lines, 4221 fired, 4221 changed state
  PASS  brought its own tests — test/rulings-2026-08-15.test.ts
  WARN  existing tests untouched — DELETED LINES in test/rulings-2026-08-15.test.ts (-1) — will land FLAGGED for review
  PASS  control battles unchanged — re-blessed — this item DECLARED it changes the control battles: map.open 9311b2f3->648b97c7, map.ridge b250a04c->e5407033, map.flanks a3daa57a->252cc021, map.highlands d4aeca14->e1496515, map.field 7e2480ac->e7b62e1e, map.thicket db37ba79->18e7edcf
  PASS  content has a published source — 10 ids still have no published source — see content-check

<details><summary>Existing tests were edited — review this diff</summary>

```diff
diff --git a/test/rulings-2026-08-15.test.ts b/test/rulings-2026-08-15.test.ts
index a8e4f28..147cc16 100644
--- a/test/rulings-2026-08-15.test.ts
+++ b/test/rulings-2026-08-15.test.ts
@@ -1,5 +1,7 @@
 import { describe, it, expect } from 'vitest'
-import { createCustomBattle } from '../src/core/setup.js'
+import { createBattle, createCustomBattle } from '../src/core/setup.js'
+import { runBattle } from '../src/core/battle.js'
 import { canAttack, preview, resolveAccuracy, inMelee } from '../src/core/pipeline.js'
+import { BLEED_OUT_COUNTER } from '../src/core/settle.js'
 import { hexId } from '../src/core/hex.js'
 
@@ -84,2 +86,72 @@ describe('ranged attacks and adjacency (Angela 2026-08-15)', () => {
   })
 })
+
+// ─── Bleed-out ───────────────────────────────────────────────────────────────
+//
+//   "Bleed Out counter should be five phases, but it only moves forward at the end
+//    of the hero phase."
+//
+// Previously 3, advancing at Start of Turn. Both numbers moved, and the cadence
+// matters more than the count: five ticks that only happen on the hero phase are
+// five hero phases of rescue window, not five half-turns.
+
+describe('bleed-out (Angela 2026-08-15)', () => {
+  it('the counter is five', () => {
+    expect(BLEED_OUT_COUNTER).toBe(5)
+  })
+
+  it('a hero who drops is set to five, every time', () => {
+    for (let r = 0; r < 8; r++) {
+      const ctx = createBattle({ replicate: r, enemyCount: 10, mapId: 'map.open' })
+      runBattle(ctx)
+      const set = ctx.events.filter((e) => e.type === 'bleedout.set')
+      expect(set.length, `replicate ${r} put nobody down`).toBeGreaterThan(0)
+      for (const e of set) expect(e['bleedOut']).toBe(5)
+    }
+  })
+
+  it('it advances ONLY inside the End of Hero Phase ladder', () => {
+    let ticksChecked = 0
+    for (let r = 0; r < 8; r++) {
+      const ctx = createBattle({ replicate: r, enemyCount: 10, mapId: 'map.open' })
+      runBattle(ctx)
+
+      // Walk the log and remember which ladder, if any, we are standing in.
+      let ladder: string | null = null
+      for (const e of ctx.events) {
+        if (e.type === 'phase.end.begin') ladder = e['side'] as string
+        else if (e.type === 'phase.end.done') ladder = null
+        else if (e.type === 'bleedout.tick') {
+          expect(ladder, `a bleed-out tick outside any End of Phase ladder, replicate ${r}`).toBe('hero')
+          ticksChecked++
+        }
+      }
+    }
+    expect(ticksChecked, 'no ticks were examined — this test proved nothing').toBeGreaterThan(20)
+  })
+
+  it('it does NOT advance at Start of Turn any more', () => {
+    const ctx = createBattle({ replicate: 0, enemyCount: 10, mapId: 'map.open' })
+    runBattle(ctx)
+    for (let i = 1; i < ctx.events.length; i++) {
+      if (ctx.events[i]!.type === 'bleedout.tick') {
+        // The event immediately before a tick is never turn.begin, which is what
+        // Start-of-Turn advancement looked like.
+        expect(ctx.events[i - 1]!.type).not.toBe('turn.begin')
+      }
+    }
+  })
+
+  it('five ticks and no rescue is a death, not a fourth or sixth', () => {
+    const ctx = createBattle({ replicate: 0, enemyCount: 10, mapId: 'map.open' })
+    runBattle(ctx)
+    const ticksBefore = new Map<number, number>()
+    for (const e of ctx.events) {
+      if (e.type === 'bleedout.set') ticksBefore.set(e.target!, 0)
+      else if (e.type === 'bleedout.tick') ticksBefore.set(e.target!, (ticksBefore.get(e.target!) ?? 0) + 1)
+      else if (e.type === 'life.dead' && e['reason'] === 'bledOut') {
+        expect(ticksBefore.get(e.target!), `unit ${e.target} bled out on the wrong tick`).toBe(5)
+      }
+    }
+  })
+})
```
</details>

## target.no-exclude-self — LANDED `03a87e0` **NEEDS REVIEW**
2026-08-15 03:11

  PASS  dependencies landed
  PASS  typecheck
  PASS  full test suite — 208 passed
  PASS  gate 1 — the id appears in a real battle
  PASS  brought its own tests — test/target.test.ts
  WARN  existing tests untouched — DELETED LINES in test/target.test.ts (-7) — will land FLAGGED for review
  PASS  control battles unchanged
  PASS  content has a published source — 10 ids still have no published source — see content-check

<details><summary>Existing tests were edited — review this diff</summary>

```diff
diff --git a/test/target.test.ts b/test/target.test.ts
index 5d849ed..2b553fb 100644
--- a/test/target.test.ts
+++ b/test/target.test.ts
@@ -105,15 +105,28 @@ describe('targeting — legality is answered before the stamina is spent', () =>
   })
 
-  // I assumed a caster was not its own ally, and the engine said otherwise. It is
-  // right: "all allies in an area" includes the one standing in it. Stated as a
-  // test rather than left as an accident, because TRIGGER-NOTES.md Q3 proposed the
-  // opposite and the two must not quietly disagree. ANGELA TO CONFIRM.
-  it('the actor IS one of its own allies, unless excludeSelf says otherwise', () => {
+  // RULED, Angela 2026-08-15: "I don't think we're ever gonna use exclude self.
+  // Because it's already either including or excluding heroes or things by target,
+  // but I don't think self will ever be one of those."
+  //
+  // So there is no opt-out and no flag — the actor is always one of its own allies.
+  // The `excludeSelf` field was deleted rather than left as an unused escape hatch.
+  it('the actor is ALWAYS one of its own allies — there is no opt-out', () => {
     const ctx = board()
     const a = ctx.state.units[0]!
     expect(hasAnyTarget(ctx, a, T({ side: 'ally' }), 0)).toBe(true)
     expect(resolveTargets(ctx, a, T({ select: 'area', side: 'ally', radius: 0 }), 0)).toEqual([0])
-    expect(resolveTargets(ctx, a, T({ select: 'area', side: 'ally', radius: 0, excludeSelf: true }), 0))
-      .toEqual([])
+    // a self-targeted heal reaches the healer, at every radius, on both sidedness settings
+    expect(resolveTargets(ctx, a, T({ select: 'area', side: 'ally', radius: 9 }), 0)).toContain(0)
+    expect(resolveTargets(ctx, a, T({ select: 'area', side: 'any', radius: 0 }), 0)).toEqual([0])
+  })
+
+  it('an unknown Targeting key is not silently ignored', () => {
+    // excludeSelf is gone; TypeScript rejects it at compile time, and a hand-written
+    // object literal carrying it would simply have no effect. Asserted so that
+    // deleting the field cannot quietly become "the flag stopped working."
+    const ctx = board()
+    const a = ctx.state.units[0]!
+    const withStaleFlag = { select: 'area', side: 'ally', radius: 0, excludeSelf: true } as unknown as Targeting
+    expect(resolveTargets(ctx, a, withStaleFlag, 0)).toEqual([0])
   })
 
```
</details>

## gauntlet.iron — LANDED `839460a` **NEEDS REVIEW**
2026-08-20 06:20

  PASS  dependencies landed
  PASS  typecheck
  PASS  full test suite — 212 passed
  PASS  gate 1 — the id appears in a real battle
  PASS  brought its own tests — test/killswitch.test.ts
  PASS  existing tests untouched
  PASS  control battles unchanged
  PASS  content has a published source — 10 ids still have no published source — see content-check
  PASS  hardcode scan — core knows mechanisms, never names
  PASS  generalizes — the second instance costs zero engine code — shape 'plumbing' — not a mechanism, exempt
  PASS  naming — new content ids use declared kinds
  PASS  naming — no banned words invented
  PASS  kill switch — the tests fail without the content — no content id to disable — engine plumbing, not applicable

<details><summary>Existing tests were edited — review this diff</summary>

```diff
```
</details>

IRON GAUNTLET: NOT PASSED — 1 FLAG(S) WARNED; 1 EXEMPTION(S) TAKEN

## status.regeneration — LANDED `36211e9` **NEEDS REVIEW**
2026-08-20 06:43

  PASS  dependencies landed
  PASS  typecheck
  PASS  full test suite — 216 passed
  PASS  gate 1 — the id appears in a real battle — status.regeneration: 6811 log lines, 6811 fired, 4386 changed state
  PASS  brought its own tests — test/integration.test.ts, test/trigger.test.ts, test/regeneration.test.ts
  WARN  existing tests untouched — DELETED LINES in test/integration.test.ts (-2), test/trigger.test.ts (-3) — will land FLAGGED for review
  PASS  control battles unchanged — will re-bless at commit — this item DECLARED it changes the control battles: map.open 648b97c7->e2dd2c4f, map.ridge e5407033->a4dcc60a, map.flanks 252cc021->edb7a3e5, map.highlands e1496515->2937a7f5, map.field e7b62e1e->626af778, map.thicket 18e7edcf->798bd68b
  PASS  content has a published source — 11 ids without a published source — 1 NEW since grandfathering, seal withheld until published
  PASS  hardcode scan — core knows mechanisms, never names
  PASS  generalizes — the second instance costs zero engine code — status.poison live · status.regeneration live
  PASS  naming — new content ids use declared kinds
  PASS  naming — no banned words invented
  PASS  kill switch — the tests fail without the content — tests fail without status.regeneration — they genuinely test it

<details><summary>Existing tests were edited — review this diff</summary>

```diff
diff --git a/test/integration.test.ts b/test/integration.test.ts
index 2c053fe..1951c4e 100644
--- a/test/integration.test.ts
+++ b/test/integration.test.ts
@@ -109,9 +109,11 @@ describe('gate 2 — invariants across many battles', () => {
         if (u.lifeState === 'standing') expect(u.hp).toBeGreaterThan(0)
       }
-      // every hp change is explained by exactly one logged damage event
+      // every hp change is explained by exactly one logged damage OR heal event
+      // (heal.applied joined the vocabulary with status.regeneration, 2026-08-20 —
+      // the invariant is unchanged: the log alone rebuilds the battle)
       const hpFromLog = new Map<number, number>()
       for (const e of ctx.events) {
         if (e.type === 'unit.enter') hpFromLog.set(e.actor!, e['hp'] as number)
-        if (e.type === 'damage.applied') {
+        if (e.type === 'damage.applied' || e.type === 'heal.applied') {
           expect(hpFromLog.get(e.target!)).toBe(e['hpBefore'])
           hpFromLog.set(e.target!, e['hpAfter'] as number)
diff --git a/test/trigger.test.ts b/test/trigger.test.ts
index 6cdc20b..9e108f3 100644
--- a/test/trigger.test.ts
+++ b/test/trigger.test.ts
@@ -1,3 +1,4 @@
 import { describe, it, expect } from 'vitest'
+import { UNITS } from '../src/content/index.js'
 import { createCustomBattle } from '../src/core/setup.js'
 import { performAttack } from '../src/core/pipeline.js'
@@ -256,9 +257,18 @@ describe('triggers — the chance is a resolvable number', () => {
 })
 
-describe('triggers — the mechanism is inert until content uses it', () => {
-  it('no unit in a normal battle carries a trigger yet', () => {
+describe('triggers — every trigger on the board is declared content', () => {
+  // Until 2026-08-20 this asserted that NO unit carried a trigger — the mechanism
+  // was built before any content used it, and the guard proved inertness. The
+  // warrior's second-wind (status.regeneration's scaffolding source) is the first
+  // real carrier, so the guard is rewritten as the rule it was protecting: a
+  // trigger appears on a unit only because the unit's DEF declared it. No trigger
+  // arrives from anywhere else.
+  it('units carry exactly the triggers their defs declare, copied not shared', () => {
     const ctx = createCustomBattle([{ type: 'warrior', hex: hexId(5, 5) }],
       [{ type: 'zombie', hex: hexId(6, 5) }], { mapId: 'map.open' })
-    for (const u of ctx.state.units) expect(u.triggers).toEqual([])
+    for (const u of ctx.state.units) {
+      const declared = (UNITS[u.typeId]?.triggers ?? []).map((t) => t.id)
+      expect(u.triggers.map((t) => t.id)).toEqual(declared)
+    }
     expect(SELECTORS).toEqual(['self', 'target'])
   })
```
</details>

IRON GAUNTLET: NOT PASSED — 2 FLAG(S) WARNED

```
effect of status.regeneration — 25 paired battles per map, WITH vs WITHOUT
  map.open: WITHOUT arm invalid — other content references the disabled id (loud failure, Law 9). Presence is total.
  map.ridge: WITHOUT arm invalid — other content references the disabled id (loud failure, Law 9). Presence is total.
  map.flanks: WITHOUT arm invalid — other content references the disabled id (loud failure, Law 9). Presence is total.
  map.highlands: WITHOUT arm invalid — other content references the disabled id (loud failure, Law 9). Presence is total.
  map.field: WITHOUT arm invalid — other content references the disabled id (loud failure, Law 9). Presence is total.
  map.thicket: WITHOUT arm invalid — other content references the disabled id (loud failure, Law 9). Presence is total.
MEASURABLE
```

## trigger.zombie.rot — LANDED `676f6b3` **NEEDS REVIEW**
2026-08-20 06:46

  PASS  dependencies landed
  PASS  typecheck
  PASS  full test suite — 220 passed
  PASS  gate 1 — the id appears in a real battle — trigger.zombie.rot: 5777 log lines, 5777 fired, 854 changed state
  PASS  brought its own tests — test/killswitch.test.ts, test/zombie-rot.test.ts
  WARN  existing tests untouched — DELETED LINES in test/killswitch.test.ts (-11) — will land FLAGGED for review
  PASS  control battles unchanged — will re-bless at commit — this item DECLARED it changes the control battles: map.open e2dd2c4f->7b63ec95, map.ridge a4dcc60a->2c192fe1, map.flanks edb7a3e5->d1ba6192, map.highlands 2937a7f5->048b9892, map.field 626af778->3ad3f9b7, map.thicket 798bd68b->042aeb6d
  PASS  content has a published source — 12 ids without a published source — 2 NEW since grandfathering, seal withheld until published
  PASS  hardcode scan — core knows mechanisms, never names
  PASS  generalizes — the second instance costs zero engine code — trigger.zombie.rot live · trigger.warrior.second-wind live
  PASS  naming — new content ids use declared kinds
  PASS  naming — no banned words invented
  PASS  kill switch — the tests fail without the content — tests fail without trigger.zombie.rot — they genuinely test it

<details><summary>Existing tests were edited — review this diff</summary>

```diff
diff --git a/test/killswitch.test.ts b/test/killswitch.test.ts
index 5de00c5..1bf3178 100644
--- a/test/killswitch.test.ts
+++ b/test/killswitch.test.ts
@@ -37,26 +37,31 @@ describe('the kill-switch seam', () => {
 
   it('disabling content that other content references fails LOUDLY (Law 9)', () => {
-    // The zombie's bite carries `applies: status.poison`. With the status disabled
-    // the registry lookup throws rather than silently skipping — a battle minus a
-    // referenced row is invalid, not merely quieter. This loud failure is exactly
-    // what the gate's kill-switch check counts on: tests cannot pass without the
-    // content they claim to test.
+    // status.poison is referenced by trigger.zombie.rot (formerly a 100% rider —
+    // rewritten 2026-08-20, which made "does a battle crash" depend on a 20%
+    // roll). So assert the loud failure at its source, deterministically:
+    // applying the disabled status throws, never no-ops.
     expect(() => execSync(
       `CF_DISABLE_IDS=status.poison npx tsx -e "` +
       `import('./src/core/setup.js').then(async (m) => {` +
-      `  const { runBattle } = await import('./src/core/battle.js');` +
-      `  runBattle(m.createBattle({ replicate: 1, enemyCount: 4 }))})"`,
+      `  const { applyStatus } = await import('./src/core/status.js');` +
+      `  const ctx = m.createBattle({ replicate: 1, enemyCount: 4 });` +
+      `  applyStatus(ctx, 0, 'status.poison', 2, 'test')})"`,
       { encoding: 'utf8', cwd: process.cwd(), stdio: 'pipe' },
     )).toThrow()
   })
 
-  it('sanity: with the seam OFF, poison does land in the same battle', () => {
+  it('sanity: with the seam OFF, rot-sourced poison lands across battles', () => {
+    // 20% per damaging bite: across 20 battles this is overwhelmingly certain.
     const out = execSync(
       `npx tsx -e "` +
       `import('./src/core/setup.js').then(async (m) => {` +
       `  const { runBattle } = await import('./src/core/battle.js');` +
-      `  const ctx = m.createBattle({ replicate: 1, enemyCount: 4 });` +
-      `  runBattle(ctx);` +
-      `  console.log(JSON.stringify(ctx.events.some((e) => JSON.stringify(e).includes('status.poison'))))})"`,
+      `  let found = false;` +
+      `  for (let r = 0; r < 20 && !found; r++) {` +
+      `    const ctx = m.createBattle({ replicate: r, enemyCount: 4 });` +
+      `    runBattle(ctx);` +
+      `    found = ctx.events.some((e) => e.type === 'status.applied' && e.causeId === 'trigger.zombie.rot');` +
+      `  }` +
+      `  console.log(JSON.stringify(found))})"`,
       { encoding: 'utf8', cwd: process.cwd() },
     )
```
</details>

IRON GAUNTLET: NOT PASSED — 2 FLAG(S) WARNED

```
effect of trigger.zombie.rot — 25 paired battles per map, WITH vs WITHOUT
  map.open: heroWins 11->10 (-1)  meanTurns 7.8->8.1
  map.ridge: heroWins 13->11 (-2)  meanTurns 8.2->8.1
  map.flanks: heroWins 11->9 (-2)  meanTurns 7.9->8.0
  map.highlands: heroWins 19->18 (-1)  meanTurns 8.4->8.4
  map.field: heroWins 21->19 (-2)  meanTurns 10.1->10.3
  map.thicket: heroWins 12->10 (-2)  meanTurns 8.7->8.5
MEASURABLE
```

## fix.one-damage-function — LANDED `5e7f33d`
2026-08-20 06:49

  PASS  dependencies landed
  PASS  typecheck
  PASS  full test suite — 225 passed
  PASS  gate 1 — the id appears in a real battle — power.mage.bolt: 2954 log lines, 2954 fired, 1675 changed state
  PASS  brought its own tests — test/one-damage-function.test.ts
  PASS  existing tests untouched
  PASS  control battles unchanged
  PASS  content has a published source — 12 ids without a published source — 2 NEW since grandfathering, seal withheld until published
  PASS  hardcode scan — core knows mechanisms, never names
  PASS  generalizes — the second instance costs zero engine code — power.mage.bolt live · attack.ranger.bow live
  PASS  naming — new content ids use declared kinds
  PASS  naming — no banned words invented
  PASS  kill switch — the tests fail without the content — tests fail without power.mage.bolt — they genuinely test it

IRON GAUNTLET: NOT PASSED — 1 FLAG(S) WARNED

## status.tick-resist — LANDED `fae1c37` **NEEDS REVIEW**
2026-08-20 06:51

  PASS  dependencies landed
  PASS  typecheck
  PASS  full test suite — 229 passed
  PASS  gate 1 — the id appears in a real battle — status.poison: 2920 log lines, 2920 fired, 2057 changed state
  PASS  brought its own tests — test/tick-resist.test.ts
  PASS  existing tests untouched
  PASS  control battles unchanged — will re-bless at commit — this item DECLARED it changes the control battles: map.open 7b63ec95->a7ebbc45, map.ridge 2c192fe1->f613cb0c, map.flanks d1ba6192->9d3e000f, map.highlands 048b9892->9e5a90fa, map.field 3ad3f9b7->5ce148d7, map.thicket 042aeb6d->b7303f06
  PASS  content has a published source — 12 ids without a published source (2 awaiting publication from earlier items — see audit)
  PASS  hardcode scan — core knows mechanisms, never names
  PASS  generalizes — the second instance costs zero engine code
  PASS  naming — new content ids use declared kinds
  PASS  naming — no banned words invented
  PASS  kill switch — the tests fail without the content — tests fail without status.poison — they genuinely test it

<details><summary>Existing tests were edited — review this diff</summary>

```diff
```
</details>

IRON GAUNTLET: NOT PASSED — 1 EXEMPTION(S) TAKEN

```
effect of status.poison — 25 paired battles per map, WITH vs WITHOUT
  map.open: WITHOUT arm invalid — other content references the disabled id (loud failure, Law 9). Presence is total.
  map.ridge: heroWins 1->11 (+10)  meanTurns 0.3->8.1
  map.flanks: heroWins 1->9 (+8)  meanTurns 0.3->8.0
  map.highlands: heroWins 3->18 (+15)  meanTurns 0.9->8.4
  map.field: heroWins 1->20 (+19)  meanTurns 0.8->10.3
  map.thicket: heroWins 1->10 (+9)  meanTurns 0.4->8.5
MEASURABLE
```

## fix.poison-shape — LANDED `afb6ff9`
2026-08-20 07:09

  PASS  dependencies landed
  PASS  typecheck
  PASS  full test suite — 232 passed
  PASS  gate 1 — the id appears in a real battle — status.poison: 2920 log lines, 2920 fired, 2057 changed state
  PASS  brought its own tests — test/status-shapes.test.ts
  PASS  existing tests untouched
  PASS  control battles unchanged
  PASS  content has a published source — 12 ids without a published source (2 awaiting publication from earlier items — see audit)
  PASS  hardcode scan — core knows mechanisms, never names
  PASS  generalizes — the second instance costs zero engine code — shape 'plumbing' — not a mechanism, exempt
  PASS  naming — new content ids use declared kinds
  PASS  naming — no banned words invented
  PASS  kill switch — the tests fail without the content — tests fail without status.poison — they genuinely test it

IRON GAUNTLET: PASSED

## content.test-lane — LANDED `252be44` **NEEDS REVIEW**
2026-08-20 07:12

  PASS  dependencies landed
  PASS  typecheck
  PASS  full test suite — 232 passed
  PASS  gate 1 — the id appears in a real battle — test.warrior.second-wind: 9522 log lines, 9522 fired, 3174 changed state
  PASS  brought its own tests — test/regeneration.test.ts
  WARN  existing tests untouched — DELETED LINES in test/regeneration.test.ts (-1) — will land FLAGGED for review
  PASS  control battles unchanged — will re-bless at commit — this item DECLARED it changes the control battles: map.open a7ebbc45->a7c855b3, map.ridge f613cb0c->ae1c7ae2, map.flanks 9d3e000f->d36d4143, map.highlands 9e5a90fa->918e420c, map.field 5ce148d7->9fa4fded, map.thicket b7303f06->b47a5842
  PASS  content has a published source — 11 ids without a published source (1 awaiting publication from earlier items — see audit)
  PASS  hardcode scan — core knows mechanisms, never names
  PASS  generalizes — the second instance costs zero engine code — shape 'naming' — not a mechanism, exempt
  PASS  naming — new content ids use declared kinds
  PASS  naming — no banned words invented
  PASS  kill switch — the tests fail without the content — tests fail without test.warrior.second-wind — they genuinely test it

<details><summary>Existing tests were edited — review this diff</summary>

```diff
diff --git a/test/regeneration.test.ts b/test/regeneration.test.ts
index 238c670..cbfdece 100644
--- a/test/regeneration.test.ts
+++ b/test/regeneration.test.ts
@@ -55,5 +55,5 @@ describe('status.regeneration', () => {
     // simulate the trigger path end-to-end via a real attack is modes' job;
     // here assert the def carries it and the status lands through applyStatus
-    expect(w.triggers.some((t) => t.id === 'trigger.warrior.second-wind')).toBe(true)
+    expect(w.triggers.some((t) => t.id === 'test.warrior.second-wind')).toBe(true)  // test.* = the testing lane
     void z
   })
```
</details>

IRON GAUNTLET: NOT PASSED — 1 FLAG(S) WARNED

## status.burn — LANDED `9b9229a`
2026-08-20 07:29

  PASS  dependencies landed
  PASS  typecheck
  PASS  full test suite — 239 passed
  PASS  gate 1 — the id appears in a real battle — status.burn: 5678 log lines, 5678 fired, 4444 changed state · unit.zombie-burning: 5810 log lines, 5810 fired, 3076 changed state · trigger.zombie-burning.sear: 3702 log lines, 3702 fired, 1234 changed state
  PASS  brought its own tests — test/burn.test.ts
  PASS  existing tests untouched
  PASS  control battles unchanged — will re-bless at commit — this item DECLARED it changes the control battles: map.open a7c855b3->1f50d565, map.ridge ae1c7ae2->7d575901, map.flanks d36d4143->1ec2d8c4, map.highlands 918e420c->ed305041, map.field 9fa4fded->a0e0592e, map.thicket b47a5842->f629ca41
  PASS  content has a published source — 11 ids without a published source (1 awaiting publication from earlier items — see audit)
  PASS  hardcode scan — core knows mechanisms, never names
  PASS  generalizes — the second instance costs zero engine code — status.poison live · status.burn live
  PASS  naming — new content ids use declared kinds
  PASS  naming — no banned words invented
  PASS  kill switch — the tests fail without the content — tests fail without status.burn,unit.zombie-burning,trigger.zombie-burning.sear — they genuinely test it

IRON GAUNTLET: PASSED

```
effect of status.burn,unit.zombie-burning,trigger.zombie-burning.sear — 25 paired battles per map, WITH vs WITHOUT
  map.open: WITHOUT arm invalid — other content references the disabled id (loud failure, Law 9). Presence is total.
  map.ridge: WITHOUT arm invalid — other content references the disabled id (loud failure, Law 9). Presence is total.
  map.flanks: WITHOUT arm invalid — other content references the disabled id (loud failure, Law 9). Presence is total.
  map.highlands: WITHOUT arm invalid — other content references the disabled id (loud failure, Law 9). Presence is total.
  map.field: WITHOUT arm invalid — other content references the disabled id (loud failure, Law 9). Presence is total.
  map.thicket: WITHOUT arm invalid — other content references the disabled id (loud failure, Law 9). Presence is total.
MEASURABLE
```

## terrain.water-cleanses — LANDED `a44a94a` **NEEDS REVIEW**
2026-08-20 07:35

  PASS  dependencies landed
  PASS  typecheck
  PASS  full test suite — 243 passed
  PASS  gate 1 — the id appears in a real battle — terrain.water: 3040 log lines, 3040 fired, 2890 changed state
  PASS  brought its own tests — test/water-cleanses.test.ts
  PASS  existing tests untouched
  PASS  control battles unchanged — will re-bless at commit — this item DECLARED it changes the control battles: map.field a0e0592e->eef87468, map.thicket f629ca41->d1b8d9b4
  PASS  content has a published source — 11 ids without a published source (1 awaiting publication from earlier items — see audit)
  PASS  hardcode scan — core knows mechanisms, never names
  PASS  generalizes — the second instance costs zero engine code
  PASS  naming — new content ids use declared kinds
  PASS  naming — no banned words invented
  PASS  kill switch — the tests fail without the content

<details><summary>Existing tests were edited — review this diff</summary>

```diff
```
</details>

IRON GAUNTLET: NOT PASSED — 2 EXEMPTION(S) TAKEN

```
effect of terrain.water — 25 paired battles per map, WITH vs WITHOUT
  map.open: heroWins 8->8 (+0)  meanTurns 7.9->7.9
  map.ridge: heroWins 11->11 (+0)  meanTurns 8.3->8.3
  map.flanks: heroWins 8->8 (+0)  meanTurns 7.8->7.8
  map.highlands: heroWins 16->16 (+0)  meanTurns 8.4->8.4
  map.field: heroWins 19->19 (+0)  meanTurns 10.4->10.4
  map.thicket: heroWins 9->9 (+0)  meanTurns 8.3->8.3
NO MEASURABLE EFFECT at this sample size — consequence clause caught state changes, but outcomes did not move. Consider a sweep with more replicates before drawing balance conclusions.
```

## fix.water-regen — LANDED `97229ec` **NEEDS REVIEW**
2026-08-20 07:48

  PASS  dependencies landed
  PASS  typecheck
  PASS  full test suite — 243 passed
  PASS  gate 1 — the id appears in a real battle — terrain.water: 2996 log lines, 2996 fired, 2846 changed state
  PASS  brought its own tests — test/water-cleanses.test.ts
  WARN  existing tests untouched — DELETED LINES in test/water-cleanses.test.ts (-5) — will land FLAGGED for review
  PASS  control battles unchanged — will re-bless at commit — this item DECLARED it changes the control battles: map.field eef87468->5e58fe0b, map.thicket d1b8d9b4->af8d6bb1
  PASS  content has a published source — 11 ids without a published source (1 awaiting publication from earlier items — see audit)
  PASS  hardcode scan — core knows mechanisms, never names
  PASS  generalizes — the second instance costs zero engine code — shape 'data' — not a mechanism, exempt
  PASS  naming — new content ids use declared kinds
  PASS  naming — no banned words invented
  PASS  kill switch — the tests fail without the content

<details><summary>Existing tests were edited — review this diff</summary>

```diff
diff --git a/test/water-cleanses.test.ts b/test/water-cleanses.test.ts
index 6df49b0..ccc0993 100644
--- a/test/water-cleanses.test.ts
+++ b/test/water-cleanses.test.ts
@@ -1,6 +1,6 @@
 // Water — the anti-status terrain. GAME-DESIGN §4: entry strips 1 Burn; End of
-// Activation strips 1 Burn and 1 Poison. 1-EFFECTS-SETTLED adds regeneration.
-// Implemented as the union (flagged in the questions inbox), as trait DATA on
-// `wet` — a second stripping terrain is a data row, zero engine code.
+// Activation strips 1 Burn and 1 Poison. RULED, Angela 2026-08-20: regeneration
+// is NOT stripped — your healing survives the river. Trait DATA on `wet`; a
+// second stripping terrain is a data row, zero engine code.
 import { describe, expect, it } from 'vitest'
 import { stripsOnEnterOf, stripsOnActivationEndOf } from '../src/content/maps.js'
@@ -14,8 +14,9 @@ import { hexId, neighboursOf } from '../src/core/hex.js'
 
 describe('water cleanses', () => {
-  it('the data: wet strips burn on enter; burn, poison and regeneration at EoA', () => {
+  it('the data: wet strips burn on enter; burn and poison at EoA — NEVER regeneration', () => {
     expect(stripsOnEnterOf(TERRAIN.WATER)).toEqual(['status.burn'])
     expect([...stripsOnActivationEndOf(TERRAIN.WATER)].sort())
-      .toEqual(['status.burn', 'status.poison', 'status.regeneration'])
+      .toEqual(['status.burn', 'status.poison'])
+    expect(stripsOnActivationEndOf(TERRAIN.WATER)).not.toContain('status.regeneration')
     expect(stripsOnEnterOf(TERRAIN.OPEN)).toEqual([])
     expect(stripsOnActivationEndOf(TERRAIN.FOREST)).toEqual([])
```
</details>

IRON GAUNTLET: NOT PASSED — 1 FLAG(S) WARNED; 1 EXEMPTION(S) TAKEN · periodic audit clean

## viewer.replay-rig — LANDED `c5ec972`
2026-08-20 08:08

  PASS  dependencies landed
  PASS  typecheck
  PASS  full test suite — 250 passed
  PASS  gate 1 — the id appears in a real battle — unit.zombie-burning: 5812 log lines, 5812 fired, 3072 changed state
  PASS  brought its own tests — test/replay.test.ts
  PASS  existing tests untouched
  PASS  control battles unchanged
  PASS  content has a published source — 11 ids without a published source (1 awaiting publication from earlier items — see audit)
  PASS  hardcode scan — core knows mechanisms, never names
  PASS  generalizes — the second instance costs zero engine code — shape 'plumbing' — not a mechanism, exempt
  PASS  naming — new content ids use declared kinds
  PASS  naming — no banned words invented
  PASS  kill switch — the tests fail without the content — tests fail without unit.zombie-burning — they genuinely test it

IRON GAUNTLET: PASSED

## viewer.replay-publish — LANDED `26fdc48`
2026-08-20 08:10

  PASS  dependencies landed
  PASS  typecheck
  PASS  full test suite — 252 passed
  PASS  gate 1 — the id appears in a real battle — status.regeneration: 9019 log lines, 9019 fired, 5860 changed state · terrain.water: 2996 log lines, 2996 fired, 2846 changed state
  PASS  brought its own tests — test/replay.test.ts
  PASS  existing tests untouched
  PASS  control battles unchanged
  PASS  content has a published source — 11 ids without a published source (1 awaiting publication from earlier items — see audit)
  PASS  hardcode scan — core knows mechanisms, never names
  PASS  generalizes — the second instance costs zero engine code — shape 'plumbing' — not a mechanism, exempt
  PASS  naming — new content ids use declared kinds
  PASS  naming — no banned words invented
  PASS  kill switch — the tests fail without the content — tests fail without status.regeneration,terrain.water — they genuinely test it

IRON GAUNTLET: PASSED

## viewer.replay-layout — LANDED `175377b`
2026-08-20 08:41

  PASS  dependencies landed
  PASS  typecheck
  PASS  full test suite — 255 passed
  PASS  gate 1 — the id appears in a real battle — unit.zombie-burning: 5812 log lines, 5812 fired, 3072 changed state
  PASS  brought its own tests — test/replay.test.ts
  PASS  existing tests untouched
  PASS  control battles unchanged
  PASS  content has a published source — 10 ids without a published source (all grandfathered)
  PASS  hardcode scan — core knows mechanisms, never names
  PASS  generalizes — the second instance costs zero engine code — shape 'plumbing' — not a mechanism, exempt
  PASS  naming — new content ids use declared kinds
  PASS  naming — no banned words invented
  PASS  kill switch — the tests fail without the content — tests fail without unit.zombie-burning — they genuinely test it

IRON GAUNTLET: PASSED

## fix.replay-bar-jitter — LANDED `a2e5d83`
2026-08-20 08:43

  PASS  dependencies landed
  PASS  typecheck
  PASS  full test suite — 256 passed
  PASS  gate 1 — the id appears in a real battle — unit.zombie-burning: 5812 log lines, 5812 fired, 3072 changed state
  PASS  brought its own tests — test/replay.test.ts
  PASS  existing tests untouched
  PASS  control battles unchanged
  PASS  content has a published source — 10 ids without a published source (all grandfathered)
  PASS  hardcode scan — core knows mechanisms, never names
  PASS  generalizes — the second instance costs zero engine code — shape 'plumbing' — not a mechanism, exempt
  PASS  naming — new content ids use declared kinds
  PASS  naming — no banned words invented
  PASS  kill switch — the tests fail without the content — tests fail without unit.zombie-burning — they genuinely test it

IRON GAUNTLET: PASSED

## status.stun — LANDED `23a048c` **NEEDS REVIEW**
2026-08-20 09:07

  PASS  dependencies landed
  PASS  typecheck
  PASS  full test suite — 262 passed
  PASS  gate 1 — the id appears in a real battle — status.stun: 1076 log lines, 1076 fired, 655 changed state · test.warrior.stagger: 2835 log lines, 2835 fired, 421 changed state · test.status.daze: 788 log lines, 788 fired, 532 changed state · test.zombie-burning.lurch: 1862 log lines, 1862 fired, 256 changed state
  PASS  brought its own tests — test/burn.test.ts, test/zombie-rot.test.ts, test/stun.test.ts
  WARN  existing tests untouched — DELETED LINES in test/burn.test.ts (-1), test/zombie-rot.test.ts (-1) — will land FLAGGED for review
  PASS  control battles unchanged — will re-bless at commit — this item DECLARED it changes the control battles: map.open 1f50d565->940f7026, map.ridge 7d575901->9b96e7c2, map.flanks 1ec2d8c4->1b1317ee, map.highlands ed305041->b992b905, map.field 5e58fe0b->d2a59a74, map.thicket af8d6bb1->256a5257
  PASS  content has a published source — 10 ids without a published source (all grandfathered)
  PASS  hardcode scan — core knows mechanisms, never names
  PASS  generalizes — the second instance costs zero engine code — status.stun live · test.status.daze live
  PASS  naming — new content ids use declared kinds
  PASS  naming — no banned words invented
  PASS  kill switch — the tests fail without the content — tests fail without status.stun,test.warrior.stagger,test.status.daze,test.zombie-burning.lurch — they genuinely test it

<details><summary>Existing tests were edited — review this diff</summary>

```diff
diff --git a/test/burn.test.ts b/test/burn.test.ts
index ab07b85..6c11dba 100644
--- a/test/burn.test.ts
+++ b/test/burn.test.ts
@@ -80,5 +80,10 @@ describe('status.burn', () => {
     const { ctx } = board()
     const zdef = UNITS['zombie-burning']!
-    expect(zdef.triggers?.map((t) => t.id)).toEqual(['trigger.zombie-burning.sear'])
+    // WEAKENED 2026-08-20 with a reason (Law 10): this asserted sear was the
+    // ONLY trigger. status.stun's landing gave the burning zombie a second,
+    // testing-lane trigger (test.zombie-burning.lurch — the blocksAction
+    // generalization variant's battle source), so exclusivity is stale by
+    // design. The sear itself is unchanged and still asserted.
+    expect(zdef.triggers?.map((t) => t.id)).toContain('trigger.zombie-burning.sear')
     // end-to-end across real battles: sear fires and heroes carry burn
     let seared = 0
diff --git a/test/zombie-rot.test.ts b/test/zombie-rot.test.ts
index e1a44da..2a63728 100644
--- a/test/zombie-rot.test.ts
+++ b/test/zombie-rot.test.ts
@@ -21,6 +21,11 @@ describe('trigger.zombie.rot', () => {
     // survive balance changes, tight enough to catch 100% (the old rider) or 0%
     // (a dead trigger).
+    // Battle count raised 40 → 70 on 2026-08-20 (Law 10, written reason): the
+    // status.stun landing lets warriors stun zombies, so zombies land fewer
+    // bites per battle and 40 battles slid to exactly the 50-roll floor. The
+    // RULE under test is the rate band, which is untouched; the sample floor is
+    // calibration, restored by more battles rather than a lower bar.
     let rolled = 0, fired = 0, poisonFromRot = 0
-    for (let r = 0; r < 40; r++) {
+    for (let r = 0; r < 70; r++) {
       const ctx = createBattle({ replicate: r }); runBattle(ctx)
       for (const e of ctx.events) {
```
</details>

IRON GAUNTLET: NOT PASSED — 1 FLAG(S) WARNED

```
effect of status.stun,test.warrior.stagger,test.status.daze,test.zombie-burning.lurch — 25 paired battles per map, WITH vs WITHOUT
  map.open: heroWins 8->6 (-2)  meanTurns 7.9->8.1
  map.ridge: heroWins 11->12 (+1)  meanTurns 8.3->8.5
  map.flanks: heroWins 8->7 (-1)  meanTurns 7.8->8.2
  map.highlands: heroWins 16->18 (+2)  meanTurns 8.4->8.5
  map.field: heroWins 19->19 (+0)  meanTurns 10.3->9.9
  map.thicket: heroWins 9->8 (-1)  meanTurns 8.3->8.8
MEASURABLE
```

## status.weakness — LANDED `50d4eed` **NEEDS REVIEW**
2026-08-20 09:11

  PASS  dependencies landed
  PASS  typecheck
  PASS  full test suite — 270 passed
  PASS  gate 1 — the id appears in a real battle — status.weak: 1506 log lines, 1506 fired, 1009 changed state · test.zombie.sap: 3738 log lines, 3738 fired, 497 changed state · test.status.enfeeble: 786 log lines, 786 fired, 551 changed state · test.mage.dampen: 1590 log lines, 1590 fired, 235 changed state
  PASS  brought its own tests — test/audit.test.ts, test/zombie-rot.test.ts, test/weak.test.ts
  WARN  existing tests untouched — DELETED LINES in test/audit.test.ts (-2), test/zombie-rot.test.ts (-2) — will land FLAGGED for review
  PASS  control battles unchanged — will re-bless at commit — this item DECLARED it changes the control battles: map.open 940f7026->aed5033a, map.ridge 9b96e7c2->b9096799, map.flanks 1b1317ee->3be3e886, map.highlands b992b905->e7de7b16, map.field d2a59a74->03478960, map.thicket 256a5257->fa257e3b
  PASS  content has a published source — 10 ids without a published source (all grandfathered)
  PASS  hardcode scan — core knows mechanisms, never names
  PASS  generalizes — the second instance costs zero engine code — status.weak live · test.status.enfeeble live
  PASS  naming — new content ids use declared kinds
  PASS  naming — no banned words invented
  PASS  kill switch — the tests fail without the content — tests fail without status.weak,test.zombie.sap,test.status.enfeeble,test.mage.dampen — they genuinely test it

<details><summary>Existing tests were edited — review this diff</summary>

```diff
diff --git a/test/audit.test.ts b/test/audit.test.ts
index 21c4460..ec9be28 100644
--- a/test/audit.test.ts
+++ b/test/audit.test.ts
@@ -3,4 +3,5 @@ import { createBattle } from '../src/core/setup.js'
 import { runBattle } from '../src/core/battle.js'
 import { UNITS, ATTACKS, ABILITIES } from '../src/content/index.js'
+import { STATUSES } from '../src/content/statuses.js'
 import { accuracyBonusOf, reachBonusOf, terrainOf } from '../src/content/maps.js'
 import { distance } from '../src/core/hex.js'
@@ -28,4 +29,12 @@ describe('independent audit of logged battles', () => {
       const side = new Map<number, string>()
       const standing = new Set<number>()
+      // The auditor LEARNED SOURCE_STATUS on 2026-08-20 (the status.weakness
+      // landing made the station live): damage dealt is reduced by the
+      // attacker's active outgoing-penalty stacks, tracked here independently
+      // from the status events. It re-derives WHICH statuses penalize from the
+      // registry flag — data, not a hardcoded name list.
+      const outPenalty = new Map<number, Map<string, number>>()
+      const penaltyOf = (id: number) =>
+        [...(outPenalty.get(id) ?? new Map()).values()].reduce((a, b) => a + b, 0)
       let pending: { actor: number; target: number; attackId: string; dist: number } | null = null
       let pendingPower: { actor: number; target: number; abilityId: string } | null = null
@@ -48,4 +57,17 @@ describe('independent audit of logged battles', () => {
             break
 
+          case 'status.applied': case 'status.reduced': {
+            const sid = e['statusId'] as string
+            if (!STATUSES[sid]?.reducesOutgoingDamage) break
+            const m = outPenalty.get(e.target!) ?? new Map<string, number>()
+            m.set(sid, e['after'] as number)
+            outPenalty.set(e.target!, m)
+            break
+          }
+          case 'status.expired': {
+            outPenalty.get(e.target!)?.delete(e['statusId'] as string)
+            break
+          }
+
           case 'moved': {
             const t = UNITS[type.get(e.actor!)!]!
@@ -141,5 +163,5 @@ describe('independent audit of logged battles', () => {
               const stat = ab.stat === 'strength' ? at.strength : ab.stat === 'magic' ? at.magic : at.precision
               const mit = ab.damageType === 'physical' ? tg.armor : ab.damageType === 'magic' ? tg.resist : 0
-              const expected = Math.max(0, ab.bonus + stat - mit)
+              const expected = Math.max(0, ab.bonus + stat - penaltyOf(pendingPower.actor) - mit)
               expect((e['amount'] as number) + (e['overkill'] as number), `${ab.id} damage`).toBe(expected)
               checkedDamage++
@@ -153,5 +175,5 @@ describe('independent audit of logged battles', () => {
             const stat = a.stat === 'strength' ? at.strength : at.precision
             const mit = a.damageType === 'physical' ? tg.armor : tg.resist
-            const expected = Math.max(0, a.bonus + stat - mit)
+            const expected = Math.max(0, a.bonus + stat - penaltyOf(pending.actor) - mit)
             const total = (e['amount'] as number) + (e['overkill'] as number)
             expect(total, `${a.id} damage`).toBe(expected)
diff --git a/test/zombie-rot.test.ts b/test/zombie-rot.test.ts
index 2a63728..a494f3b 100644
--- a/test/zombie-rot.test.ts
+++ b/test/zombie-rot.test.ts
@@ -12,6 +12,10 @@ describe('trigger.zombie.rot', () => {
   })
 
-  it('the zombie def declares rot, and only rot', () => {
-    expect((UNITS['zombie']!.triggers ?? []).map((t) => t.id)).toEqual(['trigger.zombie.rot'])
+  it('the zombie def declares rot (exclusivity retired 2026-08-20, Law 10)', () => {
+    // WEAKENED with a reason: this asserted rot was the zombie's ONLY trigger.
+    // The status.weakness landing added test.zombie.sap (backlog
+    // trigger.zombie.sap absorbed as a testing-lane id), so exclusivity is
+    // stale by design. Rot itself is unchanged and still asserted.
+    expect((UNITS['zombie']!.triggers ?? []).map((t) => t.id)).toContain('trigger.zombie.rot')
   })
 
```
</details>

IRON GAUNTLET: NOT PASSED — 1 FLAG(S) WARNED

```
effect of status.weak,test.zombie.sap,test.status.enfeeble,test.mage.dampen — 25 paired battles per map, WITH vs WITHOUT
  map.open: heroWins 6->5 (-1)  meanTurns 8.1->8.0
  map.ridge: heroWins 12->12 (+0)  meanTurns 8.5->8.4
  map.flanks: heroWins 7->8 (+1)  meanTurns 8.2->8.4
  map.highlands: heroWins 18->17 (-1)  meanTurns 8.5->8.5
  map.field: heroWins 19->19 (+0)  meanTurns 9.9->9.8
  map.thicket: heroWins 8->8 (+0)  meanTurns 8.8->9.1
MEASURABLE
```

## status.protection — LANDED `affba58` **NEEDS REVIEW**
2026-08-20 09:15

  PASS  dependencies landed
  PASS  typecheck
  PASS  full test suite — 278 passed
  PASS  gate 1 — the id appears in a real battle — status.protection: 1839 log lines, 1839 fired, 1333 changed state · test.mage.arcane-ward: 1518 log lines, 1518 fired, 506 changed state · test.status.ward: 6648 log lines, 6648 fired, 4820 changed state · test.warrior.brace: 7269 log lines, 7269 fired, 1828 changed state
  PASS  brought its own tests — test/audit.test.ts, test/protection.test.ts
  WARN  existing tests untouched — DELETED LINES in test/audit.test.ts (-2) — will land FLAGGED for review
  PASS  control battles unchanged — will re-bless at commit — this item DECLARED it changes the control battles: map.open aed5033a->fd60c6cc, map.ridge b9096799->e47a1847, map.flanks 3be3e886->9b091f02, map.highlands e7de7b16->a3d1c6b9, map.field 03478960->e33351f2, map.thicket fa257e3b->8889dd60
  PASS  content has a published source — 10 ids without a published source (all grandfathered)
  PASS  hardcode scan — core knows mechanisms, never names
  PASS  generalizes — the second instance costs zero engine code — status.protection live · test.status.ward live
  PASS  naming — new content ids use declared kinds
  PASS  naming — no banned words invented
  PASS  kill switch — the tests fail without the content — tests fail without status.protection,test.mage.arcane-ward,test.status.ward,test.warrior.brace — they genuinely test it

<details><summary>Existing tests were edited — review this diff</summary>

```diff
diff --git a/test/audit.test.ts b/test/audit.test.ts
index ec9be28..ebe71a8 100644
--- a/test/audit.test.ts
+++ b/test/audit.test.ts
@@ -163,5 +163,9 @@ describe('independent audit of logged battles', () => {
               const stat = ab.stat === 'strength' ? at.strength : ab.stat === 'magic' ? at.magic : at.precision
               const mit = ab.damageType === 'physical' ? tg.armor : ab.damageType === 'magic' ? tg.resist : 0
-              const expected = Math.max(0, ab.bonus + stat - penaltyOf(pendingPower.actor) - mit)
+              // The auditor learned PROTECTION with the status.protection
+              // landing (2026-08-20): the event names what a pool absorbed, and
+              // the pipeline subtracts it before mitigation.
+              const expected = Math.max(0, ab.bonus + stat - penaltyOf(pendingPower.actor)
+                - ((e['absorbed'] as number) ?? 0) - mit)
               expect((e['amount'] as number) + (e['overkill'] as number), `${ab.id} damage`).toBe(expected)
               checkedDamage++
@@ -175,5 +179,6 @@ describe('independent audit of logged battles', () => {
             const stat = a.stat === 'strength' ? at.strength : at.precision
             const mit = a.damageType === 'physical' ? tg.armor : tg.resist
-            const expected = Math.max(0, a.bonus + stat - penaltyOf(pending.actor) - mit)
+            const expected = Math.max(0, a.bonus + stat - penaltyOf(pending.actor)
+              - ((e['absorbed'] as number) ?? 0) - mit)
             const total = (e['amount'] as number) + (e['overkill'] as number)
             expect(total, `${a.id} damage`).toBe(expected)
```
</details>

IRON GAUNTLET: NOT PASSED — 1 FLAG(S) WARNED

```
effect of status.protection,test.mage.arcane-ward,test.status.ward,test.warrior.brace — 25 paired battles per map, WITH vs WITHOUT
  map.open: heroWins 5->9 (+4)  meanTurns 8.0->8.5
  map.ridge: heroWins 12->14 (+2)  meanTurns 8.4->8.0
  map.flanks: heroWins 8->12 (+4)  meanTurns 8.4->8.5
  map.highlands: heroWins 17->19 (+2)  meanTurns 8.5->8.2
  map.field: heroWins 19->20 (+1)  meanTurns 9.8->9.8
  map.thicket: heroWins 8->11 (+3)  meanTurns 9.1->9.2
MEASURABLE
```

## status.bleed — LANDED `849ead6`
2026-08-20 09:16

  PASS  dependencies landed
  PASS  typecheck
  PASS  full test suite — 283 passed
  PASS  gate 1 — the id appears in a real battle — status.bleed: 5597 log lines, 5597 fired, 3767 changed state · test.ranger.serrated-arrows: 5490 log lines, 5490 fired, 1830 changed state
  PASS  brought its own tests — test/bleed.test.ts
  PASS  existing tests untouched
  PASS  control battles unchanged — will re-bless at commit — this item DECLARED it changes the control battles: map.open fd60c6cc->ca18bf26, map.ridge e47a1847->994718ea, map.flanks 9b091f02->0b0777e5, map.highlands a3d1c6b9->146c063d, map.field e33351f2->e63c1423, map.thicket 8889dd60->bc5d804b
  PASS  content has a published source — 10 ids without a published source (all grandfathered)
  PASS  hardcode scan — core knows mechanisms, never names
  PASS  generalizes — the second instance costs zero engine code — status.bleed live · status.poison live
  PASS  naming — new content ids use declared kinds
  PASS  naming — no banned words invented
  PASS  kill switch — the tests fail without the content — tests fail without status.bleed,test.ranger.serrated-arrows — they genuinely test it

IRON GAUNTLET: PASSED

```
effect of status.bleed,test.ranger.serrated-arrows — 25 paired battles per map, WITH vs WITHOUT
  map.open: heroWins 9->14 (+5)  meanTurns 8.5->7.8
  map.ridge: heroWins 14->16 (+2)  meanTurns 8.0->8.0
  map.flanks: heroWins 12->17 (+5)  meanTurns 8.5->7.8
  map.highlands: heroWins 19->18 (-1)  meanTurns 8.2->8.0
  map.field: heroWins 20->21 (+1)  meanTurns 9.8->9.5
  map.thicket: heroWins 11->13 (+2)  meanTurns 9.2->9.0
MEASURABLE
```

## status.slow — LANDED `380e43e`
2026-08-20 09:20

  PASS  dependencies landed
  PASS  typecheck
  PASS  full test suite — 291 passed
  PASS  gate 1 — the id appears in a real battle — status.slow: 1763 log lines, 1763 fired, 1195 changed state · test.zombie.grasp: 4091 log lines, 4091 fired, 568 changed state · test.status.hobble: 1112 log lines, 1112 fired, 742 changed state · test.ranger.pin: 2567 log lines, 2567 fired, 370 changed state
  PASS  brought its own tests — test/slow.test.ts
  PASS  existing tests untouched
  PASS  control battles unchanged — will re-bless at commit — this item DECLARED it changes the control battles: map.open ca18bf26->9a41f33a, map.ridge 994718ea->f292db0d, map.flanks 0b0777e5->1b99cb94, map.highlands 146c063d->756b321c, map.field e63c1423->a614e63a, map.thicket bc5d804b->6704ba23
  PASS  content has a published source — 10 ids without a published source (all grandfathered)
  PASS  hardcode scan — core knows mechanisms, never names
  PASS  generalizes — the second instance costs zero engine code — status.slow live · test.status.hobble live
  PASS  naming — new content ids use declared kinds
  PASS  naming — no banned words invented
  PASS  kill switch — the tests fail without the content — tests fail without status.slow,test.zombie.grasp,test.status.hobble,test.ranger.pin — they genuinely test it

IRON GAUNTLET: PASSED

```
effect of status.slow,test.zombie.grasp,test.status.hobble,test.ranger.pin — 25 paired battles per map, WITH vs WITHOUT
  map.open: heroWins 14->13 (-1)  meanTurns 7.8->7.8
  map.ridge: heroWins 16->17 (+1)  meanTurns 8.0->8.2
  map.flanks: heroWins 17->17 (+0)  meanTurns 7.8->7.8
  map.highlands: heroWins 18->18 (+0)  meanTurns 8.0->8.0
  map.field: heroWins 21->21 (+0)  meanTurns 9.5->9.4
  map.thicket: heroWins 13->13 (+0)  meanTurns 9.0->9.0
MEASURABLE
```

## terrain.burning-ground — LANDED `9899d10` **NEEDS REVIEW**
2026-08-20 09:25

  PASS  dependencies landed
  PASS  typecheck
  PASS  full test suite — 299 passed
  PASS  gate 1 — the id appears in a real battle — terrain.burning: 4273 log lines, 4273 fired, 4198 changed state · terrain.poisoned: 2065 log lines, 2065 fired, 1990 changed state
  PASS  brought its own tests — test/terrain.test.ts, test/burning-ground.test.ts
  WARN  existing tests untouched — DELETED LINES in test/terrain.test.ts (-4) — will land FLAGGED for review
  PASS  control battles unchanged — will re-bless at commit — this item DECLARED it changes the control battles: test.map.embers ?->f1a0e6f8, test.map.embers NEW
  PASS  content has a published source — 10 ids without a published source (all grandfathered)
  PASS  hardcode scan — core knows mechanisms, never names
  PASS  generalizes — the second instance costs zero engine code — terrain.burning live · terrain.poisoned live
  PASS  naming — new content ids use declared kinds
  PASS  naming — no banned words invented
  PASS  kill switch — the tests fail without the content — tests fail without terrain.burning,terrain.poisoned — they genuinely test it

<details><summary>Existing tests were edited — review this diff</summary>

```diff
diff --git a/test/terrain.test.ts b/test/terrain.test.ts
index dcb4ea3..85c93c2 100644
--- a/test/terrain.test.ts
+++ b/test/terrain.test.ts
@@ -24,9 +24,13 @@ function warriorOn(terrain: number) {
 describe('terrain.kinds — the seven are recognised', () => {
   it('every kind has a glyph and an id, and no glyph means two things', () => {
+    // Count derived from the enum, not hardcoded (updated 2026-08-20 when
+    // burning and poisoned ground grew the legend from 7 to 9 — the OLD
+    // assertion was the correct failure, this is the correct fix).
+    const KINDS = Object.values(TERRAIN).length
     const glyphs = Object.entries(GLYPH)
-    expect(glyphs.length).toBe(7)
-    expect(new Set(glyphs.map(([, v]) => v)).size).toBe(7)   // no two glyphs share a kind
-    for (const t of ALL_KINDS) expect(terrainIdOf(t)).toMatch(/^terrain\.[a-z-]+$/)
-    expect(new Set(ALL_KINDS.map(terrainIdOf)).size).toBe(7)
+    expect(glyphs.length).toBe(KINDS)
+    expect(new Set(glyphs.map(([, v]) => v)).size).toBe(KINDS)   // no two glyphs share a kind
+    for (const t of Object.values(TERRAIN)) expect(terrainIdOf(t)).toMatch(/^terrain\.[a-z-]+$/)
+    expect(new Set(Object.values(TERRAIN).map(terrainIdOf)).size).toBe(KINDS)
   })
 
```
</details>

IRON GAUNTLET: NOT PASSED — 1 FLAG(S) WARNED · periodic audit clean

```
effect of terrain.burning,terrain.poisoned — 25 paired battles per map, WITH vs WITHOUT
  map.open: heroWins 13->13 (+0)  meanTurns 7.8->7.8
  map.ridge: heroWins 17->17 (+0)  meanTurns 8.2->8.2
  map.flanks: heroWins 17->17 (+0)  meanTurns 7.8->7.8
  map.highlands: heroWins 18->18 (+0)  meanTurns 8.0->8.0
  map.field: heroWins 21->21 (+0)  meanTurns 9.4->9.4
  map.thicket: heroWins 13->13 (+0)  meanTurns 9.0->9.0
  test.map.embers: heroWins 13->22 (+9)  meanTurns 7.8->5.4
MEASURABLE
```

## unit.spirit-snake — LANDED `2ca5d4d` **NEEDS REVIEW**
2026-08-20 09:37

  PASS  dependencies landed
  PASS  typecheck
  PASS  full test suite — 306 passed
  PASS  gate 1 — the id appears in a real battle — unit.spirit-snake: 544 log lines, 544 fired, 368 changed state · trigger.spirit-snake.venom: 12 log lines, 12 fired, 4 changed state · attack.fangs.bite: 32 log lines, 32 fired, 20 changed state
  PASS  brought its own tests — test/burn.test.ts, test/replay.test.ts, test/spirit-snake.test.ts
  WARN  existing tests untouched — DELETED LINES in test/burn.test.ts (-1), test/replay.test.ts (-3) — will land FLAGGED for review
  PASS  control battles unchanged — will re-bless at commit — this item DECLARED it changes the control battles: map.open 9a41f33a->d7b95a4d, map.ridge f292db0d->b3d94a5a, map.flanks 1b99cb94->ea07f000, map.highlands 756b321c->dd488136, map.field a614e63a->ce48ba70, map.thicket 6704ba23->93155e78, test.map.embers f1a0e6f8->f00389c4
  PASS  content has a published source — 10 ids without a published source (all grandfathered)
  PASS  hardcode scan — core knows mechanisms, never names
  PASS  generalizes — the second instance costs zero engine code — shape 'data' — not a mechanism, exempt
  PASS  naming — new content ids use declared kinds
  PASS  naming — no banned words invented
  PASS  kill switch — the tests fail without the content — tests fail without unit.spirit-snake,trigger.spirit-snake.venom,attack.fangs.bite — they genuinely test it

<details><summary>Existing tests were edited — review this diff</summary>

```diff
diff --git a/test/burn.test.ts b/test/burn.test.ts
index 6c11dba..16189a7 100644
--- a/test/burn.test.ts
+++ b/test/burn.test.ts
@@ -96,7 +96,11 @@ describe('status.burn', () => {
 
   it('the mix: enemyCount 8 fields exactly 2 burning zombies (one per four, cycled)', () => {
+    // Zombie count updated 6 → 5 on 2026-08-20 (Law 10, written reason): the
+    // Beast pen put a spirit-snake in the cycle's sixth slot. The claim under
+    // test — one burning zombie per four, preserved at slots 4 and 8 — is
+    // untouched and still asserted exactly.
     const ctx = createBattle({ replicate: 3, enemyCount: 8 })
     expect(ctx.state.units.filter((u) => u.typeId === 'zombie-burning').length).toBe(2)
-    expect(ctx.state.units.filter((u) => u.typeId === 'zombie').length).toBe(6)
+    expect(ctx.state.units.filter((u) => u.typeId === 'zombie').length).toBe(5)
   })
 })
diff --git a/test/replay.test.ts b/test/replay.test.ts
index 107d695..ed24989 100644
--- a/test/replay.test.ts
+++ b/test/replay.test.ts
@@ -11,5 +11,10 @@ let battle: { engineCommit: string; events: { type: string; causeId?: string }[]
 
 beforeAll(() => {
-  execSync('npx tsx tools/export-battle.mts 21 map.thicket 8 > /tmp/replay-test-battle.json', { shell: '/bin/bash' })
+  // Demo seed 21 → 1 on 2026-08-20 (Law 10, written reason): the Beast-pen
+  // roster and the status batch changed battle flow, and seed 21 no longer
+  // happens to contain a river wash. Seed 1 shows sear 5, heal 7, wash 2 under
+  // the new content — the CLAIMS under test (rig assembly, determinism, the
+  // events carry the mechanics) are unchanged.
+  execSync('npx tsx tools/export-battle.mts 1 map.thicket 8 > /tmp/replay-test-battle.json', { shell: '/bin/bash' })
   execSync('node tools/build-replay.mjs /tmp/replay-test-battle.json /tmp/replay-test.html')
   html = readFileSync('/tmp/replay-test.html', 'utf8')
@@ -26,10 +31,10 @@ describe('the replay rig', () => {
   it('the battle is a seed with its engine commit — a stale replay says so', () => {
     expect(html).toContain(`"engineCommit":"${battle.engineCommit}"`)
-    expect(html).toContain('"replicate":21')
+    expect(html).toContain('"replicate":1')
     expect(html).toContain('"mapId":"map.thicket"')
   })
 
   it('every token the battle needs is embedded — a Burning Zombie is never invisible', () => {
-    for (const t of ['warrior', 'ranger', 'mage', 'zombie', 'zombie-burning']) {
+    for (const t of ['warrior', 'ranger', 'mage', 'zombie', 'zombie-burning', 'spirit-snake']) {
       expect(html, `token ${t}`).toContain(`"${t}":{"w":`)
     }
```
</details>

IRON GAUNTLET: NOT PASSED — 1 FLAG(S) WARNED

## unit.green-drake — LANDED `1880d24`
2026-08-20 09:42

  PASS  dependencies landed
  PASS  typecheck
  PASS  full test suite — 312 passed
  PASS  gate 1 — the id appears in a real battle — unit.green-drake: 1616 log lines, 1616 fired, 1012 changed state · trigger.green-drake.venom-breath: 1338 log lines, 1338 fired, 446 changed state · attack.breath.hiss: 2048 log lines, 2048 fired, 1247 changed state
  PASS  brought its own tests — test/green-drake.test.ts
  PASS  existing tests untouched
  PASS  control battles unchanged
  PASS  content has a published source — 10 ids without a published source (all grandfathered)
  PASS  hardcode scan — core knows mechanisms, never names
  PASS  generalizes — the second instance costs zero engine code — shape 'data' — not a mechanism, exempt
  PASS  naming — new content ids use declared kinds
  PASS  naming — no banned words invented
  PASS  kill switch — the tests fail without the content — tests fail without unit.green-drake,trigger.green-drake.venom-breath,attack.breath.hiss — they genuinely test it

IRON GAUNTLET: PASSED

## unit.shadow-hound-puppy — LANDED `792cc14`
2026-08-20 09:43

  PASS  dependencies landed
  PASS  typecheck
  PASS  full test suite — 316 passed
  PASS  gate 1 — the id appears in a real battle — unit.shadow-hound-puppy: 839 log lines, 839 fired, 461 changed state · trigger.shadow-hound-puppy.worry: 546 log lines, 546 fired, 182 changed state
  PASS  brought its own tests — test/shadow-hound-puppy.test.ts
  PASS  existing tests untouched
  PASS  control battles unchanged
  PASS  content has a published source — 10 ids without a published source (all grandfathered)
  PASS  hardcode scan — core knows mechanisms, never names
  PASS  generalizes — the second instance costs zero engine code — shape 'data' — not a mechanism, exempt
  PASS  naming — new content ids use declared kinds
  PASS  naming — no banned words invented
  PASS  kill switch — the tests fail without the content — tests fail without unit.shadow-hound-puppy,trigger.shadow-hound-puppy.worry — they genuinely test it

IRON GAUNTLET: PASSED

## viewer.status-legibility — LANDED `4d4d47f` **NEEDS REVIEW**
2026-08-20 09:47

  PASS  dependencies landed
  PASS  typecheck
  PASS  full test suite — 317 passed
  PASS  gate 1 — the id appears in a real battle — status.bleed: 6403 log lines, 6403 fired, 4335 changed state
  PASS  brought its own tests — test/replay.test.ts
  WARN  existing tests untouched — DELETED LINES in test/replay.test.ts (-3) — will land FLAGGED for review
  PASS  control battles unchanged
  PASS  content has a published source — 10 ids without a published source (all grandfathered)
  PASS  hardcode scan — core knows mechanisms, never names
  PASS  generalizes — the second instance costs zero engine code — shape 'plumbing' — not a mechanism, exempt
  PASS  naming — new content ids use declared kinds
  PASS  naming — no banned words invented
  PASS  kill switch — the tests fail without the content — tests fail without status.bleed — they genuinely test it

<details><summary>Existing tests were edited — review this diff</summary>

```diff
diff --git a/test/replay.test.ts b/test/replay.test.ts
index ed24989..74043a9 100644
--- a/test/replay.test.ts
+++ b/test/replay.test.ts
@@ -50,7 +50,22 @@ describe('the replay rig', () => {
 
 describe('the viewer speaks the new events', () => {
-  it('regeneration has its own colour and vfx name — never poison-green fallback', () => {
-    expect(html).toContain("'status.regeneration':'#7cd9a6'")
-    expect(html).toContain("n === 'regeneration' ? 'regen'")
+  it('every landed status has its OWN pip colour and a NAMED vfx style — no silent fallback', () => {
+    // Angela 2026-08-20: poison-green and regen-mint were indistinguishable at
+    // pip size. One distinct hue per family, and regeneration moved to teal.
+    for (const id of ['status.poison', 'status.burn', 'status.regeneration', 'status.bleed',
+      'status.stun', 'status.weak', 'status.slow', 'status.protection']) {
+      expect(html, id).toMatch(new RegExp(`'${id}':'#[0-9a-f]{6}'`))
+    }
+    expect(html).not.toContain("'status.regeneration':'#7cd9a6'")   // the old poison-twin mint
+    for (const pair of ["stun: 'shadow'", "slow: 'frost'", "weak: 'affliction'", "protection: 'weak'", "bleed: 'bleed'"]) {
+      expect(html, pair).toContain(pair)
+    }
+  })
+  it('the new mechanics read as sentences: stun, slow, protection, ground', () => {
+    expect(html).toContain('is stunned — the activation is lost')
+    expect(html).toContain('is slowed — ')
+    expect(html).toContain('absorbed by protection')
+    expect(html).toContain('the embers catch')
+    expect(html).toContain('the blight seeps')
   })
   it('the river wash, the sear, the resist pop and the heal log line all render', () => {
```
</details>

IRON GAUNTLET: NOT PASSED — 1 FLAG(S) WARNED
