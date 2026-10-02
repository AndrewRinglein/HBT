// The conquest map view — kingdom.abbotown-map (PLAYABLE-OPENING-PLAN.md item 11; engine DECISIONS.md 2026-09-29 "the
// playable opening"; KINGDOM-V2-2026-09-07.md "Conquest maps": "the reclaimed section lights up, potentially with a green
// check, and a red arrow highlights the next section"). Draws a map row (src/content/conquest.ts) with its progress
// (src/core/conquest.ts) as a hand-drawn sketch on parchment: ink outlines, the section names, a green check on each
// taken section, a red arrow into the next. Only the next section — and only when it has a battle to play — carries
// data-act="field"; the host binds it. Returns markup; decides nothing.
import type { ConquestMap, Point } from '../content/conquest.js'
import type { SectionState } from '../core/conquest.js'

const esc = (x: unknown) => String(x).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
const r1 = (n: number) => Math.round(n * 10) / 10

/** a closed Catmull-Rom curve through the traced points: the sketch's pencil line, not a polygon's corners */
function smooth(pts: readonly Point[]): string {
  const n = pts.length, p = (i: number) => pts[(i + n) % n]!
  let d = `M${r1(p(0)[0])},${r1(p(0)[1])}`
  for (let i = 0; i < n; i++) {
    const [a, b, c, e] = [p(i - 1), p(i), p(i + 1), p(i + 2)]
    d += `C${r1(b[0] + (c[0] - a[0]) / 6)},${r1(b[1] + (c[1] - a[1]) / 6)} ${r1(c[0] - (e[0] - b[0]) / 6)},${r1(c[1] - (e[1] - b[1]) / 6)} ${r1(c[0])},${r1(c[1])}`
  }
  return d + 'Z'
}

/** the sketch's hollow arrow from → to: a shaft and an open head, drawn as one outline */
function arrow(from: Point, to: Point, width: number): string {
  const dx = to[0] - from[0], dy = to[1] - from[1], len = Math.hypot(dx, dy) || 1, ux = dx / len, uy = dy / len, nx = -uy, ny = ux
  const head = Math.min(len * 0.45, width * 2.4), w = width / 2, hw = width * 1.25
  const at = (along: number, side: number): string => `${r1(from[0] + ux * along + nx * side)},${r1(from[1] + uy * along + ny * side)}`
  return `M${at(0, w)}L${at(len - head, w)}L${at(len - head, hw)}L${at(len, 0)}L${at(len - head, -hw)}L${at(len - head, -w)}L${at(0, -w)}Z`
}

/** the green check, hand-drawn, beside a taken section's name */
function check(at: Point): string {
  const [x, y] = at
  return `<g class="check" aria-label="taken"><circle cx="${x}" cy="${y}" r="11"/><path d="M${x - 6},${y + 0.5}L${x - 1.5},${y + 5}L${x + 6.5},${y - 5.5}"/></g>`
}

function nameLines(name: string, at: Point): string {
  const words = name.split(' '), lines = name.length > 10 && words.length > 1 ? [words.slice(0, Math.ceil(words.length / 2)).join(' '), words.slice(Math.ceil(words.length / 2)).join(' ')] : [name]
  const top = at[1] - (lines.length - 1) * 8
  return `<text class="sectionName" x="${at[0]}" y="${top}">${lines.map((l, i) => `<tspan x="${at[0]}" y="${top + i * 16}">${esc(l)}${i < lines.length - 1 ? ' ' : ''}</tspan>`).join('')}</text>`
}

export interface ConquestView {
  readonly map: ConquestMap
  readonly progress: readonly { id: string; state: SectionState }[]
  /** the encounters a battle can be fielded for; a next section without one is pointed to but not clickable */
  readonly playable: readonly string[]
}

export function conquestMapHTML({ map, progress, playable }: ConquestView): string {
  const [fx, fy, fw, fh] = map.frame
  const state = (id: string) => progress.find((p) => p.id === id)?.state ?? 'locked'
  const taken = map.sections.filter((s) => state(s.encounterId) === 'taken').length
  const next = map.sections.find((s) => state(s.encounterId) === 'next')
  const ready = !!next && playable.includes(next.encounterId)
  const status = !next ? `All ${map.sections.length} sections are taken.`
    : `${taken} of ${map.sections.length} taken · next: ${esc(next.name)} — ${ready ? 'click it to fight.' : 'its battle is not ready yet.'}`
  const regions = map.sections.map((s) => {
    const st = state(s.encounterId), field = st === 'next' && ready
    return `<g class="section ${st}" data-section="${esc(s.encounterId)}" data-state="${st}"${field ? ` data-act="field" data-id="${esc(s.encounterId)}" role="button" tabindex="0" aria-label="Fight ${esc(s.name)}"` : ''}>` +
      `<path class="land" d="${smooth(s.outline)}"/>${nameLines(s.name, s.label)}` +
      (st === 'taken' ? check([s.label[0] + Math.min(46, 6 * s.name.length), s.label[1] - 16]) : '') +
      (st === 'next' ? `<path class="nextArrow" d="${arrow(s.arrow.from, s.arrow.to, 9)}"/>` : '') +
      `<title>${esc(s.name)} — ${st === 'taken' ? 'taken' : st === 'next' ? (ready ? 'next: click to fight' : 'next; its battle is not ready yet') : 'locked'}</title></g>`
  }).join('')
  // the route: every arrow but the next's, in faint ink — the way already walked and the way still ahead
  const route = map.sections.filter((s) => state(s.encounterId) !== 'next').map((s) => `<path class="route ${state(s.encounterId)}" d="${arrow(s.arrow.from, s.arrow.to, 6)}"/>`).join('')
  return `<div class="sheet"><h1>${esc(map.title)}</h1><p class="mapStatus" role="status">${status}</p>` +
    `<svg class="sketch" viewBox="${fx} ${fy} ${fw} ${fh}" role="img" aria-label="${esc(map.title)}">` +
    `<defs><filter id="pencil" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="7"/><feDisplacementMap in="SourceGraphic" scale="2.6"/></filter></defs>` +
    `<g filter="url(#pencil)">${regions}<g class="routes">${route}</g>` +
    `<text class="start" x="${map.start.at[0]}" y="${map.start.at[1]}">${esc(map.start.text)}</text></g></svg></div>`
}
