// refactor.one-action-type (2026-09-04), Law 10 reason: the row's SHAPE moved by ruling — attack fields read under `.attack`, reach is `range`, move fields under `.move`, the registries are one (`ctx.actions`) and the unit's lists are views (attackIdsOf/powerIdsOf). No assertion changed.
// trigger.zombie.rot — 20% onDamage, poison 1 to the target. Replaces the
// hardcoded 100% `applies` rider that lived on attack.zombie.basic: the exact
// one-off shape the trigger system exists to make unnecessary.
import { describe, expect, it } from 'vitest'
import { TEST_COHORT } from '../src/content/index.js'
import { ATTACKS, UNITS } from '../src/content/index.js'
import { createBattle } from '../src/core/setup.js'
import { runBattle } from '../src/core/battle.js'

describe('trigger.zombie.rot', () => {
  it('the hardcode is gone: no attack carries a poison rider anymore', () => {
    for (const a of Object.values(ATTACKS)) expect(a.attack.applies).toBeUndefined()
  })

  it('the zombie def declares rot (exclusivity retired 2026-08-20, Law 10)', () => {
    // WEAKENED with a reason: this asserted rot was the zombie's ONLY trigger.
    // The status.weakness landing added test.zombie.sap (backlog
    // trigger.zombie.sap absorbed as a testing-lane id), so exclusivity is
    // stale by design. Rot itself is unchanged and still asserted.
    expect((UNITS['test-zombie']!.triggers ?? []).map((t) => t.id)).toContain('trigger.zombie.rot')
  })

  it('rot fires in real battles at roughly its chance — a rule, not a snapshot', () => {
    // Across 40 battles: rot must ROLL often (zombies land many bites), and FIRE
    // on a minority of them. 20% declared: accept 8%–35% — a band wide enough to
    // survive balance changes, tight enough to catch 100% (the old rider) or 0%
    // (a dead trigger).
    // Battle count raised 40 → 70 on 2026-08-20 (Law 10, written reason): the
    // status.stun landing lets warriors stun zombies, so zombies land fewer
    // bites per battle and 40 battles slid to exactly the 50-roll floor. The
    // RULE under test is the rate band, which is untouched; the sample floor is
    // calibration, restored by more battles rather than a lower bar.
    let rolled = 0, fired = 0, poisonFromRot = 0
    for (let r = 0; r < 70; r++) {
      const ctx = createBattle({ replicate: r, enemies: TEST_COHORT.enemies }); runBattle(ctx)   // rot rides the TEST zombie (content.enemy-flip)
      for (const e of ctx.events) {
        if (e.causeId === 'trigger.zombie.rot') {
          if (e.type === 'trigger.rolled') rolled++
          if (e.type === 'trigger.fired') fired++
        }
        if (e.type === 'status.applied' && e.causeId === 'trigger.zombie.rot') poisonFromRot++
      }
    }
    expect(rolled).toBeGreaterThan(50)
    expect(fired).toBeGreaterThan(0)
    expect(poisonFromRot).toBe(fired)
    const rate = fired / rolled
    expect(rate).toBeGreaterThan(0.08)
    expect(rate).toBeLessThan(0.35)
  })

  it('boundary: a miss never rots — onDamage means damage landed', () => {
    for (let r = 0; r < 10; r++) {
      const ctx = createBattle({ replicate: r, enemies: TEST_COHORT.enemies }); runBattle(ctx)   // rot rides the TEST zombie (content.enemy-flip)
      // every rot roll must be preceded in the same attack by damage.applied:
      // cheap proxy — rot rolls never exceed zombie damage events
      const rotRolls = ctx.events.filter((e) => e.type === 'trigger.rolled' && e.causeId === 'trigger.zombie.rot').length
      const zombieDamage = ctx.events.filter((e) => e.type === 'damage.applied' && e['attackId'] === 'attack.test-zombie.bite' && (e['amount'] as number) > 0).length
      expect(rotRolls).toBeLessThanOrEqual(zombieDamage)
    }
  })
})
