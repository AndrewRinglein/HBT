import assert from 'node:assert/strict'
import {bootSlice} from './atlas-dom.mjs'
import {readFileSync} from 'node:fs'
import {makeWindow} from '../../viewer/tools/fakedom.mjs'
const {w,root,click}=bootSlice(process.argv[2]??'BATTLE-SANDBOX.html'),handle=w.__sandbox
const button=act=>root.els.find(e=>e.dataset.act===act)
const events=()=>JSON.stringify(handle.session.ctx.events)
const choose=(uid=handle.session.policy.humanUnitUids[0])=>{
 if(handle.session.ctx.battleCursor.at!=='selecting')return
 const el=w.document.getElementById('actor');el.value=String(uid);el.handlers.change();click('select')
}
const ready=()=>{if(handle.busy)click('skip');choose();if(handle.busy)click('skip')}
assert.match(root.textContent,/Battle Sandbox/)
click('start');assert.ok(handle.viewer);assert.equal(handle.session.ctx.state.board.width,20)
assert.deepEqual(handle.viewer._V.data.ABSORBING_STATUSES.slice().sort(),['status.protection','test.status.ward'],'embedded viewer must receive current pool metadata')
assert.equal(handle.session.ctx.battleCursor.at,'selecting');assert.ok(button('end').disabled)
assert.equal(handle.session.ctx.events.some(e=>e.type==='activation.begin'),false)
const pending=events();click('save');click('resume');assert.equal(events(),pending);assert.equal(handle.session.ctx.battleCursor.at,'selecting')
const third=handle.session.policy.humanUnitUids[2],staleSelect=button('select')
choose(third);assert.equal(handle.busy,true);assert.ok(button('end').disabled)
const selectedEvents=events();staleSelect.handlers.click();assert.equal(events(),selectedEvents,'selection is locked during playback')
click('skip');assert.equal(handle.session.ctx.battleCursor.actor,2);assert.equal(button('execute').disabled,false,'default party can choose an unblocked hero')
click('end');click('skip');choose();click('skip')
assert.deepEqual(handle.session.ctx.events.filter(e=>e.type==='activation.begin').map(e=>e.actor),[2,0],'UI chooses a different order through engine commands')
// Was: Execute disabled. Since v2.shields (engine 4789cbd, 2026-09-23) the Iron Dwarf's
// Tower Shield grants two self powers, so a blocked hero may legally raise it. What this
// guards is unchanged: no made-up movement — the only actions offered are the shield's,
// and the only target is the hero himself.
{const opts=[...w.document.getElementById('action').children].map(o=>o.textContent),aims=[...w.document.getElementById('aim').children].map(o=>o.textContent)
 assert.ok(opts.length>0);for(const o of opts)assert.match(o,/^(Cover|Stand Tall) · /,'blocked first hero has no made-up movement')
 assert.equal(aims.length,1);assert.match(aims[0],/^Iron Dwarf A · hex /)}
