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
    for (const name of ['audit.mjs', 'assemble.mjs', 'mkenginepack.mjs', 'map-schema.mjs','burst-schema.mjs','mkpaintedmaps.mjs', 'hbt-content.json', 'settled.json']) fs.copyFileSync(path.join(source, name), path.join(work, name));
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


for(const stat of ['fireResist','poisonResist','shadowResist'])test('compiler transports '+stat+' in real and TEST units and items',()=>{
 const run=candidate(edit=>{
  edit('gen/enemies-authored.json',rows=>{rows.units[0].stats[stat]=3});
  edit('settled.json',rows=>{rows.items.find(i=>i.id==='item.necklace-of-fire-immunity').statModifiers[stat]=2});
  edit('test/units.json',rows=>{rows[0].set={...rows[0].set,[stat]:4}});
 });
 assert.equal(run.status,0,run.stderr);
 assert.equal(run.pack.authoredEnemies.find(u=>u.typeId==='unit.zombie')[stat],3);
 assert.equal(run.pack.items['item.necklace-of-fire-immunity'].statModifiers[stat],2);
 assert.equal(run.pack.test.units[0][stat],4);
});
test('compiler refuses an unknown damaging-status type',()=>{
 const run=candidate(edit=>edit('settled.json',rows=>{rows.statuses.find(s=>s.id==='status.burn').damageType='holy'}));
 assert.notEqual(run.status,0);assert.match(run.stderr,/damage type/i);assert.equal(run.pack,null);
});


test('V2 audit exceptions remain narrow',()=>{
 const clean=candidate(()=>{},true);assert.doesNotMatch(clean.stdout,/trinket-is-a-stat-stick|specialty-too-many-stats/);
 const mixed=candidate(edit=>edit('settled.json',rows=>{rows.items.find(x=>x.id==='item.necklace-of-fire-immunity').statModifiers.strength=1}),true);assert.match(mixed.stdout,/trinket-is-a-stat-stick/);
 const extra=candidate(edit=>edit('gen/rogue.json',rows=>{rows.specialties.find(x=>x.id==='specialty.poison-master').statModifiers.armor=1}),true);assert.match(extra.stdout,/specialty-too-many-stats/);
 const changed=candidate(edit=>edit('gen/rogue.json',rows=>{rows.specialties.find(x=>x.id==='specialty.poison-master').statModifiers.poisonResist=4}),true);assert.match(changed.stdout,/specialty-too-many-stats/);
});

for (const kind of ['damage', 'selfDamage']) test('compiler rejects unknown ' + kind + ' effect type', () => {
  const run = candidate(edit => edit('test/abilities.json', rows => {
    rows[1].effects = [{kind, amount: 2, stat: 'magic', bonus: 0, damageType: 'holy'}];
  }));
  assert.notEqual(run.status, 0); assert.match(run.stderr, /damage type/i); assert.equal(run.pack, null);
});
