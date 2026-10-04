// Standalone host adapter. All choices and resolution belong to the engine.
import {encounterDef,createBattle,advanceBattle,completeActionCycle,runActivation,activationChoices,controllerOf,validateBattleCommand,executeBattleCommand,isAttack,isMove,isBurst,burstCentres,previewBurst,preview,previewPower,saveBattle,restoreBattle,movementOptions,staminaCostOf,swapCostOf,propAttackHexes} from '../engine.js'
import type {Ctx,BattleOptions,BattleCommand,ControlPolicy} from '../engine.js'
import {SANDBOX_HEROES,SANDBOX_ENEMIES,SANDBOX_ENCOUNTERS} from '../content/sandbox.js'
import {atlasFieldingOf,type AtlasBinding} from '../content/atlas.js'
import {makeBattleState,battleOptionsOf,makeBattleResult,type EngagementResult} from './seam.js'
import type {Hero} from './campaign.js'
import {compileAtlasCombat,canonicalJSON} from '../../../tools/battle-atlas/combat-compiler.mjs'

/**
 * `encounterId` (kingdom.encounter-battles, engine 2026-09-28): play an engine encounter instead of a free
 * battle — its map, its units, its schedule, its civilians and its outcome are the encounter's; `mapId`
 * and `enemies` are ignored. The heroes are the player's; everyone else, civilians included, the AI's.
 *
 * `heroRows` (kingdom.sandbox-campaign-heroes, part 1 of kingdom.opening-loop-three): the heroes as campaign Hero
 * rows — level, specialty, levelPick, equipped and used, wound, badges — handed to makeBattleState unchanged, so
 * the hero who plays battle 2 is the hero battle 1 left behind. `heroes` names the rows' ids, in order. Absent,
 * the rows are built fresh from SANDBOX_HEROES (?play= and ?heroes=, exactly as before).
 */
export type SandboxConfig={mapId:string;heroes:string[];enemies:string[];seed:number;encounterId?:string;heroRows?:Hero[]}
export type Sandbox={config:SandboxConfig;setup:BattleOptions;ctx:Ctx;policy:ControlPolicy;atlasScene?:AtlasBinding}
/** A free battle always stands on an authored Atlas battlefield. */
export type AtlasSandbox=Sandbox&{atlasScene:AtlasBinding}
type ActionCommand=Extract<BattleCommand,{kind:'action'}>
export type SandboxChoice={name:string;cost:number;command:ActionCommand;preview:Record<string,unknown>|null;path:number[]}
/** Which heroes are known: the sandbox's presets, or — given campaign rows — exactly the rows, named in order. */
function heroesKnown(config:SandboxConfig){
 if(config.heroRows===undefined)return config.heroes.every(id=>SANDBOX_HEROES.some(h=>h.id===id))
 if(!Array.isArray(config.heroRows)||config.heroRows.length!==config.heroes.length||config.heroRows.some((h,i)=>h?.id!==config.heroes[i]))throw Error('Hero rows and heroes disagree')
 return true
}
function configured(config:SandboxConfig){
 if(!config||!Number.isSafeInteger(config.seed)||config.seed<0||config.seed>2147483647)throw Error('Seed must be an integer from 0 to 2147483647')
 if(config.encounterId!==undefined){
  if(!SANDBOX_ENCOUNTERS.some(e=>e.id===config.encounterId))throw Error('Choose an available encounter')
  if(!Array.isArray(config.heroes)||config.heroes.length<1||config.heroes.length>6)throw Error('Choose 1–6 heroes')
  if(!heroesKnown(config))throw Error('Unknown hero')
  return null
 }
 const field=atlasFieldingOf(config.mapId);if(!field)throw Error('Choose an available Atlas battlefield')
 if(!Array.isArray(config.heroes)||config.heroes.length<1||config.heroes.length>6)throw Error('Choose 1–6 heroes')
 if(!Array.isArray(config.enemies)||config.enemies.length<1||config.enemies.length>15)throw Error('Choose 1–15 enemies')
 if(!heroesKnown(config)||config.enemies.some(id=>!SANDBOX_ENEMIES.some(e=>e.id===id)))throw Error('Unknown hero or enemy')
 return field
}
/**
 * kingdom.civilians-played (engine DECISIONS.md 2026-09-30 "the civilians are played"; 2026-08-26 "Civilians are exactly
 * like heroes"): the player plays every unit fielded on the heroes' side — the drafted heroes and an encounter's
 * civilians — read from the battle's initial fielding. (Until 2026-09-30 the civilians were left to the AI.)
 */
