// The kill-switch seam: CF_DISABLE_IDS removes content rows at load.
//
// This is Iron Gauntlet plumbing — the gate uses it to prove an item's tests
// actually depend on the item's content. These tests cover the seam itself.
import { describe, expect, it } from 'vitest'
import { execSync } from 'node:child_process'
import { omitDisabled } from '../src/content/disable.js'
import { ATTACKS, UNITS } from '../src/content/index.js'
import { STATUSES } from '../src/content/statuses.js'

describe('the kill-switch seam', () => {
  it('is a byte-identical no-op when nothing is disabled', () => {
    // The whole design rests on this: with the env unset, the exported registry
    // IS the raw object, so the control baselines cannot see the seam exists.
    const reg = { a: 1, b: 2 }
    expect(omitDisabled(reg)).toBe(reg)
    expect(STATUSES['status.poison']).toBeDefined()
    expect(UNITS['zombie']).toBeDefined()
  })

  it('drops exactly the named rows, by full id or bare key, in a child process', () => {
    // Env is read at module load, so the real behaviour is only observable in a
    // fresh process. Ask one.
    const out = execSync(
      `CF_DISABLE_IDS=status.poison,unit.zombie npx tsx -e "` +
      `import('./src/content/statuses.js').then(async (s) => {` +
      `  const u = await import('./src/content/index.js');` +
      `  console.log(JSON.stringify({` +
      `    poison: 'status.poison' in s.STATUSES,` +
      `    zombie: 'zombie' in u.UNITS,` +
      `    axe: 'attack.warrior.axe' in u.ATTACKS }))})"`,
      { encoding: 'utf8', cwd: process.cwd() },
    )
    const r = JSON.parse(out.trim().split('\n').pop()!)
    expect(r).toEqual({ poison: false, zombie: false, axe: true })
  })

  it('disabling content that other content references fails LOUDLY (Law 9)', () => {
    // The zombie's bite carries `applies: status.poison`. With the status disabled
    // the registry lookup throws rather than silently skipping — a battle minus a
    // referenced row is invalid, not merely quieter. This loud failure is exactly
    // what the gate's kill-switch check counts on: tests cannot pass without the
    // content they claim to test.
    expect(() => execSync(
      `CF_DISABLE_IDS=status.poison npx tsx -e "` +
      `import('./src/core/setup.js').then(async (m) => {` +
      `  const { runBattle } = await import('./src/core/battle.js');` +
      `  runBattle(m.createBattle({ replicate: 1, enemyCount: 4 }))})"`,
      { encoding: 'utf8', cwd: process.cwd(), stdio: 'pipe' },
    )).toThrow()
  })

  it('sanity: with the seam OFF, poison does land in the same battle', () => {
    const out = execSync(
      `npx tsx -e "` +
      `import('./src/core/setup.js').then(async (m) => {` +
      `  const { runBattle } = await import('./src/core/battle.js');` +
      `  const ctx = m.createBattle({ replicate: 1, enemyCount: 4 });` +
      `  runBattle(ctx);` +
      `  console.log(JSON.stringify(ctx.events.some((e) => JSON.stringify(e).includes('status.poison'))))})"`,
      { encoding: 'utf8', cwd: process.cwd() },
    )
    expect(JSON.parse(out.trim().split('\n').pop()!)).toBe(true)
  })
})
