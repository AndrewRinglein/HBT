// ISC-003 — a battle runs from campaign facts to a result with no change to
// engine/src: the kingdom reaches the engine only through src/engine.ts, and the
// battle it gets back was run by the engine's own runBattle.
// THIN-SLICE-IMPLEMENTATION.md §4.1 · §4.5 · Constitution Law 5

import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { resolveEngagement, battleOptionsOf, type EngagementSpec } from '../src/core/seam.js'

const SPEC: EngagementSpec = {
  id: 'test.seam.door',
  mapId: 'map.open',
  heroes: ['test-oathblade', 'test-osric'],
  enemies: ['test-zombie', 'test-zombie'],
  seed: 3,
}

function sources(dir: string, out: string[] = []): string[] {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f)
    if (statSync(p).isDirectory()) sources(p, out); else if (/\.ts$/.test(f)) out.push(p)
  }
  return out
}

describe('ISC-003 — the engine is reached through one door and never changed', () => {
  it('src/engine.ts is the only kingdom file that imports an engine path', () => {
    const files = sources('src').map((p) => p.replace(/\\/g, '/'))
    expect(files).toContain('src/engine.ts')
    const importers = files.filter((f) => /from\s+['"][^'"]*\/engine\/[^'"]*['"]/.test(readFileSync(f, 'utf8')))
    expect(importers).toEqual(['src/engine.ts'])
    // and the door opens only onto the engine's public surface, not its mutators
    const door = readFileSync('src/engine.ts', 'utf8')
    expect(door).not.toMatch(/core\/mutate/)
    // Authorized human sandbox (2026-09-16) needs the engine's preview numbers.
    // Permit that named read-only export only; raw attack execution stays closed.
    expect(door.match(/^export.*core\/pipeline.*$/gm)).toEqual(["export { preview } from '../../engine/src/core/pipeline.js'"])
    expect(door).not.toMatch(/export\s*\{[^}]*performAttack/)
  })

  it('the options are the engine\'s own BattleOptions, and the battle was run by its runBattle', () => {
    const opts = battleOptionsOf(SPEC)
    expect(opts.scenarioId).toBe(SPEC.id)
    expect(opts.replicate).toBe(SPEC.seed)
    expect(opts.heroes).toEqual(SPEC.heroes)
    expect(opts.enemies).toEqual(SPEC.enemies)
    expect(opts.enemyCount).toBe(SPEC.enemies.length)
    const { result, events } = resolveEngagement(SPEC)
    // The engine's own vocabulary brackets the log — one battle.begin, one
    // battle.end carrying the outcome — and the cause is the engine, not the
    // kingdom. (battle.end is not the LAST event: the phase-end ladder finishes
    // emitting after the victory check sets the outcome. Found 2026-09-01 by
    // this probe's first green run; the assertion was corrected, not weakened —
    // what it now asserts is that nothing is damaged after the battle has ended.)
    const begins = events.filter((e) => e.type === 'battle.begin')
    const ends = events.filter((e) => e.type === 'battle.end')
    expect(begins.length).toBe(1)
    expect(begins[0]?.causeId).toBe('engine')
    expect(ends.length).toBe(1)
    expect(ends[0]?.['outcome']).toBe(result.outcome)
    const endSeq = ends[0]!.seq
    expect(events.filter((e) => e.seq > endSeq && (e.type === 'damage.applied' || e.type.startsWith('life.')))).toEqual([])
    expect(events.find((e) => e.type === 'map.loaded')?.['scenarioId']).toBe(SPEC.id)
    // The same spec resolves to the same result — a named seed, never a clock (Law 4).
    expect(resolveEngagement(SPEC).result).toEqual(result)
  })
})


// V2 Atlas fielding consumes the root compiler's plain registry, then uses the
// same engine setup as every other Kingdom engagement. No renderer owns rules.
import { createBattle, fieldedDef } from '../src/engine.js'
import { campaignOf } from '../src/core/campaign.js'
import { makeCtx } from '../src/core/mutate.js'
import { beginCombatPrep, performAdvancePrep, performDeploy, listDeployable } from '../src/core/prep.js'
import { viewBattle } from '../src/view/battle.js'
const atlasRegistry = JSON.parse(readFileSync('../assets/battle-atlas/generated-combat/registry.json','utf8'))
for (const entry of atlasRegistry.entries) it(`Atlas seam ${entry.id} preserves six heroes, fifteen enemies, kits/progress and geometry`,()=>{
 const heroes=Array(6).fill('hero.base.ranger-aggressive'),enemies=Array(15).fill('unit.zombie'),heroItems=heroes.map(()=>['item.shortbow']),heroProgress=heroes.map(()=>({level:2,specialtyId:'specialty.beastward'}));
 const spec:EngagementSpec={id:'test.atlas.kingdom',mapId:entry.id,seed:19,heroes,enemies,heroItems,heroProgress};
 const opts=battleOptionsOf(spec);expect(opts.map).toEqual(entry.setup.map);expect(opts.heroes).toEqual(heroes);expect(opts.enemies).toEqual(enemies);expect(opts.heroItems).toEqual(heroItems);expect(opts.heroProgress).toEqual(heroProgress);expect(opts.replicate).toBe(19);
 expect(opts.heroHexes).toEqual(entry.deploymentSlots.heroes.slice(0,6));expect(opts.enemyHexes).toEqual(entry.deploymentSlots.enemies.slice(0,15));expect(new Set([...opts.heroHexes!,...opts.enemyHexes!]).size).toBe(21);
 const ctx=createBattle(opts);expect(ctx.state.props).toEqual(entry.setup.map.props);expect(ctx.state.floor).toEqual(entry.setup.map.floor);
 const unit=ctx.state.units.find(u=>u.side==='hero')!;const expected=fieldedDef(heroes[0]!,heroItems[0],heroProgress[0]);expect(unit.maxHp).toBe(expected.maxHp);expect(unit.actions).toContain('attack.shortbow.short-shot');
 const explicit=battleOptionsOf({...spec,heroHexes:[...opts.heroHexes!].reverse(),enemyHexes:[...opts.enemyHexes!].reverse()});expect(explicit.heroHexes).toEqual([...opts.heroHexes!].reverse());expect(()=>createBattle(explicit)).not.toThrow();
 expect(()=>battleOptionsOf({...spec,heroes:Array(entry.deploymentSlots.heroes.length+1).fill(heroes[0])})).toThrow(/capacity/);
 (opts.map as any).floor[0]=!entry.setup.map.floor[0];expect((battleOptionsOf(spec).map as any).floor).toEqual(entry.setup.map.floor);
})
it('normal fixture battle exposes its complete engine initial facts and frozen Atlas scene',()=>{
 const ctx=makeCtx(campaignOf(readFileSync('fixtures/slice-prep.json','utf8')));beginCombatPrep(ctx,'test');performAdvancePrep(ctx,'test');performAdvancePrep(ctx,'test');for(const id of listDeployable(ctx.campaign).slice(0,4))performDeploy(ctx,id,'test');performAdvancePrep(ctx,'test');performAdvancePrep(ctx,'test');
 const v=viewBattle(ctx.campaign) as any;expect(v.atlasScene).toBeTruthy();expect(v.initialEvents.length).toBeGreaterThan(v.units.length);const fact=v.initialEvents.find((e:any)=>e.type==='map.loaded');expect(fact.mapId).toBe(v.viewerSeed.mapId);expect(v.props).toEqual(fact.props);expect(v.floor).toEqual(fact.floor);expect(v.units.map((u:any)=>u.hex)).toEqual(v.initialEvents.filter((e:any)=>e.type==='unit.enter').map((e:any)=>e.hex));
 const canonical=Object.fromEntries(['mapId','width','height','deploy','terrain','props','floor'].map(k=>[k,fact[k]]));expect(canonical).toEqual(v.atlasScene.initialMapFact);expect(v.initialEvents.some((e:any)=>e.type==='activation.begin')).toBe(false);
})
