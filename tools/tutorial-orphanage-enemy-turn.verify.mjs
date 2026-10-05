// kingdom.tutorial-orphanage-enemy-turn — ruled 2026-10-04 (Andrew, engine/DECISIONS.md 'the opening's tutorial: …, the Orphanage's
// lessons, …'): "At some point we need to explain attacks when you're in range." / "The first time we have an enemy turn, we need to
// point at the enemy and pop up a golden notification that says, \"This is the enemy movement and this is their most common attack
// value.\" There are two arrows pointing at the two base enemy numbers." / "\"Click on enemies to learn more about them.\"" / "It
// points to the right and says you can see all the details about this enemy on the right." / "At the end of the enemy phase,
// reinforcements and battle changes can occur. That notification should pop up before we start showing the extra zombie added."
// Expect: "… A page test asserts each notice's words, the two pointers' targets, that the Zombie does not act while (b) is up, that
// the arrival's drop-in comes after (d) has gone, and that a replayed battle shows none of them."
//
// The BUILT sandbox, a new run, the Orphanage played with the mouse (tools/lesson-play.mjs): Turn 1 through its first lesson,
// every unit's Activation ended, the first Enemy Phase watched line by line; in Turn 2 an enemy clicked, then a path planned
// toward the nearest enemy until one is in reach of an attack, and the attack made.
//
//   node tools/tutorial-orphanage-enemy-turn.verify.mjs [BATTLE-SANDBOX.html]
import assert from 'node:assert/strict'
import {newRun,board,rowOf,lessonReveal} from './lesson-play.mjs'
const page=process.argv[2]??'BATTLE-SANDBOX.html',RUN_SEED=Number(process.env.TUTORIAL_SEED??11)
const say=(...a)=>console.log('  '+a.join(' '))
const ATTACK=rowOf('lesson.orphanage.attack'),NUMBERS=rowOf('lesson.orphanage.enemy-numbers'),PANEL=rowOf('lesson.orphanage.enemy-panel'),PHASES=rowOf('lesson.orphanage.phases')
const MINE=[ATTACK,NUMBERS,PANEL,PHASES].map(r=>r.id)

let B=newRun(page,RUN_SEED),{h,w,V,ctx,O,lines,ptrs,flush,until}=B
/* Turn 1: the first lesson, then every Activation ended — none of this item's rows has a reason to show yet */
B.firstMove()
assert.equal(ctx().state.turn,1)
const endAll=()=>{for(let i=0;i<8&&B.actor()&&ctx().state.turn===turn0;i++){const last=V().play.endTurn&&V().play.endTurn.yetToAct.length===0;if(last)return true;B.endActivation()}return false}
let turn0=ctx().state.turn
assert.ok(endAll(),'Turn 1: the last unit of the Hero Phase is acting')
for(const id of MINE)assert.ok(!B.P.camp().revealed.includes(lessonReveal(id)),'not yet shown: '+id)
const zombie=B.enemies()[0],unitsShown=()=>Object.keys(h.viewer.state.U).length,shown0=unitsShown()
const played=type=>V().EV.slice(0,V().cursor).filter(e=>e.type===type)
V().dom.root.querySelector('#playEndAct').handlers.click({})

/* (b) as the first Enemy Phase begins, before the Zombie acts */
until(()=>h.lesson===NUMBERS.id,'the two-numbers row goes up as the Enemy Phase begins')
assert.deepEqual(lines(),['This is the enemy movement and this is their most common attack value.','Click on enemies to learn more about them.']);assert.deepEqual(lines(),[...NUMBERS.words])
assert.deepEqual(ptrs().map(p=>p.target),[`unit:${zombie.id}:move`,`unit:${zombie.id}:attack`],'an arrow on each of the Zombie\'s two numbers')
{const E=V().layers.UEL.get(zombie.id);assert.equal(ptrs()[0].el,E.mv,'one on its movement number');assert.equal(ptrs()[1].el,E.dg,'one on its attack number')}
assert.equal(O().looking?.hex,h.viewer.state.U[zombie.id].hex,'the view is on the Zombie, where the board shows it')
const at=V().cursor;assert.equal(V().EV[at-1].type,'phase.begin');assert.equal(V().EV[at-1].phase,'enemy','the line just played is the Enemy Phase\'s beginning')
assert.equal(played('activation.begin').filter(e=>e.phase==='enemy').length,0,'the Zombie has not acted')
assert.equal(O().notice.hold,true,'the notice holds the battle');const msB=O().notice.ms
flush(msB-400);assert.equal(V().cursor,at,'the Enemy Phase waits for the notice\'s time: nothing was played on under it');assert.equal(h.busy,true);assert.equal(h.lesson,NUMBERS.id)
until(()=>h.lesson!==NUMBERS.id,'the notice goes by itself');assert.equal(ptrs().length,0);until(()=>V().cursor>at,'and then the Enemy Phase plays')
say(`b the Enemy Phase begins: the view on ${zombie.name}, an arrow on its movement and one on its attack number, "${NUMBERS.words[0]}" / "${NUMBERS.words[1]}" — held ${msB} ms, the Zombie still`)

