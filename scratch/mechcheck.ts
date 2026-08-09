import { createBattle } from '../src/core/setup.js'
import { runBattle } from '../src/core/battle.js'
import type { UnitDef } from '../src/core/types.js'

// Observe mechanics straight from the log: per-attack damage, per-attack accuracy,
// and stamina behaviour. Nothing about who won.
function observe(overrides: Record<string, Partial<UnitDef>>, N = 200) {
  const dmg = new Map<string, Set<number>>()
  const acc = new Map<string, Set<number>>()
  const staminaMax = new Map<string, number>()
  const spend = new Map<string, Map<number, number>>()
  let kiteDenied = 0, downgrade = 0

  for (let i = 0; i < N; i++) {
    const ctx = createBattle({ replicate: i, enemyCount: 8, overrides, strict: true })
    runBattle(ctx)
    const type = new Map<number, string>()
    let pend: { key: string } | null = null
    for (const e of ctx.events) {
      if (e.type === 'unit.enter') type.set(e.actor!, e['typeId'] as string)
      if (e.type === 'activation.begin') {
        const t = type.get(e.actor!)!
        staminaMax.set(t, Math.max(staminaMax.get(t) ?? 0, e['stamina'] as number))
      }
      if (e.type === 'stamina.spent') {
        const t = type.get(e.actor!)!
        const m = spend.get(t) ?? new Map<number, number>()
        m.set(e['amount'] as number, (m.get(e['amount'] as number) ?? 0) + 1)
        spend.set(t, m)
      }
      if (e.type === 'attack.declared') {
        const key = `${type.get(e.actor!)} ${e['attackId']}->${type.get(e.target!)}`
        pend = { key }
        const a = acc.get(`${e['attackId']}@d${e['distance']}`) ?? new Set<number>()
        a.add(e['hitChance'] as number); acc.set(`${e['attackId']}@d${e['distance']}`, a)
      }
      if (e.type === 'damage.applied' && pend) {
        const total = (e['amount'] as number) + (e['overkill'] as number)
        const d = dmg.get(pend.key) ?? new Set<number>()
        d.add(total); dmg.set(pend.key, d)
        pend = null
      }
      if (e.type === 'ai.denied') e['wanted'] === 'reposition' ? kiteDenied++ : downgrade++
    }
  }
  return { dmg, acc, staminaMax, spend, kiteDenied, downgrade }
}

const base = observe({})
const warr = observe({ warrior: { strength: 7 } })
const rang = observe({ ranger: { maxStamina: 10 } })

const show = (m: Map<string, Set<number>>, k: string) => [...(m.get(k) ?? [])].sort((a, b) => a - b).join(',') || '—'
const keys = [...new Set([...base.dmg.keys(), ...warr.dmg.keys()])].sort()

console.log('\nDAMAGE PER HIT — observed values in real battles\n')
console.log(`  ${'attacker attack -> target'.padEnd(46)}${'baseline'.padStart(10)}${'W+2 str'.padStart(10)}${'R+5 sta'.padStart(10)}   verdict`)
for (const k of keys) {
  const b = show(base.dmg, k), w = show(warr.dmg, k), r = show(rang.dmg, k)
  const isWarrior = k.startsWith('attack.warrior') || (k.startsWith('attack.punch') && false)
  let verdict = ''
  if (b !== '—' && w !== '—') {
    const moved = Number(w) - Number(b)
    if (k.startsWith('warrior ')) verdict = moved === 2 ? 'moved exactly +2 ✓' : `moved ${moved} ✗`
    else verdict = b === w ? 'unchanged ✓' : 'CHANGED ✗ (should not)'
  }
  if (r !== '—' && b !== r) verdict += '  | ranger arm CHANGED ✗'
  console.log(`  ${k.padEnd(46)}${b.padStart(10)}${w.padStart(10)}${r.padStart(10)}   ${verdict}`)
}

console.log('\nACCURACY — should be untouched by either change\n')
const ak = [...base.acc.keys()].sort().filter(k => k.includes('bow') || k.includes('massive') || k.includes('zombie'))
for (const k of ak.slice(0, 8)) {
  const b = show(base.acc, k), w = show(warr.acc, k), r = show(rang.acc, k)
  console.log(`  ${k.padEnd(38)}${b.padStart(10)}${w.padStart(10)}${r.padStart(10)}   ${b === w && b === r ? 'unchanged ✓' : 'CHANGED ✗'}`)
}

console.log('\nSTAMINA\n')
for (const t of ['warrior', 'ranger']) {
  console.log(`  ${t} max observed:  baseline ${base.staminaMax.get(t)}   W+2 ${warr.staminaMax.get(t)}   R+5 ${rang.staminaMax.get(t)}`)
}
console.log(`  spend sizes seen (ranger): ${[...(base.spend.get('ranger') ?? new Map())].map(([k, v]) => `${k}x${v}`).join(' ')}`)
console.log(`  spend sizes seen (warrior): ${[...(base.spend.get('warrior') ?? new Map())].map(([k, v]) => `${k}x${v}`).join(' ')}`)
console.log(`\n  kite denied /200 battles:   baseline ${base.kiteDenied}   W+2 ${warr.kiteDenied}   R+5 ${rang.kiteDenied}`)
console.log(`  attack downgrades:          baseline ${base.downgrade}   W+2 ${warr.downgrade}   R+5 ${rang.downgrade}\n`)
