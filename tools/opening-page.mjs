// The opening's page, driven — the steps tools/opening-loop-three.verify.mjs and tools/opening-run-six.verify.mjs take on
// the BUILT sandbox opened with ?map, through the page's own controls: the map, the draft, Equip, the battle settled by a
// pasted engine save, the reckoning, the rewards and the level-ups. One copy for both (kingdom.opening-run-six).
//
// A battle is settled the way tools/abbotown-map.verify.mjs settles one: the engine plays it out on a seed and the save is
// pasted back into the page ("Resume pasted save") — the page takes it as the campaign's battle only when it is that
// battle with that party.
import '../../engine/tools/engine-modules.mjs'   // first: links engine/node_modules into a worker's copy (Andrew, 2026-10-01)
import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
import {bootSlice} from './atlas-dom.mjs'

export const TAKERS=['class.warrior','class.paladin']
const esbuild=createRequire(import.meta.url)('../../engine/node_modules/esbuild')
const built=esbuild.buildSync({stdin:{contents:`export {createSandbox,saveSandbox,sandboxResult,advanceSandbox,sandboxActivationChoices,sandboxChoices,commandSandbox} from './src/core/sandbox.ts';export {runBattle} from './src/engine.ts';export * as HEROES from './src/content/heroes.ts'`,resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'esm',write:false,logLevel:'silent'})
const E=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'))
/* kingdom.opening-draft-pool: the sources' draft pool, and the base heroes left out of it for want of a kit — what the
   page's draft is held against */
export const POOL=E.HEROES.HERO_POOL.map(h=>({id:h.id,name:h.name,classes:[...h.classes]}))
export const LEFT_OUT=(E.HEROES.UNKITTED_HEROES??[]).map(h=>({id:h.id,name:h.name}))
export const HERO_CLASSES=['class.mage','class.paladin','class.priest','class.ranger','class.rogue','class.warrior']

/* the player's side, played out: 'ai', the engine's AI; 'idle', every activation begun and ended (a loss the AI's own
   heroes rarely make); 'hold', no hero moves and each strikes the best blow the engine offers it from where it stands, or
   waits (the engine's AI stalls at the Bridge — encounter.opening.bridge-ai-refiled); 'press', as 'hold', and with no blow
   to strike a hero steps toward the nearest enemy */
function playOut(s,how){
 if(how==='ai'){E.runBattle(s.ctx);return}
 E.advanceSandbox(s)
 for(let i=0;i<50000&&!s.ctx.state.outcome;i++){const ctx=s.ctx,at=ctx.battleCursor?.at,seq=ctx.state.seq
  let r=null
  if(at==='selecting')r=E.commandSandbox(s,{kind:'select-activation',unitUid:E.sandboxActivationChoices(s)[0].uid,expectedSeq:seq})
  else if(at==='acting'){
   const blow=c=>(c.preview.connectionChanceBps??(c.preview.hitChance??50)*100)*(c.preview.damageOnHit??c.preview.damage??0)
   const choices=how==='idle'?[]:E.sandboxChoices(s)
   const best=choices.filter(c=>'target' in c.command&&ctx.state.units[c.command.target].side==='enemy'&&c.preview&&blow(c)>0).sort((x,y)=>blow(y)-blow(x))[0]
   /* 'press': with no blow to strike, step to the hex nearest the nearest living enemy, when that is nearer than now */
   const near=hex=>Math.min(...ctx.state.units.filter(u=>u.side==='enemy'&&u.hp>0&&u.hex!=null).map(u=>ctx.geo.distance(hex,u.hex)))
   const me=ctx.state.units[ctx.battleCursor.actor]
   const step=how==='press'&&!best?choices.filter(c=>'destination' in c.command).map(c=>({c,d:near(c.command.destination)})).filter(x=>x.d<near(me.hex)).sort((x,y)=>x.d-y.d)[0]?.c:undefined
   const go=best??step
   r=go?E.commandSandbox(s,go.command):E.commandSandbox(s,{kind:'end-cycle',actor:ctx.battleCursor.actor,expectedSeq:seq})
  }
  if(!r?.ok)throw Error('the player\'s side could not go on: '+(r?.reason??at))}
}

/* a battle played out on seed after seed until it ends as wanted — the save a person would have made at that moment. The
   enemies are always the engine's AI. `hows` are tried in turn, seeds 1 to `seeds` each. partyAlive: only a seed with
   none of the party dead; otherwise the first seed that ends as wanted — or, fewestDead, the one with the fewest of the
   party dead over every seed tried */
export function playedOut(config,won,hows,{partyAlive=true,seeds=1500,fewestDead=false,first=[]}={}){
 let best=null
 /* `first`: [how, seed] pairs tried before the search — a seed found before, kept so the search is not run again; the
    engine is deterministic, so it is the same battle until the engine or the party changes, and then the search runs */
 const tries=[...first.filter(([how])=>hows.includes(how)),...hows.flatMap(how=>Array.from({length:seeds},(_,i)=>[how,i+1]))]
 const known=tries.length-hows.length*seeds
 for(const [i,[how,seed]] of tries.entries()){
  const s=E.createSandbox({...structuredClone(config),seed});playOut(s,how)
  const r=E.sandboxResult(s),party=r.units.filter(u=>u.side==='hero'&&u.role===undefined),dead=party.filter(u=>u.lifeState==='dead').length
  if((r.outcome==='heroClear')!==won)continue
  const out={save:E.saveSandbox(s),result:r,how,seed,dead}
  if(dead===0||(!partyAlive&&(!fewestDead||i<known)))return out
  if(!partyAlive&&(!best||dead<best.dead))best=out
 }
 if(best)return best
 throw Error(`no seed from 1 to ${seeds} (${hows.join(', ')}) ends ${config.encounterId} ${won?'won':'lost'}${partyAlive?' with the party alive':''}`)
}

/** The built sandbox opened at `search`, in a browser whose storage is `store` (a Map; a fresh one when absent). */
export function openingPage(page,search,store){
 const v=bootSlice(page,{search,store}),w=v.w,root=v.root,handle=w.__sandbox
 const camp=()=>handle.campaign
 const byId=id=>root.querySelector('#'+id)
 const shown=id=>{const el=byId(id);return !!el&&!el.hasAttribute('hidden')}
 const fire=(el,type,target)=>{assert.ok(el,'an element to '+type);for(const f of el.listeners[type]??[])f({target:target??el,preventDefault(){},stopPropagation(){}})}
 const heroIds=()=>Object.values(camp().roster).filter(h=>!h.classes.includes('class.civilian')).map(h=>h.id).sort()
 const civilianIds=()=>Object.values(camp().roster).filter(h=>h.classes.includes('class.civilian')).map(h=>h.id).sort()
 const settle=()=>{if(handle.busy)v.click('skip')}
 /* the page's clock, run forward in small steps: a timer a timer sets comes due on a later step, as in a browser */
 const wait=ms=>{for(let t=0;t<ms;t+=50)w._flush(50)}

 function readMap(taken,label){
  assert.ok(shown('conquest'),label+': the map is shown');assert.ok(!shown('campaign'),label+': no campaign screen over it')
  const s=byId('conquest').querySelectorAll('[data-section]').map(g=>({id:g.dataset.section,state:g.dataset.state}))
  const next=s.find(x=>!taken.includes(x.id))
  for(const x of s)assert.equal(x.state,taken.includes(x.id)?'taken':x===next?'next':'locked',`${label}: ${x.id}`)
  return next?.id??null
 }

 /* the draft: three offered, stat-less, none of a class already drafted until all six are; a Warrior or a Paladin is
    taken first when offered, so the party can carry the Flaming Longsword. A base hero left out of the pool for want of
    a kit is named on the screen (data-unkitted), and nobody else is.
    Law 10, 2026-10-03 (kingdom.opening-draft-pool; engine DECISIONS.md 2026-10-03 'the opening draft pool is all 24 heroes,
    Rogues and Mages included'): the two lines below were
      assert.ok(opts.length>=1&&opts.length<=3,label+': one to three offered')
      … ||drafted.size>=4 …   (the class rule excused once four classes were drafted)
    — true only of the five-hero pool of four classes, where the offers shrank to two then one. The rule, as ruled: three
    at every draft, and no class twice until all SIX are drafted (2026-09-28). */
 let lastOffer=null
 function draft(label){
  assert.ok(shown('campaign'),label+': the draft is shown');assert.equal(camp().cursor.step,'draft',label+': the cursor is at the draft')
  const opts=byId('campaign').querySelectorAll('[data-act=draft]')
  assert.equal(opts.length,3,label+': three offered')
  assert.equal(new Set(opts.map(o=>o.dataset.id)).size,3,label+': three different heroes')
  for(const o of opts)assert.ok(POOL.some(h=>h.id===o.dataset.id),`${label}: ${o.dataset.id} is a base hero of the pool`)
  const leftOut=byId('campaign').querySelectorAll('[data-unkitted]').map(el=>el.dataset.unkitted)
  assert.deepEqual(leftOut,LEFT_OUT.map(h=>h.id),label+': the base heroes with no kit are named on the draft, and nobody else')
  for(const h of LEFT_OUT)assert.ok(byId('campaign').textContent.includes(h.name),`${label}: ${h.name} is named as left out`)
  const drafted=new Set(Object.values(camp().roster).flatMap(h=>h.classes).filter(c=>c!=='class.civilian'))
  for(const o of opts){assert.ok(!(o.dataset.classes??'').split(',').some(c=>drafted.has(c))||HERO_CLASSES.every(c=>drafted.has(c)),`${label}: ${o.dataset.id} is of a class not yet drafted`);assert.doesNotMatch(o.textContent,/\d+\s*(health|accuracy|strength)/i,label+': stat-less')}
  const pick=opts.find(o=>(o.dataset.classes??'').split(',').some(c=>TAKERS.includes(c)))??opts[0]
  lastOffer={label,ids:opts.map(o=>o.dataset.id),classes:opts.flatMap(o=>(o.dataset.classes??'').split(',')),took:pick.dataset.id,leftOut}
  v.click('draft',pick.dataset.id)
  return pick.dataset.id
 }

 /* the Equip step: the deployed party, fitted, then To the battle */
 function equipThenFight(party,label){
  assert.ok(shown('campaign'),label+': Equip is shown');assert.equal(camp().cursor.prepStep,'equip',label+': the cursor is at Equip')
  assert.deepEqual([...camp().cursor.engagement.deployed].sort(),party,label+': the whole party is sent')
  assert.equal(byId('campaign').querySelectorAll('.herocard').length,party.length,label+': a card per hero sent')
  v.click('advance');settle()
  return onTheBattle(label)
 }
 /* the battle on its own screen, fielded as the cursor's encounter with the campaign's own Hero rows */
 function onTheBattle(label){
  assert.ok(!shown('campaign')&&!shown('conquest'),label+': the battle is its own screen')
  const s=handle.session,e=camp().cursor.engagement
  assert.equal(s.config.encounterId,e.id,label+': the encounter is fielded');assert.deepEqual(s.config.heroes,e.deployed,label+': with the deployed heroes')
  assert.deepEqual(s.config.heroRows,e.deployed.map(id=>camp().roster[id]),label+': as the campaign\'s own Hero rows')
  return s
 }

 /* settle the battle on the page, then the reckoning: the recap, its Continue */
 function fightOut(won,label,hows=[won?'ai':'idle'],how={}){
  const e=camp().cursor.engagement,{save,result,how:played,seed}=playedOut(handle.session.config,won,hows,how)
  w.document.getElementById('transferText').value=save;v.click('import');settle()
  assert.equal(handle.session.ctx.state.outcome==='heroClear',won,label+': the battle ends '+(won?'won':'lost'))
  assert.ok(!shown('conquest'),label+': the outcome stands on the battle');assert.equal(byId('commands').querySelectorAll('[data-act=reckon]').length,1,label+': the outcome offers the reckoning')
  v.click('reckon');wait(2500)
  assert.ok(shown('campaign'),label+': the recap is shown');const recap=byId('campaign').querySelector('.recap')
  assert.ok(recap,label+': the recap');assert.equal(recap.dataset.won,String(won),label+': the recap says '+(won?'won':'lost'))
  v.click('exit');wait(100)
  return {e,result,played,seed}
 }

 /* every LEVEL UP the rewards page offers, through the level-up sheet; the specialty chosen where one is owed */
 function levelUps(label){
  for(let guard=0;guard<12;guard++){
   const b=byId('campaign').querySelectorAll('[data-act=level-hero]')[0];if(!b)break
   const id=b.dataset.id,before=camp().roster[id].level
   v.click('level-hero',id);wait(1600)
   const sheet=byId('campaign').querySelector('.levelup');assert.ok(sheet,`${label}: ${id}'s level-up sheet`)
   assert.equal(sheet.querySelectorAll('[data-act=lu-decline-specialty]').length,0,`${label}: no level without a specialty here — the engine fields no level-2 hero without one`)
   const over=byId('lu-specialty'),pick=byId('lu-pick')
   /* the specialty owed at the first level-up, then a level's pick, each chosen and confirmed; else the hero is clicked */
   if(over){const card=over.querySelectorAll('.choice-card')[0];fire(over,'click',card);fire(byId('lu-specialty-confirm'),'click');wait(500)}
   if(pick){const card=pick.querySelectorAll('.choice-card')[0];fire(pick,'click',card);fire(byId('lu-pick-confirm'),'click')}
   if(!over&&!pick)fire(byId('lu-card'),'click')
   wait(4000)
   assert.equal(camp().roster[id].level,before+1,`${label}: ${id} levels`)
   if(over)assert.ok(camp().roster[id].specialty,`${label}: ${id} holds a specialty`)
   fire(byId('lu-continue'),'click');wait(300)
   assert.ok(byId('campaign').querySelector('.rewards'),`${label}: back on the rewards page`)
  }
  assert.equal(camp().cursor.step==='levelUp'||camp().cursor.step==='open',true,label+': nothing left but to go on')
  if(camp().cursor.step==='levelUp')v.click('exit')
  wait(100)
 }

 /* take a reward card: flip it, choose it, confirm; a named-class item asks who carries it */
 function takeReward(index,label){
  const row=byId('rw-row'),card=row.querySelectorAll('.reward-card')[index]
  assert.ok(card,label+': a reward card to take')
  fire(row,'click',card);wait(1500);fire(row,'click',card);fire(byId('rw-confirm'),'click');wait(300)
  return card.dataset.id
 }

 return {get lastOffer(){return lastOffer},v,w,root,handle,store:v.store,camp,byId,shown,heroIds,civilianIds,settle,wait,readMap,draft,equipThenFight,onTheBattle,fightOut,levelUps,takeReward}
}
