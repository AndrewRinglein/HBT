import { createBattle } from '../src/core/setup.js'
import { runBattle } from '../src/core/battle.js'
import { MAP_PANEL } from '../src/content/maps.js'
import { ATTACKS, ABILITIES, UNITS } from '../src/content/index.js'

const usedAttacks = new Set<string>(), usedAbilities = new Set<string>()
const usedEvents = new Set<string>()
let unsafeEnds = 0, rangedEnds = 0, hillEnds = 0
let strikeUses = 0, staffUses = 0, casts = 0, battles = 0
const roles = new Set<string>()

for (const mapId of MAP_PANEL) for (const z of [4, 8, 12]) for (let r = 0; r < 60; r++) {
  const ctx = createBattle({ replicate: r, enemyCount: z, mapId, strict: true })
  runBattle(ctx); battles++
  const type = new Map<number, string>(), pos = new Map<number, number>()
  for (const e of ctx.events) {
    usedEvents.add(e.type)
    if (e.type === 'unit.enter') { type.set(e.actor!, e['typeId'] as string); pos.set(e.actor!, e['hex'] as number); roles.add(e['role'] as string) }
    if (e.type === 'moved') pos.set(e.actor!, e['to'] as number)
    if (e.type === 'attack.declared') { usedAttacks.add(e['attackId'] as string)
      if (e['attackId'] === 'attack.mage.strike') strikeUses++
      if (e['attackId'] === 'attack.mage.staff') staffUses++ }
    if (e.type === 'power.used') { usedAbilities.add(e['abilityId'] as string); casts++ }
    if (e.type === 'activation.end') {
      const t = type.get(e.actor!)
      if (t === 'ranger' || t === 'mage') {
        rangedEnds++
        const me = pos.get(e.actor!)!
        if (ctx.state.terrain[me] === 1) hillEnds++
        for (const [id, tt] of type) if (tt === 'zombie' && ctx.state.units[id]!.lifeState === 'standing') {
          const d = Math.abs(0) // recompute below
        }
      }
    }
  }
}
console.log(`battles ${battles}`)
console.log(`roles seen: ${[...roles].sort().join(', ')}   (declared: melee, ranged, support)`)
console.log(`attacks used ${usedAttacks.size}/${Object.keys(ATTACKS).length}: ${[...usedAttacks].sort().join(', ')}`)
console.log(`  NEVER used: ${Object.keys(ATTACKS).filter(a=>!usedAttacks.has(a)).join(', ') || '—'}`)
console.log(`abilities used ${usedAbilities.size}/${Object.keys(ABILITIES).length}`)
console.log(`unit types: ${Object.keys(UNITS).join(', ')}`)
console.log(`mage: staff ${staffUses}, strike ${strikeUses}, casts ${casts}`)
console.log(`ranged activations ending on a hill: ${hillEnds}/${rangedEnds} = ${((hillEnds/rangedEnds)*100).toFixed(1)}%`)
console.log(`event types emitted: ${[...usedEvents].sort().join(' ')}`)
