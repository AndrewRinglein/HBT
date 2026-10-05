import * as THREE from 'three'
/* viewer.see-through-only-when-moved (2026-10-05; engine DECISIONS.md 'the battle screen must feel smooth: the speed first; …'):
   WHICH solid pieces of the scene stand between the camera and a standing body — the question the see-through rule asks
   (viewer.xcom-camera, terrain3d.js seeThrough: "Anything blocking the view of a character is highly translucent"). The rule
   is not changed here; only what one asking costs. As first written it handed every tall piece to three's own raycast, which
   tries the ray against every triangle of a piece — about 100 ms a run on the Orphanage, whose pieces run to 420,000
   triangles. Here a ray is tried against a piece's box first, and then against a structure built ONCE for the piece (the scene
   does not move): a tree of boxes over its triangles, in the scene's own space. The tree only chooses WHICH triangles are
   tried; each one tried is tried exactly as three tries it — in the piece's own space, by the same call, culled by the same
   side of its material, its hit carried back to the scene and measured from the eye the same way — so the answer is three's
   answer, not one like it. The rule as first written stays, as the reference the tests hold this to: hiders(…, 'plain').
   No package is added (viewer SWITCHES seeThroughStructure). */

/** triangles a leaf of the tree may hold, and how far a box is grown so that rounding never loses a triangle from it */
const LEAF=12,PAD=1e-4
const stats={boxes:0,triangles:0,built:0,plain:0}
/** what the last asking cost, counted: rays tried against a piece's box, triangles tried, structures built, pieces handed to
    three's own raycast (an instanced part, a skinned or morphed mesh: the structure does not read those) */
export const hidersStats=()=>({...stats})

const kept=new WeakMap()
/** a piece the structure can read: a plain mesh whose corners are where its geometry says (no bones, no morphs, one copy) */
const readable=o=>o.isMesh&&!o.isInstancedMesh&&!o.isSkinnedMesh&&!o.isBatchedMesh&&o.geometry?.isBufferGeometry&&o.geometry.attributes.position&&!o.geometry.morphAttributes?.position
/** the triangles three's Mesh.raycast would try — its own ranges: every group clipped to the draw range (a material array),
    else the draw range; each range with the index of its material */
function rangesOf(o){
 const g=o.geometry,total=g.index?g.index.count:g.attributes.position.count,dr=g.drawRange,out=[]
 if(Array.isArray(o.material)){for(const grp of g.groups){if(!o.material[grp.materialIndex])continue
  const start=Math.max(grp.start,dr.start),end=Math.min(total,Math.min(grp.start+grp.count,dr.start+dr.count));if(end>start)out.push({start,end,material:grp.materialIndex})}}
 else{const start=Math.max(0,dr.start),end=Math.min(total,dr.start+dr.count);if(end>start)out.push({start,end,material:-1})}
 return out
}
/** what is kept for a piece: where it stood and what it was when it was read (a piece whose place, corners or drawn part
    changed is read again), its box in the scene, and its tree once a ray has reached that box */
