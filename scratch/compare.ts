import { createBattle } from '../src/core/setup.js'
import { runBattle } from '../src/core/battle.js'
import { score } from '../src/sim/score.js'
import type { UnitDef } from '../src/core/types.js'

const N = 300
type Arm = { name: string; overrides: Record<string, Partial<UnitDef>> }
const ARMS: Arm[] = [
  { name: 'baseline',      overrides: {} },
  { name: 'warrior +2 str', overrides: { warrior: { strength: 7 } } },
  { name: 'ranger +5 sta',  overrides: { ranger: { maxStamina: 10 } } },
  { name: 'both',           overrides: { warrior: { strength: 7 }, ranger: { maxStamina: 10 } } },
]

function run(arm: Arm, z: number) {
  let clear = 0, turns = 0, downed = 0, dead = 0, kiteDenied = 0, wDmg = 0, rDmg = 0, massive = 0, axe = 0
  for (let i = 0; i < N; i++) {
    // identical replicate across arms => identical seeds => paired comparison
    const ctx = createBattle({ replicate: i, enemyCount: z, overrides: arm.overrides, strict: true })
    runBattle(ctx)
    const s = score(ctx.events)
    if (s.outcome === 'heroClear') clear++
    turns += s.turns; downed += s.heroesDowned; dead += s.heroesDead
    wDmg += s.damageDealtByType['warrior'] ?? 0
    rDmg += s.damageDealtByType['ranger'] ?? 0
    massive += s.attacksByAttack['attack.warrior.massive']?.swings ?? 0
    axe += s.attacksByAttack['attack.warrior.axe']?.swings ?? 0
    for (const e of ctx.events) if (e.type === 'ai.denied' && e['wanted'] === 'reposition') kiteDenied++
  }
  return {
    win: (clear / N) * 100, turns: turns / N, downed: downed / N, dead: dead / N,
    wDmg: wDmg / N, rDmg: rDmg / N, kite: kiteDenied / N,
    massivePct: massive + axe ? (massive / (massive + axe)) * 100 : 0,
  }
}

for (const z of [4, 6, 8, 10, 12]) {
  console.log(`\n═══ ${z} ZOMBIES ${'═'.repeat(50)}`)
  console.log(`  ${'arm'.padEnd(16)}${'win%'.padStart(7)}${'turns'.padStart(8)}${'downed'.padStart(9)}${'dead'.padStart(7)}${'W dmg'.padStart(8)}${'R dmg'.padStart(8)}${'kite-denied'.padStart(13)}${'massive%'.padStart(10)}`)
  const base = run(ARMS[0]!, z)
  for (const arm of ARMS) {
    const r = arm.name === 'baseline' ? base : run(arm, z)
    const d = arm.name === 'baseline' ? '' : `   (${r.win - base.win >= 0 ? '+' : ''}${(r.win - base.win).toFixed(0)}pt)`
    console.log(`  ${arm.name.padEnd(16)}${r.win.toFixed(0).padStart(6)}%${r.turns.toFixed(1).padStart(8)}${r.downed.toFixed(2).padStart(9)}${r.dead.toFixed(2).padStart(7)}${r.wDmg.toFixed(1).padStart(8)}${r.rDmg.toFixed(1).padStart(8)}${r.kite.toFixed(2).padStart(13)}${r.massivePct.toFixed(0).padStart(9)}%${d}`)
  }
}
console.log()
