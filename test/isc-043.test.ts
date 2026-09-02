// ISC-043 — Battles 1–5 field the enemies ENEMY-REVIEW.md names, in order, and
// the civilians that stand with them, as Engagement rows the opening reads.
// ENEMY-REVIEW.md Battles 1–5 · THIN-SLICE-REVIEW.md §G2
import { describe, it, expect } from 'vitest'
import { PROLOGUE } from '../src/content/prologue.js'
import { makeNewCampaign } from '../src/core/opening.js'
import { makeCtx } from '../src/core/mutate.js'
import { playOpening } from '../src/sim/autoplay.js'
import { UNITS } from '../src/engine.js'

const count = (list: readonly string[], id: string) => list.filter((x) => x === id).length

describe('ISC-043 — the five prologue battles are the authored ones', () => {
  it('five rows, in order, with the dictated enemies and the civilians who stand with them', () => {
    expect(PROLOGUE.map((r) => r.n)).toEqual([1, 2, 3, 4, 5])
    const [b1, b2, b3, b4, b5] = PROLOGUE as [typeof PROLOGUE[0], typeof PROLOGUE[0], typeof PROLOGUE[0], typeof PROLOGUE[0], typeof PROLOGUE[0]]
    expect(count(b1.enemies, 'unit.zombie')).toBe(3); expect(b1.civilians).toEqual(['hero.fixed.orphans'])
    expect(count(b2.enemies, 'unit.zombie')).toBe(4); expect(count(b2.enemies, 'unit.skeletal-archer')).toBe(4); expect(count(b2.enemies, 'unit.fast-zombie')).toBe(4); expect(count(b2.enemies, 'unit.necromancer')).toBe(1)
    expect(b2.civilians).toEqual(['hero.fixed.lumberjack-and-wife', 'hero.fixed.farmer'])
    expect(count(b3.enemies, 'unit.imp')).toBe(6); expect(count(b3.enemies, 'unit.powerful-imp')).toBe(1); expect(count(b3.enemies, 'unit.fire-imp')).toBe(2)
    expect(count(b4.enemies, 'unit.bruiser-demon')).toBe(2); expect(count(b4.enemies, 'unit.poison-imp')).toBe(2); expect(count(b4.enemies, 'unit.lieutenant-demon')).toBe(1)
    expect(count(b5.enemies, 'unit.bloodhound')).toBe(4); expect(count(b5.enemies, 'unit.hellhound')).toBe(2); expect(count(b5.enemies, 'unit.zombie-hound')).toBe(8); expect(count(b5.enemies, 'unit.werewolf')).toBe(1)
    // every enemy and civilian is a unit row the engine fields
    for (const r of PROLOGUE) for (const id of [...r.enemies, ...r.civilians]) expect(UNITS[id], id).toBeDefined()
    expect(b4.territoryId).toBe('territory.ruined-kingdom.sanctuary')
  })
  it('the opening fields them in order and the civilians join the roster', () => {
    const ctx = playOpening(makeCtx(makeNewCampaign(5)))
    const fielded = ctx.events.filter((e) => e.type === 'engagement.offered' || e.type === 'cursor.moved').map((e) => (e['to'] as { engagement?: { prologue?: number; enemies: string[] } } | undefined)?.engagement).filter((e): e is { prologue?: number; enemies: string[] } => !!e && e.prologue !== undefined)
    const seen = [...new Map(fielded.map((e) => [e.prologue!, e.enemies])).entries()].sort((a, b) => a[0] - b[0])
    expect(seen.map(([n]) => n)).toEqual([1, 2, 3, 4, 5])
    for (const [n, enemies] of seen) expect(enemies).toEqual([...PROLOGUE[n - 1]!.enemies])
    expect(ctx.events.filter((e) => e.type === 'hero.rescued').map((e) => e['heroId'])).toEqual(['hero.fixed.orphans', 'hero.fixed.lumberjack-and-wife', 'hero.fixed.farmer'])
    expect(ctx.campaign.roster['hero.fixed.orphans']).toBeDefined()
  })
})
