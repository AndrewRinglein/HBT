// viewer.new-enemy-notice (engine DECISIONS.md 2026-10-04 'the opening's tutorial: … new enemies are named …', Andrew: "If a new
// enemy is introduced there is going to be a notification: \"New enemy\" and their name." — "To first time"). The item's
// expect, on the BUILT sandbox:
//   A · a battle outside a run (BATTLE-SANDBOX.html?play=encounter.opening.lumberjack): nothing is remembered, so each enemy
//       kind is new the first time it is on the board — the Zombie before the first hero is activated, the Skeleton Archer
//       when it arrives on Turn 2, once, though two more come on Turn 3.
//   B · the opening run (?map): battle 1's own lesson introduces the Zombie — no notice there, and it is met; battle 2
//       announces the Skeleton Archer on Turn 2 and not the Zombie; the met kinds are in the run's save; battle 2, lost and
//       replayed, announces nothing already met.
// The board is played by its own clock (never skipped: a skip is a seek, and a seek announces nothing); the heroes stand
// idle and the page's own End Turn moves the battle on. No seed is sought.
// Prints one line per step and `new-enemy-notice: … passed`.
import assert from 'node:assert/strict'
import {bootSlice} from './atlas-dom.mjs'
import {openingPage} from './opening-page.mjs'
const page=process.argv[2]??'BATTLE-SANDBOX.html'
const say=(...a)=>console.log('  '+a.join(' '))
const LUMBERJACK='encounter.opening.lumberjack',ORPHANAGE='encounter.opening.orphanage'

/** the page played by its own clock until the board is still; every notice that stood, by its words, with the Turn it stood in */
function playing(w,h){
 const seen=[];let last=null
 for(let i=0;i<40000&&(h.busy||i<3);i++){w._flush(20)
  const n=h.viewer?.overlays.notice,key=n?n.lines.join(' / '):null
  if(key&&key!==last)seen.push({lines:n.lines,turn:h.viewer.state.turnNo,held:h.viewer.held,units:Object.values(h.viewer.state.U).filter(u=>u.life!=='dead').map(u=>u.typeId)})
  last=key}
 assert.equal(h.busy,false,'the board settles');assert.equal(h.fault,'','no fault')
 return seen
}
const $=(h,id)=>h.viewer._V.dom.root.querySelector('#'+id)
function endTurn(w,h){
 const end=$(h,'playEndTurn');assert.ok(end&&end.getAttribute('aria-disabled')==='false','End Turn may be given')
 end.handlers.click({});const ask=$(h,'playAsk'),yes=$(h,'playAskYes');if(yes&&ask&&ask.style.display!=='none')yes.handlers.click({})
 return playing(w,h)
}
/* 2026-10-04, viewer.new-enemy-ability-line: the notice may carry a third line (what the kind can do — that item's verify
   reads it); this one holds the notice's first two lines, "New enemy" and the name */
const words=seen=>seen.map(s=>s.lines.slice(0,2).join(' / '))
const nameOf=(h,typeId)=>h.viewer._V.data.UD[typeId].name

/* ── A · outside a run ── */
{
 const {w}=bootSlice(page,{search:'?play='+LUMBERJACK}),h=w.__sandbox
 const opening=playing(w,h)
 assert.deepEqual(words(opening),['New enemy / '+nameOf(h,'unit.zombie')],'the Zombie on the board is named before the first hero is activated')
 assert.equal(opening[0].held,true,'the board waits under the notice');assert.equal(h.session.ctx.battleCursor.at,'acting','and the first hero then acts')
 say(`A1 ?play=${LUMBERJACK}: "${words(opening)[0]}" before the first hero is activated`)
 const t2=endTurn(w,h);assert.equal(h.session.ctx.state.turn,2)
 assert.deepEqual(words(t2),['New enemy / '+nameOf(h,'unit.skeletal-archer')],'Turn 2: the arriving Skeleton Archer is named');assert.ok(t2[0].units.includes('unit.skeletal-archer'),'it is on the board when the notice stands')
 const t3=endTurn(w,h);assert.equal(h.session.ctx.state.turn,3)
 assert.ok(h.session.ctx.state.units.filter(u=>u.typeId==='unit.skeletal-archer').length>=3,'two more archers came on Turn 3');assert.deepEqual(words(t3),[],'and nothing is said for them')
 say(`A2 Turn 2: "${words(t2)[0]}", once — Turn 3's two more archers: nothing`)
}

