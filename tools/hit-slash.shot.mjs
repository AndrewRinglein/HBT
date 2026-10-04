// viewer.hit-slash - how the slash reads on its target on the painted 3D battle, in a real browser. Not a gate test: it opens a
// built sandbox (the Orphanage) in real Chrome (playwright-core, as tools/camera-shows-edge-units.shot.mjs does), ends Turns until
// a Zombie has hit a hero, brings the view to the hero, plays the board's own slash on it again (the same effect, the same
// anchors the board uses) and saves the screen round the hero with the slash held at three moments of its time - for
// Andrew's eye: is it a red slash across the target?
//   node tools/hit-slash.shot.mjs <page.html> <out-dir>     writes slash-on-target-0_15.png, -0_35, -0_6
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
const deadline=setTimeout(()=>{console.error('hit-slash.shot: gave up after 9 minutes');child.kill();browser.close().finally(()=>process.exit(1))},540000)
try{
 const page=await browser.newPage({viewport:{width:1920,height:1080}})
 const errors=[];page.on('pageerror',e=>errors.push(String(e)))
 await page.goto(`http://127.0.0.1:${port}/${relative(ROOT,PAGE).replace(/\\/g,'/')}?play=encounter.opening.orphanage`)
 await page.waitForFunction(()=>window.__sandbox?.session&&window.__sandbox.viewer&&!window.__sandbox.busy&&window.__sandbox.viewer._V?.play,null,{timeout:150000})
 await page.waitForFunction(()=>{const V=window.__sandbox.viewer._V,wr=V.dom.stage.parentNode;return !wr.classList.contains('terrain3d-loading')&&getComputedStyle(V.dom.stage).visibility==='visible'},null,{timeout:180000}).catch(()=>console.log('  the 3D map was still loading'))
 mkdirSync(OUT,{recursive:true})
 let hit=null
 for(let turn=0;turn<5&&!hit;turn++){
  await page.evaluate(()=>{const V=window.__sandbox.viewer._V,end=V.dom.root.querySelector('#playEndTurn');end.click();const yes=V.dom.root.querySelector('#playAskYes'),ask=V.dom.root.querySelector('#playAsk');if(yes&&ask&&ask.style.display!=='none')yes.click()})
  await page.waitForFunction(()=>!window.__sandbox.busy,null,{timeout:200000})
  hit=await page.evaluate(()=>{const V=window.__sandbox.viewer._V,r=(V.impact?.log||[]).findLast(r=>r.result==='hit'&&V.S.U[r.target]?.life==='standing');return r?{a:r.actor,t:r.target}:null})
  console.log(`  Turn ${turn+1}: ${hit?'a hit on unit '+hit.t:'no hit yet'}`)
 }
 if(!hit)throw Error('no hit in five turns')
 // the view on the target, settled
 await page.evaluate(id=>{window.__sandbox.viewer.centre(id)},hit.t);await page.waitForTimeout(6000)
 const facts=await page.evaluate(({a,t})=>{const V=window.__sandbox.viewer._V,c=V.dom.canvas,cr=c.getBoundingClientRect()
  const anchor=id=>{const E=V.layers.UEL.get(id),r=E.root.getBoundingClientRect(),h=E.img.getBoundingClientRect().height||90;return {x:r.left-cr.left,y:r.top-cr.top,h}}
  const A=anchor(a),T=anchor(t);window.__kept=[]
  const FX=V.fx.FX,add=FX.add;FX.add=function(dur,draw,sortY){window.__kept.push({dur,draw});return add.call(this,dur,draw,sortY)}
  FX.melee(A,T,'phys','med',{})
  return {A,T,modelPx:V.cast?.heightPx?.(t),zoom:V.camTarget?.zoom??V.view.zoom,canvas:[cr.left,cr.top,cr.width,cr.height],modelled:V.cast?.shows(t)}},hit)
 console.log('  anchors:',JSON.stringify(facts))
 await page.waitForFunction(()=>window.__kept.some(k=>k.dur===620),null,{timeout:60000});await page.waitForTimeout(4000)
 for(const t of [.15,.35,.6]){
  const box=await page.evaluate(t=>{const V=window.__sandbox.viewer._V,c=V.dom.canvas,r=c.getBoundingClientRect(),dpr=window.devicePixelRatio||1
   if(c.width!==Math.round(r.width*dpr)){c.width=r.width*dpr;c.height=r.height*dpr}
   const ctx=c.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);const P=[],K=window.__kept.find(k=>k.dur===620)
   for(let s=0;s<=t+1e-9;s+=.02){ctx.clearRect(0,0,r.width,r.height);ctx.save();K.draw(ctx,r.width,r.height,s,s*620,P,.012);ctx.restore()}
   const d=ctx.getImageData(0,0,c.width,c.height).data;let x0=1e9,y0=1e9,x1=-1,y1=-1,n=0
   for(let y=0;y<c.height;y+=2)for(let x=0;x<c.width;x+=2){const i=(y*c.width+x)*4;if(d[i+3]>8){n++;if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y}}
   return {n,box:n?[x0/dpr+r.left,y0/dpr+r.top,x1/dpr+r.left,y1/dpr+r.top]:null}},t)
  console.log(`  held at ${t}: ${box.n} pixels, box ${JSON.stringify(box.box?.map(Math.round))}`)
  const cx=facts.T.x+facts.canvas[0],cy=facts.T.y+facts.canvas[1]-80
  await page.screenshot({path:resolve(OUT,`slash-on-target-${String(t).replace('.','_')}.png`),timeout:90000,clip:{x:Math.max(0,cx-300),y:Math.max(0,cy-230),width:600,height:460}})
 }
 console.log('  page errors:',JSON.stringify(errors))
}finally{clearTimeout(deadline);await browser.close();child.kill()}
