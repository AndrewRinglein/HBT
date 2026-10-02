// viewer.weapons-in-hand (engine backlog; DECISIONS.md 2026-10-01 'the camera redesigned on the caravan preview; ... what is
// queued after it'). Andrew: "The characters are not holding weapons. The whole idea of having 3D weapons is so they're holding
// weapons." Expect: "In the sandbox every hero whose kit names a weapon with a 3D model holds it in hand through idle, walk and
// attack; a weapon without a model is listed, not faked." The engine's side: every held item (a weapon or a shield) of every
// base hero's kit is, in the character pack, either a model in that hero's hand or listed as having none — so a new weapon in
// a kit shows up here, not as an empty hand. The viewer's half (../viewer/tools/weapons-in-hand.test.mjs) stands each body
// up from the approved files and follows the weapon through the motions. Imports no page code.
import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { UNITS, ITEMS } from '../../engine/src/content/index.js'

type Prop = { path: string, sha256: string, hand: string, item: string, model: string }
type Look = { id: string, props: Prop[], unheld?: string[] }
const pack = (): Record<string, { typeId: string, looks: Look[] }> => JSON.parse(execFileSync(process.execPath, ['../viewer/tools/character-models.mjs', '--json'], { encoding: 'utf8', maxBuffer: 1 << 24 }))
const HELD = new Set(['weapon', 'shield'])

describe('the weapons of the kit, in hand', () => {
  const models = pack()
  const heroes = Object.keys(UNITS).filter((t) => t.startsWith('hero.base.'))
  it('every held item of every base hero is a model in its hand or listed as having none', () => {
    expect(heroes.length).toBeGreaterThan(20)
    for (const typeId of heroes) {
      const held = ((UNITS as Record<string, any>)[typeId].defaultItems ?? []).filter((i: string) => HELD.has((ITEMS as Record<string, any>)[i]?.itemClass))
      for (const look of models[typeId]!.looks) {
        const shown = new Set(look.props.map((p) => p.item)), listed = new Set(look.unheld ?? [])
        for (const item of held) expect(shown.has(item) !== listed.has(item), `${typeId}: ${item} is held or listed, not both`).toBe(true)
        for (const item of [...shown, ...listed]) expect(held, `${typeId}: ${item} is in its kit`).toContain(item)
      }
    }
  })
  it('a sword-and-shield paladin holds both, a greatsword is held, the priest\'s book is listed', () => {
    const look = (t: string) => models[t]!.looks[0]!
    expect(look('hero.base.paladin-shiney').props.map((p) => [p.item, p.hand])).toEqual([['item.longsword', 'R'], ['item.kite-shield', 'L']])
    expect(look('hero.base.paladin-dark').props.map((p) => [p.item, p.hand])).toEqual([['item.greatsword', 'R']])
    expect(look('hero.base.rogue-skull').props.map((p) => [p.item, p.hand])).toEqual([['item.daggers', 'R'], ['item.daggers', 'L']])
    expect(look('hero.base.priest-pauper').props).toEqual([])
    expect(look('hero.base.priest-pauper').unheld).toEqual(['item.holy-texts'])
    expect(look('hero.base.warrior-brawler').props).toEqual([])
  })
  it('the viewer page: each weapon rides its hand through idle, walk and attack', () => {
    const out = execFileSync(process.execPath, ['--test', '--test-reporter=tap', 'tools/weapons-in-hand.test.mjs'], { cwd: '../viewer', encoding: 'utf8', maxBuffer: 1 << 24 })
    expect(out).toMatch(/# pass 2/); expect(out).toMatch(/# fail 0/)
  }, 170000)
})
