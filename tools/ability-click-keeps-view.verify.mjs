// viewer.ability-click-keeps-view (engine DECISIONS.md 2026-10-05 'the battle screen must feel smooth: … Clicking an ability no
// longer re-centres the view on the acting unit', Andrew, asked "Should clicking an ability stop re-centring the view on your
// hero?": "3 yes" — overturning 2026-10-01 "Clicking an ability re-centers on the acting unit". "A new Activation still centres
// on the unit that begins."). The item's expect, on the BUILT sandbox (BATTLE-SANDBOX.html?play=encounter.opening.bridge):
// "On the built page's Bridge, scrolled a screen away from the acting hero: clicking Chop on the bar chooses Chop and the view
// does not move; clicking the portrait brings the hero to the middle; clicking an enemy's card in the top bar brings that
// enemy to the middle and shows its panel; ending the Activation centres on the next hero as now; a page test reads each."
// Read against the ENGINE too: looking and choosing send nothing — the battle's sequence number and whose Activation it is are
// what they were. Prints one line per check and `ability-click-keeps-view: … passed`.
import assert from 'node:assert/strict'
import {bootSlice} from './atlas-dom.mjs'
const {w}=bootSlice(process.argv[2]??'BATTLE-SANDBOX.html',{search:'?play=encounter.opening.bridge'}),h=w.__sandbox
const V=()=>h.viewer._V,ctx=()=>h.session.ctx,unit=id=>ctx().state.units[id]
const say=(...a)=>console.log('  '+a.join(' '))
const settle=()=>{for(let i=0;i<8000&&(h.busy||i<3);i++)w._flush(20);assert.equal(h.busy,false,'the board settles');assert.equal(h.fault,'','no fault')}
const fire=(node,type,extra={})=>{for(const f of node.listeners?.[type]||[])f({detail:1,button:0,stopPropagation(){},preventDefault(){},...extra})}
const pose=()=>({x:V().camTarget.x,y:V().camTarget.y}),far=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y)
/** is this hex whole on the screen from where the view stands? (the camera's own reading: nothing to slide to show it) */
const inView=hex=>V().revealPan(V().camTarget,hex)===null
const glide=()=>w._flush(1300)
settle();glide()
const acting=()=>ctx().battleCursor.actor
/* the player scrolls: the map moved by hand, a step at a time as the edge scroll moves it, until the acting hero is a screen away */
function scrollAway(){
 const from=pose(),hex=unit(acting()).hex
 for(const dir of [1,-1]){for(let i=0;i<200&&(inView(hex)||far(pose(),from)<700);i++){const was=pose();h.viewer.pan(dir*40,0);if(far(pose(),was)<.5)break}if(!inView(hex))break}
 glide();return far(pose(),from)
}
/** where the view stands when the page's own centring puts it on a unit (the board's edge may stop it short of the very middle) */
const centredOn=id=>{h.viewer.centre(id);glide();return pose()}
const row=id=>V().dom.actionbar.querySelectorAll('.acRow').find(r=>r.dataset.act===id)
const card=id=>V().dom.rail.querySelectorAll('.railchip').find(c=>+c.dataset.i===id)
const CHOP='attack.war-axe.chop'

