// viewer.tutorial-overlays (engine DECISIONS.md 2026-10-04 'the opening's tutorial: the first hero's class line, no map before
// battle 1, the Orphanage's lessons, the camera shows what arrives, new enemies are named, a closer start', Andrew: "there
// should be a notification message across the center that is gold and easy to see" / "the gold message doesn't stay up. It only
// lasts for a time." / "an arrow points at them and says \"Civilians.\"" / "we're going to point an arrow over at the move
// button" / "There are two arrows pointing at the two base enemy numbers." / "It points to the right and says you can see all
// the details about this enemy on the right."). The item's expect, on the BUILT sandbox
// (BATTLE-SANDBOX.html?play=encounter.opening.orphanage), driven as a kingdom lesson would drive it — through the page's own
// mounted viewer (window.__sandbox.viewer): tell, point, look. Read against the ENGINE: the lessons send nothing (the battle's
// sequence number and whose Activation it is are untouched), the things pointed at are the engine's (the acting hero's own
// move action, the Zombie), and a notice that holds keeps the board from playing on under it.
// Prints one line per check and `tutorial-overlays: … passed`.
import assert from 'node:assert/strict'
import {bootSlice} from './atlas-dom.mjs'
const {w}=bootSlice(process.argv[2]??'BATTLE-SANDBOX.html',{search:'?play=encounter.opening.orphanage'}),h=w.__sandbox
const v=()=>h.viewer,V=()=>h.viewer._V,ctx=()=>h.session.ctx,unit=id=>ctx().state.units[id]
const say=(...a)=>console.log('  '+a.join(' '))
const settle=()=>{for(let i=0;i<8000&&(h.busy||i<3);i++)w._flush(20);assert.equal(h.busy,false,'the board settles');assert.equal(h.fault,'','no fault')}
const wrap=()=>V().dom.stage.parentNode,notice=()=>wrap().querySelector('#tutNotice')
const pose=()=>({...V().camTarget})
settle()
const seq=ctx().state.seq,actor=ctx().battleCursor.actor,me=unit(actor)
// 1. the notice: its words across the board, gone after its time, sooner on a click
const said=[]
v().tell(['Welcome to the Orphanage.','Keep the children alive.'],{ms:2500,onDone:x=>said.push(x)})
assert.ok(notice(),'the notice is on the board');assert.match(notice().textContent,/Welcome to the Orphanage\..*Keep the children alive\./)
w._flush(2400);assert.ok(notice(),'still up');w._flush(200);assert.equal(notice(),null,'gone by itself');assert.deepEqual(said,['time'])
v().tell('Click me away.',{onDone:x=>said.push(x)});notice().handlers.click({stopPropagation(){}});assert.equal(notice(),null);assert.deepEqual(said,['time','click'])
say('1 a gold notice of two lines stood for its 2.5 s and went; another went on a click')
// 2. pointers: the Zombie by name, the basic move's slot, the panel, the Zombie's two numbers — together
const zombie=ctx().state.units.find(u=>u.side==='enemy'&&u.lifeState==='standing'),move=me.actions.find(id=>ctx().actions[id].move&&!ctx().actions[id].attack)
const pz=v().point({unit:zombie.id},{word:zombie.name.replace(/ \d+$/,'')}),pm=v().point({action:move},{word:'Move'}),pp=v().point({ui:'panel'},{word:'All the details are on the right.'})
const n1=v().point({unit:zombie.id,part:'move'}),n2=v().point({unit:zombie.id,part:'attack'})
w._flush(40)
const st=v().overlays.pointers,by=id=>st.find(p=>p.id===id),E=V().layers.UEL.get(zombie.id)
assert.equal(st.length,5);assert.equal(by(pz.id).word,'Zombie');assert.equal(by(pz.id).target,'unit:'+zombie.id)
assert.equal(by(pm.id).el,V().dom.actionbar.querySelectorAll('.acRow').find(r=>r.dataset.act===move),'the pointer is on the basic move\'s slot')
assert.equal(by(pp.id).el,V().dom.panel);assert.equal(by(pp.id).side,'left')
assert.equal(by(n1.id).el,E.mv,'one arrow on its movement number');assert.equal(by(n2.id).el,E.dg,'one on its attack number')
assert.equal(V().dom.root.querySelectorAll('.tutPtr').length,5)
say(`2 five pointers at once: "${by(pz.id).word}" over ${zombie.name}, "Move" on ${ctx().actions[move].name}'s slot, the panel from the left, ${zombie.name}'s movement number and its attack number`)
// 3. a look: to a civilian, nearer, and back to the earlier view
const civ=ctx().state.units.find(u=>u.side==='hero'&&/orphan|teacher/.test(u.typeId)),before=pose()
v().look({unit:civ.id},{ms:600,onDone:x=>said.push(x)})
const near=pose();assert.ok(near.zoom>before.zoom*1.2,'nearer than the play zoom');assert.ok(Math.abs(near.x-V().data.POS[civ.hex].px)<1,'the view is on the civilian (across; the board\'s edge holds what it must)')
for(let i=0;i<200&&said.at(-1)!=='back';i++)w._flush(20)
assert.equal(said.at(-1),'back');assert.deepEqual(pose(),before,'the earlier view again')
say(`3 the view went to ${civ.name} at ${near.zoom.toFixed(2)}x (play is ${before.zoom.toFixed(2)}x), held, and came back`)
// 4. nothing was sent: the engine's battle is where it was; the pointers are still up (they outlast the notice and the look)
assert.deepEqual([ctx().state.seq,ctx().battleCursor.actor],[seq,actor],'the lessons send no command');assert.equal(v().overlays.pointers.length,5)
say(`4 the engine's battle is untouched (sequence ${seq}, ${me.name} acting); the five pointers stayed`)
// 5. a notice that holds: the Enemy Phase does not play on under it
V().dom.root.querySelector('#playEndTurn').handlers.click({});const ask=V().dom.root.querySelector('#playAsk');if(ask&&ask.style.display!=='none')V().dom.root.querySelector('#playAskYes').handlers.click({})
w._flush(20)
const c0=V().cursor;v().tell('The enemy moves now.',{ms:4000,hold:true,onDone:x=>said.push(x)})
w._flush(3000);assert.equal(V().cursor,c0,'the board waits under the notice');assert.equal(h.busy,true,'the host is still busy: the Enemy Phase has not been shown')
w._flush(1100);assert.equal(said.at(-1),'time');settle();assert.ok(V().cursor>c0,'then it plays on')
say('5 with the Enemy Phase to show, a notice that holds kept the board still for its 4 s; then the phase played')
assert.equal(v().unpoint(),5);assert.equal(V().dom.root.querySelectorAll('.tutPtr').length,0)
console.log('tutorial-overlays: the Orphanage on the built sandbox, the expect line passed')
