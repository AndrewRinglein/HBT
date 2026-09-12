import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { terrainScene, clipMatrix } from './terrain-scene.js'
import { TERRAIN_3D_TINT } from './theme.js'

const embedded = typeof __BUNDLED_TERRAIN__ === 'undefined' ? {} : __BUNDLED_TERRAIN__
export { embedded as terrainAssets }

// Ground meshes end at the existing feet/corpse plane, never above it. These
// shallow visual reliefs do not assert an engine elevation. High props start
// at that plane, solely on their authoritative blocked footprint cells.
export function assetMatrix(box, field, raised) {
  const size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3())
  const vertical=(raised?72:24)/Math.max(size.y,0.001)
  return new THREE.Matrix4().makeRotationX(Math.PI/2)
    .multiply(new THREE.Matrix4().makeScale(field.hexW/size.x,vertical,field.hexH/size.z))
    .multiply(new THREE.Matrix4().makeTranslation(-center.x,raised?-box.min.y:-box.max.y,-center.z))
}
// The CSS y-down projection reverses screen winding relative to Three's
// default camera. Reverse cloned triangles once, retaining the physically
// correct transformed normals; do not disable culling to hide a mismatch.
export function orientForCSS(geometry) {
  const indices=geometry.index?Array.from(geometry.index.array):Array.from({length:geometry.attributes.position.count},(_,i)=>i)
  for(let i=0;i<indices.length;i+=3)[indices[i+1],indices[i+2]]=[indices[i+2],indices[i+1]]
  geometry.setIndex(indices);return geometry
}
function releaseObject(root) {
  const geometry=new Set(),materials=new Set(),textures=new Set()
  root.traverse(o=>{if(o.geometry)geometry.add(o.geometry);for(const m of [].concat(o.material||[])){materials.add(m);for(const v of Object.values(m))if(v?.isTexture)textures.add(v)}})
  geometry.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>{t.source?.data?.close?.();t.dispose()})
}
function loadAsset(row) {
  if(!row?.data) return Promise.reject(new Error('embedded terrain asset missing'))
  const bytes=Uint8Array.from(atob(row.data),c=>c.charCodeAt(0))
  return new Promise((resolve,reject)=>new GLTFLoader().parse(bytes.buffer,'',g=>resolve(g.scene),reject))
}

/** The lifecycle is separate from GPU work so asynchronous switch/failure
 * behaviour is exercised with a recording driver as well as real Three. */
export function terrainLayer(V, driverFactory=createDriver) {
  const wrap=V.dom.stage.parentNode,status=document.createElement('div')
  status.id='terrainStatus';status.setAttribute('role','status');wrap.appendChild(status)
  let disposed=false,driver=null,version=0
  function visibility(on) {
    wrap.classList.toggle('terrain3d-ready',on)
    status.textContent=on?'3D terrain · 2D units':'2D terrain · loading 3D assets…'
  }
  function fail(error) {
    if(disposed)return
    version++
    visibility(false);status.textContent='2D terrain · '+String(error?.message||error)
    driver?.dispose();driver=null
  }
  visibility(false)
  try {
    driver=driverFactory(V,fail)
    const current=++version
    Promise.resolve(driver.ready).then(()=>{
      if(disposed||current!==version||!driver)return
      visibility(true);driver.update(terrainScene(V.data.F,V.S.props??V.data.F.props))
    },fail)
  } catch(error) {fail(error)}
  return {
    update(){if(!disposed&&driver)try{driver.update(terrainScene(V.data.F,V.S.props??V.data.F.props))}catch(error){fail(error)}},
    dispose(){if(disposed)return;disposed=true;version++;driver?.dispose();driver=null;status.remove();wrap.classList.remove('terrain3d-ready')},
  }
}