// 0. the Bridge opens on the hero who acts — the Iron Dwarf, with Chop on its bar
const hero=acting();assert.equal(unit(hero).side,'hero');assert.ok(inView(unit(hero).hex),'the battle opens with the acting hero on the screen')
assert.ok(row(CHOP),`${unit(hero).name} has Chop on the bar`);assert.match(row(CHOP).querySelector('.acName').textContent,/Chop/)
const home=centredOn(hero),seq=ctx().state.seq
// 1. scrolled a screen away, clicking Chop chooses Chop and the view does not move
const gone=scrollAway();assert.ok(gone>400,`scrolled ${gone.toFixed(0)} px`);assert.ok(!inView(unit(hero).hex),'the acting hero is off the screen')
const put=pose()
assert.notEqual(V().play.slot,CHOP,'Chop is not chosen yet')
fire(row(CHOP),'click');settle();glide()
assert.equal(V().play.slot,CHOP,'the click chose Chop: the host\'s plan says so');assert.equal(V().play.actor,hero)
assert.deepEqual(pose(),put,'and the view did not move');assert.ok(!inView(unit(hero).hex),'the hero is still off the screen')
V().render();glide();assert.deepEqual(pose(),put,'nor at the next redraw')
assert.deepEqual([ctx().state.seq,acting()],[seq,hero],'choosing sent the engine nothing')
say(`1 scrolled ${Math.round(gone)} board px from ${unit(hero).name}: clicking Chop chose Chop and the view did not move`)
// 2. clicking the portrait brings the hero to the middle
const P=V().dom.root.querySelector('#unitPortrait');assert.ok(P,'the portrait');assert.notEqual(P.style.display,'none','is shown')
fire(P,'click',{target:P});settle();glide()
assert.ok(far(pose(),home)<1,`the view is centred on ${unit(hero).name}: ${far(pose(),home).toFixed(2)} px off where the page's centring puts it`);assert.ok(inView(unit(hero).hex),'the hero is on the screen')
assert.equal(V().play.slot,CHOP,'Chop is still chosen: the portrait\'s click asked nothing of the host')
assert.deepEqual([ctx().state.seq,acting()],[seq,hero],'and sent the engine nothing')
say(`2 clicked the portrait: ${unit(hero).name} is back at the middle, Chop still chosen`)
// 3. clicking an enemy's card in the top bar brings that enemy to the middle and shows its panel
/* an enemy Chop cannot reach from here (a card's click on one it can reach aims at it, as a click on its body does — kingdom
   tools/sandbox-card-bar.verify.mjs — and that is not what is read here): the one farthest from the hero */
const targets=new Set((V().play.targets||[]).map(t=>typeof t==='object'?t.id??t.unit:t))
const p=x=>V().data.POS[x],enemy=ctx().state.units.filter(u=>u.side==='enemy'&&u.lifeState!=='dead'&&!targets.has(u.id)).sort((a,b)=>far({x:p(b.hex).px,y:p(b.hex).py},{x:p(unit(hero).hex).px,y:p(unit(hero).hex).py})-far({x:p(a.hex).px,y:p(a.hex).py},{x:p(unit(hero).hex).px,y:p(unit(hero).hex).py}))[0]
assert.ok(enemy,'an enemy out of Chop\'s reach');assert.ok(card(enemy.id),'with a card in the top bar')
fire(card(enemy.id),'click');settle();glide()
const on=pose();assert.equal(V().view.inspectId,enemy.id,'the panel is the enemy\'s');assert.ok(V().dom.panel.innerHTML.includes(V().S.U[enemy.id].name),`and names it, as the board names it: ${V().S.U[enemy.id].name}`)
assert.ok(inView(enemy.hex),'the enemy is on the screen')
V().render();glide();assert.deepEqual(pose(),on,'and the view stays on it at the next redraw')
assert.ok(far(on,centredOn(enemy.id))<1,'where the page\'s own centring puts a view of that enemy: the middle')
assert.deepEqual([ctx().state.seq,acting()],[seq,hero],'looking sent the engine nothing')
say(`3 clicked ${enemy.name}'s card: the view is centred on it, its panel shows, the engine's battle is untouched`)
// 4. ending the Activation centres on the one that begins, as now
V().offerPlay({kind:'back'});settle()
V().dom.root.querySelector('#playEndAct').handlers.click({});settle();glide()
const next=acting();assert.notEqual(next,hero,'another unit\'s Activation')
if(unit(next).side==='hero'){assert.equal(V().view.centredOn,next,'the camera took the hero that begins');assert.ok(inView(unit(next).hex),'and it is on the screen')
 const took=pose();assert.ok(far(took,centredOn(next))<1,'centred on it')}
say(`4 End activation: the view went to ${unit(next).name}, who acts next`)
console.log('ability-click-keeps-view: the Bridge on the built sandbox, the expect line passed')
