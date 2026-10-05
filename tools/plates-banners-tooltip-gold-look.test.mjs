// viewer.plates-banners-tooltip-gold-look (engine backlog; engine DECISIONS.md 2026-10-05 'gifts: the word; each first-hero choice
// rolls its own; the plates, banners, tooltip and pop-up take the gold look'). Told that viewer.notices-gold-low-no-backdrop left
// the Deathbed and injury plates, the phase and wave banners, the hex tooltip and the affliction pop-up as they were, and asked
// whether any should take the gold no-backdrop look too, Andrew: "One, yes."
// Asked of the page (VIEWER_PAGE, else BATTLE-VIEWER.html) - its stylesheet, and its DOM as the Orphanage's own log raises each:
//   the look     - each of the six (a phase banner, a wave banner, a Deathbed plate, an injury plate, the hex tooltip, the
//                  affliction pop-up) wears the notices' ONE lettering (.hbtNotice, written once) and no rule of its own draws
//                  anything behind its words or gives them another colour;
//   kept         - each keeps its own place and timing; the Deathbed plate and the affliction pop-up keep the dimmed screen
//                  that holds the game, the pop-up its two cards and its Continue button; the gear panel is unchanged.
// How they measure and look in a real browser is kingdom tools/plates-banners-tooltip-gold-look.verify.mjs.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { makeWindow } from './fakedom.mjs'
const battle1 = JSON.parse(readFileSync('battles/test.opening-orphanage.json', 'utf8'))
const html = readFileSync(process.env.VIEWER_PAGE || 'BATTLE-VIEWER.html', 'utf8')
const css = html.match(/<style>([\s\S]*?)<\/style>/)[1].replace(/url\("data:[^"]*"\)/g, 'url()')
const cavern = JSON.parse(readFileSync('battles/test.opening-cavern-trail.json', 'utf8'))
const rulesOf = sel => { const out = []; for (const m of css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{([^{}]*)\}/g)) if (m[1].split(',').map(s => s.trim()).includes(sel)) out.push(m[2]); return out.join(';') }
const BACKDROP = /(^|;)\s*(background(-color|-image)?|border(-(top|bottom|left|right)(-color)?|-color)?|box-shadow|outline)\s*:\s*(?!none\b|0\b|transparent\b)[^;]+/
const COLOUR = /(^|;)\s*color\s*:/, OWN_SHADOW = /(^|;)\s*text-shadow\s*:/

function boot(battle = battle1) {
  const EV = battle.events
  const m = html.match(/<script>([\s\S]*)<\/script>\s*$/), w = makeWindow()
  w.document.body.innerHTML = html.slice(0, m.index).replace(/<style>[\s\S]*?<\/style>/, '').replace(/<!--[\s\S]*?-->/g, '').replace(/<(meta|title|link)[^>]*>(<\/title>)?/g, '')
  const names = ['window','document','requestAnimationFrame','setTimeout','clearTimeout','setInterval','clearInterval','addEventListener','alert','Date','performance','getComputedStyle','localStorage','self','globalThis']
  new Function(...names, m[1])(...names.map(n => ['window','self','globalThis'].includes(n) ? w : w[n]))
  const B = w.__battleView, L = B.lib; B.harness.dispose()
  const mapId = EV.find(e => e.type === 'map.loaded').mapId
  const data = { field: L.fields[mapId], fieldMapId: mapId, initialEvents: EV, units: L.static.units, statuses: L.static.statuses, absorbingStatuses: L.static.absorbingStatuses,
    actions: L.static.actions, badges: L.static.badges, layers: L.static.layers, actionKinds: L.static.actionKinds, statusRows: L.static.statusRows, itemClasses: L.static.itemClasses,
    items: L.static.items, hands: L.static.hands, tagCarriers: L.static.tagCarriers, terrainNames: L.static.terrainNames, terrainApplies: L.static.terrainApplies, artmap: L.art.artmap, assets: L.art.assets, glyphs: L.glyphs, meta: { seed: battle.seed } }
  const host = w.document.createElement('div'); w.document.body.appendChild(host)
  const v = B.mount(host, data, { autoplay: false, onPlay: () => true }); v.push(EV)
  return { w, v, V: v._V, EV }
}
const classes = n => String(n.className || '').split(/\s+/)
/** play the log's line at index i (seek to it, step it) and hand back the page */
const at = (P, pred) => { const i = P.EV.findIndex(pred); assert.ok(i >= 0, 'the log holds the line'); P.v.seek(i); P.v.step(); return i }

