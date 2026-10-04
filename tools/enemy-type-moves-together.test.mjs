// viewer.enemy-type-moves-together (engine backlog; engine DECISIONS.md 2026-10-03 'posted: which motions enemies and heroes
// need, and enemies of one type move together', 'the post's twelve questions answered' (10-12) and 'Back Flip's rules;
// enemies only move together; the motion work comes first'). Andrew: "During the enemy turn I would like for all of the
// enemies of a type to move at the same time. What I mean by this is only the move actions. They can still be determined in
// the order they should have been determined, but we're just displaying it as if they're all moving at the same time." /
// "We'll move all of the category, then have them perform actions if they have any. I move 5 zombies. If there are no
// attacks, it just skips the entire attack phase." / "functionally it should be exactly the same." / "Zombies and fast
// zombies would count as two groups." / "All the zombies move, and then attacks play." / "a free attack stops all action and
// just plays out, so the whole group freezes." / "5 enemies only."
// The component's half, asked of the page (VIEWER_PAGE, else BATTLE-VIEWER.html): display only — the log is the engine's and
// is untouched; while the pump plays an Enemy Phase the enemies of one unit type start their walks at the same moment, then
// that type's remaining lines play one Activation after another, then the next type; a free attack on a mover freezes the
// group; and when the run has been shown the board is the engine's own state, the one the one-at-a-time playback ends on.
// tools/fixtures/enemies-together.json is the engine's own battle of five Zombies and four Bloodhounds (made by
// test/viewer.enemy-type-moves-together.test.ts).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { makeWindow } from './fakedom.mjs'
import { planEnemyPhase } from '../src/grouping.js'
import { createState, fold, foldTo } from '../src/fold.js'
const html = readFileSync(process.env.VIEWER_PAGE || 'BATTLE-VIEWER.html', 'utf8')
const load = f => JSON.parse(readFileSync(f, 'utf8'))
const fixture = load('tools/fixtures/enemies-together.json')
const RECORDINGS = { 'five Zombies and four Bloodhounds': fixture, 'the Bridge': load('battles/test.opening-bridge.json'), 'the Cathedral': load('battles/test.opening-cathedral.json'), 'the Lumberjack House': load('battles/test.opening-lumberjack.json') }

function boot(battle, opts = {}) {
  const EV = battle.events
  const m = html.match(/<script>([\s\S]*)<\/script>\s*$/), w = makeWindow()
  w.document.body.innerHTML = html.slice(0, m.index).replace(/<style>[\s\S]*?<\/style>/, '').replace(/<!--[\s\S]*?-->/g, '').replace(/<(meta|title|link)[^>]*>(<\/title>)?/g, '')
  const names = ['window','document','requestAnimationFrame','cancelAnimationFrame','setTimeout','clearTimeout','setInterval','clearInterval','addEventListener','alert','Date','performance','getComputedStyle','localStorage','self','globalThis']
  new Function(...names, m[1])(...names.map(n => ['window','self','globalThis'].includes(n) ? w : w[n]))
  const B = w.__battleView, L = B.lib; B.harness.dispose()
  const mapId = EV.find(e => e.type === 'map.loaded').mapId
  const data = { field: L.fields[mapId], fieldMapId: mapId, initialEvents: EV, units: L.static.units, statuses: L.static.statuses, absorbingStatuses: L.static.absorbingStatuses,
    actions: L.static.actions, badges: L.static.badges, layers: L.static.layers, actionKinds: L.static.actionKinds, statusRows: L.static.statusRows, itemClasses: L.static.itemClasses,
    items: L.static.items, hands: L.static.hands, artmap: L.art.artmap, assets: L.art.assets, glyphs: L.glyphs, meta: { seed: battle.seed } }
  const host = w.document.createElement('div'); w.document.body.appendChild(host)
  const v = B.mount(host, data, { autoplay: false, ...opts })
  v.push(EV)
  return { w, v, V: v._V, EV, L, ctx: { UD: L.static.units, SN: L.static.statuses, IC: L.static.itemClasses } }
}
const at = (EV, type, from = 0, pred = () => true) => EV.findIndex((e, i) => i >= from && e.type === type && pred(e))
/** the board's state without the pump's view clocks (which row is lit, the aim line): what the engine's log decides */
const board = S => { const c = structuredClone(S); for (const k of ['FIRING', 'TRIGFLASH', 'AIM', 'ATTACK', 'AOO', 'BURST']) c[k] = null; c.critPending = false; return c }
function playTo(w, v, to, watch) {
  for (let n = 0; n < 400000 && v.cursor < to; n++) { w._flush(16); watch && watch() }
  assert.ok(v.cursor >= to, `the pump reached event ${to} (it is at ${v.cursor})`)
}
const typeOf = (EV, id) => EV.find(e => e.type === 'unit.enter' && e.actor === id).typeId
/** the first Enemy Phase's first enemy Activation, and the phase's end */
function enemyPhase(EV, turn = 1) {
  const begin = at(EV, 'phase.begin', 0, e => e.phase === 'enemy' && e.turn === turn), first = at(EV, 'activation.begin', begin), end = at(EV, 'phase.end.begin', first)
  return { begin, first, end }
}

