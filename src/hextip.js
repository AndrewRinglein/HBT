/* ── THE HEX TOOLTIP (viewer.hex-tooltip, 2026-10-04) ──────────────────────────────────────────────────────────────────
   Engine DECISIONS.md 2026-10-03 'size and shadows are the default; the bleeding-out card; switching heroes asks first;
   movement costs on the grid; a tooltip on every hex' (Andrew: "when I'm just pointing around the map, any hex I point at
   should have a little hover tooltip below it that says what the tile is and any special things about the tile, like: It
   costs 2 to move there. It will inflict burning on you. It's a water tile.") and 'switching from a hero that has not acted
   is free; the hex tooltip describes the ground only' ("Yeah, just ground only.").

   Pointing at a hex — the pointer's own pick (board.js pickAt, offered through V.onPoint) — shows a small tooltip just below
   it: the ground's name, and one line for each special thing about it. Every word of content and every number is the
   engine's: the name is the dump's (static.json terrainNames, the engine's id for the ground), the cost and whether the
   hex may be entered are the engine's field (prepareBattleField: moveCost and passable, hex by hex), a prop of the map that
   stands on it is named by its own id's word, the
   statuses are what the ground applies (terrainApplies) and what a painted layer on it applies (layerStatus over the
   fold's layers), each by the engine's status name. Nothing is added up and nothing decided here; the sentences round the
   facts are the viewer's, as the log's are. Never who stands on the hex. It takes no pointer and offers the host nothing. */
import { boardAffine, heightOf, viewportOf } from './board.js'
import { screenOf } from './camera3d.js'

const esc = x => String(x).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
/** the px the tooltip keeps from the hex and from the battle area's edge */
const GAP = 4, INSET = 8

/* a prop's word: the last segment of its id that is a word ('prop.obstacle.59' -> Obstacle), as the fold's floats say it */
const propWord = id => { const w = String(id ?? '').split('.').filter(s => !/^\d+$/.test(s)).pop() ?? ''; return w.charAt(0).toUpperCase() + w.slice(1).replace(/-/g, ' ') }
const propsOn = (props, hex) => (props || []).filter(p => p.footprint && p.footprint.kind === 'hex' && p.footprint.hexes.includes(hex))
/** the ground of one hex as the engine states it: its terrain id, its entry cost, whether it may be entered, the props that
    stand on it and the painted layer on it now (the fold's).
    passable is the engine's field for that hex (prepareBattleField: the ground, the floor, the props of map.loaded) — true,
    false, or NULL where the hex was closed at the start and a prop on it has since been damaged or destroyed (prop.damaged,
    prop.destroyed): the log does not say whether the hex has opened, so the tooltip says nothing of it (viewer SWITCHES
    hexTipAfterPropFalls) */
export function groundAt(V, hex) {
  const { F, LAYERS } = V.data
  const layer = V.S.layers && V.S.layers[hex] ? (LAYERS[V.S.layers[hex]] || null) : null
  const was = propsOn(F.props, hex), now = propsOn(V.S.props === null ? F.props : V.S.props, hex)
  const same = was.length === now.length && was.every(p => now.some(q => q.id === p.id && q.height === p.height && (q.steps || 0) === (p.steps || 0)))
  return { terrainId: F.terrainIds[hex], moveCost: F.moveCost[hex], passable: F.passable[hex] !== false ? true : same ? false : null, layer, props: now.map(p => propWord(p.id)) }
}
/** what the tooltip says of a ground: {name, lines} — PURE. D is the viewer's read-only content (V.data). */
export function hexTipOf(D, ground) {
  const names = D.TERRAIN_NAMES || {}, SN = D.SN || {}
  const name = names[ground.terrainId] || String(ground.terrainId).replace(/^terrain\./, '')
  const lines = []
  /* what stands on the ground as part of the map (a prop: cover, an obstacle), by its own word */
  for (const w of new Set(ground.props || [])) if (w) lines.push(w)
  /* a tile nobody may enter quotes no cost; a tile that costs one says nothing of its cost */
  if (ground.passable === false) lines.push('Cannot be entered')
  else if (ground.passable === true && ground.moveCost !== 1) lines.push(`Costs ${ground.moveCost} movement to enter`)
  const statuses = [...((D.TERRAIN_APPLIES || {})[ground.terrainId] || [])]
  const painted = ground.layer ? (D.LAYER_STATUS || {})[ground.layer] : null
  if (painted && !statuses.includes(painted)) statuses.push(painted)
  for (const s of statuses) lines.push('Inflicts ' + (SN[s] || String(s).replace(/^(test\.)?status\./, '')))
  return { name, lines }
}

/** the hex pointed at (null: none) — drawn at once */
export function pointHexTip(V, hex) {
  V.view.pointHex = hex == null || !V.data.POS[hex] ? null : hex
  drawHexTip(V)
}
/** draw, move or hide the tooltip for the hex pointed at; called on a point, on every redraw and on every camera pose */
export function drawHexTip(V) {
  const wrap = V.dom.stage.parentNode, hex = V.view.pointHex
  let tip = V.dom.hexTip
  if (hex == null || !wrap || !V.camera3d) { if (tip) tip.style.display = 'none'; return }
  if (!tip) { tip = V.dom.hexTip = document.createElement('div'); tip.id = 'hexTip'; tip.setAttribute('role', 'tooltip'); wrap.appendChild(tip) }
  const T = hexTipOf(V.data, groundAt(V, hex)), key = hex + '|' + T.name + '|' + T.lines.join('|')
  if (tip.dataset.key !== key) {
    tip.dataset.key = key; tip.dataset.hex = String(hex)
    tip.innerHTML = `<b class="hexTipName">${esc(T.name)}</b>` + T.lines.map(l => `<span class="hexTipLine">${esc(l)}</span>`).join('')
  }
  tip.style.display = ''
  /* just below the hex as the camera shows it: under the lowest point of its outline, centred on its middle; kept inside
     the battle area — above the hex where there is no room below (viewer SWITCHES hexTipInside) */
  const p = V.data.POS[hex], L = V.data.LAYOUT, z = heightOf(V, hex), A = boardAffine(V), cam = V.camera3d
  const mid = screenOf(A, cam, p.px, p.py, z)
  const ys = [[0, -L.H / 2], [L.W / 2, -L.H / 4], [L.W / 2, L.H / 4], [0, L.H / 2], [-L.W / 2, L.H / 4], [-L.W / 2, -L.H / 4]].map(([dx, dy]) => screenOf(A, cam, p.px + dx, p.py + dy, z).y)
  const { W, H } = viewportOf(V), w = tip.offsetWidth || 0, h = tip.offsetHeight || 0
  const x = Math.min(Math.max(mid.x, INSET + w / 2), Math.max(INSET + w / 2, W - INSET - w / 2))
  let y = Math.max(...ys) + GAP
  if (y + h > H - INSET) y = Math.min(...ys) - GAP - h
  tip.style.left = x.toFixed(1) + 'px'; tip.style.top = y.toFixed(1) + 'px'
}
