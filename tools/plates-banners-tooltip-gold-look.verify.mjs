// viewer.plates-banners-tooltip-gold-look (engine DECISIONS.md 2026-10-05 'gifts: the word; each first-hero choice rolls its own; the
// plates, banners, tooltip and pop-up take the gold look' - asked whether the Deathbed and injury plates, the phase and wave
// banners, the hex tooltip and the affliction pop-up should take the notices' look too, Andrew: "One, yes."). The item's expect, on
// the BUILT sandbox in a real browser (Chrome through playwright-core, 1920 x 1080, as tools/notices-gold-low-no-backdrop.verify.mjs):
// each of the six shows gold outlined letters with nothing drawn behind the words; their places are what they were; the gear
// panel is unchanged.
// What is measured is the browser's own computed style and layout. The hex tooltip is the page's own, raised by the mouse. The
// banners, the plates and the pop-up come and go with moments of a battle, so each is stood on the battle screen as the page
// itself writes it (the classes and markup of viewer src/board.js banner, the Deathbed modal and the injury plate, and of
// src/affliction.js - the viewer's page test holds that the page writes exactly these) and measured there.
//
//   node tools/plates-banners-tooltip-gold-look.verify.mjs <page.html> [shots-folder]
// With a folder it also saves a screenshot of each over the Orphanage's board and the Cavern Trail's (the page's frame loop
// held still for each shot); without one it takes none - the gate runs it so.
// Prints one line per reading and `plates-banners-tooltip-gold-look: ... passed`.
import {stillShot} from './still-shot.mjs'   // viewer.screenshot-time-out-under-load: the page's frame loop is held for the shot
import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
import {createServer} from 'node:net'
import {spawn} from 'node:child_process'
import {resolve,dirname,relative} from 'node:path'
import {fileURLToPath} from 'node:url'
import {mkdirSync} from 'node:fs'

const here=dirname(fileURLToPath(import.meta.url)),ROOT=resolve(here,'../..')
const PAGE=resolve(process.argv[2]??'BATTLE-SANDBOX.html'),SHOTS=process.argv[3]?resolve(process.argv[3]):null
const {chromium}=createRequire(resolve(ROOT,'engine/package.json'))('playwright-core')
const say=(...a)=>console.log('  '+a.join(' '))
const GOLD='rgb(255, 212, 94)'

const freePort=()=>new Promise((ok,no)=>{const s=createServer();s.on('error',no);s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>ok(p))})})
async function serve(){
 const port=await freePort(),child=spawn(process.execPath,[resolve(ROOT,'tools/battle-atlas/serve.mjs'),String(port)],{cwd:ROOT,stdio:['ignore','pipe','pipe']})
 await new Promise((ok,no)=>{let out='';const t=setTimeout(()=>no(Error('the battle server did not start: '+out)),30000)
  child.stdout.on('data',d=>{out+=d;if(/Battle Atlas/.test(out)){clearTimeout(t);ok()}});child.stderr.on('data',d=>{out+=d});child.on('exit',c=>{clearTimeout(t);no(Error('the battle server exited '+c+': '+out))})})
 return {port,stop:()=>child.kill()}
}
/** in the page: every element under `sel` that holds words of its own, with what the browser computed for it */
const READ=`(sel=>{const root=typeof sel==='string'?document.querySelector(sel):sel;if(!root)return null
 const one=n=>{const c=getComputedStyle(n),r=n.getBoundingClientRect();return {tag:n.tagName.toLowerCase(),cls:String(n.className||n.id||''),own:[...n.childNodes].some(x=>x.nodeType===3&&x.textContent.trim()),text:n.textContent.trim().slice(0,60),
  shown:c.display!=='none'&&r.width>0&&r.height>0,color:c.color,bg:c.backgroundColor,image:c.backgroundImage,border:[c.borderTopWidth,c.borderRightWidth,c.borderBottomWidth,c.borderLeftWidth].map(parseFloat),
  shadow:c.boxShadow,textShadow:c.textShadow,weight:+c.fontWeight,size:parseFloat(c.fontSize),l:r.left,t:r.top,r:r.right,b:r.bottom,w:r.width,h:r.height}}
 return {box:one(root),parts:[...root.querySelectorAll('*')].map(one)}})`
