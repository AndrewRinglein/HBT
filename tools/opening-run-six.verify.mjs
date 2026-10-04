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
// closed on it: reopened, it stands on that battle, from its start; then won. From the Gates five heroes are free to fight,
// so the run asks who goes (kingdom.opening-deploy-choice): four are chosen on the Deploy page — the page closed on it and
// opened again with the same heroes sent — and they are the four on Equip and on the board, while whoever stays home is
// unharmed and earns nothing; the Cathedral is lost first by one hero sent alone, offered again, and the replay asks who
// goes again. The Gates and the Cathedral are won; the map ends with every section taken and says the run is complete — and the Campaign never left the opening (no
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
 'encounter.opening.cavern-trail':[['ai',13]],'encounter.opening.gates':[['hold',74]],'encounter.opening.cathedral:lost':[['idle',1]],'encounter.opening.cathedral':[['press',15]]}
/* Law 10, 2026-10-03 (kingdom.opening-deploy-choice; engine DECISIONS.md 2026-10-03 'the opening run, audited', question 3:
   "Should the player choose which four heroes go into each battle?" — "3 yes"): the known seeds of the Gates and the
   Cathedral are new (they were gates hold 53 and cathedral hold 4), and the Cathedral has a known lost seed; the run's seed
   stays 11 and battles 1 to 4 are untouched (four or fewer are free to fight there, so nothing is asked and the same heroes
   go). From battle 5 the run holds five heroes free to fight and now ASKS who goes, so the party sent is the driver's
   choice and no longer the first four by id (the Crimson Sorceress, the Dawnblade, the Rune-Marked Ascetic and the Forest
   Elf, with the Dwarven Brawler — the Flaming Longsword's carrier — always left home). Who stays home was searched (each
   four of the five, 80 seeds of ai, hold and press): at the Gates two fours win with nobody dead — the old four on hold
   53, and the Sorceress, the Dawnblade, the Forest Elf and the Brawler on hold 74 (the Ascetic home), which is taken; the
   two fours without the Sorceress or without the Forest Elf win on no seed, and without the Dawnblade the win costs two.
   At the Cathedral (two of its five fours were searched) the Sorceress, the Dawnblade, the Ascetic and the Brawler win on
   press 15 with nobody dead (the Forest Elf home); the first four by id win on hold 19 at the cost of one. The Cathedral is first LOST, to hold the replay's
   choice: by the Sorceress alone — the one hero with no wound, so she is only Wounded by it (idle 1) — and the win on press
   15 then costs her and the Ascetic; without that loss press 15 costs nobody. What this page test holds — one run through
   the six battles, saved and reopened, a loss offered again, the drafts and their modifiers — is unchanged, and it now also
   holds the choice of who goes (kingdom SWITCHES.md openingDeployPageRun). */
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

/* kingdom.opening-deploy-choice (engine DECISIONS.md 2026-10-03 'the opening run, audited', question 3: "Should the player
   choose which four heroes go into each battle?" — "3 yes"): who goes. With four or fewer free to fight the run asks
   nothing and all go (asserted in P.whoGoes). With five or more the Deploy page asks, and this driver chooses.
   WHO STAYS HOME is found by search, like the seeds, and written here (HOME) for this file's run: of the fives the run
   holds at the Gates and at the Cathedral, the four that win the battle with nobody dead — at the Gates the Rune-Marked
   Ascetic stays home, at the Cathedral the Forest Elf; the Dwarven Brawler, who carries the Flaming Longsword, goes both
   times (until 2026-10-03 the page left him home: he is the last by id). Another run seed (RUN_SIX_SEED) chooses by
   rule: the sword's carrier goes; then whoever stayed home the last time the run asked; then the most XP; a tie to the
   earlier id. Every time the run asks is kept in WENT.
   The choosing itself is played through the page, the heroes sent in id order: two are sent; (the first time) the page
   is closed on the Deploy page and opened again — the same step, the same two sent, the choice saved with the run; then a
   change of mind — a hero who is to stay home is sent, the party filled (and the one still wanted cannot be sent: the
   party is full), that hero brought home and the one wanted sent; then on to Equip. `pick` chooses otherwise (the
   battle to be lost). */
