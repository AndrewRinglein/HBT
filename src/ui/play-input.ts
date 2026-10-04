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
// Double-click a character in the top bar or on the map to change it.").
// viewer.turn-taking (engine DECISIONS.md 2026-10-03 'a hero starts its Activation with its basic move armed', 'the action bar
// and its card stay with the activated unit', 'the battle screen's turn-taking, ruled'; overturns kingdom SWITCHES
// playQueueProposal, playQueueClick, playQueueBarOrder, playQueueOrder): the next un-acted hero, the leftmost the engine lets
// begin, is BEGUN (next(), which the host calls whenever the engine waits for a choice) with its basic move armed; a single
// click on a hex shows the path there and plans the attacks from its end, a second click on it (a double-click) moves; a
// double-click on another hero switches to it only while the one acting has done nothing — its begun Activation is taken
// back through the host's undo (the engine has no command for it; the battle is restored to before it began) — and is
// otherwise refused: no partial Activations (the engine's not-current-actor / activation-not-selectable). Every refusal is
// one plain line (src/ui/refusals.ts), worded from the engine's refusal code (kingdom SWITCHES turn*).
// viewer.switch-hero-asks (engine DECISIONS.md 2026-10-03 'size and shadows are the default; ... switching heroes asks first
// ...', 'the opening draft pool is all 24 heroes ...; the switch pop-up is for any player unit'): a double-click on another
// un-acted player unit while the one acting has done something is no longer refused — the input holds the question (its
// facts' `ask`), the viewer draws the pop-up "End activation of X and start activation of Y?", and the answer comes back:
// yes is the engine's own end-cycle for X, then select-activation for Y; no changes nothing (kingdom SWITCHES switchAsk*).
import {sandboxChoices,sandboxActivationChoices,sandboxSwapChoices,type Sandbox,type SandboxChoice,type SandboxSwapOffer} from '../core/sandbox.js'
import {controllerOf,validateBattleCommand,forecastFrom,previewFrom,preview,threatOf,zocHoldersAt,heroesYetToAct,isAttack,isMove,isBurst,actionReach} from '../engine.js'
import {refusalLine,switchLine,type SwitchRefusal} from './refusals.js'
import type {BattleCommand,Forecast} from '../engine.js'

export type PlayEvent={kind:'hex';hex:number}|{kind:'point';hex:number|null}|{kind:'unit';id:number;hex:number}|{kind:'choose';id:number}|{kind:'back'}|{kind:'slot';actionId:string;unit:number|null}|{kind:'end-turn'}|{kind:'end-activation'}|{kind:'swap';index:number;unit:number|null}|{kind:'answer';yes:boolean}
export type PlayAim={from:number;to:number;target:number|null;hit:number|null;dmg:number|null;hpAfter:number|null;lethal:boolean;locked:boolean}
/** What the viewer draws (viewer src/play.js validates the same shape). Hexes ascending unless named a walk. */
export type PlayFacts={actor:number|null;slot:string|null;reach:number[];zoc:number[];path:number[];provokes:number[];ghost:{unit:number;hex:number}|null;threat:{unit:number;move:number[];hit:number[]}|null;targets:number[];aim:PlayAim|null;note:string|null;swap?:PlaySwap|null;ask?:PlayAsk|null}
/** viewer.switch-hero-asks: the question the battle screen must put before anything else is done — end the Activation of the
    unit acting (`from`) and begin the unit double-clicked (`to`)? Unit ids; the viewer draws the pop-up with their names and
    offers {kind:'answer', yes} back (viewer src/play.js's optional ask fact). */
export type PlayAsk={kind:'switch';from:number;to:number}
/** movement.swap-and-shields: the swap on the board's action bar — the engine's legal hand lists to hold afterwards (by
    label, in the sandbox's order; a click names one by its index), the engine's swapCostOf, and with none to make the
    engine's own reason (viewer src/play.js's optional swap fact; kingdom SWITCHES playInputSwap) */
