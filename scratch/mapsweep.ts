import { createBattle } from '../src/core/setup.js'
import { runBattle } from '../src/core/battle.js'
import { score } from '../src/sim/score.js'
import { MAPS } from '../src/content/maps.js'
const N = 300
console.log('\nSame fight, four authored maps — 8 zombies\n')
console.log(`  ${'map'.padEnd(12)}${'hills'.padStart(6)}${'win%'.padStart(7)}${'turns'.padStart(8)}${'downed'.padStart(8)}${'high ground'.padStart(13)}${'casts'.padStart(7)}${'bolt dmg'.padStart(10)}`)
for (const m of MAPS) {
  let clear=0,turns=0,down=0,hg=0,casts=0,bolt=0
  for (let i=0;i<N;i++){
    const ctx = createBattle({ replicate:i, enemyCount:8, mapId:m.id, strict:true }); runBattle(ctx)
    const s = score(ctx.events)
    if (s.outcome==='heroClear') clear++
    turns+=s.turns; down+=s.heroesDowned
    let pend=false
    for (const e of ctx.events){
      if (e.type==='ai.tookHighGround') hg++
      if (e.type==='power.used'){ casts++; pend=true; continue }
      if (e.type==='damage.applied' && pend){ bolt += e['amount'] as number; pend=false }
    }
  }
  const hills = m.rows.join('').split('^').length-1
  console.log(`  ${m.id.padEnd(12)}${String(hills).padStart(6)}${((clear/N)*100).toFixed(0).padStart(6)}%${(turns/N).toFixed(1).padStart(8)}${(down/N).toFixed(2).padStart(8)}${(hg/N).toFixed(2).padStart(13)}${(casts/N).toFixed(2).padStart(7)}${(bolt/N).toFixed(1).padStart(10)}`)
}
console.log()