const WENT=[]
const HOME=process.env.RUN_SIX_SEED===undefined?{'battle 5':['hero.base.priest-scantily'],'battle 6 again':['hero.base.ranger-scantily']}:{}
function choose(free,label){
 const home=HOME[label]
 if(home){assert.ok(home.every(id=>free.includes(id)),label+': the heroes to stay home are free to fight');return free.filter(id=>!home.includes(id))}
 const c=camp(),lastHome=WENT.at(-1)?.home??[]
 const rank=id=>[c.roster[id].equipped.includes(SWORD)?0:1,lastHome.includes(id)?0:1,-c.roster[id].xp]
 const by=(a,b)=>{const x=rank(a),y=rank(b);for(let i=0;i<x.length;i++)if(x[i]!==y[i])return x[i]-y[i];return a<b?-1:a>b?1:0}
 return [...free].sort(by).slice(0,DEPLOY_LIMIT)
}
/* fewer than four may be sent: the heroes with no wound — a battle that is to be LOST is lost by them, so nobody already
   Wounded goes down again (sent as four, the Gates lost cost three of them — each already Wounded, each dead in the
   engine's result) and every hero is still free to fight when the battle is offered again */
const unwounded=free=>free.filter(id=>camp().roster[id].wound===0).slice(0,DEPLOY_LIMIT)
function whoGoes(label,pick=choose){
 const who=P.whoGoes(label)
 if(!who.asked)return {asked:false,free:who.free,sent:[...who.free].sort(),home:[]}
 assert.ok(who.free.length>DEPLOY_LIMIT,label+': more are free to fight than may go')
 assert.deepEqual(camp().cursor.engagement.deployed,[],label+': nobody is sent before the player chooses')
 P.deployStands(label)
 const want=pick(who.free,label).sort(),home=who.free.filter(id=>!want.includes(id))
 assert.ok(want.length>=1&&want.length<=DEPLOY_LIMIT,label+': one to four are chosen');assert.ok(home.length>=1,label+': somebody stays home')
 const [first,second,...rest]=want,last=rest.pop()
 P.send(first,label);if(second)P.send(second,label)
 if(!WENT.length){
  /* the choice is saved with the run: the page closed on the Deploy page and opened again in the same browser */
  const sent=[...camp().cursor.engagement.deployed]
  P=openingPage(page,'?map',browser)
  assert.deepEqual([camp().cursor.step,camp().cursor.prepStep],['prep','deploy'],label+': reopened, the run stands at who goes')
  assert.deepEqual(camp().cursor.engagement.deployed,sent,label+': reopened, the same heroes are sent')
  assert.equal(P.whoGoes(label+', reopened').asked,true);P.deployStands(label+', reopened')
 }
 /* a change of mind: a hero who is to stay home is sent, then brought home again */
 P.send(home[0],label);for(const id of rest)P.send(id,label)
 if(want.length===DEPLOY_LIMIT){
  assert.equal(camp().cursor.engagement.deployed.length,DEPLOY_LIMIT,label+': the party is full')
  assert.throws(()=>P.v.click('deploy',last),/Missing\/disabled/,label+': a fifth cannot be sent')
 }
 P.bringHome(home[0],label);if(last)P.send(last,label)
 const sent=P.toEquip(label)
 assert.deepEqual([...sent].sort(),[...want].sort(),label+': the heroes chosen are the heroes sent')
 const asked={asked:true,label,free:who.free,sent:[...sent].sort(),home}
 WENT.push(asked)
 console.error(`${label}: asked who goes — sent ${asked.sent.map(h=>camp().roster[h].name).join(', ')}; home ${home.map(h=>camp().roster[h].name).join(', ')}`)
 return asked
}

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
function field(id,n,label,reopenAtDraft=false,pick=choose){
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
 const who=whoGoes(label,pick)
 const deployed=[...camp().cursor.engagement.deployed].sort()
 /* Law 10, 2026-10-03 (kingdom.opening-deploy-choice): until now the party sent was whatever the page sent — the first
    four living heroes by id — and only its size was held. The rule now: the heroes sent are the heroes the player chose
    (or everyone free to fight when no choice was owed), held here and again on Equip and on the board. The size
    assertions below stand as they were. */
 assert.deepEqual(deployed,who.sent,label+': the heroes sent are the heroes chosen')
 console.error(`${label}: sent ${deployed.map(h=>{const r=camp().roster[h];return `${r.name} L${r.level}${r.wound?' wound '+r.wound:''}`}).join(', ')}; at home ${P.heroIds().filter(h=>!deployed.includes(h)).map(h=>camp().roster[h].name+' '+camp().roster[h].lifeState).join(', ')||'nobody'}`)
 assert.ok(deployed.length>0&&deployed.every(id=>alive().includes(id)),label+': living heroes are sent')
 /* kingdom.opening-draft-pool: four deploy — the deploy limit is unchanged, whoever of the party is alive */
 /* Law 10, 2026-10-03 (kingdom.opening-deploy-choice): this read
      assert.equal(deployed.length,Math.min(DEPLOY_LIMIT,alive().length),label+': four deploy (or everyone alive, when fewer are)')
    — the page sent as many as it could. Now the player chooses "up to the limit": when no choice is asked everyone free
    to fight goes (as before); when it is asked, never more than four go, and four go unless the driver chose fewer (the
    battle it means to lose) */
 if(!who.asked)assert.equal(deployed.length,Math.min(DEPLOY_LIMIT,alive().length),label+': four deploy (or everyone alive, when fewer are)')
 else assert.ok(deployed.length>=1&&deployed.length<=DEPLOY_LIMIT&&(pick!==choose||deployed.length===DEPLOY_LIMIT),label+': up to four deploy — four, unless fewer were chosen')
 const equipped=equipFromStash(label)
 /* who stays home, as they stand when the battle begins: every living hero not sent */
 const home=Object.fromEntries(alive().filter(id=>!deployed.includes(id)).map(id=>[id,structuredClone(camp().roster[id])]))
 const xpBefore=Object.fromEntries(deployed.map(id=>[id,camp().roster[id].xp]))
 const s=P.equipThenFight(deployed,label)
 if(equipped&&s.config.heroes.includes(equipped.hero))assert.ok(s.config.heroRows.find(h=>h.id===equipped.hero).equipped.includes(equipped.item),label+': the item equipped is fielded on its hero')
 return {drafted,deployed,equipped,s,who,home,xpBefore}
}
/* kingdom.opening-deploy-choice: after the battle is written and its rewards and level-ups are taken, a hero who stayed
   home is the row it was — unharmed, no XP, no level, nothing moved; `paid`: and somebody who went was paid XP */
