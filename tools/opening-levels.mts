// fix.opening-levels (engine, 2026-10-02) — the report for Andrew: the engine's opening party carried through the six
// battles by the kingdom's XP, levels and rewards (src/sim/opening-run.ts), over N replicates (default 50).
//
//   node ../engine/node_modules/tsx/dist/cli.mjs tools/opening-levels.mts [replicates]
//
// Prints, per battle: how many replicates won it on the first fight and within the replays, each pressing on past a
// battle it never won (nothing paid for it); the XP after the Orphanage and after the Lumberjack against the rulings;
// the levels fielded at each battle; who held the Flaming Longsword and the Bridge's reward.
import { runOpening, levelReached as levelOf, MAX_ATTEMPTS } from '../src/sim/opening-run.js'
import { OPENING_POSITIONS, UNITS } from '../src/engine.js'

const N = Number(process.argv[2] ?? 50)
const runs = Array.from({ length: N }, (_, r) => runOpening(r, OPENING_POSITIONS.length, true))
const short = (id: string) => id.split('.').pop()!
const classOf = (id: string) => short((UNITS[id]!.tags ?? []).find((t) => t.startsWith('class.')) ?? '?')
const stats = (xs: number[]) => xs.length ? `mean ${(xs.reduce((s, x) => s + x, 0) / xs.length).toFixed(1)}, min ${Math.min(...xs)}, max ${Math.max(...xs)}` : 'none'
const tally = (xs: (string | number)[]) => Object.entries(xs.reduce<Record<string, number>>((m, x) => ({ ...m, [x]: (m[x] ?? 0) + 1 }), {})).sort().map(([k, v]) => `${k}: ${v}`).join(', ')

console.log(`fix.opening-levels — ${N} replicates, the engine's AI, a lost battle replayed up to ${MAX_ATTEMPTS} times`)
console.log('\nWins per battle (every replicate fights every battle; one never won is passed with nothing paid):')
for (const p of OPENING_POSITIONS) {
  const b = runs.map((r) => r.battles.find((x) => x.position === p.position)!)
  const first = b.filter((x) => x.attempts[0]!.outcome === 'heroClear').length
  const any = b.filter((x) => x.won).length
  const fights = b.map((x) => x.attempts.length)
  const unbroken = runs.filter((r) => r.battles.slice(0, p.position).every((x) => x.won)).length
  console.log(`  ${p.position} ${p.name.padEnd(17)} first fight ${String(first).padStart(2)} of ${N} · within ${MAX_ATTEMPTS} fights ${String(any).padStart(2)} of ${N} · fights ${stats(fights)} · every battle so far won: ${unbroken}`)
}

const at = (pos: number) => runs.map((r) => r.battles.find((x) => x.position === pos)!)
console.log('\nXP (the Orphanage pays 20, DECISIONS.md 2026-09-28; the curve is 20 / 50 / 100 / 170 / 270 / 400):')
const orph = at(1)
console.log(`  after the Orphanage, the first hero: ${stats(orph.map((b) => b.xpOut[0]!))} — level 2 in ${orph.filter((b) => b.xpOut[0]! >= 20).length} of ${N}`)
console.log('    rulings: "The opening battle won\'t be enough to get a level, but the second battle should" (expects none),')
console.log('    replaced the same day by "Make it so they get 20 XP no matter what, so they get a level" (level 2 after battle 1)')
const lumb = at(2)
console.log(`  after the Lumberjack, the first hero: ${stats(lumb.map((b) => b.xpOut[0]!))}; the two drafted after battle 1: ${stats(lumb.flatMap((b) => b.xpOut.slice(1)))}`)
console.log(`    the Lumberjack alone paid: ${stats(lumb.flatMap((b) => b.won ? b.xpOut.map((x, i) => x - b.xpIn[i]!) : []))}`)
console.log(`    levels after the Lumberjack (all three, won runs): ${tally(lumb.filter((b) => b.won).flatMap((b) => b.xpOut.map((x) => levelOf(x))))}`)
console.log(`    a level reached by battle 2 ("the second battle should"): the first hero ${lumb.filter((b) => levelOf(b.xpOut[0]!) >= 2).length} of ${N}; a hero drafted after battle 1 ${lumb.filter((b) => b.xpOut.slice(1).some((x) => levelOf(x) >= 2)).length} of ${N} runs`)

console.log('\nLevels fielded at each battle (every drafted hero, every replicate):')
for (const p of OPENING_POSITIONS) console.log(`  ${p.position} ${p.name.padEnd(17)} ${tally(at(p.position).flatMap((b) => b.levels))}`)

console.log('\nThe Flaming Longsword (won at the Lumberjack, only a Warrior or a Paladin takes it):')
console.log(`  held by: ${tally(lumb.map((b) => (b.reward ? classOf(b.heroes[b.reward.holder]!) : b.won ? 'nobody (no Warrior or Paladin drafted)' : 'not won')))}`)
const bridge = at(3)
console.log('\nThe Bridge\'s reward (one of three by the standing draw, kept by the class-weighted pick):')
console.log(`  kept: ${tally(bridge.map((b) => (b.reward ? `${short(b.reward.itemId)} -> ${classOf(b.heroes[b.reward.holder]!)}` : b.won ? 'none fits' : 'not won')))}`)
console.log(`  carried from the Cavern Trail on: ${at(4).filter((b, i) => bridge[i]!.reward && b.items[bridge[i]!.reward!.holder]?.includes(bridge[i]!.reward!.itemId)).length} of ${bridge.filter((b) => b.reward).length} kept`)
console.log(`  the replicates that kept one: ${bridge.flatMap((b, r) => (b.reward ? [r] : [])).join(', ') || 'none'}`)
