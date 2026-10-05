// kingdom.move-click-setting — ruled 2026-10-05 (Andrew, engine DECISIONS.md 'the battle screen must feel smooth: …; one click
// or two to move is a setting': "Actually, I guess for number 4, let's have a setting where it can be either way, so I can just
// play with it either way."). Two clicks is the default.
//
// On the BUILT battle screen (the page PLAY.html opens: BATTLE-SANDBOX.html?play=encounter.opening.orphanage), with the mouse,
// in one browser (one storage): the control beside 2× says "Move: 2 clicks"; a click on a hex in reach shows the ghost and
// walks nobody, the second click walks. The control pressed: it says "Move: 1 click", the browser keeps the choice, and one
// click on a hex walks the unit acting there. A hex whose path draws a free attack (the engine's forecast: the facts'
// provokes, read with the pointer on the hex) takes a second click — the first leaves the path and says why. The page
// reopened, and another battle opened, in the same browser: the control still says "Move: 1 click" and one click still walks.
// Pressed again it is two clicks again. Each walk is some unit of the player's whose turn it is — the Iron Dwarf where it can
// be, a civilian where the Dwarf has already moved: a unit walks once an Activation.
//
//   node tools/move-click-setting.verify.mjs [BATTLE-SANDBOX.html]
import assert from 'node:assert/strict'
import {bootSlice} from './atlas-dom.mjs'
import {board} from './lesson-play.mjs'
const page=process.argv[2]??'BATTLE-SANDBOX.html',ORPHANAGE='encounter.opening.orphanage',LUMBERJACK='encounter.opening.lumberjack',DWARF='hero.base.warrior-iron'
const say=(...a)=>console.log('  '+a.join(' '))
const browser=new Map()                                   /* one browser's storage, kept from page to page */
const STOP='This path draws a free attack: click the hex again to walk it.'

function open(encounter){
 const {w}=bootSlice(page,{search:`?play=${encounter}&heroes=${DWARF}`,store:browser}),h=w.__sandbox,B=board({handle:h,w})
 const {V,ctx}=B
 const unit=id=>ctx().state.units[id]
 const chip=id=>V().dom.rail.querySelectorAll('.railchip').find(c=>+c.dataset.i===id)
 const control=()=>V().dom.root.querySelector('#playMoveClick')
 const says=()=>{const c=control();assert.ok(c&&c.style.display!=='none','the setting\'s control is on the battle screen');return c.textContent.trim()}
 const walked=id=>ctx().events.filter(e=>e.type==='moved'&&e.actor===id).length
 const click=x=>{B.hexBtn(x).handlers.pointerenter({});B.hexBtn(x).handlers.click({detail:1});B.settle()}
 const nextTurn=()=>{const t=ctx().state.turn
  for(let i=0;i<8&&B.actor()&&ctx().state.turn===t&&!ctx().state.outcome;i++){if(V().play.endTurn&&V().play.endTurn.yetToAct.length===0)break;B.endActivation()}
  if(ctx().state.turn===t&&!ctx().state.outcome){B.endTurn();B.settle('the next Turn')}}
 /** the armed move's reach, each hex pointed at: those whose walk the engine forecasts a free attack on, and those it does not */
 const sorted=()=>{const risky=[],calm=[];if(!V().play||!ctx().actions[V().play.slot]?.move)return {risky,calm}
  for(const x of B.drawn('playReach')){B.hexBtn(x).handlers.pointerenter({});(V().play.provokes.length?risky:calm).push(x)}return {risky,calm}}
 /** a unit of the player's whose turn it is and whose reach holds a hex of the kind asked for ('calm' · 'risky') — the Dwarf
     first; begun with a double-click on its card as a player begins it; Turn after Turn until one is found */
 const someone=kind=>{
  for(let t=0;t<12&&!ctx().state.outcome;t++){
   B.settle()
   for(const u of ctx().state.units.filter(u=>u.side==='hero'&&u.lifeState==='standing').sort((a,b)=>(a.typeId===DWARF?0:1)-(b.typeId===DWARF?0:1)||a.id-b.id)){
    if(B.actor()?.id!==u.id){chip(u.id)?.handlers.dblclick({stopPropagation(){}});B.settle()}
    if(B.actor()?.id!==u.id)continue
    const hexes=sorted()[kind];if(hexes.length)return {unit:u,hexes}
   }
   nextTurn()
  }
  assert.fail('no unit of the player\'s had a '+kind+' hex in reach in twelve Turns')}
 return {w,h,B,V,ctx,unit,control,says,walked,click,nextTurn,someone}
}
const name=u=>u.name.replace(/ [A-Z]$| \d+$/,'')

