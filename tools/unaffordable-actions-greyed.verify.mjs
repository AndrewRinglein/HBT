// viewer.unaffordable-actions-greyed — ruled 2026-10-05 (Andrew, engine DECISIONS.md 'a prone unit only stands; Stand Up is its one
// move; …; what cannot be paid is greyed; …': "If a tax can't be paid for or a power can't be paid for, it should be grayed
// out." — 'tax' is 'attack', dictation).
//
// On the BUILT battle screen, the page PLAY.html opens for battle 1 with the Iron Dwarf
// (BATTLE-SANDBOX.html?play=encounter.opening.orphanage&heroes=hero.base.warrior-iron): the hero, able to pay for everything,
// shows no greyed row; brought to 1 Stamina, every action the ENGINE refuses it (its one limits check) wears the disabled
// look, is marked disabled and says why on hover in the host's line — "Not enough Stamina: needs N, has 1." — while its 0- and
// 1-Stamina actions are lit; a press on a greyed row changes nothing and says the line; a lit attack is chosen as before;
// with its Stamina back the bar is, row for row, the bar it showed before. Which actions the engine refuses is asked of the engine here and compared row for row — the page adds none and
// drops none.
//
// The Stamina is taken and given by the engine's own mutators, in the page's own battle, through the page's own save and
// import (as tools/prone-turn-only-stand-up.verify.mjs knocks a unit down).
//
//   node tools/unaffordable-actions-greyed.verify.mjs [BATTLE-SANDBOX.html]
import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
import {bootSlice} from './atlas-dom.mjs'
const page=process.argv[2]??'BATTLE-SANDBOX.html',ORPHANAGE='encounter.opening.orphanage',DWARF='hero.base.warrior-iron',WHY='viewer.unaffordable-actions-greyed'
const esbuild=createRequire(import.meta.url)('../../engine/node_modules/esbuild')
const built=esbuild.buildSync({stdin:{contents:`export {saveSandbox,restoreSandbox} from './src/core/sandbox.ts';export {drainStamina,gainStamina} from '../engine/src/core/mutate.ts';export {actionReady,grantedActionIds,staminaCostOf,isMove,isAttack} from '../engine/src/core/action.ts'`,resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'esm',write:false,logLevel:'silent'})
const E=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'))

const {w,root}=bootSlice(page,{search:'?play='+ORPHANAGE+'&heroes='+DWARF}),h=w.__sandbox
const V=()=>h.viewer._V,ctx=()=>h.session.ctx,unit=id=>ctx().state.units[id]
const say=(...a)=>console.log('  '+a.join(' '))
const settle=()=>{for(let i=0;i<8000&&(h.busy||i<3);i++)w._flush(20);assert.equal(h.busy,false,'the board settles');assert.equal(h.fault,'','no fault')}
const rows=()=>V().dom.actionbar.querySelectorAll('.acRow').filter(r=>r.dataset.act)
const row=id=>rows().find(r=>r.dataset.act===id)
const has=(r,cls)=>r.className.split(/\s+/).includes(cls)
const name=id=>ctx().actions[id]?.name??id,names=ids=>ids.map(name).join(', ')||'none'
const endActivation=()=>{V().dom.root.querySelector('#playEndAct').handlers.click({});settle()}
const acting=()=>ctx().battleCursor?.at==='acting'?ctx().battleCursor.actor:null
const lastLine=r=>r.getAttribute('title').split('\n').pop()
const greyed=()=>rows().filter(r=>has(r,'cantPay')).map(r=>r.dataset.act)
/** what the engine's limits check refuses `id` now, of what it grants it: the engine in this page's own battle */
const refusedBy=id=>{const c=E.restoreSandbox(E.saveSandbox(h.session)).ctx,u=c.state.units[id];return E.grantedActionIds(c,u).filter(a=>!E.actionReady(c,u,c.actions[a]))}
const costOf=(id,a)=>E.staminaCostOf(unit(id),ctx().actions[a])
/** each row as the page draws it: its look, whether it is marked disabled, and what it says on hover */
const look=()=>rows().map(r=>[r.dataset.act,r.className.split(/\s+/).filter(c=>c!=='firing').sort().join(' '),r.getAttribute('aria-disabled'),r.getAttribute('title')])

/** the page's own battle, with `id`'s Stamina brought to `n` by the engine's own mutators, opened on the page again */
function staminaTo(id,n){
 const s=E.restoreSandbox(E.saveSandbox(h.session)),u=s.ctx.state.units[id],turn=ctx().state.turn
 if(u.stamina>n)E.drainStamina(s.ctx,id,u.stamina-n,WHY);else if(u.stamina<n)E.gainStamina(s.ctx,id,n-u.stamina,WHY)
 w.document.getElementById('transferText').value=E.saveSandbox(s)
 const imp=root.els.find(e=>e.dataset.act==='import');assert.ok(imp,'the page\'s import');imp.handlers.click();settle()
 assert.equal(unit(id).stamina,n,`${unit(id).name} has ${n} Stamina on the page's battle`)
 assert.equal(acting(),id,`${unit(id).name} is still the one acting`);assert.equal(ctx().state.turn,turn,'and it is the same Turn: no Stamina came back by itself')
}

settle()
const hero=acting();assert.ok(hero!==null&&unit(hero).typeId===DWARF,'the page begins the Iron Dwarf\'s Activation')
const full=unit(hero).stamina
// able to pay for everything: nothing is greyed, and the host names nothing
assert.deepEqual(refusedBy(hero),[],'the engine takes every action of the fresh hero')
assert.deepEqual(greyed(),[],'no row is greyed');assert.deepEqual([...(V().play.cantPay??['absent'])],[],'the host\'s fact is there and empty')
staminaTo(hero,full);const before=look()
assert.ok(before.length>=4,'its bar: '+names(before.map(r=>r[0])))

// 1 Stamina
staminaTo(hero,1)
const refused=refusedBy(hero).filter(a=>row(a)),grey=greyed()
assert.deepEqual([...grey].sort(),[...refused].sort(),'the rows greyed are exactly the actions the engine refuses')
assert.deepEqual([...V().play.cantPay.map(c=>c.id)].sort(),[...refusedBy(hero)].sort(),'the host\'s fact is the engine\'s answer')
assert.ok(grey.some(a=>E.isAttack(ctx().actions[a])),'an attack is among them: '+names(grey))
for(const a of grey){const r=row(a),n=costOf(hero,a)
 assert.ok(n>=2,`${name(a)} costs ${n}`)
 assert.equal(r.getAttribute('aria-disabled'),'true',`${name(a)} is marked disabled`)
 assert.equal(lastLine(r),`Not enough Stamina: needs ${n}, has 1.`,`${name(a)} says why on hover`)
 assert.ok(!has(r,'playChosen'),`${name(a)} is not lit as chosen`)}
const lit=rows().map(r=>r.dataset.act).filter(a=>!grey.includes(a))
assert.ok(lit.some(a=>E.isAttack(ctx().actions[a]))&&lit.some(a=>E.isMove(ctx().actions[a])),'an attack and a move are lit: '+names(lit))
for(const a of lit){assert.ok(costOf(hero,a)<=1,`${name(a)} costs ${costOf(hero,a)}`);assert.equal(row(a).getAttribute('aria-disabled'),null,`${name(a)} is lit`);assert.ok(!row(a).getAttribute('title').includes('Not enough Stamina'))}
// a press on a greyed row: answered in the line, nothing chosen, nothing happens
const seq=ctx().state.seq,began={slot:V().play.slot,reach:[...V().play.reach]}
for(const a of grey){row(a).handlers.click({});settle()
 assert.equal(V().play.note,`Not enough Stamina: needs ${costOf(hero,a)}, has 1.`,`pressing ${name(a)} says why`)
 assert.equal(V().play.slot,began.slot,`${name(a)} is not chosen`);assert.deepEqual(V().play.reach,began.reach)
 assert.ok(!has(row(a),'playChosen'));assert.equal(ctx().state.seq,seq,'nothing happened')}
const shown=V().dom.playNote;assert.ok(shown&&shown.style.display!=='none'&&/^Not enough Stamina: needs \d+, has 1\.$/.test(shown.textContent),`the notice is on the screen (${shown&&shown.textContent})`)
// an attack it can pay for is chosen as before
const cheap=lit.find(a=>E.isAttack(ctx().actions[a]));row(cheap).handlers.click({});settle()
assert.equal(V().play.slot,cheap,`${name(cheap)} is chosen`);assert.ok(has(row(cheap),'playChosen'))
say(`${unit(hero).name} at 1 Stamina: greyed, marked disabled and saying why — ${names(grey)}; lit — ${names(lit)}; ${name(cheap)} chosen on a press`)

/* Attack one unaffordable is not shown on this page: the Iron Dwarf's attack one (Chop) costs 1, and brought to 0 Stamina on
   Turn 1 of battle 1 the engine lists nothing it can do (no step of a walk it can pay for, nobody in reach of Punch), so its
   Activation ends by itself ("No remaining actions possible.") before a bar could be read. That case — after a move, attack
   one named with why and no attack chosen in its place — is held on the host's facts in test/unaffordable-actions-greyed.test.ts
   and test/attack-one-armed-after-move.test.ts. */

// its Stamina back: the bar it showed before, row for row
staminaTo(hero,full)
assert.deepEqual(greyed(),[],'with its Stamina back nothing is greyed')
assert.deepEqual(look(),before,'and the bar is the bar it showed before, row for row')
console.log(`unaffordable-actions-greyed: on the built sandbox (${ORPHANAGE}), the Iron Dwarf at 1 Stamina showed every action the engine refuses greyed, marked disabled and saying "Not enough Stamina: needs N, has 1.", its cheaper actions lit; a press on a greyed row changed nothing and said why; with its Stamina back the bar was the bar it showed before — passed`)
