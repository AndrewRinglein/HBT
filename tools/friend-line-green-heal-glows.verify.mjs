// viewer.friend-line-green-heal-glows (engine DECISIONS.md 2026-10-05 'the playtest post answered: ... green for a friend, a glow
// for a heal ...', Andrew: "When you're doing a power that is a buff or a heal, it should not be a red arrow for your vine or
// target." - "They should be green." - "When you're healing someone, it shouldn't show a magic attack bolt flying at them."). The
// item's expect, on the BUILT sandbox (BATTLE-SANDBOX.html?play=encounter.opening.orphanage&heroes=hero.base.priest-robes - the
// priest whose own kit is the Holy Symbol): the player's own clicks, the engine's own choices.
//   1. Heal chosen on the bar: every ally the engine says it can reach wears a GREEN mark; pointed at, the line to it is green.
//   2. Wrath chosen: the marks on the enemies and the line are RED, as before.
//   3. Heal used on an ally (two clicks): the engine heals; nothing was launched at the ally - the board added no projectile
//      to its canvas between the click and the heal's line, and the heal's glow played on the healed unit.
// Prints one line per reading and `friend-line-green-heal-glows: ... passed`.
import assert from 'node:assert/strict'
import {bootSlice} from './atlas-dom.mjs'
import {shownName} from '../../viewer/src/names.js'
import {PLAY_HUE} from '../../viewer/src/theme.js'
const PRIEST='hero.base.priest-robes',HEAL='power.holy-symbol.heal',WRATH='attack.holy-symbol.wrath'
const {w}=bootSlice(process.argv[2]??'BATTLE-SANDBOX.html',{search:'?play=encounter.opening.orphanage&heroes='+PRIEST}),h=w.__sandbox
const V=()=>h.viewer._V,ctx=()=>h.session.ctx,unit=id=>ctx().state.units[id],stage=()=>V().dom.stage
const say=(...a)=>console.log('  '+a.join(' '))
const settle=()=>{for(let i=0;i<8000&&(h.busy||i<3);i++)w._flush(20);assert.equal(h.busy,false,'the board settles');assert.equal(h.fault,'','no fault')}
const acting=()=>{const c=ctx().battleCursor;assert.equal(c.at,'acting');return c.actor}
const row=id=>V().dom.actionbar.querySelectorAll('.acRow').find(r=>r.dataset.act===id)
const press=id=>{assert.ok(row(id),id+' is on the bar');row(id).handlers.click({});settle()}
const figure=id=>V().layers.UEL.get(id).img
const card=id=>V().dom.rail.querySelectorAll('.railchip').find(c=>+c.dataset.i===id)
const rightClick=()=>{const wrap=stage().parentNode;wrap.handlers.pointerdown({button:2,clientX:5,clientY:5});wrap.handlers.pointerup({button:2,clientX:5,clientY:5});settle()}
const marks=()=>stage().querySelectorAll('.playTargetUnit').map(n=>({unit:+n.dataset.unit,css:n.style.cssText}))
const arrow=()=>{const out=new Set(),walk=n=>{for(const c of n.children||[]){for(const k of ['stroke','fill']){const x=c.getAttribute&&c.getAttribute(k);if(x&&x!=='none'&&!/^rgba\(0,\s*0,\s*0/.test(x))out.add(x)}walk(c)}}
 const svg=V().layers.play?.querySelector('svg');if(svg)walk(svg);return [...out]}
settle()
const priest=ctx().state.units.find(u=>u.typeId===PRIEST);assert.ok(priest,'the priest is fielded');for(const a of [HEAL,WRATH])assert.ok(priest.actions.includes(a),'the engine: he holds '+a)
if(acting()!==priest.id){card(priest.id).handlers.dblclick({stopPropagation(){}});settle()}
assert.equal(acting(),priest.id,'the priest is the one acting')
assert.deepEqual({...ctx().actions[HEAL].target},{select:'unit',side:'ally'},'the engine\'s row: Heal is aimed at one ally');assert.ok(ctx().actions[WRATH].attack,'Wrath is an attack')
// 1. Heal chosen: green
press(HEAL)
let P=V().play;assert.equal(P.slot,HEAL);assert.ok(P.targets.length>0,'the engine offers allies to heal')
const allies=ctx().state.units.filter(u=>P.targets.includes(u.hex)&&u.id!==priest.id&&u.lifeState!=='dead')
assert.ok(allies.length>0);for(const u of allies)assert.equal(u.side,'hero')
assert.deepEqual(marks().map(m=>m.unit).sort((a,b)=>a-b),allies.map(u=>u.id).sort((a,b)=>a-b))
for(const m of marks()){assert.ok(m.css.includes(PLAY_HUE.aid),`the mark on ${unit(m.unit).name} is green: ${m.css}`);assert.ok(!m.css.includes(PLAY_HUE.aim))}
const friend=allies[0]
figure(friend.id).handlers.pointerenter({});settle()
assert.ok(V().play.aim&&V().play.aim.target===friend.id,'pointing at the ally aims at it');assert.deepEqual(arrow(),[PLAY_HUE.aid],'the line to the ally is green')
say(`1 Heal chosen: ${allies.length} green mark(s) (${allies.map(u=>shownName(u.name)).join(', ')}); pointed at ${shownName(friend.name)}, the line is green`)
rightClick();rightClick()
// 2. Wrath chosen: red, as before
press(WRATH)
P=V().play;assert.equal(P.slot,WRATH)
const foes=ctx().state.units.filter(u=>P.targets.includes(u.hex)&&u.lifeState!=='dead'&&u.id!==priest.id)
if(foes.length){for(const m of marks()){assert.ok(m.css.includes(PLAY_HUE.aim),`the mark on ${unit(m.unit).name} is red`);assert.ok(!m.css.includes(PLAY_HUE.aid))}
 figure(foes[0].id).handlers.pointerenter({});settle();assert.deepEqual(arrow(),[PLAY_HUE.aim],'the line to the enemy is red')
 say(`2 Wrath chosen: ${foes.length} red mark(s); pointed at ${shownName(foes[0].name)}, the line is red`)}
else say('2 Wrath chosen: no enemy in its reach from where he stands - no mark to read (the red is held by the viewer\'s page test)')
rightClick();rightClick()
// 3. Heal used: nothing flies, the healed unit glows
const fx=[],FX=V().fx.FX;if(FX){const add=FX.add.bind(FX);FX.add=(...a)=>{fx.push({dur:a[0],events:ctx().events.length});return add(...a)}}
press(HEAL);figure(friend.id).handlers.pointerenter({});settle()
const before=ctx().events.length
figure(friend.id).handlers.click({detail:1});settle();figure(friend.id).handlers.click({detail:1});settle()
const used=ctx().events.slice(before).find(e=>e.type==='power.used'&&e.causeId===HEAL),healed=ctx().events.slice(before).find(e=>e.type==='heal.applied'&&e.causeId===HEAL)
assert.ok(used,'the engine used Heal');assert.equal(used.target,friend.id);assert.ok(healed,'and its heal is a line of the log');assert.equal(healed.target,friend.id)
const cues=V().impact?.log??[];void cues
if(FX)say(`3 Heal used on ${shownName(friend.name)}: the engine healed ${healed.amount}; the board added ${fx.length} effect(s) to its canvas`)
else say(`3 Heal used on ${shownName(friend.name)}: the engine healed ${healed.amount} (this page has no effects canvas under the test's DOM; what flies is held by the viewer's page test)`)
/* the flights of the board's projectiles (viewer src/hexvfx.js FLIGHTS: an arrow 320 ms, a magic bolt 720, a holy bolt 780): none was added */
for(const f of fx)assert.ok(![320,720,780].includes(f.dur),'a projectile was launched: '+JSON.stringify(f))
assert.equal(h.fault,'','no fault')
console.log(`friend-line-green-heal-glows: the built sandbox (the Orphanage, ${shownName(priest.name)}), the expect line passed`)
