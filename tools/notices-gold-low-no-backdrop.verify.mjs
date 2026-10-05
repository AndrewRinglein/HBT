// viewer.notices-gold-low-no-backdrop (engine DECISIONS.md 2026-10-05 'the playtest post answered: every notice gold and low ...',
// Andrew: "The notifications are in a very awkward spot. The fact that they have a backdrop makes them take up a lot more space.
// I was imagining this as gold and bright text with no backdrop. Also, let's drop it lower down on the screen so it's right
// above the bottom of the screen." - "I don't like the way it is for anything."). The item's expect, on the BUILT sandbox in a
// real browser (Chrome through playwright-core, 1920 x 1080, as tools/bar-card-and-log.verify.mjs): a tutorial lesson, "No
// remaining actions possible." and "New enemy" each show as gold bright text with NOTHING drawn behind the letters, just above
// the bottom of the board and never over the action bar; they do not lie over one another; the End Turn question keeps its
// buttons and has no box behind its words; the kingdom's own notices (the gold line of a screen between battles, a draft's
// message, the Skip tutorial question) take the same lettering from the page's stylesheet.
// What is measured is the browser's own computed style and layout - a colour, a background, a border, a shadow, a rectangle.
//
//   node tools/notices-gold-low-no-backdrop.verify.mjs <page.html> [shots-folder]
// With a folder it also saves a screenshot of each notice over a light board and a dark one (the Orphanage, the Cavern Trail);
// the page's frame loop is held still for each shot (a full-page shot of a 3D scene redrawing on software GL takes many
// seconds a frame). Without one it takes none: the gate runs it so (viewer SWITCHES noticeShots).
// Prints one line per reading and `notices-gold-low-no-backdrop: ... passed`.
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
const LESSON='Use your hero to protect the civilians.',NO_ACTIONS='No remaining actions possible.',NEW_ENEMY=['New enemy','Zombie','This enemy can poison with its claws.']

const freePort=()=>new Promise((ok,no)=>{const s=createServer();s.on('error',no);s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>ok(p))})})
async function serve(){
 const port=await freePort(),child=spawn(process.execPath,[resolve(ROOT,'tools/battle-atlas/serve.mjs'),String(port)],{cwd:ROOT,stdio:['ignore','pipe','pipe']})
 await new Promise((ok,no)=>{let out='';const t=setTimeout(()=>no(Error('the battle server did not start: '+out)),30000)
  child.stdout.on('data',d=>{out+=d;if(/Battle Atlas/.test(out)){clearTimeout(t);ok()}});child.stderr.on('data',d=>{out+=d});child.on('exit',c=>{clearTimeout(t);no(Error('the battle server exited '+c+': '+out))})})
 return {port,stop:()=>child.kill()}
}
/** in the page: what the browser computed for an element - what is drawn behind its letters, their colour, where it is */
const READ=`(sel=>{const n=typeof sel==='string'?document.querySelector(sel):sel;if(!n)return null;const c=getComputedStyle(n),r=n.getBoundingClientRect()
 return {shown:c.display!=='none'&&r.width>0&&r.height>0,color:c.color,bg:c.backgroundColor,image:c.backgroundImage,border:[c.borderTopWidth,c.borderRightWidth,c.borderBottomWidth,c.borderLeftWidth].map(parseFloat),
  shadow:c.boxShadow,outline:parseFloat(c.outlineWidth)||0,outlineStyle:c.outlineStyle,textShadow:c.textShadow,weight:+c.fontWeight,size:parseFloat(c.fontSize),text:n.textContent,
  l:r.left,t:r.top,r:r.right,b:r.bottom,w:r.width,h:r.height}})`
