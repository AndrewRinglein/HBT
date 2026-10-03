// viewer.play-input (PLAYABLE-OPENING-PLAN.md item 7): the BUILT sandbox plays battle 1 with the mouse on its board — the
// viewer's own hex buttons, unit figures, action-bar rows and right button, through the play input to the engine. No
// dropdown is touched: a hero is clicked to act, a hex clicked for a ghost and again to walk, right-click takes a ghost
// back, an attack is clicked on the bar, an enemy pointed at (the forecast is drawn), clicked, and clicked again; the
// attack the engine declares carries the hit chance and damage the board showed. Only End activation is a button.
// Law 10, viewer.play-chrome (2026-09-30): the dropdowns and the End activation button are retired for the opening
// battles (PLAYABLE-OPENING-PLAN.md item 8), so the next hero to click is read from the screen's own list of heroes yet
// to act (the play facts' endTurn.yetToAct, the engine's heroesYetToAct) instead of the hero dropdown, and End activation
// is the battle screen's button instead of the sandbox's. What is asserted is unchanged.
import assert from 'node:assert/strict'
import {bootSlice} from './atlas-dom.mjs'
const {w,click}=bootSlice(process.argv[2]??'BATTLE-SANDBOX.html'),handle=w.__sandbox
const select=(id,value)=>{const el=w.document.getElementById(id);el.value=value;el.handlers.change()}
select('encounter','encounter.opening.orphanage');click('start')
const V=()=>handle.viewer._V,ctx=()=>handle.session.ctx,stage=()=>V().dom.stage
const settle=()=>{if(handle.busy)click('skip');assert.equal(handle.busy,false)}
const hexBtn=h=>stage().querySelectorAll('.playHex').find(n=>+n.dataset.hex===h)
const drawn=cls=>stage().querySelectorAll('.'+cls).map(n=>+n.dataset.hex).sort((a,b)=>a-b)
const figure=id=>V().layers.UEL.get(id).img
const point=h=>hexBtn(h).handlers.pointerenter({})
const clickHex=h=>hexBtn(h).handlers.click({detail:1})
const rightClick=()=>{const wrap=stage().parentNode;wrap.handlers.pointerdown({button:2,clientX:5,clientY:5});wrap.handlers.pointerup({button:2,clientX:5,clientY:5})}
const slot=id=>V().dom.actionbar.querySelectorAll('.acRow').find(r=>r.dataset.act===id)
const endActivation=()=>V().dom.root.querySelector('#playEndAct').handlers.click({})
const enemies=()=>ctx().state.units.filter(u=>u.side==='enemy'&&u.lifeState==='standing')
const near=h=>Math.min(...enemies().map(u=>ctx().geo.distance(h,u.hex)))
settle()
/* Law 10, viewer.turn-taking (engine DECISIONS.md 2026-10-03 'a hero starts its Activation with its basic move armed'; kingdom
   SWITCHES playQueueProposal overturned): when the engine waits for a choice the next hero yet to act is BEGUN, so the board
   settles with a hero acting — was: the battle settled at 'selecting', no hero acting */
assert.equal(ctx().battleCursor.at,'acting')
assert.ok(stage().querySelectorAll('.playHex').length===ctx().state.terrain.length,'every board hex takes the mouse')
// pointing at the Zombie with nothing chosen: where it can move and hit
const z=enemies()[0];figure(z.id).handlers.pointerenter({})
assert.ok(drawn('playThreatMove').length>0&&drawn('playThreatHit').length>0,'the enemy\'s reach lights up')
// click a hero to act
const hero=ctx().state.units.find(u=>u.uid===handle.session.policy.humanUnitUids[0])
figure(hero.id).handlers.click({detail:1});settle()
assert.equal(ctx().battleCursor.actor,hero.id,'clicking the hero started its activation')
const reach=drawn('playReach');assert.ok(reach.length>0,'its reach is lit')
const dest=[...reach].sort((a,b)=>near(a)-near(b)||a-b)[0]
point(dest);assert.ok(stage().querySelector('.playPath'),'the path preview to the hex pointed at')
clickHex(dest);assert.equal(+stage().querySelector('.playGhost').dataset.hex,dest,'a ghost on the hex')
rightClick();assert.equal(stage().querySelector('.playGhost'),null,'right-click takes the ghost back')
assert.equal(ctx().state.units[hero.id].hex,hero.hex,'nothing moved')
clickHex(dest);clickHex(dest);settle()
assert.equal(ctx().state.units[hero.id].hex,dest,'click again: the hero walked there')
// play on with the mouse until an attack is confirmed
let confirmed=null
for(let n=0;n<300&&!ctx().state.outcome&&!confirmed;n++){
 settle();const c=ctx().battleCursor
 // was: const uid=handle.session.policy.humanUnitUids.find(uid=>w.document.getElementById('actor')&&[...w.document.getElementById('actor').children].some(o=>+o.getAttribute('value')===uid));const u=ctx().state.units.find(u=>u.uid===uid)
 if(c.at==='selecting'){const id=V().play.endTurn.yetToAct[0];figure(id).handlers.click({detail:1});settle();continue}
 const me=ctx().state.units[c.actor],attack=me.actions.find(id=>id.startsWith('attack.')&&id!=='attack.punch')??'attack.punch'
 const row=slot(attack);assert.ok(row,'the attack is on the bar');row.handlers.click({})
 const targets=drawn('playTarget')
 if(targets.length){const t=ctx().state.units.find(u=>u.hex===targets[0]&&u.lifeState==='standing')
  figure(t.id).handlers.pointerenter({})
  const hit=stage().querySelector('.playHit')?.textContent,dmg=stage().querySelector('.playDmg')?.textContent
  assert.ok(hit&&dmg,'pointing at the target shows the forecast')
  figure(t.id).handlers.click({detail:1});rightClick();figure(t.id).handlers.click({detail:1})
  const before=ctx().events.length;figure(t.id).handlers.click({detail:1})
  const decl=ctx().events.slice(before).find(e=>e.type==='attack.declared')
  assert.ok(decl,'the second click fires');confirmed={hit,dmg,decl};break}
 rightClick()
 const r=drawn('playReach');if(r.length){const d=[...r].sort((a,b)=>near(a)-near(b)||a-b)[0];clickHex(d);clickHex(d);settle()}
 if(!ctx().state.outcome&&ctx().battleCursor.at==='acting'&&ctx().battleCursor.actor===me.id)endActivation()   // was: click('end')
}
assert.ok(confirmed,'an attack was made with the mouse')
assert.equal(confirmed.hit,confirmed.decl.hitChance+'%');assert.equal(confirmed.dmg,String(confirmed.decl.damageOnHit))
console.log('sandbox play input: hero clicked to act, reach, path, ghost, right-click back, confirm walk, attack chosen on the bar, forecast on pointing, click-click fires with the forecast shown passed')
