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
import {openingPage,TAKERS} from './opening-page.mjs'
const page=process.argv[2]??'BATTLE-SANDBOX.html'
const ORDER=['orphanage','lumberjack','bridge','cavern-trail','gates','cathedral'].map(x=>'encounter.opening.'+x)
const [ORPHANAGE,LUMBERJACK,BRIDGE,CAVERN,GATES,CATHEDRAL]=ORDER
const SWORD='item.longsword.flaming',RUN_KEY='hbt-opening-run'
/* a loss is sought with nobody dead first (the party is then fielded again whole); a loss that costs lives keeps the living */
const SEARCH={hows:(process.env.RUN_SIX_HOWS??'ai,hold,press').split(','),how:{partyAlive:false,fewestDead:true,seeds:Number(process.env.RUN_SIX_SEEDS??200)}}
/* the seeds that settled each battle when this was last run (printed at the end), tried before the search */
const FOUND={'encounter.opening.orphanage':[['ai',1]],'encounter.opening.lumberjack:lost':[['idle',6]],'encounter.opening.lumberjack':[['ai',12]],'encounter.opening.bridge':[['hold',2]],
 'encounter.opening.cavern-trail':[['hold',848]],'encounter.opening.gates':[['hold',223]],'encounter.opening.cathedral':[['press',1]]}
const chosen={}
const browser=new Map()
const rowsOf=c=>Object.fromEntries(Object.values(c.roster).map(h=>[h.id,{level:h.level,xp:h.xp,wound:h.wound,lifeState:h.lifeState,equipped:[...h.equipped],specialty:h.specialty??null}]))

/* Law 10, 2026-10-02 (merge of kingdom.reads-engine with kingdom.opening-run-six; review finding K7): the run's seed 11 -> 15,
   and the Cavern Trail's known seed press 9 -> hold 848. A kill pays its victim's tier's XP (2 / 5 / 15 — engine DECISIONS.md
   2026-09-28 'Let's do 2,515 XP by tier') instead of 3, so seed 11's party reaches the Bridge a level short (the Rune-Marked
   Ascetic at 18 XP) and no seed from 1 to 200 of ai, hold or press wins it. On seed 15 the known seeds still settle battles 1 to
   3, the Gates (hold 223) and the Cathedral (press 1); the Cavern Trail's press 9 no longer wins, and hold 848 is the first
   seed found (searching 1 to 1600 of ai, hold, press) after which the Gates' known seed still wins. The Bridge's hold 2 costs
   the Dawnblade and the Gates the Rune-Marked Ascetic: what this page test holds — one run through the six battles, saved and
   reopened — is unchanged; the opening's balance under the ruled XP is fix.opening-levels' question (reported to Andrew). */
let P=openingPage(page,'?map&new&seed=15',browser)
const camp=()=>P.camp()
const alive=()=>P.heroIds().filter(id=>camp().roster[id].lifeState==='alive')

/* the drafts owed before this battle (the cadence: 1 · +2 · +1 each, until the pool runs short) */
function drafts(label){const got=[];while(camp().cursor.step==='draft')got.push(P.draft(label+', draft '+(got.length+1)));return got}

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
function field(id,n,label){
 assert.equal(P.readMap(ORDER.slice(0,n-1),label+': the map'),id,label+': the next section')
 P.v.click('field',id)
 const drafted=drafts(label)
 const deployed=[...camp().cursor.engagement.deployed].sort()
 console.error(`${label}: sent ${deployed.map(h=>{const r=camp().roster[h];return `${r.name} L${r.level}${r.wound?' wound '+r.wound:''}`}).join(', ')}; at home ${P.heroIds().filter(h=>!deployed.includes(h)).map(h=>camp().roster[h].name+' '+camp().roster[h].lifeState).join(', ')||'nobody'}`)
 assert.ok(deployed.length>0&&deployed.every(id=>alive().includes(id)),label+': living heroes are sent')
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
field(CAVERN,4,'battle 4')
P=openingPage(page,'?map',browser)
assert.equal(camp().cursor.step,'battle','a run left mid-battle reopens on that battle')
P.onTheBattle('battle 4, reopened mid-battle')
settle(true,'battle 4')

/* 5 · the Gates and the Cathedral */
battle(GATES,5)
battle(CATHEDRAL,6)

/* 6 · the end: every section taken, the run complete — and never the kingdom map */
assert.equal(P.readMap(ORDER,'the end'),null,'every section is taken')
assert.match(P.byId('runNote').textContent,/the opening run is complete/,'the map says the run is complete')
assert.equal(camp().cursor.prologue,7,'six battles won');assert.equal(camp().week,0,'no Week begun');assert.equal(camp().cursor.step,'open')
P=openingPage(page,'?map',browser)
assert.equal(P.readMap(ORDER,'the end, reopened'),null,'reopened, the run is still complete')
const party=P.heroIds()
console.error('settled by: '+JSON.stringify(chosen))
console.log(`opening run six: six battles from the map, never the kingdom map (Week ${camp().week}); party ${party.map(id=>`${camp().roster[id].name} L${camp().roster[id].level}${camp().roster[id].lifeState==='alive'?'':' ('+camp().roster[id].lifeState+')'}`).join(', ')}; closed after battle 3 and reopened at battle 4 with the same party, items, XP and levels; battle 2 lost and offered again with the same party; a run left mid-battle (battle 4) reopens on that battle; the Bridge's ${b3.kept} kept passed`)