/* (d) the Enemy Phase over, before the Turn 2 Zombie is shown */
until(()=>h.lesson===PHASES.id,'the phases row goes up when the Enemy Phase has ended')
assert.deepEqual(lines(),[...PHASES.words]);assert.equal(lines()[1],'At the end of the enemy phase, reinforcements and battle changes can occur.');assert.match(lines()[0],/Hero Phase.*Enemy Phase/)
const atD=V().cursor;assert.equal(V().EV[atD-1].type,'turn.end','the line just played is the Turn\'s end')
assert.equal(unitsShown(),shown0,'the Turn 2 Zombie is not on the board yet');assert.equal(played('encounter.wave').length,0);assert.equal((V().arrivalsShown??[]).length,0,'and no arrival has dropped in')
const msD=O().notice.ms;flush(msD-400);assert.equal(V().cursor,atD,'the arrival waits under the notice');assert.equal(unitsShown(),shown0)
until(()=>h.lesson!==PHASES.id,'the notice goes by itself')
until(()=>unitsShown()>shown0,'only then does the Turn 2 Zombie come onto the board');until(()=>(V().arrivalsShown??[]).length>=1,'and the arrivals camera shows it drop in')
B.settle('Turn 2 begins');assert.equal(ctx().state.turn,2)
say(`d the Enemy Phase over: "${PHASES.words[1]}" — held ${msD} ms; only when it had gone did the Turn 2 Zombie drop in`)

/* (c) the first click on an enemy */
assert.equal(h.lesson,null);B.figure(zombie.id).handlers.click({detail:1})
assert.equal(h.lesson,PANEL.id,'the panel row goes up on the click');assert.deepEqual(lines(),['You can see all the details about this enemy on the right.'])
assert.deepEqual(ptrs().map(p=>p.target),['ui:panel']);assert.equal(ptrs()[0].el,V().dom.panel,'the arrow is at the right-hand panel');assert.equal(ptrs()[0].side,'left','and points right')
const msC=O().notice.ms;flush(msC+300);assert.equal(h.lesson,null,'it goes by itself');assert.equal(ptrs().length,0)
B.figure(zombie.id).handlers.click({detail:1});assert.equal(h.lesson,null,'a second click on an enemy: not again')
say(`c the first click on an enemy: "${PANEL.words[0]}" with an arrow at the panel, ${msC} ms`)

/* (a) the first time an enemy is in reach of one of the hero's attacks: a path is planned toward the nearest enemy each Turn
   until the engine lists an attack from its end */
let attack=null
for(let t=0;t<6&&!attack&&!ctx().state.outcome;t++){
 const me=B.actor();assert.ok(me&&B.party().includes(me.uid),'the hero is acting')
 const reach=B.drawn('playReach'),near=x=>Math.min(...B.enemies().map(u=>ctx().geo.distance(x,u.hex)))
 if(h.lesson!==ATTACK.id&&reach.length){const dest=[...reach].sort((a,b)=>near(a)-near(b)||a-b)[0];B.hexBtn(dest).handlers.click({detail:1})}
 if(h.lesson===ATTACK.id){attack=ptrs().find(p=>/^action:/.test(p.target)).target.slice(7);break}
 turn0=ctx().state.turn;B.endTurn();B.settle('the next Turn');assert.notEqual(ctx().state.turn,turn0)
}
assert.ok(attack,'an enemy came into reach of the hero\'s attack')
/* Law 10, 2026-10-05 — kingdom.attack-one-armed-after-move (engine DECISIONS.md 2026-10-05 'the battle screen must feel smooth: …; attack one
   is chosen after a move; …'): the words were ['An enemy is in range.','Choose an attack, then click the enemy to see your chance to hit and the
   damage.','Click it again to attack.'] — after a move the first attack is chosen for the player now, and the lesson says so. */
