// viewer.item-card-in-battle — ruled 2026-10-05 (Andrew, engine DECISIONS.md 'playtest post: notices, target lines, item cards,
// …': "When you're selecting items in the equipment phase, you need to be able to look at your items somehow. You need to be
// able to click on them, and then they pop up somewhere on the screen, to the right or somewhere, as a card with a
// description.   We also need to be able to do something similar. When you're focusing on a character, you need to be able to
// look at their items when you're in battle.").
//
// On the BUILT battle screen (the page PLAY.html opens: BATTLE-SANDBOX.html?play=encounter.opening.orphanage, fielding the
// Priest who carries the Holy Symbol): the Priest is the one in the panel; 'Holy Symbol' in its panel's Items is clicked — a
// card stands beside the panel, ONE card, that item's, and it says what the sources' own card for the item says (its name,
// kind and tier, what it gives, 'Wrath' and 'Heal' each with its lines, its line of what it is, its card art) — the same
// function, and the same checks, the Equip screen's card is held to (tools/equip-item-card.verify.mjs); the same name again
// closes it; another item replaces it; a click away closes it; another unit in the panel closes it. Looking changes nothing:
// the battle is where it was. An enemy's panel lists no item today (no enemy kind carries one), so there is no name to click
// there — said, not skipped silently.
//
//   node tools/item-card-in-battle.verify.mjs [BATTLE-SANDBOX.html]
import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
import {readFileSync} from 'node:fs'
import {bootSlice} from './atlas-dom.mjs'
const page=process.argv[2]??'BATTLE-SANDBOX.html',PRIEST='hero.base.priest-robes',SYMBOL='item.holy-symbol'
const say=(...a)=>console.log('  '+a.join(' '))
/* the sources' own card for an item — what the page's card is held to */
const esbuild=createRequire(import.meta.url)('../../engine/node_modules/esbuild')
const built=esbuild.buildSync({stdin:{contents:`export {itemCardOf} from './src/content/item-card.ts'`,resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'esm',write:false,logLevel:'silent'})
const {itemCardOf}=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'))
const ITEMS_ART=JSON.parse(readFileSync(new URL('../generated/art/index.json',import.meta.url),'utf8')).items??{}

const {w}=bootSlice(page,{search:'?play=encounter.opening.orphanage&heroes='+PRIEST}),h=w.__sandbox
const V=()=>h.viewer._V,ctx=()=>h.session.ctx,unit=id=>ctx().state.units[id]
const settle=()=>{for(let i=0;i<8000&&(h.busy||i<3);i++)w._flush(20);assert.equal(h.busy,false,'the board settles');assert.equal(h.fault,'','no fault')}
const acting=()=>ctx().battleCursor?.at==='acting'?ctx().battleCursor.actor:null
const chip=id=>V().dom.rail.querySelectorAll('.railchip').find(c=>+c.dataset.i===id)
const has=(n,cls)=>n.className.split(/\s+/).includes(cls)
const itemRows=()=>V().dom.panel.querySelectorAll('.pItem')
const rowOf=item=>itemRows().find(r=>r.dataset.item===item)
const holder=()=>V().dom.root.querySelector('#itemCardAt')
const cards=()=>{const at=holder();return at&&at.style.display!=='none'?at.querySelectorAll('.itemcard'):[]}
const press=n=>{assert.ok(n,'a name to click');n.handlers.click({});settle()}
const away=target=>{w.document.dispatch('click',{target});settle()}
/** the one card beside the panel is this item's, and says what the sources' card for it says */
function showsCard(id,label){
 const open=cards();assert.equal(open.length,1,label+': one item card');const el=open[0],want=itemCardOf(id),text=el.textContent
 assert.equal(el.dataset.itemCard,id,label+': the card of the item clicked')
 assert.ok(text.includes(want.name),`${label}: its name, ${want.name}`);assert.ok(text.includes(`${want.kind} · tier ${want.tier}`),`${label}: its kind and tier`)
 for(const f of want.facts)assert.ok(text.includes(f),`${label}: "${f}"`)
 for(const g of want.gives)assert.ok(text.includes(g.words),`${label}: "${g.words}"`)
 for(const l of want.lines)assert.ok(text.includes(l),`${label}: "${l}"`)
 for(const g of want.grants){assert.ok(text.includes(g.name),`${label}: ${g.name}`);for(const l of g.lines)assert.ok(text.includes(l),`${label}: ${g.name} — "${l}"`)}
 if(want.line)assert.ok(text.includes(want.line),label+': its line of what it is')
 assert.equal(el.querySelectorAll('img').length,ITEMS_ART[id]?1:0,`${label}: ${want.name} ${ITEMS_ART[id]?'shows its card art':'has no art and shows a plain face'}`)
 assert.equal(el.dataset.art,ITEMS_ART[id]?'1':'0')
 /* beside the panel: the card hangs from the battle screen's own root, not inside the panel */
 for(let p=el;p;p=p.parentNode)assert.notEqual(p,V().dom.panel,label+': the card is not inside the panel')
 assert.equal(holder().parentNode,V().dom.root,label+': it stands on the battle screen, beside the panel')
 return want
}

settle()
const priest=ctx().state.units.find(u=>u.typeId===PRIEST);assert.ok(priest,'the Priest is fielded')
if(acting()!==priest.id){chip(priest.id).handlers.dblclick({stopPropagation(){}});settle()}
assert.equal(acting(),priest.id,'the Priest is the one acting: the panel is its');h.viewer.inspect(priest.id);settle()
const seq=ctx().state.seq,events=ctx().events.length

/* 1. the panel lists its items by name; each name can be clicked; no card until one is */
const symbol=rowOf(SYMBOL);assert.ok(symbol,'the Priest\'s panel lists the Holy Symbol (the rows: '+itemRows().map(r=>r.textContent.trim()).join(' | ')+')')
assert.ok(symbol.textContent.includes('Holy Symbol'));assert.ok(has(symbol,'look'),'its name is a thing to click')
assert.equal(cards().length,0,'no card until a name is clicked')
/* 2. Holy Symbol clicked: its card, with Wrath and Heal and their lines */
press(rowOf(SYMBOL));const card=showsCard(SYMBOL,'Holy Symbol clicked')
assert.deepEqual(card.grants.map(g=>g.name).sort(),['Heal','Wrath'],'the sources\' card grants Wrath and Heal')
for(const g of card.grants)assert.ok(g.lines.length>=2,`${g.name} has its lines`)
assert.equal(rowOf(SYMBOL).getAttribute('aria-expanded'),'true')
/* its art: the Holy Symbol has no card art made yet (generated/art/index.json: 103 items have card art, it is not one), so its
   card shows the plain face the Equip screen's card shows for it — showsCard holds the art to the index either way. An item
   that HAS card art is opened below. */
const symbolArt=!!ITEMS_ART[SYMBOL]
say(`1 'Holy Symbol' clicked in the Priest's panel: one card beside the panel — ${card.name}, ${card.kind} · tier ${card.tier}, ${symbolArt?'its card art':'no card art made for it yet (the plain face, as on Equip)'}, ${card.grants.map(g=>`${g.name} (${g.lines.length} lines: "${g.lines[0]}")`).join(', ')}`)
/* 3. the same name again closes it */
press(rowOf(SYMBOL));assert.equal(cards().length,0,'the same name again closes the card')
/* 4. another item replaces it */
const other=itemRows().find(r=>r.dataset.item&&r.dataset.item!==SYMBOL);assert.ok(other,'the Priest carries another item')
press(rowOf(SYMBOL));press(rowOf(other.dataset.item));const cardB=showsCard(other.dataset.item,'another item clicked')
say(`2 the same name again closed it; '${cardB.name}' clicked after 'Holy Symbol' replaced the card — one card, ${cardB.name}'s`)
/* 5. a click away closes it — the board, then the action bar */
away(V().dom.stage);assert.equal(cards().length,0,'a click on the board closes the card')
press(rowOf(SYMBOL));away(V().dom.actionbar);assert.equal(cards().length,0,'a click on the bar closes the card')
/* a click on the card itself leaves it */
press(rowOf(SYMBOL));away(cards()[0]);assert.equal(cards().length,1,'a click on the card itself leaves it');showsCard(SYMBOL,'still the Holy Symbol')
/* 6. another unit in the panel: the card is the focused character's, and goes */
const ally=ctx().state.units.find(u=>u.side==='hero'&&u.id!==priest.id&&u.lifeState==='standing');assert.ok(ally)
h.viewer.inspect(ally.id);settle();assert.equal(cards().length,0,'another unit in the panel closes the card')
const allyItems=itemRows().filter(r=>r.dataset.item)
if(allyItems.length){press(allyItems[0]);showsCard(allyItems[0].dataset.item,unit(ally.id).name+'\'s item');away(V().dom.stage)}
/* an item that HAS card art: the player's units are looked at until one carries one, and its card shows the art */
let withArt=null
for(const u of ctx().state.units.filter(x=>x.side==='hero'&&x.lifeState==='standing')){h.viewer.inspect(u.id);settle()
 const r=itemRows().find(x=>x.dataset.item&&ITEMS_ART[x.dataset.item]);if(!r)continue
 press(r);const c=showsCard(r.dataset.item,u.name+': '+r.dataset.item);assert.equal(cards()[0].querySelectorAll('img').length,1,'its card art is on the card')
 withArt=`${u.name}'s ${c.name}`;away(V().dom.stage);break}
assert.ok(withArt,'a unit of the player\'s carries an item that has card art')
/* 7. an enemy in the panel: no enemy kind carries an item today, so its panel lists none and there is no name to click */
const enemy=ctx().state.units.find(u=>u.side==='enemy'&&u.lifeState==='standing');assert.ok(enemy)
h.viewer.inspect(enemy.id);settle()
const enemyItems=itemRows().filter(r=>r.dataset.item)
if(enemyItems.length){press(enemyItems[0]);showsCard(enemyItems[0].dataset.item,'an enemy\'s item');away(V().dom.stage)}
say(`3 a click away (the board, the bar) closed it, a click on the card left it, another unit in the panel closed it${allyItems.length?`, and ${unit(ally.id).name}'s ${itemCardOf(allyItems[0].dataset.item).name} opened its own`:''}; ${withArt} showed its card art; the enemy in the panel (${enemy.name}) ${enemyItems.length?'carries '+enemyItems.length+' item(s) and its card opened the same way':'carries no item — no enemy kind does today — so its panel has no name to click'}`)
/* 8. looking changed nothing */
assert.equal(ctx().state.seq,seq,'looking is not a move: the battle is where it was');assert.equal(ctx().events.length,events)
assert.equal(acting(),priest.id,'the Priest is still the one acting')
console.log(`item-card-in-battle: on the built sandbox, clicking 'Holy Symbol' in the Priest's panel stood its card beside the panel — Wrath and Heal with their lines, word for word the sources' card the Equip screen shows; the same name, a click away or another unit closed it; another item replaced it; an item that has card art showed it; nothing in the battle moved — passed`)
