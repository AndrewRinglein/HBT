// viewer.bubble-click-reveals (engine DECISIONS.md 2026-10-03 'clicking an off-screen bubble selects the unit and slides the
// screen just far enough to show its hex', Andrew: "I should be able to click on one of the bubbles for a unit that's
// off-screen to both focus it and also scroll the screen over so they are visible, but only just to their hex. Don't focus on
// it or center the screen on it. Just slide over until they're visible."). The item's expect, on the BUILT sandbox
// (BATTLE-SANDBOX.html?play=encounter.opening.orphanage, a few Turns in since 2026-10-04 — the note at step 1): "In a battle with a unit off the screen, clicking its bubble makes
// that unit the one the panel shows and slides the view until its hex is just inside the edge — the unit is not at the centre,
// the zoom and the angle are unchanged, and the bubble is gone". Read against the ENGINE too: the click sends nothing — the
// battle's sequence number, its log and whose Activation it is are what they were.
// Prints one line per check and `bubble-click-reveals: … passed`.
import assert from 'node:assert/strict'
import {bootSlice} from './atlas-dom.mjs'
import {shownName} from '../../viewer/src/names.js'
const {w}=bootSlice(process.argv[2]??'BATTLE-SANDBOX.html',{search:'?play=encounter.opening.orphanage'}),h=w.__sandbox
const V=()=>h.viewer._V,ctx=()=>h.session.ctx,unit=id=>ctx().state.units[id]
const say=(...a)=>console.log('  '+a.join(' '))
const settle=()=>{for(let i=0;i<8000&&(h.busy||i<3);i++)w._flush(20);assert.equal(h.busy,false,'the board settles');assert.equal(h.fault,'','no fault')}
const bubbles=()=>V().layers.edgeL.querySelectorAll('.edgeBub')
const unitsOf=b=>String(b.dataset.units).split(',').map(Number)
const pose=()=>({...V().camTarget})
settle()
/* Law 10, 2026-10-04 (engine fix.opening-orphanage-closer-start; engine DECISIONS.md 2026-10-04 '… a closer start': "bring the hero
   forward to the end of the bridge and bring the zombie left, maybe 3 squares"): step 1 read
     const b=bubbles().find(x=>unitsOf(x).length===1);assert.ok(b,'the Orphanage opens with a unit off the screen, behind a bubble')
   — the battle's opening, where the old start had the Zombie on the right edge, far off the screen. By the ruling the
   Orphanage opens with everyone on the screen: held here, as the rule. The item's expect is "in a battle with a unit off
   the screen", so the scene is the same battle a few Turns on: the player ends Turns (End Turn, as
   tools/arrivals-camera.verify.mjs does) until an arrival that has WALKED IN from its edge is off the screen behind a
   bubble of its own. (An arrival still on the board's first or last column is off the screen too, but there the camera's
   bound keeps its bubble up after the slide — viewer SWITCHES bubbleEdgeHex, ruled away 2026-10-04 by 'the view may slide
   past the board's edge …', viewer.camera-shows-edge-units, not built; a unit off an edge column is the item's plain
   case.) Nothing is sought: the battle is the page's own, on its own seed, and the first such Turn is taken. Every check
   below is unchanged. */
assert.equal(bubbles().length,0,'the Orphanage opens with everyone on the screen: no bubble (the closer start)')
const endTurn=()=>{V().dom.root.querySelector('#playEndTurn').handlers.click({});const ask=V().dom.root.querySelector('#playAsk');if(ask&&ask.style.display!=='none')V().dom.root.querySelector('#playAskYes').handlers.click({});settle()}
const g=ctx().geo,inner=x=>{const c=g.colOf(unit(x).hex);return c>0&&c<g.board.width-1}
const mine=()=>bubbles().find(x=>unitsOf(x).length===1&&inner(unitsOf(x)[0]))
assert.equal(ctx().state.turn,1)
for(let n=0;n<5&&!mine();n++){endTurn();assert.equal(ctx().state.outcome,null,'the battle goes on')}
say(`0 the Orphanage opened with everyone on the screen; the player ended Turns to Turn ${ctx().state.turn}`)
// 1. a unit off the screen has a bubble
const b=mine();assert.ok(b,'by Turn 6 an arrival that has walked in from its edge is off the screen, behind a bubble')
const id=unitsOf(b)[0],u=unit(id),at=V().data.POS[u.hex]
const before=pose(),seq=ctx().state.seq,events=ctx().events.length,actor=ctx().battleCursor.actor,slot=V().play.slot
assert.notEqual(V().view.inspectId,id);assert.notEqual(V().revealPan(before,u.hex),null,'its hex is outside the view')
say(`1 ${u.name} (hex ${u.hex}) is off the screen: a bubble stands for it`)
// 2. the click: the unit looked at, the panel its own
b.handlers.click({stopPropagation(){}});settle()
/* Law 10, 2026-10-05 - viewer.unit-names-no-letters-or-numbers (engine DECISIONS.md 2026-10-05 'no unit is shown with a number or a
   letter', Andrew: "it shouldn't be Soldier A or Lumberjack 1"): the panel was asked for the engine's marked name (`includes(u.name)`); it is asked for the unit by its panel's own name line. The claim is unchanged; the name the screen shows is the
   engine's less its mark, read through the one function the screen itself uses (viewer src/names.js shownName). */
assert.equal(V().view.inspectId,id);assert.equal(V().dom.panel.querySelector('.pName').textContent,shownName(u.name),'the panel shows it')
// 3. nothing sent: the engine's battle is where it was
assert.deepEqual([ctx().state.seq,ctx().events.length,ctx().battleCursor.actor,V().play.actor,V().play.slot],[seq,events,actor,actor,slot],'no command, no Activation changed, the same action armed')
say(`2 clicked: ${u.name} is the unit the panel shows; the engine's battle is untouched (sequence ${seq}, ${unit(actor).name} still acting)`)
// 4. the view slid: a pan only, not centred, the bubble gone, the view still on the board
const after=pose()
assert.ok(Math.hypot(after.x-before.x,after.y-before.y)>1,'the view slid')
assert.deepEqual([after.zoom,after.yaw,after.tilt],[before.zoom,before.yaw,before.tilt],'the zoom and the angle are unchanged')
assert.ok(Math.hypot(after.x-at.px,after.y-at.py)>100,'the view is not centred on the unit')
assert.ok(!bubbles().some(x=>unitsOf(x).includes(id)),'its bubble is gone')
assert.equal(V().revealHex(u.hex),false,'nothing more to slide');assert.deepEqual(pose(),after)
say(`3 the view slid ${Math.round(after.x-before.x)}, ${Math.round(after.y-before.y)} board px — the zoom ${after.zoom.toFixed(3)} and the angle as they were; the unit is ${Math.round(Math.hypot(after.x-at.px,after.y-at.py))} px from the view's centre; no bubble`)
// 5. it stays: the next thing drawn does not pull the view back to the acting hero; playing on lets the camera go again
V().render();assert.deepEqual(pose(),after,'a redraw keeps the slid view')
V().dom.root.querySelector('#playEndAct').handlers.click({});settle()
assert.notEqual(ctx().battleCursor.actor,actor);assert.equal(V().view.revealed,null,'the hold is over once the board plays')
say(`4 the slid view held through a redraw; after End activation the camera follows ${unit(ctx().battleCursor.actor).name} again`)
console.log('bubble-click-reveals: the Orphanage on the built sandbox, the expect line passed')
