import { createBattle } from '../src/core/setup.js'
import { runBattle } from '../src/core/battle.js'

const N = 300
console.log('\nWhat stamina actually denies, per battle, by zombie count\n')
console.log('zom  turns | kite denied  downgraded  axe-not-massive  punches | avg stamina at activation by turn')
for (const z of [4, 6, 8, 10, 12]) {
  let turns = 0, kiteDenied = 0, shotsSkipped = 0, axeInstead = 0, punches = 0, massive = 0
  const staminaByTurn: number[][] = []
  for (let i = 0; i < N; i++) {
    const ctx = createBattle({ replicate: i, enemyCount: z, strict: true })
    runBattle(ctx)
    const type = new Map<number, string>()
    for (const e of ctx.events) {
      if (e.type === 'unit.enter') type.set(e.actor!, e['typeId'] as string)
      if (e.type === 'activation.begin') {
        const t = type.get(e.actor!)
        if (t === 'ranger' || t === 'warrior') (staminaByTurn[e.turn as number] ??= []).push(e['stamina'] as number)
      }
      if (e.type === 'move.refused' && e['reason'] === 'stamina') kiteDenied++
      if (e.type === 'ai.denied' && e['wanted'] === 'reposition') kiteDenied++
      if (e.type === 'ai.denied' && e['wanted'] !== 'reposition') shotsSkipped++

      if (e.type === 'attack.declared') {
        if (e['attackId'] === 'attack.warrior.axe') axeInstead++
        if (e['attackId'] === 'attack.warrior.massive') massive++
        if (e['attackId'] === 'attack.punch') punches++
      }
    }
    turns += ctx.state.turn
  }
  const prof = staminaByTurn.slice(1, 10).map((a, i) => a ? `t${i + 1}:${(a.reduce((s, c) => s + c, 0) / a.length).toFixed(1)}` : '').filter(Boolean).join(' ')
  const pb = (x: number) => (x / N).toFixed(2).padStart(13)
  console.log(`${String(z).padStart(3)}${(turns / N).toFixed(1).padStart(7)} |${pb(kiteDenied)}${pb(shotsSkipped)}${pb(axeInstead)}${pb(punches)} | ${prof}`)
  if (z === 8) console.log(`      (warriors chose Massive ${(massive / N).toFixed(1)}/battle vs Axe ${(axeInstead / N).toFixed(1)})`)
}
console.log()
