// kingdom.tutorial-second-battle — ruled 2026-10-04 (Andrew, engine/DECISIONS.md 'the opening's tutorial: …'; the extra step (h),
// read as a yes): "Battle 2: several heroes take turns one at a time, plus the camera controls."
//
// Law 10, 2026-10-04 (kingdom.tutorial-turns-in-battle-one; engine/DECISIONS.md 2026-10-04 'after the backlog run: …; battle 2's
// lessons' — Andrew: "Five taking turns was present in battle 1, but camera controls should stay."): this verifier held "battle
// 2's first Hero Phase shows arrows on the heroes' cards with the taking-turns line … battle 1 shows neither". By the ruling
// the taking-turns lesson is battle 1's — the civilians' row carries it, shown as the first civilian is activated while another
// unit has yet to act (kingdom SWITCHES.md lessonTurnsRow) — and battle 2 does not show it; the camera's controls stay in
// battle 2, at the second hero, as they were. Rewritten as that rule: where it asserted the taking-turns notice in battle 2 it
// now asserts it in battle 1 and its absence from battle 2; everything held of the camera's notice is unchanged.
//
// Expect (kingdom.tutorial-turns-in-battle-one): "the taking-turns lesson shows in the Orphanage the first time more than one of
// the player's units can be activated, and not in the Lumberjack House; the camera controls lesson still shows in the Lumberjack
// House at the second hero; … the page test asserts where each shows."
// (The battle screen has no Reset button — the wheel's zoom springs back by itself — so the camera's notice carries no arrow:
// kingdom SWITCHES.md lessonCameraNoReset.)
//
// The BUILT sandbox, a new run: battle 1 played through its first lesson and its first civilian's Activation, a Turn, then
// settled won (the driver's strong party); battle 2 reached through the map, the draft and Equip and played with the mouse
// (tools/lesson-play.mjs), every Activation ended once nothing is left to read; then battle 2 lost and played again.
//
//   node tools/tutorial-second-battle.verify.mjs [BATTLE-SANDBOX.html]
import assert from 'node:assert/strict'
import {newRun,board,rowOf,lessonReveal,LESSON_ROWS,ORPHANAGE,LUMBERJACK} from './lesson-play.mjs'
const page=process.argv[2]??'BATTLE-SANDBOX.html',RUN_SEED=Number(process.env.TUTORIAL_SEED??11)
const say=(...a)=>console.log('  '+a.join(' '))
const TURNS_WORDS=['Your units act one at a time: finish one Activation before the next begins.','Double-click another unit to switch to it, while the one acting has done nothing.']
const saysTurns=lines=>!!lines&&lines.some(x=>TURNS_WORDS.includes(x))
/* the table: one row says how the units take turns, and it is battle 1's; battle 2 holds no such row */
assert.ok(!LESSON_ROWS.some(r=>r.id==='lesson.lumberjack.turns'),'the lesson table holds no taking-turns row of battle 2')
const YOURS=rowOf('lesson.orphanage.civilians-yours'),CAMERA=rowOf('lesson.lumberjack.camera')
assert.deepEqual(LESSON_ROWS.filter(r=>saysTurns(r.words)).map(r=>r.id),[YOURS.id],'one row says how the units take turns: the civilians\' row');assert.equal(YOURS.encounterId,ORPHANAGE,'and it is battle 1\'s')
assert.equal(CAMERA.encounterId,LUMBERJACK)

/* battle 1 shows the taking-turns lesson — not during the hero's first move (his first Activation is the first lesson's), but as
   the first civilian is activated: the first time more than one of the player's units is left to activate with nothing else to
   read — and does not show the camera's controls */
const R=newRun(page,RUN_SEED),P=R.P
R.firstMove()
assert.ok(!P.camp().revealed.includes(lessonReveal(YOURS.id)),'not during the hero\'s first move')
R.endActivation()
const civ=R.actor();assert.ok(civ&&civ.side==='hero'&&!R.party().includes(civ.uid),'a civilian is activated')
assert.equal(R.h.lesson,YOURS.id,'the civilians\' row is up');assert.deepEqual(R.lines(),[...YOURS.words]);assert.deepEqual(R.lines().slice(-2),TURNS_WORDS,'and it says how the units take turns')
const waits=[...R.V().play.endTurn.yetToAct].sort((a,b)=>a-b);assert.ok(waits.length>=1&&!waits.includes(civ.id),'more than one of the player\'s units is left to activate: the one acting and '+waits.length+' more')
assert.deepEqual(R.ptrs().map(p=>p.target),['unit:'+civ.id,...waits.map(id=>'card:'+id)],'an arrow on the civilian acting and one on the card of each unit that waits')
assert.equal(R.ctx().state.turn,1,'in Turn 1')
say(`battle 1, Turn 1, ${civ.name} activated with ${waits.length} more of the player's units yet to act: "${YOURS.words.join('" / "')}"`)
R.flush(R.O().notice.ms+300);assert.equal(R.h.lesson,null,'it goes by itself');R.endActivation();R.flush(8000)
assert.ok(P.camp().revealed.includes(lessonReveal(YOURS.id)),'the run remembers it')
assert.ok(!R.h.lessons.includes(CAMERA.id)&&!P.camp().revealed.includes(lessonReveal(CAMERA.id)),'battle 1 does not show the camera\'s controls')
P.fightOut(true,'battle 1');P.levelUps('battle 1')
assert.equal(P.readMap([ORPHANAGE],'after battle 1'),LUMBERJACK);P.v.click('field',LUMBERJACK)
const second=P.draft('battle 2'),party=[R.first,second].sort();P.whoGoes('battle 2');P.equipThenFight(party,'battle 2')

