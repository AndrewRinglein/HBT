// viewer.notices-gold-low-no-backdrop (engine backlog; engine DECISIONS.md 2026-10-05 'playtest post: ...' and 'the playtest post
// answered: every notice gold and low ...'). Andrew: "The notifications are in a very awkward spot. The fact that they have a
// backdrop makes them take up a lot more space. I was imagining this as gold and bright text with no backdrop. Also, let's drop
// it lower down on the screen so it's right above the bottom of the screen." - asked whether that is every notice or some: "I
// don't like the way it is for anything."
// Asked of the page (VIEWER_PAGE, else BATTLE-VIEWER.html) - its stylesheet and its DOM as mounted for a host that plays:
//   one look, one place  - the notice's lettering is ONE rule of the stylesheet (between the NOTICE-LOOK marks, which the
//                          kingdom's builders lift for their own screens): gold, bright, an outline and a soft shadow on the
//                          letters, nothing drawn behind them;
//   every notice         - the lesson and "New enemy" (#tutNotice), "No remaining actions possible." (#playNotice) and the
//                          play note (#playNote) wear it and stand in one stack (#noticeStack) just above the bottom of the
//                          board, which is just above the action bar - never over the bar, never over one another;
//   the questions        - End Turn? and the switch question keep their buttons and lose the box behind their words;
//   an arrow's word      - the same lettering, no gold box.
// How it measures and looks in a real browser is kingdom tools/notices-gold-low-no-backdrop.verify.mjs.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { makeWindow } from './fakedom.mjs'
const battle1 = JSON.parse(readFileSync('battles/test.opening-orphanage.json', 'utf8'))
const html = readFileSync(process.env.VIEWER_PAGE || 'BATTLE-VIEWER.html', 'utf8')
const css = html.match(/<style>([\s\S]*?)<\/style>/)[1].replace(/url\("data:[^"]*"\)/g, 'url()')
/** the declarations of every rule whose selector list names `sel` exactly, joined (a later rule adds to an earlier one) */
const rulesOf = sel => { const out = []; for (const m of css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{([^{}]*)\}/g)) if (m[1].split(',').map(s => s.trim()).includes(sel)) out.push(m[2]); return out.join(';') }
const BACKDROP = /(^|;)\s*(background(-color|-image)?|border(-(top|bottom|left|right))?|box-shadow|outline)\s*:\s*(?!none\b|0\b|transparent\b)[^;]+/

function boot() {
  const m = html.match(/<script>([\s\S]*)<\/script>\s*$/), w = makeWindow()
  w.document.body.innerHTML = html.slice(0, m.index).replace(/<style>[\s\S]*?<\/style>/, '').replace(/<!--[\s\S]*?-->/g, '').replace(/<(meta|title|link)[^>]*>(<\/title>)?/g, '')
  const names = ['window','document','requestAnimationFrame','setTimeout','clearTimeout','setInterval','clearInterval','addEventListener','alert','Date','performance','getComputedStyle','localStorage','self','globalThis']
  new Function(...names, m[1])(...names.map(n => ['window','self','globalThis'].includes(n) ? w : w[n]))
  const B = w.__battleView, L = B.lib; B.harness.dispose()
  const mapId = battle1.events.find(e => e.type === 'map.loaded').mapId
  const data = { field: L.fields[mapId], fieldMapId: mapId, initialEvents: battle1.events, units: L.static.units, statuses: L.static.statuses, absorbingStatuses: L.static.absorbingStatuses,
    actions: L.static.actions, badges: L.static.badges, layers: L.static.layers, actionKinds: L.static.actionKinds, statusRows: L.static.statusRows, itemClasses: L.static.itemClasses,
    items: L.static.items, hands: L.static.hands, tagCarriers: L.static.tagCarriers, artmap: L.art.artmap, assets: L.art.assets, glyphs: L.glyphs, meta: { seed: battle1.seed } }
  const host = w.document.createElement('div'); w.document.body.appendChild(host)
  const v = B.mount(host, data, { autoplay: false, onPlay: () => true }); v.push(battle1.events)
  v.seek(battle1.events.findIndex(e => e.type === 'activation.begin' && e.actor === 0) + 1)
  return { w, v, V: v._V }
}
const classes = n => String(n.className || '').split(/\s+/)
const shown = n => !!n && n.style.display !== 'none'

