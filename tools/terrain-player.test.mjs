import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { makeWindow } from './fakedom.mjs'
import { createRequire } from 'node:module'
import {execFileSync} from 'node:child_process'
import { packTerrainAssets } from './terrain-assets.mjs'
const require=createRequire(import.meta.url)
let source

function boot() {
  const html=readFileSync(process.env.VIEWER_PAGE || 'BATTLE-VIEWER.html','utf8'), m=html.match(/<script>([\s\S]*)<\/script>\s*$/), w=makeWindow()
  w.document.body.innerHTML=html.slice(0,m.index).replace(/<style>[\s\S]*?<\/style>/,'').replace(/<!--[\s\S]*?-->/g,'').replace(/<(meta|title|link)[^>]*>(<\/title>)?/g,'')
  const names=['window','document','requestAnimationFrame','setTimeout','clearTimeout','setInterval','clearInterval','addEventListener','alert','Date','performance','getComputedStyle','localStorage','self','globalThis']
  const run=code=>new Function(...names,code)(...names.map(n=>['window','self','globalThis'].includes(n)?w:w[n]))
  if(process.env.VIEWER_SOURCE==='1'){
    if(!source){
      run(m[1]);const lib=w.__battleView.lib;w.__battleView.harness.dispose()
      const inputs={STATIC:lib.static,FIELDS:lib.fields,ART:lib.art,GLYPHS:lib.glyphs,BATTLES:JSON.parse(readFileSync('battles/library.json')).battles.map(({file,label})=>({label,battle:JSON.parse(readFileSync('battles/'+file))})),STAMP:lib.stamp,ATLAS:packTerrainAssets()}
      source=require('../../engine/node_modules/esbuild').buildSync({entryPoints:['src/main.js'],nodePaths:['node_modules'],bundle:true,write:false,platform:'browser',format:'iife',define:Object.fromEntries(Object.entries(inputs).map(([k,v])=>['__BUNDLED_'+k+'__',JSON.stringify(v)]))}).outputFiles[0].text
    }
    run(source)
  }else run(m[1])
  return w
}
const dispatch=(el,type,extra={})=>{const e={preventDefault(){},stopPropagation(){},target:el,...extra};for(const f of el.listeners[type]||[])f(e)}

test('Battle picker is persistent outside the scaled scene, labeled and keyboard operable',()=>{
  const w=boot(),H=w.__battleView.harness,d=w.document,btn=d.querySelector('#battleBtn'),menu=d.querySelector('#battleMenu')
  assert.equal(d.querySelector('#screen').contains(btn),false,'selector must not be clipped/scaled with battlefield')
  assert.equal(btn.getAttribute('role'),'combobox')
  assert.equal(btn.getAttribute('aria-labelledby'),'battleLabel')
  assert.equal(btn.getAttribute('aria-haspopup'),'listbox')
  assert.equal(menu.getAttribute('role'),'listbox')
  const choices=menu.children;assert.equal(choices.length,28)
  dispatch(btn,'keydown',{key:'End'});dispatch(btn,'keydown',{key:'Enter'})
  assert.deepEqual(H.viewer.events,w.__battleView.lib.battles.at(-1).battle.events)
  assert.equal(choices[choices.length-1].getAttribute('aria-selected'),'true')
  dispatch(btn,'keydown',{key:'Home'});dispatch(btn,'keydown',{key:'Enter'})
  assert.deepEqual(H.viewer.events,w.__battleView.lib.battles[0].battle.events)
  H.dispose()
})
test('all choices repeatedly load actual battles; imported state clears library selection',()=>{
  const w=boot(),B=w.__battleView,H=B.harness,menu=w.document.querySelector('#battleMenu')
  for(const i of [22,0,...B.lib.battles.map((_,i)=>i),0]){
    dispatch(menu.children[i],'click');assert.deepEqual(H.viewer.events,B.lib.battles[i].battle.events)
    assert.equal(menu.children[i].getAttribute('aria-selected'),'true')
  }
  H.playExport(structuredClone(B.lib.battles[0].battle),'Imported journey')
  assert.equal(menu.children.filter(x=>x.getAttribute('aria-selected')==='true').length,0)
  assert.match(w.document.querySelector('#battleBtn').textContent,/Imported journey/)
  H.dispose()
})
test('unbound battle mount honestly retains accurate 2D without inventing an Atlas linkage',()=>{
  const w=boot(),H=w.__battleView.harness;H.load(w.__battleView.lib.battles.findIndex(b=>!b.battle.atlasScene));const v=H.viewer,status=v._V.dom.root.querySelector('#terrainStatus')
  assert.ok(status,'renderer availability must be visible')
  assert.match(status.textContent,/2D.*no authored Atlas scene linked/i)
  assert.equal(v._V.layers.ground.style.visibility,'')
  w.__battleView.harness.dispose()
})

test('battle page links to the separate Atlas without mounting a second map viewer',()=>{
 const w=boot(),H=w.__battleView.harness,d=w.document,events=JSON.stringify(H.viewer.events)
 assert.equal(d.querySelector('#atlasInspector'),null)
 assert.equal(H.atlas,undefined)
 const link=d.querySelector('#atlasLink');assert.ok(link)
 assert.equal(link.getAttribute('href'),'../assets/battle-atlas/index.html')
 assert.equal(link.getAttribute('target'),'_blank')
 assert.equal(JSON.stringify(H.viewer.events),events);H.dispose()
})

test('real compiled Atlas binding mounts with original events and display heights; invalid binding preserves current viewer',async()=>{
 const w=boot(),B=w.__battleView,H=B.harness
 const battle=JSON.parse(readFileSync('../assets/battle-atlas/generated-combat/showcase.atlas-priory.json'));
 const data=H.battleData({label:'Presentation binding fixture',battle}),host=w.document.createElement('div');w.document.body.appendChild(host)
 let failure;const v=B.mount(host,data,{autoplay:false,terrainDriver:(_V,fail)=>{failure=fail;return{ready:Promise.resolve(),dispose(){}}}})
 v.push(battle.events);await Promise.resolve();await Promise.resolve();assert.deepEqual(v.events,battle.events)
 assert.ok(v._V.data.displayHeights[97]>50,'authored raised sanctuary height is applied outside folded state')
 const unit=Object.values(v.state.U).find(u=>v._V.data.displayHeights[u.hex]>0),node=v._V.layers.UEL.get(unit.id).root;assert.match(node.style.transform,/translateZ/)
 const saved=JSON.stringify(v.state);failure(Error('test context loss'));assert.equal(v._V.data.displayHeights,null);assert.equal(node.style.transform,'');assert.equal(JSON.stringify(v.state),saved)
 const before=H.viewer,bad=structuredClone(battle);bad.atlasScene.initialMapFact.props=[];assert.throws(()=>H.playExport(bad),/map fact/);assert.equal(H.viewer,before)
 v.dispose();H.dispose()
})
