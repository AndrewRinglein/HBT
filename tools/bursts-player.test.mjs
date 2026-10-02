import '../../engine/tools/engine-modules.mjs'   // first: links engine/node_modules into a worker's copy (Andrew, 2026-10-01)
import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createRequire} from 'node:module'
import {fixtureUnits} from './burst-fixture-data.mjs'
import {makeWindow} from './fakedom.mjs'
const require=createRequire(import.meta.url),fixture=JSON.parse(readFileSync('tools/fixtures/bursts.json')),statics=JSON.parse(readFileSync('generated/static.json')),glyphs=JSON.parse(readFileSync('generated/ra-glyphs.json')),art=JSON.parse(readFileSync('generated/art/manifest.json'))
let source
function boot(name='shielding',opts={}){
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
 const v=w.__burstMount(host,data,{autoplay:false,...opts});v.push(c.events)
 return{w,v,c,callbacks,declaration:c.events.findIndex(e=>e.type==='burst.declared')}
}
function declarationStep(b){b.v.seek(b.declaration);b.v.step()}
test('component draws exact footprint, centre and terrain shielding at display heights without attack badges',()=>{
 const b=boot(),{v,c}=b;declarationStep(b);const d=c.events[b.declaration]
 assert.deepEqual(v._V.layers.dyn.querySelectorAll('.burstHex').map(n=>+n.dataset.hex),d.hexes)
 assert.equal(v._V.layers.dyn.querySelectorAll('.burstCentre').length,1);assert.equal(v._V.layers.dyn.querySelector('.burstCentre').dataset.hex,String(d.centre))
 v._V.data.displayHeights={87:65};v.step();v.render()
 const shield=v._V.layers.dyn.querySelector('.burstShield');assert.equal(shield.dataset.hex,'87');assert.equal(shield.dataset.props,'prop.test.partition');assert.match(shield.style.transform,/65px/)
 assert.match(v._V.layers.dyn.textContent,/Terrain shielding/);assert.equal(v.state.AIM,null);assert.equal(v.state.ATTACK,null)
 const row=v._V.dom.actionbar.querySelectorAll('.acRow').find(n=>n.dataset.act===c.action.id)
 assert.match(row.textContent,/BURST/);assert.doesNotMatch(row.textContent,/ACC|CRIT|BLOCK/)
 const durable=structuredClone(v.state.BURST);v.render();assert.deepEqual(v.state.BURST,durable);v.dispose()
})
test('expiry only hides visibility; seek/new declaration/dispose invalidate retained callbacks',()=>{
 const b=boot(),{v,w,callbacks}=b;declarationStep(b);const old=callbacks.at(-1);assert.equal(typeof old,'function')
 const durable=structuredClone(v.state.BURST);w._flush(3300);assert.equal(v.view.burstVisible,false);assert.deepEqual(v.state.BURST,durable)
 v.seek(b.declaration+1);assert.equal(v.view.burstVisible,true);old();assert.equal(v.view.burstVisible,true)
 declarationStep(b);const fresh=callbacks.at(-1);old();assert.equal(v.view.burstVisible,true)
 v.dispose();const state=structuredClone(v.state),visible=v.view.burstVisible;fresh();assert.deepEqual(v.state,state);assert.equal(v.view.burstVisible,visible);assert.equal(v._V.fx.timers.size,0)
})
test('lifetime consumes elapsed beats continuously through fixed speeds and speed changes',()=>{
 for(const speed of [1/3,1,4]){const b=boot(),{v,w}=b;w._flush(10000);v.speed(speed);declarationStep(b)
  w._flush(1200/(speed*.75));assert.equal(v.view.burstVisible,true);v.speed(speed*2)
  w._flush(1199/(speed*2*.75));assert.equal(v.view.burstVisible,true);w._flush(2/(speed*2*.75));assert.equal(v.view.burstVisible,false);assert.ok(v.state.BURST);v.dispose()}
})
test('unrelated HP does not revive an expired burst, while matching packets do',()=>{
 const b=boot('friendly'),{v,w,c}=b;declarationStep(b);w._flush(3300);assert.equal(v.view.burstVisible,false)
 const hp=c.events.find(e=>e.type==='damage.applied'&&e.burst),n=v.events.length;v.push([{...hp,causeId:'status.unrelated',burst:false}])
 v._V.cursor=n;v.step();assert.equal(v.view.burstVisible,false);v.push([hp]);v.step();assert.equal(v.view.burstVisible,true);v.dispose()
})
test('live drain is independent of linger and expiry redraw faults notify and lock host',()=>{
 let drains=0,error=null,playing=null;const b=boot('shielding',{onDrain(){drains++},onError(e){error=e},onPlayState(p){playing=p}}),{v,w}=b
 v.speed(4);v.play();for(let i=0;i<50&&v.cursor<v.events.length;i++)w._flush(400);w._flush(100)
 assert.equal(v.cursor,v.events.length);assert.ok(drains>0);assert.equal(v.invalid,null)
 declarationStep(b);const callback=b.callbacks.at(-1),err=Error('expiry render failure');Object.defineProperty(v._V.dom.panel,'innerHTML',{set(){throw err},configurable:true})
 assert.throws(()=>callback(),/expiry render failure/);assert.equal(v.invalid,err);assert.equal(error,err);assert.equal(playing,false);assert.equal(v.playing,false);v.dispose()
})

test('real grouped movement cancels burst timer without rearming on speed changes',()=>{
 const b=boot('movement'),{v,callbacks,c}=b;declarationStep(b)
 const move=c.events.findIndex(e=>e.type==='move.begin')
 while(v.cursor<move)v.step()
 const old=callbacks.at(-1);assert.ok(v._V.fx.timers.has(old.timerId))
 v.step();assert.equal(v.state.BURST,null)
 assert.equal(v._V.fx.timers.has(old.timerId),false,'grouped nonvisual fold must cancel timer')
 const count=callbacks.length;old();v.speed(2);assert.equal(callbacks.length,count);assert.equal(v.view.burstVisible,false);v.dispose()
})
for(const part of ['hexes','centre','shielded'])test(`malformed burst ${part} faults instead of silently dropping cells`,()=>{
 let error=null
 const b=boot('shielding',{onError(e){error=e},eventEdit(events){
  const e=events.find(e=>e.type===(part==='shielded'?'burst.shielded':'burst.declared'))
  if(part==='hexes')e.hexes.push(9999);else if(part==='centre')e.centre=9999;else e.hex=9999
 }})
 const index=b.c.events.findIndex(e=>e.type===(part==='shielded'?'burst.shielded':'burst.declared'))
 b.v.seek(index);assert.throws(()=>b.v.play(),/burst.*hex/i);assert.ok(error);assert.equal(b.v.invalid,error);assert.equal(b.v.playing,false);b.v.dispose()
})
for(const name of ['friendly','zero'])test(`TEST ${name} component descriptors match exact fixture action override`,()=>{
 const b=boot(name);declarationStep(b)
 const row=b.v._V.dom.actionbar.querySelectorAll('.acRow').find(n=>n.dataset.act===b.c.action.id)
 const text=row.querySelector('.acTag').getAttribute('title')
 assert.match(text,/radius 1 · any/)
 if(name==='zero'){assert.match(text,/0 fire/);assert.match(text,/0 shadow/);assert.doesNotMatch(text,/4 fire|3 shadow/)}
 b.v.dispose()
})