export type PlaySwap={cost:number;choices:{label:string}[];why:string|null}
export type CommandResult={ok:true}|{ok:false;reason:string}
/** viewer.play-chrome: what the viewer's End Turn and End activation may do (viewer src/play.js's optional ending facts) */
export type PlayEnding={endTurn:{yetToAct:number[]}|null;endActivation:boolean}
/** One aimable use of the chosen action: the command's aim field and the hex it is drawn on. */
type Use={hex:number;key:'target'|'centre'|'hex';value:number;slot:'movement'|'primary'}
type Ghost={actionId:string;slot:'movement'|'primary';destination:number}
/** The forecast the player saw when they confirmed, and what the engine then said — the probe of "the forecast shown equals what lands". */
export type Shown={actor:number;actionId:string;target:number;hit:number;dmg:number;hpAfter:number|null;fromGhost:boolean}

const asc=(a:Iterable<number>)=>[...new Set(a)].sort((x,y)=>x-y)

/** viewer.turn-taking: the host's undo for an Activation that did nothing — save() before a hero is begun, restore(saved) puts
    the battle (and the board) back as it was then. Without it a begun hero cannot be switched away from. */
export type PlayUndo={save():unknown;restore(saved:unknown):boolean}
export function createPlayInput(session:()=>Sandbox|null,run:(command:BattleCommand)=>CommandResult,undo:PlayUndo|null=null){
 let chosen:string|null=null,ghost:Ghost|null=null,aim:{hex:number;locked:boolean}|null=null,point:number|null=null,note:string|null=null
 let owner:string|null=null
 /** the Activation this input began: who, the engine's sequence right after (nothing done since while it is unchanged), the
     battle saved before it began, and the heroes the engine would then have let begin */
 let begun:{actor:number;seq:number;saved:unknown;queue:number[]}|null=null
 /** viewer.switch-hero-asks: the question asked (who would be ended, who begun, the engine's sequence when it was asked — it
     does not outlive that), and, between the yes and the next begin, the unit the player asked for */
 let asking:{from:number;to:number;seq:number}|null=null,wanted:number|null=null
 const shown:Shown[]=[]
 // per engine sequence number: the validated choices, the ghost's forecast, each enemy's reach, the hatching
 let cacheSeq=-1,cache:{choices?:SandboxChoice[];swap?:SandboxSwapOffer;forecast?:Map<string,Forecast>;threat?:Map<number,{move:number[];hit:number[]}>;zoc?:number[]}={}
 const cached=(s:Sandbox)=>{if(s.ctx.state.seq!==cacheSeq){cacheSeq=s.ctx.state.seq;cache={}}return cache}
 const choicesOf=(s:Sandbox)=>{const c=cached(s);return c.choices??=sandboxChoices(s)}
 /** the engine's swap for the hero acting (kingdom core sandboxSwapChoices: every hand list validateBattleCommand takes) */
 const swapOf=(s:Sandbox)=>{const c=cached(s);return c.swap??=sandboxSwapChoices(s)}
 /** the swap fact: none while no hero acts or for a hero who carries nothing to swap; else the offer, or the engine's reason */
 const swapFact=(s:Sandbox):PlaySwap|null=>{const o=swapOf(s);if(o.cost===null||(!o.choices.length&&!o.why))return null
  return {cost:o.cost,choices:o.choices.map(c=>({label:c.label})),why:o.choices.length?null:o.why}}
 /** a power aimed at the one using it alone (Lock Shields, Raise Guard, Cover …: the row's target is `self`) */
 const selfOnly=(s:Sandbox,id:string)=>(s.ctx.actions[id]?.target as {select?:string}|undefined)?.select==='self'
 /** the human hero now acting, or null */
 const actorOf=(s:Sandbox)=>{const c=s.ctx.battleCursor;return !s.ctx.state.outcome&&c?.at==='acting'&&c.actor!=null&&controllerOf(s.ctx,c.actor,s.policy)==='human'?c.actor:null}
 /** a new activation forgets the last one's plan */
 const sync=(s:Sandbox|null)=>{
  const a=s?actorOf(s):null,key=s&&a!=null?`${a}@${s.ctx.state.turn}:${s.ctx.events.filter(e=>e.type==='activation.begin').length}`:null
  if(key!==owner){owner=key;chosen=null;ghost=null;aim=null;if(a!==null)note=null}
  if(asking&&(!s||a!==asking.from||s.ctx.state.seq!==asking.seq))asking=null
  return a
 }
 /** the heroes the engine would let begin now, in the top bar's order — the heroes' side left to right, ascending unit id,
     civilians included (viewer rail.js; kingdom SWITCHES turnNextLeftmost) */
 const queueOf=(s:Sandbox)=>{const uids=new Set(sandboxActivationChoices(s).map(c=>c.uid));return s.ctx.state.units.filter(u=>uids.has(u.uid)).map(u=>u.id).sort((x,y)=>x-y)}
 /** who next() would begin: the leftmost hero yet to act that the engine lets begin (kingdom SWITCHES turnNextLeftmost) */
 function upcoming():number|null{
  const s=session();if(!s||s.ctx.state.outcome||s.ctx.battleCursor?.at!=='selecting')return null
  return queueOf(s)[0]??null
 }
 const nameOf=(s:Sandbox,id:number|null|undefined)=>id==null?null:s.ctx.state.units[id]?.name??null
 /** begin a hero: the battle saved first (the undo), then the engine's select-activation; its refusal said in a plain line */
 const begin=(s:Sandbox,id:number,queue:number[])=>{const uid=s.ctx.state.units[id]?.uid;if(uid===undefined)return false
  const saved=undo?undo.save():null
  const r=run({kind:'select-activation',unitUid:uid,expectedSeq:s.ctx.state.seq})
  if(!r.ok){note=refusalLine(r.reason,{target:nameOf(s,id)});return false}
  const now=session()!;cacheSeq=-1;begun={actor:id,seq:now.ctx.state.seq,saved,queue};note=null;return true}
 /** viewer.turn-taking: while the engine waits for a choice, the next hero yet to act is begun — its basic move armed (moveOf
     with nothing chosen). The host calls it whenever it is idle; true when a hero was begun. */
 function next():boolean{
  const s=session();if(!s||s.ctx.state.outcome||s.ctx.battleCursor?.at!=='selecting')return false
  /* viewer.switch-hero-asks: after a yes, the unit asked for begins — not the leftmost — when the engine lets it */
  const q=queueOf(s),want=wanted;wanted=null
  const id=want!==null&&q.includes(want)?want:q[0];if(id===undefined)return false
  return begin(s,id,q)
 }
 /** why another hero may not be switched to now (the engine said activation-not-selectable): not the player's, has acted
     or is down — read from the engine's own queue and unit facts — else the one acting must finish (no partial Activations) */
 function whyNot(s:Sandbox,id:number,actor:number|null):SwitchRefusal{
  const u=s.ctx.state.units[id]!,target=u.name
  if(u.side!=='hero'||controllerOf(s.ctx,id,s.policy)!=='human')return {kind:'not-yours',target}
  if(u.lifeState!=='standing')return {kind:'down',target}
  if(!heroesYetToAct(s.ctx,s.policy).includes(u.uid)||actor===null)return {kind:'acted',target}
  const a=s.ctx.state.units[actor]!
  return {kind:'busy',actor:a.name,did:a.moveUsed?'moved':a.primaryUsed||(begun?.actor===actor&&s.ctx.state.seq!==begun.seq)?'acted':'begun'}
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
 const numbersOf=(s:Sandbox,actor:number,use:Use,actionId:string=chosen!)=>{
  const none={hit:null,dmg:null,hpAfter:null,lethal:false}
  if(use.key!=='target'||!isAttack(s.ctx.actions[actionId]!))return none
  const p=ghost?previewFrom(s.ctx,{actor,actionId:ghost.actionId,destination:ghost.destination,slot:ghost.slot},use.value,actionId):preview(s.ctx,actor,use.value,actionId)
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
 /** the attacks the engine lists on the ghost's forecast, one per target hex: the first in the hero's own action order */
 const pathEndAttacks=(s:Sandbox,actor:number,g:Ghost)=>{
  const out=new Map<number,{actionId:string;slot:'movement'|'primary';target:number}>(),f=forecastOf(s,actor,g)
  if(!f.ok)return out
  for(const id of s.ctx.state.units[actor]!.actions){if(!isAttack(s.ctx.actions[id]!))continue
   for(const r of f.actions){if(r.actionId!==id||!('target' in r))continue
    const t=f.ctx.state.units[r.target]!;if(t.side===s.ctx.state.units[actor]!.side)continue
    if(!out.has(t.hex))out.set(t.hex,{actionId:id,slot:r.slot??'primary',target:r.target})}}
  return out
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
  const f:PlayFacts={...empty,actor,threat,slot:chosen,ghost:ghost?{unit:actor,hex:ghost.destination}:null,swap:swapFact(s),...(asking?{ask:{kind:'switch' as const,from:asking.from,to:asking.to}}:{})}
  const mv=moveOf(s,actor)
  if(mv){f.slot=mv.actionId
   f.reach=asc(mv.choices.map(c=>(c.command as {destination:number}).destination))
   f.zoc=zocOf(s,actor)
   // the path preview: to the hex pointed at, else to the ghost — the engine's own walk (movementOptions' path), its provoke points forecastFrom's
   const to=point!==null&&f.reach.includes(point)?point:ghost?.destination??null
   const c=to===null?undefined:mv.choices.find(c=>(c.command as {destination:number}).destination===to)
   if(c){f.path=[here,...c.path];const fc=forecastOf(s,actor,{actionId:c.command.actionId,slot:c.command.slot??'movement',destination:to!});if(fc.ok)f.provokes=asc(fc.provokes.map(p=>p.at))}
   /* viewer.turn-taking (engine DECISIONS.md 2026-10-03 'the battle screen's turn-taking, ruled': "It just shows the path ...
      That way, you can also plan out your attacks from that spot"): while the path is shown (the ghost) and no attack is
      chosen, whom the hero could strike from its end are the targets — the engine's action list on the ghost's forecast —
      and pointing at one shows the hit chance and damage of the first attack on its bar the engine lists against it there
      (previewFrom; kingdom SWITCHES turnPathEndForecast). Choosing an attack on the bar plans that one from the same hex. */
   if(ghost){const at=pathEndAttacks(s,actor,ghost);f.targets=asc(at.keys())
    const a=point!==null?at.get(point):undefined
    if(a)f.aim={from:ghost.destination,to:point!,target:a.target,...numbersOf(s,actor,{hex:point!,key:'target',value:a.target,slot:a.slot},a.actionId),locked:false}}
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
  const r=run(command);note=r.ok?null:said(s,r.reason,actor,u.key==='target'?u.value:null,chosen);done();return true
 }
 /** an engine refusal, as one plain line naming the hero acting, the unit aimed at and the action (src/ui/refusals.ts) */
 const said=(s:Sandbox,code:string,actor:number|null,target:number|null=null,actionId:string|null=null)=>
  refusalLine(code,{actor:nameOf(s,actor),target:nameOf(s,target),action:actionId?s.ctx.actions[actionId]?.name??null:null})

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
  /* viewer.switch-hero-asks: the answer to the question. No (or a question that no longer stands) changes nothing. Yes ends
     the one acting with the engine's own end-cycle — the command End activation sends — and begins the one asked for with
     select-activation; the host may begin it itself the moment the engine waits (next(), which honours `wanted`). Any other
     order but pointing drops the question first: the pop-up is the only thing on the screen while it stands. */
  if(e.kind==='answer'){const a=asking;asking=null
   if(!a||actor!==a.from||s.ctx.state.seq!==a.seq)return false
   if(!e.yes){note=null;return true}
   wanted=a.to
   const r=run({kind:'end-cycle',actor:a.from,expectedSeq:s.ctx.state.seq})
   if(!r.ok){wanted=null;note=said(s,r.reason,actor);return false}
   done()
   if(wanted!==null){wanted=null
    const now=session()
    if(now&&!now.ctx.state.outcome&&now.ctx.battleCursor?.at==='selecting'){const q=queueOf(now)
     if(q.includes(a.to))begin(now,a.to,q);else note=switchLine(whyNot(now,a.to,null))}}
   return true}
  if(e.kind!=='point')asking=null
  /* viewer.turn-taking: a double-click on a hero (its card or its body). While the engine waits for a choice, it begins that
     hero. While another acts: a switch only while the one acting has done nothing since it was begun (the engine's sequence
     unchanged) — its Activation is taken back by the host's undo and the one asked for begins — else refused in one line:
     no partial Activations (the engine answers activation-not-selectable; refusals.ts words why) */
  if(e.kind==='choose'){
   if(s.ctx.battleCursor?.at==='selecting'){const q=queueOf(s);if(q.includes(e.id))return begin(s,e.id,q)
    note=switchLine(whyNot(s,e.id,null));return false}
   if(actor===null)return false
   if(e.id===actor){note=null;return true}
   const uid=s.ctx.state.units[e.id]?.uid;if(uid===undefined)return false
   const v=validateBattleCommand(s.ctx,s.policy,{kind:'select-activation',unitUid:uid,expectedSeq:s.ctx.state.seq})
   if(v.ok)return begin(s,e.id,queueOf(s))
   const b=begun,fresh=!!b&&b.actor===actor&&b.seq===s.ctx.state.seq
   if(fresh&&undo&&b!.saved!==null&&b!.queue.includes(e.id)){
    if(!undo.restore(b!.saved)){note=switchLine({kind:'busy',actor:s.ctx.state.units[actor]!.name,did:'begun'});return false}
    begun=null;owner=null;cacheSeq=-1;done()
    const back=session()!;sync(back)
    return begin(back,e.id,queueOf(back))}
   if(v.reason!=='activation-not-selectable'){note=said(s,v.reason,actor,e.id);return false}
   /* viewer.switch-hero-asks: the one asked for is the player's, standing and yet to act — only the unit acting is in the way
      (the engine's own facts, whyNot) — and that unit has done something, so the free switch is gone: ask. The question is
      put only when the engine would take End activation from the unit acting; nothing is ended until the answer is yes. */
   const why=whyNot(s,e.id,actor)
   if(why.kind==='busy'&&why.did!=='begun'&&validateBattleCommand(s.ctx,s.policy,{kind:'end-cycle',actor,expectedSeq:s.ctx.state.seq}).ok){
    asking={from:actor,to:e.id,seq:s.ctx.state.seq};note=null;return true}
   note=switchLine(why);return false}
  // viewer.play-chrome: End Turn (asked first by the viewer's pop-up when ending() names heroes) and End activation
  if(e.kind==='end-turn'){const r=run({kind:'end-player-phase',expectedSeq:s.ctx.state.seq});note=r.ok?null:said(s,r.reason,actor);if(r.ok)done();return r.ok}
  if(e.kind==='end-activation'){if(actor===null)return false
   const r=run({kind:'end-cycle',actor,expectedSeq:s.ctx.state.seq});note=r.ok?null:said(s,r.reason,actor);if(r.ok)done();return r.ok}
  if(e.kind==='point'){point=e.hex;return true}
  /* movement.swap-and-shields: a hand list chosen on the bar's swap strip is the engine's swap command — before the primary,
     once per activation, at its swapCost; refused (with the engine's reason) when the engine would not take it */
  if(e.kind==='swap'){if(actor===null||e.unit!==actor)return false
   const o=swapOf(s),c=o.choices[e.index]
   if(!c){note=o.why?'Swap: '+o.why+'.':null;return false}
   const r=run(c.command);note=r.ok?null:said(s,r.reason,actor);if(r.ok)done();return r.ok}
  if(e.kind==='back'){note=null
   // right-click steps back ONE stage: the aim, then the ghost, then the chosen action (UI-BUILD-NOTES §5)
   if(aim?.locked){aim=null;return true}
   if(ghost){ghost=null;return true}
   if(chosen!==null){chosen=null;aim=null;return true}
   return false}
  if(e.kind==='slot'){
   /* viewer.turn-taking: the bar is the activated hero's (viewer subject.js barUnitOf), so its order is that hero's. While the
      engine waits for a choice (a free battle, whose launcher keeps its hero dropdown), an action chosen on the bar of a hero
      the engine would let begin begins it, then is chosen (was playQueueBarOrder's proposed hero) */
   if(actor===null){if(e.unit===null||s.ctx.battleCursor?.at!=='selecting')return false
    const q=queueOf(s);if(!q.includes(e.unit))return false
    if(!begin(s,e.unit,q))return false;actor=sync(session()!);if(actor===null)return true}
   if(e.unit!==actor)return false
   const u=s.ctx.state.units[actor]!
   if(!u.actions.includes(e.actionId)||!s.ctx.actions[e.actionId])return false
   const a=s.ctx.actions[e.actionId]!
   if(isMove(a)){
    /* a power that goes nowhere is used from the bar: chosen, it is planned on the hero's own hex at once; chosen again (or
       the hero clicked) it is used — engine DECISIONS.md 2026-10-01, Devotion: "I can't double-click on it or anything to
       make it trigger" (kingdom SWITCHES playInputStandStill) */
    if(ghost&&ghost.actionId===e.actionId&&ghost.destination===s.ctx.state.units[actor]!.hex&&chosen===e.actionId){const r=run(moveCommand(s,actor,ghost));note=r.ok?null:said(s,r.reason,actor,null,e.actionId);done();return true}
    if(ghost&&ghost.actionId!==e.actionId)ghost=null;chosen=e.actionId;aim=null
    const mv=moveOf(s,actor)
    if(!mv?.choices.length){chosen=null
     /* the engine's own reason this move has no hex now (its slot is spent, it is rooted, not ready …) */
     const r=validateBattleCommand(s.ctx,s.policy,{kind:'action',actor,actionId:e.actionId,slot:'movement',destination:s.ctx.state.units[actor]!.hex,expectedSeq:s.ctx.state.seq})
     note=r.ok||r.reason==='unreachable-destination'?`${a.name}: no legal hex now.`:said(s,r.reason,actor,null,e.actionId);return true}
    if(standsStill(s,actor,mv.choices)){const c=mv.choices[0]!;ghost={actionId:c.command.actionId,slot:c.command.slot??'movement',destination:(c.command as {destination:number}).destination} as Ghost
     note=`${a.name}: click it again, or the hero, to use it.`;return true}
    note=null;return true}
   /* movement.swap-and-shields: a power aimed at the hero alone (the shields' powers) is used from the bar like a power that
      goes nowhere — chosen, it is aimed at the hero at once; chosen again (or the hero clicked) it is used (kingdom SWITCHES
      playInputSelfPower) */
   if(chosen===e.actionId&&aim?.locked&&selfOnly(s,e.actionId)){const u=usesOf(s,actor).find(x=>x.hex===aim!.hex&&x.key==='target'&&x.value===actor);if(u)return confirmUse(s,actor,u)}
   /* chosen even with nothing in reach — its arrow still shows how far it reaches (engine DECISIONS.md 2026-10-01); right-click
      takes it back (kingdom SWITCHES playInputAimReach) */
   chosen=e.actionId;aim=null
   if(selfOnly(s,e.actionId)){const u=usesOf(s,actor).find(x=>x.key==='target'&&x.value===actor)
    if(u){aim={hex:u.hex,locked:true};note=`${a.name}: click it again, or the hero, to use it.`;return true}}
   note=usesOf(s,actor).length?null:`${a.name}: nothing in reach${ghost?' from the end of the path':''}.`;return true}
  if(e.kind==='unit'){
   /* viewer.turn-taking: a single click on a unit looks at it (the viewer's panel); it is an order only with an action chosen
      that can be aimed there (an attack, a power), or on the hero acting (a power that goes nowhere, a self power) */
   if(actor===null)return false
   if(e.id===actor){useAt(s,actor,e.hex,'self');return true}   // the hero acting, clicked: taken (it is already the one acting)
   return chosen!==null&&!isMove(s.ctx.actions[chosen]!)?useAt(s,actor,e.hex,'unit',e.id):false}
  // a hex
  if(actor===null)return false
  return useAt(s,actor,e.hex,'hex')
 }
 /** a click at a hex: plans (a ghost, an aim) or confirms; a click that is no order says why, as the engine words it — a hex
     the armed move cannot reach, a target out of the chosen action's reach (viewer.turn-taking point 5) */
 function useAt(s:Sandbox,actor:number,hex:number,how:'hex'|'unit'|'self',target:number|null=null):boolean{
  const mv=moveOf(s,actor)
  if(mv){const c=mv.choices.find(c=>(c.command as {destination:number}).destination===hex)
   if(!c){if(how==='hex'){const slot=mv.choices[0]?.command.slot??'movement'
     const r=validateBattleCommand(s.ctx,s.policy,{kind:'action',actor,actionId:mv.actionId,slot,destination:hex,expectedSeq:s.ctx.state.seq})
     note=r.ok?null:said(s,r.reason,actor,null,mv.actionId)}
    return false}
   const g={actionId:c.command.actionId,slot:c.command.slot??'movement',destination:hex} as Ghost
   if(ghost&&ghost.destination===hex&&ghost.actionId===g.actionId){const r=run(moveCommand(s,actor,g));note=r.ok?null:said(s,r.reason,actor,null,g.actionId);done();return true}
   ghost=g;note=null;return true}
  if(chosen===null){
   /* nothing armed and no move left: the engine's reason a walk there is refused (its movement is spent) */
   if(how==='hex'){const basic=s.ctx.state.units[actor]!.actions.find(id=>isMove(s.ctx.actions[id]!))
    if(basic){const r=validateBattleCommand(s.ctx,s.policy,{kind:'action',actor,actionId:basic,slot:'movement',destination:hex,expectedSeq:s.ctx.state.seq});note=r.ok?null:said(s,r.reason,actor,null,basic)}}
   return false}
  const u=usesOf(s,actor).find(u=>u.hex===hex)
  if(!u){if(how!=='self'){
    /* the engine's own refusal of this use: aimed at the unit clicked, else at the hex (a burst's centre, a blow at a prop) */
    const aimAt=target!==null?{target}:isBurst(s.ctx.actions[chosen]!)?{centre:hex}:{hex}
    const r=validateBattleCommand(s.ctx,s.policy,{kind:'action',actor,actionId:chosen,expectedSeq:s.ctx.state.seq,...aimAt} as BattleCommand)
    note=r.ok?null:said(s,r.reason,actor,target,chosen)}
   return false}
  if(aim?.locked&&aim.hex===hex)return confirmUse(s,actor,u)
  aim={hex,locked:true};note=null;return true
 }
 return {facts,ending,input,next,upcoming,get shown(){return shown as readonly Shown[]},get point(){return point}}
}
export type PlayInput=ReturnType<typeof createPlayInput>
