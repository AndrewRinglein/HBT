// viewer.no-hex-focus-border (engine DECISIONS.md 2026-10-03 'one draft after every battle; the yellow focus border goes; ...',
// Andrew: "There's a highlighting of a hex that happens where there's a big yellow border around the hex at some point during
// unit activation." / "That yellow focus border doesn't look good, so just remove it."). The item's expect, on the BUILT sandbox
// (BATTLE-SANDBOX.html?play=encounter.opening.orphanage): "no hex ever shows the yellow border or tint, with the mouse or after
// a key is pressed; targeting and moving by keyboard still work; a page test focuses a target hex by keyboard and finds no
// yellow box-shadow or background on it." What a focused hex LOOKS like is the browser's answer (computed style), so this
// drives the page in a real browser (Chrome, through playwright-core, as tools/bar-card-and-log.verify.mjs does): the mouse
// first, then keys, then a hex focused the way the keyboard focuses it (focus-visible), a target hex among them.
//
//   node tools/no-hex-focus-border.verify.mjs <page.html>   prints one line per check and `no-hex-focus-border: … passed`
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
/** a colour the browser computed, as [r,g,b,a]; yellow is the removed border's #ffd764 and tint rgba(255,215,100,.35) */
const rgba=s=>{const m=String(s).match(/rgba?\(([^)]+)\)/);if(!m)return null;const p=m[1].split(',').map(Number);return [p[0],p[1],p[2],p[3]??1]}
const yellow=c=>!!c&&c[3]>0&&c[0]>200&&c[1]>170&&c[2]<160
const yellowIn=s=>[...String(s).matchAll(/rgba?\([^)]+\)/g)].some(m=>yellow(rgba(m[0])))

