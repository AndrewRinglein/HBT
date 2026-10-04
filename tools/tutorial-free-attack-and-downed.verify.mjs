// kingdom.tutorial-free-attack-and-downed — ruled 2026-10-04 (Andrew, engine/DECISIONS.md 'the opening's tutorial: …'; the extra steps
// (d) and (f)): "Walking away from an enemy draws a free attack, shown the first time it would happen." — "We need to do D the first
// time you try to do it."; "The first time a hero goes down: bleeding out and first aid." — "F, yes."
// Expect: "In the opening run, the first path planned away from an adjacent enemy shows the free-attack line with an arrow on that
// enemy and waits for one more click before the unit walks; the first of the player's units to go down gets an arrow on its
// bleed-out counter and the line that explains it. A page test asserts each notice's words, target and trigger, that the first
// provoking move needed the extra click and the second did not, and that neither lesson shows twice in a run."
//
// The BUILT sandbox, a new run's Orphanage played with the mouse (tools/lesson-play.mjs): the hero walks up to the nearest enemy
// and strikes it; a Turn later, beside it, he plans a path away — twice; then everyone stands still until one of the player's
// units goes down. Nothing is sought: the page's own battle on its own seed.
//
//   node tools/tutorial-free-attack-and-downed.verify.mjs [BATTLE-SANDBOX.html]
import assert from 'node:assert/strict'
import {newRun,board,rowOf,lessonReveal} from './lesson-play.mjs'
const page=process.argv[2]??'BATTLE-SANDBOX.html',RUN_SEED=Number(process.env.TUTORIAL_SEED??11)
const say=(...a)=>console.log('  '+a.join(' '))
const FREE=rowOf('lesson.free-attack'),DOWNED=rowOf('lesson.downed')
assert.equal(FREE.encounterId,undefined);assert.equal(DOWNED.encounterId,undefined,'whichever battle of the run they first happen in')

let B=newRun(page,RUN_SEED),{h,w,V,ctx,O,lines,ptrs,flush,until}=B
/* what the screen shows of the downed row is kept from the moment it goes up, whenever that is (the page's clock is watched) */
let down=null
{const tick=w._flush.bind(w);w._flush=ms=>{tick(ms);if(!down&&h.lessons.includes(DOWNED.id))down={lines:lines(),ptrs:ptrs().map(p=>p.target),looking:O().looking?.hex??null,hold:O().notice?.hold,line:V().EV[V().cursor-1],at:Object.fromEntries(Object.values(h.viewer.state.U).map(u=>[u.id,u.hex])),turn:h.viewer.state.turnNo}}}
B.firstMove()
const dist=(a,b)=>ctx().geo.distance(a,b),heroId=B.hero().id,hero=()=>ctx().state.units[heroId]
const beside=()=>B.enemies().filter(u=>dist(u.hex,hero().hex)===1)
const quiet=()=>!h.busy&&B.actor()?.id===heroId&&!h.lessons.some(id=>rowOf(id).ends==='time'||rowOf(id).holds)
/** the hero's Activation, the board still and nothing left to read; every other Activation is ended */
const toHero=what=>{assert.ok(B.playUntil(()=>quiet()&&!hero().moveUsed&&!hero().primaryUsed,u=>u?.id===heroId&&!hero().moveUsed&&!hero().primaryUsed),what);assert.equal(hero().lifeState,'standing')}
/** walk up to the nearest enemy and strike it (the path planned, the attack chosen, the target clicked twice) */
function strike(){const reach=B.drawn('playReach'),near=x=>Math.min(...B.enemies().map(u=>dist(x,u.hex)))
 if(reach.length&&!beside().length)B.hexBtn([...reach].sort((a,b)=>near(a)-near(b)||a-b)[0]).handlers.click({detail:1})
 const attack=hero().actions.find(id=>ctx().actions[id].attack&&B.barRow(id));B.press(attack);const t=B.drawn('playTarget')
 if(!t.length){V().dom.stage.parentNode.handlers.pointerdown({button:2,clientX:5,clientY:5});V().dom.stage.parentNode.handlers.pointerup({button:2,clientX:5,clientY:5});return false}
 const foe=B.enemies().find(u=>u.hex===t[0]);B.figure(foe.id).handlers.click({detail:1});B.figure(foe.id).handlers.click({detail:1});until(()=>!h.busy,'the attack plays');return true}
/** with an enemy beside him, a path that draws a free attack: the reach hexes tried from the farthest, read off the play facts */
function planAway(){const from=beside();assert.ok(from.length,'an enemy stands beside the hero')
 for(const x of [...B.drawn('playReach')].sort((a,b)=>dist(b,from[0].hex)-dist(a,from[0].hex)||a-b)){B.hexBtn(x).handlers.click({detail:1});if(V().play.provokes.length)return x}
 return null}
const freeAttacks=()=>ctx().events.filter(e=>e.type==='attack.declared'&&e.free&&e.target===heroId).length

/* come to stand beside an enemy at the start of an Activation */
let dest=null
for(let t=0;t<8&&dest===null;t++){toHero('the hero\'s Activation');assert.ok(!ctx().state.outcome)
 if(beside().length){dest=planAway();if(dest!==null)break}
 if(!strike())B.endActivation()
}
assert.ok(dest!==null,'the hero planned a path away from an enemy beside him')

