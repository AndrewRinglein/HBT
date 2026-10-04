// kingdom.opening-loop-three, part 4 of 4 (PLAYABLE-OPENING-PLAN.md item 12; engine DECISIONS.md 2026-09-29 "the playable
// opening": "one page, one sitting, local server: map -> first hero / draft -> equip -> battle -> rewards -> map, for the
// first three battles; a lost battle is replayed with the same party"). Expect: "Andrew plays from the Orphanage through
// the Bridge in one sitting; losing a battle offers it again with the same party; the rewards arrive when ruled."
//
// The BUILT sandbox opened with ?map is one sitting of a Campaign held in the page's memory. This plays it through the
// page's own controls: the map -> the draft (one hero before battle 1 and one more after each battle — GLOSSARY.md
// "The opening drafts", kingdom.opening-draft-cadence 2026-10-03; never a class already drafted) -> Equip -> the encounter's battle, fielded with the campaign's
// Hero rows -> the reckoning (recap), the rewards and the level-ups (the copied Hell-TCG screens) -> the map, with the
// section taken. Battle 1 won: 20 XP to each hero who fought and the level-up with its specialty. Battle 2 lost: the map
// offers it again, no draft owed, the same party, wounds kept; then won: the Flaming Longsword, to a Warrior or Paladin
// when the party of two holds one.
// Battle 3 won: three items, one kept. The map ends with three sections taken. The civilians who lived through a won
// battle join the roster.
//
// 2026-10-04, kingdom.opening-starts-in-battle (engine DECISIONS.md 2026-10-04 '… no map before battle 1 …'): the sitting opens on
// the first draft and its pick goes straight into the Orphanage — no map and no Equip before battle 1; the map first
// shows after battle 1's rewards, and battles 2 and 3 keep map -> draft -> Equip -> battle (Law 10 notes at steps 1 and 2).
//
// The page's steps are tools/opening-page.mjs's (kingdom.opening-run-six moved them there, one copy for this and
// tools/opening-run-six.verify.mjs).
//
//   node tools/opening-loop-three.verify.mjs [BATTLE-SANDBOX.html]
import assert from 'node:assert/strict'
import {openingPage,TAKERS,SPECIALTY_CHOICES,ITEM_ART_SEEN,ITEMS_ART,CIVILIANS_SEEN,LINES_SEEN,DRAFT_NOTICES,DRAFT_MESSAGES} from './opening-page.mjs'
const page=process.argv[2]??'BATTLE-SANDBOX.html'
const ORPHANAGE='encounter.opening.orphanage',LUMBERJACK='encounter.opening.lumberjack',BRIDGE='encounter.opening.bridge',CAVERN='encounter.opening.cavern-trail'
const SWORD='item.longsword.flaming'
/* Law 10, 2026-10-04 (kingdom.page-test-strong-party; engine DECISIONS.md 2026-10-04 'no testing that the battles can be won
   until these items are done; the page tests play an overpowered party; faster landing': "Go ahead, overpowered power
   party."): here stood the table of seeds that settled each battle (KNOWN) and three dated notes on how the run's seed
   and each battle's seed had been found again after an item moved a battle (the XP by tier, the 24-hero pool, the draft's
   modifiers). They are in git. A battle is now settled deliberately by tools/opening-page.mjs (playedOut): won by the
   run's own party made overpowered for the test only, lost by the party held idle and cut at Turn 1 — one battle, on the
   Engagement's own seed, nothing sought. What this page test holds — the loop's flow through three battles — is unchanged.
   LOOP_THREE_SEED: another run seed (another party) — nothing is searched for it either */
const RUN_SEED=Number(process.env.LOOP_THREE_SEED??11)
const {handle,camp,byId,shown,drawn,straightIn,heroIds,civilianIds,wait,readMap,draft,whoGoes,equipThenFight,fightOut:settleOn,levelUps,takeReward,carriers,waitingOffer,v}=openingPage(page,'?map&seed='+RUN_SEED)
/* a battle settled as the test means it to end (opening-page.mjs playedOut), and how it went said (stderr) */
const chosen={}
function fightOut(won,label){const r=settleOn(won,label);chosen[label]=[r.played,r.seed,r.result.turns];console.error(`settled ${label}: ${won?'the strong party, the engine\'s AI':'the party held idle, cut at Turn 1'} — ${r.result.outcome} on Turn ${r.result.turns}, the Engagement's own seed ${r.seed}`);return r}

