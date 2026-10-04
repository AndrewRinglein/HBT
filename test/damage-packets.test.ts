import { describe, expect, it } from 'vitest'
import { createCustomBattle } from '../src/core/setup.js'
import { beginActivation, applyAttackPackets } from '../src/core/mutate.js'
import { performAttack, preview, planAttackDamage } from '../src/core/pipeline.js'
import { applyStatus, incomingAbsorb, spendAbsorb } from '../src/core/status.js'
import { liftAttack } from '../src/content/pack.js'
import { triggersFrom } from '../src/core/trigger.js'
import { attackPacketFields } from '../src/core/attack-profile.js'
import { forkBattle } from '../src/core/fork.js'
import { saveBattle, restoreBattle } from '../src/core/snapshot.js'
import { settle } from '../src/core/settle.js'
import { advanceBattle, completeActionCycle } from '../src/core/battle.js'
import { executeBattleCommand } from '../src/core/commands.js'
import type { AttackDef, AttackProfile } from '../src/core/types.js'
import { ATTACKS } from '../src/content/index.js'
import { scenarioDef, scenarioOptions } from '../src/content/scenarios.js'
import { createBattle } from '../src/core/setup.js'
import { runBattle } from '../src/core/battle.js'

function rig(critical = false) {
  const ctx = createCustomBattle([{type:'test-warrior',hex:85}],[{type:'test-zombie',hex:86}])
  const at=ctx.state.units[0]!,tg=ctx.state.units[1]!,id='attack.test-packet-local'
  Object.assign(at,{strength:4,accuracy:1000,crit:critical?1000:-1000,triggers:[]})
  Object.assign(tg,{hp:100,maxHp:100,armor:3,fireResist:1,dodge:0,luck:0,triggers:[]})
  ctx.actions={...ctx.actions,[id]:{id,name:'Packet probe',source:'weapon',staminaCost:0,cooldown:0,range:1,
    attack:{kind:'melee',damageType:'physical',bonus:2,stat:'strength',armorPenetration:2,
      secondaryDamage:[{id:'flame',when:'hit',damageType:'fire',amount:4},{id:'critical',when:'crit',damageType:'true',amount:3}]}}}
  at.actions.push(id);beginActivation(ctx,at.id,'test')
  return {ctx,at,tg,id}
}

