// viewer.no-target-ring (engine DECISIONS.md 2026-10-04 'after the backlog run: the yellow target ring goes; ...', Andrew asked
// "Is the yellow you want gone the ring on hexes the chosen action can hit (including the hero's own hex for a self power)?" -
// "yes"). The item's expect, on the BUILT sandbox (BATTLE-SANDBOX.html?play=encounter.opening.orphanage): "with an attack
// chosen, no hex shows a yellow border - neither the enemies' hexes nor the hero's own for a self power - and the units that
// can be hit are still marked". Played through the page's own bar rows, cards, figures and right button, against the
// ENGINE's own battle: a self power chosen (nothing on the hero's hex), then an attack chosen by a hero with someone in its
// reach (no ring on any hex; the mark on exactly the units standing on the hexes the engine's choices name), then the marked
// unit clicked twice - and the attack the engine declares is at that unit. What it looks like in a browser is
// tools/no-target-ring.shot.mjs (real Chrome).
// Prints one line per step and `no-target-ring: … passed`.
import assert from 'node:assert/strict'
import {bootSlice} from './atlas-dom.mjs'
const {w}=bootSlice(process.argv[2]??'BATTLE-SANDBOX.html',{search:'?play=encounter.opening.orphanage'}),h=w.__sandbox
const V=()=>h.viewer._V,ctx=()=>h.session.ctx,unit=id=>ctx().state.units[id],stage=()=>V().dom.stage
const say=(...a)=>console.log('  '+a.join(' '))
const settle=()=>{for(let i=0;i<8000&&(h.busy||i<3);i++)w._flush(20);assert.equal(h.busy,false,'the board settles');assert.equal(h.fault,'','no fault')}
const acting=()=>{const c=ctx().battleCursor;assert.equal(c.at,'acting');return c.actor}
const row=id=>V().dom.actionbar.querySelectorAll('.acRow').find(r=>r.dataset.act===id)
const press=id=>{row(id).handlers.click({});settle()}
const figure=id=>V().layers.UEL.get(id).img
const card=id=>V().dom.rail.querySelectorAll('.railchip').find(c=>+c.dataset.i===id)
const rightClick=()=>{const wrap=stage().parentNode;wrap.handlers.pointerdown({button:2,clientX:5,clientY:5});wrap.handlers.pointerup({button:2,clientX:5,clientY:5});settle()}
const YELLOW=/255\s*,\s*215\s*,\s*100|#ffd764/i
const rings=()=>V().layers.play?V().layers.play.querySelectorAll('.ring').map(n=>({cls:n.className,hex:+n.dataset.hex,css:n.style.cssText})):[]
const marks=()=>stage().querySelectorAll('.playTargetUnit').map(n=>({unit:+n.dataset.unit,hex:+n.dataset.hex,css:n.style.cssText}))
/* no hex wears the target ring, and no ring the plan draws is the removed yellow */
const noRing=when=>{assert.equal(stage().querySelectorAll('.playTarget').length,0,when+': no `playTarget` ring on any hex')
 for(const r of rings())assert.doesNotMatch(r.css,YELLOW,`${when}: hex ${r.hex} wears a yellow ring (${r.cls})`)
 for(const m of marks())assert.doesNotMatch(m.css,YELLOW,when+': the mark on a unit is not yellow')}
const selfOnly=a=>ctx().actions[a]?.target?.select==='self'
/** the heroes the screen lists: the one acting, then those yet to act */
const heroes=()=>[acting(),...(V().play.endTurn?.yetToAct??[])].filter((id,i,a)=>a.indexOf(id)===i)
/** make a hero the one acting: its card double-clicked (free while the one acting has done nothing) */
const act=id=>{if(acting()!==id){card(id).handlers.dblclick({stopPropagation(){}});settle()}return acting()===id}