/* 1 · the sitting opens on the first draft: nothing fielded, nobody drafted — and no map.
   Law 10, 2026-10-04 (kingdom.opening-starts-in-battle; engine DECISIONS.md 2026-10-04 'the opening's tutorial: the first hero's class line, no map before battle 1, …': "We don't
   start by showing you going to the orphanage on the map. There's no reason to have that map step in the beginning.
   We're just going straight into the battle after you get your hero."): this read
     assert.equal(readMap([],'fresh'),ORPHANAGE)
     assert.equal(handle.session,null,'the map fields nothing by itself')
   — the sitting opened on the map with the Orphanage next, and its click opened the first draft. The rule now: a new run
   opens on the first draft; the map is not drawn before battle 1 is won (held of every screen: opening-page.mjs drawn);
   the map with the Orphanage taken and the next section pointed to is held after battle 1, below, as it was. */
assert.ok(shown('campaign')&&!shown('conquest'),'the sitting opens on the first draft, not the map');assert.equal(camp().cursor.step,'draft')
assert.equal(handle.session,null,'nothing is fielded before the pick')
assert.deepEqual(heroIds(),[],'the Campaign starts with nobody')

/* 2 · battle 1: one hero drafted and fielded at once; won; 20 XP each and the level-up with a specialty.
   Law 10, 2026-10-04 (kingdom.opening-starts-in-battle, as above; "straight into the battle" read to cover the Equip stop
   too — kingdom SWITCHES.md startsInBattleNoEquip): this read
     v.click('field',ORPHANAGE)
     const first=draft('battle 1')
     assert.equal(whoGoes('battle 1').asked,false,'one hero: no choice is asked')
     equipThenFight([first],'battle 1')
   — the map's click, the draft, then Equip and its To the battle. The rule now: the pick puts the Orphanage on the board
   with that hero on it — nobody is asked who goes (the one hero is sent: opening-page.mjs straightIn holds it), and
   neither the map nor Equip nor the Who-goes page is drawn before battle 1. Battles 2 and 3 keep every step, below. */
const first=draft('battle 1')
assert.deepEqual(heroIds(),[first],'one hero before battle 1')
straightIn([first],'battle 1')
assert.equal(drawn.filter(d=>d.map||d.equip||d.deploy).length,0,'neither the map nor Equip nor the Who-goes page was drawn before battle 1')
/* kingdom.opening-deploy-choice (2026-10-03): through battles 2 and 3 four or fewer heroes are free to fight, so the run
   asks nothing — no Deploy page, everyone goes, Equip opens at once (opening-page.mjs whoGoes); the choice itself is
   tools/opening-run-six.verify.mjs's, from battle 5 */
const b1=fightOut(true,'battle 1')
assert.equal(camp().roster[first].xp,20,'the Orphanage pays its 20 XP')
assert.equal(camp().cursor.step,'levelUp','battle 1 offers no item: straight to the level-ups')
levelUps('battle 1')
assert.equal(camp().roster[first].level,2,'the first hero is level 2');assert.ok(camp().roster[first].specialty,'with a specialty')
/* kingdom.opening-specialty-three (2026-10-03: "you're supposed to only get a choice of three different specialty classes,
   not nine."): the first hero was offered exactly three specialties of its own class and took one (opening-page.mjs
   threeOffered, at the level-up) */
assert.deepEqual(SPECIALTY_CHOICES.map(x=>x.id),[first],'the first hero chose its specialty');assert.equal(SPECIALTY_CHOICES[0].offered.length,3,'from three')
assert.equal(camp().roster[first].specialty,SPECIALTY_CHOICES[0].took,'and has the one it took')
const saved1=b1.result.units.filter(u=>u.side==='hero'&&u.role==='encounter'&&u.lifeState!=='dead').map(u=>u.typeId).sort()
assert.deepEqual(civilianIds(),saved1,'the Orphanage\'s civilians who lived join the roster; the dead do not')
assert.equal(readMap([ORPHANAGE],'after battle 1'),LUMBERJACK)