/* ── the default: two clicks ── */
let P=open(ORPHANAGE),{B,V,ctx}=P
{const {unit:u,hexes}=P.someone('calm'),x=hexes[0],before=P.walked(u.id)
 assert.equal(u.typeId,DWARF,'the Iron Dwarf is the one acting');assert.equal(P.says(),'Move: 2 clicks','a browser that has kept nothing: two clicks');assert.equal(browser.get('hbt-move-click')??null,null)
 assert.equal(P.control().parentNode,V().dom.root.querySelector('#playSpeed').parentNode,'beside the speed button')
 P.click(x);assert.equal(P.walked(u.id),before,'two clicks: the first click walks nobody');assert.deepEqual(V().play.ghost,{unit:u.id,hex:x},'it shows the ghost')
 P.click(x);assert.ok(P.walked(u.id)>before,'the second click walks');say(`1 "Move: 2 clicks": the first click on hex ${x} showed the ghost, the second walked the ${name(u)} there`)}

/* ── changed in the middle of the battle: one click ── */
{const {unit:u,hexes}=P.someone('calm'),x=hexes[0],before=P.walked(u.id),seq=ctx().state.seq
 P.control().handlers.click({});B.settle()
 assert.equal(P.says(),'Move: 1 click','the control says the new way');assert.equal(browser.get('hbt-move-click'),'one','and the browser keeps it')
 assert.equal(B.actor()?.id,u.id,'changing the setting is no order: the same unit is acting');assert.equal(ctx().state.seq,seq,'and nothing happened in the battle')
 P.click(x);assert.ok(P.walked(u.id)>before,'one click: a single click walks')
 say(`2 the control pressed in the middle of the battle — "Move: 1 click", kept in the browser: a single click on hex ${x} walked the ${name(u)}`)}

/* ── a path that draws a free attack still takes its second click ── */
{const {unit:u,hexes}=P.someone('risky'),x=hexes[0],before=P.walked(u.id),at=P.unit(u.id).hex,events=ctx().events.length
 P.click(x)
 assert.equal(P.walked(u.id),before,'one click, but the path draws a free attack: nobody walks');assert.equal(P.unit(u.id).hex,at);assert.equal(ctx().events.length,events,'nothing happened in the battle')
 assert.deepEqual(V().play.ghost,{unit:u.id,hex:x},'the path stays');assert.ok(V().play.provokes.length>0,'the facts name where it provokes');assert.ok(B.drawn('playProvoke').length>0,'and the hexes it provokes on are marked on the board')
 assert.equal(V().play.note,STOP,'one line says why');assert.equal(V().dom.playNote.textContent,STOP,'on the screen')
 P.click(x)
 assert.ok(ctx().events.slice(events).some(e=>e.type==='aoo.provoked'&&e.target===u.id),'the second click on the same hex walked it, and the free attack came')
 say(`3 at one click a walk of the ${name(u)}'s that draws a free attack (hex ${x}) stopped for a second click — "${STOP}" — and the second click walked it`)}

/* ── the page reopened, and another battle, in the same browser ── */
P=open(ORPHANAGE);({B,V,ctx}=P)
{const {unit:u,hexes}=P.someone('calm'),before=P.walked(u.id);assert.equal(P.says(),'Move: 1 click','the page reopened: the choice was kept');P.click(hexes[0]);assert.ok(P.walked(u.id)>before,'and one click still walks')}
P=open(LUMBERJACK);({B,V,ctx}=P)
{const {unit:u,hexes}=P.someone('calm'),before=P.walked(u.id);assert.equal(P.says(),'Move: 1 click','the next battle: the choice was kept');P.click(hexes[0]);assert.ok(P.walked(u.id)>before,'one click walks there too')}
say('4 the page reopened and battle 2 opened in the same browser: "Move: 1 click" both times, and one click walked')
/* and back to two */
{const {unit:u,hexes}=P.someone('calm'),x=hexes[0],before=P.walked(u.id)
 P.control().handlers.click({});B.settle();assert.equal(P.says(),'Move: 2 clicks');assert.equal(browser.get('hbt-move-click'),'two')
 P.click(x);assert.equal(P.walked(u.id),before,'two clicks again: the first click walks nobody');P.click(x);assert.ok(P.walked(u.id)>before)}
say('5 pressed again: "Move: 2 clicks", and the first click only showed the ghost')
console.log('move-click-setting: on the built sandbox the control beside 2× said which way a move is made; at two clicks the first showed the ghost and the second walked; at one click a single click walked, and a walk that draws a free attack stopped for its second with the line saying why; the choice survived a reload and the next battle — passed')
