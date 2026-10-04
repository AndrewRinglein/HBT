// The opening's lessons, played on the built page with the mouse — what the kingdom.tutorial-* page tests share. A new run
// (?map&new, a named seed), the first hero picked, the Orphanage on the board; the battle is then played as a player plays
// it — the battle screen's own hex buttons, unit figures, action-bar rows and End buttons, through the play input to the
// engine — while the gold notice and the arrows on the screen are read from the battle screen's own record (viewer
// `overlays`) and the row that is up from the page's handle (`__sandbox.lesson`). Nothing here decides anything: where a
// unit can go and whom it can strike are read off the board as it is drawn (the blue grid, the lit targets).
import assert from 'node:assert/strict'
import {openingPage,LESSON_ROWS,lessonReveal} from './opening-page.mjs'
export {LESSON_ROWS,lessonReveal}
export const ORPHANAGE='encounter.opening.orphanage',LUMBERJACK='encounter.opening.lumberjack'
export const rowOf=id=>{const r=LESSON_ROWS.find(x=>x.id===id);assert.ok(r,'the lesson table holds '+id);return r}

/** A new run on `seed`, its first hero picked: battle 1 on the board, the lesson's first row up. */
export function newRun(page,seed,browser=new Map()){
 const P=openingPage(page,'?map&new&seed='+seed,browser),first=P.draft('battle 1');P.straightIn([first],'battle 1')
 return {...board(P),first,browser}
}
/** The battle now on `P`'s screen, with the hands and eyes the tests use. */
export function board(P){
 const h=P.handle,w=P.w
 const v=()=>h.viewer,V=()=>h.viewer._V,ctx=()=>h.session.ctx,O=()=>v().overlays
 const lines=()=>O().notice?[...O().notice.lines]:null,ptrs=()=>O().pointers
 const flush=ms=>{for(let t=0;t<ms;t+=20)w._flush(20)}
 const until=(f,what,ms=60000)=>{for(let t=0;t<ms&&!f();t+=20)w._flush(20);assert.ok(f(),what)}
 const stage=()=>V().dom.stage,hexBtn=x=>stage().querySelectorAll('.playHex').find(n=>+n.dataset.hex===x)
 const figure=id=>V().layers.UEL.get(id).img
 const drawn=cls=>stage().querySelectorAll('.'+cls).map(n=>+n.dataset.hex).sort((a,b)=>a-b)
 const barRow=id=>V().dom.actionbar.querySelectorAll('.acRow').find(r=>r.dataset.act===id)
 const party=()=>h.session.setup.heroUids,units=()=>ctx().state.units
 const heroes=()=>units().filter(u=>party().includes(u.uid)),hero=()=>heroes()[0]
 const civilians=()=>units().filter(u=>u.side==='hero'&&!party().includes(u.uid)&&u.lifeState==='standing')
 const enemies=()=>units().filter(u=>u.side==='enemy'&&u.lifeState==='standing')
 const actor=()=>ctx().battleCursor?.at==='acting'?units()[ctx().battleCursor.actor]:null
 /** the board still and the engine waiting for the player (or the battle over) */
 const settle=(what='the board settles')=>{until(()=>!h.busy&&(!!ctx().state.outcome||ctx().battleCursor?.at==='acting'||h.lesson!==null&&ctx().battleCursor?.at==='selecting'),what);assert.equal(h.fault,'','no fault')}
 /** the lesson's rows that wait, clicked past (a click moves on); the hero is then begun */
 const pastOpening=()=>{for(let i=0;i<20&&h.lesson&&ctx().battleCursor?.at==='selecting';i++){hexBtn(hero().hex).handlers.click({detail:1});w._flush(20)}
  until(()=>!h.busy&&ctx().battleCursor?.at==='acting','the opening rows over, the hero is begun')}
 const press=id=>{const r=barRow(id);assert.ok(r,id+' is on the bar');r.handlers.click({})}
 /** a click on a hex, and again: the unit acting walks there */
 const walkTo=x=>{hexBtn(x).handlers.click({detail:1});hexBtn(x).handlers.click({detail:1});settle('the walk plays')}
 const endActivation=()=>{V().dom.root.querySelector('#playEndAct').handlers.click({});settle('the Activation ends')}
 const endTurn=()=>{V().dom.root.querySelector('#playEndTurn').handlers.click({});const ask=V().dom.root.querySelector('#playAsk');if(ask&&ask.style.display!=='none')V().dom.root.querySelector('#playAskYes').handlers.click({})}
 const basicMove=u=>u.actions.find(id=>ctx().actions[id].move&&!ctx().actions[id].attack)
 /** the first lesson done as a player does it: the opening rows clicked past, the basic move pressed, the hex pointed at walked to */
 const firstMove=()=>{pastOpening();until(()=>h.lesson==='lesson.orphanage.two-actions','the two-actions row');press(basicMove(hero()))
  const at=ptrs().map(p=>p.target.match(/^hex:(\d+)$/)).find(Boolean);assert.ok(at,'the move row points at a hex');walkTo(+at[1]);return +at[1]}
 /** the lessons' rows now up */
 const up=()=>h.lessons
 /** the battle played as a player in no hurry plays it, until `done()` — looked at every 20 ms of the page's clock — or the battle
     ends: each Activation the board waits on is given to `act` (true: it did something that plays), else ended. Nothing is
     sought: the battle is the page's own, on its own seed. */
 const playUntil=(done,act=()=>false,ms=600000)=>{for(let t=0;t<ms;t+=20){if(done())return true
   if(ctx().state.outcome&&!h.busy)return done()   /* the battle over and its last lines played */
   if(!h.busy&&ctx().battleCursor?.at==='acting'&&!h.lesson?.startsWith?.('lesson.orphanage.protect')){if(!act(actor())){V().dom.root.querySelector('#playEndAct').handlers.click({})}}
   w._flush(20)}
  return done()}
 return {up,playUntil,P,h,w,v,V,ctx,O,lines,ptrs,flush,until,stage,hexBtn,figure,drawn,barRow,party,units,heroes,hero,civilians,enemies,actor,settle,pastOpening,press,walkTo,endActivation,endTurn,basicMove,firstMove}
}
