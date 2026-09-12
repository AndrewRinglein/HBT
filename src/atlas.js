import {prepareAtlasScene} from '../../assets/battle-atlas/scene.mjs'
export const bundledAtlas=typeof __BUNDLED_ATLAS__==='undefined'?null:__BUNDLED_ATLAS__
export function atlasSourceURL(path,location=globalThis.location){
 if(!location||!['http:','https:'].includes(location.protocol))throw Error('Open the served viewer for Atlas 3D: run viewer/start.ps1, then http://127.0.0.1:4230/viewer/BATTLE-VIEWER.html')
 if(typeof path!=='string'||path.includes('\\')||path.split('/').some(p=>p==='..')||/[?#]/.test(path))throw Error('Invalid Atlas resource path')
 return new URL('/'+path.replace(/^\//,''),location.href).href
}
export function atlasAssetURL(file,location){
 if(typeof file!=='string'||!/^[-a-zA-Z0-9_./]+\.glb$/.test(file)||file.startsWith('/')||file.split('/').some(p=>!p||p==='.'||p==='..'))throw Error('Invalid catalog asset file')
 return atlasSourceURL('assets/terrain-3d/'+file,location)
}
export function prepareAtlasBinding(binding,catalog=bundledAtlas,field){
 if(binding===undefined)return null
 if(!binding||typeof binding!=='object'||Array.isArray(binding)||Object.keys(binding).some(k=>!['mapId','areaIndex','layout'].includes(k)))throw Error('Invalid Atlas scene binding')
 if(!catalog?.library||typeof binding.mapId!=='string')throw Error('Atlas scene needs a catalog and mapId')
 if(Object.hasOwn(binding,'areaIndex')&&(!Number.isInteger(binding.areaIndex)||binding.areaIndex<0))throw Error('Invalid Atlas area index')
 const input=Object.hasOwn(binding,'layout')?binding.layout:catalog.maps?.[binding.mapId]
 if(!input||input.id!==binding.mapId)throw Error('Atlas layout/mapId mismatch or missing layout')
 const plan=prepareAtlasScene(input,catalog.library,{areaIndex:binding.areaIndex??0})
 const origin=plan.map.dungeonJourney?plan.map.segments[plan.areaIndex]:{col:0,row:0}
 if(origin.row%2!==0)throw Error('Atlas area origin must preserve even-row stagger parity')
 const width=plan.map.dungeonJourney?20:plan.map.grid.cols,height=plan.map.dungeonJourney?10:plan.map.grid.rows
 if(field&&(field.width!==width||field.height!==height))throw Error(`Atlas area is ${width}×${height}, but the engine board is ${field.width}×${field.height}`)
 return {plan,library:structuredClone(catalog.library),origin:{col:origin.col,row:origin.row},width,height}
}
export async function readAtlasCatalog(fetcher=globalThis.fetch,location=globalThis.location){
 const read=async path=>{const r=await fetcher(atlasSourceURL('assets/battle-atlas/'+path,location));if(!r.ok)throw Error('Atlas '+path+': '+r.status);return r.json()}
 const [index,library]=await Promise.all([read('index.json'),read('library.json')]);return {index,library,maps:{}}
}
export async function readAtlasLayout(id,fetcher=globalThis.fetch,location=globalThis.location){
 if(typeof id!=='string'||!/^[a-z0-9-]+$/.test(id))throw Error('Invalid Atlas map ID')
 const r=await fetcher(atlasSourceURL('assets/battle-atlas/maps/'+id+'.json',location));if(!r.ok)throw Error('Atlas map could not load: '+r.status);const map=await r.json();if(map.id!==id)throw Error('Atlas map ID mismatch');return map
}
