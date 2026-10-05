// fix.stand-up-does-nothing — reported 2026-10-05 (Andrew, playing the opening run; engine DECISIONS.md 'playtest post, two more
// reports': "The stand-up button doesn't seem to work. When the lumberjack wife has been knocked down, I cannot seem to stand
// up with her."); ruled the same day ('the playtest post answered': "Stand-up is a special move that is only available if you
// were prone, and yes, it takes your move.").
//
// On the BUILT battle screen, the page PLAY.html opens for battle 2 (BATTLE-SANDBOX.html?play=encounter.opening.lumberjack):
// a hero of the party is knocked down as its Activation stands begun, and the Lumberjack's Wife is knocked down before hers
// begins; each presses the Stand Up button on the bar — the way a move that goes nowhere is used: pressed, then pressed again. The engine logs the stand, the
// prone status is gone, her move is spent and her other actions are still on the bar; then the same for a hero.
//
// The knockdown is the status the engine's own knockdown roll applies (kdb.ts kdbDownStatus), put on by the engine's own
// mutator in a Zombie's name, in the page's own battle: the battle is saved from the page, the status applied, and the save
// opened on the page again (the page's own save and import — how the page tests put a played battle on the screen). The roll
// itself is not sought on a seed.
//
//   node tools/stand-up.verify.mjs [BATTLE-SANDBOX.html]
import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
import {bootSlice} from './atlas-dom.mjs'
const page=process.argv[2]??'BATTLE-SANDBOX.html',LUMBERJACK='encounter.opening.lumberjack'
const esbuild=createRequire(import.meta.url)('../../engine/node_modules/esbuild')
const built=esbuild.buildSync({stdin:{contents:`export {saveSandbox,restoreSandbox} from './src/core/sandbox.ts';export {applyStatus} from '../engine/src/core/status.ts';export {kdbDownStatus} from '../engine/src/core/kdb.ts'`,resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'esm',write:false,logLevel:'silent'})
const E=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'))

const {w,root}=bootSlice(page,{search:'?play='+LUMBERJACK}),h=w.__sandbox
const V=()=>h.viewer._V,ctx=()=>h.session.ctx,unit=id=>ctx().state.units[id]
const say=(...a)=>console.log('  '+a.join(' '))
const settle=()=>{for(let i=0;i<8000&&(h.busy||i<3);i++)w._flush(20);assert.equal(h.busy,false,'the board settles');assert.equal(h.fault,'','no fault')}
const rows=()=>V().dom.actionbar.querySelectorAll('.acRow').filter(r=>r.dataset.act)
const row=id=>rows().find(r=>r.dataset.act===id)
const chip=id=>V().dom.rail.querySelectorAll('.railchip').find(c=>+c.dataset.i===id)
const endActivation=()=>{V().dom.root.querySelector('#playEndAct').handlers.click({});settle()}
const acting=()=>ctx().battleCursor?.at==='acting'?ctx().battleCursor.actor:null
const isProne=(id,prone)=>unit(id).statuses.some(s=>s.id===prone&&s.value>0)
const stoodBy=()=>ctx().events.filter(e=>e.type==='unit.stood').map(e=>e.actor)

/** the page's own battle, with `id` knocked down by a Zombie, opened on the page again */
function knockDown(id){
 const s=E.restoreSandbox(E.saveSandbox(h.session)),prone=E.kdbDownStatus(s.ctx),zombie=s.ctx.state.units.find(u=>u.side==='enemy'&&u.lifeState==='standing')
 assert.ok(prone&&zombie,'the knockdown\'s own status, and an enemy to have done it')
 E.applyStatus(s.ctx,id,prone,1,'fix.stand-up-does-nothing',zombie.id)
 assert.ok(s.ctx.events.some(e=>e.type==='unit.proned'&&e.target===id),'the engine logs the knockdown')
 w.document.getElementById('transferText').value=E.saveSandbox(s)
 const imp=root.els.find(e=>e.dataset.act==='import');assert.ok(imp,'the page\'s import');imp.handlers.click();settle()
 assert.ok(isProne(id,prone),unit(id).name+' is down on the page\'s battle')
 return {prone,stand:ctx().statuses[prone].prone.standAction}
}

/** `id` is knocked down; the Activations before its own are ended (End activation), and on its own it stands by its Stand Up button */
function standsByTheButton(id,label){
 const {prone,stand}=knockDown(id),u=()=>unit(id)
 assert.equal(ctx().actions[stand].name,'Stand Up')
 for(let i=0;i<8&&acting()!==null&&acting()!==id;i++)endActivation()
 assert.equal(acting(),id,`${label}: ${u().name} is the one acting`)
 assert.ok(isProne(id,prone),`${label}: and is down`)
 const button=row(stand)
 assert.ok(button,`${label}: the Stand Up button is on ${u().name}'s bar (the bar: ${rows().map(r=>ctx().actions[r.dataset.act]?.name??r.dataset.act).join(', ')})`)
 const before={stood:stoodBy().length,stamina:u().stamina,hex:u().hex,seq:ctx().state.seq}
 // the press
 button.handlers.click({});settle()
 const afterOne={prone:isProne(id,prone),seq:ctx().state.seq,note:V().play?.note??null,ghost:V().play?.ghost??null}
 if(afterOne.prone){
  // a move that goes nowhere is planned on the unit's own hex, and the screen says how to use it; the next press uses it
  assert.notEqual(afterOne.note,null,`${label}: the press on Stand Up is answered — the screen says something`)
  assert.equal(afterOne.note,'Stand Up: click it again, or the hero, to use it.')
  assert.deepEqual(afterOne.ghost,{unit:id,hex:before.hex},`${label}: Stand Up is planned on ${u().name}'s own hex`)
  row(stand).handlers.click({});settle()
 }
 assert.deepEqual(stoodBy().slice(before.stood),[id],`${label}: the engine logs the stand`)
 assert.equal(isProne(id,prone),false,`${label}: the prone status is gone`)
 assert.equal(u().hex,before.hex,`${label}: where it was`)
 assert.equal(before.stamina-u().stamina,u().maxStamina>0?ctx().actions[stand].staminaCost:0,`${label}: standing costs its row's Stamina`)
 assert.equal(u().moveUsed,true,`${label}: standing took the move`)
 assert.equal(u().primaryUsed,false,`${label}: and not the primary action`)
 // the board shows it: the unit's fold holds no prone status, and Stand Up is off the bar
 assert.ok(!(h.viewer.state.U[id].st?.[prone]>0),`${label}: the battle screen shows ${u().name} standing`)
 if(acting()===id)assert.equal(row(stand),undefined,`${label}: Stand Up is off the bar once stood`)
 const left=acting()===id?rows().map(r=>ctx().actions[r.dataset.act]?.name??r.dataset.act):null
 say(`${label}: ${u().name} knocked down; Stand Up pressed${afterOne.prone?' twice (the first press plans it: "'+afterOne.note+'")':''} — the engine logged the stand, prone gone, move spent, ${ctx().actions[stand].staminaCost} Stamina; ${left?'still acting, the bar: '+left.join(', '):'nothing left it could do: its Activation ended by itself'}`)
 return {pressedTwice:afterOne.prone}
}

settle()
const wife=ctx().state.units.find(u=>u.typeId==='hero.fixed.lumberjacks-wife');assert.ok(wife&&/Lumberjack's Wife/.test(wife.name),'battle 2 fields the Lumberjack\'s Wife')
assert.equal(wife.side,'hero');assert.ok(chip(wife.id),'her card is in the top bar: she is the player\'s to play')
// a hero of the party: the one whose Activation the page has begun
const first=acting();assert.ok(first!==null&&h.session.setup.heroUids.includes(unit(first).uid),'the page begins a hero of the party')
standsByTheButton(first,'battle 2, a hero ('+unit(first).name+')')
// the Lumberjack's Wife: knocked down before her Activation begins, as in play; the Activations before hers are ended
assert.ok(V().play.endTurn===null||V().play.endTurn.yetToAct.includes(wife.id)||acting()===wife.id,'she has yet to act this Hero Phase')
standsByTheButton(wife.id,'battle 2, the Lumberjack\'s Wife')
console.log(`stand-up: on the built sandbox (${LUMBERJACK}), a knocked-down Lumberjack's Wife and a knocked-down hero each stood by the Stand Up button on the bar — the engine logged each stand, the prone status went, the move was spent and the primary action kept — passed`)
