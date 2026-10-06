// viewer.foliage-drawn-once — the before-and-after pictures, for Andrew's eye (the chat's call 2026-10-05, engine DECISIONS.md
// 2026-10-05 '… the foliage is tried the smallest way': each two-sided blended foliage piece is drawn ONCE where it was drawn
// twice, "for him to judge by eye"). Not a gate test: it opens a built sandbox in real Chrome (playwright-core, as
// tools/camera-shows-edge-units.shot.mjs does; this machine's graphics card, as the viewer's tools/frame-cost.mjs — what the
// game is played on) and, on the Orphanage, the Lumberjack House and the Caravan Aftermath, saves the SAME view twice — the
// foliage drawn twice as before, then drawn once (the page's own switch, viewer src/terrain3d.js V.foliage.once) — at three
// views each: the opening view, a close view of a tree and the bushes about it, and the whole board.
//
// THE SAME VIEW, AND NOTHING ELSE MOVED: the page's clock is held for the two pictures of a pair (the bodies idle on it, and
// the Caravan's fires and fog burn on it), the pointer rests off the board, and the camera is not touched between them. What
// differs between the two pictures of a pair is the foliage's doing — and the blended pieces' own frame-to-frame shimmer
// (viewer SWITCHES blendedPiecesShimmer), which the tool counts by taking the "before" picture twice.
//
//   node tools/foliage-drawn-once.shot.mjs [page.html] [out-dir] [--software]
//     page.html   the built page that plays a battle (default BATTLE-SANDBOX.html)
//     out-dir     where the pictures go (default scratch/foliage-drawn-once); named so a pair sits side by side:
//                   <battle>-<n>-<view>-a-before-drawn-twice.png · <battle>-<n>-<view>-b-after-drawn-once.png
//     --software  draw with the software renderer (SwiftShader), as the other screenshot tools do
import {stillShot} from './still-shot.mjs'   // viewer.screenshot-time-out-under-load: the page's frame loop is held for the shot
import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
import {createServer} from 'node:net'
import {spawn} from 'node:child_process'
import {mkdirSync,readFileSync,rmSync} from 'node:fs'
import {resolve,dirname,relative} from 'node:path'
import {fileURLToPath} from 'node:url'
const here=dirname(fileURLToPath(import.meta.url)),ROOT=resolve(here,'../..')
const named=process.argv.slice(2).filter(a=>!a.startsWith('--')),SOFTWARE=process.argv.includes('--software')
const PAGE=resolve(named[0]??'BATTLE-SANDBOX.html'),OUT=resolve(named[1]??'scratch/foliage-drawn-once')
const BATTLES=[['orphanage','encounter.opening.orphanage','the Orphanage'],['lumberjack-house','encounter.opening.lumberjack','the Lumberjack House'],['caravan-aftermath','encounter.caravan-aftermath','the Caravan Aftermath']]
const VIEWS=['1-opening-view','2-close-on-a-tree-and-bushes','3-whole-board']
const WAYS=[['a-before-drawn-twice',false],['b-after-drawn-once',true]]
const {chromium}=createRequire(resolve(ROOT,'engine/package.json'))('playwright-core')
const freePort=()=>new Promise((ok,no)=>{const s=createServer();s.on('error',no);s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>ok(p))})})
const port=await freePort(),child=spawn(process.execPath,[resolve(ROOT,'tools/battle-atlas/serve.mjs'),String(port)],{cwd:ROOT,stdio:['ignore','pipe','pipe']})
await new Promise((ok,no)=>{let out='';const t=setTimeout(()=>no(Error('the battle server did not start: '+out)),30000)
 child.stdout.on('data',d=>{out+=d;if(/Battle Atlas/.test(out)){clearTimeout(t);ok()}});child.stderr.on('data',d=>{out+=d})})
const browser=await chromium.launch({channel:'chrome',headless:true,args:SOFTWARE?['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']:['--enable-gpu','--use-angle=d3d11','--ignore-gpu-blocklist']})
/* an overall deadline: a headless Chrome that hangs must not hold the run, or leave its server behind */
const LIMIT_MIN=SOFTWARE?45:15
const deadline=setTimeout(()=>{console.error(`foliage-drawn-once.shot: gave up after ${LIMIT_MIN} minutes`);child.kill();browser.close().finally(()=>process.exit(1))},LIMIT_MIN*60000)
const n=x=>x.toLocaleString('en-US')

/* ── in the page ── */
/** the view has arrived: no glide under way */
const arrived=()=>!window.__sandbox.viewer._V.camAnim&&!window.__sandbox.viewer._V.view.zooming
/** where the pointer scrolls nothing and points at nothing: off the board, and not at an edge of the screen (the viewer's frame-cost tool's own rest) */
const restOf=()=>{const r=window.__sandbox.viewer._V.dom.stage.parentNode.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top>80?r.top/2:r.bottom+(window.innerHeight-r.bottom)/2,midX:r.left+r.width/2,midY:r.top+r.height/2}}
/** a tree with bushes about it, as a place in the scene: of the trees that stand on the board (their leaves and needles,
    gathered by where they stand, CELL metres a side), the one with the most foliage within ABOUT metres of it — the middle
    of its crown, and how much is there */
