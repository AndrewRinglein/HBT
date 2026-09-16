import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {execFileSync} from 'node:child_process'
import {THREE,modules,canvas,environment} from './atlas-test-runtime.mjs'
import {packTerrainAssets} from './terrain-assets.mjs'
const A=await modules(),catalog=packTerrainAssets(),fields=JSON.parse(readFileSync('generated/fields.json'))
const field=Object.values(fields).find(f=>f.width===20&&f.height===10),close=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`)
const bind=(id='sunken-priory-study',areaIndex=0)=>A.prepareAtlasBinding({mapId:id,areaIndex},catalog)
test('native verifier import resolves host-owned Three only for Atlas without eager texture loads',()=>{
 const code=`import {registerAtlasDependency} from './tools/atlas-node.mjs';import * as T from 'three';const hook=registerAtlasDependency();let requests=0;T.TextureLoader.prototype.loadAsync=()=>{requests++;throw Error('eager texture')};const scene=await import('../assets/battle-atlas/scene.mjs');if(typeof scene.buildAtlasScene!=='function'||requests!==0)throw Error('native scene import failed');hook.deregister();console.log('native Atlas import PASS')`
 assert.match(execFileSync(process.execPath,['--input-type=module','-e',code],{encoding:'utf8'}),/native Atlas import PASS/)
})
test('packed catalog/listings/layouts exactly preserve live sources; no GLB skins or embedded catalog models',()=>{
 assert.deepEqual(catalog.library,JSON.parse(readFileSync('../assets/battle-atlas/library.json')))
 assert.deepEqual(catalog.index,JSON.parse(readFileSync('../assets/battle-atlas/index.json')))
 for(const row of catalog.index)assert.deepEqual(catalog.maps[row.id],JSON.parse(readFileSync('../assets/battle-atlas/maps/'+row.id+'.json')))
 assert.equal(catalog.maps.floodgates.grid.cols,40);assert.ok(!JSON.stringify(catalog).includes('base64'))
})
test('binding is explicit, validates active area/dimensions/identity and detaches snapshot plus catalog',()=>{
 assert.equal(A.prepareAtlasBinding(undefined,catalog,field),null)
 for(const bad of [null,{},[],{mapId:'unknown'},{mapId:'floodgates',areaIndex:1},{mapId:'sunken-priory-study',layout:catalog.maps.floodgates}])assert.throws(()=>A.prepareAtlasBinding(bad,catalog,field))
 assert.throws(()=>A.prepareAtlasBinding({mapId:'floodgates'},catalog,field),/engine board/)
 const input=structuredClone(catalog),b=A.prepareAtlasBinding({mapId:'buried-pilgrimage',areaIndex:1},input),before=JSON.stringify(b.plan.map)
 input.maps['buried-pilgrimage'].tiles[0].assets=[];input.library.assets[0].file='changed.glb';assert.equal(JSON.stringify(b.plan.map),before);assert.notEqual(b.library.assets[0].file,'changed.glb')
 assert.deepEqual([b.width,b.height],[20,10]);assert.equal(b.origin.col,20);assert.throws(()=>b.plan.heightAtCell(0,0),/outside/)
 const odd=structuredClone(catalog.maps['buried-pilgrimage']);odd.segments[0].row=1;assert.throws(()=>A.prepareAtlasBinding({mapId:odd.id,layout:odd},catalog,field),/Segments|origin/)
})
test('resource URLs resolve actual catalog files and reject outside paths; file opening is actionable',()=>{
 const location={protocol:'http:',href:'http://127.0.0.1:4230/viewer/BATTLE-VIEWER.html'}
 const file=catalog.library.assets[0].file;assert.equal(A.atlasAssetURL(file,location),'http://127.0.0.1:4230/assets/terrain-3d/'+file)
 for(const bad of ['../wrong.glb','/wrong.glb','https://wrong/a.glb','foo\\bar.glb','%2e%2e/wrong.glb'])assert.throws(()=>A.atlasAssetURL(bad,location))
 assert.throws(()=>A.atlasSourceURL('assets/battle-atlas/library.json',{protocol:'file:'}),/viewer\/start.ps1/)
})
test('authored light shadow camera uses reference full-map extent and updates its real projection',()=>{
 for(const binding of [bind('floodgates'),bind('buried-pilgrimage',2)]){
  const scene=new THREE.Scene(),dispose=A.atlasEnvironment(scene,binding.plan),sun=scene.children.find(o=>o.isDirectionalLight&&o.castShadow),camera=sun.shadow.camera
  const extent=Math.max(binding.plan.map.grid.cols*2.6,binding.plan.map.grid.rows*2.25)*.6
  assert.equal(camera.left,-extent);assert.equal(camera.right,extent);assert.equal(camera.top,extent);assert.equal(camera.bottom,-extent)
  close(camera.projectionMatrix.elements[0],1/extent);close(camera.projectionMatrix.elements[5],1/extent);dispose()
 }
})
test('actual Three world-to-CSS camera preserves authored placement, active-area origin, clip depth and upward winding',()=>{
 for(const binding of [bind(),bind('buried-pilgrimage',1)]){
  const world=A.worldToCSS(binding,field),heights=A.displayHeights(binding,field)
  for(const p of field.hexes){const col=p.c+binding.origin.col,row=p.r+binding.origin.row,point=binding.plan.shift([Math.sqrt(3)*1.5*(col+.5*(row%2)),0,2.25*row]);const q=new THREE.Vector3(...point).applyMatrix4(world);close(q.x,p.px);close(q.y,p.py);close(heights[p.r*20+p.c],binding.plan.heightAtCell(col,row)*field.colStep/(Math.sqrt(3)*1.5))}
  for(const [tilt,scale,panX,panY,w,h,outer] of [[0,1,0,0,1408,744,1],[49.3,.4,120,-220,1448,700,.5],[62,1.2,-40,300,900,600,1.8]]){
   const P=new THREE.Matrix4();P.elements[11]=-1/2600
   const M=P.multiply(new THREE.Matrix4().makeRotationX(tilt*Math.PI/180)).multiply(new THREE.Matrix4().makeScale(scale,scale,scale)).multiply(new THREE.Matrix4().makeTranslation(panX,panY,0)),origin=[field.w/2,field.h/2,0],clip=A.clipMatrix(M.elements,origin,field,{w,h}),combined=new THREE.Matrix4().fromArray(clip).multiply(world)
   const p=binding.plan.shift([Math.sqrt(3)*1.5*(binding.origin.col+5),1.2,2.25*(binding.origin.row+4)]),css=new THREE.Vector4(...p,1).applyMatrix4(world),expected=css.clone().sub(new THREE.Vector4(origin[0],origin[1],0,0)).applyMatrix4(M),got=new THREE.Vector4(...p,1).applyMatrix4(combined)
   close((got.x/got.w+1)*w/2*outer,(expected.x/expected.w+w/2)*outer);close((1-got.y/got.w)*h/2*outer,(expected.y/expected.w+h/2)*outer);assert.ok(Math.abs(got.z/got.w)<1)
   const tri=[[p[0],p[1],p[2]],[p[0],p[1],p[2]+1],[p[0]+1,p[1],p[2]]].map(q=>new THREE.Vector3(...q).applyMatrix4(combined)),[a,b,c]=tri;assert.ok((b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x)>0,'upward authored triangle stays front-facing without geometry rewrites')
  }
 }
})
test('partial texture failure disposes successful peers and can retry',async()=>{
 let released=0;await assert.rejects(A.loadAtlasTextures(async path=>{if(path.includes('meadow'))throw Error('missing meadow');const t=new THREE.Texture();t.addEventListener('dispose',()=>released++);return t}),/missing meadow/);assert.equal(released,2)
 const result=await A.loadAtlasTextures(async()=>new THREE.Texture());assert.equal(result.textures.length,2)
})
test('shared assembly loads exact authored jobs; cancellation releases late source model and all textures',async()=>{
 const b=bind(),files=[],materials=[],textures=[];let released=0
 const model=()=>{const m=new THREE.Mesh(new THREE.BoxGeometry(1,2,3),new THREE.MeshStandardMaterial());m.geometry.addEventListener('dispose',()=>released++);materials.push(m);return m}
 const built=await A.loadAtlasAssembly(b,{createCanvas:canvas,loadTexture:async()=>{const t=new THREE.Texture();textures.push(t);return t},loadModel:async file=>{files.push(file);return model()}})
 assert.deepEqual(files,[...new Set(b.plan.jobs.map(j=>j.file))]);assert.deepEqual(built.placements,b.plan.placements)
 let borrowed=0;built.group.traverse(o=>{if(o.isInstancedMesh&&!o.userData.ownedGeometry){assert.ok(materials.some(m=>m.geometry===o.geometry),'source geometry remains unscaled/uncloned');borrowed++}});assert.ok(borrowed>0);built.dispose();built.dispose();assert.equal(released,files.length)
 let cancelled=false,release,requested;const wait=new Promise(r=>release=r),entered=new Promise(r=>requested=r)
 const pending=A.loadAtlasAssembly(b,{createCanvas:canvas,cancelled:()=>cancelled,loadTexture:async()=>new THREE.Texture(),loadModel:async()=>{requested();await wait;return model()}})
 await entered;cancelled=true;release();await assert.rejects(pending,/cancelled/);assert.equal(released,files.length+1)
})
test('unbound layer never starts a renderer; late disposal/failure restores 2D and display heights without state mutation',async()=>{
 const w=environment(),wrap=document.createElement('div'),stage=document.createElement('div');wrap.appendChild(stage)
 const V={dom:{stage},data:{F:field,atlas:null},S:{},render(){}};let calls=0
 A.terrainLayer(V,()=>{calls++});assert.equal(calls,0)
 V.data.atlas=bind();let release,disposed=0;const ready=new Promise(r=>release=r),layer=A.terrainLayer(V,()=>({ready,dispose(){disposed++}}));layer.dispose();release();await ready;await Promise.resolve();assert.equal(V.data.displayHeights,null);assert.equal(disposed,1)
 const failed=A.terrainLayer(V,()=>({ready:Promise.reject(Error('asset broken')),dispose(){disposed++}}));await Promise.resolve();await Promise.resolve();assert.match(wrap.querySelectorAll('#terrainStatus').at(-1).textContent,/2D.*asset broken/);assert.equal(V.data.displayHeights,null);assert.equal(disposed,2);failed.dispose()
})
test('real Three driver preserves world geometry/lights, draws only changes, and releases switched scene',async()=>{
 const w=environment(),wrap=document.createElement('div'),stage=document.createElement('div');wrap.appendChild(stage);const frames=[];globalThis.requestAnimationFrame=f=>{frames.push(f);return frames.length};w.cancelAnimationFrame=()=>{}
 const stats={draws:0,disposed:0};class Renderer{constructor(){this.shadowMap={}}setPixelRatio(){}setSize(){}render(scene,camera){stats.draws++;stats.scene=scene;stats.camera=camera}dispose(){stats.disposed++}forceContextLoss(){}}
 const binding=bind(),V={dom:{stage},data:{F:field,atlas:binding}},model=new THREE.Mesh(new THREE.BoxGeometry(1,2,3),new THREE.MeshStandardMaterial()),before=Array.from(model.geometry.attributes.position.array)
 let css='a';const driver=A.createDriver(V,e=>{throw e},{Renderer,loadModel:async()=>model,loadTexture:async()=>new THREE.Texture(),createCanvas:canvas,readStyle:()=>({transform:css,transformOrigin:field.w/2+' '+field.h/2+' 0'}),matrix:()=>({toFloat64Array:()=>new THREE.Matrix4().elements})})
 await driver.ready;assert.equal(stats.draws,1);assert.deepEqual(Array.from(model.geometry.attributes.position.array),before)
 assert.ok(stats.scene.children.find(o=>o.type==='Group'));const lights=[];stats.scene.traverse(o=>{if(o.isPointLight)lights.push([o.intensity,o.distance,...o.position.toArray()])});assert.deepEqual(lights,binding.plan.lights.map(l=>[l.intensity,l.distance,...l.position]))
 frames.shift()();assert.equal(stats.draws,1);css='b';frames.shift()();assert.equal(stats.draws,2);driver.dispose();driver.dispose();assert.equal(stats.disposed,1);assert.equal(wrap.children.length,1)
})
test('inspection uses latest editable map dimensions and ignores stale index bounds; switching and late loads are isolated',async()=>{
 environment();const host=document.createElement('div'),calls=[],seen=[],current=structuredClone(catalog);current.index.find(r=>r.id==='floodgates').grid.cols=20
 const fetcher=async url=>{calls.push(url);const file=url.split('/').at(-1),value=file==='index.json'?current.index:file==='library.json'?current.library:current.maps[file.replace('.json','')];return{ok:true,json:async()=>structuredClone(value)}}
 let disposed=0;const inspector=A.atlasInspector(host,catalog,{location:{protocol:'http:',href:'http://127.0.0.1:4230/viewer/BATTLE-VIEWER.html'},fetcher,driverFactory:(_host,b)=>{seen.push(b);return{ready:Promise.resolve(),dispose(){disposed++},reset(){}}}})
 await inspector.ready;await inspector.show('floodgates');assert.equal(seen.at(-1).width,40);await inspector.show('buried-pilgrimage',2);assert.deepEqual([seen.at(-1).width,seen.at(-1).height],[20,10]);assert.equal(seen.at(-1).origin.col,40);assert.ok(calls.some(p=>p.endsWith('/maps/floodgates.json')));assert.equal(host.querySelector('#atlasMapButton').getAttribute('role'),'combobox');inspector.dispose();assert.equal(disposed,3)
})
test('inspection ignores a superseded pending map load and disposes each actual driver exactly once',async()=>{
 environment();const host=document.createElement('div');let release,block=false,disposed=0
 const pending=new Promise(r=>release=r),seen=[]
 const fetcher=async url=>{const file=url.split('/').at(-1);if(block&&file==='floodgates.json')await pending;const value=file==='index.json'?catalog.index:file==='library.json'?catalog.library:catalog.maps[file.replace('.json','')];return{ok:true,json:async()=>structuredClone(value)}}
 const inspector=A.atlasInspector(host,catalog,{location:{protocol:'http:',href:'http://127.0.0.1:4230/viewer/BATTLE-VIEWER.html'},fetcher,driverFactory:(_host,b)=>{seen.push(b.plan.map.id);return{ready:Promise.resolve(),dispose(){disposed++},reset(){}}}})
 await inspector.ready;block=true;const old=inspector.show('floodgates');await inspector.show('stoneford');release();await old
 assert.deepEqual(seen,['sunken-priory-study','stoneford']);assert.equal(inspector.selection.mapId,'stoneford');assert.match(host.querySelector('#atlasStatus').textContent,/Alder/);inspector.dispose();assert.equal(disposed,2)
})
test('actual inspector driver builds the selected journey area, preserves perspective controls and disposes camera resources',async()=>{
 const w=environment(),host=document.createElement('div'),frames=[],stats={draws:0,controlsDisposed:0,rendererDisposed:0};globalThis.requestAnimationFrame=f=>{frames.push(f);return frames.length};w.cancelAnimationFrame=()=>{}
 class Renderer{constructor(){this.shadowMap={};this.domElement=document.createElement('canvas')}setPixelRatio(){}setSize(){}render(scene,camera){stats.draws++;stats.scene=scene;stats.camera=camera}dispose(){stats.rendererDisposed++}forceContextLoss(){}}
 class Controls extends THREE.EventDispatcher{constructor(camera){super();this.target=new THREE.Vector3();this.camera=camera;stats.controls=this}update(){this.camera.lookAt(this.target);this.camera.updateMatrixWorld(true)}dispose(){stats.controlsDisposed++}}
 const binding=bind('buried-pilgrimage',1),driver=A.inspectDriver(host,binding,{Renderer,Controls,loadModel:async()=>new THREE.Mesh(new THREE.BoxGeometry(1,2,3),new THREE.MeshStandardMaterial()),loadTexture:async()=>new THREE.Texture(),createCanvas:canvas})
 await driver.ready;assert.equal(stats.draws,1);assert.equal(stats.camera.fov,36);assert.equal(stats.controls.maxPolarAngle,1.43)
 const target=binding.plan.shift([Math.sqrt(3)*1.5*(binding.origin.col+9),0,2.25*(binding.origin.row+4)]);target[0]+=1.3;target[2]+=1.125;assert.deepEqual(stats.controls.target.toArray(),target)
 assert.ok(stats.scene.children.some(o=>o.type==='Group'));frames.shift()();assert.equal(stats.draws,1);driver.reset();frames.shift()();assert.equal(stats.draws,2);driver.dispose();driver.dispose();assert.equal(stats.controlsDisposed,1);assert.equal(stats.rendererDisposed,1);assert.equal(host.children.length,0)
})
test('display heights lift corpses and each movement keyframe, then reset without changing folded hexes',()=>{
 environment();const stage=document.createElement('div'),ground=document.createElement('div');stage.appendChild(ground)
 const V={dom:{stage},data:{POS:[{px:64,py:66},{px:192,py:66}],LAYOUT:{H:132},displayHeights:[0,60],ARTMAP:{fixture:{token:'token',aspect:1,height:1.55}},ASSETS:{token:'fixture.png'}},S:{corpses:{c:{id:'c',typeId:'fixture',hex:1}},U:{u:{id:'u',hex:1,life:'standing'}}},layers:{ground,UEL:new Map()}}
 const root=document.createElement('div'),img=document.createElement('div');V.layers.UEL.set('u',{root,img});A.syncCorpses(V);const corpse=V.layers.CORPSE.get('c').node;assert.equal(corpse.style.transform,'translateZ(60px)')
 A.traverse(V,'u',0,[1],100);assert.deepEqual(root.animations[0].kf.map(k=>k.transform),['translateZ(0px)','translateZ(60px)']);assert.equal(V.S.U.u.hex,1)
 V.data.displayHeights=null;A.syncCorpses(V);assert.equal(corpse.style.transform,'translateZ(0px)');assert.equal(V.S.corpses.c.hex,1)
})
