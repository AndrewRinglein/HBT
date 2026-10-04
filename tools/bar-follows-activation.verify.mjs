// viewer.bar-follows-activation (engine DECISIONS.md 2026-10-03 'the action bar changes with the Activation: the new unit's
// moves, attacks and powers'; Andrew: "when the activation changes, for whatever reason, the card art changes in the lower
// left, but the moves don't change. They need to change to the character's moves. And attacks and powers and all that").
// The item's expect, on the BUILT sandbox (BATTLE-SANDBOX.html?play=encounter.opening.orphanage): "end the first hero's
// Activation and, before any other click, the action bar shows the next unit's own moves, attacks and powers (not the
// previous unit's) and its card beside it; the same after a double-click switch and at the start of each Hero Phase; a page
// test reads the bar's buttons against the activated unit's sheet at each change of Activation."
// The board is left to play by its own clock (the timers flushed) — never the launcher's "Show current state" button, which
// seeks and redraws everything: the fault was in what is drawn while the pump plays. At every tick the card and the bar must
// be one unit's; whenever the board is still they are the activated unit's: its actions (the engine's own list on the unit),
// its card, its stamina, its basic move armed.
// Prints one line per change of Activation and `bar-follows-activation: … passed` at the end.
import assert from 'node:assert/strict'
import {bootSlice} from './atlas-dom.mjs'
const {w}=bootSlice(process.argv[2]??'BATTLE-SANDBOX.html',{search:'?play=encounter.opening.orphanage'}),h=w.__sandbox
const V=()=>h.viewer._V,ctx=()=>h.session.ctx,unit=id=>ctx().state.units[id]
const say=(...a)=>console.log('  '+a.join(' '))
const rows=()=>V().dom.actionbar.querySelectorAll('.acRow').filter(r=>r.dataset.act)
const bar=()=>rows().map(r=>r.dataset.act).sort()
const portrait=()=>V().dom.root.querySelector('#unitPortrait')
const card=()=>portrait().style.display==='none'?null:portrait().querySelector('img').getAttribute('src')
const cardOf=id=>V().data.ASSETS[V().data.ARTMAP[unit(id).typeId]?.card]??null
const sheet=id=>[...unit(id).actions].sort()
const same=(a,b)=>a.length===b.length&&a.every((x,i)=>x===b[i])
/** every unit type whose card this is, and every unit type whose actions the bar's buttons are */
const cardTypes=()=>{const c=card();return c===null?null:new Set(ctx().state.units.filter(u=>cardOf(u.id)===c).map(u=>u.typeId))}
const barTypes=()=>{const b=bar();return new Set(ctx().state.units.filter(u=>same(sheet(u.id),b)).map(u=>u.typeId))}
/** the card and the bar are one unit's — at this very moment, whatever is playing */
function together(when){
 const c=cardTypes(),b=barTypes();if(c===null||!bar().length)return
 assert.ok([...c].some(t=>b.has(t)),`${when}: the card is ${[...c].join('/')||'nobody'}'s and the bar is ${[...b].join('/')||'nobody'}'s (${bar().join(', ')})`)
}
/** the board plays by its own clock until it is still; the card and the bar are checked at every tick on the way */
function settle(when){
 together(when+', at once')
 for(let i=0;i<8000&&(h.busy||i<3);i++){w._flush(20);together(`${when}, ${i*20} ms on`)}
 assert.equal(h.busy,false,'the board settles');assert.equal(h.fault,'','no fault')
}
/** the bar, the card and the stamina are the activated unit's; as its Activation begins (fresh) its basic move is armed */
function follows(when,id,fresh=true){
 const u=unit(id)
 assert.deepEqual([ctx().battleCursor.at,ctx().battleCursor.actor],['acting',id],`${when}: ${u.name} is the one acting`)
 assert.deepEqual(bar(),sheet(id),`${when}: the bar's buttons are ${u.name}'s own moves, attacks and powers`)
 assert.equal(card(),cardOf(id),`${when}: the card beside the bar is ${u.name}'s`)
 const stam=V().dom.stambar.querySelector('.num');if(u.maxStamina)assert.equal(stam?.textContent,`${u.stamina} / ${u.maxStamina}`,`${when}: the stamina strip is ${u.name}'s`)
 const move=u.actions.find(a=>ctx().actions[a]?.move)
 assert.equal(V().play.actor,id)
 if(fresh){assert.equal(V().play.slot,move,`${when}: its basic move is armed`)
  const lit=rows().filter(r=>r.className.split(' ').includes('playChosen')).map(r=>r.dataset.act)
  assert.deepEqual(lit,[move],`${when}: its basic move is the one lit on the bar`)}
 const sw=V().dom.stambar.querySelectorAll('.swBtn').length
 assert.equal(sw,V().play.swap?V().play.swap.choices.length:0,`${when}: the swap strip is ${u.name}'s`)
 say(`${when}: ${u.name} — ${bar().length} buttons, card and stamina its own${fresh?`, ${move} armed`:''}`)
}
const hexBtn=x=>V().dom.stage.querySelectorAll('.playHex').find(n=>+n.dataset.hex===x)
const chip=id=>V().dom.rail.querySelectorAll('.railchip').find(c=>+c.dataset.i===id)
const endActivation=()=>V().dom.root.querySelector('#playEndAct').handlers.click({})
const walk=()=>{const dest=V().play.reach[0];hexBtn(dest).handlers.click({detail:1});hexBtn(dest).handlers.click({detail:2})}

