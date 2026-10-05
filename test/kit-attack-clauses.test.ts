// fix.kit-attack-clauses (2026-10-04). Found by the weapon audit (DECISIONS.md 2026-10-04 'the weapon audit: the Armory Ledger
// was approved 2026-09-28 and almost none of it is in the game': "the pack drops clauses from weapons the 24 base heroes carry
// (Crush's Armor loss, Elf Shot's Precision, the Obsidian Fang's Strength loss, Thrown Dagger's Surge, 'up to N enemies', Great
// Cleave's Accuracy)") - the same fault as 2026-10-03 "the priest's Holy Texts has no heal in battle".
//
// The rule: every clause a base-kit weapon's Codex row carries is either on the engine's sheet for that attack, or a named
// line in content/gen/enemy-pack-gaps.json - none silent. Each clause that reaches the engine does so through content's pack
// compiler as a second instance of a shape the engine already had (a battle-long stat modifier on a hit - the War Axe's
// on-block is the first); what the engine lacks is named, and filed (SWITCHES.md kitClauses*).
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { createBattle } from '../src/core/setup.js'
import { advanceBattle } from '../src/core/battle.js'
import { executeAction } from '../src/core/commands.js'
import { effective } from '../src/core/stats.js'
import { ACTIONS, BURSTS, ITEMS, UNITS } from '../src/content/index.js'
import OPENING from '../../progression/OPENING-PARTY.json' with { type: 'json' }
import type { Ctx, Event } from '../src/core/types.js'

type CodexTrigger = { hook: string; chance?: number; effect: string }
type CodexAttack = { id: string; targets: string; accuracy?: number; triggers?: CodexTrigger[]; burst?: unknown; [k: string]: unknown }
type Gap = { unit: string; what: string; needs: string }
const read = (f: string) => JSON.parse(readFileSync(join(__dirname, '..', '..', 'content', f), 'utf8'))
const CODEX = read('hbt-content.json') as { attacks: CodexAttack[]; items: { id: string; itemClass: string; grants: string[] }[] }
const GAPS = (read('gen/enemy-pack-gaps.json') as { gaps: Gap[] }).gaps
const codexAttack = (id: string) => CODEX.attacks.find((a) => a.id === id)!
const POOL = OPENING.pool as string[]
/** The weapons the 24 base heroes carry. */
const KIT_WEAPONS = [...new Set(POOL.flatMap((h) => UNITS[h]!.defaultItems ?? []))].filter((i) => ITEMS[i]?.itemClass === 'weapon').sort()
/** A base hero whose own kit holds `item` - it may wield it, whatever its class asks. */
const holderOf = (item: string) => POOL.find((h) => (UNITS[h]!.defaultItems ?? []).includes(item))!
/** The named gap lines of an item's row. */
const gapsOf = (item: string) => GAPS.filter((g) => g.unit === item)

/** A base hero with its own kit beside (or `far` hexes from) a durable zombie, its Activation begun. It always hits (a stat override; the dice are the same). */
function field(item: string, r: number, far = false): Ctx {
  const hero = holderOf(item)
  const ctx = createBattle({ replicate: r, strict: true, mapId: 'map.open', heroes: [hero], heroHexes: [85], enemies: ['test-zombie'], enemyHexes: [far ? 88 : 86], enemyCount: 1,
    overrides: { [hero]: { accuracy: 400, maxStamina: 20, stamina: 20 } as never, 'test-zombie': { maxHp: 90, armor: 3, strength: 4 } as never } })
  advanceBattle(ctx)
  return ctx
}
const use = (ctx: Ctx, attackId: string): Event[] => { const from = ctx.events.length; expect(executeAction(ctx, { actor: 0, actionId: attackId, target: 1 }), attackId).toEqual({ ok: true }); return ctx.events.slice(from) }
const hit = (ev: Event[], attackId: string) => ev.some((e) => e.type === 'attack.hit' && e.causeId === attackId)
const val = (ctx: Ctx, unit: number, stat: 'armor' | 'precision' | 'strength') => effective(ctx, ctx.state.units[unit]!, stat).value

