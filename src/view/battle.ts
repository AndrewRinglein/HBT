// viewBattle — the read-model for screen.battle in the slice: the map and every
// unit, still. Ruling 2026-09-01: "show a map, all enemy units all player
// units. Then that's it." Combat is not played.
//
// The board and the positions come from the engine's OWN setup — createBattle
// through the seam, at t=0, and nothing runs. Terrain per hex is the engine's
// content, read through the door. So what the screen shows is exactly the
// fielding the engine would fight, which is the property that lets the engine
// be invoked later without the screen changing.

import { atlasFieldingOf, type AtlasBinding } from '../content/atlas.js'
import type { CampaignState } from '../core/campaign.js'
import { engagementOf } from '../core/mutate.js'
import { makeBattleState, battleOptionsOf } from '../core/seam.js'
import { createBattle, terrainIdOf, type Prop, type Event } from '../engine.js'

export type BattleUnitView = {
  side: 'hero' | 'enemy'
  index: number
  unitId: number
  typeId: string
  name: string
  /** The roster hero this row is, for hero rows. */
  heroId: string | null
  hex: number
  col: number
  row: number
  hp: number
  maxHp: number
  /** What the engine equipped on this unit at fielding, in order — from its unit.equipped lines (seam.loadout). */
  equipped: string[]
  /** The attacks those items grant, in order. */
  attacks: string[]
  /** v2.loadout: weapons and shields stowed in item slots — carried into battle, granting nothing until swapped in. */
  stowed: string[]
}

export type BattleView = {
  engagementId: string
  kind: string
  mapId: string
  mapName: string
  width: number
  height: number
  /** terrain.* id per hex, index = hexId. */
  terrain: string[]
  props: Prop[]
  floor?: boolean[]
  initialEvents: Event[]
  viewerSeed: {mapId:string;replicate:number;scenarioId:string}
  atlasScene?: AtlasBinding
  units: BattleUnitView[]
}

export function viewBattle(campaign: CampaignState): BattleView {
  const e = engagementOf(campaign)
  const spec = makeBattleState(campaign.roster, e)
  const ctx = createBattle(battleOptionsOf(spec))
  const authored = atlasFieldingOf(e.mapId)
  const units: BattleUnitView[] = []
  const seen: Record<'hero' | 'enemy', number> = { hero: 0, enemy: 0 }
  for (const ev of ctx.events) {
    if (ev.type === 'unit.equipped') {
      const u = units.find((x) => x.unitId === ev.actor)
      if (u) { u.equipped.push(ev['itemId'] as string); u.attacks.push(...(ev['grants'] as string[])) }
      continue
    }
    if (ev.type !== 'unit.enter') continue
    const side = ev['side'] as 'hero' | 'enemy'
    const index = seen[side]++
    const hex = ev['hex'] as number
    units.push({
      side, index, unitId: ev.actor!, typeId: ev['typeId'] as string, name: ev['name'] as string,
      heroId: side === 'hero' ? e.deployed[index] ?? null : null,
      hex, col: ctx.geo.colOf(hex), row: ctx.geo.rowOf(hex),
      hp: ev['hp'] as number, maxHp: ev['maxHp'] as number,
      equipped: [], attacks: [], stowed: side === 'hero' ? [...(spec.heroStowed?.[index] ?? [])] : [],
    })
  }
  units.sort((a, b) => (a.side === b.side ? a.index - b.index : a.side === 'hero' ? -1 : 1))
  return {
    engagementId: e.id, kind: e.kind, mapId: e.mapId, mapName: authored?.name ?? e.mapId,
    width: ctx.geo.board.width, height: ctx.geo.board.height,
    terrain: ctx.state.terrain.map(terrainIdOf),
    props: structuredClone(ctx.state.props),
    ...(ctx.state.floor ? {floor:[...ctx.state.floor]} : {}),
    initialEvents: structuredClone(ctx.events),
    viewerSeed: {mapId: ctx.events.find(e=>e.type==='map.loaded')!['mapId'] as string,replicate:spec.seed,scenarioId:spec.id},
    ...(authored ? {atlasScene:authored.atlasScene} : {}),
    units,
  }
}
