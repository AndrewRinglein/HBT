// tool.effect-size-rules (2026-09-25). "Effect measurement for RULE items currently
// disables the content the rule touches, which crashes the comparison arm (Law 9) and
// reports nothing useful ... Give rules a toggle the WITHOUT arm can flip (a cfg switch
// per rule item, declared on the backlog row), and teach effect-size.mts to use it."
// The row's `effectSwitch` names the switch values of the WITHOUT arm.
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { describe, expect, it } from 'vitest'
import { checkEffectSwitch, withoutArmFor } from '../tools/effect-arm.js'

const tool = fileURLToPath(new URL('../tools/effect-size.mts', import.meta.url))
const tsx = fileURLToPath(new URL('../node_modules/tsx/dist/cli.mjs', import.meta.url))
const backlog = JSON.parse(readFileSync(new URL('../.state/backlog.json', import.meta.url), 'utf8')) as { id: string; shape: string; effectSwitch?: unknown }[]

describe('a rule item names the switch its WITHOUT arm flips', () => {
  it('movement.zone-of-control and station.crit declare their switches on the backlog row', () => {
    expect(backlog.find((x) => x.id === 'movement.zone-of-control')?.effectSwitch).toEqual({ zoneOfControl: false })
    expect(backlog.find((x) => x.id === 'station.crit')?.effectSwitch).toEqual({ critEnabled: false })
  })

  it('an item with effectSwitch measures by switch, not by disabling content; anything else keeps the kill-switch seam', () => {
    expect(withoutArmFor('station.crit', backlog)).toEqual({ mode: 'switch', switches: { critEnabled: false } })
    expect(withoutArmFor('status.poison', backlog)).toEqual({ mode: 'disable', ids: 'status.poison' })
    expect(withoutArmFor('station.crit,status.poison', backlog)).toEqual({ mode: 'disable', ids: 'station.crit,status.poison' })
  })

  it('a switch that does not exist, has the wrong type, or equals the default is refused — identical arms would read as "no effect"', () => {
    expect(() => checkEffectSwitch({ noSuchSwitch: true })).toThrow(/not a switch/)
    expect(() => checkEffectSwitch({ critEnabled: 'no' })).toThrow(/type/)
    expect(() => checkEffectSwitch({ critEnabled: true })).toThrow(/default/)
    expect(() => checkEffectSwitch({})).toThrow()
    expect(() => checkEffectSwitch(['critEnabled'])).toThrow()
    expect(checkEffectSwitch({ zoneOfControl: false })).toEqual({ zoneOfControl: false })
  })
})

describe('effect-size on a rule item runs both arms and reports a real delta', () => {
  it('the WITHOUT arm carries the switches and disables nothing', () => {
    // Replace only the child transport, as test/effect-arm-integrity.test.ts does,
    // and record what each arm was asked to run.
    const code = `(async()=>{const cp=await import('node:child_process');const m=await import('node:module');const seen=[];cp.default.execSync=(cmd,opts)=>{if(cmd!=='npx tsx tools/effect-size.mts --arm')throw Error('unexpected command '+cmd);seen.push({d:opts?.env?.CF_DISABLE_IDS,s:opts?.env?.CF_EFFECT_SWITCHES});console.error('ARM '+JSON.stringify(seen.at(-1)));const sw=opts?.env?.CF_EFFECT_SWITCHES;return JSON.stringify({'map.open':sw?{heroWins:20,turns:125,invalid:0}:{heroWins:25,turns:100,invalid:0}})};m.syncBuiltinESMExports();process.argv=['node','effect-size','movement.zone-of-control'];await import(${JSON.stringify(pathToFileURL(tool).href)});})()`
    const run = spawnSync(process.execPath, [tsx, '-e', code], { encoding: 'utf8' })
    const text = run.stdout + run.stderr
    expect(run.status, text).toBe(0)
    expect(text).toContain('ARM {"d":"","s":""}')
    expect(text).toContain('ARM {"d":"","s":"{\\"zoneOfControl\\":false}"}')
    expect(text).toContain('WITHOUT = switches {"zoneOfControl":false}')
    expect(text).toContain('heroWins 20->25 (+5)')
    expect(text).toContain('\nMEASURABLE\n')
  })

  it('for real: station.crit with crit switched off runs both arms, no invalid battles, and the outcomes move', () => {
    const run = spawnSync(process.execPath, [tsx, tool, 'station.crit'], { encoding: 'utf8', env: { ...process.env, CF_EFFECT_REPS: '2', CF_DISABLE_IDS: '' } })
    const text = run.stdout + run.stderr
    expect(run.status, text).toBe(0)
    expect(text).toContain('WITHOUT = switches {"critEnabled":false}')
    expect(text).not.toContain('UNAVAILABLE')
    expect(text).toContain('\nMEASURABLE\n')
  }, 120_000)
})
