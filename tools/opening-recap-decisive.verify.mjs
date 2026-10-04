// kingdom.opening-recap-decisive — ruled 2026-10-04 (Andrew, engine/DECISIONS.md 'a victory in which a civilian was hurt is not
// a decisive victory'): "if a civilian was hurt it was not a decisive victory."
// Expect: "… a won Orphanage in which the Orphan Child was wounded or killed and no hero was hurt does not show 'Decisive' in
// its title; a won battle in which nobody on the player's side was hurt does; the page test asserts both titles …"
//
// The BUILT sandbox, a new run each time (?map&new, a named seed), battle 1 settled as the driver settles it (tools/
// opening-page.mjs: the overpowered test party — nothing sought): once won with nobody hurt, once won with a civilian dead
// (the party stands idle until one has died — playedOutCivilianFalls). The victory screen's title is read off the page.
//
//   node tools/opening-recap-decisive.verify.mjs [BATTLE-SANDBOX.html]
import assert from 'node:assert/strict'
import {openingPage,playedOut,playedOutCivilianFalls} from './opening-page.mjs'
const page=process.argv[2]??'BATTLE-SANDBOX.html'
const RUN_SEED=Number(process.env.RECAP_DECISIVE_SEED??11)
const say=(...a)=>console.log('  '+a.join(' '))

/** a new run's Orphanage, settled by `play`, and its victory screen as the page drew it */
function victory(play,label){
 const P=openingPage(page,'?map&new&seed='+RUN_SEED,new Map())
 const first=P.draft(label);P.straightIn([first],label)
 const {save,result}=play(P.handle.session.config)
 P.w.document.getElementById('transferText').value=save;P.v.click('import');P.settle()
 assert.equal(P.handle.session.ctx.state.outcome,'heroClear',label+': the battle is won')
 P.v.click('reckon');P.wait(2500)
 const recap=P.byId('campaign').querySelector('.recap');assert.ok(recap,label+': the victory screen');assert.equal(recap.dataset.won,'true')
 const side=result.units.filter(u=>u.side==='hero'),party=side.filter(u=>u.role===undefined),civilians=side.filter(u=>u.role!==undefined)
 const hurt=u=>u.lifeState!=='standing'||u.downed||u.stood
 return {title:P.byId('rc-title').textContent,cls:P.byId('rc-title').className,outcome:recap.dataset.outcome,report:P.byId('rc-report').textContent,
  marks:recap.querySelectorAll('.civilian-member').map(c=>c.dataset.fate),glow:recap.querySelectorAll('.decisive-glow').length,
  turns:result.turns,heroesHurt:party.filter(hurt).length,civiliansHurt:civilians.filter(hurt).length,civiliansDead:civilians.filter(u=>u.lifeState==='dead').length,civilians:civilians.length}
}

/* 1 · nobody on the player's side was hurt: DECISIVE VICTORY */
const clean=victory(c=>playedOut(c,true),'won with nobody hurt')
assert.equal(clean.heroesHurt,0,'no hero was hurt');assert.equal(clean.civiliansHurt,0,'no civilian was hurt');assert.ok(clean.civilians>=2,'the Orphan Child and the School Teacher fought')
assert.deepEqual(clean.marks,clean.marks.map(()=>'unhurt'),'every civilian is marked unhurt')
assert.equal(clean.title,'DECISIVE VICTORY','nobody was hurt: the title says Decisive');assert.equal(clean.outcome,'decisive')
assert.match(clean.cls,/victory-decisive/);assert.equal(clean.glow,1,'and wears the decisive look')
assert.match(clean.report,/Decisive Victory — No wounds sustained/,'the report line says the same')
say(`won in ${clean.turns} Turn${clean.turns===1?'':'s'}, nobody hurt: "${clean.title}" · "${clean.report.trim()}"`)

/* 2 · the same battle won with a civilian dead and no hero hurt: no Decisive */
const hurt=victory(c=>playedOutCivilianFalls(c),'won with a civilian dead')
assert.equal(hurt.heroesHurt,0,'no hero was hurt');assert.ok(hurt.civiliansDead>=1,'a civilian died')
assert.ok(hurt.marks.includes('dead'),'the dead civilian is marked on the screen')
assert.ok(!/decisive/i.test(hurt.title),`a civilian was killed: the title does not say Decisive ("${hurt.title}")`)
assert.notEqual(hurt.outcome,'decisive');assert.ok(!/victory-decisive/.test(hurt.cls));assert.equal(hurt.glow,0,'nor wears the decisive look')
assert.match(hurt.title,/VICTORY/,'it is still a victory')
/* a dead civilian gives the grade a dead hero gives */
assert.equal(hurt.outcome,'devastating');assert.equal(hurt.title,'VICTORY')
assert.ok(!/No wounds sustained/.test(hurt.report),'and the report line does not say "No wounds sustained"');assert.match(hurt.report,/fell in battle/)
/* … and it is the civilian, not the battle's length, that took the word away: this battle was short enough to be Decisive */
assert.ok(hurt.turns/25<=.5,`the battle was won in ${hurt.turns} Turns — quick enough for Decisive, had nobody been hurt`)
say(`won in ${hurt.turns} Turns with ${hurt.civiliansDead} civilian${hurt.civiliansDead===1?'':'s'} dead, no hero hurt: "${hurt.title}"`)
console.log('opening-recap-decisive: the title says Decisive only when nobody on the player\'s side was hurt, on the built sandbox — passed')
