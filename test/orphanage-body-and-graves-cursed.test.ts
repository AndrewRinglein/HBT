// content.orphanage-body-and-graves-cursed (2026-10-05). Ruled 2026-10-05 (Andrew, DECISIONS.md 'playtest post: … bodies, cursed
// ground …' and 'the playtest post answered'): "In the Orphanage, both the body and the graves are supposed to be cursed ground,
// and they're not." — asked what cursed ground does: "It is already written down somewhere that you should take it from."
//
// What is written (DECISIONS.md 2026-09-28 'cursed ground is the Weak ground layer, the one ground-status shape'): "Cursed ground
// is `layer.weak`, the ground layer already built for it … +1 Weak on entering, +1 Weak at End of Activation, painted one per hex
// like the others." — "The opening's cursed hexes (the Ground Check's `*`) … are all painted `layer.weak`."
//
// FOUND, and held here (SWITCHES.md cursedGravesAreTheLumberjackHouses): the body and the three graves are on the LUMBERJACK
// HOUSE's map — battle 2, the battle he was playing ("It was the lumberjack house") — whose Ground Check marks them `*` (the
// three graves on the east edge, the body in the clearing) and whose scene README says "all three graves are reachable cursed
// cells". The map's source listed the four hexes as cursed and the encounter never painted them: plain ground, as he said. The
// Orphanage's own scene holds no grave and no body (its Ground Check has no `*`), so there is nothing on it to mark. The
// encounter now paints its map's cursed ground by the pipeline the caravan's corpses and the Cathedral's remains use — the row
// names the map's ground, never the hexes.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { endOfActivation } from '../src/core/battle.js'
import { executeMove, movePowerOf, pathTo, reachable } from '../src/core/movement.js'
import { beginActivation, endActivation, layerAt } from '../src/core/mutate.js'
import { createBattle } from '../src/core/setup.js'
import { valueOf } from '../src/core/status.js'
import { LAYER, layerIdOf } from '../src/content/maps.js'
import { encounterDef, scenarioDef, scenarioOptions } from '../src/content/scenarios.js'
import type { Ctx } from '../src/core/types.js'

const CONTENT = join(__dirname, '..', '..', 'content')
const OPENING = JSON.parse(readFileSync(join(CONTENT, 'gen', 'opening-maps.json'), 'utf8')) as { cursed: Record<string, number[]> }
const PROPOSAL = JSON.parse(readFileSync(join(__dirname, '..', '..', 'assets', 'battle-atlas', 'opening-ground-proposal-2026-09-28.json'), 'utf8')) as { legend: Record<string, string>; maps: { key: string; cols: number; rows_letters: string[]; notes: string[] }[] }
const LUMBERJACK = 'test.opening-lumberjack', ORPHANAGE = 'test.opening-orphanage'
const field = (s: string): Ctx => createBattle(scenarioOptions(scenarioDef(s)))
const painted = (ctx: Ctx, layer: string) => { const out: number[] = []; for (let h = 0; h < ctx.geo.board.width * ctx.geo.board.height; h++) if (layerIdOf((ctx.state.layers ?? [])[h] ?? 0) === layer) out.push(h); return out }
/** The hexes a map's Ground Check marks `*`, by id, read from the grid itself. */
const starred = (key: string) => { const m = PROPOSAL.maps.find((x) => x.key === key)!; return m.rows_letters.flatMap((row, r) => [...row].map((ch, c) => (ch === '*' ? r * m.cols + c : -1))).filter((h) => h >= 0) }

describe('what is written', () => {
  it('the Ground Check\'s legend says what the mark is: cursed ground, 1 Weak on entering and at the end of an Activation on it', () => {
    expect(PROPOSAL.legend['*']).toMatch(/cursed ground: 1 Weak on entering and at the end of an activation on it/)
  })

  it('the graves and the body are the Lumberjack House\'s: three on the east edge and one in the clearing — and the Orphanage\'s grid holds none', () => {
    expect(PROPOSAL.maps.find((x) => x.key === 'lumberjack')!.notes.join(' ')).toMatch(/Cursed ground \(\*\): the three graves on the east edge and the body in the clearing/)
    expect(starred('lumberjack')).toEqual([119, 131, 139, 159])
    expect(starred('lumberjack').map((h) => [h % 20, Math.floor(h / 20)])).toEqual([[19, 5], [11, 6], [19, 6], [19, 7]])
    expect(OPENING.cursed['map.opening.lumberjack']).toEqual([119, 131, 139, 159])
    expect(starred('orphanage')).toEqual([])
    expect(OPENING.cursed['map.opening.orphanage']).toBeUndefined()
  })
})

