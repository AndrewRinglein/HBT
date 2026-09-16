import {test} from 'node:test'
import assert from 'node:assert/strict'
import {bootSlice,dom} from './atlas-dom.mjs'
import {readFileSync} from 'node:fs'
import {createRequire} from 'node:module'
import {battleViewAssets,scopeBattleCSS} from './battle-view-assets.mjs'
const require=createRequire(import.meta.url)
test('built Kingdom battle mounts the shared viewer and retains it through outcome edits',()=>{
 const {w,root,click}=bootSlice();click('slot-fixture');click('advance');click('advance');
 for(const el of root.els.filter(e=>e.dataset.act==='deploy').slice(0,2))el.handlers.click()
 click('advance');click('advance')
 const host=root.querySelector('.kingdom-battle');assert(host,'actual shared component is mounted')
 const first=w.__sliceDrive.battleViewer();assert(first);assert(first._V.data.atlas);assert.equal(first.state.outcome,null)
 const fate=root.querySelector('[data-fate]');fate.value='downed';fate.handlers.change();assert.equal(root.querySelector('.kingdom-battle'),host);assert.equal(w.__sliceDrive.battleViewer(),first)
 const outcome=root.querySelector('[data-out]');outcome.value='capped';outcome.handlers.change();assert.equal(w.__sliceDrive.battleViewer(),first)
 click('title');assert.equal(w.__sliceDrive.battleViewer(),null)
})


test('actual shared component records authored scene, t=0 units, stable host, replacement and disposal',async()=>{
 const source=require('../../engine/node_modules/esbuild').buildSync({entryPoints:['src/ui/battle-surface.ts'],nodePaths:['../viewer/node_modules'],bundle:true,write:false,platform:'browser',format:'iife',globalName:'SURFACE'}).outputFiles[0].text
 const {w}=dom(),names=['window','document','requestAnimationFrame','cancelAnimationFrame','setTimeout','clearTimeout','setInterval','clearInterval','getComputedStyle','performance']
 const module=new Function(...names,source+';return SURFACE')(...names.map(n=>n==='window'?w:w[n]))
 const battle=JSON.parse(readFileSync('../assets/battle-atlas/generated-combat/showcase.atlas-priory.json','utf8'))
 const end=battle.events.findIndex(e=>e.type==='activation.begin'),events=battle.events.slice(0,end),fact=events.find(e=>e.type==='map.loaded')
 const view={engagementId:'component.test',mapName:'Priory',initialEvents:events,viewerSeed:battle.seed,atlasScene:battle.atlasScene,width:fact.width,height:fact.height,terrain:fact.terrain}
 let mounts=0,disposals=0;const plans=[]
 const surface=module.createBattleSurface(battleViewAssets(),{terrainDriver:(V)=>{mounts++;plans.push(V.data.atlas);return{ready:Promise.resolve(),dispose(){disposals++}}}})
 const slot=w.document.createElement('div');Object.defineProperty(slot,'clientWidth',{value:960});w.document.body.appendChild(slot)
 const viewer=surface.mount(slot,view);await Promise.resolve();await Promise.resolve()
 assert.equal(mounts,1);assert.equal(disposals,0);assert.ok(plans[0]);assert.equal(surface.host.style.width,'1920px');assert.equal(surface.host.style.transform,'scale(0.5)');assert.equal(surface.host.parentNode.style.height,'540px')
 assert.deepEqual(viewer.events,events);assert.equal(viewer.state.outcome,null);assert.equal(Object.keys(viewer.state.U).length,7);assert.deepEqual(viewer._V.data.F.floor,fact.floor)
 assert.ok(viewer._V.data.displayHeights[97]>50);assert.equal(surface.host.querySelectorAll('[data-prop]').length,fact.props.length)
 const host=surface.host,next=w.document.createElement('div');w.document.body.appendChild(next)
 assert.equal(surface.mount(next,structuredClone(view)),viewer);assert.equal(surface.host,host);assert.equal(host.parentNode.parentNode,next);assert.equal(mounts,1);assert.equal(disposals,0)
 const replacement=surface.mount(next,{...view,engagementId:'component.replacement'});assert.notEqual(replacement,viewer);assert.equal(mounts,2);assert.equal(disposals,1)
 surface.dispose();assert.equal(disposals,2);assert.equal(surface.viewer,null);assert.equal(surface.host,null);surface.dispose();assert.equal(disposals,2)
})

test('shared CSS isolates both directions while retaining top-level animations and licensed build',()=>{
 const postcss=require('../../engine/node_modules/postcss'),source=readFileSync('../viewer/src/styles.css','utf8'),scoped=scopeBattleCSS(source),tree=postcss.parse(scoped)
 const names=root=>{const out=[];root.walkAtRules(/keyframes$/,r=>{assert.equal(r.parent.type,'root');out.push(r.params)});return out}
 assert.deepEqual(names(tree),names(postcss.parse(source)));assert.ok(names(tree).length>0)
 let ordinary=0,frames=0
 tree.walkRules(rule=>{for(let p=rule.parent;p;p=p.parent)if(p.type==='atrule'&&/keyframes$/.test(p.name)){frames++;return}ordinary++;for(const selector of rule.selectors)assert.ok(selector.startsWith('.kingdom-battle'),selector)})
 assert.ok(ordinary>200);assert.ok(frames>40);assert.equal(tree.first.type,'rule');assert.ok(tree.first.selectors.includes('.kingdom-battle button'));assert.equal(tree.first.first.prop,'all');assert.equal(tree.first.first.value,'revert')
 const html=readFileSync('SLICE.html','utf8');assert.ok(html.includes(readFileSync('../viewer/node_modules/three/LICENSE','utf8')));assert.doesNotMatch(html.slice(0,html.indexOf('</style>')),/url\(["']?art\//)
 const assets=battleViewAssets();for(const row of Object.values(assets.artmap))for(const key of ['token','card'])if(row[key])assert.ok(assets.assets[row[key]],row[key])
})
