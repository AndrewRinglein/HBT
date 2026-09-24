// V2 low cover: directional target-end geometry, prepared once and invalidated
// by complete plain-data keys. Queries never substitute viewer collision rules.
import {validBoard,type Board,type Geometry} from './hex.js'
import type {Ctx,Prop} from './types.js'
import {decodeProps} from './props.js'
import {cellPolygon,centerPoint,compareFraction,polygonsOverlap,segmentCrossesPolygon,segmentPolygonInterval,type Interval,type Point} from './geometry.js'

export const COVER_LIMITS=Object.freeze({work:1_024_000_000,reverseEntries:16_000_000,cacheBytes:64*1024*1024})
type Shape={key:string;prop:Prop}
type Table={key:string;board:Board;keys:readonly string[];bits:Uint8Array|null;reverse:ReadonlyMap<string,Uint32Array>;edges:ReadonlyMap<string,Uint32Array>;costs:ReadonlyMap<number,number>;budgets:ReadonlyMap<string,number>;entries:number;bytes:number}
type Stats={work:number;changedPairs:number;reverseEntries:number;bytes:number;cacheHit:boolean}
type View={table:Table;stats:Stats}
const views=new WeakMap<Ctx,View>(),shared=new Map<string,Table>()
let sharedBytes=0
const bit=(bits:Uint8Array,i:number)=>(bits[i>>>3]!&(1<<(i&7)))!==0
function set(bits:Uint8Array,i:number,value:boolean):void{const m=1<<(i&7);bits[i>>>3]=value?bits[i>>>3]!|m:bits[i>>>3]!&~m}
function contains(a:Uint32Array,n:number):boolean{let lo=0,hi=a.length-1;while(lo<=hi){const m=(lo+hi)>>>1,v=a[m]!;if(v===n)return true;if(v<n)lo=m+1;else hi=m-1}return false}
function remember(table:Table):void{
 if(table.bytes>COVER_LIMITS.cacheBytes)return
 while(sharedBytes+table.bytes>COVER_LIMITS.cacheBytes&&shared.size){const k=shared.keys().next().value!;sharedBytes-=shared.get(k)!.bytes;shared.delete(k)}
 shared.set(table.key,table);sharedBytes+=table.bytes
}
function overlapAfterSource(x:Interval,y:Interval,source:Interval):boolean{
 const lo=compareFraction(x[0],y[0])>0?x[0]:y[0],hi=compareFraction(x[1],y[1])<0?x[1]:y[1]
 return compareFraction(lo,hi)<=0&&compareFraction(hi,source[1])>0
}
function covers(a:Point,b:Point,source:readonly Point[],regions:readonly (readonly Point[])[],physical?:readonly Point[]):boolean{
 if(physical&&!segmentCrossesPolygon(a,b,physical))return false
 const occupied=physical?segmentPolygonInterval(a,b,physical):null
 if(physical&&!occupied)return false
 let own:Interval|null=null
 for(const region of regions){
  if(!segmentCrossesPolygon(a,b,region))continue
  const atEnd=segmentPolygonInterval(a,b,region)!
  own??=segmentPolygonInterval(a,b,source)!
  if(overlapAfterSource(occupied??atEnd,atEnd,own))return true
 }
 return false
}
/** Pure exact predicate for tools/tests. Runtime uses its precomputed form. */
export function lowPropCovers(geo:Geometry,a:number,b:number,prop:Prop):boolean{
 if(a===b||prop.height!=='low')return false
 const regions=[b,...geo.neighboursOf(b)].filter(h=>h!==a)
 const fp=prop.footprint
 const selected=fp.kind==='hex'?regions.filter(h=>fp.hexes.includes(h)):regions
 return covers(centerPoint(geo.board,a),centerPoint(geo.board,b),cellPolygon(geo.board,a),selected.map(h=>cellPolygon(geo.board,h)),fp.kind==='polygon'?fp.vertices:undefined)
}
function derive(geo:Geometry,shapes:Shape[],previous?:Table):View{
 const board=geo.board,n=geo.hexCount,keys=shapes.map(s=>s.key),key=`${board.width}x${board.height}|${JSON.stringify(keys)}`
 const hit=shared.get(key)
 if(hit){shared.delete(key);shared.set(key,hit);return {table:hit,stats:{work:0,changedPairs:0,reverseEntries:hit.entries,bytes:hit.bytes,cacheHit:true}}}
 const stats:Stats={work:0,changedPairs:0,reverseEntries:0,bytes:0,cacheHit:false}
 const compatible=previous?.board.width===board.width&&previous.board.height===board.height?previous:undefined
 const bits=shapes.length?(compatible?.bits?.slice()??new Uint8Array(Math.ceil(n*n/8))):null
 const reverse=new Map<string,Uint32Array>(),edges=new Map<string,Uint32Array>(),costs=new Map<number,number>(),budgets=new Map<string,number>()
 const points=shapes.length?Array.from({length:n},(_,h)=>centerPoint(board,h)):[]
 const cells=shapes.length?Array.from({length:n},(_,h)=>cellPolygon(board,h)):[]
 const charge=(work:number)=>{stats.work+=work;if(stats.work>COVER_LIMITS.work)throw new Error('cover: geometry work limit exceeded')}
 let entries=0
 for(const {key:shapeKey,prop} of shapes){
  const prior=compatible?.reverse.get(shapeKey),priorEdges=compatible?.edges.get(shapeKey)
  if(prior&&priorEdges){const budget=compatible!.budgets.get(shapeKey)!;charge(budget);budgets.set(shapeKey,budget);reverse.set(shapeKey,prior);edges.set(shapeKey,priorEdges);entries+=prior.length+priorEdges.length;continue}
  const startWork=stats.work
  const fp=prop.footprint,physical=fp.kind==='polygon'?fp.vertices:undefined
  const touched=new Set<number>()
  if(fp.kind==='hex')for(const h of fp.hexes)touched.add(h)
  else for(let h=0;h<n;h++){charge(fp.vertices.length*6);if(polygonsOverlap(fp.vertices,cells[h]!))touched.add(h)}
  const targets=new Set<number>()
  for(const h of touched){targets.add(h);for(const b of geo.neighboursOf(h))targets.add(b)}
  // Before pair work, reject the complete conservative budget (including hex
  // clipping). Spatial candidates do not approximate geometry: a disjoint hex
  // cannot contain any physical ray/prop overlap.
  charge(n*targets.size*((physical?.length??0)+7*6+6))
  const list:number[]=[],edgeList:number[]=[]
  for(const b of targets){
   const regionIds=[b,...geo.neighboursOf(b)].filter(h=>touched.has(h))
   for(let a=0;a<n;a++){
    if(a===b)continue
    if(!covers(points[a]!,points[b]!,cells[a]!,regionIds.filter(h=>h!==a).map(h=>cells[h]!),physical))continue
    if(entries+list.length>=COVER_LIMITS.reverseEntries)throw new Error('cover: reverse-entry limit exceeded')
    const encoded=a*n+b;list.push(encoded);set(bits!,encoded,true)
   }
  }
  list.sort((a,b)=>a-b)
  if(prop.crossingCost){
   for(let a=0;a<n;a++)for(const b of geo.neighboursOf(a)){
    charge(physical!.length)
    if(segmentCrossesPolygon(points[a]!,points[b]!,physical!))edgeList.push(a*n+b)
   }
  }
  entries+=list.length+edgeList.length
  budgets.set(shapeKey,stats.work-startWork)
  reverse.set(shapeKey,Uint32Array.from(list));edges.set(shapeKey,Uint32Array.from(edgeList))
 }
 if(entries>COVER_LIMITS.reverseEntries)throw new Error('cover: reverse-entry limit exceeded')
 if(compatible&&bits){
  const current=new Set(keys),removed=compatible.keys.filter(k=>!current.has(k)),visited=new Uint8Array(removed.length?bits.length:0)
  for(const k of removed)for(const encoded of compatible.reverse.get(k)!){
   if(bit(visited,encoded))continue
   set(visited,encoded,true);stats.changedPairs++
   set(bits,encoded,keys.some(k=>contains(reverse.get(k)!,encoded)))
  }
 }
 for(const list of edges.values())for(const encoded of list)costs.set(encoded,(costs.get(encoded)??0)+1)
 const bytes=(bits?.byteLength??0)+entries*4+costs.size*32+key.length*2+keys.length*64+64
 const table:Table={key,board:{...board},keys,bits,reverse,edges,costs,budgets,entries,bytes}
 stats.reverseEntries=entries;stats.bytes=bytes;remember(table);return {table,stats}
}
export function prepareCover(ctx:Ctx,input=ctx.state.props):void{
 const board=ctx.state.board
 if(!validBoard(board)||ctx.state.terrain.length!==board.width*board.height)throw new Error('cover: invalid board')
 const props=decodeProps(input.filter(p=>p.height==='low'),ctx.state.terrain.length)
 // v2.prop-destroy: steps taken change no geometry, so they never key a shape.
 const shapes=props.map(prop=>({key:JSON.stringify({...prop,steps:undefined}),prop})).sort((a,b)=>a.key<b.key?-1:a.key>b.key?1:0)
 const prior=views.get(ctx)
 if(prior&&prior.table.board.width===board.width&&prior.table.board.height===board.height&&shapes.length===prior.table.keys.length&&shapes.every((s,i)=>s.key===prior.table.keys[i]))return
 views.set(ctx,derive(ctx.geo,shapes,prior?.table))
}
function tableFor(ctx:Ctx,a:number,b:number):Table{
 prepareCover(ctx)
 const n=ctx.state.terrain.length
 if(![a,b].every(h=>Number.isSafeInteger(h)&&h>=0&&h<n))throw new Error('cover: invalid hex')
 return views.get(ctx)!.table
}
export function hasLowCover(ctx:Ctx,a:number,b:number):boolean{const t=tableFor(ctx,a,b);return t.bits!==null&&bit(t.bits,a*ctx.state.terrain.length+b)}
export function preparedLowEdgeCost(ctx:Ctx,props=ctx.state.props):(a:number,b:number)=>number{
 prepareCover(ctx,props);const table=views.get(ctx)!.table,n=ctx.state.terrain.length
 return (a,b)=>table.costs.get(a*n+b)??0
}
export function lowEdgeCost(ctx:Ctx,a:number,b:number):number{return tableFor(ctx,a,b).costs.get(a*ctx.state.terrain.length+b)??0}
export function forkCover(source:Ctx,fork:Ctx):void{prepareCover(source);const v=views.get(source)!;views.set(fork,{table:v.table,stats:{...v.stats}})}
export function coverStats(ctx:Ctx):Stats&{sharedBytes:number}{prepareCover(ctx);return {...views.get(ctx)!.stats,sharedBytes}}
