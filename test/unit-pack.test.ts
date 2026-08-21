// The generated unit pack — Angela 2026-08-20: "I would like to use heroes
// that are being tracked in our overall Codex... we're going to read from the
// data and it's clearly differentiated text. We're not hardcoding." The
// standard battle party is SIX Codex-tracked test clones (one per class) plus
// test enemies, exported by content/mkenginepack.mjs and loaded — validated
// loudly — by src/content/pack.ts. Nothing about them is typed into engine
// content files.
import { describe, expect, it } from 'vitest'
import { packUnits, UNIT_PACK_NOTE } from '../src/content/pack.js'
import { UNITS, FIRST_BATTLE } from '../src/content/index.js'
import { createBattle } from '../src/core/setup.js'
import { runBattle } from '../src/core/battle.js'

describe('the pack — read from the data, clearly differentiated', () => {
  it('six heroes, one per class, all test- prefixed, all (TEST)-named, all Codex-traced', () => {
    const pack = packUnits()
    const heroes = Object.values(pack).filter((u) => u.side === 'hero')
    expect(heroes.length).toBe(6)
    for (const h of Object.values(pack)) {
      expect(h.typeId.startsWith('test-'), h.typeId).toBe(true)
      expect(h.name, h.typeId).toContain('(TEST)')
    }
    // every hero clone names the live Codex hero it copies
    for (const h of heroes) {
      expect((h as { copyOf?: string }).copyOf, h.typeId).toMatch(/^hero\./)
    }
    expect(UNIT_PACK_NOTE).toContain('COPIED from live Codex heroes')
  })

  it('the six picks are Angela\'s: Oathblade I, Sky Pirate I, Dusk Hawk I, Air Mage, Lucius, Osric', () => {
    const pack = packUnits() as Record<string, { copyOf?: string }>
    expect(pack['test-oathblade']!.copyOf).toBe('hero.shadows.oathblade.v1')
    expect(pack['test-sky-pirate']!.copyOf).toBe('hero.skyship.sky-pirate.v1')
    expect(pack['test-dusk-hawk']!.copyOf).toBe('hero.shadows.dusk-hawk.v1')
    expect(pack['test-air-mage']!.copyOf).toBe('hero.fixed.air-mage')
    expect(pack['test-lucius']!.copyOf).toBe('hero.tutorial.priest-scantily.lucius')
    expect(pack['test-osric']!.copyOf).toBe('hero.tutorial.paladin-shiney.osric')
  })

  it('the Sky Pirate\'s Cutlass came through the converter, not through hand-typing', () => {
    const sp = packUnits()['test-sky-pirate']!
    const cutlass = (sp.triggers ?? []).find((t) => t.id === 'test.sky-pirate.apply-bleed')!
    expect(cutlass).toBeDefined()
    expect(cutlass.hook).toBe('onDamage')
    expect(cutlass.effect).toEqual({ kind: 'status.apply', statusId: 'status.bleed', value: 1 })
  })

  it('the riders travelled to the cohort with their old ids — coverage never broke', () => {
    const pack = packUnits()
    const ids = (t: string) => (pack[t]!.triggers ?? []).map((x) => x.id)
    expect(ids('test-oathblade')).toEqual(expect.arrayContaining(
      ['test.warrior.second-wind', 'test.warrior.stagger', 'test.warrior.brace']))
    expect(ids('test-air-mage')).toEqual(expect.arrayContaining(
      ['test.mage.dampen', 'test.mage.arcane-ward']))
    expect(ids('test-dusk-hawk')).toEqual(expect.arrayContaining(['test.ranger.pin']))
    // serrated-arrows retired: nobody carries it, anywhere
    for (const u of Object.values(UNITS)) {
      expect((u.triggers ?? []).map((t) => t.id), u.typeId).not.toContain('test.ranger.serrated-arrows')
    }
  })

  it('the standard battle fields the pack and ONLY the pack', () => {
    for (const t of [...FIRST_BATTLE.heroes, ...FIRST_BATTLE.enemies]) {
      expect(t.startsWith('test-'), t).toBe(true)
    }
    const ctx = createBattle({ replicate: 0 })
    runBattle(ctx)
    const fielded = new Set(ctx.state.units.map((u) => u.typeId))
    for (const t of fielded) expect(t.startsWith('test-'), t).toBe(true)
    expect(ctx.state.units.filter((u) => u.side === 'hero').length).toBe(6)
  })
})
