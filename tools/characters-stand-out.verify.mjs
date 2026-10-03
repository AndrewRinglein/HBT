// viewer.characters-stand-out (engine DECISIONS.md 2026-10-03 'the characters must stand out from the board'). Andrew: "the
// characters don't stand out enough against the backdrop. They look a little too small on the screen. … And what else can we
// do to make the characters stand out more?" · "Actually, let's change this to 30% bigger characters, 10% smaller hexes."
// The item's expect, the kingdom's half: "BATTLE-SANDBOX.html?play=encounter.opening.orphanage with no option looks exactly as
// today … each of shadows, ground, rim and disc is visibly on with its option and off without; one kingdom review page links
// the Orphanage with each option alone and all together." Two things are checked:
//   1. the review page (CHARACTERS-STAND-OUT.html, built by tools/build-stand-out.mjs): one link for the battle as it is today,
//      one per look alone, one for all together — the looks and their words the viewer's own (viewer src/stand-out.js LOOKS),
//      each link the Orphanage on the battle screen;
//   2. the BUILT battle page in real Chrome (playwright-core, as tools/affliction-pop-up.verify.mjs does) at 1920 x 1080 over a
//      local server: opened by the review page's own links — with no look the viewer holds none and the board wears no look's
//      class; with all five it holds all five, the bodies stand 1.3 / 0.9 as tall on a board shown at 0.9×, cast shadows and
//      wear their side's rim, the scene is toned, the disc shows, and the 3D map draws with no shader error; a name that is no
//      look is refused, and the page says so. A screenshot of each is saved for the eye. Which look is better is Andrew's.
//
//   node tools/characters-stand-out.verify.mjs [review.html] [sandbox.html] [screenshot-dir]
//   prints one line per check and `characters-stand-out: … passed`
import '../../engine/tools/engine-modules.mjs'   // first: links engine/node_modules into a worker's copy (Andrew, 2026-10-01)
import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
import {createServer} from 'node:net'
import {spawn} from 'node:child_process'
import {resolve,dirname,relative} from 'node:path'
import {fileURLToPath} from 'node:url'
import {mkdirSync,readFileSync,existsSync} from 'node:fs'
import {LOOKS,STAND_OUT} from '../../viewer/src/stand-out.js'

const here=dirname(fileURLToPath(import.meta.url)),ROOT=resolve(here,'../..')
const REVIEW=resolve(process.argv[2]??'CHARACTERS-STAND-OUT.html'),PAGE=resolve(process.argv[3]??'BATTLE-SANDBOX.html'),SHOTS=resolve(process.argv[4]??resolve(here,'../scratch'))
const require=createRequire(resolve(ROOT,'engine/package.json')),{chromium}=require('playwright-core'),esbuild=require('esbuild')
const T0=Date.now(),say=(...a)=>console.log('  '+a.join(' ')+`  [${((Date.now()-T0)/1000).toFixed(0)} s]`)
const BATTLE='encounter.opening.orphanage',NAMES=Object.keys(LOOKS)

// 1. the review page
const built=esbuild.buildSync({stdin:{contents:`export {SANDBOX_ENCOUNTERS} from './src/content/sandbox.ts'`,resolveDir:resolve(here,'..'),loader:'ts'},bundle:true,platform:'node',format:'esm',write:false,logLevel:'silent'})
const {SANDBOX_ENCOUNTERS}=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'))
const battle=SANDBOX_ENCOUNTERS.find(e=>e.id===BATTLE);assert.ok(battle,'the sandbox plays the Orphanage')
const html=readFileSync(REVIEW,'utf8'),unesc=s=>s.replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&lt;/g,'<').replace(/&gt;/g,'>')
const cards=[...html.matchAll(/<a class="card" href="([^"]+)" data-look="([^"]*)"><b>([^<]+)<\/b>/g)].map(m=>({href:unesc(m[1]),look:m[2],title:unesc(m[3])}))
assert.deepEqual(cards.map(c=>c.look),['',...NAMES,NAMES.join(',')],'as it is today, each look alone, all of them together')
for(const c of cards)assert.equal(c.href,`BATTLE-SANDBOX.html?play=${BATTLE}${c.look?'&look='+c.look:''}`,'each link is the Orphanage on the battle screen')
assert.deepEqual(cards.slice(1,-1).map(c=>c.title),NAMES.map(n=>LOOKS[n]),'each look in the viewer\'s own words')
assert.ok(html.includes(battle.name),'it names the battle');assert.ok(existsSync(resolve(dirname(REVIEW),'BATTLE-SANDBOX.html'))||existsSync(PAGE),'the battle screen is there to open')
say(`the review page: ${cards.length} links to the ${battle.name} — ${cards.map(c=>c.look||'as today').join(' · ')}`)