function keptOf(o){
 const g=o.geometry,m=o.matrixWorld.elements,dr=g.drawRange
 let K=kept.get(o)
 if(K){let same=K.position===g.attributes.position&&K.pv===g.attributes.position.version&&K.index===g.index&&K.iv===(g.index?.version??-1)&&K.ds===dr.start&&K.dc===dr.count&&K.groups===g.groups.length
  for(let i=0;same&&i<16;i++)if(K.m[i]!==m[i])same=false
  if(same)return K}
 if(g.boundingBox===null)g.computeBoundingBox()
 const b=_b3.copy(g.boundingBox).applyMatrix4(o.matrixWorld),grown=v=>PAD+Math.abs(v)*1e-5
 K={m:Float64Array.from(m),position:g.attributes.position,pv:g.attributes.position.version,index:g.index,iv:g.index?.version??-1,ds:dr.start,dc:dr.count,groups:g.groups.length,tree:null,
  box:Float32Array.of(b.min.x-grown(b.min.x),b.min.y-grown(b.min.y),b.min.z-grown(b.min.z),b.max.x+grown(b.max.x),b.max.y+grown(b.max.y),b.max.z+grown(b.max.z))}
 kept.set(o,K);return K
}
const _b3=new THREE.Box3()
function build(o){
 const g=o.geometry,pos=g.attributes.position,index=g.index,M=o.matrixWorld.elements,ranges=rangesOf(o)
 let n=0;for(const r of ranges)n+=Math.ceil((r.end-r.start)/3)
 /* every corner, once, where it stands in the scene */
 const count=pos.count,wx=new Float32Array(count),wy=new Float32Array(count),wz=new Float32Array(count)
 /* (read straight from the attribute's own numbers where it is a plain run of x, y, z — a 420,000-triangle piece is built in
    tens of ms; through its accessors otherwise) */
 const pa=!pos.isInterleavedBufferAttribute&&pos.itemSize===3&&!pos.normalized?pos.array:null
 const ia=index&&!index.isInterleavedBufferAttribute&&index.itemSize===1?index.array:null
 for(let i=0;i<count;i++){const x=pa?pa[i*3]:pos.getX(i),y=pa?pa[i*3+1]:pos.getY(i),z=pa?pa[i*3+2]:pos.getZ(i),w=1/(M[3]*x+M[7]*y+M[11]*z+M[15])
  wx[i]=(M[0]*x+M[4]*y+M[8]*z+M[12])*w;wy[i]=(M[1]*x+M[5]*y+M[9]*z+M[13])*w;wz[i]=(M[2]*x+M[6]*y+M[10]*z+M[14])*w}
 /* each triangle: its three corners, its material, its own box and middle */
 const tri=new Uint32Array(n*3),mat=new Int16Array(n),lo=new Float32Array(n*3),hi=new Float32Array(n*3),mid=new Float32Array(n*3)
 let t=0
 for(const r of ranges)for(let j=r.start;j<r.end;j+=3,t++){
  const a=ia?ia[j]:index?index.getX(j):j,b=ia?ia[j+1]:index?index.getX(j+1):j+1,c=ia?ia[j+2]:index?index.getX(j+2):j+2
  tri[t*3]=a;tri[t*3+1]=b;tri[t*3+2]=c;mat[t]=r.material
  const x0=Math.min(wx[a],wx[b],wx[c]),x1=Math.max(wx[a],wx[b],wx[c]),y0=Math.min(wy[a],wy[b],wy[c]),y1=Math.max(wy[a],wy[b],wy[c]),z0=Math.min(wz[a],wz[b],wz[c]),z1=Math.max(wz[a],wz[b],wz[c])
  lo[t*3]=x0;lo[t*3+1]=y0;lo[t*3+2]=z0;hi[t*3]=x1;hi[t*3+1]=y1;hi[t*3+2]=z1;mid[t*3]=(x0+x1)/2;mid[t*3+1]=(y0+y1)/2;mid[t*3+2]=(z0+z1)/2}
 /* the tree: a node is a box and either two children or a run of `order` (its triangles). Built top down by splitting a
    node's triangles at the middle of the longest side of the box their middles lie in — a child's such box is its parent's
    cut at the split, so a level costs one comparison a triangle (a run that will not split that way is measured afresh, and
    halved as it lies if its middles are all one point). The boxes themselves are made after, from the leaves up. */
 const order=new Uint32Array(n);for(let i=0;i<n;i++)order[i]=i
 let cap=Math.max(16,Math.ceil(n/LEAF)*4),kids=new Int32Array(cap*2),within=new Float32Array(cap*6),nodes=0
 const grow=()=>{cap*=2;const k=new Int32Array(cap*2);k.set(kids);kids=k;const w=new Float32Array(cap*6);w.set(within);within=w}
 /* the box the middles of order[start..end) lie in, measured, into `within` at node */
 const measure=(node,start,end)=>{let x0=Infinity,y0=Infinity,z0=Infinity,x1=-Infinity,y1=-Infinity,z1=-Infinity
  for(let i=start;i<end;i++){const k=order[i]*3,x=mid[k],y=mid[k+1],z=mid[k+2];if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;if(z<z0)z0=z;if(z>z1)z1=z}
  const w=node*6;within[w]=x0;within[w+1]=y0;within[w+2]=z0;within[w+3]=x1;within[w+4]=y1;within[w+5]=z1}
 const split=(node,start,end)=>{const w=node*6,dx=within[w+3]-within[w],dy=within[w+4]-within[w+1],dz=within[w+5]-within[w+2],axis=dx>=dy&&dx>=dz?0:dy>=dz?1:2,cut=(within[w+axis]+within[w+3+axis])/2
  let i=start,j=end-1
  while(i<=j){if(mid[order[i]*3+axis]<cut)i++;else{const t=order[i];order[i]=order[j];order[j]=t;j--}}
  return {at:i,axis,cut}}
 const stack=[];let root=-1
 if(n){root=nodes++;measure(root,0,n);stack.push(root,0,n)}
 while(stack.length){const end=stack.pop(),start=stack.pop(),node=stack.pop()
  if(end-start<=LEAF){kids[node*2]=-1-start;kids[node*2+1]=end-start;continue}
  let cut=split(node,start,end)
  if(cut.at===start||cut.at===end){measure(node,start,end);cut=split(node,start,end)}
  const whole=cut.at===start||cut.at===end,at=whole?(start+end)>>1:cut.at
  if(nodes+2>cap)grow()
  const left=nodes++,right=nodes++;kids[node*2]=left;kids[node*2+1]=right
  for(let k=0;k<6;k++){within[left*6+k]=within[node*6+k];within[right*6+k]=within[node*6+k]}
  if(!whole){within[left*6+3+cut.axis]=cut.cut;within[right*6+cut.axis]=cut.cut}
  stack.push(left,start,at,right,at,end)}
 /* the boxes, from the leaves up (a child is always made after its parent): a leaf's holds its triangles, a node's its two
    children's — each grown a hair, so that rounding never loses a triangle from its box */
 const box=new Float32Array(Math.max(1,nodes)*6),grown=v=>PAD+Math.abs(v)*1e-5
 for(let node=nodes-1;node>=0;node--){const k=kids[node*2],b=node*6
  let x0=Infinity,y0=Infinity,z0=Infinity,x1=-Infinity,y1=-Infinity,z1=-Infinity
  if(k<0){for(let i=-1-k,end=i+kids[node*2+1];i<end;i++){const q=order[i]*3
    if(lo[q]<x0)x0=lo[q];if(lo[q+1]<y0)y0=lo[q+1];if(lo[q+2]<z0)z0=lo[q+2];if(hi[q]>x1)x1=hi[q];if(hi[q+1]>y1)y1=hi[q+1];if(hi[q+2]>z1)z1=hi[q+2]}
   x0-=grown(x0);y0-=grown(y0);z0-=grown(z0);x1+=grown(x1);y1+=grown(y1);z1+=grown(z1)}
  else{const l=k*6,r=kids[node*2+1]*6
   x0=Math.min(box[l],box[r]);y0=Math.min(box[l+1],box[r+1]);z0=Math.min(box[l+2],box[r+2]);x1=Math.max(box[l+3],box[r+3]);y1=Math.max(box[l+4],box[r+4]);z1=Math.max(box[l+5],box[r+5])}
  box[b]=x0;box[b+1]=y0;box[b+2]=z0;box[b+3]=x1;box[b+4]=y1;box[b+5]=z1}
 kids=kids.slice(0,Math.max(1,nodes)*2)
 stats.built++
 return {n,tri,mat,order,box,kids,root,inverse:new THREE.Matrix4().copy(o.matrixWorld).invert()}
}

