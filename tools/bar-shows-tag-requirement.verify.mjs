// viewer.bar-shows-tag-requirement (engine backlog, 2026-10-04; engine DECISIONS.md 2026-10-04 'after the backlog run: ... a
// trigger on the hero with a tag requirement ...', Andrew: "it only triggers when you're using something that has the tag
// melee"). The item's expect, on the BUILT sandbox (BATTLE-SANDBOX.html?play=encounter.opening.orphanage&heroes=
// hero.base.ranger-nature - the Ranger whose own kit is the Shortbow): "For a hero with Burning Touch holding a Shortbow, the
// bar's line for the bow shot lists no Burn and the line for Punch lists 'On hit: apply 1 Burn'; the panel's line for Burning
// Touch says 'only with a melee attack'".
//   1. The page hands its battle screen the engine's answers: the mounted viewer's table of which actions carry each tag a
//      trigger requires is the dump's (../viewer/generated/static.json tagCarriers - the engine's carriesTag, action by action).
//   2. The Ranger's bar as the game fields her: no Burn on anything.
//   3. The sandbox equips nobody, so the Burning Touch is put in the VIEWER's record of what she holds (the row the fold
//      keeps from unit.equipped) and the screen is drawn again - a check of what the built page DRAWS for a bearer; the
//      engine's battle is not changed and nothing is played after it. The item's own row (static.json items) brings the
//      trigger, requirement and all.
// Prints one line per reading and `bar-shows-tag-requirement: ... passed`.
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {bootSlice} from './atlas-dom.mjs'
const RANGER='hero.base.ranger-nature',TOUCH='item.rune-burning-touch',PUNCH='attack.punch'
const STATIC=JSON.parse(readFileSync('../viewer/generated/static.json','utf8'))
const {w}=bootSlice(process.argv[2]??'BATTLE-SANDBOX.html',{search:'?play=encounter.opening.orphanage&heroes='+RANGER}),h=w.__sandbox
const V=()=>h.viewer._V,ctx=()=>h.session.ctx,unit=id=>ctx().state.units[id]
const say=(...a)=>console.log('  '+a.join(' '))
const settle=()=>{for(let i=0;i<8000&&(h.busy||i<3);i++)w._flush(20);assert.equal(h.busy,false,'the board settles');assert.equal(h.fault,'','no fault')}
const text=x=>String(x??'').replace(/<[^>]*>/g,' ').replace(/&#39;/g,"'").replace(/&quot;/g,'"').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&').replace(/\s+/g,' ')
const rows=()=>V().dom.actionbar.querySelectorAll('.acRow').filter(r=>r.dataset.act)
const tips=()=>Object.fromEntries(rows().map(r=>[r.dataset.act,text(r.getAttribute('title'))]))
const chips=()=>Object.fromEntries(rows().map(r=>[r.dataset.act,r.querySelectorAll('.acTrg').map(x=>text(x.textContent).trim())]))
const triggerRows=()=>{const p=V().dom.panel.innerHTML,at=p.indexOf('Triggers');return at<0?'':text(p.slice(at))}
settle()
// 1. the table
assert.ok(STATIC.tagCarriers&&STATIC.tagCarriers.melee&&STATIC.tagCarriers.melee.length>0,'the dump carries the engine\'s answers (viewer: npm run static)')
assert.deepEqual(JSON.parse(JSON.stringify(V().data.TAG_CARRIERS)),STATIC.tagCarriers,'the sandbox hands its battle screen the dump\'s table (tools/battle-view-assets.mjs)')
say(`the battle screen holds the engine's answers for ${Object.keys(STATIC.tagCarriers).join(', ')}`)
// the Ranger acts: End Activation, as the player does, until it is her bar
let u=null
for(let turn=0;turn<12;turn++){
 const c=ctx().battleCursor;assert.equal(c.at,'acting','a player unit is acting')
 if(unit(c.actor).typeId===RANGER){u=unit(c.actor);break}
 V().dom.root.querySelector('#playEndAct').handlers.click({});settle()
}
assert.ok(u,'the Ranger is fielded and comes to act');assert.equal(V().play.actor,u.id)
const SHOTS=STATIC.items['item.shortbow'].grants
for(const id of [...SHOTS,PUNCH])assert.ok(u.actions.includes(id),`the engine: she holds ${id}`)
assert.ok(!u.triggers.some(t=>t.onlyWithTag!==undefined),'the engine: as fielded she carries no tag requirement')
// 2. as fielded
const before=tips()
assert.deepEqual(Object.keys(before).sort(),[...new Set(u.actions)].sort(),'the bar\'s buttons are the engine\'s list of her actions')
for(const [id,tip] of Object.entries(before))assert.ok(!/Burn/.test(tip),`${id} says no Burn: "${tip}"`)
say(`${u.name}: ${Object.keys(before).length} buttons, no Burn on any`)
// 3. the Burning Touch in the viewer's record of what she holds
const touch=STATIC.items[TOUCH];assert.deepEqual(touch.triggers.map(t=>[t.hook,t.onlyWithTag,t.effect.statusId,t.effect.value]),[['onHit','melee','status.burn',1]],'the item\'s own row')
const mine=V().S.U[u.id];assert.ok(mine&&mine.kit&&Array.isArray(mine.kit.held),'the viewer\'s record of the unit')
mine.kit.held.push({instanceId:null,itemId:TOUCH,grants:[...touch.grants],abilities:[...touch.abilities]})
h.viewer.inspect(u.id)
const after=tips(),chip=chips()
for(const shot of SHOTS){
 assert.ok(!STATIC.tagCarriers.melee.includes(shot),`the engine: ${shot} does not carry melee`)
 assert.ok(!/Burn/.test(after[shot]),`the bow shot lists no Burn: "${after[shot]}"`);assert.equal(after[shot],before[shot],shot+' reads as it did');assert.deepEqual(chip[shot],[],shot+' wears no chip')
}
assert.ok(STATIC.tagCarriers.melee.includes(PUNCH),'the engine: the Punch carries melee')
assert.match(after[PUNCH],/(^| )On hit: apply 1 Burn( |$)/,`the Punch: "${after[PUNCH]}"`);assert.ok(chip[PUNCH].some(x=>/^Burn\s*1$/.test(x)),'the Punch\'s button wears a Burn 1 chip: '+chip[PUNCH].join(' | '))
for(const id of Object.keys(after))if(id!==PUNCH)assert.equal(after[id],before[id],id+' reads as it did')
say(`with the Burning Touch: ${SHOTS.length} bow shots list no Burn; the Punch reads "On hit: apply 1 Burn"`)
assert.match(triggerRows(),/ON HIT Burn 1 · only with a melee attack( |$)/,triggerRows())
say('the panel: "Burn 1 · only with a melee attack"')
assert.equal(h.fault,'','no fault')
console.log(`bar-shows-tag-requirement: the built sandbox (the Orphanage, ${u.name}), the expect line passed`)
