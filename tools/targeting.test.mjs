import '../../engine/tools/engine-modules.mjs'   // first: links engine/node_modules into a worker's copy (Andrew, 2026-10-01)
import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createRequire} from 'node:module'
import {fixtureUnits} from './burst-fixture-data.mjs'
import {makeWindow} from './fakedom.mjs'
const require=createRequire(import.meta.url),fixture=JSON.parse(readFileSync('tools/fixtures/bursts.json')),statics=JSON.parse(readFileSync('generated/static.json')),glyphs=JSON.parse(readFileSync('generated/ra-glyphs.json')),art=JSON.parse(readFileSync('generated/art/manifest.json'))
let source
function boot(name='movement',opts={}){
 const w=makeWindow(),callbacks=[],setTimeout=(f,ms)=>{const id=w.setTimeout(f,ms);if(f.name==='expireBurst'){f.timerId=id;callbacks.push(f)}return id}
 if(!source)source=require('../../engine/node_modules/esbuild').buildSync({stdin:{contents:"import {mountBattleViewer} from './src/viewer.js'; window.__burstMount=mountBattleViewer",resolveDir:process.cwd()},nodePaths:['node_modules'],bundle:true,write:false,platform:'browser',format:'iife'}).outputFiles[0].text
 const names=['window','document','requestAnimationFrame','setTimeout','clearTimeout','setInterval','clearInterval','addEventListener','Date','performance','getComputedStyle','alert','localStorage','self','globalThis']
 const run=code=>new Function(...names,code)(...names.map(n=>n==='setTimeout'?setTimeout:['window','self','globalThis'].includes(n)?w:w[n]))
 if(process.env.VIEWER_PAGE){
  const html=readFileSync(process.env.VIEWER_PAGE,'utf8'),m=html.match(/<script>([\s\S]*)<\/script>\s*$/)
  w.document.body.innerHTML=html.slice(0,m.index).replace(/<style>[\s\S]*?<\/style>/,'').replace(/<!--[\s\S]*?-->/g,'').replace(/<(meta|title|link)[^>]*>(<\/title>)?/g,'')
  run(m[1]);w.__battleView.harness.dispose();w.__burstMount=w.__battleView.mount
 }else run(source)
 const c=structuredClone(name==='movement'?{...fixture.movement,action:fixture.cases[0].action}:fixture.cases.find(c=>c.name===name));if(opts.eventEdit)opts.eventEdit(c.events)
 const host=w.document.createElement('div');w.document.body.appendChild(host)
 const data={initialEvents:c.events,units:fixtureUnits(statics.units,c.action),statuses:statics.statuses,absorbingStatuses:statics.absorbingStatuses,actions:{...statics.actions,[c.action.id]:c.action},badges:statics.badges,layers:statics.layers,actionKinds:statics.actionKinds,statusRows:statics.statusRows,artmap:art.artmap,assets:{},glyphs,meta:{seed:{mapId:c.options.map.id}}}
 const v=w.__burstMount(host,data,{autoplay:false,...opts});v.push(c.events);v.seek(c.events.findIndex(e=>e.type==='burst.declared'))
 return{w,v,c,callbacks,declaration:c.events.findIndex(e=>e.type==='burst.declared')}
}

