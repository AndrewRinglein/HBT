import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {bootSlice} from './atlas-dom.mjs'
import {makeWindow} from '../../viewer/tools/fakedom.mjs'
const {w,root,click}=bootSlice(process.argv[2]??'BATTLE-SANDBOX.html'),h=w.__sandbox
const q=id=>w.document.getElementById(id),snapshot=()=>JSON.stringify({state:h.session.ctx.state,events:h.session.ctx.events,rng:h.session.ctx.rng.log})
const change=(id,value)=>{q(id).value=value;q(id).handlers.change()}
const ready=()=>{if(h.busy)click('skip');if(h.session.ctx.battleCursor.at==='selecting'){change('actor',String(h.session.policy.humanUnitUids[0]));click('select');click('skip')}}
const optionValue=o=>o.getAttribute('value').replaceAll('&quot;','"').replaceAll('&amp;','&')
const aim=(action,slot,key,value)=>{
 change('action',action+'|'+slot)
 const option=q('aim').children.find(o=>JSON.parse(optionValue(o))[key]===value)
 assert.ok(option,action+' legal '+key+' '+value);change('aim',optionValue(option))
}
while(root.querySelectorAll('[data-roster="heroes"]').length>1)click('hero-remove')
while(root.querySelectorAll('[data-roster="enemies"]').length>1)click('enemy-remove')
const hero=root.querySelectorAll('[data-roster="heroes"]')[0];hero.value='hero.base.warrior-fearsome';hero.handlers.change()
const enemy=root.querySelectorAll('[data-roster="enemies"]')[0];enemy.value='unit.zombie';enemy.handlers.change()
change('map','showcase.atlas-priory');change('seed','1');click('start');ready()
assert.deepEqual(JSON.parse(JSON.stringify(h.session.config)),{mapId:'showcase.atlas-priory',heroes:['hero.base.warrior-fearsome'],enemies:['unit.zombie'],seed:1},'exact real-command fixture roster')
const cleave='attack.halberd.cleave',before=snapshot()
aim(cleave,'primary','centre',81)
assert.equal(snapshot(),before,'forecast changes no state/events/RNG')
assert.match(q('preview').textContent,/Centre hex 81/);assert.match(q('preview').textContent,/No eligible recipients/)
assert.doesNotMatch(q('preview').textContent,/Hit chance|Critical|Move along/)
assert.ok(q('aim').children.some(o=>JSON.parse(optionValue(o)).centre===100),'empty centres remain selectable')
const start=h.session.ctx.events.length;click('execute')
assert.equal(h.busy,true);assert.doesNotMatch(q('preview').textContent,/Current-state forecast|No eligible recipients|Move along/)
assert.equal(q('burstDetails'),null)
assert.ok(h.session.ctx.events.slice(start).some(e=>e.type==='burst.declared'&&e.centre===81&&e.targets.length===0))
for(let i=0;i<200&&h.busy;i++)w._flush(1000)
assert.equal(h.busy,false,'empty burst playback naturally releases barrier');assert.equal(h.viewer.cursor,h.session.ctx.events.length)
click('reset');ready()
for(const destination of [85,90,72]){
 aim('power.move','movement','destination',destination);assert.equal(q('burstDetails'),null)
 click('execute');click('skip');if(destination!==72){click('end');click('skip');ready()}
}
const pure=snapshot();aim(cleave,'primary','centre',92);assert.equal(snapshot(),pure)
assert.match(q('preview').textContent,/forecast before burst reactions/);assert.match(q('preview').textContent,/Centre hex 92/);assert.match(q('preview').textContent,/HP loss 5/)
const details=q('burstDetails');assert.ok(details);assert.equal(details.hasAttribute('open'),false)
assert.match(details.textContent,/Resolved damage 6/);assert.match(details.textContent,/HP loss 5/);assert.match(details.textContent,/overkill 1/);assert.match(details.textContent,/physical/);assert.match(details.textContent,/burst reactions/)
assert.doesNotMatch(details.textContent,/Hit chance|Critical chance|Block chance/)
click('save');const save=q('transferText').value;click('resume');ready();aim(cleave,'primary','centre',92)
const at=h.session.ctx.events.length,hp=h.session.ctx.state.units[1].hp;click('execute');assert.equal(q('burstDetails'),null)
const damage=h.session.ctx.events.slice(at).find(e=>e.type==='damage.applied'&&e.target===1&&e.causeId===cleave)
assert.equal(damage.amount,5);assert.equal(hp-h.session.ctx.state.units[1].hp,5)
for(let i=0;i<200&&h.busy;i++)w._flush(1000)
assert.equal(h.busy,false);assert.equal(h.viewer.state.U[1].hp,h.session.ctx.state.units[1].hp)
click('export');const exported=JSON.parse(q('transferText').value)
assert.deepEqual(exported.events,JSON.parse(JSON.stringify(h.session.ctx.events)))
const html=readFileSync('../viewer/BATTLE-VIEWER.html','utf8'),m=html.match(/<script>([\s\S]*)<\/script>\s*$/),replay=makeWindow()
replay.document.body.innerHTML=html.slice(0,m.index).replace(/<style>[\s\S]*?<\/style>/,'').replace(/<!--[\s\S]*?-->/g,'').replace(/<(meta|title|link)[^>]*>(<\/title>)?/g,'')
const names=['window','document','requestAnimationFrame','setTimeout','clearTimeout','setInterval','clearInterval','addEventListener','alert','Date','performance','getComputedStyle','localStorage','self','globalThis']
new Function(...names,m[1])(...names.map(n=>['window','self','globalThis'].includes(n)?replay:replay[n]))
const player=replay.__battleView.harness;player.playExport(exported,'TEST authored human burst');player.viewer.seek(exported.events.length)
assert.deepEqual(player.viewer.events,exported.events);assert.equal(player.viewer.state.U[1].hp,h.viewer.state.U[1].hp)
player.dispose();h.viewer.dispose()
console.log('sandbox burst dropdown: legal empty centre cast, selected pure forecast, actual Priory move route/5 HP recipient, payment/barrier, save and shared replay parity passed')
