import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { spawnSync } from 'node:child_process'
import { expect, it } from 'vitest'

const builder = fileURLToPath(new URL('../tools/game-builder.mjs', import.meta.url))
const trailer = value => 'EFFECT_RESULT ' + JSON.stringify(value)
it.each([
  { seal: 'effect measurement errored', effect: 'Error: loader rejected <script>bad()</script>', label: 'measurement error:' },
  { seal: 'effect measurement errored', effect: trailer({version:1,status:'measured',unavailable:[]}), label: 'measurement error:' },
  { seal: 'effect measurement unavailable', effect: trailer({version:1,status:'unavailable',unavailable:[{map:'map.open',reason:'disabled-control'}]}), label: 'measurement unavailable:' },
  { seal: 'effect measurement unavailable', effect: trailer({version:1,status:'unavailable',unavailable:[{map:'map.open',reason:'invalid-replicates'}]}), label: 'measurement unavailable (invalid battles):' },
  { seal: 'passed', effect: trailer({version:1,status:'measured',unavailable:[]}), label: 'measured:' },
  { seal: '1 flag(s) warned', effect: trailer({version:1,status:'measured',unavailable:[]}), label: 'measured:' },
  { seal: 'effect measurement errored', effect: 'EFFECT_RESULT {bad JSON', label: 'measurement error:' },
  { seal: 'passed', effect: 'old unclassified report', label: 'measurement status unverified:' },
])('renders $label from recorded evidence and leaves history intact', row => {
  const cwd = mkdtempSync(join(tmpdir(), 'hobat-measurement-label-'))
  mkdirSync(join(cwd, '.state'))
  const log = JSON.stringify({at:'2026-09-17T00:00:00Z',id:'test.measurement',mode:'land',disposition:'landed',checks:[],...row})+'\n'
  writeFileSync(join(cwd, '.state/gauntlet-log.jsonl'), log)
  writeFileSync(join(cwd, '.state/backlog.json'), '[]')
  const result = spawnSync(process.execPath, [builder, '--quiet'], { cwd, encoding:'utf8' })
  expect(result.status, result.stderr).toBe(0)
  const html = readFileSync(join(cwd,'GAME-BUILDER.html'),'utf8')
  expect(html).toContain(`<div class="effect">${row.label} `)
  if (row.label !== 'measured:') expect(html).not.toContain('<div class="effect">measured:')
  expect(html).not.toContain('<script>bad()</script>')
  expect(readFileSync(join(cwd,'.state/gauntlet-log.jsonl'),'utf8')).toBe(log)
  expect(readFileSync(join(cwd,'.state/backlog.json'),'utf8')).toBe('[]')
})

it('the effect tool WITH arm clears inherited disable IDs while keeping unrelated environment', () => {
  const tool = pathToFileURL(fileURLToPath(new URL('../tools/effect-size.mts',import.meta.url))).href
  const tsx = fileURLToPath(new URL('../node_modules/tsx/dist/cli.mjs',import.meta.url))
  const code = `(async()=>{const cp=await import('node:child_process');const m=await import('node:module');let calls=0;
    cp.default.execSync=(command,options)=>{calls++;if(options.env.HOBAT_ENV_PROBE!=='keep-me')throw Error('unrelated environment lost');
      if(calls===1&&options.env.CF_DISABLE_IDS)throw Error('WITH arm contaminated');
      if(calls===2&&options.env.CF_DISABLE_IDS!=='power.lightning-staff.storm')throw Error('WITHOUT arm not disabled');
      return JSON.stringify({'map.open':{heroWins:3,turns:25,invalid:0}})};
    m.syncBuiltinESMExports();process.argv=['node','effect-size','power.lightning-staff.storm'];await import(${JSON.stringify(tool)});})()`
  const result = spawnSync(process.execPath,[tsx,'-e',code],{encoding:'utf8',env:{...process.env,TSX_DISABLE_CACHE:'1',CF_DISABLE_IDS:'attack.halberd.hack',HOBAT_ENV_PROBE:'keep-me'}})
  expect(result.status,result.stderr).toBe(0)
  expect(result.stdout).toContain(trailer({version:1,status:'measured',unavailable:[]}))
})