describe('the clauses that reach the engine', () => {
  it('the Iron Mace\'s Crush: on hit the target loses 1 Armor for the rest of the Battle; the Swing takes none', () => {
    const MACE = 'item.iron-mace', CRUSH = 'attack.iron-mace.crush'
    expect(codexAttack(CRUSH).triggers).toEqual([{ hook: 'onHit', effect: 'the target loses 1 Armor for the rest of the Battle' }])
    expect(ITEMS[MACE]!.triggers.filter((t) => t.onlyWithAttack === CRUSH).map((t) => [t.hook, t.chance, t.select, t.effect])).toEqual([
      ['onHit', 100, 'target', { kind: 'statMod', stat: 'armor', value: -1, until: 'battle' }]])
    const ctx = field(MACE, 0), before = val(ctx, 1, 'armor')
    expect(hit(use(ctx, 'attack.iron-mace.swing'), 'attack.iron-mace.swing')).toBe(true)
    expect(val(ctx, 1, 'armor')).toBe(before)
    const again = field(MACE, 0)
    expect(hit(use(again, CRUSH), CRUSH)).toBe(true)
    expect(val(again, 1, 'armor')).toBe(before - 1)
    // a fielded base hero carries it
    expect(again.state.units[0]!.triggers.some((t) => t.onlyWithAttack === CRUSH && t.source === MACE)).toBe(true)
  })

  it('the Elfbow\'s Elf Shot: on hit the shooter gains 1 Precision, for the Battle, and it stacks', () => {
    const BOW = 'item.elfbow', SHOT = 'attack.elfbow.elf-shot'
    expect(codexAttack(SHOT).triggers).toEqual([{ hook: 'onHit', chance: 100, effect: 'gain 1 Precision' }])
    expect(ITEMS[BOW]!.triggers.filter((t) => t.onlyWithAttack === SHOT).map((t) => [t.hook, t.chance, t.select, t.effect])).toEqual([
      ['onHit', 100, 'self', { kind: 'statMod', stat: 'precision', value: 1, until: 'battle' }]])
    const ctx = field(BOW, 0, true), before = val(ctx, 0, 'precision')
    expect(hit(use(ctx, SHOT), SHOT)).toBe(true)
    expect(val(ctx, 0, 'precision')).toBe(before + 1)
    // its other attack brings none
    expect(ITEMS[BOW]!.triggers.filter((t) => t.onlyWithAttack && t.onlyWithAttack !== SHOT)).toEqual([])
  })

  it('the Obsidian Fang Dagger: on hit, 20%, the target loses 1 Strength - on the Fang and on the Gut', () => {
    const DAGGER = 'item.obsidian-fang-dagger'
    for (const a of ITEMS[DAGGER]!.grants) {
      expect(codexAttack(a).triggers, a).toEqual([{ hook: 'onHit', chance: 20, effect: 'target loses 1 Strength' }])
      expect(ITEMS[DAGGER]!.triggers.filter((t) => t.onlyWithAttack === a).map((t) => [t.hook, t.chance, t.select, t.effect]), a).toEqual([
        ['onHit', 20, 'target', { kind: 'statMod', stat: 'strength', value: -1, until: 'battle' }]])
      // a replicate on which the 20% fires, and one on which it does not
      let fired = false, held = false
      for (let r = 0; r < 80 && !(fired && held); r++) {
        const ctx = field(DAGGER, r), before = val(ctx, 1, 'strength'), ev = use(ctx, a)
        if (!hit(ev, a)) continue
        const roll = ev.find((e) => e.type === 'trigger.rolled' && e['source'] === DAGGER)!
        expect(roll['chance']).toBe(20)
        expect(val(ctx, 1, 'strength'), `${a} replicate ${r}`).toBe(roll['fired'] ? before - 1 : before)
        if (roll['fired']) fired = true; else held = true
      }
      expect([fired, held], a).toEqual([true, true])
    }
  })
})

