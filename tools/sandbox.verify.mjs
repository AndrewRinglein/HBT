import assert from 'node:assert/strict'
import {bootSlice} from './atlas-dom.mjs'
import {readFileSync} from 'node:fs'
import {makeWindow} from '../../viewer/tools/fakedom.mjs'
const {w,root,click}=bootSlice(process.argv[2]??'BATTLE-SANDBOX.html'),handle=w.__sandbox
const button=act=>root.els.find(e=>e.dataset.act===act)
const events=()=>JSON.stringify(handle.session.ctx.events)
assert.match(root.textContent,/Battle Sandbox/)
click('start');assert.ok(handle.viewer);assert.equal(handle.session.ctx.state.board.width,20)
assert.ok(button('execute').disabled,'blocked first hero has no made-up movement')
assert.equal(button('end').disabled,false)
click('hero-remove');click('hero-remove');click('start')
assert.equal(handle.session.ctx.state.units.filter(u=>u.side==='hero').length,1)
assert.equal(button('execute').disabled,false)
const before=events(),oldButton=button('execute');click('execute')
assert.notEqual(events(),before);assert.equal(handle.busy,true);assert.ok(button('end').disabled)
const once=events();oldButton.handlers.click();assert.equal(events(),once,'double click while animations run emits no commands')
assert.match(root.textContent,/Wait for the current actions/)
click('skip');assert.equal(handle.busy,false)
// A natural drain, not just Skip, must unlock inputs after the viewer catches up.
click('end');for(let n=0;n<200&&handle.busy;n++)w._flush(1000)
assert.equal(handle.busy,false);assert.equal(handle.viewer.cursor,handle.session.ctx.events.length)
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
click('reset');assert.equal(handle.fault,'');assert.equal(button('end').disabled,false)
const engineEvents=handle.session.ctx.events
engineEvents.push=function(...items){Array.prototype.push.apply(this,items);throw Error('Injected partial engine failure')}
const staleEnd=button('end');click('end');assert.match(handle.fault,/Injected partial engine failure/)
const partial=events();staleEnd.handlers.click();assert.equal(events(),partial);assert.ok(button('end').disabled)
click('resume');assert.equal(handle.fault,'');assert.equal(events(),savedEvents)
// Finish a real battle by choosing to pass hero activations. Enemy AI and the
// turn cap/outcome are owned by the engine; the host must stay operable to the end.
for(let n=0;n<200&&!handle.session.ctx.state.outcome;n++){if(handle.busy)click('skip');click('end')}
if(handle.busy)click('skip');assert.ok(handle.session.ctx.state.outcome);assert.match(root.textContent,/Battle complete/)
console.log('sandbox built UI: configuration, commands, playback barrier, duplicate input, reset/disposal, fault locks, save/resume/tamper rejection, exact replay export and AI outcome passed')