describe('rule.damage-packets — behavioral red and accounting',()=>{
  it('reserves Protection once before onHit damage, without moving onHit after HP',()=>{
    const {ctx,at,tg,id}=rig();tg.armor=0
    ctx.actions={...ctx.actions,[id]:{...ctx.actions[id]!,attack:{kind:'melee',damageType:'physical',bonus:2,stat:'strength'}}}
    applyStatus(ctx,tg.id,'status.protection',4,'test')
    at.triggers=triggersFrom([{id:'test.packet-hit-hook',hook:'onHit',chance:100,source:id,select:'target',effect:{kind:'damage',amount:3,damageType:'true'}}])
    performAttack(ctx,at.id,tg.id,id)
    expect(tg.hp).toBe(95)
    expect(ctx.events.filter(e=>e.type==='status.reduced').map(e=>[e.causeId,e['by']])).toEqual([[id,4]])
    expect(ctx.events.filter(e=>e.type==='damage.applied').map(e=>[e.causeId,e['amount']])).toEqual([['test.packet-hit-hook',3],[id,2]])
  })
  it('flat typed riders share the pool in authored order and preview stays pure',()=>{
    const {ctx,at,tg,id}=rig();applyStatus(ctx,tg.id,'status.protection',7,'test')
    const before=structuredClone({state:ctx.state,events:ctx.events,rng:ctx.rng})
    // Base6 absorbs6, physical defense1 floors0. Fire4 absorbs remaining1, fire defense1 =>2.
    expect(preview(ctx,at.id,tg.id,id).damageOnHit).toBe(2)
    expect({state:ctx.state,events:ctx.events,rng:ctx.rng}).toEqual(before)
    const result=performAttack(ctx,at.id,tg.id,id)
    expect(result.damage).toBe(2);expect(tg.hp).toBe(98);expect(incomingAbsorb(ctx,tg)).toBe(0)
    const event=ctx.events.find(e=>e.type==='damage.applied'&&e.causeId===id)!
    expect(event['packets']).toMatchObject([
      {id:'base',damageType:'physical',raw:6,absorbed:6,defense:1,resolved:0,applied:0,overkill:0},
      {id:'flame',damageType:'fire',raw:4,absorbed:1,defense:1,resolved:2,applied:2,overkill:0},
    ])
    expect(event['physicalApplied']).toBe(0)
  })
  it('a confirmed injury-only critical includes hit and crit riders exactly once',()=>{
    const {ctx,at,tg,id}=rig(true);ctx.cfg.switches.critChartShareVsEnemies=100
    const result=performAttack(ctx,at.id,tg.id,id)
    expect(result.crit).toBe(true);expect(result.damage).toBe(11)
    expect(ctx.events.find(e=>e.type==='attack.hit')).toMatchObject({crit:true,critHeads:0})
    expect((ctx.events.find(e=>e.type==='damage.applied'&&e.causeId===id)!['packets'] as any[]).map(p=>p.id))
      .toEqual(['base','flame','critical'])
  })
  it('the loader rejects malformed packets instead of silently dropping them',()=>{
    const row={id:'attack.test-invalid',name:'Bad',kind:'melee',damageType:'physical',bonus:0,stat:'strength',reach:1,staminaCost:0}
    expect(()=>liftAttack({...row,secondaryDamage:[{id:'base',when:'hit',damageType:'fire',amount:1}]} as never)).toThrow(/packet|reserved/)
    expect(()=>liftAttack({...row,armorPenetration:1.5} as never)).toThrow(/penetration|integer/)
  })
})

function profile(r:ReturnType<typeof rig>,patch:Partial<AttackProfile>){
  r.ctx.actions={...r.ctx.actions,[r.id]:{...r.ctx.actions[r.id]!,attack:{...r.ctx.actions[r.id]!.attack!,...patch}}}
}
const packetRows=(r:ReturnType<typeof rig>)=>r.ctx.events.find(e=>e.type==='damage.applied'&&e.causeId===r.id)!['packets'] as any[]

