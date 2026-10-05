// viewer.frame-cost-measured — what one frame of the battle screen costs, printed. Found 2026-10-05 (Andrew, engine/DECISIONS.md
// 'the battle screen must feel smooth: the speed first; …': "The game still feels clutzy … I want this to feel smooth like a AAA
// game."). The root chat measured it by hand; no tool said so, so nothing held it. This tool does the same by itself. It ASSERTS
// NOTHING: the items after it each name the column they bring down, and carry this table before and after in their landing note.
//
//   node tools/frame-cost.mjs [battle ...] [--page <built page>] [--frames N] [--software] [--json]
//
//   battle      an encounter id (encounter.opening.orphanage) or its short name (orphanage, lumberjack, bridge, cavern-trail,
//               gates, cathedral, caravan-aftermath); none named: the six opening battles and the caravan encounter
//   --page      the built page that plays a battle (default ../kingdom/BATTLE-SANDBOX.html), opened as ?play=<battle>
//   --frames    frames measured for each number (default 30, never fewer)
//   --software  draw with the software renderer (SwiftShader), as the kingdom's screenshot tools do; default: this machine's GPU
//   --json      print the rows as JSON instead of the table
//
// HOW (the hand method, kept): the built page is opened in real Chrome (playwright-core from ../engine, as
// kingdom/tools/camera-shows-edge-units.shot.mjs does) in a 1920x1080 window. Once the battle's 3D scene is up:
//   · window.requestAnimationFrame is replaced by a function that only STORES the callback — a hidden or headless page barely
//     fires it, and timers are throttled there — and the stored callbacks are called by hand, one frame at a time, every one of
//     them (so a glide, an effect or an edge scroll goes on as it would), the 3D scene's own (src/terrain3d.js frame()) timed
//     with the real performance.now();
//   · the page's performance.now() is stepped by hand between frames — this is the hand method's busy wait without the wait:
//     stepped by more than SEE_EVERY ms, every frame is one the see-through check may run in ("with the check"); stepped by
//     1 ms, none is ("without it" — the draw alone);
//   · WebGL2RenderingContext.prototype.drawElements, drawArrays, drawElementsInstanced and drawArraysInstanced are wrapped to
//     count draw calls and triangles, keyed by canvas and by whether a framebuffer is bound: the scene's canvas with one bound
//     is the shadow map, without one the scene; the bodies' canvas is its own pass.
// Each number is taken over --frames frames with nothing moving (the bodies idling where they stand), and again while the view
// scrolls (the edge scroll's own step, a little each frame, back and forth between the bounds).
//
// viewer.see-through-only-when-moved (2026-10-05) added the see-through check's own columns, read from what the page says of it
// (src/terrain3d.js V.seeThrough; a page built before that item has none and the columns read —): how often the check ran over
// the still frames and over the scrolling ones; what ONE asking of "which pieces hide a body now" costs, by the structure the
// check uses and by trying every triangle (the rule as first written — the cost it had); and, over a round of views — the
// view turned through its four quarters and scrolled at each — in how many the two name the same pieces (all of them, or what
// is drawn see-through has changed).
import {createRequire} from 'node:module'
import {createServer} from 'node:net'
import {spawn} from 'node:child_process'
import {existsSync} from 'node:fs'
import {resolve,dirname,relative} from 'node:path'
import {fileURLToPath} from 'node:url'
const here=dirname(fileURLToPath(import.meta.url)),ROOT=resolve(here,'../..')
export const BATTLES=['encounter.opening.orphanage','encounter.opening.lumberjack','encounter.opening.bridge','encounter.opening.cavern-trail','encounter.opening.gates','encounter.opening.cathedral','encounter.caravan-aftermath']
/** the see-through check's own spacing (src/terrain3d.js SEE_EVERY) is 120 ms: a frame this long after the last may run it */
const WITH_CHECK_MS=130,WITHOUT_CHECK_MS=1,WARM_UP=6,SCROLL_PX=14

