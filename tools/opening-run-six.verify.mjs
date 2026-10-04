// kingdom.opening-run-six (engine DECISIONS.md 2026-10-01 'one continuous run through the first six battles, saved, never
// the kingdom map'). Expect: "From http://127.0.0.1:4230/play Andrew starts a run, picks the first hero, drafts, equips and
// plays the Orphanage through the Cathedral without the kingdom map; closing the page after battle 3 and reopening it
// continues at battle 4 with the same party, items, XP and levels; losing a battle offers it again with the same party."
//
// The BUILT sandbox, opened as the launcher's Start a new run opens it (?map&new — here with a named seed), in one browser
// (one storage): the map -> the drafts -> Equip -> the battle -> the reckoning, rewards and level-ups -> the map, for the
// Orphanage, the Lumberjack House (lost first, and offered again with the same party, wounds kept) and the Bridge — ONE
// draft before each (kingdom.opening-draft-cadence, 2026-10-03: a party of 1, 2, 3, 4, 5, 6 at battles 1 to 6). Then the
// page is closed and opened again in the same browser as the launcher's Continue opens it (?map): the map stands at the
// Cavern Trail, the Campaign is the one left — the same party, items, XP and levels. Battle 4 is fielded and the page
// closed on it: reopened, it stands on that battle, from its start; then won. At the Gates five heroes are free to fight,
// so the run asks who goes (kingdom.opening-deploy-choice): four are chosen on the Deploy page — the page closed on it and
// opened again with the same heroes sent — and they are the four on Equip and on the board, while whoever stays home is
// unharmed and earns nothing; the Cathedral is lost first by one hero sent alone, offered again, and the replay asks who
// goes again. The Gates and the Cathedral are won; the map ends with every section taken and says the run is complete — and the Campaign never left the opening (no
// Week begun, no kingdom map). A reward kept is equipped at Equip before the next battle and fielded on its hero.
//
// Battles are settled as tools/opening-page.mjs settles them (playedOut, kingdom.page-test-strong-party, ruled 2026-10-04:
// "Go ahead, overpowered power party."): a battle the run means to win is played once by the engine's AI with the run's
// own party made overpowered for the test only, and its save pasted into the page; a battle it means to lose is the party
// held idle and cut at Turn 1. No seed is sought and none is kept here; the run passes on any run seed (RUN_SIX_SEED).
//
//   node tools/opening-run-six.verify.mjs [BATTLE-SANDBOX.html]
import assert from 'node:assert/strict'
import {openingPage,TAKERS,POOL,LEFT_OUT,HERO_CLASSES,FIRST_HERO,POSITIVE_BADGES,ART_SEEN,HEROES_MISSING,SPECIALTY_CHOICES,ITEM_ART_SEEN,ITEMS_ART,ITEMS_MISSING,CIVILIANS_SEEN,itemRow} from './opening-page.mjs'
const page=process.argv[2]??'BATTLE-SANDBOX.html'
const ORDER=['orphanage','lumberjack','bridge','cavern-trail','gates','cathedral'].map(x=>'encounter.opening.'+x)
const [ORPHANAGE,LUMBERJACK,BRIDGE,CAVERN,GATES,CATHEDRAL]=ORDER
const SWORD='item.longsword.flaming',RUN_KEY='hbt-opening-run'
/* Law 10, 2026-10-04 (kingdom.page-test-strong-party; engine DECISIONS.md 2026-10-04 'no testing that the battles can be won
   until these items are done; the page tests play an overpowered party; faster landing': "Go ahead, overpowered power
   party."): here stood the search settings (SEARCH: the engine's AI, then 'hold' and 'press' play, 200 seeds each, the
   fewest of the party dead taken), the table of seeds that settled each battle (KNOWN, with who stayed home, HOME), and
   four dated notes on how run seed 11 and each battle seed had been found again after an item moved a battle (the 24-hero
   pool, the draft's modifiers, the choice of who goes, the XP by tier). They are in git. fix.civilians-field-kit's armed
   civilians then moved battle 2 and every battle after it, and no seeds were sought again: this item came instead. The run no longer tests that the
   computer can win an opening battle with a normal party: it tests every step between the battles, which is what it was
   for. What moved with it, each noted at its edit below: the party is never hurt in a battle won, so nobody dies at the
   Bridge and the run asks who goes from battle 4 (it was battle 5); and a lost battle hurts nobody.
   RUN_SIX_SEED: another run seed (another party) — nothing is searched for it either */
const RUN_SEED=Number(process.env.RUN_SIX_SEED??11)
const chosen={}
const browser=new Map()
/* kingdom.opening-draft-modifiers: … and the badges, the item slots and the modifiers each hero was drafted with */
const rowsOf=c=>Object.fromEntries(Object.values(c.roster).map(h=>[h.id,{level:h.level,xp:h.xp,wound:h.wound,lifeState:h.lifeState,equipped:[...h.equipped],specialty:h.specialty??null,badges:[...h.badges],itemSlots:h.itemSlots,drafted:structuredClone(h.drafted??null)}]))
/* the draft as the page shows it: each offer's id, its words and what it carries (its stats, rolled points and badges) */
const draftShown=()=>P.byId('campaign').querySelectorAll('[data-act=draft]').map(o=>({id:o.dataset.id,text:o.textContent,stats:o.dataset.stats,rolls:o.dataset.rolls,badges:o.dataset.badges}))

let P=openingPage(page,'?map&new&seed='+RUN_SEED,browser)
const camp=()=>P.camp()
const alive=()=>P.heroIds().filter(id=>camp().roster[id].lifeState==='alive')

/* the drafts owed before this battle (the cadence: one before every battle, to six — kingdom.opening-draft-cadence,
   engine DECISIONS.md 2026-10-03 'one draft after every battle …': "We're only supposed to have one draft between battles
   1 and 2. I was getting two drafts." · "One, yes."; until then two came after battle 1); every offer of the run is kept in OFFERS.
   kingdom.opening-draft-pool (2026-10-03): was "until the pool runs short" — the pool is the 24 base heroes now.
   CADENCE keeps, for each battle as it is first fielded, how many drafts came before it and the party's size at it */
const OFFERS=[],CADENCE=[]
/* kingdom.opening-sword-waits (engine DECISIONS.md 2026-10-03 'the opening run: the Flaming Longsword waits for its taker; …':
   asked "If the party has no Warrior or Paladin after battle 2, should the Flaming Longsword wait in the stash until one
   is drafted?" — "One, yes."): after a draft, a waiting item is offered when the draft brought a hero who may carry it;
   the first hero offered is named its carrier, and only then is the battle fielded. WAITED keeps each such offer */