/* 3 · battle 2: ONE more drafted; lost; the map offers it again, no draft, the same party, wounds kept.
   Law 10, 2026-10-04 (kingdom.opening-draft-cadence; engine DECISIONS.md 2026-10-03 'one draft after every battle; …': "We're
   only supposed to have one draft between battles 1 and 2. I was getting two drafts." · asked "Should the cadence change
   to one draft after every battle (party of 1, 2, 3, 4, 5, 6) …?" — "One, yes."): this read
     const second=draft('battle 2, draft 1');const third=draft('battle 2, draft 2')
     const party2=[first,second,third].sort()
     assert.deepEqual(heroIds(),party2,'three heroes before battle 2')
     assert.equal(new Set(party2.map(id=>camp().roster[id].classes[0])).size,3,'three classes: none drafted twice')
     assert.equal(whoGoes('battle 2').asked,false,'three heroes: no choice is asked')
   — the 2026-08-23 cadence the ruling replaces (two drafts after battle 1). The rule now: one draft, a party of two at
   the Lumberjack House, of two classes; and once it is taken the battle is fielded — no second draft is on the screen. */
v.click('field',LUMBERJACK)
const second=draft('battle 2')
assert.equal(camp().cursor.step,'prep','one draft between battles 1 and 2: once it is taken the battle is fielded, no second draft')
const party2=[first,second].sort()
assert.deepEqual(heroIds(),party2,'two heroes before battle 2')
assert.equal(new Set(party2.map(id=>camp().roster[id].classes[0])).size,2,'two classes: none drafted twice')
assert.equal(whoGoes('battle 2').asked,false,'two heroes: no choice is asked')
const first2=equipThenFight(party2,'battle 2')
/* kingdom.opening-replay-rules (engine DECISIONS.md 2026-10-03 '… a lost battle pays no XP; a replay rolls new dice'): the
   lost battle leaves every hero's XP where it was, and goes straight back to the map */
const xpBefore2=Object.fromEntries(party2.map(id=>[id,camp().roster[id].xp]))
const lost2=fightOut(false,'battle 2 lost')
assert.deepEqual(Object.fromEntries(party2.map(id=>[id,camp().roster[id].xp])),xpBefore2,'battle 2 lost: no XP to anyone')
assert.equal(camp().cursor.step,'open','battle 2 lost: nothing to level — back to the map')
if(camp().cursor.step==='levelUp')levelUps('battle 2 lost')
assert.equal(camp().ended,null,'a lost opening battle does not end the Campaign')
assert.equal(readMap([ORPHANAGE],'after losing battle 2'),LUMBERJACK,'the lost battle is offered again')
const wounds=Object.fromEntries(party2.map(id=>[id,camp().roster[id].wound]))
/* Law 10, 2026-10-04 (kingdom.page-test-strong-party; engine DECISIONS.md 2026-10-04 "Go ahead, overpowered power party."):
   this read
     assert.ok(Object.values(wounds).some(n=>n>0),'the loss left wounds')
   — true of a loss found on a seed, in which the party was beaten down. A lost battle is now settled deliberately (the
   party held idle, the battle cut at Turn 1) and takes nobody down, so there is no wound to find; that a battle can wound
   is the Reckoning's rule and its tests' (test/isc-034, test/encounter-result-fold). The rule the old line stood on is
   held exactly — a hero is wounded by a battle only when it took him down — and the replay's assertions below stand as
   they were: each hero carries the wound it has into the replay and is fielded Wounded or whole by it. */
