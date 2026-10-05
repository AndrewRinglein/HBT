import {describe,it,expect} from 'vitest'
import {createSandbox,advanceSandbox,sandboxChoices,commandSandbox,saveSandbox,restoreSandbox,exportSandbox} from '../src/core/sandbox.js'
import {SANDBOX_DEFAULT} from '../src/content/sandbox.js'
import {createBattle,runBattle,controllerOf,validateBattleCommand,preview,isAttack} from '../src/engine.js'

function acting(s:ReturnType<typeof createSandbox>){
 const next=advanceSandbox(s)
 if(next.kind==='selecting'){expect(commandSandbox(s,{kind:'select-activation',unitUid:next.unitUids[0],expectedSeq:s.ctx.state.seq}).ok).toBe(true);const active=advanceSandbox(s);if(active.kind==='selecting')throw Error('selection did not begin');return active}
 return next
}

describe('ISC-069 — a human battle uses the simulation engine',()=>{
 it('offers the default three heroes before activation and can choose an unblocked hero in a different order',()=>{
  const s=createSandbox(SANDBOX_DEFAULT),next=advanceSandbox(s)
  expect(next.kind).toBe('selecting');if(next.kind!=='selecting')throw Error('expected selection')
  expect(next.unitUids).toHaveLength(3);expect(s.ctx.events.some(e=>e.type==='activation.begin')).toBe(false)
  const before=saveSandbox(s),uid=next.unitUids[2]!,chosen=s.ctx.state.units.find(u=>u.uid===uid)!
  expect(commandSandbox(s,{kind:'select-activation',unitUid:uid,expectedSeq:s.ctx.state.seq-1}).ok).toBe(false);expect(saveSandbox(s)).toBe(before)
  expect(commandSandbox(s,{kind:'select-activation',unitUid:uid,expectedSeq:s.ctx.state.seq}).ok).toBe(true)
  expect(s.ctx.battleCursor!.actor).toBe(chosen.id);expect(sandboxChoices(s).length).toBeGreaterThan(0)
  expect(s.ctx.events.filter(e=>e.type==='activation.begin').map(e=>e.actor)).toEqual([chosen.id])
  expect(commandSandbox(s,{kind:'end-cycle',actor:chosen.id,expectedSeq:s.ctx.state.seq}).ok).toBe(true)
  const remaining=advanceSandbox(s);expect(remaining.kind).toBe('selecting');if(remaining.kind!=='selecting')throw Error('expected remaining')
  expect(remaining.unitUids).not.toContain(uid);expect(commandSandbox(s,{kind:'select-activation',unitUid:remaining.unitUids[0],expectedSeq:s.ctx.state.seq}).ok).toBe(true)
  expect(s.ctx.events.filter(e=>e.type==='activation.begin').map(e=>e.actor)).toEqual([chosen.id,0])
 })
 it('preserves pending hero selection across save/resume with exact events and RNG',()=>{
  const a=createSandbox(SANDBOX_DEFAULT);expect(advanceSandbox(a).kind).toBe('selecting');const b=restoreSandbox(saveSandbox(a))
  expect(advanceSandbox(b)).toEqual(advanceSandbox(a));expect(a.ctx.events).toEqual(b.ctx.events)
  const command={kind:'select-activation',unitUid:a.policy.humanUnitUids[1],expectedSeq:a.ctx.state.seq}
  expect(commandSandbox(a,command)).toEqual({ok:true});expect(commandSandbox(b,command)).toEqual({ok:true})
  expect(a.ctx.events).toEqual(b.ctx.events);expect(a.ctx.state).toEqual(b.ctx.state);expect(a.ctx.rng.log).toEqual(b.ctx.rng.log)
 })
 it('starts deterministically on each authored area with exact kits, disjoint slots and stable owners',()=>{
  for(const mapId of ['showcase.atlas-priory','showcase.atlas-angled-halls','showcase.atlas-buried-pilgrimage']){
   const config={...SANDBOX_DEFAULT,mapId},a=createSandbox(config),b=createSandbox(config)
   expect(a.ctx.events).toEqual(b.ctx.events);expect(a.ctx.state.board).toEqual({width:20,height:10})
   expect(new Set(a.ctx.state.units.map(u=>u.hex)).size).toBe(a.ctx.state.units.length)
   expect(a.ctx.events.some(e=>e.type==='unit.equipped')).toBe(true)
   for(const u of a.ctx.state.units)expect(controllerOf(a.ctx,u.id,a.policy)).toBe(a.policy.humanUnitUids.includes(u.uid)?'human':'ai')
  }
 })
 it('enumerates only engine-legal choices with authoritative previews and rejects duplicate sequence commands',()=>{
  const s=createSandbox({...SANDBOX_DEFAULT,heroes:[SANDBOX_DEFAULT.heroes[0]!]});acting(s);const before=s.ctx.events.length
  const choices=sandboxChoices(s);expect(choices.length).toBeGreaterThan(0);expect(s.ctx.events.length).toBe(before)
  for(const choice of choices){expect(validateBattleCommand(s.ctx,s.policy,choice.command).ok).toBe(true)
   const a=s.ctx.actions[choice.command.actionId]!;if(isAttack(a)&&'target' in choice.command)expect(choice.preview).toEqual(preview(s.ctx,choice.command.actor,choice.command.target,choice.command.actionId))}
  const command=choices.find(x=>'destination' in x.command)!.command
  expect(commandSandbox(s,command).ok).toBe(true);const after=s.ctx.events.length
  expect(commandSandbox(s,command).ok).toBe(false);expect(s.ctx.events.length).toBe(after)
 })
 it('end activation advances AI, ownership never follows changed allegiance, and wrong actors are refused',()=>{
  const s=createSandbox(SANDBOX_DEFAULT);const step=acting(s);expect(step.kind).toBe('acting')
  if(step.kind!=='acting')throw Error('expected hero')
  const actor=s.ctx.state.units[step.actor]!;actor.side='enemy';expect(controllerOf(s.ctx,actor.id,s.policy)).toBe('human');actor.side='hero'
  const enemy=s.ctx.state.units.find(u=>!s.policy.humanUnitUids.includes(u.uid))!;enemy.side='hero';expect(controllerOf(s.ctx,enemy.id,s.policy)).toBe('ai');enemy.side='enemy'
  expect(commandSandbox(s,{kind:'end-cycle',actor:enemy.id,expectedSeq:s.ctx.state.seq}).ok).toBe(false)
  for(let n=0;n<15&&!s.ctx.events.some(e=>e.type==='ai.mode');n++){const next=acting(s);if(next.kind==='complete')break;expect(commandSandbox(s,{kind:'end-cycle',actor:next.actor,expectedSeq:s.ctx.state.seq}).ok).toBe(true)}
  expect(s.ctx.events.some(e=>e.type==='ai.mode')).toBe(true)
 })
 it('an actual legal attack exposes the exact engine preview without consuming a roll',()=>{
  const s=createSandbox({...SANDBOX_DEFAULT,heroes:[SANDBOX_DEFAULT.heroes[0]!],enemies:['unit.zombie']});acting(s)
  let attack
  for(let n=0;n<15&&!s.ctx.state.outcome;n++){
   const step=acting(s);if(step.kind==='complete')break
   attack=sandboxChoices(s).find(c=>isAttack(s.ctx.actions[c.command.actionId]!));if(attack)break
   commandSandbox(s,{kind:'end-cycle',actor:step.actor,expectedSeq:s.ctx.state.seq})
  }
  expect(attack).toBeDefined();if(!attack||!('target' in attack.command))throw Error('expected a real attack')
  const before=JSON.stringify(s.ctx.rng.log),events=s.ctx.events.length
  expect(attack.preview).toEqual(preview(s.ctx,attack.command.actor,attack.command.target,attack.command.actionId))
  expect(JSON.stringify(s.ctx.rng.log)).toBe(before);expect(s.ctx.events.length).toBe(events)
  expect(commandSandbox(s,attack.command).ok).toBe(true)
  const declared=s.ctx.events.slice(events).find(e=>e.type==='attack.declared')!
  expect(declared['hitChance']).toBe(attack.preview!['hitChance']);expect(declared['damageOnHit']).toBe(attack.preview!['damageOnHit'])
 })
 it('engine snapshot resumes identical commands, events, RNG and frozen presentation; malformed save is rejected',()=>{
  const a=createSandbox({...SANDBOX_DEFAULT,heroes:[SANDBOX_DEFAULT.heroes[0]!]});acting(a);const saved=saveSandbox(a),b=restoreSandbox(saved)
  expect(exportSandbox(a)).toEqual(exportSandbox(b))
  const choice=sandboxChoices(a)[0]!;expect(commandSandbox(a,choice.command)).toEqual(commandSandbox(b,choice.command))
  expect(a.ctx.events).toEqual(b.ctx.events);expect(a.ctx.rng.log).toEqual(b.ctx.rng.log)
  const bad=JSON.parse(saved);bad.atlasScene.sourceFingerprint='changed';expect(()=>restoreSandbox(JSON.stringify(bad))).toThrow()
  for(const change of [(x:any)=>x.config.seed++,(x:any)=>x.config.heroes[0]='hero.base.ranger-aggressive',(x:any)=>x.config.enemies[0]='unit.imp',(x:any)=>x.atlasScene.mapId='changed',(x:any)=>x.atlasScene.compiler='changed',(x:any)=>{const snap=JSON.parse(x.snapshot);snap.events.find((e:any)=>e.type==='unit.enter').uid=999;x.snapshot=JSON.stringify(snap)}]){
   const malformed=JSON.parse(saved);change(malformed);expect(()=>restoreSandbox(JSON.stringify(malformed))).toThrow()
  }
 })
 it('all-AI driver is byte-identical to runBattle and completion exports preserve exact initial facts',()=>{
  const a=createSandbox({...SANDBOX_DEFAULT,heroes:[SANDBOX_DEFAULT.heroes[0]!],enemies:['unit.zombie']})
  const baseline=createBattle(a.setup);a.policy={humanUnitUids:[]};const result=advanceSandbox(a);expect(result.kind).toBe('complete');runBattle(baseline)
  expect(a.ctx.events).toEqual(baseline.events);expect(a.ctx.state).toEqual(baseline.state)
  const data=exportSandbox(a);expect(data.seed.mapId).toBe(a.setup.map!.id);expect(data.events).toEqual(a.ctx.events)
  expect(data.atlasScene.initialMapFact).toEqual(a.atlasScene.initialMapFact);expect(data.outcome).toBeTruthy()
 })
 it('forwards exact self-damage preview and pool spending through the command host',()=>{
  const s=createSandbox({...SANDBOX_DEFAULT,heroes:[SANDBOX_DEFAULT.heroes[0]!]});acting(s)
  const u=s.ctx.state.units[s.ctx.battleCursor!.actor!]!,id='power.fire-master.eldritch-might'
  u.actions.push(id);u.stamina=99;u.statuses.push({id:'status.protection',value:1})
  const before=structuredClone({state:s.ctx.state,events:s.ctx.events,rng:s.ctx.rng})
  const choice=sandboxChoices(s).find(c=>c.command.actionId===id&&c.command.slot==='primary')!
  expect(choice).toBeDefined();expect(choice.preview!.selfDamage).toBeGreaterThan(0)
  expect({state:s.ctx.state,events:s.ctx.events,rng:s.ctx.rng}).toEqual(before)
  expect(commandSandbox(s,choice.command).ok).toBe(true)
  const damage=s.ctx.events.find(e=>e.type==='damage.applied'&&e.causeId===id)!
  expect(damage['amount']).toBe(choice.preview!.selfDamageApplied)
  expect((damage['amount'] as number)+(damage['overkill'] as number)).toBe(choice.preview!.selfDamage)
  expect(damage['absorbed']).toBe(1)
  expect(s.ctx.events.find(e=>e.type==='status.reduced'&&e.causeId===id)).toMatchObject({target:u.id,statusId:'status.protection',by:1})
 })
 it('forwards ordered packet forecasts and final HP facts through the same human command',()=>{
  const s=createSandbox({...SANDBOX_DEFAULT,heroes:[SANDBOX_DEFAULT.heroes[0]!],enemies:['unit.zombie']});acting(s)
  const actor=s.ctx.state.units[s.ctx.battleCursor!.actor!]!,target=s.ctx.state.units.find(u=>u.side==='enemy')!,id='attack.test-packet-flame'
  actor.actions.push(id);actor.stamina=99
  let choice:ReturnType<typeof sandboxChoices>[number]|undefined
  for(const h of s.ctx.geo.neighboursOf(actor.hex)){target.hex=h;choice=sandboxChoices(s).find(c=>c.command.actionId===id&&c.command.slot==='primary');if(choice)break}
  expect(choice).toBeDefined();if(!choice||!('target' in choice.command))throw Error('no legal adjacent packet attack')
  const before=structuredClone({state:s.ctx.state,events:s.ctx.events,rng:s.ctx.rng})
  expect(choice.preview).toEqual(preview(s.ctx,actor.id,target.id,id))
  expect(choice.preview!.packetsOnHit).toMatchObject([{id:'base',damageType:'physical'},{id:'flame',damageType:'fire'}])
  expect(choice.preview!.packetsOnCritChart).toHaveLength(3)
  expect({state:s.ctx.state,events:s.ctx.events,rng:s.ctx.rng}).toEqual(before)
  expect(commandSandbox(s,choice.command).ok).toBe(true)
  const applied=s.ctx.events.slice(before.events.length).find(e=>e.type==='damage.applied'&&e['attackId']===id)
  // The seeded attack must actually land; this is transport evidence, not a fabricated event.
  expect(applied).toBeDefined();const packets=applied!['packets'] as {applied:number;overkill:number;resolved:number}[]
  expect(packets.length).toBeGreaterThanOrEqual(2)
  expect(packets.reduce((n,p)=>n+p.applied,0)).toBe(applied!['amount'])
  expect(packets.every(p=>p.applied+p.overkill===p.resolved)).toBe(true)
  const exported=exportSandbox(s);expect(exported.events).toEqual(s.ctx.events)
 })
 it('rejects invalid configuration before creating a battle and supports variable parties',()=>{
  expect(()=>createSandbox({...SANDBOX_DEFAULT,heroes:[]})).toThrow()
  expect(()=>createSandbox({...SANDBOX_DEFAULT,seed:NaN})).toThrow()
  expect(()=>createSandbox({...SANDBOX_DEFAULT,enemies:['missing']})).toThrow()
  const s=createSandbox({...SANDBOX_DEFAULT,heroes:Array(6).fill(SANDBOX_DEFAULT.heroes[0]),enemies:Array(15).fill('unit.zombie')})
  expect(s.ctx.state.units.length).toBe(21)
 })
})

