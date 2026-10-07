// content.hero-origin-badges (2026-10-05). Ruled 2026-10-05 (DECISIONS.md 'seven answers: the first hero's card shows only
// what is modified; origin badges go on the heroes; …'): told that no base hero has a badge of its own in the game though the
// Codex names origin badges for most of the 24, and asked whether those should be put on the heroes' rows - "3, yes."
//
// The Codex's list is content/gen/heroes.json, each `hero.base.*` row's `originBadges` (badge NAMES; the badge rows are
// content/gen/badges.json). This walks the 24 and fails if a row's badges differ from that list; holds what each badge puts on
// the fielded hero against the hero as it was fielded the day before; and holds every line that waits on a mechanism as a
// NAMED line of its badge - nothing invented, nothing silently dropped.
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createBattle, createCustomBattle, fieldedDef } from '../src/core/setup.js'
import { scenarioDef, scenarioOptions } from '../src/content/scenarios.js'
import { openingHeroesOf } from '../src/content/opening-party.js'
import OPENING from '../../progression/OPENING-PARTY.json' with { type: 'json' }
import { knockImmunity } from '../src/core/kdb.js'
import { BADGES, UNITS } from '../src/content/index.js'

const GEN = join(__dirname, '..', '..', 'content', 'gen')
const codexHeroes = (JSON.parse(readFileSync(join(GEN, 'heroes.json'), 'utf8')) as { heroes: { id: string; name: string; originBadges?: string[] }[] }).heroes.filter((h) => h.id.startsWith('hero.base.'))
const codexBadges = (JSON.parse(readFileSync(join(GEN, 'badges.json'), 'utf8')) as { badges: { id: string; name: string }[] }).badges
const idOfName = (name: string): string => {
  const rows = codexBadges.filter((b) => b.name === name)
  if (rows.length !== 1) throw new Error(`the Codex has ${rows.length} badge rows named '${name}'`)
  return rows[0]!.id
}

// The Codex's list as it stood at the landing (content/gen/heroes.json `originBadges`), by hero: the report's table.
const AT_LANDING: Record<string, string[]> = {
  'hero.base.warrior-iron': ['Stalwart', 'Dwarf'], 'hero.base.warrior-fearsome': ['Brave'], 'hero.base.warrior-barbarian': ['Huge', 'Dwarf', 'Climber'], 'hero.base.warrior-brawler': ['Unwavering', 'Dwarf', 'Brawler'],
  'hero.base.mage-fire': [], 'hero.base.mage-fireaura': ['Lithe'], 'hero.base.mage-thinking': ['Quick Learner'], 'hero.base.mage-sexy': ['Frail'],
  'hero.base.priest-armored': [], 'hero.base.priest-pauper': ['Faithful'], 'hero.base.priest-robes': ['Wise'], 'hero.base.priest-scantily': [],
  'hero.base.paladin-dark': ['Vengeful', 'UndeadSlayer'], 'hero.base.paladin-hunk': ['UndeadSlayer'], 'hero.base.paladin-shiney': ['Quick', 'UndeadSlayer'], 'hero.base.paladin-smug': ['Brave', 'UndeadSlayer'],
  'hero.base.ranger-aggressive': ['Vengeful'], 'hero.base.ranger-nature': ['Beautiful', 'Frail', 'Fey', 'Forester'], 'hero.base.ranger-ranger': ['Cultist', 'Elf', 'Mystic'], 'hero.base.ranger-scantily': ['Agile', 'Elf', 'Forester'],
  'hero.base.rogue-raven': ['Lithe'], 'hero.base.rogue-rose': ['Ignorant', 'Retaliating'], 'hero.base.rogue-skull': ['Vengeful'], 'hero.base.rogue-snake': ['Lucky'],
}

