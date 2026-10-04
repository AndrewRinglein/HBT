// kingdom.opening-run-six (engine DECISIONS.md 2026-10-01 'one continuous run through the first six battles, saved, never
// the kingdom map'). Expect: "From http://127.0.0.1:4230/play Andrew starts a run, picks the first hero, drafts, equips and
// plays the Orphanage through the Cathedral without the kingdom map; closing the page after battle 3 and reopening it
// continues at battle 4 with the same party, items, XP and levels; losing a battle offers it again with the same party."
//
// The BUILT sandbox, opened as the launcher's Start a new run opens it (?map&new — here with a named seed), in one browser
// (one storage): the map -> the drafts -> Equip -> the battle -> the reckoning, rewards and level-ups -> the map, for the
// Orphanage, the Lumberjack House (lost first, and offered again with the same party, wounds kept) and the Bridge. Then the
// page is closed and opened again in the same browser as the launcher's Continue opens it (?map): the map stands at the
// Cavern Trail, the Campaign is the one left — the same party, items, XP and levels. Battle 4 is fielded and the page
// closed on it: reopened, it stands on that battle, from its start; then won; the Gates and the Cathedral are won; the map ends with every section taken and says the run is complete — and the Campaign never left the opening (no
// Week begun, no kingdom map). A reward kept is equipped at Equip before the next battle and fielded on its hero.
//
// Battles are settled as tools/opening-page.mjs settles them: the engine plays each out on a seed and the save is pasted
// into the page. Where the engine's AI cannot win a battle for the party, the party's side is played by the page driver's
// 'hold' (strike from where it stands) or 'press' (and step toward the nearest enemy) — a win with the fewest of the party
// dead is taken.
//
//   node tools/opening-run-six.verify.mjs [BATTLE-SANDBOX.html]
import assert from 'node:assert/strict'
import {openingPage,TAKERS,POOL,LEFT_OUT,HERO_CLASSES,FIRST_HERO,POSITIVE_BADGES} from './opening-page.mjs'
const page=process.argv[2]??'BATTLE-SANDBOX.html'
const ORDER=['orphanage','lumberjack','bridge','cavern-trail','gates','cathedral'].map(x=>'encounter.opening.'+x)
const [ORPHANAGE,LUMBERJACK,BRIDGE,CAVERN,GATES,CATHEDRAL]=ORDER
const SWORD='item.longsword.flaming',RUN_KEY='hbt-opening-run'
/* a loss is sought with nobody dead first (the party is then fielded again whole); a loss that costs lives keeps the living */
const SEARCH={hows:(process.env.RUN_SIX_HOWS??'ai,hold,press').split(','),how:{partyAlive:false,fewestDead:true,seeds:Number(process.env.RUN_SIX_SEEDS??200)}}
/* the seeds that settled each battle when this was last run (printed at the end), tried before the search */
const KNOWN={'encounter.opening.orphanage':[['ai',1]],'encounter.opening.lumberjack:lost':[['idle',5]],'encounter.opening.lumberjack':[['ai',2]],'encounter.opening.bridge':[['hold',61]],
 'encounter.opening.cavern-trail':[['ai',13]],'encounter.opening.gates':[['hold',53]],'encounter.opening.cathedral':[['hold',4]]}
