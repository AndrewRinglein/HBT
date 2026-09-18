import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createRequire} from 'node:module'
import {makeWindow} from './fakedom.mjs'
const require=createRequire(import.meta.url),read=p=>JSON.parse(readFileSync(p,'utf8'))
const statics=read('generated/static.json'),fields=read('generated/fields.json'),art=read('generated/art/manifest.json'),glyphs=read('generated/ra-glyphs.json')
const battle=read('battles/map_horde-24_s3.json'),burst=read('tools/fixtures/bursts.json').cases[0]
let source
function boot({wall=10000,now,harness=false,withBurst=false}={}){
 const w=makeWindow();w._tick(wall)
 const names=['window','document','requestAnimationFrame','setTimeout','clearTimeout','setInterval','clearInterval','addEventListener','alert','Date','performance','getComputedStyle','localStorage','self','globalThis']
 const run=code=>new Function(...names,code)(...names.map(n=>['window','self','globalThis'].includes(n)?w:w[n]))
 if(process.env.VIEWER_PAGE){
  const html=readFileSync(process.env.VIEWER_PAGE,'utf8'),m=html.match(/<script>([\s\S]*)<\/script>\s*$/)
  w.document.body.innerHTML=html.slice(0,m.index).replace(/<style>[\s\S]*?<\/style>/,'').replace(/<!--[\s\S]*?-->/g,'').replace(/<(meta|title|link)[^>]*>(<\/title>)?/g,'');run(m[1])
 }else{
  if(!source){const inputs={STATIC:statics,FIELDS:fields,ART:{artmap:art.artmap,assets:{}},GLYPHS:glyphs,BATTLES:[{label:'Clock TEST',battle}],STAMP:{},ATLAS:null}
   source=require('../../engine/node_modules/esbuild').buildSync({entryPoints:['src/main.js'],nodePaths:['node_modules'],bundle:true,write:false,platform:'browser',format:'iife',define:Object.fromEntries(Object.entries(inputs).map(([k,v])=>['__BUNDLED_'+k+'__',JSON.stringify(v)]))}).outputFiles[0].text}
  w.document.body.innerHTML=readFileSync('src/page.html','utf8').split('<script>')[0].replace(/<style>[\s\S]*?<\/style>/,'').replace(/<!--[\s\S]*?-->/g,'').replace(/<(meta|title|link)[^>]*>(<\/title>)?/g,'');run(source)
 }
 const B=w.__battleView,H=B.harness
 if(harness){H.viewer.pause();return{w,v:H.viewer,H,B}}
 H.dispose();const host=w.document.createElement('div');w.document.body.appendChild(host)
 const events=withBurst?burst.events:battle.events,seed=withBurst?{mapId:burst.options.map.id}:battle.seed
 const data={initialEvents:events,field:fields[seed.mapId],fieldMapId:seed.mapId,units:statics.units,statuses:statics.statuses,absorbingStatuses:statics.absorbingStatuses,actions:statics.actions,badges:statics.badges,layers:statics.layers,artmap:art.artmap,assets:{},glyphs,meta:{seed}}
 const v=B.mount(host,data,{autoplay:false,...(now?{now}:{})});v.push(events);return{w,v,events}
}

test('mounted presentation clock is relative and speed changes add no time',()=>{
 const {w,v}=boot();assert.equal(v._V.clock(),0)
 w._tick(1000);assert.equal(v._V.clock(),750)
 for(const speed of [4,1,1/3,2,1]){const before=v._V.clock();v.speed(speed);assert.equal(v._V.clock(),before)}
 v.dispose()
})
for(const [type,key,deadline] of [['attack.declared','FIRING','until'],['trigger.fired','TRIGFLASH','until'],['attack.miss','AIM','expire']])for(const [from,to] of [[1,4],[4,1]])test(`real ${type} deadline remains continuous at ${from}→${to}`,()=>{
 const {w,v,events}=boot(),i=events.findIndex(e=>e.type===type);assert.ok(i>=0,`fixture must carry ${type}`)
 v.speed(from);v.seek(i);v.step();const stamp=v.state[key][deadline],before=v._V.clock(),remaining=stamp-before
 assert.ok(remaining>0);v.speed(to);assert.equal(v._V.clock(),before);assert.equal(v.state[key][deadline],stamp)
 w._tick(50);assert.equal(v._V.clock(),before+50*to*.75);assert.equal(stamp-v._V.clock(),remaining-50*to*.75)
 v.render();assert.equal(v.state[key][deadline],stamp);v.dispose()
})
test('wall rollback retains high-water instead of counting recovered time twice',()=>{
 let wall=1000;const {v}=boot({now:()=>wall});const initial=v._V.clock()
 wall=900;assert.equal(v._V.clock(),initial);wall=1100;assert.equal(v._V.clock(),initial+75)
 wall=1000;v.speed(4);assert.equal(v._V.clock(),initial+75);wall=1200;assert.equal(v._V.clock(),initial+375);v.dispose()
})
test('invalid speeds reject atomically without disturbing active burst budget or timers',()=>{
 const {v,w,events}=boot({withBurst:true});v.seek(events.findIndex(e=>e.type==='burst.declared'));v.step()
 for(const speed of [0,-1,NaN,Infinity,-Infinity,'4',null,undefined,{},true]){
  const state=structuredClone(v.state),timers=[...v._V.fx.timers],clock=v._V.clock(),rate=v.speedValue
  assert.throws(()=>v.speed(speed),/speed/i);assert.equal(v.speedValue,rate);assert.equal(v._V.clock(),clock);assert.deepEqual([...v._V.fx.timers],timers);assert.deepEqual(v.state,state)
 }
 w._flush(3201);assert.equal(v.view.burstVisible,false);v.dispose()
})
test('pause keeps wall decay, resume and seek preserve continuity, dispose leaves no beat timer',()=>{
 const {w,v,events}=boot();v.pause();const start=v._V.clock();w._tick(400);assert.equal(v._V.clock(),start+300)
 v.speed(4);const before=v._V.clock();v.play();v.pause();assert.equal(v._V.clock(),before)
 v.seek(events.findIndex(e=>e.type==='attack.declared')+1);assert.equal(v._V.clock(),before);assert.equal(v.state.FIRING,null);assert.equal(v.state.TRIGFLASH,null)
 v.dispose();assert.equal(v._V.fx.timers.size,0);assert.equal(v._V.timer,null)
})
for(const running of [false,true])test(`actual harness speed button stays continuous while ${running?'running':'paused'}`,()=>{
 const {w,v,H}=boot({harness:true});w._tick(1000);if(running)v.play();const button=w.document.querySelector('#speedBtn')
 for(const next of [2,4,1/3,1]){const before=v._V.clock(),cursor=v.cursor,timer=v._V.timer;for(const f of button.listeners.click)f({target:button});assert.equal(v.speedValue,next);assert.equal(v._V.clock(),before);assert.equal(v.cursor,cursor);assert.equal(v._V.timer,timer);assert.equal(v.playing,running);w._tick(12);assert.equal(v._V.clock(),before+12*next*.75)}
 H.dispose()
})
