// kingdom.tutorial-skip — ruled 2026-10-04 (Andrew, engine/DECISIONS.md 'the opening's tutorial: …'; the extra step (i)): "A \"Skip
// tutorial\" button for someone who has played before." — "I, we need to do yep."
// Expect: "In a new run's Orphanage a 'Skip tutorial' button shows beside the first lesson; pressing it and answering Yes removes the
// lesson, the hero is activated at once, and no lesson shows for the rest of the run - while battle 2's 'New enemy' notice still
// does; a second new run shows the tutorial again. A page test asserts each of those."
//
// The BUILT sandbox. Run A: a new run's Orphanage — the button, the question, No, then Yes; a Turn played; battle 1 settled won
// and the run walked on to battle 2 (the driver, tools/opening-page.mjs), whose Turn 2 brings a kind of enemy not yet met.
// Run B: a new run in the same browser. Run C: a new run walked to its first screen between battles, and skipped there.
//
//   node tools/tutorial-skip.verify.mjs [BATTLE-SANDBOX.html]
import assert from 'node:assert/strict'
import {newRun,board,LESSON_ROWS,lessonReveal,ORPHANAGE,LUMBERJACK} from './lesson-play.mjs'
const page=process.argv[2]??'BATTLE-SANDBOX.html',RUN_SEED=Number(process.env.TUTORIAL_SEED??11)
const say=(...a)=>console.log('  '+a.join(' '))
const WORDS=new Set(LESSON_ROWS.flatMap(r=>r.words??[])),KEYS=[...new Set(LESSON_ROWS.map(r=>lessonReveal(r.once??r.id)))]
const skipEl=w=>w.document.getElementById('skipTutorial'),shows=w=>{const el=skipEl(w);return !!el&&!el.hasAttribute('hidden')}
const button=(w,what)=>skipEl(w).querySelectorAll('[data-skip]').find(b=>b.dataset.skip===what)
const press=(w,what)=>{const b=button(w,what);assert.ok(b,'the '+what+' button');for(const f of b.listeners.click??[])f({stopPropagation(){}})}

