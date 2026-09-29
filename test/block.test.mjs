import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const source = path.resolve(import.meta.dirname, '..');
const livePack = path.resolve(source, '../engine/src/content/generated/pack.ts');
function candidate(change, auditing=false) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hobat-elements-'));
  const work = path.join(root, 'content');
  const published = fs.readFileSync(livePack);
  try {
    fs.mkdirSync(work);
    fs.mkdirSync(path.join(root, 'engine/src/content/generated'), { recursive: true }); fs.mkdirSync(path.join(root, 'engine/generated'), { recursive: true }); fs.copyFileSync(path.join(source, '../engine/generated/vocabulary.json'), path.join(root, 'engine/generated/vocabulary.json'));   // the engine's vocabulary the converter reads (plumbing.vocabulary-export)
    for (const name of ['audit.mjs', 'assemble.mjs', 'mkenginepack.mjs', 'map-schema.mjs','burst-schema.mjs', 'hbt-content.json', 'settled.json']) fs.copyFileSync(path.join(source, name), path.join(work, name));
    for (const name of ['gen', 'test']) fs.cpSync(path.join(source, name), path.join(work, name), { recursive: true, filter: p => !fs.statSync(p).isFile() || p.endsWith('.json') });
    const edit = (name, fn) => { const p = path.join(work, name); const row = JSON.parse(fs.readFileSync(p, 'utf8')); fn(row); fs.writeFileSync(p, JSON.stringify(row)); };
    change(edit);
    const assembled=spawnSync(process.execPath,['assemble.mjs'],{cwd:work,encoding:'utf8'});assert.equal(assembled.status,0,assembled.stdout+assembled.stderr);
    if(auditing)return spawnSync(process.execPath,['audit.mjs'],{cwd:work,encoding:'utf8',maxBuffer:4*1024*1024});
    const run = spawnSync(process.execPath, ['mkenginepack.mjs'], { cwd: work, encoding: 'utf8' });
    const file = path.join(root, 'engine/src/content/generated/pack.ts');
    const pack = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8').split('export const UNIT_PACK = ')[1].replace(/ as const\s*$/, '')) : null;
    return { ...run, pack };
  } finally {
    assert.deepEqual(fs.readFileSync(livePack), published, 'candidate compiler must never touch live pack');
    const resolved = path.resolve(root);
    assert.equal(path.dirname(resolved), path.resolve(os.tmpdir()), 'cleanup must remain inside owned temporary directory');
    assert.ok(path.basename(resolved).startsWith('hobat-elements-'));
    fs.rmSync(resolved, { recursive: true, force: true });
  }
}



for (const stat of ['block','rangedBlock']) test('Block compiler transports '+stat,()=>{
 const run=candidate(edit=>{
  edit('gen/enemies-authored.json',rows=>{rows.units[0].stats[stat]=31});
  edit('settled.json',rows=>{rows.items.find(i=>i.id==='item.necklace-of-fire-immunity').statModifiers[stat]=7});
  edit('test/units.json',rows=>{rows[0].set={...rows[0].set,[stat]:42}});
 });
 assert.equal(run.status,0,run.stderr);
 assert.equal(run.pack.authoredEnemies.find(u=>u.typeId==='unit.zombie')[stat],31);
 assert.equal(run.pack.items['item.necklace-of-fire-immunity'].statModifiers[stat],7);
 assert.equal(run.pack.test.units[0][stat],42);
});
test('Stun explicitly disables Block while TEST activation-only and block-only statuses stay distinct',()=>{
 const run=candidate(()=>{});assert.equal(run.status,0,run.stderr);
 assert.equal(run.pack.statuses['status.stun'].blocksBlock,true);
 assert.equal(run.pack.test.statuses['test.status.daze'].blocksBlock,undefined);
 assert.equal(run.pack.test.statuses['test.status.guard-open'].blocksBlock,true);
 assert.equal(run.pack.test.statuses['test.status.guard-open'].blocksAction,undefined);
});

for(const value of [1.5,'10'])test('compiler rejects noninteger Block '+value,()=>{
 const run=candidate(edit=>edit('test/units.json',rows=>{rows[0].set={...rows[0].set,block:value}}));
 assert.notEqual(run.status,0);assert.match(run.stderr,/block/i);assert.equal(run.pack,null);
});
test('compiler rejects a nonboolean blocksBlock flag',()=>{
 const run=candidate(edit=>edit('test/statuses.json',rows=>{rows.find(s=>s.id==='test.status.guard-open').blocksBlock='yes'}));
 assert.notEqual(run.status,0);assert.match(run.stderr,/blocksBlock/);assert.equal(run.pack,null);
});

test('audit accepts implemented onBlock on a published item without inventing legacy-cohort coverage',()=>{
 const run=candidate(edit=>edit('settled.json',rows=>{rows.items.find(i=>i.id==='item.necklace-of-fire-immunity').triggers=[{hook:'onBlock',chance:100,effect:'gain 1 Protection'}]}),true);
 assert.doesNotMatch(run.stdout,/unknown-hook|test-bestiary-misses-a-hook/);
});
test('badge prose resolves Block and Ranged Block as separate engine stats',()=>{
 const run=candidate(edit=>edit('gen/badges.json',data=>{data.badges.find(b=>b.id==='badge.accurate').payload='+5 Block; +10 Ranged Block'}));
 assert.equal(run.status,0,run.stderr);
 assert.deepEqual(run.pack.badges['badge.accurate'].statModifiers,{block:5,rangedBlock:10});
});
