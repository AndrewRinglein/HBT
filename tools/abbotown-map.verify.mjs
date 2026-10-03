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
//   node tools/abbotown-map.verify.mjs [BATTLE-SANDBOX.html] [PLAY.html]
import '../../engine/tools/engine-modules.mjs'   // first: links engine/node_modules into a worker's copy (Andrew, 2026-10-01)
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createRequire} from 'node:module'
import {bootSlice} from './atlas-dom.mjs'
const page=process.argv[2]??'BATTLE-SANDBOX.html',launcher=process.argv[3]??'PLAY.html'
const RULED=['Orphanage','Lumberjack House','Bridge','Cavern Trail','Gates','Cathedral']
/* the engine's facts: the playable battles in the opening's order, and a battle played to its end by the engine's own AI
   for both sides — the save a person would have made at that moment, pasted back into the page */
const esbuild=createRequire(import.meta.url)('../../engine/node_modules/esbuild')
const built=esbuild.buildSync({stdin:{contents:`export {createSandbox,saveSandbox} from './src/core/sandbox.ts';export {SCENARIOS,advanceBattle,runActivation,completeActionCycle} from './src/engine.ts'`,resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'esm',write:false,logLevel:'silent'})
const E=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'))
const playable=Object.values(E.SCENARIOS).filter(s=>s.openingPosition&&s.encounterId?.startsWith('encounter.opening.')).sort((a,b)=>a.openingPosition-b.openingPosition).map(s=>s.encounterId)
assert.deepEqual(playable.slice(0,3),['encounter.opening.orphanage','encounter.opening.lumberjack','encounter.opening.bridge'],'the engine plays the first three')
// was: the AI played both sides for a loss too — kingdom.opening-loop-three fields the campaign's drafted party, whom the
// AI rarely loses with (about one Lumberjack House in fifty), so a loss is now played with the heroes' side standing idle
// (`idle`): the same outcome the assertion asks for, reached in a seed or two
function playedOut(config,want,idle=false){
 for(let seed=1;seed<=40;seed++){
  const s=E.createSandbox({...structuredClone(config),seed}),ai={humanUnitUids:[]}
  for(let i=0;i<20000;i++){const n=E.advanceBattle(s.ctx,ai);if(n.kind==='complete')break;if(n.kind==='selecting')continue;if(!(idle&&s.ctx.state.units[n.actor].side==='hero'))E.runActivation(s.ctx,n.actor);E.completeActionCycle(s.ctx)}
  if(want.includes(s.ctx.state.outcome))return E.saveSandbox(s)
 }
 throw Error(`no seed from 1 to 40 ends ${config.encounterId} in ${want}`)
}
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

/* 1 · a fresh sitting: nothing taken, the Orphanage next; locked sections do nothing */
const v=open('?map')
let {s,next}=readMap(v,[],'fresh')
assert.equal(next.id,'encounter.opening.orphanage')
assert.equal(v.handle.session,null,'the map fields nothing by itself')
for(const x of s.filter(x=>x.state==='locked'))for(const fn of Object.values(x.g.handlers))fn()
assert.equal(v.handle.session,null,'clicking a locked section fields nothing')
assert.ok(v.shown(),'the map stays up after clicking a locked section')

/* 2 · clicking the next fields its encounter, exactly as ?play= does: the battle's own full screen */
// was: v.click('field','encounter.opening.orphanage');v.settle() — the battle came at once; kingdom.opening-loop-three puts
// the first hero's draft and Equip between the map and the battle (PLAYABLE-OPENING-PLAN.md item 12)
v.click('field','encounter.opening.orphanage');toBattle(v)
assert.equal(v.handle.session.config.encounterId,'encounter.opening.orphanage','clicking the Orphanage fields its encounter')
assert.ok(!v.shown(),'the map gives way to the battle')
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
;({next}=readMap(v,['encounter.opening.orphanage'],'after the Orphanage'))
assert.equal(next.id,'encounter.opening.lumberjack')

/* 4 · a loss: "Back to the map" too, and the Lumberjack House is still the next (a lost opening battle is replayed) */
// was: v.click('field',…);v.settle(), a loss the AI made, and v.click('map') — kingdom.opening-loop-three: the drafts and
// Equip come first, the loss is played with the heroes idle (playedOut), and the reckoning comes before the map
v.click('field','encounter.opening.lumberjack');toBattle(v)
assert.equal(v.handle.session.config.encounterId,'encounter.opening.lumberjack')
transfer().value=playedOut(v.handle.session.config,LOST,true);v.click('import');v.settle()
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
console.log(`abbotown map: six sections in the ruled order (${RULED.join(', ')}); taken checked, one red arrow on the next, the rest locked; the next fields its battle; a win returns to the map with it taken, a loss with it offered again; &taken= seeds it; PLAY.html links to it passed`)
