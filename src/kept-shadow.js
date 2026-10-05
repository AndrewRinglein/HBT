import * as THREE from 'three'
/* viewer.scenery-shadow-drawn-once (2026-10-05; engine DECISIONS.md 'the battle screen must feel smooth: the speed first; …').
   The sun's shadow map (4096x4096) was drawn again on every drawn frame — every piece of the scenery that casts, 916 draw
   calls and 3 million triangles a frame on the Orphanage — though the scenery never moves and only the bodies do. Ruled
   2026-10-03 'shadows are kept': kept, and the picture is not changed here. What changes is what a frame draws INTO the map:
     · when the scene is built (and again only if the sun or the scenery changes) the scenery's shadow is drawn once, alone,
       and its depth KEPT in a second map of the same size;
     · a frame in which a body moved or animated starts the sun's map from that kept depth instead of from empty, and draws
       the bodies alone over it — the nearer of scenery and body wins at every texel, exactly as when they were drawn together;
     · a frame in which nothing moved draws no shadow at all: the map still holds the last one.
   Every draw into the map is three's own shadow pass (its depth materials, its sides, its culling); this only chooses which
   objects cast in a pass (castShadow, which nothing but that pass reads) and what the map holds when the pass begins (the
   pass's own clear, followed by a copy of the kept depth). A renderer that cannot do that — a test's stand-in, a scene lit by
   more than one shadow-casting light or by one that is not the sun — is given the shadow whole on every drawn frame, as before. */

const sunKeyOf=sun=>{const c=sun.shadow.camera,p=sun.position,t=sun.target.position,m=sun.shadow.mapSize
 return [p.x,p.y,p.z,t.x,t.y,t.z,c.left,c.right,c.top,c.bottom,c.near,c.far,m.x,m.y].join(',')}

/**
 * The keeper of a scene's scenery shadow, or null where this renderer cannot keep one.
 * `scene`: what the renderer draws; `charactersOf()`: the group the bodies stand in (they are what moves), or null.
 */
export function keptShadow(renderer,scene,charactersOf){
 const sm=renderer.shadowMap
 if(!sm||typeof renderer.getContext!=='function'||typeof renderer.getRenderTarget!=='function'||typeof renderer.setRenderTarget!=='function'||typeof renderer.clear!=='function'||!renderer.properties)return null
 const gl=renderer.getContext();if(!gl||typeof gl.blitFramebuffer!=='function')return null
 let keep=null,keptFrom=null,keptKey='',quiet=[],hooked=null,whole=false,takes=0,lights=null
 const fbOf=target=>renderer.properties.get(target).__webglFramebuffer
 const under=(o,g)=>{for(let n=o;n;n=n.parent)if(n===g)return true;return false}
 /** the one light whose shadow can be kept: the scene's only shadow-casting light, and a directional one */
 function sun(){
  if(!lights){lights=[];scene.traverse(o=>{if(o.isLight&&o.castShadow)lights.push(o)})}
  return lights.length===1&&lights[0].isDirectionalLight?lights[0]:null
 }
 /** depth copied from one map's framebuffer to another's, whichever of the two is bound to be drawn into when asked */
 function copy(from,to,bound){
  const w=to.width,h=to.height,prev=bound?null:renderer.getRenderTarget()
  if(!bound)renderer.setRenderTarget(to)                       // three binds `to` (read and draw) and knows it
  gl.bindFramebuffer(gl.READ_FRAMEBUFFER,fbOf(from))
  gl.blitFramebuffer(0,0,w,h,0,0,w,h,gl.DEPTH_BUFFER_BIT,gl.NEAREST)
  gl.bindFramebuffer(gl.READ_FRAMEBUFFER,fbOf(to))             // read and draw the same again, as three left them
  if(!bound)renderer.setRenderTarget(prev)
 }
 const wake=()=>{for(const o of quiet)o.castShadow=true;quiet=[]}
 const unhook=()=>{if(hooked){renderer.clear=hooked;hooked=null}}
 const api={
  /** is the scenery's shadow to be kept on this frame? (one sun, and the host has not asked for the shadow whole) */
  keeps(){return !whole&&!!sun()},
  /** is the kept shadow still the scenery's, under this sun? */
  valid(){const s=sun();return !!s&&!!keep&&!!s.shadow.map&&s.shadow.map===keptFrom&&sunKeyOf(s)===keptKey},
  /** before the pass that draws the scenery's shadow alone: every piece casts, no body does. Returns what to hand `taken`. */
  take(){
   wake();unhook()
   const g=charactersOf(),still=[];if(g)g.traverse(o=>{if(o.castShadow&&!o.isLight){o.castShadow=false;still.push(o)}})
   sm.needsUpdate=true
   return still
  },
  /** after that pass: its depth is kept; the bodies cast again, and the scenery no longer does — its shadow is in the keeping */
  taken(still){
   const s=sun(),map=s.shadow.map;for(const o of still)o.castShadow=true
   if(!map||!map.depthTexture)return false
   if(!keep||keep.width!==map.width||keep.height!==map.height){keep?.depthTexture?.dispose();keep?.dispose()
    /* (its colour is never read: the smallest there is) */
    keep=new THREE.WebGLRenderTarget(map.width,map.height,{format:THREE.RedFormat,type:THREE.UnsignedByteType,minFilter:THREE.NearestFilter,magFilter:THREE.NearestFilter,generateMipmaps:false})
    keep.depthTexture=new THREE.DepthTexture(map.width,map.height,map.depthTexture.type);keep.depthTexture.format=map.depthTexture.format
    keep.depthTexture.minFilter=THREE.NearestFilter;keep.depthTexture.magFilter=THREE.NearestFilter}
   copy(map,keep,false)
   const g=charactersOf();quiet=[];scene.traverse(o=>{if(o.castShadow&&!o.isLight&&!(g&&under(o,g))){o.castShadow=false;quiet.push(o)}})
   keptFrom=map;keptKey=sunKeyOf(s);takes++
   return true
  },
  /** before a pass that draws the bodies' shadows over the kept one: the map's own clear is followed by the kept depth */
  over(){
   const s=sun();unhook()
   const real=renderer.clear
   hooked=real
   renderer.clear=function(...a){const out=real.apply(renderer,a);if(keep&&renderer.getRenderTarget()===s.shadow.map&&s.shadow.map===keptFrom)copy(keep,s.shadow.map,true);return out}
   sm.needsUpdate=true
  },
  /** after any pass */
  done(){unhook()},
  /** the scenery or the sun changed: its shadow is drawn again at the next frame */
  invalidate(){keptFrom=null;lights=null},
  /** asked for WHOLE (false by default): the shadow drawn whole on every drawn frame, as it was first written — the reference the tool holds the kept one to */
  get whole(){return whole},set whole(v){whole=!!v;if(whole){wake();unhook();keptFrom=null}},
  /** how often the scenery's shadow has been drawn */
  get takes(){return takes},
  dispose(){wake();unhook();keep?.depthTexture?.dispose();keep?.dispose();keep=null;keptFrom=null},
 }
 return api
}