/* (d) the first time: the line, an arrow on the enemy that would strike — and the walk waits for one more click */
assert.ok(h.lessons.includes(FREE.id),'the free-attack row goes up as the path is planned')
assert.deepEqual(lines(),['Moving away from an enemy beside you gives it a free attack.','Click the hex again to move anyway.']);assert.deepEqual(lines(),[...FREE.words])
const striker=ptrs().map(p=>p.target.match(/^unit:(\d+)$/)).filter(Boolean).map(m=>+m[1]);assert.equal(striker.length,1,'one arrow, on a unit')
assert.ok(beside().some(u=>u.id===striker[0]),'on the enemy beside the hero that would strike');assert.ok(V().play.provokes.length>0,'the path preview marks where it would')
const seq=ctx().state.seq,at=hero().hex,free0=freeAttacks()
B.hexBtn(dest).handlers.click({detail:1})
assert.equal(ctx().state.seq,seq,'the click that would walk does not: the move waits');assert.equal(hero().hex,at);assert.equal(+B.stage().querySelector('.playGhost').dataset.hex,dest,'the path stays shown')
assert.ok(h.lessons.includes(FREE.id),'the row is still up')
B.hexBtn(dest).handlers.click({detail:1});until(()=>!h.busy,'one more click: the hero walks')
assert.equal(freeAttacks(),free0+1,'and the enemy took its free attack');assert.ok(!h.lessons.includes(FREE.id),'the row is over');assert.ok(!ptrs().some(p=>p.target==='unit:'+striker[0]))
say(`d Turn ${ctx().state.turn}: a path planned away from ${ctx().state.units[striker[0]].name} — "${FREE.words[0]}" with an arrow on it; the walk waited for one more click, then the free attack came`)

/* … the second provoking move needs no extra click and shows nothing */
let again=null
for(let t=0;t<8&&again===null&&!ctx().state.outcome&&hero().lifeState==='standing';t++){
 if(!B.playUntil(()=>quiet()&&!hero().moveUsed&&!hero().primaryUsed||hero().lifeState!=='standing',u=>false))break
 if(hero().lifeState!=='standing')break
 if(beside().length){const x=planAway();if(x!==null){assert.ok(!h.lessons.includes(FREE.id),'not a second time');const s0=ctx().state.seq;B.hexBtn(x).handlers.click({detail:1});assert.notEqual(ctx().state.seq,s0,'the second provoking move goes on the confirming click, with no extra one');until(()=>!h.busy,'the walk plays');again=x;break}}
 if(!strike())B.endActivation()
}
assert.ok(again!==null,'a second path that draws a free attack was planned and walked')
say('d again: a second provoking path walked on its confirming click — no line, no extra click')

/* (f) the first of the player's units to go down: everyone stands still until one does */
B.playUntil(()=>!!down)
assert.ok(down,'one of the player\'s units went down and the row showed')
assert.equal(down.line.type,'life.downed');const fallen=down.line.target;assert.equal(ctx().state.units[fallen].side,'hero','one of the player\'s units')
assert.deepEqual(down.lines,[...DOWNED.words]);assert.equal(down.lines[0],'This unit is down and bleeding out.')
assert.deepEqual(down.ptrs,['card:'+fallen],'an arrow on its card, where its bleed-out count stands');assert.equal(down.looking,down.at[fallen],'the view is on it');assert.equal(down.hold,true)
assert.ok(ctx().events.some(e=>e.type==='bleedout.set'&&e.target===fallen),'it is bleeding out (the engine\'s count)')
say(`f Turn ${down.turn}: ${ctx().state.units[fallen].name} went down — "${DOWNED.words[0]}" with an arrow on its card, the view on it`)

/* once in a run */
for(const id of [FREE.id,DOWNED.id])assert.ok(B.P.camp().revealed.includes(lessonReveal(id)),'the run remembers '+id)
B.playUntil(()=>!!ctx().state.outcome&&!h.busy)
{const first=B.first;B.P.fightOut(false,'battle 1 lost')
 B.P.straightIn([first],'battle 1 again');B=board(B.P);({h,w,V,ctx,O,lines,ptrs,flush,until}=B)
 const seen=[];B.playUntil(()=>{for(const id of h.lessons)if((id===FREE.id||id===DOWNED.id)&&!seen.includes(id))seen.push(id);return !!ctx().state.outcome&&!h.busy})
 assert.deepEqual(seen,[],'replayed: neither lesson shows a second time in the run')
 /* (whether a unit goes down again in the replay is the dice's; that a row once shown is never shown again is also held, without
    the dice, by test/tutorial-free-attack-and-downed.test.ts) */
 say(`replayed after the loss and played on, everyone standing still (to ${ctx().state.outcome??"ten minutes of the page clock"}, Turn ${ctx().state.turn}; ${ctx().events.filter(e=>e.type==='life.downed'&&ctx().state.units[e.target].side==='hero').length} of the player's units went down): neither lesson again`)}
console.log('tutorial-free-attack-and-downed: the free attack told the first time a path would draw one (one more click), a downed unit explained — each once, on the built sandbox — passed')