describe('the clauses the engine cannot yet do are named, never dropped', () => {
  it('the Daggers\' Thrown Dagger: "on kill, gain 50 Surge" is a named line - no effect moves a unit\'s Surge amount', () => {
    const THROW = 'attack.daggers.thrown-dagger'
    expect(codexAttack(THROW).triggers).toEqual([{ hook: 'onKill', chance: 100, effect: 'gain 50 Surge' }])
    expect(ITEMS['item.daggers']!.triggers.filter((t) => t.onlyWithAttack === THROW)).toEqual([])
    const named = gapsOf('item.daggers').filter((g) => g.what.includes(THROW) && g.what.includes('gain 50 Surge'))
    expect(named).toHaveLength(1)
    expect(named[0]!.needs).toMatch(/Surge/)
    expect(named[0]!.needs).not.toBe('trigger shape unparsed')   // it says WHICH mechanism is missing
  })

  it('the Throwing Knives\' Fan and the Elfbow\'s Double Shot: an attack at several chosen targets lands on one, and the row says so wherever its words are "up to N enemies"', () => {
    for (const [item, a] of [['item.throwing-knives', 'attack.throwing-knives.fan'], ['item.elfbow', 'attack.elfbow.double-shot']] as const) {
      const row = codexAttack(a), pack = ACTIONS[a]!
      expect(pack.attack, `${a} is an attack on one unit in the engine`).toBeDefined()
      expect(pack.attack!.hits, a).toBe(row['hits'])
      const several = /^up to \d+ enemies/.test(row.targets)
      const named = gapsOf(item).filter((g) => g.what.includes(a) && g.what.includes('targets'))
      expect(named.length, `${a}: "${row.targets}"`).toBe(several ? 1 : 0)
      if (several) expect(named[0]!.needs).toMatch(/several chosen targets/)
    }
    // the Fan's words are several targets today
    expect(codexAttack('attack.throwing-knives.fan').targets).toMatch(/^up to 3 enemies/)
  })

  it('over every weapon in a base hero\'s kit: each clause of its Codex row is on the engine\'s sheet for that attack, or a named line', () => {
    expect(KIT_WEAPONS.length).toBeGreaterThan(10)
    const silent: string[] = []
    let clauses = 0
    for (const item of KIT_WEAPONS) {
      const named = gapsOf(item)
      const isNamed = (...words: string[]) => named.some((g) => words.every((w) => g.what.includes(w)))
      for (const id of CODEX.items.find((i) => i.id === item)!.grants.filter((g) => g.startsWith('attack.'))) {
        const row = codexAttack(id), burst = BURSTS[id]
        // its riders: a compiled trigger of the item on that hook, scoped to that attack - or a named line
        for (const t of row.triggers ?? []) {
          clauses++
          const fielded = ITEMS[item]!.triggers.some((x) => x.onlyWithAttack === id && x.hook === t.hook && x.chance === (t.chance ?? 100))
          if (!fielded && !isNamed(id, t.hook)) silent.push(`${item} ${id} ${t.hook}: ${t.effect}`)
        }
        // who it strikes: one enemy, or a burst over its authored area - or a named line
        clauses++
        if (!/^one enemy (in melee reach|within \d+ hex(es)?)$/.test(row.targets) && !burst && !isNamed(id, 'targets')) silent.push(`${item} ${id} targets: ${row.targets}`)
        // a burst does not roll: an authored Accuracy on one has nothing to modify, and is named
        if (burst && (row.accuracy ?? 0) !== 0) { clauses++; if (!isNamed(id, 'accuracy')) silent.push(`${item} ${id} accuracy ${row.accuracy} on a burst`) }
        // its Accuracy otherwise is the attack's own
        if (!burst && (row.accuracy ?? 0) !== 0) { clauses++; if (ACTIONS[id]?.attack?.accuracy !== row.accuracy) silent.push(`${item} ${id} accuracy ${row.accuracy}`) }
        // damage read from a second quantity (the target's status, another stat): the engine has no such term yet - named
        for (const k of ['addsTargetStatus', 'addsStat', 'halfStatBonus', 'doubleStatBonus', 'doubleStat', 'accuracyVs']) {
          if (row[k] === undefined) continue
          clauses++
          if (!isNamed(id, k)) silent.push(`${item} ${id} ${k}: ${JSON.stringify(row[k])}`)
        }
      }
    }
    expect(silent).toEqual([])
    expect(clauses).toBeGreaterThan(40)
  })

  it('a named line says which mechanism is missing: none of a base-kit weapon\'s lines is the bare "trigger shape unparsed"', () => {
    const bare = KIT_WEAPONS.flatMap((item) => gapsOf(item).filter((g) => g.needs === 'trigger shape unparsed').map((g) => `${item}: ${g.what}`))
    expect(bare).toEqual([])
  })
})
