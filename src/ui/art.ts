// The kingdom art on the page — USE-THIS-ART.md, drawn from what
// tools/prep-art.py prepared and tools/build-slice.mjs inlined (__ART__).
// Geometry is the handoff's, verbatim; nothing here decides a rule.
//
// Three pictures: the world map with the realm's tiles and the buildings that
// stand on them (a building appears both on its Territory and in the town —
// conquering the Territory unlocks it, ART-NOTES.md 2026-09-01); the Sanctuary
// with band sprites keyed to a building's LEVEL, never its nodes; a building's
// interior behind its tree.

import type { CampaignState, Territory } from '../core/campaign.js'
import { TERRITORIES } from '../content/territories.js'

export type ArtIndex = {
  map: { w: number; h: number; originX: number; originY: number; nativeScale: number }
  hex: { tileW: number; tileH: number; topVertex: number; bottomVertex: number; sides: [number, number]; rowStep: number; scale: number }
  tiles: Record<string, { q: number; r: number; px: [number, number]; terrain: string; file: string }>
  overlays: Record<string, { file: string; w: number; h: number; anchorX: number; anchorY: number }>
  overlaySeat: number
  town: { w: number; h: number; lots: Record<string, { x: number; y: number; anchorX: number; baselineY: number; bands: { file: string; w: number; h: number }[] }> }
  interiors: Record<string, string>
  cards: Record<string, string>
  data: Record<string, string>
} | null

declare const __ART__: ArtIndex
export const ART: ArtIndex = typeof __ART__ === 'undefined' ? null : __ART__

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!))
export const slugOf = (buildingId: string) => buildingId.replace(/^building\./, '')
const tileIdOf = (q: number, r: number) => `t_${q < 0 ? 'm' : 'p'}${String(Math.abs(q)).padStart(2, '0')}_${r < 0 ? 'm' : 'p'}${String(Math.abs(r)).padStart(2, '0')}`

/** A building's band from its level: 0 (or a ruin) → ruined, then working … ascendant. */
export function bandOf(b: { level: number; damaged: boolean }): number {
  if (b.damaged || b.level <= 0) return 0
  return Math.min(b.level, 4)
}

/**
 * The world map, as an SVG that scales with its box: the painting, the
 * realm's tiles on it back-to-front by row, a hex outline saying held or not,
 * the buildings that stand there, and the name. `offered` tiles are clickable.
 */
