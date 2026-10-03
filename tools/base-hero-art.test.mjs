import '../../engine/tools/engine-modules.mjs'   // first: links engine/node_modules into a worker's copy (Andrew, 2026-10-01)
import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync,existsSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {createRequire} from 'node:module'
import {execFileSync} from 'node:child_process'
import {makeWindow} from './fakedom.mjs'
const require=createRequire(import.meta.url),spec=JSON.parse(readFileSync('tools/fixtures/base-hero-art.json')),statics=JSON.parse(readFileSync('generated/static.json')),manifest=JSON.parse(readFileSync('generated/art/manifest.json'))
const hash=p=>createHash('sha256').update(readFileSync(p)).digest('hex')
const bundled='C:/Users/aring/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe',python=process.env.PYTHON||(existsSync(bundled)?bundled:'python')
test('all24 authored base hero IDs have exact cutout/card/stature mappings and source provenance',()=>{
 const ids=Object.keys(statics.units).filter(id=>id.startsWith('hero.base.')).sort();assert.equal(ids.length,24);assert.deepEqual(spec.heroes.map(r=>r.id),ids)
 const generator=readFileSync('tools/prep-art.py','utf8')
 // Use the packer's Python rounding contract, including ties-to-even; dimensions come from published PNGs.
 const aspects=JSON.parse(execFileSync(python,['-c',"import json,sys,struct; print(json.dumps({p:round((lambda d:d[0]/d[1])(struct.unpack('>II',open('generated/art/'+p,'rb').read()[16:24])),4) for p in json.load(sys.stdin)}))"],{input:JSON.stringify(spec.heroes.map(r=>r.token)),encoding:'utf8'}))
 for(const r of spec.heroes){const actual=manifest.artmap[r.id];assert.ok(actual,r.id+' lacks art');assert.equal(actual.token,r.token,r.id);assert.equal(actual.card,r.card,r.id);assert.equal(actual.height,r.height,r.id);assert.equal(actual.aspect,aspects[actual.token],'published token aspect '+r.id);assert.ok(!actual.token.startsWith('ph-'))
  for(const f of [actual.token,actual.card]){assert.ok(manifest.files.includes(f));assert.ok(existsSync('generated/art/'+f))}
  const raw=generator.match(new RegExp("'"+r.id.replaceAll('.','\\.')+"':\\s*(\\{[^}]*\\})"));assert.ok(raw,r.id+' source assignment');const m=JSON.parse(raw[1].replaceAll("'",'"'));assert.equal(m.src,r.src);assert.equal(m.cardsrc,r.cardsrc)
 }
 // viewer.affliction-pop-up (2026-10-03): a hero's row also names its AFTER cards (`after`: affliction badge -> file) — art added beside
 // the stature/crop metadata this snapshot preserves, which must still be exactly the snapshot's; the after cards are
 // tools/affliction-pop-up.test.mjs's to check. Any other new key still fails here.
 for(const [id,row] of Object.entries(spec.preservedMappings)){const {after,...kept}=manifest.artmap[id];assert.deepEqual(kept,row,'existing stature/crop metadata '+id)}
 assert.deepEqual(manifest.artmap['hero.base.priest-scantily'],manifest.artmap['test-lucius']);assert.deepEqual(manifest.artmap['hero.base.paladin-shiney'],manifest.artmap['test-osric'])
})
test('all48 source images remain byte-identical to the pre-integration snapshot',()=>{
 let count=0;for(const r of spec.heroes)for(const [p,sha] of Object.entries(r.hashes)){assert.equal(hash('../'+p),sha,p);count++}assert.equal(count,48)
})
test('TEST art-only mounted display uses every exact token and panel card, including built asset bytes',()=>{
 const w=makeWindow(),names=['window','document','requestAnimationFrame','setTimeout','clearTimeout','setInterval','clearInterval','addEventListener','Date','performance','getComputedStyle','alert','localStorage','self','globalThis'],run=code=>new Function(...names,code)(...names.map(n=>['window','self','globalThis'].includes(n)?w:w[n]))
 let mount,art,units=statics.units
 if(process.env.VIEWER_PAGE){const html=readFileSync(process.env.VIEWER_PAGE,'utf8'),m=html.match(/<script>([\s\S]*)<\/script>\s*$/);w.document.body.innerHTML=html.slice(0,m.index).replace(/<style>[\s\S]*?<\/style>/,'').replace(/<!--[\s\S]*?-->/g,'');run(m[1]);const B=w.__battleView;B.harness.dispose();mount=B.mount;art=B.lib.art;units=B.lib.static.units}
 else {run(require('../../engine/node_modules/esbuild').buildSync({stdin:{contents:"import {mountBattleViewer} from './src/viewer.js';window.__mount=mountBattleViewer",resolveDir:process.cwd()},nodePaths:['node_modules'],bundle:true,write:false,platform:'browser',format:'iife'}).outputFiles[0].text);mount=w.__mount;art={artmap:manifest.artmap,assets:Object.fromEntries(manifest.files.map(f=>[f,'data:image/'+(f.endsWith('.png')?'png':'jpeg')+';base64,'+readFileSync('generated/art/'+f).toString('base64')]))}}
 const battle=JSON.parse(readFileSync('battles/'+JSON.parse(readFileSync('battles/library.json')).battles.find(r=>r.file.includes('duel')).file)),host=w.document.createElement('div');w.document.body.appendChild(host)
 const v=mount(host,{initialEvents:battle.events,fieldMapId:battle.seed.mapId,field:JSON.parse(readFileSync('generated/fields.json'))[battle.seed.mapId],units,statuses:statics.statuses,absorbingStatuses:statics.absorbingStatuses,actions:statics.actions,badges:statics.badges,layers:statics.layers,actionKinds:statics.actionKinds,statusRows:statics.statusRows,...art,meta:{seed:battle.seed}},{autoplay:false});v.push(battle.events)
 const body=structuredClone(Object.values(v.state.U)[0]);assert.ok(body)
 // Explicit ART ONLY display fixture: direct presentation state, no invented replay events or battle outcome.
 v._V.S.U=Object.fromEntries(spec.heroes.map((r,i)=>[100+i,{...structuredClone(body),id:100+i,typeId:r.id,name:units[r.id].name,hex:i}]))
 v.render()
 for(const [i,r] of spec.heroes.entries()){const E=v._V.layers.UEL.get(100+i);assert.equal(E.a.token,r.token,r.id);assert.equal(E.a.height,r.height);assert.equal(E.img.style.backgroundImage,`url("${art.assets[r.token]}")`);assert.equal(art.assets[r.token].split(',')[1],readFileSync('generated/art/'+r.token).toString('base64'));v.inspect(100+i);assert.ok(v._V.dom.panel.innerHTML.includes(art.assets[r.card]),r.id+' card');assert.equal(art.assets[r.card].split(',')[1],readFileSync('generated/art/'+r.card).toString('base64'))}
 v.dispose()
})