// 2. the built battle page, in real Chrome
const freePort=()=>new Promise((ok,no)=>{const s=createServer();s.on('error',no);s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>ok(p))})})
async function serve(){
 const port=await freePort(),child=spawn(process.execPath,[resolve(ROOT,'tools/battle-atlas/serve.mjs'),String(port)],{cwd:ROOT,stdio:['ignore','pipe','pipe']})
 await new Promise((ok,no)=>{let out='';const t=setTimeout(()=>no(Error('the battle server did not start: '+out)),30000)
  child.stdout.on('data',d=>{out+=d;if(/Battle Atlas/.test(out)){clearTimeout(t);ok()}});child.stderr.on('data',d=>{out+=d});child.on('exit',c=>{clearTimeout(t);no(Error('the battle server exited '+c+': '+out))})})
 return {port,stop:()=>child.kill()}
}
const server=await serve()
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']})
const base=`http://127.0.0.1:${server.port}/${relative(ROOT,PAGE).replace(/\\/g,'/')}`
mkdirSync(SHOTS,{recursive:true})
try{
 /** open the battle by a review link's own query; what the viewer holds once every body stands */
 async function open(look,shot){
  const page=await browser.newPage({viewport:{width:1920,height:1080}}),errors=[]
  page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error'&&/THREE|shader|WebGL/i.test(m.text()))errors.push(m.text())})
  await page.goto(`${base}?play=${BATTLE}${look?'&look='+look:''}`)
  await page.waitForFunction(()=>window.__sandbox?.session&&window.__sandbox.viewer,null,{timeout:120000})
  await page.waitForFunction(()=>{const V=window.__sandbox.viewer._V;return !document.querySelector('#terrainLoading')&&V.cast&&V.cast.size>0&&Object.values(V.S.U).every(u=>u.life==='dead'||!V.cast.pending(u.id))},null,{timeout:150000})
  await page.waitForTimeout(1500)                                                      /* the glide settles; a few frames drawn */
  const got=await page.evaluate(()=>{const V=window.__sandbox.viewer._V,units=Object.values(V.S.U).filter(u=>u.life==='standing'&&V.cast.body(u.id))
   let scene=V.cast.body(units[0].id).stage;while(scene.parent)scene=scene.parent
   let toned=0,materials=0;const seen=new Set();scene.traverse(o=>{if(o.isMesh&&/^painted:/.test((function up(n){return n?n.name&&/^painted:/.test(n.name)?n.name:up(n.parent):''})(o)))for(const m of [].concat(o.material)){if(seen.has(m))continue;seen.add(m);materials++;if(m.userData.tone)toned++}})
   return {on:{...V.look.on},classes:V.dom.stage.className.split(/\s+/).filter(c=>/^look/.test(c)).sort(),zoom:V.camera3d.userData.pose.zoom,fault:window.__sandbox.fault,
    failed:!!document.querySelector('.terrain3d-failed'),status:document.querySelector('#terrainStatus')?.textContent??'',toned,materials,
    bodies:units.map(u=>{const B=V.cast.body(u.id),rim=B.stage.getObjectByName('rim');let pieces=0,casting=0;B.stage.traverse(o=>{if(o.isMesh&&o.parent!==rim){pieces++;if(o.castShadow)casting++}})
     const m=rim&&[].concat(rim.children[0].material).find(x=>x.visible!==false)
     return {name:u.name,side:u.side,height:B.standingHeight(),stature:B.look.height,pieces,casting,rim:rim?rim.children.length:0,rimColour:m?'#'+m.uniforms.color.value.getHexString():null,
      disc:getComputedStyle(V.layers.UEL.get(u.id).disc).visibility,discColour:getComputedStyle(V.layers.UEL.get(u.id).disc).backgroundColor}})}})
  assert.deepEqual(errors,[],`look "${look}": no page error, no shader error`);assert.equal(got.fault,'',`look "${look}": the battle runs`);assert.equal(got.failed,false,`look "${look}": the 3D map draws (${got.status})`)
  await page.evaluate(()=>window.__sandbox.viewer._V.dom.root.scrollIntoView())
  await page.screenshot({path:resolve(SHOTS,shot),timeout:100000,animations:'disabled'});await page.close()
  return got
 }
 const plain=await open('','characters-stand-out-today.png')
 assert.deepEqual(plain.on,Object.fromEntries(NAMES.map(n=>[n,false])),'no look named: none held');assert.deepEqual(plain.classes,[],'the board wears no look\'s class')
 assert.ok(plain.bodies.length>=4&&plain.bodies.some(b=>b.side==='hero')&&plain.bodies.some(b=>b.side==='enemy'),'heroes and enemies stand as bodies')
 for(const b of plain.bodies){assert.ok(Math.abs(b.height/b.stature-1)<.02,`${b.name}: its roster stature`);assert.equal(b.casting,0,`${b.name} casts nothing`);assert.equal(b.rim,0,`${b.name} has no rim`);assert.equal(b.disc,'hidden',`${b.name}: no disc shown`)}
 assert.equal(plain.toned,0,'the scene as painted');assert.ok(plain.materials>0)
 say(`no look: ${plain.bodies.length} bodies at their roster stature, no shadow cast, no rim, no disc, the scene untoned (${plain.materials} materials)`)
 const all=await open(NAMES.join(','),'characters-stand-out-all.png')
 assert.deepEqual(all.on,Object.fromEntries(NAMES.map(n=>[n,true])),'all five held');assert.deepEqual(all.classes,['lookDisc','lookShadows'])
 assert.ok(Math.abs(all.zoom/plain.zoom-STAND_OUT.BOARD)<1e-3,`the board at 0.9× (${(all.zoom/plain.zoom).toFixed(4)})`)
 assert.deepEqual(all.bodies.map(b=>b.name),plain.bodies.map(b=>b.name))
 const tints={};for(const b of all.bodies)tints[b.side]=b.rimColour
 all.bodies.forEach((b,i)=>{assert.ok(Math.abs(b.height/plain.bodies[i].height-STAND_OUT.BODY/STAND_OUT.BOARD)<1e-6,`${b.name}: 1.3 / 0.9 as tall`);assert.equal(b.casting,b.pieces,`${b.name}: every piece casts`)
  assert.ok(b.rim>0&&b.rimColour===tints[b.side],`${b.name}: its side's rim`);assert.equal(b.disc,'visible',`${b.name}: its disc shown`);assert.ok(/^rgba?\(/.test(b.discColour)&&b.discColour!=='rgba(0, 0, 0, 0)')})
 assert.ok(tints.hero&&tints.enemy&&tints.hero!==tints.enemy,'the heroes\' rim and the enemies\' are their own colours')
 assert.equal(all.toned,all.materials,'every material of the painted scene is toned');assert.equal(all.materials,plain.materials)
 say(`all five: the board at ${(all.zoom/plain.zoom).toFixed(3)}×, ${all.bodies.length} bodies ${(all.bodies[0].height/plain.bodies[0].height).toFixed(3)}× as tall, casting, rimmed (${tints.hero} heroes, ${tints.enemy} enemies), discs shown, ${all.toned} scene materials toned; the 3D map drew with no shader error`)
 // a name that is no look: refused, and said
 const page=await browser.newPage({viewport:{width:1920,height:1080}})
 await page.goto(`${base}?play=${BATTLE}&look=bigger`)
 await page.waitForFunction(()=>/is not one of size, shadows, ground, rim, disc/.test(document.body.textContent),null,{timeout:120000})
 assert.equal(await page.evaluate(()=>!!(window.__sandbox&&window.__sandbox.viewer)),false,'no battle is mounted');await page.close()
 say('a name that is no look is refused, and the page says which names there are')
}finally{await browser.close();server.stop()}
console.log(`characters-stand-out: the review page links the ${battle.name} as today, with each of ${NAMES.join(', ')} alone and with all together; the built battle page holds none unnamed and all five named; a wrong name is refused — passed`)
