// kingdom.attack-one-armed-after-move — ruled 2026-10-05 (Andrew, engine DECISIONS.md 'the battle screen must feel smooth: …;
// attack one is chosen after a move; …': "I do think after you move, we should auto-select your basic attack or your attack
// one. If you have a ranged weapon, it's still your attack one, so you don't have to select your attack to then start turning
// on the map. Basically, you're changing A from basic attack one if you want to do anything other than that first thing.").
//
// On the BUILT battle screen (the page PLAY.html opens: BATTLE-SANDBOX.html?play=encounter.opening.orphanage), played with the
// mouse and NEVER a click on the bar until the test says so: the Iron Dwarf walks toward the Zombie, Turn after Turn, until a
// walk of its own ends with the Zombie in reach — and then Chop is the row lit on the bar, the Zombie wears the target's mark,
// pointing at it shows the chance to hit and the damage at once, one click locks the aim and the second strikes. In another
// Activation, Heavy Chop clicked on the bar changes the choice, and a right-click takes it back. And a hero holding a bow: its
// first bow attack is the row lit after its walk, and the arrow, pointed far past its range, stops at its range.
//
//   node tools/attack-one-armed-after-move.verify.mjs [BATTLE-SANDBOX.html]
import assert from 'node:assert/strict'
import {bootSlice} from './atlas-dom.mjs'
import {board} from './lesson-play.mjs'
import {createRequire} from 'node:module'
/* the engine's own answer to how far an attack reaches from where its unit stands (core/forecast.ts actionReach: the row's range and whatever the unit's reach adds) */
const esbuild=createRequire(import.meta.url)('../../engine/node_modules/esbuild')
const built=esbuild.buildSync({stdin:{contents:`export {actionReach} from '../engine/src/core/forecast.ts'`,resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'esm',write:false,logLevel:'silent'})
const {actionReach}=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'))
const page=process.argv[2]??'BATTLE-SANDBOX.html',ORPHANAGE='encounter.opening.orphanage',DWARF='hero.base.warrior-iron',RANGER='hero.base.ranger-aggressive'
const say=(...a)=>console.log('  '+a.join(' '))
const has=(n,cls)=>n.className.split(/\s+/).includes(cls)

function open(hero){
 const {w}=bootSlice(page,{search:`?play=${ORPHANAGE}&heroes=${hero}`}),h=w.__sandbox,B=board({handle:h,w})
 const {V,ctx}=B
 const me=()=>ctx().state.units.find(u=>u.typeId===hero)
 const chip=id=>V().dom.rail.querySelectorAll('.railchip').find(c=>+c.dataset.i===id)
 const mine=()=>{B.settle();if(B.actor()?.id!==me().id){chip(me().id).handlers.dblclick({stopPropagation(){}});B.settle()}assert.equal(B.actor()?.id,me().id,me().name+' is the one acting')}
 const rows=()=>V().dom.actionbar.querySelectorAll('.acRow').filter(r=>r.dataset.act)
 const attacks=()=>rows().filter(r=>ctx().actions[r.dataset.act]?.attack).map(r=>r.dataset.act)
 const lit=()=>rows().filter(r=>has(r,'playChosen')).map(r=>r.dataset.act)
 const near=x=>Math.min(...B.enemies().map(u=>ctx().geo.distance(x,u.hex)))
 const rightClick=()=>{const wrap=B.stage().parentNode;wrap.handlers.pointerdown({button:2,clientX:5,clientY:5});wrap.handlers.pointerup({button:2,clientX:5,clientY:5});B.settle()}
 /** every Activation of this Hero Phase ended, the Turn ended, the next begun */
 const nextTurn=()=>{const t=ctx().state.turn
  for(let i=0;i<8&&B.actor()&&ctx().state.turn===t&&!ctx().state.outcome;i++){if(V().play.endTurn&&V().play.endTurn.yetToAct.length===0)break;B.endActivation()}
  if(ctx().state.turn===t&&!ctx().state.outcome){B.endTurn();B.settle('the next Turn')}}
 return {w,h,B,V,ctx,me,mine,attacks,lit,near,rightClick,nextTurn}
}

/* ── the Iron Dwarf ── */
{
 const P=open(DWARF),{B,V,ctx}=P
 let pressed=0;const press=id=>{pressed++;B.press(id);B.settle()}
 P.mine()
 const dwarf=P.me(),[chop,second]=P.attacks()
 assert.equal(ctx().actions[chop].name,'Chop','the Dwarf\'s attack one, the first attack on its bar');assert.ok(second,'and a second attack')
 /* its Activation begins with the basic move armed, no attack lit (ruled 2026-10-03) */
 assert.ok(ctx().actions[V().play.slot]?.move,'the basic move is armed');assert.ok(B.drawn('playReach').length>0)
 /* walk toward the Zombie until a walk of its own leaves it in reach */
 let zombie=null
 for(let t=0;t<12&&!zombie&&!ctx().state.outcome;t++){
  P.mine();const reach=B.drawn('playReach');assert.ok(reach.length>0,'the Dwarf has somewhere to walk')
  B.walkTo([...reach].sort((a,b)=>P.near(a)-P.near(b)||a-b)[0])
  if(B.actor()?.id===dwarf.id&&V().play.slot===chop&&V().play.targets.length)zombie=B.enemies().find(u=>V().play.targets.includes(u.hex))
  else{if(B.actor()?.id===dwarf.id)assert.equal(V().play.slot,chop,'after its walk Chop is chosen, in reach or not');P.nextTurn()}
 }
 assert.ok(zombie,'a walk of the Dwarf\'s ended with the Zombie in reach');assert.equal(pressed,0,'and the bar was never clicked')
 /* Chop is the row lit; no move is armed beside it; the Zombie wears the target's mark */
 assert.deepEqual(P.lit(),[chop],'Chop is the one row lit on the bar');assert.equal(V().play.note,null,'nothing is said about it')
 assert.deepEqual(B.drawn('playReach'),[],'no movement area: the move is done and the attack is armed')
 assert.ok(B.drawn('playTargetUnit').includes(zombie.hex),'the Zombie is marked as a target')
 /* pointing at it: the chance to hit and the damage at once */
 B.figure(zombie.id).handlers.pointerenter({});B.settle()
 assert.ok(V().play.aim&&V().play.aim.target===zombie.id&&V().play.aim.locked===false,'pointing aims at it')
 assert.ok(B.stage().querySelector('.playHit')&&B.stage().querySelector('.playDmg'),'the chance to hit and the damage are on the screen')
 const declared=()=>ctx().events.filter(e=>e.type==='attack.declared'&&e.actor===dwarf.id&&!e.free),before=declared().length
 const forecast=`${V().play.aim.hit}% to hit, ${V().play.aim.dmg} damage`
 B.figure(zombie.id).handlers.click({detail:1});B.settle();assert.equal(declared().length,before,'the first click locks the aim; nothing is struck yet');assert.equal(V().play.aim?.locked,true)
 B.figure(zombie.id).handlers.click({detail:1});B.until(()=>!P.h.busy,'the attack plays')
 assert.equal(declared().length,before+1,'the second click strikes');assert.equal(declared().at(-1).attackId,chop);assert.equal(declared().at(-1).target,zombie.id)
 say(`1 the Iron Dwarf walked beside ${zombie.name} (Turn ${ctx().state.turn}): Chop lit on the bar with no click on it, the Zombie marked; pointed at — ${forecast}; two clicks struck it with Chop`)
 /* another Activation: a click on another row changes the choice; a right-click takes it back */
 let changed=false
 for(let t=0;t<6&&!changed&&!ctx().state.outcome;t++){
  P.nextTurn();if(ctx().state.outcome||P.me().lifeState!=='standing')break
  P.mine();const reach=B.drawn('playReach');if(!reach.length)continue
  B.walkTo(reach[0]);if(B.actor()?.id!==dwarf.id)continue
  assert.deepEqual(P.lit(),[chop],'after this Activation\'s walk too');press(second)
  assert.deepEqual(P.lit(),[second],`${ctx().actions[second].name} clicked: it is the row lit instead`)
  P.rightClick();assert.ok(!P.lit().some(a=>ctx().actions[a]?.attack),'a right-click takes the attack back: none is lit')
  changed=true
 }
 assert.ok(changed,'another Activation was played')
 say(`2 in a later Activation: Chop lit after the walk; ${ctx().actions[second].name} clicked on the bar took its place; a right-click cleared it`)
}

/* ── a hero holding a bow ── */
{
 const P=open(RANGER),{B,V,ctx}=P
 P.mine()
 const ranger=P.me(),[shot]=P.attacks(),row=ctx().actions[shot]
 assert.equal(row.attack.kind,'ranged','its attack one is the bow\'s: '+row.name)
 /* a unit with nothing left to do after its walk has its Activation ended by itself (viewer.auto-end-no-actions), so the walk
    looked at is one that ends with an enemy inside the bow's range: toward the Zombie, Turn after Turn, until one does */
 let stood=false
 for(let t=0;t<12&&!stood&&!ctx().state.outcome;t++){
  P.mine();const reach=B.drawn('playReach');assert.ok(reach.length>0,'the hero has somewhere to walk')
  B.walkTo([...reach].sort((a,b)=>P.near(a)-P.near(b)||a-b)[0])
  if(B.actor()?.id===ranger.id)stood=true;else P.nextTurn()
 }
 assert.ok(stood,'a walk of the hero\'s ended with something left to do');assert.ok(V().play.targets.length>0,'an enemy is inside the bow\'s range')
 assert.deepEqual(P.lit(),[shot],`${row.name} is the row lit after its walk, with no click on the bar`)
 /* the arrow, pointed far past the bow's range, stops at its range */
 const g=ctx().geo,here=P.me().hex,far=[...Array(g.hexCount).keys()].sort((a,b)=>g.distance(here,b)-g.distance(here,a))[0]
 const range=actionReach(ctx(),ranger.id,shot,here);assert.ok(Number.isInteger(range)&&range>=row.range,'the reach the engine gives it from here: '+range)
 assert.ok(g.distance(here,far)>range,'a hex farther than the bow reaches')
 B.hexBtn(far).handlers.pointerenter({});B.settle()
 const aim=V().play.aim;assert.ok(aim,'the arrow is drawn');assert.equal(aim.from,here);assert.equal(g.distance(here,aim.to),range,'out to its reach, and no farther')
 assert.ok(B.stage().querySelector('svg')||V().layers.play,'the play layer draws it')
 say(`3 a hero holding a bow (${ranger.name}): ${row.name} lit after its walk; the arrow, pointed ${g.distance(here,far)} hexes away, stops at its reach of ${range} (the row's range ${row.range})`)
}
console.log('attack-one-armed-after-move: on the built sandbox, the Iron Dwarf\'s walk beside a Zombie left Chop chosen with no click on the bar — the Zombie marked, the forecast on pointing, two clicks to strike; another row clicked changed the choice and a right-click took it back; a hero with a bow had its first bow attack chosen after its walk, its arrow out to its range — passed')
