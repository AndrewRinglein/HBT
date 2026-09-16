import {createState,fold} from '../src/fold.js'
import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {modules,environment} from './atlas-test-runtime.mjs'
import {packTerrainAssets} from './terrain-assets.mjs'
const A=await modules(),catalog=packTerrainAssets()
const battle=JSON.parse(readFileSync('../assets/battle-atlas/generated-combat/showcase.atlas-priory.json'))
const fact=battle.events.find(e=>e.type==='map.loaded'),field={width:fact.width,height:fact.height}
test('real Atlas binding validates exact initial map facts and frozen source identity',()=>{
 const binding=A.prepareAtlasBinding(battle.atlasScene,catalog,field,fact)
 assert.equal(binding.library.assets.find(a=>a.id==='gothic-votive-shrine').combatBoundsSource,'transformed-glb-accessor-bounds')
 for(const mutate of [b=>b.layout.tiles[0].assets.push({id:'crate-pile',role:'low'}),b=>b.catalog.assets[0].file='different.glb',b=>b.policy.movementPadding=0,b=>b.areaIndex=1,b=>b.initialMapFact.props=[]]){
  const changed=structuredClone(battle.atlasScene);mutate(changed);assert.throws(()=>A.prepareAtlasBinding(changed,catalog,field,fact))
 }
 const changed=structuredClone(fact);changed.floor[0]=!changed.floor[0];assert.throws(()=>A.prepareAtlasBinding(battle.atlasScene,catalog,field,changed),/map fact/)
 assert.throws(()=>A.prepareAtlasBinding({mapId:'sunken-priory-study'},catalog,field,fact),/correspondence/)
 assert.equal(A.prepareAtlasBinding({mapId:'sunken-priory-study'},catalog).width,20)
})

test('2D fallback draws exact polygons and omits missing-floor tiles',()=>{
 const w=environment(),stage=w.document.createElement('div'),hexes=Array.from({length:200},(_,h)=>({px:64+(h%20)*128+(Math.floor(h/20)%2)*64,py:66+Math.floor(h/20)*96}));
 const F={...field,hexes,hexW:128,hexH:132,colStep:128,rowStep:96,terrainIds:Array(200).fill('terrain.open'),props:fact.props,floor:fact.floor};
 const V={data:{F,POS:hexes,LAYOUT:{W:128,H:132},ASSETS:{}},S:{props:fact.props},dom:{stage},layers:{}};
 A.buildGround(V);A.syncProps(V);
 assert.equal(V.layers.ground.querySelectorAll('.cell').length,fact.floor.filter(Boolean).length);
 const polygons=V.layers.props.querySelectorAll('polygon');assert.equal(polygons.length,fact.props.length);
 const expected=fact.props[0].footprint.vertices.map(([x,y])=>`${64+x*128/2000},${66+y*96/3000}`).join(' ');
 assert.equal(polygons[0].getAttribute('points'),expected);assert.equal(polygons[0].dataset.prop,fact.props[0].id);
 const layer=V.layers.props;A.syncProps(V);assert.equal(V.layers.props,layer);
})

test('cover miss label is copied from the engine event, with legacy miss unchanged',()=>{
 const miss=battle.events.find(e=>e.type==='attack.miss');assert(miss);
 const w=environment();
 for(const cause of ['cover','dodge',undefined]){
  const state=createState();state.AIM={from:0,to:1,hit:42};const e={...miss};if(cause)e.missCause=cause;else delete e.missCause;
  fold(state,e,{});assert.deepEqual(state.AIM.missed,{roll:e.roll,...(cause?{cause}:{})});
  const V={S:state,dom:{stage:w.document.createElement('div')},data:{POS:[{px:0,py:0},{px:128,py:96}],F:{w:300,h:200}},layers:{},view:{bare:false}};
  A.drawAim(V);assert.match(V.layers.dyn.textContent,new RegExp((cause==='cover'?'COVER':cause==='dodge'?'DODGE':'MISS')+' rolled '+e.roll));
 }
})
