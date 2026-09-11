import { createBattle } from '../src/core/setup.js'
import { runBattle } from '../src/core/battle.js'
for (let replicate = 0; replicate < 100; replicate++) {
  const ctx = createBattle({ replicate, enemyCount: 8, mapId: 'map.open' })
  runBattle(ctx)
  const rolls = ctx.events.filter(e => e.type === 'trigger.rolled' && e.causeId === 'trigger.zombie.afflict-rotting-flesh')
  const gained = ctx.events.filter(e => e.type === 'badge.gained' && e.badgeId === 'badge.rotting-flesh')
  console.log(JSON.stringify({ replicate, rolls: rolls.map(e => ({ roll: e.roll, chance: e.chance, fired: e.fired })), gained: gained.length }))
  if (gained.length) break
}
