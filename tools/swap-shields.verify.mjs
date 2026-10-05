// movement.swap-and-shields (engine DECISIONS.md 2026-10-01 'the movements': "weapon swap and shield actions are part of
// what's needed now"). The BUILT sandbox plays an opening battle on the board alone (?play=, no dropdown, no Execute) and
// every command comes from the battle screen: the hero clicked to act, the swap chosen on the action bar's swap strip
// (the hands to hold afterwards, its cost), the shield powers clicked on the bar, End activation in the corner.
//   1. The Lion of the Host (Longsword + Kite Shield) swaps to the Longsword alone on Turn 1 — stamina drops by the
//      swap's cost, the log shows the swap — and a second swap in that activation is refused on the bar; on Turn 2,
//      the Kite Shield stowed, it swaps both back and uses the Kite Shield's first power from the bar, on Turn 3 its second.
//   2. The Battle Chaplain (Round Shield) uses the Round Shield's first power, then its second; the Iron Dwarf (Tower Shield)
//      the Tower's first, then its second — each from the bar, one per Turn. (The powers are the engine's rows': the note below.)
// The battle log on the screen (the play chrome's #playLog) must name every power used and the swap.
//
//   node tools/swap-shields.verify.mjs <page.html>    prints the record as JSON (engine test/movement-swap-and-shields.test.ts)
import assert from 'node:assert/strict'
import {bootSlice} from './atlas-dom.mjs'

const PAGE=process.argv[2]??'BATTLE-SANDBOX.html',ENCOUNTER='encounter.opening.orphanage'
const strip=html=>String(html).replace(/<[^>]*>/g,'').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim()

