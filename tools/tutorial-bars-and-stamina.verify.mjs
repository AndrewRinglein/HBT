// kingdom.tutorial-bars-and-stamina — ruled 2026-10-04 (Andrew, engine/DECISIONS.md 'the opening's tutorial: …'; the extra steps (b) and
// (e)): "What the Health and Protection bars under a unit mean." — "B should happen as soon as damage is inflicted."; "Attacks cost
// Stamina." — "We need to explain E at some point, but we don't want to front-load every single thing into the first couple of
// turns. I think we can do stamina on turn 3 or turn 4."
// Expect: "In a new run's Orphanage, the first blow that deals damage is followed by an arrow on the struck unit's bars and the line
// that names Health and Protection; nothing about Stamina shows on Turns 1 and 2; on Turn 3 an arrow sits on the stamina strip with
// its line. A page test asserts both notices' words, targets and triggers, that (e) shows in battle 2 when battle 1 ended before
// Turn 3, and that neither shows twice in a run."
//
// The BUILT sandbox. Run A: a new run's Orphanage played with the mouse (tools/lesson-play.mjs), every Activation ended, the board
// watched every 20 ms to Turn 4. Run B: another new run whose battle 1 is settled won on Turn 1 (the driver's strong party), and
// battle 2 reached through the map, the draft and Equip.
//
//   node tools/tutorial-bars-and-stamina.verify.mjs [BATTLE-SANDBOX.html]
import assert from 'node:assert/strict'
import {newRun,board,rowOf,lessonReveal,ORPHANAGE,LUMBERJACK} from './lesson-play.mjs'
const page=process.argv[2]??'BATTLE-SANDBOX.html',RUN_SEED=Number(process.env.TUTORIAL_SEED??11)
const say=(...a)=>console.log('  '+a.join(' '))
const BARS=rowOf('lesson.bars'),STAMINA=rowOf('lesson.orphanage.stamina'),STAMINA2=rowOf('lesson.lumberjack.stamina')
assert.equal(STAMINA.once,'lesson.stamina');assert.equal(STAMINA2.once,'lesson.stamina');assert.deepEqual(STAMINA2.words,STAMINA.words,'one lesson, told in whichever of the two battles comes to it')
assert.equal(BARS.encounterId,undefined,'the bars: whichever battle of the run the first damage is in')

/* ── run A: the Orphanage ── */
let B=newRun(page,RUN_SEED),{h,w,V,ctx,O,lines,ptrs,flush,until}=B
B.firstMove()
const seen=[];let last=''
const look=()=>{for(const id of h.lessons)if(id!==last&&(id===BARS.id||id===STAMINA.id)){last=id
  seen.push({id,turn:h.viewer.state.turnNo,lines:lines(),ptrs:ptrs().map(p=>({target:p.target,el:p.el})),looking:O().looking?.hex??null,hold:O().notice?.hold,cursor:V().cursor,ms:O().notice?.ms,
   line:V().EV[V().cursor-1],busy:h.busy,actor:B.actor()?.id??null,stamBar:V().dom.stambar,at:Object.fromEntries(Object.values(h.viewer.state.U).map(u=>[u.id,u.hex]))})}
 return ctx().state.turn>=4&&!h.busy&&h.lessons.length===0}
