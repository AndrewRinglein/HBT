import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import * as THREE from 'three'
import { terrainScene,clipMatrix,projectClip } from '../src/terrain-scene.js'
import { assetMatrix,orientForCSS,terrainLayer,createDriver } from '../src/terrain3d.js'
import { inspectGLB,packTerrainAssets } from './terrain-assets.mjs'
import { makeWindow } from './fakedom.mjs'

const fields=JSON.parse(readFileSync('generated/fields.json','utf8'))
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`)
test('real Three projection matches CSS homogeneous coordinates through perspective, pan, tilt, scale, viewport and outer fit',()=>{
  for(const [tilt,scale,panX,panY,w,h,outer] of [[0,1,0,0,1408,744,1],[49.3,.4,120,-220,1448,700,.5],[62,1.2,-40,300,900,600,1.8]]){
    const field={w:2112,h:1800},origin=[1056,900,0]
    const P=new THREE.Matrix4();P.elements[11]=-1/2600
    const M=P.multiply(new THREE.Matrix4().makeRotationX(tilt*Math.PI/180)).multiply(new THREE.Matrix4().makeScale(scale,scale,scale)).multiply(new THREE.Matrix4().makeTranslation(panX,panY,0))
    const clip=clipMatrix(M.elements,origin,field,{w,h})
    for(const [x,y,z] of [[0,0,0],[field.w,0,0],[0,field.h,0],[field.w,field.h,0],[1056,900,72]]){
      const p=new THREE.Vector4(x-origin[0],y-origin[1],z,1).applyMatrix4(M)
      const sx=p.x/p.w+w/2,sy=p.y/p.w+h/2,got=projectClip(clip,x,y,z)
      close((got[0]+1)*w/2*outer,sx*outer);close((1-got[1])*h/2*outer,sy*outer)
      assert.ok(Math.abs(got[2])<1,'depth remains inside clip volume')
    }
  }
})
test('real Three ground ceiling cannot bury unchanged feet/corpses; prop starts at that plane and is front-facing',()=>{
  const source=new THREE.BoxGeometry(3,2,3),box=new THREE.Box3(new THREE.Vector3(-1.5,0,-1.5),new THREE.Vector3(1.5,2,1.5))
  source.translate(0,1,0)
  for(const raised of [false,true]){
    const g=orientForCSS(source.clone().applyMatrix4(assetMatrix(box,{hexW:128,hexH:132},raised)));g.computeBoundingBox()
    close(raised?g.boundingBox.min.z:g.boundingBox.max.z,0)
    if(!raised)assert.ok(g.boundingBox.min.z<0)
    const matrix=clipMatrix(new THREE.Matrix4().elements,[100,100,0],{w:200,h:200},{w:400,h:400})
    const p=g.attributes.position,n=g.attributes.normal,indices=g.index.array
    let tops=0
    for(let i=0;i<indices.length;i+=3){if(n.getZ(indices[i])<.9)continue;tops++
      const tri=[indices[i],indices[i+1],indices[i+2]].map(j=>projectClip(matrix,p.getX(j)+100,p.getY(j)+100,p.getZ(j)))
      const [a,b,c]=tri;assert.ok((b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])>0,'upward face remains CCW in WebGL')
      tri.forEach(v=>v.forEach(x=>assert.ok(Math.abs(x)<1)))
    }
    assert.equal(tops,2)
  }
})
test('every registered field yields exact terrain/prop cells; detached unknown same-ID fields do not alias',()=>{
  for(const [id,f] of Object.entries(fields).filter(([k])=>!k.startsWith('_'))){
    const data=terrainScene(f,f.props);assert.equal(data.ground.length,f.width*f.height,id)
    data.ground.forEach((r,h)=>{assert.equal(r.terrainId,f.terrainIds[h]);assert.equal(r.x,f.hexes[h].px);assert.equal(r.y,f.hexes[h].py)})
    assert.deepEqual(data.obstacles.map(p=>[p.propId,p.hex]),f.props.flatMap(p=>p.footprint.hexes.map(h=>[p.id,h])))
  }
  const f=structuredClone(fields['map.open']),a=terrainScene(f,f.props);f.hexes[0].px=999;f.terrainIds[0]='terrain.water'
  assert.notEqual(a.ground[0].x,999);assert.equal(a.ground[0].terrainId,'terrain.open')
  assert.notDeepEqual(a,terrainScene(f,f.props))
})
test('curated assets are exact existing self-contained GLBs with no decoder/network dependency',()=>{
  const assets=packTerrainAssets();assert.deepEqual(Object.keys(assets),['meadow','water','hill','boulders'])
  for(const row of Object.values(assets)){const bytes=Buffer.from(row.data,'base64');assert.equal(bytes.length,row.bytes);assert.ok(inspectGLB(bytes).meshes.length);assert.ok(!row.path.includes('expansion-01'))}
  const doc={meshes:[{}],buffers:[{uri:'remote.bin'}]},json=Buffer.from(JSON.stringify(doc)),bytes=Buffer.alloc(20+json.length)
  bytes.writeUInt32LE(0x46546c67,0);bytes.writeUInt32LE(2,4);bytes.writeUInt32LE(bytes.length,8);bytes.writeUInt32LE(json.length,12);bytes.writeUInt32LE(0x4e4f534a,16);json.copy(bytes,20)
  assert.throws(()=>inspectGLB(bytes),/embed/)
})
function context(){const w=makeWindow();globalThis.document=w.document;globalThis.window=w;globalThis.requestAnimationFrame=w.requestAnimationFrame;const wrap=w.document.createElement('div'),stage=w.document.createElement('div');wrap.appendChild(stage);return{w,wrap,V:{dom:{stage},data:{F:structuredClone(fields['map.open']),terrainAssets:{meadow:{},water:{},hill:{},boulders:{}}},S:{props:null}}}}
test('real Three scene branch instances exact recorded cells, renders only changes and disposes resources',async()=>{
  const {w,V,wrap}=context(),frames=[],stats={render:0,dispose:0,contexts:0};w.cancelAnimationFrame=()=>{}
  globalThis.requestAnimationFrame=f=>{frames.push(f);return frames.length}
  class Renderer{setPixelRatio(){}setSize(){}render(scene,camera){stats.render++;stats.scene=scene;stats.camera=camera}dispose(){stats.dispose++}forceContextLoss(){stats.contexts++}}
  let css='a';const I=new THREE.Matrix4()
  const driver=createDriver(V,e=>{throw e},{Renderer,loadAsset:async()=>new THREE.Mesh(new THREE.BoxGeometry(3,1,3),new THREE.MeshStandardMaterial()),readStyle:()=>({transform:css,transformOrigin:'1056 900 0'}),matrix:()=>({toFloat64Array:()=>I.elements})})
  const state=terrainScene(V.data.F,V.data.F.props);driver.update(state);await driver.ready
  assert.equal(stats.render,1);assert.equal(stats.scene.children.filter(x=>x.isInstancedMesh).reduce((n,m)=>n+m.count,0),state.ground.length)
  frames.shift()();assert.equal(stats.render,1,'stationary frame must not submit GPU draw')
  css='b';frames.shift()();assert.equal(stats.render,2)
  state.obstacles.push({hex:0,x:64,y:66,propId:'prop.test',material:3,asset:'boulders'});driver.update(state);frames.shift()();assert.equal(stats.render,3)
  assert.equal(stats.scene.children.filter(x=>x.isInstancedMesh).reduce((n,m)=>n+m.count,0),state.ground.length+1)
  driver.dispose();driver.dispose();assert.equal(stats.dispose,1);assert.equal(stats.contexts,1);assert.equal(wrap.children.length,1)
})
test('late readiness cannot activate a disposed layer; failure restores visible 2D without touching folded facts',async()=>{
  const {V,wrap}=context();let resolve,reject,disposed=0,updates=0
  const ready=new Promise((yes,no)=>{resolve=yes;reject=no}),original=structuredClone(V.data.F)
  const layer=terrainLayer(V,()=>({ready,update(){updates++},dispose(){disposed++}}))
  layer.dispose();resolve();await ready;await Promise.resolve()
  assert.equal(updates,0);assert.equal(disposed,1);assert.equal(wrap.classList.contains('terrain3d-ready'),false)
  const failed=terrainLayer(V,()=>({ready:Promise.reject(new Error('asset broken')),update(){},dispose(){disposed++}}))
  await Promise.resolve();await Promise.resolve();assert.match(wrap.querySelector('#terrainStatus').textContent,/2D.*asset broken/)
  assert.deepEqual(V.data.F,original);failed.dispose();assert.equal(disposed,2)
})
test('extra late-loaded assets do not prevent subsequent scene updates on a 40 by 40 field',async()=>{
  const {V,w}=context();V.data.F=structuredClone(Object.values(fields).find(f=>f.width===40&&f.height===40));V.data.terrainAssets.extra={late:true}
  const frames=[],stats={};globalThis.requestAnimationFrame=f=>{frames.push(f);return frames.length};w.cancelAnimationFrame=()=>{}
  let complete
  const late=new Promise(resolve=>{complete=resolve})
  class Renderer{setPixelRatio(){}setSize(){}render(scene){stats.scene=scene}dispose(){}forceContextLoss(){}}
  const driver=createDriver(V,e=>{throw e},{Renderer,loadAsset:async row=>{if(row.late)await late;return new THREE.Mesh(new THREE.BoxGeometry(3,1,3),new THREE.MeshStandardMaterial())},readStyle:()=>({transform:'none',transformOrigin:'2600 2600 0'}),matrix:()=>({toFloat64Array:()=>new THREE.Matrix4().elements})})
  const data=terrainScene(V.data.F,V.data.F.props);driver.update(data);await Promise.resolve();await Promise.resolve()
  assert.equal(stats.scene,undefined,'no partial asset publication')
  complete();await driver.ready
  const before=stats.scene.children.filter(x=>x.isInstancedMesh).reduce((n,m)=>n+m.count,0)
  assert.equal(before,1600+data.obstacles.length)
  assert.ok(stats.scene.children.filter(x=>x.isInstancedMesh).length<=10,'bounded groups rather than one draw per hex')
  data.obstacles.push({hex:0,x:64,y:66,propId:'prop.extra',material:1,asset:'boulders'});driver.update(data);frames.shift()()
  assert.equal(stats.scene.children.filter(x=>x.isInstancedMesh).reduce((n,m)=>n+m.count,0),before+1)
  driver.dispose()
})
