import * as THREE from 'three'
import {displayHeights,worldToCSS} from './terrain-scene.js'
import {loadAtlasAssembly,atlasEnvironment} from './atlas-renderer.js'
import {paintedHeights,paintedToCSS,loadPaintedScene,paintedEnvironment,PAINTED_EXPOSURE} from './painted.js'
import {createCast} from './models.js'
import {lens,orbitCamera} from './camera3d.js'
import {subjectOf} from './subject.js'
import {NO_LOOK} from './stand-out.js'
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
  const glass=[].concat(solid).map(m=>{const c=m.clone();c.onBeforeCompile=m.onBeforeCompile;c.customProgramCacheKey=m.customProgramCacheKey;c.transparent=true;c.opacity=Math.min(m.opacity??1,SEE_THROUGH);c.depthWrite=false;return c})
  faded.set(o,solid);o.material=Array.isArray(solid)?glass:glass[0];changed=true}
 return changed
}
/* viewer.characters-unfaded (engine DECISIONS.md 2026-10-01, Andrew: "these characters are faded, like they're ghost-like,
   because there are other competing things. The characters are the stars. They should not be faded, especially not one
   that's selected."): what faded them was the board — its grid, rings, glows, shadow blobs and painted tiles are DOM drawn
   OVER the scene's canvas, with no depth, so every mark whose screen area a body stands up into lay across it. The bodies are
   drawn on a canvas of their own ABOVE the board's marks: it first takes the scene's depth (the solid pieces only — what is
   drawn see-through hides nothing), so a wall or a hill still hides a body behind it, then draws the bodies alone, at full
   strength; the one whose panel it is (subject.js) carries a key light of its own and is the brightest (viewer SWITCHES
   unfaded*). A host that cannot have a second canvas (a test's renderer) draws the bodies with the scene, as before. */