const server=await serve()
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']})
const errors=[]
try{
 const page=await browser.newPage({viewport:{width:1920,height:1080}})
 page.on('pageerror',e=>errors.push(String(e)))
 await page.goto(`http://127.0.0.1:${server.port}/${relative(ROOT,PAGE).replace(/\\/g,'/')}?play=encounter.opening.orphanage`)
 await page.waitForFunction(()=>window.__sandbox?.session&&window.__sandbox.viewer&&!window.__sandbox.busy&&window.__sandbox.viewer._V?.play,null,{timeout:150000})
 const still=async()=>{let quiet=0;for(let n=0;n<300&&quiet<4;n++){await page.waitForTimeout(100);quiet=await page.evaluate(()=>window.__sandbox.busy)?0:quiet+1}}
 await still()
 /* the board is hidden until the battle's own 3D scene is ready (viewer.true-3d-camera: "no other map loads first") — and a
    hidden hex can neither be focused nor painted, so the checks wait for the scene (software GL here: up to three minutes) */
 const t0=Date.now()
 await page.waitForFunction(()=>{const w=window.__sandbox.viewer._V.dom.stage.parentNode;return !w.classList.contains('terrain3d-loading')&&getComputedStyle(window.__sandbox.viewer._V.dom.stage).visibility==='visible'},null,{timeout:180000})
 say(`the board is shown (${Math.round((Date.now()-t0)/1000)} s for the 3D scene)`)
 /** every hex button as the browser paints it now: which is focused, which the browser shows as keyboard-focused, and any yellow on any of them */
 const hexes=()=>page.evaluate(()=>{const all=[...document.querySelectorAll('.playHex,.targetHex')]
  const paint=n=>{const c=getComputedStyle(n);return {cls:n.className,hex:+n.dataset.hex,bg:c.backgroundColor,shadow:c.boxShadow,outline:c.outlineStyle,outlineW:c.outlineWidth}}
  const a=document.activeElement
  return {count:all.length,buttons:all.every(n=>n.tagName==='BUTTON'),active:a&&all.includes(a)?paint(a):null,visible:all.filter(n=>n.matches(':focus-visible')).map(paint),
   painted:all.map(paint).filter(p=>p.shadow!=='none'||p.bg!=='rgba(0, 0, 0, 0)')}})
 const noYellow=(h,when)=>{for(const p of [...h.painted,...h.visible,...(h.active?[h.active]:[])]){
  assert.equal(yellowIn(p.shadow),false,`${when}: hex ${p.hex} carries a yellow border (${p.shadow})`);assert.equal(yellow(rgba(p.bg)),false,`${when}: hex ${p.hex} carries a yellow tint (${p.bg})`)}}
 let h=await hexes()
 assert.ok(h.count>100&&h.buttons,'the hexes are buttons, as before');noYellow(h,'on load')
 // 1. the mouse: a click on a hex to plan, a click on another — no hex takes the focus, none is painted yellow or tinted
 const at=await page.evaluate(()=>{const V=window.__sandbox.viewer._V,b=id=>[...document.querySelectorAll('.playHex')].find(n=>+n.dataset.hex===id).getBoundingClientRect()
  return V.play.reach.slice(0,2).map(id=>{const r=b(id);return {id,x:r.left+r.width/2,y:r.top+r.height/2}})})
 assert.equal(at.length,2,'two hexes in reach to click')
 for(const p of at){await page.mouse.move(p.x,p.y);await page.mouse.click(p.x,p.y);await page.waitForTimeout(120)}
 h=await hexes();noYellow(h,'after mouse clicks');assert.equal(h.active,null,'a mouse click focuses no hex');assert.deepEqual(h.visible,[],'no hex shows a keyboard focus in mouse play')
 const planned=await page.evaluate(()=>window.__sandbox.viewer._V.play.ghost?.hex??null)
 assert.equal(planned,at[1].id,'the mouse still plans: the path to the hex clicked')
 say(`1 the mouse: two hexes clicked, the path planned to hex ${planned}; no hex focused, none yellow`)
 // 2. after a key is pressed in mouse play (Esc steps back, an arrow turns the camera): still no hex focused or yellow
 await page.keyboard.press('Escape');await page.keyboard.press('ArrowLeft');await page.waitForTimeout(400)
 h=await hexes();noYellow(h,'after Esc and an arrow key');assert.equal(h.active,null);assert.deepEqual(h.visible,[],'a key pressed in mouse play gives no hex a focus mark')
 say('2 Esc and an arrow key pressed: still no hex focused, none yellow')
 // 3. moving by keyboard still works: a hex in reach focused as the keyboard focuses it, Enter to plan, Enter to move
 const before=await page.evaluate(()=>{const s=window.__sandbox.session.ctx,V=window.__sandbox.viewer._V;return {actor:s.battleCursor.actor,hex:s.state.units[s.battleCursor.actor].hex,dest:V.play.reach[0]}})
 await page.evaluate(id=>[...document.querySelectorAll('.playHex')].find(n=>+n.dataset.hex===id).focus({focusVisible:true}),before.dest)
 h=await hexes()
 assert.ok(h.active&&h.active.hex===before.dest,'the hex holds the keyboard focus');assert.equal(h.visible.length,1,'and the browser shows it as keyboard-focused')
 noYellow(h,'a hex in reach, keyboard-focused');assert.equal(h.active.shadow,'none','no border drawn inside the focused hex');assert.equal(h.active.outline,'none','and no browser ring in its place')
 say(`3 hex ${before.dest} keyboard-focused: box-shadow ${h.active.shadow}, background ${h.active.bg} - no yellow`)
 await page.keyboard.press('Enter');await page.waitForTimeout(150)
 assert.equal(await page.evaluate(()=>window.__sandbox.viewer._V.play?.ghost?.hex??null),before.dest,'Enter plans the walk to the focused hex')
 await page.keyboard.press('Enter');await still()
 const after=await page.evaluate(a=>window.__sandbox.session.ctx.state.units[a].hex,before.actor)
 assert.equal(after,before.dest,'Enter again walks there: moving by keyboard still works')
 h=await hexes();noYellow(h,'after the keyboard walk')
 say(`  Enter, Enter: the hero walked from hex ${before.hex} to hex ${after} by keyboard`)
 // 4. a TARGET hex focused by keyboard: no yellow box-shadow, no yellow background; Enter still offers it
 const t=await page.evaluate(()=>{const V=window.__sandbox.viewer._V,v=window.__sandbox.viewer,hex=+Object.keys(V.data.POS)[40]
  v.setTargeting({legalHexes:[hex],centre:null,hexes:[],shielded:[]})
  const n=document.querySelector('.targetHex');if(!n)return null
  window.__targetClicks=0;n.addEventListener('click',()=>{window.__targetClicks++})
  n.focus({focusVisible:true});const c=getComputedStyle(n)
  return {hex,tag:n.tagName,active:document.activeElement===n,visible:n.matches(':focus-visible'),bg:c.backgroundColor,shadow:c.boxShadow,outline:c.outlineStyle}})
 assert.ok(t&&t.tag==='BUTTON','a target hex is a button');assert.ok(t.active&&t.visible,'it holds the keyboard focus, and the browser shows it as keyboard-focused')
 assert.equal(t.shadow,'none',`no box-shadow on the focused target hex (was inset 0 0 0 5px #ffd764): ${t.shadow}`)
 assert.equal(yellow(rgba(t.bg)),false,`no yellow background on it (was rgba(255,215,100,.35)): ${t.bg}`);assert.equal(t.bg,'rgba(0, 0, 0, 0)','no tint at all: only the game\'s own marks')
 assert.equal(t.outline,'none','and no browser ring in its place')
 await page.keyboard.press('Enter');await page.waitForTimeout(100)
 assert.equal(await page.evaluate(()=>window.__targetClicks),1,'Enter on the focused target hex still chooses it: targeting by keyboard still works')
 await page.evaluate(()=>window.__sandbox.viewer.setTargeting(null))
 say(`4 target hex ${t.hex} keyboard-focused: box-shadow ${t.shadow}, background ${t.bg} - no yellow; Enter chooses it`)
 assert.deepEqual(errors,[],'no page errors')
}finally{await browser.close();server.stop()}
console.log('no-hex-focus-border: no hex shows a yellow border or tint with the mouse, after a key, or keyboard-focused (a target hex included); moving and targeting by keyboard still work passed')