const argv=process.argv.slice(2),flag=n=>argv.includes(n),valueOf=n=>{const i=argv.indexOf(n);return i>=0?argv[i+1]:undefined}
const takesValue=new Set(['--page','--frames']),named=argv.filter((a,i)=>!a.startsWith('--')&&!takesValue.has(argv[i-1]))
const idOf=name=>name.startsWith('encounter.')?name:BATTLES.find(b=>b.endsWith('.'+name))??name
const battles=named.length?named.map(idOf):BATTLES
const PAGE=resolve(valueOf('--page')??resolve(here,'../../kingdom/BATTLE-SANDBOX.html'))
const FRAMES=Math.max(30,Number(valueOf('--frames')??30)||30)
if(!existsSync(PAGE)){console.error('frame-cost: no built page at '+PAGE);process.exit(2)}

/* ── in the page ── */
/** put the page's frames in the tool's hands: the stored callbacks, the stepped clock, the counted draws */
function install(){
 if(window.__frameCost)return true
 const realNow=performance.now.bind(performance)
 const S=window.__frameCost={queue:new Map(),id:0,fake:realNow(),realNow,counts:null,fb:new WeakMap()}
 window.requestAnimationFrame=cb=>{const id=++S.id;S.queue.set(id,cb);return id}
 window.cancelAnimationFrame=id=>{S.queue.delete(id)}
 performance.now=()=>S.fake
 const P=WebGL2RenderingContext.prototype,bind=P.bindFramebuffer
 P.bindFramebuffer=function(target,f){if(target===this.FRAMEBUFFER||target===this.DRAW_FRAMEBUFFER)S.fb.set(this,f);return bind.call(this,target,f)}
 const note=(gl,mode,count,instances)=>{if(!S.counts)return
  const bodies=gl.canvas?.classList?.contains('terrain3d-bodies'),scene=gl.canvas?.classList?.contains('terrain3d-canvas')
  const pass=bodies?'bodies':scene?(S.fb.get(gl)?'shadow':'scene'):'other'
  const tris=(mode===gl.TRIANGLES?count/3:mode===gl.TRIANGLE_STRIP||mode===gl.TRIANGLE_FAN?Math.max(0,count-2):0)*instances
  const c=S.counts[pass]||(S.counts[pass]={draws:0,triangles:0});c.draws++;c.triangles+=tris}
 for(const [name,count,inst] of [['drawElements',1,-1],['drawArrays',2,-1],['drawElementsInstanced',1,4],['drawArraysInstanced',2,3]]){const real=P[name]
  P[name]=function(...a){note(this,a[0],a[count],inst<0?1:a[inst]);return real.apply(this,a)}}
 return true
}
/** one frame by hand: the clock stepped, every stored callback called once, the 3D scene's own timed */
function tick(step){
 const S=window.__frameCost;S.fake+=step;S.counts={}
 const run=[...S.queue.values()];S.queue.clear()
 let ms=null
 for(const cb of run){
  /* the 3D scene's frame is told from the others by its own words (the page is not minified) */
  if(/sawThrough/.test(String(cb))){const a=S.realNow();cb(S.fake);ms=S.realNow()-a}else cb(S.fake)}
 const counts=S.counts;S.counts=null
 return {ms,counts,runs:window.__sandbox.viewer._V.seeThrough?.runs??null}
}
/** the edge scroll's own step (src/board.js edgeScroll): the view shown as it goes, a little to one side; turned about at a bound */
/** which pieces hide a body now: by the structure and by every triangle — the same? and what each asking cost */
function hidingNow(){
 const s=window.__sandbox.viewer._V.seeThrough,S=window.__frameCost;if(!s?.hiding)return null
 const a=S.realNow(),fast=s.hiding(),b=S.realNow(),plain=s.hiding('plain'),c=S.realNow()
 return {same:fast.length===plain.length&&fast.every((x,i)=>x===plain[i]),hiding:plain.length,ms:b-a,plainMs:c-b}
}
function quarterTurn(){window.__sandbox.viewer.turn(90);return true}
function scrollStep(px){
 const v=window.__sandbox.viewer,V=v._V,S=window.__frameCost
 const before=V.camTarget?{...V.camTarget}:null
 const go=()=>{V.view.scrolling=true;try{v.pan((S.dir||(S.dir=1))*px,0)}finally{V.view.scrolling=false}}
 go();const after=V.camTarget
 if(before&&after&&Math.abs(after.x-before.x)<.01&&Math.abs(after.y-before.y)<.01){S.dir=-S.dir;go()}
 return true
}

