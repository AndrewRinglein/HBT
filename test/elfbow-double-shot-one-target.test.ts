// content.elfbow-double-shot-one-target (2026-10-04). Ruled 2026-10-04 (Andrew, DECISIONS.md 'his 28 reward weapons read back:
// the Elfbow shoots one target; the mechanics his own items need are wanted'): "Elfpo is supposed to only shoot one target."
// ('Elfpo' is the Elfbow — dictation.) The Elfbow's Double Shot read "Targets: up to 2 enemies within 4 hexes"; it is two
// hits on ONE target — in the row, in its text, and so on the action bar and in the Codex. Nothing else on the Elfbow
// changes, and no other bow.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { advanceBattle } from '../src/core/battle.js'
import { executeAction, validateAction } from '../src/core/commands.js'
import { createBattle } from '../src/core/setup.js'
import { ACTIONS, ITEMS } from '../src/content/index.js'
import { hexId } from './board16.js'

const CONTENT = join(__dirname, '..', '..', 'content')
type CodexAttack = { id: string; name: string; range: number | string; stat: string; damage: number; stamina: number; accuracy: number; crit: number; hits: number; targets: string; intent?: string; description?: string; triggers: unknown[] }
const CODEX = JSON.parse(readFileSync(join(CONTENT, 'hbt-content.json'), 'utf8')) as { attacks: CodexAttack[]; items: { id: string; tags?: string[]; grants?: string[] }[] }
const GAPS = (JSON.parse(readFileSync(join(CONTENT, 'gen', 'enemy-pack-gaps.json'), 'utf8')) as { gaps: { unit: string; what: string; needs: string }[] }).gaps
const codexAttack = (id: string) => CODEX.attacks.find((a) => a.id === id)!
const BOW = 'item.elfbow', DOUBLE = 'attack.elfbow.double-shot', ELF = 'attack.elfbow.elf-shot'
const RANGER = 'hero.base.ranger-ranger'
const row = (a: CodexAttack) => [a.id, a.name, a.range, a.stat, a.damage, a.stamina, a.accuracy, a.crit, a.hits, a.targets]

describe('the Elfbow\'s Double Shot is two hits on one target', () => {
  it('the row: one enemy within 4 hexes, 2 hits — its numbers as they were', () => {
    expect(row(codexAttack(DOUBLE))).toEqual([DOUBLE, 'Double Shot', 4, 'precision', -2, 2, -5, 0, 2, 'one enemy within 4 hexes'])
  })

  it('its text nowhere says a second enemy: not the targets, the intent or a description, nor the Elfbow\'s own lines', () => {
    const a = codexAttack(DOUBLE), bow = CODEX.items.find((i) => i.id === BOW) as unknown as Record<string, unknown>
    for (const text of [a.targets, a.intent ?? '', a.description ?? '', String(bow['intent'] ?? ''), String(bow['description'] ?? '')]) {
      expect(text).not.toMatch(/up to \d+ enem/i)
      expect(text).not.toMatch(/\bspread\b|two targets|second (enemy|target)|two enemies/i)
    }
  })

  it('no line of the gap list names it: there is no clause of the row the engine does not field', () => {
    expect(GAPS.filter((g) => g.what.includes(DOUBLE))).toEqual([])
    expect(((ITEMS[BOW] as { gaps?: readonly string[] }).gaps ?? []).filter((g) => g.includes(DOUBLE))).toEqual([])
  })

  it('the engine\'s row: an attack on one unit, two hits, Precision −2, −5 Accuracy, 2 Stamina, range 4', () => {
    expect(ACTIONS[DOUBLE]).toMatchObject({ name: 'Double Shot', staminaCost: 2, range: 4, attack: { kind: 'ranged', stat: 'precision', bonus: -2, accuracy: -5, hits: 2 } })
    expect(ITEMS[BOW]!.grants).toEqual([ELF, DOUBLE])
  })

  it('in a battle: a Ranger aims it at one enemy, pays 2 Stamina once, and both hits are rolled against that enemy — the other enemy in reach is not shot', () => {
    const ctx = createBattle({ replicate: 0, strict: true, mapId: 'map.open', heroes: [RANGER], heroHexes: [hexId(5, 5)], heroItems: [[BOW]],
      enemies: ['test-zombie', 'test-zombie'], enemyHexes: [hexId(5, 8), hexId(6, 8)], enemyCount: 2, overrides: { 'test-zombie': { maxHp: 60 } as never } })
    advanceBattle(ctx)
    const h = ctx.state.units[0]!, [first, second] = ctx.state.units.filter((u) => u.side === 'enemy')
    expect(ctx.geo.distance(h.hex, first!.hex)).toBeLessThanOrEqual(4); expect(ctx.geo.distance(h.hex, second!.hex)).toBeLessThanOrEqual(4)
    expect(validateAction(ctx, { actor: h.id, actionId: DOUBLE, target: first!.id })).toEqual({ ok: true })
    const stamina = h.stamina, from = ctx.events.length
    expect(executeAction(ctx, { actor: h.id, actionId: DOUBLE, target: first!.id })).toEqual({ ok: true })
    const after = ctx.events.slice(from)
    const shots = after.filter((e) => e.type === 'attack.declared' && e.actor === h.id)
    expect(shots).toHaveLength(2)
    for (const s of shots) expect(s.target).toBe(first!.id)
    expect(after.filter((e) => e.target === second!.id && /^attack\.|^damage\./.test(e.type))).toEqual([])
    expect(h.stamina).toBe(stamina - 2)
    expect(after.filter((e) => e.type === 'stamina.spent' && e.actor === h.id)).toHaveLength(1)
  })
})