export function playerPolicy(ctx:{state:{units:readonly {uid:number;side:string}[]}}){return {humanUnitUids:ctx.state.units.filter(u=>u.side==='hero').map(u=>u.uid)}}
export function createSandbox(config:SandboxConfig&{encounterId?:undefined}):AtlasSandbox
export function createSandbox(config:SandboxConfig):Sandbox
export function createSandbox(config:SandboxConfig):Sandbox{
 const {field,encounter,spec}=sandboxSpec(config)
 const setup:BattleOptions=encounter?{...battleOptionsOf(spec),encounter}:battleOptionsOf(spec),ctx=createBattle(setup)
 return {config:structuredClone(config),setup,ctx,policy:playerPolicy(ctx),...(field?{atlasScene:field.atlasScene}:{})}
}
/** The fielding a config names: the roster keyed `hero-0`… in order, through makeBattleState — one place, so the fold reads the spec the battle was fielded from. */
function sandboxSpec(config:SandboxConfig){
 const field=configured(config),roster=Object.fromEntries((config.heroRows??config.heroes.map(id=>SANDBOX_HEROES.find(h=>h.id===id)!)).map((h,i)=>['hero-'+i,structuredClone(h)]))
 // an encounter: the engine's own row fields its map, units and schedule; the heroes stand in its hero zone
 const encounter=config.encounterId!==undefined?encounterDef(config.encounterId):null
 const spec=makeBattleState(roster,encounter?{id:encounter.id,mapId:encounter.mapId??(()=>{throw Error(`encounter '${encounter.id}' names no map`)})(),enemies:[],deployed:Object.keys(roster),seed:config.seed}:{id:field!.id,mapId:config.mapId,enemies:config.enemies,deployed:Object.keys(roster),seed:config.seed})
 return {field,encounter,spec}
}
/**
 * kingdom.encounter-result-fold (kingdom.opening-loop-three part 2 of 4; V2-ROADMAP R8): a finished sandbox battle, folded
 * to the EngagementResult the Reckoning takes — its rows keyed by uid, hero row i the config's heroes[i] (so, given campaign
 * rows, the Engagement's deployed[i]); an encounter's own units and its arrivals are rows of their own. Its id is the
 * encounter's (or the battlefield's). An unfinished battle is refused (Law 9).
 */
export function sandboxResult(s:Sandbox):EngagementResult{
 const {spec}=sandboxSpec(s.config)
 if(s.setup.heroUids!==undefined&&canonicalJSON(s.setup.heroUids)!==canonicalJSON(spec.heroUids))throw Error('Saved setup and configuration disagree: heroUids')
 return makeBattleResult(spec,s.ctx.events)
}
/**
 * The fall areas marked and not yet landed (engine encounter.area-fall): each area.marked line without its
 * area.landed, read from the log alone — what the player must see coming until the areas land.
 */
