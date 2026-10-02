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
// viewer.play-chrome (PLAYABLE-OPENING-PLAN.md item 8; engine DECISIONS.md 2026-09-29 "the playable battle screen"): the
// ending — whether End Turn and End activation may be given is validateBattleCommand's answer on the engine's own
// commands (`end-player-phase`, `end-cycle`), who has not acted is heroesYetToAct (the pop-up's list), and the viewer's
// End Turn and End activation clicks come back here as those commands (kingdom SWITCHES.md playChrome*).
// viewer.xcom-camera (engine DECISIONS.md 2026-10-01 'the XCOM-style camera': "One character is auto-selected at the start,
// the map centered on them; when its activation ends, the next in the character bar, left to right, civilians included.
// Double-click a character in the top bar or on the map to change it."): while the engine waits for a choice, the next
// hero is PROPOSED here — never begun, since an activation once begun cannot be taken back and runs its start — and the
// player's first order to it (a click on it, or an action on the bar) begins it (kingdom SWITCHES playQueue*).
import {sandboxChoices,sandboxActivationChoices,type Sandbox,type SandboxChoice} from '../core/sandbox.js'
import {controllerOf,validateBattleCommand,forecastFrom,previewFrom,preview,threatOf,zocHoldersAt,heroesYetToAct,isAttack,isMove,actionReach} from '../engine.js'
import type {BattleCommand,Forecast} from '../engine.js'

export type PlayEvent={kind:'hex';hex:number}|{kind:'point';hex:number|null}|{kind:'unit';id:number;hex:number}|{kind:'choose';id:number}|{kind:'back'}|{kind:'slot';actionId:string;unit:number|null}|{kind:'end-turn'}|{kind:'end-activation'}
export type PlayAim={from:number;to:number;target:number|null;hit:number|null;dmg:number|null;hpAfter:number|null;lethal:boolean;locked:boolean}
/** What the viewer draws (viewer src/play.js validates the same shape). Hexes ascending unless named a walk. */
export type PlayFacts={actor:number|null;slot:string|null;reach:number[];zoc:number[];path:number[];provokes:number[];ghost:{unit:number;hex:number}|null;threat:{unit:number;move:number[];hit:number[]}|null;targets:number[];aim:PlayAim|null;note:string|null}
export type CommandResult={ok:true}|{ok:false;reason:string}
/** viewer.play-chrome: what the viewer's End Turn and End activation may do (viewer src/play.js's optional ending facts) */
export type PlayEnding={endTurn:{yetToAct:number[]}|null;endActivation:boolean}
/** One aimable use of the chosen action: the command's aim field and the hex it is drawn on. */
type Use={hex:number;key:'target'|'centre'|'hex';value:number;slot:'movement'|'primary'}
type Ghost={actionId:string;slot:'movement'|'primary';destination:number}
/** The forecast the player saw when they confirmed, and what the engine then said — the probe of "the forecast shown equals what lands". */
export type Shown={actor:number;actionId:string;target:number;hit:number;dmg:number;hpAfter:number|null;fromGhost:boolean}

const asc=(a:Iterable<number>)=>[...new Set(a)].sort((x,y)=>x-y)