B.playUntil(look)
const bars=seen.find(s=>s.id===BARS.id),stam=seen.find(s=>s.id===STAMINA.id)
/* (b) the first blow that deals damage */
assert.ok(bars,'the bars row showed');assert.deepEqual(bars.lines,[...BARS.words])
assert.deepEqual(bars.lines,['Under each unit: its Health bar, and beneath it its Protection.','A blow takes from Protection first; what is left comes off Health.'])
assert.equal(bars.line.type,'damage.applied','it went up as the board played a line of damage');const struck=bars.line.target
assert.equal(V().EV.slice(0,bars.cursor-1).filter(e=>e.type==='damage.applied').length,0,'the FIRST damage of the battle')
assert.deepEqual(bars.ptrs.map(p=>p.target),[`unit:${struck}:health`,`unit:${struck}:protection`],'an arrow on each of the struck unit\'s two bars')
assert.equal(bars.ptrs[0].el,V().layers.UEL.get(struck).hpbar,'its Health bar');assert.equal(bars.looking,bars.at[struck],'the view is on that unit, where the board shows it')
assert.equal(bars.hold,true,'the battle waits under it');assert.equal(bars.busy,true)
say(`b Turn ${bars.turn}: the first damage (on unit ${struck}, ${ctx().state.units[struck].name}) — "${BARS.words[0]}" / "${BARS.words[1]}", an arrow on each bar, the view on it`)
/* (e) Stamina: nothing on Turns 1 and 2; on Turn 3, as the hero's Activation begins */
assert.ok(stam,'the Stamina row showed');assert.equal(stam.turn,3,'on Turn 3 — not on Turns 1 and 2')
assert.deepEqual(stam.lines,[...STAMINA.words]);assert.deepEqual(stam.lines,['Attacks and powers cost Stamina — the strip beside the action bar.','What an action costs is shown on its slot.','Stamina comes back at the end of each Hero Phase.'])
assert.deepEqual(stam.ptrs.map(p=>p.target),['ui:stamina']);assert.equal(stam.ptrs[0].el,stam.stamBar,'the arrow is on the stamina strip')
assert.equal(stam.actor,B.hero().id,'as the hero\'s Activation begins');assert.equal(stam.busy,false,'after that Turn\'s arrival has been shown: the board is still')
/* what the words say is so: an attack on the bar shows a cost, and Stamina came back at the end of a Hero Phase */
assert.ok(ctx().events.some(e=>e.type==='stamina.regen'&&e.causeId==='phase.end'&&e.phase==='hero'),'Stamina comes back at the end of the Hero Phase (the engine\'s line)')
say(`e Turn ${stam.turn}, the hero activated: "${STAMINA.words[0]}" with an arrow on the stamina strip, ${stam.ms} ms; nothing about Stamina on Turns 1 and 2`)
/* once in a run */
assert.equal(seen.filter(s=>s.id===BARS.id).length,1);assert.equal(seen.filter(s=>s.id===STAMINA.id).length,1)
assert.ok(B.P.camp().revealed.includes(lessonReveal('lesson.bars'))&&B.P.camp().revealed.includes(lessonReveal('lesson.stamina')),'the run remembers both')
{const first=B.first;B.P.fightOut(false,'battle 1 lost');B.P.straightIn([first],'battle 1 again');B=board(B.P);({h,w,V,ctx,O,lines,ptrs,flush,until}=B)
 const again=[];B.playUntil(()=>{for(const id of h.lessons)if((id===BARS.id||id===STAMINA.id)&&!again.includes(id))again.push(id);return ctx().state.turn>=4&&!h.busy})
 assert.deepEqual(again,[],'replayed: neither shows a second time in the run')}
say('replayed after a loss, to Turn 4: neither the bars nor Stamina again')

/* ── run B: battle 1 over before Turn 3 — Stamina is told on the first hero Activation of battle 2 ── */
{const R=newRun(page,RUN_SEED+1),P=R.P
 const won=P.fightOut(true,'battle 1');assert.ok(won.result.turns<3,'battle 1 was won before Turn 3');P.levelUps('battle 1')
 assert.ok(!P.camp().revealed.includes(lessonReveal('lesson.stamina')),'Stamina has not been told')
 assert.equal(P.readMap([ORPHANAGE],'after battle 1'),LUMBERJACK);P.v.click('field',LUMBERJACK)
 const second=P.draft('battle 2'),party=[R.first,second].sort();P.whoGoes('battle 2');P.equipThenFight(party,'battle 2')
 const b=board(P);let got=null
 b.playUntil(()=>{if(!got&&b.h.lessons.includes(STAMINA2.id))got={lines:b.lines(),ptrs:b.ptrs().map(p=>p.target),turn:b.ctx().state.turn,actor:b.actor(),first:!b.ctx().events.some(e=>e.type==='activation.end'&&b.party().includes(b.ctx().state.units[e.actor]?.uid))};return !!got||b.ctx().state.turn>=3})
 assert.ok(got,'battle 2: the Stamina row showed');assert.equal(got.turn,1);assert.ok(got.first,'on the first hero Activation of battle 2')
 assert.deepEqual(got.lines,[...STAMINA.words]);assert.ok(got.ptrs.includes('ui:stamina'));assert.ok(b.party().includes(got.actor.uid),'a hero is acting')
 assert.ok(P.camp().revealed.includes(lessonReveal('lesson.stamina')),'and the run remembers it')
 say('battle 1 won on Turn 1: Stamina was told on the first hero Activation of battle 2')}
console.log('tutorial-bars-and-stamina: the bars at the first damage, Stamina on Turn 3 (or in battle 2), each once, on the built sandbox — passed')
