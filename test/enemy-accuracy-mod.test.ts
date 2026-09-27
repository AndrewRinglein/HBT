// fix.enemy-accuracy-mod (2026-09-27) — found by pack.enemy-actions: the pack's
// regular enemy-attack lane (content/mkenginepack.mjs) dropped a row's
// accuracyMod silently — Bone Dragon Wings, Balrog Hurl — against Law 9 (never
// swallow a failure). The special-move lane already carried it onto
// AttackDef.accuracy (station.accuracy-field, 2026-09-03); the attack lane now
// does the same.
//
// Rules, not frozen numbers: every modifier below is read from the Codex's own
// bestiary row (content/hbt-content.json), never retyped.
//   (1) every enemy attack or move whose row carries an accuracyMod is in the
//       engine's attack registry with exactly that accuracy — or is a NAMED gap
//       (content/gen/enemy-pack-gaps.json) naming that action
//   (2) the carried modifier reaches the hit: the accuracy ledger preview()
//       returns (Law 1: the same pipeline resolution runs) has the SITUATIONAL
//       row for the attack, moving accuracy by the row's number
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { ATTACKS } from '../src/content/index.js'
import { createCustomBattle } from '../src/core/setup.js'
import { preview } from '../src/core/pipeline.js'
import { hexId } from './board16.js'

type RowAttack = { id: string; sameAs?: string; targets?: string; range?: number; accuracyMod?: number }
type RowMove = string | { id: string; attack?: RowAttack & { accuracyMod?: number } }
type Row = { id: string; attacks?: RowAttack[]; moves?: RowMove[] }
const CODEX = JSON.parse(readFileSync(join(__dirname, '..', '..', 'content', 'hbt-content.json'), 'utf8')) as { bestiary: Row[] }
const GAPS = (JSON.parse(readFileSync(join(__dirname, '..', '..', 'content', 'gen', 'enemy-pack-gaps.json'), 'utf8')) as
  { gaps: { unit: string; what: string; needs: string }[] }).gaps

type Modded = { unit: string; action: string; mod: number; lane: 'attack' | 'move'; row: RowAttack }
const MODDED: Modded[] = CODEX.bestiary.flatMap((u) => [
  ...(u.attacks ?? []).filter((a) => a.accuracyMod !== undefined)
    .map((a) => ({ unit: u.id, action: a.id, mod: a.accuracyMod!, lane: 'attack' as const, row: a })),
  ...(u.moves ?? []).flatMap((m) => typeof m === 'object' && m.attack?.accuracyMod !== undefined
    ? [{ unit: u.id, action: m.id, mod: m.attack.accuracyMod, lane: 'move' as const, row: m.attack }] : []),
])
const named = (m: Modded) => GAPS.some((g) => g.unit === m.unit && g.what.includes(m.action))
const carried = MODDED.filter((m) => !named(m))

describe('fix.enemy-accuracy-mod — the pack carries every row\'s accuracyMod', () => {
  it('the rows the item names carry an accuracyMod in the Codex (Bone Dragon Wings, Balrog Hurl)', () => {
    for (const id of ['attack.bone-dragon.wings', 'attack.balrog.hurl']) {
      expect(MODDED.some((m) => m.action === id && m.lane === 'attack'), id).toBe(true)
    }
  })

  it.each(MODDED.map((m) => [m.action, m] as const))('%s — carried with the row\'s accuracy, or a named gap', (_, m) => {
    if (named(m)) return   // a gap names the action; the engine cannot say it yet (e.g. a Charge)
    const a = ATTACKS[m.action]
    expect(a, `${m.action} is neither in the attack registry nor a named gap — dropped silently`).toBeDefined()
    expect(a!.attack.accuracy, `${m.action} accuracy`).toBe(m.mod)
  })

  it('every regular attack lane row is carried — none of them is a gap for its accuracy', () => {
    const regular = MODDED.filter((m) => m.lane === 'attack')
    expect(regular.length).toBeGreaterThan(0)
    for (const m of regular) {
      expect(GAPS.some((g) => g.unit === m.unit && g.what.includes(m.action)), `${m.action} gapped`).toBe(false)
      expect(ATTACKS[m.action]?.attack.accuracy, m.action).toBe(m.mod)
    }
  })
})

describe('fix.enemy-accuracy-mod — the modifier reaches the hit', () => {
  // single-target rows only: preview() is the one-target forecast (a burst has its own)
  const single = carried.filter((m) => /^one enemy/.test(m.row.targets ?? ''))
  it('there are single-target rows to fire', () => expect(single.length).toBeGreaterThan(0))

  it.each(single.map((m) => [m.action, m] as const))('%s — preview\'s accuracy ledger moves by the row\'s accuracyMod', (_, m) => {
    // ranged rows stand at 2 (no adjacency penalty, inside every range the rows state); melee adjacent
    const d = m.row.targets?.includes('within') ? 2 : 1
    const ctx = createCustomBattle([{ type: 'test-warrior', hex: hexId(4, 5) }], [{ type: m.unit, hex: hexId(4 + d, 5) }])
    const hero = ctx.state.units[0]!, foe = ctx.state.units[1]!
    expect(ctx.geo.distance(hero.hex, foe.hex)).toBe(d)
    const p = preview(ctx, foe.id, hero.id, m.action)
    const rows = p.accLedger.filter((r) => r.name === 'SITUATIONAL' && r.effectId === m.action)
    expect(rows.length, `${m.action} SITUATIONAL row`).toBe(1)
    expect(rows[0]!.delta).toBe(m.mod)
  })
})
