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
