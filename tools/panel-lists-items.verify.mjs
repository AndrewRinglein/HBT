// viewer.panel-lists-items (engine DECISIONS.md 2026-10-03 'the civilians show on the victory screen; the specialty three are
// random; the battle's unit panel lists what the unit is equipped with', Andrew: "This priest only has a verse attack. It seems
// like he has nothing in his hands. I don't understand what he's equipped with. We need the items listed under the characters on
// the right in battle."). The item's expect, on the BUILT sandbox (BATTLE-SANDBOX.html?play=encounter.opening.orphanage): "with
// the Battle Chaplain, clicking him shows 'Holy Texts' in his items on the right panel with what it grants (Verse); a hero
// holding a weapon and a shield shows both hands, its armor and its slots; an empty hand reads as empty; a page test reads the
// panel's items against the unit's fielded loadout for three different heroes." The panel is read against the ENGINE's own
// state — the unit's loadout (hands, stowed, worn), each item's row (ctx.items) and the actions it grants (ctx.actions) — for
// every unit on the player's side, and after a swap made on the board. Prints one line per unit and `panel-lists-items: … passed`.
import assert from 'node:assert/strict'
import {bootSlice} from './atlas-dom.mjs'
const {w}=bootSlice(process.argv[2]??'BATTLE-SANDBOX.html',{search:'?play=encounter.opening.orphanage'}),h=w.__sandbox
const V=()=>h.viewer._V,ctx=()=>h.session.ctx,unit=id=>ctx().state.units[id]
const say=(...a)=>console.log('  '+a.join(' '))
const settle=()=>{for(let i=0;i<8000&&(h.busy||i<3);i++)w._flush(20);assert.equal(h.busy,false,'the board settles');assert.equal(h.fault,'','no fault')}
/** click the unit's body: it is shown in the right-hand panel */
const look=id=>{V().layers.UEL.get(id).img.handlers.click({detail:1});settle();assert.equal(V().view.inspectId,id)}
/** the page test's DOM hands text back as written; a browser shows the characters (an apostrophe in a name) */
const text=x=>String(x??'').replace(/&#39;/g,"'").replace(/&quot;/g,'"').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&')
const rows=()=>V().dom.panel.querySelectorAll('.pItem').map(r=>({slot:r.dataset.slot,item:r.dataset.item||null,name:text(r.querySelector('.pItemName')?.textContent),gives:text(r.querySelector('.pItemGives')?.textContent),title:text(r.getAttribute('title'))}))
const of=(rs,...slots)=>rs.filter(r=>slots.includes(r.slot))
const item=id=>ctx().items[id],action=id=>ctx().actions[id]
/** the panel's items against the engine's loadout for one unit */
function reads(id){
 const u=unit(id),L=u.loadout;assert.ok(L,`${u.name} carries items`)
 look(id)
 assert.ok(V().dom.panel.innerHTML.includes(u.name));assert.ok(V().dom.panel.querySelector('.pItems'),`${u.name}: the items section under the character`)
 const rs=rows(),held=of(rs,'hand','both-hands')
 // the hands: the engine's, by name, in order; a hand nothing fills reads as empty
 assert.deepEqual(held.filter(r=>r.item).map(r=>[r.item,r.name]),L.hands.map(i=>[i.itemId,item(i.itemId).name]),`${u.name}: its hands`)
 const taken=L.hands.reduce((n,i)=>n+item(i.itemId).hands,0),empty=held.filter(r=>!r.item)
 assert.equal(empty.length,2-taken,`${u.name}: ${2-taken} hand(s) empty`);for(const r of empty)assert.equal(r.name,'empty')
 for(const i of L.hands){const r=held.find(x=>x.item===i.itemId),row=item(i.itemId)
  assert.equal(r.slot,row.hands===2?'both-hands':'hand',`${row.name}: ${row.hands} hand(s)`)
  for(const g of [...row.grants,...row.abilities])assert.ok(r.gives.includes(action(g).name),`${row.name} grants ${action(g).name}: "${r.gives}"`)
  assert.ok(r.title.includes(row.name),'and on hover')}
 // armor and item slots: the engine's worn items, by class; none says so
 const worn=(L.worn??[]).map(i=>i.itemId),armor=worn.filter(x=>item(x).itemClass==='armor'),other=worn.filter(x=>item(x).itemClass!=='armor')
 assert.deepEqual(of(rs,'armor').map(r=>[r.item,r.name]),armor.length?armor.map(x=>[x,item(x).name]):[[null,'none']],`${u.name}: its armor`)
 assert.deepEqual(of(rs,'slot').map(r=>[r.item,r.name]),other.length?other.map(x=>[x,item(x).name]):[[null,'empty']],`${u.name}: its item slots`)
 // stowed: what the swap could bring to hand
 assert.deepEqual(of(rs,'stowed').map(r=>[r.item,r.name]),L.stowed.length?L.stowed.map(i=>[i.itemId,item(i.itemId).name]):[[null,'nothing']],`${u.name}: what is stowed`)
 say(`${u.name}: ${rs.map(r=>`${r.slot} ${r.name}${r.gives?' ('+r.gives+')':''}`).join(' | ')}`)
 return rs
}

settle()
const heroes=ctx().state.units.filter(u=>u.side==='hero'&&u.lifeState==='standing').map(u=>u.id)
const real=heroes.filter(id=>!/orphan|teacher/.test(unit(id).typeId)),civs=heroes.filter(id=>/orphan|teacher/.test(unit(id).typeId))
assert.ok(real.length>=3,'three different heroes');assert.equal(new Set(real.map(id=>unit(id).typeId)).size,real.length)
// 1. three different heroes, read against the engine's loadout
const seen=Object.fromEntries(real.map(id=>[id,reads(id)]))
// 2. the Battle Chaplain: Holy Texts, with what it grants (Verse)
const chaplain=real.find(id=>unit(id).loadout.hands.some(i=>i.itemId==='item.holy-texts'))
assert.ok(chaplain!==undefined,'the Battle Chaplain is fielded');assert.match(unit(chaplain).name,/Chaplain/)
const texts=seen[chaplain].find(r=>r.item==='item.holy-texts')
assert.equal(texts.name,'Holy Texts');assert.match(texts.gives,/Verse/)
say(`the Battle Chaplain's items name Holy Texts, which grants ${texts.gives}`)
// 3. a hero holding a weapon and a shield shows both hands
const both=real.find(id=>{const k=unit(id).loadout.hands.map(i=>item(i.itemId).itemClass);return k.includes('weapon')&&k.includes('shield')})
assert.ok(both!==undefined,'a hero holds a weapon and a shield');assert.equal(of(seen[both],'hand').filter(r=>r.item).length,2,'both hands are named')
assert.equal(of(seen[both],'armor').length>0&&of(seen[both],'slot').length>0,true,'with its armor and its slots')
// 4. the civilians: a dagger in one hand, the other reads as empty
for(const id of civs){const rs=reads(id);assert.deepEqual(of(rs,'hand').map(r=>r.name),[item(unit(id).loadout.hands[0].itemId).name,'empty'])}
// 5. an enemy that carries nothing has no items section
const zombie=ctx().state.units.find(u=>u.side==='enemy'&&!u.loadout)
look(zombie.id);assert.equal(V().dom.panel.querySelector('.pItems'),null,`${zombie.name} carries nothing: no items section`)
// 6. after a swap on the board the panel follows the engine: the hand put away is empty, the item is stowed
const actor=ctx().battleCursor.actor,before=unit(actor).loadout.hands.map(i=>i.itemId)
const sw=V().play.swap;assert.ok(sw&&sw.choices.length,'the acting hero may swap')
const pick=sw.choices.findIndex(c=>c.label==='Nothing in hand');assert.ok(pick>=0)
V().offerPlay({kind:'swap',index:pick,unit:actor});settle()
assert.deepEqual(unit(actor).loadout.hands,[],'the engine: nothing in hand');assert.deepEqual(unit(actor).loadout.stowed.map(i=>i.itemId).sort(),[...before].sort())
const after=reads(actor)
assert.deepEqual(of(after,'hand').map(r=>r.name),['empty','empty'],'both hands read as empty')
say(`after the swap ${unit(actor).name}'s hands read empty and ${of(after,'stowed').map(r=>r.name).join(', ')} stowed`)
console.log('panel-lists-items: the Orphanage on the built sandbox, the expect line passed')