assert.equal(button('end').disabled,false)
click('hero-remove');click('hero-remove');click('start');ready()
assert.equal(handle.session.ctx.state.units.filter(u=>u.side==='hero').length,1)
assert.equal(button('execute').disabled,false)
// Actual engine self-damage preview must survive the built host's label/filter seam.
{
 const actor=handle.session.ctx.state.units[handle.session.ctx.battleCursor.actor],id='power.fire-master.eldritch-might'
 const originalActions=actor.actions.slice(),originalStamina=actor.stamina
 actor.actions.push(id);actor.stamina=99
 const select=w.document.getElementById('action');select.value=id+'|primary';select.handlers.change()
 assert.match(w.document.getElementById('preview').textContent,/Damage to self: [1-9]/)
 assert.match(w.document.getElementById('preview').textContent,/Self HP loss: [1-9]/)
 actor.actions=originalActions;actor.stamina=originalStamina
 w.document.getElementById('action').handlers.change()
}
// A real multi-type engine profile exercises the built preview, not fabricated totals.
{
 const ctx=handle.session.ctx,actor=ctx.state.units[ctx.battleCursor.actor],enemy=ctx.state.units.find(u=>u.side==='enemy'),id='attack.test-packet-flame'
 const actions=actor.actions.slice(),stamina=actor.stamina,hex=enemy.hex
 actor.actions.push(id);actor.stamina=99
 let shown=false
 for(const candidate of ctx.geo.neighboursOf(actor.hex)){
  enemy.hex=candidate
  const select=w.document.getElementById('action');select.value=id+'|primary';select.handlers.change()
  if(w.document.getElementById('action').children.some(o=>o.getAttribute('value')===id+'|primary'&&o.hasAttribute('selected'))){shown=true;break}
 }
 assert.ok(shown,'engine must offer the adjacent packet attack')
 const text=w.document.getElementById('preview').textContent
 assert.match(text,/Current-state forecast/)
 assert.match(text,/Damage on chart-only critical/)
 assert.doesNotMatch(text,/raw|overkill/,'headline stays concise')
 const details=w.document.getElementById('packetDetails');assert.ok(details);assert.equal(details.hasAttribute('open'),false)
 assert.match(details.textContent,/Damage breakdown/)
 assert.match(details.textContent,/On hit packets/);assert.match(details.textContent,/fire/);assert.match(details.textContent,/absorbed/)
 assert.match(details.textContent,/On critical packets/);assert.match(details.textContent,/true/)
 actor.actions=actions;actor.stamina=stamina;enemy.hex=hex
 w.document.getElementById('action').handlers.change()
}
const before=events(),oldButton=button('execute');click('execute')
assert.notEqual(events(),before);assert.equal(handle.busy,true);assert.ok(button('end').disabled)
const once=events(),lockedPanel=w.document.getElementById('commands').innerHTML;oldButton.handlers.click();assert.equal(events(),once,'detached double click while animations run emits no commands')
assert.equal(w.document.getElementById('commands').innerHTML,lockedPanel,'detached controls do not change errors or command UI')
click('skip');assert.equal(handle.busy,false)
// A natural drain, not just Skip, must unlock inputs after the viewer catches up.
click('end');for(let n=0;n<200&&handle.busy;n++)w._flush(1000)
assert.equal(handle.busy,false);assert.equal(handle.viewer.cursor,handle.session.ctx.events.length);ready()
click('save');const saved=w.document.getElementById('transferText').value,savedEvents=events();assert.equal(JSON.parse(saved).format,'hbt-sandbox')
click('end');assert.equal(handle.busy,true);const oldViewer=handle.viewer
click('reset');assert.notEqual(handle.viewer,oldViewer);const replacement=events();w._flush(10000);assert.equal(events(),replacement,'old callbacks cannot mutate replacement session')
click('resume');assert.equal(events(),savedEvents)
const bad=JSON.parse(saved);bad.config.seed++;w.document.getElementById('transferText').value=JSON.stringify(bad)
const restored=handle.session;click('import');assert.equal(handle.session,restored);assert.match(root.textContent,/Saved configuration/)
click('export');const exported=JSON.parse(w.document.getElementById('transferText').value)
assert.equal(JSON.stringify(exported.events),events());assert.match(exported.engineCommit,/^[a-f0-9]{7,40}$/);assert.equal(typeof exported.engineDirty,'boolean')
assert.equal(exported.seed.mapId,exported.atlasScene.initialMapFact.mapId)
assert.ok(exported.atlasScene.layout&&exported.atlasScene.catalog)
// Import through the existing standalone replay host, not a bespoke fold.
const html=readFileSync('../viewer/BATTLE-VIEWER.html','utf8'),m=html.match(/<script>([\s\S]*)<\/script>\s*$/),replay=makeWindow()
replay.document.body.innerHTML=html.slice(0,m.index).replace(/<style>[\s\S]*?<\/style>/,'').replace(/<!--[\s\S]*?-->/g,'').replace(/<(meta|title|link)[^>]*>(<\/title>)?/g,'')
const names=['window','document','requestAnimationFrame','setTimeout','clearTimeout','setInterval','clearInterval','addEventListener','alert','Date','performance','getComputedStyle','localStorage','self','globalThis']
new Function(...names,m[1])(...names.map(n=>['window','self','globalThis'].includes(n)?replay:replay[n]))
const player=replay.__battleView.harness;player.playExport(exported,'Sandbox export');player.viewer.seek(exported.events.length)
assert.deepEqual(player.viewer.events,exported.events);assert.equal(Object.keys(player.viewer.state.U).length,handle.session.ctx.state.units.length)
player.dispose()
// Renderer faults and partially executed engine exceptions require a fresh
// session. A stale Show-current-state handler cannot unlock either failure.
click('end');const staleSkip=button('skip')
Object.defineProperty(handle.viewer._V.dom.turnchip,'textContent',{configurable:true,set(){throw Error('Injected renderer failure')}})
for(let n=0;n<200&&!handle.fault;n++){try{w._flush(1000)}catch{}}
assert.match(handle.fault,/Injected renderer failure/);assert.equal(handle.busy,false)
const faultEvents=events();staleSkip.handlers.click();assert.ok(handle.fault);assert.ok(button('end').disabled);assert.equal(events(),faultEvents)
click('reset');assert.equal(handle.fault,'');ready();assert.equal(button('end').disabled,false)
const engineEvents=handle.session.ctx.events
engineEvents.push=function(...items){Array.prototype.push.apply(this,items);throw Error('Injected partial engine failure')}
const staleEnd=button('end');click('end');assert.match(handle.fault,/Injected partial engine failure/)
const partial=events();staleEnd.handlers.click();assert.equal(events(),partial);assert.ok(button('end').disabled)
click('resume');assert.equal(handle.fault,'');assert.equal(events(),savedEvents)
// Finish a real battle by choosing to pass hero activations. Enemy AI and the
// turn cap/outcome are owned by the engine; the host must stay operable to the end.
for(let n=0;n<200&&!handle.session.ctx.state.outcome;n++){ready();if(!handle.session.ctx.state.outcome)click('end')}
if(handle.busy)click('skip');assert.ok(handle.session.ctx.state.outcome);assert.match(root.textContent,/Battle complete/)
console.log('sandbox built UI: configuration, pending selection save, alternate hero order, unblocked default hero, commands, playback barrier, duplicate input, reset/disposal, fault locks, save/resume/tamper rejection, exact replay export and AI outcome passed')
