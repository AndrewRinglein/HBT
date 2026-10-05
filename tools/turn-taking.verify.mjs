// viewer.turn-taking (engine DECISIONS.md 2026-10-03 'a hero starts its Activation with its basic move armed', 'the action bar
// and its card stay with the activated unit', 'the battle screen's turn-taking, ruled'). The item's expect, on the BUILT
// sandbox (the page PLAY.html's Orphanage card opens: BATTLE-SANDBOX.html?play=encounter.opening.orphanage): "Turn 1 opens
// on the first hero already activated with Move armed; a double-click on a hex moves it with no bar click; a single click on
// a hex shows the path and the attack hit chances from its end; clicking a zombie shows it in the right panel while the bar
// and card stay the hero's; after the hero moves, double-clicking another hero is refused with a one-line reason; End
// Activation passes to the next un-acted hero left to right and the previous hero's ring and highlight are gone; after the
// Enemy Phase no enemy hit chance remains and a Hero Phase banner shows; the top bar shows heroes | divider | enemies."
// Prints one line per step and `turn-taking: … passed` at the end.
import assert from 'node:assert/strict'
import {bootSlice} from './atlas-dom.mjs'
import {shownName} from '../../viewer/src/names.js'
const {w,click}=bootSlice(process.argv[2]??'BATTLE-SANDBOX.html',{search:'?play=encounter.opening.orphanage'}),h=w.__sandbox
const V=()=>h.viewer._V,ctx=()=>h.session.ctx,stage=()=>V().dom.stage,wrap=()=>stage().parentNode
const settle=()=>{for(let i=0;i<50&&h.busy;i++)click('skip');assert.equal(h.busy,false,'the board settles')}
const hexBtn=x=>stage().querySelectorAll('.playHex').find(n=>+n.dataset.hex===x)
const chip=id=>V().dom.rail.querySelectorAll('.railchip').find(c=>+c.dataset.i===id)
const lit=()=>V().dom.rail.querySelectorAll('.railchip').filter(c=>c.className.split(' ').includes('now')).map(c=>+c.dataset.i)
const RAW=/\b[a-z]+(-[a-z]+)+\b/
const say=(...a)=>console.log('  '+a.join(' '))
const card=()=>V().dom.root.querySelector('#unitPortrait img').getAttribute('src'),cardOf=id=>V().data.ASSETS[V().data.ARTMAP[ctx().state.units[id].typeId].card]

settle()
// 1. Turn 1 opens on the first hero already activated, with Move armed
const heroes=ctx().state.units.filter(u=>u.side==='hero').map(u=>u.id).sort((a,b)=>a-b)
const first=heroes[0],me=()=>ctx().state.units[first]
assert.equal(ctx().state.turn,1);assert.deepEqual([ctx().battleCursor.at,ctx().battleCursor.actor],['acting',first],'the first hero is begun, not proposed')
const move=me().actions.find(a=>ctx().actions[a]?.move)
assert.equal(V().play.actor,first);assert.equal(V().play.slot,move,'its basic move is armed');assert.ok(V().play.reach.length>0,'where it can walk is lit')
assert.deepEqual(lit(),[first],'its card alone is lit as acting');assert.equal(V().layers.UEL.get(first).mark.style.display,'block','its ring on the map')
assert.equal(card(),cardOf(first),'its card beside the bar')
say(`1 Turn 1: ${me().name} is begun with ${move} armed, ${V().play.reach.length} hexes lit`)
// the top bar: heroes | divider | enemies
const kids=V().dom.rail.children.map(c=>c.className.split(' ')[0]==='railsep'?'|':c.className.split(' ')[1]),cut=kids.indexOf('|')
assert.equal(kids.filter(k=>k==='|').length,1,'one divider');assert.ok(kids.slice(0,cut).every(k=>k==='hero')&&kids.slice(cut+1).length&&kids.slice(cut+1).every(k=>k!=='hero'),'heroes | divider | enemies: '+kids.join(' '))
say('2 the top bar: '+kids.join(' '))
// clicking a zombie shows it in the right panel while the bar and card stay the hero's
const zombie=ctx().state.units.find(u=>u.side==='enemy'&&u.lifeState==='standing'),bar0=V().dom.actionbar.innerHTML
V().layers.UEL.get(zombie.id).img.handlers.click({detail:1});settle()
/* Law 10, 2026-10-05 - viewer.unit-names-no-letters-or-numbers (engine DECISIONS.md 2026-10-05 'no unit is shown with a number or a
   letter', Andrew: "it shouldn't be Soldier A or Lumberjack 1"): the panel was asked for the engine's marked name (`includes(zombie.name)`). The claim is unchanged; the name the screen shows is the
   engine's less its mark, read through the one function the screen itself uses (viewer src/names.js shownName). */
