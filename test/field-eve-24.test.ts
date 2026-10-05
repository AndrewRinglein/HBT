// refactor.one-action-type (2026-09-04), Law 10 reason: the row's SHAPE moved by ruling — attack fields read under `.attack`, reach is `range`, move fields under `.move`, the registries are one (`ctx.actions`) and the unit's lists are views (attackIdsOf/powerIdsOf). No assertion changed.
// content.field-eve-24 (2026-09-02) — every Eve hero with a dictated full kit
// fields. gen/kits.json 2026-08-27b: "ALL 24 Eve heroes now carry FULL kits";
// the party lane reads that registry instead of naming three heroes. Pipeline
// agreement, never frozen numbers: each hero's row is its Codex body plus its
// kit's stat modifiers, and its attacks are what its kit grants (plus Punch).
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { ACTIONS, BADGES, BURSTS, ABILITIES, ATTACKS, UNITS } from '../src/content/index.js'
import { scenarioDef, scenarioOptions } from '../src/content/scenarios.js'
import { fieldedDef, createBattle } from '../src/core/setup.js'
import { runBattle } from '../src/core/battle.js'

// LAW 10 — 2026-09-02 (seam.items-per-unit): hero rows are BARE now — the kit's
// attacks, powers, riders and stat deltas are applied at FIELDING by
// applyItems, not folded into the row by the converter. Every claim below
// about what a hero carries is a claim about the hero AS FIELDED, so it reads
// fieldedDef(id) (the one function the battle and any preview share). The
// claims are unchanged; only where the kit lives moved.
const CONTENT = join(__dirname, '..', '..', 'content')
const kits = (): Record<string, string[]> => {
  const k = JSON.parse(readFileSync(join(CONTENT, 'gen', 'kits.json'), 'utf8')).heroKits as Record<string, unknown>
  return Object.fromEntries(Object.entries(k).filter(([id, v]) => id.startsWith('hero.') && Array.isArray(v))) as Record<string, string[]>
}
const codex = () => {
  const D = JSON.parse(readFileSync(join(CONTENT, 'hbt-content.json'), 'utf8'))
  const heroes = new Map<string, { ported: Record<string, number>; derivedBase: Record<string, number> }>()
  const items = new Map<string, { grants?: string[]; statModifiers?: Record<string, number> }>()
  const walk = (o: unknown): void => {
    if (Array.isArray(o)) { o.forEach(walk); return }
    if (o && typeof o === 'object') {
      const r = o as { id?: string; ported?: Record<string, number>; itemClass?: string }
      if (typeof r.id === 'string' && r.id.startsWith('hero.') && r.ported) heroes.set(r.id, r as never)
      if (typeof r.id === 'string' && r.id.startsWith('item.') && r.itemClass) items.set(r.id, r as never)
      Object.values(o).forEach(walk)
    }
  }
  walk(D)
  return { heroes, items }
}
const gaps = (): { unit: string; what: string; needs: string }[] =>
  JSON.parse(readFileSync(join(CONTENT, 'gen', 'enemy-pack-gaps.json'), 'utf8')).gaps

