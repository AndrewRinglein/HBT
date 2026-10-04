// viewer.camera-shows-edge-units (engine DECISIONS.md 2026-10-04 'the view may slide past the board's edge to show a unit on an edge
// column', Andrew, asked "For edge units, should the view be allowed to slide a little past the board's edge so they show
// fully?": "1 yes"). The item's expect, on the BUILT sandbox (BATTLE-SANDBOX.html?play=encounter.opening.orphanage): the
// Turn 2 Zombie arriving on the last column is shown whole when its drop-in plays; a bubble click on a unit in column 0 or
// column 19 brings its whole hex into view; the bottom corner hexes can be scrolled into view; the view never passes the edge
// by more than the bound. Measured off the stage as it is drawn (its CSS matrix), every hex corner against the battle area.
// (The arrival itself is tools/arrivals-camera.verify.mjs's; the browser's own picture of each edge is
// tools/camera-shows-edge-units.shot.mjs's.)
// Prints one line per check and `camera-shows-edge-units: … passed`.
import assert from 'node:assert/strict'
import {bootSlice} from './atlas-dom.mjs'
const {w}=bootSlice(process.argv[2]??'BATTLE-SANDBOX.html',{search:'?play=encounter.opening.orphanage'}),h=w.__sandbox
const V=()=>h.viewer._V,ctx=()=>h.session.ctx
const say=(...a)=>console.log('  '+a.join(' '))
const settle=()=>{for(let i=0;i<8000&&(h.busy||i<3);i++)w._flush(20);assert.equal(h.busy,false,'the board settles');assert.equal(h.fault,'','no fault')}
const glide=()=>{for(let t=0;t<1500;t+=16)w._flush(16)}
function screenAt(px,py,z){
 const v=V(),m=v.dom.stage.style.transform.match(/matrix3d\(([^)]+)\)/)[1].split(',').map(Number),q=[px,py,z,1]
 const o=[0,1,2,3].map(r=>m[r]*q[0]+m[4+r]*q[1]+m[8+r]*q[2]+m[12+r]*q[3]),vp=v.camera3d.userData.viewport,F=v.data.F
 return {x:o[0]/o[3]-F.w/2+vp.w/2,y:o[1]/o[3]-F.h/2+vp.h/2,W:vp.w,H:vp.h}
}
/** how far inside the battle area the WHOLE hex is: the least of its six corners' distances to the nearest edge */
function wholeBy(hex){
 const v=V(),p=v.data.POS[hex],L=v.data.LAYOUT,z=(v.data.displayHeights&&v.data.displayHeights[hex])||0
 return Math.min(...[[0,-L.H/2],[L.W/2,-L.H/4],[L.W/2,L.H/4],[0,L.H/2],[-L.W/2,L.H/4],[-L.W/2,-L.H/4]].map(([dx,dy])=>{const s=screenAt(p.px+dx,p.py+dy,z);return Math.min(s.x,s.y,s.W-s.x,s.H-s.y)}))
}
const inBound=what=>{const B=V().cameraBound(),c=V().camTarget;assert.ok(c.x>=B.bound.x[0]-.01&&c.x<=B.bound.x[1]+.01&&c.y>=B.bound.y[0]-.01&&c.y<=B.bound.y[1]+.01,what+': the view is inside the camera\'s one bound');return B}

settle();glide()
const g=ctx().geo,W=g.board.width,H=g.board.height,hexAt=(c,r)=>r*W+c
// 1. the bound: the board's own box, grown on the sides whose rim hexes need it
const B0=inBound('at the start');assert.equal(B0.past,null,'the battle opens with only board in view')
const grown={left:B0.own.x[0]-B0.bound.x[0],right:B0.bound.x[1]-B0.own.x[1],top:B0.own.y[0]-B0.bound.y[0],bottom:B0.bound.y[1]-B0.own.y[1]}
assert.ok(grown.left>1&&grown.right>1,'the edge columns need the view to pass the board\'s sides')
say(`1 the bound passes the board's own box by ${Math.round(grown.left)} px left, ${Math.round(grown.right)} right, ${Math.round(grown.top)} up, ${Math.round(grown.bottom)} down (board px) — what the outermost hexes need, in this battle area`)
// 2. a bubble's click on the Zombie standing on the last column: its whole hex comes into view
/* Law 10, combine 2026-10-04 (viewer master cf11722 with this copy's engine fix.opening-orphanage-closer-start; engine DECISIONS.md
   2026-10-04 '… a closer start': "bring the hero forward to the end of the bridge and bring the zombie left, maybe 3 squares"):
   this read
     const zombie=ctx().state.units.find(u=>u.side==='enemy');assert.equal(g.colOf(zombie.hex),W-1,'the Orphanage\'s first Zombie stands on the last column')
   — the battle's opening on the old start. By the ruling the first Zombie stands on (16,3). The check is of "a unit in
   column 0 or column 19", so the scene is the same battle one Turn on: the player ends Turn 1 (End Turn, as
   tools/arrivals-camera.verify.mjs does) and the Zombie the schedule brings in stands on the last column. The view is
   scrolled away to the left first, so the bubble's click has a slide to make. Every check below is unchanged. */
