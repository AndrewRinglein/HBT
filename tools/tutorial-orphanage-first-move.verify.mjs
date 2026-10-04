// kingdom.tutorial-orphanage-first-move — ruled 2026-10-04 (Andrew, engine/DECISIONS.md 'the opening's tutorial: the first hero's
// class line, no map before battle 1, the Orphanage's lessons, …'): "The first thing when you go into this first battle is that
// there should be a notification message across the center that is gold and easy to see: \"Use your hero to protect the
// civilians.\" The camera zooms onto the civilians, and an arrow points at them and says \"Civilians.\" It then zooms to the zombie
// on the map, points at it, and says \"Zombie.\" It then zooms back to your hero and says \"Your Hero,\" and your hero is activated.
// … \"Perform your move now.\" And we're going to point an arrow over at the move button. … After they press it we're going to put
// a message up that says, \"Move towards the zombie and the civilians,\" and points at a square. And then after they move, that
// goes away." / "the gold message doesn't stay up. It only lasts for a time."
// Expect: "… A page test walks the steps in order and asserts each one's words and target, that each gold notice goes after its
// time, that no command can be sent before step 4 ends, that the pointed hex is in the hero's reach, and that replaying the battle
// shows none of it and begins with the basic move armed."
//
// The BUILT sandbox, a new run (?map&new, a named seed), the first hero picked — the Orphanage is on the board. The words and
// targets are read from the lesson table (src/content/lessons.ts, through the driver), what stands on the screen from the battle
// screen's own record of its notice and pointers (viewer `overlays`), the battle from the engine's state.
//
//   node tools/tutorial-orphanage-first-move.verify.mjs [BATTLE-SANDBOX.html]
import assert from 'node:assert/strict'
import {openingPage,LESSON_ROWS,lessonReveal} from './opening-page.mjs'
const page=process.argv[2]??'BATTLE-SANDBOX.html'
const ORPHANAGE='encounter.opening.orphanage',RUN_SEED=Number(process.env.TUTORIAL_SEED??11),RUN_KEY='hbt-opening-run'
const say=(...a)=>console.log('  '+a.join(' '))
const rows=LESSON_ROWS.filter(r=>r.encounterId===ORPHANAGE).slice(0,6),[PROTECT,CIVILIANS,ZOMBIE,HERO,TWO,MOVE]=rows
assert.deepEqual(rows.map(r=>r.id),['lesson.orphanage.protect','lesson.orphanage.civilians','lesson.orphanage.zombie','lesson.orphanage.hero','lesson.orphanage.two-actions','lesson.orphanage.move'],'the first lesson\'s six rows, in order')

const browser=new Map()
let P=openingPage(page,'?map&new&seed='+RUN_SEED,browser)
const first=P.draft('battle 1');P.straightIn([first],'battle 1')
let h=P.handle,w=P.w
const v=()=>h.viewer,V=()=>h.viewer._V,ctx=()=>h.session.ctx,O=()=>v().overlays
const lines=()=>O().notice?[...O().notice.lines]:null,ptrs=()=>O().pointers
const flush=ms=>{for(let t=0;t<ms;t+=20)w._flush(20)}
const until=(f,what,ms=20000)=>{for(let t=0;t<ms&&!f();t+=20)w._flush(20);assert.ok(f(),what)}
const stage=()=>V().dom.stage,hexBtn=x=>stage().querySelectorAll('.playHex').find(n=>+n.dataset.hex===x)
const figure=id=>V().layers.UEL.get(id).img
const reachDrawn=()=>stage().querySelectorAll('.playReach').map(n=>+n.dataset.hex).sort((a,b)=>a-b)
const barRow=id=>V().dom.actionbar.querySelectorAll('.acRow').find(r=>r.dataset.act===id)
const party=()=>h.session.setup.heroUids,units=()=>ctx().state.units
const hero=()=>units().find(u=>u.uid===party()[0])
const civilians=()=>units().filter(u=>u.side==='hero'&&!party().includes(u.uid)&&u.lifeState==='standing')
const zombie=()=>units().find(u=>u.side==='enemy'&&u.lifeState==='standing')
const still=(what)=>{assert.equal(ctx().battleCursor.at,'selecting',what+': no Activation has begun');assert.equal(ctx().state.seq,seq0,what+': the engine\'s battle is untouched')}
const seq0=ctx().state.seq,events0=ctx().events.length

