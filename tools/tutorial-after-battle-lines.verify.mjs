// kingdom.tutorial-after-battle-lines — ruled 2026-10-04 (Andrew, engine/DECISIONS.md 'the opening's tutorial: …'; the extra step
// (g)): "One line each, the first time, on the XP, level-up, reward and equip screens." — "Yep, we need tutorials there."
// Expect: "In a new run, the recap after the Orphanage shows a gold line saying what it is; so do the rewards, the first level-up,
// the first Equip and the first Who goes; none of them shows it the second time that screen comes up. A page test asserts one
// line on each screen's first showing, read from the lesson table, and none on its second."
//
// The BUILT sandbox, a new run walked as tools/opening-loop-three.verify.mjs walks it (the driver, tools/opening-page.mjs): battle
// 1 won, its recap, rewards and level-ups; the map; battle 2's draft, Who goes and Equip; battle 2 lost and offered again —
// its Equip a second time; battle 2 won — a second recap and rewards. What the page DREW on each screen is read
// from the driver's record of every write of the campaign screen (`drawn`: which screen, and the gold line it carried).
//
//   node tools/tutorial-after-battle-lines.verify.mjs [BATTLE-SANDBOX.html]
import assert from 'node:assert/strict'
import {openingPage,LESSON_ROWS,lessonReveal} from './opening-page.mjs'
const page=process.argv[2]??'BATTLE-SANDBOX.html',RUN_SEED=Number(process.env.TUTORIAL_SEED??11)
const ORPHANAGE='encounter.opening.orphanage',LUMBERJACK='encounter.opening.lumberjack'
const say=(...a)=>console.log('  '+a.join(' '))
const ROW=Object.fromEntries(LESSON_ROWS.filter(r=>r.starts==='screen').map(r=>[r.screen,r]))
assert.deepEqual(Object.keys(ROW).sort(),['equip','level-up','recap','rewards','who-goes'],'a row for each of the five screens')
const KIND={recap:d=>d.recap&&d.won,rewards:d=>d.rewards,'level-up':d=>d.levelup,equip:d=>d.equip,'who-goes':d=>d.deploy}

const P=openingPage(page,'?map&new&seed='+RUN_SEED,new Map())
/** the showings of a screen so far: runs of consecutive writes of that screen, each with the gold lines its writes carried */
const showings=screen=>{const out=[];let run=null
 for(const d of P.drawn.filter(d=>d.host==='campaign')){if(KIND[screen](d)){if(!run){run={lessons:[],lines:[]};out.push(run)}run.lessons.push(d.lesson);run.lines.push(d.line)}else run=null}
 return out}
const first=P.draft('battle 1');P.straightIn([first],'battle 1')
P.fightOut(true,'battle 1');P.levelUps('battle 1')
assert.equal(P.readMap([ORPHANAGE],'after battle 1'),LUMBERJACK);P.v.click('field',LUMBERJACK)
const second=P.draft('battle 2'),party=[first,second].sort();P.whoGoes('battle 2');P.equipThenFight(party,'battle 2')
P.fightOut(false,'battle 2 lost');if(P.camp().cursor.step==='levelUp')P.levelUps('battle 2 lost')
assert.equal(P.readMap([ORPHANAGE],'after losing battle 2'),LUMBERJACK);P.v.click('field',LUMBERJACK)
P.whoGoes('battle 2 again');P.equipThenFight(party,'battle 2 again')
P.fightOut(true,'battle 2 won')   /* its recap, then its rewards screen: each a second showing */

/* Who goes is asked only when more heroes are held than may deploy (kingdom.opening-deploy-choice: battle 5 on) — this walk's two
   heroes all go, and the screen never comes up. Its line is held by the table and by the one function every screen asks
   (test/tutorial-after-battle-lines.test.ts); here it is held that the page has not spent it. */
assert.equal(showings('who-goes').length,0,'with two heroes nobody is asked who goes');assert.ok(!P.camp().revealed.includes(lessonReveal(ROW['who-goes'].id)),'and its line is still owed')
for(const screen of ['recap','rewards','level-up','equip']){
 const row=ROW[screen],seen=showings(screen)
 assert.ok(seen.length>=1,`${screen}: the screen came up`)
 /* its first showing: every write of it carries the row's line, word for word, read from the table */
 assert.ok(seen[0].lessons.every(id=>id===row.id),`${screen}: its first showing carries the gold line (${seen[0].lessons.join(', ')})`)
 assert.ok(seen[0].lines.every(l=>l===row.words.join(' ')),`${screen}: the words are the table's — "${seen[0].lines[0]}"`)
 /* … and no later showing carries one */
 for(const [i,again] of seen.slice(1).entries())assert.ok(again.lessons.every(id=>id===null),`${screen}: showing ${i+2} carries no line`)
 assert.ok(P.camp().revealed.includes(lessonReveal(row.id)),`${screen}: the run remembers it`)
 say(`${screen}: "${row.words.join(' ')}" on its first showing (${seen[0].lessons.length} write${seen[0].lessons.length===1?'':'s'}); ${seen.length-1} later showing${seen.length===2?'':'s'}, none with a line`)
}
/* each of the screens that comes up twice in this walk did so: the recap, the rewards, Equip */
for(const screen of ['recap','rewards','equip'])assert.ok(showings(screen).length>=2,`${screen} came up a second time`)
/* a lost battle's screen is not the recap of what a battle earned: it carries no line */
assert.ok(P.drawn.filter(d=>d.host==='campaign'&&d.recap&&!d.won).every(d=>d.lesson===null),'the lost battle\'s screen carries no line')
console.log('tutorial-after-battle-lines: one gold line on each screen\'s first showing, none on its second, on the built sandbox — passed')
