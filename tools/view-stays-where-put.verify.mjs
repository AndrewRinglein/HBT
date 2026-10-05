// viewer.view-stays-where-put (engine DECISIONS.md 2026-10-05 'the battle screen must feel smooth: … the view goes back to the
// acting unit', Andrew: "It's awkward to try to roll the map around … Things are not on the screen."; ruled 2026-10-01: "You can
// look at different parts of the map by just looking around on the map"). The item's expect, on the BUILT sandbox
// (BATTLE-SANDBOX.html?play=encounter.opening.bridge): "On the built page's Bridge, scrolled a screen away from the acting
// hero: a wheel notch zooms where the view is and the hero stays off the screen; clicking an enemy there shows its panel and
// the view does not move; pointing at hexes and clicking one does not move it; ending the Activation centres on the next
// hero; an enemy's attack on a hero off the screen brings both ends into view as now; a page test reads each."
// Read against the ENGINE too: looking sends nothing — the battle's sequence number and whose Activation it is are what they were.
// Prints one line per check and `view-stays-where-put: … passed`.
import assert from 'node:assert/strict'
import {bootSlice} from './atlas-dom.mjs'
const {w}=bootSlice(process.argv[2]??'BATTLE-SANDBOX.html',{search:'?play=encounter.opening.bridge'}),h=w.__sandbox
const V=()=>h.viewer._V,ctx=()=>h.session.ctx,unit=id=>ctx().state.units[id]
const say=(...a)=>console.log('  '+a.join(' '))
const settle=()=>{for(let i=0;i<8000&&(h.busy||i<3);i++)w._flush(20);assert.equal(h.busy,false,'the board settles');assert.equal(h.fault,'','no fault')}
const fire=(node,type,extra={})=>{for(const f of node.listeners?.[type]||[])f({detail:1,button:0,stopPropagation(){},preventDefault(){},...extra})}
const pose=()=>({x:V().camTarget.x,y:V().camTarget.y}),far=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y)
/** is this hex whole on the screen from where the view stands? (the camera's own reading: nothing to slide to show it) */
const inView=hex=>V().revealPan(V().camTarget,hex)===null
const glide=()=>w._flush(1300)
settle();glide()
const acting=()=>ctx().battleCursor.actor
/* the player scrolls: the map moved by hand, a step at a time as the edge scroll moves it, until the acting hero is a screen away */
function scrollAway(){
 const from=pose(),hex=unit(acting()).hex
 for(const dir of [1,-1]){for(let i=0;i<200&&(inView(hex)||far(pose(),from)<700);i++){const was=pose();h.viewer.pan(dir*40,0);if(far(pose(),was)<.5)break}if(!inView(hex))break}
 glide();return far(pose(),from)
}

