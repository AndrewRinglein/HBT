// viewer.panel-area-trigger-text (engine DECISIONS.md 2026-10-04 'the Poison Imp, the Balrog and the four caster-centred class
// powers skip their owner too', its last line: the unit panel prints an area trigger's target as "[object Object]"). The item's
// expect, on the BUILT sandbox: "In BATTLE-SANDBOX.html?play=encounter.opening.bridge the Fire Imp's panel reads its
// end-of-Activation burn's target in words ('every other unit within 2 hexes'), and no unit's panel shows '[object Object]'; a
// page test reads every opening unit's panel for that string and finds none." Each of the six opening battles is opened as the
// page opens it (the Bridge a Turn on, when its Fire Imp has arrived), every unit on its board is clicked, and its panel and the action bar are read; a trigger whose target is the
// engine's Targeting row (ctx.units' own triggers) must be said in words. Prints one line per battle and
// `panel-area-trigger-text: … passed`.
import assert from 'node:assert/strict'
import {bootSlice} from './atlas-dom.mjs'
const PAGE=process.argv[2]??'BATTLE-SANDBOX.html'
const say=(...a)=>console.log('  '+a.join(' '))
const text=x=>String(x??'').replace(/<[^>]*>/g,' ').replace(/&#39;/g,"'").replace(/&amp;/g,'&').replace(/\s+/g,' ')
const seen=new Set()
for(const name of ['orphanage','lumberjack','bridge','cavern-trail','gates','cathedral']){
 const {w}=bootSlice(PAGE,{search:'?play=encounter.opening.'+name}),h=w.__sandbox
 const V=()=>h.viewer._V,ctx=()=>h.session.ctx
 const settle=()=>{for(let i=0;i<8000&&(h.busy||i<3);i++)w._flush(20);assert.equal(h.busy,false,'the board settles');assert.equal(h.fault,'','no fault')}
 settle()
 // the Bridge's Fire Imp arrives at the Start of Turn 2 (the encounter's schedule): the player ends Turn 1 with nobody acting
 if(name==='bridge'){assert.ok(!ctx().state.units.some(u=>u.typeId==='unit.fire-imp'),'no Fire Imp on Turn 1')
  V().dom.root.querySelector('#playEndTurn').handlers.click({});const ask=V().dom.root.querySelector('#playAsk');if(ask&&ask.style.display!=='none')V().dom.root.querySelector('#playAskYes').handlers.click({})
  settle();assert.equal(ctx().state.turn,2)}
 const units=ctx().state.units.filter(u=>V().layers.UEL.get(u.id)&&u.lifeState!=='dead')
 assert.ok(units.length>=4,`${name}: units on the board`)
 for(const u of units){
  V().layers.UEL.get(u.id).img.handlers.click({detail:1});settle();assert.equal(V().view.inspectId,u.id,`${u.name} is the unit looked at`)
  const panel=V().dom.panel.innerHTML,bar=V().dom.actionbar.innerHTML
  assert.ok(panel.includes(u.name));assert.ok(!panel.includes('[object Object]'),`${name}: ${u.name}'s panel prints an object as a string: ${text(panel).match(/.{0,50}\[object Object\].{0,20}/)}`)
  assert.ok(!bar.includes('[object Object]'),`${name}: the action bar prints an object as a string while ${u.name} is looked at`)
  // the engine's own rows for this unit: a trigger aimed by a Targeting row is said in words
  const area=(u.triggers??[]).filter(t=>typeof t.select==='object')
  for(const t of area)assert.match(text(panel),/→ (every|one) /,`${u.name} ${t.id}: its target in words`)
  if(u.typeId==='unit.fire-imp'){
   const t=area.find(x=>x.hook==='onActivationEnd');assert.ok(t,'the Fire Imp burns at the end of its Activation');assert.deepEqual({...t.select},{select:'area',side:'any',radius:2,origin:'self',excludeSelf:true})
   assert.match(text(panel),/ACTIVATION END Burn 1 → every other unit within 2 hexes/)
   say(`${name}: ${u.name}'s panel reads "Burn 1 → every other unit within 2 hexes"`)
  }
  seen.add(u.typeId)
 }
 assert.ok(!text(w.document.body.innerHTML).includes('[object Object]'),`${name}: nothing on the page prints an object as a string`)
 say(`${name}: ${units.length} units' panels read, none prints an object as a string`)
}
assert.ok(seen.has('unit.fire-imp'),'the Bridge fields the Fire Imp')
console.log(`panel-area-trigger-text: the six opening battles on the built sandbox (${seen.size} unit types), the expect line passed`)
