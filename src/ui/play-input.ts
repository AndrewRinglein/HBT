// viewer.play-input (PLAYABLE-OPENING-PLAN.md item 7; engine DECISIONS.md 2026-09-29 "the playable battle screen" and
// "the playable screen: the acting mark, pointing at an enemy, the forecast"; VFX/UI-BUILD-NOTES-2026-09-02.md §5).
// The mouse on the battle screen: "click a hero to act; click an action-bar slot to choose the action; click a hex for
// a ghost, click again to confirm; right-click steps back; with an attack chosen an arrow follows the pointer and
// whatever it is over shows the forecast (hit chance, damage, the notch or skull on its Health bar); with nothing
// chosen, pointing at an enemy lights up where it can move and hit; zone-of-control hatching and the path preview
// while planning a move." Every legality and number is the engine's: the legal commands are the sandbox's validated
// choices (validateBattleCommand), the ghost is forecastFrom, its attack previewFrom, the enemy's reach threatOf, the
// hatching zocHoldersAt. This file only remembers what the player has chosen, asks the engine, and hands the viewer
// plain facts to draw (viewer SWITCHES / kingdom SWITCHES.md playInput*). It never computes a range, a path or a number.
import {sandboxChoices,sandboxActivationChoices,type Sandbox,type SandboxChoice} from '../core/sandbox.js'
import {controllerOf,validateBattleCommand,forecastFrom,previewFrom,preview,threatOf,zocHoldersAt,isAttack,isMove} from '../engine.js'
import type {BattleCommand,Forecast} from '../engine.js'

export type PlayEvent={kind:'hex';hex:number}|{kind:'point';hex:number|null}|{kind:'unit';id:number;hex:number}|{kind:'back'}|{kind:'slot';actionId:string;unit:number|null}
export type PlayAim={from:number;to:number;target:number|null;hit:number|null;dmg:number|null;hpAfter:number|null;lethal:boolean;locked:boolean}
/** What the viewer draws (viewer src/play.js validates the same shape). Hexes ascending unless named a walk. */
export type PlayFacts={actor:number|null;slot:string|null;reach:number[];zoc:number[];path:number[];provokes:number[];ghost:{unit:number;hex:number}|null;threat:{unit:number;move:number[];hit:number[]}|null;targets:number[];aim:PlayAim|null;note:string|null}
export type CommandResult={ok:true}|{ok:false;reason:string}
/** One aimable use of the chosen action: the command's aim field and the hex it is drawn on. */
type Use={hex:number;key:'target'|'centre'|'hex';value:number;slot:'movement'|'primary'}
type Ghost={actionId:string;slot:'movement'|'primary';destination:number}
/** The forecast the player saw when they confirmed, and what the engine then said — the probe of "the forecast shown equals what lands". */
export type Shown={actor:number;actionId:string;target:number;hit:number;dmg:number;hpAfter:number|null;fromGhost:boolean}

const asc=(a:Iterable<number>)=>[...new Set(a)].sort((x,y)=>x-y)

