import * as THREE from 'three'
import {displayHeights,worldToCSS} from './terrain-scene.js'
import {loadAtlasAssembly,atlasEnvironment} from './atlas-renderer.js'
import {paintedHeights,paintedToCSS,loadPaintedScene,paintedEnvironment,PAINTED_EXPOSURE} from './painted.js'
import {createCast} from './models.js'
import {lens,orbitCamera} from './camera3d.js'
import {subjectOf} from './subject.js'
import {NO_LOOK} from './stand-out.js'
import {hidersOf,hidersStats,readPieces} from './hiders.js'
import {keptShadow} from './kept-shadow.js'
import {solidBatches,batchable,batchKey,exactVertex,hookKeepsVertex,ExactBatch,PIECE_LAYER,PIECE_TEXELS} from './solid-batches.js'
export {keptShadow}
export {solidBatches,batchable,batchKey,exactVertex,hookKeepsVertex,ExactBatch,PIECE_LAYER,PIECE_TEXELS}
export {hidersStats}
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
 /* (viewer.solid-pieces-drawn-by-material: a batch is how pieces are drawn, never a piece — the pieces themselves are listed) */
 group.traverse(o=>{if(!o.isMesh||o.isBatchedMesh||!o.visible||[].concat(o.material).some(m=>(m.opacity??1)<.99||(m.blending!=null&&m.blending!==THREE.NormalBlending)))return
  list.push({o,top:new THREE.Box3().setFromObject(o).max.y})})
 pieces.set(group,list);return list
}
/** viewer.see-through-only-when-moved: the solid pieces between the camera and a standing body's chest or head — the rule's
    question, answered by a structure built once for each piece (hiders.js); how==='plain' answers it as it was first written,
    by three's raycast over every triangle of every tall piece (the reference the tests hold the structure to) */