assert.equal(V().view.inspectId,zombie.id);assert.equal(V().dom.panel.querySelector('.pName').textContent,shownName(zombie.name),'the zombie in the right panel')
assert.equal(V().dom.actionbar.innerHTML,bar0,'the bar stays the hero\'s');assert.equal(card(),cardOf(first),'the card stays the hero\'s')
assert.equal(ctx().battleCursor.actor,first);assert.deepEqual(lit(),[first])
say(`3 ${zombie.name} clicked: in the panel; the bar and card stay ${me().name}'s`)
// a single click on a hex shows the path and moves nothing; a double-click on it moves, with no bar click
const dest=V().play.reach[0]
hexBtn(dest).handlers.pointerenter({});hexBtn(dest).handlers.click({detail:1});settle()
assert.notEqual(me().hex,dest,'a single click moves nothing');assert.equal(V().play.ghost?.hex,dest);assert.equal(V().play.path.at(-1),dest,'the path there is shown')
V().offerPlay({kind:'back'});settle()
hexBtn(dest).handlers.click({detail:1});hexBtn(dest).handlers.click({detail:2});settle()
assert.equal(me().hex,dest,'the double-click walked it there')
say(`4 a single click on hex ${dest} showed the path (${V().play.path.length||'-'}); a double-click walked ${me().name} there`)
// after the hero moves, double-clicking another hero switches nothing by itself: the screen asks first
// 2026-10-04 (viewer.switch-hero-asks; engine DECISIONS.md 2026-10-03 'size and shadows are the default; ... switching heroes
// asks first ...', Andrew: "it should pop up and say, 'End activation of X hero and start activation of Y hero.'"): rewritten
// as the rule. Was: "is refused with a one-line reason" — the play note read `${name} has already moved - End Activation
// first.`. The hero is still the one acting after the double-click; the screen now asks in a pop-up, and No keeps it acting.
const other=heroes[1]
chip(other).handlers.dblclick({});settle()
assert.equal(ctx().battleCursor.actor,first,'no switching away mid-Activation without a yes')
const askBox=V().dom.root.querySelector('#playSwitch'),note=V().dom.root.querySelector('#playSwitchText').textContent
assert.notEqual(askBox.style.display,'none','the screen asks')
/* Law 10, 2026-10-05 - viewer.unit-names-no-letters-or-numbers (engine DECISIONS.md 2026-10-05 'no unit is shown with a number or a
   letter', Andrew: "it shouldn't be Soldier A or Lumberjack 1"): the question was held to the engine's marked names (`me().name`). The claim is unchanged; the name the screen shows is the
   engine's less its mark, read through the one function the screen itself uses (viewer src/names.js shownName). */
