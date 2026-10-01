// viewer.caravan-scene (2026-10-01; engine DECISIONS.md 2026-10-01 "the caravan's fight", provisional: "Imps and Bloodhounds
// (Recommended)"). The kingdom's half: the BUILT sandbox opened with ?play=encounter.caravan-aftermath fields the engine's
// encounter — two Bloodhounds and two Imps at the east end of the road, the heroes at the west — and mounts the shared viewer
// on the caravan's painted scene with its presentation (the dark backdrop, the surroundings, the fires and the cursed fog),
// through the one component and its one camera.
import assert from 'node:assert/strict'
import {bootSlice} from './atlas-dom.mjs'
const page=process.argv[2]??'BATTLE-SANDBOX.html'
const {w}=bootSlice(page,{search:'?play=encounter.caravan-aftermath',width:1600,height:900}),viewer=w.__sandbox.viewer
assert.ok(viewer,'?play=encounter.caravan-aftermath mounts the battle')
const V=viewer._V,S=w.__sandbox.session
assert.equal(V.data.atlas?.kind,'painted');assert.equal(V.data.atlas.scene,'caravan-aftermath','on the caravan\'s painted scene')
const P=V.data.atlas.presentation
assert.ok(P&&P.surroundings&&P.effects.fire&&P.effects.cursedGround,'with its surroundings, fires and fog')
assert.equal(P.fireSites.length,11);assert.equal(P.cursedSites.length,31);assert.equal(P.environment.background,'#302c25')
const units=S.ctx.state.units,W=S.ctx.geo.board.width
assert.deepEqual(units.filter(u=>u.side==='enemy').map(u=>u.typeId).sort(),['unit.bloodhound','unit.bloodhound','unit.imp','unit.imp'])
for(const u of units.filter(u=>u.side==='enemy'))assert.ok(u.hex%W>=29,`${u.typeId} at the east end`)
for(const u of units.filter(u=>u.side==='hero'))assert.ok(u.hex%W<=3,`${u.typeId} at the west end`)
assert.equal(w.document.querySelectorAll('#camBar').length,1,'the shared camera, one bar')
console.log('sandbox caravan: ?play=encounter.caravan-aftermath fields 2 Bloodhounds and 2 Imps east against the heroes west, on the caravan\'s painted scene with its surroundings, 11 fires and 31 cursed hexes, through the shared viewer passed')
