import {readFileSync,writeFileSync} from 'node:fs';import {createBattle} from '../src/core/setup.js';import {advanceBattle,completeActionCycle} from '../src/core/battle.js';import {runActivation} from '../src/ai/modes.js';import {movementOptions,stepCost,nearestEnemy,movePowerOf} from '../src/core/movement.js';
const records=[];
for(const name of ['priory','buried-pilgrimage']){
 const b=JSON.parse(readFileSync('../assets/battle-atlas/generated-combat/showcase.atlas-'+name+'.json','utf8')),ctx=createBattle(b.atlasSetup);
 for(let i=0;i<500;i++){const n=advanceBattle(ctx);if(n.kind==='complete')break;const u=ctx.state.units[n.actor]!,target=nearestEnemy(ctx,u),power=movePowerOf(ctx,u,'path');
 let info:any=null;if(u.ai==='dumb-melee'&&target&&power&&ctx.geo.distance(u.hex,target.hex)>1){const plans=movementOptions(ctx,u.id,power.id).filter(p=>ctx.geo.distance(p.destination,target.hex)<ctx.geo.distance(u.hex,target.hex)).map(p=>({...p,d:ctx.geo.distance(p.destination,target.hex),cost:p.path.reduce((v,h,i)=>v+stepCost(ctx,h,i?p.path[i-1]:u.hex),0)}));const old=[...plans].sort((a,b)=>a.d-b.d||a.destination-b.destination)[0],best=[...plans].sort((a,b)=>a.d-b.d||a.cost-b.cost||a.path.length-b.path.length||a.destination-b.destination)[0];if(old&&best&&old.destination!==best.destination)info={old:old.destination,oldPath:old.path,oldCost:old.cost,best:best.destination,bestPath:best.path,bestCost:best.cost,target:target.id}}
 const snap=info?{name,setup:b.atlasSetup,state:structuredClone(ctx.state),cursor:structuredClone(ctx.battleCursor),rng:{rootSeed:ctx.rng.rootSeed,seen:ctx.rng.seen?[...ctx.rng.seen]:null,log:structuredClone(ctx.rng.log)},actor:n.actor,...info}:null,start=ctx.events.length;runActivation(ctx,n.actor);const events=ctx.events.slice(start);
 if(snap&&(name!=='priory'||ctx.state.turn===5)&&events.some(e=>e.type==='aoo.provoked')){records.push({...snap,oldEvents:events});console.log(name,ctx.state.turn,n.actor,info,events.filter(e=>e.type==='aoo.provoked'));break}completeActionCycle(ctx)}
}
writeFileSync('test/fixtures/melee-contact-atlas.json',JSON.stringify(records,null,2)+'\n');console.log('fixtures',records.length)


