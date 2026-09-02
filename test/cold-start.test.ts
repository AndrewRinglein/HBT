// The cold-start run, over several seeds — ISC-001/025's probe is one seed; a
// machine that turns for seed 1 and jams for seed 2 is not whole.
import { describe, it, expect } from 'vitest'
import { execSync } from 'node:child_process'

describe('the cold-start run — no human input, to the first Article', () => {
  for (const seed of [1, 2, 3]) {
    it(`seed ${seed} reaches the first Article with no OUT system leaned on`, () => {
      const out = execSync(`node tools/slice-run.mjs --seed ${seed} --until article-1 --assert no-out-systems`, { encoding: 'utf8', env: { ...process.env, NO_COLOR: '1' } })
      expect(out).toMatch(/the first Article — unlock\.[a-z0-9.-]+ — at Week \d+, after \d+ battles/)
      expect(out).toMatch(/no OUT system was leaned on/)
    })
  }
})
