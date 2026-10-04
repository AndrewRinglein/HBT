// viewer.move-cost-on-grid (engine DECISIONS.md 2026-10-03 'size and shadows are the default; the bleeding-out card; switching
// heroes asks first; movement costs on the grid; a tooltip on every hex', Andrew: "When the movement grid is up (the blue
// movement grid on the board), tiles that require extra movement points should have that movement cost, I think, maybe on
// them in gray."). The item's expect, on the BUILT sandbox (BATTLE-SANDBOX.html?play=encounter.opening.orphanage): "with a
// hero's blue movement grid up, each such tile in reach shows its cost in grey and the open tiles show none; the number is
// the one the engine charges when the hero walks there." Read against the ENGINE's own battle: the hero's movement before
// and after it steps onto a numbered tile.
// Prints one line per step and `move-cost-on-grid: … passed`.
import assert from 'node:assert/strict'
import {bootSlice} from './atlas-dom.mjs'
const {w}=bootSlice(process.argv[2]??'BATTLE-SANDBOX.html',{search:'?play=encounter.opening.orphanage'}),h=w.__sandbox
const V=()=>h.viewer._V,ctx=()=>h.session.ctx,unit=id=>ctx().state.units[id]
const say=(...a)=>console.log('  '+a.join(' '))
const settle=()=>{for(let i=0;i<8000&&(h.busy||i<3);i++)w._flush(20);assert.equal(h.busy,false,'the board settles');assert.equal(h.fault,'','no fault')}
const acting=()=>{const c=ctx().battleCursor;assert.equal(c.at,'acting');return c.actor}
const hexBtn=x=>V().dom.stage.querySelectorAll('.playHex').find(n=>+n.dataset.hex===x)
const walkTo=dest=>{hexBtn(dest).handlers.click({detail:1});hexBtn(dest).handlers.click({detail:2});settle()}
const numbers=()=>V().layers.play?V().layers.play.querySelectorAll('.playCost').map(n=>({hex:+n.dataset.hex,text:n.textContent})):[]
const tiles=()=>V().layers.play?V().layers.play.querySelectorAll('.playReach').map(n=>+n.dataset.hex):[]
const terrainId=x=>V().data.F.terrainIds[x]

settle()
// 1. find the hero whose movement grid holds ground that costs extra (the screen's own order; End activation moves on)
let who=null
for(let i=0;i<6&&who===null;i++){
 const a=acting(),P=V().play
 if(P.reach.length&&(P.reachCost||[]).some(c=>c.cost>1))who=a
 else{V().dom.root.querySelector('#playEndAct').handlers.click({});settle()}
}
assert.notEqual(who,null,'a hero of the Orphanage\'s party has costly ground in its movement grid')
const U=unit(who),P=V().play
assert.deepEqual(tiles().sort((a,b)=>a-b),[...P.reach].sort((a,b)=>a-b),'the blue grid is up')
// 2. each tile that costs more than one shows its cost; the tiles that cost one show none
const dear=P.reachCost.filter(c=>c.cost>1),plain=P.reachCost.filter(c=>c.cost===1)
assert.ok(dear.length&&plain.length)
assert.deepEqual(numbers().sort((a,b)=>a.hex-b.hex),dear.map(c=>({hex:c.hex,text:String(c.cost)})).sort((a,b)=>a.hex-b.hex),'a number on exactly the tiles that cost more than one')
const grounds=[...new Set(dear.map(c=>terrainId(c.hex).replace('terrain.','')+' '+c.cost))]
say(`1 ${U.name}'s movement grid: ${P.reach.length} tiles, ${dear.length} carry a number (${grounds.join(', ')}), ${plain.length} cost one and carry none`)
// 3. the number is the one the engine charges: step onto a numbered tile (walking to the hex before it first), and read the
//    hero's movement in the engine's battle before and after
const target=dear[0]
V().offerPlay({kind:'point',hex:target.hex});settle()
const path=V().play.path;assert.equal(path[path.length-1],target.hex,'the engine\'s walk to the tile')
const before=path[path.length-2]
if(before!==U.hex){walkTo(before);assert.equal(U.hex,before);assert.equal(acting(),who)}
if(!V().play.reach.includes(target.hex)){const mv=U.actions.find(id=>{const a=ctx().actions[id];return a.move&&!a.attack});V().offerPlay({kind:'slot',actionId:mv,unit:who});settle()}
const shown=numbers().find(n=>n.hex===target.hex);assert.ok(shown,'the tile still carries its number from the hex beside it')
const left=U.movePointsLeft
walkTo(target.hex)
assert.equal(U.hex,target.hex,`${U.name} stepped onto hex ${target.hex}`)
assert.equal(left-U.movePointsLeft,+shown.text,'the engine took exactly the number on the tile from its movement')
say(`2 ${U.name} stepped onto hex ${target.hex} (${terrainId(target.hex).replace('terrain.','')}), numbered ${shown.text}: the engine's movement left went ${left} -> ${U.movePointsLeft}`)
console.log('move-cost-on-grid: the movement grid\'s numbers are the engine\'s charge for each tile on the built sandbox — passed')
