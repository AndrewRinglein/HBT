// viewer.prone-turn-only-stand-up — ruled 2026-10-05 (Andrew, engine DECISIONS.md 'playtest post: …' and 'the playtest post
// answered': "Then, if you are downed, when it's that character's next turn, everything needs to be grayed out except 'stand
// up'." / "Stand-up is a special move that is only available if you were prone, and yes, it takes your move.").
//
// On the BUILT battle screen, the page PLAY.html opens for battle 2 (BATTLE-SANDBOX.html?play=encounter.opening.lumberjack):
// a hero of the party, and then the Lumberjack's Wife, is knocked down and begins (or stands in) its Activation down. Its bar
// shows Stand Up at full strength; every other action the ENGINE refuses it until it has stood (the engine's one limits check)
// wears the disabled look, is marked disabled and says why on hover, and a press on it changes nothing and says "Knocked down:
// Stand Up first."; one press of Stand Up stands it, Stand Up leaves the bar, and what is greyed then is what the engine says
// is done. A unit that is standing has no Stand Up on its bar. Which actions the engine refuses is asked of the engine here
// and compared row for row — the page adds none and drops none.
//
// The knockdown is the status the engine's own knockdown roll applies (kdb.ts kdbDownStatus), put on by the engine's own
// mutator in a Zombie's name, in the page's own battle, through the page's own save and import (as tools/stand-up.verify.mjs).
//
//   node tools/prone-turn-only-stand-up.verify.mjs [BATTLE-SANDBOX.html]
import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
import {bootSlice} from './atlas-dom.mjs'
const page=process.argv[2]??'BATTLE-SANDBOX.html',LUMBERJACK='encounter.opening.lumberjack'
const esbuild=createRequire(import.meta.url)('../../engine/node_modules/esbuild')
const built=esbuild.buildSync({stdin:{contents:`export {saveSandbox,restoreSandbox} from './src/core/sandbox.ts';export {applyStatus} from '../engine/src/core/status.ts';export {kdbDownStatus} from '../engine/src/core/kdb.ts';export {actionReady,grantedActionIds,standsUp,isMove,isAttack} from '../engine/src/core/action.ts'`,resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'esm',write:false,logLevel:'silent'})
const E=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'))

const {w,root}=bootSlice(page,{search:'?play='+LUMBERJACK}),h=w.__sandbox
const V=()=>h.viewer._V,ctx=()=>h.session.ctx,unit=id=>ctx().state.units[id]
const say=(...a)=>console.log('  '+a.join(' '))
const settle=()=>{for(let i=0;i<8000&&(h.busy||i<3);i++)w._flush(20);assert.equal(h.busy,false,'the board settles');assert.equal(h.fault,'','no fault')}
const rows=()=>V().dom.actionbar.querySelectorAll('.acRow').filter(r=>r.dataset.act)
const row=id=>rows().find(r=>r.dataset.act===id)
const has=(r,cls)=>r.className.split(/\s+/).includes(cls)
const name=id=>ctx().actions[id]?.name??id,names=ids=>ids.map(name).join(', ')||'none'
const endActivation=()=>{V().dom.root.querySelector('#playEndAct').handlers.click({});settle()}
const acting=()=>ctx().battleCursor?.at==='acting'?ctx().battleCursor.actor:null
const isProne=(id,prone)=>unit(id).statuses.some(s=>s.id===prone&&s.value>0)
/** what the engine's limits check refuses `id` now, of what it grants it — the stand apart: the engine in this page's own battle */
const refusedBy=id=>{const c=E.restoreSandbox(E.saveSandbox(h.session)).ctx,u=c.state.units[id];return E.grantedActionIds(c,u).filter(a=>!E.standsUp(c.actions[a])&&!E.actionReady(c,u,c.actions[a]))}

/** the page's own battle, with `id` knocked down by a Zombie, opened on the page again */
function knockDown(id){
 const s=E.restoreSandbox(E.saveSandbox(h.session)),prone=E.kdbDownStatus(s.ctx),zombie=s.ctx.state.units.find(u=>u.side==='enemy'&&u.lifeState==='standing')
 assert.ok(prone&&zombie,'the knockdown\'s own status, and an enemy to have done it')
 E.applyStatus(s.ctx,id,prone,1,'viewer.prone-turn-only-stand-up',zombie.id)
 w.document.getElementById('transferText').value=E.saveSandbox(s)
 const imp=root.els.find(e=>e.dataset.act==='import');assert.ok(imp,'the page\'s import');imp.handlers.click();settle()
 assert.ok(isProne(id,prone),unit(id).name+' is down on the page\'s battle')
 return {prone,stand:ctx().statuses[prone].prone.standAction}
}

function downThenUp(id,label){
 // standing first: no Stand Up on the bar of a unit that is not down
 for(let i=0;i<8&&acting()!==null&&acting()!==id;i++)endActivation()
 if(acting()===id){const standsOnBar=rows().filter(r=>E.standsUp(ctx().actions[r.dataset.act]));assert.deepEqual(standsOnBar.map(r=>r.dataset.act),[],`${label}: standing, its bar has no Stand Up`)
  assert.deepEqual(rows().filter(r=>has(r,'standFirst')).map(r=>r.dataset.act),[],`${label}: standing, nothing waits on a stand`)}
 const {prone,stand}=knockDown(id),u=()=>unit(id)
 for(let i=0;i<8&&acting()!==null&&acting()!==id;i++)endActivation()
 assert.equal(acting(),id,`${label}: ${u().name} is the one acting`);assert.ok(isProne(id,prone),`${label}: and is down`)
 // the bar: Stand Up at full strength, and exactly the engine's refusals greyed
 const up=row(stand);assert.ok(up,`${label}: Stand Up is on the bar (the bar: ${names(rows().map(r=>r.dataset.act))})`)
 assert.ok(!has(up,'standFirst')&&!has(up,'cool')&&!has(up,'moveDone'),`${label}: Stand Up is lit`);assert.equal(up.getAttribute('aria-disabled'),null)
 const refused=refusedBy(id).filter(a=>row(a)),greyed=rows().filter(r=>has(r,'standFirst')).map(r=>r.dataset.act)
 assert.deepEqual([...greyed].sort(),[...refused].sort(),`${label}: the rows greyed are exactly the actions the engine refuses until it has stood`)
 assert.deepEqual([...(V().play.standFirst??[])].sort(),[...refusedBy(id)].sort(),`${label}: the host's fact is the engine's answer`)
 const moves=rows().map(r=>r.dataset.act).filter(a=>{const d=ctx().actions[a];return E.isMove(d)&&!E.isAttack(d)&&!E.standsUp(d)})
 assert.ok(moves.length>0,`${label}: it has a move besides the stand`)
 for(const a of moves)assert.ok(greyed.includes(a),`${label}: ${name(a)} is greyed`)
 for(const a of greyed){const r=row(a);assert.equal(r.getAttribute('aria-disabled'),'true',`${label}: ${name(a)} is marked disabled`)
  assert.ok(r.getAttribute('title').includes(`Knocked down: ${name(stand)} first.`),`${label}: ${name(a)} says why on hover`)}
 const lit=rows().map(r=>r.dataset.act).filter(a=>a!==stand&&!greyed.includes(a))
 /* rule.prone-only-stand-up (engine item, ruled 2026-10-05, Andrew: "yes, it cannot use attacks or powers until it stands."):
    the engine now refuses a unit that is down EVERYTHING but its stand — so nothing but Stand Up is lit, by the same reading
    of the engine as above (until this date the attacks and powers stayed lit and this line was a printed FOUND). */
 assert.deepEqual(lit,[],`${label}: down, nothing but Stand Up is lit (still lit: ${names(lit)})`)
 assert.ok(greyed.some(a=>E.isAttack(ctx().actions[a])),`${label}: its attacks are among the greyed`)
 // a press on a greyed row: answered in words, nothing chosen, nothing happens
 const seq=ctx().state.seq,began={slot:V().play.slot,reach:[...V().play.reach]}
 assert.equal(began.slot,stand,`${label}: its Activation begins with the stand armed`)
 for(const a of greyed){row(a).handlers.click({});settle()
  assert.equal(V().play.note,`Knocked down: ${name(stand)} first.`,`${label}: pressing ${name(a)} says why`)
  assert.equal(V().play.slot,began.slot,`${label}: ${name(a)} is not chosen — the screen is as the Activation began`);assert.deepEqual(V().play.reach,began.reach,`${label}: no movement area for ${name(a)}`)
  assert.ok(!has(row(a),'playChosen'),`${label}: ${name(a)} is not lit as chosen`)
  assert.equal(ctx().state.seq,seq,`${label}: nothing happened`);assert.ok(isProne(id,prone))}
 /* the words are on the screen: the host's note, in the notices' own place (viewer.notices-gold-low-no-backdrop) */
 const shown=V().dom.playNote;assert.ok(shown&&shown.style.display!=='none'&&shown.textContent===`Knocked down: ${name(stand)} first.`,`${label}: the notice is on the screen (${shown&&shown.textContent})`)
 // one press of Stand Up
 row(stand).handlers.click({});settle()
 assert.equal(isProne(id,prone),false,`${label}: one press of Stand Up stands it`);assert.equal(u().moveUsed,true,`${label}: standing took its move`)
 let after='its Activation ended by itself'
 if(acting()===id){
  assert.equal(row(stand),undefined,`${label}: Stand Up is off the bar once stood`)
  assert.deepEqual(rows().filter(r=>has(r,'standFirst')).map(r=>r.dataset.act),[],`${label}: nothing waits on a stand once stood`)
  const done=rows().filter(r=>has(r,'moveDone')).map(r=>r.dataset.act)
  assert.deepEqual([...done].sort(),[...(V().play.moveDone??[])].filter(a=>row(a)).sort(),`${label}: the moves greyed after the stand are the ones the host says are done`)
  const attacks=rows().map(r=>r.dataset.act).filter(a=>E.isAttack(ctx().actions[a]))
  for(const a of attacks)assert.ok(!has(row(a),'standFirst')&&!has(row(a),'moveDone')&&!has(row(a),'cool'),`${label}: ${name(a)} is lit after the stand`)
  const openMoves=rows().map(r=>r.dataset.act).filter(a=>{const d=ctx().actions[a];return E.isMove(d)&&!E.isAttack(d)&&!done.includes(a)})
  /* rule.prone-only-stand-up (the same ruling: "No, you only perform one move action."): standing was its move — the engine
     takes no movement from it now, so every move on its bar is greyed as done and none is left open */
  assert.deepEqual(openMoves,[],`${label}: stood, every move on its bar is greyed as done (still open: ${names(openMoves)})`)
  assert.ok(done.length>0,`${label}: stood, its moves are greyed`)
  after=`still acting — attacks lit: ${names(attacks)}; moves greyed as done: ${names(done)}; moves the engine still takes, in its primary action: ${names(openMoves)}`}
 say(`${label}: ${u().name} down — Stand Up lit; greyed and unpressable (the engine refuses them): ${names(greyed)}; still lit (the engine takes them from a unit that is down): ${names(lit)}. Stood on one press; ${after}`)
}

settle()
const wife=ctx().state.units.find(u=>u.typeId==='hero.fixed.lumberjacks-wife');assert.ok(wife&&/Lumberjack's Wife/.test(wife.name),'battle 2 fields the Lumberjack\'s Wife')
const first=acting();assert.ok(first!==null&&h.session.setup.heroUids.includes(unit(first).uid),'the page begins a hero of the party')
downThenUp(first,'battle 2, a hero ('+unit(first).name+')')
downThenUp(wife.id,'battle 2, the Lumberjack\'s Wife')
console.log(`prone-turn-only-stand-up: on the built sandbox (${LUMBERJACK}), a knocked-down hero and the knocked-down Lumberjack's Wife each showed Stand Up lit and every action the engine refuses greyed, marked disabled and answered "Knocked down: Stand Up first."; each stood on one press, Stand Up left the bar, and a standing unit's bar had none — passed`)
