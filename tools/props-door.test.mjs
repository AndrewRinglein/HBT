import { test } from 'node:test'
import assert from 'node:assert/strict'
import { writeFileSync, unlinkSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'
test('native gate allows exactly the normalized door and rejects another engine-source import', () => {
  const file = resolve('tools/props-door-probe.mjs')
  writeFileSync(file, `import '../../${'engine'}/src/core/types.js'\n`, { flag: 'wx' })
  try {
    const run = spawnSync(process.execPath, ['tools/gate.mjs'], { encoding: 'utf8' })
    assert.equal(run.status, 1)
    assert.match(run.stderr, /props-door-probe\.mjs names the engine/)
    assert.doesNotMatch(run.stderr, /src[\\/]engine\.ts names/)
  } finally { unlinkSync(file) }
})