function battle(hero){
 const {w,click}=bootSlice(PAGE,{search:`?play=${ENCOUNTER}&heroes=${hero}`}),handle=w.__sandbox
 const V=()=>handle.viewer._V,ctx=()=>handle.session.ctx
 const settle=()=>{if(handle.busy)click('skip');assert.equal(handle.busy,false)}
 const me=()=>ctx().state.units.find(u=>u.uid===handle.session.policy.humanUnitUids[0])
 const figure=id=>V().layers.UEL.get(id).img
 const row=id=>V().dom.actionbar.querySelectorAll('.acRow').find(r=>r.dataset.act===id)??null
 const swapStrip=()=>V().dom.stambar.querySelector('.swapCell')
 const swapButtons=()=>V().dom.stambar.querySelectorAll('.swBtn')
 /* Law 10, viewer.swap-button-rearranges (2026-10-04; engine DECISIONS.md 2026-10-03 'the swap button says "Swap" and opens a rearranging of the unit's gear'): the strip carries ONE button that reads Swap; the hand lists the engine would take are
    offered in the gear panel it opens. `offered` is still the hand lists on offer, by label (the host's swap fact the panel
    is drawn from); a swap is still made through the page's own DOM — Swap pressed, the gear arranged, Confirm pressed.
    was: one .swBtn per hand list, its text the label, clicked to swap at once. */
 const offered=()=>(V().play?.swap?.choices??[]).map(c=>c.label)
 const gear=()=>V().dom.root.querySelector('#playGear')
 /** press Swap, arrange the gear so exactly `names` are in hand, confirm; false when the panel will not confirm it */
 const arrange=names=>{const b=swapButtons();assert.deepEqual(b.map(x=>x.textContent),['Swap'],'one button, reading Swap');b[0].handlers.click({detail:1})
  assert.notEqual(gear().style.display,'none','the gear panel opens')
  for(const it of gear().querySelectorAll('.gearItem').map(n=>({name:n.textContent,held:!!n.parentNode&&n.parentNode.id==='playGearHand'})))
   if(it.held!==names.includes(it.name))gear().querySelectorAll('.gearItem').find(n=>n.textContent===it.name).handlers.click({})
  const yes=V().dom.root.querySelector('#playGearYes'),ok=yes.getAttribute('aria-disabled')!=='true'
  if(ok)yes.handlers.click({});else V().dom.root.querySelector('#playGearNo').handlers.click({})
  return ok}
 const log=()=>V().dom.root.querySelector('#playLog').children.map(n=>strip(n.innerHTML))
 const acting=()=>ctx().battleCursor?.at==='acting'&&ctx().battleCursor.actor===me().id
 /** on to the next Turn: End Turn in the corner — the civilians, played too, have not acted, so its pop-up asks and is
     answered End Turn — then the Enemy Phase plays, and the heroes choose again */
 const nextTurn=()=>{const t=ctx().state.turn;settle()
  /* Law 10, viewer.turn-taking (engine DECISIONS.md 2026-10-03 'a hero starts its Activation with its basic move armed';
     kingdom SWITCHES playQueueProposal overturned): when an Activation ends the next yet to act is begun, so End Turn is given
     with a civilian acting and the next Turn opens with the hero begun — was: 'selecting' before End Turn and after it */
  for(let n=0;n<10&&ctx().state.turn===t&&!ctx().state.outcome;n++){
   V().dom.root.querySelector('#playEndTurn').handlers.click({})
   const ask=V().dom.root.querySelector('#playAsk');if(ask.style.display!=='none')V().dom.root.querySelector('#playAskYes').handlers.click({})
   settle()}
  assert.equal(ctx().state.outcome??null,null,'the battle goes on');assert.equal(ctx().state.turn,t+1,'the next Turn');assert.ok(acting(),'the hero, leftmost, is begun again')}
 /** a double-click on the hero's card in the top bar: it is the hero acting, or (while the one acting has done nothing) it
     becomes so — viewer.turn-taking; was viewer.xcom-camera's "makes it the next to act", proposed and not begun */
 const choose=()=>{V().dom.rail.querySelectorAll('.railchip').find(c=>+c.dataset.i===me().id).handlers.dblclick({});settle();assert.ok(acting(),'the hero acts')}
 const begin=()=>{choose();figure(me().id).handlers.click({detail:1});settle();assert.ok(acting(),'clicking the hero begins its activation')}
 /** a shield power from the bar: its row clicked, then clicked again */
 /* Law 10, 2026-10-04 — content.shields-reauthored (engine item; engine DECISIONS.md 2026-09-28 'counterattack, special free attacks, the opening six, shields, custom weapons' and the Armory Ledger approved that day): the shields' powers were typed here by id (the Kite's
   power.kite-shield.shield-wall and .raise-guard, the Round's .turn-aside and .brace, the Tower's .cover and .stand-tall) and the Ledger
   replaced all six. A shield's powers are what the engine's row grants, in its order - read from the battle's own item rows. A power
   aimed at one ally (the Kite's Cover Ally) is used by clicking its row and then the hero itself: the engine counts the one acting
   among its own allies. Every check is unchanged. */
 const powersOf=item=>[...ctx().items[item].abilities]
 function usePower(id){
  const r=row(id),turn=ctx().state.turn,before=ctx().events.length
  const out={hero,id,turn,onBar:!!r,used:false,name:null,stamina:null,logNamed:false}
  if(!r)return out
  r.handlers.click({});settle();const note=V().play?.note??null
  if(ctx().actions[id].target?.select==='unit'){figure(me().id).handlers.click({detail:1});settle();if(!ctx().events.slice(before).some(e=>e.type==='power.used'))figure(me().id).handlers.click({detail:1})}
  else row(id)?.handlers.click({})
  settle()
  const used=ctx().events.slice(before).find(e=>e.type==='power.used'&&e.actor===me().id&&e.causeId===id)
  out.used=!!used;out.name=used?.['name']??null;out.note=note
  out.stamina=ctx().events.slice(before).find(e=>e.type==='stamina.spent'&&e.actor===me().id)?.['amount']??null
  out.logNamed=!!used&&log().some(l=>l.includes('uses '+used['name']))
  return out
 }
 /* viewer.turn-taking: as the battle opens the hero's begun Activation is still playing — no plan facts, so no swap on the bar
    until it acts (was: measured while the hero was only proposed, at 'selecting') */
 const noSwapBefore=!swapStrip()
 settle()
 assert.ok(acting(),'the hero, leftmost in the top bar, is begun')
 return {w,V,ctx,settle,me,row,swapStrip,swapButtons,offered,arrange,log,acting,nextTurn,choose,begin,usePower,powersOf,figure,noSwapBefore}
}

