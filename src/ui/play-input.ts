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
// viewer.auto-end-no-actions (engine DECISIONS.md 2026-10-03 'a player unit with nothing left it can do ends its Activation by
// itself: "No remaining actions possible."'): rest(), which the host calls whenever the board is still — after a player unit
// has done something, when the engine would accept nothing more from it but ending its Activation (no validated action at
// all: sandboxChoices is every move, attack, power and bonus move validateBattleCommand takes; and nothing stowed it may
// draw), the input sends the engine's own end-cycle, the command End activation sends, and the host puts the notice on the
// screen. A unit that has not acted, or that can still do anything, is left alone (kingdom SWITCHES autoEnd*).
import {sandboxChoices,sandboxActivationChoices,sandboxSwapChoices,sandboxSwapRefusals,type Sandbox,type SandboxChoice,type SandboxSwapOffer} from '../core/sandbox.js'
import {controllerOf,validateBattleCommand,forecastFrom,previewFrom,preview,threatOf,zocHoldersAt,heroesYetToAct,isAttack,isMove,isBurst,actionReach,stepCost,passableFor,grantedActionIds,standsUp,actionReady,staminaCostOf,readyOn} from '../engine.js'
import {refusalLine,switchLine,unpaidLine,type SwitchRefusal,type Unpaid} from './refusals.js'
import {shownName} from '../../../viewer/src/names.js'
import type {BattleCommand,Forecast} from '../engine.js'

export type PlayEvent={kind:'hex';hex:number}|{kind:'point';hex:number|null}|{kind:'unit';id:number;hex:number}|{kind:'choose';id:number}|{kind:'back'}|{kind:'slot';actionId:string;unit:number|null}|{kind:'end-turn'}|{kind:'end-activation'}|{kind:'swap';index:number;unit:number|null}|{kind:'answer';yes:boolean}|{kind:'move-click';clicks:MoveClick}
/** kingdom.move-click-setting (engine DECISIONS.md 2026-10-05 'the battle screen must feel smooth: …; one click or two to move is a
    setting', Andrew: "let's have a setting where it can be either way, so I can just play with it either way."): how a move
    is made. 'two' — the default and the way of 2026-10-03: a click on a hex in reach shows the path and the ghost, a second
    click on it walks. 'one' — a single click on a hex in reach walks there at once, except a walk the engine forecasts a
    free attack on, which still stops for a second click on the same hex so that none is taken by a slip. Attacks are the
    same either way. The setting is the HOST's: it hands the input how to read it and how to keep it (the page: the
    browser's storage); the input says it in its facts — the viewer draws its control from that and offers the change back
    ({kind:'move-click', clicks}) — and decides nothing about where it is kept. */
export type MoveClick='one'|'two'
export type PlaySettings={moveClick():MoveClick;setMoveClick(clicks:MoveClick):void}
/** the one line said when, at one click, a walk is stopped for its second click (kingdom SWITCHES moveClickFreeAttackStop) */
export const FREE_ATTACK_STOP='This path draws a free attack: click the hex again to walk it.'
export type PlayAim={from:number;to:number;target:number|null;hit:number|null;dmg:number|null;hpAfter:number|null;lethal:boolean;locked:boolean}
/** What the viewer draws (viewer src/play.js validates the same shape). Hexes ascending unless named a walk. */
export type PlayFacts={actor:number|null;slot:string|null;reach:number[];zoc:number[];path:number[];provokes:number[];ghost:{unit:number;hex:number}|null;threat:{unit:number;move:number[];hit:number[]}|null;targets:number[];aim:PlayAim|null;note:string|null;swap?:PlaySwap|null;ask?:PlayAsk|null;moveDone?:string[];standFirst?:string[];reachCost?:PlayCost[];reachBorder?:PlayBorder[];moveClick?:MoveClick;cantPay?:PlayCantPay[]}
/** viewer.move-cost-on-grid (engine DECISIONS.md 2026-10-03 '... movement costs on the grid ...', Andrew: "tiles that require
    extra movement points should have that movement cost, I think, maybe on them in gray"): what entering one hex of the reach
    costs the acting unit — the engine's stepCost for the last step of the engine's own walk to it (viewer src/play.js's
    optional reachCost fact; kingdom SWITCHES moveCostLastStep). */
/** viewer.unaffordable-actions-greyed: an action the acting unit cannot pay for now, and the one line that says why */
export type PlayCantPay={id:string;why:string}
export type PlayCost={hex:number;cost:number}
/** viewer.move-cost-on-hex (engine DECISIONS.md 2026-10-05 'playtest post: …', Andrew: "if there are squares in your movement
    area that cost 2 or can't be walked through, that number needs to be on the square."; 'seven answers: … an X on a hex
    that cannot be walked …': "6, yes"): one hex BORDERING the movement area — what the step onto it would cost the acting
    unit, or null when the engine lets it be entered from no hex of the area (viewer src/play.js's optional reachBorder
    fact; kingdom SWITCHES moveCostBorder*). */
