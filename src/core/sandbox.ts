// Standalone host adapter. All choices and resolution belong to the engine.
import {createBattle,advanceBattle,completeActionCycle,runActivation,activationChoices,controllerOf,validateBattleCommand,executeBattleCommand,isAttack,isMove,isBurst,burstCentres,previewBurst,preview,previewPower,saveBattle,restoreBattle,movementOptions,staminaCostOf,swapCostOf,propAttackHexes} from '../engine.js'
import type {Ctx,BattleOptions,BattleCommand,ControlPolicy} from '../engine.js'
import {SANDBOX_HEROES,SANDBOX_ENEMIES} from '../content/sandbox.js'
import {atlasFieldingOf,type AtlasBinding} from '../content/atlas.js'
import {makeBattleState,battleOptionsOf} from './seam.js'
import {compileAtlasCombat,canonicalJSON} from '../../../tools/battle-atlas/combat-compiler.mjs'

export type SandboxConfig={mapId:string;heroes:string[];enemies:string[];seed:number}
export type Sandbox={config:SandboxConfig;setup:BattleOptions;ctx:Ctx;policy:ControlPolicy;atlasScene:AtlasBinding}
type ActionCommand=Extract<BattleCommand,{kind:'action'}>
export type SandboxChoice={name:string;cost:number;command:ActionCommand;preview:Record<string,unknown>|null;path:number[]}
function configured(config:SandboxConfig){
 if(!config||!Number.isSafeInteger(config.seed)||config.seed<0||config.seed>2147483647)throw Error('Seed must be an integer from 0 to 2147483647')
 const field=atlasFieldingOf(config.mapId);if(!field)throw Error('Choose an available Atlas battlefield')
 if(!Array.isArray(config.heroes)||config.heroes.length<1||config.heroes.length>6)throw Error('Choose 1–6 heroes')
 if(!Array.isArray(config.enemies)||config.enemies.length<1||config.enemies.length>15)throw Error('Choose 1–15 enemies')
 if(config.heroes.some(id=>!SANDBOX_HEROES.some(h=>h.id===id))||config.enemies.some(id=>!SANDBOX_ENEMIES.some(e=>e.id===id)))throw Error('Unknown hero or enemy')
 return field
}
export function createSandbox(config:SandboxConfig):Sandbox{
 const field=configured(config),roster=Object.fromEntries(config.heroes.map((id,i)=>['hero-'+i,structuredClone(SANDBOX_HEROES.find(h=>h.id===id)!)]))
 const spec=makeBattleState(roster,{id:field.id,mapId:config.mapId,enemies:config.enemies,deployed:Object.keys(roster),seed:config.seed})
 const setup=battleOptionsOf(spec),ctx=createBattle(setup)
 return {config:structuredClone(config),setup,ctx,policy:{humanUnitUids:ctx.state.units.slice(0,config.heroes.length).map(u=>u.uid)},atlasScene:field.atlasScene}
}
export function advanceSandbox(s:Sandbox){
 for(;;){const next=advanceBattle(s.ctx,s.policy);if(next.kind==='complete'||next.kind==='selecting'||controllerOf(s.ctx,next.actor,s.policy)==='human')return next
  runActivation(s.ctx,next.actor);completeActionCycle(s.ctx)
 }
}
export function sandboxActivationChoices(s:Sandbox){return activationChoices(s.ctx,s.policy).map(uid=>{const u=s.ctx.state.units.find(u=>u.uid===uid)!;return {uid,name:u.name,hex:u.hex}})}
export function sandboxChoices(s:Sandbox):SandboxChoice[]{
 const ctx=s.ctx,actor=ctx.battleCursor?.actor
 if(ctx.state.outcome||ctx.battleCursor?.at!=='acting'||actor==null||controllerOf(ctx,actor,s.policy)!=='human')return []
 const u=ctx.state.units[actor]!,out:SandboxChoice[]=[]
 for(const id of u.actions){const a=ctx.actions[id];if(!a)continue
  for(const slot of ['movement','primary'] as const){
   const aims=isMove(a)?movementOptions(ctx,actor,id,slot).map(p=>({destination:p.destination,path:p.path})):isBurst(a)?burstCentres(ctx,actor,id,slot).map(centre=>({centre,path:[]})):[...ctx.state.units.map(t=>({target:t.id,path:[]})),
     // V2 R7 (engine v2.prop-attack): an attack with Destroy may also be aimed at a prop's hex; the engine lists and validates them
     ...(isAttack(a)?propAttackHexes(ctx,actor,id,slot).map(hex=>({hex,path:[]})):[])]
   for(const aim of aims){const {path,...target}=aim,command:ActionCommand={kind:'action',actor,actionId:id,slot,expectedSeq:ctx.state.seq,...target}
    if(!validateBattleCommand(ctx,s.policy,command).ok)continue
    out.push({name:a.name,cost:staminaCostOf(u,a),command,path,preview:'target' in command?(isAttack(a)?preview(ctx,actor,command.target,id):previewPower(ctx,actor,command.target,id)):null})
   }
  }
 }
 return out
}
type SwapCommand=Extract<BattleCommand,{kind:'swap'}>
export type SandboxSwapChoice={label:string;hands:string[];command:SwapCommand}
export type SandboxSwapOffer={choices:SandboxSwapChoice[];cost:number|null;why:string|null}
/**
 * V2 R6 (COMBAT-V2 §11.2; engine v2.loadout-swap): the engine's swap, offered to the acting
 * human-controlled hero. A swap names the instances to hold afterwards (engine SWITCHES
 * swapShape). Every set of the instances carried is a candidate, in carried order (hands, then
 * stowed; SWITCHES.md sandboxSwapOrder); the engine's validateBattleCommand keeps the legal ones
 * (Law 2 — the host decides nothing). With none legal, `why` is the engine's own reason.
 */