/* Law 10, 2026-10-03 (kingdom.opening-draft-modifiers; engine DECISIONS.md 2026-10-03 'the opening run, audited' and 2026-09-28
   'the first hero: Leadership …; the draft offers three with the Crucible's modifiers'): the known battle seeds, all but the
   first two, are new (they were lumberjack ai 12, bridge hold 188, cavern-trail ai 289, gates hold 4, cathedral hold 15); the
   run's seed stays 11. Every hero now joins with what the draft rolled it, so the party's numbers are other numbers and the
   old seeds are other battles (the Bridge's hold 188 no longer wins). And the party is another party: the driver now picks
   a later draft as a player does — the best of the three by the engine's weighted score of what each rolled (opening-page.mjs)
   — so seed 11 drafts the Dwarven Brawler (first: Leadership, Huge, +2 Health), The Serpent, the Rune-Marked Ascetic, the
   Forest Elf, the Dawnblade and the Crimson Sorceress. Of run seeds 1 to 24 searched (150 seeds of ai, hold and press a
   battle; 13, 14, 16-18 and 22-24 were stopped unfinished), seed 11 is again the one found that wins all six: the Bridge on
   hold 61 costs The Serpent; nobody else dies. Thirteen of the others stop at the Bridge, two at this test's own 'the loss
   left wounds'. What this page test holds — one run through the six battles, saved and reopened, a loss offered again, the
   draft's three of 24 — is unchanged, and it now also holds the draft's modifiers (kingdom SWITCHES.md openingDraftPageRun). */
/* Law 10, 2026-10-03 (kingdom.opening-draft-pool; engine DECISIONS.md 2026-10-03 'the opening draft pool is all 24 heroes,
   Rogues and Mages included'): the run's seed 15 -> 11, and every known battle seed with it (they were orphanage ai 1,
   lumberjack lost idle 6, lumberjack ai 12, bridge hold 2, cavern-trail hold 848, gates hold 223, cathedral press 1). The
   pool is the 24 base heroes now, so seed 15 drafts another party (Lion of the Host, The Raven, Iron Dwarf, …), which loses
   The Raven and the Iron Dwarf at the Lumberjack House and wins the Bridge on no seed from 1 to 200 of ai, hold or press.
   Of run seeds 1 to 12, seed 11 is the one found whose party — the Dwarven Brawler, The Serpent, the Battle Chaplain, the
   Forest Fey, the Dawnblade, the Archive Scholar — wins all six (searching 300 seeds of ai, hold and press a battle, the
   fewest of the party dead): the Bridge on hold 188 costs the Battle Chaplain; nobody else dies. What this page test holds
   — one run through the six battles, saved and reopened, a loss offered again — is unchanged, and it now also holds the
   draft: three at every draft, no class twice, six heroes of six classes, four deployed. That most parties of the 24 cannot
   win the Bridge under the engine's AI or these drivers is the opening's balance, reported to Andrew (kingdom SWITCHES.md
   openingPoolPageRun).
   RUN_SIX_SEED: another run seed (another party) — its battles are searched, the known seeds are this file's run's only */
const RUN_SEED=Number(process.env.RUN_SIX_SEED??11),FOUND=process.env.RUN_SIX_SEED===undefined?KNOWN:{}
const chosen={}
const browser=new Map()
/* kingdom.opening-draft-modifiers: … and the badges, the item slots and the modifiers each hero was drafted with */
const rowsOf=c=>Object.fromEntries(Object.values(c.roster).map(h=>[h.id,{level:h.level,xp:h.xp,wound:h.wound,lifeState:h.lifeState,equipped:[...h.equipped],specialty:h.specialty??null,badges:[...h.badges],itemSlots:h.itemSlots,drafted:structuredClone(h.drafted??null)}]))
/* the draft as the page shows it: each offer's id, its words and what it carries (its stats, rolled points and badges) */
const draftShown=()=>P.byId('campaign').querySelectorAll('[data-act=draft]').map(o=>({id:o.dataset.id,text:o.textContent,stats:o.dataset.stats,rolls:o.dataset.rolls,badges:o.dataset.badges}))

/* Law 10, 2026-10-02 (merge of kingdom.reads-engine with kingdom.opening-run-six; review finding K7): the run's seed 11 -> 15,
   and the Cavern Trail's known seed press 9 -> hold 848. A kill pays its victim's tier's XP (2 / 5 / 15 — engine DECISIONS.md
   2026-09-28 'Let's do 2,515 XP by tier') instead of 3, so seed 11's party reaches the Bridge a level short (the Rune-Marked
   Ascetic at 18 XP) and no seed from 1 to 200 of ai, hold or press wins it. On seed 15 the known seeds still settle battles 1 to
   3, the Gates (hold 223) and the Cathedral (press 1); the Cavern Trail's press 9 no longer wins, and hold 848 is the first
   seed found (searching 1 to 1600 of ai, hold, press) after which the Gates' known seed still wins. The Bridge's hold 2 costs
   the Dawnblade and the Gates the Rune-Marked Ascetic: what this page test holds — one run through the six battles, saved and
   reopened — is unchanged; the opening's balance under the ruled XP is fix.opening-levels' question (reported to Andrew). */
