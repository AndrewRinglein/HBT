// viewer.enemy-type-moves-together (engine DECISIONS.md 2026-10-03 'the post's twelve questions answered' and 'Back Flip's rules;
// enemies only move together; the motion work comes first', Andrew: "During the enemy turn I would like for all of the
// enemies of a type to move at the same time. … we're just displaying it as if they're all moving at the same time." /
// "functionally it should be exactly the same."). On the BUILT sandbox (BATTLE-SANDBOX.html?play=encounter.opening.bridge —
// battle 3: Imps on the board, more and Fire Imps arriving) the heroes stand idle and the page's own End Turn plays each
// Enemy Phase by the board's own clock. After every phase the board is read against the ENGINE's own battle — every unit's
// hex, Health and life — the log the board holds against the engine's log, line for line; and what the board showed is read
// from the viewer's own record: the Imps' walks launched together, each type gathered whole.
// Prints one line per Turn and `enemy-type-moves-together: … passed`.
import assert from 'node:assert/strict'
import {bootSlice} from './atlas-dom.mjs'
const {w}=bootSlice(process.argv[2]??'BATTLE-SANDBOX.html',{search:'?play=encounter.opening.bridge'}),h=w.__sandbox
const V=()=>h.viewer._V,ctx=()=>h.session.ctx,$=id=>V().dom.root.querySelector('#'+id)
const say=(...a)=>console.log('  '+a.join(' '))
const settle=()=>{for(let i=0;i<60000&&(h.busy||i<3);i++)w._flush(20);assert.equal(h.busy,false,'the board settles');assert.equal(h.fault,'','no fault')}
function endTurn(){
 const end=$('playEndTurn');assert.ok(end&&end.getAttribute('aria-disabled')==='false','End Turn may be given')
 end.handlers.click({});const ask=$('playAsk'),yes=$('playAskYes');if(yes&&ask&&ask.style.display!=='none')yes.handlers.click({})
 settle()
}
/** the board against the engine's battle: every unit where the engine has it, as the engine has it; the same log */
function sameAsEngine(when){
 const S=V().S,units=ctx().state.units
 assert.equal(Object.keys(S.U).length,units.length,when+': the same units')
 for(const u of units){const b=S.U[u.id];assert.ok(b,when+': '+u.name+' is on the board')
  assert.equal(b.hex,u.hex,`${when}: ${u.name} stands on the engine's hex`);assert.equal(b.hp,u.hp,`${when}: ${u.name}'s Health`);assert.equal(b.life,u.lifeState,`${when}: ${u.name}'s life`)}
 const mine=h.viewer.events,theirs=ctx().events
 assert.equal(mine.length,theirs.length,when+': the board holds the engine\'s whole log');assert.equal(h.viewer.cursor,theirs.length,when+': and has shown all of it')
 for(let i=0;i<theirs.length;i++)if(mine[i].seq!==theirs[i].seq||mine[i].type!==theirs[i].type)assert.fail(`${when}: line ${i} of the board's log is not the engine's`)
}
settle();sameAsEngine('the battle opens')
assert.equal(V().together.on,true,'the battle screen gathers the enemies by type')
let together=0,groupsSeen=new Set(),runsBefore=0
for(let n=0;n<4&&!ctx().state.outcome;n++){
 const turn=ctx().state.turn,logFrom=V().together.log.length
 endTurn();sameAsEngine('after Turn '+turn+'\'s Enemy Phase')
 const runs=V().together.runs.slice(runsBefore);runsBefore=V().together.runs.length
 for(const r of runs){assert.equal(r.landed,true,`Turn ${turn}: the run ended on the engine's own state`)
  /* each type gathered whole: no type appears in two groups of a run */
  assert.equal(new Set(r.groups.map(g=>g.typeId)).size,r.groups.length,'each type is one group')}
 const walks=V().together.log.slice(logFrom).filter(s=>s.kind==='walks')
 for(const g of walks){assert.ok(g.actors.length>=2,'a group that moves together is two or more');assert.ok(g.actors.every(id=>ctx().state.units[id].typeId===g.typeId),'all of one type')
  assert.ok(g.launched.every(l=>l.clock===g.clock),'their walks begin at the same moment');together+=g.launched.length;groupsSeen.add(g.typeId)}
 say(`Turn ${turn}: ${runs.length?runs.map(r=>r.groups.map(g=>`${g.actors.length} ${g.typeId.replace('unit.','')}${g.together?' together':''}`).join(', ')).join(' | '):'no group of two'} — ${walks.map(g=>g.launched.length+' walks at once').join(', ')||'nothing walked together'}; the board is the engine's battle`)
}
assert.ok(together>=2,'enemies of one type were shown walking at the same time');assert.ok(groupsSeen.size>=1)
console.log('enemy-type-moves-together: the Enemy Phase is shown by type and the board stays the engine\'s battle on the built sandbox — passed')
