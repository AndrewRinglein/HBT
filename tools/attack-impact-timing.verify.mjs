// viewer.attack-impact-timing (engine DECISIONS.md 2026-10-03 'an attack's timing: the projectile leaves at the release, the target
// reacts at the blow …' and 'a death is tied to the strike'; Andrew: "the recoil from being hit should be connected to the
// timing of the attack. What happens is the attack plays, maybe a third of a second later, the reaction plays, and the
// reaction should just be a little bit delayed behind the attack."). On the BUILT sandbox
// (BATTLE-SANDBOX.html?play=encounter.opening.orphanage) the heroes stand idle and the page's own End Turn plays each Enemy
// Phase by the board's own clock. This page has no 3D scene (no browser), so a WATCHER stands where the cast would: it
// answers each attack's motion and moment from the page's own pack (the built sandbox's — the moments authored beside the
// bindings) and notes, on the board's clock, when the board tells it to strike, to react, to fall, to raise a shield. Held:
// the page carries the moments; a Zombie's blow starts the hero's reaction at the claw's blow moment, within the attack's
// own motion; a hero the log goes on to say died starts its death at that blow; and after every phase the board is the
// engine's own battle. (The bodies and the projectiles themselves are ../viewer/tools/attack-impact-timing.test.mjs's.)
// Prints one line per check and `attack-impact-timing: … passed`.
import assert from 'node:assert/strict'
import {bootSlice} from './atlas-dom.mjs'
const {w}=bootSlice(process.argv[2]??'BATTLE-SANDBOX.html',{search:'?play=encounter.opening.orphanage'}),h=w.__sandbox
const V=()=>h.viewer._V,ctx=()=>h.session.ctx,$=id=>V().dom.root.querySelector('#'+id)
const say=(...a)=>console.log('  '+a.join(' '))
const settle=()=>{for(let i=0;i<60000&&(h.busy||i<3);i++)w._flush(16);assert.equal(h.busy,false,'the board settles');assert.equal(h.fault,'','no fault')}
function endTurn(){
 const end=$('playEndTurn');assert.ok(end&&end.getAttribute('aria-disabled')==='false','End Turn may be given')
 end.handlers.click({});const ask=$('playAsk'),yes=$('playAskYes');if(yes&&ask&&ask.style.display!=='none')yes.handlers.click({})
 settle()
}
function sameAsEngine(when){
 const S=V().S,units=ctx().state.units
 assert.equal(Object.keys(S.U).length,units.length,when+': the same units')
 for(const u of units){const b=S.U[u.id];assert.ok(b,when+': '+u.name+' is on the board')
  assert.equal(b.hex,u.hex,`${when}: ${u.name} stands on the engine's hex`);assert.equal(b.hp,u.hp,`${when}: ${u.name}'s Health`);assert.equal(b.life,u.lifeState,`${when}: ${u.name}'s life`)}
 const mine=h.viewer.events,theirs=ctx().events
 assert.equal(mine.length,theirs.length,when+': the board holds the engine\'s whole log');assert.equal(h.viewer.cursor,theirs.length,when+': and has shown all of it')
 for(let i=0;i<theirs.length;i++)if(mine[i].seq!==theirs[i].seq||mine[i].type!==theirs[i].type)assert.fail(`${when}: line ${i} of the board's log is not the engine's`)
}
settle();sameAsEngine('the battle opens')

// 1. the page carries the moments: per clip, authored — the Zombie's claw, the bow's release, the heroes' swing
const pack=V().data.models;assert.ok(pack,'the sandbox carries the character models')
const lookOf=id=>{const u=V().S.U[id],b=pack[u.typeId];return b.looks[((id%b.looks.length)+b.looks.length)%b.looks.length]}
const zombieLook=pack['unit.zombie'].looks[0],bow=Object.values(pack).flatMap(b=>b.looks).find(l=>l.moments?.ranged?.clip==='archery-crouch-shot-mid')
assert.equal(zombieLook.moments.attack.source,'authored');assert.ok(zombieLook.moments.attack.at>0&&zombieLook.moments.attack.at<zombieLook.moments.attack.of)
assert.ok(bow,'a body holds the bow');assert.equal(bow.moments.ranged.source,'authored');assert.ok(bow.moments.ranged.at>bow.moments.ranged.of/2,'the bow lets go late in its shot: after the draw')
let withMoment=0;for(const b of Object.values(pack))for(const l of b.looks)for(const m of ['attack','ranged']){if(!l.motions[m])continue;assert.ok(l.moments?.[m]?.at>0,`${b.typeId} ${m}: its moment`);withMoment++}
say(`1 the sandbox's pack carries a moment for each of its ${withMoment} attack and shot motions — the Zombie's claw lands at ${zombieLook.moments.attack.at} s of ${zombieLook.moments.attack.of.toFixed(2)} s, the bow lets go at ${bow.moments.ranged.at} s of ${bow.moments.ranged.of} s`)

