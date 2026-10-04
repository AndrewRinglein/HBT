// kingdom.opening-starts-in-battle — ruled 2026-10-04 (Andrew, engine/DECISIONS.md 'the opening's tutorial: the first hero's
// class line, no map before battle 1, …'): "We don't start by showing you going to the orphanage on the map. There's no
// reason to have that map step in the beginning. We're just going straight into the battle after you get your hero."
// Expect: "… a new run shows the first draft first; picking a hero shows the Orphanage battle with that hero on the board,
// with no map and no equip screen in between; after the battle's rewards the map shows the Orphanage taken and points at
// the Lumberjack House. A page test walks new run -> pick -> battle and asserts neither the map nor the equip page was
// drawn before battle 1, and that battle 2 is still reached through the map, the draft and Equip."
//
// The BUILT sandbox, opened as the launcher's Start a new run opens it (?map&new — here with a named seed), in one browser.
// What the page DREW is read, not only what it shows at the end: every write of the map's and the campaign screen's
// markup is kept by the driver (tools/opening-page.mjs `drawn`), so "never drawn before battle 1" is held of every screen
// in between. Battles are settled as the driver settles them (playedOut: the overpowered test party for a win, the party
// held idle for a loss — nothing sought).
//
//   node tools/opening-starts-in-battle.verify.mjs [BATTLE-SANDBOX.html]
import assert from 'node:assert/strict'
import {openingPage,runSaveText,campaignAt} from './opening-page.mjs'
const page=process.argv[2]??'BATTLE-SANDBOX.html'
const ORPHANAGE='encounter.opening.orphanage',LUMBERJACK='encounter.opening.lumberjack'
const RUN_SEED=Number(process.env.STARTS_IN_BATTLE_SEED??11),RUN_KEY='hbt-opening-run'
const browser=new Map()
/* what a page drew, from its opening: the map, the Equip page, the Who-goes page, a draft — counted */
const drew=(P,what)=>P.drawn.filter(d=>d[what]).length
const noMapNoEquip=(P,label)=>{assert.equal(drew(P,'map'),0,label+': the map was never drawn');assert.equal(drew(P,'equip'),0,label+': the Equip page was never drawn');assert.equal(drew(P,'deploy'),0,label+': the Who-goes page was never drawn')}

/* 1 · a new run: the first screen is the first draft — no map */
let P=openingPage(page,'?map&new&seed='+RUN_SEED,browser)
const camp=()=>P.camp()
assert.ok(P.shown('campaign')&&!P.shown('conquest'),'a new run opens on the campaign screen, not the map')
assert.equal(camp().cursor.step,'draft','a new run opens on the first draft');assert.equal(camp().cursor.prologue,1)
assert.equal(P.byId('campaign').querySelectorAll('[data-act=draft]').length,3,'three to choose the first hero from')
assert.match(P.byId('campaign').innerHTML,/<h2>The draft — your first hero<\/h2>/)
assert.equal(P.handle.session,null,'nothing is fielded before the pick');assert.deepEqual(P.heroIds(),[],'the run starts with nobody')
assert.equal(P.byId('conquest').querySelectorAll('[data-section]').length,0,'the map holds nothing: it was not drawn')
noMapNoEquip(P,'a new run')
assert.ok(browser.has(RUN_KEY),'the run is kept from its first screen')
/* … closed on that draft and opened again (the launcher's Continue): the same first draft, still no map */
const offered=P.byId('campaign').querySelectorAll('[data-act=draft]').map(o=>o.dataset.id)
P=openingPage(page,'?map',browser)
assert.equal(camp().cursor.step,'draft','reopened: the first draft');assert.deepEqual(P.byId('campaign').querySelectorAll('[data-act=draft]').map(o=>o.dataset.id),offered,'reopened: the same three')
noMapNoEquip(P,'a new run, reopened')

/* 2 · the pick: straight into the Orphanage, that hero on the board — no map, no Equip in between */
const first=P.draft('battle 1')
const s1=P.straightIn([first],'battle 1')
assert.equal(s1.config.encounterId,ORPHANAGE,'the pick fields the Orphanage');assert.equal(s1.config.seed,1,'on the battle\'s own number')
assert.ok(P.w.document.body.classList.contains('battle-view'),'the battle is its own full screen')
assert.equal(s1.ctx.state.units.filter(u=>u.side==='hero'&&u.typeId===camp().roster[first].unitType).length,1,'the hero picked is on the board')
noMapNoEquip(P,'the pick')
/* … closed on that battle and opened again: the battle, and still no map */
P=openingPage(page,'?map',browser)
assert.equal(camp().cursor.step,'battle','reopened mid-battle: on that battle');P.onTheBattle('battle 1, reopened');noMapNoEquip(P,'battle 1, reopened')

