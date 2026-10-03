// viewer.civilian-held-dagger (engine DECISIONS.md 2026-10-03 'the civilians hold their dagger as a weapon, not baked into a body
// copy', Andrew: "We want to use a knife or a dagger the way they're supposed to be used."). The item's expect, on the BUILT
// sandbox (the page PLAY.html's Orphanage card opens: BATTLE-SANDBOX.html?play=encounter.opening.orphanage): "each Orphan Child
// and the School Teacher (where placed) holds a dagger in the right hand at idle and while walking; when one attacks it plays a
// stab with the dagger in hand; ... no knife-v1 equipped.glb is referenced by the page." The headless page has no WebGL, so the
// bodies are stood up beside it from the viewer's own modules and the files on disk (as tools/shield-guard.verify.mjs does) and
// handed to the page as its cast; the page's own pack (its embedded characterModels) says what each holds and plays. Standing:
// the dagger on each civilian's right hand. Walking: End Activation passes to the next hero, a double-click walks it, the page's
// pump plays the walk and the dagger is checked at every frame. Attack: the stab the page binds as that body's attack, played
// through to its end with the dagger in hand (the page's own strike cue is played on the library battle by the viewer's
// tools/civilian-held-dagger.test.mjs). Prints one line per step and `civilian-held-dagger: … passed` at the end.
import assert from 'node:assert/strict'
import {resolve,dirname} from 'node:path'
import {fileURLToPath} from 'node:url'
import {readFileSync} from 'node:fs'
import {bootSlice} from './atlas-dom.mjs'

const PAGE=resolve(process.argv[2]??'BATTLE-SANDBOX.html')
assert.doesNotMatch(readFileSync(PAGE,'utf8'),/knife-v1/,'no body copy with the knife built in is referenced by the page')
process.chdir(resolve(dirname(fileURLToPath(import.meta.url)),'../../viewer'))
const {THREE,modules}=await import('../../viewer/tools/atlas-test-runtime.mjs'),A=await modules()
const location={protocol:'http:',href:'http://127.0.0.1:4230/viewer/BATTLE-VIEWER.html'}
const fetch=async url=>{const b=readFileSync('..'+new URL(url).pathname);return{ok:true,arrayBuffer:async()=>b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength)}}
const loads=new Map(),load=look=>{if(!loads.has(look.id))loads.set(look.id,A.loadLook(look,{location,fetch,textures:false}));return loads.get(look.id)}
const say=(...a)=>console.log('  '+a.join(' '))
const ARMED=['hero.fixed.orphans','hero.fixed.school-teacher']

