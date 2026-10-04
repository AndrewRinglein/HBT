// viewer.camera-shows-edge-units — what the browser shows past the board's edge. Not a gate test: it opens a built sandbox (the
// Orphanage, its painted 3D scene) in real Chrome (playwright-core, as tools/tutorial-overlays.shot.mjs does), scrolls the view
// to each of the four sides of its bound — the farthest the camera may now go past the board's edge — and saves the screen
// at each, for Andrew's eye: does the painted scene end in a hard cut, or show its underside, at that overshoot?
// It reads, at each edge, where the rim's hexes are on the screen (the browser's own layout) and how far past the board's own
// box the view stands.
//
//   node tools/camera-shows-edge-units.shot.mjs <page.html> <out-dir>     writes camera-edge-left.png, -right, -top, -bottom
import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
import {createServer} from 'node:net'
import {spawn} from 'node:child_process'
import {mkdirSync} from 'node:fs'
import {resolve,dirname,relative} from 'node:path'
import {fileURLToPath} from 'node:url'
const here=dirname(fileURLToPath(import.meta.url)),ROOT=resolve(here,'../..')
const PAGE=resolve(process.argv[2]??'BATTLE-SANDBOX.html'),OUT=resolve(process.argv[3]??'scratch')
const {chromium}=createRequire(resolve(ROOT,'engine/package.json'))('playwright-core')
const freePort=()=>new Promise((ok,no)=>{const s=createServer();s.on('error',no);s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>ok(p))})})
const port=await freePort(),child=spawn(process.execPath,[resolve(ROOT,'tools/battle-atlas/serve.mjs'),String(port)],{cwd:ROOT,stdio:['ignore','pipe','pipe']})
await new Promise((ok,no)=>{let out='';const t=setTimeout(()=>no(Error('the battle server did not start: '+out)),30000)
 child.stdout.on('data',d=>{out+=d;if(/Battle Atlas/.test(out)){clearTimeout(t);ok()}});child.stderr.on('data',d=>{out+=d})})
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']})
const errors=[]
/* an overall deadline: a headless Chrome that hangs must not hold the run, or leave its server behind */
const deadline=setTimeout(()=>{console.error('camera-shows-edge-units.shot: gave up after 8 minutes');child.kill();browser.close().finally(()=>process.exit(1))},480000)
try{
 const page=await browser.newPage({viewport:{width:1920,height:1080}})
 page.on('pageerror',e=>errors.push(String(e)))
 await page.goto(`http://127.0.0.1:${port}/${relative(ROOT,PAGE).replace(/\\/g,'/')}?play=encounter.opening.orphanage`)
 await page.waitForFunction(()=>window.__sandbox?.session&&window.__sandbox.viewer&&!window.__sandbox.busy&&window.__sandbox.viewer._V?.play,null,{timeout:150000})
 mkdirSync(OUT,{recursive:true})
 await page.waitForFunction(()=>{const V=window.__sandbox.viewer._V,wr=V.dom.stage.parentNode;return !wr.classList.contains('terrain3d-loading')&&getComputedStyle(V.dom.stage).visibility==='visible'},null,{timeout:180000}).catch(()=>console.log('  the 3D map was still loading at the screenshot'))
 for(const [name,dx,dy] of [['left',-1e5,0],['right',1e5,0],['top',0,-1e5],['bottom',0,1e5]]){
  const got=await page.evaluate(async([dx,dy])=>{
   const v=window.__sandbox.viewer,V=v._V
   v.centre(window.__sandbox.session.ctx.battleCursor.actor);await new Promise(r=>setTimeout(r,1300))
   v.pan(dx,dy);await new Promise(r=>setTimeout(r,1500))
   const B=V.cameraBound(),c=V.camTarget
   return {past:B.past,over:{x:c.x<B.own.x[0]?B.own.x[0]-c.x:c.x>B.own.x[1]?c.x-B.own.x[1]:0,y:c.y<B.own.y[0]?B.own.y[0]-c.y:c.y>B.own.y[1]?c.y-B.own.y[1]:0},
    onBound:Math.abs(c.x-(dx<0?B.bound.x[0]:dx>0?B.bound.x[1]:c.x))<.5&&Math.abs(c.y-(dy<0?B.bound.y[0]:dy>0?B.bound.y[1]:c.y))<.5}},[dx,dy])
  assert.ok(got.onBound,`scrolled ${name}: the view stands on its bound`)
  /* the 3D scene is drawn a frame behind the camera, and software GL under load takes seconds a frame: let it catch up */
  await page.waitForTimeout(6000)
  await page.screenshot({path:resolve(OUT,`camera-edge-${name}.png`),timeout:100000,animations:'disabled'})
  console.log(`  ${name}: the view stands ${Math.round(got.over.x)} px across and ${Math.round(got.over.y)} px down past the board's own box (board px) — saved camera-edge-${name}.png`)
 }
 assert.deepEqual(errors,[],'no page error')
 console.log('camera-shows-edge-units.shot: four edges saved in '+OUT)
}finally{clearTimeout(deadline);await browser.close();child.kill()}
