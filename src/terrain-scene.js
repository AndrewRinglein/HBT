import * as THREE from 'three'
import {center} from '../../tools/terrain-workshop/layout-adapter.mjs'
// One presentation affine for the complete metric scene. Geometry, normals,
// lights and their attenuation stay in Atlas meters. Only the camera changes.
export function worldToCSS(binding,field){
 const sx=field.colStep/(Math.sqrt(3)*1.5),sy=field.rowStep/2.25
 const p=binding.plan.shift(center(binding.origin.col,binding.origin.row))
 return new THREE.Matrix4().set(sx,0,0,field.hexes[0].px-p[0]*sx,
  0,0,sy,field.hexes[0].py-p[2]*sy,0,sx,0,0,0,0,0,1)
}
export function displayHeights(binding,field){
 const scale=field.colStep/(Math.sqrt(3)*1.5)
 return field.hexes.map(p=>binding.plan.heightAtCell(p.c+binding.origin.col,p.r+binding.origin.row)*scale)
}
// Column-major CSS homogeneous matrix -> WebGL clip matrix. The stage's
// layout centre is the viewport centre; CSS transforms act about their actual
// computed origin. Viewport numbers are unscaled layout pixels, never rects
// already scaled by the standalone page's outer fit wrapper.
export function clipMatrix(m, origin, field, viewport) {
  if(m.length!==16 || ![...m,...origin,field.w,field.h,viewport.w,viewport.h].every(Number.isFinite) || viewport.w<=0 || viewport.h<=0) throw new Error('invalid terrain projection')
  const [ox,oy,oz=0]=origin, a=Array.from(m)
  for(let r=0;r<4;r++) a[12+r]-=a[r]*ox+a[4+r]*oy+a[8+r]*oz
  const tx=viewport.w/2-field.w/2+ox,ty=viewport.h/2-field.h/2+oy
  for(let c=0;c<4;c++) {
    const i=c*4,w=a[i+3],x=a[i]+tx*w,y=a[i+1]+ty*w,z=a[i+2]+oz*w
    a[i]=2*x/viewport.w-w;a[i+1]=w-2*y/viewport.h
    // CSS positive z points toward the viewer. A generous render-only depth
    // interval prevents clipping the model; perspective w remains exact.
    a[i+2]=-z/10000;a[i+3]=w
  }
  return a
}
export function projectClip(matrix, x,y,z=0) {
  const p=[x,y,z,1],out=[0,0,0,0]
  for(let r=0;r<4;r++)for(let c=0;c<4;c++)out[r]+=matrix[c*4+r]*p[c]
  return out.slice(0,3).map(n=>n/out[3])
}
