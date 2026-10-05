// viewer.log-names-damage-cause (engine backlog; engine DECISIONS.md 2026-10-05 'playtest post: ...' and 'the playtest post
// answered'). Andrew: "The priest was attacking the skeleton archer, and it was taking damage. I don't know why that was." The
// engine's side - what the log is worded from, and nothing new: every damage.applied line names its cause (causeId) and
// carries the field that says what kind of damage it is - a status's tick its statusId and no actor, an attack its attackId
// and its attacker, a burst or a power its abilityId, Thorns, a collision, the ground's hazard - and a status's tick comes at
// the end of its bearer's own Activation. This file holds that against the engine's own battles; the viewer's half
// (../viewer/tools/log-names-damage-cause.test.mjs) reads the log, the floating number and the pump's timing on the page.
// Imports no page code.
import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { createBattle } from '../../engine/src/core/setup.js'
import { runBattle } from '../../engine/src/core/battle.js'
import { STATUSES } from '../../engine/src/content/statuses.js'
import { scenarioDef, scenarioOptions } from '../../engine/src/content/scenarios.js'

const OPENING = ['orphanage', 'lumberjack', 'bridge', 'cavern-trail', 'gates', 'cathedral']
type Line = { type: string; causeId: string; actor: number | null; target: number | null } & Record<string, unknown>

describe('every damage line says what dealt it', () => {
  it('the engine: a damage line names its cause and its kind; a status\'s tick has no attacker and follows the end of its bearer\'s Activation', () => {
    let damage = 0, ticks = 0, afterOwn = 0, atPhaseEnd = 0
    for (const s of OPENING) {
      const ctx = createBattle(scenarioOptions(scenarioDef('test.opening-' + s), 1)); runBattle(ctx)
      const ev = ctx.events as unknown as Line[]
      ev.forEach((e, i) => {
        if (e.type !== 'damage.applied') return
        damage++
        expect(typeof e.causeId, `${s} ${i}`).toBe('string'); expect(e.causeId.length).toBeGreaterThan(0)
        const kind = e.statusId !== undefined ? 'status' : e.thorns === true ? 'thorns' : e.collision === true ? 'collision' : e.hazard === true ? 'hazard'
          : e.attackId !== undefined ? 'attack' : e.abilityId !== undefined ? 'ability' : e.causeId.startsWith('trigger.') ? (e.actor === null ? 'fall' : 'trigger') : 'other'
        if (kind === 'status') {
          ticks++
          expect(e.statusId, `${s} ${i}`).toBe(e.causeId); expect(e.actor, 'nobody struck it').toBeNull()
          expect((STATUSES[e.statusId as string] as { tickDamageType?: string }).tickDamageType).toBe(e.damageType)
          // where it comes: after the end of its bearer's own Activation and before the next begins (what the Activation's end
          // itself fires - its triggers - may stand between); a unit that did not act is ticked when its side's Phase ends
          let k = i - 1
          while (k > 0 && !['activation.end', 'activation.begin', 'phase.end.begin'].includes(ev[k]!.type)) k--
          if (ev[k]!.type === 'phase.end.begin') atPhaseEnd++
          else { expect([ev[k]!.type, ev[k]!.actor], `${s} ${i}: a tick follows its bearer's activation.end`).toEqual(['activation.end', e.target]); afterOwn++ }
        } else if (kind === 'attack' || kind === 'ability' || kind === 'trigger' || kind === 'thorns') expect(e.actor, `${s} ${i}: ${kind} has its unit`).not.toBeNull()
        // a fall from above (the encounter's own: core/encounter.ts) has no unit behind it - its id and the hex it landed on
        if (kind === 'fall') expect(typeof e.hex, `${s} ${i}: a fall names its hex`).toBe('number')
        expect(kind, `${s} ${i}: ${e.causeId}`).not.toBe('other')
      })
    }
    expect(damage).toBeGreaterThan(100); expect(ticks).toBeGreaterThan(3); expect(afterOwn).toBeGreaterThan(3)
    console.log(`${damage} damage lines in the six opening battles; ${ticks} status ticks: ${afterOwn} after the bearer's own Activation, ${atPhaseEnd} at a Phase's end`)
  }, 60000)
  it('the viewer page: the log names the cause of every damage line, a tick floats as its status\'s, after the unit\'s own strike; battle 2\'s trace', () => {
    const out = execFileSync(process.execPath, ['--test', '--test-reporter=tap', 'tools/log-names-damage-cause.test.mjs'], { cwd: '../viewer', encoding: 'utf8', maxBuffer: 1 << 24, env: { ...process.env, VIEWER_PAGE: process.env.VIEWER_PAGE ?? '' } })
    expect(out).toMatch(/# pass 5/); expect(out).toMatch(/# fail 0/)
    console.log(out.split('\n').filter((l) => l.startsWith('# battle 2')).join('\n'))
  }, 170000)
})