function stayedHome(f,label,paid){
 for(const [id,before] of Object.entries(f.home))assert.deepEqual(camp().roster[id],before,`${label}: ${id} stayed home — unharmed, and earned nothing`)
 if(paid)assert.ok(f.deployed.some(id=>camp().roster[id].xp>f.xpBefore[id]),label+': the heroes who went were paid XP')
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
function battle(id,n,label=`battle ${n}`){const f=field(id,n,label),done=settle(true,label);stayedHome(f,label,true);return {...f,...done}}

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
assert.equal(whoGoes('battle 2 again').asked,false,'three free to fight: no choice is asked for the replay')
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

/* 5 · the Gates and the Cathedral — kingdom.opening-deploy-choice: with the sixth hero drafted, five are free to fight (the
   Bridge cost one), so from here the run asks who goes. The Gates: four chosen, won. The Cathedral is lost first, by the
   one hero with no wound sent alone (fewer than four may be sent): the map offers it again, and the replay asks who goes
   AGAIN, with nobody sent — and another party goes, four this time. Then won. */
const b5=battle(GATES,5)
assert.equal(b5.drafted.length,1,'one more before battle 5: the sixth hero')
assert.equal(b5.who.asked,true,'five free to fight before battle 5: the run asks which four go')
const b6=field(CATHEDRAL,6,'battle 6',false,unwounded)
assert.equal(b6.drafted.length,0,'six are drafted: no draft before battle 6')
assert.equal(b6.who.asked,true,'five free to fight before battle 6: the run asks which four go')
settle(false,'battle 6 lost');stayedHome(b6,'battle 6 lost',false)
assert.equal(P.readMap(ORDER.slice(0,5),'after losing battle 6'),CATHEDRAL,'the lost battle is offered again')
P.v.click('field',CATHEDRAL)
assert.equal(camp().cursor.step,'prep','no draft is owed for the replay')
const again=whoGoes('battle 6 again')
assert.equal(again.asked,true,'the replayed battle asks who goes again')
assert.notDeepEqual(again.sent,b6.who.sent,'and another party may go')
assert.ok(b6.who.home.some(id=>again.sent.includes(id)),'heroes who stayed home the first time go this time')
const homeAgain=Object.fromEntries(again.home.map(id=>[id,structuredClone(camp().roster[id])]))
const xpAgain=Object.fromEntries(again.sent.map(id=>[id,camp().roster[id].xp]))
const replay6=P.equipThenFight(again.sent,'battle 6 again')
assert.deepEqual([...replay6.config.heroes].sort(),again.sent,'the four chosen for the replay are the four on the board')
settle(true,'battle 6 won');stayedHome({home:homeAgain,deployed:again.sent,xpBefore:xpAgain},'battle 6 won',true)

/* 5a · kingdom.opening-deploy-choice, the whole of it: the run never asked while four or fewer were free to fight
   (battles 1 to 4 and the replay of battle 2 — asserted at each, P.whoGoes), and asked every time five or more were:
   before battle 5, before battle 6 and before its replay. Each time the four chosen were the four on Equip and on the
   board (P.equipThenFight, P.onTheBattle), and whoever stayed home was unharmed and earned nothing (stayedHome). */
assert.deepEqual([b1,b2,b3,b4].map(b=>b.who.asked),[false,false,false,false],'four or fewer free to fight: no choice is asked')
assert.deepEqual(WENT.map(w=>w.label),['battle 5','battle 6','battle 6 again'],'five free to fight: the run asks who goes, each time')
for(const w of WENT){
 assert.ok(w.free.length>=5,w.label+': five or more were free to fight')
 assert.ok(w.sent.length<=DEPLOY_LIMIT,w.label+': never more than four go');assert.equal(w.home.length,w.free.length-w.sent.length,w.label+': the rest stay home')
}
assert.ok(WENT[1].sent.length<DEPLOY_LIMIT,'fewer than four may be sent (the lost battle)');assert.deepEqual([WENT[0],WENT[2]].map(w=>w.sent.length),[DEPLOY_LIMIT,DEPLOY_LIMIT],'and four go to the battles won')
/* the four sent are the player's choice: at least once they were not the first four by id (what the page sent by itself
   until 2026-10-03), and the hero left home was not the same one every time */
assert.ok(WENT.some(w=>JSON.stringify(w.sent)!==JSON.stringify(w.free.slice(0,DEPLOY_LIMIT))),'the four sent are chosen — not always the first four by id')
assert.ok(new Set(WENT.map(w=>w.home.join())).size>1,'and not the same hero left home every time')

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
console.log(`opening run six: six battles from the map, never the kingdom map (Week ${camp().week}); six drafts of three, no class twice, Rogues and Mages offered; the first hero chosen by description only and given Leadership, a positive badge and +2 Health; every later draft shown with its rolled modifiers, kept in every battle and to the end of the run, the same after the page is closed and reopened; the party six, one of each class (${party.map(id=>camp().roster[id].classes.find(c=>HERO_CLASSES.includes(c)).replace('class.','')).join(', ')}); four deploy — with five free to fight the run asked who goes (${WENT.map(w=>`${w.label}: home ${w.home.map(h=>camp().roster[h].name).join(', ')}`).join('; ')}), the four chosen on Equip and on the board, whoever stayed home unharmed and unpaid, the choice kept when the page is closed on it, and asked again for a lost battle; base heroes left out for no kit: ${LEFT_OUT.map(h=>h.name).join(', ')||'none'}; party ${party.map(id=>`${camp().roster[id].name} L${camp().roster[id].level}${camp().roster[id].lifeState==='alive'?'':' ('+camp().roster[id].lifeState+')'}`).join(', ')}; closed after battle 3 and reopened at battle 4 with the same party, items, XP and levels; battle 2 lost and offered again with the same party; a run left mid-battle (battle 4) reopens on that battle; the Bridge's ${b3.kept} kept passed`)
