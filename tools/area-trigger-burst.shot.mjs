// viewer.area-trigger-burst - how the Fire Imp's end-of-Activation burst reads on the painted 3D battle, in a real browser. Not a
// gate test: it opens a built sandbox (the Bridge) in real Chrome (playwright-core, as tools/hit-slash.shot.mjs does), ends
// Turns until a Fire Imp has ended an Activation, brings the view to the imp, plays the board's own burst there again (the
// same marks, the same explosion at the same reach) and saves the screen with the explosion held at three moments of its time
// - for Andrew's eye: is it an explosion of fire over the hexes within 2 of the imp?
//   node tools/area-trigger-burst.shot.mjs <page.html> <out-dir>     writes area-burst-0_1.png, -0_3, -0_55
import {stillShot} from './still-shot.mjs'   // viewer.screenshot-time-out-under-load: the page's frame loop is held for the shot
import {createRequire} from 'node:module'
import {createServer} from 'node:net'
import {spawn} from 'node:child_process'
import {mkdirSync} from 'node:fs'
import {resolve,dirname,relative} from 'node:path'
import {fileURLToPath} from 'node:url'
const here=dirname(fileURLToPath(import.meta.url)),ROOT=resolve(here,'../..')
const PAGE=resolve(process.argv[2]??'BATTLE-SANDBOX.html'),OUT=resolve(process.argv[3]??'scratch/slash')
const {chromium}=createRequire(resolve(ROOT,'engine/package.json'))('playwright-core')
const freePort=()=>new Promise((ok,no)=>{const s=createServer();s.on('error',no);s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>ok(p))})})
const port=await freePort(),child=spawn(process.execPath,[resolve(ROOT,'tools/battle-atlas/serve.mjs'),String(port)],{cwd:ROOT,stdio:['ignore','pipe','pipe']})
await new Promise((ok,no)=>{let out='';const t=setTimeout(()=>no(Error('the battle server did not start: '+out)),30000)
 child.stdout.on('data',d=>{out+=d;if(/Battle Atlas/.test(out)){clearTimeout(t);ok()}});child.stderr.on('data',d=>{out+=d})})
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']})
const deadline=setTimeout(()=>{console.error('area-trigger-burst.shot: gave up after 9 minutes');child.kill();browser.close().finally(()=>process.exit(1))},540000)
try{
 const page=await browser.newPage({viewport:{width:1920,height:1080}})
 const errors=[];page.on('pageerror',e=>errors.push(String(e)))
 await page.goto(`http://127.0.0.1:${port}/${relative(ROOT,PAGE).replace(/\\/g,'/')}?play=encounter.opening.bridge`)
 await page.waitForFunction(()=>window.__sandbox?.session&&window.__sandbox.viewer&&!window.__sandbox.busy&&window.__sandbox.viewer._V?.play,null,{timeout:150000})
 await page.waitForFunction(()=>{const V=window.__sandbox.viewer._V,wr=V.dom.stage.parentNode;return !wr.classList.contains('terrain3d-loading')&&getComputedStyle(V.dom.stage).visibility==='visible'},null,{timeout:180000}).catch(()=>console.log('  the 3D map was still loading'))
 mkdirSync(OUT,{recursive:true})
 let rec=null
 for(let turn=0;turn<6&&!rec;turn++){
  await page.evaluate(()=>{const V=window.__sandbox.viewer._V,end=V.dom.root.querySelector('#playEndTurn');end.click();const yes=V.dom.root.querySelector('#playAskYes'),ask=V.dom.root.querySelector('#playAsk');if(yes&&ask&&ask.style.display!=='none')yes.click()})
  await page.waitForFunction(()=>!window.__sandbox.busy,null,{timeout:200000})
  rec=await page.evaluate(()=>{const V=window.__sandbox.viewer._V,r=V.areaBursts.findLast(r=>r.burst&&V.S.U[r.owner]?.life==='standing'&&V.S.U[r.owner].hex===r.centre);return r?{owner:r.owner,hexes:r.hexes,centre:r.centre,radius:r.radius}:null})
  console.log(`  Turn ${turn+1}: ${rec?'a Fire Imp ended its Activation on hex '+rec.centre:'no burst yet'}`)
 }
 if(!rec)throw Error('no Fire Imp Activation ended in six turns')
 // back to the trigger's own line, the view on the imp and settled; then that line is stepped by hand: the board marks the
 // hexes and adds its explosion at the imp as it stands on the screen now
 await page.evaluate(()=>{const v=window.__sandbox.viewer,V=v._V,r=V.areaBursts.findLast(r=>r.burst);window.__at=r.at;v.pause();v.seek(r.at);v.centre(r.owner)})
 await page.waitForTimeout(7000)
 const at=await page.evaluate(()=>{const v=window.__sandbox.viewer,V=v._V;window.__kept=[];const FX=V.fx.FX,add=FX.add;FX.add=function(dur,draw,sortY){window.__kept.push({dur,draw});return add.call(this,dur,draw,sortY)}
  v.step();const r=V.areaBursts.at(-1);return {at:r.at,hexes:r.hexes.length,kept:window.__kept.map(k=>k.dur)}})
 console.log('  stepped the trigger line again:',JSON.stringify(at))
 await page.waitForTimeout(4000)
 for(const t of [.1,.3,.55]){
  const n=await page.evaluate(t=>{const V=window.__sandbox.viewer._V,c=V.dom.canvas,r=c.getBoundingClientRect(),dpr=window.devicePixelRatio||1
   if(c.width!==Math.round(r.width*dpr)){c.width=r.width*dpr;c.height=r.height*dpr}
   const ctx=c.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);const P=[],K=window.__kept.find(k=>k.dur===700);if(!K)return -1
   for(let s=0;s<=t+1e-9;s+=.02){ctx.clearRect(0,0,r.width,r.height);ctx.save();K.draw(ctx,r.width,r.height,s,s*700,P,.014);ctx.restore()}
   const last=V.areaBursts.findLast(b=>b.burst);V.view.areaBurst={hexes:last.hexes,centre:last.centre,kind:'fire',colour:'rgba(255,122,40,.42)'};window.__sandbox.viewer.render()
   const d=ctx.getImageData(0,0,c.width,c.height).data;let n=0;for(let i=3;i<d.length;i+=16)if(d[i]>8)n++;return n},t)
  console.log(`  held at ${t}: ${n} pixels`)
  await page.waitForTimeout(1500)
  await stillShot(page,page,{path:resolve(OUT,`area-burst-${String(t).replace('.','_')}.png`),timeout:90000,clip:{x:0,y:60,width:1448,height:740}})
 }
 console.log('  page errors:',JSON.stringify(errors))
}finally{clearTimeout(deadline);await browser.close();child.kill()}
