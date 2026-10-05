// kingdom.equip-item-card — ruled 2026-10-05 (Andrew, engine DECISIONS.md 'playtest post: notices, target lines, item cards, …':
// "When you're selecting items in the equipment phase, you need to be able to look at your items somehow. You need to be able
// to click on them, and then they pop up somewhere on the screen, to the right or somewhere, as a card with a description.").
//
// On the BUILT sandbox, a new run played to the opening run's equip step before battle 2 (the page's own steps,
// tools/opening-page.mjs): an item a hero wears is clicked — its card opens, one card, that item's, with its name, its kind
// and tier, what it gives and each attack and power it grants (the sources' own card for it); another item clicked replaces
// it; a click away closes it; an item taken off and clicked in the stash shows its card and is in hand, and a click away puts
// it down. Looking changes nothing: the run is the same before and after. The reward screen's cards are held to the same
// card where every page run takes a reward (opening-page.mjs takeReward).
//
//   node tools/equip-item-card.verify.mjs [BATTLE-SANDBOX.html]
import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
import {openingPage,ITEMS_ART} from './opening-page.mjs'
const page=process.argv[2]??'BATTLE-SANDBOX.html',RUN_SEED=Number(process.env.ITEM_CARD_SEED??11)
const ORPHANAGE='encounter.opening.orphanage',LUMBERJACK='encounter.opening.lumberjack'
const say=(...a)=>console.log('  '+a.join(' '))
/* the sources' own card for an item — what the page's card is held to */
const esbuild=createRequire(import.meta.url)('../../engine/node_modules/esbuild')
const built=esbuild.buildSync({stdin:{contents:`export {itemCardOf} from './src/content/item-card.ts'`,resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'esm',write:false,logLevel:'silent'})
const {itemCardOf}=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'))

const P=openingPage(page,'?map&new&seed='+RUN_SEED),{byId,camp}=P
const first=P.draft('battle 1');P.straightIn([first],'battle 1');P.fightOut(true,'battle 1');P.levelUps('battle 1')
assert.equal(P.readMap([ORPHANAGE],'after battle 1'),LUMBERJACK);P.v.click('field',LUMBERJACK)
P.draft('battle 2');P.whoGoes('battle 2')
assert.equal(camp().cursor.prepStep,'equip','the opening run\'s equip step, before battle 2')

const host=()=>byId('campaign')
const cards=()=>host().querySelectorAll('.itemcard')
const all=sel=>host().querySelectorAll(sel)
const clickOn=el=>{assert.ok(el,'an element to click');el.handlers.click({})}
const away=()=>host().handlers.click({})
/** the one card on the screen is this item's, and says what the sources' card for it says */
function showsCard(id,label){
 const open=cards();assert.equal(open.length,1,label+': one item card');const el=open[0],want=itemCardOf(id),text=el.textContent
 assert.equal(el.dataset.itemCard,id,label+': the card of the item clicked')
 assert.ok(text.includes(want.name),`${label}: its name, ${want.name}`);assert.ok(text.includes(`${want.kind} · tier ${want.tier}`),`${label}: its kind and tier`)
 for(const g of want.gives)assert.ok(text.includes(g.words),`${label}: "${g.words}"`)
 for(const g of want.grants){assert.ok(text.includes(g.name),`${label}: ${g.name}`);for(const l of g.lines)assert.ok(text.includes(l),`${label}: ${g.name} — "${l}"`)}
 if(want.line)assert.ok(text.includes(want.line),label+': its line of what it is')
 assert.equal(el.querySelectorAll('img').length,ITEMS_ART[id]?1:0,`${label}: ${want.name} ${ITEMS_ART[id]?'shows its card art':'has no art and shows a plain face'}`)
 assert.equal(el.dataset.art,ITEMS_ART[id]?'1':'0')
 /* "to the right": the card is a panel of the Equip page, after the stash — not a line inside it */
 const html=host().innerHTML;assert.ok(html.indexOf('class="itemcard"')>html.lastIndexOf('class="stash"'),label+': a panel of its own, after the stash')
 return want
}
const worn=()=>all('[data-holds]').map(el=>({el,item:el.dataset.holds,hero:el.dataset.hero}))
const before=JSON.stringify(camp())

/* 1. nothing looked at: no card; every slot that holds an item opens that item's card */
assert.equal(cards().length,0,'no card until an item is clicked')
const items=worn();assert.ok(items.length>=2,'the heroes sent wear items')
for(const x of items){assert.equal(x.el.dataset.act,'look',`${x.item} on ${x.hero} can be looked at`);assert.equal(x.el.dataset.id,x.item)}
/* 2. an item a hero wears, clicked: its card */
const a=items[0],b=items.find(x=>x.item!==a.item)
clickOn(a.el);const cardA=showsCard(a.item,'a worn item clicked')
/* 3. another item clicked replaces it */
clickOn(worn().find(x=>x.item===b.item&&x.hero===b.hero).el);const cardB=showsCard(b.item,'another item clicked')
/* 4. a click away closes it */
away();assert.equal(cards().length,0,'a click away closes the card')
/* 5. the same item clicked twice: open, then closed */
clickOn(worn()[0].el);assert.equal(cards().length,1);clickOn(worn()[0].el);assert.equal(cards().length,0,'the item clicked again closes its card')
/* looking moved nothing */
assert.equal(JSON.stringify(camp()),before,'nothing is equipped or moved by looking: the run is as it was')
say(`looked at ${cardA.name} (${cardA.kind} · tier ${cardA.tier}; ${cardA.gives.map(g=>g.words).join(', ')||'gives no stat'}; ${cardA.grants.map(g=>g.name).join(', ')||'grants nothing'}), then ${cardB.name} replaced it; a click away closed it; the run unchanged`)

/* 6. an item taken off (the ×: Equip's own gesture) lies in the stash; clicked there it is in hand and its card shows */
const off=all('[data-act=unequip]')[0];assert.ok(off,'an item can be taken off');const item=off.dataset.item,hero=off.dataset.id
clickOn(off);assert.ok(camp().stash.includes(item),item+' is in the stash')
assert.equal(cards().length,0,'taking an item off opens no card')
const inStash=JSON.stringify(camp())
clickOn(all('.item').find(el=>el.dataset.id===item));const cardC=showsCard(item,'a stash item clicked')
assert.ok(all('[data-act=drop]').length>0,'it is in hand: the slots are where it goes')
assert.equal(JSON.stringify(camp()),inStash,'picking it up and looking at it moved nothing')
/* a click away closes the card and puts it down */
away();assert.equal(cards().length,0,'a click away closes the card');assert.equal(all('[data-act=drop]').length,0,'and the item is put down')
/* 7. put it back on: pick it (its card opens), click a slot it can go in — it is on the hero, nothing in hand, no card */
clickOn(all('.item').find(el=>el.dataset.id===item));showsCard(item,'picked again')
const slot=all('[data-act=drop]').find(el=>el.dataset.hero===hero&&el.className.split(/\s+/).includes('can'));assert.ok(slot,'a slot it can go back in')
clickOn(slot)
assert.ok(camp().roster[hero].equipped.includes(item)&&!camp().stash.includes(item),item+' is back on the hero')
assert.equal(cards().length,0,'an item put on closes its card')
assert.deepEqual([...camp().roster[hero].equipped].sort(),[...JSON.parse(before).roster[hero].equipped].sort(),'the hero wears what it wore')
say(`${cardC.name} taken off, clicked in the stash: its card, the item in hand; a click away put it down; picked and put back on`)
console.log(`equip-item-card: on the built sandbox, the opening run's equip step before battle 2 — a worn item clicked opened its card at the right (${cardA.name}), another replaced it (${cardB.name}), a click away closed it; ${cardC.name} taken off and clicked in the stash showed its card; nothing was equipped or moved by looking — passed`)
