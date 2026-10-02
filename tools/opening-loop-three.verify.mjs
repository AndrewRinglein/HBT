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
// The page's steps are tools/opening-page.mjs's (kingdom.opening-run-six moved them there, one copy for this and
// tools/opening-run-six.verify.mjs).
//
//   node tools/opening-loop-three.verify.mjs [BATTLE-SANDBOX.html]
import assert from 'node:assert/strict'
import {openingPage,TAKERS} from './opening-page.mjs'
const page=process.argv[2]??'BATTLE-SANDBOX.html'
const ORPHANAGE='encounter.opening.orphanage',LUMBERJACK='encounter.opening.lumberjack',BRIDGE='encounter.opening.bridge',CAVERN='encounter.opening.cavern-trail'
const SWORD='item.longsword.flaming'

const {handle,camp,byId,heroIds,civilianIds,wait,readMap,draft,equipThenFight,fightOut,levelUps,takeReward,v}=openingPage(page,'?map&seed=11')

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
fightOut(true,'battle 3',['hold'],{partyAlive:false})
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