export function sandboxSwapChoices(s:Sandbox):SandboxSwapOffer{
 const ctx=s.ctx,actor=ctx.battleCursor?.actor,none={choices:[],cost:null,why:null}
 if(ctx.state.outcome||ctx.battleCursor?.at!=='acting'||actor==null||controllerOf(ctx,actor,s.policy)!=='human')return none
 const u=ctx.state.units[actor]!
 if(!u.loadout)return none
 const carried=[...u.loadout.hands,...u.loadout.stowed],choices:SandboxSwapChoice[]=[]
 let why:string|null=null
 const now=u.loadout.hands.map(i=>i.instanceId).join()
 for(let mask=0;mask<1<<carried.length;mask++){
  const picked=carried.filter((_,k)=>mask&(1<<k)),hands=picked.map(i=>i.instanceId)
  const command:SwapCommand={kind:'swap',actor,hands,expectedSeq:ctx.state.seq}
  const valid=validateBattleCommand(ctx,s.policy,command)
  // the reason shown is one for a real change: holding what is already held is always refused
  if(!valid.ok){if(hands.join()!==now)why??=valid.reason.replace(/^illegal-swap: /,'');continue}
  choices.push({label:picked.length?picked.map(i=>ctx.items[i.itemId]?.name??i.itemId).join(' + '):'Nothing in hand',hands,command})
 }
 return {choices,cost:swapCostOf(ctx,u),why:choices.length?null:why}
}
/** Forecast a single current burst command. Enumeration never calls this resolver. */
export function previewSandboxChoice(s:Sandbox,command:unknown){
 const valid=validateBattleCommand(s.ctx,s.policy,command)
 if(!valid.ok)throw Error(valid.reason)
 const c=command as ActionCommand
 if(c.kind!=='action'||!('centre' in c)||!isBurst(s.ctx.actions[c.actionId]!))throw Error('Choose a burst centre for this forecast')
 return previewBurst(s.ctx,c.actor,c.centre,c.actionId)
}
export function commandSandbox(s:Sandbox,command:unknown){const result=executeBattleCommand(s.ctx,s.policy,command);if(result.ok)advanceSandbox(s);return result}
export function exportSandbox(s:Sandbox,provenance?:{engineCommit:string;engineDirty:boolean}){
 const map=s.ctx.events.find(e=>e.type==='map.loaded')!;
 return {seed:{mapId:map['mapId'] as string,replicate:s.config.seed,scenarioId:s.setup.scenarioId},...provenance,outcome:s.ctx.state.outcome,turns:s.ctx.state.turn,events:structuredClone(s.ctx.events),atlasScene:structuredClone(s.atlasScene)}
}
export function saveSandbox(s:Sandbox):string{return JSON.stringify({format:'hbt-sandbox',version:1,config:s.config,setup:s.setup,atlasScene:s.atlasScene,snapshot:saveBattle(s.ctx)})}
export function restoreSandbox(text:string):Sandbox{
 const saved=JSON.parse(text);if(saved?.format!=='hbt-sandbox'||saved.version!==1)throw Error('Not a supported sandbox save')
 configured(saved.config)
 const expected=createSandbox(saved.config).setup
 for(const key of ['heroes','enemies','replicate','heroItems','scenarioId'] as const){
  if(canonicalJSON(expected[key])!==canonicalJSON(saved.setup?.[key]))throw Error('Saved configuration and setup disagree: '+key)
 }
 const runtime=createBattle(saved.setup),ctx=restoreBattle(saved.snapshot,runtime)
 const binding=saved.atlasScene
 const compiled=compileAtlasCombat(binding.layout,binding.catalog,{areaIndex:binding.areaIndex,policy:binding.policy})
 if(binding.compiler!==compiled.compiler||binding.mapId!==binding.layout.id||compiled.sourceFingerprint!==binding.sourceFingerprint||canonicalJSON(compiled.map)!==canonicalJSON(saved.setup.map))throw Error('Saved Atlas sources and map disagree')
 for(const state of [runtime,ctx]){
  const initial=state.events.find(e=>e.type==='map.loaded')!
  const fact=Object.fromEntries(['mapId','width','height','deploy','terrain','props','floor'].filter(k=>Object.hasOwn(initial,k)).map(k=>[k,initial[k]]))
  if(canonicalJSON(fact)!==canonicalJSON(binding.initialMapFact))throw Error('Saved Atlas initial facts disagree')
 }
 if(runtime.state.units.length!==saved.config.heroes.length+saved.config.enemies.length)throw Error('Saved roster and setup disagree')
 if(canonicalJSON(ctx.events.slice(0,runtime.events.length))!==canonicalJSON(runtime.events))throw Error('Saved initial roster, identities or fielding disagree')
 return {config:structuredClone(saved.config),setup:saved.setup,ctx,atlasScene:saved.atlasScene,policy:{humanUnitUids:runtime.state.units.slice(0,saved.config.heroes.length).map(u=>u.uid)}}
}
