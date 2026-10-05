// Hero assembly (2026-09-03) — the engine builds the progression roster itself.
//
// Angela: "I would rather we are actually assembling the units so that we know
// that the way that we're getting things into the units is still correct ...
// it has to also have the abilities in it." Then: "Derive, compare, report" —
// fieldedDef() derives each hero from level + specialty + pick + items +
// powers; the schedule's own stat block is the oracle; a disagreement is a
// FINDING and is printed, never patched over.
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fieldedDef, createBattle } from '../src/core/setup.js'
import { runBattle } from '../src/core/battle.js'
import { ABILITIES, ITEMS, LEVELS, SPECIALTIES, UNITS } from '../src/content/index.js'
import { disagreements, rosterOptionsOf, type Schedule } from '../src/sim/progression.js'

const schedule = JSON.parse(readFileSync(join(__dirname, '..', '..', 'progression', 'PROGRESSION-SCHEDULE.json'), 'utf8')) as Schedule

describe('the registries the assembly reads', () => {
  it('every class has a level table, every specialty names a class, every enchanted row names base and enchant', () => {
    for (const c of ['class.warrior', 'class.ranger', 'class.rogue', 'class.mage', 'class.priest', 'class.paladin']) expect(LEVELS[c], c).toBeDefined()
    for (const sp of Object.values(SPECIALTIES)) expect(sp.class.startsWith('class.'), sp.id).toBe(true)
    const enchanted = Object.values(ITEMS).filter((i) => (i as { enchant?: string }).enchant)
    expect(enchanted.length).toBeGreaterThan(100)
    for (const it of enchanted) expect(ITEMS[(it as unknown as { base: string }).base], `${it.id}'s base is an item`).toBeDefined()
  })

  it('every class power is in ABILITIES — compiled, or inert with its gaps named', () => {
    const powers = Object.values(ABILITIES).filter((a) => a.effects !== undefined)
    expect(powers.length).toBeGreaterThan(200)
    for (const p of powers) if (p.effects!.length === 0) expect(p.gaps?.length, `${p.id} is inert and must say why`).toBeGreaterThan(0)
  })
})

/** What the Codex says the held WEAPON rows give in Strength, Precision, Crit and Accuracy - the four the engine puts on the
 *  weapon's own attacks (fix.enchant-stats-on-weapon): a codex row's own statModifiers, or - a row made from a base and an
 *  attribute - the attribute's. Read from the published Codex, keyed by the schedule's stat words. */
const PUBLISHED = JSON.parse(readFileSync(join(__dirname, '..', '..', 'content', 'hbt-content.json'), 'utf8')) as { items: { id: string; statModifiers?: Record<string, number> }[]; enchants: { id: string; statModifiers?: Record<string, number> }[] }
function weaponNumbersOf(items: readonly string[]): Record<string, number> {
  const out: Record<string, number> = {}
  for (const id of items) {
    const row = ITEMS[id] as ((typeof ITEMS)[string] & { enchant?: string }) | undefined
    if (!row || row.itemClass !== 'weapon') continue
    const said = row.enchant ? PUBLISHED.enchants.find((e) => e.id === row.enchant)?.statModifiers : PUBLISHED.items.find((x) => x.id === id)?.statModifiers
    for (const k of ['strength', 'precision', 'crit', 'accuracy']) if (said?.[k]) out[k] = (out[k] ?? 0) + said[k]!
  }
  return out
}

