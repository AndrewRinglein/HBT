// viewer.bar-shows-every-effect (engine DECISIONS.md 2026-10-03 'the action bar: the moves grey slightly once the move is done,
// nothing else greys; every action shows all it does; the Soldier holds no sword', Andrew: "some of the information and some of
// the actions are missing. For example, a dagger giving you one protection is not shown in the dagger attack."). The item's
// expect, on the BUILT sandbox (BATTLE-SANDBOX.html?play=encounter.opening.orphanage): "In a sandbox battle a hero holding a
// dagger sees 'gain 1 Protection' on its Stab; ... no action on the engine's sheet missing from the bar and no trigger or
// effect of an action missing from its button or tooltip". Each of the player's units is activated in turn (End Activation,
// as the player does) and its bar is read against the ENGINE's own unit: every action id it holds is a button, and every
// trigger it carries that rides an attack (an attacker's hook, unscoped or scoped to that attack) is said on that button's
// tooltip — by its hook, its status and its amount. The roster-wide audit is the viewer's (viewer tools/bar-audit.mjs).
// Prints one line per unit and `bar-shows-every-effect: … passed`.
import assert from 'node:assert/strict'
import {bootSlice} from './atlas-dom.mjs'
const {w}=bootSlice(process.argv[2]??'BATTLE-SANDBOX.html',{search:'?play=encounter.opening.orphanage'}),h=w.__sandbox
const V=()=>h.viewer._V,ctx=()=>h.session.ctx,unit=id=>ctx().state.units[id]
const say=(...a)=>console.log('  '+a.join(' '))
const settle=()=>{for(let i=0;i<8000&&(h.busy||i<3);i++)w._flush(20);assert.equal(h.busy,false,'the board settles');assert.equal(h.fault,'','no fault')}
const text=x=>String(x??'').replace(/&#39;/g,"'").replace(/&quot;/g,'"').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&')
const rows=()=>V().dom.actionbar.querySelectorAll('.acRow').filter(r=>r.dataset.act)
const HOOK={onAttack:'On attack',onBlock:'On block',onMiss:'On miss',onHit:'On hit',onCrit:'On crit',onDamage:'On damage',onKill:'On kill'}
settle()
const mine=ctx().state.units.filter(u=>u.side==='hero'&&u.lifeState==='standing').length
const seen=new Set();let stab=0
for(let turn=0;turn<12&&seen.size<mine;turn++){
 const c=ctx().battleCursor;assert.equal(c.at,'acting','a player unit is acting')
 const u=unit(c.actor);assert.equal(u.side,'hero');assert.equal(V().play.actor,u.id)
 if(seen.has(u.id))break
 seen.add(u.id)
 const drawn=Object.fromEntries(rows().map(r=>[r.dataset.act,text(r.getAttribute('title'))]))
 // 1. every action on the engine's unit is a button, and the bar draws nothing else
 assert.deepEqual(Object.keys(drawn).sort(),[...new Set(u.actions)].sort(),`${u.name}: the bar's buttons are the engine's list of its actions`)
 // 2. each button's tooltip is the whole of the action: its name, and every trigger of the unit that rides it
 let riders=0
 for(const id of u.actions){const a=ctx().actions[id],tip=drawn[id]
  assert.ok(tip.includes(a.name),`${u.name} ${id}: the tooltip names ${a.name}`)
  if(!a.attack)continue
  for(const t of u.triggers){
   if(!HOOK[t.hook]||(t.onlyWithAttack&&t.onlyWithAttack!==id)||t.role==='defender')continue
   riders++
   assert.ok(tip.includes(HOOK[t.hook]+':'),`${u.name} ${a.name}: ${t.id} (${t.hook}) is said — "${tip}"`)
   if(t.effect.statusId)assert.ok(tip.includes(ctx().statuses[t.effect.statusId].name),`${u.name} ${a.name}: ${t.id} names ${t.effect.statusId} — "${tip}"`)
   if(typeof t.effect.value==='number')assert.match(tip,new RegExp('(^|[^0-9])'+Math.abs(t.effect.value)+'($|[^0-9])'),`${u.name} ${a.name}: ${t.id} says ${t.effect.value}`)
  }
 }
 // 3. the Dagger: its holder sees 'gain 1 Protection' on its Stab, on the button (a chip) and whole in the tooltip
 if(u.actions.includes('attack.dagger.stab')){
  const t=u.triggers.find(x=>x.onlyWithAttack==='attack.dagger.stab');assert.ok(t,'the engine: the Dagger brought its trigger');assert.deepEqual({...t.effect},{kind:'status.apply',statusId:'status.protection',value:1})
  assert.match(drawn['attack.dagger.stab'],/On attack: gain 1 Protection/)
  const row=rows().find(r=>r.dataset.act==='attack.dagger.stab'),chips=row.querySelectorAll('.acTrg').map(x=>x.textContent)
  assert.ok(chips.some(x=>/Protection\s*1/.test(x)),`the Stab's button carries a Protection 1 chip: ${chips.join(' | ')}`)
  stab++;say(`${u.name}: its Stab reads "On attack: gain 1 Protection"`)
 }
 say(`${u.name}: ${u.actions.length} actions on the engine's sheet, ${Object.keys(drawn).length} buttons, ${riders} riding trigger(s) said`)
 V().dom.root.querySelector('#playEndAct').handlers.click({});settle()
}
assert.equal(seen.size,mine,'every unit on the player\'s side was activated: the party and both civilians');assert.ok(stab>=2,'both civilians hold a dagger')
console.log(`bar-shows-every-effect: the Orphanage on the built sandbox (${seen.size} units, ${stab} holding a dagger), the expect line passed`)
