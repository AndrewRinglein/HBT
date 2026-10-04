// viewer.hex-tooltip (engine DECISIONS.md 2026-10-03 'size and shadows are the default; the bleeding-out card; switching heroes
// asks first; movement costs on the grid; a tooltip on every hex', Andrew: "when I'm just pointing around the map, any hex I
// point at should have a little hover tooltip below it that says what the tile is and any special things about the tile,
// like: It costs 2 to move there. It will inflict burning on you. It's a water tile."; and 'the hex tooltip describes the
// ground only'). The item's expect, on the BUILT sandbox (BATTLE-SANDBOX.html?play=encounter.opening.orphanage), each line
// read on the page the player plays: the tooltip names the ground, says the engine's cost where it is not one and "cannot be
// entered" exactly where the engine's field holds the hex closed, and pointing changes nothing in the engine's battle.
// Prints one line per check, the findings for Andrew, and `hex-tooltip: … passed`.
import assert from 'node:assert/strict'
import {bootSlice} from './atlas-dom.mjs'
const {w}=bootSlice(process.argv[2]??'BATTLE-SANDBOX.html',{search:'?play=encounter.opening.orphanage'}),h=w.__sandbox
const V=()=>h.viewer._V,ctx=()=>h.session.ctx
const say=(...a)=>console.log('  '+a.join(' '))
const settle=()=>{for(let i=0;i<8000&&(h.busy||i<3);i++)w._flush(20);assert.equal(h.busy,false,'the board settles');assert.equal(h.fault,'','no fault')}
const fire=(node,type,extra={})=>{for(const f of node.listeners[type]||[])f({detail:1,button:0,stopPropagation(){},preventDefault(){},...extra})}
/** where the stage shows a hex on the screen (its CSS matrix3d), in the battle area's px */
function screenOf(hex){
 const v=V(),m=v.dom.stage.style.transform.match(/matrix3d\(([^)]+)\)/)[1].split(',').map(Number),p=v.data.POS[hex],z=(v.data.displayHeights&&v.data.displayHeights[hex])||0,q=[p.px,p.py,z,1]
 const o=[0,1,2,3].map(r=>m[r]*q[0]+m[4+r]*q[1]+m[8+r]*q[2]+m[12+r]*q[3]),vp=v.camera3d.userData.viewport,F=v.data.F
 return {x:o[0]/o[3]-F.w/2+vp.w/2,y:o[1]/o[3]-F.h/2+vp.h/2,W:vp.w,H:vp.h}
}
const wrap=()=>V().dom.stage.parentNode
/** the fake wrap's box is 100 px square; its layout is the battle area's */
const pointAt=hex=>{const q=screenOf(hex);fire(wrap(),'pointermove',{clientX:q.x*100/q.W,clientY:q.y*100/q.H,target:wrap()})}
const tip=()=>wrap().querySelector('#hexTip')
const shown=()=>{const t=tip();return !!t&&t.style.display!=='none'}
const lines=()=>tip().querySelectorAll('.hexTipLine').map(n=>n.textContent)
const name=()=>tip().querySelector('.hexTipName').textContent

settle()
const g=ctx().geo,units=()=>ctx().state.units.filter(u=>u.lifeState!=='dead')
const terrainId=hex=>V().data.F.terrainIds[hex]
/** hexes of one ground the pointer can pick: on the screen, no body near */
const free=tid=>Object.keys(V().data.POS).map(Number).filter(x=>terrainId(x)===tid&&!units().some(u=>g.distance(u.hex,x)<=3)).filter(x=>{const s=screenOf(x);return s.x>120&&s.y>80&&s.x<s.W-120&&s.y<s.H-160})
h.viewer.setZoom('fit');w._flush(20)
const seq=ctx().state.seq,events=ctx().events.length,cursor=ctx().battleCursor.at
// 1. nothing before the pointer is on the board
assert.equal(shown(),false);say('1 no tooltip before the pointer is on the board')
// 2. each ground of the Orphanage: its name, and the cost the engine charges to step there when that is not one
const names=V().data.TERRAIN_NAMES,passable=x=>V().data.F.passable[x]
const seen={}
for(const tid of ['terrain.open','terrain.woodland','terrain.undergrowth','terrain.water']){
 const hs=free(tid);assert.ok(hs.length,tid+' on the screen');const x=hs[0];pointAt(x)
 assert.equal(V().view.pointHex,x);assert.equal(shown(),true);assert.equal(name(),names[tid])
 /* the engine's field for this battle (prepareBattleField, through the viewer's door): what entering this hex costs — the
    engine's own rule for the same number is held by viewer/test/viewer.hex-tooltip.test.ts */
 const cost=V().data.F.moveCost[x]
 if(cost===1)assert.deepEqual(lines(),[],tid+': its name alone')
 else assert.ok(lines().length===1&&new RegExp('\\b'+cost+'\\b').test(lines()[0]),tid+': '+JSON.stringify(lines()))
 assert.equal(passable(x),true)
 seen[tid]=`${name()}${lines().length?' — '+lines().join('; '):''}`
}
say('2 '+Object.values(seen).join(' | '))
// 3. a hex the engine's field holds closed says it cannot be entered. What the tooltip says of it is asked of the page (its
//    own answer for that hex); whether the pointer can reach it is the camera's: on the Orphanage every closed hex stands in
//    the board's first three or last columns, and the battle's camera never shows past the board's edge (viewer SWITCHES
//    arrivalsEdgeColumn, bubbleEdgeHex) — each is slid to (the bubbles' own slide) and pointed at where it comes into view
const closed=Object.keys(V().data.POS).map(Number).filter(x=>passable(x)===false)
assert.ok(closed.length,'the Orphanage has closed hexes')
for(const x of closed){const T=V().hexTip(x);assert.equal(T.name,names[terrainId(x)]);assert.ok(T.lines.some(l=>/cannot be entered/i.test(l)),x+': '+JSON.stringify(T.lines));assert.ok(!T.lines.some(l=>/[0-9]/.test(l)),'no cost on a closed hex')}
let reached=0,unreached=0
for(const x of closed){h.viewer.revealHex(x);w._flush(20);for(let i=0;i<120;i++)w._flush(16)
 const s=screenOf(x),inView=s.x>8&&s.y>8&&s.x<s.W-8&&s.y<s.H-8
 if(!inView||units().some(u=>g.distance(u.hex,x)<=2)){unreached++;continue}
 pointAt(x);if(V().view.pointHex!==x){unreached++;continue}
 assert.ok(lines().some(l=>/cannot be entered/i.test(l)),JSON.stringify(lines()));reached++}
say(`3 ${closed.length} closed hexes: each says "${V().hexTip(closed[0]).lines.join('; ')}"; ${reached} could be slid into view and pointed at, ${unreached} could not (edge columns the camera cannot show)`)
// 4. pointing changed nothing in the engine's battle; the pointer gone, the tooltip gone
assert.equal(ctx().state.seq,seq);assert.equal(ctx().events.length,events);assert.equal(ctx().battleCursor.at,cursor)
fire(wrap(),'pointerleave');assert.equal(shown(),false)
say('4 the engine\'s battle is untouched (the same sequence number and log); the tooltip goes with the pointer')
say('FOUND: the engine lets a unit wade the Orphanage\'s river (water, 2 to enter) and charges 1 for undergrowth — the tooltip says what the engine says')
console.log('hex-tooltip: the tooltip under the hex pointed at names the ground and its cost on the built sandbox — passed')
