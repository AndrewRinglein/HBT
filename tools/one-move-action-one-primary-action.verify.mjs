// rule.one-move-action-one-primary-action (engine item) — the host's half, on the BUILT battle screen. Ruled 2026-10-06
// (Andrew, engine DECISIONS.md 'an Activation is one move action and one primary action, in that order; a used-up power stays
// on the bar, greyed'): "All the player units get two actions: a move action and a primary action, in that order, every time
// they get activated. … That's fundamentally how this was built: there's a move action and a primary action."
//
// The item: "The bar and the kingdom's play input grey what the engine refuses - check on the built page that after a Leap the
// Move row is greyed and after a Move the special moves are greyed (already so by the walked rule)."
//
// On the page PLAY.html opens for battle 1 (BATTLE-SANDBOX.html?play=encounter.opening.orphanage&heroes=<hero>), a hero with a
// movement power of its own (at level 2 since engine rule.special-moves-unlock-at-level-two, 2026-10-06 - the note in open()) — the Iron Dwarf's Leap, then the Ranger's Side Roll (the item's two variants):
//   1. its Activation begins with nothing greyed;
//   2. the power is pressed on the bar and taken to a hex of its area: the Move row and every other movement are greyed, the
//      host names each as done, arming one offers nowhere to go, the ENGINE refuses the walk with its movement-slot reason
//      (asked of the engine in this page's own battle), a press on the greyed Move row moves nobody, and the primary action is
//      still the hero's. Where the hero has nothing left it can do, its Activation ends by itself (viewer.auto-end-no-actions)
//      — which is the same answer: before this item the walk was still open to it as its primary action;
//   3. the next Turn it walks ONE hex of its movement: the power is greyed and refused with the same reason, the rest of the
//      walk is still offered, and walked, it is the same move action — the engine's record of the hero's actions holds no
//      movement taken as the primary action (until this item the rest of a walk was the primary action).
// The rows greyed are compared with what the host names and what the engine refuses; the page adds none.
//
//   node tools/one-move-action-one-primary-action.verify.mjs [BATTLE-SANDBOX.html]
import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
import {bootSlice} from './atlas-dom.mjs'
import {board} from './lesson-play.mjs'
const esbuild=createRequire(import.meta.url)('../../engine/node_modules/esbuild')
const built=esbuild.buildSync({stdin:{contents:`export {saveSandbox,restoreSandbox,createSandbox} from './src/core/sandbox.ts';export {SANDBOX_HEROES} from './src/content/sandbox.ts';export {specialtiesOf} from './src/content/progress.ts';export {validateAction,executeAction} from '../engine/src/core/commands.ts';export {movementOptions} from '../engine/src/core/movement.ts'`,resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'esm',write:false,logLevel:'silent'})
const E=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'))
const page=process.argv[2]??'BATTLE-SANDBOX.html',ORPHANAGE='encounter.opening.orphanage'
const CLOSED={ok:false,reason:'movement-slot-closed'}
const say=(...a)=>console.log('  '+a.join(' '))
const has=(n,cls)=>n.className.split(/\s+/).includes(cls)

function open(hero){
 /* Law 10, 2026-10-06 — at the merge of this rule with rule.special-moves-unlock-at-level-two (engine item, ruled the same day; engine
    DECISIONS.md 'a hero's special moves unlock at level 2, ruled: all of them, every hero …': "the special moves that the starting
    heroes get should be unlocked instead at level 2"). The Orphanage's hero is level 1 and has the walk alone, and this page check is
    about a hero with a movement power of its own. So the page is opened as before and the SAME battle - the page's own map,
    encounter, enemies and seed - is put on it through the page's own import with the hero as a campaign row at level 2 (the first
    specialty of its class: the engine fields no level-2 hero without one). Both rulings stand; everything read of the bar, the host
    and the engine below is unchanged. The lines were:
      const {w}=bootSlice(page,{search:`?play=${ORPHANAGE}&heroes=${hero}`}),h=w.__sandbox,B=board({handle:h,w})
      const {V,ctx}=B */
 const {w,root}=bootSlice(page,{search:`?play=${ORPHANAGE}&heroes=${hero}`}),h=w.__sandbox,B=board({handle:h,w})
 const {V,ctx}=B
 {B.settle();const config=h.session.config;assert.deepEqual(config.heroes,[hero],'the page fields the one hero asked for')
  const row=structuredClone(E.SANDBOX_HEROES.find(x=>x.id===hero)),levelTwo={...row,level:2,specialty:E.specialtiesOf(row.classes[0])[0].id}
  w.document.getElementById('transferText').value=E.saveSandbox(E.createSandbox({...config,heroRows:[levelTwo]}))
  const imp=root.els.find(e=>e.dataset.act==='import');assert.ok(imp,"the page has its import");imp.handlers.click();B.settle()
  assert.deepEqual(h.session.config.heroRows?.map(r=>[r.id,r.level]),[[hero,2]],"the battle on the page fields the hero at level 2")}
 const me=()=>ctx().state.units.find(u=>u.typeId===hero)
 const chip=id=>V().dom.rail.querySelectorAll('.railchip').find(c=>+c.dataset.i===id)
 const mine=()=>{B.settle();if(B.actor()?.id!==me().id){chip(me().id).handlers.dblclick({stopPropagation(){}});B.settle()}assert.equal(B.actor()?.id,me().id,me().name+' is the one acting')}
 const rows=()=>V().dom.actionbar.querySelectorAll('.acRow').filter(r=>r.dataset.act)
 const isMove=id=>{const a=ctx().actions[id];return !!a.move&&!a.attack}
 const moves=()=>me().actions.filter(isMove)
 const greyed=()=>rows().filter(r=>has(r,'moveDone')).map(r=>r.dataset.act)
 const name=id=>ctx().actions[id]?.name??id,names=ids=>ids.map(name).join(', ')||'none'
 /** arm a move on the bar, as a click on its row does, and read how many hexes the engine offers for it */
 const offered=id=>{V().offerPlay({kind:'slot',actionId:id,unit:me().id});B.settle();const n=V().play.slot===id?V().play.reach.length:0;V().offerPlay({kind:'back'});B.settle();return n}
 /** the engine's own answer, in this page's own battle, to the hero taking `actionId` to a hex beside it */
 const engineSays=actionId=>{const c=E.restoreSandbox(E.saveSandbox(h.session)).ctx,u=c.state.units[me().id]
  const to=c.geo.neighboursOf(u.hex).find(x=>!c.state.units.some(o=>o.hex===x&&o.lifeState==='standing'));assert.ok(to!==undefined,'an open hex beside the hero')
  return E.validateAction(c,{actor:u.id,actionId,destination:to})}
 /** how many hexes the engine still offers the walk `basic` once the hero has walked to `x` — asked of the engine in a copy of this page's own battle */
 const restAfter=(basic,x)=>{const c=E.restoreSandbox(E.saveSandbox(h.session)).ctx,id=me().id;return E.executeAction(c,{actor:id,actionId:basic,destination:x}).ok&&c.state.units[id].hex===x?E.movementOptions(c,id,basic).length:0}
 /** what the engine recorded the hero spending since `seq`: each action and the slot it went in */
 const spentSince=seq=>ctx().events.filter(e=>e.seq>seq&&e.type==='action.spent'&&e.actor===me().id).map(e=>({actionId:e.actionId,slot:e.slot}))
 /** every Activation of this Hero Phase ended, the Turn ended, the next begun */
 const nextTurn=()=>{const t=ctx().state.turn
  for(let i=0;i<8&&B.actor()&&ctx().state.turn===t&&!ctx().state.outcome;i++){if(V().play.endTurn&&V().play.endTurn.yetToAct.length===0)break;B.endActivation()}
  if(ctx().state.turn===t&&!ctx().state.outcome){B.endTurn();B.settle('the next Turn')}}
 return {w,h,B,V,ctx,me,mine,rows,moves,greyed,name,names,offered,engineSays,restAfter,spentSince,nextTurn}
}

let barsRead=0,twoParts=0
function powerThenWalk(hero){
 const P=open(hero),{B,V,ctx}=P
 P.mine()
 const id=P.me().id,basic=B.basicMove(P.me()),others=P.moves().filter(a=>a!==basic)
 assert.ok(basic&&others.length>0,`${P.me().name} has its basic move and a movement power of its own (moves: ${P.names(P.moves())})`)
 const power=others[0],who=P.me().name
 // 1. the Activation begins: nothing greyed, nothing spent, both moves have somewhere to go
 assert.deepEqual([P.me().moveUsed,P.me().primaryUsed],[false,false],`${who}: nothing spent yet`)
 assert.deepEqual(P.greyed(),[],`${who}: begins with nothing greyed`);assert.deepEqual(V().play.moveDone,[],`${who}: the host names no move as done`)
 assert.ok(P.offered(basic)>0&&P.offered(power)>0,`${who}: ${P.name(basic)} and ${P.name(power)} each have somewhere to go`)
 // 2. the power, pressed on the bar and taken to a hex of its area
 B.press(power);B.settle();assert.equal(V().play.slot,power,`${who}: ${P.name(power)} is armed by its row`)
 const area=[...V().play.reach];assert.ok(area.length>0,`${who}: ${P.name(power)} draws its area`)
 const from=P.me().hex,dest=area[0],seq=ctx().state.seq
 B.hexBtn(dest).handlers.click({detail:1});B.settle();if(P.me().hex===from){B.hexBtn(dest).handlers.click({detail:1});B.settle()}
 assert.equal(P.me().hex,dest,`${who}: ${P.name(power)} took it to the hex clicked`)
 assert.deepEqual(P.spentSince(seq),[{actionId:power,slot:'movement'}],`${who}: the engine took ${P.name(power)} as the move action`)
 if(B.actor()?.id===id){
  barsRead++
  assert.deepEqual([P.me().moveUsed,P.me().primaryUsed],[true,false],`${who}: its move action is spent, its primary action is still its own`)
  assert.deepEqual(P.engineSays(basic),CLOSED,`${who}: the engine refuses the walk after ${P.name(power)} with its movement-slot reason`)
  assert.ok(V().play.moveDone.includes(basic),`${who}: the host names ${P.name(basic)} as done`);assert.ok(P.greyed().includes(basic),`${who}: the ${P.name(basic)} row is greyed`)
  assert.deepEqual([...V().play.moveDone].sort(),[...P.moves()].sort(),`${who}: the host names every movement as done`)
  assert.deepEqual([...P.greyed()].sort(),[...V().play.moveDone].filter(a=>P.rows().some(r=>r.dataset.act===a)).sort(),`${who}: the rows greyed are exactly the moves the host names`)
  for(const a of P.moves())assert.equal(P.offered(a),0,`${who}: ${P.name(a)} is greyed and the engine offers nowhere to go`)
  for(const r of P.rows())if(ctx().actions[r.dataset.act]?.attack)assert.ok(!has(r,'moveDone'),`${who}: ${P.name(r.dataset.act)} is not greyed as a move`)
  const s2=ctx().state.seq,at=P.me().hex
  B.press(basic);B.settle()
  assert.deepEqual([ctx().state.seq,P.me().hex],[s2,at],`${who}: a press on the greyed ${P.name(basic)} row moves nobody`);assert.notEqual(V().play.slot===basic&&V().play.reach.length>0,true,`${who}: and arms no walk`)
  say(`${who}: after ${P.name(power)} the engine refuses the walk (${CLOSED.reason}); greyed on the bar: ${P.names(P.greyed())}; its primary action is still its own`)
 }else{
  /* nothing left it could do: the Activation ended by itself. Before this item the walk was still open to it (as its primary action), so it did not */
  assert.notEqual(B.actor()?.id,id);assert.deepEqual(P.spentSince(seq).filter(s=>s.slot==='primary'),[],`${who}: nothing was taken as its primary action`)
  say(`${who}: after ${P.name(power)} it had nothing left to do and its Activation ended by itself — no walk was open to it`)
 }
 // 3. the next Turn: one hex of the walk, then the rest of it — the hex is one from which the engine still offers the rest
 P.nextTurn();assert.ok(!ctx().state.outcome,'the battle goes on');P.mine()
 assert.deepEqual(P.greyed(),[],`${who}: a new Activation begins with nothing greyed`)
 const seq3=ctx().state.seq,start=P.me().hex,budget=P.me().movePointsLeft
 B.press(basic);B.settle();assert.equal(V().play.slot,basic)
 const near=V().play.reach.filter(x=>ctx().geo.distance(start,x)===1).find(x=>P.restAfter(basic,x)>0)
 if(near===undefined){
  /* this hero's movement is spent by any one hex here (the ground's cost against what it has): nothing of a walk is left to finish */
  say(`${who}: with ${budget} movement no one-hex walk leaves a rest of the walk on this ground — the walk in two parts is the other hero's`)
  return who
 }
 B.walkTo(near)
 assert.equal(B.actor()?.id,id,`${who}: still its Activation after one hex`);assert.equal(P.me().hex,near)
 assert.equal(P.me().moveUsed,true);assert.ok(P.me().movePointsLeft>0&&P.me().movePointsLeft<budget,`${who}: it has movement left`)
 assert.deepEqual(P.engineSays(power),CLOSED,`${who}: the engine refuses ${P.name(power)} after a walk with its movement-slot reason`)
 assert.deepEqual([...P.greyed()].sort(),[...others].sort(),`${who}: every other movement is greyed, the walk is not`)
 const rest=P.offered(basic);assert.ok(rest>0,`${who}: the rest of the walk is still offered`)
 B.press(basic);B.settle();assert.equal(V().play.slot,basic,`${who}: the walk is armed again by its row`)
 const on=V().play.reach.find(x=>x!==start&&x!==near);assert.ok(on!==undefined,`${who}: a hex further on`)
 B.walkTo(on);assert.equal(P.me().hex,on,`${who}: it walked on`)
 const spent=P.spentSince(seq3)
 assert.deepEqual(spent.filter(s=>s.slot==='primary'),[],`${who}: no part of the walk was taken as its primary action (the engine's record: ${JSON.stringify(spent)})`)
 if(B.actor()?.id===id)assert.equal(P.me().primaryUsed,false,`${who}: its primary action is still its own after walking in two parts`)
 twoParts++
 say(`${who}: walked one hex — ${P.names(others)} greyed and refused (${CLOSED.reason}), the rest of the walk still offered (${rest} hexes); walked on, and the engine's record holds no movement as its primary action (${JSON.stringify(spent)})`)
 return who
}

const done=[powerThenWalk('hero.base.warrior-iron'),powerThenWalk('hero.base.ranger-ranger')]
assert.ok(barsRead>0,'at least one hero was still acting after its movement power, so the greyed Move row was read on the bar')
assert.ok(twoParts>0,'at least one hero walked in two parts')
console.log(`one-move-action-one-primary-action: on the built sandbox (${ORPHANAGE}), ${done.join(' and ')} each took a movement power and were then refused the walk, and ${twoParts} of them walked in two parts inside the one move action with every other movement greyed — passed`)
