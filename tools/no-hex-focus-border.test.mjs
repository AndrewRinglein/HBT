// viewer.no-hex-focus-border (engine backlog; engine DECISIONS.md 2026-10-03 'one draft after every battle; the yellow focus
// border goes; ...'). Andrew: "There's a highlighting of a hex that happens where there's a big yellow border around the hex
// at some point during unit activation. I don't quite know what that's for visually." / "That yellow focus border doesn't look
// good, so just remove it." It was src/styles.css `.targetHex:focus-visible{background:rgba(255,215,100,.35)!important;
// box-shadow:inset 0 0 0 5px #ffd764;outline:none}`. The component's half, asked of the page (VIEWER_PAGE, else
// BATTLE-VIEWER.html): the page's stylesheet paints nothing on a focused target hex — no box-shadow, no background, and no
// browser ring in its place — and carries the removed yellow nowhere on a hex; the hex buttons stay buttons, so the keyboard
// still plays (a button's Enter is its click, and the click is still offered to the host). What a focused hex looks like in a
// browser is kingdom tools/no-hex-focus-border.verify.mjs (real Chrome, computed style).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { makeWindow } from './fakedom.mjs'
const battle1 = JSON.parse(readFileSync('battles/test.opening-orphanage.json', 'utf8'))
const EV = battle1.events
const html = readFileSync(process.env.VIEWER_PAGE || 'BATTLE-VIEWER.html', 'utf8')
const css = [...html.matchAll(/<style>([\s\S]*?)<\/style>/g)].map(m => m[1]).join('\n').replace(/\/\*[\s\S]*?\*\//g, '')
/** every rule of the stylesheet whose selector names the class and a focus state: [selector, declarations] */
const focusRules = cls => [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(m => [m[1].trim(), m[2].trim()])
  .filter(([sel]) => sel.split(',').some(s => s.includes(cls) && /:focus/.test(s)))

function boot(opts = {}) {
  const m = html.match(/<script>([\s\S]*)<\/script>\s*$/), w = makeWindow()
  w.document.body.innerHTML = html.slice(0, m.index).replace(/<style>[\s\S]*?<\/style>/, '').replace(/<!--[\s\S]*?-->/g, '').replace(/<(meta|title|link)[^>]*>(<\/title>)?/g, '')
  const names = ['window','document','requestAnimationFrame','setTimeout','clearTimeout','setInterval','clearInterval','addEventListener','alert','Date','performance','getComputedStyle','localStorage','self','globalThis']
  new Function(...names, m[1])(...names.map(n => ['window','self','globalThis'].includes(n) ? w : w[n]))
  const B = w.__battleView, L = B.lib; B.harness.dispose()
  const mapId = EV.find(e => e.type === 'map.loaded').mapId
  const data = { field: L.fields[mapId], fieldMapId: mapId, initialEvents: EV, units: L.static.units, statuses: L.static.statuses, absorbingStatuses: L.static.absorbingStatuses,
    actions: L.static.actions, badges: L.static.badges, layers: L.static.layers, actionKinds: L.static.actionKinds, statusRows: L.static.statusRows, artmap: L.art.artmap, assets: L.art.assets, glyphs: L.glyphs, meta: { seed: battle1.seed } }
  const el = w.document.createElement('div'); w.document.body.appendChild(el)
  const v = B.mount(el, data, { autoplay: false, ...opts })
  v.push(EV); v.seek(EV.findIndex(e => e.type === 'activation.begin' && e.phase === 'hero') + 1)
  return { w, v, V: v._V }
}
const fire = (node, type) => { for (const f of node.listeners[type] || []) f({ detail: 0, button: 0, stopPropagation() {}, preventDefault() {} }) }

test('the stylesheet paints nothing on a focused target hex: no border, no tint, and no browser ring in its place', () => {
  const rules = focusRules('.targetHex')
  assert.ok(rules.length > 0, 'the focused target hex is still styled (the browser\'s own ring is turned off)')
  for (const [sel, decl] of rules) {
    assert.doesNotMatch(decl, /box-shadow/, `${sel} draws a border inside the hex: ${decl}`)
    assert.doesNotMatch(decl, /background/, `${sel} tints the hex: ${decl}`)
    assert.doesNotMatch(decl, /border/, `${sel} borders the hex: ${decl}`)
  }
  assert.ok(rules.some(([, decl]) => /outline:\s*none/.test(decl)), 'outline: none — the browser\'s ring does not replace the removed border')
})

test('the removed yellow is on no hex rule at all', () => {
  const hexRules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].filter(m => /\.targetHex|\.playHex/.test(m[1]))
  for (const m of hexRules) {
    assert.doesNotMatch(m[2], /#ffd764/i, `${m[1].trim()} carries the yellow border's colour`)
    assert.doesNotMatch(m[2].replace(/\s/g, ''), /255,215,100/, `${m[1].trim()} carries the yellow tint`)
  }
})

test('the focused play hex keeps no border either: whatever marks it, it is not yellow and not a box-shadow', () => {
  for (const [sel, decl] of focusRules('.playHex')) {
    assert.doesNotMatch(decl, /box-shadow|border/, `${sel}: ${decl}`)
    assert.ok(/outline:\s*none/.test(decl), `${sel} turns the browser's ring off`)
  }
})

test('the hexes stay buttons, so the keyboard still plays: a target hex\'s click is offered to the targeting host, a play hex\'s to the play host', () => {
  const picked = [], seen = []
  const { v, V } = boot({ onHexClick: h => { picked.push(h); return true }, onPlay: e => { seen.push(e); return true } })
  const hex = +Object.keys(V.data.POS)[40]
  v.setTargeting({ legalHexes: [hex], centre: null, hexes: [], shielded: [] })
  const t = V.dom.stage.querySelectorAll('.targetHex')
  assert.equal(t.length, 1); assert.equal(t[0].tag, 'button'); assert.equal(t[0].getAttribute('type'), 'button'); assert.equal(t[0].getAttribute('aria-label'), 'Select hex ' + hex)
  fire(t[0], 'click')                                   /* Enter or Space on a focused button is its click, detail 0 */
  assert.deepEqual(picked, [hex], 'the keyboard\'s click chooses the target hex')
  v.setTargeting(null)
  v.setPlay({ actor: V.S.activeId, slot: null, reach: [hex], zoc: [], path: [], provokes: [], ghost: null, threat: null, targets: [], aim: null, note: null })
  const p = V.dom.stage.querySelectorAll('.playHex').find(n => +n.dataset.hex === hex)
  assert.ok(p && p.tag === 'button' && p.getAttribute('type') === 'button', 'a play hex is a button')
  fire(p, 'click')
  assert.deepEqual(seen.at(-1), { kind: 'hex', hex }, 'the keyboard\'s click on a hex is the host\'s order')
  v.dispose()
})
