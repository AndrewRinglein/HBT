// viewer.civilian-dagger-grip-punch (engine DECISIONS.md 2026-10-03 'a held weapon is gripped: the hand closes round it, for every
// body' and 'the civilians' dagger attack: the Hook punch for now; a hand-keyed standing stab is made for review'). The item's expect,
// on the BUILT sandbox (the page PLAY.html's Orphanage card opens: BATTLE-SANDBOX.html?play=encounter.opening.orphanage): "the Orphan
// Child's and the School Teacher's fingers close round the dagger standing, walking and attacking; their attack is the Hook punch
// with the dagger in hand; no walk-assassinate clip is referenced by the page; the stab candidate ... is not on the page." As
// tools/civilian-held-dagger.verify.mjs does, the bodies are stood up beside the headless page from the viewer's own modules and the
// files on disk and handed to the page as its cast; the page's own pack says what each holds, its grasp and what it plays. Closed is
// measured on the drawn skin as the viewer's tools/civilian-dagger-grip-punch.test.mjs measures it: the share of the 36 ten-degree
// sectors round the handle where the right hand's skin lies within 6 mm of it, 70% or more. Prints one line per step and
// `civilian-dagger-grip-punch: … passed` at the end.
import assert from 'node:assert/strict'
import {resolve,dirname} from 'node:path'
import {fileURLToPath} from 'node:url'
import {readFileSync} from 'node:fs'
import {bootSlice} from './atlas-dom.mjs'

const PAGE=resolve(process.argv[2]??'BATTLE-SANDBOX.html'),html=readFileSync(PAGE,'utf8')
assert.doesNotMatch(html,/walk-assassinate/,'no walk-assassinate clip is referenced by the page')
assert.doesNotMatch(html,/standing-stab/,'the stab candidate is not on the page')
process.chdir(resolve(dirname(fileURLToPath(import.meta.url)),'../../viewer'))
const {THREE,modules}=await import('../../viewer/tools/atlas-test-runtime.mjs'),A=await modules()
const location={protocol:'http:',href:'http://127.0.0.1:4230/viewer/BATTLE-VIEWER.html'}
const fetch=async url=>{const b=readFileSync('..'+new URL(url).pathname);return{ok:true,arrayBuffer:async()=>b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength)}}
const loads=new Map(),load=look=>{if(!loads.has(look.id))loads.set(look.id,A.loadLook(look,{location,fetch,textures:false}));return loads.get(look.id)}
const say=(...a)=>console.log('  '+a.join(' '))
const ARMED=['hero.fixed.orphans','hero.fixed.school-teacher']
const GRASP=JSON.parse(readFileSync('../assets/characters/oathblade-armor/rebuild/civilian-study/held-dagger-grasp.json','utf8'))
const HOOK=JSON.parse(readFileSync('../assets/characters/oathblade-armor/rebuild/free-motion-study/selections.json','utf8')).clips.hook
const CLOSED=.7,WRAP=.006,V3=()=>new THREE.Vector3()