const facts=()=>({legalHexes:[84,85,86],centre:85,hexes:[85,86],shielded:[{hex:86,props:['wall.<test>']}]})
const fire=(node,type='click',extra={})=>{for(const f of node.listeners[type]||[])f({detail:1,stopPropagation(){},preventDefault(){},...extra})}
const button=(v,hex)=>v._V.dom.stage.querySelectorAll('.targetHex').find(n=>+n.dataset.hex===hex)
test('supplied target facts render exact projection/heights, native buttons and detached shielding',()=>{
 const seen=[],{v}=boot('movement',{onHexClick:h=>{seen.push(h);return true}}),p=facts();v._V.data.displayHeights={85:47,86:91};v.setTargeting(p)
 const n=button(v,85),pos=v._V.data.POS[85];assert.equal(n.tagName,'BUTTON');assert.equal(n.getAttribute('type'),'button');assert.equal(n.getAttribute('aria-label'),'Select hex 85');assert.equal(n.style.left,(pos.px-v._V.data.LAYOUT.W/2)+'px');assert.match(n.style.transform,/47px/)
 assert.deepEqual(v._V.dom.stage.querySelectorAll('.targetFootprint').map(n=>+n.dataset.hex),[85,86]);assert.equal(v._V.dom.stage.querySelector('.targetCentre').dataset.hex,'85')
 const shield=v._V.dom.stage.querySelector('.targetShield');assert.equal(shield.dataset.props,'wall.<test>');assert.match(shield.style.transform,/91px/)
 p.legalHexes[0]=7;p.hexes.push(9);p.shielded[0].props[0]='changed';v.render();assert.equal(button(v,7),undefined);assert.equal(v._V.dom.stage.querySelector('.targetShield').dataset.props,'wall.<test>');fire(button(v,84));assert.deepEqual(seen,[84]);assert.equal(v.state.BURST,null);v.dispose()
})
test('occupied persistent unit offers CURRENT folded hex, consumes only true, otherwise inspects',()=>{
 const seen=[];let consume=true;const {v,c}=boot('movement',{onHexClick:h=>{seen.push(h);return consume}}),move=c.events.find(e=>e.type==='moved'),img=v._V.layers.UEL.get(move.actor).img
 v.setTargeting(facts());fire(img);assert.deepEqual(seen,[85]);assert.equal(v.view.inspectId,null)
 v.seek(c.events.findIndex(e=>e.type==='moved')+1);v.setTargeting(facts());fire(img);assert.deepEqual(seen,[85,84]);consume=false;fire(img);assert.equal(v.view.inspectId,move.actor);v.dispose()
})
test('malformed entire payload is rejected atomically without invoking accessors',()=>{
 let calls=0;const {v}=boot('movement',{onHexClick:()=>{calls++;return true}});v.setTargeting(facts());const old=button(v,84),bad=[]
 for(const key of ['legalHexes','hexes']){const p=facts();p[key].push(99999);bad.push(p)}
 bad.push({...facts(),centre:-1},{...facts(),shielded:[{hex:99999,props:[]}]},{...facts(),shielded:[{hex:86,props:[3]}]},{...facts(),legalHexes:[84,84]},{...facts(),hexes:Array(2)},{...facts(),extra:true})
 const accessor=facts();Object.defineProperty(accessor,'centre',{get(){throw Error('getter called')}});bad.push(accessor)
 for(const p of bad){assert.throws(()=>v.setTargeting(p),/targeting/i);assert.equal(button(v,84),old)}
 fire(old);assert.equal(calls,1);v.dispose()
})
test('replacement, null, seek and dispose invalidate retained overlay callbacks including same hex',()=>{
 let calls=0;const {v}=boot('movement',{onHexClick:()=>{calls++;return true}})
 for(const clear of [()=>v.setTargeting(facts()),()=>v.setTargeting(null),()=>v.seek(v.cursor),()=>v.dispose()]){v.setTargeting(facts());const old=button(v,84);clear();fire(old);assert.equal(calls,0)}
 assert.throws(()=>v.setTargeting(facts()),/disposed/)
})
test('passive unit inspection stays available; disposed persistent callbacks are inert',()=>{
 const {v}=boot(),u=Object.values(v.state.U)[0],img=v._V.layers.UEL.get(u.id).img;fire(img);assert.equal(v.view.inspectId,u.id);v.dispose();v.view.inspectId=null;fire(img);assert.equal(v.view.inspectId,null)
})
// Law 10 (2026-09-29, viewer.painted-board): the pan drag is the RIGHT button now — engine DECISIONS.md 2026-09-29 "the playable
// battle screen", Andrew: "right-click to grab the map and move"; a left drag turns and tilts. The rules kept, unweakened: a drag
// moves the camera and suppresses the release's selection; jitter under the threshold stays a click. A left drag is added below.
// Law 10 (viewer.xcom-camera, 2026-10-01): a drag no longer moves the camera — engine DECISIONS.md 2026-10-01 'the XCOM-style
// camera', Andrew: "no grab-drag", "no tilt, no free rotation" — so the two camera assertions here (a right drag moved camF, a
// left drag changed cam) now assert that it did NOT move. The rules kept, unweakened: a drag still suppresses the release's
// selection; jitter under the threshold stays a click.
// LAW 10 — 2026-10-05, viewer.map-drag-and-keys (engine DECISIONS.md 2026-10-05 'the battle screen must feel smooth: … the map
// drags and moves on W/A/S/D' — Andrew, asked "Should the map also move by dragging it and by W/A/S/D, alongside edge scroll
// (this overturns 'no grab-drag')?": "Yes"). The two camera assertions here read, since 2026-10-01,
//   const before=structuredClone(v.view.camF);drag();assert.deepEqual(v.view.camF,before)        (a right drag did not move camF)
//   … fire(wrap,'pointerup');assert.deepEqual(v.view.cam,cam)                                     (a left drag did not change cam)
// and the test was named "… and moves no camera". By the ruling a drag — the right button's or the left's — moves the MAP
// (camF) again: the first is turned back to assert that it moved. The second stands as written and is still the rule: a
// drag never turns, tilts or zooms (cam); it is joined by the map having moved. The rules kept, unweakened: a drag still
// suppresses the release's selection; jitter under the threshold stays a click.
test('a drag moves the map and suppresses release selection/inspection; it never turns or tilts; keyboard activation and next click work',()=>{
 let calls=0;const {v}=boot('movement',{onHexClick:()=>{calls++;return true}});v.setTargeting(facts());const wrap=v._V.dom.stage.parentNode,drag=()=>{fire(wrap,'pointerdown',{button:2,clientX:10,clientY:10});fire(wrap,'pointermove',{clientX:30,clientY:20});fire(wrap,'pointerup')}
 const before=structuredClone(v.view.camF);drag();assert.notDeepEqual(v.view.camF,before,'a right drag moves the map');fire(button(v,84));assert.equal(calls,0)
 fire(button(v,84),'click',{detail:0});assert.equal(calls,1)
 drag();const img=v._V.layers.UEL.values().next().value.img;fire(img);assert.equal(v.view.inspectId,null);assert.equal(calls,1)
 fire(wrap,'pointerdown',{button:0,clientX:30,clientY:20});fire(wrap,'pointerup');fire(button(v,84));assert.equal(calls,2)
 /* (the left drag goes back the way the right one came: on this small board the first took the view to its bound) */
 const cam=structuredClone(v.view.cam),at=structuredClone(v.view.camF);fire(wrap,'pointerdown',{button:0,clientX:30,clientY:20});fire(wrap,'pointermove',{clientX:10,clientY:10});fire(wrap,'pointerup');assert.deepEqual(v.view.cam,cam);assert.notDeepEqual(v.view.camF,at,'a left drag moves the map too');fire(button(v,84));assert.equal(calls,2);v.dispose()
})
test('callback exceptions fault-lock host and all retained input callbacks',()=>{
 let error=null,calls=0;const failure=Error('host target failure'),{v}=boot('movement',{onHexClick(){calls++;throw failure},onError:e=>error=e});v.setTargeting(facts());const n=button(v,84);assert.throws(()=>fire(n),/host target failure/);assert.equal(v.invalid,failure);assert.equal(error,failure);assert.equal(v.playing,false);fire(n);assert.equal(calls,1);v.dispose()
})

