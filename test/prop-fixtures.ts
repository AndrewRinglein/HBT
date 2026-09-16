import type { Ctx } from '../src/core/types.js'

/** Test-only geometry mutation, independent of production blockage/cache helpers. */
export function setHigh(ctx: Ctx, hex: number, blocked = true): void {
  ctx.state.props = ctx.state.props.map(p => {if(p.footprint.kind!=='hex')throw Error('expected hex fixture');return { ...p, footprint: { kind: 'hex' as const, hexes: p.footprint.hexes.filter(h => h !== hex) } }}).filter(p => p.footprint.hexes.length)
  if (blocked) ctx.state.props.push({ id: `prop.test.${hex}`, height: 'high', material: 3, footprint: { kind: 'hex', hexes: [hex] } })
}
export const fixtureBlockers = (ctx: Ctx): number[] => [...new Set(ctx.state.props.flatMap(p => {if(p.footprint.kind!=='hex')throw Error('expected hex fixture');return p.footprint.hexes}))]
