import {test} from 'node:test'
import assert from 'node:assert/strict'
import {createState,fold} from '../src/fold.js'
import {buildLog} from '../src/log.js'
import {effectTag,dmgOf} from '../src/actions.js'
import {pushFloat,clearFloats,cancelBeats} from '../src/board.js'
import {makeWindow} from './fakedom.mjs'

function state(){const s=createState();s.U[0]={id:0,hex:1,typeId:'hero',hp:20};s.U[1]={id:1,hex:2,typeId:'enemy',hp:20};return s}
const packets=[
 {id:'base',source:'attack.fixture',damageType:'physical',raw:8,absorbed:2,defense:1,mitigationDelta:-1,floorAdjustment:0,resisted:1,resolved:5,applied:5,overkill:0,ledger:[]},
 {id:'ember',source:'attack.fixture',damageType:'fire',raw:4,absorbed:0,defense:1,mitigationDelta:-1,floorAdjustment:0,resisted:1,resolved:3,applied:2,overkill:1,ledger:[]},
]
const damage={type:'damage.applied',causeId:'attack.fixture',actor:0,target:1,attackId:'attack.fixture',crit:true,damageType:'physical',amount:7,hpBefore:7,hpAfter:0,absorbed:2,overkill:1,physicalApplied:5,packets}
test('packet floats carry exact nested applied fields and distinct types, never the base aggregate label',()=>{
 const s=state(),cues=fold(s,damage,{},0),floats=cues.filter(c=>c.k==='float'&&c.kind==='damage')
 assert.equal(s.U[1].hp,0)
 assert.deepEqual(floats.map(c=>({n:c.n,of:c.of,packetIndex:c.packetIndex,dt:c.dt,crit:c.crit})),[
  {n:5,of:'applied',packetIndex:0,dt:'physical',crit:true},{n:2,of:'applied',packetIndex:1,dt:'fire',crit:true},
 ])
 for(const c of floats)assert.equal(damage.packets[c.packetIndex][c.of],c.n)
})
test('onHit hook damage cannot steal a confirmed chart-only weapon critical',()=>{
 const s=state();fold(s,{type:'attack.declared',actor:0,target:1,attackId:'attack.fixture',kind:'melee',damageType:'physical',damageOnHit:7,hitChance:100},{},0)
 const hit=fold(s,{type:'attack.hit',actor:0,target:1,crit:true,critHeads:0,ledger:[{station:'DECLARE',delta:1}],packets}, {},0)
 assert.ok(hit.some(c=>c.kind==='crit'))
 const hook=fold(s,{type:'damage.applied',causeId:'trigger.fixture',actor:0,target:1,damageType:'true',amount:1,hpAfter:19},{},0)
 assert.equal(hook.find(c=>c.kind==='damage').crit,false)
 const weapon=fold(s,damage,{},0)
 assert.ok(weapon.filter(c=>c.kind==='damage').every(c=>c.crit===true))
})
test('packet log prints supplied per-type mitigation and actual HP facts without relabeling the total physical',()=>{
 const line=buildLog([damage],{},1)[0].t
 assert.match(line,/takes 7 damage/);assert.doesNotMatch(line,/takes 7 physical/)
 for(const text of ['base','ember','5 physical','2 fire','2 absorbed','1 resisted','1 overkill'])assert.ok(line.includes(text),text)
})
test('action details expose authored packets and physical penetration verbatim',()=>{
 const text=effectTag({attack:{damageType:'physical',armorPenetration:3,secondaryDamage:[{id:'ember',when:'hit',damageType:'fire',amount:2},{id:'shade',when:'crit',damageType:'shadow',amount:4}]}},{},{},{})
 for(const part of ['Armor penetration 3','on hit: 2 fire','on crit: 4 shadow'])assert.ok(text.includes(part),part)
})
test('scalar damage keeps direct event provenance',()=>{
 const event={type:'damage.applied',causeId:'status.poison',target:1,amount:3,hpAfter:17,damageType:'poison'}
 const cue=fold(state(),event,{},0).find(c=>c.kind==='damage')
 assert.equal(cue.of,'amount');assert.equal(cue.n,event.amount);assert.equal(cue.packetIndex,undefined)
})

test('packet attacks await an engine total instead of displaying a base-only forecast',()=>{
 const attack={id:'attack.fixture',attack:{stat:'strength',bonus:2,secondaryDamage:[{id:'ember',when:'hit',damageType:'fire',amount:4}]}}
 const unit={typeId:'hero',dmgSeen:{}},data={UD:{hero:{strength:5}}}
 assert.equal(dmgOf(attack,unit,data),null)
 unit.dmgSeen[attack.id]=11
 assert.deepEqual(dmgOf(attack,unit,data),{n:11,live:true})
})

test('seek cancellation cannot let old float timers release new packet slots',()=>{
 const w=makeWindow(),prior={document:globalThis.document,setTimeout:globalThis.setTimeout,clearTimeout:globalThis.clearTimeout}
 Object.assign(globalThis,{document:w.document,setTimeout:w.setTimeout,clearTimeout:w.clearTimeout})
 try{
  const V={layers:{FLOAT_SLOTS:{}},dom:{stage:w.document.createElement('div')},data:{POS:{2:{px:10,py:20}}},fx:{timers:new Set(),nodes:new Set()}}
  pushFloat(V,2,'−5','#fff');pushFloat(V,2,'−2','#fff')
  w._flush(500);cancelBeats(V);clearFloats(V)
  pushFloat(V,2,'−4','#fff');pushFloat(V,2,'−1','#fff')
  assert.equal(V.layers.FLOAT_SLOTS[2],1)
  w._flush(800)
  assert.equal(V.layers.FLOAT_SLOTS[2],1,'cancelled pre-seek callbacks must not decrement the new slots')
  assert.equal(V.layers.floatL.children.length,2)
  w._flush(500);assert.equal(V.layers.FLOAT_SLOTS[2],undefined);assert.equal(V.fx.timers.size,0)
 }finally{Object.assign(globalThis,prior)}
})

test('imported packet field strings remain escaped log text',()=>{
 const hostile='<img src=x onerror="alert(1)">',event=JSON.parse(JSON.stringify(damage))
 for(const key of ['source','id','damageType','raw','applied','absorbed','defense','resisted','mitigationDelta','floorAdjustment','resolved','overkill'])event.packets[0][key]=hostile
 const line=buildLog([event],{},1)[0].t
 assert.ok(!line.includes('<img'),'every new imported packet field must be escaped')
 assert.ok(line.includes('&lt;img'))
})

test('imported packet damage remains literal text in the actual float DOM',()=>{
 const hostile='<img src=x onerror="alert(1)">',event=JSON.parse(JSON.stringify(damage));event.packets[0].applied=hostile
 const w=makeWindow(),prior={document:globalThis.document,setTimeout:globalThis.setTimeout,clearTimeout:globalThis.clearTimeout}
 Object.assign(globalThis,{document:w.document,setTimeout:w.setTimeout,clearTimeout:w.clearTimeout})
 try{
  const V={layers:{FLOAT_SLOTS:{}},dom:{stage:w.document.createElement('div')},data:{POS:{2:{px:10,py:20}}},fx:{timers:new Set(),nodes:new Set()}}
  const cue=fold(state(),event,{},0).find(c=>c.kind==='damage')
  pushFloat(V,cue.hex,cue.text,'#fff',cue)
  assert.equal(V.layers.floatL.querySelectorAll('img').length,0)
  assert.ok(V.layers.floatL.textContent.includes(hostile))
  cancelBeats(V)
 }finally{Object.assign(globalThis,prior)}
})