const record={swap:null,back:null,powers:[]}
{// 1. the Lion of the Host: the swap, the refusal, the swap back, the Kite Shield's two powers
 const B=battle('hero.base.paladin-hunk')
 const noSwapWhileChoosing=B.noSwapBefore
 B.begin()
 const id=B.me().id,before=B.me().stamina,handsBefore=B.me().loadout.hands.map(i=>i.itemId)
 const strip=B.swapStrip();assert.ok(strip,'the swap is on the action bar')
 const offered=B.offered()
 const costText=strip.querySelector('.swCost')?.textContent??''
 assert.ok(offered.includes('Longsword'),'the Longsword alone is offered')
 const n=B.ctx().events.length;assert.ok(B.arrange(['Longsword']),'the gear panel confirms the Longsword alone');B.settle()
 const swapped=B.ctx().events.slice(n).find(e=>e.type==='loadout.swapped'&&e.actor===id)
 const after=B.me().stamina
 // a second swap in the activation: the bar says why, and a click there is refused
 const spent=B.swapStrip(),n2=B.ctx().events.length
 const offeredAgain=B.offered()
 assert.equal(B.arrange(['Longsword','Kite Shield']),false,'a second swap cannot be confirmed in the gear panel')
 const tookAgain=B.V().offerPlay({kind:'swap',index:0,unit:id})
 const swappedAgain=B.ctx().events.slice(n2).some(e=>e.type==='loadout.swapped')
 const shieldOnBar=B.powersOf('item.kite-shield').some(p=>!!B.row(p))
 record.swap={hero:'hero.base.paladin-hunk',noSwapWhileChoosing,handsBefore,offered,costText,staminaBefore:before,staminaAfter:after,
  event:swapped?{stamina:swapped['stamina'],handsAfter:swapped['handsAfter'].map(i=>i.itemId)}:null,handsAfter:B.me().loadout.hands.map(i=>i.itemId),
  stowed:B.me().loadout.stowed.map(i=>i.itemId),shieldPowersOnBarAfter:shieldOnBar,
  refused:{why:spent?.querySelector('.swWhy')?.textContent??null,offered:offeredAgain,took:tookAgain,swapped:swappedAgain},
  logNamed:B.log().some(l=>l.includes('swaps'))}
 B.V().dom.root.querySelector('#playEndAct').handlers.click({});B.settle()
 B.nextTurn();B.begin()
 const both=B.offered().includes('Longsword + Kite Shield')
 const m=B.ctx().events.length,stam=B.me().stamina
 if(both)B.arrange(['Longsword','Kite Shield']);B.settle()
 const back=B.ctx().events.slice(m).find(e=>e.type==='loadout.swapped')
 record.back={offered:both?true:false,stowedBefore:record.swap.stowed,handsAfter:B.me().loadout.hands.map(i=>i.itemId),staminaBefore:stam,staminaAfter:B.me().stamina,event:back?{stamina:back['stamina']}:null}
 const [kiteFirst,kiteSecond]=B.powersOf('item.kite-shield')
 record.powers.push(B.usePower(kiteFirst))
 B.nextTurn();B.begin()
 record.powers.push(B.usePower(kiteSecond))
}
for(const [hero,shield] of [['hero.base.priest-armored','item.round-shield'],['hero.base.warrior-iron','item.tower-shield']]){
 const B=battle(hero),[first,second]=B.powersOf(shield)
 B.begin()
 record.powers.push(B.usePower(first))
 B.nextTurn();B.choose()
 // the next Turn the hero is begun again (viewer.turn-taking; was: proposed, its power on the bar beginning it)
 record.powers.push(B.usePower(second))
}
process.stdout.write(JSON.stringify(record))