test('the look is the notices\' one rule, and none of the six has a rule that draws behind its words or colours them', () => {
  assert.equal((css.match(/\/\* NOTICE-LOOK \*\//g) || []).length, 1, 'the notice\'s look is written once'); assert.match(rulesOf('.hbtNotice'), /color:#ffd45e/)
  const six = { 'a banner': ['.banner', '.banner b', '.banner span', '.banner.wave b', '.banner.night b', '.banner.band b', '.banner.fall b', '.banner.won b', '.banner.lost b', '.banner.phase b'],
    'the Deathbed plate': ['.dbPlate', '.dbPlate span', '.dbHead', '.dbSub', '.dbBold', '.dbName', '.dbRoll', '.dbRoll b', '.dbHead.gold', '.dbBold.gold', '.dbHead.red', '.dbBold.red', '.dbPlate.stood', '.dbPlate.fell', '.dbPlate.exhausted'],
    'an injury plate': ['.injPlate', '.injPlate b'], 'the hex tooltip': ['#hexTip', '#hexTip .hexTipName', '#hexTip .hexTipLine'],
    'the affliction pop-up': ['#afflBox', '#afflHead', '#afflTitle', '.afflCap', '.afflH', '.afflStat', '.afflSub', '.afflNone', '.afflArrow', '#afflText li', '#afflText p'] }
  for (const [what, sels] of Object.entries(six)) for (const sel of sels) { const r = rulesOf(sel)
    assert.doesNotMatch(r, BACKDROP, `${what}: ${sel} draws something behind the words: ${r.match(BACKDROP)?.[0]}`)
    assert.doesNotMatch(r, COLOUR, `${what}: ${sel} gives its words a colour of its own`); assert.doesNotMatch(r, OWN_SHADOW, `${what}: ${sel} puts its own shadow in place of the outline`) }
  /* a picture keeps its frame; the dimmed screen that holds the game is kept behind the whole board, not behind the words */
  assert.match(rulesOf('.afflArt'), /border:\s*1px solid/, 'the pop-up\'s two cards keep their frames'); assert.match(rulesOf('.dbVeil'), /background:\s*rgba/); assert.match(rulesOf('#afflPop'), /background:\s*rgba/)
  /* the gear panel was not asked about: its box as it was */
  assert.match(rulesOf('#playGearBox'), /background:\s*#15120d/); assert.match(rulesOf('#playGearBox'), /border:\s*1px solid var\(--brass\)/)
})

test('a phase banner and a wave banner: the look, at the top of the board as before, for as long as before', () => {
  const P = boot(), wrap = P.V.dom.stage.parentNode
  at(P, e => e.type === 'phase.begin' && e.phase === 'hero' && e.turn > 1)
  let b = wrap.querySelector('.banner'); assert.ok(b, 'the Hero Phase banner'); assert.ok(classes(b).includes('phase') && classes(b).includes('hbtNotice'), 'wears the look: ' + b.className); assert.equal(b.querySelector('b').textContent, 'Hero Phase')
  at(P, e => e.type === 'encounter.wave')
  b = wrap.querySelector('.banner'); assert.ok(b && classes(b).includes('wave') && classes(b).includes('hbtNotice'), 'the wave banner wears it'); assert.equal(b.querySelector('b').textContent, 'A wave arrives')
  assert.equal(wrap.querySelectorAll('.banner').length, 1, 'one at a time, as before'); assert.equal(b.parentNode, wrap)
  const r = rulesOf('.banner'); assert.match(r, /position:\s*absolute/); assert.match(r, /left:\s*50%/); assert.match(r, /top:\s*18px/); assert.match(r, /transform:\s*translate\(-50%,0\)/); assert.match(r, /pointer-events:\s*none/)
  assert.match(rulesOf('.banner b'), /font-size:\s*22px/); assert.match(rulesOf('.banner span'), /font-size:\s*11\.5px/)
  /* its time: gone after 1650 ms of the page's clock, there before */
  P.w._flush(1500); assert.ok(wrap.querySelector('.banner'), 'still up at 1.5 s'); P.w._flush(300); assert.equal(wrap.querySelector('.banner'), null, 'gone by 1.8 s')
  P.v.dispose()
})

test('a Deathbed plate and an injury plate: the look, in their own places, the plate through both of its stages', () => {
  const P = boot(), wrap = P.V.dom.stage.parentNode
  at(P, e => e.type === 'deathbed.stood' || e.type === 'deathbed.fell')
  const m = wrap.querySelector('.dbModal'); assert.ok(m, 'the Deathbed modal'); assert.ok(m.querySelector('.dbVeil'), 'over the dimmed screen that holds the game')
  let plate = m.querySelector('.dbPlate'); assert.ok(plate && classes(plate).includes('hbtNotice'), 'the plate wears the look: ' + plate.className); assert.match(plate.textContent, /UNIT DOWNED/)
  P.w._flush(1400); plate = wrap.querySelector('.dbPlate')
  assert.ok(plate && classes(plate).includes('hbtNotice'), 'and still at its second stage: ' + (plate && plate.className)); assert.match(plate.textContent, /DEATHBED FIGHTING/)
  assert.match(rulesOf('.dbModal'), /inset:\s*0/); assert.match(rulesOf('.dbModal'), /align-items:\s*center/); assert.match(rulesOf('.dbBold'), /font-size:\s*40px/)
  P.w._flush(3000); assert.equal(wrap.querySelector('.dbModal'), null, 'it goes by itself, as before')
  /* an injury: its plate over the unit */
  at(P, e => e.type === 'crit.effect')
  const inj = P.V.dom.root.querySelector('.injPlate'); assert.ok(inj, 'the injury plate'); assert.ok(classes(inj).includes('hbtNotice'), 'wears the look: ' + inj.className)
  assert.match(rulesOf('.injPlate'), /position:\s*absolute/); assert.match(rulesOf('.injPlate'), /white-space:\s*nowrap/)
  P.v.dispose()
})

test('the hex tooltip and the affliction pop-up: the look; the tooltip at the pointer, the pop-up with its cards and its Continue', () => {
  const P = boot(), { V, v } = P
  v.seek(P.EV.findIndex(e => e.type === 'activation.begin') + 1)
  /* the tooltip: made by the page for the hex pointed at (V.hexTipAt is the page's own drawing of it) */
  const hex = Object.keys(V.data.POS).map(Number).find(h => !Object.values(V.S.U).some(u => u.hex === h))
  V.view.pointHex = hex; V.render()
  const tip = V.dom.root.querySelector('#hexTip'); assert.ok(tip && tip.style.display !== 'none', 'the tooltip is up'); assert.ok(classes(tip).includes('hbtNotice'), 'wears the look: ' + tip.className)
  assert.ok(tip.querySelector('.hexTipName'), 'the ground\'s name'); assert.match(rulesOf('#hexTip'), /position:\s*absolute/); assert.match(rulesOf('#hexTip'), /pointer-events:\s*none/); assert.match(rulesOf('#hexTip'), /transform:\s*translateX\(-50%\)/)
  v.dispose()
  /* the affliction pop-up: the engine's own line in the Cavern Trail's log (a hero takes Lycanthropy) */
  const Q = boot(cavern); at(Q, e => e.type === 'badge.gained' && e.atZero)
  const pop = Q.V.dom.root.querySelector('#afflPop'); assert.ok(pop, 'the pop-up stands'); const box = pop.querySelector('#afflBox')
  assert.ok(classes(box).includes('hbtNotice'), 'its box wears the look: ' + box.className)
  assert.ok(pop.querySelector('#afflBefore') && pop.querySelector('#afflAfter'), 'its two cards are kept'); const close = pop.querySelector('#afflClose'); assert.ok(close && classes(close).includes('pcBtn'), 'its Continue button is kept')
  assert.match(rulesOf('#afflPop'), /inset:\s*0/); assert.match(rulesOf('#afflPop'), /z-index:\s*210/); assert.match(rulesOf('#afflTitle'), /font-size:\s*34px/)
  /* a raised or lowered stat keeps the board's green and red (the stat block's own colours), outlined, with no box round it */
  for (const s of pop.querySelectorAll('.afflStat')) assert.match(String(s.style.cssText || s.style.color || s.getAttribute('style') || ''), /#|rgb|color/, 'a stat change keeps its raised or lowered colour')
  Q.v.dispose()
})