/* ── out of it ── */
const median=a=>{const s=[...a].sort((x,y)=>x-y);return s.length?s[Math.floor(s.length/2)]:null}
const round=(n,d=1)=>n==null?null:Math.round(n*10**d)/10**d
function summed(frames){
 const passes={};for(const f of frames)for(const [p,c] of Object.entries(f.counts)){(passes[p]??=[]).push(c)}
 const of=p=>({draws:median((passes[p]??[]).map(c=>c.draws).concat(Array(frames.length-(passes[p]?.length??0)).fill(0)))??0,triangles:Math.round(median((passes[p]??[]).map(c=>c.triangles).concat(Array(frames.length-(passes[p]?.length??0)).fill(0)))??0)})
 const shadow=of('shadow'),scene=of('scene'),bodies=of('bodies'),other=of('other')
 const ms=frames.map(f=>f.ms).filter(n=>n!=null)
 return {frames:frames.length,ms:{median:round(median(ms)),min:round(Math.min(...ms)),max:round(Math.max(...ms))},
  draws:{all:shadow.draws+scene.draws+bodies.draws+other.draws,shadow:shadow.draws,scene:scene.draws,bodies:bodies.draws,...(other.draws?{other:other.draws}:{})},
  triangles:{all:shadow.triangles+scene.triangles+bodies.triangles+other.triangles,shadow:shadow.triangles,scene:scene.triangles,bodies:bodies.triangles,...(other.triangles?{other:other.triangles}:{})}}
}
async function measure(page,step,scroll){
 const frames=[]
 for(let i=0;i<WARM_UP+FRAMES;i++){
  if(scroll)await page.evaluate(scrollStep,SCROLL_PX)
  const f=await page.evaluate(tick,step)
  if(f.ms==null)throw Error('the 3D scene\'s frame was not among the page\'s stored frames')
  if(i>=WARM_UP)frames.push(f)}
 const out=summed(frames),runs=frames.map(f=>f.runs)
 /* how often the see-through check ran over these frames, where the page says (src/terrain3d.js V.seeThrough.runs) */
 if(runs[0]!=null)out.checks=runs[runs.length-1]-runs[0]
 return out
}
/** a round of views: the four quarters, the view scrolled at each — which pieces hide a body, both ways, at every one */
async function seeThroughRound(page){
 if(await page.evaluate(hidingNow)===null)return null
 const views=[]
 for(let q=0;q<4;q++){
  for(let i=0;i<8;i++){
   for(let k=0;k<3;k++){await page.evaluate(scrollStep,SCROLL_PX*4);await page.evaluate(tick,WITH_CHECK_MS)}
   views.push(await page.evaluate(hidingNow))}
  await page.evaluate(quarterTurn)
  /* the turn is a glide of about a second: let it arrive */
  for(let i=0;i<12;i++)await page.evaluate(tick,WITH_CHECK_MS)}
 const ms=views.map(v=>v.ms),plain=views.map(v=>v.plainMs)
 const built=await page.evaluate(()=>window.__sandbox.viewer._V.seeThrough.built||null)
 return {...(built?{built:{pieces:built.pieces,triangles:built.triangles,ms:round(built.ms)}}:{}),views:views.length,same:views.filter(v=>v.same).length,withSomethingHiding:views.filter(v=>v.hiding>0).length,
  ms:{median:round(median(ms),2),max:round(Math.max(...ms),2)},plainMs:{median:round(median(plain),1),max:round(Math.max(...plain),1)}}
}
async function battle(browser,port,id){
 const page=await browser.newPage({viewport:{width:1920,height:1080}}),errors=[]
 page.on('pageerror',e=>errors.push(String(e)))
 try{
  const t0=Date.now()
  await page.goto(`http://127.0.0.1:${port}/${relative(ROOT,PAGE).replace(/\\/g,'/')}?play=${id}`)
  await page.waitForFunction(()=>window.__sandbox?.session&&window.__sandbox.viewer&&!window.__sandbox.busy&&window.__sandbox.viewer._V?.play,null,{timeout:150000})
  const name=await page.evaluate(()=>document.title||'')
  const flat=await page.evaluate(()=>!window.__sandbox.viewer._V.data.atlas)
  if(flat)return {battle:id,flat:true,note:'a flat battle: no 3D scene, nothing drawn by the 3D frame'}
  await page.waitForFunction(()=>{const V=window.__sandbox.viewer._V,wr=V.dom.stage.parentNode;return wr.classList.contains('terrain3d-ready')||wr.classList.contains('terrain3d-failed')},null,{timeout:240000})
  const failed=await page.evaluate(()=>{const wr=window.__sandbox.viewer._V.dom.stage.parentNode;return wr.classList.contains('terrain3d-failed')?(wr.querySelector('#terrainStatus')?.textContent||'failed'):null})
  if(failed)return {battle:id,flat:true,note:'its 3D scene could not be drawn here: '+failed}
  const loadMs=Date.now()-t0
  const board=await page.evaluate(()=>{const wr=window.__sandbox.viewer._V.dom.stage.parentNode;return {w:wr.clientWidth,h:wr.clientHeight}})
  const gpu=await page.evaluate(()=>{const c=document.querySelector('canvas.terrain3d-canvas'),gl=c?.getContext('webgl2'),x=gl?.getExtension('WEBGL_debug_renderer_info');return gl?String(x?gl.getParameter(x.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER)):'?'})
  await page.evaluate(install)
  /* the frames the browser already held are its own to fire: let them, so each lands in the tool's hands */
  await page.waitForFunction(()=>[...window.__frameCost.queue.values()].some(cb=>/sawThrough/.test(String(cb))),null,{timeout:30000})
  /* "nothing moving": the battle opens with a glide to the unit that begins — let it arrive before a still frame is counted */
  for(let i=0;i<40;i++){await page.evaluate(tick,WITH_CHECK_MS);if(!await page.evaluate(()=>!!window.__sandbox.viewer._V.camAnim))break}
  for(let i=0;i<3;i++)await page.evaluate(tick,WITH_CHECK_MS)
  const row={battle:id,name,board,gpu,loadMs}
  row.still={withCheck:await measure(page,WITH_CHECK_MS,false),withoutCheck:await measure(page,WITHOUT_CHECK_MS,false)}
  row.scrolling={withCheck:await measure(page,WITH_CHECK_MS,true),withoutCheck:await measure(page,WITHOUT_CHECK_MS,true)}
  const seen=await seeThroughRound(page);if(seen)row.seeThrough=seen
  if(errors.length)row.pageErrors=errors
  return row
 }finally{await page.close()}
}

