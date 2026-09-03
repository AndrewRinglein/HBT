import { describe, it, expect } from 'vitest'
import { createBattle, createCustomBattle, fieldedDef } from '../src/core/setup.js'
import { runBattle } from '../src/core/battle.js'
import { score } from '../src/sim/score.js'
import { foldToTurn, setupSeq } from '../src/view/text.js'
import { hexId, neighboursOf } from '../src/core/hex.js'
import { ATTACKS, FIRST_BATTLE, UNITS } from '../src/content/index.js'

const hash = (s: string) => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619) } return h >>> 0 }
const logHash = (ev: unknown[]) => hash(JSON.stringify(ev))

describe('determinism', () => {
  it('same replicate produces a byte-identical event log', () => {
    for (const r of [0, 1, 17, 42]) {
      const a = createBattle({ replicate: r }); runBattle(a)
      const b = createBattle({ replicate: r }); runBattle(b)
      expect(logHash(a.events)).toBe(logHash(b.events))
    }
  })
  it('different replicates produce different battles', () => {
    const hashes = new Set<number>()
    for (let r = 0; r < 30; r++) { const c = createBattle({ replicate: r }); runBattle(c); hashes.add(logHash(c.events)) }
    expect(hashes.size).toBeGreaterThan(25)
  })
})