function treeInScene(){
 const V=window.__sandbox.viewer._V,F=V.data.F,affine=V.data.boardAffine,CELL=5,ABOUT=7
 let scene=V.seeThrough.pieces()[0]?.o;while(scene?.parent)scene=scene.parent
 const cells=new Map(),all=[]
 scene.traverse(o=>{if(!o.isMesh||!o.visible)return;const m=[].concat(o.material)[0];if(!m?.userData?.foliage)return
  if(o.geometry.boundingSphere===null)o.geometry.computeBoundingSphere()
  const c=o.geometry.boundingSphere.center.clone().applyMatrix4(o.matrixWorld),leaf=/Leaves|Needles/i.test(m.name);all.push({x:c.x,z:c.z,leaf})
  if(!leaf)return
  /* on the board, clear of its rim: where it stands on the ground, in board px (the board's own map of the scene) */
  const b=c.clone().setY(0).applyMatrix4(affine);if(b.x<F.w*.15||b.x>F.w*.85||b.y<F.h*.15||b.y>F.h*.85)return
  const k=Math.floor(c.x/CELL)+','+Math.floor(c.z/CELL),cell=cells.get(k)||{x:0,y:0,z:0,n:0};cell.x+=c.x;cell.y+=c.y;cell.z+=c.z;cell.n++;cells.set(k,cell)})
 let best=null
 for(const c of cells.values()){const x=c.x/c.n,y=c.y/c.n,z=c.z/c.n;let bushes=0,leaves=0
  for(const p of all)if((p.x-x)**2+(p.z-z)**2<=ABOUT*ABOUT){if(p.leaf)leaves++;else bushes++}
  /* a tree AND bushes: both must be there; then the most of both */
  const score=Math.min(leaves,bushes)*4+leaves+bushes;if(bushes&&(!best||score>best.score))best={score,x,y,z,leaves,bushes}}
 return best
}
/** where a place in the scene is on the screen now */
function onScreen(p){
 const V=window.__sandbox.viewer._V,r=V.dom.stage.parentNode.getBoundingClientRect(),v=V.camera3d.position.clone().set(p.x,p.y,p.z).project(V.camera3d)
 return {x:r.left+(v.x+1)/2*r.width,y:r.top+(1-v.y)/2*r.height}
}
/** the page's clock held (the bodies idle on it; a scene's fires and fog burn on it) — or given back */
const holdClock=hold=>{if(hold){if(!window.__clockHeld){const real=performance.now,t=real.call(performance);window.__clockHeld=real;performance.now=()=>t}}else if(window.__clockHeld){performance.now=window.__clockHeld;delete window.__clockHeld}return true}
/** the foliage asked for one way, and that way drawn: the frame is asked for again (the view itself stays) and waited for */
const drawnAs=async once=>{const V=window.__sandbox.viewer._V;V.foliage.once=once;V.camVersion=(V.camVersion||0)+1
 for(let i=0;i<4;i++)await new Promise(done=>requestAnimationFrame(()=>done(null)))
 return {once:V.foliage.once,inSight:V.foliage.inSight()}}
/** two saved pictures compared, every pixel: how many differ, by how much at the most, how many by more than 16 of 255 */
const compared=async([a,b])=>{const load=async s=>{const i=new Image();i.src='data:image/png;base64,'+s;await i.decode();const c=document.createElement('canvas');c.width=i.width;c.height=i.height
  const x=c.getContext('2d',{willReadFrequently:true});x.drawImage(i,0,0);return x.getImageData(0,0,c.width,c.height).data}
 const A=await load(a),B=await load(b);let differing=0,worst=0,over16=0
 for(let i=0;i<A.length;i+=4){const d=Math.max(Math.abs(A[i]-B[i]),Math.abs(A[i+1]-B[i+1]),Math.abs(A[i+2]-B[i+2]));if(d){differing++;if(d>worst)worst=d;if(d>16)over16++}}
 return {pixels:A.length/4,differing,worst,over16}}

