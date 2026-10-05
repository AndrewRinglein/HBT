// viewer.switch-hero-asks (engine DECISIONS.md 2026-10-03 'size and shadows are the default; ... switching heroes asks first
// ...', 'the opening draft pool is all 24 heroes ...; the switch pop-up is for any player unit'). The item's expect, on the
// BUILT sandbox (BATTLE-SANDBOX.html?play=encounter.opening.orphanage): "move a hero without using its primary action, then
// double-click another un-acted hero - the pop-up names both heroes; Cancel leaves the first hero acting; confirming ends the
// first hero's Activation (its card is marked acted) and the second hero is the one acting. The same pop-up appears when
// either unit is a player-controlled civilian (an orphan, the school teacher)." The board plays by its own clock (the timers
// flushed), never the launcher's "Show current state". Prints one line per step and `switch-hero-asks: … passed` at the end.
import assert from 'node:assert/strict'
import {bootSlice} from './atlas-dom.mjs'
import {shownName} from '../../viewer/src/names.js'
const {w}=bootSlice(process.argv[2]??'BATTLE-SANDBOX.html',{search:'?play=encounter.opening.orphanage'}),h=w.__sandbox
w.confirm=q=>{throw Error('window.confirm: '+q)}
const V=()=>h.viewer._V,ctx=()=>h.session.ctx,unit=id=>ctx().state.units[id]
const say=(...a)=>console.log('  '+a.join(' '))
const settle=()=>{for(let i=0;i<8000&&(h.busy||i<3);i++)w._flush(20);assert.equal(h.busy,false,'the board settles');assert.equal(h.fault,'','no fault')}
const $=id=>V().dom.root.querySelector('#'+id)
const shown=n=>!!n&&n.style.display!=='none'
const hexBtn=x=>V().dom.stage.querySelectorAll('.playHex').find(n=>+n.dataset.hex===x)
const chip=id=>V().dom.rail.querySelectorAll('.railchip').find(c=>+c.dataset.i===id)
const acting=()=>[ctx().battleCursor.at,ctx().battleCursor.actor]
const walk=()=>{const dest=V().play.reach[0];hexBtn(dest).handlers.click({detail:1});hexBtn(dest).handlers.click({detail:2});settle()}
const dbl=id=>{chip(id).handlers.click({detail:1});chip(id).handlers.click({detail:2});chip(id).handlers.dblclick({});settle()}
/* Law 10, 2026-10-05 - viewer.unit-names-no-letters-or-numbers (engine DECISIONS.md 2026-10-05 'no unit is shown with a number or a
   letter', Andrew: "it shouldn't be Soldier A or Lumberjack 1"): the pop-up and the refusal line were held to the engine's marked names (`unit(x).name`). The claim is unchanged; the name the screen shows is the
   engine's less its mark, read through the one function the screen itself uses (viewer src/names.js shownName). */
const asks=(x,y)=>{assert.ok(shown($('playSwitch')),'the pop-up shows');assert.equal($('playSwitchText').textContent,`End activation of ${shownName(unit(x).name)} and start activation of ${shownName(unit(y).name)}?`)}

settle()
const heroes=ctx().state.units.filter(u=>u.side==='hero').map(u=>u.id).sort((a,b)=>a-b)
const civs=heroes.filter(id=>/orphan|teacher/.test(unit(id).typeId)),first=heroes[0],second=heroes[1]
assert.ok(civs.length>=2&&!civs.includes(first)&&!civs.includes(second),'two heroes and two civilians on the player\'s side')
assert.deepEqual(acting(),['acting',first]);assert.equal(shown($('playSwitch')),false,'no pop-up until asked')
// 1. move a hero without using its primary action, then double-click another un-acted hero: the pop-up names both
walk();assert.equal(unit(first).moveUsed,true);assert.equal(unit(first).primaryUsed,false)
const seq=ctx().state.seq
dbl(second);asks(first,second)
assert.deepEqual(acting(),['acting',first]);assert.equal(ctx().state.seq,seq,'nothing has changed yet')
say(`1 ${unit(first).name} moved; a double-click on ${unit(second).name}: "${$('playSwitchText').textContent}"`)
// 2. No leaves the first hero acting
$('playSwitchNo').handlers.click({});settle()
assert.equal(shown($('playSwitch')),false,'the pop-up is gone');assert.deepEqual(acting(),['acting',first]);assert.equal(ctx().state.seq,seq,'No changed nothing')
assert.ok(!chip(first).className.includes(' done'),'the first hero is not marked acted');assert.equal(V().play.actor,first)
say(`2 No: ${unit(first).name} is still acting, nothing changed`)
// 3. Yes ends the first hero's Activation (its card is marked acted) and the second hero is the one acting
dbl(second);asks(first,second)
$('playSwitchYes').handlers.click({});settle()
assert.equal(shown($('playSwitch')),false);assert.deepEqual(acting(),['acting',second],'the one asked for is acting')
assert.ok(chip(first).className.includes(' done'),'the first hero\'s card is marked acted')
assert.deepEqual(V().dom.rail.querySelectorAll('.railchip').filter(c=>c.className.split(' ').includes('now')).map(c=>+c.dataset.i),[second])
assert.equal(V().play.actor,second);assert.ok(V().play.reach.length>0,'its basic move is armed')
say(`3 Yes: ${unit(first).name} is marked acted; ${unit(second).name} is acting`)
// the first does not come back: a double-click on it is refused in a line, with no pop-up
dbl(first);assert.equal(shown($('playSwitch')),false);assert.equal(V().dom.playNote.textContent,`${shownName(unit(first).name)} has already acted this Phase.`)
// 4. a hero that has done nothing is switched away from as before, with no pop-up
const third=heroes.find(id=>id!==first&&id!==second&&!civs.includes(id))
if(third!==undefined){dbl(third);assert.equal(shown($('playSwitch')),false,'no question for a hero that has done nothing');assert.deepEqual(acting(),['acting',third]);assert.ok(!chip(second).className.includes(' done'))
 say(`4 ${unit(second).name} had done nothing: a double-click on ${unit(third).name} switched, no pop-up`)}
// 5. the same pop-up when the unit asked for is a civilian the player controls …
const from=ctx().battleCursor.actor
walk();dbl(civs[0]);asks(from,civs[0])
say(`5 ${unit(from).name} moved; a double-click on ${unit(civs[0]).name} (a civilian): "${$('playSwitchText').textContent}"`)
$('playSwitchYes').handlers.click({});settle();assert.deepEqual(acting(),['acting',civs[0]]);assert.ok(chip(from).className.includes(' done'))
// 6. … and when the unit being left is one
walk();dbl(civs[1]);asks(civs[0],civs[1])
say(`6 ${unit(civs[0]).name} (a civilian) moved; a double-click on ${unit(civs[1]).name}: "${$('playSwitchText').textContent}"`)
// Esc is No
w.document.dispatch('keydown',{key:'Escape',target:V().dom.stage.parentNode,repeat:false,preventDefault(){}});settle()
assert.equal(shown($('playSwitch')),false);assert.deepEqual(acting(),['acting',civs[0]])
dbl(civs[1]);$('playSwitchYes').handlers.click({});settle();assert.deepEqual(acting(),['acting',civs[1]]);assert.ok(chip(civs[0]).className.includes(' done'))
say(`7 Esc kept ${unit(civs[0]).name}; Yes passed to ${unit(civs[1]).name}`)
console.log('switch-hero-asks: the Orphanage on the built sandbox, the expect line passed')
