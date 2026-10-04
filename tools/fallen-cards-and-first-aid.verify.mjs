// viewer.fallen-cards-and-first-aid (engine DECISIONS.md 2026-10-03 'the cards above the battle: the fallen leave, a downed
// hero's card wears a first-aid mark', Andrew: "When an enemy goes down, they should no longer have their card above the
// battle. When a hero is dead, it's the same. When a hero is downed, their card on the battlefield should have a little first
// aid symbol in the upper right-hand corner." / "The hero card above the battle should show a first aid icon in the upper
// right-hand corner and the number of turns they have left."). On the BUILT sandbox
// (BATTLE-SANDBOX.html?play=encounter.opening.orphanage) the battle is played by the page's own End Turn with the heroes
// standing idle — no seed is sought, whatever the engine's dice give — and after every Turn the cards above the battle are
// read against the ENGINE's own units: a card for each unit of the heroes' side that is not dead and each other unit still
// standing, none for the fallen; a first-aid mark on exactly the downed, with the engine's own bleed-out count.
// Prints one line per Turn in which someone fell, and `fallen-cards-and-first-aid: … passed`.
import assert from 'node:assert/strict'
import {bootSlice} from './atlas-dom.mjs'
const {w}=bootSlice(process.argv[2]??'BATTLE-SANDBOX.html',{search:'?play=encounter.opening.orphanage'}),h=w.__sandbox
const V=()=>h.viewer._V,ctx=()=>h.session.ctx,$=id=>V().dom.root.querySelector('#'+id)
const say=(...a)=>console.log('  '+a.join(' '))
const settle=()=>{for(let i=0;i<20000&&(h.busy||i<3);i++)w._flush(20);assert.equal(h.busy,false,'the board settles');assert.equal(h.fault,'','no fault')}
const cards=()=>V().dom.rail.querySelectorAll('.railchip')
const card=id=>cards().find(c=>+c.dataset.i===id)
const shown=id=>!!card(id),marked=id=>!!card(id).querySelector('.railaid'),turns=id=>{const n=card(id).querySelector('.railaidNo');return n?+n.textContent:null}
/** the cards against the engine's battle, unit by unit */
function check(when){
 const units=ctx().state.units,want=units.filter(u=>u.side==='hero'?u.lifeState!=='dead':u.lifeState==='standing').map(u=>u.id).sort((a,b)=>a-b)
 assert.deepEqual(cards().map(c=>+c.dataset.i).sort((a,b)=>a-b),want,when+': a card for every unit that has not fallen, and no other')
 for(const u of units){
  if(!want.includes(u.id)){assert.ok(!shown(u.id),`${when}: ${u.name} (${u.lifeState}) has no card`);continue}
  const down=u.lifeState==='downed'
  assert.equal(marked(u.id),down,`${when}: ${u.name} (${u.lifeState}) ${down?'wears':'does not wear'} the first-aid mark`)
  if(down)assert.equal(turns(u.id),u.bleedOut>0?u.bleedOut:null,`${when}: ${u.name}'s card says the engine's bleed-out count`)
 }
 assert.ok(!cards().some(c=>c.className.split(' ').includes('gone')),'no card is greyed as gone')
 const sides=new Set(cards().map(c=>c.className.split(' ').includes('hero')?'hero':'other'))
 assert.equal(V().dom.rail.querySelectorAll('.railsep').length,sides.size===2?1:0,when+': the divider stands while both sides have a card')
}

settle();check('the battle opens')
const all=ctx().state.units.length
assert.equal(cards().length,all,'at the start every unit has its card')
let fallen=0,downedSeen=0,deadHero=0,deadOther=0,turn=ctx().state.turn
const state=()=>Object.fromEntries(ctx().state.units.map(u=>[u.id,u.lifeState]))
let before=state()
for(let n=0;n<40&&!ctx().state.outcome;n++){
 /* the heroes stand idle: End Turn, and "End Turn" again where the screen asks */
 const end=$('playEndTurn');if(!end||end.getAttribute('aria-disabled')!=='false')break
 end.handlers.click({});const yes=$('playAskYes');if(yes&&$('playAsk')&&$('playAsk').style.display!=='none')yes.handlers.click({})
 settle();check('Turn '+ctx().state.turn)
 const now=state(),changed=ctx().state.units.filter(u=>now[u.id]!==before[u.id])
 for(const u of changed){fallen++
  if(u.lifeState==='downed'){downedSeen++;say(`Turn ${ctx().state.turn}: ${u.name} is downed — its card stays, with the first-aid mark${u.bleedOut>0?' and '+u.bleedOut+' (the engine\'s bleed-out count)':''}`)}
  else if(u.lifeState==='dead'){u.side==='hero'?deadHero++:deadOther++;say(`Turn ${ctx().state.turn}: ${u.name} (${u.side}) is dead — its card is gone`)}}
 /* a downed unit's count as it ticks */
 for(const u of ctx().state.units.filter(u=>u.lifeState==='downed'&&!changed.includes(u)))if(u.bleedOut>0)say(`Turn ${ctx().state.turn}: ${u.name} still down — the card says ${turns(u.id)}`)
 before=now;turn=ctx().state.turn
}
assert.ok(fallen>=1,'with the heroes idle, someone fell');assert.ok(cards().length<all||downedSeen>0,'and the cards changed with it')
say(`the battle ${ctx().state.outcome?'ended '+ctx().state.outcome:'reached Turn '+turn}: ${deadHero} of the heroes' side dead and ${deadOther} others (no card), ${downedSeen} downed (card kept, first-aid mark); ${cards().length} of ${ctx().state.units.length} cards left`)
console.log('fallen-cards-and-first-aid: the cards above the battle follow the engine\'s units on the built sandbox — passed')
