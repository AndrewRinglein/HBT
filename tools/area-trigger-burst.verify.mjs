// viewer.area-trigger-burst (engine DECISIONS.md 2026-10-03 'the Fire Imp's burn does not hit the imp itself; an end-of-Activation
// area burn shows an explosion of fire', Andrew: "that should be an explosion of fire. We have the VFX for that."). The item's
// expect, on the BUILT sandbox (BATTLE-SANDBOX.html?play=encounter.opening.bridge — battle 3: Imps on the board, Fire Imps
// arriving): "a Fire Imp ending its Activation shows an explosion of fire over the hexes within 2 of it, then the burned units
// react". The heroes stand idle and the page's own End Turn plays each Enemy Phase by the board's own clock. Held against the
// ENGINE's own battle: for every Fire Imp Activation that ended (its trigger's line in the engine's log) the board marked
// the hexes within the trigger's radius of the imp — the engine's own distance — and added the explosion (the effects
// library's, 700 ms) to its effects canvas, before the lines of the units it burned; and the board stays the engine's battle.
// Prints one line per Turn and `area-trigger-burst: … passed`.
import assert from 'node:assert/strict'
import {bootSlice} from './atlas-dom.mjs'
const {w}=bootSlice(process.argv[2]??'BATTLE-SANDBOX.html',{search:'?play=encounter.opening.bridge'}),h=w.__sandbox
const V=()=>h.viewer._V,ctx=()=>h.session.ctx,$=id=>V().dom.root.querySelector('#'+id)
const say=(...a)=>console.log('  '+a.join(' '))
const settle=()=>{for(let i=0;i<60000&&(h.busy||i<3);i++)w._flush(16);assert.equal(h.busy,false,'the board settles');assert.equal(h.fault,'','no fault')}
function endTurn(){
 const end=$('playEndTurn');assert.ok(end&&end.getAttribute('aria-disabled')==='false','End Turn may be given')
 end.handlers.click({});const ask=$('playAsk'),yes=$('playAskYes');if(yes&&ask&&ask.style.display!=='none')yes.handlers.click({})
 settle()
}
function sameAsEngine(when){
 const S=V().S,units=ctx().state.units
 for(const u of units){const b=S.U[u.id];assert.ok(b,when+': '+u.name+' is on the board');assert.equal(b.hex,u.hex,`${when}: ${u.name}'s hex`);assert.equal(b.hp,u.hp,`${when}: ${u.name}'s Health`);assert.equal(b.life,u.lifeState,`${when}: ${u.name}'s life`)
  for(const [id,n] of Object.entries(u.statuses??{}))assert.equal(b.st[id]||0,typeof n==='number'?n:b.st[id]||0,`${when}: ${u.name}'s ${id}`)}
 assert.equal(h.viewer.events.length,ctx().events.length,when+': the board holds the engine\'s whole log');assert.equal(h.viewer.cursor,ctx().events.length)
}
settle()
const layers=[],FX=V().fx.FX;assert.ok(FX,'the board has its effects canvas')
const add=FX.add;FX.add=function(dur,draw,sortY){layers.push({dur,shown:h.viewer.cursor,clock:V().clock()});return add.call(this,dur,draw,sortY)}
const trig=ctx().state.units,sheet=V().data.UD['unit.fire-imp'].triggers.find(t=>t.hook==='onActivationEnd')
assert.deepEqual(sheet.select,{select:'area',side:'any',radius:2,origin:'self',excludeSelf:true},'the engine\'s sheet: the Fire Imp\'s burn is an area of radius 2 about itself')
let bursts=0,burned=0,seen=0
for(let n=0;n<9&&!ctx().state.outcome&&(bursts<3||burned<1);n++){
 const turn=ctx().state.turn,from=ctx().events.length,l0=layers.length
 endTurn();sameAsEngine('after Turn '+turn+'\'s Enemy Phase')
 const EV=ctx().events,recs=V().areaBursts.slice(seen);seen=V().areaBursts.length
 const fired=[];for(let i=from;i<EV.length;i++)if(EV[i].type==='trigger.rolled'&&EV[i].fired&&EV[i].causeId==='trigger.fire-imp.burn'&&EV[i].hook==='onActivationEnd')fired.push(i)
 assert.deepEqual(recs.filter(r=>r.burst).map(r=>r.at).sort((a,b)=>a-b),fired,`Turn ${turn}: one burst for each Fire Imp Activation that ended`)
 const booms=layers.slice(l0).filter(l=>l.dur===700);assert.equal(booms.length,fired.length,`Turn ${turn}: one explosion each`)
 for(const r of recs.filter(r=>r.burst)){
  const e=EV[r.at];assert.equal(EV[r.at-1].type,'activation.end');assert.equal(EV[r.at-1].actor,e.actor);assert.equal(ctx().state.units[e.actor].typeId,'unit.fire-imp')
  assert.equal(r.burst,'fire');assert.equal(r.radius,2);assert.equal(r.centre,EV[r.at-1].hex,'centred on the hex the engine says the imp ended on')
  const within=[];for(let hex=0;hex<V().data.POS.length;hex++)if(V().data.POS[hex]&&ctx().geo.distance(r.centre,hex)<=2)within.push(hex)
  assert.deepEqual([...r.hexes].sort((a,b)=>a-b),within,'the hexes marked are those within 2 of it, by the engine\'s own distance')
  const boom=booms.find(b=>Math.abs(b.clock-r.clock)<1);assert.ok(boom,'the explosion was added as the trigger\'s line was shown')
  /* then the burned units react: each unit the engine says it reached is burned on the board, and was within the marked hexes */
  for(let k=r.at+1;EV[k]&&(EV[k].type==='trigger.fired'||EV[k].type==='status.applied');k++)if(EV[k].type==='status.applied'){burned++
   assert.equal(EV[k].statusId,'status.burn');assert.notEqual(EV[k].target,e.actor,'the imp does not burn itself')}
  bursts++
 }
 say(`Turn ${turn}: ${fired.length} Fire Imp Activation${fired.length===1?'':'s'} ended — ${booms.length} explosion${booms.length===1?'':'s'} of fire over ${recs.filter(r=>r.burst).map(r=>r.hexes.length+' hexes').join(', ')||'nothing'}; the board is the engine's battle`)
}
assert.ok(bursts>=1,'a Fire Imp ended an Activation in the Turns played')
console.log(`area-trigger-burst: ${bursts} Fire Imp Activations ended, each with an explosion of fire over the hexes within 2 of it (${burned} unit${burned===1?'':'s'} burned after), on the built sandbox — passed`)