test('five Zombies and four Bloodhounds: the five Zombies\' walks start at the same moment, then the four hounds\' — the engine decided them one after another', () => {
  const { w, v, V, EV } = boot(fixture), { begin, first, end } = enemyPhase(EV)
  const order = EV.slice(first, end).filter(e => e.type === 'activation.begin').map(e => typeOf(EV, e.actor))
  assert.deepEqual(order, [...Array(5).fill('unit.zombie'), ...Array(4).fill('unit.bloodhound')], 'the engine\'s own order: five Zombies, then four Bloodhounds')
  v.seek(begin); v.play(); playTo(w, v, end)
  const log = V.together.log.filter(s => s.kind === 'walks')
  assert.equal(log.length, 2, 'two groups moved: ' + JSON.stringify(log.map(s => s.typeId)))
  const [zombies, hounds] = log
  assert.equal(zombies.typeId, 'unit.zombie'); assert.equal(zombies.launched.length, 5, 'five walks launched in one beat')
  assert.equal(hounds.typeId, 'unit.bloodhound'); assert.equal(hounds.launched.length, 4, 'four walks launched in one beat')
  for (const g of log) { assert.equal(new Set(g.launched.map(l => l.actor)).size, g.launched.length)
    for (const l of g.launched) { assert.equal(typeOf(EV, l.actor), g.typeId); assert.ok(l.hexes >= 1, 'each walked'); assert.equal(l.clock, g.clock, 'at the same moment of the pump\'s clock') } }
  /* each mover's walk as launched is the engine's own: its steps are the log's `moved` lines for it, in order, ending where the log leaves it */
  for (const l of [...zombies.launched, ...hounds.launched]) {
    const steps = EV.slice(first, end).filter(e => e.type === 'moved' && e.actor === l.actor).map(e => e.to)
    assert.deepEqual(l.path, steps.slice(0, l.path.length)); assert.equal(V.S.U[l.actor].hex, steps.at(-1), 'and it stands where the engine put it')
  }
  /* the hounds moved only after every Zombie line had been shown */
  const zombieIds = new Set(zombies.launched.map(l => l.actor))
  assert.ok(hounds.shown >= zombies.shown + EV.slice(first, end).filter(e => (e.type === 'activation.begin' || e.type === 'activation.end' || e.type === 'moved') && zombieIds.has(e.actor)).length, 'the hounds\' walks come after the Zombies\' lines')
  v.pause(); v.dispose()
})

