// kingdom.abbotown-map (PLAYABLE-OPENING-PLAN.md item 11; engine DECISIONS.md 2026-09-29 "the playable opening": "The
// Retaking Abbotown campaign map is built from Andrew's sketch (IMG_5078): six sections, taken ones marked, the next one
// pointed to"; KINGDOM-V2-2026-09-07.md "Conquest maps": "After a victory, return to the progress map: the reclaimed
// section lights up, potentially with a green check, and a red arrow highlights the next section"). The order is ruled
// 2026-09-28 (DECISIONS.md "the opening's six battles, in order"): Orphanage → Lumberjack House → Bridge → Cavern Trail →
// Gates → Cathedral; a lost opening battle is replayed.
//
// The BUILT sandbox opened with ?map shows the map: six sections in that order, the taken ones checked, exactly one next
// with the red arrow, the rest locked and not clickable; clicking the next fields its encounter as ?play= does; a hero win
// offers "Back to the map", and the map then shows it taken and the following section next; a loss offers it too and the
// section is still the next. &taken=<encounter ids> seeds the sitting. The launcher (PLAY.html) links to the map.
//
// 2026-10-04, kingdom.opening-starts-in-battle (engine DECISIONS.md 2026-10-04 '… no map before battle 1 …'): a fresh ?map opens
// on the first draft, and its pick fields the Orphanage; the map first shows after battle 1 — the Orphanage taken, the
// Lumberjack House next — and from there everything above holds (Law 10 notes at steps 1 to 3).
//
//   node tools/abbotown-map.verify.mjs [BATTLE-SANDBOX.html] [PLAY.html]
import '../../engine/tools/engine-modules.mjs'   // first: links engine/node_modules into a worker's copy (Andrew, 2026-10-01)
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createRequire} from 'node:module'
import {bootSlice} from './atlas-dom.mjs'
import {playedOut as settled} from './opening-page.mjs'
const page=process.argv[2]??'BATTLE-SANDBOX.html',launcher=process.argv[3]??'PLAY.html'
const RULED=['Orphanage','Lumberjack House','Bridge','Cavern Trail','Gates','Cathedral']
/* the engine's facts: the playable battles in the opening's order */
const esbuild=createRequire(import.meta.url)('../../engine/node_modules/esbuild')
const built=esbuild.buildSync({stdin:{contents:`export {SCENARIOS} from './src/engine.ts'`,resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'esm',write:false,logLevel:'silent'})
const E=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'))
const playable=Object.values(E.SCENARIOS).filter(s=>s.openingPosition&&s.encounterId?.startsWith('encounter.opening.')).sort((a,b)=>a.openingPosition-b.openingPosition).map(s=>s.encounterId)
assert.deepEqual(playable.slice(0,3),['encounter.opening.orphanage','encounter.opening.lumberjack','encounter.opening.bridge'],'the engine plays the first three')
// kingdom.page-test-strong-party (2026-10-04; engine DECISIONS.md 2026-10-04 "Go ahead, overpowered power party."): a battle is
// settled by the opening's shared driver (tools/opening-page.mjs playedOut) — won by the run's own party made overpowered
// for the test only, lost by the party held idle and cut at Turn 1; one battle, on its own seed, nothing sought. Until
// then this file played seed after seed (1 to 40) until one ended as wanted: the engine's AI on both sides for a win,
// the heroes' side standing idle for a loss.
const playedOut=(config,want)=>{const won=want===WON,r=settled(config,won);assert.ok(want.includes(r.result.outcome),`${config.encounterId}: settled ${r.result.outcome}`);return r.save}
const WON=['heroClear','objectiveMet'],LOST=['wipe','retreat','capped','objectiveFailed']

function open(search){
 const b=bootSlice(page,{search}),handle=b.w.__sandbox
 const map=()=>b.root.querySelector('#conquest')
 const sections=()=>map().querySelectorAll('[data-section]').map(g=>({id:g.dataset.section,state:g.dataset.state,name:g.querySelector('.sectionName')?.textContent.trim(),g}))
 const settle=()=>{if(handle.busy)b.click('skip')}
 return {...b,handle,map,sections,settle,shown:()=>!!map()&&!map().hasAttribute('hidden')}
}
/* kingdom.opening-loop-three: the next section begins the campaign's chain — the draft owed, then Equip — before its
   battle; and a battle's outcome goes on to its reckoning, the recap and the rewards page, before the map. These walk
   the chain with the first offer and no level taken (tools/opening-loop-three.verify.mjs plays it in full) */
const campaign=v=>v.root.querySelector('#campaign')
function toBattle(v){
 for(let guard=0;guard<6&&campaign(v)&&!campaign(v).hasAttribute('hidden');guard++){
  const offer=campaign(v).querySelectorAll('[data-act=draft]')[0]
  if(offer)v.click('draft',offer.dataset.id);else v.click('advance')
 }
 v.settle()
}
function toMap(v){
 v.click('reckon');v.w._flush(2500);v.click('exit')
 for(let guard=0;guard<3&&campaign(v)&&!campaign(v).hasAttribute('hidden');guard++)v.click('exit')
}
function readMap(v,taken,label){
 assert.ok(v.shown(),label+': the map is shown')
 assert.match(v.map().textContent,/Retaking Abbotown/,label+': titled Retaking Abbotown')
 const s=v.sections()
 assert.deepEqual(s.map(x=>x.name),RULED,label+': six sections, in the ruled order')
 assert.deepEqual(s.slice(0,4).map(x=>x.id),playable.slice(0,4),label+': each playable section keyed by its engine encounter')
 const next=s.find(x=>!taken.includes(x.id))
 for(const x of s){
  const want=taken.includes(x.id)?'taken':x===next?'next':'locked'
  assert.equal(x.state,want,`${label}: ${x.name} is ${want}`)
  assert.equal(x.g.querySelectorAll('.check').length,want==='taken'?1:0,`${label}: ${x.name} ${want==='taken'?'carries':'carries no'} the green check`)
  assert.equal(x.g.querySelectorAll('.nextArrow').length,want==='next'?1:0,`${label}: ${x.name} ${want==='next'?'carries':'carries no'} the red arrow`)
  if(want!=='next')assert.equal(x.g.querySelectorAll('[data-act]').length+(x.g.dataset.act?1:0),0,`${label}: ${x.name} is not clickable`)
 }
 assert.equal(v.map().querySelectorAll('.nextArrow').length,next?1:0,label+': exactly one red arrow')
 return {s,next}
}

/* 1 · a fresh sitting: no map — the first draft; nothing fielded.
   Law 10, 2026-10-04 (kingdom.opening-starts-in-battle; engine DECISIONS.md 2026-10-04 'the opening's tutorial: the first hero's class line, no map before battle 1, …': "We don't
   start by showing you going to the orphanage on the map. There's no reason to have that map step in the beginning.
   We're just going straight into the battle after you get your hero."): this read
     let {s,next}=readMap(v,[],'fresh')
     assert.equal(next.id,'encounter.opening.orphanage')
     assert.equal(v.handle.session,null,'the map fields nothing by itself')
     for(const x of s.filter(x=>x.state==='locked'))for(const fn of Object.values(x.g.handlers))fn()
     assert.equal(v.handle.session,null,'clicking a locked section fields nothing')
     assert.ok(v.shown(),'the map stays up after clicking a locked section')
   — a fresh sitting opened on the map, nothing taken. The rule now: a fresh sitting opens on the first draft and its map
   is not drawn; the map first shows after battle 1, the Orphanage taken. Every one of those assertions is kept, held of
   the map where it now first shows — step 3, below (the next is the Lumberjack House; the locked sections do nothing). */
const v=open('?map')
assert.ok(!v.shown(),'a fresh sitting does not open on the map')
assert.equal(v.map().querySelectorAll('[data-section]').length,0,'the map is not drawn before battle 1')
assert.ok(campaign(v)&&!campaign(v).hasAttribute('hidden')&&campaign(v).querySelectorAll('[data-act=draft]').length===3,'it opens on the first draft: three offered')
assert.equal(v.handle.session,null,'nothing is fielded before the pick')

/* 2 · the pick fields the Orphanage, exactly as ?play= does: the battle's own full screen */
// was: v.click('field','encounter.opening.orphanage');v.settle() — the battle came at once; kingdom.opening-loop-three put
// the first hero's draft and Equip between the map and the battle (PLAYABLE-OPENING-PLAN.md item 12).
// Law 10, 2026-10-04 (kingdom.opening-starts-in-battle): was v.click('field','encounter.opening.orphanage');toBattle(v) and
// 'clicking the Orphanage fields its encounter' / 'the map gives way to the battle' — there is no map to click now: the
// pick (toBattle takes the first offer) puts the Orphanage on the board with no Equip stop
toBattle(v)
assert.equal(v.handle.session.config.encounterId,'encounter.opening.orphanage','the first hero\'s pick fields the Orphanage')
assert.equal(campaign(v).querySelectorAll('.equip-page').length,0,'no Equip stop before battle 1')
assert.ok(!v.shown()&&v.map().querySelectorAll('[data-section]').length===0,'still no map')
assert.ok(v.w.document.body.classList.contains('battle-view'),'the battle is its own full screen')
// Law 10, viewer.turn-taking (engine DECISIONS.md 2026-10-03 'a hero starts its Activation with its basic move armed'; kingdom
// SWITCHES playQueueProposal overturned): the Hero Phase begins its first hero at once — was: 'selecting', waiting for a click
assert.equal(v.handle.session.ctx.battleCursor.at,'acting','the Hero Phase begins its first hero')

/* 3 · a hero win: "Back to the map", and the map shows the Orphanage taken and the Lumberjack House next */
const transfer=()=>v.w.document.getElementById('transferText')
transfer().value=playedOut(v.handle.session.config,WON);v.click('import');v.settle()
assert.ok(WON.includes(v.handle.session.ctx.state.outcome),'the Orphanage is won')
// was: /Back to the map/ and v.click('map') — kingdom.opening-loop-three: the outcome goes on to the reckoning, and the
// rewards page returns to the map
assert.match(v.root.querySelector('#commands').textContent,/Continue to the reckoning/,'the outcome goes on to the reckoning, then the map')
toMap(v)
let {s,next}=readMap(v,['encounter.opening.orphanage'],'after the Orphanage')
assert.equal(next.id,'encounter.opening.lumberjack')
/* (moved here from the fresh sitting, 2026-10-04 — the Law 10 note at step 1) the map fields nothing by itself, and a
   locked section does nothing */
const fielded=v.handle.generation
for(const x of s.filter(x=>x.state==='locked'))for(const fn of Object.values(x.g.handlers))fn()
assert.equal(v.handle.generation,fielded,'clicking a locked section fields nothing')
assert.ok(v.shown(),'the map stays up after clicking a locked section')
assert.equal(s.filter(x=>x.state==='locked').length,4,'four sections are locked')

/* 4 · a loss: "Back to the map" too, and the Lumberjack House is still the next (a lost opening battle is replayed) */
// was: v.click('field',…);v.settle(), a loss the AI made, and v.click('map') — kingdom.opening-loop-three: the drafts and
// Equip come first, the loss is the party held idle (playedOut), and the reckoning comes before the map
v.click('field','encounter.opening.lumberjack');toBattle(v)
assert.equal(v.handle.session.config.encounterId,'encounter.opening.lumberjack')
transfer().value=playedOut(v.handle.session.config,LOST);v.click('import');v.settle()
assert.ok(LOST.includes(v.handle.session.ctx.state.outcome),'the Lumberjack House is lost')
toMap(v)
;({next}=readMap(v,['encounter.opening.orphanage'],'after losing the Lumberjack House'))
assert.equal(next.id,'encounter.opening.lumberjack','the lost battle is offered again')

/* 5 · &taken= seeds the sitting, for an eyeball check of a part-taken map */
readMap(open('?map&taken=encounter.opening.orphanage,encounter.opening.lumberjack'),['encounter.opening.orphanage','encounter.opening.lumberjack'],'seeded two')
const four=open('?map&taken='+playable.slice(0,4).join(','))
;({next}=readMap(four,playable.slice(0,4),'seeded four'))
assert.equal(next.name,'Gates','after the Cavern Trail the Gates are next')
assert.equal(next.g.querySelectorAll('[data-act]').length+(next.g.dataset.act?1:0),playable.includes(next.id)?1:0,'the Gates are clickable exactly when the engine has their battle (encounter.opening.gates, engine 817b21d)')

/* 6 · the launcher links to the map */
assert.ok(readFileSync(launcher,'utf8').includes('<a href="../kingdom/BATTLE-SANDBOX.html?map" data-more="map">'),'PLAY.html links to the map')
console.log(`abbotown map: six sections in the ruled order (${RULED.join(', ')}); a fresh sitting opens on the first draft and its pick fields the Orphanage with no map and no Equip before battle 1; taken checked, one red arrow on the next, the rest locked; the next fields its battle; a win returns to the map with it taken, a loss with it offered again; &taken= seeds it; PLAY.html links to it passed`)