// v2.sandbox-base-roster: authored content. kingdom.opening-draft-pool (2026-10-03): the campaign draft pool is these 24 too.
import {SANDBOX_HEROES,sandboxHeroesOf} from '../src/content/sandbox.js'
import {UNITS} from '../src/engine.js'
import {HERO_ITEM_SLOTS} from '../src/content/generated/kits.js'
import {HERO_POOL,HERO_KITS} from '../src/content/heroes.js'

describe('ISC-069 — all24 authored standalone base heroes',()=>{
 it('fields every authored base hero with canonical name/class/kit and actual resolved actions',()=>{
  const ids=Object.keys(UNITS).filter(id=>id.startsWith('hero.base.')).sort();expect(ids).toHaveLength(24);expect(SANDBOX_HEROES.map(h=>h.id)).toEqual(ids)
  const burstKits:Record<string,string[]>={}
  for(const h of SANDBOX_HEROES){
   expect(h.unitType).toBe(h.id);expect(h.name).toBe(UNITS[h.id]!.name);expect(h.classes).toEqual(UNITS[h.id]!.tags!.filter(t=>t.startsWith('class.')));expect(h.equipped).toEqual(HERO_KITS[h.id]);expect(h.itemSlots).toBe(HERO_ITEM_SLOTS[h.id])
   const s=createSandbox({...SANDBOX_DEFAULT,heroes:[h.id],enemies:['unit.zombie']}),u=s.ctx.state.units[0]!
   expect(s.setup.heroes).toEqual([h.id]);expect(s.setup.heroItems).toEqual([HERO_KITS[h.id]]);expect(u.typeId).toBe(h.id);expect(u.name).toBe(h.name+' A');expect(u.actions.length).toBeGreaterThan(0)
   for(const id of u.actions)expect(s.ctx.actions[id],h.id+' missing grant '+id).toBeDefined()
   const bursts=u.actions.filter(id=>s.ctx.actions[id]!.burst!==undefined);if(bursts.length)burstKits[h.id]=bursts
  }
  /* Law 10, 2026-10-04 (engine fix.starting-kit-powers; engine DECISIONS.md 2026-10-03 'reported: the priest's Holy Texts has no
     heal in battle — three starting weapons lose their power on the way into the engine'): the Fire Staff's Flame Burst and the
     Frost Staff's Frost Nova reach the engine as bursts, so the four staff mages field one beside the three cleavers. The rule is
     unchanged: exactly the base heroes whose kit grants a burst, each with exactly its kit's bursts.
     was: expect(burstKits).toEqual({'hero.base.paladin-dark':['attack.greatsword.great-cleave'],'hero.base.warrior-barbarian':['attack.greatsword.great-cleave'],'hero.base.warrior-fearsome':['attack.halberd.cleave']}) */
  /* Law 10, 2026-10-04 (engine content.greatsword-war-axe-reauthored; engine DECISIONS.md 2026-09-28 'counterattack, special free attacks,
     the opening six, shields, custom weapons' and the Armory Ledger approved that day): the Great Sword is the Hew and the power
     Heavy Counterattack - its Great Cleave, a burst, is gone - so the two heroes who hold one field no burst. The rule is unchanged.
     was: … 'hero.base.paladin-dark':['attack.greatsword.great-cleave'],'hero.base.warrior-barbarian':['attack.greatsword.great-cleave'],'hero.base.warrior-fearsome':['attack.halberd.cleave']}) */
  expect(burstKits).toEqual({'hero.base.mage-fire':['power.fire-staff.fireball'],'hero.base.mage-fireaura':['power.fire-staff.fireball'],'hero.base.mage-sexy':['power.fire-staff.fireball'],'hero.base.mage-thinking':['power.frost-staff.frost-nova'],
   'hero.base.warrior-fearsome':['attack.halberd.cleave']})
  for(const id of ['hero.base.paladin-dark','hero.base.warrior-barbarian'])expect(createSandbox({...SANDBOX_DEFAULT,heroes:[id],enemies:['unit.zombie']}).ctx.state.units[0]!.actions,id).toEqual(expect.arrayContaining(['attack.greatsword.hew','power.greatsword.counterattack']))
  /* the two priests field Mercy, a power aimed at one ally (the same item) */
  for(const id of ['hero.base.priest-armored','hero.base.priest-pauper'])expect(createSandbox({...SANDBOX_DEFAULT,heroes:[id],enemies:['unit.zombie']}).ctx.state.units[0]!.actions,id).toContain('power.holy-texts.mercy')
  /* Law 10, 2026-10-02 (kingdom.reads-engine, review finding K9; kingdom SWITCHES.md poolHeroesAreRows): the campaign pool's two
     alpha-clone aliases are resolved — each pool hero fields as its own row, built by the sandbox's one builder. */
  /* Law 10, 2026-10-03 (kingdom.opening-draft-pool; engine DECISIONS.md 2026-10-03 'the opening draft pool is all 24 heroes,
     Rogues and Mages included'): was `expect(HERO_POOL).toHaveLength(5)` — true only of the five-hero pool. The rule: the
     campaign pool IS the sandbox's base roster, hero for hero, the same rows. */
  expect(HERO_POOL.map(h=>h.id)).toEqual(SANDBOX_HEROES.map(h=>h.id));expect(HERO_POOL).toHaveLength(24);for(const h of HERO_POOL)expect(h).toEqual(SANDBOX_HEROES.find(s=>s.id===h.id))
 })
 it('refuses named missing kit, slot, name or class rather than omitting an authored hero',()=>{
  const id='hero.base.mage-fireaura',units={[id]:UNITS[id]!}
  /* Law 10, 2026-10-02 (kingdom.reads-engine, K15): the kit is the engine row's defaultItems, so a missing kit is a row without one */
  expect(()=>sandboxHeroesOf({[id]:{...UNITS[id]!,defaultItems:[]}},HERO_ITEM_SLOTS)).toThrow(new RegExp(id+'.*kit'))
  expect(()=>sandboxHeroesOf(units,{})).toThrow(new RegExp(id+'.*itemSlots'))
  expect(()=>sandboxHeroesOf({[id]:{...UNITS[id]!,tags:['hero']}},HERO_ITEM_SLOTS)).toThrow(new RegExp(id+'.*class'))
  expect(()=>sandboxHeroesOf({[id]:{...UNITS[id]!,name:''}},HERO_ITEM_SLOTS)).toThrow(new RegExp(id+'.*name'))
 })
 it('duplicates are independently cloned, keep distinct stable UIDs, and save deterministically on frozen Atlas',()=>{
  const id='hero.base.warrior-barbarian',config={...SANDBOX_DEFAULT,heroes:[id,id],enemies:['unit.zombie']},a=createSandbox(config),b=createSandbox(config)
  expect(a.ctx.events).toEqual(b.ctx.events);expect(a.policy.humanUnitUids).toEqual(b.policy.humanUnitUids);expect(new Set(a.policy.humanUnitUids).size).toBe(2)
  const before=JSON.stringify(SANDBOX_HEROES),other=a.ctx.state.units[1]!.actions.slice();a.ctx.state.units[0]!.actions.pop();expect(a.ctx.state.units[1]!.actions).toEqual(other);expect(JSON.stringify(SANDBOX_HEROES)).toBe(before)
  const restored=restoreSandbox(saveSandbox(b));expect(restored.ctx.events).toEqual(b.ctx.events);expect(restored.ctx.rng.log).toEqual(b.ctx.rng.log);expect(restored.policy).toEqual(b.policy);expect(restored.atlasScene).toEqual(b.atlasScene)
  expect(SANDBOX_DEFAULT.heroes).toHaveLength(3);expect(()=>createSandbox({...config,heroes:['hero.base.unknown']})).toThrow(/Unknown/)
  for(const heroes of [[],Array(7).fill(id)])expect(()=>createSandbox({...config,heroes})).toThrow(/1–6/)
  for(const enemies of [[],Array(16).fill('unit.zombie')])expect(()=>createSandbox({...config,enemies})).toThrow(/1–15/)
  expect(createSandbox({...config,heroes:Array(6).fill(id),enemies:Array(15).fill('unit.zombie')}).ctx.state.units).toHaveLength(21)
 })
})