export function sandboxMarkedAreas(s:Sandbox):{fall:string;hexes:number[];landsAfterTurn:number}[]{
 const landed=new Set(s.ctx.events.filter(e=>e.type==='area.landed').map(e=>e.causeId))
 return s.ctx.events.filter(e=>e.type==='area.marked'&&!landed.has(e.causeId)).map(e=>({fall:e.causeId,hexes:[...new Set((e['areas'] as number[][]).flat())].sort((a,b)=>a-b),landsAfterTurn:(e['lands'] as number|undefined)??e.turn+1}))
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
/**
 * viewer.swap-button-rearranges (engine DECISIONS.md 2026-10-03 'the swap button says "Swap" and opens a rearranging of the
 * unit's gear'): every OTHER arrangement of what the acting hero carries — each hand list the engine refuses, with the
 * engine's own reason (the list now held is among them: "nothing changes"). With sandboxSwapChoices these are all the
 * arrangements there are of the instances carried, in the same carried order; the gear panel says why one is refused from
 * here. Law 2: validateBattleCommand decides every one.
 */
export function sandboxSwapRefusals(s:Sandbox):{hands:string[];why:string}[]{
 const ctx=s.ctx,actor=ctx.battleCursor?.actor
 if(ctx.state.outcome||ctx.battleCursor?.at!=='acting'||actor==null||controllerOf(ctx,actor,s.policy)!=='human')return []
 const u=ctx.state.units[actor]!
 if(!u.loadout)return []
 const carried=[...u.loadout.hands,...u.loadout.stowed],out:{hands:string[];why:string}[]=[]
 for(let mask=0;mask<1<<carried.length;mask++){
  const hands=carried.filter((_,k)=>mask&(1<<k)).map(i=>i.instanceId)
  const valid=validateBattleCommand(ctx,s.policy,{kind:'swap',actor,hands,expectedSeq:ctx.state.seq})
  if(!valid.ok)out.push({hands,why:valid.reason.replace(/^illegal-swap: /,'')})
 }
 return out
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
export function exportSandbox<S extends Sandbox>(s:S,provenance?:{engineCommit:string;engineDirty:boolean}){
 const map=s.ctx.events.find(e=>e.type==='map.loaded')!;
 return {seed:{mapId:map['mapId'] as string,replicate:s.config.seed,scenarioId:s.setup.scenarioId},...provenance,outcome:s.ctx.state.outcome,turns:s.ctx.state.turn,events:structuredClone(s.ctx.events),atlasScene:structuredClone(s.atlasScene) as S['atlasScene']}
}
export function saveSandbox(s:Sandbox):string{return JSON.stringify({format:'hbt-sandbox',version:1,config:s.config,setup:s.setup,...(s.atlasScene?{atlasScene:s.atlasScene}:{}),snapshot:saveBattle(s.ctx)})}
export function restoreSandbox(text:string):Sandbox{
 const saved=JSON.parse(text);if(saved?.format!=='hbt-sandbox'||saved.version!==1)throw Error('Not a supported sandbox save')
 configured(saved.config)
 const expected=createSandbox(saved.config).setup
 for(const key of ['heroes','enemies','replicate','heroItems','scenarioId'] as const){
  if(canonicalJSON(expected[key])!==canonicalJSON(saved.setup?.[key]))throw Error('Saved configuration and setup disagree: '+key)
 }
 if(saved.config.encounterId!==undefined){
  // an encounter save: the engine's own row, re-read, must be the one the save carries; then the same fielding checks
  if(canonicalJSON(expected.encounter)!==canonicalJSON(saved.setup?.encounter))throw Error('Saved configuration and setup disagree: encounter')
  const runtime=createBattle(saved.setup),ctx=restoreBattle(saved.snapshot,runtime)
  if(canonicalJSON(ctx.events.slice(0,runtime.events.length))!==canonicalJSON(runtime.events))throw Error('Saved initial roster, identities or fielding disagree')
  return {config:structuredClone(saved.config),setup:saved.setup,ctx,policy:playerPolicy(runtime)}
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
 return {config:structuredClone(saved.config),setup:saved.setup,ctx,atlasScene:saved.atlasScene,policy:playerPolicy(runtime)}
}
