// viewBattle — the read-model for screen.battle in the slice: the map and every
// unit, still. Ruling 2026-09-01: "show a map, all enemy units all player
// units. Then that's it." Combat is not played.
//
// The board and the positions come from the engine's OWN setup — createBattle
// through the seam, at t=0, and nothing runs. Terrain per hex is the engine's
// content, read through the door. So what the screen shows is exactly the
// fielding the engine would fight, which is the property that lets the engine
// be invoked later without the screen changing.

import type { CampaignState } from '../core/campaign.js'
import { engagementOf } from '../core/mutate.js'
import { makeBattleState, battleOptionsOf } from '../core/seam.js'
import { createBattle, WIDTH, HEIGHT, colOf, rowOf, terrainIdOf } from '../engine.js'

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
}

export type BattleView = {
  engagementId: string
  kind: string
  mapId: string
  width: number
  height: number
  /** terrain.* id per hex, index = hexId. */
  terrain: string[]
  units: BattleUnitView[]
}

export function viewBattle(campaign: CampaignState): BattleView {
  const e = engagementOf(campaign)
  const spec = makeBattleState(campaign.roster, e)
  const ctx = createBattle(battleOptionsOf(spec))
  const units: BattleUnitView[] = []
  const seen: Record<'hero' | 'enemy', number> = { hero: 0, enemy: 0 }
  for (const ev of ctx.events) {
    if (ev.type !== 'unit.enter') continue
    const side = ev['side'] as 'hero' | 'enemy'
    const index = seen[side]++
    const hex = ev['hex'] as number
    units.push({
      side, index, unitId: ev.actor!, typeId: ev['typeId'] as string, name: ev['name'] as string,
      heroId: side === 'hero' ? e.deployed[index] ?? null : null,
      hex, col: colOf(hex), row: rowOf(hex),
      hp: ev['hp'] as number, maxHp: ev['maxHp'] as number,
    })
  }
  units.sort((a, b) => (a.side === b.side ? a.index - b.index : a.side === 'hero' ? -1 : 1))
  return {
    engagementId: e.id, kind: e.kind, mapId: e.mapId,
    width: WIDTH, height: HEIGHT,
    terrain: ctx.state.terrain.map(terrainIdOf),
    units,
  }
}
