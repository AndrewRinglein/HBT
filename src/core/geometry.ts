import type {Board} from './hex.js'

/** Integer affine odd-r coordinates. One hex center step in x is 2000. */
export type Point = readonly [number, number]
export const GEOMETRY_LIMITS = Object.freeze({coordinate:40_000_000,vertices:32,totalVertices:8192,movementPadding:100_000})
export function centerPoint(board:Board,h:number):Point{return [1000*(2*(h%board.width)+Math.floor(h/board.width)%2),3000*Math.floor(h/board.width)]}
/** Products whose sum is provably safe stay Number integers; exceptional large
 * coordinates use BigInt. No rounded orientation can enter a decision. */
function cross(ax:number,ay:number,bx:number,by:number):number{
 if(Math.abs(ax)*Math.abs(by)+Math.abs(ay)*Math.abs(bx)<=Number.MAX_SAFE_INTEGER)return Math.sign(ax*by-ay*bx)
 const n=BigInt(ax)*BigInt(by)-BigInt(ay)*BigInt(bx);return n<0n?-1:n>0n?1:0
}
export function orientation(a:Point,b:Point,p:Point):number{return cross(b[0]-a[0],b[1]-a[1],p[0]-a[0],p[1]-a[1])}
/** SAT against every polygon edge and the segment normal, closed contact. */
export function segmentCrossesPolygon(a:Point,b:Point,vertices:readonly Point[]):boolean{
 const turn=orientation(vertices[0]!,vertices[1]!,vertices[2]!)
 let left=false,right=false
 for(let i=0;i<vertices.length;i++){
  const p=vertices[i]!,q=vertices[(i+1)%vertices.length]!
  if(orientation(p,q,a)*turn<0&&orientation(p,q,b)*turn<0)return false
  const side=orientation(a,b,p);if(side<0)left=true;if(side>0)right=true
 }
 return (left && right) || vertices.some(p=>orientation(a,b,p)===0)
}
function pointNearSegment(p:Point,a:Point,b:Point,padding:number):boolean{
 const dx=BigInt(b[0]-a[0]),dy=BigInt(b[1]-a[1]),x=BigInt(p[0]-a[0]),y=BigInt(p[1]-a[1]),r=BigInt(padding)
 const len=3n*dx*dx+dy*dy,dot=3n*x*dx+y*dy,norm=3n*x*x+y*y
 if(dot<=0n||len===0n)return norm<=r*r
 if(dot>=len){const ex=x-dx,ey=y-dy;return 3n*ex*ex+ey*ey<=r*r}
 return norm*len-dot*dot<=r*r*len
}
/** Euclidean clearance in Atlas metric: distance² = 3*dx² + dy². */
export function segmentNearPolygon(a:Point,b:Point,vertices:readonly Point[],padding:number):boolean{
 if(segmentCrossesPolygon(a,b,vertices))return true
 if(padding===0)return false
 for(let i=0;i<vertices.length;i++){
  const p=vertices[i]!,q=vertices[(i+1)%vertices.length]!
  if(pointNearSegment(a,p,q,padding)||pointNearSegment(b,p,q,padding)||pointNearSegment(p,a,b,padding))return true
 }
 return false
}

export type Fraction = readonly [bigint,bigint]
export type Interval = readonly [Fraction,Fraction]
export const compareFraction=(a:Fraction,b:Fraction):number=>{const d=a[0]*b[1]-b[0]*a[1];return d<0n?-1:d>0n?1:0}
/** Exact closed segment/convex-polygon clipping; denominators stay positive. */
export function segmentPolygonInterval(a:Point,b:Point,vertices:readonly Point[]):Interval|null{
 let lo:Fraction=[0n,1n],hi:Fraction=[1n,1n]
 const turn=BigInt(orientation(vertices[0]!,vertices[1]!,vertices[2]!))
 for(let i=0;i<vertices.length;i++){
  const p=vertices[i]!,q=vertices[(i+1)%vertices.length]!
  const dx=BigInt(q[0]-p[0]),dy=BigInt(q[1]-p[1])
  const start=turn*(dx*BigInt(a[1]-p[1])-dy*BigInt(a[0]-p[0]))
  const change=turn*(dx*BigInt(b[1]-a[1])-dy*BigInt(b[0]-a[0]))
  if(change===0n){if(start<0n)return null;continue}
  const t:Fraction=change>0n?[-start,change]:[start,-change]
  if(change>0n){if(compareFraction(t,lo)>0)lo=t}else if(compareFraction(t,hi)<0)hi=t
  if(compareFraction(lo,hi)>0)return null
 }
 return [lo,hi]
}
export function cellPolygon(board:Board,h:number):Point[]{
 const [x,y]=centerPoint(board,h)
 return [[x,y-2000],[x+1000,y-1000],[x+1000,y+1000],[x,y+2000],[x-1000,y+1000],[x-1000,y-1000]]
}
export function polygonsOverlap(a:readonly Point[],b:readonly Point[]):boolean{
 for(const [p,q] of [[a,b],[b,a]] as const){
  const turn=orientation(p[0]!,p[1]!,p[2]!)
  for(let i=0;i<p.length;i++)if(q.every(v=>orientation(p[i]!,p[(i+1)%p.length]!,v)*turn<0))return false
 }
 return true
}
