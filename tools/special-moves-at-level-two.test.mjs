// rule.special-moves-unlock-at-level-two (engine item, 2026-10-06). Ruled 2026-10-06 (engine/DECISIONS.md 'a hero's special
// moves unlock at level 2, ruled: all of them, every hero, enemies and civilians unchanged, named on the level-up screen'):
// "the special moves that the starting heroes get should be unlocked instead at level 2, so they don't clutter up level 1
// tutorial." The item's words for the page: "A level-1 hero's bar shows the basic Move and no Leap, Side Roll, Sidestep,
// Back Flip, Focus or Devotion".
//
// The bar lists a unit's movements from its row in the engine's dump. The row now says the level each movement is granted
// at (`moveLevels`, the engine's field, copied verbatim), and the bar lists a movement only when the unit has reached it -
// its level is the engine's own line (unit.grown), 1 where the battle fielded it with none. The component's own modules on
// the dump as it stands (generated/static.json) and the library's own recordings; it needs no page.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const STATIC = JSON.parse(readFileSync('generated/static.json', 'utf8'))
const D = { UD: STATIC.units, ACT: STATIC.actions, KINDS: STATIC.actionKinds, STATUS_ROWS: STATIC.statusRows }
const SPECIAL = { 'class.warrior': 'power.leap', 'class.ranger': 'power.side-roll', 'class.rogue': 'power.side-roll', 'class.mage': 'power.focus', 'class.priest': 'power.devotion', 'class.paladin': 'power.sidestep' }
const BASE = Object.keys(STATIC.units).filter(id => id.startsWith('hero.base.')).sort()
const classOf = id => STATIC.units[id].tags.find(t => t.startsWith('class.'))
const unit = (typeId, level) => ({ typeId, kit: { grants: [], abilities: [], badges: [] }, st: {}, ...(level ? { grown: { table: classOf(typeId), level, specialtyId: null } } : {}) })

test('the dump carries the engine\'s row: every base hero\'s special move is granted at level 2, and no enemy or civilian row names a level', () => {
  assert.equal(BASE.length, 24)
  for (const id of BASE) assert.deepEqual(STATIC.units[id].moveLevels, { [SPECIAL[classOf(id)]]: 2 }, id)
  for (const [id, row] of Object.entries(STATIC.units)) if (id.startsWith('unit.') || id.startsWith('hero.fixed.')) assert.equal(row.moveLevels, undefined, id)
})

test('the bar of a level-1 hero lists the basic Move and no special move; at level 2 it lists its class\'s as well', async () => {
  const { kitOf } = await import('../src/actions.js')
  for (const id of BASE) {
    const special = SPECIAL[classOf(id)]
    assert.deepEqual(kitOf(unit(id), D).moves.map(m => m.id), ['power.move'], id + ' fielded with no level')
    assert.deepEqual(kitOf(unit(id, 1), D).moves.map(m => m.id), ['power.move'], id + ' at level 1')
    assert.deepEqual(kitOf(unit(id, 2), D).moves.map(m => m.id), ['power.move', special], id + ' at level 2')
    assert.deepEqual(kitOf(unit(id, 7), D).moves.map(m => m.id), ['power.move', special], id + ' at level 7')
  }
})

test('an enemy and a civilian keep every movement their rows list, whatever their level; so does the engine\'s test party', async () => {
  const { kitOf } = await import('../src/actions.js')
  assert.ok(kitOf(unit('unit.vampire'), D).moves.some(m => m.id === 'power.flight'))
  for (const id of Object.keys(STATIC.units).filter(x => x.startsWith('hero.fixed.'))) assert.deepEqual(kitOf(unit(id), D).moves.map(m => m.id), STATIC.units[id].moves.map(m => m.id), id)
  assert.deepEqual(kitOf(unit('test-oathblade'), D).moves.map(m => m.id), ['power.move', 'power.leap'])
})

test('in the opening\'s recordings: the first hero is level 1 in the first battle and has no Side Roll on her bar; from the second she is level 2 and has it', async () => {
  const { kitOf } = await import('../src/actions.js')
  const { createState, fold } = await import('../src/fold.js')
  const barOf = (file) => {
    const battle = JSON.parse(readFileSync('battles/' + file, 'utf8')), S = createState(), ctx = { UD: STATIC.units, SN: STATIC.statuses }
    for (const e of battle.events) { fold(S, e, ctx); if (e.type === 'battle.begin') break }
    const hero = Object.values(S.U).find(u => u.typeId === 'hero.base.ranger-scantily')
    assert.ok(hero, file + ' fields the first hero')
    return { level: hero.grown ? hero.grown.level : 1, moves: kitOf(hero, D).moves.map(m => m.id) }
  }
  assert.deepEqual(barOf('test.opening-orphanage.json'), { level: 1, moves: ['power.move'] })
  assert.deepEqual(barOf('test.opening-lumberjack.json'), { level: 2, moves: ['power.move', 'power.side-roll'] })
})
