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

const unavailableTrailer = 'MEASUREMENT UNAVAILABLE\nEFFECT_RESULT ' + JSON.stringify({ version: 1, status: 'unavailable', unavailable: [{ map: 'map.one', reason: 'disabled-control' }] }) + '\n'
it.each([
  { status: 2, output: unavailableTrailer, reason: 'unavailable', label: 'unavailable evidence' },
  { status: 1, output: unavailableTrailer, reason: 'errored', label: 'wrong exit code' },
  { status: 0, output: unavailableTrailer, reason: 'errored', label: 'contradictory success code' },
  { status: 2, output: 'MEASUREMENT UNAVAILABLE\n', reason: 'errored', label: 'missing trailer' },
  { status: 2, output: 'EFFECT_RESULT {bad json}\n', reason: 'errored', label: 'malformed trailer' },
  { status: 2, output: 'EFFECT_RESULT {"version":1,"status":"unavailable","unavailable":[]}\n', reason: 'errored', label: 'empty unavailable evidence' },
  { status: 0, output: 'MEASURABLE\n', reason: 'errored', label: 'missing successful trailer' },
  { status: 0, output: 'EFFECT_RESULT {bad json}\n', reason: 'errored', label: 'malformed successful trailer' },
  { status: 0, output: 'MEASURABLE\nEFFECT_RESULT {"version":1,"status":"measured","unavailable":[]}\n', reason: 'measured', label: 'complete measured evidence' },
])('actual isolated gate preserves $label in seal, ledger and run log', ({ status, output, reason }) => {
  const folder = mkdtempSync(join(tmpdir(), 'hobat-effect-gate-'))
  try {
    mkdirSync(join(folder, '.state')); mkdirSync(join(folder, 'src/core'), { recursive: true })
    writeFileSync(join(folder, '.state/backlog.json'), JSON.stringify([{ id: 'test.effect-arm', kind: 'rule', shape: 'rule', spec: 'Fixture', expect: 'Fixture', changesBaseline: true, variants: ['map.one', 'map.two'], probeIds: ['map.one'] }]))
    writeFileSync(join(folder, '.state/baseline.hash'), 'map.open 00000000\n')
    const code = `const cp=await import('node:child_process');const m=await import('node:module');cp.default.execSync=(cmd,opts)=>{
      if(cmd.includes('effect-size.mts')){const fixture=${JSON.stringify({ status, output })};if(fixture.status===0)return fixture.output;throw Object.assign(Error('effect result'),{status:fixture.status,stdout:fixture.output,stderr:''})};
      if(cmd.includes('vitest')){if(opts?.env?.CF_DISABLE_IDS)throw Object.assign(Error('disabled'),{status:1,stdout:'1 failed'});return 'Tests 1 passed'};
      if(cmd==='npx tsx tools/baseline.mts')return 'map.open 11111111\\n';
      if(cmd==='git status --porcelain')return '?? test/fixture.test.ts\\n';
      if(cmd==='git rev-parse --short HEAD')return 'fixture';
      if(cmd.startsWith('git diff')||cmd.startsWith('git add')||cmd.startsWith('git -c')||cmd.includes('tools/probe.mts')||cmd.includes('tools/decided.mjs')||cmd.includes('tools/content-check.mjs')||cmd.includes('tools/game-builder.mjs')||cmd==='npx tsc --noEmit')return '';
      throw Error('unexpected fixture command '+cmd);
    };m.syncBuiltinESMExports();process.argv=['node','gate','test.effect-arm','--land'];await import(${JSON.stringify(pathToFileURL(gate).href)});`
    const run = spawnSync(process.execPath, ['--input-type=module', '-e', code], { cwd: folder, encoding: 'utf8' })
    expect(run.status, run.stdout + run.stderr).toBe(0)
    const item = JSON.parse(readFileSync(join(folder, '.state/backlog.json'), 'utf8'))[0]
    expect(item.gauntlet).toBe(reason === 'measured' ? 'passed' : `not passed — effect measurement ${reason}`)
    expect(readFileSync(join(folder, '.state/ledger.md'), 'utf8')).toContain(reason === 'measured' ? 'IRON GAUNTLET: PASSED' : `EFFECT MEASUREMENT ${reason.toUpperCase()}`)
    const rows = readFileSync(join(folder, '.state/gauntlet-log.jsonl'), 'utf8').trim().split('\n').map(line => JSON.parse(line))
    expect(rows.at(-1).seal).toBe(reason === 'measured' ? 'passed' : `effect measurement ${reason}`)
    if (reason !== 'measured') expect(run.stdout).not.toContain('IRON GAUNTLET: PASSED')
  } finally {
    if (dirname(folder) !== resolve(tmpdir()) || !folder.split(/[\\/]/).at(-1)!.startsWith('hobat-effect-gate-')) throw new Error('unsafe effect fixture cleanup')
    rmSync(folder, { recursive: true, force: true })
  }
})
