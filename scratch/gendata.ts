import { createBattle } from '../src/core/setup.js'
import { runBattle } from '../src/core/battle.js'
import { score } from '../src/sim/score.js'
import { foldToTurn, nameMap, renderBoard, renderLog, setupSeq } from '../src/view/text.js'
import type { UnitDef } from '../src/core/types.js'
import { writeFileSync } from 'node:fs'
import { MAPS } from '../src/content/maps.js'

const N = 300
const ARMS = [
  { id: 'baseline', label: 'Baseline', ov: {} as Record<string, Partial<UnitDef>> },
  { id: 'warrior', label: 'Warrior +2 Str', ov: { warrior: { strength: 7 } } },
  { id: 'ranger', label: 'Ranger +5 Sta', ov: { ranger: { maxStamina: 10 } } },
  { id: 'both', label: 'Both', ov: { warrior: { strength: 7 }, ranger: { maxStamina: 10 } } },
]
const ZOMBIES = [4, 5, 6, 7, 8, 9, 10, 11, 12, 14]

function runCell(ov: Record<string, Partial<UnitDef>>, z: number, mapId = 'open') {
  let clear = 0, turns = 0, downed = 0, dead = 0, kite = 0, invalid = 0, highGround = 0, casts = 0, boltDmg = 0
  const dmg: Record<string, number> = {}
  const atk: Record<string, { swings: number; hits: number; damage: number }> = {}
  const outcomes: Record<string, number> = {}
  const staminaByTurn: number[][] = []
  const turnList: number[] = []
  for (let i = 0; i < N; i++) {
    try {
      const ctx = createBattle({ replicate: i, enemyCount: z, mapId, overrides: ov, strict: true })
      runBattle(ctx)
      const s = score(ctx.events)
      if (s.outcome === 'heroClear') clear++
      outcomes[s.outcome] = (outcomes[s.outcome] ?? 0) + 1
      turns += s.turns; turnList.push(s.turns)
      downed += s.heroesDowned; dead += s.heroesDead
      for (const [k, v] of Object.entries(s.damageDealtByType)) dmg[k] = (dmg[k] ?? 0) + v
      for (const [k, v] of Object.entries(s.attacksByAttack)) {
        atk[k] ??= { swings: 0, hits: 0, damage: 0 }
        atk[k]!.swings += v.swings; atk[k]!.hits += v.hits; atk[k]!.damage += v.damage
      }
      const type = new Map<number, string>()
      for (const e of ctx.events) {
        if (e.type === 'unit.enter') type.set(e.actor!, e['typeId'] as string)
        if (e.type === 'activation.begin' && type.get(e.actor!) !== 'zombie')
          (staminaByTurn[e.turn as number] ??= []).push(e['stamina'] as number)
        if (e.type === 'ai.denied' && e['wanted'] === 'reposition') kite++
        if (e.type === 'ai.tookHighGround') highGround++
      }
      let pend = false
      for (const e of ctx.events) {
        if (e.type === 'power.used') { casts++; pend = true; continue }
        if (e.type === 'damage.applied' && pend) { boltDmg += e['amount'] as number; pend = false }
      }
    } catch { invalid++ }
  }
  return {
    n: N, win: +((clear / N) * 100).toFixed(1), turns: +(turns / N).toFixed(2),
    downed: +(downed / N).toFixed(2), dead: +(dead / N).toFixed(2),
    kite: +(kite / N).toFixed(2), invalid,
    highGround: +(highGround / N).toFixed(2), casts: +(casts / N).toFixed(2), boltDmg: +(boltDmg / N).toFixed(1),
    dmg: Object.fromEntries(Object.entries(dmg).map(([k, v]) => [k, +(v / N).toFixed(1)])),
    atk: Object.fromEntries(Object.entries(atk).map(([k, v]) => [k, { swings: +(v.swings / N).toFixed(2), hitPct: +((v.hits / v.swings) * 100).toFixed(1), dmg: +(v.damage / N).toFixed(1) }])),
    outcomes,
    turnHist: turnList.reduce<Record<number, number>>((m, t) => { m[t] = (m[t] ?? 0) + 1; return m }, {}),
    stamina: staminaByTurn.map((a) => (a ? +(a.reduce((s, c) => s + c, 0) / a.length).toFixed(2) : null)),
  }
}

const grid: Record<string, Record<number, ReturnType<typeof runCell>>> = {}
for (const arm of ARMS) { grid[arm.id] = {}; for (const z of ZOMBIES) grid[arm.id]![z] = runCell(arm.ov, z) }

// one-at-a-time sweeps at the tipping point
const strengthSweep = [5, 6, 7, 8, 9].map((s) => ({ x: s, massive: s + 3, axe: s + 1, ...runCell({ warrior: { strength: s } }, 8) }))
const staminaSweep = [5, 6, 7, 8, 9, 10, 12].map((s) => ({ x: s, ...runCell({ ranger: { maxStamina: s } }, 8) }))

// the authored map panel, at the tipping point
const mapPanel = MAPS.map((m) => ({
  id: m.id, name: m.name, note: m.note, rows: m.rows,
  hills: m.rows.join('').split('^').length - 1,
  byZ: Object.fromEntries([6, 8, 10].map((z) => [z, runCell({}, z, m.id)])),
}))

// a few full battles for the log explorer
const samples = [
  { z: 4, rep: 0, map: 'open' }, { z: 8, rep: 1, map: 'open' }, { z: 8, rep: 1, map: 'ridge' },
  { z: 8, rep: 4, map: 'highlands' }, { z: 10, rep: 2, map: 'flanks' }, { z: 12, rep: 3, map: 'open' },
].map(({ z, rep, map }) => {
  const ctx = createBattle({ replicate: rep, enemyCount: z, mapId: map, strict: true })
  const res = runBattle(ctx)
  const names = nameMap(ctx.events)
  const turnSeqs = ctx.events.filter((e) => e.type === 'turn.begin').map((e) => e.seq)
  return {
    id: `z${z}-${map}-r${rep}`, zombies: z, replicate: rep, mapId: map, outcome: res.outcome, turns: res.turns,
    events: ctx.events.length,
    log: renderLog(ctx.events, names),
    boards: [setupSeq(ctx.events), ...turnSeqs].map((s, i) => ({ label: i === 0 ? 'Deploy' : `Turn ${i}`, board: renderBoard(foldToTurn(ctx.events, s), map) })),
  }
})

const data = {
  generated: 'baseline.4v4 · The Combat Framework',
  n: N, arms: ARMS.map(({ id, label }) => ({ id, label })), zombies: ZOMBIES,
  grid, strengthSweep, staminaSweep, samples, mapPanel,
  totals: { battles: N * ARMS.length * ZOMBIES.length + N * (strengthSweep.length + staminaSweep.length) },
}
writeFileSync('scratch/data.json', JSON.stringify(data))
console.log('battles:', data.totals.battles, ' size:', (JSON.stringify(data).length / 1024).toFixed(0) + 'KB')