assert.equal(g.colOf(ctx().state.units.find(u=>u.side==='enemy').hex),W-4,'the Orphanage\'s first Zombie stands three hexes in from the last column (the closer start)')
V().dom.root.querySelector('#playEndTurn').handlers.click({});{const ask=V().dom.root.querySelector('#playAsk');if(ask&&ask.style.display!=='none')V().dom.root.querySelector('#playAskYes').handlers.click({})}
settle();glide()
assert.equal(ctx().state.turn,2,'Turn 2')
const zombie=ctx().state.units.find(u=>u.side==='enemy'&&u.lifeState==='standing'&&g.colOf(u.hex)===W-1);assert.ok(zombie,'the Turn 2 Zombie stands on the last column')
h.viewer.pan(-1e5,0);glide()
const seq=ctx().state.seq
V().clickBubble([zombie.id]);glide()
assert.ok(wholeBy(zombie.hex)>=0,`the Zombie's whole hex is on the screen (${wholeBy(zombie.hex).toFixed(1)} px inside)`);assert.equal(V().view.inspectId,zombie.id)
const B1=inBound('after the bubble\'s click');assert.ok(V().camTarget.x>B1.own.x[1],'the view passed the board\'s right edge to show it')
assert.notEqual(V().revealPan({...V().camTarget,x:V().camTarget.x-12},zombie.hex),null,'and by the least: a little less would cut the hex')
assert.equal(ctx().state.seq,seq,'the engine\'s battle is untouched')
say(`2 a bubble's click on ${zombie.name} (column ${W-1}): its whole hex is on the screen, ${wholeBy(zombie.hex).toFixed(0)} px inside at its worst corner; the view stands ${Math.round(V().camTarget.x-B1.own.x[1])} px past the board's own box`)
// 3. every hex of the first and last columns, and the bottom row, by the same slide
let worst=Infinity,n=0
for(let r=0;r<H;r++)for(const c of [0,W-1]){h.viewer.revealHex(hexAt(c,r));glide();const by=wholeBy(hexAt(c,r));assert.ok(by>=0,`(${c},${r}) whole: ${by.toFixed(1)}`);inBound(`(${c},${r})`);worst=Math.min(worst,by);n++}
for(let c=0;c<W;c++){h.viewer.revealHex(hexAt(c,H-1));glide();const by=wholeBy(hexAt(c,H-1));assert.ok(by>=0,`(${c},${H-1}) whole: ${by.toFixed(1)}`);inBound(`(${c},${H-1})`);worst=Math.min(worst,by);n++}
say(`3 ${n} hexes of the first and last columns and the bottom row: each brought whole into view by the slide (the worst corner ${worst.toFixed(0)} px inside)`)
// 4. the player's own scrolling: to each bottom corner — the corner hexes whole, the view on the bound and no further
for(const [dx,c] of [[-1e5,0],[1e5,W-1]]){h.viewer.pan(dx,1e5);glide()
 const B=inBound('scrolled to a bottom corner'),p=V().camTarget
 assert.ok(Math.abs(p.x-(dx<0?B.bound.x[0]:B.bound.x[1]))<.01&&Math.abs(p.y-B.bound.y[1])<.01,'the scroll stops on the bound\'s corner')
 for(const cc of dx<0?[0,1]:[W-3,W-2,W-1])assert.ok(wholeBy(hexAt(cc,H-1))>=0,`scrolled to the corner, hex (${cc},${H-1}) is whole (${wholeBy(hexAt(cc,H-1)).toFixed(1)})`)}
say(`4 scrolled to the bottom corners: hexes (0,${H-1}), (1,${H-1}) and (${W-3}..${W-1},${H-1}) are whole on the screen, the view on its bound`)
console.log('camera-shows-edge-units: the rim\'s hexes come whole into view and the view stays inside its one bound on the built sandbox — passed')