export const KEY_LIGHT={color:0xfff1d8,intensity:9,distance:5}
const DEPTH_ONLY=new THREE.MeshBasicMaterial({colorWrite:false})
/** draw the bodies over the board: the scene's solid depth first, then the characters and the lights alone */
export function drawBodies(renderer,scene,camera,characters){
 const off=[],hide=o=>{if(o.visible){o.visible=false;off.push(o)}}
 const bg=scene.background;scene.background=null
 renderer.clear()
 hide(characters)
 scene.traverse(o=>{if(o.isMesh&&o.visible&&[].concat(o.material).some(m=>m.transparent||m.depthWrite===false))hide(o)})
 scene.overrideMaterial=DEPTH_ONLY;renderer.render(scene,camera);scene.overrideMaterial=null
 for(const o of off.splice(0))o.visible=true
 /* then the bodies alone: every drawable but theirs put away, every light (the map's torches among them) left on */
 const theirs=new Set();characters.traverse(o=>theirs.add(o))
 scene.traverse(o=>{if((o.isMesh||o.isPoints||o.isLine||o.isSprite)&&!theirs.has(o))hide(o)})
 renderer.render(scene,camera)
 for(const o of off)o.visible=true
 scene.background=bg
}
export function createDriver(V,onFailure,platform={}){
 if(!platform.Renderer&&typeof window.WebGL2RenderingContext==='undefined')throw Error('WebGL 2 unavailable')
 const wrap=V.dom.stage.parentNode,canvas=document.createElement('canvas');canvas.className='terrain3d-canvas';canvas.setAttribute('aria-hidden','true')
 const renderer=new (platform.Renderer||THREE.WebGLRenderer)({canvas,antialias:true,alpha:true})
 wrap.insertBefore(canvas,V.dom.stage);renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace
 renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=painted(V.data.atlas)?PAINTED_EXPOSURE:1
 if(renderer.shadowMap){renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;renderer.shadowMap.autoUpdate=false}
  /* viewer.characters-unfaded: the bodies' own canvas, above the board's marks (none where the host's renderer is a stand-in) */
 const BodyRenderer=platform.BodyRenderer||(platform.Renderer?null:THREE.WebGLRenderer)
 let bodies=null
 if(BodyRenderer){const c=document.createElement('canvas');c.className='terrain3d-bodies';c.setAttribute('aria-hidden','true')
  bodies=new BodyRenderer({canvas:c,antialias:true,alpha:true});wrap.insertBefore(c,V.dom.stage.nextSibling)
  bodies.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));bodies.outputColorSpace=THREE.SRGBColorSpace
  bodies.toneMapping=renderer.toneMapping;bodies.toneMappingExposure=renderer.toneMappingExposure;bodies.autoClear=false
  if(bodies.setClearColor)bodies.setClearColor(0x000000,0)}
 /* the board's map (viewer.js sets it; a driver handed a bare board makes it the same way) */
 const scene=new THREE.Scene(),affine=V.data.boardAffine||(V.data.boardAffine=painted(V.data.atlas)?paintedToCSS(V.data.atlas):worldToCSS(V.data.atlas,V.data.F))
 /* viewer.characters-stand-out: the looks the host named, as numbers (a bare V has none) */
 const look=V.look||NO_LOOK
 let disposed=false,built,removeEnvironment,raf=null,seen=-1,viewportKey='',dirty=true,last=null,effectTime=0,sawThrough=-Infinity,key=null
 const faded=new Map()
 const clock=platform.now||(()=>performance.now())
 const onLost=e=>{e.preventDefault();onFailure(Error('WebGL context lost'))};canvas.addEventListener('webglcontextlost',onLost)
 const load=painted(V.data.atlas)?(platform.loadPainted||loadPaintedScene):(platform.loadAssembly||loadAtlasAssembly)
 const ready=load(V.data.atlas,{...platform,tone:look.ground,bodyScale:look.bodyScale,cancelled:()=>disposed}).then(result=>{
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
  if(w>0&&h>0&&viewportKey!==w+'x'+h){renderer.setSize(w,h,false);bodies?.setSize(w,h,false);viewportKey=w+'x'+h;dirty=true}
  /* the lens follows the viewport's height; the stage's matrix does not depend on it */
  if(camera&&w>0&&h>0&&(camera.userData.viewport?.w!==w||camera.userData.viewport?.h!==h))lens(camera,{w,h})
  /* viewer.xcom-camera: what hides a body is see-through — looked for when anything moved, at most every SEE_EVERY ms */
  if(built?.group&&!V.seeThrough)V.seeThrough={faded,pieces:()=>solidPieces(built.group)}   // read-only: what is see-through now
  if(camera&&built?.group&&V.cast?.aims&&dirty&&t-sawThrough>=SEE_EVERY){sawThrough=t;if(seeThrough(built.group,camera,V.cast.aims(),faded))dirty=true}
  const characters=bodies?scene.getObjectByName('characters'):null
  /* viewer.characters-unfaded: the key light rides the body whose panel it is, above it and toward the camera */
  if(characters&&camera){const B=V.cast?.body(subjectOf(V))
   if(!key){key=new THREE.PointLight(KEY_LIGHT.color,KEY_LIGHT.intensity,KEY_LIGHT.distance);key.name='subject-key';characters.add(key)}
   key.visible=!!B
   if(B){const h=B.standingHeight(),p=B.stage.position,to=camera.position.clone().sub(p).setY(0);if(to.lengthSq()>1e-9)to.normalize()
    key.position.set(p.x+to.x*h*.6,p.y+h*1.25,p.z+to.z*h*.6)}}
  if(dirty&&camera&&w>0&&h>0){
   /* viewer.characters-stand-out, the shadows look: the sun's shadow is taken again every drawn frame (the bodies move), and
      the bodies stay in the scene's own pass so that shadow holds them — drawn there under the board's marks exactly where
      their own canvas draws them over the marks; the subject's key light is that canvas's alone, never the ground's */
   if(look.shadows&&renderer.shadowMap)renderer.shadowMap.needsUpdate=true
   if(characters){const lit=key&&key.visible;characters.visible=look.shadows;if(key&&look.shadows)key.visible=false
    renderer.render(scene,camera);characters.visible=true;if(key&&look.shadows)key.visible=lit;drawBodies(bodies,scene,camera,characters)}
   else renderer.render(scene,camera)
   dirty=false}raf=requestAnimationFrame(frame)
 }catch(error){onFailure(error)}}
 return{ready,dispose(){if(disposed)return;disposed=true;V.seeThrough=null;for(const [o,solid] of faded){for(const m of [].concat(o.material))m.dispose();o.material=solid}faded.clear();if(raf!==null)window.cancelAnimationFrame(raf);V.cast?.dispose();V.cast=null;canvas.removeEventListener('webglcontextlost',onLost);built?.dispose();removeEnvironment?.();renderer.dispose();renderer.forceContextLoss();canvas.remove();if(bodies){const c=bodies.domElement;bodies.dispose();bodies.forceContextLoss?.();c?.remove()}}}
}