/* 1 · the gold line, across the board's centre; nobody is acting */
assert.equal(h.lesson,PROTECT.id,'the battle opens on the first row')
assert.deepEqual(lines(),['Use your hero to protect the civilians.']);assert.deepEqual(lines(),[...PROTECT.words],'the words are the table\'s')
assert.equal(O().notice.node.id,'tutNotice','the battle screen\'s gold notice');assert.equal(ptrs().length,0)
still('step 1');assert.equal(h.busy,false)
/* … it lasts for a time and goes by itself */
const ms1=O().notice.ms;assert.ok(ms1>=2400&&ms1<12000,`a time to read it in (${ms1} ms)`)
flush(ms1-200);assert.deepEqual(lines(),[...PROTECT.words],'still up just before its time');flush(400)
assert.equal(h.lesson,CIVILIANS.id,'its time over, the notice went by itself and the next row is up');assert.equal(lines(),null,'the gold line is gone')
say(`1 "${PROTECT.words[0]}" — gold, across the centre, ${ms1} ms, then gone by itself; nobody acts`)

/* 2 · the civilians: one look that shows both, an arrow that says "Civilians" */
const civ=civilians();assert.equal(civ.length,2,'the Orphan Child and the School Teacher')
assert.equal(O().looking?.hex,civ[0].hex,'the view goes to the civilians')
assert.ok(ctx().geo.distance(civ[0].hex,civ[1].hex)<=2,'who stand together: one look shows both')
assert.deepEqual(ptrs().map(p=>p.target),civ.map(u=>'unit:'+u.id),'an arrow on each civilian');assert.deepEqual(ptrs().map(p=>p.word),['Civilians',null],'one says "Civilians"')
assert.equal(CIVILIANS.point.word,'Civilians');still('step 2')
/* the player cannot act: a click on the hero, on a hex or on the bar begins nothing — it moves on to the next row */
figure(hero().id).handlers.click({detail:1})
assert.equal(h.lesson,ZOMBIE.id,'a click moved on to the next row instead of waiting the look out');still('a click during step 2')
say('2 the view on the civilians, "Civilians" on an arrow over them; a click on the hero began nothing and moved on')

/* 3 · the Zombie */
assert.equal(O().looking?.hex,zombie().hex,'the view goes to the Zombie')
assert.deepEqual(ptrs().map(p=>[p.target,p.word]),[['unit:'+zombie().id,'Zombie']],'one arrow, on the Zombie, saying "Zombie"');assert.equal(ZOMBIE.point.word,'Zombie')
assert.match(zombie().name,/^Zombie/,'and it is one')
hexBtn(hero().hex).handlers.click({detail:1})
assert.equal(h.lesson,HERO.id,'a click on a hex moved on');still('a click during step 3')
say('3 the view on the Zombie, "Zombie" over it; a click on a hex began nothing and moved on')

/* 4 · the hero — and only when this row is over does his Activation begin */
assert.equal(O().looking?.hex,hero().hex,'the view comes back to the hero')
assert.deepEqual(ptrs().map(p=>[p.target,p.word]),[['unit:'+hero().id,'Your Hero']],'one arrow, on the hero, saying "Your Hero"');assert.equal(HERO.point.word,'Your Hero')
still('step 4');flush(600);still('step 4, part-way through its look')
until(()=>h.lesson!==HERO.id,'the look ends by itself')
until(()=>!h.busy&&ctx().battleCursor.at==='acting','then the hero\'s Activation begins')
assert.equal(ctx().battleCursor.actor,hero().id,'the hero is activated')
/* the script sent nothing: the engine's record holds only what beginning the Activation writes */
const begunLines=ctx().events.slice(events0).map(e=>e.type);assert.equal(begunLines[0],'activation.selected','the first line since the battle opened is the Activation\'s own selection');assert.ok(begunLines.includes('activation.begin'))
assert.ok(!begunLines.some(t=>/^(moved|move\.|attack\.|action\.spent|damage\.)/.test(t)),'and nothing has been done: '+begunLines.join(' '))
say(`4 the view on the hero, "Your Hero" over him; when the look ended his Activation began (${begunLines.length} lines: ${begunLines.join(', ')})`)

/* 5 · two actions; "Perform your move now."; an arrow on the basic move's slot; NO move is chosen */
until(()=>h.lesson===TWO.id,'the two-actions row is up')
assert.deepEqual(lines(),['Each of your units receives two actions per turn: a move and a primary action.','Perform your move now.']);assert.deepEqual(lines(),[...TWO.words])
const move=hero().actions.find(id=>ctx().actions[id].move&&!ctx().actions[id].attack),slot=barRow(move);assert.ok(slot,'the basic move is on the bar')
assert.deepEqual(ptrs().map(p=>p.target),['action:'+move],'one arrow, on the basic move\'s slot');assert.equal(ptrs()[0].el,slot,'it stands on that slot')
assert.deepEqual(reachDrawn(),[],'the Activation begins with no move chosen: no blue grid');assert.equal(V().play.slot,null,'no slot is chosen on the bar')
const from=hero().hex,seq5=ctx().state.seq
hexBtn(civ[0].hex).handlers.click({detail:1});hexBtn(civ[0].hex).handlers.click({detail:2})
assert.equal(hero().hex,from,'a click on the board moves nobody: the lesson waits for the press');assert.equal(ctx().state.seq,seq5);assert.equal(stage().querySelector('.playGhost'),null)
const ms5=O().notice.ms;flush(ms5+200)
assert.equal(lines(),null,'the gold words went after their time');assert.deepEqual(ptrs().map(p=>p.target),['action:'+move],'the arrow stays until the slot is pressed');assert.equal(h.lesson,TWO.id)
say(`5 "${TWO.words[1]}" with an arrow on ${ctx().actions[move].name}'s slot; no move chosen, no blue grid; the words went after ${ms5} ms, the arrow stayed`)

