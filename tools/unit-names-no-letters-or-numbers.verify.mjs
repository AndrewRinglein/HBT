// viewer.unit-names-no-letters-or-numbers (engine DECISIONS.md 2026-10-05 'no unit is shown with a number or a letter', Andrew:
// "None of the player units or enemy units should have numbers or letters. ... it shouldn't be Soldier A or Lumberjack 1 or
// Pyrowitch A. ... It's fine for the zombies just to be zombie, zombie, zombie, zombie."). The item's expect, on the BUILT
// sandbox (BATTLE-SANDBOX.html?play=encounter.opening.orphanage): every unit the ENGINE fielded still carries the engine's own
// name, mark and all (it is tracked as before), and everywhere the screen names it the mark is gone - under the unit, on its
// top card, in its panel, in the log the button opens, and in the notes the play layer writes (a refused switch).
// Prints one line per reading and `unit-names-no-letters-or-numbers: ... passed`.
import assert from 'node:assert/strict'
import {bootSlice} from './atlas-dom.mjs'
import {shownName} from '../../viewer/src/names.js'
const {w}=bootSlice(process.argv[2]??'BATTLE-SANDBOX.html',{search:'?play=encounter.opening.orphanage'}),h=w.__sandbox
const V=()=>h.viewer._V,ctx=()=>h.session.ctx
const say=(...a)=>console.log('  '+a.join(' '))
const settle=()=>{for(let i=0;i<8000&&(h.busy||i<3);i++)w._flush(20);assert.equal(h.busy,false,'the board settles');assert.equal(h.fault,'','no fault')}
const text=x=>String(x??'').replace(/<[^>]*>/g,' ').replace(/&nbsp;/g,' ').replace(/&#39;/g,"'").replace(/&amp;/g,'&').replace(/\s+/g,' ')
const MARKED=/ (?:[A-Z]|\d+)$/
const chip=id=>V().dom.rail.querySelectorAll('.railchip').find(c=>+c.dataset.i===id)
settle()
// 1. the engine's own names are what they were: every unit marked, the Zombies numbered
const units=ctx().state.units
assert.ok(units.length>=4);for(const u of units)assert.match(u.name,MARKED,'the engine names its unit with a mark: '+u.name)
const zombies=units.filter(u=>u.typeId==='unit.zombie');assert.ok(zombies.length>=1,'the Orphanage opens on a Zombie');assert.deepEqual(zombies.map(u=>u.name),zombies.map((_,k)=>'Zombie '+(k+1)))
// 2. the screen: under the unit, on its top card, in its panel
let labels=0
for(const u of units){
 const plain=shownName(u.name);assert.ok(!MARKED.test(plain),plain);assert.notEqual(plain,u.name)
 assert.equal(V().S.U[u.id].name,plain,`${u.name}: the board's roster`)
 h.viewer.inspect(u.id)
 assert.equal(V().dom.panel.querySelector('.pName').textContent,plain,`${u.name}: its panel`)
 const c=chip(u.id);if(c)assert.equal(c.getAttribute('title'),plain,`${u.name}: its top card`)
 const E=V().layers.UEL.get(u.id);if(E&&E.name.style.display!=='none'&&E.name.textContent){assert.equal(E.name.textContent,plain,`${u.name}: the label under it`);labels++}
}
h.viewer.inspect(null)
assert.ok(labels>=units.length-1,'the labels under the units were read: '+labels)
for(const z of zombies)assert.equal(V().S.U[z.id].name,'Zombie')
say(`${units.length} units: ${[...new Set(units.map(u=>shownName(u.name)))].join(', ')} - no mark on the board, the top cards or the panel`)
// 3. the notes the play layer writes: a double-click on an enemy's card is refused in a line that names it plainly
const foe=zombies[0],c=chip(foe.id);assert.ok(c,'the Zombie has a top card')
c.handlers.click({detail:1});c.handlers.click({detail:2});c.handlers.dblclick({});settle()
assert.equal(V().dom.playNote.textContent,'Zombie is not yours to command.')
say(`a refused switch reads "${V().dom.playNote.textContent}"`)
// 4. the log the button opens: no line names a unit with its mark
const page=text(V().dom.root.innerHTML)
for(const u of units)assert.ok(!new RegExp('(^|[^A-Za-z])'+u.name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'($|[^0-9A-Za-z])').test(page),`the screen still says "${u.name}"`)
say('nothing on the battle screen names a unit with its mark')
console.log(`unit-names-no-letters-or-numbers: the built sandbox (the Orphanage, ${units.length} units), the expect line passed`)