const clear=x=>/^rgba\(0, 0, 0, 0\)$|^transparent$/.test(x.bg)&&x.image==='none'&&x.border.every(n=>n===0)&&x.shadow==='none'
/** the box itself and every element inside it that is not one of `keep` (a picture's frame, a button): nothing drawn; every word gold and outlined - but a figure in `figures` keeps its own colour */
function bare(R,what,{keep=[],figures=[]}={}){
 assert.ok(R&&R.box.shown,what+' is shown');assert.ok(clear(R.box),`${what}: nothing is drawn behind its words (${R.box.bg}, border ${R.box.border}, ${R.box.shadow})`)
 let words=0
 for(const p of R.parts){if(!p.shown||keep.some(k=>p.cls.split(/\s+/).includes(k)||p.tag===k))continue
  assert.ok(clear(p),`${what}: nothing behind "${p.text}" (.${p.cls}: ${p.bg}, border ${p.border}, ${p.shadow})`)
  if(!p.own)continue
  words++;assert.notEqual(p.textShadow,'none',`${what}: "${p.text}" is outlined`)
  if(!figures.some(k=>p.cls.split(/\s+/).includes(k)))assert.equal(p.color,GOLD,`${what}: "${p.text}" is gold`)}
 if(R.box.own){words++;assert.equal(R.box.color,GOLD,what+': gold');assert.notEqual(R.box.textShadow,'none')}
 assert.ok(words>0,what+' has words');return words}

/* the markup the page writes for each (viewer src/board.js, src/affliction.js) */
/* Law 10, 2026-10-06 — viewer.plates-and-banners-sit-low (Andrew, engine DECISIONS.md 'the Deathbed notification and the others sit low, near the bottom of the screen': "… still happening too close to the center of the screen. Push it down closer to the bottom of the screen.") overturns the PLACE this test held; the look and the time are held as before. The pieces are now stood by the page's own cues (the viewer's playCues), since their place is the
   page's to give (board.js standLow); the markup below is what those cues write. */
const BANNER=(kind,text,sub)=>`<div class="banner hbtNotice ${kind}"><b>${text}</b><span>${sub}</span></div>`
const DEATHBED=`<div class="dbModal stood"><div class="dbVeil"></div><div class="dbPlate hbtNotice stood"><span class="dbHead gold">DEATHBED FIGHTING</span><span class="dbBold gold">This hero fights on.</span><span class="dbName">Iron Dwarf</span><span class="dbRoll">rolled <b>12</b> against <b>40</b></span></div></div>`
const FELL=`<div class="dbModal fell"><div class="dbVeil"></div><div class="dbPlate hbtNotice fell"><span class="dbHead red">DEATHBED FIGHTING</span><span class="dbBold red">This hero falls.</span><span class="dbName">Iron Dwarf</span></div></div>`
const INJURY=`<div class="injPlate hbtNotice" style="left:640px;top:300px;width:180px"><b>✶</b> Broken Arm</div>`
const AFFLICTION=`<div id="afflPop" role="dialog"><div id="afflBox" class="hbtNotice"><div id="afflHead">Afflicted</div><div id="afflTitle">Dread Reaver — Lycanthropy</div>
 <div id="afflBody"><div id="afflCards"><div class="afflCard" id="afflBefore"><div class="afflArt"><span class="afflNoArt">No card art yet.</span></div><div class="afflCap">Before</div></div><span class="afflArrow" aria-hidden="true">&rarr;</span><div class="afflCard" id="afflAfter"><div class="afflArt"><span class="afflNoArt">No after art yet.</span></div><div class="afflCap">After</div></div></div>
 <div id="afflText"><div class="afflSec" id="afflStats"><div class="afflH">Stat changes</div><div class="afflRow"><span class="afflStat" style="color:#7ec45f">STR +2</span><span class="afflStat" style="color:#d1665c">ACC -10</span></div></div>
 <div class="afflSec" id="afflDraw"><div class="afflH">Drawbacks</div><ul><li class="afflLow">ACC -10</li><li class="afflTerm">Turns on its own side at 0 Health.</li></ul></div>
 <div class="afflSec" id="afflZero"><div class="afflH">At 0 Health</div><p>It becomes a Werewolf and fights for the enemy.</p></div></div></div>
 <div id="afflFoot"><button id="afflClose" type="button" class="pcBtn pcEnd">Continue</button></div></div></div>`

