// viewer.arrivals-camera (engine DECISIONS.md 2026-10-04 'the opening's tutorial: … the camera shows what arrives …', Andrew:
// "when a phase happens and enemies are introduced, the map is going to pan over to the enemies enough so they are on the
// screen. Don't center on them because they're usually on the edge and we don't want to go off the edge. … When we're done
// looking at the things that have been added, we're going to focus and center on the first hero that's activated."). The item's
// expect, on the BUILT sandbox (BATTLE-SANDBOX.html?play=encounter.opening.orphanage): "at the start of Turn 2 the view slides
// right until the Zombie arriving at the right edge is just inside it, the Zombie drops in while the view is there, and the
// view then centres on the hero whose Activation begins". The player ends Turn 1 and the board plays by its own clock; the
// view is read at every tick, against the ENGINE's own battle: who arrived and where, and who acts first in Turn 2.
// Prints one line per check and `arrivals-camera: … passed`.
import assert from 'node:assert/strict'
import {bootSlice} from './atlas-dom.mjs'
const {w}=bootSlice(process.argv[2]??'BATTLE-SANDBOX.html',{search:'?play=encounter.opening.orphanage'}),h=w.__sandbox
const V=()=>h.viewer._V,ctx=()=>h.session.ctx,unit=id=>ctx().state.units[id]
const say=(...a)=>console.log('  '+a.join(' '))
const settle=()=>{for(let i=0;i<8000&&(h.busy||i<3);i++)w._flush(20);assert.equal(h.busy,false,'the board settles');assert.equal(h.fault,'','no fault')}
settle()
assert.equal(ctx().state.turn,1);const had=new Set(ctx().state.units.map(u=>u.id)),start={...V().camTarget}
// the player ends Turn 1; the Enemy Phase plays, then Turn 2 begins with a wave
V().dom.root.querySelector('#playEndTurn').handlers.click({});const ask=V().dom.root.querySelector('#playAsk');if(ask&&ask.style.display!=='none')V().dom.root.querySelector('#playAskYes').handlers.click({})
let held=0,xs=[],seen=null
for(let i=0;i<12000&&(h.busy||i<3);i++){w._flush(20)
 const s=V().arrivalsShown
 if(V().holds&&V().holds.has('arrivals')){held++;assert.equal(h.busy,true,'the host is busy while the view shows the arrival')}
 if(s&&s.length&&!seen)seen={...s[0],pose:{...s[0].pose}}
 xs.push(V().camShown.x)
 const p=V().camShown,b=V().view.panBox;assert.ok(V().view.noVoid===true&&p.x>=b.x[0]-.01&&p.x<=b.x[1]+.01,'the view never leaves the board')}
assert.equal(h.busy,false);assert.equal(h.fault,'');assert.equal(ctx().state.turn,2)
// 1. the engine: one unit arrived, on the board's right edge
const came=ctx().state.units.filter(u=>!had.has(u.id));assert.equal(came.length,1,'one unit arrived at the Start of Turn 2')
const z=came[0],g=ctx().geo;assert.equal(g.colOf(z.hex),g.board.width-1,'on the board\'s right edge')
say(`1 the engine: ${z.name} arrived at the Start of Turn 2 on hex ${z.hex} (column ${g.colOf(z.hex)}, row ${g.rowOf(z.hex)}), the right edge`)
// 2. the view went to it: slid right, the zoom and the angle kept, not centred on it, and its drop-in played with the view there
assert.ok(seen,'its drop-in played');assert.equal(seen.id,z.id);assert.equal(seen.side,'right')
const at=V().data.POS[z.hex]
assert.ok(seen.pose.x>start.x+100,`the view slid right (${Math.round(start.x)} -> ${Math.round(seen.pose.x)})`)
assert.deepEqual([seen.pose.zoom,seen.pose.yaw,seen.pose.tilt],[start.zoom,start.yaw,start.tilt],'the zoom and the angle are unchanged')
assert.ok(Math.hypot(seen.pose.x-at.px,seen.pose.y-at.py)>300,'never centred on the arrival')
/* Law 10, 2026-10-04 (viewer.camera-shows-edge-units; engine DECISIONS.md 2026-10-04 'the view may slide past the board's edge to
   show a unit on an edge column', Andrew: "1 yes"): was
     assert.ok(Math.abs(seen.pose.x-V().view.panBox.x[1])<.01,'as far right as the camera may go: the board\'s edge')
   with the FINDING below it that the arrival's hex on the last column stayed part off the screen. Tightened to the item's
   expect: the arriving Zombie is shown WHOLE when its drop-in plays — no bubble stands for it, the page's own slide has
   nothing more to do for its hex — and the view is inside the camera's one bound, past the board's own box only on that side */
assert.equal(seen.inView,true,'no bubble stood for the arrival when its drop-in played')
assert.equal(V().revealPan(seen.pose,z.hex),null,'the arrival\'s whole hex was inside the view')
{const B=V().cameraBound();assert.ok(seen.pose.x<=B.bound.x[1]+.01&&seen.pose.x>B.own.x[1],'the view passed the board\'s right edge, inside its bound')}
assert.ok(held>20,`the board waited on the slide and the hold (${held} ticks held)`)
say(`2 the view slid right ${Math.round(seen.pose.x-start.x)} board px, past the board's edge by the least that shows the arrival whole, the zoom and the angle kept, ${Math.round(Math.hypot(seen.pose.x-at.px,seen.pose.y-at.py))} px from centring on it; ${z.name} dropped in with the view there; the board waited ${held} ticks`)
say(`  its hex on the last column is whole on the screen — its middle at ${Math.round(seen.screen.x)}, ${Math.round(seen.screen.y)} of the battle area (was a FINDING until 2026-10-04: the old bound kept it part off the screen)`)
// 3. then the first hero of Turn 2: the view centred on it (across; the board's edge holds what it must)
const actor=ctx().battleCursor.actor,me=unit(actor);assert.equal(me.side,'hero');assert.equal(ctx().battleCursor.at,'acting')
/* 2026-10-04 (viewer.camera-shows-edge-units): a centring is held to the board's OWN box (view.boardBox — was view.panBox, which
   was that box until the bound grew past it), then slid the least that shows the unit whole; this hero stands inside the board */
const c=V().camTarget,box=V().view.boardBox,want=Math.min(box.x[1],Math.max(box.x[0],V().data.POS[me.hex].px))
assert.ok(Math.abs(c.x-want)<.5,`the view is centred on ${me.name} (${c.x.toFixed(1)} against ${want.toFixed(1)})`)
assert.ok(xs.some(x=>x>c.x+50),'it came back from the right')
say(`3 then the view centred on ${me.name}, whose Activation begins Turn 2`)
console.log(`arrivals-camera: the Orphanage on the built sandbox — the slide to the arrival's side, its drop-in with the view there, the wait and the hero's centring passed; the arrival's own hex is ${seen.inView?'whole in the view':'NOT inside the view'}`)
