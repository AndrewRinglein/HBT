import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { makeWindow } from './fakedom.mjs'
const require = createRequire(import.meta.url)
let sourceCode

function boot() {
  const html = readFileSync(process.env.VIEWER_PAGE || 'BATTLE-VIEWER.html', 'utf8')
  const m = html.match(/<script>([\s\S]*)<\/script>\s*$/)
  const w = makeWindow()
  w.document.body.innerHTML = html.slice(0, m.index).replace(/<style>[\s\S]*?<\/style>/, '').replace(/<!--[\s\S]*?-->/g, '').replace(/<(meta|title|link)[^>]*>(<\/title>)?/g, '')
  const names = ['window','document','requestAnimationFrame','setTimeout','clearTimeout','setInterval','clearInterval','addEventListener','alert','Date','performance','getComputedStyle','localStorage','self','globalThis']
  const run = code => new Function(...names, code)(...names.map(n => n === 'window' || n === 'self' || n === 'globalThis' ? w : w[n]))
  if (process.env.VIEWER_SOURCE === '1') {
    if (!sourceCode) {
      run(m[1]);const lib=w.__battleView.lib;w.__battleView.harness.dispose()
      // Focused source bundle, not a published artifact. The full gate always
      // supplies its actual candidate page and never enables this mode.
      lib.static=JSON.parse(readFileSync('generated/static.json','utf8'))
      sourceCode=require('../../engine/node_modules/esbuild').buildSync({entryPoints:['src/main.js'],nodePaths:['node_modules'],bundle:true,write:false,platform:'browser',format:'iife',define:Object.fromEntries(Object.entries({STATIC:lib.static,FIELDS:lib.fields,ART:lib.art,GLYPHS:lib.glyphs,BATTLES:lib.battles,STAMP:lib.stamp}).map(([k,v])=>['__BUNDLED_'+k+'__',JSON.stringify(v)]))}).outputFiles[0].text
    }
    run(sourceCode)
  } else run(m[1])
  return w
}
function battle(id, width = 13, height = 5, extra = {}) {
  const map = { id, name: 'Direct fixture', rows: Array.from({length:height}, (_,r) => r === 1 ? '.w' + '.'.repeat(width-2) : '.'.repeat(width)), props: [{id:'prop.direct',height:'high',material:2,footprint:{kind:'hex',hexes:[5,6]}}] }
  const code = `import {createBattle} from './src/core/setup.ts';import {runBattle} from './src/core/battle.ts';const c=createBattle({replicate:1,map:${JSON.stringify(map)},heroes:['alpha-lucius'],enemies:['unit.fire-imp'],heroHexes:[0],enemyHexes:[${width*height-1}],...${JSON.stringify(extra)}});const r=runBattle(c);console.log(JSON.stringify({seed:{mapId:${JSON.stringify(id)},replicate:1},events:c.events,engineCommit:'fixture',outcome:r.outcome,turns:r.turns}));`
  return JSON.parse(execFileSync(process.execPath, ['node_modules/tsx/dist/cli.mjs','-e',code],{cwd:'../engine',encoding:'utf8'}))
}
for (const [label,id,width,height] of [['unknown','test.map.unregistered',13,5],['resized','map.open',13,5],['changed','map.open',16,16]]) test(`actual drop uses ${label} initial geometry and preserves every event`, async () => {
  const w=boot(), H=w.__battleView.harness, b=battle(id,width,height), before=H.viewer
  // Fake DOM CSS splits semicolons in data URLs. A distinctive ordinary asset
  // URL tests the real ground recipe without depending on that CSS parser limit.
  w.__battleView.lib.art.assets['hexOcean.png']='https://fixture.invalid/water.png'
  w.document.dispatch('drop',{preventDefault(){},dataTransfer:{files:[{name:'direct.json',text:async()=>JSON.stringify(b)}]}})
  await new Promise(resolve=>setImmediate(resolve))
  const v=H.viewer; v.pause()
  assert.notEqual(v,before)
  assert.equal(v._V.data.F.width,width); assert.equal(v._V.data.F.height,height)
  assert.equal(v._V.data.F.terrainIds[width+1],'terrain.water')
  assert.equal(v._V.data.POS.length,width*height)
  assert.deepEqual(v._V.data.POS[width+1],{c:1,r:1,px:256,py:162})
  assert.equal(v._V.dom.stage.style.width,(width*128+64)+'px')
  const groundCells=v._V.layers.ground.children.filter(n=>n.className==='cell')
  assert.equal(groundCells.length,width*height)
  assert.ok(groundCells[width+1].style.cssText.includes(v._V.data.ASSETS['hexOcean.png']))
  assert.deepEqual(v._V.layers.props.children.map(n=>Number(n.dataset.hex)),[5,6])
  assert.equal(v.events.length,b.events.length)
  v.seek(b.events.length); assert.equal(v.state.outcome,b.outcome)
  H.dispose()
})
test('malformed dropped initial facts leave current viewer intact', () => {
  const w=boot(), H=w.__battleView.harness, before=H.viewer, b=battle('map.open',16,16)
  b.events.find(e=>e.type==='map.loaded').terrain=[0]
  assert.throws(()=>H.playExportText(JSON.stringify(b)),/terrain|field/i)
  assert.equal(H.viewer,before); assert.notEqual(before.dom.slots.top.parentNode,null)
  H.dispose()
})
test('component requires initial facts before mutating its host',()=>{
  const w=boot(), B=w.__battleView, data=B.harness.battleData(B.lib.battles[0])
  delete data.initialEvents
  const root=w.document.createElement('div');root.innerHTML='preserve host'
  assert.throws(()=>B.mount(root,data,{autoplay:false}),/initial/i)
  assert.equal(root.innerHTML,'preserve host');B.harness.dispose()
})
test('component rejects a pushed map that differs from prepared initial facts',()=>{
  const w=boot(), B=w.__battleView, b=battle('test.map.unregistered'), data=B.harness.battleData({battle:b,label:'direct'})
  const root=w.document.createElement('div'), v=B.mount(root,data,{autoplay:false})
  const bad=structuredClone(b.events);bad.find(e=>e.type==='map.loaded').terrain[0]=5
  assert.throws(()=>v.push(bad),/initial|map|prepared/i)
  assert.equal(v.events.length,0)
  v.push(b.events) // rejected input did not consume its initial-map slot
  const before=v.events.length
  assert.throws(()=>v.push([b.events.find(e=>e.type==='map.loaded')]),/duplicated/)
  assert.equal(v.events.length,before)
  v.dispose();B.harness.dispose()
})
test('live component preserves early events, splits, ownership and seek/step on same-ID maps',()=>{
  const w=boot(), B=w.__battleView, b=battle('map.open'), original=structuredClone(b.events)
  const data=B.harness.battleData({battle:b,label:'live'}), v=B.mount(w.document.createElement('div'),data,{autoplay:false})
  const mi=b.events.findIndex(e=>e.type==='map.loaded');assert.ok(mi>0)
  v.push(b.events.slice(0,mi));v.push(b.events.slice(mi))
  b.events[0].name='host changed';b.events[mi].terrain[1]=5;b.events[mi].props[0].footprint.hexes[0]=1
  assert.deepEqual(v.events,original)
  assert.equal(v._V.data.F.terrainIds[1],'terrain.open')
  assert.deepEqual(v._V.data.F.props[0].footprint.hexes,[5,6])
  const b2=battle('map.open',16,16), v2=B.mount(w.document.createElement('div'),B.harness.battleData({battle:b2,label:'second'}),{autoplay:false});v2.push(b2.events)
  assert.equal(v._V.data.F.width,13);assert.equal(v2._V.data.F.width,16)
  const stable=S=>{const s=structuredClone(S);for(const k of ['AIM','FIRING','TRIGFLASH'])s[k]=null;return s}
  v.seek(0)
  while(v.cursor<v.events.length){v.step();const cursor=v.cursor, state=stable(v.state);v.seek(cursor);assert.deepEqual(stable(v.state),state)}
  assert.equal(v.state.outcome,b.outcome);assert.equal(Object.keys(v.state.U).length,2)
  v.dispose();v2.dispose();B.harness.dispose()
})
test('actual proving exporter map envelope mounts without an invented mapId',()=>{
  const b=JSON.parse(execFileSync(process.execPath,['node_modules/tsx/dist/cli.mjs','tools/export-battle.mts','--plan','test/proving/smoke.json','--matchup','m.mirror-gap-3','--battle','0'],{cwd:'../engine',encoding:'utf8'}))
  assert.equal(typeof b.seed.map,'string');assert.equal(b.seed.mapId,undefined)
  const w=boot(),H=w.__battleView.harness;H.playExportText(JSON.stringify(b));H.viewer.pause();H.viewer.seek(b.events.length)
  assert.equal(H.viewer.state.outcome,b.outcome);H.dispose()
})
test('preparation-only thin field has exact engine distances without a stale static table',()=>{
  const w=boot(),B=w.__battleView,b=battle('test.map.thin',2,150)
  // Prepared map facts are canonical and can describe a 1x300 board directly.
  const ml=b.events.find(e=>e.type==='map.loaded');ml.width=1;ml.height=300
  const v=B.mount(w.document.createElement('div'),B.harness.battleData({battle:b,label:'thin'}),{autoplay:false})
  assert.equal(v._V.data.distance(0,299),299);assert.equal(v._V.data.POS.length,300)
  assert.equal(B.lib.static.hexDist,undefined)
  v.dispose();B.harness.dispose()
})
test('custom-map timed pump drains with setup equipment/layers and matches seek',()=>{
  const w=boot(),B=w.__battleView,b=battle('test.map.pumped',13,5,{heroItems:[['item.longsword']],encounter:{id:'test.encounter.paint',name:'Paint',setup:[],schedule:[],paint:[{layer:'layer.frost',hexes:[2]}]}})
  const mi=b.events.findIndex(e=>e.type==='map.loaded'), eq=b.events.findIndex(e=>e.type==='unit.equipped'), paint=b.events.findIndex(e=>e.type==='layer.painted')
  assert.ok(eq>=0 && eq<mi);assert.ok(paint>=0 && paint<mi)
  assert.ok(b.events.some(e=>e.type==='attack.declared'))
  B.harness.viewer.pause()
  let drained=0
  const v=B.mount(w.document.createElement('div'),B.harness.battleData({battle:b,label:'pump'}),{autoplay:false,onDrain(){drained++;v.pause()}})
  v.push(b.events);assert.deepEqual(v.events.slice(0,mi),b.events.slice(0,mi))
  const initial=v.state
  assert.ok(initial.U[b.events[eq].actor].kit.items.includes(b.events[eq].itemId))
  assert.equal(initial.layers[2],b.events[paint].after)
  v.play()
  for(let ticks=0;ticks<5000 && !drained;ticks++)w._flush(1000)
  assert.equal(drained,1);assert.equal(v.cursor,b.events.length)
  const strip=S=>({...structuredClone(S),AIM:null,FIRING:null,TRIGFLASH:null})
  const pumped=strip(v.state);v.seek(v.events.length);assert.deepEqual(strip(v.state),pumped)
  v.seek(0);while(v.cursor<v.events.length)v.step();assert.deepEqual(strip(v.state),pumped)
  assert.equal(v.state.outcome,b.outcome);v.dispose();B.harness.dispose()
})
test('pushed initial facts ignore object key insertion order without dropping fields',()=>{
  const w=boot(),B=w.__battleView,b=battle('test.map.unregistered')
  const v=B.mount(w.document.createElement('div'),B.harness.battleData({battle:b,label:'order'}),{autoplay:false})
  const reorder=x=>Array.isArray(x)?x.map(reorder):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).reverse().map(k=>[k,reorder(x[k])])):x
  const ev=b.events.map(e=>e.type==='map.loaded'?reorder(e):e)
  v.push(ev);assert.deepEqual(v.events,ev);v.dispose();B.harness.dispose()
})
test('pushed sparse extensions of terrain or footprint reject without consuming a batch',()=>{
  const w=boot(),B=w.__battleView,b=battle('test.map.unregistered')
  const v=B.mount(w.document.createElement('div'),B.harness.battleData({battle:b,label:'sparse'}),{autoplay:false})
  for(const path of ['terrain','footprint']) {
    const bad=structuredClone(b.events), m=bad.find(e=>e.type==='map.loaded')
    const a=path==='terrain'?m.terrain:m.props[0].footprint.hexes;a.length++
    assert.throws(()=>v.push(bad),/prepared|initial/);assert.equal(v.events.length,0)
  }
  v.push(b.events);assert.equal(v.events.length,b.events.length);v.dispose();B.harness.dispose()
})