assert.equal(note,`End activation of ${shownName(me().name)} and start activation of ${shownName(ctx().state.units[other].name)}?`);assert.doesNotMatch(note,RAW)
V().dom.root.querySelector('#playSwitchNo').handlers.click({});settle()
assert.equal(askBox.style.display,'none','No closes it');assert.equal(ctx().battleCursor.actor,first,'No: the hero is still the one acting')
say(`5 a double-click on ${ctx().state.units[other].name}: "${note}" - No keeps ${me().name} acting`)
// End Activation passes to the next un-acted hero, left to right; the previous hero's ring and highlight are gone
V().dom.root.querySelector('#playEndAct').handlers.click({});settle()
assert.deepEqual([ctx().battleCursor.at,ctx().battleCursor.actor],['acting',other],'the next hero is begun')
assert.notEqual(V().layers.UEL.get(first).mark.style.display,'block','the previous hero\'s ring is gone')
assert.deepEqual(lit(),[other],'only the new hero\'s card is lit');assert.ok(chip(first).className.includes(' done'),'the previous hero\'s card greys as acted')
assert.equal(V().play.slot,ctx().state.units[other].actions.find(a=>ctx().actions[a]?.move),'its basic move is armed')
say(`6 End Activation: ${ctx().state.units[other].name} begins; ${me().name} greyed, its ring gone`)
// a hero that has done nothing may be switched away from: a double-click on the next hero's card
const third=heroes[2]
chip(third).handlers.dblclick({});settle()
assert.deepEqual([ctx().battleCursor.at,ctx().battleCursor.actor],['acting',third],'switched while the one acting had done nothing')
assert.deepEqual(lit(),[third]);assert.ok(!chip(other).className.includes(' done'),'the one switched away from has not acted')
assert.equal(ctx().events.filter(e=>e.type==='activation.begin'&&e.actor===other&&e.turn===1).length,0,'its begun Activation was taken back')
say(`7 a double-click on ${ctx().state.units[third].name} while ${ctx().state.units[other].name} had done nothing: switched`)
// End Turn; after the Enemy Phase no enemy hit chance remains, and a Hero Phase banner shows
const endTurn=()=>{V().dom.root.querySelector('#playEndTurn').handlers.click({});const yes=V().dom.root.querySelector('#playAsk');if(yes&&yes.style.display!=='none')V().dom.root.querySelector('#playAskYes').handlers.click({})}
const turn0=ctx().state.turn;endTurn()
let banner=null
for(let i=0;i<4000&&(h.busy||ctx().state.turn===turn0);i++){w._flush(100);const b=wrap().querySelector('.banner');if(b&&/Hero Phase/.test(b.innerHTML))banner=b.innerHTML}
settle()
assert.ok(!ctx().state.outcome,'the battle goes on');assert.equal(ctx().state.turn,2)
assert.ok(ctx().events.some(e=>e.type==='attack.declared'||e.type==='move.begin'&&ctx().state.units[e.actor].side==='enemy'),'the Enemy Phase acted')
assert.equal(V().S.AIM,null,'no enemy hit chance remains');assert.doesNotMatch(V().layers.dyn?.innerHTML??'',/\d+%/,'no hit chance drawn on the board')
assert.ok(banner,'a Hero Phase banner showed')
assert.deepEqual([ctx().battleCursor.at,ctx().battleCursor.actor],['acting',first],'the Hero Phase begins the first hero again')
say(`8 Turn 2: no enemy hit chance on the board, the Hero Phase banner showed, ${me().name} begun`)
// a single click on a hex shows the path and the attack hit chances from its end (once a zombie has come near)
let from=null,aim=null
for(let turn=0;turn<6&&from===null&&!ctx().state.outcome;turn++){
 const now=ctx().battleCursor.actor
 for(const x of V().play.reach){hexBtn(x).handlers.pointerenter({});hexBtn(x).handlers.click({detail:1});settle()
  assert.notEqual(ctx().state.units[now].hex,x,'a single click moves nothing');assert.equal(V().play.ghost?.hex,x);assert.equal(V().play.path.at(-1),x,'the path there is shown')
  if(V().play.targets.length){from=x;break}
  V().offerPlay({kind:'back'});settle()}
 if(from===null){endTurn();settle()}
}
assert.ok(from!==null,'some hex in reach plans an attack from its end')
const tHex=V().play.targets[0];hexBtn(tHex).handlers.pointerenter({});aim=V().play.aim
assert.ok(aim&&aim.from===from&&aim.to===tHex&&typeof aim.hit==='number','the hit chance is planned from the path\'s end')
say(`9 Turn ${ctx().state.turn}: a single click on hex ${from} shows the path and a ${aim.hit}% hit chance from its end`)
console.log('turn-taking: the Orphanage on the built sandbox, the expect line passed')
