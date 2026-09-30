// viewer.play-chrome — battle 1 (the Orphanage) played START TO FINISH through the sandbox's play input
// (src/ui/play-input.ts), with every command coming from what the battle screen offers: a hero clicked to act, a hex
// clicked for a ghost and again to walk, an attack clicked on the bar and an enemy clicked twice, End activation for a
// hero who walked and has no one to hit, and End Turn. On Turn 1 one hero acts and End Turn is pressed with the others
// yet to act: the record keeps the pop-up's list (ending().endTurn.yetToAct) beside the engine's heroesYetToAct and what
// the engine then did. From Turn 2 every hero acts and End Turn is never pressed: the Player Phase must end by itself.
// After every paid attack the record keeps whether the activation closed without an End activation click.
//
//   npx tsx tools/play-chrome-probe.mts        prints the record as JSON (engine test/play-chrome.test.ts reads it)
import {createSandbox,advanceSandbox,commandSandbox,type Sandbox} from '../src/core/sandbox.js'
import {SANDBOX_DEFAULT} from '../src/content/sandbox.js'
import {createPlayInput} from '../src/ui/play-input.js'
import {heroesYetToAct,type BattleCommand} from '../src/engine.js'

export type ChromeRecord={
 encounter:string;mapId:string
 /** End Turn pressed on Turn 1 with heroes yet to act */
 ask:{turn:number;shownUids:number[];engineUids:number[];forgoneUids:number[];enemyActivationsAfter:number;turnAfter:number;cursorAfter:string|null}
 /** each Turn the heroes played: End Turn presses, hero activations begun, whether the Player Phase ended */
 turns:{turn:number;endTurnPresses:number;heroActivations:number;heroPhaseEnded:boolean}[]
 /** each attack the play input fired: did the activation close by itself (or a Surge reopen it)? */
 primaries:{turn:number;actor:number;closedBySelf:boolean;surged:boolean}[]
 /** End activation presses after an attack of the same activation had resolved (the ruling: none are needed) */
 endActivationsAfterPrimary:number
 endActivations:number
 /** every command the engine took, by kind — each one made by the play input from a board click or a chrome button */
 commands:Record<string,number>
 outcome:string|null;turn:number;lastEvent:string|null
}
export function playChromeProbe(seed=1):ChromeRecord{
 const config={mapId:SANDBOX_DEFAULT.mapId,heroes:[...SANDBOX_DEFAULT.heroes],enemies:[],seed,encounterId:'encounter.opening.orphanage'}
 const s:Sandbox=createSandbox(config);advanceSandbox(s)
 const commands:Record<string,number>={}
 const run=(c:BattleCommand)=>{const r=commandSandbox(s,c);if(r.ok)commands[c.kind]=(commands[c.kind]??0)+1;return r}
 const P=createPlayInput(()=>s,run)
 const unitOf=(id:number)=>s.ctx.state.units[id]!
 const enemies=()=>s.ctx.state.units.filter(u=>u.side==='enemy'&&u.lifeState==='standing')
 const near=(h:number)=>Math.min(...enemies().map(u=>s.ctx.geo.distance(h,u.hex)))
 const turns=new Map<number,{turn:number;endTurnPresses:number;heroActivations:number;heroPhaseEnded:boolean}>()
 const turnRow=(t:number)=>{let r=turns.get(t);if(!r){r={turn:t,endTurnPresses:0,heroActivations:0,heroPhaseEnded:false};turns.set(t,r)}return r}
 const primaries:ChromeRecord['primaries']=[]
 let ask:ChromeRecord['ask']|null=null,endActivations=0,endActivationsAfterPrimary=0
 const endActivation=(attacked:boolean)=>{if(!P.ending().endActivation)return;endActivations++;if(attacked)endActivationsAfterPrimary++
  if(!P.input({kind:'end-activation'}))throw Error('End activation was offered but not taken')}
 /** one hero's activation, by clicks: attack from where it stands, else from a ghost that reaches, else walk toward the nearest enemy */
 function act(actor:number){
  const me=unitOf(actor),turn=s.ctx.state.turn
  const attack=me.actions.find(id=>id.startsWith('attack.')&&id!=='attack.punch')??'attack.punch'
  const foe=()=>{P.input({kind:'slot',actionId:attack,unit:actor});const tg=P.facts().targets;return tg.length?tg[0]!:null}
  let target=foe()
  if(target===null){const reach=P.facts().reach
   for(const h of reach){P.input({kind:'hex',hex:h});target=foe();if(target!==null)break;P.input({kind:'back'});P.input({kind:'back'})}}
  if(target!==null){
   const before=s.ctx.events.length
   P.input({kind:'hex',hex:target});P.input({kind:'hex',hex:target})
   const ev=s.ctx.events.slice(before),attacked=ev.some(e=>e.type==='attack.declared'&&e.actor===actor)
   const surged=ev.some(e=>e.type==='surge.hit'&&e.actor===actor)
   const still=s.ctx.battleCursor?.at==='acting'&&s.ctx.battleCursor.actor===actor
   if(attacked){primaries.push({turn,actor,closedBySelf:!still||surged,surged});if(still)endActivation(!surged)}
   else if(still)endActivation(false)
   return
  }
  P.input({kind:'back'})
  const reach=P.facts().reach
  if(reach.length){const d=[...reach].sort((a,b)=>near(a)-near(b)||a-b)[0]!;P.input({kind:'hex',hex:d});P.input({kind:'hex',hex:d})}
  if(!s.ctx.state.outcome&&s.ctx.battleCursor?.at==='acting'&&s.ctx.battleCursor.actor===actor)endActivation(false)
 }
 for(let guard=0;guard<4000&&!s.ctx.state.outcome;guard++){
  const c=s.ctx.battleCursor!,turn=s.ctx.state.turn
  if(c.at==='selecting'){
   const end=P.ending().endTurn;if(!end)throw Error('selecting, but End Turn is not offered')
   // Turn 1: once one hero has acted, End Turn with the others yet to act (the pop-up's case)
   if(turn===1&&!ask&&turnRow(turn).heroActivations>0){
    const before=s.ctx.events.length,engineUids=heroesYetToAct(s.ctx,s.policy)
    const shownUids=end.yetToAct.map(id=>unitOf(id).uid)
    turnRow(turn).endTurnPresses++
    if(!P.input({kind:'end-turn'}))throw Error('End Turn was offered but not taken')
    const ev=s.ctx.events.slice(before)
    ask={turn,shownUids,engineUids,forgoneUids:ev.filter(e=>e.type==='activation.forgone').map(e=>e['unitUid'] as number),
     enemyActivationsAfter:ev.filter(e=>e.type==='activation.begin'&&unitOf(e.actor as number).side==='enemy').length,turnAfter:s.ctx.state.turn,cursorAfter:s.ctx.battleCursor?.at??null}
    continue}
   const id=end.yetToAct[0];if(id===undefined)throw Error('selecting, but no hero yet to act')
   if(!P.input({kind:'unit',id,hex:unitOf(id).hex}))throw Error(`clicking ${unitOf(id).name} did not start its activation`)
   turnRow(turn).heroActivations++
   continue}
  if(c.at!=='acting'||c.actor===null)throw Error('the sandbox stopped at '+c.at)
  act(c.actor)
 }
 for(const e of s.ctx.events)if(e.type==='phase.end.begin'&&e['side']==='hero')turnRow(e.turn as number).heroPhaseEnded=true
 const last=s.ctx.events.at(-1)
 return {encounter:config.encounterId,mapId:s.ctx.events.find(e=>e.type==='map.loaded')!['mapId'] as string,ask:ask!,turns:[...turns.values()].sort((a,b)=>a.turn-b.turn),
  primaries,endActivationsAfterPrimary,endActivations,commands,outcome:s.ctx.state.outcome??null,turn:s.ctx.state.turn,lastEvent:last?.type??null}
}
if(import.meta.url===`file://${process.argv[1]}`||process.argv[1]?.endsWith('play-chrome-probe.mts'))process.stdout.write(JSON.stringify(playChromeProbe()))
