// viewer.plates-and-banners-sit-low — ruled 2026-10-06 (Andrew, engine DECISIONS.md 'the Deathbed notification and the others sit
// low, near the bottom of the screen': "The deathbed fighting notification and maybe other notifications are still happening too
// close to the center of the screen. Push it down closer to the bottom of the screen.").
//
// MEASURED on the built battle screen in a real browser (Chrome through playwright-core, 1920 x 1080, as
// tools/plates-banners-tooltip-gold-look.verify.mjs): the page's OWN cues are played (the viewer's playCues — the same door its
// log plays them through) and each notification's box is read where the browser put it. Held: a phase banner, a wave banner,
// the Deathbed plate at both its stages and an injury plate each stand in the band just above the stamina strip and the action
// bar — inside the board's frame, centred across it, its foot in the notices' band and the whole of it below the middle of the
// screen's height; two up at once are one above the other, not overlapping; when more come than fit under the middle of the
// screen, the oldest leaves and the newest stays;
// MEASURED AND SAID: at 1920 x 1080 the board's frame ends 782 px down (the stamina strip and the action bar take the rest), so
// the band's foot is 26 px inside the lower third of the screen: a one-line notice stands wholly in the lower third, a
// two-line banner and the Deathbed plate begin a little above it. "None within the middle third" cannot be met above the
// bar; each one's top is printed (viewer SWITCHES lowBandIsAboveTheBar). the dimmed screen under the Deathbed plate still covers the board; the hex tooltip still comes up at the pointer.
// Said, not moved: the affliction pop-up (a held screen with two cards and a Continue button) and the questions with buttons.
//
//   node tools/plates-and-banners-sit-low.verify.mjs [BATTLE-SANDBOX.html]
import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
import {createServer} from 'node:net'
import {spawn} from 'node:child_process'
import {resolve,dirname,relative} from 'node:path'
import {fileURLToPath} from 'node:url'

