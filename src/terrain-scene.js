// Presentation only: board coordinates and footprint membership come from the
// prepared engine field. No movement, sight, elevation or collision rules here.
export const TERRAIN_ASSET = {
  'terrain.open':'meadow','terrain.forest':'meadow','terrain.hills':'hill',
  'terrain.rocky':'hill','terrain.rocky-hills':'hill','terrain.water':'water',
  'terrain.burning':'meadow','terrain.poisoned':'meadow',
}
export function terrainScene(field, props) {
  const ground=field.hexes.map((p,hex)=>{
    const terrainId=field.terrainIds[hex],asset=TERRAIN_ASSET[terrainId]
    if(!asset) throw new Error(`3D terrain has no visual treatment for ${terrainId}`)
    return {hex,x:p.px,y:p.py,terrainId,asset,ceiling:0}
  })
  const obstacles=props.flatMap(prop=>prop.footprint.hexes.map(hex=>{
    const p=field.hexes[hex];if(!p) throw new Error('3D prop has no field position')
    return {hex,x:p.px,y:p.py,propId:prop.id,material:prop.material,asset:'boulders'}
  }))
  return {ground,obstacles}
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
