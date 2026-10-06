// engine content.sets-count-holy-texts-and-heavy-chain (2026-10-06). Ruled 2026-10-05 (engine DECISIONS.md 'a prone unit only
// stands; … a set counts everything carried; …'): asked whether Holy Texts should count as a book and Heavy Chain as a chain
// for set bonuses - "8, yes." A row says `setMember`: the sets it is counted in WITHOUT bearing the tag, because a tier-1
// row's tags are also what the Forge reads to say which enchantments it may take. The membership reaches the engine's row as
// `setTags`; what the Forge makes of the two rows is exactly what it made before; a setMember that names no set, or repeats
// the row's own tag, fails the build.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import { copyRuntime } from './workspace.mjs';
const source=path.resolve(import.meta.dirname,'..');
function candidate(change){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'hobat-set-member-')),work=path.join(root,'content');
 const live=path.resolve(source,'../engine/src/content/generated/pack.ts'),before=fs.readFileSync(live);
 try{
  fs.mkdirSync(work);fs.mkdirSync(path.join(root,'engine/src/content/generated'),{recursive:true});fs.mkdirSync(path.join(root,'engine/generated'),{recursive:true});fs.copyFileSync(path.join(source,'../engine/generated/vocabulary.json'),path.join(root,'engine/generated/vocabulary.json'));
  copyRuntime(source,work,['assemble.mjs','mkenginepack.mjs'],['hbt-content.json','settled.json']);
  for(const dir of ['gen','test'])fs.cpSync(path.join(source,dir),path.join(work,dir),{recursive:true,filter:p=>!fs.statSync(p).isFile()||p.endsWith('.json')});
  const edit=(file,fn)=>{const p=path.join(work,file),data=JSON.parse(fs.readFileSync(p,'utf8'));fn(data);fs.writeFileSync(p,JSON.stringify(data))};
  change(edit);
  const assembled=spawnSync(process.execPath,['assemble.mjs'],{cwd:work,encoding:'utf8'});if(assembled.status!==0)return {...assembled,pack:null};
  const run=spawnSync(process.execPath,['mkenginepack.mjs'],{cwd:work,encoding:'utf8'}),file=path.join(root,'engine/src/content/generated/pack.ts');
  return {...run,pack:fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8').split('export const UNIT_PACK = ')[1].replace(/ as const\s*$/,'')):null};
 }finally{
  assert.deepEqual(fs.readFileSync(live),before);
  assert.equal(path.dirname(path.resolve(root)),path.resolve(os.tmpdir()));assert.ok(path.basename(root).startsWith('hobat-set-member-'));
  fs.rmSync(root,{recursive:true,force:true});
 }
}
const live=candidate(()=>{});
// the Forge's rows of a base: the tier-2 rows it derives (derivedItems) and the tier-3 combinations authored on it (enchanted)
const forgeRows=(pack,base)=>[...Object.values(pack.derivedItems),...Object.values(pack.enchanted)].filter(r=>r.base===base).map(r=>`${r.id}|${r.enchant??''}|t${r.tier}`).sort();
const rowIn=(data,id)=>data.items.find(i=>i.id===id);
// the Forge's rows for the two items as they stood before this item (read from the pack at content a5a0c28, 2026-10-06)
const BEFORE={
 'item.holy-texts':['item.holy-texts.cruel|enchant.cruel|t2','item.holy-texts.demon-slayer|enchant.demon-slayer|t3','item.holy-texts.heavens-edge|enchant.heavens-edge|t3','item.holy-texts.heavy|enchant.heavy|t2','item.holy-texts.holy-water|enchant.holy-water|t3','item.holy-texts.keen|enchant.keen|t2','item.holy-texts.masterwork||t2','item.holy-texts.undead-slayer|enchant.undead-slayer|t3'],
 'item.heavy-chain':['item.heavy-chain.durable|enchant.durable|t3','item.heavy-chain.enduring|enchant.enduring|t3','item.heavy-chain.fleet|enchant.fleet|t2','item.heavy-chain.hale|enchant.hale|t2','item.heavy-chain.lucky|enchant.lucky|t2','item.heavy-chain.masterwork||t2','item.heavy-chain.might|enchant.might|t3','item.heavy-chain.nimble|enchant.nimble|t2','item.heavy-chain.runed|enchant.runed|t3','item.heavy-chain.warded|enchant.warded|t3'],
};