describe('all twenty-four field', () => {
  it('every heroKits row with a full kit is a UNITS row — twenty-four, six classes', () => {
    const ids = Object.keys(kits())
    expect(ids.length).toBe(24)
    for (const id of ids) expect(UNITS[id], id).toBeDefined()
    const classes = new Set(ids.map((id) => id.split('.')[2]!.split('-')[0]))
    expect([...classes].sort()).toEqual(['mage', 'paladin', 'priest', 'ranger', 'rogue', 'warrior'])
  })

  it('each row is the Codex body plus the kit fold, and the attacks are the kit\'s grants plus Punch', () => {
    const { heroes, items } = codex()
    const g = gaps()
    for (const [id, kit] of Object.entries(kits())) {
      const u = fieldedDef(id)
      const h = heroes.get(id)!
      const mod = (stat: string) => kit.reduce((s, it) => s + (items.get(it)?.statModifiers?.[stat] ?? 0), 0)
      // Law 10, 2026-10-05 — content.hero-origin-badges (DECISIONS.md 2026-10-05 'seven answers: … origin badges go on the heroes …': "3, yes."): these four read
      //   expect(u.maxHp, …).toBe((h.ported.health ?? 0) + mod('health'))          expect(u.armor, …).toBe((h.ported.armor ?? 0) + mod('armor'))
      //   expect(u.movement, …).toBe((h.derivedBase.movement ?? 0) + mod('movement'))   expect(u.dodge, …).toBe((h.ported.dodge ?? 0) + mod('dodge'))
      // - the Codex body plus the kit fold. A base hero's row carries its origin badges now and a badge acts from the row, so
      // the fielded number is the body, the kit and exactly what the row's origin badges carry (the engine's compiled badge).
      const origin = (stat: string) => (UNITS[id]!.badges ?? []).reduce((s, b) => s + ((BADGES[b]!.statModifiers as Record<string, number>)[stat] ?? 0), 0)
      expect(u.maxHp, `${id} maxHp`).toBe((h.ported.health ?? 0) + mod('health') + origin('maxHp'))
      expect(u.armor, `${id} armor`).toBe((h.ported.armor ?? 0) + mod('armor') + origin('armor'))
      expect(u.movement, `${id} movement`).toBe((h.derivedBase.movement ?? 0) + mod('movement') + origin('movement'))
      expect(u.dodge, `${id} dodge`).toBe((h.ported.dodge ?? 0) + mod('dodge') + origin('dodge'))
      expect(u.accuracy, `${id} accuracy`).toBe((h.derivedBase.accuracy ?? 0) + mod('accuracy'))
      // every attack the kit grants is on the row, in kit order, then Punch;
      // an attack the Codex names but no row authors must be a named gap
      const granted = kit.flatMap((it) => (items.get(it)?.grants ?? []).filter((x) => x.startsWith('attack.')))
      for (const a of granted) {
        if (ACTIONS[a]) expect(u.attacks, `${id} carries ${a}`).toContain(a)
        else expect(g.some((x) => x.unit === id && x.what.includes(a)), `${id}: ${a} unauthored must be a gap`).toBe(true)
      }
      expect(u.attacks[u.attacks.length - 1], `${id} ends with the universal Punch`).toBe('attack.punch')
      // powers: compiled or gapped, never silently dropped
      for (const p of kit.flatMap((it) => (items.get(it)?.grants ?? []).filter((x) => x.startsWith('power.')))) {
        const compiled = u.abilities.includes(p) && ACTIONS[p] !== undefined
        // Law 10, fix.starting-kit-powers (2026-10-04; DECISIONS.md 2026-10-03 "reported: the priest's Holy Texts has no heal
        // in battle"): the rule is still "compiled or gapped, never silently dropped" — a power that did not compile is named
        // as an 'item power' gap, and never beside a compiled one. A power that DID compile may name a clause the engine
        // cannot do yet (Flame Burst and Frost Nova: 'a burst paints no ground'); that clause gap is checked below, by name.
        // was: const gapped = g.some((x) => x.unit === id && x.what.includes(p))
        const gapped = g.some((x) => x.unit === id && x.what.includes(p) && /^item power/.test(x.needs))
        expect(compiled !== gapped, `${id}: ${p} compiled=${compiled} gapped=${gapped}`).toBe(true)
        for (const x of g.filter((r) => r.unit === id && r.what.includes(p) && !/^item power/.test(r.needs))) {
          expect(compiled, `${id}: ${p} names the clause '${x.what}' only as a compiled power`).toBe(true)
          expect(x.needs, `${id}: ${p}'s clause gap names what the engine lacks`).toBe('a burst paints no ground (capability.burst-paints-ground)')
        }
      }
      expect(u.tags, `${id} is a hero`).toContain('hero')
      expect(u.moves[0]).toBe('power.move')
    }
  })

  it('the Hunter finally wears his Thick Hide — the finding this landing surfaced', () => {
    // Before 2026-09-02 the tier-0 armors (hbt-content.json only) were not a
    // converter source, so eight heroes fielded with their armor's whole
    // payload dropped as a gap. The gap is gone and the fold is real.
    expect(gaps().some((x) => x.unit === 'hero.base.ranger-aggressive' && /thick-hide not in/.test(x.what))).toBe(false)
    expect(fieldedDef('hero.base.ranger-aggressive').maxHp).toBe(9)
  })
})

describe('in real battles — the roll-call', () => {
  it('both halves field, every hero acts, and the melee ones are melee, the bow-and-staff ones kite', () => {
    for (const sid of ['showcase.eve-24-a', 'showcase.eve-24-b']) {
      const ctx = createBattle(scenarioOptions(scenarioDef(sid))); runBattle(ctx)
      const type = new Map<number, string>()
      const acted = new Set<string>()
      for (const e of ctx.events) {
        if (e.type === 'unit.enter') type.set(e.actor!, e['typeId'] as string)
        if (e.type === 'attack.declared' || e.type === 'power.used' || e.type === 'move.begin') acted.add(type.get(e.actor!)!)
      }
      for (const id of scenarioDef(sid).heroes) expect(acted, `${id} acted in ${sid}`).toContain(id)
    }
    for (const id of Object.keys(UNITS)) {
      if (!id.startsWith('hero.base.')) continue
      const u = fieldedDef(id)   // role follows the kit AS FIELDED (seam.items-per-unit)
      const anyRanged = u.attacks.some((a) => ACTIONS[a]?.attack?.kind === 'ranged')
      expect(u.role, `${id} role follows its kit`).toBe(anyRanged ? 'ranged' : 'melee')
    }
  })
})
