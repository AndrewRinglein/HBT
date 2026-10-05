// viewer.bar-moves-grey-when-done — "A screenshot of the bar before and after the move is saved for his eye." Not a test:
// it opens a built sandbox (the Orphanage) in real Chrome (playwright-core, as tools/bar-card-and-log.verify.mjs does), takes
// the action bar as the first hero begins, walks that hero its whole movement through the page's own play input, and takes
// the bar again — the basic move slightly greyed, everything else as it was.
//
//   node tools/bar-moves-grey-when-done.shot.mjs <page.html> <out-dir>     writes bar-before-move.png and bar-after-move.png
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
try{
 const page=await browser.newPage({viewport:{width:1920,height:1080}})
 await page.goto(`http://127.0.0.1:${port}/${relative(ROOT,PAGE).replace(/\\/g,'/')}?play=encounter.opening.orphanage`)
 await page.waitForFunction(()=>window.__sandbox?.session&&window.__sandbox.viewer&&!window.__sandbox.busy&&window.__sandbox.viewer._V?.play,null,{timeout:150000})
 const still=async()=>{let quiet=0;for(let n=0;n<300&&quiet<4;n++){await page.waitForTimeout(100);quiet=await page.evaluate(()=>window.__sandbox.busy)?0:quiet+1}}
 await still();mkdirSync(OUT,{recursive:true})
 const bar=page.locator('#barrow')
 await stillShot(page,bar,{path:resolve(OUT,'bar-before-move.png')})
 const walked=await page.evaluate(()=>{const s=window.__sandbox.session.ctx,V=window.__sandbox.viewer._V,me=s.state.units[s.battleCursor.actor]
  const far=[...V.play.reach].sort((x,y)=>s.geo.distance(me.hex,y)-s.geo.distance(me.hex,x)||x-y)[0]
  V.offerPlay({kind:'hex',hex:far});V.offerPlay({kind:'hex',hex:far});return {name:me.name,far}})
 await still()
 const after=await page.evaluate(()=>{const s=window.__sandbox.session.ctx,V=window.__sandbox.viewer._V,me=s.state.units[s.battleCursor.actor]
  return {name:me.name,moveUsed:me.moveUsed,left:me.movePointsLeft,done:V.play.moveDone,greyed:[...document.querySelectorAll('#actionbar .acRow.moveDone')].map(r=>r.dataset.act),
   opacity:[...document.querySelectorAll('#actionbar .acRow[data-act]')].map(r=>r.dataset.act+' '+getComputedStyle(r).opacity)}})
 assert.equal(after.name,walked.name);assert.equal(after.left,0);assert.ok(after.greyed.length>0,'the basic move is greyed after the walk')
 await stillShot(page,bar,{path:resolve(OUT,'bar-after-move.png')})
 console.log(`  ${after.name} walked its whole movement: ${after.greyed.join(', ')} greyed (${after.opacity.join(' · ')})`)
 console.log('  screenshots: '+resolve(OUT,'bar-before-move.png')+' and '+resolve(OUT,'bar-after-move.png'))
}finally{await browser.close();child.kill()}
