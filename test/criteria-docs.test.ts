// The ISC instrument reads both criteria documents — THIN-SLICE-IMPLEMENTATION.md
// (001–050) and GEAR-IMPLEMENTATION.md (051–) — as one list with unique numbers,
// and syncs each file's own header count. G0 of GEAR-IMPLEMENTATION.md, 2026-09-02.
import { describe, it, expect } from 'vitest'
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const run = (args: string) => execSync(`node tools/slice-gate.mjs ${args}`, { encoding: 'utf8', env: { ...process.env, NO_COLOR: '1' } })

describe('the criteria instrument over two documents', () => {
  it('counts the slice and the gear plan together, and each file carries its own header line', () => {
    const total = run('--count').trim()
    expect(total).toMatch(/^\d+ of 68 closed · \d+ probed · \d+ accepted$/)
    const slice = readFileSync('../THIN-SLICE-IMPLEMENTATION.md', 'utf8')
    const gear = readFileSync('../GEAR-IMPLEMENTATION.md', 'utf8')
    expect(slice).toMatch(/\*\*`\d+ of 50 closed · \d+ probed · \d+ accepted`\*\*/)
    expect(gear).toMatch(/\*\*`\d+ of 18 closed · \d+ probed · \d+ accepted`\*\*/)
    for (let n = 51; n <= 68; n++) expect(gear).toContain(`### ISC-0${n} —`)
  })
  it('a gear criterion is addressable by number like a slice one', () => {
    // (written 2026-09-02 when ISC-051's probe did not exist and the tool said so; the probe
    // exists now, so the test asks the smaller, truer thing: the number resolves to a verdict)
    const out = run('--isc 068')            // an H criterion: no probe to run, a verdict all the same
    expect(out).toMatch(/ISC-068/)
  })
})
