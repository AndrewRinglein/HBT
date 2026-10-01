// viewer.true-3d-camera (engine DECISIONS.md 2026-09-30 "a true 3D battle: an orbit camera, every Orphanage unit its own
// model, no flash of another map"). Andrew: "When I maneuver the map, it stretches the 3D assets." · "True 3D orbit" ·
// "A different map loads for a blink of an eye, and then this map. That other map should not be loading." The kingdom's
// half: the BUILT sandbox opened with ?play=encounter.opening.orphanage mounts the shared viewer with its one real
// perspective camera — the board drawn through it, the Orphanage's 3D scene bound — and never shows a flat board in the
// scene's place: this headless page has no WebGL 2, so it says so plainly and keeps the board hidden.
import assert from 'node:assert/strict'
import {bootSlice} from './atlas-dom.mjs'
const page=process.argv[2]??'BATTLE-SANDBOX.html'
const {w}=bootSlice(page,{search:'?play=encounter.opening.orphanage',width:1600,height:900}),viewer=w.__sandbox.viewer
assert.ok(viewer,'?play= mounts the battle')
const V=viewer._V,wrap=V.dom.stage.parentNode
assert.equal(V.data.atlas?.kind,'painted','the Orphanage battle stands on its 3D scene');assert.equal(V.data.atlas.scene,'orphanage-riverside')
assert.ok(V.camera3d&&V.camera3d.isPerspectiveCamera,'one real perspective camera')
assert.match(V.dom.stage.style.transform,/^matrix3d\(/,'the board is drawn through the camera')
assert.ok(+V.dom.stage.style.getPropertyValue('--aniso')<1,'standees undo the board\'s south squeeze')
const before=V.camera3d.position.clone();viewer.turn(180);assert.ok(V.camera3d.position.distanceTo(before)>1,'the camera turns about the board');viewer.resetView()
assert.ok(V.camera3d.position.distanceTo(before)<1e-9,'Reset: the starting angled view')
assert.ok(wrap.classList.contains('terrain3d-failed')&&!wrap.classList.contains('terrain3d-ready'),'no scene drawn here, and no flat board in its place')
assert.match(wrap.querySelector('#terrainLoading').textContent,/no WebGL 2/,'said plainly')
console.log('sandbox 3d camera: ?play=encounter.opening.orphanage mounts the shared viewer on the Orphanage\'s 3D scene with one real perspective camera (the board drawn through it; it turns and Resets); with no WebGL 2 it says so and shows no flat board passed')
