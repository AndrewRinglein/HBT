// refactor.one-action-type (2026-09-04), Law 10 reason: the row's SHAPE moved by ruling — attack fields read under `.attack`, reach is `range`, move fields under `.move`, the registries are one (`ctx.actions`) and the unit's lists are views (attackIdsOf/powerIdsOf). No assertion changed.
// pack.moves (2026-09-02) — the engine reads its movement powers from the
// Codex. Angela 2026-08-21: "Movement is a choice… It shouldn't be hard-coded.
// It should be content-driven." The Codex's movementAction power rows compile
// by exact phrase (content/mkenginepack.mjs) into MoveDefs; the loader
// validates them; moves.ts types nothing. Pipeline agreement, never frozen
// numbers: every assertion reads the Codex row and checks the pack agrees.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { MOVES } from '../src/content/moves.js'
import { packMoves } from '../src/content/pack.js'
import { UNITS, FIRST_BATTLE } from '../src/content/index.js'
import { createBattle } from '../src/core/setup.js'
import { runBattle } from '../src/core/battle.js'

type Row = { id: string; name: string; stamina: number; cooldown: number; description: string; movementAction?: boolean; bonusMove?: boolean }
const codexMoves = (): Row[] =>
  (JSON.parse(readFileSync(join(__dirname, '..', '..', 'content', 'settled.json'), 'utf8')).powers as Row[]).filter((p) => p.movementAction)
const gaps = (): { unit: string; needs: string }[] =>
  JSON.parse(readFileSync(join(__dirname, '..', '..', 'content', 'gen', 'enemy-pack-gaps.json'), 'utf8')).gaps

describe('the rows come from the Codex, and only from the Codex', () => {
  it('every movementAction row is loaded or a named gap, and nothing else is loaded', () => {
    const rows = codexMoves()
    const gapIds = new Set(gaps().filter((g) => g.unit.startsWith('power.')).map((g) => g.unit))
    for (const r of rows) {
      const loaded = MOVES[r.id] !== undefined
      expect(loaded !== gapIds.has(r.id), `${r.id}: loaded=${loaded} gap=${gapIds.has(r.id)}`).toBe(true)
    }
    const codexIds = new Set(rows.map((r) => r.id))
    for (const id of Object.keys(MOVES)) expect(codexIds.has(id), `${id} is loaded but no Codex row says so`).toBe(true)
    // the two the engine cannot express, by name — when one lands, this is the finding
    expect([...gapIds].sort()).toEqual(['power.charging-run', 'power.pray'])
    expect(Object.keys(MOVES)).toEqual(Object.keys(packMoves()))
  })

  it('numbers agree with the rows, and the prose agrees with the numbers', () => {
    for (const r of codexMoves()) {
      const m = MOVES[r.id]
      if (!m) continue
      expect(m.staminaCost, `${r.id} stamina`).toBe(r.stamina)
      expect(m.cooldown, `${r.id} cooldown`).toBe(r.cooldown)
      expect(m.name).toBe(r.name)
      if (/Move exactly (\d) hex/.test(r.description)) {
        expect(m.move.shape).toBe('sidestep')
        expect(m.move.stepRange).toBe(parseInt(r.description.match(/Move exactly (\d) hex/)![1]!, 10))
      }
      if (/Do not move at all/.test(r.description)) { expect(m.move.shape).toBe('sidestep'); expect(m.move.stepRange).toBe(0) }
      if (/^Movement action\. Move up to your Movement/.test(r.description)) expect(m.move.shape).toBe('flight')
      if (/^Move up to your Movement, hex by hex/.test(r.description)) expect(m.move.shape).toBe('path')
      if (/It is a bonus move/.test(r.description)) expect(m.move.budgetMod, `${r.id} a bonus move does NOT add the Movement stat`).toBe(0)
      if (/Movement \+ 1/.test(r.description)) expect(m.move.budgetMod).toBe(1)
      if (/Movement - 1/.test(r.description)) expect(m.move.budgetMod).toBe(-1)
      if (/gain \+(\d) Strength until the end of the Turn/.test(r.description)) {
        expect(m.effects).toContainEqual({ kind: 'statMod', stat: 'strength', value: parseInt(r.description.match(/gain \+(\d) Strength/)![1]!, 10), until: 'endOfTurn' })
      }
      if (/Gain (\d) Stamina\./.test(r.description)) expect(m.effects).toContainEqual({ kind: 'gainStamina', value: parseInt(r.description.match(/Gain (\d) Stamina\./)![1]!, 10) })
      if (/Lose (\d) Stamina Max/.test(r.description)) expect(m.effects).toContainEqual({ kind: 'loseMaxStamina', value: parseInt(r.description.match(/Lose (\d) Stamina Max/)![1]!, 10) })
    }
  })
})

describe('in real battles — every fielded unit walks on a Codex row', () => {
  it('every move the standard battle uses is a loaded Codex row, and the Alpha Team uses more than plain Move', () => {
    const used = new Set<string>()
    for (let r = 0; r < 20; r++) {
      const ctx = createBattle({ replicate: r, enemyCount: 8 }); runBattle(ctx)
      // move.begin names the movement power as its cause (movement.ts)
      for (const e of ctx.events) if (e.type === 'move.begin') used.add(e.causeId)
    }
    for (const id of used) expect(MOVES[id], id).toBeDefined()
    for (const t of FIRST_BATTLE.heroes) for (const id of UNITS[t]!.moves) expect(MOVES[id], `${t} carries ${id}`).toBeDefined()
    expect(used.size, 'more than one movement power is walked in the standard battle').toBeGreaterThan(1)
  })
})
