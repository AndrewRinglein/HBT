import { createBattle } from '../src/core/setup.js'
import { runBattle } from '../src/core/battle.js'
import { score } from '../src/sim/score.js'
const N = 200
console.log('\nzombies  heroClear  avg turns  heroes downed  heroes dead')
for (let z = 4; z <= 24; z += 2) {
  let clear = 0, turns = 0, downed = 0, dead = 0
  for (let i = 0; i < N; i++) {
    const ctx = createBattle({ replicate: i, enemyCount: z, strict: true })
    runBattle(ctx)
    const s = score(ctx.events)
    if (s.outcome === 'heroClear') clear++
    turns += s.turns; downed += s.heroesDowned; dead += s.heroesDead
  }
  const bar = '#'.repeat(Math.round((clear / N) * 30))
  console.log(`${String(z).padStart(7)}${((clear/N)*100).toFixed(0).padStart(9)}%${(turns/N).toFixed(1).padStart(11)}${(downed/N).toFixed(2).padStart(15)}${(dead/N).toFixed(2).padStart(13)}  ${bar}`)
}