assert.deepEqual(lines(),['An enemy is in range.','After you move, your first attack is chosen for you: click the enemy to see your chance to hit and the damage.','Click it again to attack. To use another attack, click it on the bar first.']);assert.deepEqual(lines(),[...ATTACK.words])
assert.ok(ctx().actions[attack].attack,'the arrow is on an attack\'s slot: '+attack);assert.equal(ptrs().find(p=>p.target==='action:'+attack).el,B.barRow(attack),'that slot on the bar')
const hero=B.actor(),declared=()=>ctx().events.filter(e=>e.type==='attack.declared'&&e.actor===hero.id&&!e.free).length,before=declared()
flush(O().notice.ms+300);assert.equal(lines(),null,'the words go after their time');assert.equal(h.lesson,ATTACK.id,'the arrow stays until the attack is made')
B.press(attack)
/* Law 10, viewer.no-target-ring (2026-10-04; engine DECISIONS.md 2026-10-04 'after the backlog run: the yellow target ring goes;
   ...'): whom the chosen attack can hit is read off the mark each such unit wears on itself (`playTargetUnit`, which carries its
   unit's hex) - the yellow ring on the target's hex is gone. Was: const targets=B.drawn('playTarget');assert.ok(targets.length>0,'the attack chosen: the enemy in reach is lit') */
const targets=B.drawn('playTargetUnit');assert.ok(targets.length>0,'the attack chosen: the enemy in reach is marked')
const foe=B.enemies().find(u=>u.hex===targets[0]);B.figure(foe.id).handlers.pointerenter({})
assert.ok(B.stage().querySelector('.playHit')&&B.stage().querySelector('.playDmg'),'pointing at the enemy shows the chance to hit and the damage, as the words say')
B.figure(foe.id).handlers.click({detail:1});assert.equal(declared(),before,'one click shows the forecast; the attack is not made yet');assert.equal(h.lesson,ATTACK.id)
B.figure(foe.id).handlers.click({detail:1});until(()=>!h.busy,'the attack plays')
assert.equal(declared(),before+1,'the second click made the attack');assert.ok(!h.lesson||h.lesson!==ATTACK.id,'the attack made, the row is over');assert.ok(!ptrs().some(p=>/^action:/.test(p.target)),'its arrow is gone')
say(`a Turn ${ctx().state.turn}: an enemy in reach — "${ATTACK.words[0]}" with an arrow on ${ctx().actions[attack].name}'s slot until the hero attacked ${foe.name}`)

/* once in a run: the four rows are remembered … */
for(const id of MINE)assert.ok(B.P.camp().revealed.includes(lessonReveal(id)),'the run remembers '+id)
/* … and a replayed battle shows none of them */
const first=B.first,browser=B.browser
B.P.fightOut(false,'battle 1 lost');B.P.straightIn([first],'battle 1 again');B=board(B.P);({h,w,V,ctx,O,lines,ptrs,flush,until}=B)
until(()=>!h.busy&&ctx().battleCursor?.at==='acting','the replayed battle begins at once')
const gold=[]
const watch=ms=>{for(let t=0;t<ms;t+=20){w._flush(20);const l=lines();if(l&&!gold.some(g=>g[0]===l[0]))gold.push(l)}}
B.figure(B.enemies()[0].id).handlers.click({detail:1});watch(400)
turn0=ctx().state.turn;B.endTurn();watch(30000);B.settle('the replayed battle\'s Turn 2')
assert.equal(ctx().state.turn,turn0+1);assert.equal(h.lesson,null)
const words=new Set(MINE.flatMap(id=>rowOf(id).words))
assert.deepEqual(gold.filter(l=>l.some(x=>words.has(x))),[],'the replayed battle shows none of the four')
say('replayed after a loss: an enemy clicked, a whole Enemy Phase played — none of the four lessons')
console.log('tutorial-orphanage-enemy-turn: attacks in reach, the enemy\'s two numbers, the panel and the phases, each at its moment, on the built sandbox — passed')
