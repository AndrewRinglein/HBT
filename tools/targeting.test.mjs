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
 const data={initialEvents:c.events,units:fixtureUnits(statics.units,c.action),statuses:statics.statuses,absorbingStatuses:statics.absorbingStatuses,actions:{...statics.actions,[c.action.id]:c.action},badges:statics.badges,layers:statics.layers,artmap:art.artmap,assets:{},glyphs,meta:{seed:{mapId:c.options.map.id}}}
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
test('camera drag suppresses release selection/inspection; keyboard activation and next click work',()=>{
 let calls=0;const {v}=boot('movement',{onHexClick:()=>{calls++;return true}});v.setTargeting(facts());const wrap=v._V.dom.stage.parentNode,drag=()=>{fire(wrap,'pointerdown',{button:0,clientX:10,clientY:10});fire(wrap,'pointermove',{clientX:30,clientY:20});fire(wrap,'pointerup')}
 const before=structuredClone(v.view.camF);drag();assert.notDeepEqual(v.view.camF,before);fire(button(v,84));assert.equal(calls,0)
 fire(button(v,84),'click',{detail:0});assert.equal(calls,1)
 drag();const img=v._V.layers.UEL.values().next().value.img;fire(img);assert.equal(v.view.inspectId,null);assert.equal(calls,1)
 fire(wrap,'pointerdown',{button:0,clientX:30,clientY:20});fire(wrap,'pointerup');fire(button(v,84));assert.equal(calls,2);v.dispose()
})
test('callback exceptions fault-lock host and all retained input callbacks',()=>{
 let error=null,calls=0;const failure=Error('host target failure'),{v}=boot('movement',{onHexClick(){calls++;throw failure},onError:e=>error=e});v.setTargeting(facts());const n=button(v,84);assert.throws(()=>fire(n),/host target failure/);assert.equal(v.invalid,failure);assert.equal(error,failure);assert.equal(v.playing,false);fire(n);assert.equal(calls,1);v.dispose()
})

test('footprint and shielding are copied even outside legal centres; no supplied floor inference',()=>{
 const {v}=boot();const p={legalHexes:[84],centre:null,hexes:[85,86],shielded:[{hex:87,props:[]}]};v.setTargeting(p)
 assert.deepEqual(v._V.dom.stage.querySelectorAll('.targetHex').map(n=>+n.dataset.hex),[84]);assert.deepEqual(v._V.dom.stage.querySelectorAll('.targetFootprint').map(n=>+n.dataset.hex),[85,86]);assert.equal(v._V.dom.stage.querySelector('.targetShield').dataset.hex,'87');assert.equal(v._V.dom.stage.querySelector('.targetCentre'),null);v.dispose()
})

test('one-pixel click jitter remains a click; drag threshold accumulates from pointer origin',()=>{
 let calls=0;const {v}=boot('movement',{onHexClick:()=>{calls++;return true}});v.setTargeting(facts());const wrap=v._V.dom.stage.parentNode,before=structuredClone(v.view.camF)
 fire(wrap,'pointerdown',{button:0,clientX:10,clientY:10});fire(wrap,'pointermove',{clientX:11,clientY:10});fire(wrap,'pointerup');fire(button(v,84));assert.equal(calls,1);assert.deepEqual(v.view.camF,before)
 fire(wrap,'pointerdown',{button:0,clientX:10,clientY:10});for(let x=11;x<=14;x++)fire(wrap,'pointermove',{clientX:x,clientY:10});fire(wrap,'pointerup');fire(button(v,84));assert.equal(calls,1);assert.notDeepEqual(v.view.camF,before);v.dispose()
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
