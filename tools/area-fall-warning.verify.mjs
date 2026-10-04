// viewer.area-fall-warning (engine DECISIONS.md 2026-10-03 'the opening replays show the heroes winning; one recording of each;
// the fall warnings are drawn': asked whether to draw the meteor and curse warning areas on the board — Andrew: "Two, yes.").
// On the BUILT sandbox (BATTLE-SANDBOX.html?play=encounter.opening.cavern-trail) the battle is played by the page's own End
// Turn with the heroes idle — no seed sought — until the engine marks the meteor fall; the marks on the board are then read
// against the ENGINE's own battle (its encounter state's marked areas), Turn by Turn until they land, when the marks go and
// the engine's layer is on those hexes.
// Prints one line per step and `area-fall-warning: … passed`.
import assert from 'node:assert/strict'
import {bootSlice} from './atlas-dom.mjs'
const {w}=bootSlice(process.argv[2]??'BATTLE-SANDBOX.html',{search:'?play=encounter.opening.cavern-trail'}),h=w.__sandbox
const V=()=>h.viewer._V,ctx=()=>h.session.ctx,$=id=>V().dom.root.querySelector('#'+id)
const say=(...a)=>console.log('  '+a.join(' '))
const settle=()=>{for(let i=0;i<30000&&(h.busy||i<3);i++)w._flush(20);assert.equal(h.busy,false,'the board settles');assert.equal(h.fault,'','no fault')}
const marks=()=>V().dom.stage.querySelectorAll('.fallMark')
const drawn=()=>marks().map(n=>+n.dataset.hex).sort((a,b)=>a-b)
/** the engine's own record of what is marked and not yet landed */
const engineMarked=()=>ctx().state.encounter?.marked??[]
const hexesOf=ms=>[...new Set(ms.flatMap(m=>m.areas.flat()))].sort((a,b)=>a-b)
const landed=()=>ctx().events.filter(e=>e.type==='area.landed')
function endTurn(){
 const end=$('playEndTurn');assert.ok(end&&end.getAttribute('aria-disabled')==='false','End Turn may be given')
 end.handlers.click({});const ask=$('playAsk'),yes=$('playAskYes');if(yes&&ask&&ask.style.display!=='none')yes.handlers.click({})
 settle()
}
/** the board against the engine: every hex the engine holds marked is drawn, once, and no other */
function check(when){
 const live=engineMarked().filter(m=>!landed().some(l=>l.fall===m.fall&&l.turn===m.lands))
 assert.deepEqual(drawn(),hexesOf(live),when+': the marks on the board are the engine\'s marked hexes')
 assert.deepEqual(V().S.falls.map(f=>[f.fall,f.lands]),live.map(m=>[m.fall,m.lands]),when+': the fold holds the engine\'s falls')
 return live
}

settle();check('the battle opens');assert.equal(marks().length,0)
say('1 the Cavern Trail opens: nothing is marked, nothing is drawn')
// 2. the heroes stand idle until the engine marks the fall
let live=[]
for(let n=0;n<10&&!ctx().state.outcome&&!live.length;n++){endTurn();live=check('Turn '+ctx().state.turn)}
assert.ok(live.length,'the engine marked the meteor fall'+(ctx().state.outcome?' (the battle ended '+ctx().state.outcome+' first)':''))
const M=live[0],hexes=hexesOf(live),markEvent=ctx().events.find(e=>e.type==='area.marked')
assert.equal(M.areas.length,7);assert.equal(markEvent.lands,M.lands)
for(const n of marks()){assert.equal(n.dataset.fall,M.fall);assert.equal(+n.dataset.lands,M.lands)}
assert.ok(V().data.LAYER_STATUS[markEvent.layer],'what will land applies a status');for(const n of marks())assert.match(n.dataset.hue,/^#[0-9a-f]{6}$/i)
say(`2 marked at the end of Turn ${markEvent.turn}'s Enemy Phase: ${M.areas.length} areas, ${hexes.length} hexes drawn on the board, to land after the Hero Phase of Turn ${M.lands} (${markEvent.layer.replace('layer.','')})`)
// 3. the marks stand while the player plays, and are gone when the engine lands them
assert.equal(ctx().state.turn,M.lands,'the Hero Phase the fall lands after has begun');assert.equal(landed().length,0)
V().offerPlay({kind:'point',hex:hexes[0]});settle();check('while the player plays')
if(!ctx().state.outcome){endTurn()
 assert.equal(landed().length,1,'the engine landed the fall after that Hero Phase');check('after the landing');assert.equal(marks().length,0,'the marks are gone')
 const layerNo=+Object.keys(V().data.LAYERS).find(n=>V().data.LAYERS[n]===markEvent.layer)
 for(const x of hexes)assert.equal(V().S.layers[x],layerNo,'hex '+x+' wears what landed')
 say(`3 landed: the marks are gone and the ${hexes.length} hexes are ${markEvent.layer.replace('layer.','')}; the engine struck ${landed()[0].hit.length} unit${landed()[0].hit.length===1?'':'s'}`)}
console.log('area-fall-warning: the marked areas are drawn from the mark until they land on the built sandbox — passed')