const WAITED=[]
function takeWaiting(label,brought){
 const offer=P.waitingOffer(label);if(!offer)return null
 assert.equal(offer.item,SWORD,label+': the Flaming Longsword');assert.ok(offer.offered.includes(brought),`${label}: the offer follows the draft that brought ${brought}, who may carry it`)
 const stashWas=[...camp().stash]
 P.v.click('give',offer.offered[0]);P.wait(100)
 assert.ok(camp().roster[offer.offered[0]].equipped.includes(SWORD),label+': the hero named carries the Flaming Longsword')
 assert.equal(camp().stash.filter(x=>x===SWORD).length,stashWas.filter(x=>x===SWORD).length-1,label+': it left the stash')
 assert.equal(camp().cursor.step,'prep',label+': and the battle is fielded')
 WAITED.push({label,carrier:offer.offered[0],brought,offered:offer.offered})
 return offer
}
function drafts(label){const got=[];while(camp().cursor.step==='draft'){const hero=P.draft(label+', draft '+(got.length+1));got.push(hero);OFFERS.push(P.lastOffer);takeWaiting(label,hero)}return got}
const DEPLOY_LIMIT=4

/* kingdom.opening-deploy-choice (engine DECISIONS.md 2026-10-03 'the opening run, audited', question 3: "Should the player
   choose which four heroes go into each battle?" — "3 yes"): who goes. With four or fewer free to fight the run asks
   nothing and all go (asserted in P.whoGoes). With five or more the Deploy page asks, and this driver chooses.
   WHO GOES is chosen by rule, on every run seed: the sword's carrier goes; then whoever stayed home the last time the run
   asked; then the most XP; a tie to the earlier id. (Until 2026-10-04 this file's run named who stayed home — HOME, found
   by search like the seeds, because only some fours could win the Gates and the Cathedral; the strong party wins with any
   four.) Every time the run asks is kept in WENT.
   The choosing itself is played through the page, the heroes sent in id order: two are sent; (the first time) the page
   is closed on the Deploy page and opened again — the same step, the same two sent, the choice saved with the run; then a
   change of mind — a hero who is to stay home is sent, the party filled (and the one still wanted cannot be sent: the
   party is full), that hero brought home and the one wanted sent; then on to Equip. `pick` chooses otherwise (the
   battle to be lost). */
const WENT=[]
function choose(free,label){
 const c=camp(),lastHome=WENT.at(-1)?.home??[]
 const rank=id=>[c.roster[id].equipped.includes(SWORD)?0:1,lastHome.includes(id)?0:1,-c.roster[id].xp]
 const by=(a,b)=>{const x=rank(a),y=rank(b);for(let i=0;i<x.length;i++)if(x[i]!==y[i])return x[i]-y[i];return a<b?-1:a>b?1:0}
 return [...free].sort(by).slice(0,DEPLOY_LIMIT)
}
/* fewer than four may be sent: one hero alone goes to the battle that is to be LOST — the first free to fight by id. (Until
   2026-10-04 it was the heroes with no wound: a real loss put a Wounded hero down for good. A lost battle is now the party
   held idle and cut at Turn 1 — opening-page.mjs HELD_PARTY — and hurts nobody, so the rule is simply that one goes.) */
const alone=free=>[free[0]]
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

/* kingdom.opening-free-equip (engine DECISIONS.md 2026-10-03 'the opening run, audited', question 4 — "4 free"): an item
   whose row costs Faith or Mana to equip — an idol, a bloodrune */
const costsToEquip=id=>Object.keys(itemRow(id).equipCost).length>0
/* the purse, as it stands. (The item's audit read the opening's purse as empty for the whole run; it is empty at the
   first Equip — the empty-purse case is test/opening-free-equip.test.ts's — but each won battle pays its kind's grants,
   so by the Bridge it holds Faith, Mana and Supplies: kingdom SWITCHES.md freeEquipPurseNotEmpty. What the page holds is
   that equipping takes NOTHING from it.) */
const purseNow=()=>JSON.stringify(camp().purse)
const FREE_WORN=[]
/* Equip: the stash's first item that fits a hero sent is put on that hero (the slot the page marks it can go in) — an
   idol or a bloodrune first, when the stash holds one (kingdom.opening-free-equip): with an empty purse its tile says
   'free to equip', never its Faith or Mana, it goes on, nothing is spent and nothing is recorded as paid */
