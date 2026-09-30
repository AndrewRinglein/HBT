// viewer.opening-cast (PLAYABLE-OPENING-PLAN.md item 10; engine DECISIONS.md 2026-09-29 "the playable opening": "units are
// 3D models where one exists, else their token"). Expect: "Battles 2 and 3 play in the new screen with every unit shown
// as a model or its token, archers shooting and imps flying." The BUILT sandbox fields battle 2 (the Lumberjack House)
// and battle 3 (the Bridge) from the screen: every enemy and every drafted hero is a model in the pack the page carries,
// every civilian is its token and no model, every unit stands on its token; the battle is played from the screen's End
// Turn (the heroes forgo, the Enemy Phase plays beat by beat) until a Skeleton Archer has shot and an Imp has flown on
// the board — the Imp's traversal carries the engine power's flight shape, which the model draws as its flight.
import assert from 'node:assert/strict'
import {bootSlice} from './atlas-dom.mjs'
const {w,click}=bootSlice(process.argv[2]??'BATTLE-SANDBOX.html'),handle=w.__sandbox
const select=(id,value)=>{const el=w.document.getElementById(id);el.value=value;el.handlers.change()}
const V=()=>handle.viewer._V,ctx=()=>handle.session.ctx,$=id=>V().dom.root.querySelector('#'+id),press=id=>$(id).handlers.click({})
const typeOf=id=>ctx().state.units[id]?.typeId
/** End Turn (answered), then the Enemy Phase played frame by frame; `each` sees the board between frames */
function turn(each){
 if(handle.busy)click('skip')
 press('playEndTurn');if($('playAsk').style.display!=='none')press('playAskYes')
 for(let n=0;n<2000&&handle.busy;n++){w._flush(100);each()}
 assert.equal(handle.busy,false,'the Enemy Phase played to its end')
 assert.equal(V().cursor,ctx().events.length,'every event played on the screen')
}
function field(id){select('encounter',id);click('start');if(handle.busy)click('skip');return V().data.models}
/** every unit on the board so far (the arrivals included): a model or its token; the fielded types but the drafted heroes */
function cast(id,want){
 const models=V().data.models,units=ctx().state.units
 for(const u of units){
  assert.ok(V().layers.UEL.get(u.id)?.img,`${u.typeId} stands on its token`)
  if(u.typeId.startsWith('hero.fixed.'))assert.ok(!models[u.typeId],`${u.typeId} is its token, no model`)
  else assert.ok(models[u.typeId]?.looks?.length,`${u.typeId} is a model`)
 }
 assert.ok(units.some(u=>u.typeId.startsWith('hero.base.')),id+': drafted heroes')
 assert.deepEqual([...new Set(units.map(u=>u.typeId).filter(t=>!t.startsWith('hero.base.')))].sort(),want,id+': its cast')
}
// battle 2: the Skeleton Archer shoots
const m2=field('encounter.opening.lumberjack')
const shot=()=>ctx().events.findIndex(e=>e.type==='attack.declared'&&e.kind==='ranged'&&typeOf(e.actor)==='unit.skeletal-archer')
const soldier=()=>ctx().state.units.some(u=>u.typeId==='unit.soldier')
for(let t=0;t<12&&(shot()<0||!soldier())&&!ctx().state.outcome;t++)turn(()=>{})
cast('encounter.opening.lumberjack',['hero.fixed.lumberjack-and-wife','hero.fixed.lumberjacks-wife','unit.skeletal-archer','unit.soldier','unit.zombie'])
assert.ok(shot()>=0,'a Skeleton Archer shot');assert.ok(V().cursor>shot(),'and the screen played it')
assert.ok(m2['unit.skeletal-archer'].looks[0].missing.includes('ranged'),'no approved shot motion: listed missing, the shot is the board\'s arrow')
// battle 3: the Imps fly
const m3=field('encounter.opening.bridge')
assert.ok(m3['unit.imp'].looks[0].motions.flight,'the Imp\'s look flies')
const flew=new Set()
const watch=()=>{for(const u of ctx().state.units)if(u.typeId==='unit.imp'&&V().layers.UEL.get(u.id)?.walkShape==='flight')flew.add(u.id)}
const flight=()=>ctx().events.some(e=>e.type==='move.begin'&&e.causeId==='power.flight'&&typeOf(e.actor)==='unit.imp')
for(let t=0;t<12&&!(flight()&&flew.size)&&!ctx().state.outcome;t++)turn(watch)
cast('encounter.opening.bridge',['unit.fire-imp','unit.imp'])
assert.ok(flight(),'an Imp flew (engine power.flight)');assert.ok(flew.size>0,'the screen flew it: its traversal carries the flight shape')
console.log(`sandbox cast: battle 2 and battle 3 fielded from the screen, every enemy and drafted hero a model, every civilian its token; a Skeleton Archer shot, ${flew.size} Imp(s) flew on the board passed`)
