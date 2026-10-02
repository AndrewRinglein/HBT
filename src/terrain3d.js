import * as THREE from 'three'
import {displayHeights,worldToCSS} from './terrain-scene.js'
import {loadAtlasAssembly,atlasEnvironment} from './atlas-renderer.js'
import {paintedHeights,paintedToCSS,loadPaintedScene,paintedEnvironment,PAINTED_EXPOSURE} from './painted.js'
import {createCast} from './models.js'
import {lens,orbitCamera} from './camera3d.js'
// The units drawn as 3D models stand in the same scene (viewer.character-models, models.js): board px -> scene by the inverse of the scene's own map
// Two scene sources behind one board: an Atlas layout (atlas.js) or a painted scene (painted.js, viewer.painted-board)
/* viewer.true-3d-camera (2026-09-30; engine DECISIONS.md "a true 3D battle: an orbit camera, …, no flash of another
   map"): the scene is drawn with THE camera (camera3d.js, V.camera3d — the board's own, which the stage is drawn
   through), never a copy of the stage's CSS. "No other map loads first": until the battle's own 3D scene is ready
   the board is not shown at all — a loading line instead of the flat swatch board — and a scene that cannot be drawn
   (no WebGL 2, a missing file) is said plainly; the flat board is never put in its place. */
const painted=b=>b?.kind==='painted'
export const LOADING='Loading the battle’s 3D map…'
export const NO_WEBGL='This battle’s 3D map cannot be drawn here: this browser has no WebGL 2.'

export function terrainLayer(V,driverFactory=createDriver){
 const wrap=V.dom.stage.parentNode,status=document.createElement('div');status.id='terrainStatus';status.setAttribute('role','status');wrap.appendChild(status)
 let disposed=false,driver=null,version=0,note=null
 const state=s=>{for(const c of ['terrain3d-loading','terrain3d-ready','terrain3d-failed'])wrap.classList.toggle(c,c==='terrain3d-'+s)}
 const say=text=>{if(!note){note=document.createElement('div');note.id='terrainLoading';note.setAttribute('role','status');wrap.appendChild(note)}note.textContent=text}
 function ready(){state('ready');V.data.displayHeights=painted(V.data.atlas)?paintedHeights(V.data.atlas):displayHeights(V.data.atlas,V.data.F);note?.remove();note=null;V.render?.()}
 function fail(error){if(disposed)return;version++;state('failed');V.data.displayHeights=null;const why=String(error?.message||error)
  status.textContent='3D map unavailable · '+why;say(/WebGL 2 unavailable/.test(why)?NO_WEBGL:'This battle’s 3D map could not be drawn: '+why);driver?.dispose();driver=null;V.render?.()}
 if(!V.data.atlas){status.textContent='2D battle · no authored Atlas scene linked';return{update(){},dispose(){status.remove()}}}
 state('loading');say(LOADING);status.textContent=painted(V.data.atlas)?'Loading painted scene…':'Loading authored Atlas scene…'
 try{driver=driverFactory(V,fail);const current=++version;Promise.resolve(driver.ready).then(()=>{if(disposed||current!==version||!driver)return;ready();status.textContent=painted(V.data.atlas)?'Painted 3D · '+V.data.atlas.name:'Atlas 3D · '+V.data.atlas.plan.map.name},fail)}catch(error){fail(error)}
 return{update(){},dispose(){if(disposed)return;disposed=true;version++;driver?.dispose();driver=null;V.data.displayHeights=null;status.remove();note?.remove();note=null;state(null)}}
}
/* viewer.xcom-camera (engine DECISIONS.md 2026-10-01 'the XCOM-style camera': "Anything blocking the view of a character is
   highly translucent"): a solid piece of the scene between the camera and a standing body's chest or head is drawn
   see-through (its own copy of its material at SEE_THROUGH opacity — scene pieces share materials), and solid again once
   nothing it hides is behind it. The ground a body stands on never counts: a hit below its waist, or within a body's
   length of it, is the floor or its own hex (viewer SWITCHES xcomSeeThrough). An instanced Atlas part fades whole. */
export const SEE_THROUGH=.18,SEE_EVERY=120
const pieces=new WeakMap()
/** the scene's solid pieces and how high each reaches, listed once (the scene does not move): a piece the scene itself draws
    see-through (fire, smoke, a glow: under full opacity, or not normally blended) is not a wall; leaves are */