for(const u of lost2.result.units.filter(u=>u.side==='hero'&&u.role===undefined)){
 const id=lost2.e.deployed[u.index]
 assert.equal(camp().roster[id].lifeState,'alive',`${id} lives through the lost battle`)
 assert.equal(camp().roster[id].wound,u.downed||u.stood?1:0,`${id} is wounded only if the battle took it down`)
}
v.click('field',LUMBERJACK)
assert.equal(camp().cursor.step,'prep','no draft is owed for the replay')
assert.equal(whoGoes('battle 2 again').asked,false,'the replay: no choice is asked')
const replay=equipThenFight(party2,'battle 2 again')
/* … and the replay is fielded on new dice: another seed than the first attempt's (the battle's own number) */
assert.equal(first2.config.seed,2,'battle 2\'s first attempt: its own number');assert.notEqual(replay.config.seed,2,'the replay is on new dice');assert.equal(camp().cursor.replays,1)
for(const id of party2){
 assert.equal(replay.config.heroRows.find(h=>h.id===id).wound,wounds[id],`${id} carries its wound into the replay`)
 const unit=replay.ctx.state.units.find(u=>u.side==='hero'&&u.typeId===camp().roster[id].unitType)
 assert.equal(unit.badges.includes('badge.wounded'),wounds[id]>=1,`${id} is fielded ${wounds[id]?'Wounded':'whole'}`)
}
const b2=fightOut(true,'battle 2 won')
/* Law 10, 2026-10-04 (kingdom.opening-draft-cadence): the block below was unconditional —
     assert.equal(camp().cursor.step,'rewards','battle 2 won offers its reward') … assert.ok(camp().roster[givers[0]].equipped.includes(SWORD), …)
   — held of a party of THREE, which this driver's drafts (a Warrior or a Paladin first when offered) always gave a taker
   on the seeds run. A party of two has had two drafts; on a run seed where neither offer held a Warrior or a Paladin the
   rule is its other half (kingdom SWITCHES openingItemTakers: "with none, nothing is offered and nobody carries it") —
   held below, word for word. With a taker every line stands as it was. (That the sword then WAITS for its taker is
   kingdom.opening-sword-waits, not yet built.) */
const may=party2.filter(id=>camp().roster[id].classes.some(c=>TAKERS.includes(c)))
let givers=[]
if(may.length){
 assert.equal(camp().cursor.step,'rewards','battle 2 won offers its reward')
 assert.deepEqual(camp().cursor.rewardOffer,[SWORD],'the Flaming Longsword')
 /* kingdom.opening-reward-card-art (2026-10-03: "Card art not showing in the reward screen for the flinging sword."): the
    Flaming Longsword's reward card — the one card of this rewards screen — showed its card art (opening-page.mjs
    showsItemArt, held as the rewards screen was drawn) */
 assert.ok(ITEMS_ART[SWORD],'the Flaming Longsword has card art');assert.equal(ITEM_ART_SEEN.sword,true,'the Flaming Longsword\'s reward card showed its card art');assert.equal(ITEM_ART_SEEN.rewardArt,1)
 takeReward(0,'battle 2')
 /* kingdom.opening-hero-card-art (2026-10-03): each hero who may carry it is shown with its own card art (opening-page.mjs
    carriers); the heroes offered are read as before */
 givers=carriers('battle 2').sort()
 assert.deepEqual(givers,may,'only a Warrior or a Paladin is offered it')
 v.click('give',givers[0]);wait(100)
 assert.ok(camp().roster[givers[0]].equipped.includes(SWORD),'the Flaming Longsword is in a Warrior\'s or Paladin\'s hands')
}else{
 assert.notEqual(camp().cursor.step,'rewards','no Warrior or Paladin in the party of two: the Flaming Longsword is not offered')
 /* Law 10, 2026-10-04 (kingdom.opening-sword-waits; engine DECISIONS.md 2026-10-03 'the opening run: the Flaming Longsword
    waits for its taker; …' — "One, yes."): this read
      assert.ok(!Object.values(camp().roster).some(h=>h.equipped.includes(SWORD))&&!camp().stash.includes(SWORD),'and nobody carries it')
    — "with none, nothing is offered and nobody carries it" (openingItemTakers), which the ruling settles: nobody carries
    it YET — it is kept in the stash, and waits. */
 assert.ok(!Object.values(camp().roster).some(h=>h.equipped.includes(SWORD)),'nobody carries it yet')
 assert.deepEqual(camp().stash,[SWORD],'the Flaming Longsword is kept in the stash, waiting')
}
levelUps('battle 2')
const saved2=b2.result.units.filter(u=>u.side==='hero'&&u.role==='encounter'&&u.lifeState!=='dead').map(u=>u.typeId)
assert.deepEqual(civilianIds(),[...saved1,...saved2].sort(),'the Lumberjack House\'s civilians who lived join too')
assert.equal(readMap([ORPHANAGE,LUMBERJACK],'after battle 2'),BRIDGE)

