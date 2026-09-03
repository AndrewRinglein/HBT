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
    expect(UNITS['test-zombie']).toBeDefined()
  })

  it('drops exactly the named rows, by full id or bare key, in a child process', () => {
    // Env is read at module load, so the real behaviour is only observable in a
    // fresh process. Ask one.
    // The env arrives through execSync's `env` option, NOT as a `VAR=x cmd`
    // shell prefix. That prefix is bash syntax: cmd.exe reads CF_DISABLE_IDS as
    // a program name and the test dies with "is not recognized" before the seam
    // is ever exercised. Same variable, same child process, same assertions —
    // this is a portability change only (Law 10: nothing was weakened).
    const out = execSync(
      `npx tsx -e "` +
      `import('./src/content/statuses.js').then(async (s) => {` +
      `  const u = await import('./src/content/index.js');` +
      `  console.log(JSON.stringify({` +
      `    poison: 'status.poison' in s.STATUSES,` +
      `    zombie: 'test-zombie' in u.UNITS,` +
      `    axe: 'attack.test-warrior.axe' in u.ATTACKS }))})"`,
      {
        encoding: 'utf8', cwd: process.cwd(),
        env: { ...process.env, CF_DISABLE_IDS: 'status.poison,unit.test-zombie' },
      },
    )
    const r = JSON.parse(out.trim().split('\n').pop()!)
    expect(r).toEqual({ poison: false, zombie: false, axe: true })
  })

  it('disabling content that other content references fails LOUDLY (Law 9)', () => {
    // status.poison is referenced by trigger.zombie.rot (formerly a 100% rider —
    // rewritten 2026-08-20, which made "does a battle crash" depend on a 20%
    // roll). So assert the loud failure at its source, deterministically:
    // applying the disabled status throws, never no-ops.
    expect(() => execSync(
      `npx tsx -e "` +
      `import('./src/core/setup.js').then(async (m) => {` +
      `  const { applyStatus } = await import('./src/core/status.js');` +
      `  const ctx = m.createBattle({ replicate: 1, enemyCount: 4 });` +
      `  applyStatus(ctx, 0, 'status.poison', 2, 'test')})"`,
      {
        encoding: 'utf8', cwd: process.cwd(), stdio: 'pipe',
        // See the note above — env option, not a bash prefix. This one matters
        // twice over: under cmd.exe the prefix threw for the WRONG reason, so
        // `toThrow()` passed while proving nothing about Law 9's loud failure.
        env: { ...process.env, CF_DISABLE_IDS: 'status.poison' },
      },
    )).toThrow()
  })

  it('sanity: with the seam OFF, rot-sourced poison lands across battles', () => {
    // 20% per damaging bite: across 20 battles this is overwhelmingly certain.
    const out = execSync(
      `npx tsx -e "` +
      `import('./src/core/setup.js').then(async (m) => {` +
      `  const { runBattle } = await import('./src/core/battle.js');` +
      `  let found = false;` +
      `  for (let r = 0; r < 20 && !found; r++) {` +
      `    const { TEST_COHORT } = await import('./src/content/index.js');` +
      `    const ctx = m.createBattle({ replicate: r, enemyCount: 4, enemies: TEST_COHORT.enemies });` +
      `    runBattle(ctx);` +
      `    found = ctx.events.some((e) => e.type === 'status.applied' && e.causeId === 'trigger.zombie.rot');` +
      `  }` +
      `  console.log(JSON.stringify(found))})"`,
      { encoding: 'utf8', cwd: process.cwd() },
    )
    expect(JSON.parse(out.trim().split('\n').pop()!)).toBe(true)
  })
})
