// viewer.affliction-pop-up (engine DECISIONS.md 2026-10-01 'the afflictions at 0 Health: ... the first-affliction pop-up').
// The item's expect, on the BUILT sandbox: "In a sandbox battle where a hero is first afflicted, the pop-up shows that hero's
// before and after art and the three explanations, and the battle resumes when it is closed." The battle is the sandbox's own
// as it opens (BATTLE-SANDBOX.html, Start: three heroes against two Zombies and two Skeletons on the Sunken Priory, seed 1),
// played by its own buttons — Activate hero, End activation, Show current state — until a Zombie's bite afflicts a hero with
// Rotting Flesh (kingdom SWITCHES.md afflictionPopUpBattle). The bite itself is played by the pump, from the start of the
// biting enemy's Activation, so the pop-up is the one a player meets. Layout and loaded pictures are the browser's, so this
// drives the page in real Chrome (playwright-core, as tools/bar-card-and-log.verify.mjs does) at 1920 x 1080 over a local
// server, closes the pop-up with the real mouse and saves a screenshot of the pop-up it checked.
//
//   node tools/affliction-pop-up.verify.mjs <page.html> [screenshot.png]   prints one line per check and `affliction-pop-up: … passed`
import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
import {createServer} from 'node:net'
import {spawn} from 'node:child_process'
import {resolve,dirname,relative} from 'node:path'
import {fileURLToPath} from 'node:url'
import {mkdirSync} from 'node:fs'