test("the Zombies' attacks play after their walks, one Activation after another in the engine's order; the hounds, with no attack to show, are folded without a beat and the screen goes straight on", () => {
  const { w, v, V, EV } = boot(fixture), { begin, first, end } = enemyPhase(EV)
  const attacksOf = typeId => EV.slice(first, end).filter(e => e.type === 'attack.declared' && typeOf(EV, e.actor) === typeId).map(e => e.seq)
  assert.equal(attacksOf('unit.zombie').length, 5, 'Turn 1: each Zombie walks up and attacks'); assert.equal(attacksOf('unit.bloodhound').length, 0, 'and no Bloodhound attacks')
  v.seek(begin); v.play()
  const seen = []; let last = v.cursor
  playTo(w, v, end, () => { if (v.cursor !== last) { for (const e of V.together.shownSince(last)) seen.push(e); last = v.cursor } })
  const log = V.together.log, zi = log.findIndex(s => s.kind === 'walks' && s.typeId === 'unit.zombie'), hi = log.findIndex(s => s.kind === 'walks' && s.typeId === 'unit.bloodhound')
  /* what was shown, in the order shown: every Zombie step, then the Zombies' attacks in the engine's order, then every hound step */
  const kindOf = e => e.type === 'moved' ? 'step:' + typeOf(EV, e.actor) : e.type === 'attack.declared' ? 'attack:' + typeOf(EV, e.actor) : null
  const shown = seen.map(kindOf).filter(Boolean), runs = shown.filter((k, i) => i === 0 || shown[i - 1] !== k)
  assert.deepEqual(runs, ['step:unit.zombie', 'attack:unit.zombie', 'step:unit.bloodhound'], 'all the Zombies move, then their attacks play, then the hounds move')
  assert.deepEqual(seen.filter(e => e.type === 'attack.declared').map(e => e.seq), attacksOf('unit.zombie'), "the attacks in the engine's own order")
  /* each Zombie's attack plays as its own Activation: the unit acting is that Zombie */
  const actors = log.slice(zi + 1, hi).filter(s => s.kind === 'actor').map(s => s.actor)
  assert.deepEqual(actors, EV.slice(first, end).filter(e => e.type === 'activation.begin' && typeOf(EV, e.actor) === 'unit.zombie').map(e => e.actor), 'one Activation after another')
  assert.ok(!log.slice(zi + 1, hi).some(s => s.kind === 'quiet'), 'a Zombie with an attack to show is played, not skipped')
  /* the hounds: nothing left to show after their walks — each Activation's remaining lines are folded without a beat */
  const after = log.slice(hi + 1)
  assert.equal(after.filter(s => s.kind === 'quiet').length, 4, 'four hounds, four remainders folded at once'); assert.ok(after.every(s => s.kind === 'actor' || s.kind === 'quiet' || s.kind === 'done'))
  for (const q of after.filter(s => s.kind === 'quiet')) assert.equal(q.clock, after.find(s => s.kind === 'quiet').clock, "in one moment of the pump's clock: straight on")
  v.pause(); v.dispose()
})

for (const [name, battle] of Object.entries(RECORDINGS)) {
  test(`${name}: the grouped playback of the whole battle ends every Enemy Phase, and the battle, on the engine's own state — the one the one-at-a-time playback ends on; the log is untouched`, () => {
    const G = boot(battle), ONE = boot(battle, { enemiesTogether: false }), EV = battle.events
    const before = JSON.stringify(G.v.events)
    const start = at(EV, 'battle.begin') + 1
    for (const x of [G, ONE]) { x.v.seek(start); x.v.speed(16); x.v.play() }
    /* every Enemy Phase's end: both playbacks, and the pure fold of the log, hold the same board */
    const ends = EV.map((e, i) => e.type === 'phase.end.begin' && e.side === 'enemy' ? i : -1).filter(i => i >= 0)
    assert.ok(ends.length >= 2, 'the battle has Enemy Phases')
    for (const end of ends) {
      playTo(G.w, G.v, end); playTo(ONE.w, ONE.v, end)
      if (G.v.cursor !== end || ONE.v.cursor !== end) continue               // a beat that folds several lines stepped over it
      const truth = board(foldTo(EV, end, G.ctx))
      assert.deepEqual(board(G.V.S), truth, `event ${end}: the grouped playback stands on the engine's state`)
      assert.deepEqual(board(ONE.V.S), truth, `event ${end}: and so does the one-at-a-time playback`)
    }
    playTo(G.w, G.v, EV.length); playTo(ONE.w, ONE.v, EV.length)
    assert.equal(G.v.cursor, EV.length); assert.equal(ONE.v.cursor, EV.length)
    assert.deepEqual(board(G.V.S), board(ONE.V.S), 'the battle ends on the same state both ways')
    assert.deepEqual(board(G.V.S), board(foldTo(EV, EV.length, G.ctx)), 'which is the engine\'s log, folded')
    assert.equal(G.V.S.outcome, battle.outcome ?? G.V.S.outcome)
    assert.equal(JSON.stringify(G.v.events), before, 'the log the viewer holds is the engine\'s, line for line, after the grouped playback')
    assert.deepEqual(G.v.events, EV)
    /* groups were in fact gathered (and none in the one-at-a-time playback), and every run was checked against the engine's state as it ended */
    assert.ok(G.V.together.runs.length >= 1, 'Enemy Phases were grouped'); assert.equal(ONE.V.together.runs.length, 0)
    for (const r of G.V.together.runs) assert.equal(r.landed, true, `the run ${r.from}–${r.to} ended on the engine's state`)
    G.v.dispose(); ONE.v.dispose()
  })
}