let P=openingPage(page,'?map&new&seed='+RUN_SEED,browser)
const camp=()=>P.camp()
const alive=()=>P.heroIds().filter(id=>camp().roster[id].lifeState==='alive')

/* the drafts owed before this battle (the cadence: 1 · +2 · +1 each, to six); every offer of the run is kept in OFFERS.
   kingdom.opening-draft-pool (2026-10-03): was "until the pool runs short" — the pool is the 24 base heroes now */
const OFFERS=[]
function drafts(label){const got=[];while(camp().cursor.step==='draft'){got.push(P.draft(label+', draft '+(got.length+1)));OFFERS.push(P.lastOffer)}return got}
const DEPLOY_LIMIT=4

/* Equip: the stash's first item that fits a hero sent is put on that hero (the slot the page marks it can go in) */
function equipFromStash(label){
 const stash=[...camp().stash];if(!stash.length)return null
 for(const item of stash){
  P.v.click('pick',item)
  const slot=P.byId('campaign').querySelectorAll('[data-act=drop]').find(el=>el.classList.contains('can'))
  if(!slot){P.v.click('pick',item);continue}
  const hero=slot.dataset.id;slot.handlers.click()
  assert.ok(camp().roster[hero].equipped.includes(item),`${label}: ${item} is on ${hero}`)
  assert.ok(!camp().stash.includes(item)||camp().stash.filter(x=>x===item).length<stash.filter(x=>x===item).length,`${label}: ${item} left the stash`)
  return {item,hero}
 }
 return null
}

/* a section fielded from the map: its drafts, Equip (a stash item put on), To the battle — the party sent is the living
   heroes, up to the deploy limit */
function field(id,n,label,reopenAtDraft=false){
 assert.equal(P.readMap(ORDER.slice(0,n-1),label+': the map'),id,label+': the next section')
 P.v.click('field',id)
 if(reopenAtDraft){
  /* kingdom.opening-draft-modifiers: the page closed on a draft and opened again in the same browser shows the same three
     heroes with the same modifiers — the rolls are the run's own, read back from its save */
  assert.equal(camp().cursor.step,'draft',label+': a draft is on the screen')
  const before=draftShown();assert.equal(before.length,3);assert.ok(before.every(o=>o.stats&&o.badges!==undefined),label+': the draft shows modifiers')
  P=openingPage(page,'?map',browser)
  assert.equal(camp().cursor.step,'draft',label+': reopened, the run stands at the same draft')
  assert.deepEqual(draftShown(),before,label+': reopened, the same heroes with the same modifiers')
 }
 const drafted=drafts(label)
 const deployed=[...camp().cursor.engagement.deployed].sort()
 console.error(`${label}: sent ${deployed.map(h=>{const r=camp().roster[h];return `${r.name} L${r.level}${r.wound?' wound '+r.wound:''}`}).join(', ')}; at home ${P.heroIds().filter(h=>!deployed.includes(h)).map(h=>camp().roster[h].name+' '+camp().roster[h].lifeState).join(', ')||'nobody'}`)
 assert.ok(deployed.length>0&&deployed.every(id=>alive().includes(id)),label+': living heroes are sent')
 /* kingdom.opening-draft-pool: four deploy — the deploy limit is unchanged, whoever of the party is alive */
 assert.equal(deployed.length,Math.min(DEPLOY_LIMIT,alive().length),label+': four deploy (or everyone alive, when fewer are)')
 const equipped=equipFromStash(label)
 const s=P.equipThenFight(deployed,label)
 if(equipped&&s.config.heroes.includes(equipped.hero))assert.ok(s.config.heroRows.find(h=>h.id===equipped.hero).equipped.includes(equipped.item),label+': the item equipped is fielded on its hero')
 return {drafted,deployed,equipped,s}
}
/* the battle on the board settled, then its reckoning, its reward kept (a named-class item to its first taker) and the
   level-ups, back to the map — the run still in the opening */