settle('the battle opens')
const heroes=ctx().state.units.filter(u=>u.side==='hero').map(u=>u.id).sort((a,b)=>a-b)
assert.ok(heroes.length>=4,'the Orphanage fields heroes and civilians')
assert.ok(new Set(heroes.slice(0,3).map(id=>sheet(id).join())).size===3,'the first three player units have different bars')
// 1. Turn 1 opens on the first unit
follows('1 Turn 1 opens',heroes[0])
// 2. the first hero moves, then End activation: before any other click the bar is the next unit's
walk();settle('the first hero walks');follows('2 after its walk',heroes[0],false)
endActivation();settle('End activation after a walk')
follows('3 End activation, nothing clicked since',heroes[1])
// 3. End activation by a unit that did nothing
endActivation();settle('End activation by a unit that did nothing')
follows('4 End activation again',heroes[2])
// 4. a double-click on another un-acted unit while this one has done nothing: switched (viewer.turn-taking point 4)
const last=heroes.at(-1)
chip(last).handlers.dblclick({});settle('a double-click switch')
follows('5 a double-click on '+unit(last).name,last)
// 5. it ends; the next un-acted unit, left to right, is the one switched away from
endActivation();settle('End activation after the switch')
follows('6 End activation after the switch',heroes[2])
// 6. End Turn: the next Hero Phase opens on the first unit again, whoever the bar was last
const turn0=ctx().state.turn
V().dom.root.querySelector('#playEndTurn').handlers.click({})
if(V().dom.root.querySelector('#playAsk').style.display!=='none')V().dom.root.querySelector('#playAskYes').handlers.click({})
settle('End Turn, the Enemy Phase and the next Hero Phase')
assert.ok(!ctx().state.outcome,'the battle goes on');assert.equal(ctx().state.turn,turn0+1)
const alive=()=>heroes.filter(id=>unit(id).lifeState==='standing')
follows(`7 Turn ${ctx().state.turn}'s Hero Phase opens`,alive()[0])
// 7. every unit in turn through this Hero Phase: each change of Activation, read at once
let n=0
for(const id of alive().slice(1)){endActivation();settle('End activation, Turn '+ctx().state.turn);follows(`8.${++n} End activation`,id)}
console.log('bar-follows-activation: the Orphanage on the built sandbox, the expect line passed')
