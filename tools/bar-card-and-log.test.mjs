// viewer.bar-card-and-log (engine backlog; engine DECISIONS.md 2026-10-03 'the hero card sits small, left of the action bar; the log
// collapses behind a button out of the way'). Andrew: "This small hero card should be smaller, and it should be to the left of the
// move. We need to move the move, the powers, and the attacks a little bit more to the right, make them more condensed, and put that
// hero card to the left. Also, collapse and put an expandable log button somewhere out of the way, not on the screen." The
// component's half (no layout engine here — the sizes are read off the page's own stylesheet; the built sandbox's half, in a real
// browser at 1920 x 1080, is ../kingdom/tools/bar-card-and-log.verify.mjs): the card is in the bar's row, before the bar, no longer
// over the board; it is smaller than 171 x 256 and no taller than the bar; the bar and the stamina strip above it start right of
// the card; the log is collapsed at mount, its button sits at the top bar's right end (viewer SWITCHES barLogPlace) and opens and
// closes it, and the open log stands over the right-hand panel, never the board. Runs against the page (VIEWER_PAGE, else
// BATTLE-VIEWER.html).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { makeWindow } from './fakedom.mjs'
const battle1 = JSON.parse(readFileSync('battles/test.opening-orphanage.json', 'utf8'))
const PAGE = process.env.VIEWER_PAGE || 'BATTLE-VIEWER.html'

