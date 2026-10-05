// viewer.unit-names-no-letters-or-numbers (engine backlog; engine DECISIONS.md 2026-10-05 'no unit is shown with a number or a
// letter'). Andrew: "None of the player units or enemy units should have numbers or letters. It's super dumb. It's okay to track
// them that way, but it shouldn't be Soldier A or Lumberjack 1 or Pyrowitch A. Why have an A or a 1 or an A? It's fine for the
// zombies just to be zombie, zombie, zombie, zombie."
// The engine names every unit it fields with a mark that tells it from another of its kind - a letter for a hero ("Forest Elf A"),
// a number for an enemy or a placed civilian ("Zombie 3", "Lumberjack 1") - and its lines carry that name (unit.enter). The
// recordings and the engine's names are not changed; the mark is taken off for display in ONE function (src/names.js shownName),
// which the fold (every name on the board, the top cards, the panel, the pop-ups), the log, and kingdom's screens read.
// Asked of the page (VIEWER_PAGE, else BATTLE-VIEWER.html) over the six opening recordings: every unit they field is walked
// and no shown name - under the unit, on its top card, in its panel, in any log line - ends in a lone letter or number.
// The sandbox's half is kingdom tools/unit-names-no-letters-or-numbers.verify.mjs.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { makeWindow } from './fakedom.mjs'
import { buildLog } from '../src/log.js'
const names = await import('../src/names.js').catch(() => ({}))
const OPENING = ['orphanage', 'lumberjack', 'bridge', 'cavern-trail', 'gates', 'cathedral']
const battle = name => JSON.parse(readFileSync(`battles/test.opening-${name}.json`, 'utf8'))
const html = readFileSync(process.env.VIEWER_PAGE || 'BATTLE-VIEWER.html', 'utf8')
const STATIC = JSON.parse(readFileSync('generated/static.json', 'utf8'))
/** a name's last word is a lone capital letter or a number: the engine's mark */
const MARKED = / (?:[A-Z]|\d+)$/
const text = x => String(x ?? '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/\s+/g, ' ')

function page() {
  const m = html.match(/<script>([\s\S]*)<\/script>\s*$/), w = makeWindow()
  w.document.body.innerHTML = html.slice(0, m.index).replace(/<style>[\s\S]*?<\/style>/, '').replace(/<!--[\s\S]*?-->/g, '').replace(/<(meta|title|link)[^>]*>(<\/title>)?/g, '')
  const names = ['window','document','requestAnimationFrame','setTimeout','clearTimeout','setInterval','clearInterval','addEventListener','alert','Date','performance','getComputedStyle','localStorage','self','globalThis']
  new Function(...names, m[1])(...names.map(n => ['window','self','globalThis'].includes(n) ? w : w[n]))
  return w
}
/** every unit of one opening battle as the page shows it: the fold's name, the label under the unit, its top card, its panel */
function shown(w, name) {
  const H = w.__battleView.harness, b = battle(name); H.playExport(b, name)
  const v = H.viewer, V = v._V, EV = b.events, begun = EV.findIndex(e => e.type === 'battle.begin')
  const entered = EV.filter(e => e.type === 'unit.enter'), out = []
  for (const e of entered) {
    /* looked at while it stands: just after it comes onto the board (a unit dead at the battle's end has no card and no label) */
    v.seek(Math.max(EV.indexOf(e), begun) + 1)
    const u = V.S.U[e.actor]; assert.ok(u, `${name}: unit ${e.actor} is on the page's roster`)
    v.inspect(u.id)
    const E = V.layers.UEL.get(u.id), chip = V.dom.rail ? V.dom.rail.querySelectorAll('.railchip').find(c => String(c.dataset.i) === String(u.id)) : null
    const pName = V.dom.panel.querySelector('.pName')
    out.push({ id: u.id, typeId: e.typeId, engine: e.name, fold: u.name, /* the label under the unit is drawn on the boards that draw one (board.js underUnit); where none is, there is none to read */
      label: E && E.name.style.display !== 'none' && E.name.textContent ? E.name.textContent : undefined, card: chip ? chip.getAttribute('title') : null, panel: pName ? text(pName.textContent) : null })
  }
  v.seek(EV.length)
  const end = EV.find(e => e.type === 'battle.end')
  return { units: out, events: EV, lines: buildLog(EV, STATIC.statuses, end ? end.turn : 0), V }
}

test('the one function: a hero\'s letter and an enemy\'s number come off; a name of its own is left', () => {
  const { shownName } = names
  assert.equal(typeof shownName, 'function', 'src/names.js exports shownName')
  for (const [engine, plain] of [['Soldier A', 'Soldier'], ['Lumberjack 1', 'Lumberjack'], ['Pyre Witch A', 'Pyre Witch'], ['Zombie 4', 'Zombie'], ['Zombie 12', 'Zombie'], ['Lumberjack\'s Wife 1', 'Lumberjack\'s Wife'], ['The Rose B', 'The Rose'], ['Skeleton Archer 3', 'Skeleton Archer']])
    assert.equal(shownName(engine), plain, engine)
  /* nothing to take off: a plain name, a host's own short handle, a given name, and what is not a name */
  for (const same of ['Zombie', 'Forest Elf', 'H0', 'E12', 'Aldric', 'Aldric the Bold', 'X', '7', '']) assert.equal(shownName(same), same, JSON.stringify(same))
  assert.equal(shownName(undefined), undefined); assert.equal(shownName(null), null)
  /* one mark, the engine's: a name whose own last word is a letter or a number keeps it under the mark */
  assert.equal(shownName('Golem 7 2'), 'Golem 7'); assert.equal(shownName('Mark V A'), 'Mark V')
  /* a turned unit's name is its form's and, in brackets, the unit's shown name - made in the fold from shown names */
  assert.equal(shownName('Werewolf (Forest Elf)'), 'Werewolf (Forest Elf)')
  /* A NAME WHOSE NUMBER IS ITS OWN: none today - a unit row whose name ends in a lone letter or number would be listed here and left */
  const own = Object.entries(STATIC.units).filter(([, u]) => MARKED.test(u.name)).map(([id, u]) => `${id}: ${u.name}`)
  console.log('# unit names whose last word is a letter or a number of their own: ' + (own.join(', ') || 'none'))
  assert.deepEqual(own, [], 'the engine\'s sheet names')
})

test('every unit the six opening battles field: no shown name ends in a lone letter or number - under the unit, on its top card, in its panel', () => {
  const w = page(); let walked = 0, marked = 0, labels = 0
  const kinds = new Map()
  for (const name of OPENING) {
    const { units } = shown(w, name)
    for (const u of units) {
      const plain = u.engine.replace(MARKED, '')
      if (plain !== u.engine) marked++
      for (const where of ['fold', 'label', 'card', 'panel']) {
        if (where === 'label' && u.label === undefined) continue
        if (where === 'label') labels++
        assert.ok(u[where] != null, `${name}: ${u.engine} has a ${where} name`)
        assert.ok(!MARKED.test(u[where]), `${name}: ${u.engine} is shown as "${u[where]}" (${where}) - a lone letter or number`)
        assert.equal(u[where], plain, `${name}: ${u.engine} (${where})`)
      }
      /* the plain name is the engine's own sheet name for the kind, where its sheet has one */
      const sheet = STATIC.units[u.typeId]; if (sheet && sheet.name !== u.typeId) assert.equal(plain, sheet.name, `${name}: ${u.engine} is a ${sheet.name}`)
      kinds.set(u.typeId, plain); walked++
    }
  }
  assert.ok(labels >= 30, labels + ' labels under units were read')
  assert.ok(walked >= 60 && marked === walked, `${walked} units walked, every one marked by the engine (${marked})`)
  w.__battleView.harness.dispose()
  console.log(`# ${walked} units of ${kinds.size} kinds walked: ${[...new Set(kinds.values())].sort().join(', ')}`)
})

test('battle 2: the Lumberjack reads "Lumberjack", the Soldier "Soldier", every Zombie "Zombie" - on the board, the cards, the panel and in every log line', () => {
  const w = page(), { units, lines, events } = shown(w, 'lumberjack')
  const of = typeId => units.filter(u => u.typeId === typeId)
  assert.deepEqual(of('hero.fixed.lumberjack-and-wife').map(u => [u.engine, u.label, u.card, u.panel]), [['Lumberjack 1', 'Lumberjack', 'Lumberjack', 'Lumberjack']])
  assert.ok(of('unit.soldier').length >= 1); for (const u of of('unit.soldier')) assert.deepEqual([u.label, u.card, u.panel], ['Soldier', 'Soldier', 'Soldier'], u.engine)
  assert.ok(of('unit.zombie').length >= 3); for (const u of of('unit.zombie')) assert.deepEqual([u.label, u.card, u.panel], ['Zombie', 'Zombie', 'Zombie'], u.engine)
  /* the log: one sentence per line of the engine's, and none names a unit with its mark */
  assert.ok(lines.length > 300, 'the log\'s lines')
  const engineNames = [...new Set(units.map(u => u.engine))]
  for (const l of lines) { const t = text(l.t)
    for (const n of engineNames) assert.ok(!new RegExp('(^|[^A-Za-z])' + n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '($|[^0-9A-Za-z])').test(t), `the log line for event ${l.i} names "${n}": ${t}`) }
  const said = lines.map(l => text(l.t)).join('\n')
  for (const plain of ['Lumberjack', 'Soldier', 'Zombie', 'Forest Elf', 'Skeleton Archer']) assert.match(said, new RegExp(plain + ' (activates|takes)'), plain + ' is named plainly in the log')
  /* the pop-ups and notices that name a unit read the fold's name: the switch question, as the page words it */
  const V = shown(w, 'lumberjack').V, heroes = Object.values(V.S.U).filter(u => u.side === 'hero')
  for (const u of Object.values(V.S.U)) assert.ok(!MARKED.test(u.name), u.name)
  assert.ok(heroes.length >= 2)
  /* THE RECORDING IS NOT TOUCHED: its unit.enter lines still carry the engine's own names, marks and all */
  for (const e of events.filter(x => x.type === 'unit.enter')) assert.match(e.name, MARKED, 'the recording keeps the engine\'s name: ' + e.name)
  w.__battleView.harness.dispose()
})

test('the Orphanage: four Zombies each read "Zombie"; two units of one kind are told apart by the board, not by a mark', () => {
  const w = page(), { units, lines, V } = shown(w, 'orphanage'), zombies = units.filter(u => u.typeId === 'unit.zombie')
  assert.equal(zombies.length, 4, 'the Orphanage fields four Zombies'); assert.deepEqual(zombies.map(u => u.engine), ['Zombie 1', 'Zombie 2', 'Zombie 3', 'Zombie 4'])
  for (const u of zombies) assert.deepEqual([u.fold, u.label, u.card, u.panel], ['Zombie', 'Zombie', 'Zombie', 'Zombie'])
  /* a log line still knows WHICH unit it is about - its event's actor and target - so hovering or clicking it marks that unit, as before */
  const first = lines.find(l => /<b>Zombie<\/b> activates/.test(l.t)); assert.ok(first, 'a Zombie\'s Activation is a line')
  assert.equal(typeof first.i, 'number', 'the line carries its event'); assert.equal(V.EV[first.i].type, 'activation.begin'); assert.ok(zombies.some(z => z.id === V.EV[first.i].actor))
  assert.equal(new Set(zombies.map(z => z.id)).size, 4, 'four units, four ids - tracked as before')
  w.__battleView.harness.dispose()
})