describe('the Lumberjack House: the body\'s hex and each grave\'s hex are cursed ground from the first frame', () => {
  it('the encounter names its map\'s ground — the row holds the layer, the hexes are the map\'s', () => {
    expect(encounterDef('encounter.opening.lumberjack').paint).toEqual([{ layer: 'layer.weak', hexes: [119, 131, 139, 159] }])
  })

  it('the four hexes are layer.weak when the battle is fielded, each painted by a line that names the encounter; no other hex carries a layer', () => {
    const ctx = field(LUMBERJACK)
    expect(painted(ctx, 'layer.weak')).toEqual([119, 131, 139, 159])
    for (let h = 0; h < 20 * 14; h++) if (![119, 131, 139, 159].includes(h)) expect(layerAt(ctx, h), `hex ${h}`).toBe(LAYER.NONE)
    const lines = ctx.events.filter((e) => e.type === 'layer.painted')
    expect(lines.map((e) => [e['hex'], e['after'], e.causeId])).toEqual([119, 131, 139, 159].map((h) => [h, LAYER.WEAK, 'encounter.opening.lumberjack']))
  })

  it('the ground under them is what it was: the map\'s own rows are unchanged, and nobody starts on a cursed hex', () => {
    const ctx = field(LUMBERJACK)
    for (const h of [119, 131, 139, 159]) expect(PROPOSAL.maps.find((x) => x.key === 'lumberjack')!.rows_letters[Math.floor(h / 20)]![h % 20]).toBe('*')
    for (const u of ctx.state.units) expect([119, 131, 139, 159], `${u.typeId} at ${u.hex}`).not.toContain(u.hex)
  })

  it('a unit that walks onto the body\'s hex gains 1 Weak on entering, and 1 more when its Activation ends there — the written rule, by the engine\'s own layer', () => {
    const ctx = field(LUMBERJACK)
    const u = ctx.state.units.find((x) => x.side === 'hero' && x.lifeState === 'standing')!
    // stand him beside the body in the clearing (11,6), nobody else near, and walk him one hex onto it
    const BODY = 131, beside = ctx.geo.neighbours(BODY).find((n: number) => !ctx.state.units.some((x) => x.hex === n) && layerAt(ctx, n) === LAYER.NONE)!
    u.hex = beside
    const weak = () => valueOf(u, 'status.weak')
    expect(weak()).toBe(0)
    beginActivation(ctx, u.id, 'test')
    const walk = movePowerOf(ctx, u, 'path')!
    executeMove(ctx, u.id, pathTo(reachable(ctx, u, walk.move.budgetMod), u.hex, BODY), walk)
    expect(u.hex).toBe(BODY)
    expect(weak()).toBe(1)   // on entering
    endActivation(ctx, u.id, 'test'); endOfActivation(ctx, u.id)
    // and 1 more at the end of the Activation on it (the status's own End-of-Activation pass then runs, as for every ground status)
    const gained = ctx.events.filter((e) => e.type === 'status.applied' && e.causeId === 'layer.weak' && e['target'] === u.id)
    expect(gained.map((e) => [e['statusId'], e['amount']])).toEqual([['status.weak', 1], ['status.weak', 1]])
  })
})

describe('the Orphanage is as it was: its scene holds no grave and no body', () => {
  it('no hex of the Orphanage carries a layer when it is fielded, and its encounter paints nothing', () => {
    const ctx = field(ORPHANAGE)
    expect(encounterDef('encounter.opening.orphanage').paint ?? []).toEqual([])
    expect(painted(ctx, 'layer.weak')).toEqual([])
    expect(ctx.events.filter((e) => e.type === 'layer.painted')).toEqual([])
  })
})