/** does the stretch of a ray from `e` along the unit `d`, `far` long, pass through this box? (b: six numbers at `at`) */
function throughBox(b,at,e,d,far){
 let t0=0,t1=far
 for(let k=0;k<3;k++){const o=k===0?e.x:k===1?e.y:e.z,v=k===0?d.x:k===1?d.y:d.z,lo=b[at+k],hi=b[at+3+k]
  if(v===0){if(o<lo||o>hi)return false;continue}
  let a=(lo-o)/v,c=(hi-o)/v;if(a>c){const s=a;a=c;c=s}
  if(a>t0)t0=a;if(c<t1)t1=c;if(t0>t1)return false}
 return true
}
const _local=new THREE.Ray(),_a=new THREE.Vector3(),_b=new THREE.Vector3(),_c=new THREE.Vector3(),_p=new THREE.Vector3()
/** is there a hit of the ray on this piece that the rule counts — nearer the eye than the body by more than its own length
    (`far - near`), and not below `waist`? Every triangle tried is tried as three's Mesh.raycast tries it. */
function hides(o,K,ray,far,near,waist){
 const T=K.tree||(K.tree=build(o));if(T.root<0)return false
 const e=ray.origin,d=ray.direction,pos=o.geometry.attributes.position,mats=o.material,M=o.matrixWorld
 _local.copy(ray).applyMatrix4(T.inverse)
 const stack=[T.root]
 while(stack.length){const node=stack.pop()
  if(!throughBox(T.box,node*6,e,d,far))continue
  const k=T.kids[node*2]
  if(k>=0){stack.push(k,T.kids[node*2+1]);continue}
  for(let i=-1-k,end=i+T.kids[node*2+1];i<end;i++){const t=T.order[i],m=T.mat[t]<0?mats:mats[T.mat[t]];if(!m)continue
   stats.triangles++
   _a.fromBufferAttribute(pos,T.tri[t*3]);_b.fromBufferAttribute(pos,T.tri[t*3+1]);_c.fromBufferAttribute(pos,T.tri[t*3+2])
   const hit=m.side===THREE.BackSide?_local.intersectTriangle(_c,_b,_a,true,_p):_local.intersectTriangle(_a,_b,_c,m.side===THREE.FrontSide,_p)
   if(hit===null)continue
   _p.applyMatrix4(M);const distance=e.distanceTo(_p)
   if(distance>far)continue
   if(distance>far-near||_p.y<waist)continue
   return true}}
 return false
}

