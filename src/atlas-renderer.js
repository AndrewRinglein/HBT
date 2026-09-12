import * as THREE from 'three'
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js'
import {buildAtlasScene,loadAtlasTextures} from '../../assets/battle-atlas/scene.mjs'
import {atlasAssetURL,atlasSourceURL} from './atlas.js'

function releaseModel(root){
 const geometries=new Set(),materials=new Set(),textures=new Set()
 root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);for(const m of [].concat(o.material||[])){materials.add(m);for(const t of Object.values(m))if(t?.isTexture)textures.add(t)}})
 geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>{t.source?.data?.close?.();t.dispose()})
}
export async function loadAtlasAssembly(binding,platform={}){
 const models=new Map(),owned=new Set();let disposed=false,textures,built
 const cancelled=()=>disposed||platform.cancelled?.()===true
 const dispose=()=>{if(disposed)return;disposed=true;built?.dispose();owned.forEach(releaseModel);owned.clear();if(textures)for(const t of [textures.stone,...textures.textures])t.dispose()}
 const loadModel=file=>{
  if(!models.has(file))models.set(file,Promise.resolve().then(()=>platform.loadModel?platform.loadModel(file):new GLTFLoader().loadAsync(atlasAssetURL(file,platform.location)).then(g=>g.scene)).then(model=>{if(cancelled()){releaseModel(model);throw Error('Atlas scene load cancelled')}owned.add(model);return model}))
  return models.get(file)
 }
 try{
  textures=await loadAtlasTextures(path=>platform.loadTexture?platform.loadTexture(path):new THREE.TextureLoader().loadAsync(atlasSourceURL(path.startsWith('/')?path:'assets/battle-atlas/'+path,platform.location)))
  if(cancelled())throw Error('Atlas scene load cancelled')
  built=await buildAtlasScene(binding.plan.map,binding.library,{areaIndex:binding.plan.areaIndex},{textures,loadModel,createCanvas:platform.createCanvas,cancelled,onProgress:platform.onProgress})
  return {...built,dispose}
 }catch(error){dispose();throw error}
}
// Same light colors, metric positions, floor and tone mapping as the Atlas app.
export function atlasEnvironment(scene,plan){
 const l=plan.lighting,hemi=new THREE.HemisphereLight(0xe5efff,0x455139,l.ambient),sun=new THREE.DirectionalLight(l.sunColor,l.sun),fill=new THREE.DirectionalLight(0xb9d3e0,l.fill)
 sun.position.set(-60,100,50);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048)
 const span=Math.max(plan.map.grid.cols*2.6,plan.map.grid.rows*2.25)*.6;Object.assign(sun.shadow.camera,{left:-span,right:span,top:span,bottom:-span,near:1,far:350});sun.shadow.camera.updateProjectionMatrix();sun.shadow.normalBias=.025
 fill.position.set(15,12,-20)
 const floor=new THREE.Mesh(new THREE.PlaneGeometry(400,400),new THREE.MeshStandardMaterial({color:l.floorColor,roughness:1}));floor.rotation.x=-Math.PI/2;floor.position.y=l.floorY;floor.receiveShadow=true
 scene.add(hemi,sun,fill,floor);scene.background=new THREE.Color(l.background)
 return ()=>{scene.remove(hemi,sun,fill,floor);floor.geometry.dispose();floor.material.dispose();sun.shadow.map?.dispose()}
}