const n=x=>x==null?'—':x.toLocaleString('en-US')
const short=id=>id.replace(/^encounter\.(opening\.)?/,'')
function table(rows){
 const head=['battle','draw calls a frame (shadow · scene · bodies)','triangles a frame (shadow · scene · bodies)','script ms, still: with the check / without','script ms, scrolling: with / without','draw calls scrolling','see-through checks run: still / scrolling','one check, ms: now / every triangle','same pieces both ways']
 const lines=rows.map(r=>r.flat?[short(r.battle),r.note,'','','','','','','']:[short(r.battle),
  `${n(r.still.withoutCheck.draws.all)} (${n(r.still.withoutCheck.draws.shadow)} · ${n(r.still.withoutCheck.draws.scene)} · ${n(r.still.withoutCheck.draws.bodies)})`,
  `${n(r.still.withoutCheck.triangles.all)} (${n(r.still.withoutCheck.triangles.shadow)} · ${n(r.still.withoutCheck.triangles.scene)} · ${n(r.still.withoutCheck.triangles.bodies)})`,
  `${r.still.withCheck.ms.median} (${r.still.withCheck.ms.min}–${r.still.withCheck.ms.max}) / ${r.still.withoutCheck.ms.median} (${r.still.withoutCheck.ms.min}–${r.still.withoutCheck.ms.max})`,
  `${r.scrolling.withCheck.ms.median} (${r.scrolling.withCheck.ms.min}–${r.scrolling.withCheck.ms.max}) / ${r.scrolling.withoutCheck.ms.median} (${r.scrolling.withoutCheck.ms.min}–${r.scrolling.withoutCheck.ms.max})`,
  `${n(r.scrolling.withoutCheck.draws.all)}`,
  r.still.withCheck.checks==null?'—':`${r.still.withCheck.checks} / ${r.scrolling.withCheck.checks} of ${r.still.withCheck.frames}`,
  r.seeThrough?`${r.seeThrough.ms.median} (to ${r.seeThrough.ms.max}) / ${r.seeThrough.plainMs.median} (to ${r.seeThrough.plainMs.max})`:'—',
  r.seeThrough?`${r.seeThrough.same} of ${r.seeThrough.views} views (${r.seeThrough.withSomethingHiding} with a piece in the way)`:'—'])
 const w=head.map((h,i)=>Math.max(h.length,...lines.map(l=>l[i].length)))
 const row=c=>'| '+c.map((x,i)=>x.padEnd(w[i])).join(' | ')+' |'
 return [row(head),'|'+w.map(x=>'-'.repeat(x+2)).join('|')+'|',...lines.map(row)].join('\n')
}