/* ── out of it ── */
let code=0
try{
 mkdirSync(OUT,{recursive:true})
 const bench=await browser.newPage()   // a blank page, to compare two saved pictures on
 const rows=[]
 for(const [short,id,name] of BATTLES){
  const page=await browser.newPage({viewport:{width:1920,height:1080}}),errors=[]
  page.on('pageerror',e=>errors.push(String(e)))
  try{
   await page.goto(`http://127.0.0.1:${port}/${relative(ROOT,PAGE).replace(/\\/g,'/')}?play=${id}`)
   await page.waitForFunction(()=>window.__sandbox?.session&&window.__sandbox.viewer&&!window.__sandbox.busy&&window.__sandbox.viewer._V?.play,null,{timeout:150000})
   await page.waitForFunction(()=>{const wr=window.__sandbox.viewer._V.dom.stage.parentNode;return wr.classList.contains('terrain3d-ready')||wr.classList.contains('terrain3d-failed')},null,{timeout:SOFTWARE?600000:240000})
   const foliage=await page.evaluate(()=>{const f=window.__sandbox.viewer._V.foliage;return f?{pieces:f.pieces,materials:f.materials,once:f.once}:null})
   assert.ok(foliage,`${name}: the page says how its foliage is drawn (a page built before viewer.foliage-drawn-once does not)`)
   const rest=await page.evaluate(restOf)
   const still=async()=>{await page.mouse.move(rest.x,rest.y);await page.waitForFunction(arrived,null,{timeout:60000});await page.waitForTimeout(SOFTWARE?8000:1500)}
   /** the two pictures of one view — and the "before" a second time, for what two frames drawn the same way differ by */
   const pair=async view=>{
    await page.evaluate(holdClock,true)
    const files={},said={}
    try{
     for(const [tag,once] of [...WAYS,['again',false]]){
      const now=await page.evaluate(drawnAs,once);assert.equal(now.once,once);said[tag]=now.inSight
      files[tag]=resolve(OUT,tag==='again'?`.${short}-${view}-again.png`:`${short}-${view}-${tag}.png`)
      await stillShot(page,page,{path:files[tag],timeout:SOFTWARE?300000:60000,animations:'disabled'})}
    }finally{await page.evaluate(drawnAs,foliage.once);await page.evaluate(holdClock,false)}
    const b64=f=>readFileSync(f,'base64')
    const both=await bench.evaluate(compared,[b64(files[WAYS[0][0]]),b64(files[WAYS[1][0]])]),same=await bench.evaluate(compared,[b64(files[WAYS[0][0]]),b64(files.again)])
    rmSync(files.again,{force:true})
    rows.push({battle:short,view,inSight:said[WAYS[1][0]],...both,sameWay:same.differing,sameWayWorst:same.worst,sameWayOver16:same.over16})
    console.log(`  ${name}, ${view.replace(/^\d-/,'').replace(/-/g,' ')}: ${n(said[WAYS[1][0]])} foliage pieces in sight; the two pictures differ in ${n(both.differing)} of ${n(both.pixels)} pixels, by ${both.worst} of 255 at the most, ${n(both.over16)} by more than 16 (the "before" taken twice: ${n(same.differing)}, by ${same.worst}, ${n(same.over16)} by more than 16)`)}
   /* 1 — the opening view: as the battle opens, its glide to the unit that begins arrived */
   await still();await pair(VIEWS[0])
   /* 2 — close on a tree and the bushes about it: the view moved until the tree's crown is at its middle (the page's own
      pan, a step at a time — how far a step moves the picture is read from the step before), then the wheel turned in
      about it as far as it goes (it zooms about the pointer) */
   const tree=await page.evaluate(treeInScene)
   assert.ok(tree,`${name}: a tree on the board with bushes about it`)
   const gain={x:1,y:1},kept=v=>Math.sign(v||1)*Math.min(6,Math.max(.1,Math.abs(v)))
   let at=await page.evaluate(onScreen,tree)
   for(let i=0;i<10;i++){
    const dx=at.x-rest.midX,dy=at.y-rest.midY;if(Math.abs(dx)<30&&Math.abs(dy)<30)break
    await page.evaluate(([x,y])=>{window.__sandbox.viewer.pan(x,y);return true},[dx*gain.x,dy*gain.y])
    await page.waitForFunction(arrived,null,{timeout:60000});await page.waitForTimeout(SOFTWARE?4000:400)
    const now=await page.evaluate(onScreen,tree)
    if(Math.abs(dx)>40&&Math.abs(at.x-now.x)>4)gain.x=kept(gain.x*dx/(at.x-now.x));if(Math.abs(dy)>40&&Math.abs(at.y-now.y)>4)gain.y=kept(gain.y*dy/(at.y-now.y))
    at=now}
   await page.mouse.move(at.x,at.y)
   for(let i=0;i<10;i++){await page.mouse.wheel(0,-120);await page.waitForTimeout(SOFTWARE?1500:160)}
   await still()
   const close=await page.evaluate(onScreen,tree)
   console.log(`  ${name}: the tree — ${tree.leaves} pieces of leaves or needles and ${tree.bushes} of grass, fern and the like within 7 m — stands ${Math.round(close.x-rest.midX)} px across and ${Math.round(close.y-rest.midY)} px down from the view's middle`)
   await pair(VIEWS[1])
   /* 3 — the whole board: the wheel turned out as far as it goes, about the view's middle */
   await page.mouse.move(rest.midX,rest.midY)
   for(let i=0;i<40;i++){await page.mouse.wheel(0,120);await page.waitForTimeout(SOFTWARE?1500:120)}
   await still();await pair(VIEWS[2])
   assert.deepEqual(errors,[],`${name}: no page error`)
  }finally{await page.close()}
 }
 console.log(`foliage-drawn-once.shot: ${rows.length} pairs saved in ${OUT} (${SOFTWARE?'the software renderer':'this machine\'s graphics card'}); a pair is <battle>-<n>-<view>-a-before-drawn-twice.png beside …-b-after-drawn-once.png`)
 console.log(JSON.stringify(rows))
}catch(error){console.error(String(error?.stack||error));code=1}
finally{clearTimeout(deadline);await browser.close();child.kill()}
process.exitCode=code
