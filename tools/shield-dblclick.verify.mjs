// fix.shield-power-double-click (engine DECISIONS.md 2026-10-01 'a self power fires on a double-click on its bar button').
// Andrew, playing the Orphanage on the built sandbox: "The two shield powers do not work. I click on them. I don't think it
// understands target. If I double-click on them or click on them and click on the hero, neither one of those does anything.
// I should be able to double-click on it in the bar and have it activate."
// This drives the BUILT page in a real browser (Chrome, through playwright-core) with real mouse events — never a handler
// called by hand — over a local server, so the 3D board picks the hero under the pointer as it does for Andrew:
//   1. the Iron Dwarf, begun first (viewer.turn-taking; was: proposed), double-clicks Cover on its bar;
//   2. the Battle Chaplain, double-clicked on the board (switched to while the Dwarf has done nothing — viewer.turn-taking;
//      was: clicked, only looked at, its bar shown), double-clicks the Round Shield's first power;
//   3. on a fresh battle, the Iron Dwarf clicks the Tower Shield's second power on its bar, then clicks itself on the board;
//   (Law 10, 2026-10-04 — content.shields-reauthored (engine item; engine DECISIONS.md 2026-09-28 'counterattack, special free attacks, the opening six, shields, custom weapons' and the Armory Ledger approved that day): the four powers were typed by id - the Tower's
//   Cover and Stand Tall, the Round's Turn Aside and Bear Down - and the Ledger replaced them. They are the two shields' own
//   powers as the engine's rows grant them, in the rows' order, read from the engine's dump of its item rows; every check unchanged.)
//   4. the Battle Chaplain, double-clicked on the board (switched to, as in 2), clicks Brace on its bar, then clicks itself.
// For each: did the engine use the power, what stamina it cost against the row's staminaCost, does the battle log on the
// screen name it, and does the board show it (the hero's folded stat mods from the power, its figure's badge).
//
//   node tools/shield-dblclick.verify.mjs <page.html>   prints the record as JSON (kingdom test/fix-shield-power-double-click.test.ts; the engine's until 2026-10-06)
import {readFileSync} from 'node:fs'
import {createRequire} from 'node:module'
import {createServer} from 'node:net'
import {spawn} from 'node:child_process'
import {resolve,dirname,relative} from 'node:path'
import {fileURLToPath} from 'node:url'

const here=dirname(fileURLToPath(import.meta.url)),ROOT=resolve(here,'../..')
const PAGE=resolve(process.argv[2]??'BATTLE-SANDBOX.html'),ENCOUNTER='encounter.opening.orphanage'
const {chromium}=createRequire(resolve(ROOT,'engine/package.json'))('playwright-core')

/** the 3D board loads its Atlas from the server's root, so the page is served from the folder root (tools/battle-atlas/serve.mjs) */
const freePort=()=>new Promise((ok,no)=>{const s=createServer();s.on('error',no);s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>ok(p))})})
async function serve(){
 const port=await freePort(),child=spawn(process.execPath,[resolve(ROOT,'tools/battle-atlas/serve.mjs'),String(port)],{cwd:ROOT,stdio:['ignore','pipe','pipe']})
 await new Promise((ok,no)=>{let out='';const t=setTimeout(()=>no(Error('the battle server did not start: '+out)),30000)
  child.stdout.on('data',d=>{out+=d;if(/Battle Atlas/.test(out)){clearTimeout(t);ok()}});child.stderr.on('data',d=>{out+=d});child.on('exit',c=>{clearTimeout(t);no(Error('the battle server exited '+c+': '+out))})})
 return {port,stop:()=>child.kill()}
}