// 2. the watcher, where the cast would stand
const calls=[]
const note=(k,more)=>{calls.push({k,clock:V().clock(),shown:h.viewer.cursor,...more});return true}
V().cast={
 shows:()=>false,pending:()=>false,heightPx:()=>null,body:()=>null,size:0,frame(){},snap(){},settle:()=>Promise.resolve(),aims:()=>[],dispose(){},
 moment(id,kind){const l=lookOf(id),motion=kind==='ranged'&&l.motions.ranged?'ranged':'attack';return {motion,...l.moments[motion]}},
 face:(a,t)=>note('face',{a,t}),strike:(a,t,kind)=>note('strike',{a,t,kind}),
 flinch:id=>V().S.U[id].life==='standing'&&note('flinch',{id,hp:V().S.U[id].hp}),fall:id=>V().S.U[id].life==='standing'&&note('fall',{id,life:V().S.U[id].life,hp:V().S.U[id].hp}),guard:id=>note('guard',{id}),
}
let hits=0,misses=0,kills=0,seenFrom=V().impact.log.length
for(let n=0;n<8&&!ctx().state.outcome&&(hits<2||misses<1);n++){
 const turn=ctx().state.turn,from=ctx().events.length,c0=calls.length
 endTurn();sameAsEngine('after Turn '+turn+'\'s Enemy Phase')
 const EV=ctx().events,recs=V().impact.log.slice(seenFrom);seenFrom=V().impact.log.length
 const declared=[];for(let i=from;i<EV.length;i++)if(EV[i].type==='attack.declared')declared.push(i)
 assert.deepEqual(recs.map(r=>r.declared),declared,`Turn ${turn}: every attack of the phase was timed, in the log's order`)
 for(const r of recs){
  const e=EV[r.declared],mo=lookOf(e.actor).moments[r.motion];assert.equal(r.moment,mo.at,'the moment is the clip\'s own');assert.equal(r.clip,mo.clip);assert.equal(r.source,mo.source)
  assert.equal(EV[r.outcome].type,r.result==='hit'?'attack.hit':r.result==='miss'?'attack.miss':'block.rolled','the outcome line is the engine\'s')
  /* (the Enemy Phase is shown by type, so the board's count of lines shown is not the log's index inside a run: the calls are
     matched by the board's clock) */
  const mine=calls.slice(c0),strike=mine.find(c=>c.k==='strike'&&c.a===e.actor&&c.t===e.target&&Math.abs(c.clock-r.motionAt)<1)
  assert.ok(strike,'the board told the attacker to strike when the record says its motion began')
  const face=mine.findLast(c=>c.k==='face'&&c.a===e.actor&&c.t===e.target&&c.clock<=strike.clock)
  assert.ok(face,'at the declaration the two turned to each other');assert.ok(strike.clock-face.clock>=100,`the strike began after the declaration's own beat (${Math.round(strike.clock-face.clock)} of the board's ms), held for the outcome line`)
  /* the blow: the clip's moment after the strike began (one clip second is 750 of the board's clock) */
  const lead=(r.blowAt-strike.clock)/750;assert.ok(Math.abs(lead-mo.at)<.04,`the blow came ${lead.toFixed(3)} s into the motion; its moment is ${mo.at} s`)
  if(r.result==='hit'){
   const react=mine.find(c=>(c.k==='flinch'||c.k==='fall')&&c.id===e.target&&c.clock>=strike.clock)
   assert.ok(react,'the target reacted');assert.ok(Math.abs((react.clock-strike.clock)/750-mo.at)<.04,`the reaction began ${((react.clock-strike.clock)/750).toFixed(3)} s into the attack's motion (the blow: ${mo.at} s) — within the motion (${mo.of.toFixed(2)} s), not after it`)
   const dmg=EV.slice(r.outcome).find(x=>x.type==='damage.applied'&&x.target===e.target&&x.attackId===e.attackId);assert.ok(react.hp>dmg.hpAfter,'the damage\'s own line is still to come: the body reacts at the blow, the number follows')
   const dies=EV.slice(r.outcome).findIndex(x=>x.type==='activation.end'||x.type==='attack.declared'&&x!==e||((x.type==='life.dead'||x.type==='life.downed')&&x.target===e.target))
   const fell=dies>=0&&/^life\./.test(EV[r.outcome+dies].type)
   assert.equal(react.k,fell?'fall':'flinch',fell?'the log goes on to say it fell: its death starts at the blow':'a hit reaction');if(fell){kills++;assert.equal(react.life,'standing','before the log\'s own line says so')}
   assert.equal(mine.filter(c=>(c.k==='flinch'||c.k==='fall')&&c.id===e.target&&c.clock>=strike.clock&&c.clock<strike.clock+1500).length,1,'it reacts once: the damage line does not start it again')
   hits++
  }else{misses++;assert.ok(!mine.some(c=>(c.k==='flinch'||c.k==='fall')&&c.id===e.target&&c.clock>=strike.clock&&c.clock<r.blowAt+300),'a miss or a block: no hit reaction')}
 }
 say(`Turn ${turn}: ${recs.length?recs.map(r=>`${ctx().state.units[r.actor].name} -> ${ctx().state.units[r.target].name} ${r.result}${r.falls?' ('+r.falls+')':''}: blow ${((r.blowAt-r.motionAt)/750).toFixed(2)} s into the ${r.clip} motion`).join('; '):'no attack'}; the board is the engine's battle`)
}
assert.ok(hits>=1,'a Zombie hit a hero in the phases played');assert.ok(hits+misses>=2,'more than one attack was timed')
console.log(`attack-impact-timing: ${hits} hits (${kills} that felled) and ${misses} misses or blocks timed to the claw's blow on the built sandbox, the board the engine's battle after every phase — passed`)