// Each of the 24 as the engine fielded it on 2026-10-04, before its origin badges were on its row (fieldedDef, its own kit).
const BEFORE: Record<string, Record<string, number>> = {
  'hero.base.mage-fire':{'maxHp':7,'maxStamina':5,'resist':0,'strength':2,'dodge':0,'movement':5,'crit':0,'magic':3,'luck':0},
  'hero.base.mage-fireaura':{'maxHp':6,'maxStamina':5,'resist':0,'strength':2,'dodge':0,'movement':5,'crit':0,'magic':2,'luck':3},
  'hero.base.mage-sexy':{'maxHp':6,'maxStamina':5,'resist':1,'strength':2,'dodge':0,'movement':4,'crit':0,'magic':2,'luck':0},
  'hero.base.mage-thinking':{'maxHp':6,'maxStamina':5,'resist':0,'strength':2,'dodge':0,'movement':5,'crit':0,'magic':2,'luck':0},
  'hero.base.paladin-dark':{'maxHp':9,'maxStamina':3,'resist':0,'strength':4,'dodge':0,'movement':3,'crit':-5,'magic':0,'luck':0},
  'hero.base.paladin-hunk':{'maxHp':11,'maxStamina':4,'resist':0,'strength':3,'dodge':0,'movement':4,'crit':0,'magic':0,'luck':0},
  'hero.base.paladin-shiney':{'maxHp':10,'maxStamina':5,'resist':0,'strength':4,'dodge':0,'movement':5,'crit':0,'magic':0,'luck':0},
  'hero.base.paladin-smug':{'maxHp':13,'maxStamina':7,'resist':0,'strength':4,'dodge':0,'movement':4,'crit':-3,'magic':0,'luck':0},
  'hero.base.priest-armored':{'maxHp':5,'maxStamina':5,'resist':0,'strength':2,'dodge':-5,'movement':6,'crit':0,'magic':0,'luck':0},
  'hero.base.priest-pauper':{'maxHp':7,'maxStamina':5,'resist':0,'strength':2,'dodge':0,'movement':5,'crit':0,'magic':0,'luck':3},
  'hero.base.priest-robes':{'maxHp':7,'maxStamina':5,'resist':0,'strength':2,'dodge':-5,'movement':5,'crit':0,'magic':-1,'luck':0},
  'hero.base.priest-scantily':{'maxHp':7,'maxStamina':3,'resist':0,'strength':3,'dodge':0,'movement':5,'crit':0,'magic':0,'luck':0},
  'hero.base.ranger-aggressive':{'maxHp':9,'maxStamina':5,'resist':0,'strength':2,'dodge':-10,'movement':4,'crit':0,'magic':0,'luck':0},
  'hero.base.ranger-nature':{'maxHp':4,'maxStamina':5,'resist':0,'strength':2,'dodge':-5,'movement':6,'crit':0,'magic':0,'luck':0},
  'hero.base.ranger-ranger':{'maxHp':6,'maxStamina':5,'resist':0,'strength':2,'dodge':5,'movement':5,'crit':0,'magic':0,'luck':0},
  'hero.base.ranger-scantily':{'maxHp':5,'maxStamina':5,'resist':0,'strength':2,'dodge':5,'movement':5,'crit':0,'magic':0,'luck':0},
  'hero.base.rogue-raven':{'maxHp':5,'maxStamina':5,'resist':0,'strength':6,'dodge':0,'movement':5,'crit':2,'magic':0,'luck':0},
  'hero.base.rogue-rose':{'maxHp':5,'maxStamina':5,'resist':0,'strength':4,'dodge':10,'movement':5,'crit':2,'magic':0,'luck':0},
  'hero.base.rogue-skull':{'maxHp':5,'maxStamina':5,'resist':0,'strength':4,'dodge':5,'movement':5,'crit':2,'magic':0,'luck':0},
  'hero.base.rogue-snake':{'maxHp':6,'maxStamina':5,'resist':0,'strength':4,'dodge':5,'movement':5,'crit':2,'magic':0,'luck':0},
  'hero.base.warrior-barbarian':{'maxHp':13,'maxStamina':5,'resist':0,'strength':4,'dodge':-10,'movement':4,'crit':0,'magic':0,'luck':0},
  'hero.base.warrior-brawler':{'maxHp':12,'maxStamina':4,'resist':0,'strength':4,'dodge':0,'movement':5,'crit':0,'magic':0,'luck':0},
  'hero.base.warrior-fearsome':{'maxHp':11,'maxStamina':5,'resist':0,'strength':5,'dodge':0,'movement':5,'crit':0,'magic':0,'luck':0},
  'hero.base.warrior-iron':{'maxHp':16,'maxStamina':3,'resist':0,'strength':4,'dodge':-5,'movement':4,'crit':0,'magic':0,'luck':0},
}