export const hiders=(group,camera,aims,how)=>hidersOf(solidPieces(group),camera,aims,how)
export function seeThrough(group,camera,aims,faded=new Map()){
 const now=hiders(group,camera,aims)
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
/* viewer.still-frame-draws-nothing (2026-10-05; engine DECISIONS.md 'the battle screen must feel smooth: the speed first; …').
   drawBodies walked the whole scene twice on every frame, built a Set of the bodies' objects each time, and its depth pass drew
   EVERY solid piece of the scene again (461 of the Orphanage's draw calls) so that a wall hides a body behind it. As it now
   stands: what the scene holds besides its bodies is listed once (the scenery does not change; the bodies' own group is not
   walked at all); and the depth pass may be handed the pieces that CAN hide a body in this view (`hiding`, a Set — couldHide,
   below) and draws those alone. Handed none it draws every solid piece, as it was first written. */
const sceneries=new WeakMap()
const drawable=o=>o.isMesh||o.isPoints||o.isLine||o.isSprite
/** everything the scene draws that is not one of the bodies, listed once for a scene and its bodies' group (listed again if
    the scene's own children change): each with its box in the scene — the scenery stands still */
export function sceneryOf(scene,characters){
 let L=sceneries.get(scene)
 if(L&&L.characters===characters&&L.children===scene.children.length)return L
 const all=[];scene.updateMatrixWorld(true)
 const walk=o=>{if(o===characters)return;if(drawable(o))all.push({o,box:o.isMesh?new THREE.Box3().setFromObject(o,false):null,view:new Float32Array(5),seen:-1});for(const c of o.children)walk(c)}
 walk(scene)
 L={characters,children:scene.children.length,all};sceneries.set(scene,L);return L
}
/** a piece that writes no depth hides nothing: what the scene, or the see-through rule, draws see-through */
const glass=o=>{const m=o.material;if(Array.isArray(m)){for(const x of m)if(x.transparent||x.depthWrite===false)return true;return false}return !!m&&(m.transparent||m.depthWrite===false)}
/** draw the bodies over the board: the scene's solid depth first, then the characters and the lights alone */
export function drawBodies(renderer,scene,camera,characters,hiding=null){
 const all=sceneryOf(scene,characters).all,off=[]
 const bg=scene.background;scene.background=null
 renderer.clear()
 /* the depth of what can hide a body: the solid pieces only, and of those only the ones handed in */
 characters.visible=false
 /* viewer.solid-pieces-drawn-by-material: the depth is taken from the pieces themselves — a batch is never drawn here (a few
    dozen pieces are, and a batch is all of its material's) — so for this pass the camera also sees the layer a batched
    piece's own mesh waits on (solid-batches.js PIECE_LAYER) */
 for(const p of all){const o=p.o;if(!o.visible||!o.isMesh)continue;if(o.isBatchedMesh||glass(o)||(hiding&&!hiding.has(o))){o.visible=false;off.push(o)}}
 const sees=camera.layers.mask;camera.layers.enable(PIECE_LAYER)
 scene.overrideMaterial=DEPTH_ONLY;try{renderer.render(scene,camera)}finally{scene.overrideMaterial=null;camera.layers.mask=sees}
 for(const o of off)o.visible=true
 off.length=0;characters.visible=true
 /* then the bodies alone: every drawable but theirs put away, every light (the map's torches among them) left on */
 for(const p of all){const o=p.o;if(o.visible){o.visible=false;off.push(o)}}
 renderer.render(scene,camera)
 for(const o of off)o.visible=true
 scene.background=bg
}
/* how far past its own models' boxes a body may reach, as a part of their largest side: a body lying down, a lunge, what it
   holds swung out (viewer SWITCHES bodiesDepthReach) */
export const BODY_REACH=1.25
const _corner=new THREE.Vector3(),_view=new THREE.Matrix4(),_bodyBox=new THREE.Box3(),_piece=new THREE.Box3(),_size=new THREE.Vector3(),_centre=new THREE.Vector3()
/**
 * The solid pieces of the scene that CAN hide a body in this view: those whose place on the screen meets a body's and that
 * reach nearer the camera than the body's far side. Never fewer than can: a piece is taken by its whole box, a body by a
 * ball about its models' boxes grown by BODY_REACH — so the depth drawn from these alone leaves the bodies' picture exactly
 * as the depth of every solid piece does. `version`: the camera's (a piece's place on the screen is worked out once a pose).
 */
export function couldHide(scene,camera,characters,version,out=new Set()){
 out.clear();camera.updateMatrixWorld()
 const all=sceneryOf(scene,characters).all,e=camera.matrixWorldInverse.elements,pr=camera.projectionMatrix.elements
 /* the bodies: each child of their group that draws, as a ball — on the screen a square about its middle; its far side */
 const balls=[]
 for(const b of characters.children){
  /* its models' own boxes where they stand (a body's bones move it inside and beyond them: the reach is for that) */
  _bodyBox.makeEmpty();b.traverse(o=>{if(!o.isMesh||!o.geometry)return;const g=o.geometry;if(g.boundingBox===null)g.computeBoundingBox();_bodyBox.union(_piece.copy(g.boundingBox).applyMatrix4(o.matrixWorld))})
  if(_bodyBox.isEmpty())continue
  _bodyBox.getSize(_size);_bodyBox.getCenter(_centre);const r=Math.max(_size.x,_size.y,_size.z)*BODY_REACH
  const x=_centre.x,y=_centre.y,z=_centre.z,vx=e[0]*x+e[4]*y+e[8]*z+e[12],vy=e[1]*x+e[5]*y+e[9]*z+e[13],d=-(e[2]*x+e[6]*y+e[10]*z+e[14])
  const near=d-r,far=d+r   // how far in front of the camera its near side and its far side are
  if(near<=1e-3){balls.push(null);continue}          // about the camera itself: every piece may hide it
  /* on the screen (-1..1) the ball lies inside the square its sides make at its near and far depths, whichever is wider */
  const lo=v=>Math.min(v/near,v/far),hi=v=>Math.max(v/near,v/far)
  balls.push({x0:pr[0]*lo(vx-r),x1:pr[0]*hi(vx+r),y0:pr[5]*lo(vy-r),y1:pr[5]*hi(vy+r),far})}
 if(!balls.length)return out
 const whole=balls.includes(null)
 for(const p of all){const o=p.o;if(!p.box||!o.visible||o.isBatchedMesh||glass(o))continue
  if(whole){out.add(o);continue}
  if(p.seen!==version){p.seen=version
   /* its box's eight corners on the screen, and its nearest; a corner behind the camera: the whole screen */
   let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity,near=Infinity,behind=false;const b=p.box
   for(let k=0;k<8;k++){const x=k&1?b.max.x:b.min.x,y=k&2?b.max.y:b.min.y,z=k&4?b.max.z:b.min.z
    const vx=e[0]*x+e[4]*y+e[8]*z+e[12],vy=e[1]*x+e[5]*y+e[9]*z+e[13],d=-(e[2]*x+e[6]*y+e[10]*z+e[14])
    if(d<near)near=d
    if(d<=1e-3){behind=true;continue}
    const px=pr[0]*vx/d,py=pr[5]*vy/d;if(px<x0)x0=px;if(px>x1)x1=px;if(py<y0)y0=py;if(py>y1)y1=py}
   const v=p.view;if(behind){v[0]=-Infinity;v[1]=-Infinity;v[2]=Infinity;v[3]=Infinity}else{v[0]=x0;v[1]=y0;v[2]=x1;v[3]=y1}v[4]=near}
  const v=p.view
  for(const B of balls)if(v[4]<B.far&&v[0]<=B.x1&&v[2]>=B.x0&&v[1]<=B.y1&&v[3]>=B.y0){out.add(o);break}}
 return out
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
 let disposed=false,built,removeEnvironment,raf=null,seen=-1,viewportKey='',dirty=true,last=null,effectTime=0,sawThrough=-Infinity,sawWhat=null,sawRuns=0,sawBuilt=null,key=null,keeper,batches=null,bodiesMoved=false,castSize=-1,depthWhole=false,depthDrawn=0,subjectDrawn,cursorDrawn
 const faded=new Map(),couldHiding=new Set()
 const clock=platform.now||(()=>performance.now())
 const onLost=e=>{e.preventDefault();onFailure(Error('WebGL context lost'))};canvas.addEventListener('webglcontextlost',onLost)
 const load=painted(V.data.atlas)?(platform.loadPainted||loadPaintedScene):(platform.loadAssembly||loadAtlasAssembly)
 const ready=load(V.data.atlas,{...platform,tone:look.ground,bodyScale:look.bodyScale,cancelled:()=>disposed}).then(result=>{
  if(disposed){result.dispose();return}built=result;scene.add(built.group);removeEnvironment=painted(V.data.atlas)?paintedEnvironment(scene,V.data.atlas):atlasEnvironment(scene,built)
  if(V.data.models)V.cast=(platform.createCast||createCast)(V,scene,affine.clone().invert(),{...(platform.models||{}),location:platform.location,onError:(look,error,detail)=>{const st=wrap.querySelector('#terrainStatus');if(st)st.textContent+=' · '+look.name+(detail?.appearance?' transformation unavailable: ':' is its token: ')+String(error?.message||error)}})
  if(renderer.shadowMap)renderer.shadowMap.needsUpdate=true
  /* viewer.solid-pieces-drawn-by-material (2026-10-05; engine DECISIONS.md 'the battle screen must feel smooth: the speed first;
     …'): the scene's solid pieces that share a material are gathered into batches here, once, while the loading line still
     shows (solid-batches.js) — each batch one call a pass where the browser draws many in one (WEBGL_multi_draw; without it
     a batch saves nothing, so there is none, and a test's stand-in renderer has none unless it asks). What the page says of
     them, for the tests and tools/frame-cost.mjs: how many batches hold how many of the scene's solid pieces, how long they
     took to build, how many pieces are out of their batch now (faded see-through), and the pieces asked for WHOLE — each
     drawn by itself and no batch, as first written: the reference the tool holds the batches to, pixel for pixel. */
  if(platform.batches??(!platform.Renderer&&!!renderer.extensions?.has?.('WEBGL_multi_draw'))){
   batches=solidBatches(built.group,{now:clock})
   V.solidBatches={get batches(){return batches.batches.length},get pieces(){return batches.pieces.length},solid:batches.solid,ms:batches.ms,get out(){return batches.out},
    /* is every piece faded see-through out of its batch and drawn by itself, and every other piece in? (asked by tools/frame-cost.mjs) */
    get inStep(){return batches.inStep(faded)},
    get whole(){return batches.whole},set whole(v){if(!!v===batches.whole)return;batches.whole=v;keeper?.invalidate();bodiesMoved=true;dirty=true}}}
  else V.solidBatches=null
  /* viewer.see-through-only-when-moved: the see-through rule's structures are built here, once, while the loading line still
     shows — never at the first sight of a piece in the middle of a battle (viewer SWITCHES seeThroughStructureWhen) */
  if(V.data.models){const t0=clock();sawBuilt={...readPieces(solidPieces(built.group)),ms:clock()-t0}}
  /* viewer.bodies-before-board: the board opens with every body on it standing — never their 2D tokens first */
  return V.cast?.settle?.()
 }).then(()=>{if(!disposed)frame()})
 function frame(){if(disposed)return;try{
  const t=clock(),dt=last===null?0:Math.min(.1,Math.max(0,(t-last)/1000));last=t
  /* viewer.scenery-shadow-drawn-once: has a body moved or animated since the shadow was last drawn? Time passed with a body
     on the board (it animates where it stands), or a body came or went.
     viewer.still-frame-draws-nothing: and only then is the frame drawn again for the bodies' sake — until now any frame with
     a body on the board was drawn, moved or not. "A frame in which nothing changed - camera still, no body animating, the
     scene not an animated one - draws nothing." (Whose panel it is carries the key light: a change of it is drawn too.)
     THE PAGE NEVER SHOWS A STALE FRAME: everything that can move a pixel of these two canvases is one of the changes read
     here or just below — the camera and the viewport, time passed with a body on the board (in a played battle that is
     every frame), a body come or gone, the log moved on, whose panel it is, an animated scene's fires and fog, a piece
     turned see-through, the shadow or the depth asked for whole. What is drawn elsewhere — an effect, a notice, a mark, a
     hover's tip — has its own layer and its own frames, and never waited on this one (viewer SWITCHES stillFrameNothingStale). */
  if(V.cast){V.cast.frame(dt)
   if((V.cast.size&&dt>0)||V.cast.size!==castSize){castSize=V.cast.size;bodiesMoved=true;dirty=true}
   const subject=bodies&&V.cast.size?subjectOf(V):null;if(subject!==subjectDrawn){subjectDrawn=subject;dirty=true}
   /* and the board's own state: the log moved on (a body may stand elsewhere, have fallen, hold something else) */
   if(V.cursor!==cursorDrawn){cursorDrawn=V.cursor;dirty=true}}
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
  /* viewer.xcom-camera: what hides a body is see-through — looked for at most every SEE_EVERY ms.
     viewer.see-through-only-when-moved (2026-10-05): and only when what the answer depends on changed — the camera's pose
     (V.camVersion, and the viewport its lens follows) or a standing body's place, height or life (the cast's aims are exactly
     those) — never because a body is animating where it stands. Until then it ran on every frame the scene was dirty, and a
     frame with a body on it is always dirty: every 120 ms for the whole battle. A change that comes sooner than SEE_EVERY
     after a run is looked at on the first frame the check may run again, moving or not. */
  if(built?.group&&!V.seeThrough)V.seeThrough={faded,pieces:()=>solidPieces(built.group),   // read-only: what is see-through now,
   get runs(){return sawRuns},                                                               // how often the check has run,
   built:sawBuilt,                                                                           // what was read at load, and how long it took,
   /* and, for the tests and tools/frame-cost.mjs, the pieces hiding a body NOW as places in pieces() — by the structure, or
      ('plain') by every triangle; asking changes nothing that is drawn */
   hiding(how){const cam=V.camera3d,list=solidPieces(built.group);if(!cam||!V.cast?.aims)return []
    const now=hidersOf(list,cam,V.cast.aims(),how);return list.map((p,i)=>now.has(p.o)?i:-1).filter(i=>i>=0)}}
  if(camera&&built?.group&&V.cast?.aims&&t-sawThrough>=SEE_EVERY){
   const aims=V.cast.aims();let what=seen+'|'+viewportKey
   for(const a of aims)what+='|'+a.feet+','+a.at.x+','+a.at.y+','+a.at.z
   /* (viewer.solid-pieces-drawn-by-material: a piece that fades leaves its batch and is drawn by itself; solid again, it returns) */
   if(what!==sawWhat){sawWhat=what;sawThrough=t;sawRuns++;if(seeThrough(built.group,camera,aims,faded)){batches?.sync(faded);dirty=true}}}
  const characters=bodies?scene.getObjectByName('characters'):null
  /* viewer.characters-unfaded: the key light rides the body whose panel it is, above it and toward the camera */
  if(characters&&camera){const B=V.cast?.body(subjectOf(V))
   if(!key){key=new THREE.PointLight(KEY_LIGHT.color,KEY_LIGHT.intensity,KEY_LIGHT.distance);key.name='subject-key';characters.add(key)}
   key.visible=!!B
   if(B){const h=B.standingHeight(),p=B.stage.position,to=camera.position.clone().sub(p).setY(0);if(to.lengthSq()>1e-9)to.normalize()
    key.position.set(p.x+to.x*h*.6,p.y+h*1.25,p.z+to.z*h*.6)}}
  if(dirty&&camera&&w>0&&h>0){
   /* viewer.characters-stand-out, the shadows look: the bodies stay in the scene's own pass so that the sun's shadow holds
      them — drawn there under the board's marks exactly where their own canvas draws them over the marks; the subject's key
      light is that canvas's alone, never the ground's */
   const drawScene=()=>{if(characters){const lit=key&&key.visible;characters.visible=look.shadows;if(key&&look.shadows)key.visible=false
     renderer.render(scene,camera);characters.visible=true;if(key&&look.shadows)key.visible=lit}else renderer.render(scene,camera)}
   /* viewer.scenery-shadow-drawn-once (2026-10-05): the sun's shadow was taken again, whole, on every drawn frame. The
      scenery never moves: its shadow is drawn once and kept (kept-shadow.js); a frame in which a body moved or animated
      draws the bodies' shadows alone over the kept one; a frame in which nothing moved draws no shadow — the map holds the
      last. Where it cannot be kept (a stand-in renderer, more than one shadow light) it is taken whole, as before. */
   if(look.shadows&&renderer.shadowMap){
    if(keeper===undefined){keeper=keptShadow(renderer,scene,()=>scene.getObjectByName('characters'))
     /* read by the tests and tools/frame-cost.mjs: how often the scenery's shadow was drawn, and the shadow asked for whole
        (as first written, the reference the kept one is held to) */
     V.sceneryShadow=keeper?{get takes(){return keeper.takes},get whole(){return keeper.whole},set whole(v){keeper.whole=v;bodiesMoved=true;dirty=true}}:null}
    if(keeper?.keeps()){
     /* the scenery's shadow, alone, into the keeping: one pass more, once (and again only if the sun or the scenery changed) */
     if(!keeper.valid()){const still=keeper.take();drawScene();if(keeper.taken(still))bodiesMoved=true}
     if(!keeper.valid())renderer.shadowMap.needsUpdate=true
     else if(bodiesMoved)keeper.over()}
    else renderer.shadowMap.needsUpdate=true}
   drawScene();keeper?.done();bodiesMoved=false
   /* viewer.still-frame-draws-nothing: the bodies' canvas takes the scene's depth from the pieces that can hide a body in
      this view — a few dozen — not from every solid piece. V.bodiesDepth.whole asks for every piece, as first written: the
      reference tools/frame-cost.mjs holds this to, pixel for pixel. */
   if(characters){
    if(!V.bodiesDepth)V.bodiesDepth={get whole(){return depthWhole},set whole(v){depthWhole=!!v;dirty=true},get pieces(){return depthDrawn}}
    const hiding=depthWhole?null:couldHide(scene,camera,characters,seen+'|'+viewportKey,couldHiding);depthDrawn=hiding?hiding.size:-1
    drawBodies(bodies,scene,camera,characters,hiding)}
   dirty=false}raf=requestAnimationFrame(frame)
 }catch(error){onFailure(error)}}
 return{ready,dispose(){if(disposed)return;disposed=true;V.seeThrough=null;V.sceneryShadow=null;V.bodiesDepth=null;V.solidBatches=null;keeper?.dispose();for(const [o,solid] of faded){for(const m of [].concat(o.material))m.dispose();o.material=solid}faded.clear();batches?.dispose();batches=null;if(raf!==null)window.cancelAnimationFrame(raf);V.cast?.dispose();V.cast=null;canvas.removeEventListener('webglcontextlost',onLost);built?.dispose();removeEnvironment?.();renderer.dispose();renderer.forceContextLoss();canvas.remove();if(bodies){const c=bodies.domElement;bodies.dispose();bodies.forceContextLoss?.();c?.remove()}}}
}
