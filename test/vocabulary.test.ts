// plumbing.vocabulary-export (2026-09-28; DECISIONS.md "the duplication review, ruled"; review
// findings C10 C11 C16 C17 K6 K13 V12): the engine exports ONE vocabulary — stats, hooks, effect
// kinds, outcomes, life states, events, layers and terrain — and nothing inside the engine keeps
// a second hand copy of it. The kingdom, the viewer and the content tools check their own label
// tables against this export in their own suites.
import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { engineVocabulary, vocabularyJson } from '../src/core/vocabulary.js'
import { EVENT_TYPES } from '../src/core/mutate.js'
import { FOLDABLE, defaultAiOf } from '../src/core/items.js'
import { validateAuras } from '../src/content/pack.js'
import { ACTIONS, ITEMS, UNITS } from '../src/content/index.js'
import { createBattle } from '../src/core/setup.js'
import { runBattle } from '../src/core/battle.js'
import type { UnitDef } from '../src/core/types.js'

const SRC = fileURLToPath(new URL('../src/', import.meta.url))
const sources = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap((d) =>
  d.isDirectory() ? sources(join(dir, d.name)) : d.name.endsWith('.ts') ? [join(dir, d.name)] : [])
const text = (p: string) => readFileSync(p, 'utf8')

describe('plumbing.vocabulary-export — one exported vocabulary', () => {
  it('generated/vocabulary.json is exactly the live export (npx tsx tools/vocabulary.mts)', () => {
    expect(text(fileURLToPath(new URL('../generated/vocabulary.json', import.meta.url)))).toBe(vocabularyJson())
  })

  it('every listed event is emitted by some source, and every source emit names a listed event', () => {
    const all = sources(SRC).filter((p) => !p.endsWith('vocabulary.ts'))
    const body = all.map((p) => text(p).replace(/export const EVENT_TYPES = \[[\s\S]*?\] as const/, '')).join('\n')
    for (const t of EVENT_TYPES) expect(body.includes(`'${t}'`), `${t} is listed but no source emits it`).toBe(true)
    const emitted = [...body.matchAll(/emit\(\w+,\s*'([^']+)'/g)].map((m) => m[1]!)
    expect(emitted.length).toBeGreaterThan(100)
    for (const t of emitted) expect(EVENT_TYPES as readonly string[], `${t} is emitted but not listed`).toContain(t)
    // the life transitions are spelled out for readers of the export
    expect(engineVocabulary().events).toEqual(expect.arrayContaining(['life.standing', 'life.downed', 'life.dead']))
  })

  it('a real battle emits only listed events', () => {
    const ctx = createBattle({ replicate: 0, enemyCount: 8 })
    runBattle(ctx)
    const listed = new Set(engineVocabulary().events)
    const strangers = [...new Set(ctx.events.map((e) => e.type))].filter((t) => !listed.has(t))
    expect(strangers).toEqual([])
  })

  it('the ground layers are five, layer.weak among them, each with what it applies', () => {
    const v = engineVocabulary()
    expect(v.layers.map((l) => l.id)).toEqual(['layer.burning', 'layer.frost', 'layer.poisoned', 'layer.darkness', 'layer.weak'])
    expect(v.layers.find((l) => l.id === 'layer.weak')!.onEnter).toEqual([['status.weak', 1]])
    expect(v.terrain.find((t) => t.glyph === 'b')!.id).toBe('terrain.burning')
  })

  it('every resolvable stat is foldable; the stat list the pack checks against IS FOLDABLE', () => {
    const v = engineVocabulary()
    expect(v.stats).toEqual([...FOLDABLE])
    for (const s of v.resolvable) expect(v.stats).toContain(s)
  })

  it('a Codex aura lending Thorns, Vision or a swap cost loads; one lending a non-stat is refused', () => {
    const body = (mods: Record<string, number>) => ({ x: { typeId: 'x', auras: [{ id: 'aura.test.lend', radius: 2, mods }] } as unknown as UnitDef })
    expect(() => validateAuras(body({ thorns: 1 }))).not.toThrow()
    expect(() => validateAuras(body({ vision: 1, swapCost: -1 }))).not.toThrow()
    expect(() => validateAuras(body({ hp: 1 }))).toThrow(/lends 'hp', not a stat/)
  })

  it('no engine source keeps a second hand list of the stats, the trigger effect kinds or the action effect kinds', () => {
    const offenders: string[] = []
    for (const p of sources(SRC)) {
      const s = text(p)
      // FOLDABLE's own run of names. snapshot.ts's Unit-field lists (hp, stamina, bleedOut …) validate
      // the Unit record's integer fields, a different concept, and are not matched.
      if (/'crit',\s*'luck',\s*'toughness',\s*'surge'/.test(s) && !p.endsWith(join('core', 'items.ts'))) offenders.push(`${p}: a stat list`)
      if (/'burstScale',\s*'status\.apply'/.test(s) && !p.endsWith(join('core', 'trigger.ts'))) offenders.push(`${p}: a trigger effect kind list`)
      if (/'corpse\.eat',\s*'stamina\.gain'|'stamina\.gain',\s*'knockback',\s*'corpse\.eat'/.test(s) && !p.endsWith(join('core', 'types.ts'))) offenders.push(`${p}: an action effect kind list`)
    }
    expect(offenders).toEqual([])
  })

  it('the default AI has one owner: a pack row that authors none takes defaultAiOf over its kit', () => {
    let filled = 0
    for (const u of Object.values(UNITS)) {
      expect(typeof u.ai, u.typeId).toBe('string')
      if (u.aiAuthored || !(u.typeId.startsWith('hero.') || u.typeId.startsWith('alpha-'))) continue
      const kit = [...(u.defaultItems ?? []).flatMap((id) => ITEMS[id]?.grants ?? []), ...u.attacks]
      expect(u.ai, u.typeId).toBe(defaultAiOf(kit, ACTIONS))
      filled++
    }
    expect(filled).toBeGreaterThan(10)
    expect(Object.keys(UNITS['hero.base.paladin-dark']!).indexOf('ai') + 1).toBe(Object.keys(UNITS['hero.base.paladin-dark']!).indexOf('attacks'))
  })
})