/* 3 · battle 1 lost: its screen, and the way on goes straight back into the battle — new dice, no map, no Equip */
const lost=P.fightOut(false,'battle 1 lost')
assert.equal(camp().cursor.step,'battle','a lost battle 1 goes straight back into the battle');assert.equal(camp().cursor.replays,1,'the replay is counted')
const s1b=P.straightIn([first],'battle 1 again')
assert.equal(s1b.config.encounterId,ORPHANAGE);assert.notEqual(s1b.config.seed,lost.seed,'the replay is on new dice')
assert.equal(camp().roster[first].xp,0,'the lost battle paid nothing')
noMapNoEquip(P,'battle 1 lost and fought again')

/* 4 · a run kept from before battle 1 was fought opens the same way — whatever screen the save was taken on:
   (a) nobody drafted, the open step (what the page before this item kept on its first screen, the map): the first draft;
   (b) the hero drafted, the open step (the older page's map again, or a lost battle 1's save): the battle;
   (c) the hero drafted, at Equip (the older page's stop before To the battle): the battle. */
for(const [label,at,want] of [['saved with nobody drafted','new','draft'],['saved with the hero drafted, nothing fielded','drafted','battle'],['saved at the older page\'s Equip stop','equip','battle']]){
 const store=new Map([[RUN_KEY,runSaveText(campaignAt(RUN_SEED,at,ORPHANAGE))]])
 const Q=openingPage(page,'?map',store)
 assert.equal(Q.camp().cursor.step,want,`${label}: the run opens on the ${want==='draft'?'first draft':'battle'}`)
 assert.ok(!Q.shown('conquest'),label+': no map')
 if(want==='battle'){const s=Q.straightIn(Q.heroIds(),label);assert.equal(s.config.encounterId,ORPHANAGE)}
 else assert.equal(Q.byId('campaign').querySelectorAll('[data-act=draft]').length,3,label+': three offered')
 noMapNoEquip(Q,label)
}

/* 5 · battle 1 won: its rewards and level-up, and THEN the map, for the first time — the Orphanage taken, the arrow on
   the Lumberjack House */
P.fightOut(true,'battle 1 won')
noMapNoEquip(P,'through battle 1\'s recap')
P.levelUps('battle 1')
assert.equal(camp().cursor.step,'open');assert.equal(camp().cursor.prologue,2)
assert.equal(P.readMap([ORPHANAGE],'after battle 1'),LUMBERJACK,'the map shows the Orphanage taken and points at the Lumberjack House')
assert.equal(P.byId('conquest').querySelectorAll('.nextArrow').length,1,'one red arrow');assert.equal(P.byId('conquest').querySelectorAll('.check').length,1,'one green check')
assert.ok(drew(P,'map')>=1,'the map is drawn now');assert.equal(drew(P,'equip'),0,'and Equip has still not been')
/* … closed on the map and opened again: the map, as before this item */
P=openingPage(page,'?map',browser)
assert.equal(P.readMap([ORPHANAGE],'after battle 1, reopened'),LUMBERJACK)

/* 6 · battle 2 is still reached through the map, the draft and Equip */
const before={map:drew(P,'map'),draft:drew(P,'draft'),equip:drew(P,'equip')}
P.v.click('field',LUMBERJACK)
assert.equal(camp().cursor.step,'draft','the map\'s click opens the second draft');assert.ok(drew(P,'draft')>before.draft,'the draft is drawn')
const second=P.draft('battle 2')
assert.deepEqual([camp().cursor.step,camp().cursor.prepStep],['prep','equip'],'the pick opens Equip — not the battle');assert.equal(P.handle.session,null,'nothing is fielded on the board yet')
assert.equal(P.whoGoes('battle 2').asked,false)
assert.equal(P.byId('campaign').querySelectorAll('.equip-page').length,1,'the Equip page is on the screen');assert.ok(drew(P,'equip')>before.equip,'Equip is drawn')
const s2=P.equipThenFight([first,second].sort(),'battle 2')
assert.equal(s2.config.encounterId,LUMBERJACK)
/* a lost battle 2 goes back to the MAP, as before: straight back in is the first battle's alone */
P.fightOut(false,'battle 2 lost')
assert.equal(camp().cursor.step,'open');assert.equal(P.readMap([ORPHANAGE],'after losing battle 2'),LUMBERJACK,'a lost battle 2 waits on the map')
console.log(`opening starts in battle: a new run opened on the first draft (three offered), closed and reopened on it; the pick (${camp().roster[first].name}) went straight into the Orphanage with that hero on the board — no map and no Equip drawn before battle 1; a lost battle 1 went straight back into the battle on new dice (seed ${lost.seed}, then ${s1b.config.seed}); a run saved before battle 1 was fought opened the same way (nobody drafted: the first draft; the hero drafted, at the open step or at the older Equip stop: the battle); after the rewards the map showed the Orphanage taken and the arrow on the Lumberjack House; battle 2 came through the map, the draft and Equip, and lost, waited on the map passed`)