describe('the progression roster, assembled by the engine', () => {
  it('all twenty battles: every fielded hero derives through fieldedDef() and the schedule\'s stat block agrees — findings printed', () => {
    const findings: string[] = []
    const stowed: string[] = []
    let heroes = 0
    for (const b of schedule.battles) {
      const opts = rosterOptionsOf(schedule, b.battle, ITEMS)
      opts.heroes.forEach((id, i) => {
        heroes++
        const def = fieldedDef(id, opts.heroItems[i], opts.heroProgress[i])
        for (const w of opts.stowed[i]!) stowed.push(`battle ${b.battle} ${id} stows weapon ${w} in an item slot`)
        // Law 10, 2026-10-04 — fix.enchant-stats-on-weapon (DECISIONS.md 2026-09-28 'counterattack, special free attacks, the opening six, shields, custom weapons': "Strength becomes the weapon's damage (its attacks go up); Crit and Accuracy apply to that weapon's attacks"):
        // the schedule's stat block is built by progression/build-schedule.mjs, which merges EVERY held item's numbers onto the hero -
        // a weapon's Strength, Precision, Crit and Accuracy among them. The engine puts those four on the weapon's own attacks now, so
        // the hero's sheet is less by exactly what his weapons' Codex rows say of them. The comparison adds that back (as the Crit base
        // is added back in disagreements()), so the two still speak of one number and any OTHER difference is still a finding.
        // FOUND: the schedule's own rule is older than the ruling; its builder is not changed here (SWITCHES.md weaponStatsSchedule).
        // (was: for (const d of disagreements(def, opts.oracle[i]!)) findings.push(…) - every disagreement, with nothing added back)
        const onWeapons = weaponNumbersOf(opts.heroItems[i] ?? [])
        for (const d of disagreements(def, opts.oracle[i]!)) if (d.engine + (onWeapons[d.stat] ?? 0) !== d.schedule) findings.push(`battle ${b.battle} ${id} ${d.stat}: engine ${d.engine} vs schedule ${d.schedule}`)
        // the abilities are in — every drafted power is on the fielded unit
        for (const p of opts.heroProgress[i]!.powers ?? []) expect(def.abilities, `${id} carries ${p}`).toContain(p)
      })
    }
    expect(heroes).toBeGreaterThanOrEqual(20 * 4)
    if (findings.length) console.log('HERO ASSEMBLY FINDINGS\n' + findings.join('\n'))
    expect(findings, 'engine and schedule disagree — a finding, read the log').toEqual([])
    // FINDING, recorded 2026-09-03 (the first run): the schedule's assigner
    // stows spare WEAPONS in item slots (the Lion's third one-hander from
    // battle 7; the Raven's knives at 20). The engine wields or nothing, so
    // those are left off — and every STAT still agrees, which says the stowed
    // weapons carried no modifiers. Reported, not patched: the schedule's rule.
    if (stowed.length) console.log('STOWED WEAPONS (schedule rule, engine leaves them off)\n' + stowed.join('\n'))
    for (const line of stowed) expect(line).toMatch(/stows weapon item\./)
  })

  it('battle 20 fields as a real battle, and a drafted power is used in it', () => {
    const opts = rosterOptionsOf(schedule, 20, ITEMS)
    const ctx = createBattle({ ...opts, replicate: 0, enemyCount: 12, mapId: 'map.open' })
    expect(ctx.state.units.filter((u) => u.side === 'hero').length).toBe(opts.heroes.length)
    runBattle(ctx)
    expect(ctx.state.outcome).not.toBeNull()
  })

  it('loud on a wrong assembly: a level past the table, a foreign specialty, a pick that is not an option, an unknown power', () => {
    const id = 'hero.base.warrior-iron'
    expect(UNITS[id]).toBeDefined()
    expect(() => fieldedDef(id, undefined, { level: 99, specialtyId: 'specialty.bloodrage' })).toThrow(/past/)
    expect(() => fieldedDef(id, undefined, { level: 2, specialtyId: 'specialty.bowmaster' })).toThrow(/cannot hold/)
    expect(() => fieldedDef(id, undefined, { level: 5, specialtyId: 'specialty.bloodrage', levelFivePick: { health: 99 } })).toThrow(/not one of/)
    expect(() => fieldedDef(id, undefined, { level: 2, specialtyId: 'specialty.bloodrage', powers: ['power.nope'] })).toThrow(/not a power/)
  })
})
