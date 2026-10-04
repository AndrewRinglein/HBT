// kingdom.tutorial-orphanage-civilians-and-ending — ruled 2026-10-04 (Andrew, engine/DECISIONS.md 'the opening's tutorial: …, the
// Orphanage's lessons, …'; the extra steps (a) and (c)): "Civilians are yours to move: \"Move the civilians away from danger.\"" —
// "we should do A right away."; "A hero's turn ends after its primary action, and what End Turn does." — "Okay, we need to do C."
// Expect: "… the first civilian to be activated shows 'The civilians are yours to move. Move them away from danger.' with an arrow
// on it; the hero's first primary action is followed by the line that a primary action ends the Activation; in Turn 2 an arrow
// sits on End Turn with its line. A page test asserts each notice's words, target and trigger, that (c2) does not show in Turn 1,
// and that a replayed battle shows none of them."
//
// Law 10, 2026-10-04 (kingdom.tutorial-turns-in-battle-one; engine/DECISIONS.md 2026-10-04 "after the backlog run: …; battle 2's
// lessons" — Andrew: "Five taking turns was present in battle 1, but camera controls should stay."): the civilians' row (a) carries
// the taking-turns lesson that battle 2 showed — one lesson, not two (kingdom SWITCHES.md lessonTurnsRow). (a) below held two
// lines, ["The civilians are yours to move.", "Move them away from danger."], and one arrow, on the civilian acting; as the rule
// it holds the row's three lines — those words on one line, then the two taking-turns lines — that more than one of the
// player's units is left to activate when it goes up, and a second arrow on the card of each unit that waits. (c1), (c2) and
// the replay are untouched.
//
// The BUILT sandbox, a new run, the Orphanage played with the mouse (tools/lesson-play.mjs): Turn 1's Activations ended one by
// one; then, each Turn, the hero plans a path toward the nearest enemy and attacks when the engine lists an attack from its
// end — the first primary action of the battle — and the board is read when it is next still.
//
//   node tools/tutorial-orphanage-civilians-and-ending.verify.mjs [BATTLE-SANDBOX.html]
import assert from 'node:assert/strict'
import {newRun,board,rowOf,lessonReveal} from './lesson-play.mjs'
const page=process.argv[2]??'BATTLE-SANDBOX.html',RUN_SEED=Number(process.env.TUTORIAL_SEED??11)
const say=(...a)=>console.log('  '+a.join(' '))
const YOURS=rowOf('lesson.orphanage.civilians-yours'),PRIMARY=rowOf('lesson.orphanage.primary-ends'),END_TURN=rowOf('lesson.orphanage.end-turn')
const MINE=[YOURS,PRIMARY,END_TURN].map(r=>r.id)

let B=newRun(page,RUN_SEED),{h,w,V,ctx,O,lines,ptrs,flush,until}=B
const shownYet=id=>B.P.camp().revealed.includes(lessonReveal(id))
B.firstMove();assert.equal(ctx().state.turn,1)
for(const id of MINE)assert.ok(!shownYet(id),'not shown during the hero\'s first move: '+id)

/* (a) right away: the first civilian's Activation begins once the hero's is over */
B.endActivation()
const civ=B.actor();assert.ok(civ&&civ.side==='hero'&&!B.party().includes(civ.uid),'a civilian is activated')
assert.equal(h.lesson,YOURS.id,'the civilians\' row goes up as the first civilian is activated')
/* Law 10, 2026-10-04 (kingdom.tutorial-turns-in-battle-one): was two lines and the one arrow on the civilian — see the note above */
assert.deepEqual(lines(),['The civilians are yours to move. Move them away from danger.','Your units act one at a time: finish one Activation before the next begins.','Double-click another unit to switch to it, while the one acting has done nothing.']);assert.deepEqual(lines(),[...YOURS.words])
const waits=[...V().play.endTurn.yetToAct].sort((a,b)=>a-b);assert.ok(waits.length>=1&&!waits.includes(civ.id),'more than one of the player\'s units is left to activate: another has yet to act')
assert.deepEqual(ptrs().map(p=>p.target),['unit:'+civ.id,...waits.map(id=>'card:'+id)],'an arrow on that civilian, and one on the card of each unit that waits');assert.equal(ctx().state.turn,1,'in Turn 1')
flush(60);for(const [i,id] of waits.entries())assert.equal(ptrs()[i+1].el,V().dom.rail.querySelectorAll('.railchip').find(c=>+c.dataset.i===id),'on that unit\'s card in the top bar')
assert.ok(!waits.some(id=>B.party().includes(ctx().state.units[id].uid)),'the hero has acted: it is the other civilian that waits')
assert.ok(B.drawn('playReach').length>0,'and it is the player\'s to move: its blue grid is up')
const msA=O().notice.ms;flush(msA+300);assert.equal(h.lesson,null,'the notice goes by itself');assert.equal(ptrs().length,0)
say(`a Turn 1, ${civ.name} activated, ${waits.length} more yet to act: "${YOURS.words.join('" / "')}" with an arrow on it and one on each waiting unit's card, ${msA} ms`)

