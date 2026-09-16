import {passableHexes} from '../core/props.js'
import type {State} from '../core/types.js'
// The text renderer. Reads the EVENT LOG ONLY — never the state.
//
// This is deliberate: if the log cannot describe the battle, the future graphical
// renderer cannot either, and finding that out now costs days instead of a rewrite.

import { geometryOf } from '../core/hex.js'
import { decodeMap, mapDef } from '../content/maps.js'
import type { Event, Prop } from '../core/types.js'

type UnitView = {
  id: number
  name: string
  side: 'hero' | 'enemy'
  typeId: string
  hex: number
  hp: number
  stamina: number
  life: 'standing' | 'downed' | 'dead'
}

/** Rebuild board state at a point in the log, purely by folding events. */
export function mapIdOf(events: Event[]): string {
  for (const e of events) if (e.type === 'map.loaded') return e['mapId'] as string
  return 'map.open'
}

export function foldToTurn(events: Event[], upToSeq: number): Map<number, UnitView> {
  const units = new Map<number, UnitView>()
  for (const e of events) {
    if (e.seq > upToSeq) break
    switch (e.type) {
      case 'unit.enter':
        units.set(e.actor!, {
          id: e.actor!, name: e['name'] as string, side: e['side'] as 'hero' | 'enemy',
          typeId: e['typeId'] as string, hex: e['hex'] as number,
          hp: e['hp'] as number, stamina: 0, life: 'standing',
        })
        break
      case 'moved': units.get(e.actor!)!.hex = e['to'] as number; break
      // capability.knockback (2026-08-27) moves the TARGET without a `moved`
      // event; the fold missed it until the Alpha Team's Halberd pushed a
      // zombie in a standard battle (content.alpha-flip, 2026-09-02).
      case 'knocked': units.get(e.target!)!.hex = e['to'] as number; break
      case 'damage.applied': units.get(e.target!)!.hp = e['hpAfter'] as number; break
      // heal.applied joined the event vocabulary with status.regeneration (2026-08-20)
      case 'heal.applied': units.get(e.target!)!.hp = e['hpAfter'] as number; break
      case 'stamina.spent':
      case 'stamina.regen': units.get(e.actor!)!.stamina = e['stamina'] as number; break
      case 'activation.begin': units.get(e.actor!)!.stamina = e['stamina'] as number; break
      case 'life.downed': units.get(e.target!)!.life = 'downed'; break
      case 'life.dead': units.get(e.target!)!.life = 'dead'; break
    }
  }
  return units
}

const GLYPH: Record<string, string> = { warrior: 'W', ranger: 'R', mage: 'M', zombie: 'z' }

/** L1 — the board, odd-r offset, indented rows. */
export function renderBoard(units: Map<number, UnitView>, mapId = 'map.open', events: Event[] = []): string {
  const fact = events.find(e => e.type === 'map.loaded')
  const decoded = fact?.['terrain'] ? null : decodeMap(mapDef(mapId))
  const terr = fact?.['terrain'] as number[] | undefined ?? decoded!.terrain
  const props = fact?.['props'] as Prop[] | undefined ?? decoded!.props

  const geo = geometryOf(fact ? { width: fact['width'] as number, height: fact['height'] as number } : decoded!.board)
  const floor=fact?.['floor'] as boolean[]|undefined ?? decoded?.floor
  const passable=passableHexes({state:{board:geo.board,terrain:terr,props,...(floor?{floor}:{})} as State})
  const { width: WIDTH, height: HEIGHT } = geo.board
  const grid: string[][] = Array.from({ length: HEIGHT }, (_, r) =>
    Array.from({ length: WIDTH }, (_, c) => (!passable(r * WIDTH + c) ? ' # ' : terr[r * WIDTH + c] === 1 ? ' ^ ' : ' . ')))
  for (const u of units.values()) {
    if (u.life === 'dead') continue
    const g = GLYPH[u.typeId] ?? '?'
    const mark = u.life === 'downed' ? `(${g})` : ` ${g}${u.id} `.slice(0, 3)
    grid[geo.rowOf(u.hex)]![geo.colOf(u.hex)] = mark.padEnd(3).slice(0, 3)
  }
  const lines: string[] = []
  lines.push('    ' + Array.from({ length: WIDTH }, (_, c) => String(c).padStart(3)).join(''))
  for (let r = 0; r < HEIGHT; r++) {
    lines.push(String(r).padStart(3) + ' ' + (r & 1 ? ' ' : '') + grid[r]!.join(''))
  }
  return lines.join('\n')
}

