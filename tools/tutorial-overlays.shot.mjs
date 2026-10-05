// viewer.tutorial-overlays — the lessons as a browser lays them out. Not a gate test (the fake page of the verify has no layout):
// it opens a built sandbox (the Orphanage) in real Chrome (playwright-core, as tools/bar-card-and-log.verify.mjs does), shows a
// notice and a pointer of every kind through the page's own viewer, and reads where the browser put them — each pointer's tip on
// its target's edge, inside the screen; the notice across the board's centre, gold — then saves the screen for Andrew's eye.
//
//   node tools/tutorial-overlays.shot.mjs <page.html> <out-dir>     writes tutorial-overlays.png (and -look.png)
import {stillShot} from './still-shot.mjs'   // viewer.screenshot-time-out-under-load: the page's frame loop is held for the shot
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
try{
 const page=await browser.newPage({viewport:{width:1920,height:1080}})
 page.on('pageerror',e=>errors.push(String(e)))
 await page.goto(`http://127.0.0.1:${port}/${relative(ROOT,PAGE).replace(/\\/g,'/')}?play=encounter.opening.orphanage`)
 await page.waitForFunction(()=>window.__sandbox?.session&&window.__sandbox.viewer&&!window.__sandbox.busy&&window.__sandbox.viewer._V?.play,null,{timeout:150000})
 const still=async()=>{let quiet=0;for(let n=0;n<300&&quiet<4;n++){await page.waitForTimeout(100);quiet=await page.evaluate(()=>window.__sandbox.busy)?0:quiet+1}}
 await still();mkdirSync(OUT,{recursive:true})
 /* the board itself is given up to three minutes (software GL here), then the screen is taken as it is */
 await page.waitForFunction(()=>{const V=window.__sandbox.viewer._V,wr=V.dom.stage.parentNode;return !wr.classList.contains('terrain3d-loading')&&getComputedStyle(V.dom.stage).visibility==='visible'},null,{timeout:180000}).catch(()=>console.log('  the 3D map was still loading at the screenshot'))
 const got=await page.evaluate(async()=>{
  const v=window.__sandbox.viewer,V=v._V,s=window.__sandbox.session.ctx,me=s.state.units[s.battleCursor.actor]
  const civ=s.state.units.find(u=>/orphan/.test(u.typeId)),move=me.actions.find(id=>s.actions[id].move&&!s.actions[id].attack),zombie=s.state.units.find(u=>u.side==='enemy')
  v.reveal(zombie.id);await new Promise(r=>setTimeout(r,1400))
  v.tell(['Your first battle.','Move next to the Zombie, then strike.'],{ms:60000})
  const made={civ:v.point({unit:civ.id},{word:'Civilians'}),move:v.point({action:move},{word:'Move'}),panel:v.point({ui:'panel'},{word:'All the details about this enemy are on the right.'}),
   mv:v.point({unit:zombie.id,part:'move'}),dg:v.point({unit:zombie.id,part:'attack'}),stam:v.point({ui:'stamina'},{word:'Stamina'}),card:v.point({card:me.id}),end:v.point({ui:'end-turn'},{word:'End Turn'})}
  await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))
  const R=V.dom.root.getBoundingClientRect(),rect=n=>{const r=n.getBoundingClientRect();return {l:r.left-R.left,t:r.top-R.top,r:r.right-R.left,b:r.bottom-R.top,w:r.width,h:r.height}}
  const st=v.overlays,out={W:R.width,H:R.height,ptrs:{}}
  for(const [name,h] of Object.entries(made)){const p=st.pointers.find(x=>x.id===h.id);out.ptrs[name]={side:p.side,tip:p.shown,target:p.el?rect(p.el):null,node:rect(p.node),arrow:rect(p.node.querySelector('.tutArrow')),shown:getComputedStyle(p.node).display!=='none'}}
  const n=document.querySelector('#tutNotice'),w=rect(V.dom.stage.parentNode),c=getComputedStyle(n.querySelector('b'))
  out.notice={rect:rect(n),wrap:w,color:c.color,size:c.fontSize,lines:n.querySelectorAll('b').length}
  return out})
 /* the notice: across the board's centre, gold, large */
 const N=got.notice,mid=(N.rect.l+N.rect.r)/2,wm=(N.wrap.l+N.wrap.r)/2
 assert.ok(Math.abs(mid-wm)<2,`the notice is centred across the board: ${mid.toFixed(0)} against ${wm.toFixed(0)}`)
 assert.ok(N.rect.t>N.wrap.t+N.wrap.h*.2&&N.rect.b<N.wrap.t+N.wrap.h*.8,'and stands in its middle band');assert.equal(N.color,'rgb(224, 185, 94)','gold');assert.ok(parseFloat(N.size)>=28)
 console.log(`  the notice: ${N.lines} lines, ${N.size} gold, centred on the board (${Math.round(N.rect.w)} px wide)`)
 /* each pointer's tip is on its target's edge, on the side it comes from, and the whole pointer is on the screen */
 for(const [name,p] of Object.entries(got.ptrs)){
  assert.ok(p.shown,name+' is drawn');assert.ok(p.node.l>=-1&&p.node.t>=-1&&p.node.r<=got.W+1&&p.node.b<=got.H+1,`${name}: the pointer is inside the screen (${JSON.stringify(p.node)})`)
  /* a thing on the board keeps its pointer inside the battle area; a part of the screen, inside the screen */
  if(!p.target){const a=got.notice.wrap;assert.ok(p.node.l>=a.l-1&&p.node.t>=a.t-1&&p.node.r<=a.r+1&&p.node.b<=a.b+1,name+': inside the battle area');continue}
  const T=p.target,want=p.side==='top'?{x:(T.l+T.r)/2,y:T.t}:p.side==='bottom'?{x:(T.l+T.r)/2,y:T.b}:p.side==='left'?{x:T.l,y:(T.t+T.b)/2}:{x:T.r,y:(T.t+T.b)/2}
  /* the tip is on the target's edge unless that would put the pointer off the screen: then as near it as the screen allows */
  const N=p.node,clamp=(v,lo,hi)=>Math.min(Math.max(lo,hi),Math.max(Math.min(lo,hi),v)),s=p.side
  const edge={x:clamp(want.x,28+(s==='left'?N.w:s==='right'?0:N.w/2),got.W-28-(s==='right'?N.w:s==='left'?0:N.w/2)),y:clamp(want.y,28+(s==='top'?N.h:s==='bottom'?0:N.h/2),got.H-28-(s==='bottom'?N.h:s==='top'?0:N.h/2))}
  assert.ok(Math.abs(p.tip.x-edge.x)<5&&Math.abs(p.tip.y-edge.y)<5,`${name}: the tip ${JSON.stringify(p.tip)} is on its target's ${p.side} edge ${JSON.stringify(edge)}`)
  /* the arrow's point is at the tip: the arrow's box touches it on the side it points to */
  const A=p.arrow,touch=p.side==='top'?Math.abs(A.b-p.tip.y):p.side==='bottom'?Math.abs(A.t-p.tip.y):p.side==='left'?Math.abs(A.r-p.tip.x):Math.abs(A.l-p.tip.x)
  assert.ok(touch<10,`${name}: the arrow's point is at the tip (${touch.toFixed(1)} px off, bobbing)`)
 }
 console.log(`  ${Object.keys(got.ptrs).length} pointers, each on its target's edge and inside the screen: ${Object.entries(got.ptrs).map(([k,p])=>k+' from the '+p.side).join(', ')}`)
 await stillShot(page,page,{path:resolve(OUT,'tutorial-overlays.png'),timeout:100000,animations:'disabled'})
 /* the look: to the civilians, nearer */
 await page.evaluate(()=>{const v=window.__sandbox.viewer,s=window.__sandbox.session.ctx;v.clearTell();v.unpoint();const civ=s.state.units.find(u=>/orphan/.test(u.typeId));v.point({unit:civ.id},{word:'Civilians'});v.look({unit:civ.id},{ms:60000})})
 await page.waitForTimeout(1500)
 await stillShot(page,page,{path:resolve(OUT,'tutorial-overlays-look.png'),timeout:100000,animations:'disabled'})
 assert.deepEqual(errors,[],'no page error')
 console.log('  screenshots: '+resolve(OUT,'tutorial-overlays.png')+' and '+resolve(OUT,'tutorial-overlays-look.png'))
}finally{await browser.close();child.kill()}
