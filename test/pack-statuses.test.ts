// pack.statuses (2026-09-02) — the engine reads its statuses from the Codex.
// Andrew, asked whether the Codex may own the status rows: "Yes — Codex owns
// the rows." The rows (settled.json → statuses) compile by exact sentence in
// content/mkenginepack.mjs into behaviour flags; the loader (packStatuses)
// turns `tick` into the End-of-Phase hook, and statuses.ts keeps only the
// test lane. Pipeline agreement, never frozen numbers: every assertion here
// reads the Codex row and checks the pack said the same thing.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { STATUSES } from '../src/content/statuses.js'
import { packStatuses } from '../src/content/pack.js'
import { createBattle, createCustomBattle } from '../src/core/setup.js'
import { runBattle } from '../src/core/battle.js'
import { applyStatus, tickStatuses } from '../src/core/status.js'
import { hexId } from './board16.js'

const settledStatuses = (): { id: string; effect: string; decay: string; family?: string; damageType?: string }[] =>
  JSON.parse(readFileSync(join(__dirname, '..', '..', 'content', 'settled.json'), 'utf8')).statuses
const gaps = (): { unit: string; what: string; needs: string }[] =>
  JSON.parse(readFileSync(join(__dirname, '..', '..', 'content', 'gen', 'enemy-pack-gaps.json'), 'utf8')).gaps

describe('the rows come from the Codex, and only from the Codex', () => {
  it('every status.* id the engine knows is a Codex row, and every Codex row is either loaded or a named gap', () => {
    const codex = settledStatuses()
    const codexIds = new Set(codex.map((r) => r.id))
    const gapIds = new Set(gaps().filter((g) => g.unit.startsWith('status.')).map((g) => g.unit))
    for (const id of Object.keys(STATUSES)) {
      if (id.startsWith('test.')) continue
      expect(codexIds.has(id), `${id} is loaded but no Codex row says so`).toBe(true)
    }
    for (const r of codex) {
      const loaded = STATUSES[r.id] !== undefined
      const gapped = gapIds.has(r.id)
      expect(loaded !== gapped, `${r.id} must be exactly one of: loaded, named gap (loaded=${loaded}, gap=${gapped})`).toBe(true)
    }
    // the ones the engine cannot behave for yet, by name — when one lands its
    // gap disappears and this list is the finding. 2026-09-03: Frost, Root and
    // Taunt landed (capability.frost/root/taunt); three remain.
    // ... and the last three the same day (capability.karma/shadow/confusion). None remain.
    expect([...gapIds].sort()).toEqual([])
  })

  it('statuses.ts hand-types nothing but the test lane', () => {
    const pack = packStatuses()
    for (const id of Object.keys(STATUSES)) {
      if (id.startsWith('test.')) expect(pack[id], `${id} is a test row, never in the pack`).toBeUndefined()
      else expect(pack[id], `${id} must come from the pack`).toBeDefined()
    }
  })

  it('each loaded row carries the behaviour its Codex sentence says — agreement, not numbers', () => {
    const byId = new Map(settledStatuses().map((r) => [r.id, r]))
    const expectFlag = (id: string, flag: keyof typeof STATUSES[string], phrase: RegExp) => {
      const row = byId.get(id)!
      expect(phrase.test(row.effect), `${id}: the Codex sentence says '${row.effect}'`).toBe(true)
      expect(STATUSES[id]![flag], `${id}.${String(flag)}`).toBeTruthy()
    }
    expectFlag('status.protection', 'reducesIncomingDamage', /^Prevents damage/)
    expectFlag('status.weak', 'reducesOutgoingDamage', /^Reduces the damage/)
    expectFlag('status.slow', 'reducesMovement', /Movement/)
    expectFlag('status.stun', 'blocksAction', /Stops the unit acting/)
    expectFlag('status.burn', 'halvesHealing', /halves all healing/)
    expectFlag('status.powers-locked', 'locksPowers', /class powers/)
    expectFlag('status.dazed', 'aiControlled', /hands it to the AI/)
    expectFlag('status.bleed', 'shedByHealing', /healing removes half/)
    // tick types: the row's own damageType, else the ruled "Resist mitigates" magic
    expect(STATUSES['status.bleed']!.tickDamageType).toBe(byId.get('status.bleed')!.damageType)
    for (const id of ['status.poison', 'status.burn']) {
      expect(/Resist mitigates each tick/.test(byId.get(id)!.decay), id).toBe(true)
      expect(STATUSES[id]!.tickDamageType, id).toBe('magic')
    }
    // the family word rides along verbatim
    for (const [id, def] of Object.entries(STATUSES)) {
      if (id.startsWith('test.')) continue
      expect((def as { family?: string }).family, id).toBe(byId.get(id)!.family ?? (byId.get(id) as { shape?: string }).shape)
    }
  })

  it('the loader turns tick into the hook, and only tick rows tick', () => {
    for (const [id, def] of Object.entries(STATUSES)) {
      if (id.startsWith('test.')) continue
      const ticks = ['status.poison', 'status.burn', 'status.bleed', 'status.regeneration'].includes(id)
      expect(def.onPhaseEnd !== undefined, `${id} ${ticks ? 'ticks' : 'does not tick'}`).toBe(ticks)
    }
    const ctx = createCustomBattle([{ type: 'test-warrior', hex: hexId(5, 5) }], [{ type: 'test-zombie', hex: hexId(9, 9) }])
    const w = ctx.state.units[0]!
    w.maxHp = 20; w.hp = 10
    applyStatus(ctx, 0, 'status.poison', 3, 'test')
    applyStatus(ctx, 0, 'status.regeneration', 1, 'test')
    tickStatuses(ctx, 'hero')
    expect(w.hp).toBe(10 - 3 + 1)
    expect(ctx.events.find((e) => e.type === 'damage.applied' && e.causeId === 'status.poison')!['damageType']).toBe('magic')
  })
})

describe('in real battles — the pack rows are the rows every battle runs on', () => {
  it('poison, burn, bleed, protection, slow, weak, stun and regeneration all appear in the standard battle\'s first 30 seeds', () => {
    const seen = new Set<string>()
    for (let r = 0; r < 30; r++) {
      const ctx = createBattle({ replicate: r, enemyCount: 8 }); runBattle(ctx)
      for (const e of ctx.events) if (e.type === 'status.applied') seen.add(e['statusId'] as string)
    }
    for (const id of ['status.poison', 'status.burn', 'status.bleed', 'status.protection', 'status.slow', 'status.weak', 'status.stun', 'status.regeneration']) {
      expect(seen, id).toContain(id)
    }
  })
})