/* 6 · the press: the blue grid, "Move towards the zombie and the civilians.", an arrow on a hex the hero can reach */
slot.handlers.click({})
assert.equal(h.lesson,MOVE.id,'the press ends the row and begins the next');assert.equal(ctx().state.seq,seq5,'the press itself sends no command')
const reach=reachDrawn();assert.ok(reach.length>0,'the press is a real act: the blue grid appears on it');assert.equal(V().play.slot,move)
assert.deepEqual(lines(),['Move towards the zombie and the civilians.']);assert.deepEqual(lines(),[...MOVE.words])
assert.equal(ptrs().length,1);const at=ptrs()[0].target.match(/^hex:(\d+)$/);assert.ok(at,'one arrow, on a hex: '+ptrs()[0].target)
const pointed=+at[1];assert.ok(reach.includes(pointed),'the hex pointed at is in the hero\'s reach — the reach the blue grid draws')
const far=x=>civ.reduce((n,c)=>n+ctx().geo.distance(x,c.hex),0)
assert.equal(far(pointed),Math.min(...reach.map(far)),'and none of the reach is nearer the civilians (the engine\'s distance)')
say(`6 on the press: ${reach.length} hexes of blue grid, "${MOVE.words[0]}", an arrow on hex ${pointed} (${ctx().geo.colOf(pointed)}, ${ctx().geo.rowOf(pointed)}) — of the reach, the nearest the civilians`)

/* 7 · the hero moves: everything of the lesson goes */
hexBtn(pointed).handlers.click({detail:1});hexBtn(pointed).handlers.click({detail:1})
until(()=>!h.busy,'the walk plays')
assert.equal(hero().hex,pointed,'the hero walked to the hex pointed at')
assert.equal(h.lesson,null,'the lesson is over');assert.equal(ptrs().length,0,'no arrow stands');assert.equal(lines(),null,'no gold words stand')
assert.equal(V().dom.root.querySelectorAll('.tutPtr').length,0);assert.equal(V().dom.root.querySelector('#tutNotice'),null)
say('7 the hero moved: no arrow and no gold words are left')

/* once in a run: which rows were shown is saved with the run */
const shownIds=rows.map(r=>lessonReveal(r.id))
for(const id of shownIds)assert.ok(P.camp().revealed.includes(id),'the run remembers '+id)
const kept=JSON.parse(browser.get(RUN_KEY));assert.ok(shownIds.every(id=>JSON.stringify(kept).includes(id)),'and it is in the saved run')

/* the battle replayed after a loss shows none of it, and begins with the basic move armed */
const lost=P.fightOut(false,'battle 1 lost');assert.equal(P.camp().cursor.step,'battle')
P.straightIn([first],'battle 1 again');h=P.handle;w=P.w
until(()=>!h.busy&&ctx().battleCursor.at==='acting','the replayed battle begins at once')
assert.equal(h.lesson,null,'replayed: no row is up');assert.equal(lines(),null,'replayed: no gold words');assert.equal(ptrs().length,0,'replayed: no arrow')
assert.equal(ctx().battleCursor.actor,hero().id);assert.ok(reachDrawn().length>0,'replayed: the Activation begins with the basic move armed — the blue grid is up');assert.equal(V().play.slot,move)
/* the battle's own record is the same with the lesson and without it: the same lines open the hero's Activation */
assert.deepEqual(ctx().events.slice(ctx().events.findIndex(e=>e.type==='activation.selected')).map(e=>e.type),begunLines,'the same lines begin the Activation with the lesson and without it')
say('8 the battle replayed after a loss: none of the lesson, the hero begun at once with his basic move armed')

/* … and continued from a save (the page closed mid-battle and opened again): none of it either */
P=openingPage(page,'?map',browser);h=P.handle;w=P.w
assert.equal(P.camp().cursor.step,'battle');until(()=>!h.busy&&ctx().battleCursor.at==='acting','reopened: the battle begins at once')
assert.equal(h.lesson,null);assert.equal(lines(),null);assert.equal(ptrs().length,0);assert.ok(reachDrawn().length>0,'reopened: the basic move is armed')
say('9 the page closed and opened again mid-battle: none of the lesson')
console.log('tutorial-orphanage-first-move: the Orphanage\'s first lesson, step by step, on the built sandbox — passed')
