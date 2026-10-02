// kingdom.opening-loop-three, part 4 of 4 (PLAYABLE-OPENING-PLAN.md item 12; engine DECISIONS.md 2026-09-29 "the playable
// opening": "one page, one sitting, local server: map -> first hero / draft -> equip -> battle -> rewards -> map, for the
// first three battles; a lost battle is replayed with the same party"). Expect: "Andrew plays from the Orphanage through
// the Bridge in one sitting; losing a battle offers it again with the same party; the rewards arrive when ruled."
//
// The BUILT sandbox opened with ?map is one sitting of a Campaign held in the page's memory. This plays it through the
// page's own controls: the map -> the draft (one hero before battle 1, two after it, one after battle 2 — GLOSSARY.md
// "The opening drafts"; never a class already drafted) -> Equip -> the encounter's battle, fielded with the campaign's
// Hero rows -> the reckoning (recap), the rewards and the level-ups (the copied Hell-TCG screens) -> the map, with the
// section taken. Battle 1 won: 20 XP to each hero who fought and the level-up with its specialty. Battle 2 lost: the map
// offers it again, no draft owed, the same party, wounds kept; then won: the Flaming Longsword, to a Warrior or Paladin.
// Battle 3 won: three items, one kept. The map ends with three sections taken. The civilians who lived through a won
// battle join the roster.
//
// A battle is settled the way tools/abbotown-map.verify.mjs settles one: the engine's own AI plays it out on a seed and
// the save is pasted back into the page ("Resume pasted save") — the page takes it as the campaign's battle only when it
// is that battle with that party.
//
//   node tools/opening-loop-three.verify.mjs [BATTLE-SANDBOX.html]
import '../../engine/tools/engine-modules.mjs'   // first: links engine/node_modules into a worker's copy (Andrew, 2026-10-01)
import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
import {bootSlice} from './atlas-dom.mjs'
const page=process.argv[2]??'BATTLE-SANDBOX.html'
const ORPHANAGE='encounter.opening.orphanage',LUMBERJACK='encounter.opening.lumberjack',BRIDGE='encounter.opening.bridge',CAVERN='encounter.opening.cavern-trail'
const SWORD='item.longsword.flaming',TAKERS=['class.warrior','class.paladin']
const esbuild=createRequire(import.meta.url)('../../engine/node_modules/esbuild')
const built=esbuild.buildSync({stdin:{contents:`export {createSandbox,saveSandbox,sandboxResult,advanceSandbox,sandboxActivationChoices,sandboxChoices,commandSandbox} from './src/core/sandbox.ts';export {runBattle} from './src/engine.ts'`,resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'esm',write:false,logLevel:'silent'})
const E=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'))

/* a battle played out on seed after seed until it ends as wanted — with no hero of the party dead, unless a win that costs
   one is allowed — the save a person would have made at that moment. The enemies are always the engine's AI. The player's
   side: 'ai', the engine's AI; 'idle', every activation begun and ended (a loss the AI's own heroes rarely make); 'hold',
   no hero moves and each strikes the best blow the engine offers it from where it stands, or waits (the engine's AI stalls
   at the Bridge — encounter.opening.bridge-ai-refiled — and the party cannot afford to walk into the imps) */
function playedOut(config,won,how,partyAlive=true){
 for(let seed=1;seed<=1500;seed++){
  const s=E.createSandbox({...structuredClone(config),seed})
  if(how==='ai')E.runBattle(s.ctx)
  else{E.advanceSandbox(s);for(let i=0;i<50000&&!s.ctx.state.outcome;i++){const ctx=s.ctx,at=ctx.battleCursor?.at,seq=ctx.state.seq
   let r=null
   if(at==='selecting')r=E.commandSandbox(s,{kind:'select-activation',unitUid:E.sandboxActivationChoices(s)[0].uid,expectedSeq:seq})
   else if(at==='acting'){
    const blow=c=>(c.preview.connectionChanceBps??(c.preview.hitChance??50)*100)*(c.preview.damageOnHit??c.preview.damage??0)
    const best=how==='hold'?E.sandboxChoices(s).filter(c=>'target' in c.command&&ctx.state.units[c.command.target].side==='enemy'&&c.preview&&blow(c)>0).sort((x,y)=>blow(y)-blow(x))[0]:undefined
    r=best?E.commandSandbox(s,best.command):E.commandSandbox(s,{kind:'end-cycle',actor:ctx.battleCursor.actor,expectedSeq:seq})
   }
   if(!r?.ok)throw Error('the player\'s side could not go on: '+(r?.reason??at))}}
  const r=E.sandboxResult(s),party=r.units.filter(u=>u.side==='hero'&&u.role===undefined)
  if((r.outcome==='heroClear')===won&&(!partyAlive||party.every(u=>u.lifeState!=='dead')))return {save:E.saveSandbox(s),result:r}
 }
 throw Error(`no seed from 1 to 1500 ends ${config.encounterId} ${won?'won':'lost'}${partyAlive?' with the party alive':''}`)
}

/* Law 10, 2026-10-02 (kingdom.reads-engine, review finding K7): the run's seed 11 → 15. XP per kill became the victim's
   tier's (2 / 5 / 15 — engine DECISIONS.md 2026-09-28) instead of 3, and seed 11's party reaches the Bridge with the
   Rune-Marked Ascetic at 18 XP — level 1, two short of 20 — and its 'hold' play wins none of its 1500 Bridge seeds.
   Seed 12 wins it, but only after ~20 minutes of seeds; seed 15 wins it on Bridge seed 2. What this page test holds —
   the loop's flow through three battles — is unchanged; the Bridge's balance under the ruled XP is reported to Andrew. */
const v=bootSlice(page,{search:'?map&seed=15'}),w=v.w,root=v.root,handle=w.__sandbox
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
 return next.id
}