/* ── B · the opening run ── */
{
 const {handle:h,w,camp,store,v,shown,readMap,draft,straightIn,whoGoes,equipThenFight,fightOut,levelUps,heroIds}=openingPage(page,'?map&seed=11')
 const saved=()=>JSON.parse(store.get('hbt-opening-run')).campaign.revealed
 /* Law 10, 2026-10-04 (kingdom.opening-starts-in-battle, merged with this item; engine DECISIONS.md 2026-10-04 '… no map before
    battle 1 …': "We're just going straight into the battle after you get your hero."): these three lines read
      assert.equal(readMap([],'fresh'),ORPHANAGE);assert.deepEqual(camp().revealed,[])
      v.click('field',ORPHANAGE);const first=draft('battle 1');whoGoes('battle 1')
      equipThenFight([first],'battle 1')
    — the run opened on the map, its click opened the first draft, and the pick rested at Equip. A new run opens on the
    first draft and its pick puts the Orphanage on the board (tools/opening-page.mjs straightIn). What this script holds
    of battle 1 — which kinds are met and announced — is unchanged. */
 assert.ok(shown('campaign')&&!shown('conquest'),'fresh: the first draft, no map');assert.deepEqual(camp().revealed,[])
 const first=draft('battle 1')
 straightIn([first],'battle 1')
 /* battle 1: its lesson introduces the Zombie — met as the battle is put on the screen, and never announced */
 assert.deepEqual(camp().revealed,['reveal.enemy.zombie'],'battle 1 on the screen: the Zombie is met (its lesson names it)');assert.deepEqual(saved(),['reveal.enemy.zombie'],'and that is in the run\'s save')
 const b1=[...playing(w,h),...endTurn(w,h)]
 assert.deepEqual(words(b1),[],'battle 1 announces no Zombie — the one on the board, or the one that arrives on Turn 2')
 say('B1 the run, battle 1: no notice for the Zombie (its lesson introduces it); the run\'s save holds reveal.enemy.zombie')
 fightOut(true,'battle 1');levelUps('battle 1')
 assert.equal(readMap([ORPHANAGE],'after battle 1'),LUMBERJACK)
 v.click('field',LUMBERJACK);const second=draft('battle 2'),party=[first,second].sort();whoGoes('battle 2')
 equipThenFight(party,'battle 2')
 const open2=playing(w,h),t2=endTurn(w,h)
 assert.deepEqual(words(open2),[],'battle 2 opens with a Zombie on the board: already met, not announced')
 assert.deepEqual(words(t2),['New enemy / Skeleton Archer'],'battle 2\'s Turn 2: "New enemy" over the Skeleton Archer')
 assert.deepEqual(camp().revealed,['reveal.enemy.zombie','reveal.enemy.skeletal-archer'],'the kind is met once its notice has gone up');assert.deepEqual(saved(),camp().revealed,'and the met kinds are in the run\'s save')
 assert.deepEqual(words(endTurn(w,h)),[],'Turn 3\'s archers: nothing')
 say(`B2 battle 2: nothing for the Zombie; Turn 2 "${words(t2)[0]}"; the run's save holds ${saved().join(', ')}`)
 /* lost, and replayed: nothing already met is announced */
 fightOut(false,'battle 2 lost');assert.equal(readMap([ORPHANAGE],'after losing battle 2'),LUMBERJACK)
 assert.deepEqual(saved(),['reveal.enemy.zombie','reveal.enemy.skeletal-archer'],'the loss keeps what was met')
 v.click('field',LUMBERJACK);whoGoes('battle 2 again');equipThenFight(party,'battle 2 again')
 const again=[...playing(w,h),...endTurn(w,h),...endTurn(w,h)]
 assert.equal(h.session.ctx.state.turn,3);assert.ok(h.session.ctx.state.units.some(u=>u.typeId==='unit.skeletal-archer'),'the archers arrived again')
 assert.deepEqual(words(again),[],'the battle replayed after a loss announces nothing already met')
 assert.deepEqual(heroIds(),party)
 say('B3 battle 2 lost and replayed: the archers arrive again and nothing is announced')
}
console.log('new-enemy-notice: a new kind of enemy is named once, and the run remembers it, on the built sandbox — passed')