describe('packet lifecycle and physical defense',()=>{
  for(const [share,want] of [[100,8],[0,11]])it(`onCrit grants Protection before planning with chart share ${share}`,()=>{
    const r=rig(true);r.ctx.cfg.switches.critChartShareVsEnemies=share!
    r.at.triggers=triggersFrom([{id:'test.packet-crit-shield',hook:'onCrit',chance:100,source:r.id,select:'target',effect:{kind:'status.apply',statusId:'status.protection',value:3}}])
    expect(performAttack(r.ctx,0,1,r.id).damage).toBe(want)
  })
  it('onAttack damage planning observes actual hook results without changing declared accuracy',()=>{
    const r=rig();r.at.triggers=triggersFrom([{id:'test.packet-attack-shield',hook:'onAttack',chance:100,source:r.id,select:'target',effect:{kind:'status.apply',statusId:'status.protection',value:7}}])
    const forecast=preview(r.ctx,0,1,r.id);expect(forecast.damageOnHit).toBe(8)
    expect(performAttack(r.ctx,0,1,r.id).damage).toBe(2)
    expect(r.ctx.events.find(e=>e.type==='attack.declared')).toMatchObject({damageOnHit:8,hitChance:forecast.hitChance})
  })
  it('onCrit damage consumes its own Protection before the later packet reservation',()=>{
    const r=rig(true);r.ctx.cfg.switches.critChartShareVsEnemies=100;applyStatus(r.ctx,1,'status.protection',4,'test')
    r.at.triggers=triggersFrom([{id:'test.packet-crit-damage',hook:'onCrit',chance:100,source:r.id,select:'target',effect:{kind:'damage',amount:3,damageType:'true'}}])
    expect(performAttack(r.ctx,0,1,r.id).damage).toBe(10)
    expect(r.ctx.events.filter(e=>e.type==='status.reduced').map(e=>[e.causeId,e['by']])).toEqual([['test.packet-crit-damage',3],[r.id,1]])
  })
  for(const hook of ['onAttack','onCrit'] as const)it(hook+' Armor change is read at the actual damage rung',()=>{
    const r=rig(hook==='onCrit');r.ctx.cfg.switches.critChartShareVsEnemies=100
    r.ctx.badges={...r.ctx.badges,'test.packet-armor':{id:'test.packet-armor',name:'Armor fixture',statModifiers:{armor:2},grants:[],triggers:[],flags:{}}}
    r.at.triggers=triggersFrom([{id:'test.packet-armor-hook',hook,chance:100,source:r.id,select:'target',effect:{kind:'badge.grant',badgeId:'test.packet-armor'}}])
    expect(performAttack(r.ctx,0,1,r.id).damage).toBe(hook==='onCrit'?9:6)
    expect(packetRows(r)[0].defense).toBe(3)
  })
  for(const [armor,pen,want] of [[3,0,6],[3,2,8],[3,9,9],[-2,0,11],[-2,9,11]])it(`Armor ${armor}, penetration ${pen} preserves vulnerability without creating it`,()=>{
    const r=rig();r.tg.armor=armor!;profile(r,{armorPenetration:pen!})
    expect(preview(r.ctx,r.at.id,r.tg.id,r.id).damageOnHit).toBe(want)
    expect(performAttack(r.ctx,r.at.id,r.tg.id,r.id).damage).toBe(want)
    expect(packetRows(r)[1].defense).toBe(1) // Fire ignores physical penetration.
  })
  it('absent and explicit zero penetration agree exactly',()=>{
    const r=rig(),attack={...r.ctx.actions[r.id]!.attack!};delete (attack as {armorPenetration?:number}).armorPenetration
    r.ctx.actions={...r.ctx.actions,[r.id]:{...r.ctx.actions[r.id]!,attack}}
    const absent=preview(r.ctx,0,1,r.id);profile(r,{armorPenetration:0})
    expect(preview(r.ctx,0,1,r.id)).toEqual(absent)
  })
  it('one Frost contribution goes to the first physical packet, even after an elemental base',()=>{
    const r=rig();profile(r,{damageType:'fire',secondaryDamage:[{id:'physical-one',when:'hit',damageType:'physical',amount:4},{id:'physical-two',when:'hit',damageType:'physical',amount:2}]})
    applyStatus(r.ctx,1,'status.frost',3,'test')
    expect(performAttack(r.ctx,0,1,r.id).damage).toBe(12)
    expect(packetRows(r).map(p=>p.raw)).toEqual([6,7,2])
    expect(packetRows(r).flatMap(p=>p.ledger).filter(l=>l.name==='FROST')).toHaveLength(1)
  })
  it('negative raw and negative Armor preserve exact signed conservation and do not spend Protection',()=>{
    const r=rig();r.at.strength=0;r.tg.armor=-5
    profile(r,{bonus:0,secondaryDamage:[]});applyStatus(r.ctx,0,'status.weak',2,'test');applyStatus(r.ctx,1,'status.protection',4,'test')
    expect(preview(r.ctx,0,1,r.id).damageOnHit).toBe(3)
    performAttack(r.ctx,0,1,r.id)
    expect(packetRows(r)[0]).toMatchObject({raw:-2,absorbed:0,defense:-5,mitigationDelta:5,floorAdjustment:0,resolved:3})
    expect(incomingAbsorb(r.ctx,r.tg)).toBe(4)
  })
  it('critical count multiplies only base damage; flat hit and crit riders run once',()=>{
    const r=rig(true);profile(r,{critCount:3});r.ctx.cfg.switches.critChartShareVsEnemies=0
    expect(performAttack(r.ctx,0,1,r.id).damage).toBe(20)
    expect(packetRows(r).map(p=>p.raw)).toEqual([15,4,3])
    expect(r.ctx.events.filter(e=>e.type==='crit.branch')).toHaveLength(3)
  })
  it('a miss produces neither packet application nor onHit riders',()=>{
    const r=rig();r.at.accuracy=-1000
    expect(performAttack(r.ctx,0,1,r.id).hit).toBe(false)
    expect(r.ctx.events.filter(e=>e.type==='damage.applied')).toHaveLength(0)
  })
  for(const hp of [3,6,8])it(`HP ${hp} clamps ordered packets without settling between them`,()=>{
    const r=rig();r.tg.hp=hp
    const result=performAttack(r.ctx,0,1,r.id),packets=packetRows(r)
    expect(result.damage).toBe(hp);expect(packets.map(p=>p.applied)).toEqual([Math.min(hp,5),Math.max(0,hp-5)])
    expect(packets.map(p=>p.overkill)).toEqual([Math.max(0,5-hp),3-Math.max(0,hp-5)])
    expect(r.ctx.events.filter(e=>e.type==='damage.applied')).toHaveLength(1)
    expect(r.tg.lifeState).toBe('standing');settle(r.ctx,r.id)
    expect(r.tg.lifeState).toBe('dead');expect(r.ctx.events.filter(e=>e.type==='unit.died'||e.type==='corpse.created')).toHaveLength(1)
  })
  it('onHit Protection survives the immutable plan for the next damage source',()=>{
    const r=rig();r.at.triggers=triggersFrom([{id:'test.packet-shield-hook',hook:'onHit',chance:100,source:r.id,select:'target',effect:{kind:'status.apply',statusId:'status.protection',value:9}}])
    expect(performAttack(r.ctx,0,1,r.id).damage).toBe(8);expect(incomingAbsorb(r.ctx,r.tg)).toBe(9)
  })
  it('onHit healing changes HP availability but cannot recompute the damage plan',()=>{
    const r=rig();r.tg.hp=4
    r.at.triggers=triggersFrom([{id:'test.packet-heal-hook',hook:'onHit',chance:100,source:r.id,select:'target',effect:{kind:'heal',amount:10}}])
    expect(performAttack(r.ctx,0,1,r.id).damage).toBe(8);expect(r.tg.hp).toBe(6)
    expect(packetRows(r).map(p=>p.applied)).toEqual([5,3])
  })
  it('onHit lethal damage leaves packet overkill, one settlement, and stable earlier event payloads',()=>{
    const r=rig();r.tg.hp=4
    r.at.triggers=triggersFrom([{id:'test.packet-lethal-hook',hook:'onHit',chance:100,source:r.id,select:'target',effect:{kind:'damage',amount:10,damageType:'true'}}])
    expect(performAttack(r.ctx,0,1,r.id).damage).toBe(0)
    const hit=r.ctx.events.find(e=>e.type==='attack.hit')!,prior=JSON.stringify(hit)
    expect((hit['packets'] as any[]).every(p=>!('applied'in p)&&!('overkill'in p))).toBe(true)
    expect(packetRows(r).map(p=>[p.applied,p.overkill])).toEqual([[0,5],[0,3]])
    settle(r.ctx,r.id);expect(JSON.stringify(hit)).toBe(prior)
    expect(r.tg.lifeState).toBe('dead');expect(r.ctx.events.filter(e=>e.type==='corpse.created')).toHaveLength(1)
    expect((hit['packets'] as any[])[0]).not.toBe(packetRows(r)[0])
    expect((hit['packets'] as any[])[0].ledger).not.toBe(packetRows(r)[0].ledger)
  })
  it('onHit/onDamage/onTakingDamage/onKill fire per hit, never per packet',()=>{
    const r=rig();r.tg.hp=7
    const hooks=['onHit','onDamage','onKill'] as const
    r.at.triggers=triggersFrom(hooks.map(hook=>({id:'test.packet-'+hook,hook,chance:100,source:r.id,select:'self' as const,effect:{kind:'status.apply' as const,statusId:'status.protection',value:1}})))
    r.tg.triggers=triggersFrom([{id:'test.packet-taking',hook:'onTakingDamage',chance:100,source:r.id,select:'self',effect:{kind:'status.apply',statusId:'status.protection',value:1}}])
    performAttack(r.ctx,0,1,r.id)
    expect(r.ctx.events.filter(e=>e.type==='trigger.fired').map(e=>e.causeId)).toEqual([...hooks.slice(0,2).map(h=>'test.packet-'+h),'test.packet-taking','test.packet-onKill'])
  })
  it('both sides use the same plan and source-stat scaling is base-only',()=>{
    for(const side of [0,1]){
      const r=rig(),at=r.ctx.state.units[side]!,tg=r.ctx.state.units[1-side]!
      Object.assign(at,{strength:4,triggers:[]});Object.assign(tg,{armor:3,fireResist:1})
      const plan=planAttackDamage(r.ctx,at,tg,r.ctx.actions[r.id] as AttackDef,0,false)
      expect(plan.packets.map(p=>p.resolved)).toEqual([5,3])
    }
  })
})

