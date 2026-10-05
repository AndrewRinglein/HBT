// viewer.no-target-ring (engine DECISIONS.md 2026-10-04 'after the backlog run: the yellow target ring goes; ...', Andrew asked
// "Is the yellow you want gone the ring on hexes the chosen action can hit (including the hero's own hex for a self power)?" -
// "yes"; 2026-10-03: "There's a highlighting of a hex that happens where there's a big yellow border around the hex at some
// point during unit activation." / "That yellow focus border doesn't look good, so just remove it."). The item: "Screenshots
// before and after, in a real browser, for his eye." and "The provoke ring (attack of opportunity) and the threat marks are
// other rings: say what colour and weight each is".
// Opens a built sandbox (BATTLE-SANDBOX.html?play=encounter.opening.orphanage) in real Chrome (playwright-core, as
// tools/no-hex-focus-border.verify.mjs does) and plays it through the page's own play input:
//   1. an attack chosen on the bar with someone in its reach (the first hero and attack the engine lists a target for; a path
//      planned first when nobody is in reach from where the heroes stand) - and again with the pointer on a target;
//   2. a self power chosen (a power aimed at the hero alone);
//   3. the other rings: an enemy pointed at with nothing chosen (its reach), and the attack of opportunity's ring - STAGED: the
//      facts the page holds are handed back to the board with one hex of the path named as a provoke point, because nothing
//      provokes on the opening board; the colour and weight are the board's own.
// It writes one full screenshot and one close-up of each, and prints what the browser computed for every ring and mark. With
// `after` it also asserts the item's expect: no hex wears the yellow ring, each unit that can be hit wears the mark, the hero
// acting none.
//
//   node tools/no-target-ring.shot.mjs <page.html> <out-dir> <before|after>
import {stillShot} from './still-shot.mjs'   // viewer.screenshot-time-out-under-load: the page's frame loop is held for the shot
import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
import {createServer} from 'node:net'
import {spawn} from 'node:child_process'
import {mkdirSync} from 'node:fs'
import {resolve,dirname,relative} from 'node:path'
import {fileURLToPath} from 'node:url'
const here=dirname(fileURLToPath(import.meta.url)),ROOT=resolve(here,'../..')
const PAGE=resolve(process.argv[2]??'BATTLE-SANDBOX.html'),OUT=resolve(process.argv[3]??'scratch/no-target-ring'),WHEN=process.argv[4]??'after'
assert.ok(WHEN==='before'||WHEN==='after','the third argument is before or after')
const {chromium}=createRequire(resolve(ROOT,'engine/package.json'))('playwright-core')
const say=(...a)=>console.log('  '+a.join(' '))
const freePort=()=>new Promise((ok,no)=>{const s=createServer();s.on('error',no);s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>ok(p))})})
const port=await freePort(),child=spawn(process.execPath,[resolve(ROOT,'tools/battle-atlas/serve.mjs'),String(port)],{cwd:ROOT,stdio:['ignore','pipe','pipe']})
await new Promise((ok,no)=>{let out='';const t=setTimeout(()=>no(Error('the battle server did not start: '+out)),30000)
 child.stdout.on('data',d=>{out+=d;if(/Battle Atlas/.test(out)){clearTimeout(t);ok()}});child.stderr.on('data',d=>{out+=d})})