export function renderRoster(units: Map<number, UnitView>): string {
  return [...units.values()]
    .map((u) => {
      const state = u.life === 'standing' ? `${u.hp}hp` : u.life === 'downed' ? 'DOWN' : 'dead'
      const sta = u.side === 'hero' && u.life === 'standing' ? ` s${u.stamina}` : ''
      return `${u.name}:${state}${sta}`
    })
    .join('  ')
}

/** L3 — one line per meaningful event, with the damage waterfall spelled out. */
export function renderLog(events: Event[], names: Map<number, string>): string[] {
  const out: string[] = []
  let lastHit: Event | null = null
  let lastPower: Event | null = null

  for (const e of events) {
    const who = (id: number | null) => (id === null ? '?' : names.get(id) ?? `#${id}`)
    switch (e.type) {
      case 'turn.begin':
        out.push('', `── TURN ${e['turn']} ${'─'.repeat(40)}`)
        break
      case 'phase.begin':
        out.push(`  ${String(e['phase']).toUpperCase()} PHASE`)
        break
      case 'move.begin':
        out.push(`    ${who(e.actor)} moves ${e['hexes']} hex${e['hexes'] === 1 ? '' : 'es'}`)
        break
      case 'move.refused':
        out.push(`    ${who(e.actor)} cannot move (${e['reason']})`)
        break
      case 'attack.miss':
        out.push(`    ${who(e.actor)} -> ${who(e.target)}  MISS (rolled ${e['roll']} vs ${e['hitChance']})`)
        break
      case 'attack.hit':
        lastHit = e
        break
      case 'power.used':
        lastPower = e
        break
      case 'heal.applied':
        if ((e['amount'] as number) > 0) out.push(`    ${who(e.target)} heals ${e['amount']} (${e.causeId})   ${e['hpBefore']}->${e['hpAfter']}`)
        break
      case 'damage.applied': {
        if (lastPower) {
          const pl = (lastPower['ledger'] as { station: string; delta: number }[]).map(r => `${r.delta>=0?'+':''}${r.delta} ${r.station.toLowerCase()}`).join(' ')
          const ov = (e['overkill'] as number) > 0 ? ` (+${e['overkill']} overkill)` : ''
          out.push(`    ${who(e.actor)} casts ${lastPower['name']} on ${who(e.target)} at range ${lastPower['distance']}` +
            `  [${pl}] = ${(e['amount'] as number) + (e['overkill'] as number)}${ov}   ${who(e.target)} ${e['hpBefore']}->${e['hpAfter']}`)
          lastPower = null
          break
        }
        const led = (lastHit?.['ledger'] as { station: string; delta: number }[] | undefined) ?? []
        const waterfall = led.map((r) => `${r.delta >= 0 ? '+' : ''}${r.delta} ${r.station.toLowerCase()}`).join(' ')
        const crit = lastHit?.['crit'] ? ' CRIT' : ''
        const over = (e['overkill'] as number) > 0 ? ` (+${e['overkill']} overkill)` : ''
        out.push(
          `    ${who(e.actor)} -> ${who(e.target)}  HIT${crit} (${lastHit?.['roll']} vs ${lastHit?.['hitChance']})` +
            `  [${waterfall}] = ${(e['amount'] as number) + (e['overkill'] as number)}${over}` +
            `   ${who(e.target)} ${e['hpBefore']}->${e['hpAfter']}`,
        )
        lastHit = null
        break
      }
      case 'cooldown.set':
        out.push(`      ${who(e.actor)} — ${String(e['abilityId']).replace('power.','')} ready again on turn ${e['readyOnTurn']}`)
        break
      case 'ai.tookHighGround':
        out.push(`    ${who(e.actor)} takes the high ground`)
        break
      case 'activation.idle':
        out.push(`    ${who(e.actor)} holds (${e['reason']})`)
        break
      case 'life.downed': out.push(`    *** ${who(e.target)} GOES DOWN (bleed-out 3)`); break
      case 'life.dead':
        out.push(`    *** ${who(e.target)} ${e['reason'] === 'bledOut' ? 'BLEEDS OUT' : 'DIES'}`)
        break
      case 'bleedout.tick': out.push(`    ${who(e.target)} bleeding: ${e['bleedOut']} left`); break
      case 'battle.end': out.push('', `>>> ${String(e['outcome']).toUpperCase()} on turn ${e['turn']}`); break
    }
  }
  return out
}

/** The seq just after every unit has entered — the board as deployed. */
export function setupSeq(events: Event[]): number {
  let s = 0
  for (const e of events) if (e.type === 'unit.enter') s = e.seq
  return s
}

export function nameMap(events: Event[]): Map<number, string> {
  const m = new Map<number, string>()
  for (const e of events) if (e.type === 'unit.enter') m.set(e.actor!, e['name'] as string)
  return m
}