export function createPlayInput(session:()=>Sandbox|null,run:(command:BattleCommand)=>CommandResult){
 let chosen:string|null=null,ghost:Ghost|null=null,aim:{hex:number;locked:boolean}|null=null,point:number|null=null,note:string|null=null
 let owner:string|null=null,proposed:number|null=null,last:number|null=null
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
  if(key!==owner){owner=key;chosen=null;ghost=null;aim=null;note=null;if(a!==null){last=a;proposed=null}}
  return a
 }
 /** the heroes the engine would let begin now, in the character bar's order — the board's: ascending unit id, civilians
     included (the bar of viewer.unit-card-bar, until it lands; kingdom SWITCHES playQueueOrder) */
 const queueOf=(s:Sandbox)=>{const uids=new Set(sandboxActivationChoices(s).map(c=>c.uid));return s.ctx.state.units.filter(u=>uids.has(u.uid)).map(u=>u.id).sort((x,y)=>x-y)}
 /** who acts next: the one double-clicked, else the next to the right of the last to act, round to the left end */
 function proposal():number|null{
  const s=session();if(!s||s.ctx.state.outcome||s.ctx.battleCursor?.at!=='selecting')return null
  const q=queueOf(s)
  if(proposed===null||!q.includes(proposed))proposed=q.find(id=>last!==null&&id>last)??q[0]??null
  return proposed
 }
 /** the proposed hero's first order begins its activation */
 const begin=(s:Sandbox,id:number)=>{const uid=s.ctx.state.units[id]?.uid;if(uid===undefined)return false
  const r=run({kind:'select-activation',unitUid:uid,expectedSeq:s.ctx.state.seq});note=r.ok?null:r.reason;return r.ok}
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
 /** the hex the aim arrow reaches toward `at`: `at` itself when within the chosen action's reach (the engine's reachOf for an
     attack read from where the hero would stand — engine actionReach, fix.aim-reach — the row's range for anything else),
     else the hex within that reach nearest `at` (the farther of a tie, then the
     lower id) — so a punch's arrow is one hex long however far the pointer is (kingdom SWITCHES playInputAimReach) */
 const withinReach=(s:Sandbox,actor:number,from:number,at:number):number=>{
  const g=s.ctx.geo,reach=actionReach(s.ctx,actor,chosen!,from)
  if(reach===null||g.distance(from,at)<=reach)return at
  let best=from
  for(let h=0;h<g.hexCount;h++){if(g.distance(from,h)>reach)continue
   const d=g.distance(h,at),bd=g.distance(best,at)
   if(d<bd||(d===bd&&(g.distance(from,h)>g.distance(from,best)||(g.distance(from,h)===g.distance(from,best)&&h<best))))best=h}
  return best
 }
 /** a movement power that goes nowhere (Devotion: stepRange 0): its only legal destination is the hero's own hex */
 const standsStill=(s:Sandbox,actor:number,choices:SandboxChoice[])=>choices.length>0&&choices.every(c=>(c.command as {destination:number}).destination===s.ctx.state.units[actor]!.hex)

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
  /* engine DECISIONS.md 2026-10-01 (Andrew: "you can't target without an ability selected … what is that red arrow for? I have
     to click an attack type, and the red arrow should only extend as far as whatever its range is"): no action chosen, no
     arrow; with one chosen, the arrow stops at its reach — the hex within the engine's reach nearest the pointer */
  if(chosen===null)return f
  const uses=usesOf(s,actor),from=ghost?.destination??here
  f.targets=asc(uses.map(u=>u.hex))
  const at=aim?.locked?aim.hex:point
  if(at!==null&&at!==from){const to=withinReach(s,actor,from,at),u=uses.find(u=>u.hex===to)
   f.aim={from,to,target:u?.key==='target'?u.value:null,...(u?numbersOf(s,actor,u):{hit:null,dmg:null,hpAfter:null,lethal:false}),locked:!!(aim?.locked&&u)}}
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

 /** the ending: End Turn when the engine would take `end-player-phase` now, with the heroes it says have not acted (as unit
     ids, for the pop-up); End activation when it would take `end-cycle` from the hero acting */
 function ending():PlayEnding{
  const s=session();if(!s||s.ctx.state.outcome)return {endTurn:null,endActivation:false}
  const actor=actorOf(s),seq=s.ctx.state.seq
  const turn=validateBattleCommand(s.ctx,s.policy,{kind:'end-player-phase',expectedSeq:seq}).ok
  const cycle=actor!==null&&validateBattleCommand(s.ctx,s.policy,{kind:'end-cycle',actor,expectedSeq:seq}).ok
  return {endTurn:turn?{yetToAct:heroesYetToAct(s.ctx,s.policy).map(uid=>s.ctx.state.units.find(u=>u.uid===uid)!.id)}:null,endActivation:cycle}
 }
 function input(e:PlayEvent):boolean{
  const s=session();if(!s||s.ctx.state.outcome)return false
  let actor=sync(s)
  // viewer.xcom-camera: a double-click on a hero who may begin makes it the next to act
  if(e.kind==='choose'){if(s.ctx.battleCursor?.at!=='selecting'||!queueOf(s).includes(e.id))return false;proposed=e.id;note=null;return true}
  // viewer.play-chrome: End Turn (asked first by the viewer's pop-up when ending() names heroes) and End activation
  if(e.kind==='end-turn'){const r=run({kind:'end-player-phase',expectedSeq:s.ctx.state.seq});note=r.ok?null:r.reason;if(r.ok)done();return r.ok}
  if(e.kind==='end-activation'){if(actor===null)return false
   const r=run({kind:'end-cycle',actor,expectedSeq:s.ctx.state.seq});note=r.ok?null:r.reason;if(r.ok)done();return r.ok}
  if(e.kind==='point'){point=e.hex;return true}
  if(e.kind==='back'){note=null
   // right-click steps back ONE stage: the aim, then the ghost, then the chosen action (UI-BUILD-NOTES §5)
   if(aim?.locked){aim=null;return true}
   if(ghost){ghost=null;return true}
   if(chosen!==null){chosen=null;aim=null;return true}
   return false}
  if(e.kind==='slot'){
   /* viewer.xcom-camera: an action chosen on the proposed hero's bar begins its activation, then is chosen */
   if(actor===null){const p=proposal();if(p===null||e.unit!==p||!begin(s,p))return false;actor=sync(s);if(actor===null)return true}
   if(e.unit!==actor)return false
   const u=s.ctx.state.units[actor]!
   if(!u.actions.includes(e.actionId)||!s.ctx.actions[e.actionId])return false
   const a=s.ctx.actions[e.actionId]!
   if(isMove(a)){
    /* a power that goes nowhere is used from the bar: chosen, it is planned on the hero's own hex at once; chosen again (or
       the hero clicked) it is used — engine DECISIONS.md 2026-10-01, Devotion: "I can't double-click on it or anything to
       make it trigger" (kingdom SWITCHES playInputStandStill) */
    if(ghost&&ghost.actionId===e.actionId&&ghost.destination===s.ctx.state.units[actor]!.hex&&chosen===e.actionId){const r=run(moveCommand(s,actor,ghost));note=r.ok?null:r.reason;done();return true}
    if(ghost&&ghost.actionId!==e.actionId)ghost=null;chosen=e.actionId;aim=null
    const mv=moveOf(s,actor)
    if(!mv?.choices.length){chosen=null;note=`${a.name}: no legal hex now.`;return true}
    if(standsStill(s,actor,mv.choices)){const c=mv.choices[0]!;ghost={actionId:c.command.actionId,slot:c.command.slot??'movement',destination:(c.command as {destination:number}).destination} as Ghost
     note=`${a.name}: click it again, or the hero, to use it.`;return true}
    note=null;return true}
   /* chosen even with nothing in reach — its arrow still shows how far it reaches (engine DECISIONS.md 2026-10-01); right-click
      takes it back (kingdom SWITCHES playInputAimReach) */
   chosen=e.actionId;aim=null
   note=usesOf(s,actor).length?null:`${a.name}: nothing in reach${ghost?' from the ghost':''}.`;return true}
  if(e.kind==='unit'){
   /* viewer.xcom-camera: a click on the proposed hero begins it; another hero is only looked at (a double-click chooses it) */
   if(s.ctx.battleCursor?.at==='selecting')return e.id===proposal()&&begin(s,e.id)
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
 return {facts,ending,input,proposal,get shown(){return shown as readonly Shown[]},get point(){return point}}
}
export type PlayInput=ReturnType<typeof createPlayInput>
