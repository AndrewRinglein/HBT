import '../../engine/tools/engine-modules.mjs'   // first: links engine/node_modules into a worker's copy (Andrew, 2026-10-01)
import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
import {bootSlice} from './atlas-dom.mjs'
const require=createRequire(import.meta.url),source=require('../../engine/node_modules/esbuild').buildSync({stdin:{contents:"export {previewBurst,burstCentres} from './src/engine.ts'",resolveDir:process.cwd()},bundle:true,write:false,platform:'node',format:'iife',globalName:'FACTS'}).outputFiles[0].text
const engine=new Function(source+';return FACTS')()
const {w,root,click}=bootSlice(process.argv[2]??'BATTLE-SANDBOX.html'),h=w.__sandbox,q=id=>w.document.getElementById(id)
const fire=(n,type='click',extra={})=>{assert.ok(n,'actual DOM node exists');for(const fn of n.listeners[type]??[])fn({target:n,detail:1,preventDefault(){},stopPropagation(){},...extra})}
const change=(id,value)=>{q(id).value=value;fire(q(id),'change')},button=act=>root.els.find(e=>e.dataset.act===act)
const snapshot=()=>JSON.stringify({state:h.session.ctx.state,events:h.session.ctx.events,rng:h.session.ctx.rng.log}),hex=n=>h.viewer._V.dom.stage.querySelectorAll('.targetHex').find(e=>+e.dataset.hex===n)
const ready=()=>{if(h.busy)click('skip');if(h.session.ctx.battleCursor.at==='selecting'){change('actor',String(h.session.policy.humanUnitUids[0]));click('select');click('skip')}}
const optionValue=o=>o.getAttribute('value').replaceAll('&quot;','"').replaceAll('&amp;','&')
const move=destination=>{change('action','power.move|movement');const o=q('aim').children.find(o=>JSON.parse(optionValue(o)).destination===destination);assert.ok(o);change('aim',optionValue(o));click('execute');click('skip')}
while(root.querySelectorAll('[data-roster="heroes"]').length>1)click('hero-remove')
while(root.querySelectorAll('[data-roster="enemies"]').length>1)click('enemy-remove')
const hero=root.querySelectorAll('[data-roster="heroes"]')[0];hero.value='hero.base.warrior-fearsome';fire(hero,'change')
const enemy=root.querySelectorAll('[data-roster="enemies"]')[0];enemy.value='unit.zombie';fire(enemy,'change')
change('seed','1');click('start');ready();const cleave='attack.halberd.cleave';change('action',cleave+'|primary')
assert.ok(hex(81),'engine legal empty centre is exposed as a native board button')
const pure=snapshot();fire(hex(81));const oldHex=hex(100),oldAction=q('action'),oldAim=q('aim'),oldExecute=button('execute')
fire(hex(100),'click',{detail:0});assert.equal(snapshot(),pure);assert.equal(h.viewer._V.targeting.centre,100);assert.match(q('preview').textContent,/Centre hex 100/)
assert.match(q('commands').textContent,/Choose a hex, then Execute/)
const expected=engine.previewBurst(h.session.ctx,0,100,cleave),V=h.viewer._V
assert.deepEqual(V.targeting,{legalHexes:engine.burstCentres(h.session.ctx,0,cleave,'primary'),centre:expected.centre,hexes:expected.hexes,shielded:expected.targets.filter(t=>t.shielded.length).map(t=>({hex:t.hex,props:t.shielded}))})
for(const node of V.dom.stage.querySelectorAll('.targetFootprint')){const n=+node.dataset.hex,pos=V.data.POS[n];assert.equal(node.style.left,(pos.px-V.data.LAYOUT.W/2)+'px');assert.equal(node.style.transform,`translateZ(${V.data.displayHeights?.[n]||0}px)`)}
const panel=q('commands').innerHTML;fire(oldHex);oldAction.value='power.move|movement';fire(oldAction,'change');oldAim.value='bad';fire(oldAim,'change');fire(oldExecute)
assert.equal(q('commands').innerHTML,panel);assert.equal(snapshot(),pure,'retained controls within the same session are inert')
// Native keyboard clicks and camera semantics survive the host callback.
const wrap=V.dom.stage.parentNode,cam=structuredClone(h.viewer.view.camF)
fire(wrap,'pointerdown',{button:0,clientX:10,clientY:10});fire(wrap,'pointermove',{clientX:11,clientY:10});fire(wrap,'pointerup');fire(hex(81));assert.equal(V.targeting.centre,81);assert.deepEqual(h.viewer.view.camF,cam)
fire(wrap,'pointerdown',{button:0,clientX:10,clientY:10});fire(wrap,'pointermove',{clientX:20,clientY:10});fire(wrap,'pointerup');fire(hex(100));assert.equal(V.targeting.centre,81)
fire(hex(100),'click',{detail:0});assert.equal(V.targeting.centre,100)
fire(wrap,'pointerenter');const dragged=structuredClone(h.viewer.view.camF);let prevented=0
w.document.dispatch('keydown',{key:'ArrowLeft',target:q('action'),preventDefault(){prevented++}});assert.equal(prevented,0);assert.deepEqual(h.viewer.view.camF,dragged)
// Execution clears targeting immediately; retained nodes cannot act during playback.
const duringHex=hex(81),duringAction=q('action');click('execute');assert.equal(h.busy,true);assert.equal(V.targeting,null)
const busy=snapshot();fire(duringHex);fire(duringAction,'change');assert.equal(snapshot(),busy);assert.equal(V.targeting,null);click('skip')
// Reset is a legitimately persistent setup button; old command nodes and viewer inputs aren't.
const reset=button('reset'),oldViewer=h.viewer;click('reset');assert.equal(button('reset'),reset);assert.equal(h.session.ctx.battleCursor.at,'selecting')
const selecting=snapshot(),actorNode=q('actor');fire(oldHex);oldViewer._V.offerHexClick(81);fire(oldExecute);assert.equal(snapshot(),selecting)
ready();const afterActor=snapshot();fire(actorNode,'change');assert.equal(snapshot(),afterActor)
fire(reset);assert.equal(h.session.ctx.battleCursor.at,'selecting');ready()
const staleReset=button('reset');click('hero-add');const epoch=h.generation;fire(staleReset);assert.equal(h.generation,epoch,'removed setup controls cannot reset a battle');click('hero-remove')
// Real occupied centre after the same legal authored-map movement route.
for(const destination of [85,90,72]){move(destination);if(destination!==72){click('end');click('skip');ready()}}
change('action',cleave+'|primary');const beforeHit=snapshot(),img=h.viewer._V.layers.UEL.get(1).img
fire(img,'click',{detail:0});assert.equal(h.viewer._V.targeting.centre,92);assert.equal(snapshot(),beforeHit);assert.match(q('preview').textContent,/HP loss 5/)
const target=engine.previewBurst(h.session.ctx,0,92,cleave);assert.deepEqual(h.viewer._V.targeting.hexes,target.hexes)
click('save');const oldAtSave=hex(92),savedViewer=h.viewer;click('resume');const resumed=snapshot();fire(oldAtSave);savedViewer._V.offerHexClick(92);assert.equal(snapshot(),resumed)
change('action',cleave+'|primary');fire(h.viewer._V.layers.UEL.get(1).img,'click',{detail:0});click('execute');click('skip');assert.equal(h.viewer.state.U[1].hp,h.session.ctx.state.units[1].hp);assert.equal(h.viewer._V.targeting,null,'completed battle has no target input')
// An ordinary action leaves ordinary inspection available.
click('reset');ready();change('action','power.move|movement');assert.equal(h.viewer._V.targeting,null);fire(h.viewer._V.layers.UEL.get(1).img);assert.equal(h.viewer.view.inspectId,1)
// Callback-triggered render failure propagates once, faults the host and clears overlay safely.
change('action',cleave+'|primary');const staleFault=hex(100),staleDropdown=q('action'),failure=Error('Injected target render failure')
Object.defineProperty(h.viewer._V.dom.panel,'innerHTML',{configurable:true,set(){throw failure}})
assert.throws(()=>fire(hex(100)),e=>e===failure);assert.match(h.fault,/Injected target render failure/);assert.equal(h.viewer._V.targeting,null)
const faulted=snapshot();fire(staleFault);fire(staleDropdown,'change');assert.equal(snapshot(),faulted);assert.ok(button('execute').disabled)
click('reset');assert.equal(h.fault,'');h.viewer.dispose()
console.log('sandbox board targeting: exact engine facts/heights, empty and occupied clicks, no click execution, native input/camera, stale controls/sessions, busy/outcome/fault locks and reset recovery passed')
