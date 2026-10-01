// kingdom.encounter-battles (engine, 2026-09-28): the BUILT sandbox plays an engine encounter from its
// battle screen — the Encounter control fields the encounter's own map, units, schedule and civilians;
// only the heroes are offered to the player; the row's scheduled arrivals come; a marked fall shows
// until it lands; save/resume keeps the schedule; the encounter's outcome ends the battle.
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {bootSlice} from './atlas-dom.mjs'
const {w,root,click}=bootSlice(process.argv[2]??'BATTLE-SANDBOX.html'),handle=w.__sandbox
const select=(id,value)=>{const el=w.document.getElementById(id);el.value=value;el.handlers.change()}
const events=()=>JSON.stringify(handle.session.ctx.events)
// Law 10, viewer.play-chrome (2026-09-30): an encounter battle is played on the board alone — the hero dropdown, Activate
// hero and End activation are retired for the opening battles (PLAYABLE-OPENING-PLAN.md item 8) — so a Turn is passed with
// the battle screen's End Turn, its pop-up answered (engine end-player-phase: every hero yet to act forgoes and still runs
// its End of Activation ladder), instead of choosing and ending each hero; the heroes offered are the pop-up's list.
// was: const ready=()=>{if(handle.busy)click('skip');const c=handle.session.ctx.battleCursor;if(c.at==='selecting'){const el=w.document.getElementById('actor');el.handlers.change();click('select')}if(handle.busy)click('skip')}
// was: const passUntil=turn=>{for(let n=0;n<400&&!handle.session.ctx.state.outcome&&handle.session.ctx.state.turn<turn;n++){ready();if(!handle.session.ctx.state.outcome&&handle.session.ctx.state.turn<turn)click('end')}if(handle.busy)click('skip')}
const screen=id=>handle.viewer._V.dom.root.querySelector('#'+id),press=id=>screen(id).handlers.click({})
const settle=()=>{if(handle.busy)click('skip')}
const endTurn=()=>{settle();press('playEndTurn');if(screen('playAsk').style.display!=='none')press('playAskYes');settle()}
const passUntil=turn=>{for(let n=0;n<400&&!handle.session.ctx.state.outcome&&handle.session.ctx.state.turn<turn;n++)endTurn();settle()}

select('encounter','encounter.opening.orphanage')
assert.ok(w.document.getElementById('map').disabled,'an encounter brings its own battlefield')
assert.match(w.document.getElementById('setup').textContent,/fields its own enemies/)
click('start');assert.ok(handle.viewer)
const ctx=()=>handle.session.ctx
assert.equal(ctx().events.find(e=>e.type==='map.loaded').mapId,'map.opening.orphanage')
assert.deepEqual([ctx().state.board.width,ctx().state.board.height],[20,14])
// Law 10, kingdom.civilians-played (engine DECISIONS.md 2026-09-30 "the civilians are played"; Andrew: "There's no movement
// for the child when I click on it"; 2026-08-26 "Civilians are exactly like heroes"): the encounter's civilians are the
// player's, like the heroes — this asserted the old unrecorded rule ("only the heroes are offered to the player", "acts
// on its own"), rewritten as the ruled one: the player is offered every unit fielded on the heroes' side.
const players=handle.session.policy.humanUnitUids,civilians=ctx().state.units.filter(u=>u.side==='hero').slice(handle.session.config.heroes.length)
assert.deepEqual(civilians.map(u=>u.typeId).sort(),['hero.fixed.orphans','hero.fixed.school-teacher'])
assert.deepEqual([...players].sort((a,b)=>a-b),ctx().state.units.filter(u=>u.side==='hero').map(u=>u.uid).sort((a,b)=>a-b),'the player plays the heroes and the civilians')
const offered=handle.viewer._V.play.endTurn.yetToAct.map(id=>ctx().state.units[id].uid)   // was: [...w.document.getElementById('actor').children].map(o=>Number(o.getAttribute('value')))
assert.ok(offered.length>0&&offered.every(uid=>players.includes(uid)),'only the player\'s units are offered to the player')
for(const c of civilians)assert.ok(offered.includes(c.uid),c.typeId+' is offered to the player, as a hero is')
passUntil(3);click('save');const saved=w.document.getElementById('transferText').value,at3=events()
assert.equal(JSON.parse(saved).config.encounterId,'encounter.opening.orphanage')
passUntil(6)
const arrivals=t=>ctx().events.filter(e=>e.type==='unit.enter'&&e.turn===t).map(e=>e.typeId)
// Law 10, engine fix.opening-orphanage-lighter (2026-09-29): the Orphanage's arrivals are the row's to say
// (Andrew, engine DECISIONS.md 2026-09-28: "Let's remove an early zombie and a later zombie."), so each
// scheduled arrival is read from the encounter row and must come on its Turn — a rule, not the old count.
// was: assert.deepEqual([arrivals(4),arrivals(5)],[['unit.zombie'],['unit.zombie']],'the Turn 4 and Turn 5 Zombies arrive')
const schedule=JSON.parse(readFileSync('../content/gen/encounters.json','utf8')).authored.find(e=>e.id==='encounter.opening.orphanage').schedule
assert.ok(schedule.length>0,'the Orphanage schedules arrivals')
for(const s of schedule)assert.deepEqual(arrivals(s.phase),s.spawn.map(x=>x.unit),'the Turn '+s.phase+' arrivals come')
// was: for(const c of civilians)assert.ok(ctx().events.some(e=>e.type==='activation.begin'&&e.actor===c.id),c.typeId+' acts on its own')
for(const c of civilians)assert.ok(!ctx().events.some(e=>e.type==='move.begin'&&e.actor===c.id),c.typeId+' is not walked by the AI: End Turn forwent it, as it forgoes a hero')
const onward=events()
click('resume');assert.equal(events(),at3,'resume restores the Turn 3 save');passUntil(6);assert.equal(events(),onward,'the resumed battle keeps the schedule')
for(let n=0;n<400&&!ctx().state.outcome;n++)endTurn()   // was: {ready();if(!ctx().state.outcome)click('end')}
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
console.log('sandbox encounters: encounter control, its own map and units, the heroes and the civilians offered to the player, the scheduled arrivals, save/resume schedule, outcome, marked fall areas until landing passed')
