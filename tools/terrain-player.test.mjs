import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { makeWindow } from './fakedom.mjs'
import { createRequire } from 'node:module'
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
      const inputs={STATIC:lib.static,FIELDS:lib.fields,ART:lib.art,GLYPHS:lib.glyphs,BATTLES:lib.battles,STAMP:lib.stamp,TERRAIN:packTerrainAssets()}
      source=require('../../engine/node_modules/esbuild').buildSync({entryPoints:['src/main.js'],bundle:true,write:false,platform:'browser',format:'iife',define:Object.fromEntries(Object.entries(inputs).map(([k,v])=>['__BUNDLED_'+k+'__',JSON.stringify(v)]))}).outputFiles[0].text
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
  const choices=menu.children;assert.equal(choices.length,23)
  dispatch(btn,'keydown',{key:'End'});dispatch(btn,'keydown',{key:'Enter'})
  assert.deepEqual(H.viewer.events,w.__battleView.lib.battles[22].battle.events)
  assert.equal(choices[22].getAttribute('aria-selected'),'true')
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
test('headless mount honestly exposes unavailable WebGL as visible 2D fallback',()=>{
  const w=boot(),v=w.__battleView.viewer,status=v._V.dom.root.querySelector('#terrainStatus')
  assert.ok(status,'renderer availability must be visible')
  assert.match(status.textContent,/2D.*WebGL/i)
  assert.equal(v._V.layers.ground.style.visibility,'')
  w.__battleView.harness.dispose()
})
