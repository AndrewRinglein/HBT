// Pack authored metadata, never a substituted model set or the whole GLB library.
import {readFileSync,existsSync} from 'node:fs'
import {resolve,relative,isAbsolute} from 'node:path'
import {createHash} from 'node:crypto'
import {fileURLToPath} from 'node:url'
import {validateMap} from '../../assets/battle-atlas/schema.mjs'
export function packTerrainAssets(){
 const base=fileURLToPath(new URL('../../assets/battle-atlas/',import.meta.url)),assets=resolve(base,'../terrain-3d')
 const read=file=>JSON.parse(readFileSync(resolve(base,file),'utf8'))
 const library=read('library.json'),index=read('index.json'),maps={}
 const ids=new Set();for(const a of library.assets){
  if(typeof a.id!=='string'||ids.has(a.id))throw Error('Invalid Atlas catalog identity');ids.add(a.id)
  if(typeof a.file!=='string'||/[\\?#]/.test(a.file))throw Error('Invalid Atlas asset path')
  const path=resolve(assets,a.file),rel=relative(assets,path)
  if(rel.startsWith('..')||isAbsolute(rel)||!existsSync(path))throw Error('Atlas asset missing/outside terrain-3d: '+a.file)
 }
 for(const row of index){if(typeof row.id!=='string'||!/^[a-z0-9-]+$/.test(row.id)||Object.hasOwn(maps,row.id))throw Error('Invalid Atlas listing')
  const map=read('maps/'+row.id+'.json');if(map.id!==row.id)throw Error('Atlas map identity mismatch')
  validateMap(structuredClone(map),map.grid,ids);maps[row.id]=map
 }
 const value={library,index,maps};return {...value,sha256:createHash('sha256').update(JSON.stringify(value)).digest('hex')}
}