export function createPlayInput(session:()=>Sandbox|null,run:(command:BattleCommand)=>CommandResult){
 let chosen:string|null=null,ghost:Ghost|null=null,aim:{hex:number;locked:boolean}|null=null,point:number|null=null,note:string|null=null
 let owner:string|null=null
 const shown:Shown[]=[]
 // per engine sequence number: the validated choices, the ghost's forecast, each enemy's reach, the hatching
 let cacheSeq=-1,cache:{choices?:SandboxChoice[];forecast?:Map<string,Forecast>;threat?:Map<number,{move:number[];hit:number[]}>;zoc?:number[]}={}
 const cached=(s:Sandbox)=>{if(s.ctx.state.seq!==cacheSeq){cacheSeq=s.ctx.state.seq;cache={}}return cache}
 const choicesOf=(s:Sandbox)=>{const c=cached(s);return c.choices??=sandboxChoices(s)}
 /** the human hero now acting, or null */
 const actorOf=(s:Sandbox)=>{const c=s.ctx.battleCursor;return !s.ctx.state.outcome&&c?.at==='acting'&&c.actor!=null&&controllerOf(s.ctx,c.actor,s.policy)==='human'?c.actor:null}
 /** a new activation forgets the last one's plan */
 const sync=(s:Sandbox|null)=>{
  const a=s?actorOf(s):null,key=s&&a!=null?`${a}@${s.ctx.state.turn}:${s.ctx.events.filter(e=>e.type==='activation.begin').length}`:null
  if(key!==owner){owner=key;chosen=null;ghost=null;aim=null;note=null}
  return a
 }
 /** the move the hero plans with: the chosen move, movement slot first, else primary; with nothing chosen, its first move
     with a legal destination IN THE MOVEMENT SLOT — a move spent as the primary is chosen on the bar (SWITCHES playInputDefaultMove) */
 const moveOf=(s:Sandbox,actor:number)=>{
  const ch=choicesOf(s).filter(c=>'destination' in c.command&&c.command.actor===actor)
  if(chosen===null){const first=ch.find(c=>c.command.slot==='movement');if(!first)return null
   return {actionId:first.command.actionId,choices:ch.filter(c=>c.command.actionId===first.command.actionId&&c.command.slot==='movement')}}
  if(!isMove(s.ctx.actions[chosen]!))return null
  const mine=ch.filter(c=>c.command.actionId===chosen),slot=mine.some(c=>c.command.slot==='movement')?'movement':'primary'
  return {actionId:chosen,choices:mine.filter(c=>c.command.slot===slot)}
 }
 const forecastOf=(s:Sandbox,actor:number,g:Ghost)=>{
  const c=cached(s),m=c.forecast??=new Map(),k=`${g.actionId}|${g.slot}|${g.destination}`
  let f=m.get(k);if(!f){f=forecastFrom(s.ctx,{actor,actionId:g.actionId,destination:g.destination,slot:g.slot});m.set(k,f)}
  return f
 }
 /** the chosen non-move action's legal uses: from the ghost, THE action list on its forecast; else the validated choices */
 const usesOf=(s:Sandbox,actor:number):Use[]=>{
  if(chosen===null||isMove(s.ctx.actions[chosen]!))return []
  const out:Use[]=[]
  if(ghost){const f=forecastOf(s,actor,ghost);if(!f.ok)return []
   for(const r of f.actions){if(r.actionId!==chosen)continue
    const slot=r.slot??'primary'
    if('target' in r)out.push({hex:f.ctx.state.units[r.target]!.hex,key:'target',value:r.target,slot})
    else if('centre' in r)out.push({hex:r.centre,key:'centre',value:r.centre,slot})
    else if('hex' in r)out.push({hex:r.hex,key:'hex',value:r.hex,slot})}
  }else for(const c of choicesOf(s)){const r=c.command;if(r.actionId!==chosen||r.actor!==actor)continue
   if('target' in r)out.push({hex:s.ctx.state.units[r.target]!.hex,key:'target',value:r.target,slot:r.slot??'primary'})
   else if('centre' in r)out.push({hex:r.centre,key:'centre',value:r.centre,slot:r.slot??'primary'})
   else if('hex' in r)out.push({hex:r.hex,key:'hex',value:r.hex,slot:r.slot??'primary'})}
  // one use per hex: the primary slot first (a free attack in the movement slot is the engine's other listing)
  const by=new Map<number,Use>();for(const u of out.sort((a,b)=>(a.slot==='primary'?0:1)-(b.slot==='primary'?0:1)))if(!by.has(u.hex))by.set(u.hex,u)
  return [...by.values()]
 }
 /** the forecast on a use: hit chance and damage are preview()'s (from the ghost, previewFrom's); the notch is the target's HP less the HP each packet would take (SWITCHES playInputNotch) */
 const numbersOf=(s:Sandbox,actor:number,use:Use)=>{
  const none={hit:null,dmg:null,hpAfter:null,lethal:false}
  if(use.key!=='target'||!isAttack(s.ctx.actions[chosen!]!))return none
  const p=ghost?previewFrom(s.ctx,{actor,actionId:ghost.actionId,destination:ghost.destination,slot:ghost.slot},use.value,chosen!):preview(s.ctx,actor,use.value,chosen!)
  if(!p)return none
  const t=s.ctx.state.units[use.value]!
  if('downed' in p&&p.downed)return {hit:p.hitChance,dmg:p.damageOnHit,hpAfter:null,lethal:false}
  const lost=p.packetsOnHit.reduce((n,k)=>n+k.applied,0),hpAfter=t.hp-lost
  return {hit:p.hitChance,dmg:p.damageOnHit,hpAfter,lethal:hpAfter<=0}
 }
 const threatAt=(s:Sandbox,hex:number)=>{
  const e=s.ctx.state.units.find(u=>u.hex===hex&&u.lifeState==='standing'&&u.side!=='hero')
  if(!e)return null
  const m=cached(s).threat??=new Map()
  let t=m.get(e.id);if(!t){t=threatOf(s.ctx,e.id);m.set(e.id,t)}
  return {unit:e.id,move:t.move,hit:t.hit}
 }
 const zocOf=(s:Sandbox,actor:number)=>{
  const c=cached(s);if(c.zoc)return c.zoc
  const u=s.ctx.state.units[actor]!,out:number[]=[]
  if(s.ctx.cfg.switches.zoneOfControl)for(let h=0;h<s.ctx.state.terrain.length;h++)if(zocHoldersAt(s.ctx,u,h).length)out.push(h)
  return c.zoc=out
 }
 const moveCommand=(s:Sandbox,actor:number,g:Ghost):BattleCommand=>({kind:'action',actor,actionId:g.actionId,slot:g.slot,destination:g.destination,expectedSeq:s.ctx.state.seq})
 const useCommand=(s:Sandbox,actor:number,u:Use):BattleCommand=>({kind:'action',actor,actionId:chosen!,slot:u.slot,expectedSeq:s.ctx.state.seq,...(u.key==='target'?{target:u.value}:u.key==='centre'?{centre:u.value}:{hex:u.value})} as BattleCommand)
 const done=()=>{chosen=null;ghost=null;aim=null}

 function facts():PlayFacts{
  const s=session(),empty:PlayFacts={actor:null,slot:null,reach:[],zoc:[],path:[],provokes:[],ghost:null,threat:null,targets:[],aim:null,note}
  if(!s||s.ctx.state.outcome)return {...empty,note:null}
  const actor=sync(s)
  const threat=chosen===null&&point!==null?threatAt(s,point):null
  if(actor===null)return {...empty,threat}
  const here=s.ctx.state.units[actor]!.hex
  const f:PlayFacts={...empty,actor,threat,slot:chosen,ghost:ghost?{unit:actor,hex:ghost.destination}:null}
  const mv=moveOf(s,actor)
  if(mv){f.slot=mv.actionId
   f.reach=asc(mv.choices.map(c=>(c.command as {destination:number}).destination))
   f.zoc=zocOf(s,actor)
   // the path preview: to the hex pointed at, else to the ghost — the engine's own walk (movementOptions' path), its provoke points forecastFrom's
   const to=point!==null&&f.reach.includes(point)?point:ghost?.destination??null
   const c=to===null?undefined:mv.choices.find(c=>(c.command as {destination:number}).destination===to)
   if(c){f.path=[here,...c.path];const fc=forecastOf(s,actor,{actionId:c.command.actionId,slot:c.command.slot??'movement',destination:to!});if(fc.ok)f.provokes=asc(fc.provokes.map(p=>p.at))}
   return f
  }
  const uses=usesOf(s,actor),from=ghost?.destination??here
  f.targets=asc(uses.map(u=>u.hex))
  const at=aim?.locked?aim.hex:point
  if(at!==null&&at!==from){const u=uses.find(u=>u.hex===at)
   f.aim={from,to:at,target:u?.key==='target'?u.value:null,...(u?numbersOf(s,actor,u):{hit:null,dmg:null,hpAfter:null,lethal:false}),locked:!!(aim?.locked&&u)}}
  return f
 }

 /** the attack (or power, burst, blow at a prop) confirmed: walk to the ghost first, then use it — only if the walk arrived and the engine still forecasts what was shown (SWITCHES playInputWalkThenAct) */
 function confirmUse(s:Sandbox,actor:number,u:Use){
  const numbers=numbersOf(s,actor,u),g=ghost
  if(g){const r=run(moveCommand(s,actor,g));if(!r.ok){note=r.reason;done();return true}
   const me=s.ctx.state.units[actor]!
   if(actorOf(s)!==actor||me.hex!==g.destination||me.lifeState!=='standing'){note='The walk ended short of the ghost; choose again.';done();return true}
   ghost=null
   const now=usesOf(s,actor).find(x=>x.hex===u.hex&&x.key===u.key&&x.value===u.value)
   if(!now){note='The target is no longer in reach; choose again.';done();return true}
   const again=numbersOf(s,actor,now)
   if(again.hit!==numbers.hit||again.dmg!==numbers.dmg||again.hpAfter!==numbers.hpAfter){note='The forecast changed on the way; look again before you confirm.';aim={hex:u.hex,locked:true};return true}
   u=now
  }
  const command=useCommand(s,actor,u)
  if(!validateBattleCommand(s.ctx,s.policy,command).ok){note='No longer legal; choose again.';done();return true}
  if(u.key==='target'&&numbers.hit!==null&&numbers.dmg!==null)shown.push({actor,actionId:chosen!,target:u.value,hit:numbers.hit,dmg:numbers.dmg,hpAfter:numbers.hpAfter,fromGhost:!!g})
  const r=run(command);note=r.ok?null:r.reason;done();return true
 }

 function input(e:PlayEvent):boolean{
  const s=session();if(!s||s.ctx.state.outcome)return false
  const actor=sync(s)
  if(e.kind==='point'){point=e.hex;return true}
  if(e.kind==='back'){note=null
   // right-click steps back ONE stage: the aim, then the ghost, then the chosen action (UI-BUILD-NOTES §5)
   if(aim?.locked){aim=null;return true}
   if(ghost){ghost=null;return true}
   if(chosen!==null){chosen=null;aim=null;return true}
   return false}
  if(e.kind==='slot'){
   if(actor===null||e.unit!==actor)return false
   const u=s.ctx.state.units[actor]!
   if(!u.actions.includes(e.actionId)||!s.ctx.actions[e.actionId])return false
   const a=s.ctx.actions[e.actionId]!
   if(isMove(a)){if(ghost&&ghost.actionId!==e.actionId)ghost=null;chosen=e.actionId;aim=null
    if(!moveOf(s,actor)?.choices.length){chosen=null;note=`${a.name}: no legal hex now.`;return true}
    note=null;return true}
   const was=chosen;chosen=e.actionId;aim=null
   if(!usesOf(s,actor).length){chosen=was;note=`${a.name}: nothing in reach${ghost?' from the ghost':''}.`;return true}
   note=null;return true}
  if(e.kind==='unit'){
   if(s.ctx.battleCursor?.at==='selecting'){
    const uid=s.ctx.state.units[e.id]?.uid
    if(uid===undefined||!sandboxActivationChoices(s).some(c=>c.uid===uid))return false
    const r=run({kind:'select-activation',unitUid:uid,expectedSeq:s.ctx.state.seq});note=r.ok?null:r.reason;return r.ok}
   if(actor===null)return false
   return useAt(s,actor,e.hex)}
  // a hex
  if(actor===null)return false
  return useAt(s,actor,e.hex)
 }
 function useAt(s:Sandbox,actor:number,hex:number):boolean{
  const mv=moveOf(s,actor)
  if(mv){const c=mv.choices.find(c=>(c.command as {destination:number}).destination===hex);if(!c)return false
   const g={actionId:c.command.actionId,slot:c.command.slot??'movement',destination:hex} as Ghost
   if(ghost&&ghost.destination===hex&&ghost.actionId===g.actionId){const r=run(moveCommand(s,actor,g));note=r.ok?null:r.reason;done();return true}
   ghost=g;note=null;return true}
  const u=usesOf(s,actor).find(u=>u.hex===hex);if(!u)return false
  if(aim?.locked&&aim.hex===hex)return confirmUse(s,actor,u)
  aim={hex,locked:true};note=null;return true
 }
 return {facts,input,get shown(){return shown as readonly Shown[]},get point(){return point}}
}
export type PlayInput=ReturnType<typeof createPlayInput>