// 0. the Bridge opens on the hero who acts
const hero=acting();assert.equal(unit(hero).side,'hero');assert.ok(inView(unit(hero).hex),'the battle opens with the acting hero on the screen')
const seq=ctx().state.seq
// 1. scrolled away: the hero is off the screen, and a redraw leaves the view there
const gone=scrollAway();assert.ok(gone>400,`scrolled ${gone.toFixed(0)} px`);assert.ok(!inView(unit(hero).hex),'the acting hero is off the screen')
const put=pose()
V().render();glide();assert.deepEqual(pose(),put,'a redraw keeps the view where the player put it')
say(`1 scrolled ${Math.round(gone)} board px from ${unit(hero).name}, who is off the screen; a redraw leaves the view there`)
// 2. a notch of the wheel zooms where the view is
const wrap=V().dom.stage.parentNode,zoom=V().camTarget.zoom
fire(wrap,'wheel',{deltaY:-300});w._flush(200)
assert.ok(V().view.cam.zoom>1,'the wheel looked nearer');assert.ok(far(pose(),put)<1,`about the view's own centre: ${far(pose(),put).toFixed(2)} px`);assert.ok(!inView(unit(hero).hex),'the hero stays off the screen')
w._flush(2500);assert.ok(far(pose(),put)<1&&Math.abs(V().camTarget.zoom-zoom)<1e-6,'the zoom back at the standard, the view still there')
say(`2 a notch of the wheel zoomed where the view was (it moved ${far(pose(),put).toFixed(2)} px) and ${unit(hero).name} stayed off the screen`)
// 3. clicking an enemy there shows its panel and the view does not move
const enemy=ctx().state.units.find(u=>u.side==='enemy'&&u.lifeState!=='dead'&&inView(u.hex))??ctx().state.units.find(u=>u.side==='enemy'&&u.lifeState!=='dead')
/* the click as the board makes it (viewer src/board.js clickUnit): the panel shows whoever was clicked, and the click is offered to the host */
h.viewer.inspect(enemy.id);V().offerPlay({kind:'unit',id:enemy.id,hex:enemy.hex});settle();glide()
assert.equal(V().view.inspectId,enemy.id,'the panel is the enemy\'s');assert.deepEqual(pose(),put,'and the view did not move')
assert.deepEqual([ctx().state.seq,acting()],[seq,hero],'looking sent nothing: the engine\'s battle is where it was')
say(`3 clicked ${enemy.name}: its panel shows, the view did not move, the engine's battle is untouched`)
// 4. pointing at hexes and clicking one does not move it
const g=ctx().geo,seen=[];for(let x=0;x<g.board.width*g.board.height&&seen.length<4;x++)if(inView(x)&&!ctx().state.units.some(u=>u.hex===x&&u.lifeState!=='dead'))seen.push(x)
assert.ok(seen.length>=2,'open hexes on the screen')
for(const x of seen){V().offerPlay({kind:'point',hex:x});settle()}
assert.deepEqual(pose(),put,'pointing at hexes')
V().offerPlay({kind:'hex',hex:seen[0]});settle();glide()
assert.deepEqual(pose(),put,'clicking one');assert.equal(acting(),hero)
say(`4 pointed at ${seen.length} hexes and clicked one: the view did not move`)
// 5. ending the Activation centres on the one that begins
V().offerPlay({kind:'back'});settle()
V().dom.root.querySelector('#playEndAct').handlers.click({});settle();glide()
const next=acting();assert.notEqual(next,hero,'another unit\'s Activation')
if(unit(next).side==='hero'){assert.equal(V().view.centredOn,next,'the camera took the hero that begins');assert.ok(inView(unit(next).hex),'and it is on the screen')}
assert.ok(far(pose(),put)>1,'the view moved for the new Activation')
say(`5 End activation: the view went to ${unit(next).name}, who acts next`)
// 6. an enemy's attack on a hero off the screen brings its ends into view, as it always did
/* the player puts the view away again and ends the Turn; whatever the enemies then do is the page's own battle on its own seed */
const aims=[];let turns=0
const endTurn=()=>{V().dom.root.querySelector('#playEndTurn').handlers.click({});const ask=V().dom.root.querySelector('#playAsk');if(ask&&ask.style.display!=='none')V().dom.root.querySelector('#playAskYes').handlers.click({})}
for(;turns<8&&!aims.length&&ctx().state.outcome===null;turns++){
 settle();glide();scrollAway();const away=pose();let last=null
 endTurn()
 for(let i=0;i<8000&&(h.busy||i<3);i++){w._flush(20);const A=V().S.AIM,key=A?A.from+'>'+A.to:null
  if(key&&key!==last)aims.push({from:A.from,to:A.to,one:inView(A.from)||inView(A.to),both:inView(A.from)&&inView(A.to),moved:far(pose(),away)})
  last=key}
 assert.equal(h.fault,'','no fault')}
assert.ok(aims.length>0,`an attack was drawn within ${turns} Enemy Phases of the Bridge`)
for(const a of aims)assert.ok(a.one,`an attack drawn from hex ${a.from} to hex ${a.to} has an end of it on the screen`)
assert.ok(aims.some(a=>a.both),'and of one at least both ends are on the screen')
say(`6 the view put away before each Enemy Phase: in Turn ${ctx().state.turn-1}'s, ${aims.length} attack${aims.length===1?' was':'s were'} drawn — each with an end on the screen, ${aims.filter(a=>a.both).length} with both (the view had moved ${Math.round(Math.max(...aims.map(a=>a.moved)))} px at the most for them)`)
// 7. and the next hero's Activation has the view
settle();glide()
if(ctx().state.outcome===null&&unit(acting()).side==='hero'){assert.ok(inView(unit(acting()).hex),'the hero who acts is on the screen');say(`7 Turn ${ctx().state.turn}: the view is on ${unit(acting()).name}, who acts`)}
console.log('view-stays-where-put: the Bridge on the built sandbox, the expect line passed')
