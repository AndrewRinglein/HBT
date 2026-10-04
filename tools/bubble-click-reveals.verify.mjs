// viewer.bubble-click-reveals (engine DECISIONS.md 2026-10-03 'clicking an off-screen bubble selects the unit and slides the
// screen just far enough to show its hex', Andrew: "I should be able to click on one of the bubbles for a unit that's
// off-screen to both focus it and also scroll the screen over so they are visible, but only just to their hex. Don't focus on
// it or center the screen on it. Just slide over until they're visible."). The item's expect, on the BUILT sandbox
// (BATTLE-SANDBOX.html?play=encounter.opening.orphanage): "In a battle with a unit off the screen, clicking its bubble makes
// that unit the one the panel shows and slides the view until its hex is just inside the edge — the unit is not at the centre,
// the zoom and the angle are unchanged, and the bubble is gone". Read against the ENGINE too: the click sends nothing — the
// battle's sequence number, its log and whose Activation it is are what they were.
// Prints one line per check and `bubble-click-reveals: … passed`.
import assert from 'node:assert/strict'
import {bootSlice} from './atlas-dom.mjs'
const {w}=bootSlice(process.argv[2]??'BATTLE-SANDBOX.html',{search:'?play=encounter.opening.orphanage'}),h=w.__sandbox
const V=()=>h.viewer._V,ctx=()=>h.session.ctx,unit=id=>ctx().state.units[id]
const say=(...a)=>console.log('  '+a.join(' '))
const settle=()=>{for(let i=0;i<8000&&(h.busy||i<3);i++)w._flush(20);assert.equal(h.busy,false,'the board settles');assert.equal(h.fault,'','no fault')}
const bubbles=()=>V().layers.edgeL.querySelectorAll('.edgeBub')
const unitsOf=b=>String(b.dataset.units).split(',').map(Number)
const pose=()=>({...V().camTarget})
settle()
// 1. a unit off the screen has a bubble
const b=bubbles().find(x=>unitsOf(x).length===1);assert.ok(b,'the Orphanage opens with a unit off the screen, behind a bubble')
const id=unitsOf(b)[0],u=unit(id),at=V().data.POS[u.hex]
const before=pose(),seq=ctx().state.seq,events=ctx().events.length,actor=ctx().battleCursor.actor,slot=V().play.slot
assert.notEqual(V().view.inspectId,id);assert.notEqual(V().revealPan(before,u.hex),null,'its hex is outside the view')
say(`1 ${u.name} (hex ${u.hex}) is off the screen: a bubble stands for it`)
// 2. the click: the unit looked at, the panel its own
b.handlers.click({stopPropagation(){}});settle()
assert.equal(V().view.inspectId,id);assert.ok(V().dom.panel.innerHTML.includes(u.name),'the panel shows it')
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
