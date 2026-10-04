// viewer.swap-button-rearranges (engine DECISIONS.md 2026-10-03 'the swap button says "Swap" and opens a rearranging of the
// unit's gear', Andrew: "The button for swapping should say 'Swap'. And when you press it, it should give you the option to
// rearrange your gear." · "Just the ability to swap hands with inventory"). The item's expect, on the BUILT sandbox
// (BATTLE-SANDBOX.html?play=encounter.opening.orphanage): "a hero carrying a weapon and a shield shows one button reading
// 'Swap'; pressing it opens the gear panel with both hands and the carried items; choosing another arrangement and confirming
// sends the engine's swap and the bar, the body and the right panel show the new hands; cancelling changes nothing; a page
// test presses Swap, rearranges, and reads the unit's hands from the engine's state." The board plays by its own clock.
// Prints one line per step and `swap-button-rearranges: … passed`.
import assert from 'node:assert/strict'
import {bootSlice} from './atlas-dom.mjs'
const {w}=bootSlice(process.argv[2]??'BATTLE-SANDBOX.html',{search:'?play=encounter.opening.orphanage'}),h=w.__sandbox
w.prompt=q=>{throw Error('window.prompt: '+q)}
const V=()=>h.viewer._V,ctx=()=>h.session.ctx,unit=id=>ctx().state.units[id]
const say=(...a)=>console.log('  '+a.join(' '))
const settle=()=>{for(let i=0;i<8000&&(h.busy||i<3);i++)w._flush(20);assert.equal(h.busy,false,'the board settles');assert.equal(h.fault,'','no fault')}
const $=id=>V().dom.root.querySelector('#'+id)
const shown=n=>!!n&&n.style.display!=='none'
const off=b=>b.getAttribute('aria-disabled')==='true'
const text=x=>String(x??'').replace(/&#39;/g,"'").replace(/&amp;/g,'&')
const swapBtns=()=>V().dom.stambar.querySelectorAll('.swBtn')
const side=id=>$(id).querySelectorAll('.gearItem').map(b=>text(b.textContent))
const gearItem=name=>$('playGear').querySelectorAll('.gearItem').find(b=>text(b.textContent)===name)
const name=i=>ctx().items[i.itemId].name
const hands=id=>unit(id).loadout.hands.map(name),stowed=id=>unit(id).loadout.stowed.map(name)
const barActs=()=>V().dom.actionbar.querySelectorAll('.acRow').map(r=>r.dataset.act).filter(Boolean)
const panelRows=()=>V().dom.panel.querySelectorAll('.pItem').map(r=>({slot:r.dataset.slot,name:text(r.querySelector('.pItemName')?.textContent)}))

settle()
const me=ctx().battleCursor.actor,row=i=>ctx().items[i.itemId]
assert.deepEqual(unit(me).loadout.hands.map(i=>row(i).itemClass).sort(),['shield','weapon'],`${unit(me).name} carries a weapon and a shield`)
const [first,second]=unit(me).loadout.hands.map(name),weapon=name(unit(me).loadout.hands.find(i=>row(i).itemClass==='weapon')),shield=name(unit(me).loadout.hands.find(i=>row(i).itemClass==='shield'))
// 1. one button reading 'Swap'
assert.deepEqual(swapBtns().map(b=>b.textContent),['Swap'],'one button, reading Swap');assert.equal(shown($('playGear')),false,'no panel until it is pressed')
assert.equal(V().dom.stambar.querySelector('.swCost').textContent,`${V().play.swap.cost} stamina`)
say(`1 ${unit(me).name} (${weapon} and ${shield}): one button reading "${swapBtns()[0].textContent}", ${V().dom.stambar.querySelector('.swCost').textContent}`)
// 2. pressing it opens the gear panel with both hands and the carried items — and nothing the unit does not carry
swapBtns()[0].handlers.click({detail:1});settle()
assert.ok(shown($('playGear')),'the gear panel opens');assert.ok(text($('playGearTitle').textContent).includes(unit(me).name))
assert.deepEqual(side('playGearHand'),hands(me),'both hands');assert.deepEqual(side('playGearStowed'),stowed(me),'what is stowed')
assert.deepEqual($('playGear').querySelectorAll('.gearItem').map(b=>b.dataset.instance).sort(),[...unit(me).loadout.hands,...unit(me).loadout.stowed].map(i=>i.instanceId).sort(),'exactly what the unit carries')
assert.ok(off($('playGearYes')),'what it already holds cannot be confirmed');assert.equal($('playGearSay').textContent,'Nothing changes.')
say(`2 the gear panel: in hand ${side('playGearHand').join(', ')}; stowed ${side('playGearStowed').join(', ')||'nothing'}; "${$('playGearSay').textContent}"`)
// 3. cancelling changes nothing
const seq=ctx().state.seq
gearItem(shield).handlers.click({});assert.deepEqual(side('playGearStowed'),[shield]);assert.equal($('playGearSay').textContent,`Cost: ${V().play.swap.cost} stamina.`)
$('playGearNo').handlers.click({});settle()
assert.equal(shown($('playGear')),false);assert.equal(ctx().state.seq,seq,'Cancel sent nothing');assert.deepEqual(hands(me),[first,second])
say('3 an item moved across, then Cancel: nothing changed')
// 4. choosing another arrangement and confirming sends the engine's swap; the bar and the right panel show the new hands
const stam=unit(me).stamina,cost=V().play.swap.cost,barBefore=barActs(),n=ctx().events.length
swapBtns()[0].handlers.click({detail:1});settle()
assert.deepEqual(side('playGearHand'),[first,second],'opened again on what is held')
gearItem(shield).handlers.click({});assert.equal(off($('playGearYes')),false,'an arrangement the engine takes can be confirmed')
$('playGearYes').handlers.click({});settle()
assert.equal(shown($('playGear')),false)
const ev=ctx().events.slice(n).find(e=>e.type==='loadout.swapped'&&e.actor===me);assert.ok(ev,'the engine\'s swap');assert.equal(ev.stamina,cost)
assert.deepEqual(hands(me),[weapon],'the engine: the weapon alone in hand');assert.deepEqual(stowed(me),[shield],'the shield stowed');assert.equal(unit(me).stamina,stam-cost,'paid in stamina')
const shieldActs=ctx().items[unit(me).loadout.stowed[0].itemId].abilities
assert.ok(shieldActs.length&&shieldActs.every(a=>barBefore.includes(a)&&!barActs().includes(a)),'the bar: the shield\'s powers are gone from it')
V().layers.UEL.get(me).img.handlers.click({detail:1});settle()
const rows=panelRows()
assert.deepEqual(rows.filter(r=>r.slot==='hand').map(r=>r.name),[weapon,'empty'],'the right panel: one hand holds the weapon, the other is empty')
assert.deepEqual(rows.filter(r=>r.slot==='stowed').map(r=>r.name),[shield],'the right panel: the shield is stowed')
say(`4 ${shield} stowed and confirmed: the engine holds ${hands(me).join(', ')}; ${cost} stamina paid; the bar lost ${shieldActs.length} shield power(s); the panel reads hand ${weapon}, hand empty, stowed ${shield}`)
// 5. the swap of this Activation is spent: the button still reads Swap, the panel says why, nothing can be confirmed
assert.deepEqual(swapBtns().map(b=>b.textContent),['Swap']);const why=V().dom.stambar.querySelector('.swWhy').textContent;assert.match(why,/swap of this activation is spent/)
swapBtns()[0].handlers.click({detail:1});settle()
assert.deepEqual(side('playGearHand'),[weapon]);assert.deepEqual(side('playGearStowed'),[shield])
gearItem(shield).handlers.click({});assert.ok(off($('playGearYes')));assert.match($('playGearSay').textContent,/^The swap of this activation is spent\.$/)
const seq2=ctx().state.seq;$('playGearYes').handlers.click({});settle();assert.equal(ctx().state.seq,seq2,'a refused arrangement sends nothing')
w.document.dispatch('keydown',{key:'Escape',target:V().dom.stage.parentNode,repeat:false,preventDefault(){}});settle();assert.equal(shown($('playGear')),false,'Esc closes it')
say(`5 a second swap: "${$('playGearSay').textContent}" - nothing can be confirmed`)
console.log('swap-button-rearranges: the Orphanage on the built sandbox, the expect line passed')
