import {performance} from 'node:perf_hooks'
import {createBattle} from '../src/core/setup.js'
import {attackLineStats,attackLineClear} from '../src/core/los.js'
import type {AuthoredMap} from '../src/core/types.js'
for(const [width,height,count] of [[20,10,32],[40,40,84]] as const){
 const map:AuthoredMap={id:`test.map.bench-${width}`,name:'Geometry benchmark',rows:Array(height).fill('.'.repeat(width)),props:Array.from({length:count},(_,i)=>{
  const x=2500+(i*1709)%(width*1800),y=500+(i*2503)%(height*2600)
  return{id:`prop.bench.${i}`,height:'high',material:3,footprint:{kind:'polygon',movementPadding:640,vertices:[[x,y],[x+450,y+120],[x+1100,y+2200],[x+650,y+2080]]}}
 })}
 const start=performance.now(),ctx=createBattle({replicate:0,map,heroes:[],heroHexes:[],enemies:[],enemyHexes:[]}),prepared=performance.now()
 for(let i=0;i<100;i++)attackLineClear(ctx,i%(width*height),(i*17+53)%(width*height))
 console.log(JSON.stringify({width,height,count,setupMs:prepared-start,queries100Ms:performance.now()-prepared,stats:attackLineStats(ctx)}))
}
