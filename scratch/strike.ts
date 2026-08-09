import { createCustomBattle } from '../src/core/setup.js'
import { preview, canAttack } from '../src/core/pipeline.js'
import { hexId, distance } from '../src/core/hex.js'
import { createBattle } from '../src/core/setup.js'
import { runBattle } from '../src/core/battle.js'

// Is the staff-strike never used because the AI never tries it, or because it loses?
const ctx = createCustomBattle([{ type: 'mage', hex: hexId(5,5) }], [{ type: 'zombie', hex: hexId(6,5) }])
for (const a of ['attack.mage.staff','attack.mage.strike']) {
  const legal = canAttack(ctx, 0, 1, a)
  const p = preview(ctx, 0, 1, a)
  console.log(`adjacent, ${a.padEnd(20)} legal=${legal}  hit=${p.hitChance}%  dmg=${p.damageOnHit}  expected=${(p.hitChance/100*p.damageOnHit).toFixed(2)}`)
}

// And: are ranged heroes actually ending their turns out of melee threat range?
let unsafe = 0, total = 0
for (const mapId of ['open','ridge','flanks','highlands']) for (let r = 0; r < 40; r++) {
  const c = createBattle({ replicate: r, enemyCount: 8, mapId }); runBattle(c)
  const type = new Map<number,string>(), pos = new Map<number,number>(), alive = new Map<number,boolean>()
  for (const e of c.events) {
    if (e.type === 'unit.enter') { type.set(e.actor!, e['typeId'] as string); pos.set(e.actor!, e['hex'] as number); alive.set(e.actor!, true) }
    if (e.type === 'moved') pos.set(e.actor!, e['to'] as number)
    if (e.type === 'life.dead') alive.set(e.target!, false)
    if (e.type === 'activation.end' && (type.get(e.actor!)==='ranger'||type.get(e.actor!)==='mage')) {
      total++
      const me = pos.get(e.actor!)!
      for (const [id,t] of type) if (t==='zombie' && alive.get(id) && distance(me, pos.get(id)!) <= 5) { unsafe++; break }
    }
  }
}
console.log(`\nranged activations ending inside a zombie's threat range (move 4 + reach 1): ${unsafe}/${total} = ${((unsafe/total)*100).toFixed(1)}%`)