export type PlayBorder={hex:number;cost:number|null}
/** viewer.switch-hero-asks: the question the battle screen must put before anything else is done — end the Activation of the
    unit acting (`from`) and begin the unit double-clicked (`to`)? Unit ids; the viewer draws the pop-up with their names and
    offers {kind:'answer', yes} back (viewer src/play.js's optional ask fact). */
export type PlayAsk={kind:'switch';from:number;to:number}
/** movement.swap-and-shields: the swap on the board's action bar — the engine's legal hand lists to hold afterwards (by
    label, in the sandbox's order; a click names one by its index), the engine's swapCostOf, and with none to make the
    engine's own reason (viewer src/play.js's optional swap fact; kingdom SWITCHES playInputSwap) */
export type PlaySwap={cost:number;choices:{label:string;hands:string[]}[];why:string|null;carried:PlayCarried[];refused:{hands:string[];why:string}[]}
/** viewer.swap-button-rearranges (engine DECISIONS.md 2026-10-03 'the swap button says "Swap" and opens a rearranging of the
    unit's gear'; "Just the ability to swap hands with inventory"): one item the acting unit carries — the instance, its row,
    the row's name, and whether it is in a hand now. The gear panel shows exactly these and nothing else: the unit's hands
    and its own stowed items, never the stash. */
