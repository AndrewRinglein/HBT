// viewer.unit-card-bar (engine DECISIONS.md 2026-10-01, Andrew: "We also need a character selector bar above the screen … You
// have all the heroes and enemies as tiny little cards above the screen. … And I can use that to target things as well as
// clicking on them."). The BUILT sandbox, battle 1: the strip of every unit's card sits in the battle's top bar; clicking the
// card of the hero proposed to act begins its activation; double-clicking another hero's card makes it the next; with an
// attack chosen, clicking an enemy's card leaves the plan exactly as clicking its body does.
import assert from 'node:assert/strict'
import {bootSlice} from './atlas-dom.mjs'
const {w,click}=bootSlice(process.argv[2]??'BATTLE-SANDBOX.html',{search:'?play=encounter.opening.orphanage'}),handle=w.__sandbox
const V=()=>handle.viewer._V,ctx=()=>handle.session.ctx
const settle=()=>{if(handle.busy)click('skip');assert.equal(handle.busy,false)}
const card=id=>V().dom.rail.querySelectorAll('.railchip').find(c=>+c.dataset.i===id)
/* Law 10, viewer.turn-taking (engine DECISIONS.md 2026-10-03 'a hero starts its Activation with its basic move armed', 'the
   battle screen's turn-taking, ruled'; kingdom SWITCHES playQueueProposal, playQueueClick overturned; viewer SWITCHES railOrder
   overturned by turnRailDivider): the first hero is BEGUN when the board settles (was: selecting, the hero proposed); the cards
   are the heroes, a divider, then the enemies (was: every unit ascending); a double-click on another hero's card switches to
   it while the first has done nothing (was: makes it the next, looked at, and a click on its card began it) */
settle();assert.equal(ctx().battleCursor.at,'acting')
const ids=V().dom.rail.querySelectorAll('.railchip').map(c=>+c.dataset.i),side=id=>ctx().state.units[id].side==='hero'?0:1
assert.deepEqual(ids,ctx().state.units.map(u=>u.id).sort((a,b)=>side(a)-side(b)||a-b),'every unit\'s card: the heroes, then the enemies, each in the board\'s order')
assert.ok(V().dom.root.querySelector('#topbar #rail'),'in the battle\'s top bar, above the board')
// a double-click on another hero's card switches to it while the first has done nothing; a click on its card is the click on it
const proposed=ctx().battleCursor.actor,heroes=ctx().state.units.filter(u=>u.side==='hero'&&u.lifeState==='standing'),other=heroes.find(u=>u.id!==proposed)
card(other.id).handlers.dblclick({});settle()
assert.equal(ctx().battleCursor.at,'acting');assert.equal(ctx().battleCursor.actor,other.id,'double-clicking its card switched to it')
card(other.id).handlers.click({});settle()
assert.equal(ctx().battleCursor.at,'acting');assert.equal(ctx().battleCursor.actor,other.id,'clicking its card keeps it acting')
// an attack chosen: an enemy's card does to the plan exactly what its body does
const me=ctx().state.units[other.id],attack=me.actions.find(a=>ctx().actions[a]?.kind==='attack')??me.actions.find(a=>/^attack\./.test(a))
assert.ok(attack,'the hero has an attack to choose')
const row=V().dom.actionbar.querySelectorAll('.acRow').find(r=>r.dataset.act===attack);row.handlers.click({});settle()
const foes=ctx().state.units.filter(u=>u.side==='enemy'&&u.lifeState==='standing'),targets=V().play.targets||[]
const enemy=foes.find(u=>targets.includes(u.hex))??foes[0]
const plan=()=>JSON.stringify(V().play),before=plan()
card(enemy.id).handlers.click({});settle();const byCard=plan()
// the same plan again — the aim the card took, taken back — then the body
/* Law 10, viewer.turn-taking (point 5: every refusal says why in one line): a card clicked out of reach now leaves the engine's
   refusal as the note, so the plan is compared without its note; was: if(byCard!==before) back, then plan() === before */
const noNote=x=>{const o=JSON.parse(x);delete o.note;return JSON.stringify(o)}
if(V().play.aim?.locked){V().offerPlay({kind:'back'});settle()}
assert.equal(noNote(plan()),noNote(before),'back to the plan before the card')
V().layers.UEL.get(enemy.id).img.handlers.click({detail:1});settle();const byBody=plan()
assert.equal(byCard,byBody,'the card and the body leave the same plan')
console.log(`sandbox card bar: ${ids.length} cards in the top bar in the board's order; a double-clicked card switched to ${other.name}; with ${attack} chosen ${enemy.name}'s card (${targets.includes(enemy.hex)?'in reach: aimed':'out of reach'}) planned exactly as its body passed`)