test('Holy Texts is counted as a book and Heavy Chain as a chain item: the membership reaches the engine\'s row as its set tags, and neither row bears the tag',()=>{
 assert.equal(live.status,0,live.stderr);
 const I=live.pack.items;
 assert.deepEqual(I['item.holy-texts'].setTags,['book']);assert.deepEqual(I['item.heavy-chain'].setTags,['chain']);
 const codex=JSON.parse(fs.readFileSync(path.join(source,'hbt-content.json'),'utf8'));
 const texts=codex.items.find(i=>i.id==='item.holy-texts'),heavy=codex.items.find(i=>i.id==='item.heavy-chain');
 assert.deepEqual(texts.tags,['holy']);assert.deepEqual(texts.setMember,['book']);
 assert.deepEqual(heavy.tags,['armor','medium']);assert.deepEqual(heavy.setMember,['chain']);
 // a row that bears the tag still gets it from the tag, and one in no set carries nothing
 assert.deepEqual(I['item.book-of-karma'].setTags,['book']);assert.equal(I['item.longsword'].setTags,undefined);
});

test('the Forge makes of both rows exactly what it made before, and the same with and without the membership',()=>{
 assert.deepEqual(forgeRows(live.pack,'item.holy-texts'),BEFORE['item.holy-texts']);
 assert.deepEqual(forgeRows(live.pack,'item.heavy-chain'),BEFORE['item.heavy-chain']);
 const without=candidate(edit=>{edit('gen/weapons.json',d=>{delete rowIn(d,'item.holy-texts').setMember});edit('gen/settled-items.json',d=>{delete rowIn(d,'item.heavy-chain').setMember})});
 assert.equal(without.status,0,without.stderr);
 assert.equal(without.pack.items['item.holy-texts'].setTags,undefined);assert.equal(without.pack.items['item.heavy-chain'].setTags,undefined);
 const ids=p=>[...Object.keys(p.derivedItems),...Object.keys(p.enchanted)].sort();
 assert.deepEqual(ids(live.pack),ids(without.pack));            // every Forge row of the whole pack, not only these two
 // and the other side, which is why it is not the tag: with `chain` as a TAG the Forge would sell Heavy Chain three weapon
 // enchantments (Cruel, Heavy, Keen - an armor with +Crit on attacks it does not have). The Texts' buyable rows would by chance
 // be the same with `book` as a tag (its `holy` tag already takes the three), but the tag would make it a ranged weapon by the
 // Forge's rule and a book for the five book artifact attributes; the field touches neither.
 const tagged=candidate(edit=>edit('gen/settled-items.json',d=>{const r=rowIn(d,'item.heavy-chain');delete r.setMember;r.tags=[...r.tags,'chain']}));
 assert.equal(tagged.status,0,tagged.stderr);
 assert.deepEqual(forgeRows(tagged.pack,'item.heavy-chain').filter(r=>!BEFORE['item.heavy-chain'].includes(r)),['item.heavy-chain.cruel|enchant.cruel|t2','item.heavy-chain.heavy|enchant.heavy|t2','item.heavy-chain.keen|enchant.keen|t2']);
 // a Forge row of a member is a member too
 assert.deepEqual(live.pack.derivedItems['item.holy-texts.keen'].setTags,['book']);assert.deepEqual(live.pack.derivedItems['item.heavy-chain.masterwork'].setTags,['chain']);assert.deepEqual(live.pack.enchanted['item.holy-texts.demon-slayer'].setTags,['book']);
});

test('a setMember that names no tag of the Codex, repeats the row\'s own tag, or is no list fails the build; one no set line counts is carried by nothing',()=>{
 const none=candidate(edit=>edit('gen/weapons.json',d=>{rowIn(d,'item.holy-texts').setMember=['gryphon']}));
 assert.notEqual(none.status,0);assert.match(none.stdout+none.stderr,/holy-texts setMember names 'gryphon', which is no tag of the Codex/);
 // like a tag: a membership of a tag no row's set line counts builds, and reaches the engine as nothing
 const uncounted=candidate(edit=>edit('gen/weapons.json',d=>{rowIn(d,'item.holy-texts').setMember=['sword']}));
 assert.equal(uncounted.status,0,uncounted.stderr);assert.equal(uncounted.pack.items['item.holy-texts'].setTags,undefined);
 const twice=candidate(edit=>edit('gen/settled-items.json',d=>{rowIn(d,'item.book-of-karma').setMember=['book']}));
 assert.notEqual(twice.status,0);assert.match(twice.stdout+twice.stderr,/book-of-karma setMember names 'book', which the row's own tags already say/);
 const word=candidate(edit=>edit('gen/weapons.json',d=>{rowIn(d,'item.holy-texts').setMember='book'}));
 assert.notEqual(word.status,0);assert.match(word.stdout+word.stderr,/holy-texts setMember is not a list of set tags/);
});
