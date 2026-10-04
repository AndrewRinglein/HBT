// kingdom.tutorial-second-battle — ruled 2026-10-04 (Andrew, engine/DECISIONS.md 'the opening's tutorial: …'; the extra step (h),
// read as a yes): "Battle 2: several heroes take turns one at a time, plus the camera controls."
// Expect: "In the opening run, battle 2's first Hero Phase shows arrows on the heroes' cards with the taking-turns line, and the
// second hero's Activation shows the camera's controls with an arrow on Reset; battle 1 shows neither, and a replayed battle 2
// shows neither again. A page test asserts both notices' words, targets and triggers."
// (The battle screen has no Reset button — the wheel's zoom springs back by itself — so the camera's notice carries no arrow:
// kingdom SWITCHES.md lessonCameraNoReset.)
//
// The BUILT sandbox, a new run: battle 1 played through its first lesson and a Turn, then settled won (the driver's strong
// party); battle 2 reached through the map, the draft and Equip and played with the mouse (tools/lesson-play.mjs), every
// Activation ended once nothing is left to read; then battle 2 lost and played again.
//
//   node tools/tutorial-second-battle.verify.mjs [BATTLE-SANDBOX.html]
import assert from 'node:assert/strict'
import {newRun,board,rowOf,lessonReveal,ORPHANAGE,LUMBERJACK} from './lesson-play.mjs'
const page=process.argv[2]??'BATTLE-SANDBOX.html',RUN_SEED=Number(process.env.TUTORIAL_SEED??11)
const say=(...a)=>console.log('  '+a.join(' '))
const TURNS=rowOf('lesson.lumberjack.turns'),CAMERA=rowOf('lesson.lumberjack.camera'),MINE=[TURNS.id,CAMERA.id]

/* battle 1 shows neither */
const R=newRun(page,RUN_SEED),P=R.P
R.firstMove();R.endActivation();R.flush(8000)
assert.deepEqual(R.h.lessons.filter(id=>MINE.includes(id)),[]);for(const id of MINE)assert.ok(!P.camp().revealed.includes(lessonReveal(id)),'battle 1 does not show '+id)
P.fightOut(true,'battle 1');P.levelUps('battle 1')
assert.equal(P.readMap([ORPHANAGE],'after battle 1'),LUMBERJACK);P.v.click('field',LUMBERJACK)
const second=P.draft('battle 2'),party=[R.first,second].sort();P.whoGoes('battle 2');P.equipThenFight(party,'battle 2')

/** battle 2 on the board, played until both of the party's heroes have been activated and nothing is left to read: what the
    screen showed of the two rows as each went up */
function play(label){
 const B=board(P),{h,w,V,ctx}=B,seen={}
 const heroIds=()=>B.heroes().map(u=>u.id),begun=new Set()
 const tick=w._flush.bind(w);w._flush=ms=>{tick(ms);const a=B.actor();if(a&&heroIds().includes(a.id))begun.add(a.id)
  for(const id of h.lessons)if(MINE.includes(id)&&!seen[id])seen[id]={lines:B.lines(),ptrs:B.ptrs().map(p=>({target:p.target,el:p.el})),actor:a?.id??null,turn:ctx().state.turn,begun:[...begun],ended:ctx().events.filter(e=>e.type==='activation.end'&&heroIds().includes(e.actor)).length,chips:heroIds().map(id=>V().dom.rail.querySelectorAll('.railchip').find(c=>+c.dataset.i===id))}}
 B.playUntil(()=>begun.size>=2&&!h.busy&&h.lessons.length===0&&B.actor()&&!heroIds().includes(B.actor().id),()=>h.lessons.length>0)
 w._flush=tick
 return {B,seen,heroIds:heroIds()}
}
const first=play('battle 2')
/* (h1) the taking-turns line as battle 2's first Hero Phase begins: an arrow on each hero's card */
const t=first.seen[TURNS.id];assert.ok(t,'the taking-turns row showed')
assert.deepEqual(t.lines,[...TURNS.words]);assert.deepEqual(t.lines,['Your units act one at a time: finish one Activation before the next begins.','Double-click another unit to switch to it, while the one acting has done nothing.'])
assert.equal(first.heroIds.length,2,'battle 2 fields two heroes')
assert.deepEqual(t.ptrs.map(p=>p.target),first.heroIds.map(id=>'card:'+id),'an arrow on each hero\'s card');for(const [i,p] of t.ptrs.entries())assert.equal(p.el,t.chips[i],'on that card in the top bar')
assert.equal(t.turn,1);assert.equal(t.ended,0,'in the first Hero Phase, before any hero\'s Activation has ended');assert.equal(t.actor,first.heroIds[0],'the first hero is acting')
say(`h1 battle 2, Turn 1, the first hero activated: "${TURNS.words[0]}" / "${TURNS.words[1]}" with an arrow on each of the ${first.heroIds.length} heroes' cards`)
/* (h2) the camera's controls as the second hero's Activation begins */
const c=first.seen[CAMERA.id];assert.ok(c,'the camera row showed')
assert.deepEqual(c.lines,[...CAMERA.words]);assert.deepEqual(c.lines,['Q and E, or the left and right arrows, turn the view.','The wheel looks closer or further, and the view springs back.','Point at an edge of the screen to scroll the map.'])
assert.equal(c.actor,first.heroIds[1],'the second hero is acting');assert.deepEqual(c.begun,first.heroIds,'both heroes have been activated');assert.ok(c.ended>=1,'the first hero\'s Activation is over')
assert.deepEqual(c.ptrs.filter(p=>!/^card:/.test(p.target)),[],'no arrow: the battle screen has no Reset button');assert.equal(first.B.V().dom.root.querySelector('#playReset'),null)
say(`h2 the second hero activated: "${CAMERA.words[0]}" / "${CAMERA.words[1]}" / "${CAMERA.words[2]}"`)
for(const id of MINE)assert.ok(P.camp().revealed.includes(lessonReveal(id)),'the run remembers '+id)

/* a replayed battle 2 shows neither again */
P.fightOut(false,'battle 2 lost');if(P.camp().cursor.step==='levelUp')P.levelUps('battle 2 lost')
assert.equal(P.readMap([ORPHANAGE],'after losing battle 2'),LUMBERJACK);P.v.click('field',LUMBERJACK);P.whoGoes('battle 2 again');P.equipThenFight(party,'battle 2 again')
const again=play('battle 2 again');assert.deepEqual(Object.keys(again.seen),[],'replayed: neither row shows again')
say('battle 2 lost and played again, both heroes activated: neither line again')
console.log('tutorial-second-battle: taking turns at battle 2\'s first hero, the camera\'s controls at its second, each once, on the built sandbox — passed')