/** battle 2 on the board, played until both of the party's heroes have been activated and nothing is left to read: what the
    screen showed of the camera's row as it went up, every lesson's row that was up, and every gold notice */
function play(label){
 const B=board(P),{h,w,V,ctx}=B,seen={},rows=new Set(),gold=[]
 const heroIds=()=>B.heroes().map(u=>u.id),begun=new Set()
 const tick=w._flush.bind(w);w._flush=ms=>{tick(ms);const a=B.actor();if(a&&heroIds().includes(a.id))begun.add(a.id)
  const l=B.lines();if(l&&!gold.some(g=>g.join('/')===l.join('/')))gold.push([...l])
  for(const id of h.lessons){rows.add(id);if(id===CAMERA.id&&!seen[id])seen[id]={lines:B.lines(),ptrs:B.ptrs().map(p=>({target:p.target,el:p.el})),actor:a?.id??null,turn:ctx().state.turn,begun:[...begun],ended:ctx().events.filter(e=>e.type==='activation.end'&&heroIds().includes(e.actor)).length}}}
 B.playUntil(()=>begun.size>=2&&!h.busy&&h.lessons.length===0&&B.actor()&&!heroIds().includes(B.actor().id),()=>h.lessons.length>0)
 w._flush=tick
 return {B,seen,rows:[...rows],gold,heroIds:heroIds()}
}
const first=play('battle 2')
assert.equal(first.heroIds.length,2,'battle 2 fields two heroes')
/* (h1, moved to battle 1) battle 2 says nothing of taking turns — not at its first hero, not at its second */
assert.deepEqual(first.gold.filter(saysTurns),[],'battle 2 does not show the taking-turns lesson');assert.ok(!first.rows.includes(YOURS.id),'the civilians\' row is battle 1\'s')
assert.ok(first.rows.every(id=>{const r=rowOf(id);return r.encounterId===LUMBERJACK||r.encounterId===undefined}),'only battle 2\'s rows, and the rows of any battle, were up: '+first.rows.join(', '))
say(`h1 battle 2, both heroes activated: nothing about taking turns (the lessons' rows up: ${first.rows.join(', ')||'none'})`)
/* (h2) the camera's controls as the second hero's Activation begins */
const c=first.seen[CAMERA.id];assert.ok(c,'the camera row showed')
assert.deepEqual(c.lines,[...CAMERA.words]);assert.deepEqual(c.lines,['Q and E, or the left and right arrows, turn the view.','The wheel looks closer or further, and the view springs back.','Point at an edge of the screen to scroll the map.'])
assert.equal(c.actor,first.heroIds[1],'the second hero is acting');assert.deepEqual(c.begun,first.heroIds,'both heroes have been activated');assert.ok(c.ended>=1,'the first hero\'s Activation is over')
assert.deepEqual(c.ptrs.filter(p=>!/^card:/.test(p.target)),[],'no arrow: the battle screen has no Reset button');assert.equal(first.B.V().dom.root.querySelector('#playReset'),null)
say(`h2 the second hero activated: "${CAMERA.words[0]}" / "${CAMERA.words[1]}" / "${CAMERA.words[2]}"`)
assert.ok(P.camp().revealed.includes(lessonReveal(CAMERA.id)),'the run remembers '+CAMERA.id)

/* a replayed battle 2 shows the camera's controls never again, and still nothing of taking turns */
P.fightOut(false,'battle 2 lost');if(P.camp().cursor.step==='levelUp')P.levelUps('battle 2 lost')
assert.equal(P.readMap([ORPHANAGE],'after losing battle 2'),LUMBERJACK);P.v.click('field',LUMBERJACK);P.whoGoes('battle 2 again');P.equipThenFight(party,'battle 2 again')
const again=play('battle 2 again');assert.deepEqual(Object.keys(again.seen),[],'replayed: the camera\'s row does not show again');assert.deepEqual(again.gold.filter(saysTurns),[],'nor anything of taking turns')
say('battle 2 lost and played again, both heroes activated: the camera\'s controls not again, taking turns not at all')
console.log('tutorial-second-battle: taking turns at battle 1\'s first civilian and not in battle 2, the camera\'s controls at battle 2\'s second hero, once, on the built sandbox — passed')
