import {describe,it,expect} from 'vitest'
import {createSandbox,advanceSandbox,sandboxChoices,commandSandbox,saveSandbox,restoreSandbox,exportSandbox} from '../src/core/sandbox.js'
import {SANDBOX_DEFAULT} from '../src/content/sandbox.js'
import {createBattle,runBattle,controllerOf,validateBattleCommand,preview,isAttack} from '../src/engine.js'

describe('ISC-069 — a human battle uses the simulation engine',()=>{
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
  const s=createSandbox({...SANDBOX_DEFAULT,heroes:[SANDBOX_DEFAULT.heroes[0]!]});advanceSandbox(s);const before=s.ctx.events.length
  const choices=sandboxChoices(s);expect(choices.length).toBeGreaterThan(0);expect(s.ctx.events.length).toBe(before)
  for(const choice of choices){expect(validateBattleCommand(s.ctx,s.policy,choice.command).ok).toBe(true)
   const a=s.ctx.actions[choice.command.actionId]!;if(isAttack(a)&&'target' in choice.command)expect(choice.preview).toEqual(preview(s.ctx,choice.command.actor,choice.command.target,choice.command.actionId))}
  const command=choices.find(x=>'destination' in x.command)!.command
  expect(commandSandbox(s,command).ok).toBe(true);const after=s.ctx.events.length
  expect(commandSandbox(s,command).ok).toBe(false);expect(s.ctx.events.length).toBe(after)
 })
 it('end activation advances AI, ownership never follows changed allegiance, and wrong actors are refused',()=>{
  const s=createSandbox(SANDBOX_DEFAULT);const step=advanceSandbox(s);expect(step.kind).toBe('acting')
  if(step.kind!=='acting')throw Error('expected hero')
  const actor=s.ctx.state.units[step.actor]!;actor.side='enemy';expect(controllerOf(s.ctx,actor.id,s.policy)).toBe('human');actor.side='hero'
  const enemy=s.ctx.state.units.find(u=>!s.policy.humanUnitUids.includes(u.uid))!;enemy.side='hero';expect(controllerOf(s.ctx,enemy.id,s.policy)).toBe('ai');enemy.side='enemy'
  expect(commandSandbox(s,{kind:'end-cycle',actor:enemy.id,expectedSeq:s.ctx.state.seq}).ok).toBe(false)
  for(let n=0;n<15&&!s.ctx.events.some(e=>e.type==='ai.mode');n++){const next=advanceSandbox(s);if(next.kind==='complete')break;expect(commandSandbox(s,{kind:'end-cycle',actor:next.actor,expectedSeq:s.ctx.state.seq}).ok).toBe(true)}
  expect(s.ctx.events.some(e=>e.type==='ai.mode')).toBe(true)
 })
 it('an actual legal attack exposes the exact engine preview without consuming a roll',()=>{
  const s=createSandbox({...SANDBOX_DEFAULT,heroes:[SANDBOX_DEFAULT.heroes[0]!],enemies:['unit.zombie']});advanceSandbox(s)
  let attack
  for(let n=0;n<15&&!s.ctx.state.outcome;n++){
   attack=sandboxChoices(s).find(c=>isAttack(s.ctx.actions[c.command.actionId]!));if(attack)break
   const step=advanceSandbox(s);if(step.kind==='complete')break
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
  const a=createSandbox({...SANDBOX_DEFAULT,heroes:[SANDBOX_DEFAULT.heroes[0]!]});advanceSandbox(a);const saved=saveSandbox(a),b=restoreSandbox(saved)
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
 it('rejects invalid configuration before creating a battle and supports variable parties',()=>{
  expect(()=>createSandbox({...SANDBOX_DEFAULT,heroes:[]})).toThrow()
  expect(()=>createSandbox({...SANDBOX_DEFAULT,seed:NaN})).toThrow()
  expect(()=>createSandbox({...SANDBOX_DEFAULT,enemies:['missing']})).toThrow()
  const s=createSandbox({...SANDBOX_DEFAULT,heroes:Array(6).fill(SANDBOX_DEFAULT.heroes[0]),enemies:Array(15).fill('unit.zombie')})
  expect(s.ctx.state.units.length).toBe(21)
 })
})
