import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {THREE,modules} from './atlas-test-runtime.mjs'
const A=await modules(),registry=JSON.parse(readFileSync('../assets/characters/hero-transformations/activation-registry.json','utf8'))
const profile=registry.characters['paladin-hunk'].bodyProfile
function fixture(){
 const scene=new THREE.Group(),hip=new THREE.Group(),head=new THREE.Group();hip.name='CC_Base_Hip';head.name='CC_Base_Head';scene.add(hip);hip.add(head)
 const face=new THREE.Mesh(new THREE.BoxGeometry(.3,.3,.3),new THREE.MeshStandardMaterial());face.position.y=1.6;face.material.name=profile.faceMaterialPrefix;head.add(face)
 const body=new THREE.Mesh(new THREE.BoxGeometry(.5,1.4,.3),new THREE.MeshStandardMaterial({color:0xaa7755}));body.position.y=.7;body.name='EVE_Lion_Body';hip.add(body)
 const armor=new THREE.Mesh(new THREE.BoxGeometry(.6,.6,.4),new THREE.MeshStandardMaterial({color:0x223399}));armor.name='Suit_Armor';armor.position.y=.9;hip.add(armor)
 const idle=new THREE.AnimationClip('idle',2,[new THREE.QuaternionKeyframeTrack('CC_Base_Head.quaternion',[0,2],[0,0,0,1,0,0,0,1])])
 const look={id:'test-lion',name:'Test Lion',identity:'paladin-hunk',model:profile.model,headProfile:profile,height:1.8,pivot:'CC_Base_Hip',motions:{idle:{}},props:[]}
 return {look,scene,clips:{idle},props:[]}
}
test('affliction changes one actor head and skin; restoring badges restores materials and pose',async()=>{
 const loaded=fixture(),paint=new THREE.Texture();
 const loadHead=async()=>({material:new THREE.MeshStandardMaterial({map:paint,emissive:0xffffff}),recess:null})
 const a=A.createBody(loaded,{registry,loadHead}),b=A.createBody(loaded,{registry,loadHead})
 const meshes=root=>{const out=[];root.traverse(o=>{if(o.isMesh)out.push(o)});return out}
 const original=meshes(b.stage).map(o=>o.material),own=meshes(a.stage)
 await a.setAfflictions({typeId:'hero.base.paladin-hunk',badges:['badge.vampirism']})
 assert.equal(a.appearance.state,'vampire');assert.equal(own[0].material.map,paint)
 assert.notEqual(own[0].material,original[0]);assert.equal(original[0].map,null)
 assert.equal(own[2].material,original[2],'outfit material is never recoloured')
 await a.setAfflictions({typeId:'hero.base.paladin-hunk',badges:['badge.possession']})
 a.play('idle');a.life='standing';a.frame(.1);const joint=a.stage.getObjectByName('CC_Base_Head'),pose=joint.quaternion.clone();a.frame(0)
 assert.ok(joint.quaternion.angleTo(pose)<1e-7,'paused additive pose does not accumulate')
 await a.setAfflictions({typeId:'hero.base.paladin-hunk',badges:[]});a.frame(0)
 assert.equal(a.appearance.state,'normal');assert.equal(own[0].material.map,null);assert.ok(joint.quaternion.angleTo(new THREE.Quaternion())<1e-7)
 a.dispose();b.dispose()
})

test('the cast follows fielded and newly gained badges and a seek restores the original',async()=>{
 const loaded=fixture(),typeId='hero.base.paladin-hunk',look=loaded.look
 const unit=id=>({id,typeId,life:'standing',badges:[]})
 const V={S:{U:{1:unit(1),2:unit(2)}},data:{models:{[typeId]:{typeId,looks:[look]}}},layers:{UEL:new Map([1,2].map(id=>[id,{root:{style:{left:String(id*10),top:'0'}}}]))}}
 V.S.U[1].badges=['badge.vampirism']
 const cast=A.createCast(V,new THREE.Scene(),new THREE.Matrix4(),{registry,load:async()=>loaded,readStyle:e=>e.style,loadHead:async()=>({material:new THREE.MeshStandardMaterial()})})
 const settle=()=>new Promise(r=>setImmediate(r))
 cast.frame(0);await settle();cast.frame(0);await settle()
 assert.equal(cast.body(1).appearance.state,'vampire');assert.equal(cast.body(2).appearance.state,'normal')
 V.S.U[2].badges.push('badge.possession');cast.frame(.1);await settle()
 assert.equal(cast.body(2).appearance.state,'possessed');assert.equal(cast.body(1).appearance.state,'vampire')
 V.S.U={1:unit(1),2:unit(2)};cast.snap()
 assert.equal(cast.body(1).appearance.state,'normal');assert.equal(cast.body(2).appearance.state,'normal')
 cast.dispose()
})

test('a mismatched placeholder body never receives another identity head atlas',async()=>{
 const loaded=fixture();loaded.look.model={...loaded.look.model,sha256:'mismatched'};let loads=0
 const body=A.createBody(loaded,{registry,loadHead:()=>{loads++;throw Error('must not load')}})
 await body.setAfflictions({typeId:'hero.base.paladin-hunk',badges:['badge.lycanthropy']})
 assert.equal(loads,0);assert.equal(body.appearance.requested,'werewolf');assert.equal(body.appearance.bodyFit,'pending');assert.equal(body.appearance.state,'normal');body.dispose()
})
