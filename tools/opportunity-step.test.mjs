import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createRequire} from 'node:module'
import {makeWindow} from './fakedom.mjs'
import {createState,fold,foldTo} from '../src/fold.js'
import {buildLog} from '../src/log.js'
const require=createRequire(import.meta.url),read=p=>JSON.parse(readFileSync(p,'utf8'))
const fixtures=read('tools/fixtures/aoo-step.json'),statics=read('generated/static.json'),art=read('generated/art/manifest.json')
let source
function boot(name='stopped',options={}){
 const w=makeWindow(),c=structuredClone(fixtures.find(c=>c.name===name));assert.ok(c,name)
 if(options.edit)options.edit(c.events)
 const names=['window','document','requestAnimationFrame','setTimeout','clearTimeout','setInterval','clearInterval','addEventListener','Date','performance','getComputedStyle','alert','localStorage','self','globalThis']
 const run=code=>new Function(...names,code)(...names.map(n=>['window','self','globalThis'].includes(n)?w:w[n]))
 let mount
 if(process.env.VIEWER_PAGE){const html=readFileSync(process.env.VIEWER_PAGE,'utf8'),m=html.match(/<script>([\s\S]*)<\/script>\s*$/);w.document.body.innerHTML=html.slice(0,m.index).replace(/<style>[\s\S]*?<\/style>/,'').replace(/<!--[\s\S]*?-->/g,'');run(m[1]);w.__battleView.harness.dispose();mount=w.__battleView.mount}
 else {if(!source)source=require('../../engine/node_modules/esbuild').buildSync({stdin:{contents:"import {mountBattleViewer} from './src/viewer.js';window.__mount=mountBattleViewer",resolveDir:process.cwd()},nodePaths:['node_modules'],bundle:true,write:false,platform:'browser',format:'iife'}).outputFiles[0].text;run(source);mount=w.__mount}
 const host=w.document.createElement('div');w.document.body.appendChild(host)
 const v=mount(host,{initialEvents:c.events,fieldMapId:c.seed.mapId,field:read('generated/fields.json')[c.seed.mapId],units:statics.units,statuses:statics.statuses,absorbingStatuses:statics.absorbingStatuses,actions:statics.actions,badges:statics.badges,layers:statics.layers,artmap:art.artmap,assets:{},meta:{seed:c.seed}},{autoplay:false})
 v.push(c.events);const index=c.events.findIndex(e=>e.type==='aoo.provoked');assert.ok(index>=0);v.seek(index)
 return{v,w,c,index,e:c.events[index]}
}
const strip=S=>({...structuredClone(S),AIM:null,FIRING:null,TRIGFLASH:null})
const floats=v=>v._V.layers.floatL?.textContent||''
const pos=(v,hex)=>({x:v._V.data.POS[hex].px,y:v._V.data.POS[hex].py+v._V.data.LAYOUT.H*.28})
function third(v,e){const a=pos(v,e.from),b=pos(v,e.to);return{x:a.x+(b.x-a.x)/3,y:a.y+(b.y-a.y)/3}}
test('attempted hex is durable engine data, including seek inside multiple reactions',()=>{
 const {v,c,e,index}=boot('multiple');v.step()
 assert.deepEqual([v.state.AOO.from,v.state.AOO.to,v.state.AOO.moveSeq],[e.from,e.to,e.moveSeq]);assert.equal(v.state.U[e.target].hex,e.from)
 const context={UD:statics.units,SN:statics.statuses},S=createState()
 for(let i=0;i<c.events.length;i++){fold(S,c.events[i],context,0);assert.deepEqual(strip(S),strip(foldTo(c.events,i+1,context)),`cursor ${i+1}`)}
 v.seek(index+1);assert.equal(v.state.AOO.to,e.to);assert.equal(v._V.layers.dyn.querySelector('.opportunityDestination').dataset.hex,String(e.to));v.dispose()
})
for(const speed of [1/3,1,4])test(`marker and third-step precede label at speed ${speed}`,()=>{
 const {v,w,e}=boot();v.speed(speed);v._V.data.displayHeights={[e.from]:9,[e.to]:39};v.step()
 const E=v._V.layers.UEL.get(e.target),p=third(v,e),a=pos(v,e.from),animation=E.walk
 assert.equal(v._V.layers.dyn.querySelector('.opportunityDestination').dataset.hex,String(e.to))
 assert.equal(E.root.style.left,p.x+'px');assert.equal(E.root.style.top,p.y+'px');assert.equal(E.root.style.transform,'translateZ(19px)')
 assert.equal(animation.kf[0].left,a.x+'px');assert.equal(animation.kf.at(-1).left,p.x+'px')
 assert.equal(animation.opts.duration,240/(speed*.75));assert.doesNotMatch(floats(v),/ATTACK OF OPPORTUNITY/)
 w._flush(240/(speed*.75)+1);assert.match(floats(v),/ATTACK OF OPPORTUNITY/)
 v.render();assert.equal(E.root.style.left,p.x+'px');assert.equal(v.state.U[e.target].hex,e.from);v.dispose()
})
test('hit returns from the held third-step to the unchanged hex',()=>{
 const {v,c,e}=boot();v.step();const p=third(v,e),stop=c.events.findIndex(x=>x.type==='move.stopped');assert.ok(stop>0)
 while(v.cursor<=stop)v.step()
 const E=v._V.layers.UEL.get(e.target),a=pos(v,e.from)
 assert.equal(E.walk.kf[0].left,p.x+'px');assert.equal(E.walk.kf.at(-1).left,a.x+'px');assert.equal(E.root.style.left,a.x+'px')
 assert.equal(v.state.U[e.target].hex,e.from);assert.equal(v.state.AOO,null);assert.equal(v._V.layers.dyn.querySelector('.opportunityDestination'),null);v.dispose()
})
for(const name of ['missed','blocked'])test(`${name} completes actual movement from the partial pose`,()=>{
 const {v,c,e}=boot(name);v.step();const p=third(v,e),entry=c.events.findIndex((x,i)=>i>v.cursor&&x.type==='moved'&&x.actor===e.target);assert.ok(entry>0)
 while(v.cursor<entry)v.step()
 if(name==='blocked'){assert.ok(c.events.some(x=>x.type==='block.rolled'&&x.blocked));assert.match(floats(v),/BLOCK/)}
 v.step();const E=v._V.layers.UEL.get(e.target);assert.equal(E.walk.kf[0].left,p.x+'px');assert.equal(E.walk.kf[0].top,p.y+'px');assert.equal(v.state.AOO,null)
 assert.equal(E.walk.kf.at(-1).left,pos(v,v.state.U[e.target].hex).x+'px');v.dispose()
})
test('multiple holders do not replay the outward step or reset the held position',()=>{
 const {v,c,e}=boot('multiple');v.step();const E=v._V.layers.UEL.get(e.target),walk=E.walk,p=third(v,e)
 const second=c.events.findIndex((x,i)=>i>v.cursor&&x.type==='aoo.provoked');assert.ok(second>0)
 while(v.cursor<=second)v.step()
 assert.equal(E.walk,walk);assert.equal(E.root.style.left,p.x+'px');assert.equal(v.state.U[e.target].hex,e.from);v.dispose()
})
test('downed mover re-centres even when engine emits no move.stopped',()=>{
 const {v,c,e}=boot('downed');const down=c.events.findIndex(x=>x.type==='life.downed'&&x.target===e.target);assert.ok(down>0);assert.ok(!c.events.some(x=>x.type==='move.stopped'))
 v.step();while(v.cursor<=down)v.step()
 assert.equal(v.state.AOO,null);assert.equal(v._V.layers.UEL.get(e.target).root.style.left,pos(v,e.from).x+'px');v.dispose()
})
test('seek and disposal cancel the pending label and attempted animation',()=>{
 const {v,w,e,index}=boot();v.step();const anim=v._V.layers.UEL.get(e.target).walk;v.seek(index)
 assert.equal(anim.cancelled,true);w._flush(1000);assert.doesNotMatch(floats(v),/ATTACK OF OPPORTUNITY/)
 v.step();v.dispose();w._flush(1000);assert.equal(v._V.fx.timers.size,0)
})
test('a drained live component retains the attempt until movement resolution arrives',()=>{
 const {v,c,index,e}=boot();const rest=c.events.slice(index+1);v._V.EV.length=index+1;v.play()
 assert.equal(v.state.AOO.to,e.to);v.render();assert.equal(v._V.layers.UEL.get(e.target).root.style.left,third(v,e).x+'px')
 v.pause();v.push(rest);while(v.cursor<v.events.length)v.step();assert.equal(v.state.AOO,null);v.dispose()
})
test('invalid attempted-step coordinates fail visibly, never inventing a destination',()=>{
 const {v}=boot('stopped',{edit:events=>{events.find(e=>e.type==='aoo.provoked').to=999999}})
 assert.throws(()=>v.play(),/opportunity.*hex/i);assert.ok(v.invalid);assert.equal(v.playing,false);v.dispose()
})
test('multihit block followed by a connected hit returns only at the engine stop',()=>{
 const {v,c,e}=boot('multihit-connected-stop');v.step();const p=third(v,e)
 const rolls=c.events.filter(x=>x.type==='block.rolled');assert.equal(rolls.length,2);assert.ok(rolls.some(x=>x.blocked));assert.ok(rolls.some(x=>!x.blocked))
 const stop=c.events.findIndex(x=>x.type==='move.stopped');assert.ok(stop>0)
 while(v.cursor<stop){v.step();assert.equal(v._V.layers.UEL.get(e.target).root.style.left,p.x+'px')}
 v.step();assert.equal(v.state.U[e.target].hex,e.from);assert.equal(v._V.layers.UEL.get(e.target).root.style.left,pos(v,e.from).x+'px');v.dispose()
})
test('block result is an exact word cue and log fact, with no fabricated damage',()=>{
 const c=fixtures.find(c=>c.name==='blocked'),S=createState(),ctx={UD:statics.units,SN:statics.statuses}
 for(const e of c.events){const hp=S.U[e.defender]?.hp,cues=fold(S,e,ctx)
  if(e.type==='block.rolled'&&e.blocked){assert.deepEqual(cues,[{k:'float',hex:S.U[e.defender].hex,kind:'block',text:'BLOCK',small:true}]);assert.equal(S.U[e.defender].hp,hp);assert.equal(S.AIM,null);assert.equal(S.ATTACK,null)}}
 assert.match(JSON.stringify(buildLog(c.events,{},0)),/BLOCKS/)
})
test('pause and speed changes do not snap the held pose; no animation support still shows exact attempt',()=>{
 const {v,w,e}=boot();const E=v._V.layers.UEL.get(e.target);E.root.animate=null;v.step();const p=third(v,e)
 v.pause();v.speed(4);w._flush(400);v.render();assert.equal(E.root.style.left,p.x+'px');assert.equal(v.state.U[e.target].hex,e.from)
 assert.match(floats(v),/ATTACK OF OPPORTUNITY/);v.dispose()
})
