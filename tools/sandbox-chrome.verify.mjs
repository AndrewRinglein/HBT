// viewer.play-chrome (PLAYABLE-OPENING-PLAN.md item 8; engine DECISIONS.md 2026-09-29 "the playable opening" and "the
// playable battle screen"): the BUILT sandbox plays battle 1 with the battle screen's own chrome. The dropdowns, Execute
// and End activation of the sandbox are gone for an encounter battle (a free battle keeps them); a hero clicked to act is
// ended with the screen's End activation; End Turn with heroes yet to act asks first in an element on the page with the
// ruled words and names them; "Keep playing" ends nothing; "End Turn" ends the Player Phase (engine end-player-phase) and
// the Enemy Phase plays out, beat by beat, while End Turn is off; 2x doubles the playback; the log grows as it plays.
import assert from 'node:assert/strict'
import {bootSlice} from './atlas-dom.mjs'
const {w,root,click}=bootSlice(process.argv[2]??'BATTLE-SANDBOX.html'),handle=w.__sandbox
const select=(id,value)=>{const el=w.document.getElementById(id);el.value=value;el.handlers.change()}
const ASK='Are you sure you want to end your turn? You have units that have not acted.'
const V=()=>handle.viewer._V,ctx=()=>handle.session.ctx,$=id=>V().dom.root.querySelector('#'+id),press=id=>$(id).handlers.click({})
const on=id=>$(id).getAttribute('aria-disabled')==='false',shown=id=>$(id).style.display!=='none'
const figure=id=>V().layers.UEL.get(id).img
const settle=()=>{if(handle.busy)click('skip');assert.equal(handle.busy,false)}
const acts=['select','execute','end','swap']
// a free battle keeps the sandbox's controls
click('start');settle()
assert.ok(w.document.getElementById('action')&&w.document.getElementById('aim'),'a free battle keeps its dropdowns')
assert.ok(root.els.some(e=>e.dataset.act==='execute'),'and Execute')
// battle 1: the board alone
select('encounter','encounter.opening.orphanage');click('start');settle()
// booleans only: a failing assert.equal on a DOM node prints the whole page
for(const id of ['actor','action','aim','swap'])assert.ok(w.document.getElementById(id)===null,id+' dropdown retired')
for(const act of acts)assert.ok(!root.els.some(e=>e.dataset.act===act),act+' button retired')
assert.equal(ctx().battleCursor.at,'selecting')
assert.ok(on('playEndTurn'),'End Turn may be given'); assert.ok(!on('playEndAct'),'no hero is acting')
// a hero clicked to act, ended with the screen's End activation
const heroes=handle.session.policy.humanUnitUids.map(uid=>ctx().state.units.find(u=>u.uid===uid))
figure(heroes[0].id).handlers.click({detail:1});settle()
assert.equal(ctx().battleCursor.actor,heroes[0].id);assert.ok(on('playEndAct'),'End activation while a hero acts')
press('playEndAct');settle()
assert.equal(ctx().battleCursor.at,'selecting','End activation ended it')
// End Turn with two heroes yet to act: the pop-up asks, on the page
const before=ctx().events.length
press('playEndTurn')
assert.ok(shown('playAsk'),'the pop-up shows');assert.equal($('playAskText').textContent,ASK)
for(const h of heroes.slice(1))assert.ok($('playAskWho').textContent.includes(h.name),'it names '+h.name)
assert.equal(ctx().events.length,before,'nothing happens until it is answered')
press('playAskNo');assert.ok(!shown('playAsk'));assert.equal(ctx().events.length,before,'Keep playing ends nothing')
// 2x
press('playSpeed');assert.equal(handle.viewer.speedValue,2,'2x doubles the playback')
// End Turn, answered: the Player Phase ends, the Enemy Phase plays beat by beat
const rows=()=>$('playLog').children.length,logBefore=rows()
press('playEndTurn');press('playAskYes')
assert.ok(!shown('playAsk'))
const forgone=ctx().events.slice(before).filter(e=>e.type==='activation.forgone').map(e=>e.unitUid)
assert.deepEqual(forgone.sort(),heroes.slice(1).map(h=>h.uid).sort(),'the heroes yet to act forgo')
assert.ok(ctx().events.slice(before).some(e=>e.type==='activation.begin'&&ctx().state.units[e.actor].side==='enemy'),'the Enemy Phase ran')
assert.ok(handle.busy,'the resolved actions are playing');assert.ok(!on('playEndTurn'),'End Turn is off while they play')
let played=0;for(let n=0;n<600&&handle.busy;n++){w._flush(250);played++}
assert.equal(handle.busy,false,'the Enemy Phase played to its end');assert.ok(played>4,'beat by beat, not at once')
assert.ok(rows()>logBefore,'the log grew as it played')
assert.equal(V().cursor,ctx().events.length,'every event played')
assert.equal(ctx().state.turn,2);assert.equal(ctx().battleCursor.at,'selecting');assert.ok(on('playEndTurn'),'Turn 2: End Turn again')
console.log('sandbox chrome: dropdowns retired for battle 1 (kept for a free battle), End activation on the screen, End Turn asks on the page and names the heroes, Keep playing ends nothing, End Turn forgoes them and the Enemy Phase plays beat by beat, 2x, the log grows passed')