describe('packet boundary, snapshots and shared command resolver',()=>{
  it('zero mitigation stays positive zero through plain JSON roundtrips',()=>{
    const r=rig();r.tg.armor=r.tg.fireResist=0
    performAttack(r.ctx,0,1,r.id)
    for(const p of packetRows(r))expect(Object.is(p.mitigationDelta,-0)).toBe(false)
    expect(JSON.parse(JSON.stringify(r.ctx.events))).toEqual(r.ctx.events)
  })
  it('private application preview equals a full fork under frozen live graphs, pool expiration and overkill',()=>{
    for(const target of [0,1])for(const hp of [0,2,100])for(const pool of [0,3,9]){
      const r=rig(),tg=r.ctx.state.units[target]!;tg.hp=hp
      if(pool){applyStatus(r.ctx,target,'status.protection',pool,'test');applyStatus(r.ctx,target,'test.status.ward',2,'test')}
      const expected=forkBattle(r.ctx),plan=planAttackDamage(expected,expected.state.units[0]!,expected.state.units[target]!,expected.actions[r.id] as AttackDef,0,false)
      if(plan.absorbed)spendAbsorb(expected,target,plan.absorbed,r.id)
      const facts=applyAttackPackets(expected,target,plan.packets,r.id,{actor:0,attackId:r.id})
      const freeze=(v:unknown)=>{if(v&&typeof v==='object'){for(const x of Object.values(v))freeze(x);Object.freeze(v)}}
      const before=JSON.stringify({state:r.ctx.state,events:r.ctx.events,rng:r.ctx.rng,cfg:r.ctx.cfg})
      freeze(r.ctx.state);freeze(r.ctx.events);freeze(r.ctx.rng);freeze(r.ctx.cfg)
      expect(preview(r.ctx,0,target,r.id).packetsOnHit).toEqual(facts.packets)
      expect(JSON.stringify({state:r.ctx.state,events:r.ctx.events,rng:r.ctx.rng,cfg:r.ctx.cfg})).toBe(before)
    }
  })
  it('both declared TEST data variants resolve real ordered packets in an automatic battle',()=>{
    const ctx=createBattle(scenarioOptions(scenarioDef('test.damage-packets')))
    runBattle(ctx)
    for(const id of ['attack.test-packet-flame','attack.test-packet-shadow']){
      expect(ATTACKS[id]!.attack.secondaryDamage).toHaveLength(2)
      const event=ctx.events.find(e=>e.type==='damage.applied'&&e.causeId===id)!
      expect(event).toBeDefined();expect(event['packets']).toHaveLength(3)
      expect((event['packets'] as any[]).slice(1).map(p=>p.damageType)).toEqual(ATTACKS[id]!.attack.secondaryDamage!.map(p=>p.damageType))
      expect(event['amount']).toBeGreaterThan(0)
    }
  })
  /* Law 10, 2026-10-03 (content.unfielded-tier0-weapons-cut): the Hand Axe was cut (DECISIONS.md 'eleven tier 0 weapons nobody fields
     are cut'), and its case ['attack.hand-axe.chop',4,4] went with its row. It has no row to move to: the Bane Blade's is the one
     authored critical rider left, and none is authored onto another weapon to keep a second case (SWITCHES.md
     `handAxeRiderCaseDropped`). The claim is unchanged and still proven on an authored row; that a rider's amount and type are data
     is proven by the two TEST packet attacks above. */
  for(const [id,amount,want] of [['attack.bane-blade.banishing-blow',6,6]] as const)
    it(id+' provisional rider is physical and separately mitigated on chart-only crit',()=>{
      const r=rig(),a=ATTACKS[id]!
      expect(a.attack.secondaryDamage).toEqual([{id:'critical-rider',when:'crit',damageType:'physical',amount}])
      const plan=planAttackDamage(r.ctx,r.at,r.tg,a,0,true)
      expect(plan.value).toBe(want);expect(plan.packets.map(p=>p.defense)).toEqual([3,3])
      expect(plan.packets.map(p=>p.raw)).toEqual([6,amount])
    })
  const row={id:'extra',when:'hit',damageType:'fire',amount:2}
  for(const malformed of [null,{},[row,row],[{...row,id:'base'}],[{...row,amount:1.5}],[{...row,amount:-1}],[{...row,damageType:'holy'}],[{...row,when:'block'}],[{...row,armorPenetration:2}],Array(1),Object.assign(Array(1),{extra:row})])
    it(`rejects malformed packet data ${JSON.stringify(malformed)}`,()=>expect(()=>attackPacketFields({secondaryDamage:malformed})).toThrow())
  it('rejects accessors without invoking them and detaches accepted author data',()=>{
    let reads=0;const bad={...row};Object.defineProperty(bad,'amount',{get(){reads++;return 2}})
    expect(()=>attackPacketFields({secondaryDamage:[bad]})).toThrow();expect(reads).toBe(0)
    const source=[{...row}],fields=attackPacketFields({secondaryDamage:source})
    source[0]!.amount=999;expect(fields.secondaryDamage![0]!.amount).toBe(2)
  })
  it('save/restore and forks preserve packets and deterministic resolver results',()=>{
    const r=rig(),saved=saveBattle(r.ctx),restored=restoreBattle(saved,r.ctx),fork=forkBattle(r.ctx)
    fork.events=structuredClone(r.ctx.events)
    for(const ctx of [r.ctx,restored,fork])performAttack(ctx,0,1,r.id)
    expect(saveBattle(restored)).toBe(saveBattle(r.ctx));expect(saveBattle(fork)).toBe(saveBattle(r.ctx))
    const altered=rig();profile(altered,{armorPenetration:3})
    expect(()=>restoreBattle(saved,altered.ctx)).toThrow(/binding differs/)
  })
  it('public commands reject malformed runtime metadata atomically',()=>{
    const r=rig();delete r.ctx.battleCursor;advanceBattle(r.ctx)
    profile(r,{secondaryDamage:[{...row,amount:1.5}] as never})
    const before=structuredClone({state:r.ctx.state,events:r.ctx.events,rng:r.ctx.rng,cursor:r.ctx.battleCursor})
    expect(()=>executeBattleCommand(r.ctx,{humanUnitUids:[r.at.uid]},{kind:'action',actor:0,expectedSeq:r.ctx.state.seq,actionId:r.id,target:1})).toThrow(/packet/)
    expect({state:r.ctx.state,events:r.ctx.events,rng:r.ctx.rng,cursor:r.ctx.battleCursor}).toEqual(before)
  })
  it('human command and direct simulation resolution have exact state/event/RNG parity',()=>{
    const r=rig();delete r.ctx.battleCursor;advanceBattle(r.ctx)
    const copy=forkBattle(r.ctx);copy.events=structuredClone(r.ctx.events)
    performAttack(copy,0,1,r.id);settle(copy,r.id);completeActionCycle(copy)
    expect(executeBattleCommand(r.ctx,{humanUnitUids:[r.at.uid]},{kind:'action',actor:0,expectedSeq:r.ctx.state.seq,actionId:r.id,target:1})).toEqual({ok:true})
    expect(saveBattle(r.ctx)).toBe(saveBattle(copy))
  })
})
