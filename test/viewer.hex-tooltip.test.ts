// viewer.hex-tooltip (engine backlog; engine DECISIONS.md 2026-10-03 'size and shadows are the default; the bleeding-out card;
// switching heroes asks first; movement costs on the grid; a tooltip on every hex' and 'switching from a hero that has not
// acted is free; the hex tooltip describes the ground only'). Andrew: "when I'm just pointing around the map, any hex I point
// at should have a little hover tooltip below it that says what the tile is and any special things about the tile, like: It
// costs 2 to move there. It will inflict burning on you. It's a water tile." / "Yeah, just ground only."
// The engine's side — nothing of it changes; what the tooltip says is held here against the engine's own rules on the
// Orphanage: what each ground costs to step onto (movement.ts stepCost), which hexes a unit may enter (props.ts
// passableHexes), what burning ground applies (content/terrain.ts). FOUND, and said to Andrew: the engine charges 1 for
// undergrowth, and the Orphanage's river is water a unit may wade at 2 — the item's "at the river, that it … cannot be
// entered" is not what the engine holds; the tooltip says what the engine says (viewer SWITCHES hexTipRiverWades). And an
// engine gap, for the engine's queue: a ground has an id and no display name, so the tooltip's name is the id as words
// (viewer SWITCHES hexTipGroundName). The viewer's half is ../viewer/tools/hex-tooltip.test.mjs; the sandbox's half
// ../kingdom/tools/hex-tooltip.verify.mjs on the built BATTLE-SANDBOX.html. Imports no page code.
import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync } from 'node:fs'
import { createBattle } from '../../engine/src/core/setup.js'
import { scenarioDef, scenarioOptions } from '../../engine/src/content/scenarios.js'
import { stepCost } from '../../engine/src/core/movement.js'
import { passableHexes } from '../../engine/src/core/props.js'
import { TERRAIN } from '../../engine/src/core/types.js'
import { engineVocabulary } from '../../engine/src/core/vocabulary.js'
import { presentationField } from '../../engine/src/view/field.js'

describe('a tooltip on every hex says what the engine holds of the ground', () => {
  const ctx = createBattle(scenarioOptions(scenarioDef('test.opening-orphanage'), 1)), terrain = ctx.state.terrain
  const hexOf = (t: number) => terrain.findIndex((x) => x === t)
  it('the engine: open ground costs 1 to step onto, woodland 2, undergrowth 1; the river is water, entered at 2', () => {
    for (const [t, cost] of [[TERRAIN.OPEN, 1], [TERRAIN.WOODLAND, 2], [TERRAIN.UNDERGROWTH, 1], [TERRAIN.WATER, 2]] as const) {
      const h = hexOf(t); expect(h).toBeGreaterThanOrEqual(0)
      expect(stepCost(ctx, h)).toBe(cost)
    }
    const passable = passableHexes(ctx)
    const water = terrain.map((t, h) => (t === TERRAIN.WATER ? h : -1)).filter((h) => h >= 0)
    expect(water.length).toBeGreaterThan(0)
    for (const h of water) expect(passable(h)).toBe(true)          // FOUND: the Orphanage's river may be waded
    expect(terrain.some((_, h) => !passable(h))).toBe(true)        // and some hexes are closed (a prop of the map stands there)
  })
  it('the engine\'s field, which the tooltip reads, carries the same cost and the same closed hexes, hex by hex', () => {
    const F = presentationField({ width: ctx.state.board.width, height: ctx.state.board.height, terrain: [...terrain], props: ctx.state.props })
    const passable = passableHexes(ctx)
    terrain.forEach((_, h) => { expect(F.moveCost[h]).toBe(stepCost(ctx, h)); expect(F.passable[h]).toBe(passable(h)) })
  })
  it('the engine names a ground by id only (the gap), and says what burning ground and lava apply', () => {
    const V = engineVocabulary()
    for (const t of V.terrain) expect(Object.keys(t).sort()).toEqual(expect.not.arrayContaining(['name']))
    expect(V.layers.find((l) => l.id === 'layer.burning')!.onEnter[0]![0]).toBe('status.burn')
    expect(V.terrain.find((t) => t.id === 'terrain.lava')!.onEnter.map(([s]) => s)).toContain('status.burn')
    /* the dump's names are those ids, as words, for every ground the engine lists */
    const dumped = JSON.parse(readFileSync('../viewer/generated/static.json', 'utf8'))
    for (const t of V.terrain.filter((x) => !x.layer)) expect(dumped.terrainNames[t.id].toLowerCase().replace(/ /g, '-')).toBe(t.id.replace('terrain.', ''))
  })
  it('the viewer page: the tooltip under the hex pointed at — its name, its cost, what it inflicts, that it is closed; ground only', () => {
    const out = execFileSync(process.execPath, ['--test', '--test-reporter=tap', 'tools/hex-tooltip.test.mjs'], { cwd: '../viewer', encoding: 'utf8', maxBuffer: 1 << 24, env: { ...process.env, VIEWER_PAGE: process.env.VIEWER_PAGE ?? '' } })
    expect(out).toMatch(/# pass 6/); expect(out).toMatch(/# fail 0/)
  }, 170000)
  it('the sandbox: the expect line, on the built BATTLE-SANDBOX.html (the Orphanage) — and pointing changes nothing in the engine\'s battle', () => {
    mkdirSync('../kingdom/scratch', { recursive: true })
    execFileSync(process.execPath, ['tools/build-sandbox.mjs', 'scratch/hex-tooltip.html'], { cwd: '../kingdom', stdio: 'pipe' })
    const out = execFileSync(process.execPath, ['tools/hex-tooltip.verify.mjs', 'scratch/hex-tooltip.html'], { cwd: '../kingdom', encoding: 'utf8', maxBuffer: 1 << 26 })
    expect(out).toMatch(/hex-tooltip: .*passed/)
  }, 170000)
})