function settle(won,label){
 const id=camp().cursor.engagement.id
 const {result,played,seed}=won?P.fightOut(true,label,SEARCH.hows,{...SEARCH.how,first:FOUND[id]??[]}):P.fightOut(false,label,['idle','hold','ai'],{partyAlive:false,fewestDead:true,seeds:40,first:FOUND[id+':lost']??[]})
 chosen[won?id:id+':lost']=[played,seed]
 console.error(`settled ${label}: ${played} seed ${seed}`)
 let kept=null
 if(won&&camp().cursor.step==='rewards'){
  const offer=[...camp().cursor.rewardOffer]
  kept=P.takeReward(0,label)
  const givers=P.byId('campaign').querySelectorAll('[data-act=give]').map(b=>b.dataset.id)
  if(givers.length){P.v.click('give',givers[0]);P.wait(100)}
  assert.ok(offer.includes(kept),label+': a reward offered is kept')
 }
 if(camp().cursor.step==='levelUp'||camp().cursor.step==='rewards')P.levelUps(label)
 assert.equal(camp().cursor.step,'open',label+': back to the map')
 assert.equal(camp().week,0,label+': no Week begun — the run never reaches the kingdom');assert.equal(camp().ended,null,label+': the run goes on')
 return {result,kept}
}
function battle(id,n,label=`battle ${n}`){const f=field(id,n,label);return {...f,...settle(true,label)}}

/* 1 · a new run: nothing fielded, nobody drafted, the Orphanage next; the run is kept from the first screen */
assert.equal(P.readMap([],'a new run'),ORPHANAGE)
assert.equal(P.handle.session,null,'the map fields nothing by itself')
assert.deepEqual(P.heroIds(),[],'the run starts with nobody')
assert.ok(browser.has(RUN_KEY),'the run is kept in the browser')

/* 2 · battles 1 to 3 */
const b1=battle(ORPHANAGE,1)
assert.equal(b1.drafted.length,1,'one hero before battle 1')
const first=b1.drafted[0]
assert.equal(camp().roster[first].xp>=20&&camp().roster[first].level,2,'the Orphanage pays its 20 XP: the first hero is level 2')
/* battle 2 lost: the map offers it again, no draft, the same party (a loss with nobody dead is sought first), wounds kept;
   then won */
const b2=field(LUMBERJACK,2,'battle 2');settle(false,'battle 2 lost')
assert.equal(b2.drafted.length,2,'two more before battle 2')
const standing=b2.deployed.filter(id=>camp().roster[id].lifeState==='alive')
assert.equal(P.readMap(ORDER.slice(0,1),'after losing battle 2'),LUMBERJACK,'the lost battle is offered again')
P.v.click('field',LUMBERJACK)
assert.equal(camp().cursor.step,'prep','no draft is owed for the replay')
const replay=P.equipThenFight(standing,'battle 2 again')
assert.deepEqual([...replay.config.heroes].sort(),standing,'the same party')
for(const id of replay.config.heroes)assert.equal(replay.config.heroRows.find(h=>h.id===id).wound,camp().roster[id].wound,`${id} carries its wound into the replay`)
assert.ok(standing.some(id=>camp().roster[id].wound>0),'the loss left wounds')
settle(true,'battle 2 won')
assert.ok(Object.values(camp().roster).some(h=>h.equipped.includes(SWORD)&&h.classes.some(c=>TAKERS.includes(c))),'the Flaming Longsword is carried by a Warrior or a Paladin')
const b3=battle(BRIDGE,3)
assert.equal(b3.drafted.length,1,'one more before battle 3')
assert.ok(b3.kept,'the Bridge offers its reward')
assert.equal(P.readMap(ORDER.slice(0,3),'after battle 3'),CAVERN)

