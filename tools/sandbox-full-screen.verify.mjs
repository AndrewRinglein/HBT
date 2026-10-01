// viewer.battle-full-screen (engine DECISIONS.md 2026-09-30 "the battle is its own full screen; End Turn and End Activation
// lower right; a red targeting arrow"). Andrew: "I want a fucking battle. It should be full screen. How can I experience
// this if you've got one screen that is both your launcher and your battle?" The BUILT sandbox opened with ?play= shows the
// battle alone, filling the window: header, setup form, Save/Replay and footer hidden, the sandbox's own text hidden until
// something must be said; the 1920x1080 screen scaled to the largest size that fits the window whole and centred in it.
// The launcher is the other view (the Launcher button there and back); a free battle keeps the launcher page; End Turn and
// End activation are in the screen's lower right-hand corner, off the board (the viewer's #playEnds).
import assert from 'node:assert/strict'
import {bootSlice} from './atlas-dom.mjs'
const page=process.argv[2]??'BATTLE-SANDBOX.html',PLAY='?play=encounter.opening.orphanage'
const hidden=el=>!!el&&el.hasAttribute('hidden')
const parts=(w,root)=>({header:root.querySelector('header'),setup:w.document.getElementById('setup'),commands:w.document.getElementById('commands'),transfer:w.document.getElementById('transfer'),footer:root.querySelector('footer'),nav:w.document.getElementById('battleNav'),battle:w.document.getElementById('battle')})
const fitOf=root=>{const outer=root.querySelector('.kingdom-battle-fit');assert.ok(outer,'the battle is mounted');return{outer,host:outer.children[0]}}
const TF=/^translate\((-?[\d.]+)px,\s*(-?[\d.]+)px\) scale\(([\d.]+)\)$/
function fills(w,root,W,H){
 const {outer,host}=fitOf(root),o=outer.style
 assert.deepEqual([o.position,o.left,o.top,o.width,o.height],['fixed','0','0','100vw','100vh'],'the battle covers the window')
 const m=TF.exec(host.style.transform);assert.ok(m,'scaled and centred: '+host.style.transform)
 const [x,y,s]=m.slice(1).map(Number),want=Math.min(W/1920,H/1080)
 assert.ok(Math.abs(s-want)<1e-9,`the largest scale that fits the window whole: ${s} vs ${want}`)
 assert.ok(Math.abs(1920*s-W)<1e-6||Math.abs(1080*s-H)<1e-6,'it touches two sides of the window')
 assert.ok(Math.abs(x-(W-1920*s)/2)<1e-6&&Math.abs(y-(H-1080*s)/2)<1e-6,'centred')
 return s
}
// 1. ?play= at a 16:9 window and a wider one: the battle alone, filling the window
for(const [W,H] of [[1600,900],[2560,1200],[1280,1024]]){
 const {w,root}=bootSlice(page,{search:PLAY,width:W,height:H}),P=parts(w,root),handle=w.__sandbox
 assert.equal(handle.session?.config.encounterId,'encounter.opening.orphanage','?play= fields the encounter')
 for(const k of ['header','setup','transfer','footer'])assert.ok(hidden(P[k]),k+' hidden: nothing of the launcher shows')
 assert.ok(hidden(P.commands),'no sandbox text while there is nothing to say')
 assert.ok(!hidden(P.battle),'the board shows');assert.ok(!hidden(P.nav),'the Launcher button')
 assert.ok(w.document.body.classList.contains('battle-view'))
 const s=fills(w,root,W,H);if(W===2560)assert.ok(s>1,'a large window scales the screen up')
 // End Turn and End activation: the screen's lower right-hand corner, off the board
 const V=handle.viewer._V,ends=V.dom.root.querySelector('#playEnds'),left=V.dom.root.querySelector('#left')
 assert.ok(ends&&ends.parentNode===V.dom.root,'the corner box is on the screen')
 for(const id of ['playEndTurn','playEndAct']){const b=V.dom.root.querySelector('#'+id);let n=b,inLeft=false,inEnds=false;for(;n;n=n.parentNode){if(n===left)inLeft=true;if(n===ends)inEnds=true}assert.ok(inEnds&&!inLeft,id+' in the corner, not on the board')}
 // the launcher: the other view, and back
 const click=act=>{const el=root.querySelectorAll('[data-act]').find(e=>e.dataset.act===act&&!hidden(e.parentNode));assert.ok(el,'a '+act+' button');el.handlers.click()}
 click('launcher')
 for(const k of ['header','setup','transfer','footer','commands'])assert.ok(!hidden(P[k]),k+' shows in the launcher')
 assert.ok(hidden(P.battle),'the battle is not in the launcher view');assert.ok(hidden(P.nav));assert.ok(!w.document.body.classList.contains('battle-view'))
 assert.ok(P.commands.innerHTML.includes('Return to the battle'))
 click('battle')
 for(const k of ['header','setup','transfer','footer','commands'])assert.ok(hidden(P[k]),k+' hidden again');fills(w,root,W,H)
}
// 2. the launcher page: opened without ?play= it is the launcher; Start on an encounter opens the battle view;
//    a free battle keeps the launcher page with its controls
{const {w,root,click}=bootSlice(page,{width:1600,height:900}),P=parts(w,root)
 for(const k of ['header','setup','transfer','footer','commands'])assert.ok(!hidden(P[k]),k+' shows: the launcher')
 assert.ok(!w.document.body.classList.contains('battle-view'))
 click('start')   /* the default is a free battle */
 assert.equal(w.__sandbox.session.config.encounterId,undefined)
 for(const k of ['header','setup','transfer','commands'])assert.ok(!hidden(P[k]),k+' kept for a free battle')
 assert.notEqual(fitOf(root).outer.style.position,'fixed','a free battle stays in the page')
 const enc=w.document.getElementById('encounter');enc.value='encounter.opening.orphanage';enc.handlers.change();click('start')
 for(const k of ['header','setup','transfer','footer','commands'])assert.ok(hidden(P[k]),k+' hidden: Start opens the battle view');fills(w,root,1600,900)}
console.log('sandbox full screen: ?play= opens the battle alone filling the window (16:9, wide, 5:4 — the largest whole fit, centred; scaled up on a large window); nothing of the launcher shows; End Turn and End activation in the corner off the board; the launcher is its own view and back; Start on an encounter opens the battle view; a free battle keeps the launcher page passed')