function boot({ host = true } = {}) {
  const html = readFileSync(PAGE, 'utf8'), m = html.match(/<script>([\s\S]*)<\/script>\s*$/), w = makeWindow()
  w.document.body.innerHTML = html.slice(0, m.index).replace(/<style>[\s\S]*?<\/style>/, '').replace(/<!--[\s\S]*?-->/g, '').replace(/<(meta|title|link)[^>]*>(<\/title>)?/g, '')
  const names = ['window','document','requestAnimationFrame','setTimeout','clearTimeout','setInterval','clearInterval','addEventListener','alert','Date','performance','getComputedStyle','localStorage','self','globalThis']
  new Function(...names, m[1])(...names.map(n => ['window','self','globalThis'].includes(n) ? w : w[n]))
  const B = w.__battleView, L = B.lib; B.harness.dispose()
  const mapId = battle1.events.find(e => e.type === 'map.loaded').mapId
  const data = { field: L.fields[mapId], fieldMapId: mapId, initialEvents: battle1.events, units: L.static.units, statuses: L.static.statuses, absorbingStatuses: L.static.absorbingStatuses,
    actions: L.static.actions, badges: L.static.badges, layers: L.static.layers, actionKinds: L.static.actionKinds, statusRows: L.static.statusRows, artmap: L.art.artmap, assets: L.art.assets, glyphs: L.glyphs, meta: { seed: battle1.seed } }
  const el = w.document.createElement('div'); w.document.body.appendChild(el)
  const v = B.mount(el, data, { autoplay: false, ...(host ? { onPlay: () => true } : {}) })
  v.push(battle1.events)
  v.seek(battle1.events.findIndex(e => e.type === 'activation.begin') + 1)
  return { w, v, V: v._V, html }
}
const fire = (node, type, extra = {}) => { for (const f of node.listeners[type] || []) f({ detail: 1, button: 0, stopPropagation() {}, preventDefault() {}, ...extra }) }
const $ = (V, id) => V.dom.root.querySelector('#' + id)
const shown = n => n.style.display !== 'none'
const within = (n, anc) => { for (let p = n; p; p = p.parentNode) if (p === anc) return true; return false }
const css = html => html.match(/<style>([\s\S]*?)<\/style>/)[1]
/** a px property of a selector's own rule in the page's stylesheet (the rule whose selector is exactly this one) */
function px(sheet, sel, prop) {
  const re = new RegExp('(?:^|[}\\s])' + sel.replace(/[#.]/g, c => '\\' + c) + '\\{([^}]*)\\}', 'g'); let m, v = null
  while ((m = re.exec(sheet))) { const p = new RegExp('(?:^|;)\\s*' + prop + ':\\s*(\\d+(?:\\.\\d+)?)(?:px)?\\s*(?:;|$)').exec(m[1]); if (p) v = +p[1] }
  assert.ok(v != null, `${sel} sets ${prop} in px`); return v
}

test('the card sits in the action bar\'s row, left of the Move column — no longer over the board', () => {
  for (const host of [true, false]) {
    const { v, V } = boot({ host }), P = $(V, 'unitPortrait'), bar = V.dom.actionbar, row = P.parentNode
    assert.equal(within(P, V.dom.stage.parentNode), false, 'the card is not on the board (#boardwrap)')
    assert.ok(within(bar, row), 'the card and the action bar share one row')
    assert.equal(row.id, 'barrow', 'the bar\'s row')
    assert.ok(row.children.indexOf(P) < row.children.indexOf(bar), 'the card first, then the bar: left of the Move column')
    assert.equal(within(row, $(V, 'left')), true, 'the row is the screen\'s bottom, under the board')
    assert.ok(V.dom.root.querySelector('#left').children.indexOf(V.dom.stambar) < V.dom.root.querySelector('#left').children.indexOf(row), 'under the stamina strip')
    assert.notEqual(P.style.display, 'none', 'shown'); assert.ok(P.querySelector('img').getAttribute('src'), 'with the acting unit\'s card')
    v.dispose()
  }
})

test('the card is smaller than before and no taller than the bar; the columns and the stamina strip start right of it', () => {
  const { v, html } = boot(), sheet = css(html)
  const cw = px(sheet, '#unitPortrait', 'width'), ch = px(sheet, '#unitPortrait', 'height'), bh = px(sheet, '#actionbar', 'height')
  assert.ok(cw < 171 && ch < 256, `smaller than the 171 x 256 card of 2026-10-01: ${cw} x ${ch}`)
  assert.ok(ch <= bh, `no taller than the bar: ${ch} vs ${bh}`)
  const top = px(sheet, '#unitPortrait', 'top'), left = px(sheet, '#unitPortrait', 'left')
  assert.ok(top >= 0 && top + ch <= bh, `inside the bar's height: ${top}..${top + ch} of ${bh}`)
  const padBar = px(sheet, '#actionbar', 'padding-left'), padStam = px(sheet, '#stambar', 'padding-left')
  assert.ok(padBar >= left + cw, `the Move column starts right of the card: ${padBar} vs ${left + cw}`)
  assert.equal(padStam, padBar, 'the stamina strip keeps the Move column\'s left edge')
  v.dispose()
})

test('the log is collapsed at mount; its button at the top bar\'s right end opens and closes it; open, it stands over the panel, not the board', () => {
  const { v, V, html } = boot(), log = $(V, 'playLog'), btn = $(V, 'playLogBtn')
  assert.equal(shown(log), false, 'no log panel on load')
  assert.equal(btn.getAttribute('aria-pressed'), 'false'); assert.equal(btn.classList.contains('on'), false)
  assert.ok(within(btn, $(V, 'topbar')), 'the button is in the top bar, out of the way'); assert.equal(within(btn, V.dom.stage.parentNode), false, 'not on the board')
  assert.equal(within(log, $(V, 'left')), false, 'the log never stands over the board (#left)'); assert.equal(log.parentNode, V.dom.root, 'it opens over the right-hand panel')
  assert.ok(log.children.length > 0, 'collapsed, it still keeps the battle\'s lines')
  fire(btn, 'click'); assert.ok(shown(log), 'the button opens it'); assert.equal(btn.getAttribute('aria-pressed'), 'true')
  fire(btn, 'click'); assert.equal(shown(log), false, 'and closes it'); assert.equal(btn.getAttribute('aria-pressed'), 'false')
  const sheet = css(html)
  assert.ok(px(sheet, '#playLog', 'right') === 0 && px(sheet, '#playLog', 'width') <= px(sheet, '#panel', 'width'), 'the open log lies within the panel\'s column')
  assert.match(sheet, /#playLogBtn\{[^}]*margin-left:auto/, 'at the top bar\'s right end')
  v.dispose()
})
