// viewer.move-cost-on-hex (engine DECISIONS.md 2026-10-05 'playtest post: ...', Andrew: "When you are in the movement phase, if
// there are squares in your movement area that cost 2 or can't be walked through, that number needs to be on the square.";
// 'seven answers: ... an X on a hex that cannot be walked ...': "6, yes"). The item's expect, on the BUILT sandbox, over the
// opening battles as they open (BATTLE-SANDBOX.html?play=<encounter>): "choosing a walking hero's move shows 2 on each cost-2
// hex in its area and an X on an impassable hex beside it, and nothing on plain hexes; a flying unit's area shows no numbers;
// the marks clear when the move is made."
// Read against the page's own battle: every mark the board draws is the play input's fact, the fact names every hex bordering
// the area that the engine's field says cannot be entered or costs more, and after a step the marks are the new area's.
// Prints one line per reading and `move-cost-on-hex: ... passed`.
import assert from 'node:assert/strict'
import {bootSlice} from './atlas-dom.mjs'
import {shownName} from '../../viewer/src/names.js'
const PAGE=process.argv[2]??'BATTLE-SANDBOX.html'
const ENCOUNTERS=['orphanage','lumberjack','bridge','cavern-trail','gates','cathedral'].map(n=>'encounter.opening.'+n)
const say=(...a)=>console.log('  '+a.join(' '))
function open(encounter){
 const {w}=bootSlice(PAGE,{search:'?play='+encounter}),h=w.__sandbox
 const V=()=>h.viewer._V,ctx=()=>h.session.ctx,unit=id=>ctx().state.units[id]
 const settle=()=>{for(let i=0;i<8000&&(h.busy||i<3);i++)w._flush(20);assert.equal(h.busy,false,'the board settles');assert.equal(h.fault,'','no fault')}
 const marks=cls=>V().layers.play?V().layers.play.querySelectorAll('.'+cls).map(n=>({hex:+n.dataset.hex,text:n.textContent})).sort((a,b)=>a.hex-b.hex):[]
 settle()
 return {w,h,V,ctx,unit,settle,marks,acting:()=>{const c=ctx().battleCursor;return c&&c.at==='acting'?c.actor:null}}
}
/** what the board draws is what the play input said: an X where the cost is null, the number where it is more than one, nothing else */
function drawnAsSaid(S,when){
 const P=S.V().play,border=P.reachBorder||[]
 assert.deepEqual(S.marks('playBlocked'),border.filter(c=>c.cost===null).map(c=>({hex:c.hex,text:'X'})),when+': an X on exactly the hexes the host says cannot be entered')
 assert.deepEqual(S.marks('playCostNear'),border.filter(c=>c.cost!==null&&c.cost>1).map(c=>({hex:c.hex,text:String(c.cost)})),when+': its number on exactly the bordering hexes that cost more than one')
 assert.deepEqual(S.marks('playCost'),(P.reachCost||[]).filter(c=>c.cost>1).map(c=>({hex:c.hex,text:String(c.cost)})).sort((a,b)=>a.hex-b.hex),when+': the grid\'s own numbers')
 return border}

let read=0,xs=0,twos=0,found=null
for(const encounter of ENCOUNTERS){
 const S=open(encounter)
 for(let i=0;i<8;i++){
  const a=S.acting();if(a===null)break
  const P=S.V().play,u=S.unit(a)
  if(P.reach.length&&(P.reachCost||[]).length){
   const border=drawnAsSaid(S,`${encounter} ${u.name}`),F=S.V().data.F,area=new Set([u.hex,...P.reach]),taken=new Set(S.ctx().state.units.filter(x=>x.lifeState!=='dead').map(x=>x.hex))
   /* the area, the border and the engine's field: every bordering hex of ground that cannot be entered is an X; one whose ground costs more carries at least that */
   for(const c of border){assert.ok(!area.has(c.hex)&&!taken.has(c.hex),`${encounter}: bordering hex ${c.hex} is outside the area and nobody stands on it`)
    assert.ok(S.ctx().geo.neighbours(c.hex).some(n=>area.has(n)),`${encounter}: hex ${c.hex} borders the area`)
    if(F.passable[c.hex]===false)assert.equal(c.cost,null,`${encounter}: hex ${c.hex} (${F.terrainIds[c.hex]}) cannot be entered: an X`)
    else if(c.cost!==null)assert.ok(c.cost>=F.moveCost[c.hex],`${encounter}: hex ${c.hex} costs at least its ground's ${F.moveCost[c.hex]}`)}
   const X=border.filter(c=>c.cost===null),two=border.filter(c=>c.cost!==null&&c.cost>1)
   xs+=X.length;twos+=two.length;read++
   if(!found&&X.length&&(two.length||P.reachCost.some(c=>c.cost>1)))found={encounter,S,a,X,two}
  }
  S.V().dom.root.querySelector('#playEndAct').handlers.click({});S.settle()
  if(S.acting()===a)break
 }
}
assert.ok(read>=8,'the movement areas of the opening\'s heroes were read: '+read);assert.ok(xs>0,'an X is drawn somewhere');assert.ok(twos>0,'a bordering number is drawn somewhere')
say(`${read} heroes' movement areas over the six opening battles: ${xs} X(s) on hexes that cannot be entered, ${twos} number(s) on bordering hexes that cost more - each the play input's own fact`)

