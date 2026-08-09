import { createBattle } from '../core/setup.js'
import { runBattle } from '../core/battle.js'
import { foldToTurn, setupSeq, nameMap, renderBoard, renderLog, renderRoster, mapIdOf } from '../view/text.js'

const replicate = Number(process.argv[2] ?? 0)
const showBoards = process.argv.includes('--boards')

const mapId = process.argv.find(a => a.startsWith('--map='))?.split('=')[1] ?? 'open'
const ctx = createBattle({ replicate, mapId, strict: true })
const result = runBattle(ctx)
const names = nameMap(ctx.events)

console.log(`\nBaseline 4v4 — replicate ${replicate} — map '${mapId}'\n`)
console.log(renderBoard(foldToTurn(ctx.events, setupSeq(ctx.events)), mapIdOf(ctx.events)))
console.log('\n' + renderRoster(foldToTurn(ctx.events, setupSeq(ctx.events))))
console.log(renderLog(ctx.events, names).join('\n'))

if (showBoards) {
  const last = ctx.events[ctx.events.length - 1]!.seq
  console.log('\nFINAL BOARD\n')
  console.log(renderBoard(foldToTurn(ctx.events, last), mapIdOf(ctx.events)))
}
console.log(`\n${result.outcome} in ${result.turns} turns — ${ctx.events.length} events\n`)