/* 3 · the page closed and opened again in the same browser, as the launcher's Continue opens it */
const left=P.camp(),kept=rowsOf(left),stash=[...left.stash]
P=openingPage(page,'?map',browser)
assert.equal(P.readMap(ORDER.slice(0,3),'reopened'),CAVERN,'reopened, the run stands at battle 4')
assert.deepEqual(rowsOf(camp()),kept,'the same party, items, XP and levels')
assert.deepEqual(camp().stash,stash,'the same stash')
assert.equal(camp().cursor.prologue,4,'the Campaign stands at battle 4')
assert.match(P.byId('runNote').textContent,/saved after every step/,'the map says the run is saved')

/* 4 · battle 4: fielded, then the page closed on the battle and opened again — a run left mid-battle reopens on that
   battle, from its start; then won */
const b4=field(CAVERN,4,'battle 4',true)
assert.equal(b4.drafted.length,1,'one more before battle 4')
P=openingPage(page,'?map',browser)
assert.equal(camp().cursor.step,'battle','a run left mid-battle reopens on that battle')
P.onTheBattle('battle 4, reopened mid-battle')
settle(true,'battle 4')

/* 5 · the Gates and the Cathedral */
const b5=battle(GATES,5)
assert.equal(b5.drafted.length,1,'one more before battle 5: the sixth hero')
const b6=battle(CATHEDRAL,6)
assert.equal(b6.drafted.length,0,'six are drafted: no draft before battle 6')

/* 5b · kingdom.opening-draft-pool (engine DECISIONS.md 2026-10-03 'the opening draft pool is all 24 heroes, Rogues and Mages
   included'; 2026-09-28 'the draft never repeats a class until all six are drafted'): the pool is the 24 base heroes, four
   of each class; every one of the six drafts offered three, none of a class already drafted (each asserted at its draft,
   tools/opening-page.mjs), Rogues and Mages among them; the party is six heroes, one of each class; a base hero with no
   kit is named and never offered */
assert.equal(POOL.length+LEFT_OUT.length,24,'the pool is the 24 base heroes, less any with no kit')
for(const c of HERO_CLASSES)assert.equal(POOL.filter(h=>h.classes.includes(c)).length+LEFT_OUT.filter(h=>h.id.startsWith('hero.base.'+c.replace('class.','')+'-')).length,4,'four of '+c)
assert.equal(OFFERS.length,6,'six drafts in the run')
for(const o of OFFERS){assert.equal(o.ids.length,3,o.label+': three offered');assert.ok(!o.ids.some(id=>LEFT_OUT.some(h=>h.id===id)),o.label+': nobody without a kit is offered')}
const offeredClasses=new Set(OFFERS.flatMap(o=>o.classes))
assert.ok(offeredClasses.has('class.rogue')&&offeredClasses.has('class.mage'),'Rogues and Mages are offered')
assert.deepEqual([...offeredClasses].sort(),HERO_CLASSES,'every one of the six classes is offered over the run')
assert.equal(P.heroIds().length,6,'the party is six heroes')
assert.deepEqual(P.heroIds().map(id=>camp().roster[id].classes.find(c=>HERO_CLASSES.includes(c))).sort(),HERO_CLASSES,'one of each class')
assert.deepEqual(OFFERS.map(o=>o.took).sort(),P.heroIds(),'the six drafted are the party')

/* 5c · kingdom.opening-draft-modifiers (engine DECISIONS.md 2026-10-03 'the opening run, audited': "the first hero is chosen
   from 3, but no stats or badges shown, just a description"; 2026-09-28 'no Health minimum … the first hero gets Leadership
   and a random positive badge' and 'the first hero: Leadership …; the draft offers three with the Crucible's modifiers'):
   the first draft was by description only and its hero got the ruled bonuses; each later draft showed three heroes with
   their stats, and those stats differed from their rows by their rolled modifiers (each asserted at its draft,
   tools/opening-page.mjs); every battle fielded each hero with what it was drafted with (asserted at each battle); and at
   the end of the run each hero still holds exactly what it was drafted with */
