import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createState,fold,foldTo,FOLDED_TYPES} from '../src/fold.js'
import {buildLog} from '../src/log.js'
import {kindOf,effectTag,effectWord,dmgOf,triggersFor,actionsOf} from '../src/actions.js'
const fixture=JSON.parse(readFileSync(new URL('./fixtures/bursts.json',import.meta.url)))
const declared=fixture.cases[0].events.find(e=>e.type==='burst.declared')
const ctx={UD:{},SN:{}}

test('real support histories retain live ordinary power and boosted-healing coverage',()=>{
 const support=fixture.support??[]
 for(const type of ['power.hit','heal.boosted'])assert.ok(support.some(c=>c.events.some(e=>e.type===type)),type)
 for(const c of support){
  const s=createState()
  for(const e of c.events){
   const before=Object.fromEntries(Object.entries(s.U).map(([id,u])=>[id,u.hp]))
   fold(s,e,ctx,0)
   if(['power.hit','heal.boosted'].includes(e.type))assert.deepEqual(Object.fromEntries(Object.entries(s.U).map(([id,u])=>[id,u.hp])),before,'summary events never apply HP twice')
  }
  for(const u of c.finalHp)assert.equal(s.U[u.id].hp,u.hp)
 }
 const healed=support.find(c=>c.events.some(e=>e.type==='heal.boosted'))
 assert.ok(healed.events.some(e=>e.type==='heal.applied'&&e.target===1&&e.asked===9&&e.amount===9))
})

test('real burst declaration preserves detached engine footprint/UIDs and clears ordinary attack state',()=>{
 const s=createState();s.AIM={hit:100};s.ATTACK={kind:'melee'};s.critPending=true;s.AOO={holder:0}
 const event=structuredClone(declared);fold(s,event,ctx,0)
 assert.equal(s.AIM,null);assert.equal(s.ATTACK,null);assert.equal(s.critPending,false);assert.equal(s.AOO,null)
 assert.deepEqual(s.BURST.hexes,declared.hexes);assert.deepEqual(s.BURST.targets,declared.targets)
 assert.ok(s.BURST.targets.every(t=>typeof t.uid==='number'))
 event.hexes.push(255);event.targets[0].hex=255;assert.deepEqual(s.BURST.hexes,declared.hexes);assert.deepEqual(s.BURST.targets,declared.targets)
 for(const type of ['burst.declared','burst.shielded','burst.struck'])assert.ok(FOLDED_TYPES.includes(type),type)
})

test('burst action details show authored packets, filter, shape and healing without scalar guesses or attack hooks',()=>{
 const row={...fixture.cases[0].action,burst:{...fixture.cases[0].action.burst,requireTags:['undead'],heal:7}}
 // viewer.reads-engine (review V1): what a row IS is the engine's classification (static.json actionKinds), and the bar's
 // row carries it as its kind — the helpers read that, never the row's shape
 const KINDS=JSON.parse(readFileSync(new URL('../generated/static.json',import.meta.url))).actionKinds
 assert.equal(kindOf(row,{KINDS}),'burst')
 const bar=actionsOf({typeId:'caster'},{UD:{caster:{abilities:[row]}},KINDS})[0]
 assert.equal(bar.kind,'burst')
 const detail=effectTag(bar,{}, {},{})
 for(const part of ['radius 1','enemy','undead','4 fire','3 shadow','heal 7'])assert.ok(detail.includes(part),part)
 assert.equal(dmgOf(bar,{dmgSeen:{[row.id]:99}},{}),null)
 assert.deepEqual(triggersFor({typeId:'caster'},bar,{UD:{caster:{triggers:[{hook:'onHit',effect:{kind:'damage',amount:3}}]}}},{},()=>({hue:'#fff'})),[])
 assert.deepEqual(effectWord({kind:'burstScale',percent:50},{},{}),{word:'Burst damage percentage',val:50})
})

for(const c of fixture.cases)test(`real ${c.name} events: HP/float ownership, durable seek facts and every-event cue parity`,()=>{
 const s=createState(),before=JSON.stringify(c.events)
 for(let i=0;i<c.events.length;i++){
  const e=c.events[i],prior=structuredClone(s.U),cues=fold(s,e,ctx,0)
  if(e.type.startsWith('burst.')){
   assert.deepEqual(s.U,prior,'burst summaries never apply HP or status')
   assert.equal(cues.filter(x=>x.kind==='damage'||x.kind==='heal').length,0)
   assert.ok(s.BURST,'durable declaration survives recipient summaries')
   const sought=foldTo(c.events,i,ctx),after=fold(sought,e,ctx,0)
   assert.deepEqual(after,cues,'step after seek has the exact cues')
   assert.deepEqual(sought.BURST,s.BURST,'seek retains full semantic BURST')
  }
 }
 for(const u of c.finalHp)assert.equal(s.U[u.id].hp,u.hp)
 assert.equal(JSON.stringify(c.events),before)
 assert.deepEqual(foldTo(c.events,c.events.length,ctx).BURST,s.BURST)
})

test('real fixture explicitly covers empty centre, shielding, saves, friendly fire and zero payload',()=>{
 const by=n=>fixture.cases.find(c=>c.name===n)
 for(const c of fixture.cases){const e=c.events.find(e=>e.type==='burst.declared');assert.ok(!e.targets.some(t=>t.hex===e.centre));assert.ok(e.packets.every(p=>p.value!=null&&Array.isArray(p.ledger)))}
 assert.ok(by('shielding').events.some(e=>e.type==='burst.shielded'&&e.props.includes('prop.test.partition')))
 assert.ok(by('save').events.some(e=>e.type==='trigger.fired'&&e.causeId==='test.burst-ward.save'))
 assert.ok(by('friendly').events.some(e=>e.type==='damage.applied'&&e.target===1))
 assert.ok(by('healing').events.some(e=>e.type==='heal.applied'&&e.amount>0))
 assert.ok(by('zero').events.find(e=>e.type==='burst.declared').packets.every(p=>p.value===0))
})

test('imported burst names, props and payload fields remain escaped log text',()=>{
 const hostile='<img src=x onerror="alert(1)">'
 const shield=fixture.cases.find(c=>c.name==='shielding').events.find(e=>e.type==='burst.shielded')
 const struck=fixture.cases[0].events.find(e=>e.type==='burst.struck')
 const events=[{type:'unit.enter',actor:0,name:hostile,side:'hero'},{...declared,causeId:hostile,centre:hostile,packets:[{id:hostile,damageType:hostile,value:hostile}]},{...shield,props:[hostile]},{...struck,coverDamage:hostile}]
 const lines=buildLog(events,{},1);assert.equal(lines.length,3)
 for(const line of lines){assert.ok(!line.t.includes('<img'));assert.ok(line.t.includes('&lt;img'))}
 assert.ok(lines[1].t.includes('Terrain shielding'))
})