const {w}=bootSlice(PAGE,{search:'?play=encounter.opening.orphanage'}),h=w.__sandbox
const V=()=>h.viewer._V,ctx=()=>h.session.ctx
const settle=()=>{for(let n=0;n<4000&&h.busy;n++)w._flush(50);assert.equal(h.busy,false,'the board settles')}
settle()
const cast=A.createCast(V(),new THREE.Scene(),new THREE.Matrix4().makeScale(.01,.01,.01),{load,readStyle:el=>el.style})
V().cast=cast;cast.frame(0);await cast.settle();cast.frame(0)
const V3=()=>new THREE.Vector3()
function dagger(B,what){
 let socket=null;B.stage.traverse(o=>{if(o.name==='held:0:item.dagger')socket=o})
 assert.ok(socket,`${what}: a dagger on the body`);assert.equal(socket.parent?.name,'CC_Base_R_Hand',`${what}: in the right hand`)
 let meshes=0;socket.traverse(o=>{if(o.isMesh&&o.visible)meshes++});assert.ok(meshes>0,`${what}: drawn`)
 B.stage.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(socket),size=box.max.distanceTo(box.min)
 assert.ok(size>.05&&size<.6,`${what}: dagger-sized (${size.toFixed(3)} m)`)
 const d=socket.getWorldPosition(V3()).distanceTo(socket.parent.getWorldPosition(V3()));assert.ok(d<.1,`${what}: its grip ${d.toFixed(3)} m from the hand`)
}
// 1. standing: the page's pack arms each civilian placed, and its body holds the dagger at idle
const civ=ctx().state.units.filter(u=>ARMED.includes(u.typeId)&&u.lifeState==='standing')
assert.deepEqual([...new Set(civ.map(u=>u.typeId))].sort(),ARMED,'the Orphanage places the Orphan Child and the School Teacher')
for(const u of civ){
 const look=V().data.models[u.typeId].looks[0]
 assert.deepEqual(look.props.map(p=>[p.item,p.hand,p.fit]),[['item.dagger','R','body']],`${u.name}: the page's pack arms it`)
 assert.doesNotMatch(look.motions.attack.path,/knife-v1/);assert.equal(look.motions.attack.borrowed,true,`${u.name}: the stab is borrowed onto the unarmed body`)
 const B=cast.body(u.id);assert.ok(B,`${u.name} stands as its body`);assert.equal(B.motion,'idle');dagger(B,`${u.name} standing`)
 say(`1 ${u.name} (${u.typeId}) stands with the dagger in its right hand; its attack is ${look.motions.attack.clip}`)
}
// 2. walking: End Activation until a civilian acts, then a double-click walks it; the pump plays the walk, frame by frame
const hexBtn=x=>V().dom.stage.querySelectorAll('.playHex').find(n=>+n.dataset.hex===x)
for(let n=0;n<6&&!ARMED.includes(ctx().state.units[ctx().battleCursor.actor]?.typeId);n++){V().dom.root.querySelector('#playEndAct').handlers.click({});settle()}
const me=ctx().state.units[ctx().battleCursor.actor];assert.ok(ARMED.includes(me.typeId),'a civilian is begun')
const B=cast.body(me.id),dest=V().play.reach.at(-1),from=me.hex
assert.ok(dest!=null,`${me.name} has somewhere to walk`)
/* the fake DOM finishes every animation at the end of a flush; the token's walk is held open here and driven along its own
   keyframes a frame at a time, as the browser would play it (../viewer/tools/walk-in-step.test.mjs walks it the same way) */
const E=V().layers.UEL.get(me.id),animate=E.root.animate.bind(E.root);let walk=null
E.root.animate=(kf,o)=>{const a=animate(kf,o);if(!walk&&kf.length>1&&o?.duration>0){walk=a;a.end=a.finish;a.finish=()=>{}}return a}
hexBtn(dest).handlers.click({detail:1});hexBtn(dest).handlers.click({detail:2})
for(let n=0;n<4000&&h.busy&&!walk;n++)w._flush(16)
assert.ok(walk,`the board walks ${me.name}'s token`)
let walked=0
const kf=walk.kf.map(k=>({x:parseFloat(k.left),y:parseFloat(k.top)})),frames=Math.max(8,Math.round(walk.opts.duration/1000*30))
for(let k=1;k<frames;k++){
 const f=k/frames*(kf.length-1),j=Math.min(kf.length-2,Math.floor(f)),g=f-j
 E.root.style.left=kf[j].x+(kf[j+1].x-kf[j].x)*g+'px';E.root.style.top=kf[j].y+(kf[j+1].y-kf[j].y)*g+'px'
 cast.frame(1/30);assert.equal(B.motion,'move',`${me.name} walks`);walked++;dagger(B,`${me.name} walking, frame ${walked}`)}
delete E.root.animate;walk.end()
settle();cast.frame(0)
assert.notEqual(ctx().state.units[me.id].hex,from,`${me.name} walked`);assert.ok(walked>3,`${me.name} played its walk (${walked} frames)`)
say(`2 ${me.name} walked hex ${from} -> ${ctx().state.units[me.id].hex}: the dagger in its right hand through ${walked} walking frames`)
// 3. attacking: the stab the page binds, played to its end, the dagger in hand
for(const u of civ){
 const S=cast.body(u.id),len=S.clipLength('attack');assert.ok(S.play('attack'),`${u.name} strikes`)
 assert.equal(S.look.motions.attack.clip,V().data.models[u.typeId].looks[0].motions.attack.clip)
 for(let k=0;k<12&&S.motion==='attack';k++){cast.frame(len/13);dagger(S,`${u.name}'s stab ${k}/12`)}
 say(`3 ${u.name} plays the stab (${len.toFixed(2)} s), the dagger in hand`)
}
console.log('civilian-held-dagger: the Orphanage on the built sandbox, the expect line passed')