export function solidPieces(group){
 let list=pieces.get(group);if(list)return list
 list=[];group.updateMatrixWorld(true)
 group.traverse(o=>{if(!o.isMesh||!o.visible||[].concat(o.material).some(m=>(m.opacity??1)<.99||(m.blending!=null&&m.blending!==THREE.NormalBlending)))return
  list.push({o,top:new THREE.Box3().setFromObject(o).max.y})})
 pieces.set(group,list);return list
}
export function seeThrough(group,camera,aims,faded=new Map()){
 const ray=new THREE.Raycaster(),now=new Set(),eye=camera.getWorldPosition(new THREE.Vector3()),list=solidPieces(group)
 for(const a of aims){
  const to=a.at.clone().sub(eye),far=to.length();if(!(far>0))continue
  const waist=a.feet+(a.at.y-a.feet)*.5,tall=list.filter(p=>p.top>=waist).map(p=>p.o);if(!tall.length)continue
  ray.set(eye,to.divideScalar(far));ray.far=far
  for(const hit of ray.intersectObjects(tall,false)){if(hit.distance>far-.6||hit.point.y<waist)continue;now.add(hit.object)}
 }
 let changed=false
 for(const [o,solid] of faded)if(!now.has(o)){const glass=o.material;o.material=solid;for(const m of [].concat(glass))m.dispose();faded.delete(o);changed=true}
 for(const o of now)if(!faded.has(o)){const solid=o.material
  const glass=[].concat(solid).map(m=>{const c=m.clone();c.transparent=true;c.opacity=Math.min(m.opacity??1,SEE_THROUGH);c.depthWrite=false;return c})
  faded.set(o,solid);o.material=Array.isArray(solid)?glass:glass[0];changed=true}
 return changed
}
export function createDriver(V,onFailure,platform={}){
 if(!platform.Renderer&&typeof window.WebGL2RenderingContext==='undefined')throw Error('WebGL 2 unavailable')
 const wrap=V.dom.stage.parentNode,canvas=document.createElement('canvas');canvas.className='terrain3d-canvas';canvas.setAttribute('aria-hidden','true')
 const renderer=new (platform.Renderer||THREE.WebGLRenderer)({canvas,antialias:true,alpha:true})
 wrap.insertBefore(canvas,V.dom.stage);renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace
 renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=painted(V.data.atlas)?PAINTED_EXPOSURE:1
 if(renderer.shadowMap){renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;renderer.shadowMap.autoUpdate=false}
 /* the board's map (viewer.js sets it; a driver handed a bare board makes it the same way) */
 const scene=new THREE.Scene(),affine=V.data.boardAffine||(V.data.boardAffine=painted(V.data.atlas)?paintedToCSS(V.data.atlas):worldToCSS(V.data.atlas,V.data.F))
 let disposed=false,built,removeEnvironment,raf=null,seen=-1,viewportKey='',dirty=true,last=null,effectTime=0,sawThrough=-Infinity
 const faded=new Map()
 const clock=platform.now||(()=>performance.now())
 const onLost=e=>{e.preventDefault();onFailure(Error('WebGL context lost'))};canvas.addEventListener('webglcontextlost',onLost)
 const load=painted(V.data.atlas)?(platform.loadPainted||loadPaintedScene):(platform.loadAssembly||loadAtlasAssembly)
 const ready=load(V.data.atlas,{...platform,cancelled:()=>disposed}).then(result=>{
  if(disposed){result.dispose();return}built=result;scene.add(built.group);removeEnvironment=painted(V.data.atlas)?paintedEnvironment(scene,V.data.atlas):atlasEnvironment(scene,built)
  if(V.data.models)V.cast=(platform.createCast||createCast)(V,scene,affine.clone().invert(),{...(platform.models||{}),location:platform.location,onError:(look,error,detail)=>{const st=wrap.querySelector('#terrainStatus');if(st)st.textContent+=' · '+look.name+(detail?.appearance?' transformation unavailable: ':' is its token: ')+String(error?.message||error)}})
  if(renderer.shadowMap)renderer.shadowMap.needsUpdate=true
  /* viewer.bodies-before-board: the board opens with every body on it standing — never their 2D tokens first */
  return V.cast?.settle?.()
 }).then(()=>{if(!disposed)frame()})
 function frame(){if(disposed)return;try{
  const t=clock(),dt=last===null?0:Math.min(.1,Math.max(0,(t-last)/1000));last=t
  if(V.cast){V.cast.frame(dt);if(V.cast.size)dirty=true}
  /* viewer.caravan-scene: a scene whose fires and fog move draws every frame, camera and units still or not */
  if(built?.animated&&V.camera3d){effectTime+=dt;built.animate(effectTime,V.camera3d);dirty=true}
  const w=wrap.clientWidth,h=wrap.clientHeight
  /* a board that has not framed itself yet (a bare one) is seen from the starting angled view at its middle */
  if(!V.camera3d&&w>0&&h>0){V.camera3d=orbitCamera(affine,{x:V.data.F.w/2,y:V.data.F.h/2,yaw:0,tilt:V.data.F.tilt,zoom:1},{w,h});V.camVersion=(V.camVersion||0)+1}
  const camera=V.camera3d
  /* the board's camera moved (a turn, a pan, a frame of the glide): draw again */
  if(camera&&V.camVersion!==seen){seen=V.camVersion;dirty=true}
  if(w>0&&h>0&&viewportKey!==w+'x'+h){renderer.setSize(w,h,false);viewportKey=w+'x'+h;dirty=true}
  /* the lens follows the viewport's height; the stage's matrix does not depend on it */
  if(camera&&w>0&&h>0&&(camera.userData.viewport?.w!==w||camera.userData.viewport?.h!==h))lens(camera,{w,h})
  /* viewer.xcom-camera: what hides a body is see-through — looked for when anything moved, at most every SEE_EVERY ms */
  if(built?.group&&!V.seeThrough)V.seeThrough={faded,pieces:()=>solidPieces(built.group)}   // read-only: what is see-through now
  if(camera&&built?.group&&V.cast?.aims&&dirty&&t-sawThrough>=SEE_EVERY){sawThrough=t;if(seeThrough(built.group,camera,V.cast.aims(),faded))dirty=true}
  if(dirty&&camera&&w>0&&h>0){renderer.render(scene,camera);dirty=false}raf=requestAnimationFrame(frame)
 }catch(error){onFailure(error)}}
 return{ready,dispose(){if(disposed)return;disposed=true;V.seeThrough=null;for(const [o,solid] of faded){for(const m of [].concat(o.material))m.dispose();o.material=solid}faded.clear();if(raf!==null)window.cancelAnimationFrame(raf);V.cast?.dispose();V.cast=null;canvas.removeEventListener('webglcontextlost',onLost);built?.dispose();removeEnvironment?.();renderer.dispose();renderer.forceContextLoss();canvas.remove()}}
}
