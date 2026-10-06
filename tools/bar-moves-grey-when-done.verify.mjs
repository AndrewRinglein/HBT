// viewer.bar-moves-grey-when-done (engine DECISIONS.md 2026-10-03 'the action bar: the moves grey slightly once the move is
// done, nothing else greys; every action shows all it does; the Soldier holds no sword', Andrew: "There should be a slight
// graying out of the move actions after move actions are completed." / "Just gray the moves out after a move is done."). The
// item's expect, on the BUILT sandbox (BATTLE-SANDBOX.html?play=encounter.opening.orphanage): "a hero beginning its Activation
// shows every action at full strength; after its movement is spent its move actions are slightly greyed and its attacks and
// powers are not; an action the engine refuses still looks disabled, not merely greyed; a page test reads the move buttons'
// state before and after the move, and reports what the engine does to the move".
// The bar is read against the ENGINE's own state at each step — the unit's moveUsed and movePointsLeft, and whether the engine
// would still take a use of each move action (the page's own play facts carry the answer; the engine's unit is read beside
// it). Two heroes: the first walks as far as it can, the second walks ONE hex (its move begun, not walked out) - swapped
// 2026-10-04 with engine rule.walked-unit-has-moved (the Law 10 note at step 2).
// Prints one line per step, the findings for Andrew, and `bar-moves-grey-when-done: … passed`.
import assert from 'node:assert/strict'
import {bootSlice} from './atlas-dom.mjs'
const {w}=bootSlice(process.argv[2]??'BATTLE-SANDBOX.html',{search:'?play=encounter.opening.orphanage'}),h=w.__sandbox
const V=()=>h.viewer._V,ctx=()=>h.session.ctx,unit=id=>ctx().state.units[id]
const say=(...a)=>console.log('  '+a.join(' '))
const settle=()=>{for(let i=0;i<8000&&(h.busy||i<3);i++)w._flush(20);assert.equal(h.busy,false,'the board settles');assert.equal(h.fault,'','no fault')}
const rows=()=>V().dom.actionbar.querySelectorAll('.acRow').filter(r=>r.dataset.act)
const has=(r,c)=>r.className.split(/\s+/).includes(c)
const greyed=()=>rows().filter(r=>has(r,'moveDone')).map(r=>r.dataset.act)
const disabled=()=>rows().filter(r=>has(r,'cool')).map(r=>r.dataset.act)
const isMove=id=>{const a=ctx().actions[id];return !!a.move&&!a.attack}
const movesOf=id=>unit(id).actions.filter(isMove)
const hexBtn=x=>V().dom.stage.querySelectorAll('.playHex').find(n=>+n.dataset.hex===x)
const walkTo=dest=>{hexBtn(dest).handlers.click({detail:1});hexBtn(dest).handlers.click({detail:2});settle()}
const acting=()=>{const c=ctx().battleCursor;assert.equal(c.at,'acting');return c.actor}
const dist=(a,b)=>ctx().geo.distance(a,b)
/** arm a move action on the bar, as a click on its row does, and read what the engine offers for it (the reach) */
const offered=id=>{V().offerPlay({kind:'slot',actionId:id,unit:acting()});settle();const n=V().play.slot===id?V().play.reach.length:0;V().offerPlay({kind:'back'});settle();return n}

settle()
// 1. a hero beginning its Activation: every action at full strength
const a=acting(),A=unit(a)
assert.deepEqual([A.moveUsed,A.primaryUsed],[false,false],'the engine: nothing spent yet')
assert.deepEqual(greyed(),[]);assert.deepEqual(disabled(),[]);assert.deepEqual(V().play.moveDone,[])
assert.ok(movesOf(a).length>=2,`${A.name} has its basic move and another movement power`)
const [basicA,...othersA]=movesOf(a)
say(`1 ${A.name} begins: ${rows().length} buttons, none greyed, none disabled (moves: ${movesOf(a).map(id=>ctx().actions[id].name).join(', ')})`)
/* Law 10, 2026-10-04 — rule.walked-unit-has-moved (engine item; engine DECISIONS.md 2026-10-04 'after the backlog run: ... moves are refused
   once a unit has walked ...': asked "Once a unit has walked, should Leap and Side Roll grey out and be refused? Today the engine still
   accepts them." - "2 yes"). Steps 2 and 3 held what the engine did BEFORE the ruling: after a walk of one hex "the host names no move as done
   … and the bar greys nothing", and after the whole walk "Leap, Side Roll … stay at full strength because the engine still takes them". The
   engine now takes no OTHER movement from a unit that has walked. The two readings are kept and their heroes swapped, for this reason: a
   hero whose whole movement is walked out and who has nothing else left now ends its Activation by itself (viewer.auto-end-no-actions,
   "No remaining actions possible") - there is no bar to read - so the whole walk is the FIRST hero's (it still has its shield's powers),
   and the walk of one hex is the next hero's.
   was (step 2, the first hero after one hex): assert.deepEqual(V().play.moveDone,[],'so the host names no move as done');assert.deepEqual(greyed(),[],'and the bar greys nothing')
   was (step 3, the next hero after its whole movement): const still=othersB.filter(id=>!V().play.moveDone.includes(id))
        for(const id of still){assert.ok(!greyed().includes(id));assert.ok(offered(id)>0,`… is not greyed because the engine still takes it`)} */