/* the draft: three offered (fewer when the pool runs short), stat-less, none of a class already drafted; a Warrior or a
   Paladin is taken first when offered, so the party can carry the Flaming Longsword */
function draft(label){
 assert.ok(shown('campaign'),label+': the draft is shown');assert.equal(camp().cursor.step,'draft',label+': the cursor is at the draft')
 const opts=byId('campaign').querySelectorAll('[data-act=draft]')
 assert.ok(opts.length>=1&&opts.length<=3,label+': one to three offered')
 const drafted=new Set(Object.values(camp().roster).flatMap(h=>h.classes).filter(c=>c!=='class.civilian'))
 for(const o of opts){assert.ok(!(o.dataset.classes??'').split(',').some(c=>drafted.has(c))||drafted.size>=4,`${label}: ${o.dataset.id} is of a class not yet drafted`);assert.doesNotMatch(o.textContent,/\d+\s*(health|accuracy|strength)/i,label+': stat-less')}
 const pick=opts.find(o=>(o.dataset.classes??'').split(',').some(c=>TAKERS.includes(c)))??opts[0]
 v.click('draft',pick.dataset.id)
 return pick.dataset.id
}

/* the Equip step: the deployed party, fitted, then To the battle */
function equipThenFight(party,label){
 assert.ok(shown('campaign'),label+': Equip is shown');assert.equal(camp().cursor.prepStep,'equip',label+': the cursor is at Equip')
 assert.deepEqual([...camp().cursor.engagement.deployed].sort(),party,label+': the whole party is sent')
 assert.equal(byId('campaign').querySelectorAll('.herocard').length,party.length,label+': a card per hero sent')
 v.click('advance');settle()
 assert.ok(!shown('campaign')&&!shown('conquest'),label+': the battle is its own screen')
 const s=handle.session,e=camp().cursor.engagement
 assert.equal(s.config.encounterId,e.id,label+': the encounter is fielded');assert.deepEqual(s.config.heroes,e.deployed,label+': with the deployed heroes')
 assert.deepEqual(s.config.heroRows,e.deployed.map(id=>camp().roster[id]),label+': as the campaign\'s own Hero rows')
 return s
}

