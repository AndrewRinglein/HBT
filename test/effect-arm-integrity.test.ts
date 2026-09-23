import { spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { expect, it } from 'vitest'

const tool = fileURLToPath(new URL('../tools/effect-size.mts', import.meta.url))
const gate = fileURLToPath(new URL('../tools/gate.mjs', import.meta.url))
const tsx = fileURLToPath(new URL('../node_modules/tsx/dist/cli.mjs', import.meta.url))
const valid = (heroWins = 10, turns = 100) => ({ heroWins, turns, invalid: 0 })
function report(withArm: object, without: object, ids = 'map.disabled') {
  // Replace only child battle-arm transport. The real CLI performs comparison,
  // formatting and exit-status selection in a fresh process.
  const code = `(async()=>{const cp=await import('node:child_process');const m=await import('node:module');const arms=JSON.parse(process.env.HOBAT_EFFECT_FIXTURE);cp.default.execSync=(cmd,opts)=>{if(cmd!=='npx tsx tools/effect-size.mts --arm')throw Error('unexpected command '+cmd);return JSON.stringify(opts?.env?.CF_DISABLE_IDS?arms.without:arms.withArm)};m.syncBuiltinESMExports();process.argv=['node','effect-size',${JSON.stringify(ids)}];await import(${JSON.stringify(pathToFileURL(tool).href)});})()`
  const run = spawnSync(process.execPath, [tsx, '-e', code], { encoding: 'utf8', env: { ...process.env, HOBAT_EFFECT_FIXTURE: JSON.stringify({ withArm, without }) } })
  return { status: run.status, text: run.stdout + run.stderr }
}

it('reports an explicitly disabled absent map as unavailable, without the old missing-arm crash', () => {
  const run = report({ 'map.open': valid(), 'map.disabled': valid() }, { 'map.open': valid() })
  expect(run.text).toContain('map.disabled: UNAVAILABLE/PRESENCE-ONLY')
  expect(run.text).not.toContain('TypeError')
  expect(run.text).not.toContain('MEASURABLE')
  expect(run.status).toBe(2)
})
it('rejects an unexpected missing control loudly', () => {
  const run = report({ 'map.open': valid() }, {})
  expect(run.status).toBe(1)
  expect(run.text).toContain('unexpected missing WITHOUT control: map.open')
  expect(run.text).not.toContain('heroWins')
})
it('rejects an unexpected extra control before reporting averages', () => {
  const run = report({ 'map.open': valid() }, { 'map.open': valid(), 'map.extra': valid() })
  expect(run.status).toBe(1)
  expect(run.text).toContain('unexpected extra WITHOUT control: map.extra')
  expect(run.text).not.toContain('heroWins')
})
it('keeps complete valid-arm arithmetic and measurable output', () => {
  const run = report({ 'map.open': valid(15, 125) }, { 'map.open': valid(10, 100) })
  expect(run.status).toBe(0)
  expect(run.text).toContain('heroWins 10->15 (+5)  meanTurns 4.0->5.0')
  expect(run.text).toContain('\nMEASURABLE\n')
  expect(JSON.parse(run.text.trim().split('\n').at(-1)!.slice(14))).toEqual({ version: 1, status: 'measured', unavailable: [] })
})
it.each([{ withInvalid: 1, withoutInvalid: 0 }, { withInvalid: 0, withoutInvalid: 7 }, { withInvalid: 0, withoutInvalid: 25 }, { withInvalid: 25, withoutInvalid: 25 }])('refuses paired means with invalid counts $withInvalid/$withoutInvalid', ({ withInvalid, withoutInvalid }) => {
  const run = report({ 'map.open': { heroWins: 0, turns: 0, invalid: withInvalid } }, { 'map.open': { heroWins: 0, turns: 0, invalid: withoutInvalid } })
  expect(run.status).toBe(2)
  expect(run.text).toContain(`invalid WITH ${withInvalid}/25, WITHOUT ${withoutInvalid}/25`)
  expect(run.text).toContain('MEASUREMENT UNAVAILABLE')
  expect(run.text).not.toContain('meanTurns')
  expect(run.text).not.toContain('MEASURABLE')
  expect(run.text).not.toContain('Presence is total')
})

// Removed 2026-09-22 (Law 10, written reason): nine cases here drove the real gate
// with --land and asserted that the effect-size measurement was carried into the
// seal, the ledger and the run log. Andrew ruled that the effect-size battles no
// longer run inside a landing (DECISIONS.md, 2026-09-22 — "typecheck stays; the
// gate and the start get smaller"), so the gate no longer produces what they
// asserted. The tests above, which check effect-size.mts itself, still stand.