test('footprint and shielding are copied even outside legal centres; no supplied floor inference',()=>{
 const {v}=boot();const p={legalHexes:[84],centre:null,hexes:[85,86],shielded:[{hex:87,props:[]}]};v.setTargeting(p)
 assert.deepEqual(v._V.dom.stage.querySelectorAll('.targetHex').map(n=>+n.dataset.hex),[84]);assert.deepEqual(v._V.dom.stage.querySelectorAll('.targetFootprint').map(n=>+n.dataset.hex),[85,86]);assert.equal(v._V.dom.stage.querySelector('.targetShield').dataset.hex,'87');assert.equal(v._V.dom.stage.querySelector('.targetCentre'),null);v.dispose()
})

// LAW 10 — 2026-10-05, viewer.map-drag-and-keys (engine DECISIONS.md 2026-10-05 'the battle screen must feel smooth: … the map
// drags and moves on W/A/S/D', Andrew: "Yes"; the item: "A press that travels less than 6 px is a click exactly as now … one
// that travels more is a drag and is never also a click. No press is ever swallowed with nothing happening: today a press
// that travels 4 px is no click and moves nothing … which loses clicks made with the hand still moving."). The second line
// read
//   fire(wrap,'pointerdown',{button:2,clientX:10,clientY:10});for(let x=11;x<=14;x++)fire(wrap,'pointermove',{clientX:x,clientY:10});fire(wrap,'pointerup');fire(button(v,84));assert.equal(calls,1);assert.deepEqual(v.view.camF,before)
// — a press that wandered 4 px, a pixel at a time, was no click and moved nothing: the very swallowed press the ruling ends.
// As the rule now stands the threshold is 6 px, still gathered from where the press began: 4 px gathered a pixel at a time
// is a click (and moves nothing); 7 px gathered the same way is a drag — it moves the map and is not also a click.
test('one-pixel click jitter remains a click; drag threshold accumulates from pointer origin',()=>{
 let calls=0;const {v}=boot('movement',{onHexClick:()=>{calls++;return true}});v.setTargeting(facts());const wrap=v._V.dom.stage.parentNode,before=structuredClone(v.view.camF)
 fire(wrap,'pointerdown',{button:0,clientX:10,clientY:10});fire(wrap,'pointermove',{clientX:11,clientY:10});fire(wrap,'pointerup');fire(button(v,84));assert.equal(calls,1);assert.deepEqual(v.view.camF,before)
 fire(wrap,'pointerdown',{button:2,clientX:10,clientY:10});for(let x=11;x<=14;x++)fire(wrap,'pointermove',{clientX:x,clientY:10});fire(wrap,'pointerup');fire(button(v,84));assert.equal(calls,2,'4 px gathered a pixel at a time: still a click');assert.deepEqual(v.view.camF,before)
 fire(wrap,'pointerdown',{button:2,clientX:10,clientY:10});for(let x=11;x<=17;x++)fire(wrap,'pointermove',{clientX:x,clientY:10});fire(wrap,'pointerup');fire(button(v,84));assert.equal(calls,2,'7 px gathered a pixel at a time: a drag, never also a click');assert.notDeepEqual(v.view.camF,before,'and it moved the map');v.dispose()
})
test('host SELECT keeps arrow keys while board hovered; target buttons keep native Enter and Space',()=>{
 const {v,w}=boot(),wrap=v._V.dom.stage.parentNode;fire(wrap,'pointerenter');const before=structuredClone(v.view.camF),select=w.document.createElement('select');let prevented=0
 for(const key of ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'])w.document.dispatch('keydown',{key,target:select,preventDefault(){prevented++}})
 assert.deepEqual(v.view.camF,before);assert.equal(prevented,0);v.setTargeting(facts())
 for(const key of ['Enter',' '])w.document.dispatch('keydown',{key,target:button(v,84),preventDefault(){prevented++}})
 assert.equal(prevented,0);v.dispose()
})
test('host can clear targeting during render fault without recursion or replacing original error',()=>{
 let notifications=0,v;const failure=Error('target render failure'),b=boot('movement',{onError(){notifications++;v.setTargeting(null)}});v=b.v;v.setTargeting(facts());const old=button(v,84)
 Object.defineProperty(v._V.dom.panel,'innerHTML',{set(){throw failure},configurable:true})
 assert.throws(()=>v.setTargeting(facts()),e=>e===failure);assert.equal(notifications,1);assert.equal(v.invalid,failure);assert.equal(v._V.targeting,null);assert.equal(v._V.dom.stage.querySelector('.targeting'),null);fire(old);assert.throws(()=>v.setTargeting(facts()),/faulted/);v.dispose()
})

test('host disposal inside a false-returning unit click cannot fall through to inspect/render',()=>{
 let v,calls=0;const b=boot('movement',{onHexClick(){calls++;v.dispose();return false}});v=b.v;v.setTargeting(facts());const u=Object.values(v.state.U).find(u=>u.hex===85),img=v._V.layers.UEL.get(u.id).img
 fire(img);assert.equal(calls,1);assert.equal(v.view.inspectId,null);assert.equal(v._V.dom.root.innerHTML,'');fire(img);assert.equal(calls,1)
})