assert.deepEqual(OFFERS.map(o=>o.first),[true,false,false,false,false,false],'only the first draft is the first hero\'s')
assert.equal(first,OFFERS[0].took);assert.deepEqual(Object.keys(OFFERS[0].shown),[],'the first draft showed no stats')
for(const o of OFFERS.slice(1)){
 assert.deepEqual(Object.keys(o.shown).sort(),[...o.ids].sort(),o.label+': all three were shown with their stats')
 assert.ok(o.ids.some(id=>o.shown[id].moved),o.label+': the modifiers move the stats shown away from the rows')
 assert.ok(!o.drafted.badges.includes(FIRST_HERO.badges[0]),o.label+': Leadership is the first hero\'s alone')
}
for(const o of OFFERS)assert.deepEqual(camp().roster[o.took].drafted,o.drafted,`${o.took} holds what it was drafted with to the end of the run`)
const led=camp().roster[first]
assert.equal(led.drafted.badges[0],FIRST_HERO.badges[0],'the first hero has the Leadership badge')
assert.ok(led.drafted.badges.slice(1).some(b=>POSITIVE_BADGES.includes(b)),'and a positive badge beside it')
assert.ok(led.drafted.mods.some(m=>m.stat==='maxHp'&&m.add===FIRST_HERO.health&&m.source===FIRST_HERO.healthSource),'and +2 Health')

/* 6 · the end: every section taken, the run complete — and never the kingdom map */
assert.equal(P.readMap(ORDER,'the end'),null,'every section is taken')
assert.match(P.byId('runNote').textContent,/the opening run is complete/,'the map says the run is complete')
assert.equal(camp().cursor.prologue,7,'six battles won');assert.equal(camp().week,0,'no Week begun');assert.equal(camp().cursor.step,'open')
P=openingPage(page,'?map',browser)
assert.equal(P.readMap(ORDER,'the end, reopened'),null,'reopened, the run is still complete')
const party=P.heroIds()
console.error('settled by: '+JSON.stringify(chosen))
console.error('offers: '+OFFERS.map(o=>`${o.label}: ${o.ids.map(id=>POOL.find(h=>h.id===id).name).join(' / ')} -> ${POOL.find(h=>h.id===o.took).name}`).join('; '))
console.error('drafted with: '+OFFERS.map(o=>`${POOL.find(h=>h.id===o.took).name}: ${[...o.drafted.badges.map(b=>b.replace('badge.','')),...o.drafted.mods.map(m=>(m.add>0?'+':'')+m.add+' '+m.stat),...o.drafted.unfielded.map(r=>(r.amount>0?'+':'')+r.amount+' '+r.stat+(r.stat==='itemSlots'?' (on the hero, its item slots)':' (not fielded)'))].join(', ')}`).join('; '))
console.log(`opening run six: six battles from the map, never the kingdom map (Week ${camp().week}); six drafts of three, no class twice, Rogues and Mages offered; the first hero chosen by description only and given Leadership, a positive badge and +2 Health; every later draft shown with its rolled modifiers, kept in every battle and to the end of the run, the same after the page is closed and reopened; the party six, one of each class (${party.map(id=>camp().roster[id].classes.find(c=>HERO_CLASSES.includes(c)).replace('class.','')).join(', ')}); four deploy; base heroes left out for no kit: ${LEFT_OUT.map(h=>h.name).join(', ')||'none'}; party ${party.map(id=>`${camp().roster[id].name} L${camp().roster[id].level}${camp().roster[id].lifeState==='alive'?'':' ('+camp().roster[id].lifeState+')'}`).join(', ')}; closed after battle 3 and reopened at battle 4 with the same party, items, XP and levels; battle 2 lost and offered again with the same party; a run left mid-battle (battle 4) reopens on that battle; the Bridge's ${b3.kept} kept passed`)