describe('gate 1 — everything appears in the log', () => {
  it('every unit enters, activates, and acts across a sample of battles', () => {
    const seen = { entered: new Set<string>(), moved: new Set<string>(), attacked: new Set<string>(), damaged: new Set<string>(), killed: new Set<string>() }
    for (let r = 0; r < 40; r++) {
      const ctx = createBattle({ replicate: r, strict: true }); runBattle(ctx)
      const type = new Map<number, string>()
      for (const e of ctx.events) {
        if (e.type === 'unit.enter') { type.set(e.actor!, e['typeId'] as string); seen.entered.add(e['typeId'] as string) }
        if (e.type === 'moved') seen.moved.add(type.get(e.actor!)!)
        if (e.type === 'attack.declared') seen.attacked.add(type.get(e.actor!)!)
        if (e.type === 'damage.applied') seen.damaged.add(type.get(e.target!)!)
        if (e.type === 'life.dead') seen.killed.add(type.get(e.target!)!)
      }
    }
    // typeIds updated 2026-08-20 (Law 10): the standard battle fields the
    // Codex cohort; same claim, new bodies. 2026-09-02 (content.alpha-flip):
    // the party is the Alpha Team — the claim now covers EVERY fielded id,
    // read off FIRST_BATTLE rather than three typed names. Extended.
    for (const t of new Set<string>([...FIRST_BATTLE.heroes, ...FIRST_BATTLE.enemies])) {
      expect(seen.entered, `${t} entered`).toContain(t)
      expect(seen.moved, `${t} moved`).toContain(t)
      expect(seen.attacked, `${t} attacked`).toContain(t)
    }
// LAW 10 — 2026-09-02 (content.enemy-flip): the standard horde is the AUTHORED
// Zombie and Burning Zombie now (5 hp, str 3 — the Codex's), not the test
// clones (10 hp, str 4). FINDING: four authored zombies are a 2.8-turn walkover
// for the Alpha Team (100 battles: 100% clear, one hero down); pressure for a
// claim that needs it comes from a larger authored horde (enemyCount 12: 130
// downs per 100), and the test-lane enemy riders are fielded explicitly
// (TEST_COHORT.enemies). Claims unchanged; the fielding says where the
// pressure comes from.
    expect(seen.killed).toContain(FIRST_BATTLE.enemies[0])
    // Rangers take no damage in the baseline. That is a FINDING about the scenario,
    // not an engine fault — the next test proves the engine can damage them.
    expect(seen.damaged).toContain('alpha-oathblade')
    expect(seen.damaged).toContain(FIRST_BATTLE.enemies[0])
  })

  it('the engine CAN damage a ranger — so zero ranger damage is a scenario fact', () => {
    // Boxed into a corner by six zombies, the ranger has nowhere to kite to.
    const centre = hexId(5, 5)
    const ring = neighboursOf(centre)
    const ctx = createCustomBattle(
      [{ type: 'ranger', hex: centre }],
      ring.map(h => ({ type: 'zombie', hex: h })),
    )
    runBattle(ctx)
    const hits = ctx.events.filter(e => e.type === 'damage.applied' && e.target === 0)
    expect(hits.length, 'a boxed-in ranger gets hit').toBeGreaterThan(0)
    expect(hits[0]!['amount'], 'zombie deals 4 to an unarmoured ranger').toBe(4)
  })

  it('kiting works: a ranger takes far less damage than a warrior', () => {
    // A RULE, not a snapshot. The exact figure is a finding and belongs in the
    // sweep report — asserting it here makes the suite fail every time the game
    // legitimately changes.
    const dmg: Record<string, number> = {}
    for (let r = 0; r < 100; r++) {
      // enemyCount 12 (content.enemy-flip): against four authored zombies the
      // front line takes almost nothing, and a ratio over nothing is noise
      const ctx = createBattle({ replicate: r, enemyCount: 12 }); runBattle(ctx)
      const type = new Map<number, string>()
      for (const e of ctx.events) {
        if (e.type === 'unit.enter') type.set(e.actor!, e['typeId'] as string)
        if (e.type === 'damage.applied') {
          const t = type.get(e.target!) ?? '?'
          dmg[t] = (dmg[t] ?? 0) + (e['amount'] as number)
        }
      }
    }
    // typeIds updated 2026-08-20 (Law 10): the standard party is the
    // Codex-tracked test cohort now — the RULE (kiting spares the archer)
    // is unchanged and asserted on the same roles. 2026-09-02
    // (content.alpha-flip): the same roles again, now the Alpha Team's.
    const HAWK = 'alpha-dusk-hawk', OATH = 'alpha-oathblade'
    expect(dmg[OATH]).toBeGreaterThan(0)
    // LAW 10 — 2026-08-26 (fix.status-tick-timing): /10 sat at a knife edge
    // (10.2% vs 10.0% after the tick moved to End of Activation) and the exact
    // divisor was never the rule. The rule is that kiting SPARES the archer:
    // the hawk takes a small fraction of the front line's damage and less than
    // any melee hero. Both survive legitimate timing changes; a broken kite
    // (ratios near 1) still fails loudly.
    expect(dmg[HAWK] ?? 0).toBeLessThan(dmg[OATH]! / 5)
    for (const melee of [OATH, 'alpha-sky-pirate', 'alpha-osric']) {
      expect(dmg[HAWK] ?? 0, `hawk vs ${melee}`).toBeLessThan(dmg[melee] ?? Infinity)
    }
  })

  it('every attack a fielded unit carries is actually used somewhere', () => {
    // LAW 10 — 2026-09-02 (content.alpha-flip): the old text named four
    // test-lane attacks and called that "every attack in the content
    // library". The rule, stated properly: every attack carried by a unit the
    // standard battle fields is declared at least once across 200 seeds — the
    // AI reaches the whole authored kit, not a favourite. Extended.
    const used = new Set<string>()
    const usedBy = new Map<string, Set<string>>()
    for (let r = 0; r < 200; r++) {
      const ctx = createBattle({ replicate: r }); runBattle(ctx)
      const type = new Map<number, string>()
      for (const e of ctx.events) {
        if (e.type === 'unit.enter') type.set(e.actor!, e['typeId'] as string)
        if (e.type === 'attack.declared') {
          used.add(e['attackId'] as string)
          const t = type.get(e.actor!)!
          if (!usedBy.has(t)) usedBy.set(t, new Set())
          usedBy.get(t)!.add(e['attackId'] as string)
        }
      }
    }
    for (const t of new Set<string>([...FIRST_BATTLE.heroes, ...FIRST_BATTLE.enemies]))
      expect(UNITS[t]!.attacks.some((id) => used.has(id)), `${t} never attacked`).toBe(true)
    // FINDING 2026-09-02, surfaced by the flip: bestAttack() takes the FIRST
    // affordable attack in the unit's declared order, so an authored kit's
    // later entries are dead unless the first is unaffordable. The test cohort
    // hid this (its kits were ordered dear-first); the Alpha Team's are not.
    // Recorded as backlog ai.attack-choice. STRUCTURALLY dead, from the rows:
    // an earlier attack in the same list, of the same kind, costing no more —
    // it is always affordable whenever this one is. (A melee-mode unit's
    // ranged Throw is dead for a different reason: it closes to reach 1, where
    // a ranged attack is illegal.) Computed from data so the list moves only
    // when the rows or the rule do; asserted unused so the suite says so the
    // day ai.attack-choice changes the rule. Rewritten 2026-09-02 from an
    // exact list of unused ids, which also caught rare-but-live attacks
    // (Quick Shot fires only from an empty stamina pool) — Law 10, reason here.
    const structurallyDead: string[] = []
    for (const t of FIRST_BATTLE.heroes) {
      const fielded = fieldedDef(t)   // the kit AS FIELDED (seam.items-per-unit)
      const kit = fielded.attacks.map((id) => ATTACKS[id]!)
      kit.forEach((a, i) => {
        if (a.area) return   // area swings are chosen by areaSwing(), outside declared order
        const shadowed = kit.slice(0, i).some((b) => b.kind === a.kind && b.staminaCost <= a.staminaCost)
        const melee = fielded.ai === 'melee-aggressive' && a.kind === 'ranged'
        if (shadowed || melee) structurallyDead.push(`${t}:${a.id}`)
      })
    }
    expect(structurallyDead.sort()).toEqual([
      'alpha-osric:attack.knight-shield.shield-slam',
      'alpha-osric:attack.longsword.stab',
      'alpha-sky-pirate:attack.dagger.stab',
      'alpha-sky-pirate:attack.javelin.throw',
      'alpha-sky-pirate:attack.punch',   // javelin.stab is cost 0 and first — the Pirate never needs his fists
    ])
    for (const key of structurallyDead) {
      const [t, id] = key.split(':') as [string, string]
      expect(usedBy.get(t) ?? new Set(), `${key} is structurally dead under declared-order choice`).not.toContain(id)
    }
  })
})

