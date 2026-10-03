// viewer.tactical-camera (2026-10-01), replaced by viewer.xcom-camera (engine DECISIONS.md 2026-10-01 'the XCOM-style camera':
// "I want to fully replace the camera with an XCOM-style camera. So no tilt, no free rotation."). Law 10: this checked the
// tactical camera's bar (ten buttons, Raise to 75°, Overhead by its button, Q/E by 60°, Reset by its button), which the ruling
// removed; it now checks the same through the same component — the kingdom's half: the BUILT sandbox adopts the shared camera,
// never one of its own — the battle opens 40° above the ground with no camera bar; no tilt by call; Overhead (a host's call)
// looks straight down and, called again, restores the view exactly; E and the arrow keys turn by 90° only while the pointer is
// over this board; the reset (a call) is the starting view; the hero proposed to act is looked at with its portrait.
import assert from 'node:assert/strict'
import {bootSlice} from './atlas-dom.mjs'
const page=process.argv[2]??'BATTLE-SANDBOX.html'
const {w}=bootSlice(page,{search:'?play=encounter.opening.orphanage',width:1600,height:900}),viewer=w.__sandbox.viewer
assert.ok(viewer,'?play= mounts the battle')
const V=viewer._V,wrap=V.dom.stage.parentNode
const fire=(node,type,extra={})=>{for(const f of node.listeners?.[type]||[])f({detail:1,button:0,stopPropagation(){},preventDefault(){},...extra})}
assert.equal(w.document.querySelectorAll('#camBar').length,0,'no camera bar — the component has none, and no second Kingdom camera')
assert.ok(Math.abs(viewer.cameraState.elevation-40)<1e-9,'the battle opens 40° above the ground')
viewer.tilt(-30);assert.ok(Math.abs(viewer.cameraState.elevation-40)<1e-9,'no tilt: still 40°')
const before=V.dom.stage.style.transform
viewer.camera('overhead');assert.equal(viewer.cameraState.stance,'overhead');assert.ok(Math.abs(viewer.cameraState.elevation-90)<1e-9,'Overhead: straight down')
viewer.camera('overhead');assert.equal(V.dom.stage.style.transform,before,'Overhead again: exactly the view before it')
const key=k=>w.document.dispatch('keydown',{key:k,target:w.document.body,preventDefault(){}})
const yaw0=V.view.cam.yaw;key('e');assert.equal(V.view.cam.yaw,yaw0,'the pointer elsewhere: E does nothing')
fire(wrap,'pointerenter');key('e');assert.equal(V.view.cam.yaw,yaw0+90,'over the board: E turns 90°')
key('ArrowLeft');assert.equal(V.view.cam.yaw,yaw0,'the left arrow: 90° back')
viewer.resetView();assert.deepEqual(V.view.cam,{yaw:0,tilt:50,zoom:1},'the reset: the starting angled view')
/* Law 10, viewer.turn-taking (engine DECISIONS.md 2026-10-03 'a hero starts its Activation with its basic move armed'; kingdom
   SWITCHES playQueueProposal overturned): the first hero is begun, not proposed and looked at — was: at 'selecting', the
   proposed hero is V.view.inspectId */
if(w.__sandbox.busy)w.__sandbox.viewer.seek(w.__sandbox.session.ctx.events.length)
const proposed=w.__sandbox.session.ctx.battleCursor.at==='acting'?w.__sandbox.session.ctx.battleCursor.actor:null
assert.ok(proposed!=null&&V.S.U[proposed]?.side==='hero','the hero acting is the one shown')
assert.notEqual(V.dom.root.querySelector('#unitPortrait').style.display,'none','with its portrait in the lower-left corner')
console.log('sandbox XCOM camera: the built sandbox adopts the shared camera (40° fixed, no bar, Overhead by call and back exactly, scoped 90° turns, reset by call, the hero acting shown with its portrait) through the component passed')