export type PlayCarried={instance:string;item:string;name:string;held:boolean}
/** viewer.auto-end-no-actions: the ruled words of the notice (engine DECISIONS.md 2026-10-03, Andrew) */
export const NO_ACTIONS_LEFT='No remaining actions possible.'
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
/** (kingdom.tutorial-free-attack-and-downed: holdWalk — the host may hold, once, a walk that would draw a free attack) */
export type PlayUndo={save():unknown;restore(saved:unknown):boolean;holdWalk?:()=>boolean}
export function createPlayInput(session:()=>Sandbox|null,run:(command:BattleCommand)=>CommandResult,undo:PlayUndo|null=null,settings:PlaySettings|null=null){
 /** kingdom.move-click-setting: the host's setting, read whenever it is asked for (it may change in the middle of a battle); a
     host that hands none has the two clicks of before and no fact */
 const moveClick=():MoveClick|null=>settings?(settings.moveClick()==='one'?'one':'two'):null
 let chosen:string|null=null,ghost:Ghost|null=null,aim:{hex:number;locked:boolean}|null=null,point:number|null=null,note:string|null=null
 let owner:string|null=null
 /** the Activation this input began: who, the engine's sequence right after (nothing done since while it is unchanged), the
     battle saved before it began, and the heroes the engine would then have let begin */
 let begun:{actor:number;seq:number;saved:unknown;queue:number[]}|null=null
 /** kingdom.tutorial-orphanage-first-move (engine DECISIONS.md 2026-10-04 'the opening's tutorial: …' — asked whether the lesson
     should just point at the Move button rather than wait for a press, since a hero's move is already chosen when its
     Activation begins: "1, no."): the unit whose Activation the host asked to begin with NO move chosen — the lesson's own
     exception to 2026-10-03 'a hero starts its Activation with its basic move armed', which stands everywhere else. Until
     the player chooses a move on the bar the input arms none for that unit: no reach, no path, no walk; the press is a
     real act. It is that one Activation's: the next unit begun is armed as ever (kingdom SWITCHES lessonMoveNotArmed). */
 let unarmed:number|null=null
 /** viewer.switch-hero-asks: the question asked (who would be ended, who begun, the engine's sequence when it was asked — it
     does not outlive that), and, between the yes and the next begin, the unit the player asked for */
 let asking:{from:number;to:number;seq:number}|null=null,wanted:number|null=null
 /** kingdom.attack-one-armed-after-move (engine DECISIONS.md 2026-10-05 'the battle screen must feel smooth: …; attack one is
     chosen after a move; …', Andrew: "after you move, we should auto-select your basic attack or your attack one. If you have
     a ranged weapon, it's still your attack one … Basically, you're changing [away] from basic attack one if you want to do
     anything other than that first thing."): the Activation (sync's key) in which the player took the choice back — a
     right-click, Esc. It is not chosen again by itself in that Activation; the next one starts afresh. */
 let attackOneOff:string|null=null
 /** the Activation in which attack one WAS chosen by itself: only a choice made that way is "taken back" by a right-click —
     an action the player chose and dropped before moving takes nothing back */
 let attackOneArmed:string|null=null
 const shown:Shown[]=[]
 // per engine sequence number: the validated choices, the ghost's forecast, each enemy's reach, the hatching
 let cacheSeq=-1,cache:{choices?:SandboxChoice[];swap?:SandboxSwapOffer;refused?:{hands:string[];why:string}[];forecast?:Map<string,Forecast>;threat?:Map<number,{move:number[];hit:number[]}>;zoc?:number[]}={}
 const cached=(s:Sandbox)=>{if(s.ctx.state.seq!==cacheSeq){cacheSeq=s.ctx.state.seq;cache={}}return cache}
 const choicesOf=(s:Sandbox)=>{const c=cached(s);return c.choices??=sandboxChoices(s)}
 /** the engine's swap for the hero acting (kingdom core sandboxSwapChoices: every hand list validateBattleCommand takes) */
 const swapOf=(s:Sandbox)=>{const c=cached(s);return c.swap??=sandboxSwapChoices(s)}
 /** the swap fact: none while no hero acts or for a hero who carries nothing to swap; else the offer, or the engine's reason */
 /** viewer.swap-button-rearranges: with the hand lists the engine takes, everything the unit carries (its hands, then what is
     stowed on it — the engine's loadout, named from the engine's item rows) and every other arrangement with the engine's
     reason (kingdom core sandboxSwapRefusals), so the gear panel offers only what the engine accepts and says why not */
 const swapFact=(s:Sandbox):PlaySwap|null=>{const o=swapOf(s);if(o.cost===null||(!o.choices.length&&!o.why))return null
  const L=s.ctx.state.units[s.ctx.battleCursor!.actor!]!.loadout!,c=cached(s)
  const row=(i:{instanceId:string;itemId:string},held:boolean):PlayCarried=>({instance:i.instanceId,item:i.itemId,name:s.ctx.items[i.itemId]?.name??i.itemId,held})
  return {cost:o.cost,choices:o.choices.map(x=>({label:x.label,hands:[...x.hands]})),why:o.choices.length?null:o.why,
   carried:[...L.hands.map(i=>row(i,true)),...L.stowed.map(i=>row(i,false))],refused:c.refused??=sandboxSwapRefusals(s)}}
 /** a power that goes nowhere but its holder's own hex: aimed at the one using it alone (Raise Guard, Brace …: the row's target is
     `self`), or centred on it (Lock Shields: the row's target is an area around the one acting - "you and every adjacent ally").
     engine content.shields-reauthored (2026-10-04): the second shape joined the first, so the Round Shield's power fires from the
     bar as the other shield powers do (kingdom SWITCHES playInputSelfCentredPower). Read from the engine's row, never a list. */
 const selfOnly=(s:Sandbox,id:string)=>{const t=s.ctx.actions[id]?.target as {select?:string;origin?:string;side?:string}|undefined
  return t?.select==='self'||(t?.select==='area'&&(t.origin??'self')==='self'&&t.side!=='enemy')}
 /** the human hero now acting, or null */
 const actorOf=(s:Sandbox)=>{const c=s.ctx.battleCursor;return !s.ctx.state.outcome&&c?.at==='acting'&&c.actor!=null&&controllerOf(s.ctx,c.actor,s.policy)==='human'?c.actor:null}
 /** a new activation forgets the last one's plan */
 /** the battle the plan belongs to: another battle (a replay after a loss, a save opened, the undo's restored copy) is another
     engine context, and a plan — the chosen action above all — never carries over into it, even where its first Activation
     has the same unit, Turn and count as the last battle's did (kingdom.attack-one-armed-after-move: the replayed Orphanage
     began with the attack chosen at the end of the lost one, and no move armed) */
 let battle:unknown=null
 const sync=(s:Sandbox|null)=>{
  if(s&&s.ctx!==battle){battle=s.ctx;owner=null;attackOneOff=null;attackOneArmed=null}
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
 /* viewer.unit-names-no-letters-or-numbers (engine DECISIONS.md 2026-10-05 'no unit is shown with a number or a letter'): a note
    names a unit as the board does - the engine's name, less its mark (the viewer's one function, src/names.js shownName) */
 const shownOf=(u:{name:string}|undefined)=>u?shownName(u.name):null
 const nameOf=(s:Sandbox,id:number|null|undefined)=>id==null?null:shownOf(s.ctx.state.units[id])
 /** begin a hero: the battle saved first (the undo), then the engine's select-activation; its refusal said in a plain line */
 const begin=(s:Sandbox,id:number,queue:number[],bare=false)=>{const uid=s.ctx.state.units[id]?.uid;if(uid===undefined)return false
  const saved=undo?undo.save():null
  const r=run({kind:'select-activation',unitUid:uid,expectedSeq:s.ctx.state.seq})
  if(!r.ok){note=refusalLine(r.reason,{target:nameOf(s,id)});return false}
  const now=session()!;cacheSeq=-1;begun={actor:id,seq:now.ctx.state.seq,saved,queue};unarmed=bare?id:null;note=null;return true}
 /** viewer.auto-end-no-actions: has the unit acting nothing left the engine would accept but ending its Activation? Only once
     it has done something since it began (the engine's sequence moved on; for an Activation this input did not begin, the
     unit's own moveUsed / primaryUsed). Nothing left: the engine validates no action from it (choicesOf — every move, attack
     with a target, power, item use and bonus move), would take its end-cycle, and holds nothing stowed it would let it draw
     — a swap that only puts away what is held is not a thing left to do (kingdom SWITCHES autoEndSwap). No range, cost or
     reach is worked out here. */
 const nothingLeft=(s:Sandbox,actor:number)=>{
  const u=s.ctx.state.units[actor]!
  const acted=begun?.actor===actor?s.ctx.state.seq!==begun.seq:(u.moveUsed||u.primaryUsed)
  if(!acted||choicesOf(s).length)return false
  if(!validateBattleCommand(s.ctx,s.policy,{kind:'end-cycle',actor,expectedSeq:s.ctx.state.seq}).ok)return false
  const stowed=new Set((u.loadout?.stowed??[]).map(i=>i.instanceId))
  return !swapOf(s).choices.some(c=>c.hands.some(id=>stowed.has(id)))
 }
 /** viewer.auto-end-no-actions: the host calls it whenever the board is still. True when the unit acting had nothing left and
     its Activation was ended (the engine's end-cycle); the host then shows NO_ACTIONS_LEFT. Never while a question stands. */
 function rest():boolean{
  const s=session();if(!s||s.ctx.state.outcome)return false
  const actor=sync(s);if(actor===null||asking||!nothingLeft(s,actor))return false
  const r=run({kind:'end-cycle',actor,expectedSeq:s.ctx.state.seq});if(!r.ok)return false
  done();note=null;return true
 }
 /** viewer.turn-taking: while the engine waits for a choice, the next hero yet to act is begun — its basic move armed (moveOf
     with nothing chosen). The host calls it whenever it is idle; true when a hero was begun. */
 function next(o:{unarmed?:boolean}={}):boolean{
  const s=session();if(!s||s.ctx.state.outcome||s.ctx.battleCursor?.at!=='selecting')return false
  /* viewer.switch-hero-asks: after a yes, the unit asked for begins — not the leftmost — when the engine lets it */
  const q=queueOf(s),want=wanted;wanted=null
  const id=want!==null&&q.includes(want)?want:q[0];if(id===undefined)return false
  return begin(s,id,q,o.unarmed===true)
 }
 /** why another hero may not be switched to now (the engine said activation-not-selectable): not the player's, has acted
     or is down — read from the engine's own queue and unit facts — else the one acting must finish (no partial Activations) */
 function whyNot(s:Sandbox,id:number,actor:number|null):SwitchRefusal{
  const u=s.ctx.state.units[id]!,target=shownName(u.name)
  if(u.side!=='hero'||controllerOf(s.ctx,id,s.policy)!=='human')return {kind:'not-yours',target}
  if(u.lifeState!=='standing')return {kind:'down',target}
  if(!heroesYetToAct(s.ctx,s.policy).includes(u.uid)||actor===null)return {kind:'acted',target}
  const a=s.ctx.state.units[actor]!
  return {kind:'busy',actor:shownName(a.name),did:a.moveUsed?'moved':a.primaryUsed||(begun?.actor===actor&&s.ctx.state.seq!==begun.seq)?'acted':'begun'}
 }
 /** the move the hero plans with: the chosen move, movement slot first, else primary; with nothing chosen, its first move
     with a legal destination IN THE MOVEMENT SLOT — a move spent as the primary is chosen on the bar (SWITCHES playInputDefaultMove) */
 const moveOf=(s:Sandbox,actor:number)=>{
  const ch=choicesOf(s).filter(c=>'destination' in c.command&&c.command.actor===actor)
  if(chosen===null){if(unarmed===actor)return null
   const first=ch.find(c=>c.command.slot==='movement');if(!first)return null
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
  /* a power centred on its holder (Lock Shields) is listed by the engine against every unit - its aim is ignored, the area is the
     holder's own - so its one use is on the holder, as a power aimed at the holder alone has (kingdom SWITCHES playInputSelfCentredPower) */
  const mine=selfOnly(s,chosen)?out.filter(u=>u.key==='target'&&u.value===actor):out
  const by=new Map<number,Use>();for(const u of mine.sort((a,b)=>(a.slot==='primary'?0:1)-(b.slot==='primary'?0:1)))if(!by.has(u.hex))by.set(u.hex,u)
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
 /** kingdom.attack-one-armed-after-move: the unit's ATTACK ONE — the first attack the engine grants it, in the engine's own
     order (grantedActionIds: the one its bar lists first, a melee weapon's or a bow's) — if the engine would take an order
     with it now for any target at all, else null. Asked of the engine, not worked out: an order with that attack is
     validated, and the engine answers BEFORE it looks at the target when the unit cannot act, the action is not ready (no
     Stamina, a cooldown, no use left) or its slot is closed (the primary is spent). Those three mean "not for reach": nothing
     is chosen — not a later attack either (kingdom SWITCHES attackOneNotALaterOne). Any refusal after them is about the
     target (out of reach, a taunt): it is chosen all the same, and its arrow shows how far it reaches. */
 const NOT_FOR_REACH=new Set(['actor-cannot-act','action-not-ready','action-slot-closed'])
 const attackOneOf=(s:Sandbox,actor:number):string|null=>{
  const u=s.ctx.state.units[actor]!,id=grantedActionIds(s.ctx,u).find(x=>{const a=s.ctx.actions[x];return !!a&&isAttack(a)})
  if(id===undefined)return null
  const r=validateBattleCommand(s.ctx,s.policy,{kind:'action',actor,actionId:id,target:actor,expectedSeq:s.ctx.state.seq} as BattleCommand)
  return r.ok||!NOT_FOR_REACH.has(r.reason)?id:null
 }
 /** a move of the acting unit's has just been made and the engine waits for its next order: its attack one is chosen, exactly
     as a click on that bar row chooses it — the row lit, its targets, the arrow out to its reach, the forecast on what is
     pointed at — but nothing is said (a click with nothing in reach says so; after every walk it would be noise: kingdom
     SWITCHES attackOneSaysNothing). After EVERY move of the Activation (the rest of a walk, a bonus move: attackOneAfterEachMove)
     unless the player took it back in this Activation. Not when the Activation is over, or is another unit's. */
 const armAttackOne=(actor:number)=>{
  const s=session();if(!s||s.ctx.state.outcome||actorOf(s)!==actor)return
  if(sync(s)!==actor||owner===attackOneOff)return
  const id=attackOneOf(s,actor);if(id===null)return
  chosen=id;ghost=null;aim=null;attackOneArmed=owner
 }
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

 /** viewer.bar-moves-grey-when-done (engine DECISIONS.md 2026-10-03 'the action bar: the moves grey slightly once the move is
     done, nothing else greys', Andrew: "Just gray the moves out after a move is done."): the acting unit's move actions that
     are DONE for this Activation — read from the engine's own state, never guessed: its unit has moved (the engine's
     `moveUsed`: its movement action is spent) and the engine lists no further use of that action (no destination among the
     choices validateBattleCommand takes, in either slot). So the basic move greys once its movement is walked out; a move the
     engine still offers — the rest of a walk cut short — stays at full strength; and before the unit has moved nothing is done,
     whatever the engine refuses (kingdom SWITCHES moveDoneFact). Since engine rule.walked-unit-has-moved (ruled 2026-10-04) the
     engine takes no OTHER movement from a unit that has walked, so a Leap or a Side Roll is named here as soon as the hero has
     walked a hex — by the same reading, with no rule of this file's own (kingdom SWITCHES moveDoneAfterAWalk). */
 const moveDoneOf=(s:Sandbox,actor:number):string[]=>{
  const u=s.ctx.state.units[actor]!
  if(!u.moveUsed)return []
  const offered=new Set(choicesOf(s).map(c=>c.command.actionId))
  return u.actions.filter(id=>{const a=s.ctx.actions[id];return !!a&&isMove(a)&&!isAttack(a)&&!offered.has(id)})
 }
 /** viewer.prone-turn-only-stand-up (engine DECISIONS.md 2026-10-05 'playtest post: …', Andrew: "if you are downed, when it's
     that character's next turn, everything needs to be grayed out except 'stand up'."): the acting unit's actions that WAIT ON
     ITS STAND — read from the engine, never ruled here. The unit is down when the engine grants it a stand (grantedActionIds
     holds a movement that standsUp: the prone status's own action); what waits is every other action it is granted that the
     engine's one limits check (actionReady) refuses. Until 2026-10-05 that was its other movements only; since engine
     rule.prone-only-stand-up (ruled that day: "yes, it cannot use attacks or powers until it stands.") it is EVERY action but
     the stand — by the same reading, with no rule of this file's own (kingdom SWITCHES proneBarReadsTheEngine, its dated
     note). And once the unit has stood the engine takes no movement from it ("No, you only perform one move action."), so
     `moveDone` below names every move it holds — again the engine's answer. A unit that is standing names none. */
 const standOf=(s:Sandbox,actor:number):string|null=>{const u=s.ctx.state.units[actor]!
  return grantedActionIds(s.ctx,u).find(id=>{const a=s.ctx.actions[id];return !!a&&standsUp(a)})??null}
 const standFirstOf=(s:Sandbox,actor:number):string[]=>{
  if(standOf(s,actor)===null)return []
  const u=s.ctx.state.units[actor]!
  return grantedActionIds(s.ctx,u).filter(id=>{const a=s.ctx.actions[id];return !!a&&!standsUp(a)&&!actionReady(s.ctx,u,a)})
 }
 /** viewer.unaffordable-actions-greyed (engine DECISIONS.md 2026-10-05 'a prone unit only stands; …; what cannot be paid is greyed; …', Andrew: "If a tax can't be paid for or a power can't be paid for, it should be grayed out." ('tax' is 'attack' - dictation)): the acting
     unit's actions it CANNOT PAY FOR now — every action it is granted that the engine's one limits check (actionReady)
     refuses, each with the line that says why. Whether it is refused is the engine's answer and nothing else; WHY is read
     from the engine's own numbers in the order that check asks them (action.ts: Stamina — staminaCostOf against the unit's
     Stamina; then the Turn it is ready on — readyOn, a warm-up when that Turn is the one its row's warm-up wrote at fielding,
     else a cooldown; then a use). A unit that is down names none here: its actions wait on the stand (standFirst), one
     reason at a time. A move the unit cannot pay for is named like any action (kingdom SWITCHES unpaidNamesMoves). */
 const unpaidOf=(s:Sandbox,actor:number,id:string):Unpaid=>{
  const u=s.ctx.state.units[actor]!,a=s.ctx.actions[id]!,needs=staminaCostOf(u,a)
  if(u.stamina<needs)return {kind:'stamina',needs,has:u.stamina}
  const on=readyOn(u,id),turn=s.ctx.state.turn
  if(turn<on)return {kind:a.warmup!==undefined&&on===a.warmup+1?'warm-up':'cooldown',turns:on-turn}
  if(a.uses&&(u.usesLeft[id]??0)<=0)return {kind:'uses'}
  return {kind:'other'}
 }
 const cantPayOf=(s:Sandbox,actor:number):PlayCantPay[]=>{
  if(standOf(s,actor)!==null)return []
  const u=s.ctx.state.units[actor]!
  return grantedActionIds(s.ctx,u).flatMap(id=>{const a=s.ctx.actions[id];return !a||actionReady(s.ctx,u,a)?[]:[{id,why:unpaidLine(unpaidOf(s,actor,id))}]})
 }
 function facts():PlayFacts{
  const mc=moveClick()
  const s=session(),empty:PlayFacts={actor:null,slot:null,reach:[],zoc:[],path:[],provokes:[],ghost:null,threat:null,targets:[],aim:null,note,...(mc?{moveClick:mc}:{})}
  if(!s||s.ctx.state.outcome)return {...empty,note:null}
  const actor=sync(s)
  const threat=chosen===null&&point!==null?threatAt(s,point):null
  if(actor===null)return {...empty,threat}
  const here=s.ctx.state.units[actor]!.hex
  const f:PlayFacts={...empty,actor,threat,slot:chosen,ghost:ghost?{unit:actor,hex:ghost.destination}:null,swap:swapFact(s),moveDone:moveDoneOf(s,actor),standFirst:standFirstOf(s,actor),cantPay:cantPayOf(s,actor),...(asking?{ask:{kind:'switch' as const,from:asking.from,to:asking.to}}:{})}
  const mv=moveOf(s,actor)
  if(mv){f.slot=mv.actionId
   f.reach=asc(mv.choices.map(c=>(c.command as {destination:number}).destination))
   /* viewer.move-cost-on-grid: the cost of entering each reach hex, the engine's — stepCost onto it from the hex before it on
      the engine's own walk there (movementOptions' path). A move that walks no path (a leap, a flight, a sidestep) is charged
      no step, so it names no cost. Nothing is added up or subtracted here. */
   f.reachCost=mv.choices.filter(c=>c.path.length>0).map(c=>{const hex=(c.command as {destination:number}).destination;return{hex,cost:stepCost(s.ctx,hex,c.path.length>1?c.path[c.path.length-2]!:here)}}).sort((a,b)=>a.hex-b.hex)
   /* viewer.move-cost-on-hex: the hexes bordering the area of a WALK (the unit's own hex and its reach) — each hex next to the
      area, outside it, with nobody standing on it — and the engine's answer for this unit: may it be entered from a hex of
      the area it touches (passableFor: the ground, the props, the structures), and what that step would cost (stepCost; the
      least, where it touches several). Null: it may be entered from none — the screen's X. A move that walks no path (a
      leap, a flight, a sidestep) is charged no step and is stopped by no ground, so it names none. Nothing here decides
      what is passable or what a step costs. */
   if(f.reachCost.length){const u=s.ctx.state.units[actor]!,area=new Set([here,...f.reach]),taken=new Set(s.ctx.state.units.filter(x=>x.lifeState!=='dead').map(x=>x.hex)),enter=passableFor(s.ctx,u)
    const near=new Set<number>();for(const a of area)for(const n of s.ctx.geo.neighbours(a))if(!area.has(n)&&!taken.has(n))near.add(n)
    f.reachBorder=asc([...near]).map(hex=>{const from=s.ctx.geo.neighbours(hex).filter(a=>area.has(a)&&enter(hex,a));return{hex,cost:from.length?Math.min(...from.map(a=>stepCost(s.ctx,hex,a))):null}})}
   else f.reachBorder=[]
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
  refusalLine(code,{actor:nameOf(s,actor),target:nameOf(s,target),action:actionId?s.ctx.actions[actionId]?.name??null:null,stand:actor!==null?s.ctx.actions[standOf(s,actor)??'']?.name??null:null})

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
  /* kingdom.move-click-setting: the change the viewer's control offers back — kept by the host, read again at the next click.
     It is no order: nothing in the battle or in the plan changes, and a question that stands is left standing. */
  if(e.kind==='move-click'){if(!settings||(e.clicks!=='one'&&e.clicks!=='two'))return false
   settings.setMoveClick(e.clicks);return true}
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
    if(!undo.restore(b!.saved)){note=switchLine({kind:'busy',actor:shownName(s.ctx.state.units[actor]!.name),did:'begun'});return false}
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
   /* kingdom.attack-one-armed-after-move: taken back, attack one is not chosen again by itself in this Activation */
   if(chosen!==null){chosen=null;aim=null;if(attackOneArmed===owner)attackOneOff=owner;return true}
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
   /* fix.stand-up-does-nothing (2026-10-05, Andrew: "The stand-up button doesn't seem to work."): the action pressed is one the
      ENGINE grants the unit now (grantedActionIds: its own list, and Stand Up while it holds the prone status). This asked the
      unit's stored list, which never holds a status's action, so the press on Stand Up was dropped here without a word. */
   if(!grantedActionIds(s.ctx,u).includes(e.actionId)||!s.ctx.actions[e.actionId])return false
   const a=s.ctx.actions[e.actionId]!
   /* viewer.prone-turn-only-stand-up: an action that waits on the unit's stand (standFirstOf — the engine's refusal) is not
      chosen; the press is answered in one line that says what to do, by the stand's own name, and the screen is left as the
      Activation began (the stand armed, as the engine's only movement) */
   if(standFirstOf(s,actor).includes(e.actionId)){chosen=null;aim=null;ghost=null;note=`Knocked down: ${s.ctx.actions[standOf(s,actor)!]!.name} first.`;return true}
   /* viewer.unaffordable-actions-greyed: an action the unit cannot pay for (cantPayOf — the engine's refusal) is not chosen;
      the press is answered by the line that says why, and what was chosen and planned is left as it was */
   {const cp=cantPayOf(s,actor).find(c=>c.id===e.actionId);if(cp){note=cp.why;return true}}
   if(isMove(a)){
    /* a power that goes nowhere is used from the bar: chosen, it is planned on the hero's own hex at once; chosen again (or
       the hero clicked) it is used — engine DECISIONS.md 2026-10-01, Devotion: "I can't double-click on it or anything to
       make it trigger" (kingdom SWITCHES playInputStandStill) */
    if(ghost&&ghost.actionId===e.actionId&&ghost.destination===s.ctx.state.units[actor]!.hex&&chosen===e.actionId){const r=run(moveCommand(s,actor,ghost));note=r.ok?null:said(s,r.reason,actor,null,e.actionId);done();if(r.ok)armAttackOne(actor);return true}
    if(ghost&&ghost.actionId!==e.actionId)ghost=null;chosen=e.actionId;aim=null;unarmed=null
    const mv=moveOf(s,actor)
    if(!mv?.choices.length){chosen=null
     /* the engine's own reason this move has no hex now (its slot is spent, it is rooted, not ready …) */
     const r=validateBattleCommand(s.ctx,s.policy,{kind:'action',actor,actionId:e.actionId,slot:'movement',destination:s.ctx.state.units[actor]!.hex,expectedSeq:s.ctx.state.seq})
     note=r.ok||r.reason==='unreachable-destination'?`${a.name}: no legal hex now.`:said(s,r.reason,actor,null,e.actionId);return true}
    /* kingdom.stand-up-one-press (engine DECISIONS.md 2026-10-05 'seven answers: …; Stand Up is one press; …', Andrew: "stand up
       one press."): the stand — the engine's own name for it (standsUp) — is used on the press itself: no plan on the hex, no
       second press, no click on the unit. It is Stand Up's alone; every other move that goes nowhere keeps the two presses
       below (kingdom SWITCHES standUpAloneIsOnePress; overturns standUpIsUsedLikeAMoveThatGoesNowhere of the same day) */
    if(standsUp(a)&&standsStill(s,actor,mv.choices)){const c=mv.choices[0]!
     const r=run(moveCommand(s,actor,{actionId:c.command.actionId,slot:c.command.slot??'movement',destination:(c.command as {destination:number}).destination} as Ghost))
     note=r.ok?null:said(s,r.reason,actor,null,e.actionId);done();if(r.ok)armAttackOne(actor);return true}
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
   if(ghost&&ghost.destination===hex&&ghost.actionId===g.actionId){
    /* kingdom.tutorial-free-attack-and-downed: a walk the engine forecasts a free attack on may be held this once by the host
       (its lesson is telling the player so): the path stays shown, and the next click on it walks */
    {const fc=forecastOf(s,actor,g);if(fc.ok&&fc.provokes.length&&undo?.holdWalk?.()){note=null;return true}}
    /* kingdom.attack-one-armed-after-move: the move made, the unit's attack one is chosen by itself */
    const r=run(moveCommand(s,actor,g));note=r.ok?null:said(s,r.reason,actor,null,g.actionId);done();if(r.ok)armAttackOne(actor);return true}
   /* kingdom.move-click-setting: at ONE click the first click on a hex in reach walks there at once — unless the engine forecasts
      a free attack on that walk: then it is only planned, as at two clicks (the path stays, the hexes it provokes on are
      marked by the facts' provokes) and one line says why; the next click on the same hex is the walk, above. A move that
      goes nowhere is used from the bar and from the unit, never from a hex, and is not this (how 'hex' only). */
   if(how==='hex'&&moveClick()==='one'){const fc=forecastOf(s,actor,g)
    if(fc.ok&&fc.provokes.length){ghost=g;note=FREE_ATTACK_STOP;return true}
    const r=run(moveCommand(s,actor,g));note=r.ok?null:said(s,r.reason,actor,null,g.actionId);done();if(r.ok)armAttackOne(actor);return true}
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
 /** kingdom.tutorial-orphanage-first-move: what the lessons ask of the unit acting — has it done nothing since this input
     began it (the engine's sequence unmoved), and which action is its basic move: the first move the engine lists in the
     movement slot, the one a begun Activation is armed with (whether or not it is armed now) */
 /** kingdom.tutorial-skip: the Activation begun with no move chosen is armed after all (the lesson that asked for it was skipped) */
 function arm():void{unarmed=null}
 function fresh():boolean{const s=session();if(!s)return false;const a=actorOf(s);return a!==null&&begun?.actor===a&&begun.seq===s.ctx.state.seq}
 function basicMove():string|null{const s=session();if(!s)return null;const a=actorOf(s);if(a===null)return null
  return choicesOf(s).find(c=>'destination' in c.command&&c.command.actor===a&&c.command.slot==='movement')?.command.actionId??null}
 /** kingdom.tutorial-orphanage-enemy-turn: the first of the acting unit's attacks (in its own action order) the engine would take
     against an enemy now — from the end of the path planned (the ghost: the action list on its forecast, pathEndAttacks), else
     from where it stands (the validated choices) — or null. No range is worked out here. */
 function attackInReach():string|null{const s=session();if(!s)return null;const a=actorOf(s);if(a===null)return null
  const u=s.ctx.state.units[a]!
  if(ghost){const first=[...pathEndAttacks(s,a,ghost).values()][0];return first?first.actionId:null}
  for(const id of u.actions){if(!isAttack(s.ctx.actions[id]!))continue
   if(choicesOf(s).some(c=>c.command.actionId===id&&c.command.actor===a&&'target' in c.command&&s.ctx.state.units[c.command.target]?.side!==u.side))return id}
  return null}
 /** kingdom.tutorial-orphanage-civilians-and-ending: this Hero Phase, how many of the player's standing units have acted and how
     many have yet to (the engine's heroesYetToAct, and the one acting now) */
 /** kingdom.tutorial-free-attack-and-downed: the enemy that would strike the acting unit on the path it has planned — the first
     provoke on the engine's forecast of that walk — or null */
 function provoker():number|null{const s=session();if(!s||!ghost)return null;const a=actorOf(s);if(a===null)return null
  const fc=forecastOf(s,a,ghost);return fc.ok&&fc.provokes.length?fc.provokes[0]!.from:null}
 function acted():{done:number;left:number}{const s=session();if(!s||s.ctx.state.outcome)return {done:0,left:0}
  const left=heroesYetToAct(s.ctx,s.policy).length+(actorOf(s)!==null?1:0)
  const mine=s.ctx.state.units.filter(u=>u.side==='hero'&&u.lifeState==='standing'&&controllerOf(s.ctx,u.id,s.policy)==='human').length
  return {done:Math.max(0,mine-left),left}}
 /** kingdom.tutorial-turns-in-battle-one: the player's other units that have yet to act this Hero Phase — the engine's
     heroesYetToAct as unit ids, never the one acting — lowest id first */
 function yetToAct():number[]{const s=session();if(!s||s.ctx.state.outcome)return []
  const a=actorOf(s),uids=new Set(heroesYetToAct(s.ctx,s.policy))
  return s.ctx.state.units.filter(u=>uids.has(u.uid)&&u.id!==a).map(u=>u.id).sort((x,y)=>x-y)}
 return {facts,ending,input,next,rest,upcoming,arm,fresh,basicMove,attackInReach,acted,yetToAct,provoker,get shown(){return shown as readonly Shown[]},get point(){return point}}
}
export type PlayInput=ReturnType<typeof createPlayInput>