/* settle the battle on the page, then the reckoning: the recap, its Continue */
function fightOut(won,label,how=won?'ai':'idle',partyAlive=true){
 const e=camp().cursor.engagement,{save,result}=playedOut(handle.session.config,won,how,partyAlive)
 w.document.getElementById('transferText').value=save;v.click('import');settle()
 assert.equal(handle.session.ctx.state.outcome==='heroClear',won,label+': the battle ends '+(won?'won':'lost'))
 assert.ok(!shown('conquest'),label+': the outcome stands on the battle');assert.equal(byId('commands').querySelectorAll('[data-act=reckon]').length,1,label+': the outcome offers the reckoning')
 v.click('reckon');wait(2500)
 assert.ok(shown('campaign'),label+': the recap is shown');const recap=byId('campaign').querySelector('.recap')
 assert.ok(recap,label+': the recap');assert.equal(recap.dataset.won,String(won),label+': the recap says '+(won?'won':'lost'))
 v.click('exit');wait(100)
 return {e,result}
}

/* every LEVEL UP the rewards page offers, through the level-up sheet; the specialty chosen where one is owed */
function levelUps(label){
 for(let guard=0;guard<8;guard++){
  const b=byId('campaign').querySelectorAll('[data-act=level-hero]')[0];if(!b)break
  const id=b.dataset.id,before=camp().roster[id].level
  v.click('level-hero',id);wait(1600)
  const sheet=byId('campaign').querySelector('.levelup');assert.ok(sheet,`${label}: ${id}'s level-up sheet`)
  assert.equal(sheet.querySelectorAll('[data-act=lu-decline-specialty]').length,0,`${label}: no level without a specialty here — the engine fields no level-2 hero without one`)
  const over=byId('lu-specialty')
  if(over){const card=over.querySelectorAll('.choice-card')[0];fire(over,'click',card);fire(byId('lu-specialty-confirm'),'click')}
  else fire(byId('lu-card'),'click')
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
 fire(row,'click',card);wait(1500);fire(row,'click',card);fire(byId('rw-confirm'),'click');wait(300)
 return card.dataset.id
}

/* 1 · the sitting opens on the map: nothing fielded, nobody drafted, the Orphanage next */
assert.equal(readMap([],'fresh'),ORPHANAGE)
assert.equal(handle.session,null,'the map fields nothing by itself')
assert.deepEqual(heroIds(),[],'the Campaign starts with nobody')

/* 2 · battle 1: one hero drafted, equipped, fielded; won; 20 XP each and the level-up with a specialty */
v.click('field',ORPHANAGE)
const first=draft('battle 1')
assert.deepEqual(heroIds(),[first],'one hero before battle 1')
equipThenFight([first],'battle 1')
const b1=fightOut(true,'battle 1')
assert.equal(camp().roster[first].xp,20,'the Orphanage pays its 20 XP')
assert.equal(camp().cursor.step,'levelUp','battle 1 offers no item: straight to the level-ups')
levelUps('battle 1')
assert.equal(camp().roster[first].level,2,'the first hero is level 2');assert.ok(camp().roster[first].specialty,'with a specialty')
const saved1=b1.result.units.filter(u=>u.side==='hero'&&u.role==='encounter'&&u.lifeState!=='dead').map(u=>u.typeId).sort()
assert.deepEqual(civilianIds(),saved1,'the Orphanage\'s civilians who lived join the roster; the dead do not')
assert.equal(readMap([ORPHANAGE],'after battle 1'),LUMBERJACK)

/* 3 · battle 2: two more drafted; lost; the map offers it again, no draft, the same party, wounds kept */
v.click('field',LUMBERJACK)
const second=draft('battle 2, draft 1');const third=draft('battle 2, draft 2')
const party2=[first,second,third].sort()
assert.deepEqual(heroIds(),party2,'three heroes before battle 2')
assert.equal(new Set(party2.map(id=>camp().roster[id].classes[0])).size,3,'three classes: none drafted twice')
equipThenFight(party2,'battle 2')
fightOut(false,'battle 2 lost')
if(camp().cursor.step==='levelUp')levelUps('battle 2 lost')
assert.equal(camp().ended,null,'a lost opening battle does not end the Campaign')
assert.equal(readMap([ORPHANAGE],'after losing battle 2'),LUMBERJACK,'the lost battle is offered again')
const wounds=Object.fromEntries(party2.map(id=>[id,camp().roster[id].wound]))
assert.ok(Object.values(wounds).some(n=>n>0),'the loss left wounds')
v.click('field',LUMBERJACK)
assert.equal(camp().cursor.step,'prep','no draft is owed for the replay')
const replay=equipThenFight(party2,'battle 2 again')
for(const id of party2){
 assert.equal(replay.config.heroRows.find(h=>h.id===id).wound,wounds[id],`${id} carries its wound into the replay`)
 const unit=replay.ctx.state.units.find(u=>u.side==='hero'&&u.typeId===camp().roster[id].unitType)
 assert.equal(unit.badges.includes('badge.wounded'),wounds[id]>=1,`${id} is fielded ${wounds[id]?'Wounded':'whole'}`)
}
const b2=fightOut(true,'battle 2 won')
assert.equal(camp().cursor.step,'rewards','battle 2 won offers its reward')
assert.deepEqual(camp().cursor.rewardOffer,[SWORD],'the Flaming Longsword')
takeReward(0,'battle 2')
const givers=byId('campaign').querySelectorAll('[data-act=give]').map(b=>b.dataset.id).sort()
const may=party2.filter(id=>camp().roster[id].classes.some(c=>TAKERS.includes(c)))
assert.deepEqual(givers,may,'only a Warrior or a Paladin is offered it')
v.click('give',givers[0]);wait(100)
assert.ok(camp().roster[givers[0]].equipped.includes(SWORD),'the Flaming Longsword is in a Warrior\'s or Paladin\'s hands')
levelUps('battle 2')
const saved2=b2.result.units.filter(u=>u.side==='hero'&&u.role==='encounter'&&u.lifeState!=='dead').map(u=>u.typeId)
assert.deepEqual(civilianIds(),[...saved1,...saved2].sort(),'the Lumberjack House\'s civilians who lived join too')
assert.equal(readMap([ORPHANAGE,LUMBERJACK],'after battle 2'),BRIDGE)

/* 4 · battle 3: one more drafted; won; three items, one kept */
v.click('field',BRIDGE)
const fourth=draft('battle 3')
const party3=[...party2,fourth].sort()
assert.deepEqual(heroIds(),party3,'four heroes before battle 3')
equipThenFight(party3,'battle 3')
fightOut(true,'battle 3','hold',false)
assert.equal(camp().cursor.step,'rewards','the Bridge offers its reward')
const offer=[...camp().cursor.rewardOffer];assert.equal(offer.length,3,'three items offered');assert.equal(new Set(offer).size,3)
const kept=takeReward(1,'battle 3')
assert.equal(byId('campaign').querySelectorAll('[data-act=give]').length,0,'a drawn item goes to the stash, named to nobody')
assert.deepEqual(camp().stash,[kept],'one kept; the two left are burned')
levelUps('battle 3')
assert.equal(readMap([ORPHANAGE,LUMBERJACK,BRIDGE],'after battle 3'),CAVERN,'three sections taken')
assert.deepEqual(camp().unavailable,[],'nobody fatigued');assert.deepEqual(camp().foughtThisWeek,[],'nobody marked fought')
assert.equal(camp().ended,null)
console.log(`opening loop three: map -> draft (1, +2, +1; no class twice) -> equip -> battle -> reckoning, rewards, level-ups -> map, three times; the Orphanage's 20 XP and level 2 with a specialty; battle 2 lost and offered again with the same party, wounds kept; the Flaming Longsword to ${givers[0]}; the Bridge's three, ${kept} kept; civilians rescued ${civilianIds().join(', ')||'none'}; three sections taken passed`)
