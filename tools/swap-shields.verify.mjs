// movement.swap-and-shields (engine DECISIONS.md 2026-10-01 'the movements': "weapon swap and shield actions are part of
// what's needed now"). The BUILT sandbox plays an opening battle on the board alone (?play=, no dropdown, no Execute) and
// every command comes from the battle screen: the hero clicked to act, the swap chosen on the action bar's swap strip
// (the hands to hold afterwards, its cost), the shield powers clicked on the bar, End activation in the corner.
//   1. The Lion of the Host (Longsword + Kite Shield) swaps to the Longsword alone on Turn 1 — stamina drops by the
//      swap's cost, the log shows the swap — and a second swap in that activation is refused on the bar; on Turn 2,
//      the Kite Shield stowed, it swaps both back and uses Lock Shields from the bar, on Turn 3 Raise Guard.
//   2. The Battle Chaplain (Round Shield) uses Turn Aside, then Bear Down; the Iron Dwarf (Tower Shield) Cover, then
//      Stand Tall — each from the bar, one per Turn.
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
 function usePower(id){
  const r=row(id),turn=ctx().state.turn,before=ctx().events.length
  const out={hero,id,turn,onBar:!!r,used:false,name:null,stamina:null,logNamed:false}
  if(!r)return out
  r.handlers.click({});settle();const note=V().play?.note??null
  row(id)?.handlers.click({});settle()
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
 return {w,V,ctx,settle,me,row,swapStrip,swapButtons,log,acting,nextTurn,choose,begin,usePower,figure,noSwapBefore}
}

const record={swap:null,back:null,powers:[]}
{// 1. the Lion of the Host: the swap, the refusal, the swap back, the Kite Shield's two powers
 const B=battle('hero.base.paladin-hunk')
 const noSwapWhileChoosing=B.noSwapBefore
 B.begin()
 const id=B.me().id,before=B.me().stamina,handsBefore=B.me().loadout.hands.map(i=>i.itemId)
 const strip=B.swapStrip();assert.ok(strip,'the swap is on the action bar')
 const offered=B.swapButtons().map(b=>b.textContent)
 const costText=strip.querySelector('.swCost')?.textContent??''
 const sword=B.swapButtons().find(b=>b.textContent==='Longsword');assert.ok(sword,'the Longsword alone is offered')
 const n=B.ctx().events.length;sword.handlers.click({});B.settle()
 const swapped=B.ctx().events.slice(n).find(e=>e.type==='loadout.swapped'&&e.actor===id)
 const after=B.me().stamina
 // a second swap in the activation: the bar says why, and a click there is refused
 const spent=B.swapStrip(),n2=B.ctx().events.length
 const offeredAgain=B.swapButtons().map(b=>b.textContent)
 const tookAgain=B.V().offerPlay({kind:'swap',index:0,unit:id})
 const swappedAgain=B.ctx().events.slice(n2).some(e=>e.type==='loadout.swapped')
 const shieldOnBar=!!B.row('power.kite-shield.shield-wall')
 record.swap={hero:'hero.base.paladin-hunk',noSwapWhileChoosing,handsBefore,offered,costText,staminaBefore:before,staminaAfter:after,
  event:swapped?{stamina:swapped['stamina'],handsAfter:swapped['handsAfter'].map(i=>i.itemId)}:null,handsAfter:B.me().loadout.hands.map(i=>i.itemId),
  stowed:B.me().loadout.stowed.map(i=>i.itemId),shieldPowersOnBarAfter:shieldOnBar,
  refused:{why:spent?.querySelector('.swWhy')?.textContent??null,offered:offeredAgain,took:tookAgain,swapped:swappedAgain},
  logNamed:B.log().some(l=>l.includes('swaps'))}
 B.V().dom.root.querySelector('#playEndAct').handlers.click({});B.settle()
 B.nextTurn();B.begin()
 const both=B.swapButtons().find(b=>b.textContent==='Longsword + Kite Shield')
 const m=B.ctx().events.length,stam=B.me().stamina
 both?.handlers.click({});B.settle()
 const back=B.ctx().events.slice(m).find(e=>e.type==='loadout.swapped')
 record.back={offered:both?true:false,stowedBefore:record.swap.stowed,handsAfter:B.me().loadout.hands.map(i=>i.itemId),staminaBefore:stam,staminaAfter:B.me().stamina,event:back?{stamina:back['stamina']}:null}
 record.powers.push(B.usePower('power.kite-shield.shield-wall'))
 B.nextTurn();B.begin()
 record.powers.push(B.usePower('power.kite-shield.raise-guard'))
}
for(const [hero,first,second] of [['hero.base.priest-armored','power.round-shield.turn-aside','power.round-shield.brace'],['hero.base.warrior-iron','power.tower-shield.cover','power.tower-shield.stand-tall']]){
 const B=battle(hero)
 B.begin()
 record.powers.push(B.usePower(first))
 B.nextTurn();B.choose()
 // the next Turn the hero is begun again (viewer.turn-taking; was: proposed, its power on the bar beginning it)
 record.powers.push(B.usePower(second))
}
process.stdout.write(JSON.stringify(record))
