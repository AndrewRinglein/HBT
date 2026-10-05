// viewer.bar-card-and-log (engine DECISIONS.md 2026-10-03 'the hero card sits small, left of the action bar; the log collapses
// behind a button out of the way'). The item's expect, on the BUILT sandbox (the page PLAY.html's Orphanage card opens:
// BATTLE-SANDBOX.html?play=encounter.opening.orphanage): "at a 1920-wide window: the portrait card sits left of the Move row inside
// the bar, no taller than the bar and smaller than before; the three columns start right of it and fit without overflow; on load
// no log panel covers the board, and the log button opens and closes it." Sizes are layout, so this drives the page in a real
// browser (Chrome, through playwright-core, as tools/shield-dblclick.verify.mjs does) at 1920 x 1080 over a local server, clicks
// the log button with the real mouse and saves a screenshot of the screen it checked.
//
//   node tools/bar-card-and-log.verify.mjs <page.html> [screenshot.png]   prints one line per check and `bar-card-and-log: … passed`
import {stillShot,lastStill} from './still-shot.mjs'   // viewer.screenshot-time-out-under-load: the page's frame loop is held for the shot
import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
import {createServer} from 'node:net'
import {spawn} from 'node:child_process'
import {resolve,dirname,relative} from 'node:path'
import {fileURLToPath} from 'node:url'
import {mkdirSync} from 'node:fs'