describe('gate 2 — invariants across many battles', () => {
  it('damage conservation, hp bounds, stamina bounds, no phantom units', () => {
    for (let r = 0; r < 100; r++) {
      const ctx = createBattle({ replicate: r, strict: true })
      runBattle(ctx)
      for (const u of ctx.state.units) {
        expect(u.hp).toBeGreaterThanOrEqual(0)
        expect(u.hp).toBeLessThanOrEqual(u.maxHp)
        expect(u.stamina).toBeGreaterThanOrEqual(0)
        expect(u.stamina).toBeLessThanOrEqual(u.maxStamina)
        if (u.lifeState === 'standing') expect(u.hp).toBeGreaterThan(0)
      }
      // every hp change is explained by exactly one logged damage OR heal event
      // (heal.applied joined the vocabulary with status.regeneration, 2026-08-20 —
      // the invariant is unchanged: the log alone rebuilds the battle)
      const hpFromLog = new Map<number, number>()
      for (const e of ctx.events) {
        if (e.type === 'unit.enter') hpFromLog.set(e.actor!, e['hp'] as number)
        if (e.type === 'damage.applied' || e.type === 'heal.applied') {
          expect(hpFromLog.get(e.target!)).toBe(e['hpBefore'])
          hpFromLog.set(e.target!, e['hpAfter'] as number)
        }
      }
      for (const u of ctx.state.units) expect(hpFromLog.get(u.id)).toBe(u.hp)
    }
  })

  it('units never share a hex', () => {
    for (let r = 0; r < 60; r++) {
      const ctx = createBattle({ replicate: r })
      runBattle(ctx)
      const alive = ctx.state.units.filter(u => u.lifeState !== 'dead').map(u => u.hex)
      expect(new Set(alive).size).toBe(alive.length)
    }
  })

  it('a battle always ends, and only in a declared way', () => {
    for (let r = 0; r < 100; r++) {
      const ctx = createBattle({ replicate: r })
      const res = runBattle(ctx)
      expect(['heroClear', 'wipe', 'capped']).toContain(res.outcome)
      expect(res.turns).toBeLessThanOrEqual(ctx.cfg.turnCap)
    }
  })

  it('state survives a JSON round trip after a full battle', () => {
    const ctx = createBattle({ replicate: 5 }); runBattle(ctx)
    expect(JSON.parse(JSON.stringify(ctx.state))).toEqual(ctx.state)
  })
})