const {chromium}=createRequire(resolve(ROOT,'engine/package.json'))('playwright-core')
const freePort=()=>new Promise((ok,no)=>{const s=createServer();s.on('error',no);s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>ok(p))})})
const port=await freePort(),child=spawn(process.execPath,[resolve(ROOT,'tools/battle-atlas/serve.mjs'),String(port)],{cwd:ROOT,stdio:['ignore','pipe','pipe']})
await new Promise((ok,no)=>{let out='';const t=setTimeout(()=>no(Error('the battle server did not start: '+out)),30000)
 child.stdout.on('data',d=>{out+=d;if(/Battle Atlas/.test(out)){clearTimeout(t);ok()}});child.stderr.on('data',d=>{out+=d})})
const args=flag('--software')?['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']:['--enable-gpu','--use-angle=d3d11','--ignore-gpu-blocklist']
const browser=await chromium.launch({channel:'chrome',headless:true,args})
/* an overall deadline: a headless Chrome that hangs must not hold the run, or leave its server behind */
const deadline=setTimeout(()=>{console.error('frame-cost: gave up after '+(4*battles.length+2)+' minutes');child.kill();browser.close().finally(()=>process.exit(1))},(4*battles.length+2)*60000)
let code=0
try{
 const rows=[]
 for(const id of battles){
  try{rows.push(await battle(browser,port,id))}catch(error){rows.push({battle:id,flat:true,note:'not measured: '+String(error?.message||error).split('\n')[0]});code=1}
  if(!flag('--json'))console.error('  measured '+short(id))}
 if(flag('--json'))console.log(JSON.stringify({page:relative(ROOT,PAGE).replace(/\\/g,'/'),window:{w:1920,h:1080},frames:FRAMES,software:flag('--software'),rows},null,1))
 else{
  const first=rows.find(r=>!r.flat)
  console.log(`frame-cost: ${relative(ROOT,PAGE).replace(/\\/g,'/')} in a 1920x1080 window${first?`, the board ${first.board.w}x${first.board.h}, drawn by ${first.gpu}`:''}; each number the median of ${FRAMES} frames (lowest–highest), the bodies idling; script ms is one call of src/terrain3d.js frame()`)
  console.log(table(rows))
  for(const r of rows)if(r.seeThrough?.built)console.log(`  ${short(r.battle)}: the see-through structures — ${n(r.seeThrough.built.pieces)} pieces, ${n(r.seeThrough.built.triangles)} triangles — were built in ${r.seeThrough.built.ms} ms while the scene loaded (the page was ready ${n(r.loadMs)} ms after it was opened)`)
  for(const r of rows)if(r.pageErrors)console.log(`  ${short(r.battle)}: page errors — ${r.pageErrors.join(' · ')}`)}
}finally{clearTimeout(deadline);await browser.close();child.kill()}
process.exitCode=code