const server=await serve()
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']})
const errors=[]
try{
 const open=async encounter=>{const page=await browser.newPage({viewport:{width:1920,height:1080}});page.on('pageerror',e=>errors.push(String(e)))
  await page.goto(`http://127.0.0.1:${server.port}/${relative(ROOT,PAGE).replace(/\\/g,'/')}?play=${encounter}`)
  await page.waitForFunction(()=>window.__sandbox?.session&&window.__sandbox.viewer&&!window.__sandbox.busy&&window.__sandbox.viewer._V?.camera3d,null,{timeout:180000})
  let quiet=0;for(let n=0;n<200&&quiet<5;n++){await page.waitForTimeout(100);quiet=await page.evaluate(()=>window.__sandbox.busy)?0:quiet+1}
  return page}
 const read=(page,sel)=>page.evaluate(`${READ}(${JSON.stringify(sel)})`)
 /** stand one of the page's own pieces on the battle screen: in the board's frame, or over the whole screen (the pop-up) */
 const stand=(page,html,where)=>page.evaluate(([html,where])=>{document.querySelectorAll('[data-probe]').forEach(n=>n.remove());const V=window.__sandbox.viewer._V,host=where==='root'?V.dom.root:V.dom.stage.parentNode
  const t=document.createElement('template');t.innerHTML=html.trim();const n=t.content.firstElementChild;n.setAttribute('data-probe','1');host.appendChild(n)},[html,where])
 const away=page=>page.evaluate(()=>document.querySelectorAll('[data-probe]').forEach(n=>n.remove()))
 /** play cues of the page's own (viewer.plates-and-banners-sit-low: a piece's place is the page's to give) and wait for it to stand */
 const cue=(page,cues,ms=320,sels=[])=>page.evaluate(`(async()=>{const cues=${JSON.stringify(cues)},V=window.__sandbox.viewer._V,hero=Object.values(V.S.U).find(u=>u.side==='hero').id;V.playCues(cues.map(c=>c.id==='HERO'?{...c,id:hero}:c));await new Promise(r=>setTimeout(r,${ms}));const R=${READ};return [${sels.map(s=>'R('+JSON.stringify(s)+')').join(',')}]})()`)   // the cue, the wait and the reading in ONE call of the page: a reading that came late under load found the piece already gone
 const shot=async(page,name)=>{if(!SHOTS)return
  await page.waitForFunction(()=>!document.querySelector('#terrainLoading'),null,{timeout:150000}).catch(()=>say('the 3D map was still loading at the screenshot'))
  await page.waitForTimeout(1500)
  const file=resolve(SHOTS,name+'.png');mkdirSync(SHOTS,{recursive:true})
  /* the frame loop held for the shot: tools/still-shot.mjs (viewer.screenshot-time-out-under-load) — was held here, inline */
  await stillShot(page,page,{path:file,timeout:100000});say('screenshot',relative(process.cwd(),file).replace(/\\/g,'/'))}

 /** the six, measured on one page; `board` names the board for the shots */
 async function six(page,board){
  const frame=(await read(page,'#boardwrap')).box,screen=(await read(page,'.kingdom-battle')).box
  const mid=x=>(x.l+x.r)/2
  // 1. a phase banner and a wave banner: at the top of the board, centred
  for(const [kind,text,sub] of [['phase','Hero Phase','your heroes act'],['wave','A wave arrives','Skeleton Archer · Skeleton Archer']]){
   /* was: await stand(page,BANNER(kind,text,sub)) … assert.ok(Math.abs(R.box.t-frame.t-18)<=1.5,'the banner is 18 px under the top of the board, as before') */
   const [R]=await cue(page,[{k:'banner',kind,text,sub}],320,['.banner']);bare(R,'the '+kind+' banner')
   assert.ok(Math.abs(mid(R.box)-mid(frame))<=2,`the ${kind} banner is centred across the board`);assert.ok(R.box.b<=frame.b&&frame.b-R.box.b<=140,`the ${kind} banner is in the band just above the action bar (${(frame.b-R.box.b).toFixed(0)} px over the frame's foot)`)
   if(board==='light')say(`the ${kind} banner: "${text}" in gold, outlined, nothing behind it, in the band above the action bar`)
   await shot(page,`${kind}-banner-${board}-board`)}
  // 2. the Deathbed plate, standing and falling: in the middle of the board, over the dimmed screen
  for(const [name,html] of [['stood',DEATHBED],['fell',FELL]]){
   /* was: await stand(page,html) … assert.ok(…'the Deathbed plate is in the middle of the board, as before') */
   void html;const [R,VE]=await cue(page,[{k:'deathbed',id:'HERO',result:name,n:12,chance:40}],1300,['.dbPlate','.dbModal .dbVeil']),veil=VE.box;bare(R,'the Deathbed plate ('+name+')')
   assert.ok(Math.abs(mid(R.box)-mid(frame))<=2&&R.box.b<=frame.b&&frame.b-R.box.b<=140,'the Deathbed plate is in the band just above the action bar');assert.ok(!/^rgba\(0, 0, 0, 0\)$/.test(veil.bg),'over the dimmed screen that holds the game')
   if(board==='light'&&name==='stood')say(`the Deathbed plate: ${R.parts.filter(p=>p.own).length} lines in gold, outlined, no plate behind them, in the band above the action bar over the dimmed screen`)
   await shot(page,`deathbed-${name}-${board}-board`)}
  // 3. an injury plate
  /* was: await stand(page,INJURY) … assert.ok(…'the injury plate stands where it is put') */
  await page.waitForTimeout(1500);void INJURY;{const [R]=await cue(page,[{k:'injury',id:'HERO',name:'Broken Arm'}],250,['.injPlate']);bare(R,'the injury plate');assert.ok(Math.abs(mid(R.box)-mid(frame))<=2&&R.box.b<=frame.b&&frame.b-R.box.b<=140,'the injury plate is in the band just above the action bar')
   if(board==='light')say('the injury plate: "'+R.box.text+'" in gold, outlined, nothing behind it');await shot(page,`injury-plate-${board}-board`)}
  // 4. the affliction pop-up: over the whole screen, its cards' frames and its Continue kept
  await stand(page,AFFLICTION,'root');{const R=await read(page,'#afflPop[data-probe] #afflBox'),pop=(await read(page,'#afflPop[data-probe]')).box
   const words=bare(R,'the affliction pop-up',{keep:['afflArt','pcBtn','button'],figures:['afflStat']})
   const art=R.parts.filter(p=>p.cls.split(/\s+/).includes('afflArt')),btn=R.parts.find(p=>p.cls.includes('pcBtn'))
   assert.equal(art.length,2,'its two cards');for(const a of art)assert.ok(Math.max(...a.border)>0,'a card keeps its frame');assert.ok(btn&&btn.shown&&Math.max(...btn.border)>0,'its Continue is a button still')
   const stats=R.parts.filter(p=>p.cls.split(/\s+/).includes('afflStat'));assert.deepEqual(stats.map(p=>p.color),['rgb(126, 196, 95)','rgb(209, 102, 92)'],'a raised stat green, a lowered one red, as the stat block has them');for(const p of stats)assert.ok(clear(p),'no box round a stat')
   assert.ok(pop.w>=screen.w-1&&pop.h>=screen.h-1,'it covers the battle screen, as before');assert.ok(Math.abs(mid(R.box)-mid(pop))<=2,'centred on it')
   if(board==='light')say(`the affliction pop-up: ${words} pieces of words in gold, outlined, no box behind them; its two cards framed, its Continue a button, its raised and lowered stats green and red`)
   await shot(page,`affliction-pop-up-${board}-board`)}
  await away(page)
  // 5. the hex tooltip: the page's own, raised by the mouse over the board
  let tip=null
  for(const [fx,fy] of [[.5,.5],[.4,.6],[.6,.4],[.3,.5],[.7,.6]]){await page.mouse.move(frame.l+frame.w*fx,frame.t+frame.h*fy);await page.waitForTimeout(120)
   const R=await read(page,'#hexTip');if(R&&R.box.shown){tip=R;break}}
  assert.ok(tip,'the hex tooltip comes up under the mouse');bare(tip,'the hex tooltip');assert.ok(tip.box.t>=frame.t&&tip.box.b<=frame.b+.5&&tip.box.l>=frame.l-.5&&tip.box.r<=frame.r+.5,'inside the battle area, as before')
  if(board==='light')say(`the hex tooltip: "${tip.parts.find(p=>p.own).text}" in gold, outlined, nothing behind it, at the hex pointed at`)
  await shot(page,`hex-tooltip-${board}-board`)
  await page.mouse.move(5,5)
 }
 const page=await open('encounter.opening.orphanage')
 await six(page,'light')
 // 6. the gear panel was not asked about: its box as it was (the page's own stylesheet, on the page's own markup)
 await stand(page,'<div id="playGear"><div id="playGearBox"><p id="playGearTitle">Iron Dwarf</p></div></div>','root')
 {const g=(await read(page,'#playGear[data-probe] #playGearBox')).box;assert.equal(g.bg,'rgb(21, 18, 13)','the gear panel keeps its box');assert.ok(Math.max(...g.border)>0,'and its border');say('the gear panel keeps its box and border')}
 await away(page);await page.close()
 if(SHOTS){const dark=await open('encounter.opening.cavern-trail');await six(dark,'busy');await dark.close()}
 assert.deepEqual(errors,[],'no page errors')
}finally{await browser.close();server.stop()}
console.log('plates-banners-tooltip-gold-look: a phase banner, a wave banner, the Deathbed plate, an injury plate, the hex tooltip and the affliction pop-up are gold outlined letters with nothing behind the words, each in its own place; the gear panel is unchanged - passed')