/* ── run A ── */
const browser=new Map()
let B=newRun(page,RUN_SEED,browser),{h,w,V,ctx,lines,ptrs}=B
const P=B.P
/* the button shows beside the first lesson */
assert.equal(h.lesson,'lesson.orphanage.protect');assert.ok(shows(w),'a Skip tutorial button shows while the lesson is up')
assert.equal(button(w,'ask').textContent,'Skip tutorial');assert.equal(skipEl(w).querySelector('#skipAsk'),null,'no question until it is pressed')
/* pressing it asks once: No changes nothing */
press(w,'ask')
assert.match(skipEl(w).querySelector('#skipAsk').textContent,/^Skip every tutorial message for this run\?/,'it asks');assert.ok(button(w,'yes')&&button(w,'no'),'Yes or No')
assert.equal(h.lesson,'lesson.orphanage.protect','asking changes nothing')
press(w,'no');assert.equal(skipEl(w).querySelector('#skipAsk'),null);assert.ok(button(w,'ask'));assert.equal(h.lesson,'lesson.orphanage.protect','No: the lesson goes on')
assert.deepEqual(lines(),['Use your hero to protect the civilians.']);assert.equal(ctx().battleCursor.at,'selecting')
/* Yes: the lesson goes, the hero is activated at once — armed — and every row is marked shown and saved */
const seq=ctx().state.seq;press(w,'ask');press(w,'yes')
assert.equal(h.lesson,null,'Yes: the lesson is gone');assert.equal(lines(),null,'its gold line with it');assert.equal(ptrs().length,0)
B.until(()=>!h.busy&&ctx().battleCursor?.at==='acting','the hero is activated at once')
assert.equal(ctx().battleCursor.actor,B.hero().id);assert.ok(B.drawn('playReach').length>0,'with his basic move armed, as in any other battle')
assert.ok(!shows(w),'and the button is gone: nothing of the tutorial is showing')
for(const key of KEYS)assert.ok(P.camp().revealed.includes(key),'marked shown: '+key)
assert.ok(KEYS.every(k=>JSON.stringify(JSON.parse(browser.get('hbt-opening-run'))).includes(k)),'and saved with the run')
assert.ok(ctx().state.seq>seq,'(the only thing sent is the hero\'s own Activation)')
say(`A a new run's Orphanage: "Skip tutorial" beside the first lesson; it asked "Skip every tutorial message for this run?"; No kept the lesson; Yes removed it, activated the hero at once and marked all ${KEYS.length} lessons shown`)
/* no lesson for the rest of the battle: a Turn played, an enemy clicked, the Enemy Phase watched */
const gold=[];{const tick=w._flush.bind(w);w._flush=ms=>{tick(ms);const l=h.viewer?.overlays.notice?.lines;if(l&&!gold.some(g=>g[0]===l[0]))gold.push([...l]);assert.ok(!shows(w),'the button stays away')}}
B.figure(B.enemies()[0].id).handlers.click({detail:1});B.endTurn();B.settle('Turn 2');B.endTurn();B.settle('Turn 3')
assert.deepEqual(gold.filter(l=>l.some(x=>WORDS.has(x))),[],'no lesson shows in the rest of battle 1');assert.equal(h.lessons.length,0)
/* … nor on the screens between, nor in battle 2 — where "New enemy" still shows */
P.fightOut(true,'battle 1');P.levelUps('battle 1')
assert.equal(P.readMap([ORPHANAGE],'after battle 1'),LUMBERJACK);P.v.click('field',LUMBERJACK)
const second=P.draft('battle 2'),party=[B.first,second].sort();P.whoGoes('battle 2');P.equipThenFight(party,'battle 2')
assert.ok(P.drawn.filter(d=>d.host==='campaign').every(d=>d.lesson===null),'no screen between the battles carried a gold line')
B=board(P);({h,w,V,ctx,lines,ptrs}=B)
const gold2=[];{const tick=w._flush.bind(w);w._flush=ms=>{tick(ms);const l=h.viewer?.overlays.notice?.lines;if(l&&!gold2.some(g=>g.join('/')===l.join('/')))gold2.push([...l])}}
B.settle('battle 2');assert.ok(B.drawn('playReach').length>0,'battle 2\'s first hero begins armed');B.endTurn();B.settle('battle 2, Turn 2');B.endTurn();B.settle('battle 2, Turn 3')
assert.deepEqual(gold2.filter(l=>l.some(x=>WORDS.has(x))),[],'no lesson shows in battle 2');assert.equal(h.lessons.length,0);assert.ok(!shows(w))
assert.ok(gold2.some(l=>l[0]==='New enemy'),'battle 2\'s "New enemy" notice still shows: '+JSON.stringify(gold2.map(l=>l[0])))
say(`A the rest of the run: a Turn of battle 1, its screens, battle 2 to Turn 3 — no lesson; battle 2 still said "${gold2.find(l=>l[0]==='New enemy').join(' / ')}"`)

/* ── run B: a new run has the tutorial again ── */
{const N=newRun(page,RUN_SEED+1,browser)
 assert.equal(N.h.lesson,'lesson.orphanage.protect','a new run opens on the first lesson again');assert.deepEqual(N.lines(),['Use your hero to protect the civilians.']);assert.ok(shows(N.w),'with its Skip tutorial button')
 assert.ok(!KEYS.some(k=>N.P.camp().revealed.includes(k)&&k!==lessonReveal('lesson.orphanage.protect')),'nothing of the other run\'s skip is carried over')
 say('B a second new run: the tutorial again')}

/* ── run C: the button on a screen between battles ── */
{const C=newRun(page,RUN_SEED+2),Q=C.P
 Q.fightOut(true,'battle 1')
 /* fightOut leaves the recap for the next screen; the first rewards (or level-up) screen carries its gold line */
 const line=()=>Q.byId('campaign').querySelector('.lessonLine')
 assert.ok(line(),'a screen between battles carries its gold line');assert.ok(shows(C.w),'and the Skip tutorial button shows beside it')
 press(C.w,'ask');press(C.w,'yes')
 assert.equal(line(),null,'Yes: the line is gone from the screen');assert.ok(!shows(C.w));for(const key of KEYS)assert.ok(Q.camp().revealed.includes(key))
 say('C skipped on a screen between battles: its gold line went, and every lesson is marked shown')}
console.log('tutorial-skip: the button beside a lesson, the question, Yes ends the tutorial for the run and only the tutorial, on the built sandbox — passed')