const {w}=bootSlice(PAGE,{search:'?play=encounter.opening.orphanage'}),h=w.__sandbox
const V=()=>h.viewer._V,ctx=()=>h.session.ctx
const settle=()=>{for(let n=0;n<4000&&h.busy;n++)w._flush(50);assert.equal(h.busy,false,'the board settles')}
settle()
const cast=A.createCast(V(),new THREE.Scene(),new THREE.Matrix4().makeScale(.01,.01,.01),{load,readStyle:el=>el.style})
V().cast=cast;cast.frame(0);await cast.settle();cast.frame(0)
/** how far round the handle the right hand's skin closes, as drawn (0..1) */
function closed(B,what){
 B.stage.updateMatrixWorld(true)
 let socket=null;B.stage.traverse(o=>{if(o.name==='held:0:item.dagger')socket=o})
 assert.ok(socket,`${what}: a dagger on the body`);assert.equal(socket.parent?.name,'CC_Base_R_Hand',`${what}: in the right hand`)
 const g=GRASP.bodies[B.look.id];assert.ok(g,`${what}: its body has a grasp`)
 let mesh=null;B.stage.traverse(o=>{if(o.isSkinnedMesh&&o.name===g.mesh)mesh=o})
 const bins=new Set(),p=V3(),r=g.grip.handleRadius,along=g.fit.palmSpanMetres*.65
 for(const v of g.weights.vertices){socket.worldToLocal(mesh.getVertexPosition(v,p).applyMatrix4(mesh.matrixWorld));if(Math.abs(p.z)<along&&Math.hypot(p.x,p.y)<r+WRAP)bins.add(Math.floor((Math.atan2(p.y,p.x)+Math.PI)/(2*Math.PI)*36)%36)}
 const c=bins.size/36;assert.ok(c>=CLOSED,`${what}: the hand closes ${(c*100).toFixed(0)}% round the handle`);return c
}
// 1. standing: the page's pack arms and grips each civilian placed; its attack is the Hook punch
const civ=ctx().state.units.filter(u=>ARMED.includes(u.typeId)&&u.lifeState==='standing')
assert.deepEqual([...new Set(civ.map(u=>u.typeId))].sort(),ARMED,'the Orphanage places the Orphan Child and the School Teacher')
for(const u of civ){
 const look=V().data.models[u.typeId].looks[0]
 assert.deepEqual(look.props.map(p=>[p.item,p.hand,p.fit,!!p.grasp]),[['item.dagger','R','body',true]],`${u.name}: the page's pack arms it with its grasp`)
 assert.deepEqual([look.motions.attack.clip,look.motions.attack.sha256,look.motions.attack.borrowed],[HOOK.clip,HOOK.sha256,true],`${u.name}: its attack is the Hook punch`)
 const B=cast.body(u.id);assert.ok(B,`${u.name} stands as its body`);assert.equal(B.motion,'idle')
 say(`1 ${u.name} (${u.typeId}) stands gripping the dagger: ${(closed(B,`${u.name} standing`)*100).toFixed(0)}% round the handle; its attack is ${look.motions.attack.clip}`)
}
// 2. walking: End Activation until a civilian acts, then a double-click walks it; the pump plays the walk, frame by frame
const hexBtn=x=>V().dom.stage.querySelectorAll('.playHex').find(n=>+n.dataset.hex===x)
for(let n=0;n<6&&!ARMED.includes(ctx().state.units[ctx().battleCursor.actor]?.typeId);n++){V().dom.root.querySelector('#playEndAct').handlers.click({});settle()}
const me=ctx().state.units[ctx().battleCursor.actor];assert.ok(ARMED.includes(me.typeId),'a civilian is begun')
const B=cast.body(me.id),dest=V().play.reach.at(-1),from=me.hex
assert.ok(dest!=null,`${me.name} has somewhere to walk`)
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
 cast.frame(1/30);assert.equal(B.motion,'move',`${me.name} walks`);walked++;closed(B,`${me.name} walking, frame ${walked}`)}
delete E.root.animate;walk.end()
settle();cast.frame(0)
assert.notEqual(ctx().state.units[me.id].hex,from,`${me.name} walked`);assert.ok(walked>3,`${me.name} played its walk (${walked} frames)`)
say(`2 ${me.name} walked hex ${from} -> ${ctx().state.units[me.id].hex}: gripping the dagger through ${walked} walking frames`)
// 3. attacking: the Hook punch the page binds, played to its end, the hand closed round the dagger
for(const u of civ){
 const S=cast.body(u.id),len=S.clipLength('attack');assert.ok(S.play('attack'),`${u.name} strikes`)
 assert.equal(S.look.motions.attack.clip,HOOK.clip)
 for(let k=0;k<12&&S.motion==='attack';k++){cast.frame(len/13);closed(S,`${u.name}'s punch ${k}/12`)}
 say(`3 ${u.name} plays the Hook punch (${len.toFixed(2)} s), gripping the dagger`)
}
console.log('civilian-dagger-grip-punch: the Orphanage on the built sandbox, the expect line passed')
