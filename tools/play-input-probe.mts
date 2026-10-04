// viewer.play-input — the mouse alone plays battle 1 (the Orphanage) through the sandbox's play input
// (src/ui/play-input.ts), exactly as the battle screen's clicks reach it: click a hero, click a hex for a ghost, click
// it again to confirm; click an attack on the bar, point at an enemy, click it, click it again; right-click steps back
// one stage. Records what the screen was told to draw and what the engine then did, so the tests can ask: did the
// forecast shown equal what landed? No dropdown, no hand-built command except End activation (the next item's End Turn).
//
//   npx tsx tools/play-input-probe.mts        prints the record as JSON (test/play-input-engine.test.ts reads it)
import {createSandbox,advanceSandbox,commandSandbox,sandboxActivationChoices,type Sandbox} from '../src/core/sandbox.js'
import {SANDBOX_DEFAULT} from '../src/content/sandbox.js'
import {seesScheduleOut} from './sandbox-sees-schedule.mjs'
import {createPlayInput,type PlayFacts} from '../src/ui/play-input.js'
import {threatOf,forecastFrom,previewFrom,type BattleCommand,type Event} from '../src/engine.js'

export type ProbeRecord={
 encounter:string;mapId:string
 threat:{unit:number;shown:{move:number[];hit:number[]};engine:{move:number[];hit:number[]}}
 selected:{uid:number;actor:number|null}
 move:{reach:number[];path:number[];provokes:number[];ghost:number|null;afterBack:number|null;confirmedAt:number;engineAt:number;engineProvokes:number[];pathFromEngine:number[]}
 attacks:{fromGhost:boolean;target:number;shown:{hit:number;dmg:number;hpAfter:number|null;lethal:boolean};declared:{hitChance:number;damageOnHit:number};hit:boolean;crit:boolean;landed:{hpAfter:number}|null;backCleared:boolean;engineFromGhost:{hitChance:number;damageOnHit:number}|null}[]
 /** End activation presses (a button; End Turn is viewer.play-chrome) — every other command came from a click */
 endActivations:number
}
export function probe(seed=1):ProbeRecord{
 const config={mapId:SANDBOX_DEFAULT.mapId,heroes:[...SANDBOX_DEFAULT.heroes],enemies:[],seed,encounterId:'encounter.opening.orphanage'}
 /* Law 10, 2026-10-04 (engine fix.opening-orphanage-closer-start; engine DECISIONS.md 2026-10-04 '… a closer start'): this read
      const s:Sandbox=createSandbox(config);advanceSandbox(s)
    — the battle as fielded. On the closer start these three heroes clear the Orphanage before there is a second attack or a
    second Player Phase to record, so the probe fields the same battle to see its schedule out (tools/sandbox-sees-schedule.mts:
    the engine's own fielding switch, as its opening probes use). Every record and every assertion on it is unchanged. */
 const s:Sandbox=seesScheduleOut(createSandbox(config));advanceSandbox(s)
 let hand=0
 const run=(c:BattleCommand)=>commandSandbox(s,c)
 const P=createPlayInput(()=>s,run)
 const F=():PlayFacts=>P.facts()
 const events=(from:number)=>s.ctx.events.slice(from) as Event[]
 const zombie=s.ctx.state.units.find(u=>u.side==='enemy')!
 // 1. nothing chosen, pointing at an enemy: where it can move and hit
 P.input({kind:'point',hex:zombie.hex});const t=F().threat!
 const threat={unit:t.unit,shown:{move:t.move,hit:t.hit},engine:threatOf(s.ctx,zombie.id)}
 // 2. click a hero to act (the Hunter)
 const hunter=s.ctx.state.units.find(u=>u.typeId==='hero.base.ranger-aggressive')!
 /* Law 10 (viewer.xcom-camera, 2026-10-01): engine DECISIONS.md 2026-10-01 'the XCOM-style camera', Andrew: "Double-click a character in the top bar or on the map to change it" — a hero other than the one proposed is picked by a double-click (choose), then clicked; a click alone no longer starts any hero but the proposed one */
 P.input({kind:'choose',id:hunter.id});P.input({kind:'unit',id:hunter.id,hex:hunter.hex})
 const selected={uid:hunter.uid,actor:s.ctx.battleCursor?.actor??null}
 // 3. the reach, the path to the hex pointed at, a ghost there, right-click (the ghost goes), the ghost again, confirm
 let f=F();const reach=f.reach
 const near=(h:number)=>Math.min(...s.ctx.state.units.filter(u=>u.side==='enemy'&&u.lifeState==='standing').map(u=>s.ctx.geo.distance(h,u.hex)))
 const dest=[...reach].sort((a,b)=>near(a)-near(b)||a-b)[0]!
 P.input({kind:'point',hex:dest});f=F();const path=f.path,provokes=f.provokes
 const engineMove=forecastFrom(s.ctx,{actor:hunter.id,actionId:f.slot!,destination:dest,slot:'movement'})
 P.input({kind:'hex',hex:dest});const ghost=F().ghost?.hex??null
 P.input({kind:'back'});const afterBack=F().ghost?.hex??null
 P.input({kind:'hex',hex:dest});P.input({kind:'hex',hex:dest})
 const move={reach,path,provokes,ghost,afterBack,confirmedAt:dest,engineAt:s.ctx.state.units[hunter.id]!.hex,engineProvokes:engineMove.ok?engineMove.provokes.map(p=>p.at):[],pathFromEngine:[] as number[]}
 const moved=s.ctx.events.filter(e=>e.type==='moved'&&e.actor===hunter.id).map(e=>e['to'] as number)
 move.pathFromEngine=moved
 // 4. play on with the mouse until attacks have landed: each hero walks toward the nearest enemy, attacking from a ghost when one reaches
 const attacks:ProbeRecord['attacks']=[]
 const endCycle=()=>{hand++;const a=s.ctx.battleCursor!.actor!;const r=commandSandbox(s,{kind:'end-cycle',actor:a,expectedSeq:s.ctx.state.seq});if(!r.ok)throw Error(r.reason)}
 for(let guard=0;guard<400&&!s.ctx.state.outcome&&attacks.filter(a=>a.hit&&!a.crit&&a.landed).length<2;guard++){
  const c=s.ctx.battleCursor!
  if(c.at==='selecting'){const next=sandboxActivationChoices(s)[0];if(!next)throw Error('selecting, but no hero to choose')
   const h=s.ctx.state.units.find(u=>u.uid===next.uid)!;P.input({kind:'choose',id:h.id});if(!P.input({kind:'unit',id:h.id,hex:h.hex}))throw Error(`clicking ${h.name} did not start its activation`);continue}
  const actor=c.actor!,me=s.ctx.state.units[actor]!
  const attack=me.actions.find(id=>id.startsWith('attack.')&&id!=='attack.punch')??'attack.punch'
  f=F()
  // an attack from a ghost: a reach hex from which the attack reaches an enemy
  const foe=()=>{P.input({kind:'slot',actionId:attack,unit:actor});const tg=F().targets;return tg.length?tg[0]!:null}
  let from:number|null=null,target:number|null=null
  if(f.reach.length){for(const h of f.reach){P.input({kind:'hex',hex:h});target=foe();if(target!==null){from=h;break}P.input({kind:'back'});P.input({kind:'back'})}}
  if(target===null&&!f.reach.length){target=foe()}
  if(target!==null){
   P.input({kind:'point',hex:target})
   P.input({kind:'hex',hex:target});P.input({kind:'back'});const backCleared=!F().aim?.locked
   P.input({kind:'hex',hex:target});const a=F().aim!
   const engineFromGhost=from!==null&&a.target!==null?previewFrom(s.ctx,{actor,actionId:f.slot!,destination:from,slot:'movement'},a.target,attack):null
   const before=s.ctx.events.length
   P.input({kind:'hex',hex:target})
   const ev=events(before),decl=ev.find(e=>e.type==='attack.declared'&&e.actor===actor)
   if(decl&&a.hit!==null&&a.dmg!==null){const hit=ev.find(e=>(e.type==='attack.hit'||e.type==='attack.miss')&&e.actor===actor),dmg=ev.find(e=>e.type==='damage.applied'&&e.target===a.target&&e['attackId']===attack)
    attacks.push({fromGhost:from!==null,target:a.target!,shown:{hit:a.hit,dmg:a.dmg,hpAfter:a.hpAfter,lethal:a.lethal},declared:{hitChance:decl['hitChance'] as number,damageOnHit:decl['damageOnHit'] as number},hit:hit?.type==='attack.hit',crit:!!hit?.['crit'],landed:dmg?{hpAfter:dmg['hpAfter'] as number}:null,backCleared,engineFromGhost:engineFromGhost?{hitChance:engineFromGhost.hitChance,damageOnHit:engineFromGhost.damageOnHit}:null})}
   continue
  }
  // no attack reaches: walk the ghost toward the nearest enemy and confirm, then end the activation
  P.input({kind:'back'})
  f=F()
  if(f.reach.length){const d=[...f.reach].sort((a,b)=>near(a)-near(b)||a-b)[0]!;P.input({kind:'hex',hex:d});P.input({kind:'hex',hex:d})}
  if(!s.ctx.state.outcome&&s.ctx.battleCursor?.at==='acting'&&s.ctx.battleCursor.actor===actor)endCycle()
 }
 return {encounter:config.encounterId,mapId:s.ctx.events.find(e=>e.type==='map.loaded')!['mapId'] as string,threat,selected,move,attacks,endActivations:hand}
}
if(import.meta.url===`file://${process.argv[1]}`||process.argv[1]?.endsWith('play-input-probe.mts'))process.stdout.write(JSON.stringify(probe()))