// What each origin badge carries today, and the lines of it that wait on a mechanism the engine lacks (the badge's own named
// lines; engine SWITCHES.md originBadgeWaitingLines). A line that starts acting leaves this table by its own item.
const CARRIES: Record<string, { mods?: Record<string, number>; flags?: string[]; waits?: string[] }> = {
  Stalwart: { mods: { maxStamina: 1, maxHp: 2 } },
  // Law 10, 2026-10-05 - content.dwarf-elf-fey-badges-act (DECISIONS.md 2026-10-05 'a prone unit only stands; … Dwarf, Elf and Fey
  // act; …': "6. They should act."): the three rows that were names with no payload carry the data's numbers now.
  // was: Dwarf: { waits: ['no payload'] },
  Dwarf: { mods: { movement: -1, maxHp: 2 } },
  Brave: { mods: { resist: 1 }, waits: ['immune to Weak'] },
  Huge: { mods: { strength: 2, maxHp: 2, dodge: -15 } },
  Climber: { waits: ['-1 Movement cost into Rocky', '+5 Accuracy while in Rocky'] },
  Unwavering: { waits: ['Immune to Weak', 'on taking damage: remove 1 Weak'] },
  Brawler: { waits: ['+2 damage on brawl-tagged attacks'] },
  Lithe: { mods: { maxHp: -2, dodge: 20 } },
  'Quick Learner': { waits: ['Gain 7 XP per combat'] },
  Frail: { mods: { maxHp: -2 } },
  Faithful: { waits: ['onsurvivecombat: gain 1 faith'] },
  // Restated 2026-10-06 (content.card-draw-badge-rules-cut; ruled 2026-10-06, DECISIONS.md '… the card-draw badge rules are cut
  // for now': "We may add a card system at some point, but you can cut all those for now."). Wise had no rule but the card
  // draw; its row stays, empty (SWITCHES.md cardBadgesEmptied), and the pack says so. The line was:
  //   Wise: { waits: ['+1 draw on turn 1 and on turn 3'] },
  Wise: { waits: ['no payload'] },
  Vengeful: { waits: ['`onTakingDamage`: +1 Stamina'] },
  UndeadSlayer: { waits: ['Damage +2 vs Undead'] },
  Quick: { mods: { movement: 1 }, waits: ['+10 Surge Chance', 'Deploy +2'] },
  Beautiful: { waits: ['ondeath: all heroes gain 20 surge and +1 health'] },
  // was: Fey: { waits: ['no payload'] },
  Fey: { mods: { surge: 10 } },
  Forester: { waits: ['-1 Movement cost into Forest', '+10 Dodge while in Forest'] },
  Cultist: { mods: { crit: 10 }, waits: ['onbattlestart: lose 1 faith'] },
  // was: Elf: { waits: ['no payload'] },
  Elf: { mods: { vision: 3, luck: 2 } },
  Mystic: { mods: { magic: 1 } },
  Agile: { mods: { dodge: 8 }, flags: ['cannotBeKnockedDown'], waits: ['Gains the Dodge and Roll movement power'] },
  Ignorant: { mods: { magic: -1, luck: 10 } },
  Retaliating: { waits: ['On taking damage: gain 40 Accuracy until the end of your next turn'] },
  Lucky: { mods: { luck: 1 }, waits: ['Deploy +1'] },
}

