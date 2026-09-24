// V2 R6 swap UI (2026-09-24; COMBAT-V2 §11.2). The built sandbox offers a human-controlled
// hero the engine's swap: a list of the hands to hold afterwards and a Swap button naming the
// engine's swapCost. Choosing one and pressing Swap issues the engine command; the shared viewer
// folds loadout.swapped (the kit and the bar follow the hands). Once swapped, or after the
// primary action, the Swap control is disabled and says the engine's reason.
import assert from 'node:assert/strict'
import {bootSlice} from './atlas-dom.mjs'
import {buildLog} from '../../viewer/src/log.js'
const {w,root,click}=bootSlice(process.argv[2]??'BATTLE-SANDBOX.html'),h=w.__sandbox
const q=id=>w.document.getElementById(id)
const change=(id,value)=>{q(id).value=value;q(id).handlers.change()}
const optionValue=o=>o.getAttribute('value').replaceAll('&quot;','"').replaceAll('&amp;','&')
const swapButton=()=>root.els.find(e=>e.dataset.act==='swap')
while(root.querySelectorAll('[data-roster="heroes"]').length>1)click('hero-remove')
while(root.querySelectorAll('[data-roster="enemies"]').length>1)click('enemy-remove')
const hero=root.querySelectorAll('[data-roster="heroes"]')[0];hero.value='hero.base.paladin-hunk';hero.handlers.change()
const enemy=root.querySelectorAll('[data-roster="enemies"]')[0];enemy.value='unit.zombie';enemy.handlers.change()
change('map','showcase.atlas-priory');change('seed','1');click('start')
if(h.busy)click('skip')
// while a hero is being chosen there is no swap
assert.equal(h.session.ctx.battleCursor?.at,'selecting')
assert.equal(swapButton(),undefined,'no Swap while choosing a hero')
change('actor',String(h.session.policy.humanUnitUids[0]));click('select');if(h.busy)click('skip')
const actor=h.session.ctx.battleCursor.actor,u=()=>h.session.ctx.state.units[actor]
const [sword,shield]=u().loadout.hands.map(i=>i.instanceId)
// the offer: hands to hold afterwards, and the engine's cost on the button
const opts=q('swap').children.map(o=>JSON.parse(optionValue(o)))
assert.ok(opts.length>0,'the Swap list offers the engine-valid hand lists')
for(const c of opts)assert.equal(c.kind,'swap')
assert.match(swapButton().textContent,/1 stamina/,'the button names the engine swapCost')
assert.ok(!swapButton().disabled)
const keep=opts.find(c=>c.hands.length===1&&c.hands[0]===sword)
assert.ok(keep,'stowing the shield is offered')
change('swap',JSON.stringify(keep))
const stam=u().stamina,n=h.session.ctx.events.length
click('swap')
if(h.busy)click('skip')
const swapped=h.session.ctx.events.slice(n).find(e=>e.type==='loadout.swapped')
assert.ok(swapped,'the engine swapped')
assert.deepEqual(u().loadout.hands.map(i=>i.instanceId),[sword])
assert.equal(u().stamina,stam-1)
// the shared viewer followed: its unit's hands and stowed are the engine's, the shield's powers left the bar
const vu=h.viewer.state.U[actor]
assert.deepEqual(vu.hands.map(i=>i.instanceId),[sword]);assert.deepEqual(vu.stowed.map(i=>i.instanceId),[shield])
assert.ok(!vu.kit.items.includes('item.kite-shield'))
assert.equal(vu.stam,u().stamina)
const line=buildLog(JSON.parse(JSON.stringify(h.session.ctx.events)),{},h.session.ctx.state.turn).find(l=>l.i===h.session.ctx.events.indexOf(swapped))
assert.ok(line&&/swaps/.test(line.t),'the replay log names the swap')
// one swap per activation: the control stays, disabled, with the engine's reason
assert.ok(swapButton()?.disabled,'Swap is disabled once swapped')
assert.match(q('swapWhy').textContent,/swap of this activation is spent/)
// the activation goes on — the hero may still act
assert.ok(q('action').children.length>0)
h.viewer.dispose()
console.log(`sandbox swap: ${opts.length} engine-valid hand lists offered at 1 stamina; ${swapped.handsBefore.length} → ${swapped.handsAfter.length} in hand; viewer, log and the disabled second swap passed`)