/** a colour the browser computed, as [r,g,b,a]; the removed ring is rgba(255,215,100,.9) */
const rgba=s=>{const m=String(s).match(/rgba?\(([^)]+)\)/);if(!m)return null;const p=m[1].split(',').map(Number);return [p[0],p[1],p[2],p[3]??1]}
const yellow=c=>!!c&&c[3]>0&&c[0]>200&&c[1]>195&&c[2]<160
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']})
const errors=[]
try{
 const page=await browser.newPage({viewport:{width:1920,height:1080}})
 page.on('pageerror',e=>errors.push(String(e)))
 await page.goto(`http://127.0.0.1:${port}/${relative(ROOT,PAGE).replace(/\\/g,'/')}?play=encounter.opening.orphanage`)
 await page.waitForFunction(()=>window.__sandbox?.session&&window.__sandbox.viewer&&!window.__sandbox.busy&&window.__sandbox.viewer._V?.play,null,{timeout:150000})
 const still=async()=>{let quiet=0;for(let n=0;n<300&&quiet<4;n++){await page.waitForTimeout(100);quiet=await page.evaluate(()=>window.__sandbox.busy)?0:quiet+1}}
 await still()
 const t0=Date.now()
 await page.waitForFunction(()=>{const w=window.__sandbox.viewer._V.dom.stage.parentNode;return !w.classList.contains('terrain3d-loading')&&getComputedStyle(window.__sandbox.viewer._V.dom.stage).visibility==='visible'},null,{timeout:240000})
 say(`the board is shown (${Math.round((Date.now()-t0)/1000)} s for the 3D scene)`)
 mkdirSync(OUT,{recursive:true})
 /** what the plan draws now, as the browser painted it: every hex ring of the plan with its colour, every mark on a unit */
 const drawn=()=>page.evaluate(()=>{const V=window.__sandbox.viewer._V,s=window.__sandbox.session.ctx,plan=V.layers.play
  const rings=plan?[...plan.querySelectorAll('.ring')].map(n=>({cls:n.className.replace(/^ring\s+/,''),hex:+n.dataset.hex,colour:getComputedStyle(n).backgroundColor})):[]
  const marks=[...V.dom.stage.querySelectorAll('.playTargetUnit')].map(n=>{const c=getComputedStyle(n),r=n.getBoundingClientRect()
   return {unit:+n.dataset.unit,hex:+n.dataset.hex,name:s.state.units[+n.dataset.unit]?.name,colour:c.borderTopColor,width:c.borderTopWidth,style:c.borderTopStyle,box:[Math.round(r.width),Math.round(r.height)],shown:c.display!=='none'&&c.visibility!=='hidden'&&r.width>0}})
  const P=V.play
  return {actor:P.actor,actorName:P.actor!=null?s.state.units[P.actor].name:null,actorHex:P.actor!=null?s.state.units[P.actor].hex:null,slot:P.slot,targets:P.targets,note:P.note,aim:P.aim,ghost:P.ghost,rings,marks,
   on:P.targets.map(h=>s.state.units.filter(u=>u.hex===h&&u.lifeState!=='dead').map(u=>({id:u.id,name:u.name,side:u.side})))}})
 /** the screen rectangle round some hexes (the hex buttons' own boxes), padded - the close-up */
 const around=(hexes,pad=230)=>page.evaluate(([hexes,pad])=>{const bs=[...document.querySelectorAll('.playHex')].filter(n=>hexes.includes(+n.dataset.hex)).map(n=>n.getBoundingClientRect())
  if(!bs.length)return null
  const x0=Math.max(0,Math.min(...bs.map(r=>r.left))-pad),y0=Math.max(0,Math.min(...bs.map(r=>r.top))-pad),x1=Math.min(innerWidth,Math.max(...bs.map(r=>r.right))+pad),y1=Math.min(innerHeight,Math.max(...bs.map(r=>r.bottom))+pad)
  return x1>x0&&y1>y0?{x:x0,y:y0,width:x1-x0,height:y1-y0}:null},[hexes,pad])
 const shoot=async(name,hexes)=>{await page.waitForTimeout(700)
  await stillShot(page,page,{path:resolve(OUT,`${WHEN}-${name}.png`)})
  const clip=await around(hexes);if(clip)await stillShot(page,page,{path:resolve(OUT,`${WHEN}-${name}-close.png`),clip})
  say(`  saved ${WHEN}-${name}.png${clip?` and ${WHEN}-${name}-close.png`:''}`)}
 /* an order offered to the page's own play input; the board is let settle and the host's facts awaited (a hero begun plays its
    beginning first, and the facts are handed back after it) */
 const offer=async e=>{await page.evaluate(e=>window.__sandbox.viewer._V.offerPlay(e),e);await still()
  await page.waitForFunction(()=>!window.__sandbox.busy&&!!window.__sandbox.viewer._V.play,null,{timeout:60000})}
 const facts=()=>page.evaluate(()=>{const P=window.__sandbox.viewer._V.play;return {actor:P.actor,targets:P.targets,reach:P.reach,yet:P.endTurn?.yetToAct??[]}})
 const heroesNow=async()=>{const f=await facts();return [f.actor,...f.yet].filter((id,i,a)=>id!=null&&a.indexOf(id)===i)}
 /** the actions on a hero's bar that pass the test (asked of the engine's own rows) */
 const barActions=(id,which)=>page.evaluate(([id,which])=>{const S=window.__sandbox.session.ctx,rows=[...document.querySelectorAll('#actionbar .acRow')].map(r=>r.dataset.act)
  return S.state.units[id].actions.filter(a=>rows.includes(a)&&(which==='attack'?!!S.actions[a]?.attack:S.actions[a]?.target?.select==='self'))},[id,which])
 const act=async id=>{if((await facts()).actor!==id)await offer({kind:'choose',id});return (await facts()).actor===id}
 /* the item's expect, asked of what the browser painted */
 const check=(d,what)=>{if(WHEN!=='after')return
  assert.deepEqual(d.rings.filter(r=>r.cls==='playTarget'),[],what+': no hex wears the target ring')
  for(const r of d.rings)assert.equal(yellow(rgba(r.colour)),false,`${what}: hex ${r.hex} wears a yellow ring (${r.cls} ${r.colour})`)
  const should=[...new Set(d.on.flat().map(u=>u.id).filter(id=>id!==d.actor))].sort((a,b)=>a-b)
  assert.deepEqual(d.marks.map(m=>m.unit).sort((a,b)=>a-b),should,what+': each unit that can be hit wears the mark, the hero acting none')
  for(const m of d.marks){assert.ok(m.shown,what+': the mark on '+m.name+' is painted');assert.equal(yellow(rgba(m.colour)),false,what+': the mark is not yellow')}}
 const tell=(d,what)=>{say(`${what}: ${d.actorName} (hex ${d.actorHex}), ${d.slot}${d.ghost?', a path planned to hex '+d.ghost.hex:''}; target hexes ${JSON.stringify(d.targets)} = ${d.on.map(l=>l.map(u=>u.name).join('+')||'nobody').join(', ')||'none'}`)
  const by={};for(const r of d.rings)(by[r.cls+' '+r.colour]??=[]).push(r.hex)
  say('  hex rings: '+(Object.entries(by).map(([k,h])=>`${k} on ${h.length} hex${h.length>1?'es':''} [${h.join(',')}]`).join(' · ')||'none'))
  say('  marks on units: '+(d.marks.map(m=>`${m.name} (${m.width} ${m.style} ${m.colour}, ${m.box.join('×')} px)`).join(' · ')||'none'))}

 // 1. an attack chosen, someone in its reach
 const heroes=await heroesNow(),found={tried:[]}
 /* from where it stands */
 search:for(const id of heroes){if(!await act(id))continue
  for(const a of await barActions(id,'attack')){await offer({kind:'slot',actionId:a,unit:id});const n=(await facts()).targets.length;found.tried.push(id+' '+a+' '+n)
   if(n){found.id=id;found.a=a;break search}
   await offer({kind:'back'})}}
 /* from the end of a planned path: the hex of its reach nearest an enemy, then the attack */
 if(!found.a)search:for(const id of heroes){if(!await act(id))continue
  const dests=await page.evaluate(()=>{const S=window.__sandbox.session.ctx,V=window.__sandbox.viewer._V,foes=S.state.units.filter(u=>u.side==='enemy'&&u.lifeState==='standing'),near=h=>Math.min(...foes.map(u=>S.geo.distance(h,u.hex)))
   return [...V.play.reach].sort((x,y)=>near(x)-near(y)||x-y).slice(0,4)})
  for(const dest of dests){await offer({kind:'hex',hex:dest})
   for(const a of await barActions(id,'attack')){await offer({kind:'slot',actionId:a,unit:id});const n=(await facts()).targets.length;found.tried.push(id+' at '+dest+' '+a+' '+n)
    if(n){found.id=id;found.a=a;found.planned=true;break search}
    await offer({kind:'back'})}
   await offer({kind:'back'})}}
 assert.ok(found.a,'an attack with someone in its reach was found on the opening board: '+JSON.stringify(found.tried))
 await still()
 let d=await drawn();tell(d,'1 an attack chosen');check(d,'an attack chosen')
 await shoot('attack-chosen',[d.actorHex,...d.targets,...(d.ghost?[d.ghost.hex]:[])])
 const first=d.targets[0];await offer({kind:'point',hex:first})
 d=await drawn();tell(d,'  the pointer on a target');check(d,'aiming at a target')
 say(`  the forecast beside the arrow: ${d.aim?`${d.aim.hit}% to hit, ${d.aim.dmg} damage`:'none'}`)
 await shoot('attack-aimed',[d.actorHex,...d.targets,...(d.ghost?[d.ghost.hex]:[])])
 await offer({kind:'point',hex:null});for(let n=0;n<3;n++)await offer({kind:'back'})

 // 2. a self power chosen
 let self=null
 search:for(const id of await heroesNow()){if(!await act(id))continue
  for(const a of await barActions(id,'self')){await offer({kind:'slot',actionId:a,unit:id});if((await facts()).targets.length){self={id,a};break search}
   await offer({kind:'back'})}}
 assert.ok(self,'a power aimed at the hero alone was found on the opening board')
 await still()
 d=await drawn();tell(d,'2 a self power chosen');check(d,'a self power chosen')
 assert.deepEqual(d.targets,[d.actorHex],'the self power\'s only target is the hero\'s own hex')
 if(WHEN==='after'){assert.equal(d.rings.filter(r=>r.hex===d.actorHex).length,0,'nothing at all on the hero\'s own hex');assert.deepEqual(d.marks,[])}
 say(`  the note over the board: ${d.note}`)
 await shoot('self-power',[d.actorHex])
 for(let n=0;n<3;n++)await offer({kind:'back'})

 // 3. the other rings: an enemy's reach (pointed at with nothing chosen), and the attack of opportunity's ring (staged)
 const foe=await page.evaluate(()=>{const u=window.__sandbox.session.ctx.state.units.find(u=>u.side==='enemy'&&u.lifeState==='standing');return {id:u.id,hex:u.hex,name:u.name}})
 await offer({kind:'point',hex:foe.hex})
 d=await drawn();tell(d,`3 ${foe.name} pointed at, nothing chosen (its reach)`)
 const threat=await page.evaluate(()=>{const V=window.__sandbox.viewer._V;return {move:[...V.dom.stage.querySelectorAll('.playThreatMove')].map(n=>getComputedStyle(n).backgroundColor)[0]??null,moveN:V.dom.stage.querySelectorAll('.playThreatMove').length,hit:V.play.threat?.hit??[]}})
 say(`  where it can walk: ${threat.moveN} hexes filled ${threat.move}; where it can hit: the hex rings above`)
 if(d.rings.length)await shoot('other-rings-enemy-reach',[foe.hex,...threat.hit.slice(0,6)])
 await offer({kind:'point',hex:null})
 const staged=await page.evaluate(()=>{const V=window.__sandbox.viewer._V,P=V.play,hex=P.reach[0];if(hex==null)return null
  const {endTurn,endActivation,swap,ask,moveDone,reachCost,...core}=P
  window.__sandbox.viewer.setPlay({...core,provokes:[hex],endTurn,endActivation,moveDone,reachCost,...(swap?{swap}:{}),...(ask?{ask}:{})});return hex})
 if(staged!=null){d=await drawn();tell(d,`  STAGED: hex ${staged} of the reach named as a provoke point`);await shoot('other-rings-provoke-staged',[d.actorHex,staged])}
 const css=await page.evaluate(()=>{const n=document.querySelector('.ring');if(!n)return null;const c=getComputedStyle(n);return {clip:c.clipPath.slice(0,60),w:c.width,h:c.height}})
 if(css)say(`  a hex ring's weight: a ${css.w} × ${css.h} hex outline, the band between the hex's edge and an inner hex 7 to 9 px in (styles.css .ring)`)
 assert.deepEqual(errors,[],'no page errors')
}finally{await browser.close();child.kill()}
console.log(`no-target-ring: the ${WHEN} screenshots are in ${OUT}`)