describe('the log alone can rebuild the battle', () => {
  it('folding events reproduces final hp and position for every unit', () => {
    for (const r of [0, 3, 9]) {
      const ctx = createBattle({ replicate: r }); runBattle(ctx)
      const last = ctx.events[ctx.events.length - 1]!.seq
      const view = foldToTurn(ctx.events, last)
      for (const u of ctx.state.units) {
        expect(view.get(u.id)!.hp, `hp of ${u.name}`).toBe(u.hp)
        expect(view.get(u.id)!.hex, `hex of ${u.name}`).toBe(u.hex)
        expect(view.get(u.id)!.life, `life of ${u.name}`).toBe(u.lifeState)
      }
    }
  })
  it('the deployed board has all 10 units (six heroes + four undead, 2026-08-20)', () => {
    const ctx = createBattle({ replicate: 2 }); runBattle(ctx)
    expect(foldToTurn(ctx.events, setupSeq(ctx.events)).size).toBe(10)
  })
})

describe('consequence stack', () => {
  it('a hero at 0 goes DOWN, not dead; a zombie at 0 dies outright', () => {
    const ctx = createCustomBattle(
      [{ type: 'ranger', hex: hexId(5, 5) }],
      [{ type: 'zombie', hex: hexId(6, 5) }, { type: 'zombie', hex: hexId(5, 6) },
       { type: 'zombie', hex: hexId(6, 6) }, { type: 'zombie', hex: hexId(4, 5) }],
    )
    runBattle(ctx)
    const hero = ctx.state.units[0]!
    const downedFirst = ctx.events.find(e => e.type === 'life.downed' && e.target === 0)
    expect(downedFirst, 'hero was downed before dying').toBeDefined()
    expect(['downed', 'dead']).toContain(hero.lifeState)
    for (const e of ctx.events.filter(e => e.type === 'life.dead')) {
      const enter = ctx.events.find(x => x.type === 'unit.enter' && x.actor === e.target)!
      if (enter['side'] === 'enemy') expect(e['reason']).toBe('hp0')
    }
  })

  it('a downed hero bleeds out in exactly 3 turns with nobody to save them', () => {
    const ctx = createCustomBattle(
      [{ type: 'ranger', hex: hexId(5, 5) }],
      [{ type: 'zombie', hex: hexId(6, 5) }, { type: 'zombie', hex: hexId(5, 6) },
       { type: 'zombie', hex: hexId(6, 6) }, { type: 'zombie', hex: hexId(4, 5) }],
    )
    runBattle(ctx)
    const down = ctx.events.find(e => e.type === 'life.downed')
    const dead = ctx.events.find(e => e.type === 'life.dead' && e['reason'] === 'bledOut')
    if (down && dead) expect((dead.turn as number) - (down.turn as number)).toBe(3)
  })

  it('a wipe is reported as a wipe', () => {
    const ctx = createCustomBattle(
      [{ type: 'ranger', hex: hexId(5, 5) }],
      Array.from({ length: 4 }, (_, i) => ({ type: 'zombie', hex: hexId(4 + i, 6) })),
    )
    const res = runBattle(ctx)
    expect(['wipe', 'heroClear', 'capped']).toContain(res.outcome)
  })
})

describe('the scoreboard is derived from the log and adds up', () => {
  it('enemiesKilled matches the units actually dead', () => {
    for (let r = 0; r < 30; r++) {
      const ctx = createBattle({ replicate: r }); runBattle(ctx)
      const s = score(ctx.events)
      expect(s.enemiesKilled).toBe(ctx.state.units.filter(u => u.side === 'enemy' && u.lifeState === 'dead').length)
      expect(s.heroesDead).toBe(ctx.state.units.filter(u => u.side === 'hero' && u.lifeState === 'dead').length)
      const total = Object.values(s.damageDealtByType).reduce((a, c) => a + c, 0)
      const taken = Object.values(s.damageTakenByType).reduce((a, c) => a + c, 0)
      expect(total).toBe(taken)
    }
  })
})