test('one look in one place: gold, bright letters with an outline and a soft shadow, and nothing drawn behind them', () => {
  const block = css.match(/\/\* NOTICE-LOOK \*\/([\s\S]*?)\/\* END NOTICE-LOOK \*\//)
  assert.ok(block, 'the stylesheet marks the one rule of the notice\'s look (NOTICE-LOOK … END NOTICE-LOOK)')
  const rules = [...block[1].matchAll(/([^{}]+)\{([^{}]*)\}/g)]; assert.equal(rules.length, 1, 'one rule')
  const [, selectors, look] = rules[0]
  assert.ok(selectors.split(',').map(s => s.trim()).includes('.hbtNotice'), 'the look is the class .hbtNotice')
  const colour = look.match(/(?:^|;)\s*color:\s*(#[0-9a-f]{6})/i); assert.ok(colour, 'a colour of its own (no variable: the kingdom\'s screens lift the rule)')
  const [r, g, b] = [1, 3, 5].map(k => parseInt(colour[1].slice(k, k + 2), 16))
  assert.ok(r >= 240 && g >= 190 && g <= 235 && b <= 130, `gold and bright: ${colour[1]}`)
  assert.match(look, /text-shadow:[^;]*#000[^;]*,[^;]*,/, 'an outline and a soft shadow on the letters'); assert.match(look, /font-weight:\s*[67]00/)
  assert.match(look, /background:\s*none/); assert.match(look, /border:\s*(none|0)/); assert.match(look, /box-shadow:\s*none/)
  /* and no rule anywhere gives a notice a backdrop back */
  for (const sel of ['.hbtNotice', '#noticeStack', '#tutNotice', '#tutNotice b', '#playNotice', '#playNote', '.tutWord'])
    assert.doesNotMatch(rulesOf(sel), BACKDROP, `${sel} draws something behind its letters: ${rulesOf(sel).match(BACKDROP)?.[0]}`)
})

test('every notice of the battle screen wears the look and stands in one stack just above the bottom of the board, above the action bar', () => {
  const { w, v, V } = boot(), root = V.dom.root, wrap = V.dom.stage.parentNode
  const stack = root.querySelector('#noticeStack'); assert.ok(stack, 'the page has one stack for its notices')
  assert.equal(stack.parentNode, wrap, 'the stack is in the board\'s own frame (the action bar is below that frame, not in it)')
  const frame = rulesOf('#noticeStack')
  assert.match(frame, /position:\s*absolute/); assert.match(frame, /bottom:\s*\d+px/); assert.doesNotMatch(frame, /(^|;)\s*top:/); assert.match(frame, /left:\s*50%/); assert.match(frame, /flex-direction:\s*column/)
  assert.ok(+frame.match(/bottom:\s*(\d+)px/)[1] <= 40, 'just above the bottom edge'); assert.match(frame, /pointer-events:\s*none/, 'the stack itself takes no click from the board')
  /* the action bar and the stamina strip are siblings of the board's frame, after it: nothing in the frame can lie over them */
  const kids = [...wrap.parentNode.children], at = n => kids.indexOf(n)
  assert.ok(at(wrap) >= 0 && at(root.querySelector('#barrow')) > at(wrap) && at(root.querySelector('#stambar')) > at(wrap), 'the bar is below the board\'s frame')
  assert.match(rulesOf('#boardwrap'), /overflow:\s*hidden/, 'and the frame clips what is in it')
  /* the three notices: the play note, the host's notice, the lesson - each in the stack, each wearing the look, none placed by itself */
  v.setPlay({ actor: 0, slot: null, reach: [], zoc: [], path: [], provokes: [], ghost: null, threat: null, targets: [], aim: null, note: 'Leap: click it again, or the hero, to use it.' })
  v.notice('No remaining actions possible.')
  v.tell(['New enemy', 'Zombie', 'This enemy can poison with its claws.'])
  const notes = { playNote: root.querySelector('#playNote'), playNotice: root.querySelector('#playNotice'), tutNotice: root.querySelector('#tutNotice') }
  for (const [id, n] of Object.entries(notes)) {
    assert.ok(n && shown(n), id + ' is up'); assert.equal(n.parentNode, stack, id + ' stands in the stack'); assert.ok(classes(n).includes('hbtNotice'), id + ' wears the look')
    const own = rulesOf('#' + id); assert.doesNotMatch(own, /position:\s*(absolute|fixed)/, id + ' is not placed by itself'); assert.doesNotMatch(own, /(^|;)\s*(top|left|transform):/, id + ': no place of its own')
  }
  assert.equal(notes.playNote.textContent, 'Leap: click it again, or the hero, to use it.'); assert.equal(notes.playNotice.textContent, 'No remaining actions possible.')
  assert.deepEqual(notes.tutNotice.querySelectorAll('b').map(x => x.textContent), ['New enemy', 'Zombie', 'This enemy can poison with its claws.'])
  /* a lesson still takes the click that clears it; the others take none */
  assert.match(rulesOf('#tutNotice'), /pointer-events:\s*auto/); assert.doesNotMatch(rulesOf('#playNotice') + rulesOf('#playNote'), /pointer-events:\s*auto/)
  /* large enough to read at a glance, as each was */
  assert.ok(+rulesOf('#tutNotice b').match(/font-size:\s*(\d+)px/)[1] >= 28); assert.ok(+rulesOf('#playNotice').match(/font-size:\s*(\d+)px/)[1] >= 20); assert.ok(+rulesOf('#playNote').match(/font-size:\s*(\d+)px/)[1] >= 15)
  /* they go as they went: by their time, and the stack is left empty of them */
  v.clearTell(); w._flush(6000); v.setPlay(null)
  assert.equal(root.querySelector('#tutNotice'), null); assert.equal(shown(notes.playNotice), false); assert.equal(shown(notes.playNote), false)
  v.dispose()
})

test('the questions keep their buttons and lose the box behind their words; an arrow\'s word has no gold box', () => {
  const { v, V } = boot(), root = V.dom.root
  for (const box of ['#playAskBox', '#playSwitchBox']) assert.doesNotMatch(rulesOf(box), BACKDROP, `${box} still draws a box behind the words: ${rulesOf(box).match(BACKDROP)?.[0]}`)
  for (const id of ['playAskText', 'playSwitchText', 'playAskWho']) { const n = root.querySelector('#' + id); assert.ok(n, id); assert.ok(classes(n).includes('hbtNotice'), id + ' wears the notice\'s lettering') }
  for (const id of ['playAskYes', 'playAskNo', 'playSwitchYes', 'playSwitchNo']) { const b = root.querySelector('#' + id); assert.ok(b, 'the button ' + id + ' is kept'); assert.ok(classes(b).includes('pcBtn')) }
  assert.match(rulesOf('.pcBtn'), /border:\s*1px solid/, 'a button is still a button')
  /* the gear panel is a panel of controls, not a notice: it keeps its box */
  assert.match(rulesOf('#playGearBox'), /background:\s*#/)
  /* an arrow's word */
  v.point({ ui: 'action-bar' }, { word: 'Move' })
  const word = root.querySelector('.tutWord'); assert.ok(word, 'the pointer carries its word'); assert.equal(word.textContent, 'Move'); assert.ok(classes(word).includes('hbtNotice'))
  v.dispose()
})