/* 4 · battle 3: one more drafted; won; three items, one kept.
   Law 10, 2026-10-04 (kingdom.opening-draft-cadence, as above): this read
     const fourth=draft('battle 3') … assert.deepEqual(heroIds(),party3,'four heroes before battle 3') … 'four heroes: no choice is asked'
   — the party is one smaller under the cadence ruled: three heroes at the Bridge. */
v.click('field',BRIDGE)
const third=draft('battle 3')
/* kingdom.opening-sword-waits: with the sword waiting, the draft that brings a Warrior or a Paladin is followed by the
   offer to take it — the carrier named — before the battle is fielded; with nothing waiting (or no taker yet) the battle
   is fielded at once, as before */
const waited=waitingOffer('battle 3')
if(waited){
 assert.ok(!may.length&&camp().roster[third].classes.some(c=>TAKERS.includes(c)),'the sword waited, and this draft brought its taker')
 v.click('give',waited.offered[0]);wait(100)
 assert.ok(camp().roster[waited.offered[0]].equipped.includes(SWORD),'the Flaming Longsword is carried by the hero named')
 givers=[waited.offered[0]]
}else assert.ok(may.length>0||!camp().roster[third].classes.some(c=>TAKERS.includes(c)),'no waiting offer: the sword is carried already, or no taker has come yet')
assert.equal(camp().cursor.step,'prep','one draft between battles 2 and 3')
const party3=[...party2,third].sort()
assert.deepEqual(heroIds(),party3,'three heroes before battle 3')
assert.equal(new Set(party3.map(id=>camp().roster[id].classes[0])).size,3,'three classes: none drafted twice')
assert.equal(whoGoes('battle 3').asked,false,'three heroes: no choice is asked')
equipThenFight(party3,'battle 3')
fightOut(true,'battle 3')
assert.equal(camp().cursor.step,'rewards','the Bridge offers its reward')
const offer=[...camp().cursor.rewardOffer];assert.equal(offer.length,3,'three items offered');assert.equal(new Set(offer).size,3)
const kept=takeReward(1,'battle 3')
assert.equal(byId('campaign').querySelectorAll('[data-act=give]').length,0,'a drawn item goes to the stash, named to nobody')
/* (kingdom.opening-sword-waits: a sword still waiting for its taker lies in the stash beside it) */
assert.deepEqual(camp().stash.filter(x=>x!==SWORD),[kept],'one kept; the two left are burned')
levelUps('battle 3')
assert.equal(readMap([ORPHANAGE,LUMBERJACK,BRIDGE],'after battle 3'),CAVERN,'three sections taken')
/* kingdom.opening-recap-civilians (2026-10-03: "If they were wounded, if they died, they're in there too." — the
   civilians): each of the three victory screens showed a card for every player-side unit of its battle, the civilians set
   apart and marked unhurt, wounded or dead as the battle left them (opening-page.mjs fightOut, held at each screen). Here:
   the Orphanage's showed the Orphan Child and the School Teacher, the Lumberjack House's the Lumberjack and his Wife,
   and those who lived are the civilians on the roster (the rescue's own assertions, above) */
assert.deepEqual(CIVILIANS_SEEN.map(x=>x.encounterId),[ORPHANAGE,LUMBERJACK,BRIDGE],'three victory screens')
const shownAt=id=>CIVILIANS_SEEN.find(x=>x.encounterId===id).civilians,saidOf=list=>list.map(x=>`${x.name} ${x.fate}${x.joins?', joins':''}`).join(', ')||'none'
assert.deepEqual(shownAt(ORPHANAGE).map(x=>x.name).sort(),['Orphan Child','School Teacher']);assert.deepEqual(shownAt(LUMBERJACK).map(x=>x.name).sort(),['Lumberjack','Lumberjack\'s Wife'])
assert.deepEqual([...shownAt(ORPHANAGE),...shownAt(LUMBERJACK)].filter(x=>x.joins).map(x=>x.typeId).sort(),civilianIds(),'the civilians marked as joining are the civilians on the roster')
assert.deepEqual(camp().unavailable,[],'nobody fatigued');assert.deepEqual(camp().foughtThisWeek,[],'nobody marked fought')
assert.equal(camp().ended,null)
for(const x of SPECIALTY_CHOICES){assert.equal(x.offered.length,3,x.label+': three offered');assert.ok(x.offered.includes(x.took),x.label+': one of the three is taken')}
/* kingdom.opening-reward-card-art: the Bridge's three reward cards each showed their item's card art or the plain card of
   an item named in itemsMissing (held card by card, opening-page.mjs), and Equip's items the same before every battle */
