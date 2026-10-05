// movement.inventory (engine DECISIONS.md 2026-10-01 'the movements', Andrew: "1. Identify all of the movements.") — one
// generated list of every movement the content needs: each weapon class, shield, item use (drinking a potion among them),
// power and movement power a player unit can hold, the action it is, the motion it plays, and whether each exists today
// (engine command, action bar, approved or selected motion). Identifying only. The list is generated/movements.{json,md},
// written by tools/movements.mts and never by hand: this refuses a stale copy.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { movementInventory, movementsJson, movementsMarkdown, type Inventory } from '../tools/movements.mjs'
import { ACTIONS, ITEMS } from '../src/content/index.js'

const disk = (name: string) => readFileSync(fileURLToPath(new URL(`../generated/${name}`, import.meta.url)), 'utf8')
const ACTION_ID = /^(?:power|attack|burst)\.[a-z0-9.-]+$/

describe('movement.inventory — every movement the content needs, in one generated list', () => {
  let inv: Inventory
  it('generated/movements.json and .md are exactly the tool\'s output (npx tsx tools/movements.mts)', async () => {
    inv = await movementInventory()
    expect(disk('movements.json')).toBe(movementsJson(inv))
    expect(disk('movements.md')).toBe(movementsMarkdown(inv))
  }, 60000)

  it('every row names its content id, its action, its motion and what exists today', () => {
    expect(inv.rows.length).toBeGreaterThan(300)
    for (const r of inv.rows) {
      const where = `${r.group} ${r.content.join(',')} ${r.action}`
      expect(r.content.length, where).toBeGreaterThan(0)
      expect(['weapon', 'shield', 'item-use', 'power', 'unit', 'movement', 'swap'], where).toContain(r.group)
      expect(['yes', 'inert', 'no'], where).toContain(r.engine)
      expect('motion' in r && 'motionStatus' in r && 'bar' in r, where).toBe(true)
      expect(['played', 'partial', 'missing'], where).toContain(r.motionStatus)
      // an engine command is on the bar; an action the engine lacks is on neither
      if (r.engine === 'no') expect(r.bar, where).toBeNull()
      else expect(r.bar, where).not.toBeNull()
      if (r.action !== null && r.group !== 'swap') expect(r.engine === 'no' || !!ACTIONS[r.action], where).toBe(true)
      // a motion word is only ever one the viewer plays; no row invents one
      if (r.motion !== null) expect(inv.motionWords, where).toContain(r.motion)
    }
  })

  it('every weapon class, shield and item-use power in the pack appears in it', () => {
    const base = Object.values(ITEMS).filter((i) => !(i as { base?: string }).base && !/test/.test(i.id))
    const has = (group: string, id: string) => inv.rows.some((r) => r.group === group && r.content.includes(id))
    for (const w of base.filter((i) => i.itemClass === 'weapon')) expect(has('weapon', w.id), w.id).toBe(true)
    for (const s of base.filter((i) => i.itemClass === 'shield')) expect(has('shield', s.id), s.id).toBe(true)
    const uses = Object.values(ITEMS).filter((i) => !['weapon', 'shield'].includes(i.itemClass) && !/test/.test(i.id))
    for (const i of uses) for (const a of [...i.grants, ...i.abilities].filter((x) => ACTION_ID.test(x)))
      expect(inv.rows.some((r) => r.group === 'item-use' && r.action === a), `${i.id} ${a}`).toBe(true)
    // drinking a potion is among them, with the selected "Drink or consume" performance named and not yet bound
    const potion = inv.rows.find((r) => r.action === 'power.healing-potion.use')!
    expect([potion.group, potion.engine, potion.motion, potion.motionStatus, potion.selected?.clip]).toEqual(['item-use', 'yes', null, 'missing', 'Consume'])
  })

  it('carries movement.swap-and-shields\' findings as missing: the swap\'s draw or stow; the shield powers\' raise-the-shield, ruled and filed', () => {
    const swap = inv.rows.filter((r) => r.group === 'swap')
    expect(swap.map((r) => [r.engine, r.bar, r.motion, r.motionStatus, r.ruling])).toEqual([['yes', 'swap', null, 'missing', null]])
    const group = inv.rows.filter((r) => r.group === 'shield')
    // a shield's attack (the Knight Shield's Shield Slam, back with the Ledger) is in the group and is an attack: it plays the attack's motion, not the raise
    const slams = group.filter((r) => r.bar === 'attack'), shields = group.filter((r) => r.bar !== 'attack')
    expect(new Set(slams.map((r) => r.action))).toEqual(new Set(Object.values(ITEMS).filter((i) => i.itemClass === 'shield').flatMap((i) => i.grants)))
    for (const r of slams) expect([r.engine, r.motion], r.action!).toEqual(['yes', 'attack'])
    // Law 10, 2026-10-04 — content.shields-reauthored (2026-10-04; DECISIONS.md 2026-09-28 'counterattack, special free attacks, the opening six, shields, custom weapons' and the Armory Ledger approved that day): the six ids typed here were the three shields' powers; the Ledger replaced them and
    // added the Knight Shield and the four Iron shields. The rule is what the list was an instance of: the shield group is every power
    // a shield's row grants (was: new Set(['power.kite-shield.shield-wall', 'power.kite-shield.raise-guard', 'power.round-shield.turn-aside',
    // 'power.round-shield.brace', 'power.tower-shield.cover', 'power.tower-shield.stand-tall'])).
    const granted = Object.values(ITEMS).filter((i) => i.itemClass === 'shield').flatMap((i) => i.abilities)
    expect(granted.length).toBeGreaterThanOrEqual(6)
    expect(new Set(shields.map((r) => r.action))).toEqual(new Set(granted))
    // Law 10, 2026-10-02 (viewer.shield-guard-motion): the ruled raise-the-shield motion is built — the motion word `guard`, the
    // Oathblade body's shield_blockleft, bound on every body a shield-holding hero wears (viewer SWITCHES guardWord, guardHolders) —
    // so a shield power is no longer missing: it plays `guard` where a shield is held, partial across the hero bodies. Was
    // ['yes', 'power', null, 'missing'] while the build was filed and not done.
    for (const r of shields) {
      expect([r.engine, r.bar, r.motion, r.motionStatus], r.action!).toEqual(['yes', 'power', 'guard', 'partial'])
      expect(r.ruling, r.action!).toMatch(/a shield power plays a raise-the-shield motion/)
      expect(r.ruling, r.action!).toMatch(/viewer\.shield-guard-motion/)
      for (const body of ['Lion of the Host', 'Dawnblade', 'Court Champion', 'Battle Chaplain', 'Oathblade'])
        expect(r.bodies[body], `${r.action} on ${body}`).toMatch(/shield_blockleft$/)
      expect(Object.entries(r.bodies).filter(([, c]) => c !== null).every(([, c]) => /shield_blockleft$/.test(c!)), r.action!).toBe(true)
    }
  })

  it('a melee attack plays the strike on every hero body; a bow\'s shot only where a body has one; a flight walks', () => {
    const slash = inv.rows.find((r) => r.action === 'attack.longsword.slash')!
    expect([slash.group, slash.content, slash.motion, slash.motionStatus]).toEqual(['weapon', ['item.longsword'], 'attack', 'played'])
    const bolt = inv.rows.find((r) => r.action === 'attack.crossbow.bolt')!
    expect([bolt.motion, bolt.motionStatus]).toEqual(['ranged', 'partial'])
    const flight = inv.rows.find((r) => r.action === 'power.flight')!
    expect([flight.group, flight.motion, flight.motionStatus]).toEqual(['movement', 'flight', 'missing'])
    expect(Object.values(flight.bodies).every((b) => /^stand-in: move/.test(b ?? ''))).toBe(true)
  })

  it('the count of what is missing heads the list, and is the rows\' own count', () => {
    const md = movementsMarkdown(inv)
    const head = md.split('\n').find((l) => l.startsWith('**Missing:'))!
    const c = inv.counts
    expect(c.rows).toBe(inv.rows.length)
    expect(c.noEngine).toBe(inv.rows.filter((r) => r.engine === 'no').length)
    expect(c.noMotion).toBe(inv.rows.filter((r) => r.motionStatus === 'missing').length)
    expect(c.missing).toBe(inv.rows.filter((r) => r.engine === 'no' || r.motionStatus === 'missing').length)
    expect(head).toContain(`${c.missing} of ${c.rows} movements`)
    expect(md.indexOf(head)).toBeLessThan(md.indexOf('|'))
  })
})