test('an engine order that mixes types: each type is still gathered whole, the groups in the order each type first acts; only enemies, only the Enemy Phase', () => {
  let mixed = null
  for (const [name, battle] of Object.entries(RECORDINGS)) {
    const EV = battle.events, S = createState(), ctx = { UD: {}, SN: {} }
    for (let i = 0; i < EV.length && !mixed; i++) {
      const e = EV[i]
      const plan = e.type === 'activation.begin' && e.phase === 'enemy' ? planEnemyPhase(EV, i, id => S.U[id], (mb, n) => 600 * n) : null
      if (plan) { const seq = EV.slice(plan.from, plan.to).filter(x => x.type === 'activation.begin').map(x => S.U[x.actor].typeId)
        const runs = seq.filter((t, k) => k === 0 || seq[k - 1] !== t)
        if (new Set(runs).size < runs.length) mixed = { name, battle, plan, seq } }
      fold(S, e, ctx, 0)
    }
  }
  assert.ok(mixed, 'a recording has an Enemy Phase whose order mixes types')
  const { plan, seq, battle } = mixed, EV = battle.events
  /* the plan is the log's own lines, each once */
  assert.deepEqual([...plan.order].sort((a, b) => a - b), Array.from({ length: plan.to - plan.from }, (_, k) => plan.from + k), 'a permutation of the run\'s lines')
  /* the groups: each type once, in the order each type first acts */
  const firsts = seq.filter((t, k) => seq.indexOf(t) === k)
  assert.deepEqual(plan.groups.map(g => g.typeId), firsts, `${mixed.name}: the engine's order ${seq.join(', ')} is shown as ${firsts.join(', then ')}`)
  for (const g of plan.groups) assert.equal(g.actors.length, seq.filter(t => t === g.typeId).length, g.typeId + ' gathered whole')
  /* within the order shown, every Activation's own lines keep the engine's order */
  for (const g of plan.groups) for (const actor of g.actors) {
    const own = plan.order.filter(k => EV[k].actor === actor && (EV[k].type === 'moved' || EV[k].type === 'attack.declared' || EV[k].type === 'activation.begin' || EV[k].type === 'activation.end'))
    assert.deepEqual(own, [...own].sort((a, b) => a - b), 'unit ' + actor + ': its own lines in the engine\'s order')
  }
  /* a hero's Activation, and an enemy's outside the Enemy Phase, are never planned */
  const heroBegin = at(EV, 'activation.begin', 0, e => e.phase === 'hero')
  assert.equal(planEnemyPhase(EV, heroBegin, () => ({ side: 'hero', typeId: 'x' }), () => 0), null, 'the Hero Phase plays one at a time')
  assert.equal(planEnemyPhase(EV, plan.from, () => ({ side: 'hero', typeId: 'x' }), () => 0), null, 'allies and civilians are not gathered')
})