export function worldMapSvg(c: CampaignState, offered: readonly string[], attacked: string | null): string {
  if (!ART) return ''
  const A = ART
  const H = A.hex
  const s = A.map.nativeScale
  const placed = Object.values(c.territories).map((t) => {
    const row = TERRITORIES.find((r) => r.id === t.id)
    const tile = row ? A.tiles[tileIdOf(row.hex.q, row.hex.r)] : undefined
    return tile ? { t, tile, cx: tile.px[0] * s - A.map.originX, cy: tile.px[1] * s - A.map.originY } : null
  }).filter((p): p is NonNullable<typeof p> => p !== null).sort((a, b) => a.tile.r - b.tile.r || a.tile.q - b.tile.q)
  if (!placed.length) return ''
  // the view: the tiles' bounding box, with room for a building's headroom and a name
  const pad = 40
  const x0 = Math.min(...placed.map((p) => p.cx)) - H.tileW / 2 - pad, x1 = Math.max(...placed.map((p) => p.cx)) + H.tileW / 2 + pad
  const y0 = Math.min(...placed.map((p) => p.cy)) - H.tileH / 2 - pad - H.topVertex / 2, y1 = Math.max(...placed.map((p) => p.cy)) + H.tileH / 2 + pad
  const hexCentreY = (H.topVertex + H.bottomVertex) / 2   // 508 at full scale
  const outline = (cx: number, cy: number) => {
    const l = cx - H.tileW / 2, r = cx + H.tileW / 2, top = cy - hexCentreY
    return [[cx, top + H.topVertex], [r, top + H.sides[0]], [r, top + H.sides[1]], [cx, top + H.bottomVertex], [l, top + H.sides[1]], [l, top + H.sides[0]]].map((p) => p.map((n) => n.toFixed(1)).join(',')).join(' ')
  }
  const tiles = placed.map(({ t, tile, cx, cy }) => {
    const left = cx - H.tileW / 2, top = cy - hexCentreY
    const state = attacked === t.id ? 'attacked' : t.owned ? 'held' : 'unclaimed'
    const canPick = offered.includes(t.id)
    const buildings = t.buildings.map((b) => {
      const o = A.overlays[slugOf(b.id)]
      if (!o) return ''
      // drawAt = (hexCentreX − anchor_x, hexCentreY + 42 − height) — USE-THIS-ART.md §3
      return `<image href="${A.data[o.file]}" x="${(cx - o.anchorX).toFixed(1)}" y="${(cy + A.overlaySeat - o.h).toFixed(1)}" width="${o.w}" height="${o.h}" class="${b.damaged ? 'ruin' : ''}"><title>${esc(b.id)}${b.damaged ? ' — ruin (no ruined-band art at map scale yet)' : ''}</title></image>`
    }).join('')
    return `<g class="tile ${state}${canPick ? ' pick' : ''}" ${canPick ? `data-act="choose" data-id="${esc(t.id)}"` : ''}>
      <image href="${A.data[tile.file]}" x="${left.toFixed(1)}" y="${top.toFixed(1)}" width="${H.tileW}" height="${H.tileH}"/>
      <polygon points="${outline(cx, cy)}"/>
      ${buildings}
      <text x="${cx.toFixed(1)}" y="${(cy + hexCentreY - H.topVertex - 14).toFixed(1)}" text-anchor="middle">${esc(t.name)}${t.kingdom ? ' ✦' : ''}</text>
    </g>`
  }).join('')
  return `<svg class="world" viewBox="${x0.toFixed(0)} ${y0.toFixed(0)} ${(x1 - x0).toFixed(0)} ${(y1 - y0).toFixed(0)}" preserveAspectRatio="xMidYMid meet">
    <image href="${A.data['map.jpg']}" x="0" y="0" width="${A.map.w}" height="${A.map.h}"/>
    ${tiles}
  </svg>`
}

/** The buildings the town shows: the Sanctuary's own, plus every building on a Territory you hold. */
export function townBuildings(c: CampaignState): { slug: string; band: number; where: Territory }[] {
  return Object.values(c.territories).sort((a, b) => a.id.localeCompare(b.id))
    .filter((t) => t.owned)
    .flatMap((t) => t.buildings.map((b) => ({ slug: slugOf(b.id), band: bandOf(b), where: t })))
}

/** The Sanctuary: the plate, and a band sprite on each lot a held building has. */
export function townSvg(c: CampaignState): string {
  if (!ART) return ''
  const A = ART
  const shown = townBuildings(c).filter((b) => A.town.lots[b.slug])
  // the Beacon is the recruit screen (src/core/market.ts) and has no building row yet: it stands at working, always
  const sanctuary = Object.values(c.territories).find((t) => t.kingdom)
  if (sanctuary && A.town.lots['beacon'] && !shown.some((b) => b.slug === 'beacon')) shown.push({ slug: 'beacon', band: 1, where: sanctuary })
  // back-to-front by the lot's ground point, as the pipeline composites
  const sprites = shown.map((b) => ({ b, lot: A.town.lots[b.slug]! })).sort((x, y) => x.lot.y - y.lot.y).map(({ b, lot }) => {
    const band = lot.bands[b.band]!
    return `<image href="${A.data[band.file]}" x="${lot.x - lot.anchorX}" y="${lot.y - lot.baselineY}" width="${band.w}" height="${band.h}"><title>${esc(b.slug)} — ${['ruined', 'working', 'established', 'masterwork', 'ascendant'][b.band]}${b.where.kingdom ? '' : ', unlocked by ' + esc(b.where.name)}</title></image>`
  }).join('')
  return `<svg class="town" viewBox="0 0 ${A.town.w} ${A.town.h}" preserveAspectRatio="xMidYMid meet">
    <image href="${A.data['town-plate.jpg']}" x="0" y="0" width="${A.town.w}" height="${A.town.h}"/>
    ${sprites}
  </svg>`
}

export const interiorOf = (buildingId: string): string | null => ART?.data[ART.interiors[slugOf(buildingId)] ?? ''] ?? null
export const cardOf = (buildingId: string): string | null => ART?.data[ART.cards[slugOf(buildingId)] ?? ''] ?? null