// 2. it walks as far as it can: every move action is done — the basic move walked out, the others closed by the walk
const far=[...V().play.reach].sort((x,y)=>dist(A.hex,y)-dist(A.hex,x)||x-y)[0],steps=dist(A.hex,far)
walkTo(far)
assert.equal(acting(),a,'still its Activation: it has powers left');assert.equal(A.hex,far)
assert.deepEqual([A.moveUsed,A.movePointsLeft,A.walked],[true,0,true],`the engine: ${A.name} walked ${steps} hexes, its movement is spent and it has walked`)
assert.ok(V().play.moveDone.includes(basicA),'the host names the basic move as done')
assert.ok(greyed().includes(basicA),'and its button is slightly greyed')
assert.deepEqual([...V().play.moveDone].sort(),[...movesOf(a)].sort(),'the host names every move action as done')
for(const id of V().play.moveDone)assert.equal(offered(id),0,`${ctx().actions[id].name} is greyed and the engine takes no use of it`)
assert.deepEqual(greyed().slice().sort(),[...V().play.moveDone].sort(),'the greyed buttons are exactly the moves the host names')
// nothing else greys: every attack and power is at full strength, and nothing looks disabled
for(const r of rows())if(!isMove(r.dataset.act))assert.ok(!has(r,'moveDone')&&!has(r,'cool'),`${r.dataset.act} is at full strength`)
assert.deepEqual(disabled(),[],'no button wears the disabled look: the slight grey is its own')
say(`2 after ${A.name} walks its whole movement (${steps} hexes): ${greyed().map(id=>ctx().actions[id].name).join(', ')} slightly greyed - the engine takes no movement from it now (walked=true); attacks and powers untouched`)
V().dom.root.querySelector('#playEndAct').handlers.click({});settle()
// 3. the next hero walks ONE hex: its movement action is spent, its movement is not walked out — the engine still offers the rest,
//    and no other movement
const b=acting(),B=unit(b);assert.notEqual(b,a)
assert.deepEqual(greyed(),[],`${B.name} begins with nothing greyed`)
const [basicB,...othersB]=movesOf(b)
assert.ok(othersB.length>0,`${B.name} has its basic move and another movement power`)
const near=V().play.reach.find(x=>dist(B.hex,x)===1);assert.ok(near!==undefined,'a hex one step away')
const budget=B.movePointsLeft
walkTo(near)
assert.equal(acting(),b,'still its Activation');assert.equal(B.moveUsed,true,'the engine: its movement action is spent');assert.ok(B.movePointsLeft>0&&B.movePointsLeft<budget,'and it has movement left')
assert.equal(B.walked,true,'the engine: it has walked')
const restB=V().play.slot===basicB?V().play.reach.length:offered(basicB)
assert.ok(restB>0,'the engine still offers the rest of the basic move')
assert.ok(!V().play.moveDone.includes(basicB)&&!greyed().includes(basicB),'the basic move is not done: the rest of the walk is still offered')
assert.deepEqual([...V().play.moveDone].sort(),[...othersB].sort(),'the host names every other movement of the hero as done');assert.deepEqual(greyed().slice().sort(),[...othersB].sort(),'and the bar greys exactly those')
for(const id of othersB)assert.equal(offered(id),0,`${ctx().actions[id].name} is greyed and the engine takes no use of it`)
for(const r of rows())if(!isMove(r.dataset.act))assert.ok(!has(r,'moveDone')&&!has(r,'cool'),`${r.dataset.act} is at full strength`)
say(`3 after ${B.name} walks one hex: the engine's unit has moveUsed=true and walked=true, ${B.movePointsLeft} of ${budget} movement left, and still takes ${ctx().actions[basicB].name} to ${restB} hexes (the same move action since engine rule.one-move-action-one-primary-action, 2026-10-06; until then as its primary action) — not greyed; ${othersB.map(id=>ctx().actions[id].name).join(', ')} greyed: the engine takes no other movement after a walk`)
// 4. the grey leaves with the Activation: the next unit's bar is at full strength
V().dom.root.querySelector('#playEndAct').handlers.click({});settle()
assert.notEqual(acting(),b);assert.deepEqual(greyed(),[]);assert.deepEqual(V().play.moveDone,[])
say(`4 ${unit(acting()).name} begins: nothing greyed`)
console.log('  FOUND for Andrew: (a) a paid attack or power made first ends the Activation at once (engine rule.primary-ends-activation), so the move is lost with it and there is no bar left to grey; (b) after a walk cut short the engine still offers the rest of the basic move — the same move action since engine rule.one-move-action-one-primary-action (2026-10-06; until then it was the primary action) — so it is not greyed; (c) [ruled 2026-10-04, engine rule.walked-unit-has-moved] once a hero has walked - one hex or its whole movement - Leap, Side Roll and its other movement powers are refused by the engine and greyed; [ruled 2026-10-06, engine rule.one-move-action-one-primary-action] and after a movement power used BEFORE any walk the walk is refused and greyed the same way (tools/one-move-action-one-primary-action.verify.mjs).')
console.log('bar-moves-grey-when-done: the Orphanage on the built sandbox, the expect line passed')
