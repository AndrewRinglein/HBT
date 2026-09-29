// kingdom.encounter-battles (engine, 2026-09-28): the BUILT sandbox plays an engine encounter from its
// battle screen — the Encounter control fields the encounter's own map, units, schedule and civilians;
// only the heroes are offered to the player; the Turn 4 and Turn 5 arrivals come; a marked fall shows
// until it lands; save/resume keeps the schedule; the encounter's outcome ends the battle.
import assert from 'node:assert/strict'
import {bootSlice} from './atlas-dom.mjs'
const {w,root,click}=bootSlice(process.argv[2]??'BATTLE-SANDBOX.html'),handle=w.__sandbox
const select=(id,value)=>{const el=w.document.getElementById(id);el.value=value;el.handlers.change()}
const events=()=>JSON.stringify(handle.session.ctx.events)
const ready=()=>{if(handle.busy)click('skip');const c=handle.session.ctx.battleCursor;if(c.at==='selecting'){const el=w.document.getElementById('actor');el.handlers.change();click('select')}if(handle.busy)click('skip')}
const passUntil=turn=>{for(let n=0;n<400&&!handle.session.ctx.state.outcome&&handle.session.ctx.state.turn<turn;n++){ready();if(!handle.session.ctx.state.outcome&&handle.session.ctx.state.turn<turn)click('end')}if(handle.busy)click('skip')}

select('encounter','encounter.opening.orphanage')
assert.ok(w.document.getElementById('map').disabled,'an encounter brings its own battlefield')
assert.match(w.document.getElementById('setup').textContent,/fields its own enemies/)
click('start');assert.ok(handle.viewer)
const ctx=()=>handle.session.ctx
assert.equal(ctx().events.find(e=>e.type==='map.loaded').mapId,'map.opening.orphanage')
assert.deepEqual([ctx().state.board.width,ctx().state.board.height],[20,14])
const heroes=handle.session.policy.humanUnitUids,civilians=ctx().state.units.filter((u,i)=>u.side==='hero'&&i>=heroes.length)
assert.deepEqual(civilians.map(u=>u.typeId).sort(),['hero.fixed.orphans','hero.fixed.school-teacher'])
const offered=[...w.document.getElementById('actor').children].map(o=>Number(o.getAttribute('value')))
assert.ok(offered.length>0&&offered.every(uid=>heroes.includes(uid)),'only the heroes are offered to the player')
passUntil(3);click('save');const saved=w.document.getElementById('transferText').value,at3=events()
assert.equal(JSON.parse(saved).config.encounterId,'encounter.opening.orphanage')
passUntil(6)
const arrivals=t=>ctx().events.filter(e=>e.type==='unit.enter'&&e.turn===t).map(e=>e.typeId)
assert.deepEqual([arrivals(4),arrivals(5)],[['unit.zombie'],['unit.zombie']],'the Turn 4 and Turn 5 Zombies arrive')
for(const c of civilians)assert.ok(ctx().events.some(e=>e.type==='activation.begin'&&e.actor===c.id),c.typeId+' acts on its own')
const onward=events()
click('resume');assert.equal(events(),at3,'resume restores the Turn 3 save');passUntil(6);assert.equal(events(),onward,'the resumed battle keeps the schedule')
for(let n=0;n<400&&!ctx().state.outcome;n++){ready();if(!ctx().state.outcome)click('end')}
if(handle.busy)click('skip');assert.ok(ctx().state.outcome);assert.match(root.textContent,/Battle complete/)

select('encounter','encounter.opening.cavern-trail');click('start')
assert.equal(ctx().events.find(e=>e.type==='map.loaded').mapId,'map.opening.cavern-trail')
passUntil(5)
assert.equal(ctx().state.outcome,null,'the heroes stand at Turn 5')
assert.match(w.document.getElementById('markedAreas').textContent,/Marked to fall after Turn 5's Player Phase \(trigger\.cavern-trail\.meteor-fall\)/)
passUntil(6)
assert.equal(ctx().state.outcome,null,'the heroes stand at Turn 6')
assert.equal(w.document.getElementById('markedAreas'),null,'the areas have landed')
select('encounter','');assert.equal(w.document.getElementById('map').disabled,false,'a free battle chooses its battlefield again')
console.log('sandbox encounters: encounter control, its own map and units, heroes-only choices, civilians on their own, Turn 4/5 arrivals, save/resume schedule, outcome, marked fall areas until landing passed')
