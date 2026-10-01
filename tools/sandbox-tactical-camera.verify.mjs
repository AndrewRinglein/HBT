// viewer.tactical-camera (2026-10-01). Andrew accepted the caravan preview's camera ("Okay, that works well. How do we add
// this to our game visualization?") and then: "This is a redesign of our camera … We need to redesign the camera." The
// kingdom's half: the BUILT sandbox adopts it through the shared component, never a camera of its own — the battle opens at
// 40° above the ground with the camera bar on the board; Raise stops at 75°; Overhead looks straight down and, pressed again,
// restores the view exactly; Q and E turn by 60° only while the pointer is over this board.
import assert from 'node:assert/strict'
import {bootSlice} from './atlas-dom.mjs'
const page=process.argv[2]??'BATTLE-SANDBOX.html'
const {w}=bootSlice(page,{search:'?play=encounter.opening.orphanage',width:1600,height:900}),viewer=w.__sandbox.viewer
assert.ok(viewer,'?play= mounts the battle')
const V=viewer._V,wrap=V.dom.stage.parentNode,DEG=Math.PI/180
const fire=(node,type,extra={})=>{for(const f of node.listeners?.[type]||[])f({detail:1,button:0,stopPropagation(){},preventDefault(){},...extra})}
const btn=k=>V.dom.camBar.querySelectorAll('button').find(b=>b.getAttribute('data-cam')===k)
for(const k of ['reset','whole','angled','lower','raise','overhead','left','right','focus','inspect'])assert.ok(btn(k),`the ${k} button is on the board`)
assert.equal(w.document.querySelectorAll('#camBar').length,1,'one camera bar — the component\'s, no second Kingdom camera')
const elev=()=>{const c=V.camera3d,e=c.matrixWorld.elements;return 90-Math.acos(Math.min(1,e[9]))/DEG}
assert.ok(Math.abs(viewer.cameraState.elevation-40)<1e-9,'the battle opens 40° above the ground')
for(let i=0;i<5;i++)fire(btn('raise'),'click')
assert.ok(Math.abs(viewer.cameraState.elevation-75)<1e-9,'Raise angle stops at 75°')
const before=V.dom.stage.style.transform
fire(btn('overhead'),'click');assert.equal(viewer.cameraState.stance,'overhead');assert.ok(Math.abs(viewer.cameraState.elevation-90)<1e-9,'Overhead: straight down')
fire(btn('overhead'),'click');assert.equal(V.dom.stage.style.transform,before,'Overhead again: exactly the view before it')
const key=k=>w.document.dispatch('keydown',{key:k,target:w.document.body,preventDefault(){}})
const yaw0=V.view.cam.yaw;key('e');assert.equal(V.view.cam.yaw,yaw0,'the pointer elsewhere: E does nothing')
fire(wrap,'pointerenter');key('e');assert.equal(V.view.cam.yaw,yaw0+60,'over the board: E turns 60°')
fire(btn('reset'),'click');assert.deepEqual(V.view.cam,{yaw:0,tilt:50,zoom:1},'Reset: the starting angled view')
console.log('sandbox tactical camera: the built sandbox adopts the shared tactical camera (40° start, Raise to 75°, Overhead and back exactly, scoped Q/E, Reset) through the component, with one camera bar passed')
