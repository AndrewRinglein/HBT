import {readFileSync} from 'node:fs'
import {execFileSync} from 'node:child_process'
import {createRequire} from 'node:module'
import {codeStamp} from '../../engine/tools/code-stamp.mjs'
const require=createRequire(import.meta.url),postcss=require('../../engine/node_modules/postcss')
export function battleViewAssets(){
 const read=file=>JSON.parse(readFileSync('../viewer/generated/'+file,'utf8')),stat=read('static.json'),manifest=read('art/manifest.json'),assets={}
 /* the engine's code stamp, not its HEAD (Andrew, 2026-10-01): a ruling commit is not staleness */
 const engineCommit=codeStamp().stamp
 if(stat.engineDirty||stat.engineCommit!==engineCommit)throw Error('Shared viewer metadata is stale or dirty; regenerate through its owning tools')
 const names=new Set(manifest.files)
 for(const row of Object.values(manifest.artmap))for(const key of ['token','card'])if(row[key]&&!names.has(row[key]))throw Error('Missing art manifest reference '+row[key])
 for(const file of manifest.files){if(!/^[a-zA-Z0-9_.-]+$/.test(file))throw Error('Unsafe art manifest filename '+file)}
 for(const file of manifest.files){const mime=file.endsWith('.png')?'image/png':file.endsWith('.jpg')?'image/jpeg':null;if(mime)assets[file]=`data:${mime};base64,${readFileSync('../viewer/generated/art/'+file).toString('base64')}`}
 return {units:stat.units,statuses:stat.statuses,absorbingStatuses:stat.absorbingStatuses,actions:stat.actions,badges:stat.badges,layers:stat.layers,artmap:manifest.artmap,assets,glyphs:read('ra-glyphs.json')}
}
export function scopeBattleCSS(source){
 const root=postcss.parse(source)
 root.walkRules(rule=>{
  for(let parent=rule.parent;parent;parent=parent.parent)if(parent.type==='atrule'&&/keyframes$/i.test(parent.name))return
  rule.selectors=rule.selectors.map(selector=>[':root','html','body'].includes(selector)?'.kingdom-battle':'.kingdom-battle '+selector)
 })
 // Shield the embedded component from Kingdom's generic controls/type styles.
 const reset='.kingdom-battle button,.kingdom-battle input,.kingdom-battle select,.kingdom-battle table,.kingdom-battle th,.kingdom-battle td,.kingdom-battle h1,.kingdom-battle h2,.kingdom-battle h3,.kingdom-battle code{all:revert}\n'
 return reset+root.toString()+'\n.kingdom-battle-fit{width:100%;position:relative;overflow:hidden;margin:16px 0}\n'
}