/** viewer SWITCHES seeThroughStructureWhen: the structures are built when the scene is — behind the loading line, not at the
    first sight of a piece in the middle of a battle. Returns what was built: pieces, triangles. */
export function readPieces(list){
 let pieces=0,triangles=0
 for(const p of list){if(!readable(p.o))continue;const K=keptOf(p.o);if(!K.tree)K.tree=build(p.o);pieces++;triangles+=K.tree.n}
 return {pieces,triangles}
}
/** how near the body a hit may be and still be a wall in front of it: within this of the body is its own hex or what it holds */
export const OWN_LENGTH=.6
/**
 * The pieces that hide a standing body from the camera: for each aim (a body's chest or head, with its feet), the pieces of
 * `list` ({o, top}: the scene's solid pieces — terrain3d.js solidPieces) reaching its waist that the line from the eye to
 * the aim meets short of the body and not below its waist. `how`: 'plain' asks three's own raycast, every triangle of every
 * tall piece — the rule as first written, kept as the reference; otherwise the structure above. The same Set either way.
 */
export function hidersOf(list,camera,aims,how){
 const ray=new THREE.Raycaster(),now=new Set(),eye=camera.getWorldPosition(new THREE.Vector3())
 stats.boxes=stats.triangles=stats.built=stats.plain=0
 for(const a of aims){
  const to=a.at.clone().sub(eye),far=to.length();if(!(far>0))continue
  const waist=a.feet+(a.at.y-a.feet)*.5
  ray.set(eye,to.divideScalar(far));ray.far=far
  if(how==='plain'){const tall=list.filter(p=>p.top>=waist).map(p=>p.o);if(!tall.length)continue
   for(const hit of ray.intersectObjects(tall,false)){if(hit.distance>far-OWN_LENGTH||hit.point.y<waist)continue;now.add(hit.object)}
   continue}
  for(const p of list){if(p.top<waist||now.has(p.o))continue
   /* (a piece already found hiding a body hides it whatever else it hides: it is not asked again) */
   if(!p.o.layers.test(ray.layers))continue
   if(!readable(p.o)){stats.plain++;for(const hit of ray.intersectObject(p.o,false)){if(hit.distance>far-OWN_LENGTH||hit.point.y<waist)continue;now.add(hit.object);break}continue}
   stats.boxes++
   const K=keptOf(p.o)
   if(!throughBox(K.box,0,ray.ray.origin,ray.ray.direction,far))continue
   if(hides(p.o,K,ray.ray,far,OWN_LENGTH,waist))now.add(p.o)}
 }
 return now
}