test('a free attack on a moving enemy freezes the whole moving group while it plays, then the group goes on', () => {
  /* a recording in which a hero's free attack lands on a mover of a group of two or more that walk (found with the page's own planner) */
  let found = null
  for (const [name, battle] of Object.entries(RECORDINGS)) {
    const EV = battle.events, S = createState(), ctx = { UD: {}, SN: {} }
    for (let i = 0; i < EV.length && !found; i++) {
      const e = EV[i]
      const plan = e.type === 'activation.begin' && e.phase === 'enemy' ? planEnemyPhase(EV, i, id => S.U[id], (mb, n) => 600 * n) : null
      if (plan) { const marks = [...plan.marks.entries()].flatMap(([pos, ms]) => ms.map(m => ({ pos, ...m })))
        const freeze = marks.find(m => m.kind === 'freeze'), walks = marks.filter(m => m.kind === 'walks').find(m => freeze && m.legs.some(l => l.actor === freeze.actor) && m.legs.length >= 2)
        if (freeze && walks) found = { name, battle, plan, freeze, walks } }
      fold(S, e, ctx, 0)
    }
  }
  assert.ok(found, 'a recording has a free attack on a mover of a group')
  const { battle, plan, freeze, walks } = found, { w, v, V, EV } = boot(battle)
  const aoo = at(EV, 'aoo.provoked', plan.from, e => e.target === freeze.actor); assert.ok(aoo > 0 && aoo < plan.to)
  /* the walks as the board animates them: this test's own stand-ins for the browser's animations, which stay running until
     paused, played or cancelled (the fake DOM finishes every animation at once) */
  const anims = []
  const track = id => { const E = V.layers.UEL.get(id); if (!E || E.root._tracked) return; E.root._tracked = true
    E.root.animate = (kf, o) => { const a = { id, kf, o, playState: 'running', onfinish: null, oncancel: null, log: [], pause() { a.playState = 'paused'; a.log.push('pause') }, play() { a.playState = 'running'; a.log.push('play') }, cancel() { a.playState = 'idle'; if (a.oncancel) a.oncancel() } }; anims.push(a); return a } }
  v.seek(plan.from); v.render()
  for (const u of Object.values(V.S.U)) track(u.id)
  V.layers.unitsL.getAnimations = () => anims.filter(a => a.playState === 'running' || a.playState === 'paused')
  v.play()
  let frozenSeen = null, launchedDuring = []
  playTo(w, v, plan.to, () => {
    const f = V.together.log.find(s => s.kind === 'freeze' && s.actor === freeze.actor), r = V.together.log.find(s => s.kind === 'resume' && s.actor === freeze.actor)
    if (f && !r) {            // the free attack is playing
      if (!frozenSeen) frozenSeen = { states: anims.filter(a => a.id !== freeze.actor).map(a => a.playState), count: anims.length, shown: v.cursor }
      assert.ok(!anims.some(a => a.id !== freeze.actor && a.playState === 'running'), 'no other unit of the group moves while the free attack plays')
    }
  })
  const log = V.together.log, wi = log.findIndex(s => s.kind === 'walks' && s.actors.includes(freeze.actor)), fi = log.findIndex(s => s.kind === 'freeze' && s.actor === freeze.actor), ri = log.findIndex(s => s.kind === 'resume' && s.actor === freeze.actor)
  assert.ok(wi >= 0 && fi > wi && ri > fi, 'the walks, then the freeze, then the group goes on')
  assert.equal(log[wi].actors.length, walks.legs.length, 'the whole group set off together: ' + log[wi].actors.length)
  assert.ok(frozenSeen, 'the free attack was seen playing')
  assert.ok(log[fi].paused >= 1, 'walks in flight were paused: ' + log[fi].paused); assert.ok(frozenSeen.states.includes('paused'), 'the others stood frozen mid-walk')
  assert.equal(log[ri].resumed, log[fi].paused, 'and every paused walk went on afterwards')
  for (const a of anims.filter(a => a.log.includes('pause'))) assert.deepEqual(a.log.slice(0, 2), ['pause', 'play'], 'frozen, then on')
  /* the free attack's own lines were shown while the group stood: the holder's attack on the mover */
  const strike = at(EV, 'attack.declared', aoo, e => e.target === freeze.actor); assert.ok(strike > aoo && strike < plan.to)
  assert.ok(log[ri].shown > log[fi].shown, 'lines were played between the freeze and the going on')
  /* and it still ends on the engine's state */
  assert.deepEqual(board(V.S), board(foldTo(EV, plan.to, { UD: V.data.UD, SN: V.data.SN, IC: V.data.ITEM_CLASSES })))
  v.pause(); v.dispose()
})

test('a hand step or a seek inside a grouped Enemy Phase lands on the engine\'s own state; the host can turn the grouping off', () => {
  const { w, v, V, EV, ctx } = boot(fixture), { begin, first, end } = enemyPhase(EV)
  v.seek(begin); v.play()
  for (let n = 0; n < 4000 && !V.together.log.some(s => s.kind === 'walks'); n++) w._flush(16)
  assert.ok(v.cursor > first, 'the group\'s walks are shown'); const shown = v.cursor
  /* a hand step: the board goes back to the engine's state nearest behind what was shown, then takes one line */
  v.step()
  assert.equal(v.playing, false); assert.ok(v.cursor >= first && v.cursor <= shown + 8, 'the cursor is a place in the engine\'s log: ' + v.cursor)
  assert.deepEqual(board(V.S), board(foldTo(EV, v.cursor, ctx)), 'a hand step lands on the engine\'s state')
  for (let k = 0; k < 12; k++) { v.step(); assert.deepEqual(board(V.S), board(foldTo(EV, v.cursor, ctx)), 'and each step after it') }
  /* a seek into the phase is the engine's state at that line, as ever */
  const mid = first + Math.floor((end - first) / 2); v.seek(mid); assert.deepEqual(board(V.S), board(foldTo(EV, mid, ctx)))
  /* played on from there, the rest of the phase is gathered again and ends on the engine's state */
  v.play(); playTo(w, v, end); assert.deepEqual(board(V.S), board(foldTo(EV, v.cursor, ctx)))
  v.pause()
  /* off: one at a time, as before */
  v.setTogether(false); const runs = V.together.runs.length
  const p2 = enemyPhase(EV, 2); v.seek(p2.begin); v.play(); playTo(w, v, p2.end)
  assert.equal(V.together.runs.length, runs, 'no run is gathered once the host turns it off')
  assert.throws(() => v.setTogether('yes'), /true or false/)
  v.pause(); v.dispose()
})
