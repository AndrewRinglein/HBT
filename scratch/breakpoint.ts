import { createCustomBattle } from '../src/core/setup.js'
import { resolveDamage } from '../src/core/pipeline.js'
import { ATTACKS, UNITS } from '../src/content/index.js'
import { hexId } from '../src/core/hex.js'

const ctx = createCustomBattle([{ type: 'warrior', hex: hexId(5,5) }], [{ type: 'zombie', hex: hexId(6,5) }])
const z = ctx.state.units[1]!
console.log('\nWarrior strength -> damage -> hits to kill a 10hp zombie\n')
console.log('  str   punch      axe   massive   | hits: punch axe massive')
for (const str of [5, 6, 7, 8]) {
  const w = { ...ctx.state.units[0]!, strength: str }
  const d = (id: string) => resolveDamage(w, z, ATTACKS[id]!, false).value
  const h = (x: number) => (x > 0 ? Math.ceil(10 / x) : '-')
  console.log(`  ${str}  ${String(d('attack.punch')).padStart(6)}${String(d('attack.warrior.axe')).padStart(9)}${String(d('attack.warrior.massive')).padStart(10)}   |      ${h(d('attack.punch'))}   ${h(d('attack.warrior.axe'))}       ${h(d('attack.warrior.massive'))}`)
}
console.log('\nRanger stamina: sustainable move+shoot turns before regen-limited\n')
for (const max of [5, 10]) {
  // move 1 + shoot 1 = 2/turn, regen 1
  let s = max, t = 0
  const turns: number[] = []
  while (s >= 2 && t < 15) { s -= 2; turns.push(s); s = Math.min(max, s + 1); t++ }
  console.log(`  max ${String(max).padStart(2)}: ${t} full turns of move+shoot, then pinned at ~1`)
}
console.log()