const here=dirname(fileURLToPath(import.meta.url)),ROOT=resolve(here,'../..')
const PAGE=resolve(process.argv[2]??'BATTLE-SANDBOX.html'),SHOT=resolve(process.argv[3]??resolve(here,'../scratch/affliction-pop-up.png'))
const {chromium}=createRequire(resolve(ROOT,'engine/package.json'))('playwright-core')
const T0=Date.now(),say=(...a)=>console.log('  '+a.join(' ')+`  [${((Date.now()-T0)/1000).toFixed(0)} s]`)

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
 const page=await browser.newPage({viewport:{width:1920,height:1080}})
 page.on('pageerror',e=>errors.push(String(e)))
 await page.goto(`http://127.0.0.1:${server.port}/${relative(ROOT,PAGE).replace(/\\/g,'/')}`)
 await page.waitForFunction(()=>!!document.querySelector('[data-act="start"]'),null,{timeout:120000})
 const press=act=>page.evaluate(a=>{const b=document.querySelector(`#commands [data-act="${a}"],[data-act="${a}"]`);if(!b||b.hasAttribute('disabled'))return false;b.click();return true},act)
 assert.ok(await press('start'),'Start battle');say('the page is up, Start pressed')
 await page.waitForFunction(()=>window.__sandbox?.session&&window.__sandbox.viewer,null,{timeout:120000})
 /* what the page holds: the engine's log, the board's cursor, the first affliction a hero gains and the Activation it comes in */
 const look=()=>page.evaluate(()=>{const h=window.__sandbox,s=h.session,ev=s.ctx.events,v=h.viewer
  const gain=ev.findIndex(e=>e.type==='badge.gained'&&e.atZero)
  let from=-1;if(gain>=0)for(let i=gain;i>=0;i--)if(ev[i].type==='activation.begin'){from=i;break}
  return {busy:h.busy,fault:h.fault,at:s.ctx.battleCursor?.at??null,outcome:s.ctx.state.outcome??null,turn:s.ctx.state.turn,events:ev.length,cursor:v.cursor,gain,from,
   pop:!!document.querySelector('#afflPop'),config:s.config}})
 let s=await look(),commands=0
 assert.deepEqual({map:s.config.mapId,heroes:s.config.heroes.length,enemies:s.config.enemies,seed:s.config.seed},{map:'showcase.atlas-priory',heroes:3,enemies:['unit.zombie','unit.zombie','unit.skeleton','unit.skeleton'],seed:1},'the sandbox\'s own battle, as it opens')
 // play it by its buttons: every hero is begun and ended, the enemies answer, until a bite afflicts. The buttons are pressed
 // in the page, one after another with no frame painted between (62 commands, each resolved and shown at once), so a loaded
 // machine's software GL is not asked for sixty pictures nobody looks at
 const played=await page.evaluate(()=>{const h=window.__sandbox,press=a=>{const b=document.querySelector(`[data-act="${a}"]`);if(!b||b.hasAttribute('disabled'))return false;b.click();return true}
  let commands=0,why=''
  for(let n=0;n<1200;n++){const s=h.session
   if(s.ctx.events.some(e=>e.type==='badge.gained'&&e.atZero))break
   if(h.fault){why='fault: '+h.fault;break}
   if(s.ctx.state.outcome){why='the battle ended '+s.ctx.state.outcome+' at Turn '+s.ctx.state.turn;break}
   if(h.busy){press('skip');continue}                       /* Show current state */
   const act=s.ctx.battleCursor?.at==='selecting'?'select':'end'  /* Activate hero · End activation */
   if(!press(act)){why='the '+act+' button could not be pressed';break}
   commands++}
  return {commands,why}})
 assert.equal(played.why,'','the battle is played to a bite');commands=played.commands;s=await look()
 assert.ok(s.gain>=0,'a hero is afflicted');assert.equal(s.pop,false,'not shown before the bite is played');assert.ok(s.busy&&s.cursor<=s.gain,'the bite is yet to be played')
 const fact=await page.evaluate(i=>{const s=window.__sandbox.session,e=s.ctx.events[i],u=s.ctx.state.units[e.actor];return {e,name:u.name,typeId:u.typeId,side:u.side,badges:window.__sandbox.viewer._V.data.BADGES,units:Object.fromEntries(Object.entries(window.__sandbox.viewer._V.data.UD).map(([k,v])=>[k,v.name]))}},s.gain)
 assert.equal(fact.side,'hero');say(`after ${commands} commands, Turn ${s.turn}: ${fact.name} (${fact.typeId}) gains ${fact.e.name} from ${fact.e.causeId}`)
 // the pump plays the biting Activation; the pop-up stands when it reaches the gain
 await page.evaluate(i=>window.__sandbox.viewer.seek(i),s.from)
 await page.waitForFunction(()=>!!document.querySelector('#afflPop'),null,{timeout:90000})
 /* the screenshot shows the board drawn behind it: the 3D map is given up to 60 s (software GL here), then taken as it is */
 await page.waitForFunction(()=>!document.querySelector('#terrainLoading'),null,{timeout:60000}).catch(()=>say('the 3D map was still loading at the screenshot'))
 await page.evaluate(()=>window.__sandbox.viewer._V.dom.root.scrollIntoView())   /* the launcher page scrolled with its buttons: the battle screen whole, for the picture */
 await page.waitForFunction(()=>[...document.querySelectorAll('#afflPop img')].every(i=>i.complete&&i.naturalWidth>0),null,{timeout:30000})
 const read=()=>page.evaluate(()=>{const h=window.__sandbox,V=h.viewer._V,P=document.querySelector('#afflPop'),q=x=>P.querySelector(x)
  const box=n=>{if(!n)return null;const r=n.getBoundingClientRect();return {l:r.left,t:r.top,r:r.right,b:r.bottom,w:r.width,h:r.height}}
  const img=n=>n?{src:n.getAttribute('src'),w:n.naturalWidth,h:n.naturalHeight,box:box(n)}:null,art=V.data.ARTMAP[V.S.U[+P.dataset.unit].typeId]
  return {pop:box(P),plate:box(q('#afflBox')),screen:box(V.dom.root),title:q('#afflTitle').textContent,
   before:img(q('#afflBefore img')),after:img(q('#afflAfter img')),noArt:P.querySelectorAll('.afflNoArt').length,
   wantBefore:V.data.ASSETS[art.card],wantAfter:V.data.ASSETS[art.after?.[P.dataset.badge]],
   stats:[...P.querySelectorAll('#afflStats .afflStat')].map(n=>({stat:n.dataset.stat,n:+n.dataset.n,text:n.textContent})),
   lows:[...P.querySelectorAll('#afflDraw .afflLow')].map(n=>n.dataset.stat),terms:[...P.querySelectorAll('#afflDraw .afflTerm')].map(n=>n.textContent),
   heads:[...P.querySelectorAll('.afflH')].map(n=>n.textContent),zero:q('#afflZero').textContent,close:box(q('#afflClose')),
   over:[q('#afflBox'),...P.querySelectorAll('.afflSec')].filter(n=>n.scrollWidth>n.clientWidth+1||n.scrollHeight>n.clientHeight+1).length,
   top:(()=>{const b=q('#afflClose').getBoundingClientRect(),n=document.elementFromPoint(b.left+b.width/2,b.top+b.height/2);return n&&n.id})(),
   held:h.viewer.held,playing:h.viewer.playing,busy:h.busy,cursor:h.viewer.cursor,events:h.session.ctx.events.length}})
 let p=await read()
 // the pop-up: over the whole battle screen, naming the hero and the affliction
 assert.ok(p.pop.w>=p.screen.w-1&&p.pop.h>=p.screen.h-1,'it covers the battle screen');assert.ok(p.plate.l>=p.pop.l&&p.plate.r<=p.pop.r&&p.plate.t>=p.pop.t&&p.plate.b<=p.pop.b,'its plate is inside the screen')
 assert.ok(p.title.includes(fact.name)&&p.title.includes(fact.e.name),`names the hero and the affliction: ${p.title}`)
 // before and after: that hero's own card and its own afflicted card, both loaded, side by side, the same size
 assert.ok(p.before&&p.after&&p.noArt===0,'both cards are pictures');assert.equal(p.before.src,p.wantBefore,'before: the hero\'s card');assert.equal(p.after.src,p.wantAfter,'after: the hero\'s own after card for this affliction')
 assert.notEqual(p.before.src,p.after.src);assert.ok(p.before.w>0&&p.after.w>0,'both loaded')
 assert.ok(p.before.box.r<=p.after.box.l&&Math.abs(p.before.box.t-p.after.box.t)<1&&Math.abs(p.before.box.w-p.after.box.w)<1&&Math.abs(p.before.box.h-p.after.box.h)<1,'before left of after, the same size')
 say(`${p.title}: before ${p.before.w} x ${p.before.h}, after ${p.after.w} x ${p.after.h}, each shown ${p.before.box.w.toFixed(0)} x ${p.before.box.h.toFixed(0)}`)
 // the three explanations, every number the engine's line's
 assert.deepEqual(p.heads,['Stat changes','Drawbacks','At 0 Health'],'the three explanations')
 const mods=Object.entries(fact.e.mods).filter(([,n])=>n)
 assert.deepEqual(p.stats.map(r=>[r.stat,r.n]),mods,'the stat changes are the event\'s modifiers');for(const r of p.stats)assert.ok(r.text.includes(String(Math.abs(r.n))),r.text)
 /* Law 10, 2026-10-04 (engine fix.affliction-pop-up-words; engine DECISIONS.md 2026-10-03 "the affliction pop-up's 0-Health words and its
    drawbacks come from the engine": "Okay, do it that way."): these two lines read
      assert.deepEqual(p.lows,mods.filter(([,n])=>n<0).map(([k])=>k),'the drawbacks name every lowered stat');assert.deepEqual(p.terms,fact.e.gaps.map(…),'and the row\'s written terms')
      assert.deepEqual(fact.e.atZero,{deathbedFighting:true,gains:'badge.fragile'},'Rotting Flesh\'s 0-Health rule')
    — the page judging the drawbacks (every stat with a minus, every written term) and the rule's bare shape. The engine's line marks
    its drawbacks and carries the 0-Health text; the page shows exactly the marked terms and that text, whole, and nothing of its own. */
 assert.ok(fact.e.drawbacks&&fact.e.drawbacks.mods.length&&fact.e.drawbacks.gaps.length,'the engine\'s line marks its drawbacks')
 assert.deepEqual(p.lows,fact.e.drawbacks.mods,'the drawbacks name exactly the stats the line marks');assert.deepEqual(p.terms,fact.e.drawbacks.gaps.map(g=>g.replaceAll('`','')),'and exactly the written terms it marks, in its words')
 {const {text,...shape}=fact.e.atZero;assert.deepEqual(shape,{deathbedFighting:true,gains:'badge.fragile'},'Rotting Flesh\'s 0-Health rule');assert.equal(typeof text,'string')
  assert.equal(p.zero.replace('At 0 Health','').trim(),text,'the 0-Health paragraph is the line\'s own text, word for word')}
 assert.match(p.zero,/Deathbed Fighting/);assert.ok(p.zero.includes(fact.badges['badge.fragile'].name),p.zero)
 assert.equal(p.over,0,'nothing in the pop-up overflows');assert.equal(p.top,'afflClose','Continue is on top, clickable')
 say(`stat changes: ${p.stats.map(r=>r.text).join(', ')}`);say(`drawbacks: ${p.lows.length} lowered stats, ${p.terms.length} written terms`);say(`at 0 Health: ${p.zero.replace('At 0 Health','').trim()}`)
 // the battle pauses on it
 assert.ok(p.held&&p.playing&&p.busy,'the pump is held, the battle waits');assert.equal(p.cursor,s.gain+1,'held right after the gain')
 await page.waitForTimeout(2500);assert.equal((await read()).cursor,p.cursor,'2.5 s on, the battle has not moved')
 say('the pop-up checked; taking its picture')
 await page.screenshot({path:(mkdirSync(dirname(SHOT),{recursive:true}),SHOT),timeout:100000,animations:'disabled'})   /* software GL under a loaded gate: a frame can take long */
 // closed with the mouse, the battle resumes: what was left of the Enemy Phase plays out and the next hero may be begun
 await page.mouse.click(p.close.l+p.close.w/2,p.close.t+p.close.h/2)
 await page.waitForFunction(()=>!document.querySelector('#afflPop'),null,{timeout:5000})
 await page.waitForFunction(c=>window.__sandbox.viewer.cursor>c,p.cursor,{timeout:20000})
 for(let n=0;n<8&&(await look()).busy;n++){await page.waitForTimeout(400);if((await look()).pop)break;await press('skip')}
 s=await look();assert.equal(s.fault,'');assert.equal(s.busy,false,'the resolved actions finished');assert.equal(s.cursor,s.events,'the board is at the battle\'s latest event')
 if(!s.outcome){assert.ok(await press(s.at==='selecting'?'select':'end'),'the next command is taken');assert.ok((await look()).events>s.events,'the battle goes on')}
 say(`closed: the battle resumed and played on to event ${s.cursor} of ${s.events}`)
 assert.deepEqual(errors,[],'no page errors')
 say('screenshot',relative(process.cwd(),SHOT).replace(/\\/g,'/'))
}finally{await browser.close();server.stop()}
console.log('affliction-pop-up: a hero first afflicted in the sandbox\'s own battle — the pop-up with that hero\'s before and after art and the three explanations, the battle held while it stands and resumed when it is closed passed')
