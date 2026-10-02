// viewer.shield-guard-motion (engine DECISIONS.md 2026-10-01 'a shield power plays a raise-the-shield motion', Andrew: "When they
// play shield power, they should raise the shield animation."). The BUILT sandbox plays the Orphanage on the board alone (?play=,
// one shield-bearer fielded) and each of its shield's two powers is clicked on the action bar, one per Turn, as
// tools/swap-shields.verify.mjs clicks them: the Lion of the Host (Kite Shield) Lock Shields and Raise Guard, the Battle Chaplain
// (Round Shield) Turn Aside and Bear Down, the Iron Dwarf (Tower Shield) Cover and Stand Tall. The headless page has no WebGL, so
// the hero's 3D body is stood up beside it from the viewer's own modules and the approved files (as the viewer's page tests stand
// it: ../viewer/tools/side-facing.test.mjs) and handed to the page as its cast; the power's events are then played by the page's
// own pump (the clock advanced, never skipped — a skip seeks and drops the cues), so the body plays what the page tells it.
// Recorded per power: every motion the hero's body was told to play, and the clip each is (its file and name).
//
//   node tools/shield-guard.verify.mjs <page.html>    prints the record as JSON (../viewer/test/shield-guard-motion.test.ts)
import assert from 'node:assert/strict'
import {resolve,dirname} from 'node:path'
import {fileURLToPath} from 'node:url'
import {readFileSync} from 'node:fs'
import {bootSlice} from './atlas-dom.mjs'

const PAGE=resolve(process.argv[2]??'BATTLE-SANDBOX.html'),ENCOUNTER='encounter.opening.orphanage'
/* the viewer's test runtime builds the viewer's modules from its own folder, and the files are served from the project root */
process.chdir(resolve(dirname(fileURLToPath(import.meta.url)),'../../viewer'))
const {THREE,modules}=await import('../../viewer/tools/atlas-test-runtime.mjs'),A=await modules()
const location={protocol:'http:',href:'http://127.0.0.1:4230/viewer/BATTLE-VIEWER.html'}
const fetch=async url=>{const b=readFileSync('..'+new URL(url).pathname);return{ok:true,arrayBuffer:async()=>b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength)}}
const loads=new Map(),load=look=>{if(!loads.has(look.id))loads.set(look.id,A.loadLook(look,{location,fetch,textures:false}));return loads.get(look.id)}

async function battle(hero){
 const {w,click}=bootSlice(PAGE,{search:`?play=${ENCOUNTER}&heroes=${hero}`}),handle=w.__sandbox
 const V=()=>handle.viewer._V,ctx=()=>handle.session.ctx
 const settle=()=>{if(handle.busy)click('skip');assert.equal(handle.busy,false)}
 /** the page's own pump plays what was pushed, cue by cue, as the clock runs */
 const play=()=>{for(let n=0;n<4000&&handle.busy;n++)w._flush(50);assert.equal(handle.busy,false,'the page played what the engine said')}
 const me=()=>ctx().state.units.find(u=>u.uid===handle.session.policy.humanUnitUids[0])
 const figure=id=>V().layers.UEL.get(id).img
 const row=id=>V().dom.actionbar.querySelectorAll('.acRow').find(r=>r.dataset.act===id)??null
 const nextTurn=()=>{const t=ctx().state.turn;settle()
  for(let n=0;n<10&&ctx().state.turn===t&&!ctx().state.outcome;n++){
   V().dom.root.querySelector('#playEndTurn').handlers.click({})
   const ask=V().dom.root.querySelector('#playAsk');if(ask.style.display!=='none')V().dom.root.querySelector('#playAskYes').handlers.click({})
   settle()}
  assert.equal(ctx().state.outcome??null,null,'the battle goes on');assert.equal(ctx().state.turn,t+1,'the next Turn')}
 const choose=()=>{V().dom.rail.querySelectorAll('.railchip').find(c=>+c.dataset.i===me().id).handlers.dblclick({})}
 const begin=()=>{choose();figure(me().id).handlers.click({detail:1});settle()}
 settle()
 /* the hero's body, stood up from the approved files, is the page's cast */
 const cast=A.createCast(V(),new THREE.Scene(),new THREE.Matrix4().makeScale(.01,.01,.01),{load,readStyle:el=>el.style})
 V().cast=cast;cast.frame(0);await cast.settle();cast.frame(0)
 assert.ok(cast.body(me().id),`${hero} stands as its 3D body`)
 /** a shield power from the bar: its row clicked, then clicked again; the page plays the events; what the body was told to play */
 async function usePower(id){
  const r=row(id),before=ctx().events.length,out={hero,id,onBar:!!r,used:false,name:null,motions:[],clips:[],hit:null}
  if(!r)return out
  r.handlers.click({});settle()
  cast.frame(0);await cast.settle();cast.frame(0)
  const B=cast.body(me().id),told=[],own=B.play
  B.play=(k,o)=>{told.push(k);return own.call(B,k,o)}
  row(id)?.handlers.click({});play()
  B.play=own
  const used=ctx().events.slice(before).find(e=>e.type==='power.used'&&e.actor===me().id&&e.causeId===id)
  out.used=!!used;out.name=used?.['name']??null;out.motions=told
  out.clips=told.map(k=>{const m=B.look.motions[k];return m?{motion:k,path:m.path,clip:m.clip,borrowed:!!m.borrowed}:{motion:k,path:null}})
  /* the hit reaction the body keeps: its own clip, as bound before the guard was */
  const h=B.look.motions.hit;out.hit=h?{path:h.path,clip:h.clip,borrowed:!!h.borrowed}:null
  return out
 }
 return {begin,nextTurn,choose,usePower}
}

const record={powers:[]}
for(const [hero,first,second] of [['hero.base.paladin-hunk','power.kite-shield.shield-wall','power.kite-shield.raise-guard'],
  ['hero.base.priest-armored','power.round-shield.turn-aside','power.round-shield.brace'],['hero.base.warrior-iron','power.tower-shield.cover','power.tower-shield.stand-tall']]){
 const B=await battle(hero)
 B.begin()
 record.powers.push(await B.usePower(first))
 B.nextTurn();B.choose()
 // the next Turn the hero is proposed, not begun: its power clicked on the bar begins its activation (viewer.xcom-camera)
 record.powers.push(await B.usePower(second))
}
process.stdout.write(JSON.stringify(record))
