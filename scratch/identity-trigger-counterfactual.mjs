import fs from 'node:fs'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
const file = 'src/core/trigger.ts', source = fs.readFileSync(file, 'utf8')
const start = source.indexOf('    const targetUid = fc.targetId == null'), end = source.indexOf('    const fired = roll <= chance.value', start)
assert.ok(start > 0 && end > start)
const old = `    const roll = fc.keyTag === undefined
      ? roll100(ctx.rng, 'trigger', owner.uid, fc.targetId ?? 0, fc.ordinal, slot)
      : roll100(ctx.rng, 'trigger', owner.uid, fc.targetId ?? 0, fc.ordinal, slot, fc.keyTag)
`
try {
  fs.writeFileSync(file, source.slice(0, start) + old + source.slice(end))
  const run = spawnSync(process.execPath, ['node_modules/vitest/vitest.mjs', 'run', 'test/unit-identities.test.ts', '-t', 'trigger dice|trigger cup'], { encoding: 'utf8' })
  fs.writeFileSync('scratch/unit-identities-trigger-counterfactual-red.log', run.stdout + run.stderr)
  assert.equal(run.status, 1, 'old trigger keys must fail the corrected typed probes')
  console.log('Old trigger keys fail the four corrected typed identity probes; source restored.')
} finally { fs.writeFileSync(file, source) }
