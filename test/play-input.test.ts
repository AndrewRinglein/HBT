// viewer.play-input (PLAYABLE-OPENING-PLAN.md item 7; engine DECISIONS.md 2026-09-29 "the playable battle screen" and "the
// playable screen: the acting mark, pointing at an enemy, the forecast"). Expect: "Andrew can move and attack in battle 1
// with the mouse alone; the forecast shown equals what lands; right-click undoes a stage; no dropdown is needed."
// tools/play-input-probe.mts plays the Orphanage through the play input with clicks and pointing only; this asks the
// engine whether what the screen was told matches what then happened.
import { describe, it, expect } from 'vitest'
import { probe } from '../tools/play-input-probe.mjs'
import { createSandbox, advanceSandbox, commandSandbox } from '../src/core/sandbox.js'
import { SANDBOX_DEFAULT } from '../src/content/sandbox.js'
import { createPlayInput } from '../src/ui/play-input.js'
import { validateBattleCommand } from '../src/engine.js'

const r = probe()

describe('battle 1 with the mouse alone', () => {
  it('is the Orphanage, on its own map', () => {
    expect([r.encounter, r.mapId]).toEqual(['encounter.opening.orphanage', 'map.opening.orphanage'])
  })
  it('with nothing chosen, pointing at an enemy lights up the engine\'s own reach for it', () => {
    expect(r.threat.shown).toEqual(r.threat.engine)
    expect(r.threat.shown.move.length).toBeGreaterThan(0); expect(r.threat.shown.hit.length).toBeGreaterThan(0)
  })
  it('clicking a hero starts its activation', () => {
    expect(r.selected.actor).not.toBeNull()
  })
  it('a hex for a ghost, right-click takes it back, the hex again, click again to confirm: the hero walks the path shown', () => {
    expect(r.move.reach).toContain(r.move.confirmedAt)
    expect(r.move.ghost).toBe(r.move.confirmedAt)
    expect(r.move.afterBack).toBeNull()
    expect(r.move.engineAt).toBe(r.move.confirmedAt)
    expect(r.move.path.slice(1)).toEqual(r.move.pathFromEngine)
    expect(r.move.provokes).toEqual([...new Set(r.move.engineProvokes)].sort((a, b) => a - b))
  })
  it('the forecast shown equals what lands: hit chance, damage, and the Health it leaves', () => {
    expect(r.attacks.length).toBeGreaterThanOrEqual(2)
    for (const a of r.attacks) {
      expect([a.shown.hit, a.shown.dmg]).toEqual([a.declared.hitChance, a.declared.damageOnHit])
      if (a.engineFromGhost) expect([a.shown.hit, a.shown.dmg]).toEqual([a.engineFromGhost.hitChance, a.engineFromGhost.damageOnHit])
      expect(a.backCleared).toBe(true)
      expect(a.shown.lethal).toBe(a.shown.hpAfter !== null && a.shown.hpAfter <= 0)
    }
    const landed = r.attacks.filter((a) => a.hit && !a.crit && a.landed)
    expect(landed.length).toBeGreaterThanOrEqual(1)
    for (const a of landed) expect(a.landed!.hpAfter).toBe(a.shown.hpAfter)
    expect(r.attacks.some((a) => a.fromGhost && a.hit)).toBe(true)
  })
})

describe('the play input decides nothing on its own', () => {
  const start = () => { const s = createSandbox({ mapId: SANDBOX_DEFAULT.mapId, heroes: [...SANDBOX_DEFAULT.heroes], enemies: [], seed: 1, encounterId: 'encounter.opening.orphanage' }); advanceSandbox(s); return s }
  it('an enemy clicked while choosing a hero is not taken (the panel shows it), and nothing runs', () => {
    const s = start(), ran: unknown[] = [], P = createPlayInput(() => s, (c) => { ran.push(c); return commandSandbox(s, c) })
    const z = s.ctx.state.units.find((u) => u.side === 'enemy')!
    expect(P.input({ kind: 'unit', id: z.id, hex: z.hex })).toBe(false)
    expect(ran).toEqual([])
  })
  it('a slot on another unit\'s bar is not the hero\'s; right-click with nothing to undo is not taken', () => {
    const s = start(), P = createPlayInput(() => s, (c) => commandSandbox(s, c))
    const h = s.ctx.state.units[1]!, z = s.ctx.state.units.find((u) => u.side === 'enemy')!
    /* Law 10 (viewer.xcom-camera, 2026-10-01): engine DECISIONS.md 2026-10-01 'the XCOM-style camera', Andrew: "Double-click a character in the top bar or on the map to change it" — a hero other than the one proposed is picked by a double-click (choose), then clicked; a click alone no longer starts any hero but the proposed one */
    P.input({ kind: 'choose', id: h.id }); expect(P.input({ kind: 'unit', id: h.id, hex: h.hex })).toBe(true)
    expect(P.input({ kind: 'slot', actionId: 'attack.punch', unit: z.id })).toBe(false)
    expect(P.input({ kind: 'back' })).toBe(false)
  })
  it('a hex out of reach is not taken; every hex lit is one the engine validated', () => {
    const s = start(), P = createPlayInput(() => s, (c) => commandSandbox(s, c))
    const h = s.ctx.state.units[1]!
    P.input({ kind: 'choose', id: h.id }); P.input({ kind: 'unit', id: h.id, hex: h.hex })   // Law 10 (viewer.xcom-camera): chosen, then clicked
    const f = P.facts(), off = [...Array(s.ctx.state.terrain.length).keys()].find((x) => !f.reach.includes(x) && x !== h.hex)!
    expect(P.input({ kind: 'hex', hex: off })).toBe(false)
    expect(f.ghost).toBeNull()
    for (const d of f.reach) expect(validateBattleCommand(s.ctx, s.policy, { kind: 'action', actor: h.id, actionId: f.slot!, slot: 'movement', destination: d, expectedSeq: s.ctx.state.seq }).ok).toBe(true)
    expect(s.ctx.state.units[1]!.hex).toBe(h.hex)
  })
})