export function createDriver(V,onFailure,platform={}) {
  if(!platform.Renderer && typeof window.WebGL2RenderingContext==='undefined')throw new Error('WebGL 2 unavailable')
  const wrap=V.dom.stage.parentNode,canvas=document.createElement('canvas')
  canvas.className='terrain3d-canvas';canvas.setAttribute('aria-hidden','true')
  let renderer
  try {renderer=new (platform.Renderer||THREE.WebGLRenderer)({canvas,antialias:true,alpha:true})}
  catch(error){throw new Error('WebGL unavailable: '+error.message)}
  wrap.insertBefore(canvas,V.dom.stage)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5))
  renderer.outputColorSpace=THREE.SRGBColorSpace
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.3
  const scene=new THREE.Scene(),camera=new THREE.Camera(),models=new Map(),owned=[]
  camera.matrixAutoUpdate=false;camera.matrixWorld.identity();camera.matrixWorldInverse.identity()
  scene.add(new THREE.AmbientLight(0xffffff,1.7))
  const light=new THREE.DirectionalLight(0xffedce,3);light.position.set(-200,-350,600);scene.add(light)
  const fill=new THREE.DirectionalLight(0xb6d7ff,1);fill.position.set(300,200,350);scene.add(fill)
  let disposed=false,assetsReady=false,raf=null,pending=null,sceneKey='',cameraKey='',dirty=true,viewportKey=''
  const assetRows=V.data.terrainAssets||embedded
  const onLost=e=>{e.preventDefault();onFailure(new Error('WebGL context lost'))}
  canvas.addEventListener('webglcontextlost',onLost)
  const ready=Promise.allSettled(Object.entries(assetRows).map(async([id,row])=>{
    const model=await (platform.loadAsset||loadAsset)(row)
    if(disposed){releaseObject(model);return}
    model.updateMatrixWorld(true);models.set(id,model)
  })).then(results=>{
    const bad=results.find(r=>r.status==='rejected');if(bad)throw bad.reason
    if(disposed)return
    for(const id of ['meadow','water','hill','boulders'])if(!models.has(id))throw new Error('embedded terrain asset missing: '+id)
    assetsReady=true
    if(pending)rebuild(pending)
    frame()
  })
  function clearMeshes(){for(const mesh of owned.splice(0)){scene.remove(mesh);mesh.geometry.dispose();for(const m of [].concat(mesh.material))m.dispose();mesh.dispose()}}
  function rebuild(data) {
    if(disposed)return
    clearMeshes()
    const groups=new Map()
    for(const row of [...data.ground,...data.obstacles]){
      const key=row.asset+':'+(row.terrainId||'prop'),group=groups.get(key)||[];group.push(row);groups.set(key,group)
    }
    for(const rows of groups.values()) {
      const first=rows[0],model=models.get(first.asset)
      if(!model)throw new Error('embedded terrain asset missing: '+first.asset)
      const transform=assetMatrix(new THREE.Box3().setFromObject(model),V.data.F,!!first.propId)
      model.traverse(node=>{
        if(!node.isMesh)return
        const geometry=orientForCSS(node.geometry.clone().applyMatrix4(transform.clone().multiply(node.matrixWorld)))
        const materials=[].concat(node.material).map(m=>{const copy=m.clone();if(TERRAIN_3D_TINT[first.terrainId])copy.color?.multiply(new THREE.Color(TERRAIN_3D_TINT[first.terrainId]));return copy})
        const mesh=new THREE.InstancedMesh(geometry,Array.isArray(node.material)?materials:materials[0],rows.length)
        rows.forEach((r,i)=>mesh.setMatrixAt(i,new THREE.Matrix4().makeTranslation(r.x,r.y,0)))
        mesh.instanceMatrix.needsUpdate=true;mesh.frustumCulled=false;scene.add(mesh);owned.push(mesh)
      })
    }
    dirty=true
  }
  function frame() {
    if(disposed)return
    try {
      const style=(platform.readStyle||getComputedStyle)(V.dom.stage), w=wrap.clientWidth,h=wrap.clientHeight
      const key=style.transform+'|'+style.transformOrigin+'|'+w+'|'+h
      if(key!==cameraKey&&w>0&&h>0) {
        const matrix=platform.matrix?platform.matrix(style.transform):new window.DOMMatrixReadOnly(style.transform==='none'?undefined:style.transform)
        const origin=style.transformOrigin.split(' ').map(parseFloat)
        camera.projectionMatrix.fromArray(clipMatrix(Array.from(matrix.toFloat64Array()),origin,V.data.F,{w,h}))
        camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert()
        cameraKey=key;dirty=true
      }
      if(w>0&&h>0&&viewportKey!==w+'x'+h){renderer.setSize(w,h,false);viewportKey=w+'x'+h;dirty=true}
      if(dirty&&w>0&&h>0){renderer.render(scene,camera);dirty=false}
      raf=requestAnimationFrame(frame)
    } catch(error){onFailure(error)}
  }
  return {ready,
    update(data){const key=JSON.stringify(data);pending=data;if(key===sceneKey)return;sceneKey=key;if(assetsReady)rebuild(data)},
    dispose(){if(disposed)return;disposed=true;if(raf!==null)window.cancelAnimationFrame(raf);canvas.removeEventListener('webglcontextlost',onLost);clearMeshes();models.forEach(releaseObject);models.clear();renderer.dispose();renderer.forceContextLoss();canvas.remove()},
  }
}