/** nothing behind the letters: no fill, no picture, no border, no box shadow, no outline; gold and bright, outlined */
function bare(x,what){
 assert.ok(x&&x.shown,what+' is shown')
 assert.ok(/^rgba\(0, 0, 0, 0\)$|^transparent$/.test(x.bg),`${what}: nothing is filled behind the letters (${x.bg})`);assert.equal(x.image,'none',what+': no picture behind them')
 assert.deepEqual(x.border,[0,0,0,0],what+': no border');assert.equal(x.shadow,'none',what+': no box shadow');assert.ok(x.outlineStyle==='none'||x.outline===0,what+': no outline box')
 assert.equal(x.color,GOLD,what+': gold, bright');assert.notEqual(x.textShadow,'none',what+': an outline and a soft shadow on the letters');assert.ok(x.weight>=600,what+': bold')
}
const meet=(a,b)=>a.l<b.r-.5&&b.l<a.r-.5&&a.t<b.b-.5&&b.t<a.b-.5

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
 /** a still page for a shot: the frame loop held, the shot taken, the loop let go */
 const shot=async(page,name)=>{if(!SHOTS)return
  await page.waitForFunction(()=>!document.querySelector('#terrainLoading'),null,{timeout:150000}).catch(()=>say('the 3D map was still loading at the screenshot'))
  await page.waitForTimeout(2500)
  const file=resolve(SHOTS,name+'.png');mkdirSync(SHOTS,{recursive:true})
  /* the frame loop held for the shot: tools/still-shot.mjs (viewer.screenshot-time-out-under-load) — was held here, inline */
  await stillShot(page,page,{path:file,timeout:100000});say('screenshot',relative(process.cwd(),file).replace(/\\/g,'/'))}

 const page=await open('encounter.opening.orphanage')
 const frame=await read(page,'#boardwrap'),bar=await read(page,'#barrow'),stack0=await read(page,'#noticeStack')
 assert.ok(frame&&bar,'the board\'s frame and the action bar\'s row are on the page');assert.ok(bar.t>=frame.b-.5,'the action bar is below the board\'s frame')
 /** where a notice may stand: centred across the board, its foot just above the frame's bottom edge, never over the bar */
 const low=(x,what)=>{assert.ok(Math.abs((x.l+x.r)/2-(frame.l+frame.r)/2)<=2,`${what}: centred across the board (${((x.l+x.r)/2).toFixed(0)} against ${((frame.l+frame.r)/2).toFixed(0)})`)
  assert.ok(x.b<=frame.b+.5&&x.b>=frame.b-60,`${what}: just above the bottom of the board (its foot ${(frame.b-x.b).toFixed(0)} px above the edge)`)
  assert.ok(x.t>=frame.t+frame.h/2,what+': in the lower half');assert.equal(meet(x,bar),false,what+': not over the action bar');assert.ok(x.b<=bar.t+.5)}

 // 1. a tutorial lesson
 await page.evaluate(w=>{window.__sandbox.viewer.tell([w],{ms:600000})},LESSON)
 let lesson=await read(page,'#tutNotice'),line=await read(page,'#tutNotice b')
 bare(lesson,'the lesson');bare(line,'the lesson\'s line');low(lesson,'the lesson');assert.equal(lesson.text,LESSON);assert.ok(line.size>=28,'large enough to read at a glance')
 say(`a lesson: gold ${line.size}px letters, nothing behind them, ${lesson.w.toFixed(0)} x ${lesson.h.toFixed(0)} at (${lesson.l.toFixed(0)}, ${lesson.t.toFixed(0)}) - its foot ${(frame.b-lesson.b).toFixed(0)} px above the board's bottom edge, ${(bar.t-lesson.b).toFixed(0)} px above the bar`)
 await shot(page,'lesson-light-board')
 // 2. "No remaining actions possible." beside it: its own line of the stack, not over the lesson
 await page.evaluate(w=>{window.__sandbox.viewer.notice(w)},NO_ACTIONS)
 const none=await read(page,'#playNotice');lesson=await read(page,'#tutNotice')
 bare(none,'"No remaining actions possible."');assert.equal(none.text,NO_ACTIONS);assert.ok(none.size>=20)
 assert.equal(meet(none,lesson),false,'the two notices do not lie over one another');assert.ok(none.b<=lesson.t+.5,'the host\'s notice stands above the lesson');low(lesson,'the lesson, with another notice up')
 assert.equal(meet(none,bar),false);assert.ok(Math.abs((none.l+none.r)/2-(frame.l+frame.r)/2)<=2,'centred');assert.ok(none.t>=frame.t+frame.h/2,'in the lower half')
 say(`"${NO_ACTIONS}": gold ${none.size}px letters, nothing behind them, above the lesson (its foot ${(frame.b-none.b).toFixed(0)} px above the board's bottom edge)`)
 await page.evaluate(()=>{window.__sandbox.viewer.clearTell()})
 const alone=await read(page,'#playNotice');low(alone,'"No remaining actions possible." alone');await shot(page,'no-remaining-actions-light-board')
 // 3. "New enemy": three lines
 await page.evaluate(w=>{window.__sandbox.viewer.tell(w,{ms:600000})},NEW_ENEMY)
 const enemy=await read(page,'#tutNotice');bare(enemy,'"New enemy"');assert.equal(meet(enemy,bar),false);assert.ok(enemy.b<=frame.b+.5&&enemy.b>=frame.b-60,'"New enemy": just above the bottom of the board')
 const lines=await page.evaluate(`[...document.querySelectorAll('#tutNotice b')].map(${READ})`);assert.deepEqual(lines.map(x=>x.text),NEW_ENEMY);for(const x of lines)bare(x,'"New enemy" line "'+x.text+'"')
 say(`"New enemy": three lines, ${enemy.w.toFixed(0)} x ${enemy.h.toFixed(0)}, nothing behind them, its foot ${(frame.b-enemy.b).toFixed(0)} px above the board's bottom edge`)
 await shot(page,'new-enemy-light-board')
 await page.evaluate(()=>{window.__sandbox.viewer.clearTell()})
 // 4. the End Turn question: its buttons kept, no box behind its words
 const end=await read(page,'#playEndTurn');assert.ok(end&&end.shown,'End Turn is on the screen')
 await page.mouse.click(end.l+end.w/2,end.t+end.h/2);await page.waitForTimeout(200)
 const ask=await read(page,'#playAsk')
 if(ask&&ask.shown){const box=await read(page,'#playAskBox'),words=await read(page,'#playAskText'),yes=await read(page,'#playAskYes'),no=await read(page,'#playAskNo')
  assert.ok(/^rgba\(0, 0, 0, 0\)$/.test(box.bg),'the question: no box filled behind its words ('+box.bg+')');assert.deepEqual(box.border,[0,0,0,0],'no border round them');assert.equal(box.shadow,'none')
  bare(words,'the question\'s words');assert.ok(yes.shown&&no.shown,'its buttons are kept');assert.ok(Math.max(...yes.border)>0&&Math.max(...no.border)>0,'and are still buttons')
  say(`the End Turn question: "${words.text}" in the notice's lettering, no box behind it, its two buttons kept`)
  await page.mouse.click(no.l+no.w/2,no.t+no.h/2);await page.waitForTimeout(150)}
 else say('the End Turn question did not come up (nobody is left to act): its look is held by the viewer\'s page test')
 // 5. the kingdom's own notices take the same lettering from this page's stylesheet: the markup the kingdom writes, measured
 const own=await page.evaluate(`(()=>{const host=document.createElement('div');host.className='sliceView';host.innerHTML='<p class="lessonLine" data-lesson="probe" role="note">Choose who goes to the next battle.</p><p class="draftNotice" data-draft-notice="2" role="note">A second hero joins you.</p><span id="skipAsk" role="alertdialog" style="padding:6px 0">Skip every tutorial message for this run?</span>'
  document.body.appendChild(host);const R=${READ},out={line:R(host.querySelector('.lessonLine')),draft:R(host.querySelector('.draftNotice')),skip:R(host.querySelector('#skipAsk')),vh:window.innerHeight,vw:window.innerWidth};host.remove();return out})()`)
 bare(own.line,'the gold line of a screen between battles');bare(own.draft,'a draft\'s message');bare(own.skip,'the Skip tutorial question')
 assert.ok(own.line.b<=own.vh&&own.line.b>=own.vh-40,`the gold line stands just above the bottom of the screen (its foot ${(own.vh-own.line.b).toFixed(0)} px above it)`);assert.ok(Math.abs((own.line.l+own.line.r)/2-own.vw/2)<=2,'centred')
 say(`the kingdom's notices: the gold line of a screen between battles ${(own.vh-own.line.b).toFixed(0)} px above the bottom of the screen, a draft's message and the Skip tutorial question - the same gold letters, nothing behind them`)
 await page.close()
 // 6. the same three over a dark board, for the eye (only when a folder for the shots was given)
 if(SHOTS){const dark=await open('encounter.opening.cavern-trail')
  await dark.evaluate(w=>{window.__sandbox.viewer.tell([w],{ms:600000})},LESSON);bare(await read(dark,'#tutNotice b'),'the lesson over the dark board');await shot(dark,'lesson-dark-board')
  await dark.evaluate(()=>{window.__sandbox.viewer.clearTell()});await dark.evaluate(w=>{window.__sandbox.viewer.notice(w)},NO_ACTIONS);await shot(dark,'no-remaining-actions-dark-board')
  await dark.evaluate(w=>{window.__sandbox.viewer.tell(w,{ms:600000})},NEW_ENEMY);await shot(dark,'new-enemy-dark-board');await dark.close()}
 assert.deepEqual(errors,[],'no page errors')
}finally{await browser.close();server.stop()}
console.log('notices-gold-low-no-backdrop: a lesson, "No remaining actions possible." and "New enemy" are gold letters with nothing behind them, just above the bottom of the board and clear of the action bar; the question keeps its buttons and has no box; the kingdom\'s own notices take the same lettering - passed')
