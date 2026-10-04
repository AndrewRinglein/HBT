// viewer.auto-end-no-actions (engine DECISIONS.md 2026-10-03 'a player unit with nothing left it can do ends its Activation by
// itself: "No remaining actions possible."'). The item's expect, on the BUILT sandbox
// (BATTLE-SANDBOX.html?play=encounter.opening.orphanage): "move a hero its full movement to a hex with no enemy in reach and
// no power it can use - its Activation ends by itself, the notice 'No remaining actions possible.' shows, and the next unit
// is acting; the same move ending beside an enemy leaves the hero acting with its attack offered; a hero with a usable shield
// power or bonus move after moving is not ended; a page test asserts each." The board plays by its own clock (the timers
// flushed), never the launcher's "Show current state". Prints one line per step and `auto-end-no-actions: … passed`.
import assert from 'node:assert/strict'
import {bootSlice} from './atlas-dom.mjs'
const {w}=bootSlice(process.argv[2]??'BATTLE-SANDBOX.html',{search:'?play=encounter.opening.orphanage'}),h=w.__sandbox
w.alert=q=>{throw Error('window.alert: '+q)}
const WORDS='No remaining actions possible.'
const V=()=>h.viewer._V,ctx=()=>h.session.ctx,unit=id=>ctx().state.units[id]
const say=(...a)=>console.log('  '+a.join(' '))
/** the board plays until it is still, in 20 ms ticks; true if the notice was up at any tick on the way */
function settle(){let saw=false;for(let i=0;i<8000&&(h.busy||i<3);i++){w._flush(20);saw=saw||noticeUp()}
 assert.equal(h.busy,false,'the board settles');assert.equal(h.fault,'','no fault');return saw}
const $=id=>V().dom.root.querySelector('#'+id)
const noticeUp=()=>{const n=$('playNotice');return !!n&&n.style.display!=='none'&&n.textContent===WORDS}
const hexBtn=x=>V().dom.stage.querySelectorAll('.playHex').find(n=>+n.dataset.hex===x)
const chip=id=>V().dom.rail.querySelectorAll('.railchip').find(c=>+c.dataset.i===id)
const acting=()=>ctx().battleCursor.at==='acting'?ctx().battleCursor.actor:null
const isCivilian=id=>/orphan|teacher/.test(unit(id).typeId)
const ends=id=>ctx().events.filter(e=>e.type==='activation.end'&&e.actor===id).length
const farthest=()=>{const g=ctx().geo,here=unit(acting()).hex;return [...V().play.reach].sort((a,b)=>g.distance(here,b)-g.distance(here,a))[0]}
const walkTo=x=>{hexBtn(x).handlers.click({detail:1});hexBtn(x).handlers.click({detail:2});return settle()}
const endActivation=()=>{$('playEndAct').handlers.click({});settle()}
const barActs=()=>V().dom.actionbar.querySelectorAll('.acRow').map(r=>r.dataset.act).filter(Boolean)

settle()
assert.ok($('playNotice'),'the notice is an element on the page');assert.equal(noticeUp(),false,'no notice until something ends')
// 1. a hero with a usable shield power or a bonus move after moving is not ended
const hero=acting();assert.ok(hero!==null&&!isCivilian(hero))
assert.equal(walkTo(farthest()),false,'no notice');assert.equal(acting(),hero,'still acting');assert.equal(ends(hero),0)
assert.ok(V().play.endActivation,'End activation is still the player\'s to press')
say(`1 ${unit(hero).name} walked its full movement: still acting (it can still use a power or a bonus move), no notice`)
// 2. a unit that has not acted at all is never ended: each begins and waits
let civ=null
for(let n=0;n<8&&civ===null;n++){endActivation();const a=acting();assert.ok(a!==null,'the next unit begins and waits');assert.equal(ends(a),0);assert.equal(noticeUp(),false);if(isCivilian(a))civ=a}
assert.ok(civ!==null,'a civilian the player controls comes up')
say(`2 every unit begun waits for its order; ${unit(civ).name} is acting`)
// 3. it walks its full movement to a hex with no enemy in reach and no power it can use: ended by itself, the notice shows, the next unit acts
const before=ctx().events.length,saw=walkTo(farthest())
assert.equal(ends(civ),1,'its Activation ended by itself');assert.ok(chip(civ).className.includes(' done'),'its card is marked acted')
assert.ok(saw||noticeUp(),'the notice showed');assert.ok(noticeUp(),'and is still up to be read');assert.equal($('playNotice').textContent,WORDS)
const types=ctx().events.slice(before).map(e=>e.type)
assert.equal(types.filter(t=>t==='activation.end').length,1,'one end: the engine\'s own');assert.ok(types.indexOf('activation.end')>types.lastIndexOf('moved'),'after its walk')
const next=acting();assert.ok(next!==null&&next!==civ,'the next unit is acting');assert.equal(V().play.actor,next);assert.equal(ends(next),0,'and it is not ended: it has not acted')
say(`3 ${unit(civ).name} walked its full movement with nothing in reach: ended by itself, "${$('playNotice').textContent}", ${unit(next).name} is acting`)
// the notice leaves by itself and blocked nothing
w._flush(6000);assert.equal(noticeUp(),false,'the notice leaves by itself');assert.equal(acting(),next)
// 4. the same move ending beside an enemy leaves the unit acting with its attack offered
let found=null
for(let turn=0;turn<12&&!found&&!ctx().state.outcome;turn++){
 for(let n=0;n<8&&!found;n++){const a=acting();if(a===null)break
  if(isCivilian(a))for(const x of V().play.reach){hexBtn(x).handlers.click({detail:1});settle();if(V().play.targets.length){found={a,x};break}V().offerPlay({kind:'back'});settle()}
  if(!found){if(acting()===a)endActivation();if(ctx().battleCursor.at!=='acting')break}}
 if(!found&&!ctx().state.outcome&&acting()===null){$('playEndTurn').handlers.click({});if($('playAsk').style.display!=='none')$('playAskYes').handlers.click({});settle()}
}
assert.ok(found,'a civilian can walk to a hex from which the engine lists an attack')
hexBtn(found.x).handlers.click({detail:2});const sawBeside=settle()
assert.equal(unit(found.a).hex,found.x);assert.equal(acting(),found.a,'still acting beside the enemy');assert.equal(sawBeside,false,'no notice')
const attack=barActs().find(id=>ctx().actions[id]?.attack),row=V().dom.actionbar.querySelectorAll('.acRow').find(r=>r.dataset.act===attack)
row.handlers.click({detail:1});settle()
assert.ok(V().play.targets.length>0,'its attack is offered: the engine lists a target');assert.equal(acting(),found.a)
say(`4 Turn ${ctx().state.turn}: ${unit(found.a).name} walked beside an enemy: still acting, ${attack} offered at ${V().play.targets.length} target(s)`)
console.log('auto-end-no-actions: the Orphanage on the built sandbox, the expect line passed')
