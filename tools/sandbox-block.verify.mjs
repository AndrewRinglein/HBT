// v2.block-presentation (V2 R2, 2026-09-23): Block is shown as its own fact, from the engine's.
// A real sandbox battle — the Iron Dwarf and his Tower Shield against a zombie — is played
// until the zombie's attack rolls a positive Block. Then: the sandbox forecast names Block
// chance, hit chance if not blocked and chance to connect, copied from the engine preview;
// the replay log's attack line carries the same three from attack.declared; the panel lists
// Block and Ranged Block; a Block never moves HP.
import assert from 'node:assert/strict'
import {bootSlice} from './atlas-dom.mjs'
import {buildLog} from '../../viewer/src/log.js'
const {w,root,click}=bootSlice(process.argv[2]??'BATTLE-SANDBOX.html'),h=w.__sandbox
const q=id=>w.document.getElementById(id)
const change=(id,value)=>{q(id).value=value;q(id).handlers.change()}
const optionValue=o=>o.getAttribute('value').replaceAll('&quot;','"').replaceAll('&amp;','&')
while(root.querySelectorAll('[data-roster="heroes"]').length>1)click('hero-remove')
while(root.querySelectorAll('[data-roster="enemies"]').length>1)click('enemy-remove')
const hero=root.querySelectorAll('[data-roster="heroes"]')[0];hero.value='hero.base.warrior-iron';hero.handlers.change()
const enemy=root.querySelectorAll('[data-roster="enemies"]')[0];enemy.value='unit.zombie';enemy.handlers.change()
change('map','showcase.atlas-priory');change('seed','1');click('start')
const dwarf=h.session.policy.humanUnitUids[0],dwarfId=h.session.ctx.state.units.find(u=>u.uid===dwarf).id  // uid picks him in the sandbox; events name the battle id
const blocks=()=>h.session.ctx.events.filter(e=>e.type==='block.rolled'&&e.defender===dwarfId&&e.chance>0)
// the hero holds; the zombie comes to him
for(let i=0;i<60&&!blocks().length&&!h.session.ctx.state.outcome;i++){
 if(h.busy)click('skip')
 const at=h.session.ctx.battleCursor?.at
 if(at==='selecting'){change('actor',String(dwarf));click('select')}
 else click('end')
 if(h.busy)click('skip')
}
const rolled=blocks()[0]
assert.ok(rolled,'the zombie attacked the Iron Dwarf and his Tower Shield rolled a positive Block')
const i=h.session.ctx.events.indexOf(rolled)
const declared=h.session.ctx.events.slice(0,i).reverse().find(e=>e.type==='attack.declared'&&e.target===dwarfId)
assert.ok(declared&&declared.blockChance===rolled.chance,'attack.declared carries the Block chance that was rolled')
assert.equal(typeof declared.connectionChanceBps,'number')
if(rolled.blocked){
 const next=h.session.ctx.events.slice(i+1,i+4)
 assert.ok(!next.some(e=>e.type==='damage.applied'&&e.target===dwarfId&&e.causeId===rolled.causeId),'a Block moves no HP')
}
// the replay log: Block, hit chance if not blocked, chance to connect — each copied from the event
const pct=bps=>{const s=String(bps).padStart(3,'0'),f=s.slice(-2).replace(/0+$/,'');return s.slice(0,-2)+(f?'.'+f:'')}
const lines=buildLog(JSON.parse(JSON.stringify(h.session.ctx.events)),{},h.session.ctx.state.turn)
const line=lines.find(l=>l.t.includes('attacks')&&l.t.includes('block '+declared.blockChance+'%'))
assert.ok(line,'the attack line names the Block chance')
assert.match(line.t,new RegExp('hit '+declared.hitChance+'% if not blocked'))
assert.match(line.t,new RegExp('connects '+pct(declared.connectionChanceBps).replace('.','\\.')+'%'))
// the panel: Block and Ranged Block beside the other defenses
if(h.busy)click('skip')
h.viewer.inspect(dwarfId);h.viewer.view.statsOpen=true;h.viewer.render()
const panel=q('panel').textContent
assert.match(panel,/Block/);assert.match(panel,/Ranged Block/)
// the sandbox forecast: the Iron Dwarf's own attack on the zombie, from the engine preview
for(let j=0;j<20;j++){
 if(h.session.ctx.state.outcome)break
 if(h.busy)click('skip')
 if(h.session.ctx.battleCursor?.at==='selecting'){change('actor',String(dwarf));click('select');if(h.busy)click('skip')}
 const attack=q('action')?.children.find(o=>optionValue(o).startsWith('attack.'))
 if(attack){change('action',optionValue(attack));break}
 click('end');if(h.busy)click('skip')
}
const text=q('preview').textContent
assert.match(text,/Block chance: \d+%/,'the forecast names Block chance');assert.match(text,/Hit chance if not blocked: \d+%/);assert.match(text,/Chance to connect: [\d.]+%/)
assert.doesNotMatch(text,/Hit chance: /,'the bare hit chance is gone: it was conditional accuracy shown as the whole story')
h.viewer.dispose()
console.log(`sandbox block: zombie → Iron Dwarf block ${rolled.chance}% (${rolled.blocked?'blocked':'not blocked'}), log line, panel rows and forecast labels passed`)