describe('content.hero-origin-badges: each base hero\'s row carries the origin badges the Codex names for it', () => {
  it('the 24 base heroes, walked against the Codex\'s list: the Hero badge, then the origin badges in the Codex\'s order - no more, no fewer', () => {
    expect(codexHeroes.length).toBe(24)
    expect(Object.keys(UNITS).filter((k) => k.startsWith('hero.base.')).sort()).toEqual(codexHeroes.map((h) => h.id).sort())
    for (const h of codexHeroes) expect(UNITS[h.id]!.badges, `${h.id} ${h.name}`).toEqual(['badge.hero', ...(h.originBadges ?? []).map(idOfName)])
  })
  it('the Codex\'s list is the one this landing read: 21 heroes with an origin badge, three with none (the Emberwright, the Battle Chaplain, the Rune-Marked Ascetic)', () => {
    expect(Object.fromEntries(codexHeroes.map((h) => [h.id, h.originBadges ?? []]))).toEqual(AT_LANDING)
    expect(codexHeroes.filter((h) => !(h.originBadges ?? []).length).map((h) => h.name).sort()).toEqual(['Battle Chaplain', 'Emberwright', 'Rune-Marked Ascetic'])
  })
  it('only the 24: no other hero row gained a badge by this (a fixed hero, an Alpha hero or a test hero carries what it carried)', () => {
    const origin = new Set(Object.values(AT_LANDING).flat().map(idOfName))
    // the Codex names origin badges for fixed heroes too (Frail, Child …); the ruling is the 24 base heroes'
    for (const [id, u] of Object.entries(UNITS)) if (u.side === 'hero' && !id.startsWith('hero.base.')) for (const b of u.badges ?? []) expect(b === 'badge.hero' || !origin.has(b) || id.startsWith('test'), `${id} carries ${b}`).toBe(true)
  })
  it('every origin badge is a Codex badge row the engine holds, and carries exactly what this landing found: its numbers, its flags, and each line that waits named', () => {
    expect(Object.keys(CARRIES).sort()).toEqual([...new Set(Object.values(AT_LANDING).flat())].sort())
    for (const [name, c] of Object.entries(CARRIES)) {
      const b = BADGES[idOfName(name)]!
      expect(b, name).toBeTruthy()
      expect(b.name, name).toBe(name)
      expect(b.statModifiers, name).toEqual(c.mods ?? {})
      expect(Object.keys(b.flags).filter((k) => (b.flags as Record<string, unknown>)[k]).sort(), name).toEqual([...(c.flags ?? [])].sort())
      expect(b.gaps ?? [], name).toEqual(c.waits ?? [])
      expect(b.grants, name).toEqual([])
    }
  })
  it('a badge acts from the row: each hero is fielded as it was the day before, plus exactly what its origin badges carry', () => {
    const changed: string[] = []
    for (const [id, names] of Object.entries(AT_LANDING)) {
      const now = fieldedDef(id) as unknown as Record<string, number>
      const sum: Record<string, number> = {}
      for (const n of names) for (const [k, v] of Object.entries(CARRIES[n]!.mods ?? {})) sum[k] = (sum[k] ?? 0) + v
      for (const [k, was] of Object.entries(BEFORE[id]!)) expect(now[k] ?? 0, `${id} ${k}`).toBe(was + (sum[k] ?? 0))
      if (Object.keys(sum).length) changed.push(id)
    }
    // Law 10, 2026-10-05 - content.dwarf-elf-fey-badges-act: Dwarf, Elf and Fey act, so the heroes whose only numbered badge is
    // one of the three (the Dwarven Brawler, the Mountain Berserker, the Ancient Elf, the Forest Fey among them) are fielded
    // with different numbers too: every hero any of whose badges carries a number, counted off the table above.
    // was: 13 of the 24 are fielded with different numbers; the other 11 carry a name whose lines all wait, or no origin badge
    // was: expect(changed.length).toBe(13)
    expect(changed.length).toBe(Object.values(AT_LANDING).filter((names) => names.some((n) => Object.keys(CARRIES[n]!.mods ?? {}).length > 0)).length)
    expect(changed.length).toBeGreaterThan(13)
    // the Iron Dwarf, said out: Stalwart's +2 Health and +1 Stamina
    const dwarf = fieldedDef('hero.base.warrior-iron')
    // was: expect([dwarf.maxHp, dwarf.maxStamina]).toEqual([BEFORE['hero.base.warrior-iron']!['maxHp']! + 2, BEFORE['hero.base.warrior-iron']!['maxStamina']! + 1])
    // … and now the Dwarf badge's +2 Health and -1 Movement as well
    expect([dwarf.maxHp, dwarf.maxStamina, dwarf.movement]).toEqual([BEFORE['hero.base.warrior-iron']!['maxHp']! + 4, BEFORE['hero.base.warrior-iron']!['maxStamina']! + 1, BEFORE['hero.base.warrior-iron']!['movement']! - 1])
  })
  it('in a real battle: the hero on the board wears its origin badges - one line each at fielding, saying what it put on and what waits - and the Forest Elf cannot be knocked down', () => {
    const ctx = createCustomBattle([{ type: 'hero.base.warrior-iron', hex: 85 }, { type: 'hero.base.ranger-scantily', hex: 87 }], [{ type: 'test-zombie', hex: 181 }])
    const [dwarf, elf] = ctx.state.units
    expect(dwarf!.badges).toEqual(['badge.hero', 'badge.stalwart', 'badge.dwarf'])
    // was: expect(dwarf!.maxHp).toBe(BEFORE['hero.base.warrior-iron']!['maxHp']! + 2) - Stalwart's 2; the Dwarf badge's 2 are on it too now
    expect(dwarf!.maxHp).toBe(BEFORE['hero.base.warrior-iron']!['maxHp']! + 4)
    expect(elf!.badges).toEqual(['badge.hero', 'badge.agile', 'badge.elf', 'badge.forester'])
    const lines = ctx.events.filter((e) => e.type === 'unit.badged' && e['actor'] === dwarf!.id)
    expect(lines.map((e) => e.causeId)).toEqual(['badge.hero', 'badge.stalwart', 'badge.dwarf'])
    expect(lines[1]!['mods']).toEqual({ maxStamina: 1, maxHp: 2 })
    // was: expect(lines[2]!['gaps']).toEqual(['no payload']) - the Dwarf badge's line says what it put on, and nothing waits
    expect([lines[2]!['mods'], lines[2]!['gaps'] ?? []]).toEqual([{ movement: -1, maxHp: 2 }, []])
    expect(knockImmunity(ctx, elf!)).toEqual({ back: [], down: ['badge.agile'] })   // Agile: cannot be knocked down, can still be knocked back
    expect(knockImmunity(ctx, dwarf!)).toEqual({ back: [], down: [] })
  })
})