function equipFromStash(label){
 const stash=[...camp().stash].sort((a,b)=>Number(costsToEquip(b))-Number(costsToEquip(a)));if(!stash.length)return null
 for(const item of stash){
  const costly=costsToEquip(item),tile=P.byId('campaign').querySelectorAll('.item').find(el=>el.dataset.id===item)
  assert.ok(tile,`${label}: ${item} is on Equip, in the stash`)
  const purseBefore=purseNow()
  if(costly){
   assert.match(tile.textContent,/free to equip/,`${label}: ${item} is shown as free to equip`);assert.doesNotMatch(tile.textContent,/\d+ (faith|mana) to equip/,`${label}: ${item} shows no Faith or Mana cost`)
  }else assert.doesNotMatch(tile.textContent,/free to equip/,`${label}: ${item} never cost anything to equip, and is not called free`)
  P.v.click('pick',item)
  const slot=P.byId('campaign').querySelectorAll('[data-act=drop]').find(el=>el.classList.contains('can'))
  if(!slot){P.v.click('pick',item);continue}
  const hero=slot.dataset.id;slot.handlers.click()
  assert.ok(camp().roster[hero].equipped.includes(item),`${label}: ${item} is on ${hero}`)
  if(costly){
   assert.equal(purseNow(),purseBefore,`${label}: ${item} went on and nothing was taken from the purse`)
   assert.deepEqual(camp().cursor.equipSession?.paid??[],[],`${label}: nothing was paid for ${item}`)
   assert.doesNotMatch(P.byId('campaign').textContent,/Paid this session/,label+': Equip lists nothing paid')
   FREE_WORN.push({label,item,hero,row:itemRow(item),purse:purseBefore})
  }
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
 /* kingdom.opening-draft-cadence: exactly one draft stands before every battle, and the party at battle n is n heroes */
 assert.equal(drafted.length,1,`${label}: one draft before it — never two, never none`)
 assert.equal(P.heroIds().length,n,`${label}: a party of ${n}`)
 CADENCE.push({n,drafts:drafted.length,party:P.heroIds().length})
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
 /* kingdom.opening-free-equip: … and an idol or bloodrune put on free is carried into the battle by its hero's unit */
 if(equipped&&costsToEquip(equipped.item)){
  const i=s.config.heroes.indexOf(equipped.hero);assert.ok(i>=0,label+': the hero wearing it is sent')
  assert.ok([...(s.setup.heroItems?.[i]??[]),...(s.setup.heroStowed?.[i]??[])].includes(equipped.item),`${label}: ${equipped.item} is fielded in the battle on ${equipped.hero}`)
  FREE_WORN.at(-1).fielded=true
 }
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
const REOPENED_ON_CHOICE=[]
/* kingdom.opening-replay-rules (engine DECISIONS.md 2026-10-03 'the opening run: … a lost battle pays no XP; a replay rolls
   new dice': "Now a lost battle offers a replay." · "New dice."): every battle the run lost, with the seed it was first
   fielded on and the seed of its replay (LOST) */
const LOST=[]
const xpNow=()=>Object.fromEntries(Object.values(camp().roster).map(h=>[h.id,h.xp]))
function settle(won,label,reopenOnSpecialty=false,how={}){
 const id=camp().cursor.engagement.id,xpWas=xpNow(),levelsWas=JSON.stringify(Object.values(camp().roster).map(h=>[h.id,h.level]))
 const {e,result,played,seed}=P.fightOut(won,label,how)
 if(!won){
  /* a lost battle pays no XP to anyone — not its fixed XP (the Orphanage's 20), not the formula's — and levels nobody:
     it only offers the replay (the Continue goes straight back to the map) */
  assert.deepEqual(xpNow(),xpWas,label+': a lost battle leaves every hero\'s XP where it was')
  assert.equal(camp().cursor.step,'open',label+': nothing to level after a loss — back to the map')
  assert.equal(JSON.stringify(Object.values(camp().roster).map(h=>[h.id,h.level])),levelsWas,label+': nobody levels on a loss')
  LOST.push({label,id,seed})
 }
 chosen[won?id:id+':lost']=[played,seed,result.turns]
 console.error(`settled ${label}: ${won?'the strong party, the engine\'s AI':'the party held idle, cut at Turn 1'} — ${result.outcome} on Turn ${result.turns}, the Engagement's own seed ${seed}`)
 if(how.civilianFalls)console.error(`${label}: the strong party stood idle until a civilian had fallen, and the engine's AI played from there (kingdom.opening-recap-civilians)`)
 /* kingdom.page-test-strong-party: what the page wrote is what the pasted battle did to each hero sent — none dead, and a
    wound only where the battle took the hero down (the Reckoning's rule: the worse of the wound carried in and the plain
    wound of going down) */
 for(const u of result.units.filter(u=>u.side==='hero'&&u.role===undefined)){
  const hero=camp().roster[e.deployed[u.index]]
  assert.equal(hero.lifeState,'alive',`${label}: ${hero.name} lives`)
 }
 let kept=null
 if(won&&camp().cursor.step==='rewards'){
  const offer=[...camp().cursor.rewardOffer]
  /* kingdom.opening-free-equip: an idol or a bloodrune is kept when one is offered (it costs Faith or Mana to equip, and
     the purse is empty) — else the first card, as before */
  const wanted=offer.findIndex(costsToEquip)
  kept=P.takeReward(wanted<0?0:wanted,label)
  /* kingdom.opening-hero-card-art: who may carry it — each hero offered is shown with its own card art (P.carriers) */
  const givers=P.carriers(label)
  if(givers.length){P.v.click('give',givers[0]);P.wait(100)}
  assert.ok(offer.includes(kept),label+': a reward offered is kept')
 }
 /* kingdom.opening-specialty-three: the first time a specialty is owed (the first hero, after the Orphanage) the page is
    closed on the choice — the sheet open, three offered — and opened again in the same browser: the run stands on the
    same step, and the hero's sheet offers the same three (P.levelUps then holds them once more and takes one) */
 if(reopenOnSpecialty&&!REOPENED_ON_CHOICE.length){
  const before=P.specialtyOffer(label),step=camp().cursor.step
  P=openingPage(page,'?map',browser)
  assert.equal(camp().cursor.step,step,label+': reopened on the specialty choice, the run stands on the same step')
  const after=P.specialtyOffer(label+', reopened')
  assert.deepEqual(after,before,label+': reopened, the same hero is offered the same three specialties')
  REOPENED_ON_CHOICE.push(before)
  P=openingPage(page,'?map',browser)
 }
 if(camp().cursor.step==='levelUp'||camp().cursor.step==='rewards')P.levelUps(label)
 assert.equal(camp().cursor.step,'open',label+': back to the map')
 assert.equal(camp().week,0,label+': no Week begun — the run never reaches the kingdom');assert.equal(camp().ended,null,label+': the run goes on')
 return {result,kept}
}
/* kingdom.opening-recap-civilians: the Orphanage (battle 1) is won WITH A CIVILIAN DEAD — settled so deliberately
   (opening-page.mjs playOut 'civilian-falls') — so its victory screen has a dead civilian to mark */
function battle(id,n,label=`battle ${n}`){const f=field(id,n,label),done=settle(true,label,n===1,n===1?{civilianFalls:true}:{});stayedHome(f,label,true);return {...f,...done}}

/* 1 · a new run: nothing fielded, nobody drafted, the Orphanage next; the run is kept from the first screen */
assert.equal(P.readMap([],'a new run'),ORPHANAGE)
assert.equal(P.handle.session,null,'the map fields nothing by itself')
assert.deepEqual(P.heroIds(),[],'the run starts with nobody')
assert.ok(browser.has(RUN_KEY),'the run is kept in the browser')

/* 2 · battles 1 to 3 */
/* kingdom.opening-replay-rules: the Orphanage is LOST first — the hero's XP stays where it was (no 20 for a loss), the map
   offers it again with no draft; the replay is fielded on NEW DICE (another seed than the first attempt's, the one the
   Campaign gives the battle's first replay); the page is closed on that replay's battle and opened again: the same
   battle, to the byte. Then it is won — and pays its 20.
   Law 10, 2026-10-04 (kingdom.opening-replay-rules): this read `const b1=battle(ORPHANAGE,1)` — the Orphanage won at once.
   Everything it held is held below, of the Orphanage won on its replay. */
const b1=field(ORPHANAGE,1,'battle 1')
assert.equal(b1.drafted.length,1,'one hero before battle 1')
const first=b1.drafted[0]
settle(false,'battle 1 lost')
assert.equal(camp().roster[first].xp,0,'a lost Orphanage leaves the hero\'s XP where it was: no 20 for a loss')
assert.equal(P.readMap([],'after losing battle 1'),ORPHANAGE,'the lost Orphanage is offered again')
P.v.click('field',ORPHANAGE)
assert.equal(camp().cursor.step,'prep','no draft is owed for the replay');assert.equal(whoGoes('battle 1 again').asked,false)
let replay1=P.equipThenFight([first],'battle 1 again')
const dice1={first:b1.s.config.seed,replay:replay1.config.seed}
assert.equal(dice1.first,1,'the first attempt was fielded on the battle\'s own number');assert.notEqual(dice1.replay,dice1.first,'the replay is fielded on new dice')
assert.equal(camp().cursor.engagement.seed,dice1.replay);assert.equal(camp().cursor.replays,1,'the Campaign counts the replay')
assert.deepEqual({...replay1.config,seed:0},{...b1.s.config,seed:0,heroRows:replay1.config.heroRows},'the same battle, the same party — only the dice')
const asFielded=JSON.stringify({config:replay1.config,events:replay1.ctx.events})
P=openingPage(page,'?map',browser)
assert.equal(camp().cursor.step,'battle','a replay left mid-battle reopens on that battle')
replay1=P.onTheBattle('battle 1 again, reopened')
assert.equal(JSON.stringify({config:replay1.config,events:replay1.ctx.events}),asFielded,'the replay, reopened from the save, is the same battle to the byte')
settle(true,'battle 1 won',true,{civilianFalls:true});stayedHome(b1,'battle 1',true)
assert.equal(camp().roster[first].xp>=20&&camp().roster[first].level,2,'the Orphanage, won, pays its 20 XP: the first hero is level 2')
assert.equal(camp().cursor.replays??0,0,'the battle won, its replays are spent')
/* battle 2 lost: the map offers it again, no draft, the same party (a loss with nobody dead is sought first), wounds kept;
   then won */
const b2=field(LUMBERJACK,2,'battle 2');settle(false,'battle 2 lost')
/* Law 10, 2026-10-04 (kingdom.opening-draft-cadence; engine DECISIONS.md 2026-10-03 'one draft after every battle; …': "We're
   only supposed to have one draft between battles 1 and 2. I was getting two drafts." · asked "Should the cadence change
   to one draft after every battle (party of 1, 2, 3, 4, 5, 6) …?" — "One, yes."): this read
     assert.equal(b2.drafted.length,2,'two more before battle 2')
   — the 2026-08-23 cadence the ruling replaces. The rule now: one, and a party of two at the Lumberjack House. */
assert.equal(b2.drafted.length,1,'one more before battle 2 — a party of two at the Lumberjack House')
const standing=b2.deployed.filter(id=>camp().roster[id].lifeState==='alive')
assert.equal(P.readMap(ORDER.slice(0,1),'after losing battle 2'),LUMBERJACK,'the lost battle is offered again')
P.v.click('field',LUMBERJACK)
assert.equal(camp().cursor.step,'prep','no draft is owed for the replay')
assert.equal(P.heroIds().length,2,'the replay is the same party of two: a lost battle brings no draft')
assert.equal(whoGoes('battle 2 again').asked,false,'two free to fight: no choice is asked for the replay')
const replay=P.equipThenFight(standing,'battle 2 again')
/* kingdom.opening-replay-rules: the replay is on new dice */
assert.equal(b2.s.config.seed,2,'battle 2\'s first attempt: its own number');assert.notEqual(replay.config.seed,b2.s.config.seed,'battle 2\'s replay is fielded on new dice')
assert.deepEqual([...replay.config.heroes].sort(),standing,'the same party')
for(const id of replay.config.heroes)assert.equal(replay.config.heroRows.find(h=>h.id===id).wound,camp().roster[id].wound,`${id} carries its wound into the replay`)
/* Law 10, 2026-10-04 (kingdom.page-test-strong-party; engine DECISIONS.md 2026-10-04 "Go ahead, overpowered power party."):
   this read
     assert.ok(standing.some(id=>camp().roster[id].wound>0),'the loss left wounds')
   — true of a loss found on a seed, in which the party was beaten down. A lost battle is now settled deliberately (the
   party held idle, the battle cut at Turn 1) and takes nobody down, so there is no wound to find; that a battle can wound
   is the Reckoning's rule and its tests' (test/isc-034, test/encounter-result-fold). What this run holds of a loss is
   unchanged otherwise — offered again, no draft, the same party, each hero's wound carried into the replay (above) — and
   the rule the old line stood on is held exactly: nobody is wounded who was not taken down. */
assert.deepEqual(standing,b2.deployed,'the loss cost nobody: the same party stands')
assert.ok(standing.every(id=>camp().roster[id].wound===0),'the loss took nobody down, and wounded nobody')
settle(true,'battle 2 won')
/* Law 10, 2026-10-04 (kingdom.opening-draft-cadence): this read
     assert.ok(Object.values(camp().roster).some(h=>h.equipped.includes(SWORD)&&h.classes.some(c=>TAKERS.includes(c))),'the Flaming Longsword is carried by a Warrior or a Paladin')
   — held of a party of THREE at the Lumberjack House, which this driver's drafts (a Warrior or a Paladin first when
   offered) always gave a taker on the seeds run. A party of two has had two drafts, and on some run seeds neither offer
   held a Warrior or a Paladin. The rule (kingdom SWITCHES openingItemTakers, 2026-09-28 "Warriors or Paladins can use
   it."): with a living Warrior or Paladin in the party the sword is carried by one; with none nobody carries it — and
   never anybody else. (That it then WAITS for its taker is kingdom.opening-sword-waits, not yet built.) */
const swordTaker=P.heroIds().some(id=>camp().roster[id].classes.some(c=>TAKERS.includes(c)))
const swordOn=Object.values(camp().roster).filter(h=>h.equipped.includes(SWORD))
assert.ok(swordOn.every(h=>h.classes.some(c=>TAKERS.includes(c))),'the Flaming Longsword is never carried by anybody but a Warrior or a Paladin')
assert.equal(swordOn.length,swordTaker?1:0,swordTaker?'the Flaming Longsword is carried by a Warrior or a Paladin':'no Warrior or Paladin in the party of two: nobody carries the Flaming Longsword')
/* kingdom.opening-sword-waits (2026-10-04; "One, yes."): the other half of the rule above is no longer "nobody carries it
   and it is gone" (kingdom SWITCHES openingItemTakers, cadencePartyOfTwoSword) — with no taker the sword is KEPT: it is
   in the stash, and the map says it waits; with one it never went to the stash */
assert.equal(camp().stash.includes(SWORD),!swordTaker,swordTaker?'carried at once: the sword never went to the stash':'no taker: the Flaming Longsword is kept in the stash')
assert.equal(/Flaming Longsword waits in the stash/.test(P.byId('runNote').textContent),!swordTaker,swordTaker?'the map says nothing of a waiting sword':'the map says the Flaming Longsword waits, for a Warrior or a Paladin')
if(!swordTaker)assert.match(P.byId('runNote').textContent,/for a Warrior or a Paladin/)
/* kingdom.opening-hero-death-replays (engine DECISIONS.md 2026-10-03 'the opening run: a battle in which a hero dies is
   replayed': "If a hero dies, it should be replayed." · "Battle: they died as a replayed"): the Bridge is first WON WITH
   A HERO DEAD (settled so deliberately: that hero fielded with 1 Health for the test, P.fallOut) — the screen names who
   fell and offers the battle again, nothing of the attempt is written, and the map offers the Bridge again with no
   draft; the replay fields the whole party as it stood before the battle, the fallen hero alive, on new dice. Then it
   is won with nobody dead — and THAT attempt is kept: its XP, its reward, the next battle.
   Law 10, 2026-10-04 (kingdom.opening-hero-death-replays): this read `const b3=battle(BRIDGE,3)` — the Bridge won at once.
   Everything it held is held below, of the Bridge won on its replay. */
const b3=field(BRIDGE,3,'battle 3')
assert.equal(b3.drafted.length,1,'one more before battle 3')
const partyBefore3=JSON.stringify(b3.deployed.map(id=>camp().roster[id]))
const fell3=P.fallOut([1],'battle 3, a hero dies in a battle won')
console.error(`fell — battle 3: won with ${fell3.fallen.join(', ')} dead on Turn ${fell3.result.turns}, the Engagement's own seed ${fell3.seed}; not kept`)
assert.equal(P.readMap(ORDER.slice(0,2),'after a hero died at the Bridge'),BRIDGE,'the battle a hero died in is offered again')
P.v.click('field',BRIDGE)
assert.equal(camp().cursor.step,'prep','no draft is owed for the replay');assert.equal(whoGoes('battle 3 again').asked,false)
assert.deepEqual(P.freeToFight(),b3.deployed,'the whole party is free to fight again — the fallen hero alive')
const replay3=P.equipThenFight(b3.deployed,'battle 3 again')
assert.equal(JSON.stringify(replay3.config.heroRows),partyBefore3,'the replay fields the whole party as it stood before the battle: heroes, wounds, items, XP, levels')
assert.equal(b3.s.config.seed,3);assert.notEqual(replay3.config.seed,3,'the replay is on new dice')
const won3=settle(true,'battle 3');stayedHome(b3,'battle 3',true)
assert.ok(won3.kept,'the Bridge, won with nobody dead, offers its reward: an attempt no hero died in is kept')
assert.ok(b3.deployed.some(id=>camp().roster[id].xp>b3.xpBefore[id]),'… and pays its XP')
assert.equal(P.readMap(ORDER.slice(0,3),'after battle 3'),CAVERN)
const b3kept=won3.kept

/* 3 · the page closed and opened again in the same browser, as the launcher's Continue opens it */
const left=P.camp(),kept=rowsOf(left),stash=[...left.stash]
P=openingPage(page,'?map',browser)
assert.equal(P.readMap(ORDER.slice(0,3),'reopened'),CAVERN,'reopened, the run stands at battle 4')
assert.deepEqual(rowsOf(camp()),kept,'the same party, items, XP and levels')
assert.deepEqual(camp().stash,stash,'the same stash')
assert.equal(camp().cursor.prologue,4,'the Campaign stands at battle 4')
assert.match(P.byId('runNote').textContent,/saved after every step/,'the map says the run is saved')

/* Law 10, 2026-10-04 (kingdom.page-test-strong-party; engine DECISIONS.md 2026-10-04 "Go ahead, overpowered power party."):
   sections 4, 5 and 5a hold the same rules at other battles. With battles won by the strong party nobody dies, so the
   Bridge no longer costs a hero and FIVE are free to fight a battle earlier: the run asks who goes from battle 4, and six
   are free from battle 5. What was asserted:
     [b1,b2,b3,b4] asked nothing; the run asked before 'battle 5', 'battle 6' and 'battle 6 again' (five free each time);
     battle 6 was lost first by the hero with no wound sent alone (WENT[1]); four went to the battles won ([WENT[0],WENT[2]]).
   What is asserted now — each of those rules, none dropped:
     [b1,b2,b3] ask nothing (and battle 2's replay, at its fielding); the run asks before 'battle 4', 'battle 5', 'battle 6'
     and 'battle 6 again' (five or six free); battle 6 is lost first by one hero sent alone (WENT[2]); four go to the
     battles won ([WENT[0],WENT[1],WENT[3]]). */
/* Law 10, 2026-10-04 (kingdom.opening-draft-cadence; engine DECISIONS.md 2026-10-03 'one draft after every battle; …': "One,
   yes." — a party of 1, 2, 3, 4, 5, 6 at battles 1 to 6): sections 4, 5 and 5a hold the same rules one battle later
   again, because the party is one hero smaller at every battle from the second. What was asserted (under the old cadence,
   a party of 5 at battle 4 and 6 from battle 5):
     b4.who.asked true ('five free to fight before battle 4'); b5.who.asked true ('six free'); b6.drafted.length 0
     ('six are drafted: no draft before battle 6'); the run asked before 'battle 4', 'battle 5', 'battle 6' and
     'battle 6 again'; battle 6 lost first by one hero sent alone (WENT[2]); four to the battles won ([WENT[0],WENT[1],WENT[3]]).
   What is asserted now — each of those rules, none dropped:
     b4 asks nothing (four free to fight: all four go); b5 asks (five free); b6 is preceded by the sixth draft and asks
     (six free); the run asks before 'battle 5', 'battle 6' and 'battle 6 again'; battle 6 is lost first by one hero sent
     alone (WENT[1]); four go to the battles won ([WENT[0],WENT[2]]). */
/* 4 · battle 4 — the fourth hero drafted (the page closed on that draft and opened again: the same three, the same
   modifiers), four free to fight: no choice is asked and all four go. Fielded, then the page closed on the battle and
   opened again — a run left mid-battle reopens on that battle, from its start; then won */
const b4=field(CAVERN,4,'battle 4',true)
assert.equal(b4.drafted.length,1,'one more before battle 4')
assert.equal(b4.who.asked,false,'four free to fight before battle 4: no choice is asked, all four go')
/* kingdom.opening-hero-death-replays ('the opening run, audited' question 6: "When the whole party is dead …" — "6 offer
   replay"): the Cavern Trail first KILLS THE PARTY SENT (all four fielded with 1 Health for the test) — a battle lost
   with nobody left standing: those who bled out dead, the last ones down. The same screen, naming the dead; nobody is
   written dead or wounded; the run is not stranded: the map offers
   the Cavern Trail again, and all four go again */
const fell4=P.fallOut([0,1,2,3],'battle 4, every hero sent dies')
console.error(`fell — battle 4: lost with all four dead or down (${fell4.fallen.join(', ')} dead) on Turn ${fell4.result.turns}, the Engagement's own seed ${fell4.seed}; not kept`)
assert.equal(P.readMap(ORDER.slice(0,3),'after everyone died at the Cavern Trail'),CAVERN,'the battle that killed everyone is offered again')
assert.deepEqual(alive(),P.heroIds(),'nobody is dead: the whole party is alive')
P.v.click('field',CAVERN)
assert.equal(camp().cursor.step,'prep','no draft is owed for the replay');assert.equal(whoGoes('battle 4 again').asked,false,'four free to fight: all four go again')
const replay4=P.equipThenFight(b4.deployed,'battle 4 again')
assert.equal(b4.s.config.seed,4);assert.notEqual(replay4.config.seed,4,'the replay is on new dice')
P=openingPage(page,'?map',browser)
assert.equal(camp().cursor.step,'battle','a run left mid-battle reopens on that battle')
P.onTheBattle('battle 4, reopened mid-battle')
settle(true,'battle 4');stayedHome(b4,'battle 4',true)

/* 5 · the Gates and the Cathedral — kingdom.opening-deploy-choice: with the fifth hero drafted, five are free to fight,
   so from the Gates the run asks who goes: four chosen (the page closed on the Deploy page and opened again, whoGoes),
   won. The sixth hero is drafted before the Cathedral: six free to fight. The Cathedral is lost first, by one hero sent
   alone (fewer than four may be sent): the map offers it again, and the replay asks who goes AGAIN, with nobody sent —
   and another party goes, four this time. Then won. */
const b5=battle(GATES,5)
assert.equal(b5.drafted.length,1,'one more before battle 5: the fifth hero')
assert.equal(b5.who.asked,true,'five free to fight before battle 5: the run asks which four go')
const b6=field(CATHEDRAL,6,'battle 6',false,alone)
assert.equal(b6.drafted.length,1,'one more before battle 6: the sixth hero — six are drafted before the Cathedral')
assert.equal(b6.who.asked,true,'six free to fight before battle 6: the run asks which four go')
settle(false,'battle 6 lost');stayedHome(b6,'battle 6 lost',false)
assert.equal(P.readMap(ORDER.slice(0,5),'after losing battle 6'),CATHEDRAL,'the lost battle is offered again')
P.v.click('field',CATHEDRAL)
assert.equal(camp().cursor.step,'prep','no draft is owed for the replay')
assert.equal(P.heroIds().length,6,'six are drafted: the tutorial draft has retired')
const again=whoGoes('battle 6 again')
assert.equal(again.asked,true,'the replayed battle asks who goes again')
assert.notDeepEqual(again.sent,b6.who.sent,'and another party may go')
assert.ok(b6.who.home.some(id=>again.sent.includes(id)),'heroes who stayed home the first time go this time')
const homeAgain=Object.fromEntries(again.home.map(id=>[id,structuredClone(camp().roster[id])]))
const xpAgain=Object.fromEntries(again.sent.map(id=>[id,camp().roster[id].xp]))
const replay6=P.equipThenFight(again.sent,'battle 6 again')
assert.equal(b6.s.config.seed,6,'battle 6\'s first attempt: its own number');assert.notEqual(replay6.config.seed,b6.s.config.seed,'battle 6\'s replay is fielded on new dice')
assert.deepEqual([...replay6.config.heroes].sort(),again.sent,'the four chosen for the replay are the four on the board')
settle(true,'battle 6 won');stayedHome({home:homeAgain,deployed:again.sent,xpBefore:xpAgain},'battle 6 won',true)

/* 5a · kingdom.opening-deploy-choice, the whole of it: the run never asked while four or fewer were free to fight
   (battles 1 to 4 and the replay of battle 2 — asserted at each, P.whoGoes), and asked every time five or more were:
   before battle 5, before battle 6 and before its replay. Each time the four chosen were the four on
   Equip and on the board (P.equipThenFight, P.onTheBattle), and whoever stayed home was unharmed and earned nothing
   (stayedHome). (The lists below moved with the cadence — the Law 10 note above section 4.) */
assert.deepEqual([b1,b2,b3,b4].map(b=>b.who.asked),[false,false,false,false],'four or fewer free to fight: no choice is asked')
assert.deepEqual(WENT.map(w=>w.label),['battle 5','battle 6','battle 6 again'],'five or more free to fight: the run asks who goes, each time')
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
/* 5b-cadence · kingdom.opening-draft-cadence (engine DECISIONS.md 2026-10-03 'one draft after every battle; …': "One, yes."): one
   draft before the Orphanage and exactly one after each battle — one between each pair of battles — so the party is 1,
   2, 3, 4, 5, 6 heroes at battles 1 to 6: two at the Lumberjack House, three at the Bridge, four at the Cavern Trail,
   five at the Gates, six at the Cathedral (each asserted as its battle is fielded, field); a replayed battle brings no
   draft (asserted at both replays); and the draft screen counted them, "your first hero" then "hero N of six"
   (tools/opening-page.mjs draft) */
assert.deepEqual(CADENCE.map(x=>x.n),[1,2,3,4,5,6],'the six battles, each fielded once from a draft');assert.deepEqual(CADENCE.map(x=>x.drafts),[1,1,1,1,1,1],'one draft before every battle')
assert.deepEqual(CADENCE.map(x=>x.party),[1,2,3,4,5,6],'a party of 1, 2, 3, 4, 5, 6 at battles 1 to 6')
assert.deepEqual(OFFERS.map(o=>o.heading),['The draft — your first hero',...[2,3,4,5,6].map(k=>`The draft — hero ${k} of six`)],'the draft screen counts the heroes')
assert.deepEqual([b1,b2,b3,b4,b5,b6].map(b=>b.deployed.length),[1,2,3,4,4,1],'everyone goes while four or fewer are held; four of five to the Gates; one alone to the Cathedral lost first')
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

/* 5d · kingdom.opening-hero-card-art (engine DECISIONS.md 2026-10-03 'every draft card shows the hero's card art …': "Card
   art should be present when you're drafting, both the first time and the next ones."; 'card art on the level-up and
   reward screens …': "Card art not showing in the level-up screen."): every screen of the run that shows a hero's card or
   face showed that hero's own card art — asserted card by card where each screen is driven (tools/opening-page.mjs
   showsArt): the three cards of all six drafts (the first draft's with its description and still no number), every card
   of the Who-goes page each time the run asked, every hero card at Equip before every battle, every face on every
   victory screen, every hero card on every rewards screen, each hero who may carry the Flaming Longsword, and every
   level-up sheet. Here: each of those screens was reached, and the whole party of six — every one a hero of the 24, five
   of them outside the old five-hero pool's portraits or not — has a portrait or is named as missing. */
assert.equal(ART_SEEN.draft,OFFERS.length*3,'an image was held on every card of every draft')
/* Law 10, 2026-10-04 (kingdom.opening-draft-cadence): this read
     for(const [screen,n] of Object.entries(ART_SEEN))assert.ok(n>0,`the run reached ${screen} and its hero cards were held to their card art`)
   — every screen, the sword's carrier among them. The carrier is asked only when the party of two at the Lumberjack House
   holds a Warrior or a Paladin (swordTaker, above); on a run seed where it holds neither nobody is asked, and the screen
   is held to exactly that: not reached. Every other screen is reached on every run. */
/* 2026-10-04 (kingdom.opening-sword-waits): the conditional written with kingdom.opening-draft-cadence —
     if(screen==='carrier'&&!swordTaker)assert.equal(n,0,'no Warrior or Paladin after battle 2: nobody is asked to carry the Flaming Longsword')
   — goes: the sword now waits and IS offered once a taker is drafted (by the sixth draft every class is), so the carrier
   is asked on every run — after battle 2, or after the draft that brings the taker — and the first rule stands again. */
for(const [screen,n] of Object.entries(ART_SEEN))assert.ok(n>0,`the run reached ${screen} and its hero cards were held to their card art`)
assert.ok(ART_SEEN.whoGoes>=5*WENT.length,'every card of the Who-goes page, each time the run asked')
const artless=P.heroIds().filter(id=>HEROES_MISSING.includes(id))

/* 5e · kingdom.opening-specialty-three (engine DECISIONS.md 2026-10-03 'card art on the level-up and reward screens; the
   specialty choice offers three, not nine': "you're supposed to only get a choice of three different specialty classes,
   not nine." · '… the specialty three are random; …': "It's random: 3 of the 9."): every specialty choice of the run
   offered exactly three different specialties of the hero's own class — the run's own draw for that hero — with no way
   past it, and the hero took one of them (each asserted at its level-up, tools/opening-page.mjs threeOffered); the first
   of them was closed on and reopened to the same three (settle). Every hero who reached level 2 chose once. */
assert.ok(SPECIALTY_CHOICES.length>=1,'the run reached a specialty choice')
assert.equal(REOPENED_ON_CHOICE.length,1,'the page was closed on a specialty choice and opened again')
assert.deepEqual(SPECIALTY_CHOICES[0].offered,REOPENED_ON_CHOICE[0].offered,'the three taken from are the three shown before the page was closed');assert.equal(SPECIALTY_CHOICES[0].id,REOPENED_ON_CHOICE[0].id)
for(const x of SPECIALTY_CHOICES){assert.equal(x.offered.length,3,x.label+': three offered');assert.ok(x.offered.includes(x.took),x.label+': one of the three is taken')}
assert.equal(new Set(SPECIALTY_CHOICES.map(x=>x.id)).size,SPECIALTY_CHOICES.length,'a hero chooses its specialty once')
assert.deepEqual(SPECIALTY_CHOICES.map(x=>x.id).sort(),P.heroIds().concat(P.civilianIds()).filter(id=>camp().roster[id].level>=2).sort(),'everybody at level 2 or more chose a specialty from three')

/* 5f · kingdom.opening-reward-card-art (engine DECISIONS.md 2026-10-03 'card art on the level-up and reward screens; …':
   "Card art not showing in the reward screen for the flinging sword."): every reward card of the run showed its item's
   own card art, or its plain face with the item named in itemsMissing — and never both, never neither (each asserted
   card by card at its rewards screen, tools/opening-page.mjs showsItemArt); the Flaming Longsword's reward card, on a run
   whose party of two holds a Warrior or a Paladin, showed its card art; and every item Equip showed before every battle
   — worn and in the stash — the same. The Flaming Longsword has card art, whether or not this run was offered it. */
assert.ok(SWORD in ITEMS_ART&&!(SWORD in ITEMS_MISSING),'the Flaming Longsword has card art')
assert.equal(ITEM_ART_SEEN.sword,swordTaker,swordTaker?'the Flaming Longsword\'s reward card was shown, with its card art':'no Warrior or Paladin after battle 2: the Flaming Longsword was not offered')
assert.ok(ITEM_ART_SEEN.rewardArt+ITEM_ART_SEEN.rewardPlain>=4*3,'the reward cards of the four draws (the Bridge to the Cathedral) were each held to art or itemsMissing')
assert.ok(ITEM_ART_SEEN.equipArt>0,'Equip showed items with card art');assert.ok(ITEM_ART_SEEN.equipArt+ITEM_ART_SEEN.equipPlain>=21,'every item Equip showed was held')

/* 5g · kingdom.opening-recap-civilians (engine DECISIONS.md 2026-10-03 'the civilians show on the victory screen; …': "The
   battle should show in this victory screen too. If they were wounded, if they died, they're in there too." — the
   civilians): every victory screen of the run showed a card for every player-side unit of its battle — the heroes in
   their row and, set apart in their own, every civilian who fought, each marked unhurt, wounded or dead as the battle
   left it and named in the report when hurt (each asserted at its screen, tools/opening-page.mjs fightOut). Here: the
   Orphanage's screen showed the Orphan Child and the School Teacher, one of them DEAD (the battle was settled so) and
   marked dead, not joining, not on the roster; the Lumberjack House's showed the Lumberjack and his Wife; and the
   screens of the battles that field no civilians showed none. */
const civiliansAt=id=>CIVILIANS_SEEN.filter(x=>x.encounterId===id)
assert.equal(CIVILIANS_SEEN.length,6,'six victory screens, one for each battle won');assert.deepEqual(CIVILIANS_SEEN.map(x=>x.encounterId),ORDER)
const atOrphanage=civiliansAt(ORPHANAGE)[0].civilians,atLumberjack=civiliansAt(LUMBERJACK)[0].civilians
assert.deepEqual(atOrphanage.map(x=>x.name).sort(),['Orphan Child','School Teacher'],'the Orphanage: the Orphan Child and the School Teacher')
assert.deepEqual(atLumberjack.map(x=>x.name).sort(),['Lumberjack','Lumberjack\'s Wife'],'the Lumberjack House: the Lumberjack and his Wife')
const fallen=atOrphanage.filter(x=>x.fate==='dead')
assert.ok(fallen.length>=1,'a civilian died at the Orphanage, and the screen marked it dead');assert.ok(fallen.every(x=>!x.joins),'the dead do not join')
for(const x of [...atOrphanage,...atLumberjack])assert.ok(['unhurt','wounded','dead'].includes(x.fate))
for(const x of [...atOrphanage,...atLumberjack].filter(x=>x.fate!=='dead'))assert.ok(x.joins&&P.civilianIds().some(id=>camp().roster[id].name===x.name),x.name+' lived, was marked as joining, and is on the roster')
for(const x of fallen)assert.ok(!P.civilianIds().some(id=>camp().roster[id].name===x.name),x.name+' died and is not on the roster')
const saidOf=list=>list.map(x=>`${x.name} ${x.fate}${x.joins?', joins':''}`).join(', ')

/* 5h · kingdom.opening-free-equip (engine DECISIONS.md 2026-10-03 'the opening run, audited', question 4: "Should idols and
   bloodrunes be free to equip during the opening, or be left out of the opening's rewards?" — "4 free"): an idol or a
   bloodrune offered as a battle reward was kept, was shown on Equip as free to equip — never its Faith or Mana — went
   onto a hero with nothing taken from the purse and nothing recorded as paid, and was fielded on that hero in the next
   battle (each asserted where it happened: settle, equipFromStash, field).
   The reward draw is the run's own, so a run may be offered none before its last battle: this run (seed 11, the one the
   suite plays) is offered one, and on any other run seed the same assertions hold whenever one is. */
if(RUN_SEED===11)assert.ok(FREE_WORN.length>=1,'run seed 11 keeps an idol or a bloodrune as a battle reward and wears it')
for(const x of FREE_WORN){assert.equal(x.fielded,true,`${x.label}: ${x.item} was fielded`);assert.ok(['idol','bloodrune'].includes(x.row.itemClass),x.item+' is an idol or a bloodrune')}

/* 5i · kingdom.opening-replay-rules (engine DECISIONS.md 2026-10-03 'the opening run: the Flaming Longsword waits for its
   taker; a lost battle pays no XP; a replay rolls new dice': asked "Should a lost battle pay any XP? …" — "Now a lost
   battle offers a replay." (No) · asked "Should a replayed battle roll new dice? …" — "New dice."): three battles were
   lost first — the Orphanage, the Lumberjack House and the Cathedral. Each left every hero's XP where it was and
   levelled nobody (asserted at each, settle), and was offered again from the map with no draft; each replay was fielded
   on another seed than its first attempt (its own number); the Orphanage's replay, left mid-battle, reopened as the same
   battle to the byte; and the Orphanage paid its 20 when it was won. */
assert.deepEqual(LOST.map(x=>x.id),[ORPHANAGE,LUMBERJACK,CATHEDRAL],'three battles lost first');assert.deepEqual(LOST.map(x=>x.seed),[1,2,6],'each first attempt on the battle\'s own number')
const DICE=[[1,dice1.replay],[2,replay.config.seed],[6,replay6.config.seed]]
for(const [was,now] of DICE){assert.notEqual(now,was);assert.ok(Number.isSafeInteger(now)&&now>=1&&now<=2147483647,'a seed the engine takes')}
assert.equal(new Set(DICE.map(d=>d[1])).size,3,'three replays, three other seeds')

/* 5j · kingdom.opening-hero-death-replays (engine DECISIONS.md 2026-10-03 'the opening run: a battle in which a hero dies is
   replayed' · 'the opening run, audited' question 6: "6 offer replay"): a battle that ended with a hero dead — the
   Bridge, WON with one of three dead; the Cavern Trail, lost with all four dead or down — was followed by the screen naming who
   fell and offering the battle again; nothing of the attempt was written, nobody was dead on the roster, the replay
   fielded the whole party as it stood on new dice, and the run went on only from an attempt no hero died in — which
   paid its XP and its reward (each asserted where it happened: P.fallOut, and above). A battle no hero died in went on
   to its XP and reward (every other battle won). A dead civilian changed none of it: the Orphanage, won with a civilian
   dead, was kept — its 20 XP, the next battle. The party ends the run with nobody dead. */
assert.deepEqual([fell3.all,fell4.all],[false,true],'a won battle with one hero dead, and a battle that took down everyone sent');assert.equal(fell3.fallen.length,1);assert.ok(fell4.fallen.length>=1)
assert.ok(civiliansAt(ORPHANAGE)[0].civilians.some(x=>x.fate==='dead')&&camp().roster[first].xp>=20,'the Orphanage, won with a civilian dead, was kept')
assert.deepEqual(alive(),P.heroIds(),'no hero is dead at the end of the run');assert.equal(P.heroIds().length,6)
assert.equal(camp().losses,3,'three battles were lost (and kept as losses); a battle a hero died in is not counted one')

/* 5k · kingdom.opening-sword-waits (engine DECISIONS.md 2026-10-03 'the opening run: the Flaming Longsword waits for its
   taker; …' — "One, yes."): BOTH runs are covered by this one file — on a run whose party of two holds a Warrior or a
   Paladin (the suite's seed 11) the sword is offered after the Lumberjack House and carried at once, as before, and no
   waiting offer is ever made; on a run whose party of two holds neither (RUN_SIX_SEED=14, which
   test/opening-sword-waits.test.ts plays) it is kept in the stash, the map says it waits, nobody else can wear it, and
   the draft that brings a Warrior or a Paladin is followed by the offer — the carrier named, the sword carried, then
   the battle (drafts → takeWaiting). Either way a Warrior or a Paladin carries it at the end, and nobody else ever did. */
assert.equal(WAITED.length,swordTaker?0:1,swordTaker?'a taker after battle 2: the sword never waited':'no taker after battle 2: the sword waited and was offered once, after the draft that brought its taker')
const carrierNow=Object.values(camp().roster).filter(h=>h.equipped.includes(SWORD))
assert.equal(carrierNow.length,1,'the Flaming Longsword is carried at the end of the run');assert.ok(carrierNow[0].classes.some(c=>TAKERS.includes(c)),'by a Warrior or a Paladin')
assert.ok(!camp().stash.includes(SWORD)&&!/Flaming Longsword waits/.test(P.byId('runNote').textContent),'and nothing waits any longer')
if(!swordTaker){assert.equal(WAITED[0].carrier,carrierNow[0].id);assert.ok(camp().roster[WAITED[0].brought].classes.some(c=>TAKERS.includes(c)),'the draft that was followed by the offer brought a Warrior or a Paladin')}

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
console.log(`opening run six: six battles from the map, never the kingdom map (Week ${camp().week}); one draft before every battle (${CADENCE.map(x=>x.drafts).join(', ')}): a party of ${CADENCE.map(x=>x.party).join(', ')} at battles 1 to 6; six drafts of three, no class twice, Rogues and Mages offered; three specialties of its own class offered at every specialty choice (${SPECIALTY_CHOICES.length} choices), one taken each time; the page closed on the choice and opened again showed the same three; the first hero chosen by description only and given Leadership, a positive badge and +2 Health; every later draft shown with its rolled modifiers, kept in every battle and to the end of the run, the same after the page is closed and reopened; the party six, one of each class (${party.map(id=>camp().roster[id].classes.find(c=>HERO_CLASSES.includes(c)).replace('class.','')).join(', ')}); four deploy — with five or more free to fight the run asked who goes (${WENT.map(w=>`${w.label}: home ${w.home.map(h=>camp().roster[h].name).join(', ')}`).join('; ')}), the four chosen on Equip and on the board, whoever stayed home unharmed and unpaid, the choice kept when the page is closed on it, and asked again for a lost battle; base heroes left out for no kit: ${LEFT_OUT.map(h=>h.name).join(', ')||'none'}; card art on every hero card (${Object.entries(ART_SEEN).map(([k,n])=>`${k} ${n}`).join(', ')}; heroes with no art on disk, shown blank: ${artless.map(id=>camp().roster[id].name).join(', ')||'none'}); ${swordTaker?`the Flaming Longsword was offered after the Lumberjack House, as before, and is carried by ${carrierNow[0].name}`:`the Flaming Longsword waited in the stash (no Warrior or Paladin in the party of two; the map said so) and was offered after the draft that brought ${camp().roster[WAITED[0].brought].name}, who carries it`}; a battle a hero died in was not kept and was offered again with the party as it stood: the Bridge, won with ${fell3.fallen.map(id=>camp().roster[id].name).join(', ')} dead (the screen named who fell; nothing written; replayed on new dice with ${fell3.fallen.map(id=>camp().roster[id].name).join(', ')} alive); the Cavern Trail, every hero sent dead or down (${fell4.fallen.map(id=>camp().roster[id].name).join(', ')} dead: the same screen, nobody written dead or wounded, all four sent again); a lost battle paid no XP (the Orphanage, the Lumberjack House and the Cathedral, each lost first: every hero's XP where it was) and was offered again on new dice (${DICE.map(d=>`seed ${d[0]}, then ${d[1]}`).join('; ')}); a replay left mid-battle reopened as the same battle to the byte; the Orphanage won paid its 20; the victory screens showed the civilians who fought, set apart from the heroes and marked unhurt, wounded or dead (the Orphanage: ${saidOf(atOrphanage)}; the Lumberjack House: ${saidOf(atLumberjack)}); a civilian who died (${fallen.map(x=>x.name).join(', ')}) was marked dead and did not join;${FREE_WORN.map(x=>` ${/^[aeiou]/.test(x.row.itemClass)?'an':'a'} ${x.row.itemClass} kept as a battle reward (${x.row.name}, ${Object.entries(x.row.equipCost).map(([c,n])=>n+' '+c.replace('currency.','')).join(', ')} outside the opening) went onto ${camp().roster[x.hero].name} at Equip free — shown as free to equip, nothing taken from the purse — and was fielded in the next battle;`).join('')||' no idol or bloodrune was offered before the last battle;'} item card art: ${ITEM_ART_SEEN.rewardArt+ITEM_ART_SEEN.rewardPlain} reward cards — ${ITEM_ART_SEEN.rewardArt} showed their item's card art, ${ITEM_ART_SEEN.rewardPlain} plain and named in itemsMissing; ${ITEM_ART_SEEN.equipArt+ITEM_ART_SEEN.equipPlain} items on Equip — ${ITEM_ART_SEEN.equipArt} with art, ${ITEM_ART_SEEN.equipPlain} plain and named in itemsMissing${ITEM_ART_SEEN.sword?'; the Flaming Longsword\'s reward card showed its card art':''}; party ${party.map(id=>`${camp().roster[id].name} L${camp().roster[id].level}${camp().roster[id].lifeState==='alive'?'':' ('+camp().roster[id].lifeState+')'}`).join(', ')}; closed after battle 3 and reopened at battle 4 with the same party, items, XP and levels; battle 2 lost and offered again with the same party; a run left mid-battle (battle 4) reopens on that battle; the Bridge's ${b3kept} kept passed`)