const here=dirname(fileURLToPath(import.meta.url)),ROOT=resolve(here,'../..')
const PAGE=resolve(process.argv[2]??'BATTLE-SANDBOX.html')
const {chromium}=createRequire(resolve(ROOT,'engine/package.json'))('playwright-core')
const say=(...a)=>console.log('  '+a.join(' '))
const freePort=()=>new Promise((ok,no)=>{const s=createServer();s.on('error',no);s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>ok(p))})})
async function serve(){
 const port=await freePort(),child=spawn(process.execPath,[resolve(ROOT,'tools/battle-atlas/serve.mjs'),String(port)],{cwd:ROOT,stdio:['ignore','pipe','pipe']})
 await new Promise((ok,no)=>{let out='';const t=setTimeout(()=>no(Error('the battle server did not start: '+out)),30000)
  child.stdout.on('data',d=>{out+=d;if(/Battle Atlas/.test(out)){clearTimeout(t);ok()}});child.stderr.on('data',d=>{out+=d});child.on('exit',c=>{clearTimeout(t);no(Error('the battle server exited '+c+': '+out))})})
 return {port,stop:()=>child.kill()}
}
const server=await serve()
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']})
const errors=[]
try{
 const page=await browser.newPage({viewport:{width:1920,height:1080}});page.on('pageerror',e=>errors.push(String(e)))
 await page.goto(`http://127.0.0.1:${server.port}/${relative(ROOT,PAGE).replace(/\\/g,'/')}?play=encounter.opening.orphanage`)
 await page.waitForFunction(()=>window.__sandbox?.session&&window.__sandbox.viewer&&!window.__sandbox.busy&&window.__sandbox.viewer._V?.camera3d,null,{timeout:180000})
 let quiet=0;for(let n=0;n<200&&quiet<5;n++){await page.waitForTimeout(100);quiet=await page.evaluate(()=>window.__sandbox.busy)?0:quiet+1}
 /** play cues of the page's own, wait `ms`, and read where the browser put each thing asked for */
 const play=(cues,sels,ms=320)=>page.evaluate(async([cues,sels,ms])=>{
  const V=window.__sandbox.viewer._V,hero=Object.values(V.S.U).find(u=>u.side==='hero').id
  V.playCues(cues.map(c=>c.id==='HERO'?{...c,id:hero}:c));await new Promise(r=>setTimeout(r,ms))
  const R=n=>{if(!n)return null;const r=n.getBoundingClientRect(),c=getComputedStyle(n);return {ot:n.offsetTop,oh:n.offsetHeight,l:r.left,t:r.top,r:r.right,b:r.bottom,w:r.width,h:r.height,shown:c.display!=='none'&&r.width>0&&r.height>0,text:n.textContent.trim().slice(0,50),bg:c.backgroundColor}}
  const out={frame:R(V.dom.stage.parentNode),screen:R(V.dom.root),stack:R(V.dom.root.querySelector('#noticeStack')),bar:R(V.dom.actionbar),stam:R(V.dom.stambar)}
  for(const [k,sel] of Object.entries(sels))out[k]=R(V.dom.root.querySelector(sel))
  return out},[cues,sels,ms])
 const clear=ms=>page.waitForTimeout(ms)
 const mid=x=>(x.l+x.r)/2
 /** in the band: inside the board's frame, above the stamina strip and the bar, centred, and wholly under the middle third of the screen */
 function low(M,what,name){
  const x=M[what];assert.ok(x&&x.shown,name+' is shown')
  const half=M.screen.t+M.screen.h/2
  assert.ok(x.t>=half-.5,`${name} is below the middle of the screen (its top at ${(x.t-M.screen.t).toFixed(0)} of ${M.screen.h.toFixed(0)} px)`)
  assert.ok((x.t+x.b)/2>=M.screen.t+M.screen.h*.6,`${name} is centred in the lower two fifths of the screen (${(100*((x.t+x.b)/2-M.screen.t)/M.screen.h).toFixed(0)}% down)`)
  assert.ok(x.b<=M.frame.b+.5,`${name} is inside the board's frame (its foot ${(M.frame.b-x.b).toFixed(0)} px above the frame's bottom edge)`)
  assert.ok(x.b<=M.stam.t+.5&&x.b<=M.bar.t+.5,`${name} is above the stamina strip and the action bar`)
  assert.ok(Math.abs(mid(x)-mid(M.frame))<=2,`${name} is centred across the board`)
  assert.ok(M.frame.b-x.b<=140,`${name} is in the band just above the bar (${(M.frame.b-x.b).toFixed(0)} px over the frame's foot)`)
  return `${name}: top ${(x.t-M.screen.t).toFixed(0)} px, foot ${(x.b-M.screen.t).toFixed(0)} px of a ${M.screen.h.toFixed(0)} px screen (${(100*(x.t-M.screen.t)/M.screen.h).toFixed(0)}% down)`
 }
 // 1. the banners
 for(const [kind,text,sub] of [['phase','Hero Phase','your heroes act'],['wave','A wave arrives','Skeleton Archer · Skeleton Archer']]){
  const M=await play([{k:'banner',kind,text,sub}],{banner:'.banner'});say(low(M,'banner',`the ${kind} banner ("${text}")`));await clear(1700)}
 // 2. the Deathbed plate, both stages, over the dimmed screen
 {let M=await play([{k:'deathbed',id:'HERO',result:'stood',n:12,chance:40}],{plate:'.dbPlate',veil:'.dbVeil'})
  say(low(M,'plate','the Deathbed plate (the roll)'));assert.ok(M.veil&&M.veil.w>=M.frame.w-1&&M.veil.h>=M.frame.h-1&&!/rgba\(0, 0, 0, 0\)/.test(M.veil.bg),'the dimmed screen still covers the board')
  M=await play([],{plate:'.dbPlate'},1100);assert.match(M.plate.text,/DEATHBED FIGHTING/);say(low(M,'plate','the Deathbed plate (fights on)'));await clear(1700)
  M=await play([{k:'deathbed',id:'HERO',result:'fell',n:77,chance:40}],{plate:'.dbPlate'},1400);say(low(M,'plate','the Deathbed plate (falls)'));await clear(1500)}
 // 3. an injury plate
 {const M=await play([{k:'injury',id:'HERO',name:'Broken Arm'}],{inj:'.injPlate'},220);say(low(M,'inj','the injury plate ("Broken Arm")'));await clear(1700)}
 // 4. two at once: one above the other, neither over the other
 {const M=await play([{k:'banner',kind:'wave',text:'A wave arrives',sub:'Zombie'},{k:'injury',id:'HERO',name:'Broken Arm'}],{banner:'.banner',inj:'.injPlate'},300)
  low(M,'banner','the banner, with an injury plate up');low(M,'inj','the injury plate, with a banner up')
  /* where each is LAID OUT in the stack (its own box, whatever its entrance is still doing to the picture: a banner slides in 8 px, a plate swells) */
  assert.ok(M.inj.ot+M.inj.oh<=M.banner.ot,`the newer (the injury plate) is laid out above the older (the banner), not over it (injury ${M.inj.ot}+${M.inj.oh}, banner from ${M.banner.ot})`)
  say(`two at once: the injury plate ${(M.inj.t-M.screen.t).toFixed(0)}-${(M.inj.b-M.screen.t).toFixed(0)} px above the banner ${(M.banner.t-M.screen.t).toFixed(0)}-${(M.banner.b-M.screen.t).toFixed(0)} px`);await clear(1900)}
 // 5. more than the lower third holds: the oldest leaves, the newest stays, the stack does not climb out
 {const M=await play([{k:'banner',kind:'wave',text:'A wave arrives',sub:'Zombie'},{k:'injury',id:'HERO',name:'Broken Arm'},{k:'deathbed',id:'HERO',result:'stood',n:12,chance:40}],{banner:'.banner',inj:'.injPlate',plate:'.dbPlate'})
  const third=M.screen.t+M.screen.h/2;assert.ok(M.plate&&M.plate.shown,'the newest (the Deathbed plate) stays');assert.ok(M.stack.t>=third-.5,'the stack has not climbed over the middle of the screen')
  const left=['banner','inj'].filter(k=>M[k]&&M[k].shown)
  say(`three at once: the Deathbed plate stays; of the two before it ${left.length?left.join(' and ')+' still fit':'both left'} — the stack's top at ${(M.stack.t-M.screen.t).toFixed(0)} px (the middle of the screen is at ${(third-M.screen.t).toFixed(0)})`);await clear(2800)}
 // 6. the hex tooltip: still at the pointer
 {const f=(await play([],{})).frame;let tip=null,at=null
  for(const [fx,fy] of [[.5,.5],[.4,.6],[.6,.4],[.3,.5],[.7,.6]]){at=[f.l+f.w*fx,f.t+f.h*fy];await page.mouse.move(at[0],at[1]);await page.waitForTimeout(150);const M=await play([],{tip:'#hexTip'},10);if(M.tip&&M.tip.shown){tip=M.tip;break}}
  assert.ok(tip,'the hex tooltip comes up under the mouse');const dx=Math.max(tip.l-at[0],at[0]-tip.r,0),dy=Math.max(tip.t-at[1],at[1]-tip.b,0)
  assert.ok(dx<=160&&dy<=160,`the hex tooltip is at the pointer (${dx.toFixed(0)}, ${dy.toFixed(0)} px away), not in the band`);say(`the hex tooltip: at the pointer, ${(tip.t-f.t).toFixed(0)} px down the board`);await page.mouse.move(5,5)}
 // 7. said, not moved: the affliction pop-up's own size
 {const M=await page.evaluate(()=>{const V=window.__sandbox.viewer._V,t=document.createElement('template')
   t.innerHTML='<div id="afflPop" data-probe="1"><div id="afflBox" class="hbtNotice"><div id="afflHead">Afflicted</div><div id="afflTitle">Dread Reaver</div><div id="afflBody"><div id="afflCards"><div class="afflCard"><div class="afflArt"></div><div class="afflCap">Before</div></div><div class="afflCard"><div class="afflArt"></div><div class="afflCap">After</div></div></div><div id="afflText"></div></div><div id="afflFoot"><button class="pcBtn pcEnd">Continue</button></div></div></div>'
   const n=t.content.firstElementChild;V.dom.root.appendChild(n);const r=n.querySelector('#afflBox').getBoundingClientRect(),s=V.dom.root.getBoundingClientRect();n.remove();return {h:r.height,t:r.top-s.top,screen:s.height}})
  assert.ok(M.h>M.screen/3,'the affliction pop-up is taller than a third of the screen: it cannot stand in the band');say(`the affliction pop-up: ${M.h.toFixed(0)} px tall with its two cards and its Continue button, on a ${M.screen.toFixed(0)} px screen — a held screen, not moved (viewer SWITCHES lowAfflictionPopUpStays)`)}
 assert.deepEqual(errors,[],'no page errors')
}finally{await browser.close();server.stop()}
console.log('plates-and-banners-sit-low: a phase banner, a wave banner, the Deathbed plate at each stage and an injury plate each stood in the band just above the stamina strip and the action bar, inside the board\'s frame, centred, below the middle of the screen; two at once stood one above the other; with more than fits under the middle of the screen the oldest left and the newest stayed; the hex tooltip was at the pointer — passed')