// FOUND by this landing: the opening draft held a rolled point at the Crucible's floor (Health 1) reckoned against the ROW's
// own number. The Forest Fey's row says Health 6; she fields 2 (her Pilgrim's Habit, and Frail now on her row), so a rolled
// Health loss of 2 left her at 0 and the engine refused to field her ("mods drive a pool below its floor"). The point is held
// at its floor against the hero AS FIELDED - her row, her kit and her row's badges (SWITCHES.md originBadgeDraftFloor).
describe('content.hero-origin-badges: a drafted hero can always be fielded', () => {
  it('every opening battle fields on every replicate read (0 to 59): no drafted hero is driven below 1 Health', () => {
    for (const s of ['test.opening-orphanage', 'test.opening-lumberjack', 'test.opening-bridge', 'test.opening-cavern-trail', 'test.opening-gates', 'test.opening-cathedral']) {
      for (let r = 0; r < 60; r++) {
        const ctx = createBattle({ ...scenarioOptions(scenarioDef(s), r), replicate: r } as Parameters<typeof createBattle>[0])
        for (const u of ctx.state.units) expect(u.maxHp, `${s} replicate ${r} ${u.typeId}`).toBeGreaterThanOrEqual(1)
      }
    }
  })
  it('a rolled loss is held at the Crucible\'s floor against the hero as fielded: the Forest Fey, fielded at Health 2, loses 1 and stands at 1', () => {
    expect(fieldedDef('hero.base.ranger-nature').maxHp).toBe(2)
    const floor = (OPENING as unknown as { crucible: { statFloor: Record<string, number>; statStep: Record<string, number> } }).crucible
    expect([floor.statFloor['health'], floor.statStep['health']]).toEqual([1, 2])
    let seen = 0
    for (let r = 0; r < 200; r++) for (const h of openingHeroesOf(r, 6)) {
      if (h.id !== 'hero.base.ranger-nature') continue
      const lost = h.rolls.filter((x) => x.stat === 'health' && x.amount < 0)
      for (const x of lost) { expect(x.amount, `replicate ${r}`).toBe(-1); seen++ }
      const handed = (h.mods.stats ?? []).filter((m) => m.stat === 'maxHp').reduce((n, m) => n + m.add, 0)
      expect(2 + handed, `replicate ${r}`).toBeGreaterThanOrEqual(1)
    }
    expect(seen, 'a replicate of 0 to 199 drafts her with a Health loss').toBeGreaterThan(0)
  })
})