assert.equal(ITEM_ART_SEEN.rewardArt+ITEM_ART_SEEN.rewardPlain,(may.length?1:0)+3,'every reward card of the sitting was held to its art, or to itemsMissing')
assert.ok(ITEM_ART_SEEN.equipArt+ITEM_ART_SEEN.equipPlain>0,'Equip\'s items were held too')
/* kingdom.opening-first-hero-class-line (2026-10-04: "a line that describes the class" · the hero's changes in plain words —
   "3 correct."): each of the three drafts' three cards showed the class line of its own class, the content's row; and
   the first draft's three cards said what the hero joins with in plain words — one line per badge, the Health as
   "Tougher than most", each rolled point — with no stat table (each asserted card by card, opening-page.mjs draft) */
assert.equal(LINES_SEEN.classLine,9,'nine draft cards, each held to its class line');assert.equal(LINES_SEEN.joins,3,'the first draft\'s three cards, each held to its plain lines')
assert.ok(LINES_SEEN.badgeLines>=6,'at least two badges on each of the three: Leadership and a positive one')
/* kingdom.opening-draft-class-message (2026-10-04: "The second time you are drafting a hero, there should be a message …"): of
   the sitting's three drafts the SECOND said the content's sentence in gold above its offers, and the first and the
   third said nothing (each asserted at its draft, opening-page.mjs draft) */
assert.deepEqual(DRAFT_NOTICES.map(x=>x.nth),[1,2,3],'three drafts, each held')
assert.deepEqual(DRAFT_NOTICES.map(x=>x.text),[null,DRAFT_MESSAGES.find(m=>m.draft===2).text,null],'the second draft says the sentence; the first and the third do not')
assert.equal(DRAFT_NOTICES[1].text,'Until you get additional upgrades you may only deploy one hero of each class.','his words, exactly')
console.error('settled by: '+JSON.stringify(chosen))
console.log(`opening loop three: the first draft, then straight into the Orphanage (no map and no Equip before battle 1); then map -> draft (one before every battle: a party of ${[1,party2.length,party3.length].join(', ')}; no class twice) -> equip -> battle -> reckoning, rewards, level-ups -> map, three times; the victory screens showed the civilians who fought (the Orphanage: ${saidOf(shownAt(ORPHANAGE))}; the Lumberjack House: ${saidOf(shownAt(LUMBERJACK))}); the Orphanage's 20 XP and level 2 with a specialty; three specialties offered at every specialty choice (${SPECIALTY_CHOICES.length} choices); battle 2 lost: no XP, offered again on new dice (seed ${first2.config.seed}, then ${replay.config.seed}) with the same party, wounds kept; the Flaming Longsword ${givers.length?'to '+givers[0]:'to nobody (no Warrior or Paladin in the party of two)'};${ITEM_ART_SEEN.sword?' the Flaming Longsword\'s reward card showed its card art;':''} item card art on ${ITEM_ART_SEEN.rewardArt} of ${ITEM_ART_SEEN.rewardArt+ITEM_ART_SEEN.rewardPlain} reward cards and ${ITEM_ART_SEEN.equipArt} of ${ITEM_ART_SEEN.equipArt+ITEM_ART_SEEN.equipPlain} Equip items, the rest plain and named in itemsMissing; the Bridge's three, ${kept} kept; civilians rescued ${civilianIds().join(', ')||'none'}; three sections taken; every draft card showed the class line of its own class (${LINES_SEEN.classLine} cards); the first draft's three cards said what the hero joins with in plain words (one line per badge, the Health as "Tougher than most", no stat table); the second draft said "${DRAFT_NOTICES[1].text}" in gold above its offers — the content's row — and the first and third drafts did not passed`)
