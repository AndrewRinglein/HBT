import {createBattle} from '../src/core/setup.js'
import {beginActivation} from '../src/core/mutate.js'
import {movementOptions,stepCost} from '../src/core/movement.js'
for(const [hero,enemy] of [[17,21],[21,17],[19,23],[23,19],[12,20],[20,12]]){
 const ctx=createBattle({map:{id:'test.tie',name:'Tie',rows:Array(5).fill('........')},replicate:0,heroes:['test-warrior'],enemies:['unit.zombie'],heroHexes:[hero],enemyHexes:[enemy]});beginActivation(ctx,1,'test');const u=ctx.state.units[1]!;
 const plans=movementOptions(ctx,1,'power.move').filter(p=>ctx.geo.distance(p.destination,hero)<ctx.geo.distance(enemy,hero)).map(p=>({...p,d:ctx.geo.distance(p.destination,hero),cost:p.path.reduce((v,h,i)=>v+stepCost(ctx,h,i?p.path[i-1]:enemy),0)}));
 const old=[...plans].sort((a,b)=>a.d-b.d||a.destination-b.destination)[0],best=[...plans].sort((a,b)=>a.d-b.d||a.cost-b.cost||a.path.length-b.path.length||a.destination-b.destination)[0];console.log({hero,enemy,old:old&&[old.destination,old.path,old.cost],best:best&&[best.destination,best.path,best.cost]});
}

