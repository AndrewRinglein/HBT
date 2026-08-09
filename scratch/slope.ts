import { createBattle } from '../src/core/setup.js'
import { runBattle } from '../src/core/battle.js'
import { score } from '../src/sim/score.js'
const N = 400
console.log('\nWarrior strength swept one point at a time, 8 zombies\n')
console.log('  str  massive dmg  win%   turns   W dmg')
for (const strength of [5, 6, 7, 8, 9]) {
  let clear = 0, turns = 0, wd = 0
  for (let i = 0; i < N; i++) {
    const ctx = createBattle({ replicate: i, enemyCount: 8, overrides: { warrior: { strength } } })
    runBattle(ctx)
    const s = score(ctx.events)
    if (s.outcome === 'heroClear') clear++
    turns += s.turns; wd += s.damageDealtByType['warrior'] ?? 0
  }
  const win = (clear / N) * 100
  console.log(`  ${strength}${String(strength + 3).padStart(12)}${win.toFixed(0).padStart(7)}%${(turns / N).toFixed(1).padStart(8)}${(wd / N).toFixed(1).padStart(8)}  ${'#'.repeat(Math.round(win / 3))}`)
}
console.log('\nRanger max stamina swept, 8 zombies\n')
console.log('  max  win%   turns  kite-denied')
for (const maxStamina of [5, 6, 7, 8, 10, 12]) {
  let clear = 0, turns = 0, kd = 0
  for (let i = 0; i < N; i++) {
    const ctx = createBattle({ replicate: i, enemyCount: 8, overrides: { ranger: { maxStamina } } })
    runBattle(ctx)
    const s = score(ctx.events)
    if (s.outcome === 'heroClear') clear++
    turns += s.turns
    for (const e of ctx.events) if (e.type === 'ai.denied' && e['wanted'] === 'reposition') kd++
  }
  const win = (clear / N) * 100
  console.log(`  ${String(maxStamina).padStart(3)}${win.toFixed(0).padStart(6)}%${(turns / N).toFixed(1).padStart(8)}${(kd / N).toFixed(2).padStart(13)}  ${'#'.repeat(Math.round(win / 3))}`)
}
console.log()