// one hero with both: the expect's sentence, then a step - the marks are the new area's, and a move with no walk shows none
{const S=open(found.encounter)
 while(S.acting()!==found.a){S.V().dom.root.querySelector('#playEndAct').handlers.click({});S.settle()}
 const u=S.unit(found.a),P=S.V().play,F=S.V().data.F
 const before=drawnAsSaid(S,'the hero found'),X=before.filter(c=>c.cost===null)
 assert.ok(X.length>0);const dear=[...P.reachCost.filter(c=>c.cost>1),...before.filter(c=>c.cost!==null&&c.cost>1)]
 const plain=P.reachCost.filter(c=>c.cost===1);for(const c of plain)for(const cls of ['playCost','playCostNear','playBlocked'])assert.ok(!S.marks(cls).some(m=>m.hex===c.hex),'a plain hex carries nothing')
 say(`${found.encounter.replace('encounter.opening.','')}, ${shownName(u.name)}: an X on ${X.map(c=>c.hex+' ('+F.terrainIds[c.hex].replace('terrain.','')+')').slice(0,4).join(', ')}${X.length>4?' …':''}; ${dear.length} hex(es) numbered; ${plain.length} plain hexes carry nothing`)
 /* the move made: one step - the area is another, and the marks are that area's (the old ones are gone with the old facts) */
 const hexBtn=x=>S.V().dom.stage.querySelectorAll('.playHex').find(n=>+n.dataset.hex===x),dest=plain.length?plain[0].hex:P.reach[0],was=JSON.stringify(before)
 hexBtn(dest).handlers.click({detail:1});hexBtn(dest).handlers.click({detail:2});S.settle()
 assert.equal(u.hex,dest,'the hero stepped')
 /* whoever's move is being chosen now (the hero again, with what movement it has left - or the next unit, if that step ended its Activation): the marks are that area's, and none of the old area's is left over */
 const after=drawnAsSaid(S,'after the step');assert.notEqual(JSON.stringify(after),was,'the border is the new area')
 say(`after a step to hex ${dest}: the marks are the new area's (${after.filter(c=>c.cost===null).length} X, ${after.filter(c=>c.cost!==null&&c.cost>1).length} numbered; ${S.acting()===found.a?'the same hero, with the movement it has left':'the next unit, choosing its move'})`)
 /* a move that walks no path (a leap, a flight): no numbers, no X */
 const pathless=u.actions.find(id=>{const row=S.ctx().actions[id];return row&&row.move&&row.move.shape!=='path'&&S.V().dom.actionbar.querySelectorAll('.acRow').some(r=>r.dataset.act===id)})
 if(pathless&&S.acting()===found.a){S.V().offerPlay({kind:'slot',actionId:pathless,unit:found.a});S.settle()
  if(S.V().play.slot===pathless){for(const cls of ['playCost','playCostNear','playBlocked'])assert.deepEqual(S.marks(cls),[],`${S.ctx().actions[pathless].name}: no ${cls}`)
   say(`${S.ctx().actions[pathless].name} chosen (it walks no path): no number and no X`)}}
}
console.log(`move-cost-on-hex: on the built sandbox, every X and every bordering number is the engine's answer for the acting hero, plain hexes carry nothing, and the marks follow the move - passed`)