settle()
// 1. a self power chosen: the engine's only target is the hero's own hex - and nothing at all is drawn on it
let self=null
for(const id of heroes()){if(!act(id))continue
 const a=unit(id).actions.find(a=>selfOnly(a)&&row(a));if(!a)continue
 press(a);if(V().play.targets.length){self={id,a};break}
 rightClick()}
assert.ok(self,'a hero of the Orphanage\'s party carries a power aimed at itself alone')
{const P=V().play,me=unit(self.id)
 assert.equal(P.slot,self.a);assert.deepEqual(P.targets,[me.hex],'the self power\'s target is the hero\'s own hex')
 noRing('a self power chosen')
 assert.deepEqual(rings().filter(r=>r.hex===me.hex),[],'no ring of any kind on the hero\'s own hex');assert.deepEqual(marks(),[],'and no target mark on the hero acting')
 assert.ok(P.note&&P.note.includes(ctx().actions[self.a].name),'the note over the board still says how the power is used')
 say(`1 ${me.name} chooses ${ctx().actions[self.a].name}: the engine's target is its own hex ${me.hex}; no ring on it, no mark; the note: "${P.note}"`)
 rightClick();rightClick()}

// 2. an attack chosen, someone in its reach: no hex is ringed, each unit that can be hit wears the mark
let shot=null
for(const id of heroes()){if(!act(id))continue
 for(const a of unit(id).actions.filter(a=>ctx().actions[a]?.attack&&row(a))){press(a);if(V().play.targets.length){shot={id,a};break}
  rightClick()}
 if(shot)break}
assert.ok(shot,'a hero of the Orphanage\'s party has someone in reach of an attack from where it stands')
const P=V().play,me=unit(shot.id)
assert.equal(P.actor,shot.id);assert.equal(P.slot,shot.a)
noRing('an attack chosen')
const hittable=ctx().state.units.filter(u=>P.targets.includes(u.hex)&&u.lifeState!=='dead'&&u.id!==shot.id).map(u=>u.id).sort((a,b)=>a-b)
assert.ok(hittable.length>0)
assert.deepEqual(marks().map(m=>m.unit).sort((a,b)=>a-b),hittable,'the mark is on exactly the units standing on the hexes the engine\'s choices name')
for(const m of marks())assert.equal(m.hex,unit(m.unit).hex,'each mark is on its unit, where the engine has it')
assert.ok(!marks().some(m=>m.unit===shot.id),'the hero acting wears none')
say(`2 ${me.name} chooses ${ctx().actions[shot.a].name}: target hexes ${JSON.stringify(P.targets)}; no hex ringed; the mark on ${hittable.map(id=>unit(id).name).join(', ')}`)

// 3. pointing at a marked unit shows the forecast as before; clicked twice, the engine's attack is at that unit
const t=marks()[0].unit
figure(t).handlers.pointerenter({});settle()
const hit=stage().querySelector('.playHit')?.textContent,dmg=stage().querySelector('.playDmg')?.textContent
assert.ok(hit&&dmg,'pointing at the marked unit shows the forecast');noRing('aiming at a target')
assert.ok(marks().some(m=>m.unit===t),'the mark stays while it is aimed at')
figure(t).handlers.click({detail:1});settle();noRing('the aim locked')
const before=ctx().events.length;figure(t).handlers.click({detail:1});settle()
const decl=ctx().events.slice(before).find(e=>e.type==='attack.declared')
assert.ok(decl,'the second click fires');assert.equal(decl.target,t,'at the unit that wore the mark');assert.equal(hit,decl.hitChance+'%')
noRing('after the attack')
say(`3 ${unit(t).name} pointed at: ${hit} to hit, ${dmg} damage beside the arrow; clicked twice, the engine declares ${decl.attackId} at ${unit(t).name}`)
console.log('no-target-ring: with a self power and with an attack chosen no hex wears the yellow ring; each unit that can be hit wears the mark on itself, the hero acting none; the marked unit is the one the engine\'s attack lands on passed')