const server=await serve()
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']})
const record={page:relative(ROOT,PAGE).replace(/\\/g,'/'),errors:[],uses:[]}
try{
 const url=`http://127.0.0.1:${server.port}/${record.page}?play=${ENCOUNTER}`
 async function open(){
  const page=await browser.newPage({viewport:{width:1600,height:950}})
  page.on('pageerror',e=>record.errors.push(String(e)))
  await page.goto(url)
  await page.waitForFunction(()=>window.__sandbox?.session&&window.__sandbox.viewer&&!window.__sandbox.busy&&window.__sandbox.viewer._V?.camera3d,null,{timeout:180000})
  await settle(page)
  return page
 }
 /** the resolved actions played out and the camera still: the host is not busy for half a second running */
 async function settle(page){let quiet=0
  for(let n=0;n<200&&quiet<5;n++){await page.waitForTimeout(100);quiet=await page.evaluate(()=>window.__sandbox.busy)?0:quiet+1}}
 const unitOf=(page,type)=>page.evaluate(t=>window.__sandbox.session.ctx.state.units.find(u=>u.typeId===t).id,type)
 /** the hero's body on the board, where the mouse clicks it: the middle of its figure, a little below its centre */
 async function clickHero(page,id){
  const at=await page.evaluate(id=>{const r=window.__sandbox.viewer._V.layers.UEL.get(id).img.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height*0.6}},id)
  await page.mouse.click(at.x,at.y)
 }
 const row=(page,power)=>page.locator(`#actionbar .acRow[data-act="${power}"]`)
 /** Law 10, viewer.turn-taking (engine DECISIONS.md 2026-10-03 'the action bar and its card stay with the activated unit'): a
     click on another hero only shows it in the panel — the bar stays the Iron Dwarf's — so the Battle Chaplain's own bar is
     reached by a double-click on its body, which switches to it while the Dwarf has done nothing (it is then the hero looked
     at and the one acting). was: clickHero alone, the bar following the click (kingdom SWITCHES playQueueBarOrder) */
 async function switchTo(page,id){
  const at=await page.evaluate(id=>{const r=window.__sandbox.viewer._V.layers.UEL.get(id).img.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height*0.6}},id)
  await page.mouse.dblclick(at.x,at.y)
 }
 /** what the battle says now about this hero and this power */
 const look=(page,id,power)=>page.evaluate(([id,power])=>{const s=window.__sandbox.session,ctx=s.ctx,V=window.__sandbox.viewer._V,u=ctx.state.units[id]
  const log=[...V.dom.root.querySelector('#playLog').children].map(n=>n.textContent.replace(/\s+/g,' ').trim())
  const mods=(V.S.U[id].mods??[]).filter(m=>JSON.stringify(m).includes(power)).length
  return {events:ctx.events.length,stamina:u.stamina,cost:ctx.actions[power].staminaCost??0,name:ctx.actions[power].name,log,mods,badges:V.layers.UEL.get(id).badges.children.length,
   proposed:V.play?.actor??null,acting:ctx.battleCursor?.at==='acting'?ctx.battleCursor.actor:null,note:V.play?.note??null}},[id,power])
 async function use(page,how,type,power,act){
  const id=await unitOf(page,type),before=await look(page,id,power)
  await act(id);await settle(page)
  const after=await look(page,id,power)
  const used=await page.evaluate(([n,id,power])=>window.__sandbox.session.ctx.events.slice(n).find(e=>e.type==='power.used'&&e.actor===id&&e.causeId===power)??null,[before.events,id,power])
  record.uses.push({how,hero:type,power,used:!!used,cost:before.cost,staminaBefore:before.stamina,staminaAfter:after.stamina,
   logNamed:!!used&&after.log.slice(before.log.length).some(l=>l.includes('uses '+before.name)),modsShown:after.mods-before.mods,badgesBefore:before.badges,badgesAfter:after.badges,note:after.note})
 }
 /** each on a fresh battle, so none leans on what another left behind */
 async function fresh(how,type,power,act){const page=await open();await use(page,how,type,power,id=>act(page,id));await page.close()}
 // 1. the hero proposed first double-clicks a shield power on its bar
 const SHIELD=JSON.parse(readFileSync(new URL('../../viewer/generated/static.json',import.meta.url),'utf8')).items
 const [towerFirst,towerSecond]=SHIELD['item.tower-shield'].abilities,[roundFirst,roundSecond]=SHIELD['item.round-shield'].abilities
 await fresh('double-click on the bar, the hero proposed','hero.base.warrior-iron',towerFirst,page=>row(page,towerFirst).dblclick())
 // 2. another shield-holder, clicked on the board to look at it, double-clicks one of its own
 await fresh('double-click on the bar of the hero looked at','hero.base.priest-armored',roundFirst,async(page,id)=>{await switchTo(page,id);await settle(page);await row(page,roundFirst).dblclick()})
 // 3. the power clicked on the bar, then the hero clicked on the board
 await fresh('click on the bar, then the hero','hero.base.warrior-iron',towerSecond,async(page,id)=>{await row(page,towerSecond).click();await settle(page);await clickHero(page,id)})
 // 4. the same on the hero looked at
 await fresh('click on the bar of the hero looked at, then the hero','hero.base.priest-armored',roundSecond,async(page,id)=>{await switchTo(page,id);await settle(page);await row(page,roundSecond).click();await settle(page);await clickHero(page,id)})
}finally{await browser.close();server.stop()}
process.stdout.write(JSON.stringify(record))
