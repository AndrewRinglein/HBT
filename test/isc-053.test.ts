// ISC-053 — a hero without a content kit is a named gap, never bare: the pool
// holds no hero whose codex row has kit: null; the kingdom's generated gaps file
// names any that appear, and the draft refuses one loudly.
// CLAUDE.md "content the engine cannot express goes in CONTENT-GAPS.md" — the
// kingdom's own gaps file is src/content/generated/kits-gaps.json (the root
// CONTENT-GAPS.md is content/mkgaps.mjs's and is never hand-edited).
import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { HERO_POOL, CIVILIANS, heroKitOf, assertKitted, KIT_GAPS, UNKITTED_HEROES } from '../src/content/heroes.js'

describe('ISC-053 — no kit, no hero', () => {
  it('the pool and the civilians all have kits; the generated gaps file exists and is empty for them', () => {
    for (const h of [...HERO_POOL, ...CIVILIANS]) expect(heroKitOf(h.id), h.id).not.toBeNull()
    expect(KIT_GAPS).toEqual([])
    // kingdom.opening-draft-pool (2026-10-03): the pool is the 24 base heroes; one with no kit would be left out and named
    expect(UNKITTED_HEROES).toEqual([])
    expect(existsSync('src/content/generated/kits-gaps.json')).toBe(true)
    const gaps = JSON.parse(readFileSync('src/content/generated/kits-gaps.json', 'utf8')) as { pool: string[] }
    expect(gaps.pool).toEqual([])
  })
  it('a hero the codex gives no kit is refused, by name, before it can be drafted', () => {
    expect(heroKitOf('hero.shadows.oathblade.v1')).toBeNull()               // a codex hero with kit: null
    expect(() => assertKitted('hero.shadows.oathblade.v1')).toThrow(/hero\.shadows\.oathblade\.v1.*no kit/)
    expect(() => assertKitted('hero.base.ranger-aggressive')).not.toThrow()
  })
})
