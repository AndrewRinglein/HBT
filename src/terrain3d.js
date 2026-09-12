import * as THREE from 'three'
import {clipMatrix,worldToCSS,displayHeights} from './terrain-scene.js'
import {loadAtlasAssembly,atlasEnvironment} from './atlas-renderer.js'

export function terrainLayer(V,driverFactory=createDriver){
 const wrap=V.dom.stage.parentNode,status=document.createElement('div');status.id='terrainStatus';status.setAttribute('role','status');wrap.appendChild(status)
 let disposed=false,driver=null,version=0
 function visibility(on){wrap.classList.toggle('terrain3d-ready',on);V.data.displayHeights=on?displayHeights(V.data.atlas,V.data.F):null;V.render?.()}
 function fail(error){if(disposed)return;version++;visibility(false);status.textContent='2D terrain · '+String(error?.message||error);driver?.dispose();driver=null}
 if(!V.data.atlas){status.textContent='2D battle · no authored Atlas scene linked';return{update(){},dispose(){status.remove()}}}
 status.textContent='Loading authored Atlas scene…'
 try{driver=driverFactory(V,fail);const current=++version;Promise.resolve(driver.ready).then(()=>{if(disposed||current!==version||!driver)return;visibility(true);status.textContent='Atlas 3D · '+V.data.atlas.plan.map.name},fail)}catch(error){fail(error)}
 return{update(){},dispose(){if(disposed)return;disposed=true;version++;driver?.dispose();driver=null;V.data.displayHeights=null;status.remove();wrap.classList.remove('terrain3d-ready')}}
}
export function createDriver(V,onFailure,platform={}){
 if(!platform.Renderer&&typeof window.WebGL2RenderingContext==='undefined')throw Error('WebGL 2 unavailable')
 const wrap=V.dom.stage.parentNode,canvas=document.createElement('canvas');canvas.className='terrain3d-canvas';canvas.setAttribute('aria-hidden','true')
 const renderer=new (platform.Renderer||THREE.WebGLRenderer)({canvas,antialias:true,alpha:true})
 wrap.insertBefore(canvas,V.dom.stage);renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace
 renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1
 if(renderer.shadowMap){renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;renderer.shadowMap.autoUpdate=false}
 const scene=new THREE.Scene(),camera=new THREE.Camera(),affine=worldToCSS(V.data.atlas,V.data.F)
 camera.matrixAutoUpdate=false;camera.matrixWorld.identity();camera.matrixWorldInverse.identity()
 let disposed=false,built,removeEnvironment,raf=null,cameraKey='',viewportKey='',dirty=true
 const onLost=e=>{e.preventDefault();onFailure(Error('WebGL context lost'))};canvas.addEventListener('webglcontextlost',onLost)
 const ready=(platform.loadAssembly||loadAtlasAssembly)(V.data.atlas,{...platform,cancelled:()=>disposed}).then(result=>{
  if(disposed){result.dispose();return}built=result;scene.add(built.group);removeEnvironment=atlasEnvironment(scene,built)
  if(renderer.shadowMap)renderer.shadowMap.needsUpdate=true;frame()
 })
 function frame(){if(disposed)return;try{
  const style=(platform.readStyle||getComputedStyle)(V.dom.stage),w=wrap.clientWidth,h=wrap.clientHeight,key=style.transform+'|'+style.transformOrigin+'|'+w+'|'+h
  if(key!==cameraKey&&w>0&&h>0){const matrix=platform.matrix?platform.matrix(style.transform):new window.DOMMatrixReadOnly(style.transform==='none'?undefined:style.transform)
   camera.projectionMatrix.fromArray(clipMatrix(Array.from(matrix.toFloat64Array()),style.transformOrigin.split(' ').map(parseFloat),V.data.F,{w,h})).multiply(affine)
   camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();cameraKey=key;dirty=true}
  if(w>0&&h>0&&viewportKey!==w+'x'+h){renderer.setSize(w,h,false);viewportKey=w+'x'+h;dirty=true}
  if(dirty&&w>0&&h>0){renderer.render(scene,camera);dirty=false}raf=requestAnimationFrame(frame)
 }catch(error){onFailure(error)}}
 return{ready,dispose(){if(disposed)return;disposed=true;if(raf!==null)window.cancelAnimationFrame(raf);canvas.removeEventListener('webglcontextlost',onLost);built?.dispose();removeEnvironment?.();renderer.dispose();renderer.forceContextLoss();canvas.remove()}}
}