describe('nothing else on the Elfbow changes, and no other bow', () => {
  it('Elf Shot is as it was', () => {
    expect(row(codexAttack(ELF))).toEqual([ELF, 'Elf Shot', 6, 'precision', -1, 1, 15, 0, 1, 'one enemy within 6 hexes'])
    expect(codexAttack(ELF).triggers).toEqual([{ hook: 'onHit', chance: 100, effect: 'gain 1 Precision' }])
  })

  it('every other bow\'s attacks are as they were', () => {
    const others = CODEX.items.filter((i) => (i.tags ?? []).includes('bow') && i.id !== BOW).flatMap((i) => i.grants ?? []).filter((g) => g.startsWith('attack.')).map((g) => row(codexAttack(g)))
    expect(others).toEqual([
      ['attack.sniper-bow.loose', 'Loose', 9, 'precision', 1, 1, 5, 0, 1, 'one enemy within 9 hexes'],
      ['attack.sniper-bow.long-shot', 'Long Shot', 14, 'precision', 2, 3, 10, 5, 1, 'one enemy within 14 hexes'],
      ['attack.twin-talon-bow.talon-shot', 'Talon Shot', 8, 'precision', 2, 1, 5, 0, 1, 'one enemy within 8 hexes'],
      ['attack.twin-talon-bow.double-nock', 'Double Nock', 7, 'precision', 1, 2, -5, 0, 2, 'one enemy within 7 hexes'],
      ['attack.seraph-bow.seraph-shot', 'Seraph Shot', 9, 'precision', 2, 1, 5, 0, 1, 'one enemy within 9 hexes'],
      ['attack.seraph-bow.feathered-judgment', 'Feathered Judgment', 9, 'precision', 3, 2, 5, 5, 1, 'one enemy within 9 hexes'],
      ['attack.death-bow.death-shot', 'Death Shot', 9, 'precision', 3, 1, 5, 0, 1, 'one enemy within 9 hexes'],
      ['attack.death-bow.the-last-arrow', 'The Last Arrow', 12, 'precision', 5, 3, 10, 5, 1, 'one enemy within 12 hexes'],
      ['attack.longbow.shot', 'Shot', 6, 'precision', 1, 1, 0, 0, 1, 'one enemy within 6 hexes'],
      ['attack.longbow.long-shot', 'Long Shot', 7, 'precision', 2, 2, 10, 0, 1, 'one enemy within 7 hexes'],
      ['attack.shortbow.short-shot', 'Short Shot', 5, 'precision', 1, 1, 5, 0, 1, 'one enemy within 5 hexes'],
      ['attack.shortbow.quick-shot', 'Quick Shot', 4, 'precision', 0, 0, 0, 5, 1, 'one enemy within 4 hexes'],
      ['attack.barbarian-bow.power-shot', 'Power Shot', 6, 'precision', 2, 2, -10, 0, 1, 'one enemy within 6 hexes'],
      ['attack.barbarian-bow.crippling-shot', 'Crippling Shot', 6, 'precision', 1, 2, -10, 0, 1, 'one enemy within 6 hexes'],
    ])
  })
})