test('new-alias reuse rejects conflicting or unproven sources; existing mapping refresh stays normal',()=>{
 execFileSync(python,['-c',`import sys,copy
sys.path.insert(0,'tools')
from art_reuse import shared_files_for_new_mapping as reuse
m={'old':{'token':'same.png','card':'same','src':'source.png','cardsrc':'card.png'}}
m['new']=copy.deepcopy(m['old'])
p={'files':['same.png','same.jpg'],'artmap':{'old':{'token':'same.png','card':'same.jpg','aspect':999}}}
assert reuse('new',p,m)=={'same.png','same.jpg'} # stale metadata never travels from this helper
assert reuse('old',p,m)==set() # explicit refresh must still read/reencode current source
for key in ['src','cardsrc']:
 bad=copy.deepcopy(m);bad['new'][key]='different.png'
 try: reuse('new',p,bad)
 except ValueError: pass
 else: raise AssertionError('conflicting source accepted')
for bad in [{}, {'old':{}}]:
 bad['new']=m['new']
 try: reuse('new',p,bad)
 except ValueError: pass
 else: raise AssertionError('unproven owner accepted')
p['files'].remove('same.png')
try: reuse('new',p,m)
except ValueError: pass
else: raise AssertionError('missing manifest reference accepted')
`],{stdio:'pipe'})
})