// v2.sandbox-burst-centres: real authored kit and real engine commands only.
import * as sandboxDoor from '../src/core/sandbox.js'
import * as engineDoor from '../src/engine.js'
import {vi} from 'vitest'
const burstConfig={mapId:'showcase.atlas-priory',heroes:['hero.base.warrior-fearsome'],enemies:['unit.zombie'],seed:1}
const cleave='attack.halberd.cleave'
const burstChoice=(s:ReturnType<typeof createSandbox>,centre:number)=>{
 const choice=sandboxChoices(s).find(c=>c.command.actionId===cleave&&c.command.slot==='primary'&&'centre' in c.command&&c.command.centre===centre)
 expect(choice,'engine legal burst centre '+centre).toBeDefined();return choice!
}
function walkToBurst(s:ReturnType<typeof createSandbox>){
 acting(s)
 for(const destination of [85,90,72]){
  const move=sandboxChoices(s).find(c=>c.command.actionId==='power.move'&&c.command.slot==='movement'&&'destination' in c.command&&c.command.destination===destination)
  expect(move).toBeDefined();expect(commandSandbox(s,move!.command).ok).toBe(true)
  if(destination!==72){expect(commandSandbox(s,{kind:'end-cycle',actor:0,expectedSeq:s.ctx.state.seq}).ok).toBe(true);acting(s)}
 }
}
describe('ISC-069 — engine burst centres and selected forecast',()=>{
 it('enumerates empty legal centres per slot without forecasting recipients',()=>{
  const s=createSandbox(burstConfig);acting(s)
  const choices=sandboxChoices(s),centres=choices.filter(c=>c.command.actionId===cleave)
  expect(centres.some(c=>'centre' in c.command&&c.command.centre===81)).toBe(true)
  expect(centres.some(c=>'centre' in c.command&&c.command.centre===100)).toBe(true)
  const spy=vi.spyOn(engineDoor,'previewBurst'),before=saveSandbox(s)
  try{const listed=sandboxChoices(s);expect(spy).not.toHaveBeenCalled();expect(saveSandbox(s)).toBe(before)
   for(const c of listed.filter(c=>c.command.actionId===cleave)){expect(c.preview).toBeNull();expect(validateBattleCommand(s.ctx,s.policy,c.command).ok).toBe(true)}
  }finally{spy.mockRestore()}
 })
 it('previews only one selected legal command, without events/RNG/state changes; rejects stale, malformed and enemy choices',()=>{
  const s=createSandbox(burstConfig);acting(s);const c=burstChoice(s,81),before=saveSandbox(s)
  const spy=vi.spyOn(engineDoor,'previewBurst')
  try{const p=sandboxDoor.previewSandboxChoice(s,c.command);expect(spy).toHaveBeenCalledTimes(1);expect(p).toEqual(engineDoor.previewBurst(s.ctx,0,81,cleave));expect(p!.targets).toEqual([])
   for(const bad of [null,{...c.command,expectedSeq:s.ctx.state.seq-1},{...c.command,actor:1},{...c.command,centre:-1},{...c.command,target:1}])expect(()=>sandboxDoor.previewSandboxChoice(s,bad)).toThrow()
   expect(saveSandbox(s)).toBe(before)
  }finally{spy.mockRestore()}
 })
 it('executes an empty centre through the normal slot/payment boundary and preserves it in saves/exports',()=>{
  const s=createSandbox(burstConfig);acting(s);const c=burstChoice(s,81),before=s.ctx.events.length,stamina=s.ctx.state.units[0]!.stamina
  expect(commandSandbox(s,c.command).ok).toBe(true)
  const events=s.ctx.events.slice(before),declared=events.find(e=>e.type==='burst.declared')!
  expect(declared).toBeDefined();expect(declared['centre']).toBe(81);expect(declared['targets']).toEqual([])
  expect(events.filter(e=>e.type==='action.spent'&&e.actor===0)).toEqual([expect.objectContaining({actor:0,actionId:cleave,slot:'primary',free:false,moveUsed:false,primaryUsed:true})])
  // The host also advances phase-end regeneration and enemy AI; verify the exact payment moment.
  expect(events.filter(e=>e.type==='stamina.spent'&&e.actor===0)).toEqual([expect.objectContaining({causeId:cleave,amount:c.cost,stamina:stamina-c.cost})])
  expect(s.ctx.state.units[0]!.primaryUsed).toBe(true)
  expect(events.some(e=>e.type==='attack.hit')).toBe(false)
  expect(sandboxChoices(s).some(c=>c.command.actionId===cleave&&c.command.slot==='primary')).toBe(false)
  const state=saveSandbox(s);expect(commandSandbox(s,c.command).ok).toBe(false);expect(saveSandbox(s)).toBe(state)
  const restored=restoreSandbox(state);expect(restored.ctx.events).toEqual(s.ctx.events);expect(restored.ctx.rng.log).toEqual(s.ctx.rng.log);expect(exportSandbox(restored)).toEqual(exportSandbox(s))
 })
 // Multi-turn simulation + two restorations exceeded Vitest's 5s default under the full parallel suite.
 // Keep a bounded integration budget; this probe specifies combat/state parity, not a latency target.
 it('forecasts real recipient HP on the authored Priory after legal moves, then matches resolution and restored replay',{timeout:15_000},()=>{
  const s=createSandbox(burstConfig);walkToBurst(s);const c=burstChoice(s,92),before=saveSandbox(s)
  const p=sandboxDoor.previewSandboxChoice(s,c.command)!;expect(p.targets).toHaveLength(1);expect(p.targets[0]).toMatchObject({id:1,hex:92,applied:5});expect(saveSandbox(s)).toBe(before)
  const b=restoreSandbox(before),start=s.ctx.events.length;expect(commandSandbox(s,c.command).ok).toBe(true);expect(commandSandbox(b,c.command).ok).toBe(true)
  expect(b.ctx.events).toEqual(s.ctx.events);expect(b.ctx.rng.log).toEqual(s.ctx.rng.log)
  const damage=s.ctx.events.slice(start).find(e=>e.type==='damage.applied'&&e.target===1&&e.causeId===cleave)!
  expect(damage['amount']).toBe(p.targets[0]!.applied);expect(damage['packets']).toEqual(p.targets[0]!.packets);expect(exportSandbox(s).events).toEqual(s.ctx.events)
 })
})


import {sandboxTargetingOf} from '../src/ui/sandbox-targeting.js'
it('ISC-069 projects only exact engine centre/footprint/shield facts into detached host targeting data',()=>{
 const s=createSandbox(burstConfig);acting(s);const choices=sandboxChoices(s).filter(c=>c.command.actionId===cleave&&c.command.slot==='primary'),command=burstChoice(s,81).command
 const before=saveSandbox(s),p=sandboxDoor.previewSandboxChoice(s,command),facts=sandboxTargetingOf(choices,p)
 expect(facts).toEqual({legalHexes:choices.map(c=>'centre' in c.command?c.command.centre:-1),centre:p.centre,hexes:p.hexes,shielded:p.targets.filter(t=>t.shielded.length).map(t=>({hex:t.hex,props:t.shielded}))})
 expect(saveSandbox(s)).toBe(before)
 // Detached facts must not rewrite the preview or choices when the host/renderer consumes them.
 const original=JSON.stringify({choices,p});if(!facts)throw Error('missing targeting facts')
 facts.hexes.push(0);facts.legalHexes.push(0);expect(JSON.stringify({choices,p})).toBe(original)
})
