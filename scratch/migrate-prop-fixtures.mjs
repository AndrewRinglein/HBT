import { readFileSync, writeFileSync } from 'node:fs'
function change(file, swaps, pre = '') {
  let text = readFileSync(file, 'utf8')
  for (const [old, next] of swaps) {
    if (!text.includes(old)) throw new Error(`missing literal in ${file}: ${old}`)
    text = text.replaceAll(old, next)
  }
  writeFileSync(file, pre + text)
}
change('test/high-cell-los.test.ts', [
  ['branch.state.terrain[7] = TERRAIN.OPEN', 'setHigh(branch, 7, false)'],
  ['ctx.state.terrain[7] = TERRAIN.FOREST', 'setHigh(ctx, 7, false); ctx.state.terrain[7] = TERRAIN.FOREST'],
  ['ctx.state.terrain[7] = TERRAIN.OBSTACLE', 'setHigh(ctx, 7)'],
  ['expect(ctx.state.terrain[row * 16 + wall]).toBe(TERRAIN.OBSTACLE)', 'expect(fixtureBlockers(ctx)).toContain(row * 16 + wall)'],
  ['ctx.state.terrain[row * 16 + wall] = TERRAIN.OPEN', 'setHigh(ctx, row * 16 + wall, false)'],
  ['ctx.state.terrain[7] = TERRAIN.OPEN', 'setHigh(ctx, 7, false)'],
  ['ctx.state.terrain[6] = TERRAIN.OPEN', 'setHigh(ctx, 6, false)'],
  ['ctx.state.terrain[5]=6;ctx.state.terrain[6]=6;', 'ctx.state.props=[{id:"prop.warm",height:"high",material:3,footprint:{kind:"hex",hexes:[5,6]}}];'],
  ['ctx.state.terrain.flatMap((t, h) => t === TERRAIN.OBSTACLE ? [h] : [])', 'fixtureBlockers(ctx)'],
  ['ctx.state.terrain[5] = TERRAIN.OPEN; ctx.state.terrain[9] = TERRAIN.OBSTACLE', 'setHigh(ctx, 5, false); setHigh(ctx, 9)'],
  ['fork.state.terrain[6] = TERRAIN.OPEN', 'setHigh(fork, 6, false)'],
], "import { setHigh, fixtureBlockers } from './prop-fixtures.js'\n")
change('test/battle-commands.test.ts', [
 ['ctx.state.terrain[i] = TERRAIN.OBSTACLE', 'setHigh(ctx, i)'],
 ['ctx.state.terrain[86] = TERRAIN.OBSTACLE', 'setHigh(ctx, 86)'],
 ['ctx.state.terrain[84] = TERRAIN.OBSTACLE', 'setHigh(ctx, 84)'],
], "import { setHigh } from './prop-fixtures.js'\n")
change('test/ai-commands.test.ts', [
 ['ctx.state.terrain.fill(TERRAIN.OBSTACLE)', 'for (let h = 0; h < ctx.geo.hexCount; h++) setHigh(ctx, h)'],
 ['ctx.state.terrain[85] = TERRAIN.OPEN', 'setHigh(ctx, 85, false)'],
 ['ctx.state.terrain[150] = TERRAIN.OPEN', 'setHigh(ctx, 150, false)'],
], "import { setHigh } from './prop-fixtures.js'\n")
