import '../../engine/tools/engine-modules.mjs'   // first: links engine/node_modules into a worker's copy (Andrew, 2026-10-01)
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
 /* viewer.affliction-pop-up: a hero's after cards (by affliction badge) are the manifest's files too */
 for(const row of Object.values(manifest.artmap))for(const file of Object.values(row.after??{}))if(!names.has(file))throw Error('Missing art manifest reference '+file)
 for(const file of manifest.files){if(!/^[a-zA-Z0-9_.-]+$/.test(file))throw Error('Unsafe art manifest filename '+file)}
 for(const file of manifest.files){const mime=file.endsWith('.png')?'image/png':file.endsWith('.jpg')?'image/jpeg':null;if(mime)assets[file]=`data:${mime};base64,${readFileSync('../viewer/generated/art/'+file).toString('base64')}`}
  /* viewer.reads-engine: the engine's classification of every action and each status's behaviour; what each layer and ground applies;
     viewer.shield-guard-motion: each item's own class (a power a held shield grants raises the shield);
     viewer.panel-lists-items: each item's own row and the engine's count of hands (the battle panel's items section);
     viewer.hex-tooltip: each ground's name for the tooltip under the hex pointed at;
     viewer.new-enemy-ability-line: each enemy kind's player-facing sentence (the content's row, dumped with the sheets);
     viewer.bar-shows-tag-requirement: which actions carry each tag a trigger requires (the engine's carriesTag, dumped) - the
     bar lists a tag-required trigger (the Burning Touch: melee) on those attacks only, and refuses to guess without it */
 return {units:stat.units,statuses:stat.statuses,absorbingStatuses:stat.absorbingStatuses,actions:stat.actions,badges:stat.badges,layers:stat.layers,actionKinds:stat.actionKinds,statusRows:stat.statusRows,layerStatus:stat.layerStatus,terrainApplies:stat.terrainApplies,terrainNames:stat.terrainNames,unitLines:stat.unitLines,itemClasses:stat.itemClasses,items:stat.items,hands:stat.hands,tagCarriers:stat.tagCarriers,artmap:manifest.artmap,assets,glyphs:read('ra-glyphs.json')}
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
/* viewer.notices-gold-low-no-backdrop (engine DECISIONS.md 2026-10-05 'the playtest post answered: every notice gold and low …',
   Andrew: "I was imagining this as gold and bright text with no backdrop." · "I don't like the way it is for anything."; the
   item: "The gold notices on the screens between battles (the kingdom's) take the same look … one style in one place"): the
   notice's lettering is ONE rule of the viewer's stylesheet (between its NOTICE-LOOK marks). The battle screen wears it
   scoped, like the rest; here the same rule is lifted, unchanged, for the kingdom's own notices outside the battle screen —
   the gold line of a screen between battles (.lessonLine), a draft's message (.draftNotice) and the Skip tutorial question
   (#skipAsk). KINGDOM_NOTICES is the list of them; the look itself is written nowhere in this package. The builders add
   this rule AFTER the scoped stylesheet: scopeBattleCSS keeps every viewer selector under .kingdom-battle (tools/
   atlas-surface.verify.mjs holds that), so the rule here names the kingdom's own selectors and no viewer class. */
export const KINGDOM_NOTICES=['.lessonLine','.draftNotice','#skipAsk']
export function noticeLook(source){
 const m=source.match(/\/\* NOTICE-LOOK \*\/\s*([^{}]+)\{([^{}]*)\}\s*\/\* END NOTICE-LOOK \*\//)
 if(!m)throw Error('The viewer stylesheet no longer marks the notice\'s look (NOTICE-LOOK … END NOTICE-LOOK): the kingdom\'s notices have none to take')
 return `${KINGDOM_NOTICES.join(',')}{${m[2]}}\n`
}