/* Turn 1 ends with nobody having used a primary action: neither ending line has shown — (c2) never shows in Turn 1 */
B.endActivation();assert.equal(h.lesson,null,'the second civilian: not again')
assert.equal(ctx().state.turn,1);assert.ok(!shownYet(END_TURN.id),'End Turn\'s line does not show in Turn 1, though one unit has acted and another has not')
B.endActivation();B.settle('Turn 2');assert.equal(ctx().state.turn,2)
assert.ok(!shownYet(PRIMARY.id)&&!shownYet(END_TURN.id),'Turn 2 begins: nobody has acted in it, no primary action has been used')

/* (c1) the hero's first primary action: a path planned toward the nearest enemy each Turn until an attack is listed from its end */
let attacked=false
for(let t=0;t<6&&!attacked&&!ctx().state.outcome;t++){
 const me=B.actor();assert.ok(me&&B.party().includes(me.uid),'the hero is acting')
 const reach=B.drawn('playReach'),near=x=>Math.min(...B.enemies().map(u=>ctx().geo.distance(x,u.hex)))
 if(reach.length)B.hexBtn([...reach].sort((a,b)=>near(a)-near(b)||a-b)[0]).handlers.click({detail:1})
 const attack=me.actions.find(id=>ctx().actions[id].attack&&B.barRow(id))
 /* Law 10, viewer.no-target-ring (2026-10-04; engine DECISIONS.md 2026-10-04 'after the backlog run: the yellow target ring goes;
    ...'): whom the chosen attack can hit is read off the mark each such unit wears on itself (`playTargetUnit`, which carries its
    unit's hex) - the yellow ring on the target's hex is gone. Was: const targets=B.drawn('playTarget') */
 B.press(attack);const targets=B.drawn('playTargetUnit')
 if(targets.length){const foe=B.enemies().find(u=>u.hex===targets[0]),turn=ctx().state.turn
  assert.ok(!shownYet(PRIMARY.id),'not before a primary action has been used')
  B.figure(foe.id).handlers.click({detail:1});B.figure(foe.id).handlers.click({detail:1});B.settle('the attack plays')
  attacked=true
  assert.ok(ctx().events.some(e=>e.type==='attack.declared'&&e.actor===me.id&&!e.free),'the hero attacked');assert.notEqual(B.actor()?.id,me.id,'and his Activation is over')
  until(()=>h.lesson===PRIMARY.id,'the primary-action row goes up when the board is next still')
  assert.deepEqual(lines(),['A primary action ends that unit\'s Activation.']);assert.deepEqual(lines(),[...PRIMARY.words]);assert.equal(ptrs().length,0)
  say(`c1 Turn ${turn}: the hero attacked ${foe.name} — his Activation ended and "${PRIMARY.words[0]}" showed`)
  /* (c2) Turn 2 or later, one unit has acted and another has not: End Turn's line, an arrow on the button */
  until(()=>h.lesson===END_TURN.id,'then End Turn\'s row')
  assert.ok(ctx().state.turn>=2);assert.deepEqual(lines(),[...END_TURN.words])
  assert.deepEqual(lines(),['When all of your units have acted, the Enemy Phase begins.','End Turn begins it now: units that have not acted lose their Activation.'])
  assert.deepEqual(ptrs().map(p=>p.target),['ui:end-turn']);assert.equal(ptrs()[0].el,V().dom.root.querySelector('#playEndTurn'),'the arrow sits on End Turn')
  assert.ok(V().play.endTurn.yetToAct.length>0||B.actor(),'a unit has yet to act')
  const ms=O().notice.ms;flush(ms+300);assert.equal(h.lesson,null,'it goes by itself');assert.equal(ptrs().length,0)
  say(`c2 Turn ${ctx().state.turn}: "${END_TURN.words[1]}" with an arrow on End Turn, ${ms} ms`)
 }else{const turn=ctx().state.turn;B.endTurn();B.settle('the next Turn');assert.notEqual(ctx().state.turn,turn)}
}
assert.ok(attacked,'the hero reached an enemy and attacked')
for(const id of MINE)assert.ok(shownYet(id),'the run remembers '+id)

/* a replayed battle shows none of them */
const first=B.first
B.P.fightOut(false,'battle 1 lost');B.P.straightIn([first],'battle 1 again');B=board(B.P);({h,w,V,ctx,O,lines,ptrs,flush,until}=B)
until(()=>!h.busy&&ctx().battleCursor?.at==='acting','the replayed battle begins at once')
const gold=[],words=new Set(MINE.flatMap(id=>rowOf(id).words))
const watch=ms=>{for(let t=0;t<ms;t+=20){w._flush(20);const l=lines();if(l&&!gold.some(g=>g[0]===l[0]))gold.push(l)}}
B.endActivation();watch(400);assert.ok(B.actor()&&!B.party().includes(B.actor().uid),'replayed: a civilian is activated');B.endActivation();watch(400);B.endActivation();watch(30000);B.settle('the replayed battle\'s Turn 2')
B.endActivation();watch(8000)
assert.deepEqual(gold.filter(l=>l.some(x=>words.has(x))),[],'the replayed battle shows none of the three')
say('replayed after a loss: the civilians activated, Turn 2 with one unit acted — none of the three lessons')
console.log('tutorial-orphanage-civilians-and-ending: the civilians are yours, a primary action ends the Activation, End Turn — each at its moment, on the built sandbox — passed')