const here=dirname(fileURLToPath(import.meta.url)),ROOT=resolve(here,'../..')
const PAGE=resolve(process.argv[2]??'BATTLE-SANDBOX.html'),SHOT=resolve(process.argv[3]??resolve(here,'../scratch/bar-card-and-log.png'))
const {chromium}=createRequire(resolve(ROOT,'engine/package.json'))('playwright-core')
const say=(...a)=>console.log('  '+a.join(' '))
const OLD={w:171,h:256}                                  /* the card of 2026-10-01 'the XCOM-style camera', in screen px at scale 1 */

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
 await page.goto(`http://127.0.0.1:${server.port}/${relative(ROOT,PAGE).replace(/\\/g,'/')}?play=encounter.opening.orphanage`)
 await page.waitForFunction(()=>window.__sandbox?.session&&window.__sandbox.viewer&&!window.__sandbox.busy&&window.__sandbox.viewer._V?.camera3d,null,{timeout:180000})
 let quiet=0;for(let n=0;n<200&&quiet<5;n++){await page.waitForTimeout(100);quiet=await page.evaluate(()=>window.__sandbox.busy)?0:quiet+1}
 const look=()=>page.evaluate(()=>{const V=window.__sandbox.viewer._V,root=V.dom.root,q=s=>root.querySelector(s)
  const box=n=>{if(!n)return null;const r=n.getBoundingClientRect();return {l:r.left,t:r.top,r:r.right,b:r.bottom,w:r.width,h:r.height}}
  const vis=n=>!!n&&getComputedStyle(n).display!=='none'&&n.getBoundingClientRect().width>0
  const rows=[...q('#actionbar').querySelectorAll('.acRow')]
  const over=[q('#actionbar'),...rows,...q('#actionbar').querySelectorAll('.acName')].filter(n=>n.scrollWidth>n.clientWidth+1||n.scrollHeight>n.clientHeight+1).map(n=>n.dataset?.act||n.id||n.className+' '+n.textContent)
  return {scale:q('#screen')?q('#screen').getBoundingClientRect().width/1920:root.getBoundingClientRect().width/1920,
   card:box(q('#unitPortrait')),cardShown:vis(q('#unitPortrait')),bar:box(q('#actionbar')),board:box(q('#boardwrap')),left:box(q('#left')),
   cols:[...new Set(rows.map(n=>Math.round(n.getBoundingClientRect().left)))].sort((a,b)=>a-b).map(x=>rows.filter(n=>Math.round(n.getBoundingClientRect().left)===x).map(box)),rows:rows.length,over,
   log:box(q('#playLog')),logShown:vis(q('#playLog')),btn:box(q('#playLogBtn')),pressed:q('#playLogBtn')?.getAttribute('aria-pressed'),
   acting:V.S.activeId,cardOf:q('#unitPortrait img')?.getAttribute('src')===V.data.ASSETS[V.data.ARTMAP[V.S.U[V.S.activeId].typeId].card]}})
 const meet=(a,b)=>a.l<b.r-.5&&b.l<a.r-.5&&a.t<b.b-.5&&b.t<a.b-.5
 let s=await look()
 assert.ok(s.cardShown&&s.cardOf,'the acting hero\'s card is shown')
 // the card: in the bar's row, left of the Move column, no taller than the bar, smaller than before
 assert.ok(s.card.t>=s.bar.t-.5&&s.card.b<=s.bar.b+.5,`the card lies inside the bar's height: ${s.card.t.toFixed(0)}..${s.card.b.toFixed(0)} in ${s.bar.t.toFixed(0)}..${s.bar.b.toFixed(0)}`)
 assert.ok(s.card.h<=s.bar.h+.5,'no taller than the bar')
 assert.ok(s.card.w<OLD.w*s.scale&&s.card.h<OLD.h*s.scale,`smaller than the ${OLD.w} x ${OLD.h} card: ${s.card.w.toFixed(0)} x ${s.card.h.toFixed(0)} at scale ${s.scale.toFixed(3)}`)
 assert.equal(meet(s.card,s.board),false,'the card is off the board')
 say(`the card ${s.card.w.toFixed(0)} x ${s.card.h.toFixed(0)} at (${s.card.l.toFixed(0)}, ${s.card.t.toFixed(0)}), inside the bar's ${s.bar.h.toFixed(0)} px row`)
 // the columns: start right of the card, fit without overflow
 assert.ok(s.rows===12&&s.cols.length===3,'twelve slots, three columns')
 const L=s.cols.map(c=>Math.min(...c.map(b=>b.l))),R=s.cols.map(c=>Math.max(...c.map(b=>b.r)))
 assert.ok(L[0]>=s.card.r,`the Move column starts right of the card: ${L[0].toFixed(0)} vs ${s.card.r.toFixed(0)}`)
 assert.ok(L[0]<L[1]&&L[1]<L[2],'Move, then attacks, then powers, left to right')
 assert.ok(R[2]<=s.bar.r+.5&&R[2]<=s.left.r+.5,`the last column ends inside the bar: ${R[2].toFixed(0)} vs ${s.bar.r.toFixed(0)}`)
 assert.deepEqual(s.over,[],'no column, no row overflows, no name of an action is cut short')
 say(`the columns at x ${L.map(x=>x.toFixed(0)).join(', ')}, ${(R[0]-L[0]).toFixed(0)} px wide, none overflowing`)
 // the log: collapsed on load, the button opens and closes it, open it never covers the board
 assert.equal(s.logShown,false,'on load no log panel');assert.equal(s.pressed,'false')
 assert.ok(s.btn&&!meet(s.btn,s.board),'the log button is off the board')
 /* the screenshot shows the board drawn: the 3D map is given up to 90 s (software GL here), then the screen is taken as it is */
 await page.waitForFunction(()=>!document.querySelector('#terrainLoading'),null,{timeout:90000}).catch(()=>say('the 3D map was still loading at the screenshot'))
 await page.waitForTimeout(500)
 /* viewer.screenshot-time-out-under-load (2026-10-05): this shot stalled past its 30 s under a full run — the 3D board draws a
    frame every frame, software GL takes seconds a frame, and the shot waited behind the frames under way and every new one.
    The page's frame loop is held, the page is waited on until it stands still, and only then is the shot taken
    (tools/still-shot.mjs); the loop is let go after it. What is checked, before and after, is what it was. */
 const shotMs=await stillShot(page,page,{path:(mkdirSync(dirname(SHOT),{recursive:true}),SHOT)})
 say(`the page stood still ${lastStill.settleMs} ms after its frame loop was held (${lastStill.frames} frames${lastStill.still?'':', NOT still at the limit'}); the screenshot then took ${shotMs} ms`)
 await page.mouse.click(s.btn.l+s.btn.w/2,s.btn.t+s.btn.h/2);await page.waitForTimeout(200);s=await look()
 assert.equal(s.logShown,true,'the log button opens it');assert.equal(s.pressed,'true')
 assert.equal(meet(s.log,s.board),false,`the open log does not cover the board: (${s.log.l.toFixed(0)}, ${s.log.t.toFixed(0)}) ${s.log.w.toFixed(0)} x ${s.log.h.toFixed(0)}`)
 say(`the log opens at (${s.log.l.toFixed(0)}, ${s.log.t.toFixed(0)}) ${s.log.w.toFixed(0)} x ${s.log.h.toFixed(0)}, beside the board`)
 await page.mouse.click(s.btn.l+s.btn.w/2,s.btn.t+s.btn.h/2);await page.waitForTimeout(200);s=await look()
 assert.equal(s.logShown,false,'and closes it');assert.equal(s.pressed,'false')
 assert.deepEqual(errors,[],'no page errors')
 say('screenshot',relative(process.cwd(),SHOT).replace(/\\/g,'/'))
}finally{await browser.close();server.stop()}
console.log('bar-card-and-log: the card small, in the bar\'s row left of Move, no taller than the bar; the columns right of it, none overflowing; the log collapsed on load, opened and closed by its button off the board passed')
